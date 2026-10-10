use crate::client::JevClient;
use crate::matcher::MatchedSubtask;
use crate::types::{ArmedSubagentBundle, CoArmedSkill, SubtaskSpec};
use fable_core::SkillRegistry;
use fable_toon::{encode_delegation_contract, ToonDelegationContract};
use serde::Deserialize;
use std::fs;
use std::path::Path;

pub const POLICY_OVERLAY_SKILLS: &[(&str, &str, &str)] = &[
    (
        "fable-native-code",
        "idiom-guard",
        "Match host codebase idioms with zero defensive bloat or redundant comments",
    ),
    (
        "fable-scope-discipline",
        "scope-guard",
        "Keep diff strictly surgical and atomic within declared writeScope",
    ),
    (
        "fable-finish-your-turn",
        "completion-guard",
        "Complete all subtask acceptance checks autonomously with zero TODO placeholders",
    ),
    (
        "fable-prove-it",
        "evidence-guard",
        "Enforce Three-Rung verification proof and machine-checked evidence before completion",
    ),
    (
        "fable-judge",
        "adversarial-judge",
        "Inspect finished work adversarially to reject weakened tests or unverified claims",
    ),
    (
        "fable-context-thrift",
        "token-budget-guard",
        "Conserve context window by batching queries and targeting file slices",
    ),
    (
        "fable-outcome-first",
        "reporting-guard",
        "Lead return packet with direct outcome verdict and concrete verification evidence",
    ),
    (
        "fable-tdd",
        "tdd-driver",
        "Drive behavioral modifications through observable red-green regression tests",
    ),
    (
        "fable-security",
        "trust-boundary-guard",
        "Validate untrusted inputs, auth boundaries, and secret hygiene across changes",
    ),
    (
        "fable-method",
        "execution-loop",
        "Classify ask, define done, act surgically, and verify by direct observation",
    ),
    (
        "fable-wise",
        "cognitive-reflex",
        "Apply Paperthin RE0/SSOTize/Feynman cognitive checks to prevent over-engineering",
    ),
    (
        "fable-memory",
        "provenance-memory",
        "Preserve secret-safe provenance and recall workspace architectural facts",
    ),
    (
        "fable-learning",
        "lesson-extractor",
        "Synthesize reusable failure-class invariants into durable project learnings",
    ),
];

#[derive(Debug, Deserialize)]
struct ToolCapabilityEntry {
    pub id: String,
}

#[derive(Debug, Deserialize)]
struct ToolsRegistryFile {
    #[serde(default)]
    pub capabilities: Vec<ToolCapabilityEntry>,
}

/// Dynamically arm a subagent for a specific `SubtaskSpec` with its primary skill,
/// 2–3 Jev-scored policy overlay skills, scoped tools, internal engines, failure lessons,
/// compiled `SKILL.md` excerpt, and TOON delegation contract.
pub fn arm_subagent(
    subtask: &SubtaskSpec,
    matched: &MatchedSubtask,
    all_write_scopes_in_wave: &[String],
    registry: &SkillRegistry,
    repo_root: &Path,
    client: &JevClient,
) -> ArmedSubagentBundle {
    let co_armed_skills = select_co_armed_overlays(subtask, &matched.primary_skill.skill_id, client);
    let armed_tools = select_armed_tools(subtask, &matched.primary_skill.skill_id, repo_root);
    let armed_engines = select_armed_engines(subtask, &matched.primary_skill.skill_id);
    let failure_lessons = select_failure_lessons(subtask, &matched.primary_skill.skill_id, repo_root);

    let required_gates = registry
        .skills
        .iter()
        .find(|s| s.id == matched.primary_skill.skill_id)
        .map(|s| s.gates.clone())
        .filter(|g| !g.is_empty())
        .unwrap_or_else(|| vec!["fresh-verification-evidence".to_string()]);

    let compiled_skill_excerpt =
        compile_skill_excerpt(&matched.primary_skill.skill_id, registry, repo_root);

    let forbidden_paths: Vec<String> = all_write_scopes_in_wave
        .iter()
        .filter(|p| !subtask.write_scope.contains(p))
        .cloned()
        .collect();

    let mut rules = vec![
        format!("Primary skill: {}", matched.primary_skill.skill_id),
        format!(
            "Co-armed overlays: {}",
            co_armed_skills
                .iter()
                .map(|c| c.skill_id.as_str())
                .collect::<Vec<_>>()
                .join(", ")
        ),
    ];
    for lesson in &failure_lessons {
        rules.push(format!("Lesson invariant: {}", lesson));
    }

    let worker_id = format!("{}-{}", matched.subagent_id, subtask.id);
    let owned_paths = if subtask.write_scope.is_empty() {
        subtask.read_scope.clone()
    } else {
        subtask.write_scope.clone()
    };

    let delegation_contract = ToonDelegationContract {
        worker_id: worker_id.clone(),
        target_card: subtask.title.clone(),
        objective: subtask.description.clone(),
        timeout_sec: Some(300),
        owned_paths,
        forbidden_paths: if forbidden_paths.is_empty() {
            None
        } else {
            Some(forbidden_paths)
        },
        acceptance_checks: vec![subtask.verification_cmd.clone()],
        rules: Some(rules),
    };

    let toon_contract = encode_delegation_contract(&delegation_contract);

    ArmedSubagentBundle {
        subtask: subtask.clone(),
        subagent_id: matched.subagent_id.clone(),
        subagent_role: matched.subagent_role.clone(),
        primary_skill: matched.primary_skill.clone(),
        co_armed_skills,
        armed_tools,
        armed_engines,
        failure_lessons,
        required_gates,
        compiled_skill_excerpt,
        toon_contract,
        calibration: matched.calibration.clone(),
    }
}

