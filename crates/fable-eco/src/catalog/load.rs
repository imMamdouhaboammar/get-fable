use crate::catalog::validate::validate_manifest;
use crate::error::{EcoError, EcoResult};
use crate::model::capability::{CapabilityId, CapabilityManifest};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_MANIFEST_BYTES: u64 = 1_048_576; // 1 MB

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CatalogLayerKind {
    Official,
    Enterprise,
    Local,
    Project,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CatalogLayer {
    pub kind: CatalogLayerKind,
    pub path: PathBuf,
    pub entries: BTreeMap<CapabilityId, CapabilityManifest>,
}

pub fn load_catalog_dir(path: impl AsRef<Path>, kind: CatalogLayerKind) -> EcoResult<CatalogLayer> {
    let p = path.as_ref();
    if !p.exists() || !p.is_dir() {
        return Err(EcoError::Catalog(format!(
            "catalog directory does not exist: {:?}",
            p
        )));
    }
    let mut entries = BTreeMap::new();
    let mut files = collect_toml_files(p)?;
    files.sort();

    for file_path in files {
        let manifest = load_manifest_file(&file_path)?;
        validate_manifest(&manifest)?;
        if entries.contains_key(&manifest.id) {
            return Err(EcoError::Catalog(format!(
                "duplicate capability ID '{}' in layer {:?}",
                manifest.id, p
            )));
        }
        entries.insert(manifest.id.clone(), manifest);
    }

    Ok(CatalogLayer {
        kind,
        path: p.to_path_buf(),
        entries,
    })
}

fn collect_toml_files(dir: &Path) -> EcoResult<Vec<PathBuf>> {
    let mut files = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let p = entry.path();
        if p.is_file() && is_manifest_file(&p) {
            files.push(p);
        }
    }
    Ok(files)
}

fn is_manifest_file(p: &Path) -> bool {
    if let Some(ext) = p.extension() {
        if ext == "toml" {
            let name = p.file_name().and_then(|s| s.to_str()).unwrap_or("");
            return name.ends_with(".capability.toml") || name.ends_with(".toml");
        }
    }
    false
}

fn load_manifest_file(p: &Path) -> EcoResult<CapabilityManifest> {
    let meta = fs::metadata(p)?;
    if meta.len() > MAX_MANIFEST_BYTES {
        return Err(EcoError::Catalog(format!("file {:?} exceeds 1MB limit", p)));
    }
    let content = fs::read_to_string(p)?;
    toml::from_str::<CapabilityManifest>(&content)
        .map_err(|e| EcoError::Catalog(format!("error parsing {:?}: {}", p, e)))
}
