pub mod redact;

pub use redact::*;
use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EcoEvent {
    pub timestamp: String,
    pub event_schema_version: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_id: Option<String>,
    pub command: String,
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capability_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_id: Option<String>,
    pub status: String,
    pub duration_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    pub details: String,
}

pub fn append_event_log(log_dir: &Path, event: &EcoEvent) -> Result<(), std::io::Error> {
    fs::create_dir_all(log_dir)?;
    let log_file = log_dir.join("eco.jsonl");
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_file)?;

    let mut redacted = event.clone();
    redacted.details = redact_secrets(&event.details);

    let line = serde_json::to_string(&redacted)?;
    writeln!(file, "{}", line)?;
    Ok(())
}
