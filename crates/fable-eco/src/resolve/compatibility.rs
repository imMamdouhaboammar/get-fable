use crate::model::capability::CapabilityManifest;
use crate::model::machine::MachineFacts;

pub fn check_compatibility(manifest: &CapabilityManifest, machine: &MachineFacts) -> Result<(), String> {
    if let Some(plat) = machine.platform_string() {
        if !manifest.platforms.contains(&plat) {
            return Err(format!("ECO_INCOMPATIBLE_PLATFORM: required platform '{}'", plat));
        }
    }
    for dep in &manifest.dependencies {
        if dep.dep_type == crate::model::capability::DependencyType::Runtime {
            if let Some(bin) = dep.target.strip_prefix("binary:") {
                if !machine.has_runtime(bin) {
                    return Err(format!("ECO_MISSING_RUNTIME_DEP: missing binary '{}'", bin));
                }
            }
        }
    }
    Ok(())
}
