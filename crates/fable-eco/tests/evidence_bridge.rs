use fable_core::{EvidenceKind, EvidenceResult};
use fable_eco::runtime::evidence::bridge_capability_result;
use fable_eco::runtime::result::{CapabilityResult, CapabilityResultStatus};

#[test]
fn test_bridge_capability_result_to_evidence() {
    let cap_result_pass = CapabilityResult {
        schema_version: 1,
        step_id: "step-test".into(),
        capability_id: "fable/rtk".into(),
        started_at: "2026-09-15T00:00:00Z".into(),
        finished_at: "2026-09-15T00:00:01Z".into(),
        status: CapabilityResultStatus::Passed,
        exit_code: Some(0),
        structured_output: None,
        artifact_refs: vec![],
        mutated_workspace: false,
        network_used: false,
        warnings: vec![],
        raw_output_digest: "sha256abc".into(),
        adapter_version: "1.0.0".into(),
    };

    let record = bridge_capability_result(
        &cap_result_pass,
        "test",
        42,
        Some("ws-123".into()),
    )
    .expect("bridge evidence");

    assert_eq!(record.kind, EvidenceKind::Test);
    assert_eq!(record.result, EvidenceResult::Pass);
    assert_eq!(record.generation, 42);
    assert_eq!(record.workspace_id, Some("ws-123".into()));
    assert_eq!(record.source, "eco:fable/rtk");

    let cap_result_fail = CapabilityResult {
        schema_version: 1,
        step_id: "step-sec".into(),
        capability_id: "fable/redteam".into(),
        started_at: "2026-09-15T00:00:00Z".into(),
        finished_at: "2026-09-15T00:00:02Z".into(),
        status: CapabilityResultStatus::Failed,
        exit_code: Some(1),
        structured_output: None,
        artifact_refs: vec![],
        mutated_workspace: false,
        network_used: false,
        warnings: vec![],
        raw_output_digest: "sha256def".into(),
        adapter_version: "1.0.0".into(),
    };

    let record_sec = bridge_capability_result(
        &cap_result_fail,
        "security",
        42,
        None,
    )
    .expect("bridge security evidence");

    assert_eq!(record_sec.kind, EvidenceKind::Security);
    assert_eq!(record_sec.result, EvidenceResult::Fail);
}
