use std::fs;
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use crate::error::EcoResult;

pub struct ArtifactCache {
    root: PathBuf,
}

impl ArtifactCache {
    pub fn new(root: impl AsRef<Path>) -> Self {
        Self {
            root: root.as_ref().to_path_buf(),
        }
    }

    pub fn put(&self, data: &[u8]) -> EcoResult<(String, PathBuf)> {
        let digest = format!("{:x}", Sha256::digest(data));
        fs::create_dir_all(&self.root)?;
        let p = self.root.join(&digest);
        fs::write(&p, data)?;
        Ok((digest, p))
    }

    pub fn get(&self, digest: &str) -> Option<PathBuf> {
        let p = self.root.join(digest);
        if p.is_file() {
            Some(p)
        } else {
            None
        }
    }
}
