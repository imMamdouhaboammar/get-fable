use crate::error::EcoError;
use crate::model::binding::ProjectBinding;
use std::fs;
use std::path::Path;

const BINDING_FILE: &str = ".fable/eco.json";

pub fn load_project_binding(workspace_root: &Path) -> Result<Option<ProjectBinding>, EcoError> {
    let path = workspace_root.join(BINDING_FILE);
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path)?;
    let binding: ProjectBinding = serde_json::from_str(&content)
        .map_err(|e| EcoError::InvalidData(format!("Corrupt .fable/eco.json: {}", e)))?;
    if binding.schema_version != 1 {
        return Err(EcoError::Validation(format!(
            "Unsupported eco.json schema version: {}",
            binding.schema_version
        )));
    }
    Ok(Some(binding))
}

pub fn save_project_binding(
    workspace_root: &Path,
    binding: &ProjectBinding,
) -> Result<(), EcoError> {
    let path = workspace_root.join(BINDING_FILE);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(binding)
        .map_err(|e| EcoError::InvalidData(e.to_string()))?;
    fs::write(&path, content)?;
    Ok(())
}

pub fn bind_project(
    workspace_root: &Path,
    profile: Option<String>,
    capabilities: Vec<String>,
    hosts: Vec<String>,
) -> Result<ProjectBinding, EcoError> {
    let mut binding = load_project_binding(workspace_root)?.unwrap_or_default();
    if let Some(p) = profile {
        binding.profile = Some(p);
    }
    for cap in capabilities {
        if !binding.capabilities.contains(&cap) {
            binding.capabilities.push(cap);
        }
    }
    for host in hosts {
        if !binding.hosts.contains(&host) {
            binding.hosts.push(host);
        }
    }
    save_project_binding(workspace_root, &binding)?;
    Ok(binding)
}

pub fn unbind_project(workspace_root: &Path) -> Result<bool, EcoError> {
    let path = workspace_root.join(BINDING_FILE);
    if path.exists() {
        fs::remove_file(&path)?;
        Ok(true)
    } else {
        Ok(false)
    }
}