fn select_co_armed_overlays(
    subtask: &SubtaskSpec,
    primary_skill_id: &str,
    client: &JevClient,
) -> Vec<CoArmedSkill> {
    let overlay_ids: Vec<String> = POLICY_OVERLAY_SKILLS
        .iter()
        .filter(|(id, _, _)| *id != primary_skill_id)
        .map(|(id, _, _)| (*id).to_string())
        .collect();

    let question = format!(
        "Score policy overlay skills for subtask '{}' (phase={}, mutates={}): {}",
        subtask.id,
        subtask.phase_hint,
        !subtask.write_scope.is_empty(),
        subtask.description
    );
    let score_res = client.score(&question, &overlay_ids);

    let mut candidates: Vec<CoArmedSkill> = POLICY_OVERLAY_SKILLS
        .iter()
        .filter(|(id, _, _)| *id != primary_skill_id)
        .filter_map(|(id, role, directive)| {
            let s = score_res.scores.get(*id).copied().unwrap_or(0.0);
            if s >= 0.70 {
                Some(CoArmedSkill {
                    skill_id: (*id).to_string(),
                    role: (*role).to_string(),
                    jev_score: s,
                    directive: (*directive).to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    candidates.sort_by(|a, b| {
        b.jev_score
            .partial_cmp(&a.jev_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.skill_id.cmp(&b.skill_id))
    });

    if candidates.is_empty() {
        // Fallback so every armed subagent has at least 2 disciplined policy overlays
        for (id, role, directive) in POLICY_OVERLAY_SKILLS.iter().take(2) {
            if *id != primary_skill_id {
                candidates.push(CoArmedSkill {
                    skill_id: (*id).to_string(),
                    role: (*role).to_string(),
                    jev_score: 0.75,
                    directive: (*directive).to_string(),
                });
            }
        }
    }

    candidates.truncate(3);
    candidates
}

fn select_armed_tools(subtask: &SubtaskSpec, primary_skill_id: &str, repo_root: &Path) -> Vec<String> {
    let tools_path = repo_root.join("registry").join("tools.json");
    let available: Vec<String> = fs::read_to_string(&tools_path)
        .ok()
        .and_then(|raw| serde_json::from_str::<ToolsRegistryFile>(&raw).ok())
        .map(|f| f.capabilities.into_iter().map(|c| c.id).collect())
        .unwrap_or_else(|| {
            vec![
                "file-operations".to_string(),
                "terminal-execution".to_string(),
                "current-source-search".to_string(),
                "headless-browser".to_string(),
                "git-version-control".to_string(),
            ]
        });

    let mut selected = Vec::new();
    let push_if_avail = |id: &str, out: &mut Vec<String>| {
        if available.iter().any(|a| a == id) && !out.iter().any(|x| x == id) {
            out.push(id.to_string());
        }
    };

    push_if_avail("file-operations", &mut selected);
    push_if_avail("terminal-execution", &mut selected);
    push_if_avail("git-version-control", &mut selected);

    if primary_skill_id == "fable-research"
        || subtask.description.to_lowercase().contains("docs")
        || subtask.description.to_lowercase().contains("research")
    {
        push_if_avail("current-source-search", &mut selected);
    }

    if primary_skill_id == "fable-simulator"
        || primary_skill_id == "fable-dataviz"
        || subtask.description.to_lowercase().contains("browser")
        || subtask.description.to_lowercase().contains("ui")
    {
        push_if_avail("headless-browser", &mut selected);
    }

    selected
}

fn select_armed_engines(subtask: &SubtaskSpec, primary_skill_id: &str) -> Vec<String> {
    let mut engines = Vec::new();
    let lower = subtask.description.to_lowercase();

    if primary_skill_id == "fable-verify"
        || primary_skill_id == "fable-tdd"
        || primary_skill_id == "fable-judge"
        || lower.contains("test")
        || lower.contains("verify")
    {
        engines.push("spearhead-test-value".to_string());
    }

    if !subtask.write_scope.is_empty()
        || primary_skill_id == "fable-review"
        || primary_skill_id == "fable-security"
        || primary_skill_id == "fable-execute"
    {
        engines.push("jev-diff-review".to_string());
    }

    if primary_skill_id == "fable-dataviz"
        || primary_skill_id == "fable-artifact"
        || lower.contains("ui")
        || lower.contains("svg")
    {
        engines.push("ui-polish-evaluator".to_string());
    }

    if primary_skill_id == "fable-eco" || lower.contains("capability") {
        engines.push("fable-eco-lock".to_string());
    }

    engines.push("reflex-recipes-bridge".to_string());
    engines
}

fn select_failure_lessons(
    subtask: &SubtaskSpec,
    primary_skill_id: &str,
    repo_root: &Path,
) -> Vec<String> {
    let mut lessons = Vec::new();
    let index_json = repo_root.join("Failure-lessons").join("index.json");
    if let Ok(raw) = fs::read_to_string(&index_json) {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(arr) = val.get("lessons").and_then(|v| v.as_array()) {
                for item in arr.iter().take(2) {
                    if let Some(rule) = item.get("rule").or_else(|| item.get("title")).and_then(|v| v.as_str()) {
                        lessons.push(rule.to_string());
                    }
                }
            }
        }
    }

    let lower = subtask.description.to_lowercase();
    if primary_skill_id == "fable-verify" || primary_skill_id == "fable-tdd" || lower.contains("test") {
        lessons.push(
            "Reproduce Before Fixing: A regression test is not proven useful until shown to fail when the fix is removed."
                .to_string(),
        );
    }
    if primary_skill_id == "fable-security" || lower.contains("security") || lower.contains("audit") {
        lessons.push(
            "Single Source of Invariant Truth: Trust-boundary checks must fail closed and never persist raw credentials."
                .to_string(),
        );
    }
    if !subtask.write_scope.is_empty() {
        lessons.push(
            "Completeness Implies Resource Readiness: Re-record fresh verification evidence after the final workspace mutation."
                .to_string(),
        );
    }
    if lessons.is_empty() {
        lessons.push(
            "Single Source of Invariant Truth: One domain invariant must have one canonical validation source."
                .to_string(),
        );
    }
    lessons
}

fn compile_skill_excerpt(
    skill_id: &str,
    registry: &SkillRegistry,
    repo_root: &Path,
) -> String {
    let skill_md_path = repo_root.join("skills").join(skill_id).join("SKILL.md");
    if let Ok(content) = fs::read_to_string(&skill_md_path) {
        // Extract the first non-frontmatter heading + mission paragraph cleanly
        let mut in_frontmatter = false;
        let mut frontmatter_done = false;
        let mut excerpt_lines = Vec::new();

        for (i, line) in content.lines().enumerate() {
            let trimmed = line.trim();
            if i == 0 && trimmed == "---" {
                in_frontmatter = true;
                continue;
            }
            if in_frontmatter {
                if trimmed == "---" {
                    in_frontmatter = false;
                    frontmatter_done = true;
                }
                continue;
            }
            if (frontmatter_done || i > 0) && !trimmed.is_empty() {
                excerpt_lines.push(trimmed.to_string());
                if excerpt_lines.len() >= 4 {
                    break;
                }
            }
        }
        if !excerpt_lines.is_empty() {
            return excerpt_lines.join(" ");
        }
    }

    registry
        .skills
        .iter()
        .find(|s| s.id == skill_id)
        .map(|s| format!("[{}] ({}): {}", s.id, s.pack, s.description))
        .unwrap_or_else(|| format!("[{}] Fable specialist skill", skill_id))
}
