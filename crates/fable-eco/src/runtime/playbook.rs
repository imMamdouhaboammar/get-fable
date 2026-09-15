use super::input::RoutingDecisionInput;
use crate::error::EcoError;
use crate::model::capability::EnforcementGrade;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlaybookMatch {
    pub task_shape: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_skill: Option<String>,
    #[serde(default)]
    pub project_facts: BTreeMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PlaybookStep {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_feature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub builtin_fable_gate: Option<String>,
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimum_grade: Option<EnforcementGrade>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FallbackPolicy {
    pub allow_provider_fallback: bool,
    pub allow_grade_downgrade: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Playbook {
    pub schema_version: u32,
    pub id: String,
    #[serde(rename = "match")]
    pub match_rule: PlaybookMatch,
    pub steps: Vec<PlaybookStep>,
    pub fallback_policy: FallbackPolicy,
}

impl Playbook {
    pub fn parse_str(content: &str) -> Result<Self, EcoError> {
        let trimmed = content.trim();
        let playbook: Self = if trimmed.starts_with('{') {
            serde_json::from_str(trimmed).map_err(|e| EcoError::Validation(e.to_string()))?
        } else {
            serde_yaml::from_str(trimmed).map_err(|e| EcoError::Validation(e.to_string()))?
        };
        if playbook.schema_version != 1 {
            return Err(EcoError::Validation("Playbook schema_version must be 1".into()));
        }
        if playbook.steps.is_empty() {
            return Err(EcoError::Validation("Playbook must have at least one step".into()));
        }
        Ok(playbook)
    }

    pub fn matches_routing(&self, decision: &RoutingDecisionInput) -> bool {
        if !self.match_rule.task_shape.is_empty()
            && self.match_rule.task_shape != "*"
            && self.match_rule.task_shape.to_lowercase() != decision.task_shape.to_lowercase()
        {
            return false;
        }
        if let Some(ref skill) = self.match_rule.selected_skill {
            if skill != &decision.selected_skill {
                return false;
            }
        }
        true
    }
}
