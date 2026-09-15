use crate::error::EcoError;
use crate::model::host::{HostBindingReceipt, HostPatchOperation, HostPatchPlan};
use std::path::{Path, PathBuf};

pub fn create_receipt(host_id: &str, target_path: PathBuf) -> HostBindingReceipt {
    HostBindingReceipt {
        schema_version: 1,
        host_id: host_id.to_string(),
        target_path,
        owned_keys: Vec::new(),
        managed_blocks: Vec::new(),
        precondition_digest: None,
        result_digest: None,
    }
}

pub fn record_patch_application(
    receipt: &mut HostBindingReceipt,
    plan: &HostPatchPlan,
    result_digest: String,
) {
    receipt.precondition_digest = plan.precondition_digest.clone();
    receipt.result_digest = Some(result_digest);
    match &plan.operation {
        HostPatchOperation::InsertJsonKey { key, .. } => {
            if !receipt.owned_keys.contains(key) {
                receipt.owned_keys.push(key.clone());
            }
        }
        HostPatchOperation::RemoveJsonKey { key } => {
            receipt.owned_keys.retain(|k| k != key);
        }
        HostPatchOperation::ManagedTextBlock { block_id, .. } => {
            if !receipt.managed_blocks.contains(block_id) {
                receipt.managed_blocks.push(block_id.clone());
            }
        }
        HostPatchOperation::RemoveTextBlock { block_id } => {
            receipt.managed_blocks.retain(|b| b != block_id);
        }
    }
}

pub fn validate_safe_removal(receipt: &HostBindingReceipt, target: &Path) -> Result<(), EcoError> {
    if !target.exists() {
        return Ok(());
    }
    if receipt.owned_keys.is_empty() && receipt.managed_blocks.is_empty() {
        return Err(EcoError::StateIntegrity(
            "Cannot remove patch: no owned keys or blocks recorded in receipt".into(),
        ));
    }
    Ok(())
}
