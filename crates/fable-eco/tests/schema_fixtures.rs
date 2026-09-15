use fable_eco::catalog::validate_manifest;
use fable_eco::model::*;

#[test]
fn test_valid_examples_pass_semantic_validation() {
    let rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    assert!(validate_manifest(&rtk).is_ok());

    let codegraph: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/codegraph.capability.toml"
    ))
    .unwrap();
    assert!(validate_manifest(&codegraph).is_ok());
}

#[test]
fn test_self_dependency_fails_validation() {
    let mut rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    rtk.dependencies.push(DependencyEdge {
        dep_type: DependencyType::Required,
        target: "fable/rtk".to_string(),
        constraint: None,
    });
    let err = validate_manifest(&rtk).unwrap_err();
    assert!(err
        .to_string()
        .contains("cannot declare dependency on itself"));
}

#[test]
fn test_self_conflict_fails_validation() {
    let mut rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    rtk.conflicts.push(ConflictRule {
        kind: ConflictKind::Hard,
        target: "fable/rtk".to_string(),
        reason_code: "SELF_CONFLICT".to_string(),
    });
    let err = validate_manifest(&rtk).unwrap_err();
    assert!(err
        .to_string()
        .contains("cannot declare conflict against itself"));
}

#[test]
fn test_mutable_branch_on_stable_channel_fails() {
    let mut rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    rtk.version.revision = Some("main".to_string());
    let err = validate_manifest(&rtk).unwrap_err();
    assert!(err.to_string().contains("mutable branch 'main' forbidden"));
}

#[test]
fn test_insecure_source_scheme_fails() {
    let mut rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    rtk.source.repository = "http://insecure.example.com/repo".to_string();
    let err = validate_manifest(&rtk).unwrap_err();
    assert!(err.to_string().contains("invalid repository scheme"));
}

#[test]
fn test_empty_platforms_fails() {
    let mut rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    rtk.platforms.clear();
    let err = validate_manifest(&rtk).unwrap_err();
    assert!(err.to_string().contains("platforms list cannot be empty"));
}

#[test]
fn test_duplicate_hosts_fails() {
    let mut rtk: CapabilityManifest = toml::from_str(include_str!(
        "../../../docs/fable-eco-production-spec/examples/rtk.capability.toml"
    ))
    .unwrap();
    rtk.hosts.push(HostBinding {
        id: "codex".to_string(),
        mode: HostMode::Mcp,
        minimum_grade: None,
    });
    let err = validate_manifest(&rtk).unwrap_err();
    assert!(err.to_string().contains("duplicate host id 'codex'"));
}
