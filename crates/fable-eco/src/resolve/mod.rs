pub mod compatibility;
pub mod conflict;
pub mod dependency;
pub mod planner;
pub mod version;

pub use compatibility::check_compatibility;
pub use conflict::find_conflicts;
pub use dependency::expand_dependencies;
pub use planner::build_install_plan;
pub use version::resolve_version;

use serde::{Deserialize, Serialize};
use crate::catalog::Catalog;
use crate::error::EcoResult;
use crate::model::capability::CapabilityId;
use crate::model::machine::MachineFacts;

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolutionSet {
    pub selected: Vec<CapabilityId>,
    pub skipped: Vec<(CapabilityId, String)>,
    pub blocked: Vec<(CapabilityId, String)>,
    pub conflicts: Vec<String>,
}

pub fn resolve_capabilities(
    requested: &[CapabilityId],
    catalog: &Catalog,
    machine: &MachineFacts,
) -> EcoResult<ResolutionSet> {
    let mut selected = Vec::new();
    let mut blocked = Vec::new();

    let expanded = expand_dependencies(requested, catalog)?;

    for id in &expanded {
        let manifest = match catalog.entries.get(id) {
            Some(m) => m,
            None => {
                blocked.push((id.clone(), "not found in catalog".to_string()));
                continue;
            }
        };

        match check_compatibility(manifest, machine) {
            Ok(()) => selected.push(id.clone()),
            Err(reason) => blocked.push((id.clone(), reason)),
        }
    }

    let conflicts = find_conflicts(&selected, catalog);
    if !conflicts.is_empty() {
        selected.retain(|id| {
            !conflicts.iter().any(|c| c.contains(&id.to_string()))
        });
    }

    Ok(ResolutionSet {
        selected,
        skipped: Vec::new(),
        blocked,
        conflicts,
    })
}
