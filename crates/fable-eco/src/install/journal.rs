use std::fs;
use std::path::Path;
use chrono::Utc;
use crate::error::EcoResult;
use crate::model::journal::{JournalOperation, OperationState, TransactionJournal};
use crate::model::receipt::{ReceiptOperation, ReceiptStatus, TransactionReceipt};

pub fn create_journal(tx_id: &str, ops: Vec<JournalOperation>) -> TransactionJournal {
    TransactionJournal {
        schema_version: 1,
        transaction_id: tx_id.to_string(),
        state_root_digest: "genesis".to_string(),
        opened_at: Utc::now().to_rfc3339(),
        commit_marker: false,
        operations: ops,
    }
}

pub fn save_journal(journal: &TransactionJournal, dir: &Path) -> EcoResult<()> {
    fs::create_dir_all(dir)?;
    let p = dir.join("journal.json");
    let json = serde_json::to_string_pretty(journal)?;
    fs::write(p, json)?;
    Ok(())
}

pub fn update_op_state(journal: &mut TransactionJournal, op_id: &str, state: OperationState) {
    if let Some(op) = journal.operations.iter_mut().find(|o| o.id == op_id) {
        op.state = state;
    }
}

pub fn write_receipt(
    dir: &Path,
    tx_id: &str,
    status: ReceiptStatus,
    ops: Vec<ReceiptOperation>,
) -> EcoResult<TransactionReceipt> {
    fs::create_dir_all(dir)?;
    let receipt = TransactionReceipt {
        schema_version: 1,
        transaction_id: tx_id.to_string(),
        status,
        operations: ops,
    };
    let p = dir.join(format!("receipt-{}.json", tx_id));
    fs::write(p, serde_json::to_string_pretty(&receipt)?)?;
    Ok(receipt)
}
