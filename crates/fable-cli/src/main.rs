use clap::{Parser, Subcommand};
use fable_core::*;
use std::io::Read;

mod eco;
mod eco_tui;
mod hooks;
mod json;

#[derive(Parser)]
#[command(name = "get-fable-native")]
#[command(author = "Mamdouh Abo Ammar")]
#[command(version = "1.12.0")]
#[command(about = "Ultra-fast native coding lifecycle engine for AI agents", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
pub enum ToonCommands {
    /// Estimate token count for input text or JSON
    Estimate {
        /// Input text (or read from stdin if omitted)
        input: Option<String>,
        #[arg(long)]
        json: bool,
    },
    /// Encode JSON into compact TOON format
    Encode {
        /// Input JSON string (or read from stdin if omitted)
        input: Option<String>,
        #[arg(long)]
        json: bool,
    },
    /// Decode TOON format into JSON
    Decode {
        /// Input TOON string (or read from stdin if omitted)
        input: Option<String>,
        #[arg(long)]
        json: bool,
    },
    /// Validate TOON payload (including [N]{fields} row counts)
    Validate {
        /// Input TOON string (or read from stdin if omitted)
        input: Option<String>,
        #[arg(long)]
        json: bool,
    },
    /// Apply Reflex conversation context compaction
    Compact {
        /// Input JSON messages array (or read from stdin if omitted)
        input: Option<String>,
        #[arg(long, default_value_t = 30)]
        keep_recent: usize,
    },
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
        #[arg(long = "json-v1", default_value_t = false)]
        json_v1: bool,
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
    /// Evaluate architecture 3-vector scores and tech stack assignment
    #[command(name = "arch-eval")]
    ArchEval {
        spec: String,
        #[arg(long)]
        json: bool,
        #[arg(long = "json-v1", default_value_t = false)]
        json_v1: bool,
    },
    /// Predict the smallest atomic next move from durable state
    Spark {
        intent: Option<String>,
        #[arg(long)]
        json: bool,
        #[arg(long = "json-v1", default_value_t = false)]
        json_v1: bool,
    },
    /// Execute a lifecycle hook natively (profile, spawn, failure, mutation, close, event, learn, architecture)
    Hook {
        #[arg(long)]
        handler: String,
        #[arg(long)]
        event: Option<String>,
        #[arg(long)]
        host: Option<String>,
    },
    /// Zero-copy TOON codec, token estimator, and Reflex context compaction
    Toon {
        #[command(subcommand)]
        subcommand: ToonCommands,
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
    /// Jev-powered automatic subagent task decomposition, 3-law verification, and dynamic skill-arming engine
    #[command(name = "jev-orchestrate")]
    JevOrchestrate {
        /// Complex task or mission to decompose and arm across subagents
        task: String,
        /// Maximum parallel subagents per wave
        #[arg(long, default_value_t = 4)]
        max_agents: usize,
        /// Force deterministic offline Jev calibration
        #[arg(long, default_value_t = false)]
        offline: bool,
        /// Output in compact TOON format
        #[arg(long, default_value_t = false)]
        toon: bool,
        /// Output as machine-readable JSON
        #[arg(long, default_value_t = false)]
        json: bool,
    },
}

fn read_input_or_stdin(input: Option<String>) -> Result<String, Box<dyn std::error::Error>> {
    if let Some(s) = input {
        return Ok(s);
    }
    let mut buf = String::new();
    std::io::stdin().read_to_string(&mut buf)?;
    Ok(buf)
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let cwd = std::env::current_dir()?;

    match cli.command {
        Commands::Route {
            task,
            apply,
            json,
            json_v1,
        } => {
            let is_json = json || json_v1;
            let repo_root = find_repo_root(&cwd).unwrap_or_else(|| cwd.clone());
            let registry = load_skill_registry(&repo_root)?;
            let current_state = read_state(&cwd).ok().flatten();
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
                if is_json {
                    println!("{}", serde_json::to_string_pretty(&updated)?);
                } else {
                    println!("✔ Applied routing decision: {}", decision.selected_skill);
                }
            } else if is_json {
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
        Commands::ArchEval {
            spec,
            json,
            json_v1,
        } => {
            let res = evaluate_architecture(&spec)?;
            if json || json_v1 {
                println!("{}", serde_json::to_string_pretty(&res)?);
            } else {
                println!("\n=== get-fable architecture evaluation (Native) ===");
                println!("Verdict:         {}", res.verdict);
                println!("Allow monolith:  {}", res.allow_monolith);
                println!(
                    "Vectors:         scale={:.1}, domain={:.1}, resource={:.1}, composite={:.1}",
                    res.vectors.scale_and_load,
                    res.vectors.domain_decoupling,
                    res.vectors.resource_intensity,
                    res.vectors.composite_score
                );
                println!("\n{}", res.manifest_toon);
            }
        }
        Commands::Spark {
            intent,
            json,
            json_v1,
        } => {
            let state = read_state(&cwd)
                .ok()
                .flatten()
                .unwrap_or_else(|| create_initial_state(&cwd));
            let ledger_p = cwd.join(".fable").join("LEDGER.md");
            let (open_cards, _has_any, _paused) = parse_ledger(&ledger_p);
            let ctx = SparkSignalContext {
                user_intent: intent.as_deref(),
                state: &state,
                active_card_text: state.active_card.as_deref(),
                open_cards: &open_cards,
                latest_error: None,
                latest_mutation_source: None,
            };
            let res = evaluate_fable_spark(&ctx);
            if json || json_v1 {
                println!("{}", serde_json::to_string_pretty(&res)?);
            } else if let Some(ref s) = res.suggestion {
                println!("{}", s);
            }
        }
        Commands::Hook {
            handler,
            event,
            host,
        } => {
            let code = hooks::execute_hook(&handler, event.as_deref(), host.as_deref());
            std::process::exit(code);
        }
        Commands::Toon { subcommand } => match subcommand {
            ToonCommands::Estimate { input, json } => {
                let raw = read_input_or_stdin(input)?;
                let tokens = fable_toon::estimate_tokens(&raw);
                if json {
                    println!(
                        "{}",
                        serde_json::json!({
                            "tokens": tokens,
                            "chars": raw.chars().count(),
                            "bytes": raw.len(),
                        })
                    );
                } else {
                    println!("{}", tokens);
                }
            }
            ToonCommands::Encode { input, json } => {
                let raw = read_input_or_stdin(input)?;
                let val: serde_json::Value = serde_json::from_str(&raw)?;
                let encoded = fable_toon::encode_toon(&val);
                if json {
                    let cmp = fable_toon::compare_tokens(&val);
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&serde_json::json!({
                            "toon": encoded,
                            "comparison": cmp,
                        }))?
                    );
                } else {
                    println!("{}", encoded);
                }
            }
            ToonCommands::Decode { input, json: _ } => {
                let raw = read_input_or_stdin(input)?;
                let decoded = fable_toon::decode_toon(&raw, true)?;
                println!("{}", serde_json::to_string_pretty(&decoded)?);
            }
            ToonCommands::Validate { input, json } => {
                let raw = read_input_or_stdin(input)?;
                let res = fable_toon::validate_toon(&raw);
                if json {
                    println!("{}", serde_json::to_string_pretty(&res)?);
                } else if res.valid {
                    println!("✔ Valid TOON payload");
                } else {
                    eprintln!(
                        "✖ Invalid TOON: {}",
                        res.error.unwrap_or_else(|| "unknown error".to_string())
                    );
                    std::process::exit(1);
                }
            }
            ToonCommands::Compact { input, keep_recent } => {
                let raw = read_input_or_stdin(input)?;
                let messages: Vec<fable_toon::Message> = serde_json::from_str(&raw)?;
                let mut calls = Vec::new();
                for msg in &messages {
                    for tu in &msg.tool_uses {
                        calls.push(fable_toon::ToolCall {
                            id: tu.tool_use_id.clone(),
                            tool_use_id: tu.tool_use_id.clone(),
                            tool: tu.tool.clone(),
                            result_chars: tu.text.as_ref().map(|s| s.len()).unwrap_or(0),
                            pinned: false,
                        });
                    }
                }
                let total_calls = calls.len();
                let decisions: Vec<fable_toon::CallDecision> = calls
                    .iter()
                    .enumerate()
                    .map(|(idx, c)| {
                        let is_recent = idx + keep_recent >= total_calls;
                        let ans = fable_toon::CallAnswer {
                            keep_call: if is_recent { 1.0 } else { 0.6 },
                            keep_result: if is_recent { 1.0 } else { 0.2 },
                        };
                        fable_toon::decide_call(c, &ans, 0.5)
                    })
                    .collect();
                let compacted = fable_toon::apply_decisions(&messages, &decisions, &calls, 200);
                println!("{}", serde_json::to_string_pretty(&compacted)?);
            }
        },
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
        Commands::JevOrchestrate {
            task,
            max_agents,
            offline,
            toon,
            json,
        } => {
            let repo_root = find_repo_root(&cwd).unwrap_or_else(|| cwd.clone());
            let current_state = read_state(&cwd).ok().flatten();
            let plan = fable_jev::orchestrate_task(
                &task,
                max_agents,
                offline,
                &repo_root,
                current_state.as_ref(),
            )?;

            if json {
                println!("{}", serde_json::to_string_pretty(&plan)?);
            } else if toon {
                println!("{}", plan.toon_summary);
            } else {
                println!("\n=== get-fable Jev Subagent Orchestrator (Native) ===");
                println!("Task:            {}", plan.task);
                println!("Total subtasks:  {}", plan.total_subtasks);
                println!("Total waves:     {}", plan.total_waves);
                println!("Accuracy score:  {:.4}", plan.overall_accuracy_score);
                for wave in &plan.waves {
                    println!(
                        "\n--- Wave {} (parallel={}, 3-Laws={}) ---",
                        wave.wave_index,
                        wave.parallel,
                        wave.independence_proof.all_laws_satisfied()
                    );
                    for b in &wave.bundles {
                        let co_list: Vec<&str> = b
                            .co_armed_skills
                            .iter()
                            .map(|c| c.skill_id.as_str())
                            .collect();
                        println!(
                            "  [{}] {} -> subagent={} ({}), primary={} (score={:.3}, conf={:.3}), coArmed=[{}]",
                            b.subtask.id,
                            b.subtask.title,
                            b.subagent_id,
                            b.subagent_role,
                            b.primary_skill.skill_id,
                            b.primary_skill.total_score,
                            b.calibration.calibrated_confidence,
                            co_list.join(", ")
                        );
                    }
                }
                println!("\n--- TOON Summary ---\n{}", plan.toon_summary);
            }
        }
    }

    Ok(())
}

