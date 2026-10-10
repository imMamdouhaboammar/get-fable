use crate::armory::arm_subagent;
use crate::client::JevClient;
use crate::decomposer::{decompose_task, schedule_waves_with_limit};
use crate::matcher::{load_agent_personas, match_subtask_skill};
use crate::types::{ArmedSubagentBundle, DelegationWave, DelegationWavePlan};
use fable_core::{load_skill_registry, FableState};
use fable_toon::encode_toon;
use serde_json::json;
use std::path::Path;

/// Orchestrate a complex task end-to-end:
/// 1. Decompose into atomic `SubtaskSpec` items
/// 2. Verify the 3 Laws of Delegation (Write, Semantic, Verification Independence) and schedule waves
/// 3. Score all 42 skills and subagent personas using the 6-factor Jev-calibrated matrix
/// 4. Dynamically arm each subagent with primary skill, co-armed policy overlays, tools, engines,
///    failure lessons, and TOON delegation contracts.
pub fn orchestrate_task(
    task: &str,
    max_agents: usize,
    offline: bool,
    repo_root: &Path,
    state: Option<&FableState>,
) -> Result<DelegationWavePlan, String> {
    let trimmed = task.trim();
    if trimmed.is_empty() {
        return Err("Task string must not be empty".to_string());
    }

    let registry = load_skill_registry(repo_root)?;
    let personas = load_agent_personas(repo_root);
    let client = JevClient::new(offline);

    let max_per_wave = max_agents.max(1);
    let subtasks = decompose_task(trimmed, max_per_wave * 4);
    let total_subtasks = subtasks.len();

    let scheduled = schedule_waves_with_limit(subtasks, &client, max_per_wave);
    let total_waves = scheduled.len();

    let mut waves: Vec<DelegationWave> = Vec::with_capacity(total_waves);
    let mut accuracy_sum = 0.0_f64;
    let mut bundle_count = 0usize;

    for (wave_index, independence_proof, wave_subtasks) in scheduled {
        let all_write_scopes_in_wave: Vec<String> = wave_subtasks
            .iter()
            .flat_map(|st| st.write_scope.iter().cloned())
            .collect();

        let mut bundles: Vec<ArmedSubagentBundle> = Vec::with_capacity(wave_subtasks.len());
        for st in &wave_subtasks {
            let matched = match_subtask_skill(st, state, &registry, &personas, &client);
            let bundle = arm_subagent(
                st,
                &matched,
                &all_write_scopes_in_wave,
                &registry,
                repo_root,
                &client,
            );
            let bundle_acc = 0.55 * bundle.primary_skill.total_score
                + 0.45 * bundle.calibration.calibrated_confidence;
            accuracy_sum += bundle_acc;
            bundle_count += 1;
            bundles.push(bundle);
        }

        let parallel = bundles.len() > 1 && independence_proof.all_laws_satisfied();
        waves.push(DelegationWave {
            wave_index,
            parallel,
            independence_proof,
            bundles,
        });
    }

    let overall_accuracy_score = if bundle_count > 0 {
        ((accuracy_sum / (bundle_count as f64)).clamp(0.0, 1.0) * 10_000.0).round() / 10_000.0
    } else {
        0.0
    };

    let summary_rows: Vec<serde_json::Value> = waves
        .iter()
        .flat_map(|w| {
            w.bundles.iter().map(move |b| {
                json!({
                    "wave": w.wave_index,
                    "parallel": w.parallel,
                    "subtaskId": b.subtask.id,
                    "subagent": b.subagent_id,
                    "primarySkill": b.primary_skill.skill_id,
                    "score": b.primary_skill.total_score,
                    "coArmed": b.co_armed_skills.iter().map(|c| c.skill_id.as_str()).collect::<Vec<_>>().join("+"),
                    "confidence": b.calibration.calibrated_confidence,
                })
            })
        })
        .collect();

    let toon_summary = encode_toon(&json!({
        "task": trimmed,
        "totalSubtasks": total_subtasks,
        "totalWaves": total_waves,
        "overallAccuracyScore": overall_accuracy_score,
        "assignments": summary_rows,
    }));

    Ok(DelegationWavePlan {
        task: trimmed.to_string(),
        total_subtasks,
        total_waves,
        overall_accuracy_score,
        waves,
        toon_summary,
    })
}
