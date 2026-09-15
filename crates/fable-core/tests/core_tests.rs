use fable_core::*;

#[test]
fn test_workspace_id_digest() {
    let cwd = std::env::current_dir().unwrap();
    let id = workspace_id_for_target(&cwd);
    assert_eq!(id.len(), 24);
    assert!(id.chars().all(|c| c.is_ascii_hexdigit()));
}

#[test]
fn test_state_mutation_and_evidence() {
    let cwd = std::env::current_dir().unwrap();
    let mut state = create_initial_state(&cwd);
    assert_eq!(state.mutation_generation, 0);
    assert_eq!(state.verified_generation, 0);

    record_mutation(&mut state);
    assert_eq!(state.mutation_generation, 1);
    assert!(state.substantial);
    assert!(!has_fresh_passing_evidence(&state));

    let record = EvidenceRecord {
        kind: EvidenceKind::Test,
        source: "cargo test".to_string(),
        result: EvidenceResult::Pass,
        detail: "all tests passed".to_string(),
        generation: 1,
        timestamp: chrono::Utc::now().to_rfc3339(),
        workspace_id: Some(state.workspace_id.clone()),
        repository_revision: None,
        command_category: None,
        scope: None,
        receipt_id: None,
    };

    add_evidence(&mut state, record);
    assert_eq!(state.verified_generation, 1);
    assert!(has_fresh_passing_evidence(&state));

    // Transition to complete
    let res = transition_state(&mut state, FablePhase::Complete);
    assert!(res.is_ok());
    assert_eq!(state.phase, FablePhase::Complete);
}

#[test]
fn test_deterministic_router_rules() {
    let cwd = std::env::current_dir().unwrap();
    let repo_root = find_repo_root(&cwd).expect("Should find repo root");
    let registry = load_skill_registry(&repo_root).expect("Should load registry");

    let decision_security = route_task("audit the authentication and oauth endpoints for injection", None, &registry).unwrap();
    assert_eq!(decision_security.selected_skill, "fable-security");
    assert_eq!(decision_security.selected_pack, "proof");

    let decision_redteam = route_task("conduct an ethical redteam penetration test on our api target", None, &registry).unwrap();
    assert_eq!(decision_redteam.selected_skill, "fable-redteam");

    let decision_release = route_task("prepare release and open pr for merge", None, &registry).unwrap();
    assert_eq!(decision_release.selected_skill, "fable-release");

    let decision_plan = route_task("plan the multi-file architecture migration", None, &registry).unwrap();
    assert_eq!(decision_plan.selected_skill, "fable-plan");
    assert!(decision_plan.requires_plan);
}
