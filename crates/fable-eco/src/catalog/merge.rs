use crate::catalog::load::{CatalogLayer, CatalogLayerKind};
use crate::error::{EcoError, EcoResult};
use crate::model::capability::{CapabilityId, CapabilityManifest};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct Catalog {
    pub entries: BTreeMap<CapabilityId, CapabilityManifest>,
}

pub fn merge_catalogs(layers: &[CatalogLayer]) -> EcoResult<Catalog> {
    let mut merged = BTreeMap::new();
    for layer in layers {
        for (id, manifest) in &layer.entries {
            check_official_override(id, manifest, layer.kind, &merged)?;
            merged.insert(id.clone(), manifest.clone());
        }
    }
    Ok(Catalog { entries: merged })
}

fn check_official_override(
    id: &CapabilityId,
    incoming: &CapabilityManifest,
    layer_kind: CatalogLayerKind,
    existing: &BTreeMap<CapabilityId, CapabilityManifest>,
) -> EcoResult<()> {
    if id.namespace() == "fable" && layer_kind != CatalogLayerKind::Official {
        if let Some(prev) = existing.get(id) {
            if prev.source != incoming.source {
                return Err(EcoError::Catalog(format!(
                    "ECO_ILLEGAL_OFFICIAL_OVERRIDE: non-official layer cannot override official capability '{}'",
                    id
                )));
            }
        }
    }
    Ok(())
}

pub fn catalog_digest(catalog: &Catalog) -> String {
    let mut hasher = Sha256::new();
    for (id, manifest) in &catalog.entries {
        hasher.update(id.to_string().as_bytes());
        if let Ok(serialized) = toml::to_string(manifest) {
            hasher.update(serialized.as_bytes());
        }
    }
    format!("{:x}", hasher.finalize())
}
