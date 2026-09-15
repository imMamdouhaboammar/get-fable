use std::collections::HashSet;
use crate::catalog::Catalog;
use crate::model::capability::{CapabilityId, ConflictKind};

pub fn find_conflicts(selected: &[CapabilityId], catalog: &Catalog) -> Vec<String> {
    let mut conflicts = Vec::new();
    let selected_set: HashSet<String> = selected.iter().map(|id| id.to_string()).collect();

    for id in selected {
        if let Some(manifest) = catalog.entries.get(id) {
            for c in &manifest.conflicts {
                if c.kind == ConflictKind::Hard && selected_set.contains(&c.target) {
                    conflicts.push(format!(
                        "ECO_HARD_CONFLICT: '{}' hard conflicts with '{}' ({})",
                        id, c.target, c.reason_code
                    ));
                }
            }
        }
    }
    conflicts
}
