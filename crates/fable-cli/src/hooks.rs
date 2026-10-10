use fable_core::*;
use regex::Regex;
use serde_json::{json, Map, Value};
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::LazyLock;

const MAX_LIST: usize = 12;
const MAX_EVENT_BYTES: u64 = 256 * 1024;
const RETAIN_EVENT_LINES: usize = 500;

const DELEGATION_TOOL_MARKERS: &[&str] = &[
    "agent",
    "subagent",
    "delegate",
    "delegation",
    "task",
    "workflow",
    "worker",
];

const MUTATING_TOOLS: &[&str] = &[
    "edit",
    "write",
    "multiedit",
    "notebookedit",
    "applypatch",
    "writefile",
    "writetofile",
    "replace",
    "replacefilecontent",
    "multireplacefilecontent",
    "createfile",
    "deletefile",
    "movefile",
    "renamefile",
];

const RECOVERY_CONTEXT: &str = concat!(
    "[get-fable] Repeated command failure moved durable state to fable-recover. ",
    "Change the diagnosis before another code edit. Attribution order: ",
    "(1) HARNESS: prove the command, test driver, fixture, expectation, permissions, and environment; ",
    "(2) EXECUTION PATH: prove the changed code is actually running, including branch, worktree, build output, generated files, cache, and runtime selection; ",
    "(3) PRODUCT LOGIC: debug implementation after the first two are supported by evidence; ",
    "(4) INVARIANT: state the general rule that would prevent this class of failure. ",
    "Record the revised hypothesis before retrying."
);

static EXIT_CODE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[Ee]xit code[: ]+([0-9]+)").unwrap());

fn first_nonempty_str<'a>(vals: &[Option<&'a Value>]) -> Option<String> {
    for val in vals.iter().flatten() {
        match val {
            Value::String(s) if !s.is_empty() => return Some(s.clone()),
            Value::Number(n) => return Some(n.to_string()),
            Value::Bool(b) => return Some(b.to_string()),
            _ => {}
        }
    }
    None
}

fn workspace_authority(data: &Map<String, Value>) -> (bool, Option<Value>) {
    for key in [
        "cwd",
        "workspace_root",
        "workspaceRoot",
        "project_root",
        "projectRoot",
    ] {
        if let Some(v) = data.get(key) {
            return (true, Some(v.clone()));
        }
    }

    for container_key in ["context", "workspace"] {
        if let Some(Value::Object(container)) = data.get(container_key) {
            for key in ["cwd", "root"] {
                if let Some(v) = container.get(key) {
                    return (true, Some(v.clone()));
                }
            }
        }
    }

    for key in ["workspacePaths", "workspace_paths"] {
        if let Some(v) = data.get(key) {
            if let Value::Array(arr) = v {
                for item in arr {
                    if let Value::String(s) = item {
                        if !s.trim().is_empty() {
                            return (true, Some(Value::String(s.trim().to_string())));
                        }
                    }
                }
            }
            return (true, None);
        }
    }

    for container_key in ["toolCall", "tool_call"] {
        if let Some(Value::Object(tc)) = data.get(container_key) {
            if let Some(Value::Object(args)) = tc.get("args") {
                for key in ["Cwd", "cwd"] {
                    if let Some(v) = args.get(key) {
                        return (true, Some(v.clone()));
                    }
                }
            }
        }
    }

    (false, None)
}

