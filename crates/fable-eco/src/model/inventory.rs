use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InventoryCapability {
    pub capability_id: String,
    pub manifest_digest: String,
    pub resolved_version: String,
    pub resolved_revision: String,
    pub install_driver: String,
    pub owned_paths: Vec<String>,
    pub shared_dependencies: Vec<String>,
    pub host_receipt_ids: Vec<String>,
    pub installed_transaction_id: String,
    pub health: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Inventory {
    pub schema_version: u32,
    pub revision: u64,
    pub capabilities: Vec<InventoryCapability>,
}
