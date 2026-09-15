use crate::error::{EcoError, EcoResult};
use crate::model::capability::{CapabilityManifest, VersionChannel};
use crate::model::source::ResolvedSource;

pub fn resolve_version(manifest: &CapabilityManifest) -> EcoResult<ResolvedSource> {
    if manifest.version.channel == VersionChannel::Stable {
        if let Some(rev) = &manifest.version.revision {
            let lower = rev.to_ascii_lowercase();
            if lower == "main" || lower == "master" || lower == "head" || lower == "trunk" || lower == "dev" {
                return Err(EcoError::Validation(format!(
                    "ECO_MUTABLE_STABLE_REVISION: branch '{}' is mutable and cannot be resolved as stable",
                    rev
                )));
            }
        }
    }

    let version_str = manifest.version.constraint.as_deref().unwrap_or("0.0.1").to_string();
    let revision = manifest.version.revision.clone();

    Ok(ResolvedSource {
        source_type: manifest.source.source_type,
        repository: manifest.source.repository.clone(),
        resolved_version: version_str,
        resolved_revision: revision,
        artifact_digest: None,
        artifact_url: None,
    })
}
