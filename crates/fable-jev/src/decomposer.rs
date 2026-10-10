use crate::client::JevClient;
use crate::types::{IndependenceProof, SubtaskSpec};
use regex::Regex;
use std::collections::HashSet;
use std::sync::LazyLock;

static FILE_PATH_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b((?:src|crates|skills|hooks|registry|tests|docs|proto|bin)/[A-Za-z0-9_./*-]+|[A-Za-z0-9_-]+\.(?:rs|ts|tsx|js|py|json|toml|md|proto))\b").unwrap()
});

static BULLET_SPLIT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?m)^\s*(?:[-*•]|\d+[.)])\s+").unwrap()
});

static CLAUSE_SPLIT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:\s*;\s*|\s*,\s+and\s+|\s*,\s+then\s+|\s+then\s+|(?:\s+and\s+|\s*,\s+)(implement|verify|audit|test|build|create|add|update|fix|review|inspect|discover|research|plan|deploy|release|heal|refactor|simplify)\b)").unwrap()
});

/// Decompose a complex multi-step task string into atomic `SubtaskSpec` items.
pub fn decompose_task(task: &str, max_subtasks: usize) -> Vec<SubtaskSpec> {
    let trimmed = task.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }

    let raw_clauses = extract_clauses(trimmed);
    let limit = max_subtasks.max(1);
    let clauses: Vec<String> = raw_clauses.into_iter().take(limit).collect();

    clauses
        .into_iter()
        .enumerate()
        .map(|(idx, clause)| build_subtask_spec(idx, &clause))
        .collect()
}

fn extract_clauses(task: &str) -> Vec<String> {
    // 1. Check if input is a bulleted or numbered list
    if BULLET_SPLIT_RE.find_iter(task).count() >= 2 {
        let items: Vec<String> = BULLET_SPLIT_RE
            .split(task)
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
            .collect();
        if !items.is_empty() {
            return items;
        }
    }

    // 2. Split on conjunctions / action clauses without regex look-around
    let mut parts = Vec::new();
    let mut last = 0;
    for caps in CLAUSE_SPLIT_RE.captures_iter(task) {
        let m = caps.get(0).unwrap();
        let segment = task[last..m.start()].trim();
        if !segment.is_empty() {
            parts.push(segment.to_string());
        }
        // If group 1 matched an action verb after `, ` or ` and `, start the next clause at that verb
        if let Some(verb_match) = caps.get(1) {
            last = verb_match.start();
        } else {
            last = m.end();
        }
    }
    let tail = task[last..].trim();
    if !tail.is_empty() {
        parts.push(tail.to_string());
    }

    if parts.is_empty() {
        vec![task.to_string()]
    } else {
        parts
    }
}

fn build_subtask_spec(idx: usize, clause: &str) -> SubtaskSpec {
    let id = format!("subtask-{}", idx + 1);
    let clean = clause.trim().trim_end_matches('.');
    let lower = clean.to_lowercase();

    let explicit_paths: Vec<String> = FILE_PATH_RE
        .captures_iter(clean)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().to_string()))
        .collect();

    let is_verify = lower.starts_with("verify")
        || lower.starts_with("validate")
        || lower.starts_with("prove")
        || lower.contains("unit test")
        || lower.contains("test suite")
        || lower.starts_with("test ");

    let is_security_audit = (lower.contains("audit")
        || lower.contains("security")
        || lower.contains("redteam")
        || lower.contains("pentest")
        || lower.contains("threat"))
        && !lower.contains("implement")
        && !lower.contains("patch")
        && !lower.contains("heal");

    let is_discovery = (lower.starts_with("inspect")
        || lower.starts_with("discover")
        || lower.starts_with("explore")
        || lower.starts_with("trace")
        || lower.starts_with("research"))
        && !lower.contains("implement");

    let is_plan = (lower.starts_with("plan")
        || lower.starts_with("design")
        || lower.starts_with("architect")
        || lower.contains("evaluate architecture"))
        && !lower.contains("implement");

    let is_mutating = !is_verify
        && !is_security_audit
        && !is_discovery
        && !is_plan
        && (lower.contains("implement")
            || lower.contains("add")
            || lower.contains("create")
            || lower.contains("update")
            || lower.contains("modify")
            || lower.contains("build")
            || lower.contains("fix")
            || lower.contains("write")
            || lower.contains("heal")
            || lower.contains("refactor")
            || lower.contains("simplify")
            || !explicit_paths.is_empty());

    let phase_hint = if is_verify || is_security_audit {
        "verifying".to_string()
    } else if is_discovery {
        "discovering".to_string()
    } else if is_plan {
        "planned".to_string()
    } else {
        "executing".to_string()
    };

    let (read_scope, write_scope) = if !explicit_paths.is_empty() {
        if is_mutating {
            (explicit_paths.clone(), explicit_paths)
        } else {
            (explicit_paths, Vec::new())
        }
    } else if is_security_audit {
        (vec![format!("security-boundary::{}", id)], Vec::new())
    } else if is_verify {
        (vec![format!("tests::{}", id)], Vec::new())
    } else if is_discovery {
        (vec![format!("discovery::{}", id)], Vec::new())
    } else if is_plan {
        (vec![format!("architecture::{}", id)], Vec::new())
    } else {
        let inferred = infer_module_path(&lower, idx);
        (vec![inferred.clone()], vec![inferred])
    };

    let shared_contracts = infer_contracts(&lower, &write_scope, idx);
    let verification_cmd = infer_verification_cmd(&lower, &read_scope, &write_scope, idx);

    let title = if clean.chars().count() > 72 {
        let short: String = clean.chars().take(69).collect();
        format!("{}...", short)
    } else {
        clean.to_string()
    };

    SubtaskSpec {
        id,
        title,
        description: clean.to_string(),
        read_scope,
        write_scope,
        shared_contracts,
        verification_cmd,
        phase_hint,
        wave: 0,
    }
}

fn infer_module_path(lower: &str, idx: usize) -> String {
    if lower.contains("rust") || lower.contains("cargo") || lower.contains("crate") {
        format!("crates/module_{}.rs", idx + 1)
    } else if lower.contains("hook") || lower.contains("python") {
        format!("hooks/module_{}.py", idx + 1)
    } else if lower.contains("skill") {
        format!("skills/skill-{}/SKILL.md", idx + 1)
    } else {
        format!("src/module_{}.ts", idx + 1)
    }
}

fn infer_contracts(lower: &str, write_scope: &[String], idx: usize) -> Vec<String> {
    let mut contracts = Vec::new();
    for marker in [
        "interface",
        "schema",
        "proto",
        "contract",
        "types.ts",
        "types.rs",
        "registry.json",
        "state.json",
    ] {
        if lower.contains(marker) {
            contracts.push(format!("contract::{}", marker));
        }
    }
    if contracts.is_empty() {
        if let Some(first_write) = write_scope.first() {
            contracts.push(format!("scope::{}", first_write));
        } else {
            contracts.push(format!("subtask-contract-{}", idx + 1));
        }
    }
    contracts
}

fn infer_verification_cmd(
    lower: &str,
    read_scope: &[String],
    write_scope: &[String],
    idx: usize,
) -> String {
    let scope_ref = write_scope
        .first()
        .or_else(|| read_scope.first())
        .cloned()
        .unwrap_or_else(|| format!("target-{}", idx + 1));

    if scope_ref.ends_with(".rs") || scope_ref.starts_with("crates/") || lower.contains("cargo") {
        format!("cargo test --workspace -- {}", scope_ref)
    } else if lower.contains("security") || lower.contains("audit") {
        format!("bun ./bin/get-fable.js doctor --json-v1 # {}", scope_ref)
    } else if lower.contains("unit test") || lower.contains("verify") {
        format!("bun test -- {}", scope_ref)
    } else {
        format!("bun run typecheck && bun test -- {}", scope_ref)
    }
}

fn paths_overlap(a: &str, b: &str) -> bool {
    let a_clean = a.trim_end_matches("/**").trim_end_matches('/');
    let b_clean = b.trim_end_matches("/**").trim_end_matches('/');
    if a_clean == b_clean {
        return true;
    }
    a_clean.starts_with(&format!("{}/", b_clean)) || b_clean.starts_with(&format!("{}/", a_clean))
}

/// Verify the 3 Laws of Subagent Delegation (Write, Semantic, and Verification Independence)
/// across a candidate set of parallel subtasks.
pub fn verify_three_laws(subtasks: &[SubtaskSpec], client: &JevClient) -> IndependenceProof {
    if subtasks.len() <= 1 {
        return IndependenceProof {
            write_independent: true,
            semantic_independent: true,
            verification_independent: true,
            conflicts: Vec::new(),
            jev_semantic_overlap_score: 0.0,
        };
    }

    let mut conflicts = Vec::new();
    let mut write_independent = true;
    let mut semantic_independent = true;
    let mut verification_independent = true;
    let mut pair_items = Vec::new();

    for i in 0..subtasks.len() {
        for j in (i + 1)..subtasks.len() {
            let a = &subtasks[i];
            let b = &subtasks[j];

            // Law 1: Write Independence (W_i ∩ W_j = ∅ and W_i ∩ R_j = ∅ and R_i ∩ W_j = ∅)
            for wa in &a.write_scope {
                for wb in &b.write_scope {
                    if paths_overlap(wa, wb) {
                        write_independent = false;
                        conflicts.push(format!(
                            "Law 1 violation (Write-Write overlap): {} and {} both mutate '{}'",
                            a.id, b.id, wa
                        ));
                    }
                }
                for rb in &b.read_scope {
                    if paths_overlap(wa, rb) {
                        write_independent = false;
                        conflicts.push(format!(
                            "Law 1 violation (Write-Read hazard): {} mutates '{}' read by {}",
                            a.id, wa, b.id
                        ));
                    }
                }
            }
            for wb in &b.write_scope {
                for ra in &a.read_scope {
                    if paths_overlap(wb, ra) {
                        write_independent = false;
                        conflicts.push(format!(
                            "Law 1 violation (Read-Write hazard): {} mutates '{}' read by {}",
                            b.id, wb, a.id
                        ));
                    }
                }
            }

            // Law 2 (Deterministic part): Disjoint shared_contracts
            let contracts_a: HashSet<&String> = a.shared_contracts.iter().collect();
            let contracts_b: HashSet<&String> = b.shared_contracts.iter().collect();
            for shared in contracts_a.intersection(&contracts_b) {
                semantic_independent = false;
                conflicts.push(format!(
                    "Law 2 violation (Shared contract): {} and {} share contract '{}'",
                    a.id, b.id, shared
                ));
            }

            // Law 3: Verification Independence
            if a.verification_cmd.trim() == b.verification_cmd.trim() {
                verification_independent = false;
                conflicts.push(format!(
                    "Law 3 violation (Coupled verification): {} and {} share identical verification gate '{}'",
                    a.id, b.id, a.verification_cmd
                ));
            }

            pair_items.push(format!(
                "{}::{} || {}::{}",
                a.id, a.description, b.id, b.description
            ));
        }
    }

    // Law 2 (Jev calibrated semantic overlap check < 0.05)
    let score_res = client.score(
        "Evaluate Law 2 pairwise semantic overlap and shared contract coupling between subtasks",
        &pair_items,
    );
    let max_overlap = score_res
        .scores
        .values()
        .copied()
        .fold(0.0_f64, f64::max);

    if max_overlap >= 0.05 {
        semantic_independent = false;
        conflicts.push(format!(
            "Law 2 violation (Jev semantic overlap {:.4} >= 0.05 threshold)",
            max_overlap
        ));
    }

    IndependenceProof {
        write_independent,
        semantic_independent,
        verification_independent,
        conflicts,
        jev_semantic_overlap_score: max_overlap,
    }
}

/// Schedule subtasks into waves using greedy graph-coloring / topological assignment so that
/// every wave satisfies the 3 Laws of Independence (Write, Semantic, Verification).
pub fn schedule_waves(
    subtasks: Vec<SubtaskSpec>,
    client: &JevClient,
) -> Vec<(usize, IndependenceProof, Vec<SubtaskSpec>)> {
    schedule_waves_with_limit(subtasks, client, usize::MAX)
}

/// Schedule subtasks into waves with an explicit `max_agents` per wave bound.
pub fn schedule_waves_with_limit(
    subtasks: Vec<SubtaskSpec>,
    client: &JevClient,
    max_agents: usize,
) -> Vec<(usize, IndependenceProof, Vec<SubtaskSpec>)> {
    let cap = max_agents.max(1);
    let mut waves: Vec<Vec<SubtaskSpec>> = Vec::new();

    for mut st in subtasks {
        let mut placed_wave: Option<usize> = None;

        for (w_idx, wave_items) in waves.iter().enumerate() {
            if wave_items.len() >= cap {
                continue;
            }
            let mut candidate = wave_items.clone();
            candidate.push(st.clone());
            let proof = verify_three_laws(&candidate, client);
            if proof.all_laws_satisfied() {
                placed_wave = Some(w_idx);
                break;
            }
        }

        match placed_wave {
            Some(idx) => {
                st.wave = idx;
                waves[idx].push(st);
            }
            None => {
                let new_idx = waves.len();
                st.wave = new_idx;
                waves.push(vec![st]);
            }
        }
    }

    waves
        .into_iter()
        .enumerate()
        .map(|(w_idx, items)| {
            let proof = verify_three_laws(&items, client);
            (w_idx, proof, items)
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decompose_and_three_laws() {
        let client = JevClient::new(true);
        let task = "Audit security boundaries, implement gRPC rate limiter in src/rpc/server.ts, and verify with unit tests";
        let subtasks = decompose_task(task, 8);
        assert_eq!(subtasks.len(), 3);
        assert_eq!(subtasks[0].phase_hint, "verifying");
        assert_eq!(subtasks[1].phase_hint, "executing");
        assert!(subtasks[1].write_scope.contains(&"src/rpc/server.ts".to_string()));
        assert_eq!(subtasks[2].phase_hint, "verifying");

        let waves = schedule_waves_with_limit(subtasks, &client, 4);
        assert!(!waves.is_empty());
        for (_, proof, _) in &waves {
            assert!(proof.all_laws_satisfied());
        }
    }

    #[test]
    fn test_conflicting_write_scopes_separated_into_waves() {
        let client = JevClient::new(true);
        let s1 = SubtaskSpec {
            id: "subtask-1".to_string(),
            title: "Modify server.ts auth".to_string(),
            description: "Implement auth middleware in src/rpc/server.ts".to_string(),
            read_scope: vec!["src/rpc/server.ts".to_string()],
            write_scope: vec!["src/rpc/server.ts".to_string()],
            shared_contracts: vec!["scope::src/rpc/server.ts".to_string()],
            verification_cmd: "bun test src/rpc/server.ts".to_string(),
            phase_hint: "executing".to_string(),
            wave: 0,
        };
        let s2 = SubtaskSpec {
            id: "subtask-2".to_string(),
            title: "Modify server.ts rate limit".to_string(),
            description: "Implement rate limiter in src/rpc/server.ts".to_string(),
            read_scope: vec!["src/rpc/server.ts".to_string()],
            write_scope: vec!["src/rpc/server.ts".to_string()],
            shared_contracts: vec!["scope::src/rpc/server.ts".to_string()],
            verification_cmd: "bun test src/rpc/server.ts".to_string(),
            phase_hint: "executing".to_string(),
            wave: 0,
        };
        let combined_proof = verify_three_laws(&[s1.clone(), s2.clone()], &client);
        assert!(!combined_proof.write_independent);
        assert!(!combined_proof.semantic_independent);
        assert!(!combined_proof.verification_independent);

        let waves = schedule_waves(vec![s1, s2], &client);
        assert_eq!(waves.len(), 2);
        assert!(waves[0].1.all_laws_satisfied());
        assert!(waves[1].1.all_laws_satisfied());
    }
}
