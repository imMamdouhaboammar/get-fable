pub mod lock;

use crate::types::*;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

pub fn workspace_id_for_target(target_dir: &Path) -> String {
    let canonical = fs::canonicalize(target_dir).unwrap_or_else(|_| target_dir.to_path_buf());
    let canonical_str = canonical.to_string_lossy();
    let mut hasher = Sha256::new();
    hasher.update(canonical_str.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    hash[..24].to_string()
}

pub fn state_path(target_dir: &Path) -> PathBuf {
    target_dir.join(".fable").join("state.json")
}

pub fn create_initial_state(target_dir: &Path) -> FableState {
    let now = chrono::Utc::now().to_rfc3339();
    FableState {
        schema_version: FABLE_STATE_SCHEMA_VERSION,
        state_revision: 0,
        workspace_id: workspace_id_for_target(target_dir),
        phase: FablePhase::Idle,
        current_skill: None,
        failure_streak: 0,
        substantial: false,
        mutation_generation: 0,
        verified_generation: 0, // In schema v3, initial is 0 or matching
        active_card: None,
        last_decision: None,
        evidence: Vec::new(),
        updated_at: now,
    }
}

pub fn read_state(target_dir: &Path) -> Result<Option<FableState>, String> {
    let path = state_path(target_dir);
    if !path.exists() {
        return Ok(None);
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let mut state: FableState =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse state.json: {}", e))?;
    if state.workspace_id.is_empty() {
        state.workspace_id = workspace_id_for_target(target_dir);
    }
    Ok(Some(state))
}

pub fn write_state(target_dir: &Path, state: &FableState) -> Result<(), String> {
    let path = state_path(target_dir);
    let parent = path
        .parent()
        .ok_or_else(|| "Invalid state path".to_string())?;
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let tmp_path = parent.join(format!("state.{}.tmp", std::process::id()));
    let serialized = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;

    let mut file =
        File::create(&tmp_path).map_err(|e| format!("Failed to create tmp file: {}", e))?;
    file.write_all(serialized.as_bytes())
        .map_err(|e| format!("Failed to write state: {}", e))?;
    file.write_all(b"\n")
        .map_err(|e| format!("Failed to write state newline: {}", e))?;
    file.flush()
        .map_err(|e| format!("Failed to flush state: {}", e))?;
    drop(file);

    fs::rename(&tmp_path, &path)
        .map_err(|e| format!("Failed to commit state atomically: {}", e))?;
    Ok(())
}

pub fn with_state_transaction<F>(target_dir: &Path, mutator: F) -> Result<FableState, String>
where
    F: FnOnce(&mut FableState) -> Result<(), String>,
{
    let _guard = lock::acquire_state_lock(target_dir)?;
    let mut current = match read_state(target_dir)? {
        Some(s) => s,
        None => create_initial_state(target_dir),
    };

    mutator(&mut current)?;

    current.state_revision += 1;
    current.updated_at = chrono::Utc::now().to_rfc3339();
    write_state(target_dir, &current)?;
    Ok(current)
}

pub fn record_mutation(state: &mut FableState) {
    state.substantial = true;
    state.mutation_generation += 1;
    state.updated_at = chrono::Utc::now().to_rfc3339();
}

pub fn is_completion_evidence_kind(kind: &EvidenceKind) -> bool {
    matches!(
        kind,
        EvidenceKind::Test
            | EvidenceKind::Build
            | EvidenceKind::Runtime
            | EvidenceKind::Review
            | EvidenceKind::Observation
    )
}

pub fn is_failure_relevant_kind(kind: &EvidenceKind) -> bool {
    is_completion_evidence_kind(kind) || matches!(kind, EvidenceKind::Security)
}

pub fn add_evidence(state: &mut FableState, record: EvidenceRecord) {
    let counts_toward_failure = is_failure_relevant_kind(&record.kind);
    let next_failure_streak = if counts_toward_failure {
        if record.result == EvidenceResult::Fail {
            state.failure_streak + 1
        } else {
            0
        }
    } else {
        state.failure_streak
    };

    let mut phase = state.phase.clone();
    let mut current_skill = state.current_skill.clone();

    if next_failure_streak >= 2 && state.phase != FablePhase::Complete {
        phase = FablePhase::Recovering;
        current_skill = Some("fable-recover".to_string());
    }

    let advances_verification = record.result == EvidenceResult::Pass
        && is_completion_evidence_kind(&record.kind)
        && record.generation == state.mutation_generation;

    if advances_verification {
        state.verified_generation = state.verified_generation.max(record.generation as i64);
    }

    if counts_toward_failure && record.result == EvidenceResult::Fail {
        state.substantial = true;
    }

    state.phase = phase;
    state.current_skill = current_skill;
    state.failure_streak = next_failure_streak;
    state.updated_at = record.timestamp.clone();
    state.evidence.push(record);
}

pub fn has_fresh_passing_evidence(state: &FableState) -> bool {
    if state.verified_generation < state.mutation_generation as i64 {
        return false;
    }
    for record in state.evidence.iter().rev() {
        if record.generation != state.mutation_generation {
            continue;
        }
        if record.result == EvidenceResult::Fail && is_failure_relevant_kind(&record.kind) {
            return false;
        }
        if is_completion_evidence_kind(&record.kind) {
            return record.result == EvidenceResult::Pass && !record.detail.trim().is_empty();
        }
    }
    false
}

pub fn transition_state(state: &mut FableState, next_phase: FablePhase) -> Result<(), String> {
    if next_phase == FablePhase::Complete && state.substantial && !has_fresh_passing_evidence(state)
    {
        return Err(
            "Substantial work cannot complete without passing evidence for the current mutation generation"
                .to_string(),
        );
    }

    state.phase = next_phase;
    if state.phase == FablePhase::Complete {
        state.failure_streak = 0;
        state.current_skill = None;
    }
    state.updated_at = chrono::Utc::now().to_rfc3339();
    Ok(())
}