pub fn normalize_payload(
    raw: Value,
    event_override: Option<&str>,
    host_override: Option<&str>,
) -> Map<String, Value> {
    let mut data = match raw {
        Value::Object(m) => m,
        _ => Map::new(),
    };

    let tool = data
        .get("tool")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();
    let tool_call = data
        .get("toolCall")
        .or_else(|| data.get("tool_call"))
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let ev_override_val = event_override
        .filter(|s| !s.is_empty())
        .map(|s| Value::String(s.to_string()));
    let event = first_nonempty_str(&[
        ev_override_val.as_ref(),
        data.get("hook_event_name"),
        data.get("hookEventName"),
        data.get("event_name"),
        data.get("eventName"),
        data.get("event"),
    ]);

    let (cwd_present, cwd_val) = workspace_authority(&data);

    let tool_str_fallback = match data.get("tool") {
        Some(Value::String(s)) if !s.is_empty() => Some(Value::String(s.clone())),
        _ => None,
    };
    let tool_name = first_nonempty_str(&[
        data.get("tool_name"),
        data.get("toolName"),
        tool_call.get("name"),
        tool.get("name"),
        tool_str_fallback.as_ref(),
    ]);

    let tool_input = [
        data.get("tool_input"),
        data.get("toolInput"),
        data.get("arguments"),
        data.get("input"),
        tool_call.get("args"),
        tool.get("input"),
    ]
    .into_iter()
    .flatten()
    .find(|v| !v.is_null() && *v != &Value::String(String::new()))
    .cloned();

    let mut tool_response = [
        data.get("tool_response"),
        data.get("toolResponse"),
        data.get("response"),
        data.get("result"),
        data.get("output"),
        tool.get("response"),
    ]
    .into_iter()
    .flatten()
    .find(|v| !v.is_null() && *v != &Value::String(String::new()))
    .cloned();

    if tool_response.is_none() {
        if let Some(err_val) = data.get("error") {
            if !err_val.is_null() && err_val != &Value::String(String::new()) {
                tool_response = Some(json!({ "error": err_val }));
            }
        }
    }

    if let Some(ev) = event {
        data.insert("hook_event_name".to_string(), Value::String(ev));
    }
    if cwd_present {
        data.insert("cwd".to_string(), cwd_val.unwrap_or(Value::Null));
    }
    if let Some(tn) = tool_name {
        data.insert("tool_name".to_string(), Value::String(tn));
    }
    if let Some(ti) = tool_input {
        data.insert("tool_input".to_string(), ti);
    }
    if let Some(tr) = tool_response {
        data.insert("tool_response".to_string(), tr);
    }

    if let Some(sid) = first_nonempty_str(&[
        data.get("session_id"),
        data.get("sessionId"),
        data.get("thread_id"),
        data.get("threadId"),
        data.get("conversationId"),
        data.get("conversation_id"),
    ]) {
        data.insert("session_id".to_string(), Value::String(sid));
    }

    if let Some(tid) = first_nonempty_str(&[
        data.get("turn_id"),
        data.get("turnId"),
        data.get("stepIdx"),
        data.get("invocationNum"),
        data.get("executionNum"),
    ]) {
        data.insert("turn_id".to_string(), Value::String(tid));
    }

    let stop_active = data
        .get("stop_hook_active")
        .or_else(|| data.get("stopHookActive"))
        .and_then(|v| match v {
            Value::Bool(b) => Some(*b),
            Value::String(s) if !s.is_empty() => Some(true),
            Value::Number(n) => Some(n.as_i64().unwrap_or(0) != 0),
            _ => None,
        });
    if let Some(sa) = stop_active {
        data.insert("stop_hook_active".to_string(), Value::Bool(sa));
    }

    if let Some(model) = first_nonempty_str(&[
        data.get("model"),
        data.get("modelName"),
        data.get("model_name"),
    ]) {
        data.insert("model".to_string(), Value::String(model));
    }

    let host_ov = host_override
        .filter(|s| !s.is_empty())
        .map(|s| Value::String(s.to_string()));
    if let Some(h) = first_nonempty_str(&[
        host_ov.as_ref(),
        data.get("hook_host"),
        data.get("host"),
        data.get("provider"),
    ]) {
        data.insert("hook_host".to_string(), Value::String(h.to_lowercase()));
    }

    data
}

fn start_dir(data: &Map<String, Value>) -> Option<PathBuf> {
    if data.contains_key("cwd") {
        let cwd_str = data.get("cwd")?.as_str()?;
        if cwd_str.is_empty() {
            return None;
        }
        let p = PathBuf::from(cwd_str);
        return if p.is_dir() { Some(p) } else { None };
    }
    std::env::current_dir().ok()
}

fn target_dir_from_fable(fable_dir: &Path) -> Option<PathBuf> {
    fable_dir.parent().map(|p| p.to_path_buf())
}

fn select_profile_skill(state: Option<&FableState>, open_items: &[String]) -> String {
    if let Some(st) = state {
        if st.failure_streak >= 2 || st.phase == FablePhase::Recovering {
            return "fable-recover".to_string();
        }
        if let Some(ref cur) = st.current_skill {
            if cur.starts_with("fable-") {
                return cur.clone();
            }
        }
        match st.phase {
            FablePhase::Discovering => return "fable-discover".to_string(),
            FablePhase::Planned => return "fable-plan".to_string(),
            FablePhase::Executing => return "fable-execute".to_string(),
            FablePhase::Verifying => return "fable-verify".to_string(),
            FablePhase::Recovering => return "fable-recover".to_string(),
            _ => {}
        }
    }
    if !open_items.is_empty() {
        "fable-execute".to_string()
    } else {
        "get-fable".to_string()
    }
}

