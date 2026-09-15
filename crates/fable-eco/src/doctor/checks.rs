use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DoctorStatus {
    Pass,
    Warn,
    Fail,
    Blocked,
}

impl DoctorStatus {
    pub fn is_healthy(&self) -> bool {
        matches!(self, Self::Pass | Self::Warn)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DoctorCheck {
    pub id: String,
    pub category: String,
    pub status: DoctorStatus,
    pub observed: String,
    pub expected: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remediation: Option<String>,
}

pub fn check_state_root(state_dir: &Path) -> DoctorCheck {
    if state_dir.exists() {
        DoctorCheck {
            id: "state.root.exists".into(),
            category: "state".into(),
            status: DoctorStatus::Pass,
            observed: format!("Directory exists: {}", state_dir.display()),
            expected: "State directory present".into(),
            remediation: None,
        }
    } else {
        DoctorCheck {
            id: "state.root.exists".into(),
            category: "state".into(),
            status: DoctorStatus::Warn,
            observed: "Directory absent".into(),
            expected: "State directory present".into(),
            remediation: Some("Run 'get-fable eco' to initialize state root".into()),
        }
    }
}

pub fn check_unresolved_journal(journal_dir: &Path) -> DoctorCheck {
    if !journal_dir.exists() {
        return DoctorCheck {
            id: "state.journal.clean".into(),
            category: "state".into(),
            status: DoctorStatus::Pass,
            observed: "No journals pending".into(),
            expected: "No unresolved transaction journals".into(),
            remediation: None,
        };
    }
    let entries = std::fs::read_dir(journal_dir).ok();
    let has_journals = entries.is_some_and(|mut e| e.next().is_some());
    if has_journals {
        DoctorCheck {
            id: "state.journal.clean".into(),
            category: "state".into(),
            status: DoctorStatus::Blocked,
            observed: "Unresolved transaction journal present".into(),
            expected: "No unresolved transaction journals".into(),
            remediation: Some("Run 'get-fable eco recover' to reconcile journal".into()),
        }
    } else {
        DoctorCheck {
            id: "state.journal.clean".into(),
            category: "state".into(),
            status: DoctorStatus::Pass,
            observed: "Journal clean".into(),
            expected: "No unresolved transaction journals".into(),
            remediation: None,
        }
    }
}

pub fn check_inventory(inventory_path: &Path) -> DoctorCheck {
    if !inventory_path.exists() {
        return DoctorCheck {
            id: "state.inventory.valid".into(),
            category: "state".into(),
            status: DoctorStatus::Pass,
            observed: "Inventory file empty or absent".into(),
            expected: "Valid JSON inventory if present".into(),
            remediation: None,
        };
    }
    match std::fs::read_to_string(inventory_path) {
        Ok(s) => match serde_json::from_str::<serde_json::Value>(&s) {
            Ok(_) => DoctorCheck {
                id: "state.inventory.valid".into(),
                category: "state".into(),
                status: DoctorStatus::Pass,
                observed: "Valid inventory JSON".into(),
                expected: "Valid JSON inventory".into(),
                remediation: None,
            },
            Err(e) => DoctorCheck {
                id: "state.inventory.valid".into(),
                category: "state".into(),
                status: DoctorStatus::Fail,
                observed: format!("Invalid JSON: {}", e),
                expected: "Valid JSON inventory".into(),
                remediation: Some("Run 'get-fable eco repair' to restore inventory".into()),
            },
        },
        Err(e) => DoctorCheck {
            id: "state.inventory.valid".into(),
            category: "state".into(),
            status: DoctorStatus::Fail,
            observed: format!("Read error: {}", e),
            expected: "Readable inventory file".into(),
            remediation: Some("Check filesystem permissions".into()),
        },
    }
}

pub fn check_capability_installation(cap_id: &str, install_path: &Path) -> DoctorCheck {
    if install_path.exists() {
        DoctorCheck {
            id: format!("capability.installed.{}", cap_id),
            category: "capability".into(),
            status: DoctorStatus::Pass,
            observed: format!("Installed at {}", install_path.display()),
            expected: "Installation target directory exists".into(),
            remediation: None,
        }
    } else {
        DoctorCheck {
            id: format!("capability.installed.{}", cap_id),
            category: "capability".into(),
            status: DoctorStatus::Fail,
            observed: "Installation target missing".into(),
            expected: "Installation target directory exists".into(),
            remediation: Some(format!("Run 'get-fable eco install {}' to restore", cap_id)),
        }
    }
}
