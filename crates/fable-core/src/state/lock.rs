use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::thread;
use std::time::{Duration, Instant, SystemTime};
use serde::{Deserialize, Serialize};

const STATE_LOCK_TIMEOUT_MS: u64 = 2000;
const STATE_LOCK_STALE_SECS: u64 = 30;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LockPayload {
    pid: u32,
    created_at: String,
}

pub struct StateLockGuard {
    lock_file: PathBuf,
}

impl Drop for StateLockGuard {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.lock_file);
    }
}

pub fn acquire_state_lock(target_dir: &Path) -> Result<StateLockGuard, String> {
    let fable_dir = target_dir.join(".fable");
    if !fable_dir.exists() {
        fs::create_dir_all(&fable_dir).map_err(|e| format!("Failed to create .fable dir: {}", e))?;
    }

    let lock_file = fable_dir.join("state.lock");
    let deadline = Instant::now() + Duration::from_millis(STATE_LOCK_TIMEOUT_MS);

    while Instant::now() < deadline {
        match OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&lock_file)
        {
            Ok(mut file) => {
                let payload = LockPayload {
                    pid: std::process::id(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                };
                let _ = serde_json::to_writer(&mut file, &payload);
                let _ = file.flush();
                return Ok(StateLockGuard { lock_file });
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                // Check if stale
                if is_stale_lock(&lock_file) {
                    let _ = fs::remove_file(&lock_file);
                    continue;
                }
                thread::sleep(Duration::from_millis(10));
            }
            Err(e) => return Err(format!("Failed to acquire state lock: {}", e)),
        }
    }

    Err("Timed out waiting for Fable state lock".to_string())
}

fn is_stale_lock(lock_path: &Path) -> bool {
    if let Ok(metadata) = fs::metadata(lock_path) {
        if let Ok(modified) = metadata.modified() {
            if let Ok(elapsed) = SystemTime::now().duration_since(modified) {
                if elapsed.as_secs() > STATE_LOCK_STALE_SECS {
                    return true;
                }
            }
        }
    }
    false
}
