use crate::catalog::merge::Catalog;
use crate::error::{EcoError, EcoResult};
use crate::model::capability::{CapabilityId, SupportTier};
use crate::model::profile::Profile;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::Path;

pub fn load_profile_file(path: impl AsRef<Path>) -> EcoResult<Profile> {
    let p = path.as_ref();
    let content = fs::read_to_string(p)?;
    toml::from_str::<Profile>(&content)
        .map_err(|e| EcoError::Validation(format!("failed to parse profile {:?}: {}", p, e)))
}

pub fn expand_profile(
    profile_id: &str,
    profiles: &HashMap<String, Profile>,
    catalog: Option<&Catalog>,
    include_optional: bool,
    allow_experimental: bool,
) -> EcoResult<Vec<CapabilityId>> {
    let mut visited = HashSet::new();
    let mut resolved_caps = BTreeSet::new();

    expand_recursive(
        profile_id,
        profiles,
        &mut visited,
        &mut resolved_caps,
        include_optional,
    )?;

    let mut result = Vec::new();
    for cap_str in resolved_caps {
        let cap_id: CapabilityId = cap_str.parse()?;
        if let Some(cat) = catalog {
            if let Some(manifest) = cat.entries.get(&cap_id) {
                if !allow_experimental
                    && manifest.governance.support_tier == SupportTier::Experimental
                {
                    continue;
                }
            } else {
                return Err(EcoError::Catalog(format!(
                    "profile '{}' references unknown capability '{}'",
                    profile_id, cap_id
                )));
            }
        }
        result.push(cap_id);
    }
    result.sort();
    Ok(result)
}

fn expand_recursive(
    id: &str,
    profiles: &HashMap<String, Profile>,
    visited: &mut HashSet<String>,
    out: &mut BTreeSet<String>,
    include_optional: bool,
) -> EcoResult<()> {
    if !visited.insert(id.to_string()) {
        return Err(EcoError::Validation(format!(
            "cycle detected in profile inheritance: '{}'",
            id
        )));
    }
    let prof = profiles
        .get(id)
        .ok_or_else(|| EcoError::Validation(format!("unknown profile '{}'", id)))?;

    for parent in &prof.extends {
        expand_recursive(parent, profiles, visited, out, include_optional)?;
    }
    for c in &prof.capabilities {
        out.insert(c.clone());
    }
    if include_optional {
        for opt in &prof.optional {
            out.insert(opt.clone());
        }
    }
    visited.remove(id);
    Ok(())
}
