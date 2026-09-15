use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CapabilityResultStatus {
    Passed,
    Failed,
    Blocked,
    Skipped,
    Timeout,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityResult {
    pub schema_version: u32,
    pub step_id: String,
    pub capability_id: String,
    pub started_at: String,
    pub finished_at: String,
    pub status: CapabilityResultStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structured_output: Option<serde_json::Value>,
    #[serde(default)]
    pub artifact_refs: Vec<String>,
    pub mutated_workspace: bool,
    pub network_used: bool,
    #[serde(default)]
    pub warnings: Vec<String>,
    pub raw_output_digest: String,
    pub adapter_version: String,
}
