use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub const FABLE_STATE_SCHEMA_VERSION: u32 = 3;
pub const FABLE_REGISTRY_SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FablePhase {
    Idle,
    Discovering,
    Planned,
    Executing,
    Verifying,
    Recovering,
    Complete,
    Blocked,
}

impl std::fmt::Display for FablePhase {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FablePhase::Idle => write!(f, "idle"),
            FablePhase::Discovering => write!(f, "discovering"),
            FablePhase::Planned => write!(f, "planned"),
            FablePhase::Executing => write!(f, "executing"),
            FablePhase::Verifying => write!(f, "verifying"),
            FablePhase::Recovering => write!(f, "recovering"),
            FablePhase::Complete => write!(f, "complete"),
            FablePhase::Blocked => write!(f, "blocked"),
        }
    }
}

impl std::str::FromStr for FablePhase {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "idle" => Ok(FablePhase::Idle),
            "discovering" => Ok(FablePhase::Discovering),
            "planned" => Ok(FablePhase::Planned),
            "executing" => Ok(FablePhase::Executing),
            "verifying" => Ok(FablePhase::Verifying),
            "recovering" => Ok(FablePhase::Recovering),
            "complete" => Ok(FablePhase::Complete),
            "blocked" => Ok(FablePhase::Blocked),
            other => Err(format!("Unknown lifecycle phase: {}", other)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FableTaskShape {
    Research,
    Architecture,
    BugFix,
    Feature,
    Delegation,
    Review,
    Security,
    Release,
    Handoff,
    Eval,
    BoundedChange,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EvidenceResult {
    Pass,
    Fail,
}

impl std::fmt::Display for EvidenceResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EvidenceResult::Pass => write!(f, "pass"),
            EvidenceResult::Fail => write!(f, "fail"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EvidenceKind {
    Test,
    Build,
    Runtime,
    Review,
    Observation,
    Security,
    Research,
    Receipt,
    Handoff,
}

impl std::fmt::Display for EvidenceKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EvidenceKind::Test => write!(f, "test"),
            EvidenceKind::Build => write!(f, "build"),
            EvidenceKind::Runtime => write!(f, "runtime"),
            EvidenceKind::Review => write!(f, "review"),
            EvidenceKind::Observation => write!(f, "observation"),
            EvidenceKind::Security => write!(f, "security"),
            EvidenceKind::Research => write!(f, "research"),
            EvidenceKind::Receipt => write!(f, "receipt"),
            EvidenceKind::Handoff => write!(f, "handoff"),
        }
    }
}

impl std::str::FromStr for EvidenceKind {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "test" => Ok(EvidenceKind::Test),
            "build" => Ok(EvidenceKind::Build),
            "runtime" => Ok(EvidenceKind::Runtime),
            "review" => Ok(EvidenceKind::Review),
            "observation" => Ok(EvidenceKind::Observation),
            "security" => Ok(EvidenceKind::Security),
            "research" => Ok(EvidenceKind::Research),
            "receipt" => Ok(EvidenceKind::Receipt),
            "handoff" => Ok(EvidenceKind::Handoff),
            other => Err(format!("Unknown evidence kind: {}", other)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceRecord {
    pub kind: EvidenceKind,
    pub source: String,
    pub result: EvidenceResult,
    pub detail: String,
    pub generation: u64,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repository_revision: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command_category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRegistryEntry {
    pub id: String,
    pub order: u32,
    pub phase: FablePhase,
    pub pack: String,
    pub description: String,
    pub intents: Vec<String>,
    pub requires: Vec<String>,
    pub produces: Vec<String>,
    pub gates: Vec<String>,
    pub fallback: Option<String>,
    pub mutates_workspace: bool,
    pub parallel_safe: bool,
    pub next: Vec<String>,
    pub keywords: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillRegistry {
    pub schema_version: u32,
    pub entry: String,
    pub skills: Vec<SkillRegistryEntry>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutingDecision {
    pub selected_skill: String,
    pub selected_pack: String,
    pub task_shape: FableTaskShape,
    pub confidence: f64,
    pub reasons: Vec<String>,
    pub requires_plan: bool,
    pub required_gates: Vec<String>,
    pub fallback_skill: Option<String>,
    pub parallel_candidates: Vec<String>,
    pub next_skills: Vec<String>,
    pub scores: HashMap<String, f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FableState {
    pub schema_version: u32,
    pub state_revision: u64,
    pub workspace_id: String,
    pub phase: FablePhase,
    pub current_skill: Option<String>,
    pub failure_streak: u32,
    pub substantial: bool,
    pub mutation_generation: u64,
    pub verified_generation: u64,
    pub active_card: Option<String>,
    pub last_decision: Option<RoutingDecision>,
    pub evidence: Vec<EvidenceRecord>,
    pub updated_at: String,
}
