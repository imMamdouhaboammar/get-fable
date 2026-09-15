use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectBinding {
    pub schema_version: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profile: Option<String>,
    #[serde(default)]
    pub capabilities: Vec<String>,
    #[serde(default = "default_policy")]
    pub policy: String,
    #[serde(default)]
    pub hosts: Vec<String>,
    #[serde(default)]
    pub provider_preferences: BTreeMap<String, String>,
    #[serde(default = "default_min_contract")]
    pub minimum_contract_version: u32,
}

fn default_policy() -> String {
    "default".to_string()
}

fn default_min_contract() -> u32 {
    1
}

impl Default for ProjectBinding {
    fn default() -> Self {
        Self {
            schema_version: 1,
            profile: None,
            capabilities: Vec::new(),
            policy: default_policy(),
            hosts: Vec::new(),
            provider_preferences: BTreeMap::new(),
            minimum_contract_version: default_min_contract(),
        }
    }
}