fn handle_profile(data: &Map<String, Value>) -> (i32, String, String) {
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    let Some(target_dir) = target_dir_from_fable(&fable_dir) else {
        return (0, String::new(), String::new());
    };

    let ledger_p = fable_dir.join("LEDGER.md");
    let (open_items, _has_any, paused) = parse_ledger(&ledger_p);
    let state = read_state(&target_dir).ok().flatten();

    let context = if paused {
        "[get-fable] Project workflow is PAUSED by .fable/LEDGER.md. Durable state is preserved, but lifecycle enforcement is suspended for this unrelated round until the PAUSED line is removed.".to_string()
    } else {
        let phase = state
            .as_ref()
            .map(|s| s.phase.to_string())
            .unwrap_or_else(|| "legacy".to_string());
        let streak = state.as_ref().map(|s| s.failure_streak).unwrap_or(0);
        let substantial = state.as_ref().map(|s| s.substantial).unwrap_or(false);
        let mutation_gen = state.as_ref().map(|s| s.mutation_generation).unwrap_or(0);
        let verified_gen = state.as_ref().map(|s| s.verified_generation).unwrap_or(-1);
        let selected = select_profile_skill(state.as_ref(), &open_items);

        let mut lines = vec![
            "[get-fable] Canonical coding lifecycle active.".to_string(),
            format!(
                "Runtime state: phase={}; failureStreak={}; substantial={}; selected={}; mutationGeneration={}; verifiedGeneration={}.",
                phase, streak, substantial, selected, mutation_gen, verified_gen
            ),
            "Routing priority: recover repeated failure; route explicit trust-boundary work; prove delivery claims; research current external facts; discover repository unknowns; plan broad work; use test-first behavior changes; execute bounded cards.".to_string(),
            "TOON protocol: format inter-agent messages, subagent contracts, and state payloads in ```toon ... ``` with explicit [N] counts.".to_string(),
            "Completion rule: a newer workspace mutation makes older verification stale; substantial work requires passing completion evidence for the current generation.".to_string(),
        ];

        if let Some(card) = state
            .as_ref()
            .and_then(|s| s.active_card.as_deref())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            lines.push(format!("Active card: {}", card));
        }

        match selected.as_str() {
            "fable-recover" => {
                lines.push("Recovery rule: change the diagnosis before more code. Check harness, then actual execution path, then product logic, then the violated invariant.".to_string());
            }
            "fable-verify" | "fable-review" | "fable-security" | "fable-release" => {
                lines.push("Proof rule: inspect the real current state, try to falsify the relevant claim, and record only evidence that proves that specific gate.".to_string());
            }
            "fable-discover" | "fable-research" => {
                lines.push("Evidence rule: resolve only facts that can change the next decision and distinguish observed facts from inference.".to_string());
            }
            "fable-plan" => {
                lines.push("Planning rule: create bounded cards with explicit acceptance conditions before implementation.".to_string());
            }
            "fable-execute" | "fable-tdd" | "fable-delegate" => {
                lines.push("Build rule: keep ownership and scope bounded, record workspace mutation generations, and verify after the final mutation.".to_string());
            }
            _ => {}
        }

        if !open_items.is_empty() {
            let shown = &open_items[..open_items.len().min(MAX_LIST)];
            let joined = shown
                .iter()
                .map(|i| format!("  {}", i))
                .collect::<Vec<_>>()
                .join("\n");
            lines.push(format!(
                "Open ledger cards ({}):\n{}",
                open_items.len(),
                joined
            ));
            if open_items.len() > shown.len() {
                lines.push(format!("  ... and {} more", open_items.len() - shown.len()));
            }
        }

        lines.join("\n")
    };

    let out = json!({
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": context,
        }
    });
    (0, format!("{}\n", out), String::new())
}

fn payload_len(value: &Value) -> usize {
    match value {
        Value::String(s) => s.chars().count(),
        Value::Object(m) => m.values().map(payload_len).sum(),
        Value::Array(a) => a.iter().map(payload_len).sum(),
        _ => 0,
    }
}

fn contains_fork(value: &Value) -> bool {
    match value {
        Value::String(s) => s.to_lowercase().contains("fork"),
        Value::Object(m) => {
            for (k, item) in m {
                let norm = k.replace('-', "_").to_lowercase();
                if matches!(
                    norm.as_str(),
                    "subagent_type" | "agenttype" | "agent_type" | "mode" | "type"
                ) && contains_fork(item)
                {
                    return true;
                }
                if matches!(item, Value::Object(_) | Value::Array(_)) && contains_fork(item) {
                    return true;
                }
            }
            false
        }
        Value::Array(a) => a.iter().any(contains_fork),
        _ => false,
    }
}

