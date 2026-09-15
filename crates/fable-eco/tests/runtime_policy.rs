use fable_eco::model::capability::{CapabilityManifest, Permission, VersionChannel};
use fable_eco::model::policy::{ActiveSecurityPolicy, EcoPolicy, NetworkPolicy};
use fable_eco::policy::{
    check_active_security_policy, check_capability_policy, compose_monotonic_policies,
};

#[test]
fn test_policy_deny_network_and_experimental() {
    let toml_str =
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml");
    let mut manifest: CapabilityManifest =
        toml::from_str(toml_str).expect("parse rtk manifest");

    let mut policy = EcoPolicy::default(); // default: network=none, experimental=false, active_sec=deny

    // Add network permission requirement
    manifest.permissions.push(Permission::NetworkPublicInternet);

    // Manifest now requests network, so network=none denies it
    let err_net = check_capability_policy(&manifest, &policy);
    assert!(err_net.is_err());

    policy.network = NetworkPolicy::PublicInternet;
    assert!(check_capability_policy(&manifest, &policy).is_ok());

    // Switch to experimental channel
    manifest.version.channel = VersionChannel::Experimental;
    let err_exp = check_capability_policy(&manifest, &policy);
    assert!(err_exp.is_err());

    policy.allow_experimental = true;
    assert!(check_capability_policy(&manifest, &policy).is_ok());

    // Active security check
    assert!(check_active_security_policy(true, &policy).is_err());
    policy.active_security = ActiveSecurityPolicy::ScopedOnly;
    assert!(check_active_security_policy(true, &policy).is_ok());
}

#[test]
fn test_monotonic_policy_composition() {
    let enterprise = EcoPolicy {
        schema_version: 1,
        default_permission: "deny".into(),
        network: NetworkPolicy::None,
        allowed_domains: vec![],
        active_security: ActiveSecurityPolicy::Deny,
        allow_project_catalog: false,
        allow_experimental: false,
    };

    let user_permissive = EcoPolicy {
        schema_version: 1,
        default_permission: "deny".into(),
        network: NetworkPolicy::PublicInternet,
        allowed_domains: vec![],
        active_security: ActiveSecurityPolicy::ScopedOnly,
        allow_project_catalog: true,
        allow_experimental: true,
    };

    let composed = compose_monotonic_policies(&enterprise, &user_permissive).expect("compose");
    assert_eq!(composed.network, NetworkPolicy::None);
    assert_eq!(composed.active_security, ActiveSecurityPolicy::Deny);
    assert!(!composed.allow_experimental);
}
