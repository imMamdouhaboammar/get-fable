use regex::Regex;
use std::sync::LazyLock;

static REDACT_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    vec![
        // Bearer tokens and general tokens
        Regex::new(r"(?i)(bearer\s+)[A-Za-z0-9_\-\.]{8,}").unwrap(),
        // Common API key patterns (OpenAI, Anthropic, GitHub, AWS)
        Regex::new(r"(?i)(sk-[A-Za-z0-9_\-]{20,})").unwrap(),
        Regex::new(r"(?i)(ghp_[A-Za-z0-9]{36,})").unwrap(),
        Regex::new(r"(?i)(AKIA[0-9A-Z]{16})").unwrap(),
        // Passwords and secrets in key-value pairs
        Regex::new(r#"(?i)(password|secret|token|api[_-]?key)["']?\s*[:=]\s*["']?[^"'\s,;]{4,}"#)
            .unwrap(),
    ]
});

pub fn redact_secrets(input: &str) -> String {
    let mut result = input.to_string();
    for regex in REDACT_PATTERNS.iter() {
        result = regex.replace_all(&result, "[REDACTED]").to_string();
    }
    result
}

pub fn normalize_user_paths(input: &str, home: Option<&str>) -> String {
    let Some(home_path) = home else { return input.to_string() };
    if home_path.is_empty() {
        return input.to_string();
    }
    input.replace(home_path, "~")
}
