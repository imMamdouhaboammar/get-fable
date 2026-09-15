use super::checks::{DoctorCheck, DoctorStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DoctorSummary {
    pub pass_count: usize,
    pub warn_count: usize,
    pub fail_count: usize,
    pub blocked_count: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum RepairOp {
    RestoreMissingArtifact { capability_id: String, path: String },
    RestoreHostInstruction { host_id: String, target: String },
    CleanJournalDirectory { journal_dir: String },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RepairPlan {
    pub operations: Vec<RepairOp>,
    pub safe_guarantee: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DoctorReport {
    pub schema_version: u32,
    pub overall_status: DoctorStatus,
    pub summary: DoctorSummary,
    pub checks: Vec<DoctorCheck>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repair_plan: Option<RepairPlan>,
}

impl DoctorReport {
    pub fn new(checks: Vec<DoctorCheck>) -> Self {
        let mut pass_count = 0;
        let mut warn_count = 0;
        let mut fail_count = 0;
        let mut blocked_count = 0;

        for c in &checks {
            match c.status {
                DoctorStatus::Pass => pass_count += 1,
                DoctorStatus::Warn => warn_count += 1,
                DoctorStatus::Fail => fail_count += 1,
                DoctorStatus::Blocked => blocked_count += 1,
            }
        }

        let overall_status = if blocked_count > 0 {
            DoctorStatus::Blocked
        } else if fail_count > 0 {
            DoctorStatus::Fail
        } else if warn_count > 0 {
            DoctorStatus::Warn
        } else {
            DoctorStatus::Pass
        };

        Self {
            schema_version: 1,
            overall_status,
            summary: DoctorSummary {
                pass_count,
                warn_count,
                fail_count,
                blocked_count,
            },
            checks,
            repair_plan: None,
        }
    }

    pub fn generate_repair_plan(&mut self) {
        let mut ops = Vec::new();
        for c in &self.checks {
            if c.status == DoctorStatus::Fail && c.id.starts_with("capability.installed.") {
                let cap_id = c.id.strip_prefix("capability.installed.").unwrap_or("");
                ops.push(RepairOp::RestoreMissingArtifact {
                    capability_id: cap_id.to_string(),
                    path: c.observed.clone(),
                });
            }
        }
        self.repair_plan = Some(RepairPlan {
            operations: ops,
            safe_guarantee: "Repair never changes resolved versions or unowned config".into(),
        });
    }
}
