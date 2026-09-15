use crate::types::*;
use std::fs;
use std::path::{Path, PathBuf};

pub fn find_repo_root(start_dir: &Path) -> Option<PathBuf> {
    let mut curr = start_dir.to_path_buf();
    loop {
        if curr.join("skills").join("get-fable").join("registry.json").exists() {
            return Some(curr);
        }
        if !curr.pop() {
            break;
        }
    }
    None
}

pub fn load_skill_registry(repo_root: &Path) -> Result<SkillRegistry, String> {
    let registry_path = repo_root.join("skills").join("get-fable").join("registry.json");
    if !registry_path.exists() {
        return Err(format!("registry.json not found at {}", registry_path.display()));
    }

    let content = fs::read_to_string(&registry_path)
        .map_err(|e| format!("Failed to read registry.json: {}", e))?;
    let registry: SkillRegistry = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse registry.json: {}", e))?;

    if registry.schema_version != FABLE_REGISTRY_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported registry schema: {}",
            registry.schema_version
        ));
    }

    Ok(registry)
}

pub fn get_skill_entry<'a>(
    skill_id: &str,
    registry: &'a SkillRegistry,
) -> Result<&'a SkillRegistryEntry, String> {
    registry
        .skills
        .iter()
        .find(|s| s.id == skill_id)
        .ok_or_else(|| format!("Unknown Fable skill: {}", skill_id))
}
