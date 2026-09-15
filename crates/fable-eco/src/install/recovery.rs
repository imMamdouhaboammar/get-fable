use crate::model::journal::{OperationState, TransactionJournal};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CrashClassification {
    AlreadyCommitted,
    SafeToRollback,
    RecoveryRequired,
}

pub fn classify_crash(journal: &TransactionJournal) -> CrashClassification {
    if journal.commit_marker {
        return CrashClassification::AlreadyCommitted;
    }
    let any_failed = journal.operations.iter().any(|op| {
        op.state == OperationState::RollbackFailed
    });
    if any_failed {
        return CrashClassification::RecoveryRequired;
    }
    CrashClassification::SafeToRollback
}
