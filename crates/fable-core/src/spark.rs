use crate::router::RECOVERY_FAILURE_THRESHOLD;
use crate::types::{EvidenceKind, EvidenceResult, FablePhase, FableState};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SparkSource {
    FailureLoop,
    MutationDelta,
    MissingGate,
    ActiveCard,
    LifecycleState,
    Continuation,
    None,
}

#[derive(Debug, Clone)]
pub struct SparkSignalContext<'a> {
    pub user_intent: Option<&'a str>,
    pub state: &'a FableState,
    pub active_card_text: Option<&'a str>,
    pub open_cards: &'a [String],
    pub latest_error: Option<&'a str>,
    pub latest_mutation_source: Option<&'a str>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SparkResult {
    pub suggestion: Option<String>,
    pub reason_code: String,
    pub confidence: f64,
    pub source: SparkSource,
    pub silent: bool,
}

fn clean_suggestion(text: Option<&str>) -> Option<String> {
    let raw = text?.trim();
    if raw.is_empty() {
        return None;
    }
    let word_count = raw.split_whitespace().count();
    if !(2..=12).contains(&word_count) {
        return None;
    }
    let lower = raw.to_lowercase();
    for forbidden in ["i will", "let's", "you should", "please", "great", "note", "warning"] {
        if lower.starts_with(forbidden) {
            return None;
        }
    }
    Some(raw.to_string())
}

