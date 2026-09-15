use std::fs;
use std::path::{Path, PathBuf};
use tempfile::{tempdir, TempDir};
use crate::error::{EcoError, EcoResult};

pub struct StagingRoot {
    temp: TempDir,
}

impl StagingRoot {
    pub fn new() -> EcoResult<Self> {
        let temp = tempdir()?;
        Ok(Self { temp })
    }

    pub fn path(&self) -> &Path {
        self.temp.path()
    }

    pub fn safe_join(&self, rel: impl AsRef<Path>) -> EcoResult<PathBuf> {
        let rel_p = rel.as_ref();
        for comp in rel_p.components() {
            if comp == std::path::Component::ParentDir {
                return Err(EcoError::Validation("path traversal attempt with '..' detected".into()));
            }
        }
        if rel_p.is_absolute() {
            return Err(EcoError::Validation("absolute path forbidden in staging join".into()));
        }
        let full = self.temp.path().join(rel_p);
        Ok(full)
    }

    pub fn create_dir(&self, rel: impl AsRef<Path>) -> EcoResult<PathBuf> {
        let target = self.safe_join(rel)?;
        fs::create_dir_all(&target)?;
        Ok(target)
    }
}
