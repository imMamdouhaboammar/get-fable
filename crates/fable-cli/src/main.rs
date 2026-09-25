use clap::{Parser, Subcommand};
use fable_core::*;

mod eco;
mod eco_tui;
mod json;

#[derive(Parser)]
#[command(name = "get-fable-native")]
#[command(author = "Mamdouh Abo Ammar")]
#[command(version = "1.10.0")]
#[command(about = "Ultra-fast native coding lifecycle engine for AI agents", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Route a task and explain workflow selection
    Route {
        task: String,
        #[arg(long)]
        apply: bool,
        #[arg(long)]
        json: bool,
    },
    /// Transition durable workflow state
    State {
        phase: String,
        #[arg(long)]
        substantial: bool,
        #[arg(long)]
        json: bool,
    },
    /// Record a workspace mutation and invalidate older verification
    Mutation {
        source: Option<String>,
        #[arg(long)]
        json: bool,
    },
    /// Record typed evidence
    Evidence {
        result: String,
        kind: String,
        source: String,
        detail: String,
        #[arg(long)]
        json: bool,
    },
    /// Report installation and project state
    Status {
        #[arg(long)]
        json: bool,
    },
    /// Manage active work card
    Card {
        text: Option<String>,
        #[arg(long)]
        clear: bool,
    },
    /// Heal and remediate redteam security findings
    Heal {
        /// Path to findings JSON or SARIF report
        #[arg(long)]
        findings: Option<String>,
        /// Target URL or directory
        #[arg(long)]
        target: Option<String>,
        /// Dry-run mode: show diffs without modifying files
        #[arg(long, default_value_t = false)]
        dry_run: bool,
        /// Output as machine-readable JSON
        #[arg(long, default_value_t = false)]
        json: bool,
    },
    /// Curated capability distribution and execution-control subsystem
    Eco {
        #[command(subcommand)]
        subcommand: Option<eco::EcoCommands>,
        #[arg(long = "json-v1", default_value_t = false, global = true)]
        json_v1: bool,
        #[arg(long, default_value_t = false, global = true)]
        json: bool,
    },
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let cwd = std::env::current_dir()?;

    match cli.command {
        Commands::Route { task, apply, json } => {
            let repo_root = find_repo_root(&cwd).unwrap_or_else(|| cwd.clone());
            let registry = load_skill_registry(&repo_root)?;
            let current_state = read_state(&cwd)?;
            let decision = route_task(&task, current_state.as_ref(), &registry)?;

            if apply {
                let updated = with_state_transaction(&cwd, |st| {
                    st.current_skill = Some(decision.selected_skill.clone());
                    st.last_decision = Some(decision.clone());
                    if decision.requires_plan || decision.selected_skill == "fable-recover" {
                        st.substantial = true;
                    }
                    Ok(())
                })?;
                if json {
                    println!("{}", serde_json::to_string_pretty(&updated)?);
                } else {
                    println!("✔ Applied routing decision: {}", decision.selected_skill);
                }
            } else if json {
                println!("{}", serde_json::to_string_pretty(&decision)?);
            } else {
                println!("\n=== get-fable task router (Native) ===");
                println!("Selected skill: {}", decision.selected_skill);
                println!("Selected pack:  {}", decision.selected_pack);
                println!("Task shape:     {:?}", decision.task_shape);
                println!("Confidence:     {:.2}", decision.confidence);
                println!("Requires plan:  {}", decision.requires_plan);
                println!("\nReasons:");
                for r in &decision.reasons {
                    println!("- {}", r);
                }
            }
        }
        Commands::State {
            phase,
            substantial,
            json,
        } => {
            let target_phase: FablePhase = phase.parse()?;
            let updated = with_state_transaction(&cwd, |st| {
                if substantial {
                    st.substantial = true;
                }
                transition_state(st, target_phase)
            })?;
            if json {
                println!("{}", serde_json::to_string_pretty(&updated)?);
            } else {
                println!("✔ State transitioned to: {}", updated.phase);
            }
        }
        Commands::Mutation { source, json } => {
            let src = source.unwrap_or_else(|| "cli".to_string());
            let updated = with_state_transaction(&cwd, |st| {
                record_mutation(st);
                Ok(())
            })?;
            if json {
                println!("{}", serde_json::to_string_pretty(&updated)?);
            } else {
                println!(
                    "✔ Mutation generation: {} (source: {})",
                    updated.mutation_generation, src
                );
            }
        }
        Commands::Evidence {
            result,
            kind,
            source,
            detail,
            json,
        } => {
            let res: EvidenceResult = match result.to_lowercase().as_str() {
                "pass" => EvidenceResult::Pass,
                "fail" => EvidenceResult::Fail,
                _ => return Err("Evidence result must be 'pass' or 'fail'".into()),
            };
            let ev_kind: EvidenceKind = kind.parse()?;

            let updated = with_state_transaction(&cwd, |st| {
                let rec = EvidenceRecord {
                    kind: ev_kind,
                    source,
                    result: res,
                    detail,
                    generation: st.mutation_generation,
                    timestamp: chrono::Utc::now().to_rfc3339(),
                    workspace_id: Some(st.workspace_id.clone()),
                    repository_revision: None,
                    command_category: None,
                    scope: None,
                    receipt_id: None,
                };
                add_evidence(st, rec);
                Ok(())
            })?;

            if json {
                println!("{}", serde_json::to_string_pretty(&updated)?);
            } else {
                println!("\n=== get-fable evidence recorded (Native) ===");
                println!("Generation:          {}", updated.mutation_generation);
                println!("Verified generation: {}", updated.verified_generation);
                println!("Phase:               {}", updated.phase);
                println!("Failure streak:      {}", updated.failure_streak);
            }
        }
        Commands::Status { json } => {
            let state = read_state(&cwd)?;
            match state {
                Some(st) => {
                    if json {
                        println!("{}", serde_json::to_string_pretty(&st)?);
                    } else {
                        println!("\n=== get-fable status (Native) ===");
                        println!("Workspace ID:        {}", st.workspace_id);
                        println!("Phase:               {}", st.phase);
                        println!(
                            "Current skill:       {}",
                            st.current_skill.unwrap_or_else(|| "none".to_string())
                        );
                        println!("Mutation generation: {}", st.mutation_generation);
                        println!("Verified generation: {}", st.verified_generation);
                        println!("Substantial:         {}", st.substantial);
                        println!("Failure streak:      {}", st.failure_streak);
                    }
                }
                None => {
                    if json {
                        println!("{{ \"error\": \"No .fable/state.json found\" }}");
                    } else {
                        println!("No .fable/state.json found in current directory.");
                    }
                }
            }
        }
        Commands::Card { text, clear } => {
            let updated = with_state_transaction(&cwd, |st| {
                if clear {
                    st.active_card = None;
                } else if let Some(t) = text {
                    st.active_card = Some(t);
                }
                Ok(())
            })?;
            println!(
                "Active card: {}",
                updated.active_card.unwrap_or_else(|| "none".to_string())
            );
        }
        Commands::Heal {
            findings,
            target: _,
            dry_run,
            json,
        } => {
            let repo_root = find_repo_root(&cwd).unwrap_or_else(|| cwd.clone());
            let findings_list: Vec<fable_core::heal::RedTeamFindingInput> =
                if let Some(path_str) = findings {
                    let p = std::path::PathBuf::from(path_str);
                    let content = std::fs::read_to_string(&p)?;
                    serde_json::from_str(&content)?
                } else {
                    let default_path = repo_root.join(".fable/redteam-findings.json");
                    if default_path.exists() {
                        let content = std::fs::read_to_string(&default_path)?;
                        serde_json::from_str(&content)?
                    } else {
                        Vec::new()
                    }
                };

            let report = fable_core::heal::plan_healing(&findings_list, &repo_root, dry_run);
            if json {
                println!("{}", serde_json::to_string_pretty(&report)?);
            } else {
                println!("\n=== get-fable security healing engine (Native) ===");
                println!("Total findings:    {}", report.total_findings);
                println!("Patches generated: {}", report.patches_generated);
                println!("Patches applied:   {}", report.patches_applied);
                println!("Dry run:           {}", report.dry_run);
                println!("Attestation seal:  {}", report.attestation_sha256);
                for p in &report.patches {
                    println!("\n[{}] {} ({})", p.finding_id, p.strategy, p.severity);
                    if let Some(ref fp) = p.file_path {
                        println!("Target file: {}", fp);
                    }
                    if !p.diff.is_empty() {
                        println!("{}", p.diff);
                    }
                }
            }
        }
        Commands::Eco {
            subcommand,
            json_v1,
            json,
        } => {
            let is_json = json_v1 || json;
            match subcommand {
                Some(cmd) => {
                    eco::handle_eco_command(cmd, is_json, &cwd)?;
                }
                None => {
                    // Default interactive selector entry
                    let facts = fable_eco::discover::discover_machine();
                    if is_json {
                        println!(
                            "{}",
                            serde_json::to_string_pretty(&json::JsonEnvelope::success(
                                "eco.interactive",
                                &facts
                            ))?
                        );
                    } else {
                        println!("\n=== Fable Eco Interactive Selector ===");
                        println!("Platform: {:?}", facts.platform_string());
                        println!("Use 'get-fable eco --help' to see all commands, or 'get-fable eco plan core' to generate a plan.");
                    }
                }
            }
        }
    }

    Ok(())
}
