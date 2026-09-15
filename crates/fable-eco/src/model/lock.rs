use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LockEntry {
    pub capability_id: String,
    pub manifest_digest: String,
    pub source_type: String,
    pub source_repository: String,
    pub resolved_version: String,
    pub resolved_revision: String,
    pub install_driver: String,
    pub resolved_dependencies: Vec<String>,
    pub host_bindings: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_digest: Option<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Lockfile {
    pub schema_version: u32,
    pub profile: String,
    pub catalog_digest: String,
    pub entries: Vec<LockEntry>,
}
