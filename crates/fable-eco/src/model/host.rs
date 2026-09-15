use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HostDetectionStatus {
    Present,
    Absent,
    Unknown,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FeatureSupport {
    Supported,
    Unsupported,
    Unknown,
}


#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HostCapabilityMatrix {
    pub schema_version: u32,
    pub host_id: String,
    pub detection: HostDetectionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    pub features: BTreeMap<String, FeatureSupport>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HostDetection {
    pub host_id: String,
    pub status: HostDetectionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_root: Option<PathBuf>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_config_root: Option<PathBuf>,
    #[serde(default)]
    pub details: BTreeMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum HostPatchOperation {
    InsertJsonKey { key: String, value: serde_json::Value },
    RemoveJsonKey { key: String },
    ManagedTextBlock { block_id: String, content: String },
    RemoveTextBlock { block_id: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HostPatchPlan {
    pub host_id: String,
    pub target_path: PathBuf,
    pub operation: HostPatchOperation,
    pub precondition_digest: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HostBindingReceipt {
    pub schema_version: u32,
    pub host_id: String,
    pub target_path: PathBuf,
    #[serde(default)]
    pub owned_keys: Vec<String>,
    #[serde(default)]
    pub managed_blocks: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub precondition_digest: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result_digest: Option<String>,
}
