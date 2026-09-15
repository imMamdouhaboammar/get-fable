use fable_eco::host::{ClaudeHostAdapter, CodexHostAdapter};
use fable_eco::model::capability::EnforcementGrade;
use fable_eco::model::host::{
    FeatureSupport, HostBindingReceipt, HostCapabilityMatrix, HostDetectionStatus,
};
use fable_eco::model::machine::{Fact, HostFact, MachineFacts};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[test]
fn test_enforcement_grade_and_satisfaction() {
    assert!(EnforcementGrade::A.is_enforceable());
    assert!(EnforcementGrade::B.is_enforceable());
    assert!(!EnforcementGrade::C.is_enforceable());
    assert!(!EnforcementGrade::N.is_enforceable());

    assert!(EnforcementGrade::A.satisfies(&EnforcementGrade::A));
    assert!(EnforcementGrade::A.satisfies(&EnforcementGrade::B));
    assert!(EnforcementGrade::B.satisfies(&EnforcementGrade::C));
    assert!(!EnforcementGrade::C.satisfies(&EnforcementGrade::B));
}

#[test]
fn test_host_adapters_detection_and_matrix() {
    let facts = MachineFacts {
        os: Fact::Present("macos".into()),
        arch: Fact::Present("aarch64".into()),
        runtimes: Vec::new(),
        hosts: vec![
            HostFact {
                id: "claude".into(),
                config_dir: Some("/tmp/fake-claude".into()),
                installed: true,
                version: Some("1.0.0".into()),
            },
            HostFact {
                id: "codex".into(),
                config_dir: None,
                installed: false,
                version: None,
            },
        ],
    };

    let claude = ClaudeHostAdapter::new();
    let codex = CodexHostAdapter::new();

    let claude_det = claude.detect(&facts);
    assert_eq!(claude_det.host_id, "claude");
    assert_eq!(claude_det.status, HostDetectionStatus::Present);

    let codex_det = codex.detect(&facts);
    assert_eq!(codex_det.host_id, "codex");
    assert_eq!(codex_det.status, HostDetectionStatus::Absent);

    let claude_mat = claude.capability_matrix(&facts);
    assert_eq!(claude_mat.features.get("skills"), Some(&FeatureSupport::Supported));
    assert_eq!(claude_mat.features.get("pre_tool_hook"), Some(&FeatureSupport::Supported));

    let codex_mat = codex.capability_matrix(&facts);
    assert_eq!(codex_mat.features.get("skills"), Some(&FeatureSupport::Supported));
    assert_eq!(codex_mat.features.get("pre_tool_hook"), Some(&FeatureSupport::Unknown));
}

#[test]
fn test_host_matrix_json_roundtrip() {
    let mut features = BTreeMap::new();
    features.insert("skills".into(), FeatureSupport::Supported);
    features.insert("mcp".into(), FeatureSupport::Unsupported);
    features.insert("hooks".into(), FeatureSupport::Unknown);

    let matrix = HostCapabilityMatrix {
        schema_version: 1,
        host_id: "test-host".into(),
        detection: HostDetectionStatus::Present,
        version: Some("1.2.3".into()),
        features,
    };

    let json_str = serde_json::to_string(&matrix).expect("serialize matrix");
    let parsed: HostCapabilityMatrix = serde_json::from_str(&json_str).expect("deserialize matrix");
    assert_eq!(matrix, parsed);
}

#[test]
fn test_binding_receipt_json_roundtrip() {
    let receipt = HostBindingReceipt {
        schema_version: 1,
        host_id: "claude".into(),
        target_path: PathBuf::from("/tmp/CLAUDE.md"),
        owned_keys: vec!["eco_key".into()],
        managed_blocks: vec!["eco-block-1".into()],
        precondition_digest: Some("abc".into()),
        result_digest: Some("def".into()),
    };

    let json_str = serde_json::to_string(&receipt).expect("serialize receipt");
    let parsed: HostBindingReceipt = serde_json::from_str(&json_str).expect("deserialize receipt");
    assert_eq!(receipt, parsed);
}
