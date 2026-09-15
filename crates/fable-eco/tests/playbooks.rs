use fable_eco::runtime::input::RoutingDecisionInput;
use fable_eco::runtime::playbook::Playbook;

#[test]
fn test_parse_yaml_playbook_and_matching() {
    let yaml_content = r#"
schema_version: 1
id: test-bug-fix
match:
  task_shape: bug_fix
  selected_skill: fable-tdd
steps:
  - id: locate-code
    requires_feature: code-search
    required: true
    minimum_grade: B
    evidence: research
  - id: run-tests
    requires_feature: test-runner
    required: true
    minimum_grade: A
    evidence: test
fallback_policy:
  allow_provider_fallback: true
  allow_grade_downgrade: false
"#;

    let pb = Playbook::parse_str(yaml_content).expect("parse yaml playbook");
    assert_eq!(pb.id, "test-bug-fix");
    assert_eq!(pb.steps.len(), 2);
    assert!(pb.fallback_policy.allow_provider_fallback);
    assert!(!pb.fallback_policy.allow_grade_downgrade);

    let decision_match = RoutingDecisionInput {
        selected_skill: "fable-tdd".into(),
        selected_pack: "build".into(),
        task_shape: "bug_fix".into(),
        confidence: 0.95,
        reasons: vec!["bug fix requested".into()],
        requires_plan: false,
        decision_digest: "abcdef".into(),
    };
    assert!(pb.matches_routing(&decision_match));

    let decision_mismatch = RoutingDecisionInput {
        selected_skill: "fable-execute".into(),
        selected_pack: "core".into(),
        task_shape: "feature_addition".into(),
        confidence: 0.8,
        reasons: vec!["new feature".into()],
        requires_plan: false,
        decision_digest: "123456".into(),
    };
    assert!(!pb.matches_routing(&decision_mismatch));
}
