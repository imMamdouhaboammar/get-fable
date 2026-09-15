use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum NetworkPolicy {
    None,
    MetadataOnly,
    PublicInternet,
    Allowlist,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ActiveSecurityPolicy {
    Deny,
    ScopedOnly,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EcoPolicy {
    pub schema_version: u32,
    pub default_permission: String,
    pub network: NetworkPolicy,
    #[serde(default)]
    pub allowed_domains: Vec<String>,
    pub active_security: ActiveSecurityPolicy,
    #[serde(default)]
    pub allow_project_catalog: bool,
    #[serde(default)]
    pub allow_experimental: bool,
}

impl Default for EcoPolicy {
    fn default() -> Self {
        Self {
            schema_version: 1,
            default_permission: "deny".to_string(),
            network: NetworkPolicy::None,
            allowed_domains: Vec::new(),
            active_security: ActiveSecurityPolicy::Deny,
            allow_project_catalog: false,
            allow_experimental: false,
        }
    }
}