fn is_delegation_tool(data: &Map<String, Value>) -> bool {
    let name = data
        .get("tool_name")
        .or_else(|| data.get("toolName"))
        .or_else(|| data.get("tool"));
    let Some(Value::String(s)) = name else {
        return name.is_none();
    };
    let norm = s.replace('-', "_").to_lowercase();
    DELEGATION_TOOL_MARKERS.iter().any(|m| norm.contains(m))
}

fn handle_spawn(data: &Map<String, Value>) -> (i32, String, String) {
    if !is_delegation_tool(data) {
        return (0, String::new(), String::new());
    }
    let tool_input = data.get("tool_input").cloned().unwrap_or(json!({}));
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    let Some(target_dir) = target_dir_from_fable(&fable_dir) else {
        return (0, String::new(), String::new());
    };

    if contains_fork(&tool_input) {
        return (0, String::new(), String::new());
    }

    let threshold = std::env::var("FABLE_SPAWN_MIN_CHARS")
        .ok()
        .and_then(|v| v.parse::<usize>().ok())
        .unwrap_or(1500);

    if payload_len(&tool_input) < threshold {
        return (0, String::new(), String::new());
    }

    let ledger_p = fable_dir.join("LEDGER.md");
    let (open_items, _has_any, paused) = parse_ledger(&ledger_p);
    if paused || !open_items.is_empty() {
        return (0, String::new(), String::new());
    }

    let state = read_state(&target_dir).ok().flatten();
    let phase = state
        .as_ref()
        .map(|s| s.phase.to_string())
        .unwrap_or_else(|| "legacy".to_string());
    let selected = state
        .as_ref()
        .and_then(|s| s.current_skill.clone())
        .unwrap_or_else(|| "none".to_string());

    let err_msg = format!(
        "[get-fable] BLOCKED detailed delegation: the project is armed but the current round has no OPEN ledger card.\nDurable state: phase={}; selected={}.\nBefore broad fan-out, record the bounded card and its acceptance condition in .fable/LEDGER.md. If load-bearing facts are still unknown, use fable-discover first. If repeated failure is active, make the recovery hypothesis and repair card explicit before delegation. Small spawns below {} chars and forks are exempt.\n",
        phase, selected, threshold
    );
    (2, String::new(), err_msg)
}

fn command_failed(tool_response: Option<&Value>) -> bool {
    let Some(resp) = tool_response else {
        return false;
    };
    match resp {
        Value::String(s) => EXIT_CODE_RE
            .captures(s)
            .and_then(|c| c.get(1))
            .map(|m| m.as_str() != "0")
            .unwrap_or(false),
        Value::Object(m) => {
            for key in ["exitCode", "exit_code", "code", "returncode", "statusCode"] {
                if let Some(Value::Number(n)) = m.get(key) {
                    if let Some(code) = n.as_i64() {
                        return code != 0;
                    }
                }
            }
            for key in ["is_error", "isError"] {
                if m.get(key) == Some(&Value::Bool(true)) {
                    return true;
                }
            }
            if m.get("success") == Some(&Value::Bool(false))
                || m.get("ok") == Some(&Value::Bool(false))
            {
                return true;
            }
            if let Some(err) = m.get("error") {
                match err {
                    Value::Null | Value::Bool(false) => {}
                    Value::String(s) if s.is_empty() => {}
                    Value::Object(o) if o.is_empty() => {}
                    _ => return true,
                }
            }
            let combined = [
                "stdout",
                "stderr",
                "output",
                "error",
                "returnDisplay",
                "llmContent",
            ]
            .iter()
            .filter_map(|k| m.get(*k))
            .map(|v| match v {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            })
            .collect::<Vec<_>>()
            .join(" ");

            EXIT_CODE_RE
                .captures(&combined)
                .and_then(|c| c.get(1))
                .map(|m| m.as_str() != "0")
                .unwrap_or(false)
        }
        _ => false,
    }
}

fn sessions_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("fable-mode-sessions");
    let _ = fs::create_dir_all(&dir);
    dir
}

fn safe_sid(sid: &str) -> String {
    let cleaned: String = sid
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-') {
                c
            } else {
                '_'
            }
        })
        .take(120)
        .collect();
    cleaned
}

fn load_fail_streak(sid: Option<&str>) -> u32 {
    let Some(s) = sid.filter(|s| !s.is_empty()) else {
        return 0;
    };
    let p = sessions_dir().join(format!("{}.fails", safe_sid(s)));
    fs::read_to_string(p)
        .ok()
        .and_then(|t| t.trim().parse::<u32>().ok())
        .unwrap_or(0)
}

