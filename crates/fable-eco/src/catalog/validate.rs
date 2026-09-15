use crate::error::{EcoError, EcoResult};
use crate::model::capability::*;
use std::collections::HashSet;

pub fn validate_manifest(m: &CapabilityManifest) -> EcoResult<()> {
    validate_basics(m)?;
    validate_source(m)?;
    validate_platforms(m)?;
    validate_dependencies(m)?;
    validate_conflicts(m)?;
    validate_health(&m.health)?;
    validate_hosts(&m.hosts)?;
    Ok(())
}

fn validate_basics(m: &CapabilityManifest) -> EcoResult<()> {
    if m.schema_version != 1 {
        return Err(EcoError::Validation(format!(
            "unsupported schema_version {}, expected 1",
            m.schema_version
        )));
    }
    if m.name.trim().is_empty() || m.name.len() > 120 {
        return Err(EcoError::Validation("name must be 1-120 chars".into()));
    }
    if m.description.trim().is_empty() || m.description.len() > 500 {
        return Err(EcoError::Validation(
            "description must be 1-500 chars".into(),
        ));
    }
    if m.classes.is_empty() {
        return Err(EcoError::Validation("classes must not be empty".into()));
    }
    Ok(())
}

fn validate_source(m: &CapabilityManifest) -> EcoResult<()> {
    let repo = &m.source.repository;
    if !repo.starts_with("https://") && !repo.starts_with("file://") && repo != "bundled" {
        return Err(EcoError::Validation(format!(
            "invalid repository scheme for '{}', must be https://, file://, or bundled",
            repo
        )));
    }
    if m.version.channel == VersionChannel::Stable {
        if let Some(rev) = &m.version.revision {
            let lower = rev.to_ascii_lowercase();
            if lower == "main"
                || lower == "master"
                || lower == "head"
                || lower == "trunk"
                || lower == "dev"
            {
                return Err(EcoError::Validation(format!(
                    "mutable branch '{}' forbidden as revision on stable channel",
                    rev
                )));
            }
        }
    }
    Ok(())
}

fn validate_platforms(m: &CapabilityManifest) -> EcoResult<()> {
    if m.platforms.is_empty() {
        return Err(EcoError::Validation(
            "platforms list cannot be empty".into(),
        ));
    }
    for p in &m.platforms {
        match p.as_str() {
            "macos/arm64" | "macos/x86_64" | "linux/arm64" | "linux/x86_64" | "windows/x86_64"
            | "windows/arm64" => {}
            _ => {
                return Err(EcoError::Validation(format!(
                    "unsupported platform '{}'",
                    p
                )))
            }
        }
    }
    Ok(())
}

fn validate_dependencies(m: &CapabilityManifest) -> EcoResult<()> {
    let self_id = m.id.to_string();
    let prefix = format!("capability:{}", self_id);
    for dep in &m.dependencies {
        if dep.target == self_id || dep.target == prefix {
            return Err(EcoError::Validation(format!(
                "capability cannot declare dependency on itself: {}",
                dep.target
            )));
        }
    }
    Ok(())
}

fn validate_conflicts(m: &CapabilityManifest) -> EcoResult<()> {
    let self_id = m.id.to_string();
    let prefix = format!("capability:{}", self_id);
    for c in &m.conflicts {
        if c.target == self_id || c.target == prefix {
            return Err(EcoError::Validation(format!(
                "capability cannot declare conflict against itself: {}",
                c.target
            )));
        }
        if c.reason_code.trim().is_empty() {
            return Err(EcoError::Validation(
                "conflict rule requires non-empty reason_code".into(),
            ));
        }
    }
    Ok(())
}

fn validate_health(h: &HealthConfig) -> EcoResult<()> {
    if h.timeout_ms < 100 || h.timeout_ms > 120_000 {
        return Err(EcoError::Validation(format!(
            "health timeout_ms {} must be between 100 and 120000",
            h.timeout_ms
        )));
    }
    if h.kind == HealthKind::Command {
        match &h.command {
            Some(cmd) if !cmd.is_empty() => {}
            _ => {
                return Err(EcoError::Validation(
                    "health kind command requires non-empty command array".into(),
                ))
            }
        }
    }
    Ok(())
}

fn validate_hosts(hosts: &[HostBinding]) -> EcoResult<()> {
    let mut seen = HashSet::new();
    for h in hosts {
        if !seen.insert(&h.id) {
            return Err(EcoError::Validation(format!(
                "duplicate host id '{}'",
                h.id
            )));
        }
    }
    Ok(())
}
