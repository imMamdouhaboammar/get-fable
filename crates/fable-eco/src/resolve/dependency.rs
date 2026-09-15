use std::collections::{BTreeSet, HashSet};
use crate::catalog::Catalog;
use crate::error::{EcoError, EcoResult};
use crate::model::capability::{CapabilityId, DependencyType};

pub fn expand_dependencies(
    roots: &[CapabilityId],
    catalog: &Catalog,
) -> EcoResult<Vec<CapabilityId>> {
    let mut resolved = BTreeSet::new();
    let mut visiting = HashSet::new();

    for root in roots {
        expand_node(root, catalog, &mut visiting, &mut resolved)?;
    }

    let mut result: Vec<CapabilityId> = resolved.into_iter().collect();
    result.sort();
    Ok(result)
}

fn expand_node(
    id: &CapabilityId,
    catalog: &Catalog,
    visiting: &mut HashSet<CapabilityId>,
    resolved: &mut BTreeSet<CapabilityId>,
) -> EcoResult<()> {
    if resolved.contains(id) {
        return Ok(());
    }
    if !visiting.insert(id.clone()) {
        return Err(EcoError::Validation(format!(
            "ECO_DEPENDENCY_CYCLE: cycle detected at '{}'",
            id
        )));
    }
    let manifest = catalog.entries.get(id).ok_or_else(|| {
        EcoError::Catalog(format!("unknown capability '{}'", id))
    })?;

    for dep in &manifest.dependencies {
        if dep.dep_type == DependencyType::Required {
            if let Ok(dep_id) = dep.target.parse::<CapabilityId>() {
                expand_node(&dep_id, catalog, visiting, resolved)?;
            }
        }
    }

    visiting.remove(id);
    resolved.insert(id.clone());
    Ok(())
}
