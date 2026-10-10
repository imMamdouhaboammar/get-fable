use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JevPrimitive {
    Choice,
    Noul,
    Score,
}

impl std::fmt::Display for JevPrimitive {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JevPrimitive::Choice => write!(f, "choice"),
            JevPrimitive::Noul => write!(f, "noul"),
            JevPrimitive::Score => write!(f, "score"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JevCalibrationReceipt {
    pub model: String,
    pub primitive: String,
    pub probabilities: BTreeMap<String, f64>,
    pub shannon_entropy: f64,
    pub normalized_entropy: f64,
    pub calibrated_confidence: f64,
    pub used_live_api: bool,
    pub cache_hit: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JevChoiceResult {
    pub winner: String,
    pub probabilities: BTreeMap<String, f64>,
    pub receipt: JevCalibrationReceipt,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JevNoulResult {
    pub winner: Option<String>,
    pub null_probability: f64,
    pub probabilities: BTreeMap<String, f64>,
    pub receipt: JevCalibrationReceipt,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JevScoreResult {
    pub scores: BTreeMap<String, f64>,
    pub receipt: JevCalibrationReceipt,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubtaskSpec {
    pub id: String,
    pub title: String,
    pub description: String,
    pub read_scope: Vec<String>,
    pub write_scope: Vec<String>,
    pub shared_contracts: Vec<String>,
    pub verification_cmd: String,
    pub phase_hint: String,
    pub wave: usize,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IndependenceProof {
    pub write_independent: bool,
    pub semantic_independent: bool,
    pub verification_independent: bool,
    pub conflicts: Vec<String>,
    pub jev_semantic_overlap_score: f64,
}

impl IndependenceProof {
    pub fn all_laws_satisfied(&self) -> bool {
        self.write_independent && self.semantic_independent && self.verification_independent
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillMatchScore {
    pub skill_id: String,
    pub pack: String,
    pub total_score: f64,
    pub lexical_score: f64,
    pub jev_choice_prob: f64,
    pub jev_rubric_score: f64,
    pub mythos_moe_score: f64,
    pub agent_affinity_score: f64,
    pub phase_gate_score: f64,
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoArmedSkill {
    pub skill_id: String,
    pub role: String,
    pub jev_score: f64,
    pub directive: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArmedSubagentBundle {
    pub subtask: SubtaskSpec,
    pub subagent_id: String,
    pub subagent_role: String,
    pub primary_skill: SkillMatchScore,
    pub co_armed_skills: Vec<CoArmedSkill>,
    pub armed_tools: Vec<String>,
    pub armed_engines: Vec<String>,
    pub failure_lessons: Vec<String>,
    pub required_gates: Vec<String>,
    pub compiled_skill_excerpt: String,
    pub toon_contract: String,
    pub calibration: JevCalibrationReceipt,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelegationWave {
    pub wave_index: usize,
    pub parallel: bool,
    pub independence_proof: IndependenceProof,
    pub bundles: Vec<ArmedSubagentBundle>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DelegationWavePlan {
    pub task: String,
    pub total_subtasks: usize,
    pub total_waves: usize,
    pub overall_accuracy_score: f64,
    pub waves: Vec<DelegationWave>,
    pub toon_summary: String,
}
