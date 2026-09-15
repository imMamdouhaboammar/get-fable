use crate::error::EcoError;
use crate::model::capability::{CapabilityManifest, Permission, VersionChannel};
use crate::model::policy::{ActiveSecurityPolicy, EcoPolicy, NetworkPolicy};

pub fn check_capability_policy(
    manifest: &CapabilityManifest,
    policy: &EcoPolicy,
) -> Result<(), EcoError> {
    if manifest.version.channel == VersionChannel::Experimental && !policy.allow_experimental {
        return Err(EcoError::PolicyDenied(format!(
            "Capability {} is experimental, but policy forbids experimental capabilities",
            manifest.id
        )));
    }

    let requests_net = manifest.permissions.iter().any(|p| {
        matches!(
            p,
            Permission::NetworkPublicInternet | Permission::NetworkScopedTarget
        )
    }) || manifest.runtime.network_required;

    if requests_net && policy.network == NetworkPolicy::None {
        return Err(EcoError::PolicyDenied(format!(
            "Capability {} requests network access, but network policy is 'none'",
            manifest.id
        )));
    }

    let is_active_sec = manifest
        .permissions
        .contains(&Permission::SecurityActiveTesting);

    if is_active_sec && policy.active_security == ActiveSecurityPolicy::Deny {
        return Err(EcoError::PolicyDenied(format!(
            "Capability {} requires active security testing, which is denied by policy",
            manifest.id
        )));
    }

    Ok(())
}

pub fn check_active_security_policy(
    is_active_security: bool,
    policy: &EcoPolicy,
) -> Result<(), EcoError> {
    if is_active_security && policy.active_security == ActiveSecurityPolicy::Deny {
        return Err(EcoError::PolicyDenied(
            "Active security testing is denied by policy".into(),
        ));
    }
    Ok(())
}

pub fn compose_monotonic_policies(
    higher: &EcoPolicy,
    lower: &EcoPolicy,
) -> Result<EcoPolicy, EcoError> {
    let network = match (higher.network, lower.network) {
        (NetworkPolicy::None, _) => NetworkPolicy::None,
        (NetworkPolicy::MetadataOnly, NetworkPolicy::PublicInternet) => NetworkPolicy::MetadataOnly,
        (higher_net, _) => higher_net,
    };

    let active_sec = match (higher.active_security, lower.active_security) {
        (ActiveSecurityPolicy::Deny, _) => ActiveSecurityPolicy::Deny,
        (h, _) => h,
    };

    let allow_exp = higher.allow_experimental && lower.allow_experimental;
    let allow_proj = higher.allow_project_catalog && lower.allow_project_catalog;

    Ok(EcoPolicy {
        schema_version: 1,
        default_permission: "deny".into(),
        network,
        allowed_domains: higher.allowed_domains.clone(),
        active_security: active_sec,
        allow_project_catalog: allow_proj,
        allow_experimental: allow_exp,
    })
}
