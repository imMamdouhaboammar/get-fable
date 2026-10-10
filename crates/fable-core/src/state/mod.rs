pub mod lock;

use crate::types::*;
use regex::Regex;
use sha2::{Digest, Sha256};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

const LIFECYCLE_FILES: &[&str] = &[
    "state.json",
    "state.lock",
    "LEDGER.md",
    "PROGRESS.md",
    "VERIFIER_PROMPT.md",
];

const PENDING_MUTATIONS_DIRECTORY: &str = "pending-mutations";

static PENDING_MUTATION_TOKEN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^mutation-[A-Za-z0-9._-]+\.json$").unwrap());

static EVIDENCE_MARKER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)(evidence|verified|证据|凭证|验证)\s*[:：]").unwrap());

pub fn workspace_id_for_target(target_dir: &Path) -> String {
    let canonical = fs::canonicalize(target_dir).unwrap_or_else(|_| target_dir.to_path_buf());
    let canonical_str = canonical.to_string_lossy();
    let mut hasher = Sha256::new();
    hasher.update(canonical_str.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    hash[..24].to_string()
}

pub fn find_fable_dir(start: &Path) -> Option<PathBuf> {
    let mut cur = fs::canonicalize(start).ok()?;
    loop {
        let candidate = cur.join(".fable");
        if fs::symlink_metadata(&candidate).is_ok() {
            return Some(candidate);
        }
        if fs::symlink_metadata(cur.join(".git")).is_ok() {
            return None;
        }
        let parent = cur.parent()?;
        if parent == cur {
            return None;
        }
        cur = parent.to_path_buf();
    }
}

pub fn safe_fable_boundary(fable_dir: &Path, extra_files: &[&str]) -> bool {
    let Ok(dir_meta) = fs::symlink_metadata(fable_dir) else {
        return false;
    };
    if !dir_meta.file_type().is_dir() || dir_meta.file_type().is_symlink() {
        return false;
    }

    for &filename in LIFECYCLE_FILES.iter().chain(extra_files.iter()) {
        if filename.is_empty()
            || Path::new(filename).file_name().and_then(|s| s.to_str()) != Some(filename)
        {
            return false;
        }
        let p = fable_dir.join(filename);
        match fs::symlink_metadata(&p) {
            Ok(meta) => {
                if !meta.file_type().is_file() || meta.file_type().is_symlink() {
                    return false;
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => continue,
            Err(_) => return false,
        }
    }

    let pending_dir = fable_dir.join(PENDING_MUTATIONS_DIRECTORY);
    match fs::symlink_metadata(&pending_dir) {
        Ok(meta) => {
            if !meta.file_type().is_dir() || meta.file_type().is_symlink() {
                return false;
            }
            let Ok(entries) = fs::read_dir(&pending_dir) else {
                return false;
            };
            for entry in entries {
                let Ok(entry) = entry else {
                    return false;
                };
                let name = entry.file_name();
                let Some(name_str) = name.to_str() else {
                    return false;
                };
                if !PENDING_MUTATION_TOKEN_RE.is_match(name_str) {
                    return false;
                }
                let Ok(ft) = entry.file_type() else {
                    return false;
                };
                if !ft.is_file() || ft.is_symlink() {
                    return false;
                }
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => return false,
    }

    true
}

pub fn pending_mutation_tokens(
    fable_dir: &Path,
    expected_workspace_id: &str,
) -> Option<Vec<PathBuf>> {
    if !safe_fable_boundary(fable_dir, &[]) {
        return None;
    }
    let dir = fable_dir.join(PENDING_MUTATIONS_DIRECTORY);
    let entries = match fs::read_dir(&dir) {
        Ok(rd) => rd,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Some(Vec::new()),
        Err(_) => return None,
    };

    let mut names = Vec::new();
    for entry in entries {
        let entry = entry.ok()?;
        let name = entry.file_name().into_string().ok()?;
        names.push(name);
    }
    names.sort();

    let mut tokens = Vec::new();
    for name in names {
        if !PENDING_MUTATION_TOKEN_RE.is_match(&name) {
            return None;
        }
        let token_path = dir.join(&name);
        let meta = fs::symlink_metadata(&token_path).ok()?;
        if !meta.file_type().is_file() || meta.file_type().is_symlink() {
            return None;
        }
        let raw = fs::read_to_string(&token_path).ok()?;
        let parsed: serde_json::Value = serde_json::from_str(&raw).ok()?;
        let obj = parsed.as_object()?;
        if obj.len() != 1 || obj.get("workspaceId")?.as_str()? != expected_workspace_id {
            return None;
        }
        tokens.push(token_path);
    }

    Some(tokens)
}

pub fn has_pending_mutation_debt(
    fable_dir: &Path,
    expected_workspace_id: Option<&str>,
) -> Option<bool> {
    if let Some(expected) = expected_workspace_id {
        let tokens = pending_mutation_tokens(fable_dir, expected)?;
        return Some(!tokens.is_empty());
    }
    if !safe_fable_boundary(fable_dir, &[]) {
        return None;
    }
    let dir = fable_dir.join(PENDING_MUTATIONS_DIRECTORY);
    match fs::read_dir(&dir) {
        Ok(mut rd) => Some(rd.next().is_some()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Some(false),
        Err(_) => None,
    }
}

pub fn persist_pending_mutation(target_dir: &Path) -> bool {
    let fable_dir = target_dir.join(".fable");
    if !safe_fable_boundary(&fable_dir, &[]) {
        return false;
    }
    let Ok(Some(state)) = read_state(target_dir) else {
        return false;
    };
    let owner = state.workspace_id;
    let dir = fable_dir.join(PENDING_MUTATIONS_DIRECTORY);
    if !dir.exists() && fs::create_dir(&dir).is_err() && !dir.exists() {
        return false;
    }
    if !safe_fable_boundary(&fable_dir, &[]) {
        return false;
    }
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let pid = std::process::id();
    let mut hasher = Sha256::new();
    hasher.update(format!("{}-{}-{}", owner, pid, nanos).as_bytes());
    let rand_hex = &format!("{:x}", hasher.finalize())[..24];
    let name = format!("mutation-{}-{}-{}.json", pid, nanos, rand_hex);
    let token_path = dir.join(name);

    let mut file = match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&token_path)
    {
        Ok(f) => f,
        Err(_) => return false,
    };

    let payload = format!("{{\"workspaceId\":\"{}\"}}\n", owner);
    if file.write_all(payload.as_bytes()).is_err() || file.sync_all().is_err() {
        return false;
    }
    true
}

pub fn parse_ledger(ledger_path: &Path) -> (Vec<String>, bool, bool) {
    let Some(fable_dir) = ledger_path.parent() else {
        return (Vec::new(), false, false);
    };
    if !safe_fable_boundary(fable_dir, &[]) {
        return (Vec::new(), false, false);
    }
    let Ok(content) = fs::read_to_string(ledger_path) else {
        return (Vec::new(), false, false);
    };

    let mut open_items = Vec::new();
    let mut has_any = false;
    let mut paused = false;

    for line in content.lines() {
        let text = line.trim();
        if text.to_uppercase().starts_with("PAUSED") {
            let reason = text["PAUSED".len()..].trim_matches(|c: char| {
                c.is_whitespace() || matches!(c, ':' | '：' | '-' | '–')
            });
            if reason.trim().chars().count() >= 3 {
                paused = true;
            }
            continue;
        }
        if text.len() < 5 || !text.starts_with("- [") {
            continue;
        }
        let slice = &text[2..5];
        if slice == "[ ]" {
            has_any = true;
            open_items.push(text.to_string());
        } else {
            let mark = text.chars().nth(3).unwrap_or(' ').to_ascii_lowercase();
            if mark == 'x' || mark == '~' {
                has_any = true;
            }
        }
    }

    (open_items, has_any, paused)
}

pub fn closed_without_evidence(ledger_path: &Path) -> Vec<String> {
    let Some(fable_dir) = ledger_path.parent() else {
        return Vec::new();
    };
    if !safe_fable_boundary(fable_dir, &[]) {
        return Vec::new();
    }
    let Ok(content) = fs::read_to_string(ledger_path) else {
        return Vec::new();
    };

    let mut bad = Vec::new();
    for line in content.lines() {
        let text = line.trim();
        if text.len() < 5 || !text[..5].eq_ignore_ascii_case("- [x]") {
            continue;
        }
        if let Some(m) = EVIDENCE_MARKER_RE.find(text) {
            let rest = text[m.end()..].trim();
            if rest.chars().count() < 6 {
                bad.push(text.to_string());
            }
        } else {
            bad.push(text.to_string());
        }
    }
    bad
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
        verified_generation: 0,
        active_card: None,
        last_decision: None,
        evidence: Vec::new(),
        updated_at: now,
    }
}

pub fn read_state(target_dir: &Path) -> Result<Option<FableState>, String> {
    let fable_dir = target_dir.join(".fable");
    let path = state_path(target_dir);
    if !path.exists() {
        return Ok(None);
    }
    if !safe_fable_boundary(&fable_dir, &[]) {
        return Err("Unsafe .fable filesystem boundary".to_string());
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    let raw_val: serde_json::Value =
        serde_json::from_str(&data).map_err(|e| format!("Failed to parse state.json: {}", e))?;

    let expected_ws = workspace_id_for_target(target_dir);
    let schema_ver = raw_val
        .get("schemaVersion")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;

    let mut state: FableState =
        serde_json::from_value(raw_val).map_err(|e| format!("Invalid state schema: {}", e))?;

    if schema_ver == 1 {
        state.schema_version = FABLE_STATE_SCHEMA_VERSION;
        state.state_revision = 0;
        state.workspace_id = expected_ws.clone();
        state.mutation_generation = 0;
        for rec in &mut state.evidence {
            rec.generation = 0;
        }
        let is_sec = is_security_task(&state);
        let latest_pass = state
            .evidence
            .iter()
            .rev()
            .find(|r| {
                is_completion_evidence_kind(&r.kind)
                    || (is_sec && r.kind == EvidenceKind::Security)
            })
            .map(|r| {
                r.result == EvidenceResult::Pass
                    && r.workspace_id.as_deref() == Some(expected_ws.as_str())
            })
            .unwrap_or(false);
        state.verified_generation = if latest_pass { 0 } else { -1 };
    } else if schema_ver == 2 {
        if state.workspace_id != expected_ws {
            return Err("State workspaceId mismatch".to_string());
        }
        state.schema_version = FABLE_STATE_SCHEMA_VERSION;
        state.state_revision = 0;
    } else if schema_ver == FABLE_STATE_SCHEMA_VERSION {
        if state.workspace_id != expected_ws {
            return Err("State workspaceId mismatch".to_string());
        }
    } else {
        return Err(format!("Unsupported schemaVersion: {}", schema_ver));
    }

    if state.verified_generation < -1
        || state.verified_generation > state.mutation_generation as i64
    {
        return Err("Invalid verifiedGeneration bounds".to_string());
    }
    if let Some(ref card) = state.active_card {
        if card.trim().is_empty() {
            return Err("Empty activeCard".to_string());
        }
    }
    for rec in &state.evidence {
        if rec.source.trim().is_empty()
            || rec.detail.trim().is_empty()
            || rec.timestamp.trim().is_empty()
            || rec.generation > state.mutation_generation
        {
            return Err("Invalid evidence record".to_string());
        }
        if let Some(ref ws) = rec.workspace_id {
            if ws != &state.workspace_id {
                return Err("Foreign evidence workspaceId".to_string());
            }
        }
    }

    Ok(Some(state))
}

pub fn write_state(target_dir: &Path, state: &FableState) -> Result<(), String> {
    let fable_dir = target_dir.join(".fable");
    if fable_dir.exists() && !safe_fable_boundary(&fable_dir, &[]) {
        return Err("Unsafe .fable filesystem boundary".to_string());
    }
    let path = state_path(target_dir);
    let parent = path
        .parent()
        .ok_or_else(|| "Invalid state path".to_string())?;
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    let tmp_path = parent.join(format!(
        ".state.{}.{}.tmp",
        std::process::id(),
        chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
    ));
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
    let _ = file.sync_all();
    drop(file);

    fs::rename(&tmp_path, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to commit state atomically: {}", e)
    })?;
    Ok(())
}

pub fn with_state_transaction<F>(target_dir: &Path, mutator: F) -> Result<FableState, String>
where
    F: FnOnce(&mut FableState) -> Result<(), String>,
{
    let fable_dir = target_dir.join(".fable");
    if fable_dir.exists() && !safe_fable_boundary(&fable_dir, &[]) {
        return Err("Unsafe .fable filesystem boundary".to_string());
    }
    let _guard = lock::acquire_state_lock(target_dir)?;
    let mut current = match read_state(target_dir)? {
        Some(s) => s,
        None => create_initial_state(target_dir),
    };

    let pending = if fable_dir.exists() {
        pending_mutation_tokens(&fable_dir, &current.workspace_id)
            .ok_or_else(|| "Malformed pending mutation debt".to_string())?
    } else {
        Vec::new()
    };

    if !pending.is_empty() {
        current.mutation_generation += pending.len() as u64;
        current.substantial = true;
        current.updated_at = chrono::Utc::now().to_rfc3339();
    }

    mutator(&mut current)?;

    current.schema_version = FABLE_STATE_SCHEMA_VERSION;
    current.state_revision += 1;
    current.updated_at = chrono::Utc::now().to_rfc3339();
    write_state(target_dir, &current)?;

    for token in pending {
        let _ = fs::remove_file(token);
    }

    Ok(current)
}

pub fn record_mutation(state: &mut FableState) {
    state.substantial = true;
    state.mutation_generation += 1;
    state.updated_at = chrono::Utc::now().to_rfc3339();
}

pub fn is_security_task(state: &FableState) -> bool {
    if let Some(ref dec) = state.last_decision {
        return dec.selected_skill == "fable-security"
            && dec.selected_pack == "proof"
            && dec.task_shape == FableTaskShape::Security;
    }
    state.current_skill.as_deref() == Some("fable-security")
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

pub fn is_accepted_completion_kind(state: &FableState, kind: &EvidenceKind) -> bool {
    is_completion_evidence_kind(kind)
        || (is_security_task(state) && matches!(kind, EvidenceKind::Security))
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
        && is_accepted_completion_kind(state, &record.kind)
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
        if is_accepted_completion_kind(state, &record.kind) {
            let ws_matches = record
                .workspace_id
                .as_deref()
                .map(|ws| ws == state.workspace_id)
                .unwrap_or(false);
            return ws_matches
                && record.result == EvidenceResult::Pass
                && !record.detail.trim().is_empty();
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

