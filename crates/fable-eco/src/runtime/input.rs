use fable_core::RoutingDecision;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RoutingDecisionInput {
    pub selected_skill: String,
    pub selected_pack: String,
    pub task_shape: String,
    pub confidence: f64,
    pub reasons: Vec<String>,
    pub requires_plan: bool,
    pub decision_digest: String,
}

impl From<&RoutingDecision> for RoutingDecisionInput {
    fn from(rd: &RoutingDecision) -> Self {
        let payload = format!("{}:{}:{:?}", rd.selected_skill, rd.selected_pack, rd.task_shape);
        let mut hasher = Sha256::new();
        hasher.update(payload.as_bytes());
        let digest = format!("{:x}", hasher.finalize());

        Self {
            selected_skill: rd.selected_skill.clone(),
            selected_pack: rd.selected_pack.clone(),
            task_shape: format!("{:?}", rd.task_shape).to_lowercase(),
            confidence: rd.confidence,
            reasons: rd.reasons.clone(),
            requires_plan: rd.requires_plan,
            decision_digest: digest,
        }
    }
}