fn save_fail_streak(sid: Option<&str>, count: u32) {
    let Some(s) = sid.filter(|s| !s.is_empty()) else {
        return;
    };
    let p = sessions_dir().join(format!("{}.fails", safe_sid(s)));
    let _ = fs::write(p, count.to_string());
}

fn handle_failure(data: &Map<String, Value>) -> (i32, String, String) {
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    let Some(target_dir) = target_dir_from_fable(&fable_dir) else {
        return (0, String::new(), String::new());
    };

    let ledger_p = fable_dir.join("LEDGER.md");
    let (_open, _has_any, paused) = parse_ledger(&ledger_p);
    if paused {
        return (0, String::new(), String::new());
    }

    let event_name = data
        .get("hook_event_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let failed =
        event_name == "PostToolUseFailure" || command_failed(data.get("tool_response"));

    let state_exists = target_dir.join(".fable").join("state.json").is_file();
    let should_transact = if !state_exists {
        false
    } else if failed {
        true
    } else {
        let has_debt = has_pending_mutation_debt(&fable_dir, None) == Some(true);
        let cur_streak = read_state(&target_dir)
            .ok()
            .flatten()
            .map(|s| s.failure_streak)
            .unwrap_or(0);
        has_debt || cur_streak > 0
    };

    let durable = if should_transact {
        with_state_transaction(&target_dir, |st| {
            if failed {
                st.failure_streak += 1;
                if st.failure_streak >= 2 && st.phase != FablePhase::Complete {
                    st.phase = FablePhase::Recovering;
                    st.current_skill = Some("fable-recover".to_string());
                    st.substantial = true;
                }
            } else {
                st.failure_streak = 0;
            }
            Ok(())
        })
        .ok()
    } else {
        None
    };

    let sid = data.get("session_id").and_then(|v| v.as_str());
    if sid.is_some() {
        let prev = load_fail_streak(sid);
        if failed {
            save_fail_streak(sid, prev + 1);
        } else if prev > 0 {
            save_fail_streak(sid, 0);
        }
    }

    if !failed {
        return (0, String::new(), String::new());
    }

    let streak = durable
        .as_ref()
        .map(|s| s.failure_streak)
        .unwrap_or_else(|| load_fail_streak(sid));

    if streak >= 2 {
        let ev = if event_name.trim().is_empty() {
            "PostToolUseFailure"
        } else {
            event_name
        };
        let out = json!({
            "hookSpecificOutput": {
                "hookEventName": ev,
                "additionalContext": format!("{} failureStreak={}.", RECOVERY_CONTEXT, streak),
            }
        });
        return (0, format!("{}\n", out), String::new());
    }

    (0, String::new(), String::new())
}

fn is_mutating_tool(data: &Map<String, Value>) -> bool {
    let name = data
        .get("tool_name")
        .or_else(|| data.get("toolName"))
        .or_else(|| data.get("tool"));
    let Some(Value::String(s)) = name else {
        return false;
    };
    let norm: String = s
        .chars()
        .filter(|c| *c != '-' && *c != '_')
        .flat_map(|c| c.to_lowercase())
        .collect();
    MUTATING_TOOLS.contains(&norm.as_str())
}

fn handle_mutation(data: &Map<String, Value>) -> (i32, String, String) {
    if !is_mutating_tool(data) {
        return (0, String::new(), String::new());
    }
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    let Some(target_dir) = target_dir_from_fable(&fable_dir) else {
        return (0, String::new(), String::new());
    };

    if !fable_dir.join("state.json").is_file() {
        return (0, String::new(), String::new());
    }

    let res = with_state_transaction(&target_dir, |st| {
        record_mutation(st);
        Ok(())
    });

    if res.is_err() {
        persist_pending_mutation(&target_dir);
    }

    (0, String::new(), String::new())
}

fn block_state_if_needed(state: Option<&FableState>) -> (i32, String, String) {
    let Some(st) = state else {
        return (0, String::new(), String::new());
    };
    if !st.substantial {
        return (0, String::new(), String::new());
    }
    if !has_fresh_passing_evidence(st) {
        return (
            2,
            String::new(),
            "[get-fable] BLOCKED stop: substantial work has no fresh passing completion evidence for the current mutation generation. Record proof with `get-fable evidence pass <kind> <source> <detail>` after verifying the requested behavior.\n".to_string(),
        );
    }
    if st.phase != FablePhase::Complete {
        return (
            2,
            String::new(),
            format!(
                "[get-fable] BLOCKED stop: substantial work has current verification evidence but durable workflow phase is '{}', not 'complete'. Finish verification and transition with `get-fable state complete`.\n",
                st.phase
            ),
        );
    }
    (0, String::new(), String::new())
}

fn handle_close(data: &Map<String, Value>) -> (i32, String, String) {
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    let Some(target_dir) = target_dir_from_fable(&fable_dir) else {
        return (0, String::new(), String::new());
    };

    if !safe_fable_boundary(&fable_dir, &[]) {
        return (
            2,
            String::new(),
            "[get-fable] BLOCKED stop: unsafe .fable filesystem boundary; repair symlinks or special files before completion.\n".to_string(),
        );
    }

    let state_p = fable_dir.join("state.json");
    let invalid_state_msg = format!(
        "[get-fable] BLOCKED stop: {} is present but invalid for the current lifecycle schema. Run `get-fable doctor` and repair or migrate durable state before claiming completion.\n",
        state_p.display()
    );

    match has_pending_mutation_debt(&fable_dir, None) {
        None => return (2, String::new(), invalid_state_msg),
        Some(true) => {
            return (
                2,
                String::new(),
                "[get-fable] BLOCKED stop: workspace mutation debt is pending reconciliation. Run the next state transaction, then verify the resulting mutation generation.\n".to_string(),
            )
        }
        Some(false) => {}
    }

    if data.get("stop_hook_active") == Some(&Value::Bool(true)) {
        return (0, String::new(), String::new());
    }

    let state = if state_p.is_file() {
        match read_state(&target_dir) {
            Ok(Some(s)) => Some(s),
            _ => return (2, String::new(), invalid_state_msg),
        }
    } else {
        None
    };

    let ledger_p = fable_dir.join("LEDGER.md");
    if !ledger_p.is_file() {
        return block_state_if_needed(state.as_ref());
    }

    let (open_items, _has_any, paused) = parse_ledger(&ledger_p);
    if paused {
        return (0, String::new(), String::new());
    }
    if !open_items.is_empty() {
        let shown = &open_items[..open_items.len().min(MAX_LIST)];
        let mut lines = shown
            .iter()
            .map(|i| format!("    {}", i))
            .collect::<Vec<_>>()
            .join("\n");
        if open_items.len() > shown.len() {
            lines.push_str(&format!("\n    ... and {} more", open_items.len() - shown.len()));
        }
        return (
            2,
            String::new(),
            format!(
                "[get-fable] BLOCKED stop: {} open ledger card(s) in {}\n{}\nFinish and verify each card, defer it with a concrete reason, or pause the round for genuinely unrelated work.\n",
                open_items.len(),
                ledger_p.display(),
                lines
            ),
        );
    }

    let bad = closed_without_evidence(&ledger_p);
    if !bad.is_empty() {
        let shown = &bad[..bad.len().min(MAX_LIST)];
        let mut lines = shown
            .iter()
            .map(|i| format!("    {}", i))
            .collect::<Vec<_>>()
            .join("\n");
        if bad.len() > shown.len() {
            lines.push_str(&format!("\n    ... and {} more", bad.len() - shown.len()));
        }
        return (
            2,
            String::new(),
            format!(
                "[get-fable] BLOCKED stop: {} checked card(s) in {} have no substantive ledger evidence:\n{}\nAppend `-- evidence: <command/result or observation>` or uncheck the card and verify it.\n",
                bad.len(),
                ledger_p.display(),
                lines
            ),
        );
    }

    block_state_if_needed(state.as_ref())
}

fn classify_event_success(data: &Map<String, Value>) -> Option<bool> {
    let ev = data
        .get("hook_event_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if ev == "PostToolUseFailure" {
        return Some(false);
    }
    let resp = data.get("tool_response")?.as_object()?;
    for key in ["exitCode", "exit_code", "code", "returncode"] {
        if let Some(Value::Number(n)) = resp.get(key) {
            if let Some(code) = n.as_i64() {
                return Some(code == 0);
            }
        }
    }
    if resp.get("is_error") == Some(&Value::Bool(true))
        || resp.get("isError") == Some(&Value::Bool(true))
    {
        return Some(false);
    }
    None
}

fn handle_event(data: &Map<String, Value>) -> (i32, String, String) {
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    if !safe_fable_boundary(&fable_dir, &["events.jsonl", "events.jsonl.tmp"]) {
        return (0, String::new(), String::new());
    }

    let Some(event_name) = data
        .get("hook_event_name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
    else {
        return (0, String::new(), String::new());
    };

    let host_str: String = data
        .get("hook_host")
        .and_then(|v| v.as_str())
        .unwrap_or("generic")
        .chars()
        .take(40)
        .collect();

    let mut event_obj = Map::new();
    event_obj.insert(
        "timestamp".to_string(),
        Value::String(chrono::Utc::now().to_rfc3339()),
    );
    event_obj.insert("event".to_string(), Value::String(event_name.to_string()));
    event_obj.insert("host".to_string(), Value::String(host_str));

    for (src, dst, limit) in [
        ("session_id", "sessionId", 120usize),
        ("turn_id", "turnId", 120usize),
        ("tool_name", "toolName", 120usize),
        ("source", "source", 80usize),
        ("reason", "reason", 80usize),
        ("trigger", "trigger", 80usize),
        ("agent_type", "agentType", 80usize),
    ] {
        if let Some(val) = data
            .get(src)
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            let truncated: String = val.chars().take(limit).collect();
            event_obj.insert(dst.to_string(), Value::String(truncated));
        }
    }

    if let Some(succ) = classify_event_success(data) {
        event_obj.insert("success".to_string(), Value::Bool(succ));
    }

    let events_path = fable_dir.join("events.jsonl");
    if let Ok(meta) = fs::metadata(&events_path) {
        if meta.len() > MAX_EVENT_BYTES {
            if let Ok(content) = fs::read_to_string(&events_path) {
                let all_lines: Vec<&str> = content.lines().collect();
                let start_idx = all_lines.len().saturating_sub(RETAIN_EVENT_LINES);
                let retained = format!("{}\n", all_lines[start_idx..].join("\n"));
                let tmp_path = fable_dir.join("events.jsonl.tmp");
                if fs::write(&tmp_path, retained).is_ok() {
                    let _ = fs::rename(&tmp_path, &events_path);
                }
            }
        }
    }

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&events_path)
    {
        if let Ok(line) = serde_json::to_string(&Value::Object(event_obj)) {
            let _ = writeln!(file, "{}", line);
        }
    }

    (0, String::new(), String::new())
}

