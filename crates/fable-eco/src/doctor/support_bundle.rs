use super::report::DoctorReport;
use crate::observe::redact::{normalize_user_paths, redact_secrets};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SupportBundle {
    pub schema_version: u32,
    pub fable_version: String,
    pub platform: String,
    pub doctor_report: DoctorReport,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inventory_summary: Option<String>,
    pub created_at: String,
}

pub fn create_support_bundle(
    platform: &str,
    home: Option<&str>,
    doctor_report: DoctorReport,
    raw_inventory: Option<&str>,
) -> SupportBundle {
    let sanitized_inventory = raw_inventory.map(|inv| {
        let redacted = redact_secrets(inv);
        normalize_user_paths(&redacted, home)
    });

    SupportBundle {
        schema_version: 1,
        fable_version: "1.9.0".into(),
        platform: platform.to_string(),
        doctor_report,
        inventory_summary: sanitized_inventory,
        created_at: chrono::Utc::now().to_rfc3339(),
    }
}
