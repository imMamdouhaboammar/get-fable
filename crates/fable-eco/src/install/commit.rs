use std::fs;
use std::path::Path;
use crate::error::EcoResult;
use crate::model::inventory::Inventory;
use crate::model::lock::Lockfile;

pub fn commit_inventory(inv: &Inventory, dir: &Path) -> EcoResult<()> {
    fs::create_dir_all(dir)?;
    let p = dir.join("inventory.json");
    let json = serde_json::to_string_pretty(inv)?;
    fs::write(p, json)?;
    Ok(())
}

pub fn commit_lockfile(lock: &Lockfile, dir: &Path) -> EcoResult<()> {
    fs::create_dir_all(dir)?;
    let p = dir.join("eco.lock");
    let toml_str = toml::to_string_pretty(lock)?;
    fs::write(p, toml_str)?;
    Ok(())
}
