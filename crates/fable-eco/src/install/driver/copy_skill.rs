use std::fs;
use std::path::Path;
use crate::error::EcoResult;
use crate::install::driver::InstallDriverTrait;
use crate::model::capability::CapabilityManifest;

pub struct CopySkillDriver;

impl InstallDriverTrait for CopySkillDriver {
    fn install(&self, manifest: &CapabilityManifest, source_dir: &Path, target_dir: &Path) -> EcoResult<Vec<String>> {
        let mut owned = Vec::new();
        let dest_dir = target_dir.join(manifest.id.name());
        fs::create_dir_all(&dest_dir)?;

        if source_dir.is_dir() {
            for entry in fs::read_dir(source_dir)? {
                let entry = entry?;
                let file_name = entry.file_name();
                let dest_file = dest_dir.join(&file_name);
                if entry.path().is_file() {
                    fs::copy(entry.path(), &dest_file)?;
                    owned.push(dest_file.to_string_lossy().to_string());
                }
            }
        }
        Ok(owned)
    }

    fn rollback(&self, owned_paths: &[String]) -> EcoResult<()> {
        for p in owned_paths {
            let path = Path::new(p);
            if path.is_file() {
                let _ = fs::remove_file(path);
            }
        }
        Ok(())
    }
}