fn extract_prompt_text(data: &Map<String, Value>) -> String {
    for key in ["prompt", "user_prompt", "task", "input", "initial_prompt"] {
        if let Some(s) = data
            .get(key)
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            return s.to_string();
        }
    }
    if let Some(Value::Object(ctx)) = data.get("context") {
        for key in ["prompt", "userPrompt", "task", "intent"] {
            if let Some(s) = ctx
                .get(key)
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                return s.to_string();
            }
        }
    }
    String::new()
}

fn handle_architecture(data: &Map<String, Value>) -> (i32, String, String) {
    let event_name = data
        .get("hook_event_name")
        .or_else(|| data.get("event"))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    if !matches!(event_name, "SessionStart" | "PreInvocation" | "") {
        return (0, String::new(), String::new());
    }

    let prompt_text = extract_prompt_text(data);
    if prompt_text.is_empty() {
        return (0, String::new(), String::new());
    }

    if let Ok(eval_res) = evaluate_architecture(&prompt_text) {
        if eval_res.verdict == "microservices" {
            let context_msg = format!(
                "[fable-architecture] Microservices Architecture mandatory (scale={:.1}, domain={:.1}, resource={:.1}, composite={:.1}). Single-process monolith scaffolding is LOCKED OUT. Decompose into decoupled services using TOON manifest, North-South REST (OpenAPI 3.1) and East-West gRPC/Message Broker.",
                eval_res.vectors.scale_and_load,
                eval_res.vectors.domain_decoupling,
                eval_res.vectors.resource_intensity,
                eval_res.vectors.composite_score
            );
            let out = json!({
                "hookSpecificOutput": {
                    "hookEventName": "SessionStart",
                    "additionalContext": context_msg,
                }
            });
            return (0, format!("{}\n", out), String::new());
        }
    }

    (0, String::new(), String::new())
}

