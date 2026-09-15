pub mod catalog;
pub mod discover;
pub mod doctor;
pub mod error;
pub mod host;
pub mod install;
pub mod model;
pub mod observe;
pub mod policy;
pub mod project;
pub mod resolve;
pub mod runtime;

pub use catalog::load::{load_catalog_dir, CatalogLayer, CatalogLayerKind};
pub use catalog::merge::{catalog_digest, merge_catalogs, Catalog};
pub use catalog::profile::{expand_profile, load_profile_file};
pub use catalog::validate::validate_manifest;
pub use discover::discover_machine;
pub use error::{EcoError, EcoResult};
pub use install::cache::ArtifactCache;
pub use install::commit::{commit_inventory, commit_lockfile};
pub use install::driver::{CopySkillDriver, InstallDriverTrait};
pub use install::health::{run_health_check, HealthStatus};
pub use install::journal::{create_journal, save_journal, update_op_state, write_receipt};
pub use install::recovery::{classify_crash, CrashClassification};
pub use install::rollback::rollback_paths;
pub use install::staging::StagingRoot;
pub use model::*;
pub use resolve::{check_compatibility, expand_dependencies, find_conflicts, resolve_capabilities, ResolutionSet};

pub const fn schema_version() -> u32 {
    1
}
