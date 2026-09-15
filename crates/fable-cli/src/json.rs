use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EcoErrorJson {
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub capability_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub remediation: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct JsonEnvelope<T> {
    pub schema_version: u32,
    pub command: String,
    pub ok: bool,
    pub result: Option<T>,
    pub warnings: Vec<String>,
    pub errors: Vec<EcoErrorJson>,
}

impl<T: Serialize> JsonEnvelope<T> {
    pub fn success(command: &str, result: T) -> Self {
        Self {
            schema_version: 1,
            command: command.to_string(),
            ok: true,
            result: Some(result),
            warnings: Vec::new(),
            errors: Vec::new(),
        }
    }

    #[allow(dead_code)]
    pub fn failure(command: &str, errors: Vec<EcoErrorJson>) -> Self {
        Self {
            schema_version: 1,
            command: command.to_string(),
            ok: false,
            result: None,
            warnings: Vec::new(),
            errors,
        }
    }
}
