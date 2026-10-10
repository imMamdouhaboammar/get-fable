use crate::client::JevClient;
use crate::types::{JevCalibrationReceipt, SkillMatchScore, SubtaskSpec};
use fable_core::{route_task, FableState, SkillRegistry, SkillRegistryEntry};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPersona {
    pub id: String,
    pub name: String,
    pub role: String,
    #[serde(default, alias = "autonomyLevel")]
    pub autonomy_level: String,
    #[serde(default, alias = "primarySkills")]
    pub primary_skills: Vec<String>,
    #[serde(default, alias = "supportingSkills")]
    pub supporting_skills: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AgentsRegistryFile {
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub agents: Vec<AgentPersona>,
}

#[derive(Debug, Clone)]
pub struct MatchedSubtask {
    pub primary_skill: SkillMatchScore,
    pub ranked_skills: Vec<SkillMatchScore>,
    pub subagent_id: String,
    pub subagent_role: String,
    pub calibration: JevCalibrationReceipt,
}

/// Load subagent personas from `registry/agents.json` with built-in fallback coverage for all 42 skills.
pub fn load_agent_personas(repo_root: &Path) -> Vec<AgentPersona> {
    let agents_path = repo_root.join("registry").join("agents.json");
    if let Ok(content) = fs::read_to_string(&agents_path) {
        if let Ok(parsed) = serde_json::from_str::<AgentsRegistryFile>(&content) {
            if !parsed.agents.is_empty() {
                return merge_with_fallback_personas(parsed.agents);
            }
        }
    }
    default_agent_personas()
}

fn merge_with_fallback_personas(mut loaded: Vec<AgentPersona>) -> Vec<AgentPersona> {
    let defaults = default_agent_personas();
    for def in defaults {
        if let Some(existing) = loaded.iter_mut().find(|a| a.id == def.id) {
            for sk in def.primary_skills {
                if !existing.primary_skills.contains(&sk) {
                    existing.primary_skills.push(sk);
                }
            }
            for sk in def.supporting_skills {
                if !existing.supporting_skills.contains(&sk) {
                    existing.supporting_skills.push(sk);
                }
            }
        } else {
            loaded.push(def);
        }
    }
    loaded
}

pub fn default_agent_personas() -> Vec<AgentPersona> {
    vec![
        AgentPersona {
            id: "orchestrator".to_string(),
            name: "Orchestrator".to_string(),
            role: "Autonomous Pipeline Manager & Task Delegator".to_string(),
            autonomy_level: "high".to_string(),
            primary_skills: vec![
                "get-fable".to_string(),
                "fable-spark".to_string(),
                "fable-delegate".to_string(),
                "fable-handoff".to_string(),
                "fable-council".to_string(),
            ],
            supporting_skills: vec![
                "fable-discover".to_string(),
                "fable-plan".to_string(),
                "fable-recover".to_string(),
                "fable-outcome-first".to_string(),
            ],
        },
        AgentPersona {
            id: "researcher".to_string(),
            name: "Researcher".to_string(),
            role: "Primary Source Investigator & Facts Grounder".to_string(),
            autonomy_level: "read-only".to_string(),
            primary_skills: vec![
                "fable-research".to_string(),
                "fable-discover".to_string(),
                "fable-memory".to_string(),
                "fable-context-thrift".to_string(),
                "fable-domain".to_string(),
            ],
            supporting_skills: vec!["fable-artifact".to_string(), "fable-config".to_string()],
        },
        AgentPersona {
            id: "architect".to_string(),
            name: "Architect".to_string(),
            role: "System Designer & Work Card Decomposer".to_string(),
            autonomy_level: "supervised".to_string(),
            primary_skills: vec![
                "fable-plan".to_string(),
                "fable-architecture".to_string(),
                "fable-artifact".to_string(),
                "fable-dataviz".to_string(),
                "fable-eco".to_string(),
                "fable-wise".to_string(),
                "fable-config".to_string(),
            ],
            supporting_skills: vec!["fable-discover".to_string(), "fable-council".to_string()],
        },
        AgentPersona {
            id: "executor".to_string(),
            name: "Executor".to_string(),
            role: "Bounded TDD & Code Implementer".to_string(),
            autonomy_level: "bounded".to_string(),
            primary_skills: vec![
                "fable-execute".to_string(),
                "fable-tdd".to_string(),
                "fable-cowork".to_string(),
                "fable-simplify".to_string(),
                "fable-method".to_string(),
                "fable-native-code".to_string(),
                "fable-scope-discipline".to_string(),
                "fable-finish-your-turn".to_string(),
                "fable-loop".to_string(),
                "fable-tend".to_string(),
                "fable-heal".to_string(),
            ],
            supporting_skills: vec!["fable-recover".to_string(), "fable-verify".to_string()],
        },
        AgentPersona {
            id: "verifier".to_string(),
            name: "Verifier".to_string(),
            role: "Independent Test Runner & Causal Proof Validator".to_string(),
            autonomy_level: "bounded".to_string(),
            primary_skills: vec![
                "fable-verify".to_string(),
                "fable-prove-it".to_string(),
                "fable-judge".to_string(),
                "fable-run".to_string(),
                "fable-release".to_string(),
                "fable-recover".to_string(),
            ],
            supporting_skills: vec!["fable-eval".to_string(), "fable-simulator".to_string()],
        },
        AgentPersona {
            id: "reviewer".to_string(),
            name: "Reviewer".to_string(),
            role: "Independent Diff & Standards Auditor".to_string(),
            autonomy_level: "read-only".to_string(),
            primary_skills: vec![
                "fable-review".to_string(),
                "fable-eval".to_string(),
                "fable-learning".to_string(),
                "fable-outcome-first".to_string(),
            ],
            supporting_skills: vec![
                "fable-security".to_string(),
                "fable-discover".to_string(),
                "fable-judge".to_string(),
            ],
        },
        AgentPersona {
            id: "security-auditor".to_string(),
            name: "Security Auditor".to_string(),
            role: "Threat Modeler & Vulnerability Analyst".to_string(),
            autonomy_level: "bounded".to_string(),
            primary_skills: vec![
                "fable-security".to_string(),
                "fable-redteam".to_string(),
                "fable-heal".to_string(),
            ],
            supporting_skills: vec![
                "fable-review".to_string(),
                "fable-discover".to_string(),
                "fable-config".to_string(),
            ],
        },
        AgentPersona {
            id: "simulator".to_string(),
            name: "Simulator".to_string(),
            role: "Headless Browser Inspector & Truthfulness Validator".to_string(),
            autonomy_level: "bounded".to_string(),
            primary_skills: vec!["fable-simulator".to_string(), "fable-run".to_string()],
            supporting_skills: vec!["fable-verify".to_string(), "fable-recover".to_string()],
        },
        AgentPersona {
            id: "author".to_string(),
            name: "Author".to_string(),
            role: "Skill Engineer & Prompt Optimizer".to_string(),
            autonomy_level: "bounded".to_string(),
            primary_skills: vec!["fable-skill-creator".to_string(), "fable-domain".to_string()],
            supporting_skills: vec![
                "fable-eval".to_string(),
                "fable-verify".to_string(),
                "fable-artifact".to_string(),
            ],
        },
    ]
}

/// Match a `SubtaskSpec` against all 42 Fable skills and subagent personas using the 6-factor
/// hybrid deterministic + Jev calibrated scoring matrix:
/// $$S(t, s, a) = 0.25 D_{\text{lex}} + 0.30 P_{\text{jev}}^{\text{choice}} + 0.20 Q_{\text{jev}}^{\text{score}} + 0.10 M_{\text{mythos}} + 0.10 A_{\text{agent}} + 0.05 G_{\text{phase}}$$
pub fn match_subtask_skill(
    subtask: &SubtaskSpec,
    state: Option<&FableState>,
    registry: &SkillRegistry,
    personas: &[AgentPersona],
    client: &JevClient,
) -> MatchedSubtask {
    // Hard lifecycle override 1: failure_streak >= 2 -> fable-recover unconditionally
    if let Some(st) = state {
        if st.failure_streak >= 2 {
            let recover_entry = registry
                .skills
                .iter()
                .find(|s| s.id == "fable-recover")
                .unwrap_or(&registry.skills[0]);
            let (agent_id, agent_role, _) = select_best_persona(&recover_entry.id, personas);
            let score = SkillMatchScore {
                skill_id: "fable-recover".to_string(),
                pack: recover_entry.pack.clone(),
                total_score: 1.0,
                lexical_score: 1.0,
                jev_choice_prob: 1.0,
                jev_rubric_score: 1.0,
                mythos_moe_score: 1.0,
                agent_affinity_score: 1.0,
                phase_gate_score: 1.0,
                reasons: vec![format!(
                    "Hard lifecycle override: failureStreak={} (>= 2) routes unconditionally to fable-recover",
                    st.failure_streak
                )],
            };
            let mut probs = BTreeMap::new();
            probs.insert("fable-recover".to_string(), 1.0);
            return MatchedSubtask {
                primary_skill: score.clone(),
                ranked_skills: vec![score],
                subagent_id: agent_id,
                subagent_role: agent_role,
                calibration: JevCalibrationReceipt {
                    model: client.model.clone(),
                    primitive: "choice".to_string(),
                    probabilities: probs,
                    shannon_entropy: 0.0,
                    normalized_entropy: 0.0,
                    calibrated_confidence: 1.0,
                    used_live_api: false,
                    cache_hit: false,
                },
            };
        }
    }

    // 1. Deterministic lexical router signal D_lex(t, s)
    let router_decision = route_task(&subtask.description, state, registry).ok();
    let max_router_score = router_decision
        .as_ref()
        .and_then(|d| d.scores.values().copied().fold(None, |acc: Option<f64>, v| {
            Some(acc.map_or(v, |a| a.max(v)))
        }))
        .unwrap_or(1.0)
        .max(1.0);

    let mut lex_scores: BTreeMap<String, f64> = BTreeMap::new();
    for sk in &registry.skills {
        let raw_router = router_decision
            .as_ref()
            .and_then(|d| d.scores.get(&sk.id).copied())
            .unwrap_or(0.0);
        let kw_bonus = compute_registry_keyword_match(&subtask.description, sk);
        let d_lex = ((raw_router / max_router_score) * 0.80 + kw_bonus * 0.20).clamp(0.0, 1.0);
        lex_scores.insert(sk.id.clone(), round4(d_lex));
    }

    // Select top 8 candidate skills for Jev choice & score primitives so probability mass is sharp
    let mut pre_ranked: Vec<(&SkillRegistryEntry, f64)> = registry
        .skills
        .iter()
        .filter(|s| s.id != "get-fable")
        .map(|s| {
            let l = lex_scores.get(&s.id).copied().unwrap_or(0.0);
            let m = compute_mythos_moe_score(&subtask.description, &subtask.phase_hint, s);
            (s, 0.7 * l + 0.3 * m)
        })
        .collect();
    pre_ranked.sort_by(|a, b| {
        b.1.partial_cmp(&a.1)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.0.order.cmp(&b.0.order))
    });

    let candidate_ids: Vec<String> = pre_ranked
        .iter()
        .take(8)
        .map(|(s, _)| s.id.clone())
        .collect();

    let choice_question = format!(
        "Select primary Fable specialist skill for subtask '{}' (phaseHint={}): {}",
        subtask.id, subtask.phase_hint, subtask.description
    );
    let choice_res = client.choice(&choice_question, &candidate_ids);

    let score_question = format!(
        "Score Fable specialist skill fit for subtask '{}' (phase={}, mutates={}): {}",
        subtask.id,
        subtask.phase_hint,
        !subtask.write_scope.is_empty(),
        subtask.description
    );
    let score_res = client.score(&score_question, &candidate_ids);

    let stale_verification = state
        .map(|st| st.verified_generation < (st.mutation_generation as i64))
        .unwrap_or(false);

    let mut all_scores: Vec<SkillMatchScore> = Vec::with_capacity(registry.skills.len());

    for sk in &registry.skills {
        if sk.id == "get-fable" {
            continue;
        }
        let d_lex = lex_scores.get(&sk.id).copied().unwrap_or(0.0);
        let p_jev_choice = choice_res
            .probabilities
            .get(&sk.id)
            .copied()
            .unwrap_or(0.0);
        let q_jev_score = score_res.scores.get(&sk.id).copied().unwrap_or(d_lex * 0.5);
        let m_mythos = compute_mythos_moe_score(&subtask.description, &subtask.phase_hint, sk);
        let (_, _, a_agent) = select_best_persona(&sk.id, personas);
        let g_phase = compute_phase_gate_score(sk, &subtask.phase_hint, state);

        let mut total = 0.25 * d_lex
            + 0.30 * p_jev_choice
            + 0.20 * q_jev_score
            + 0.10 * m_mythos
            + 0.10 * a_agent
            + 0.05 * g_phase;

        let mut reasons = Vec::new();
        if d_lex >= 0.5 {
            reasons.push(format!("Deterministic lexical match D_lex={:.2}", d_lex));
        }
        if p_jev_choice >= 0.20 {
            reasons.push(format!(
                "Jev System One choice probability P_jev={:.2}",
                p_jev_choice
            ));
        }
        if q_jev_score >= 0.60 {
            reasons.push(format!("Jev rubric score Q_jev={:.2}", q_jev_score));
        }
        if g_phase >= 0.90 {
            reasons.push(format!("Phase gate aligned with '{}'", subtask.phase_hint));
        }

        // Lifecycle stale-verification boost on verification subtasks
        if stale_verification
            && subtask.phase_hint == "verifying"
            && (sk.id == "fable-verify" || sk.id == "fable-prove-it")
        {
            total = (total + 0.15).min(0.99);
            reasons.push(
                "Stale verification override (verifiedGeneration < mutationGeneration)".to_string(),
            );
        }

        if reasons.is_empty() {
            reasons.push(format!("6-factor composite score {:.3}", total));
        }

        all_scores.push(SkillMatchScore {
            skill_id: sk.id.clone(),
            pack: sk.pack.clone(),
            total_score: round4(total),
            lexical_score: round4(d_lex),
            jev_choice_prob: round4(p_jev_choice),
            jev_rubric_score: round4(q_jev_score),
            mythos_moe_score: round4(m_mythos),
            agent_affinity_score: round4(a_agent),
            phase_gate_score: round4(g_phase),
            reasons,
        });
    }

    all_scores.sort_by(|a, b| {
        b.total_score
            .partial_cmp(&a.total_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.skill_id.cmp(&b.skill_id))
    });

    let primary = all_scores.first().cloned().unwrap_or_else(|| SkillMatchScore {
        skill_id: "fable-execute".to_string(),
        pack: "core".to_string(),
        total_score: 0.75,
        lexical_score: 0.75,
        jev_choice_prob: 0.75,
        jev_rubric_score: 0.75,
        mythos_moe_score: 0.75,
        agent_affinity_score: 1.0,
        phase_gate_score: 1.0,
        reasons: vec!["Default fallback to fable-execute".to_string()],
    });

    let (subagent_id, subagent_role, _) = select_best_persona(&primary.skill_id, personas);

    MatchedSubtask {
        primary_skill: primary,
        ranked_skills: all_scores,
        subagent_id,
        subagent_role,
        calibration: choice_res.receipt,
    }
}

