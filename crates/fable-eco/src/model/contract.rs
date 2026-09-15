use crate::model::capability::EnforcementGrade;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ContractStepMode {
    HostSkill,
    Cli,
    Mcp,
    Plugin,
    Wrapper,
    DelegatedAgent,
    ManualGate,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContractCapability {
    pub id: String,
    pub version: String,
    pub enforcement_grade: EnforcementGrade,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContractStep {
    pub id: String,
    pub capability_id: String,
    pub mode: ContractStepMode,
    pub required: bool,
    pub minimum_grade: EnforcementGrade,
    pub timeout_ms: u64,
    #[serde(default)]
    pub fallback_capabilities: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EvidenceExpectation {
    pub step_id: String,
    pub kind: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ExecutionContract {
    pub schema_version: u32,
    pub contract_id: String,
    pub routing_decision_digest: String,
    pub host_id: String,
    pub capabilities: Vec<ContractCapability>,
    pub steps: Vec<ContractStep>,
    pub permissions: Vec<String>,
    pub evidence_expectations: Vec<EvidenceExpectation>,
    pub stop_conditions: Vec<String>,
}

impl ExecutionContract {
    pub fn canonical_digest(&self) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(self.contract_id.as_bytes());
        hasher.update(self.routing_decision_digest.as_bytes());
        hasher.update(self.host_id.as_bytes());
        for c in &self.capabilities {
            hasher.update(format!("{}:{}:{:?}", c.id, c.version, c.enforcement_grade).as_bytes());
        }
        format!("{:x}", hasher.finalize())
    }
}