fn handle_learn(data: &Map<String, Value>) -> (i32, String, String) {
    let Some(sd) = start_dir(data) else {
        return (0, String::new(), String::new());
    };
    let Some(fable_dir) = find_fable_dir(&sd) else {
        return (0, String::new(), String::new());
    };
    let ledger_p = fable_dir.join("LEDGER.md");
    if !ledger_p.is_file() {
        return (0, String::new(), String::new());
    }

    let Ok(content) = fs::read_to_string(&ledger_p) else {
        return (0, String::new(), String::new());
    };

    let mut new_facts = Vec::new();
    for line in content.lines() {
        if line.contains("-- evidence:") && line.contains("- [x]") {
            if let Some(after_box) = line.split("- [x]").nth(1) {
                if let Some(card_title) = after_box.split("--").next() {
                    let claim = format!("Verified requirement: {}", card_title.trim());
                    if (20..=300).contains(&claim.len())
                        && !claim.contains("/Users/")
                        && !claim.contains("/var/folders/")
                    {
                        new_facts.push(claim);
                    }
                }
            }
        }
    }

    if new_facts.is_empty() {
        return (0, String::new(), String::new());
    }

    let session_id = data
        .get("session_id")
        .and_then(|v| v.as_str())
        .unwrap_or("auto");
    let learnings_file = fable_dir.join("learnings.json");
    let mut existing: Vec<Value> = fs::read_to_string(&learnings_file)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default();

    let now = chrono::Utc::now().to_rfc3339();
    for fact in new_facts {
        existing.push(json!({
            "fact": fact,
            "category": "lesson",
            "confidence": "L4",
            "timestamp": now,
            "session_id": session_id,
        }));
    }

    if let Ok(serialized) = serde_json::to_string_pretty(&existing) {
        let _ = fs::write(&learnings_file, serialized);
    }

    (0, String::new(), String::new())
}

