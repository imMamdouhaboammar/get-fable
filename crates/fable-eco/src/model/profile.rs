use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Profile {
    pub schema_version: u32,
    pub id: String,
    #[serde(default)]
    pub extends: Vec<String>,
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub optional: Vec<String>,
}
