use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OperationType {
    FetchMetadata,
    DownloadArtifact,
    VerifyDigest,
    ExtractArchive,
    InstallPackage,
    CopyFile,
    CreateDirectory,
    PatchJson,
    PatchToml,
    PatchYaml,
    PatchTextBlock,
    RegisterMcpServer,
    InstallSkill,
    WriteWrapper,
    RunHealthCheck,
    WriteInventory,
    WriteLock,
    NoOp,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlanOperation {
    pub id: String,
    #[serde(rename = "type")]
    pub op_type: OperationType,
    pub depends_on: Vec<String>,
    pub mutation: bool,
    pub reversible: bool,
    pub targets: Vec<String>,
    pub network: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub privilege_escalation: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SkippedItem {
    pub capability_id: String,
    pub reason_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InstallPlan {
    pub schema_version: u32,
    pub plan_id: String,
    pub selected: Vec<String>,
    pub skipped: Vec<SkippedItem>,
    pub warnings: Vec<String>,
    pub operations: Vec<PlanOperation>,
}