fn antigravity_default_output(event_name: &str) -> Value {
    match event_name {
        "PreToolUse" | "Stop" => json!({ "decision": "allow" }),
        "PreInvocation" => json!({ "injectSteps": [] }),
        "PostInvocation" => json!({ "injectSteps": [], "terminationBehavior": "" }),
        _ => json!({}),
    }
}

fn adapt_antigravity_result(
    handler: &str,
    event_name: &str,
    returncode: i32,
    stdout: &str,
    stderr: &str,
) -> (i32, String, String) {
    let parsed: Value = serde_json::from_str(stdout).unwrap_or_else(|_| json!({}));
    let reason = stderr.trim();

    if matches!(handler, "profile" | "architecture")
        && matches!(event_name, "PreInvocation" | "SessionStart")
    {
        if let Some(ctx) = parsed
            .get("hookSpecificOutput")
            .and_then(|h| h.get("additionalContext"))
            .and_then(|c| c.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
        {
            return (
                0,
                json!({ "injectSteps": [{ "ephemeralMessage": ctx }] }).to_string(),
                stderr.to_string(),
            );
        }
        return (
            0,
            json!({ "injectSteps": [] }).to_string(),
            stderr.to_string(),
        );
    }

    if handler == "spawn" && event_name == "PreToolUse" {
        if returncode == 2 {
            let msg = if reason.is_empty() {
                "get-fable blocked unbounded delegation"
            } else {
                reason
            };
            return (
                0,
                json!({ "decision": "deny", "reason": msg }).to_string(),
                String::new(),
            );
        }
        return (
            0,
            json!({ "decision": "allow" }).to_string(),
            stderr.to_string(),
        );
    }

    if handler == "close" && event_name == "Stop" {
        if returncode == 2 {
            let msg = if reason.is_empty() {
                "get-fable requires current completion evidence"
            } else {
                reason
            };
            return (
                0,
                json!({ "decision": "continue", "reason": msg }).to_string(),
                String::new(),
            );
        }
        return (
            0,
            json!({ "decision": "allow" }).to_string(),
            stderr.to_string(),
        );
    }

    (
        0,
        antigravity_default_output(event_name).to_string(),
        stderr.to_string(),
    )
}

pub fn execute_hook(handler: &str, event: Option<&str>, host: Option<&str>) -> i32 {
    let mut raw_text = String::new();
    let _ = std::io::stdin().read_to_string(&mut raw_text);
    let raw_val: Value = if raw_text.trim().is_empty() {
        json!({})
    } else {
        serde_json::from_str(&raw_text).unwrap_or_else(|_| json!({}))
    };

    let payload = normalize_payload(raw_val, event, host);

    let (code, stdout, stderr) = match handler {
        "profile" => handle_profile(&payload),
        "spawn" => handle_spawn(&payload),
        "failure" => handle_failure(&payload),
        "mutation" => handle_mutation(&payload),
        "close" => handle_close(&payload),
        "event" => handle_event(&payload),
        "architecture" => handle_architecture(&payload),
        "learn" => handle_learn(&payload),
        _ => (0, String::new(), String::new()),
    };

    let host_name = payload
        .get("hook_host")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();
    let event_name = payload
        .get("hook_event_name")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let (final_code, final_stdout, final_stderr) = if host_name == "antigravity" {
        adapt_antigravity_result(handler, event_name, code, &stdout, &stderr)
    } else {
        (code, stdout, stderr)
    };

    if !final_stdout.is_empty() {
        let _ = std::io::stdout().write_all(final_stdout.as_bytes());
        let _ = std::io::stdout().flush();
    }
    if !final_stderr.is_empty() {
        let _ = std::io::stderr().write_all(final_stderr.as_bytes());
        let _ = std::io::stderr().flush();
    }

    final_code
}