pub fn evaluate_fable_spark(ctx: &SparkSignalContext<'_>) -> SparkResult {
    let state = ctx.state;

    if state.phase == FablePhase::Complete
        && state.current_skill.as_deref() != Some("fable-handoff")
    {
        return SparkResult {
            suggestion: None,
            reason_code: "scope-complete-silent".to_string(),
            confidence: 0.0,
            source: SparkSource::None,
            silent: true,
        };
    }

    // 1. Failure Loop Detection
    if state.failure_streak >= RECOVERY_FAILURE_THRESHOLD || state.phase == FablePhase::Recovering {
        let err_lower = ctx.latest_error.unwrap_or("").to_lowercase();
        let raw = if err_lower.contains("integration") {
            "diagnose the repeated integration failure"
        } else if err_lower.contains("migration") {
            "diagnose the repeated migration failure"
        } else {
            "diagnose the repeated failure"
        };
        let suggestion = clean_suggestion(Some(raw));
        let silent = suggestion.is_none();
        return SparkResult {
            suggestion,
            reason_code: "failure-loop-diagnose-required".to_string(),
            confidence: 0.95,
            source: SparkSource::FailureLoop,
            silent,
        };
    }

    // 2. Mutation vs Verification Delta
    if state.mutation_generation > 0
        && (state.mutation_generation as i64) > state.verified_generation
        && state.phase != FablePhase::Idle
        && state.phase != FablePhase::Discovering
    {
        let mut_source = ctx.latest_mutation_source.unwrap_or("").to_lowercase();
        let is_build_mutation = [
            "esbuild",
            "webpack",
            "tsconfig",
            "package.json",
            "vite.config",
            "rollup",
            "styles",
            "css",
        ]
        .iter()
        .any(|kw| mut_source.contains(kw));

        if is_build_mutation {
            let suggestion = clean_suggestion(Some("run the build"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "build-verification-stale".to_string(),
                confidence: 0.94,
                source: SparkSource::MutationDelta,
                silent,
            };
        }

        let intent_lower = ctx.user_intent.unwrap_or("").to_lowercase();
        let active_lower = ctx
            .active_card_text
            .or(state.active_card.as_deref())
            .unwrap_or("")
            .to_lowercase();
        let combined = format!("{} {}", intent_lower, active_lower);

        let has_security_evidence = state
            .evidence
            .iter()
            .any(|e| e.kind == EvidenceKind::Security && e.result == EvidenceResult::Pass);

        if state.current_skill.as_deref() == Some("fable-security")
            && has_security_evidence
            && (combined.contains("bug")
                || combined.contains("fix")
                || combined.contains("regression")
                || combined.contains("repair"))
        {
            let suggestion = clean_suggestion(Some("verify the repaired behavior"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "security-does-not-prove-functional-repair".to_string(),
                confidence: 0.92,
                source: SparkSource::MissingGate,
                silent,
            };
        }

        if combined.contains("refresh") {
            let suggestion = clean_suggestion(Some("run the affected refresh tests"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "verification-stale-after-mutation".to_string(),
                confidence: 0.93,
                source: SparkSource::MutationDelta,
                silent,
            };
        }

        let suggestion = clean_suggestion(Some("run the affected tests"));
        let silent = suggestion.is_none();
        return SparkResult {
            suggestion,
            reason_code: "verification-stale-after-mutation".to_string(),
            confidence: 0.92,
            source: SparkSource::MutationDelta,
            silent,
        };
    }

    // 3. Missing Gates across specialist skills
    match state.current_skill.as_deref() {
        Some("fable-tdd") => {
            let has_failing_test = state
                .evidence
                .iter()
                .any(|e| e.kind == EvidenceKind::Test && e.result == EvidenceResult::Fail);
            if !has_failing_test && state.mutation_generation == 0 {
                let suggestion = clean_suggestion(Some("write the failing test"));
                let silent = suggestion.is_none();
                return SparkResult {
                    suggestion,
                    reason_code: "tdd-missing-failing-test".to_string(),
                    confidence: 0.91,
                    source: SparkSource::MissingGate,
                    silent,
                };
            }
        }
        Some("fable-review") => {
            let active_lower = ctx
                .active_card_text
                .or(state.active_card.as_deref())
                .unwrap_or("")
                .to_lowercase();
            if active_lower.contains("finding") {
                let suggestion = clean_suggestion(Some("fix the review finding"));
                let silent = suggestion.is_none();
                return SparkResult {
                    suggestion,
                    reason_code: "review-finding-unaddressed".to_string(),
                    confidence: 0.9,
                    source: SparkSource::ActiveCard,
                    silent,
                };
            }
            let has_review = state.evidence.iter().any(|e| e.kind == EvidenceKind::Review);
            if !has_review {
                let suggestion = clean_suggestion(Some("review the diff"));
                let silent = suggestion.is_none();
                return SparkResult {
                    suggestion,
                    reason_code: "diff-unreviewed".to_string(),
                    confidence: 0.89,
                    source: SparkSource::MissingGate,
                    silent,
                };
            }
        }
        Some("fable-research") => {
            let suggestion = clean_suggestion(Some("check the current official docs"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "external-research-required".to_string(),
                confidence: 0.88,
                source: SparkSource::MissingGate,
                silent,
            };
        }
        Some("fable-delegate") => {
            if ctx.open_cards.len() > 1 {
                let suggestion = clean_suggestion(Some("delegate the independent cards"));
                let silent = suggestion.is_none();
                return SparkResult {
                    suggestion,
                    reason_code: "independent-cards-delegation".to_string(),
                    confidence: 0.89,
                    source: SparkSource::MissingGate,
                    silent,
                };
            }
        }
        Some("fable-release") => {
            let suggestion = clean_suggestion(Some("check release readiness"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "release-verification-ready".to_string(),
                confidence: 0.9,
                source: SparkSource::MissingGate,
                silent,
            };
        }
        Some("fable-handoff") => {
            let suggestion = clean_suggestion(Some("prepare the handoff"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "continuity-handoff-ready".to_string(),
                confidence: 0.91,
                source: SparkSource::MissingGate,
                silent,
            };
        }
        _ => {}
    }

    // 4. Lifecycle Phase Constraints
    if state.phase == FablePhase::Idle {
        if let Some(intent) = ctx.user_intent.map(str::trim).filter(|s| !s.is_empty()) {
            let intent_lower = intent.to_lowercase();
            if intent_lower.contains("bug")
                || intent_lower.contains("fix")
                || intent_lower.contains("regression")
            {
                let suggestion = clean_suggestion(Some("reproduce the bug"));
                let silent = suggestion.is_none();
                return SparkResult {
                    suggestion,
                    reason_code: "intake-reproduce-bug".to_string(),
                    confidence: 0.88,
                    source: SparkSource::MissingGate,
                    silent,
                };
            }
            if intent_lower.contains("doc") || intent_lower.contains("api") {
                let suggestion = clean_suggestion(Some("check the official docs"));
                let silent = suggestion.is_none();
                return SparkResult {
                    suggestion,
                    reason_code: "intake-check-docs".to_string(),
                    confidence: 0.88,
                    source: SparkSource::MissingGate,
                    silent,
                };
            }
            let suggestion = clean_suggestion(Some("route the task"));
            let silent = suggestion.is_none();
            return SparkResult {
                suggestion,
                reason_code: "intake-route-task".to_string(),
                confidence: 0.85,
                source: SparkSource::LifecycleState,
                silent,
            };
        }
        return SparkResult {
            suggestion: None,
            reason_code: "idle-no-intent-silent".to_string(),
            confidence: 0.0,
            source: SparkSource::None,
            silent: true,
        };
    }

    SparkResult {
        suggestion: None,
        reason_code: "silent-no-obvious-move".to_string(),
        confidence: 0.0,
        source: SparkSource::None,
        silent: true,
    }
}