fn round4(v: f64) -> f64 {
    (v * 10_000.0).round() / 10_000.0
}

fn compute_registry_keyword_match(description: &str, sk: &SkillRegistryEntry) -> f64 {
    let lower = description.to_lowercase();
    let mut hits = 0usize;
    for kw in &sk.keywords {
        if lower.contains(&kw.to_lowercase()) {
            hits += 1;
        }
    }
    for intent in &sk.intents {
        if lower.contains(&intent.to_lowercase()) {
            hits += 1;
        }
    }
    (hits as f64 * 0.35).clamp(0.0, 1.0)
}

fn compute_mythos_moe_score(
    description: &str,
    phase_hint: &str,
    sk: &SkillRegistryEntry,
) -> f64 {
    let lower = description.to_lowercase();
    let pack = sk.pack.as_str();

    let is_sec = lower.contains("security")
        || lower.contains("audit")
        || lower.contains("boundary")
        || lower.contains("boundaries")
        || lower.contains("redteam")
        || lower.contains("pentest");
    let is_ver = lower.contains("verify")
        || lower.contains("unit test")
        || lower.contains("validate")
        || lower.contains("prove");
    let is_mut = lower.contains("implement")
        || lower.contains("build")
        || lower.contains("add ")
        || lower.contains("create ")
        || lower.contains("src/")
        || lower.contains("crates/");

    let mut score: f64 = match (pack, phase_hint) {
        ("proof", "verifying") => 0.92,
        ("build", "executing") => 0.90,
        ("core", "executing") if sk.id == "fable-execute" && is_mut => 0.94,
        ("core", "verifying") if sk.id == "fable-verify" && is_ver => 0.95,
        ("core", "discovering") if sk.id == "fable-discover" => 0.92,
        ("intelligence", "discovering") => 0.90,
        ("system", "planned") => 0.88,
        ("delivery", "verifying") => 0.82,
        ("evolution", "verifying") => 0.80,
        ("creator", "executing") => 0.80,
        _ => 0.35,
    };

    if is_sec && (sk.id == "fable-security" || sk.id == "fable-redteam") {
        score = 0.98;
    } else if is_ver && sk.id == "fable-verify" {
        score = 0.97;
    } else if is_mut && !is_sec && !is_ver && (sk.id == "fable-execute" || sk.id == "fable-tdd") {
        score = 0.95;
    }

    score.clamp(0.0, 1.0)
}

fn compute_phase_gate_score(
    sk: &SkillRegistryEntry,
    phase_hint: &str,
    state: Option<&FableState>,
) -> f64 {
    let sk_phase = sk.phase.to_string();
    let mut score: f64 = if sk_phase == phase_hint {
        1.0
    } else if (phase_hint == "executing" && sk_phase == "verifying")
        || (phase_hint == "verifying" && sk_phase == "executing")
    {
        0.55
    } else {
        0.25
    };

    if let Some(st) = state {
        if st.phase == sk.phase {
            score = (score + 0.15).min(1.0);
        }
    }
    score
}

pub fn select_best_persona(skill_id: &str, personas: &[AgentPersona]) -> (String, String, f64) {
    for p in personas {
        if p.primary_skills.iter().any(|s| s == skill_id) {
            return (p.id.clone(), p.role.clone(), 1.0);
        }
    }
    for p in personas {
        if p.supporting_skills.iter().any(|s| s == skill_id) {
            return (p.id.clone(), p.role.clone(), 0.75);
        }
    }
    (
        "executor".to_string(),
        "Bounded TDD & Code Implementer".to_string(),
        0.55,
    )
}
