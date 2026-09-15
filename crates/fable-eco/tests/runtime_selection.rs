use fable_eco::model::capability::CapabilityManifest;
use fable_eco::model::host::{FeatureSupport, HostCapabilityMatrix, HostDetectionStatus};
use fable_eco::model::policy::EcoPolicy;
use fable_eco::runtime::input::RoutingDecisionInput;
use fable_eco::runtime::planner::plan_runtime_execution;
use fable_eco::runtime::playbook::Playbook;
use std::collections::BTreeMap;

#[test]
fn test_plan_runtime_minimal_selection() {
    let playbook_str = r#"
schema_version: 1
id: test-plan
match:
  task_shape: code_investigation
steps:
  - id: step-search
    requires_feature: code.graph.query
    required: true
    minimum_grade: C
    evidence: research
fallback_policy:
  allow_provider_fallback: false
  allow_grade_downgrade: false
"#;
    let playbook = Playbook::parse_str(playbook_str).expect("parse playbook");

    let codegraph_toml =
        include_str!("../../../docs/fable-eco-production-spec/examples/codegraph.capability.toml");
    let codegraph: CapabilityManifest = toml::from_str(codegraph_toml).expect("parse codegraph manifest");

    let decision = RoutingDecisionInput {
        selected_skill: "fable-discover".into(),
        selected_pack: "core".into(),
        task_shape: "code_investigation".into(),
        confidence: 0.9,
        reasons: vec!["investigate codebase".into()],
        requires_plan: false,
        decision_digest: "digest123".into(),
    };

    let mut features = BTreeMap::new();
    features.insert("skills".into(), FeatureSupport::Supported);
    let host_matrix = HostCapabilityMatrix {
        schema_version: 1,
        host_id: "claude".into(),
        detection: HostDetectionStatus::Present,
        version: None,
        features,
    };

    let policy = EcoPolicy::default();

    let contract = plan_runtime_execution(
        &decision,
        &playbook,
        &[codegraph],
        &host_matrix,
        &policy,
    )
    .expect("plan execution");

    assert_eq!(contract.capabilities.len(), 1);
    assert_eq!(contract.capabilities[0].id, "fable/codegraph");
    assert_eq!(contract.steps.len(), 1);
    assert_eq!(contract.steps[0].capability_id, "fable/codegraph");
    assert_eq!(contract.evidence_expectations.len(), 1);
    assert_eq!(contract.evidence_expectations[0].kind, "research");
    assert!(!contract.canonical_digest().is_empty());
}
