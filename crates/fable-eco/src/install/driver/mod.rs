pub mod copy_skill;

pub use copy_skill::CopySkillDriver;

use std::path::Path;
use crate::error::EcoResult;
use crate::model::capability::CapabilityManifest;

pub trait InstallDriverTrait {
    fn install(&self, manifest: &CapabilityManifest, source_dir: &Path, target_dir: &Path) -> EcoResult<Vec<String>>;
    fn rollback(&self, owned_paths: &[String]) -> EcoResult<()>;
}
