use fable_eco::model::*;

#[test]
fn capability_id_requires_namespace_and_name() {
    assert!("fable/rtk".parse::<CapabilityId>().is_ok());
    assert!("rtk".parse::<CapabilityId>().is_err());
    assert!("fable/../rtk".parse::<CapabilityId>().is_err());
    assert!("fable//rtk".parse::<CapabilityId>().is_err());
    assert!("/rtk".parse::<CapabilityId>().is_err());
    assert!("fable/".parse::<CapabilityId>().is_err());
    assert!("Fable/rtk".parse::<CapabilityId>().is_err());
}

#[test]
fn parses_and_roundtrips_rtk_example() {
    let toml_str =
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml");
    let manifest: CapabilityManifest = toml::from_str(toml_str).expect("should parse rtk manifest");
    assert_eq!(manifest.id.to_string(), "fable/rtk");
    assert_eq!(manifest.kind, CapabilityKind::Tool);
    assert_eq!(manifest.install.driver, InstallDriver::GithubRelease);
    assert_eq!(manifest.version.channel, VersionChannel::Stable);
    assert_eq!(manifest.governance.support_tier, SupportTier::Stable);
    assert_eq!(manifest.permissions.len(), 2);
    assert_eq!(manifest.dependencies.len(), 1);
    assert_eq!(manifest.conflicts.len(), 1);
    assert_eq!(manifest.hosts.len(), 2);

    let serialized = toml::to_string(&manifest).expect("should serialize");
    let roundtripped: CapabilityManifest = toml::from_str(&serialized).expect("should roundtrip");
    assert_eq!(manifest, roundtripped);
}

#[test]
fn parses_and_roundtrips_codegraph_example() {
    let toml_str =
        include_str!("../../../docs/fable-eco-production-spec/examples/codegraph.capability.toml");
    let manifest: CapabilityManifest =
        toml::from_str(toml_str).expect("should parse codegraph manifest");
    assert_eq!(manifest.id.to_string(), "fable/codegraph");
    assert_eq!(manifest.kind, CapabilityKind::Tool);
    assert_eq!(manifest.install.driver, InstallDriver::GitCheckout);
    assert_eq!(manifest.source.source_type, SourceType::GitRevision);

    let serialized = toml::to_string(&manifest).expect("should serialize");
    let roundtripped: CapabilityManifest = toml::from_str(&serialized).expect("should roundtrip");
    assert_eq!(manifest, roundtripped);
}
