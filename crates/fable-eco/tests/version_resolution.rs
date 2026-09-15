use fable_eco::model::*;
use fable_eco::resolve::resolve_version;

#[test]
fn test_resolve_rtk_version() {
    let rtk: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml")
    ).unwrap();

    let resolved = resolve_version(&rtk).unwrap();
    assert_eq!(resolved.source_type, SourceType::GithubRelease);
    assert_eq!(resolved.resolved_version, ">=0.0.0");
}

#[test]
fn test_mutable_branch_rejected_in_version_resolution() {
    let mut rtk: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml")
    ).unwrap();
    rtk.version.revision = Some("main".to_string());

    let err = resolve_version(&rtk).unwrap_err();
    assert!(err.to_string().contains("ECO_MUTABLE_STABLE_REVISION"));
}
