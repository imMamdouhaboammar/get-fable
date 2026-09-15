use super::result::{CapabilityResult, CapabilityResultStatus};
use crate::error::EcoError;
use fable_core::{EvidenceKind, EvidenceRecord, EvidenceResult};

pub fn parse_evidence_kind(kind_str: &str) -> Result<EvidenceKind, EcoError> {
    kind_str.parse::<EvidenceKind>().map_err(|_| {
        EcoError::Validation(format!("Unknown evidence kind: {}", kind_str))
    })
}

pub fn bridge_capability_result(
    result: &CapabilityResult,
    expected_kind: &str,
    current_generation: u64,
    workspace_id: Option<String>,
) -> Result<EvidenceRecord, EcoError> {
    let kind = parse_evidence_kind(expected_kind)?;

    let res = match result.status {
        CapabilityResultStatus::Passed => EvidenceResult::Pass,
        _ => EvidenceResult::Fail,
    };

    let detail = format!(
        "step={} cap={} status={:?} digest={} mut={}",
        result.step_id,
        result.capability_id,
        result.status,
        result.raw_output_digest,
        result.mutated_workspace
    );

    Ok(EvidenceRecord {
        kind,
        source: format!("eco:{}", result.capability_id),
        result: res,
        detail,
        generation: current_generation,
        timestamp: result.finished_at.clone(),
        workspace_id,
        repository_revision: None,
        command_category: Some("eco-runtime".into()),
        scope: Some(result.step_id.clone()),
        receipt_id: None,
    })
}
