pub mod arch_eval;
pub mod heal;
pub mod registry;
pub mod router;
pub mod spark;
pub mod state;
pub mod types;

pub use arch_eval::{evaluate_architecture, format_architecture_manifest_toon};
pub use registry::{find_repo_root, get_skill_entry, load_skill_registry};
pub use router::route_task;
pub use spark::{evaluate_fable_spark, SparkResult, SparkSignalContext, SparkSource};
pub use state::{
    add_evidence, closed_without_evidence, create_initial_state, find_fable_dir,
    has_fresh_passing_evidence, has_pending_mutation_debt, parse_ledger, pending_mutation_tokens,
    persist_pending_mutation, read_state, record_mutation, safe_fable_boundary, transition_state,
    with_state_transaction, workspace_id_for_target, write_state,
};
pub use types::*;

