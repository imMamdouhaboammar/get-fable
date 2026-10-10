use fable_core::FableState;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::sync::LazyLock;

static TOON_FENCE_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?s)```(?:toon|TOON)\r?\n(.*?)```").unwrap());

static TABULAR_HEADER_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([A-Za-z0-9_.-]+)\[(\d+)\]\{([^}]*)\}:\s*$").unwrap()
});

static ARRAY_HEADER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^([A-Za-z0-9_.-]+)\[(\d+)\]:\s*(.*)$").unwrap());

static INLINE_OBJECT_HEADER_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([A-Za-z0-9_.-]+):\s*\{([^}]*)\}\s*$").unwrap()
});

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToonValidationResult {
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToonTokenComparison {
    pub json_chars: usize,
    pub toon_chars: usize,
    pub estimated_json_tokens: usize,
    pub estimated_toon_tokens: usize,
    pub savings_percent: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToonDelegationContract {
    pub worker_id: String,
    pub target_card: String,
    pub objective: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_sec: Option<u64>,
    pub owned_paths: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub forbidden_paths: Option<Vec<String>>,
    pub acceptance_checks: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rules: Option<Vec<String>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToonMutationItem {
    pub path: String,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub byte_size: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToonVerificationItem {
    pub command: String,
    pub result: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToonReturnPacket {
    pub worker_id: String,
    pub target_card: String,
    pub status: String,
    pub all_checks_passed: bool,
    pub mutations: Vec<ToonMutationItem>,
    pub verifications: Vec<ToonVerificationItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub findings: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<Vec<String>>,
}

#[derive(Copy, Clone, PartialEq, Eq)]
enum CharRunKind {
    None,
    Alnum,
    Whitespace,
    Symbol,
}

/// Zero-allocation single-pass UTF-8 token estimator matching `src/core/toon.ts`.
/// Scans character category transitions without allocating a Vec of matched substrings.
pub fn estimate_tokens(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    let mut runs: usize = 0;
    let mut current = CharRunKind::None;
    for ch in text.chars() {
        let kind = if ch.is_alphanumeric() {
            CharRunKind::Alnum
        } else if ch.is_whitespace() {
            CharRunKind::Whitespace
        } else {
            CharRunKind::Symbol
        };
        if kind != current {
            runs += 1;
            current = kind;
        }
    }
    if runs > 0 {
        ((runs as f64) * 0.85).ceil() as usize
    } else {
        (text.len() + 3) / 4
    }
}

fn format_scalar(v: &Value, delimiter: char) -> String {
    match v {
        Value::Null => "null".to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => {
            if s.is_empty()
                || s.contains(delimiter)
                || s.contains('\n')
                || s.contains('\r')
                || s.contains(':')
                || s.starts_with(' ')
                || s.ends_with(' ')
                || s == "true"
                || s == "false"
                || s == "null"
                || s.parse::<f64>().is_ok()
            {
                serde_json::to_string(s).unwrap_or_else(|_| format!("\"{}\"", s))
            } else {
                s.clone()
            }
        }
        _ => serde_json::to_string(v).unwrap_or_default(),
    }
}

fn parse_scalar(raw: &str) -> Value {
    let trimmed = raw.trim();
    if trimmed == "null" {
        return Value::Null;
    }
    if trimmed == "true" {
        return Value::Bool(true);
    }
    if trimmed == "false" {
        return Value::Bool(false);
    }
    if (trimmed.starts_with('"') && trimmed.ends_with('"'))
        || (trimmed.starts_with('[') && trimmed.ends_with(']'))
        || (trimmed.starts_with('{') && trimmed.ends_with('}'))
    {
        if let Ok(val) = serde_json::from_str::<Value>(trimmed) {
            return val;
        }
    }
    if let Ok(int_val) = trimmed.parse::<i64>() {
        return Value::Number(int_val.into());
    }
    if let Ok(float_val) = trimmed.parse::<f64>() {
        if let Some(num) = serde_json::Number::from_f64(float_val) {
            return Value::Number(num);
        }
    }
    Value::String(trimmed.to_string())
}

fn split_delimited_row(line: &str, delimiter: char) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut escape = false;

    for ch in line.chars() {
        if escape {
            current.push(ch);
            escape = false;
            continue;
        }
        if ch == '\\' && in_quotes {
            current.push(ch);
            escape = true;
            continue;
        }
        if ch == '"' {
            in_quotes = !in_quotes;
            current.push(ch);
            continue;
        }
        if ch == delimiter && !in_quotes {
            fields.push(current.trim().to_string());
            current.clear();
        } else {
            current.push(ch);
        }
    }
    fields.push(current.trim().to_string());
    fields
}

fn is_uniform_object_array(arr: &[Value]) -> Option<Vec<String>> {
    if arr.is_empty() {
        return None;
    }
    let first_obj = arr[0].as_object()?;
    if first_obj.is_empty() {
        return None;
    }
    let keys: Vec<String> = first_obj.keys().cloned().collect();
    for item in arr {
        let obj = item.as_object()?;
        if obj.len() != keys.len() {
            return None;
        }
        for k in &keys {
            let v = obj.get(k)?;
            if v.is_object() || v.is_array() {
                return None;
            }
        }
    }
    Some(keys)
}

fn encode_value_lines(value: &Value, indent: usize, delimiter: char, out: &mut Vec<String>) {
    let pad = " ".repeat(indent);
    match value {
        Value::Object(map) => {
            for (k, v) in map {
                match v {
                    Value::Object(nested) => {
                        out.push(format!("{}{}:", pad, k));
                        encode_value_lines(
                            &Value::Object(nested.clone()),
                            indent + 2,
                            delimiter,
                            out,
                        );
                    }
                    Value::Array(arr) => {
                        if let Some(cols) = is_uniform_object_array(arr) {
                            let header_cols = cols.join(&delimiter.to_string());
                            out.push(format!("{}{}[{}]{{{}}}:", pad, k, arr.len(), header_cols));
                            let row_pad = " ".repeat(indent + 2);
                            for item in arr {
                                if let Some(obj) = item.as_object() {
                                    let row: Vec<String> = cols
                                        .iter()
                                        .map(|c| {
                                            format_scalar(
                                                obj.get(c).unwrap_or(&Value::Null),
                                                delimiter,
                                            )
                                        })
                                        .collect();
                                    out.push(format!(
                                        "{}{}",
                                        row_pad,
                                        row.join(&delimiter.to_string())
                                    ));
                                }
                            }
                        } else if arr.iter().all(|x| !x.is_object() && !x.is_array()) {
                            let joined: Vec<String> =
                                arr.iter().map(|x| format_scalar(x, delimiter)).collect();
                            if joined.is_empty() {
                                out.push(format!("{}{}[0]:", pad, k));
                            } else {
                                out.push(format!(
                                    "{}{}[{}]: {}",
                                    pad,
                                    k,
                                    arr.len(),
                                    joined.join(&delimiter.to_string())
                                ));
                            }
                        } else {
                            out.push(format!(
                                "{}{}: {}",
                                pad,
                                k,
                                serde_json::to_string(arr).unwrap_or_else(|_| "[]".to_string())
                            ));
                        }
                    }
                    _ => {
                        out.push(format!("{}{}: {}", pad, k, format_scalar(v, delimiter)));
                    }
                }
            }
        }
        _ => {
            out.push(format!("{}{}", pad, format_scalar(value, delimiter)));
        }
    }
}

/// Encode a JSON Value into canonical TOON representation.
pub fn encode_toon(value: &Value) -> String {
    let mut lines = Vec::new();
    encode_value_lines(value, 0, ',', &mut lines);
    lines.join("\n")
}

/// Decode a TOON string into a `serde_json::Value` with optional strict `[N]` and `{fields}` verification.
pub fn decode_toon(toon: &str, strict: bool) -> Result<Value, String> {
    let raw_lines: Vec<&str> = toon
        .lines()
        .filter(|l| !l.trim().is_empty())
        .collect();
    if raw_lines.is_empty() {
        return Err("TOON input must not be empty".to_string());
    }

    let (val, next_idx) = parse_block(&raw_lines, 0, 0, strict)?;
    if strict && next_idx < raw_lines.len() {
        return Err(format!(
            "Unexpected trailing lines at line {}",
            next_idx + 1
        ));
    }
    Ok(val)
}

fn line_indent(line: &str) -> usize {
    line.chars().take_while(|c| *c == ' ').count()
}

fn parse_block(
    lines: &[&str],
    mut idx: usize,
    base_indent: usize,
    strict: bool,
) -> Result<(Value, usize), String> {
    let mut map = Map::new();

    while idx < lines.len() {
        let line = lines[idx];
        let indent = line_indent(line);
        if indent < base_indent {
            break;
        }
        if indent > base_indent && map.is_empty() {
            return Err(format!("Unexpected indentation on line {}", idx + 1));
        }
        if indent > base_indent {
            break;
        }

        let trimmed = line.trim();

        // 1. Tabular array: key[N]{col1,col2}:
        if let Some(caps) = TABULAR_HEADER_RE.captures(trimmed) {
            let key = caps.get(1).unwrap().as_str().to_string();
            let expected_len: usize = caps
                .get(2)
                .unwrap()
                .as_str()
                .parse()
                .map_err(|_| "Invalid tabular array length".to_string())?;
            let cols: Vec<String> = caps
                .get(3)
                .unwrap()
                .as_str()
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();

            idx += 1;
            let mut rows = Vec::with_capacity(expected_len);
            while idx < lines.len() {
                let row_line = lines[idx];
                let row_indent = line_indent(row_line);
                if row_indent <= base_indent {
                    break;
                }
                let cells = split_delimited_row(row_line.trim(), ',');
                if strict && cells.len() != cols.len() {
                    return Err(format!(
                        "TOON tabular column count mismatch for '{}': expected {} columns ({:?}), got {}",
                        key,
                        cols.len(),
                        cols,
                        cells.len()
                    ));
                }
                let mut row_obj = Map::new();
                for (col_idx, col_name) in cols.iter().enumerate() {
                    let cell_val = cells
                        .get(col_idx)
                        .map(|c| parse_scalar(c))
                        .unwrap_or(Value::Null);
                    row_obj.insert(col_name.clone(), cell_val);
                }
                rows.push(Value::Object(row_obj));
                idx += 1;
            }

            if strict && rows.len() != expected_len {
                return Err(format!(
                    "TOON tabular length mismatch for '{}': declared [{}], got {} rows",
                    key,
                    expected_len,
                    rows.len()
                ));
            }
            map.insert(key, Value::Array(rows));
            continue;
        }

        // 2. Inline or multiline scalar array: key[N]: a,b,c
        if let Some(caps) = ARRAY_HEADER_RE.captures(trimmed) {
            let key = caps.get(1).unwrap().as_str().to_string();
            let expected_len: usize = caps
                .get(2)
                .unwrap()
                .as_str()
                .parse()
                .map_err(|_| "Invalid array length".to_string())?;
            let rest = caps.get(3).unwrap().as_str().trim();
            idx += 1;

            let items: Vec<Value> = if rest.is_empty() {
                let mut multiline_items = Vec::new();
                while idx < lines.len() && line_indent(lines[idx]) > base_indent {
                    let item_line = lines[idx].trim();
                    let stripped = item_line.strip_prefix("- ").unwrap_or(item_line);
                    multiline_items.push(parse_scalar(stripped));
                    idx += 1;
                }
                multiline_items
            } else {
                split_delimited_row(rest, ',')
                    .into_iter()
                    .map(|s| parse_scalar(&s))
                    .collect()
            };

            if strict && items.len() != expected_len {
                return Err(format!(
                    "TOON array length mismatch for '{}': declared [{}], got {}",
                    key,
                    expected_len,
                    items.len()
                ));
            }
            map.insert(key, Value::Array(items));
            continue;
        }

        // 3. Single-row object with columns: key: {col1, col2}
        if let Some(caps) = INLINE_OBJECT_HEADER_RE.captures(trimmed) {
            let key = caps.get(1).unwrap().as_str().to_string();
            let cols: Vec<String> = caps
                .get(2)
                .unwrap()
                .as_str()
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            idx += 1;
            let mut obj_rows = Vec::new();
            while idx < lines.len() && line_indent(lines[idx]) > base_indent {
                let cells = split_delimited_row(lines[idx].trim(), ',');
                if strict && cells.len() != cols.len() {
                    return Err(format!(
                        "TOON object column mismatch for '{}': expected {}, got {}",
                        key,
                        cols.len(),
                        cells.len()
                    ));
                }
                let mut row_obj = Map::new();
                for (i, col_name) in cols.iter().enumerate() {
                    row_obj.insert(
                        col_name.clone(),
                        cells.get(i).map(|c| parse_scalar(c)).unwrap_or(Value::Null),
                    );
                }
                obj_rows.push(Value::Object(row_obj));
                idx += 1;
            }
            if obj_rows.len() == 1 {
                map.insert(key, obj_rows.into_iter().next().unwrap());
            } else {
                map.insert(key, Value::Array(obj_rows));
            }
            continue;
        }

        // 4. Standard key: value or nested object key:
        if let Some(colon_pos) = trimmed.find(':') {
            let key = trimmed[..colon_pos].trim().to_string();
            let rest = trimmed[colon_pos + 1..].trim();
            idx += 1;
            if rest.is_empty() {
                if idx < lines.len() && line_indent(lines[idx]) > base_indent {
                    let child_indent = line_indent(lines[idx]);
                    let (nested_val, next_idx) = parse_block(lines, idx, child_indent, strict)?;
                    map.insert(key, nested_val);
                    idx = next_idx;
                } else {
                    map.insert(key, Value::Object(Map::new()));
                }
            } else {
                map.insert(key, parse_scalar(rest));
            }
            continue;
        }

        return Err(format!("Invalid TOON syntax on line {}: {}", idx + 1, trimmed));
    }

    Ok((Value::Object(map), idx))
}

pub fn validate_toon(toon: &str) -> ToonValidationResult {
    match decode_toon(toon, true) {
        Ok(data) => ToonValidationResult {
            valid: true,
            error: None,
            data: Some(data),
        },
        Err(err) => ToonValidationResult {
            valid: false,
            error: Some(err),
            data: None,
        },
    }
}

pub fn compare_tokens(data: &Value) -> ToonTokenComparison {
    let json_str = serde_json::to_string_pretty(data).unwrap_or_default();
    let toon_str = encode_toon(data);
    let json_chars = json_str.len();
    let toon_chars = toon_str.len();
    let estimated_json_tokens = estimate_tokens(&json_str);
    let estimated_toon_tokens = estimate_tokens(&toon_str);
    let savings_tokens = estimated_json_tokens.saturating_sub(estimated_toon_tokens);
    let savings_percent = if estimated_json_tokens > 0 {
        ((savings_tokens as f64 / estimated_json_tokens as f64) * 1000.0).round() / 10.0
    } else {
        0.0
    };

    ToonTokenComparison {
        json_chars,
        toon_chars,
        estimated_json_tokens,
        estimated_toon_tokens,
        savings_percent,
    }
}

pub fn extract_toon_fences(markdown: &str) -> Vec<String> {
    TOON_FENCE_RE
        .captures_iter(markdown)
        .filter_map(|cap| cap.get(1).map(|m| m.as_str().trim().to_string()))
        .collect()
}

pub fn compact_fable_state_toon(state: Option<&FableState>) -> String {
    let Some(st) = state else {
        return "state: none".to_string();
    };

    let mut root = Map::new();
    root.insert("workspaceId".to_string(), Value::String(st.workspace_id.clone()));
    root.insert("phase".to_string(), Value::String(st.phase.to_string()));
    root.insert(
        "skill".to_string(),
        Value::String(st.current_skill.clone().unwrap_or_else(|| "none".to_string())),
    );
    root.insert("streak".to_string(), Value::Number(st.failure_streak.into()));
    root.insert("substantial".to_string(), Value::Bool(st.substantial));
    root.insert(
        "mutGen".to_string(),
        Value::Number(st.mutation_generation.into()),
    );
    root.insert(
        "verGen".to_string(),
        Value::Number(st.verified_generation.into()),
    );

    if let Some(ref card) = st.active_card {
        root.insert("activeCard".to_string(), Value::String(card.clone()));
    }

    if let Some(ref dec) = st.last_decision {
        let mut d = Map::new();
        d.insert("skill".to_string(), Value::String(dec.selected_skill.clone()));
        d.insert("pack".to_string(), Value::String(dec.selected_pack.clone()));
        d.insert(
            "task".to_string(),
            serde_json::to_value(&dec.task_shape).unwrap_or(Value::String("unknown".to_string())),
        );
        if let Some(n) = serde_json::Number::from_f64(dec.confidence) {
            d.insert("conf".to_string(), Value::Number(n));
        }
        d.insert(
            "gates".to_string(),
            Value::Array(
                dec.required_gates
                    .iter()
                    .map(|g| Value::String(g.clone()))
                    .collect(),
            ),
        );
        root.insert("decision".to_string(), Value::Object(d));
    }

    if !st.evidence.is_empty() {
        let ev_list: Vec<Value> = st
            .evidence
            .iter()
            .map(|ev| {
                let mut m = Map::new();
                m.insert("kind".to_string(), Value::String(ev.kind.to_string()));
                m.insert("source".to_string(), Value::String(ev.source.clone()));
                m.insert("result".to_string(), Value::String(ev.result.to_string()));
                m.insert("gen".to_string(), Value::Number(ev.generation.into()));
                m.insert("detail".to_string(), Value::String(ev.detail.clone()));
                Value::Object(m)
            })
            .collect();
        root.insert("evidence".to_string(), Value::Array(ev_list));
    }

    encode_toon(&Value::Object(root))
}

pub fn encode_delegation_contract(contract: &ToonDelegationContract) -> String {
    let mut contract_block = Map::new();
    contract_block.insert(
        "workerId".to_string(),
        Value::String(contract.worker_id.clone()),
    );
    contract_block.insert(
        "targetCard".to_string(),
        Value::String(contract.target_card.clone()),
    );
    contract_block.insert(
        "objective".to_string(),
        Value::String(contract.objective.clone()),
    );
    if let Some(t) = contract.timeout_sec {
        contract_block.insert("timeoutSec".to_string(), Value::Number(t.into()));
    }

    let mut root = Map::new();
    root.insert("contract".to_string(), Value::Object(contract_block));
    root.insert(
        "ownedPaths".to_string(),
        Value::Array(
            contract
                .owned_paths
                .iter()
                .map(|p| Value::String(p.clone()))
                .collect(),
        ),
    );
    root.insert(
        "acceptanceChecks".to_string(),
        Value::Array(
            contract
                .acceptance_checks
                .iter()
                .map(|c| Value::String(c.clone()))
                .collect(),
        ),
    );
    if let Some(ref forbidden) = contract.forbidden_paths {
        if !forbidden.is_empty() {
            root.insert(
                "forbiddenPaths".to_string(),
                Value::Array(forbidden.iter().map(|p| Value::String(p.clone())).collect()),
            );
        }
    }
    if let Some(ref rules) = contract.rules {
        if !rules.is_empty() {
            root.insert(
                "rules".to_string(),
                Value::Array(rules.iter().map(|r| Value::String(r.clone())).collect()),
            );
        }
    }

    encode_toon(&Value::Object(root))
}

pub fn decode_delegation_contract(text: &str) -> Result<ToonDelegationContract, String> {
    let fences = extract_toon_fences(text);
    let raw = fences.first().map(|s| s.as_str()).unwrap_or_else(|| text.trim());
    let val = decode_toon(raw, true)?;
    let obj = val
        .as_object()
        .ok_or_else(|| "Invalid delegation contract: root must be an object".to_string())?;
    let contract_info = obj
        .get("contract")
        .and_then(|v| v.as_object())
        .ok_or_else(|| "Invalid delegation contract: missing \"contract\" block".to_string())?;

    let to_string_vec = |v: Option<&Value>| -> Vec<String> {
        v.and_then(|a| a.as_array())
            .map(|arr| {
                arr.iter()
                    .map(|item| match item {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    })
                    .collect()
            })
            .unwrap_or_default()
    };

    let forbidden = to_string_vec(obj.get("forbiddenPaths"));
    let rules = to_string_vec(obj.get("rules"));

    Ok(ToonDelegationContract {
        worker_id: contract_info
            .get("workerId")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        target_card: contract_info
            .get("targetCard")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        objective: contract_info
            .get("objective")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string(),
        timeout_sec: contract_info.get("timeoutSec").and_then(|v| v.as_u64()),
        owned_paths: to_string_vec(obj.get("ownedPaths")),
        forbidden_paths: if forbidden.is_empty() {
            None
        } else {
            Some(forbidden)
        },
        acceptance_checks: to_string_vec(obj.get("acceptanceChecks")),
        rules: if rules.is_empty() { None } else { Some(rules) },
    })
}

// ============================================================================
// Reflex Context Compaction Kernel (Parity with src/core/reflex/compaction/)
// ============================================================================

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolUse {
    pub tool_use_id: String,
    pub tool: String,
    pub input: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "isError")]
    pub is_error: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_use_id: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none", rename = "isError")]
    pub is_error: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub text: String,
    #[serde(rename = "toolUses", default)]
    pub tool_uses: Vec<ToolUse>,
    #[serde(
        rename = "toolResults",
        skip_serializing_if = "Option::is_none",
        default
    )]
    pub tool_results: Option<Vec<ToolResult>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "tool_use_id")]
    pub tool_use_id: String,
    pub tool: String,
    pub result_chars: usize,
    pub pinned: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallAnswer {
    pub keep_call: f64,
    pub keep_result: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallDecision {
    pub id: String,
    pub tool: String,
    pub keep_call: f64,
    pub keep_result: f64,
    pub action: String, // "keep" | "drop_result" | "drop_call"
    pub reason: String, // "pinned" | "kept" | "result_dropped" | "call_dropped"
}

pub fn decide_call(call: &ToolCall, answer: &CallAnswer, keep_threshold: f64) -> CallDecision {
    if call.pinned {
        return CallDecision {
            id: call.id.clone(),
            tool: call.tool.clone(),
            keep_call: answer.keep_call,
            keep_result: answer.keep_result,
            action: "keep".to_string(),
            reason: "pinned".to_string(),
        };
    }
    if answer.keep_result >= keep_threshold {
        return CallDecision {
            id: call.id.clone(),
            tool: call.tool.clone(),
            keep_call: answer.keep_call,
            keep_result: answer.keep_result,
            action: "keep".to_string(),
            reason: "kept".to_string(),
        };
    }
    if answer.keep_call >= keep_threshold {
        return CallDecision {
            id: call.id.clone(),
            tool: call.tool.clone(),
            keep_call: answer.keep_call,
            keep_result: answer.keep_result,
            action: "drop_result".to_string(),
            reason: "result_dropped".to_string(),
        };
    }
    CallDecision {
        id: call.id.clone(),
        tool: call.tool.clone(),
        keep_call: answer.keep_call,
        keep_result: answer.keep_result,
        action: "drop_call".to_string(),
        reason: "call_dropped".to_string(),
    }
}

fn truncated_result_text(text: &str, is_error: bool, head_chars: usize) -> String {
    let char_count = text.chars().count();
    if char_count <= head_chars + 120 {
        return text.to_string();
    }
    let head_str: String = text.chars().take(head_chars).collect();
    let head = if head_chars > 0 {
        format!("{}\n", head_str)
    } else {
        String::new()
    };
    let err_tag = if is_error { " (error)" } else { "" };
    format!(
        "{}[fast-jev-compaction truncated {} chars of this tool result{}; re-run the tool if needed]",
        head,
        char_count - head_chars,
        err_tag
    )
}

pub fn apply_decisions(
    messages: &[Message],
    decisions: &[CallDecision],
    calls: &[ToolCall],
    head_chars: usize,
) -> Vec<Message> {
    let by_id: HashMap<&str, &ToolCall> = calls.iter().map(|c| (c.id.as_str(), c)).collect();
    let mut actions: HashMap<&str, &str> = HashMap::new();
    for d in decisions {
        if let Some(call) = by_id.get(d.id.as_str()) {
            if d.action != "keep" {
                actions.insert(call.tool_use_id.as_str(), d.action.as_str());
            }
        }
    }

    let mut kept = Vec::with_capacity(messages.len());
    for message in messages {
        let touched = message
            .tool_uses
            .iter()
            .any(|t| actions.contains_key(t.tool_use_id.as_str()))
            || message
                .tool_results
                .as_ref()
                .map(|res| {
                    res.iter()
                        .any(|r| actions.contains_key(r.tool_use_id.as_str()))
                })
                .unwrap_or(false);

        if !touched {
            kept.push(message.clone());
            continue;
        }

        let tool_uses: Vec<ToolUse> = message
            .tool_uses
            .iter()
            .filter(|t| actions.get(t.tool_use_id.as_str()) != Some(&"drop_call"))
            .map(|t| {
                if actions.get(t.tool_use_id.as_str()) != Some(&"drop_result") {
                    return t.clone();
                }
                let raw = t.text.as_deref().unwrap_or("");
                let truncated = truncated_result_text(raw, t.is_error.unwrap_or(false), head_chars);
                ToolUse {
                    tool_use_id: t.tool_use_id.clone(),
                    tool: t.tool.clone(),
                    input: t.input.clone(),
                    text: Some(truncated),
                    is_error: t.is_error,
                }
            })
            .collect();

        let tool_results: Vec<ToolResult> = message
            .tool_results
            .as_ref()
            .map(|list| {
                list.iter()
                    .filter(|r| actions.get(r.tool_use_id.as_str()) != Some(&"drop_call"))
                    .map(|r| {
                        if actions.get(r.tool_use_id.as_str()) != Some(&"drop_result") {
                            return r.clone();
                        }
                        let truncated = truncated_result_text(
                            &r.text,
                            r.is_error.unwrap_or(false),
                            head_chars,
                        );
                        ToolResult {
                            tool_use_id: r.tool_use_id.clone(),
                            text: truncated,
                            is_error: r.is_error,
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        if message.text.trim().is_empty() && tool_uses.is_empty() && tool_results.is_empty() {
            continue;
        }

        kept.push(Message {
            role: message.role.clone(),
            text: message.text.clone(),
            tool_uses,
            tool_results: if tool_results.is_empty() {
                None
            } else {
                Some(tool_results)
            },
        });
    }
    kept
}

pub fn message_chars(message: &Message) -> usize {
    let mut total = message.text.len();
    for tool in &message.tool_uses {
        total += serde_json::to_string(&tool.input)
            .map(|s| s.len())
            .unwrap_or(20);
    }
    if let Some(ref results) = message.tool_results {
        for r in results {
            total += r.text.len();
        }
    }
    total
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_zero_alloc_token_estimation() {
        let sample = "{\"workspaceId\": \"abc123\", \"phase\": \"executing\", \"mutationGeneration\": 4}";
        let tokens = estimate_tokens(sample);
        assert!(tokens > 10 && tokens < 40);
        assert_eq!(estimate_tokens(""), 0);
    }

    #[test]
    fn test_toon_encode_decode_roundtrip_and_strict_validation() {
        let payload = json!({
            "workspaceId": "4d0a9132c2e476001278e544",
            "phase": "executing",
            "streak": 0,
            "substantial": true,
            "evidence": [
                {"kind": "test", "source": "bun test", "result": "pass", "gen": 1, "detail": "all tests green"},
                {"kind": "build", "source": "bun run build", "result": "pass", "gen": 1, "detail": "dist built"}
            ]
        });

        let encoded = encode_toon(&payload);
        assert!(encoded.contains("evidence[2]{"));
        let validation = validate_toon(&encoded);
        assert!(validation.valid, "Validation failed: {:?}", validation.error);

        let comparison = compare_tokens(&payload);
        assert!(comparison.toon_chars < comparison.json_chars);
        assert!(comparison.savings_percent > 0.0);
    }

    #[test]
    fn test_strict_toon_rejects_row_count_mismatch() {
        let bad_toon = "items[2]{id,name}:\n  1,alpha";
        let res = validate_toon(bad_toon);
        assert!(!res.valid);
        assert!(res.error.unwrap().contains("declared [2], got 1 rows"));
    }

    #[test]
    fn test_delegation_contract_roundtrip() {
        let contract = ToonDelegationContract {
            worker_id: "worker-rust-1".to_string(),
            target_card: "card-01".to_string(),
            objective: "Implement Rust TOON codec".to_string(),
            timeout_sec: Some(120),
            owned_paths: vec!["crates/fable-toon/src/lib.rs".to_string()],
            forbidden_paths: Some(vec!["src/core/state.ts".to_string()]),
            acceptance_checks: vec!["cargo test -p fable-toon".to_string()],
            rules: Some(vec!["zero silent context truncation".to_string()]),
        };

        let toon = encode_delegation_contract(&contract);
        let decoded = decode_delegation_contract(&toon).unwrap();
        assert_eq!(decoded, contract);
    }
}
