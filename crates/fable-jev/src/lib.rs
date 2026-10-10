pub mod armory;
pub mod client;
pub mod decomposer;
pub mod dispatcher;
pub mod matcher;
pub mod types;

pub use armory::{arm_subagent, POLICY_OVERLAY_SKILLS};
pub use client::{JevClient, DEFAULT_TYPESAFE_API_BASE_URL, JEV_MODEL_VERSION};
pub use decomposer::{decompose_task, schedule_waves, schedule_waves_with_limit, verify_three_laws};
pub use dispatcher::orchestrate_task;
pub use matcher::{
    default_agent_personas, load_agent_personas, match_subtask_skill, select_best_persona,
    AgentPersona, MatchedSubtask,
};
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;
    use fable_core::find_repo_root;

    #[test]
    fn test_end_to_end_jev_orchestrate_wave_plan() {
        let cwd = std::env::current_dir().unwrap();
        let repo_root = find_repo_root(&cwd).unwrap_or(cwd);
        let task = "Audit security boundaries, implement gRPC rate limiter in src/rpc/server.ts, and verify with unit tests";

        let plan = orchestrate_task(task, 4, true, &repo_root, None)
            .expect("orchestrate_task should succeed");

        assert_eq!(plan.total_subtasks, 3);
        assert!(plan.total_waves >= 1);
        assert!(plan.overall_accuracy_score > 0.45);
        assert!(!plan.toon_summary.is_empty());

        let all_bundles: Vec<&ArmedSubagentBundle> =
            plan.waves.iter().flat_map(|w| w.bundles.iter()).collect();
        assert_eq!(all_bundles.len(), 3);

        // Subtask 1: Security Audit -> fable-security / security-auditor
        assert_eq!(all_bundles[0].primary_skill.skill_id, "fable-security");
        assert_eq!(all_bundles[0].subagent_id, "security-auditor");
        assert!(!all_bundles[0].co_armed_skills.is_empty());

        // Subtask 2: Implement gRPC rate limiter in src/rpc/server.ts -> fable-execute / executor
        assert_eq!(all_bundles[1].primary_skill.skill_id, "fable-execute");
        assert_eq!(all_bundles[1].subagent_id, "executor");
        let co_ids: Vec<&str> = all_bundles[1]
            .co_armed_skills
            .iter()
            .map(|c| c.skill_id.as_str())
            .collect();
        assert!(co_ids.contains(&"fable-native-code"));
        assert!(co_ids.contains(&"fable-scope-discipline"));

        // Subtask 3: Verify with unit tests -> fable-verify / verifier
        assert_eq!(all_bundles[2].primary_skill.skill_id, "fable-verify");
        assert_eq!(all_bundles[2].subagent_id, "verifier");
        let verify_co_ids: Vec<&str> = all_bundles[2]
            .co_armed_skills
            .iter()
            .map(|c| c.skill_id.as_str())
            .collect();
        assert!(verify_co_ids.contains(&"fable-prove-it"));

        // Every armed bundle must have a valid TOON delegation contract and TOON summary
        for b in &all_bundles {
            let v = fable_toon::validate_toon(&b.toon_contract);
            assert!(v.valid, "Invalid TOON contract: {:?}", v.error);
        }
        let summary_valid = fable_toon::validate_toon(&plan.toon_summary);
        assert!(summary_valid.valid, "Invalid TOON summary: {:?}", summary_valid.error);
    }

    #[test]
    fn test_failure_streak_recovery_override() {
        let cwd = std::env::current_dir().unwrap();
        let repo_root = find_repo_root(&cwd).unwrap_or(cwd.clone());
        let mut st = fable_core::create_initial_state(&cwd);
        st.failure_streak = 2;

        let plan = orchestrate_task(
            "Implement gRPC rate limiter in src/rpc/server.ts",
            4,
            true,
            &repo_root,
            Some(&st),
        )
        .expect("orchestrate_task with failureStreak=2 should succeed");

        assert_eq!(
            plan.waves[0].bundles[0].primary_skill.skill_id,
            "fable-recover"
        );
        assert_eq!(plan.waves[0].bundles[0].primary_skill.total_score, 1.0);
    }
}
