#![allow(dead_code)]
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelectorItem {
    pub id: String,
    pub name: String,
    pub group: String,
    pub tier: String,
    pub is_installed: bool,
    pub is_compatible: bool,
    pub hard_conflicts: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SelectorAction {
    ToggleSelection,
    SelectAllCompatible,
    SelectNone,
    SetFilter(String),
    Confirm,
    Abort,
}

#[derive(Debug, Clone)]
pub struct SelectorState {
    pub items: Vec<SelectorItem>,
    pub selected_ids: HashSet<String>,
    pub cursor: usize,
    pub filter: String,
    pub is_confirmed: bool,
    pub is_aborted: bool,
}

impl SelectorState {
    pub fn new(items: Vec<SelectorItem>) -> Self {
        Self {
            items,
            selected_ids: HashSet::new(),
            cursor: 0,
            filter: String::new(),
            is_confirmed: false,
            is_aborted: false,
        }
    }

    pub fn filtered_indices(&self) -> Vec<usize> {
        self.items
            .iter()
            .enumerate()
            .filter(|(_, it)| {
                if self.filter.is_empty() {
                    true
                } else {
                    it.name.to_lowercase().contains(&self.filter.to_lowercase())
                        || it.id.to_lowercase().contains(&self.filter.to_lowercase())
                }
            })
            .map(|(i, _)| i)
            .collect()
    }

    pub fn handle_action(&mut self, action: SelectorAction) {
        match action {
            SelectorAction::ToggleSelection => {
                let filtered = self.filtered_indices();
                if let Some(&idx) = filtered.get(self.cursor) {
                    let item = &self.items[idx];
                    if self.selected_ids.contains(&item.id) {
                        self.selected_ids.remove(&item.id);
                    } else if item.is_compatible && item.tier != "blocked" {
                        self.selected_ids.insert(item.id.clone());
                    }
                }
            }
            SelectorAction::SelectAllCompatible => {
                for it in &self.items {
                    if !it.is_compatible || it.tier == "blocked" {
                        continue;
                    }
                    // Hard conflict check: skip if any selected item conflicts with this one
                    let has_conflict = it
                        .hard_conflicts
                        .iter()
                        .any(|conf| self.selected_ids.contains(conf));
                    if !has_conflict {
                        self.selected_ids.insert(it.id.clone());
                    }
                }
            }
            SelectorAction::SelectNone => {
                self.selected_ids.clear();
            }
            SelectorAction::SetFilter(f) => {
                self.filter = f;
                self.cursor = 0;
            }
            SelectorAction::Confirm => {
                self.is_confirmed = true;
            }
            SelectorAction::Abort => {
                self.is_aborted = true;
            }
        }
    }
}
