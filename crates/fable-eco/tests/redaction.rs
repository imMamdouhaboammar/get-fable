use fable_eco::doctor::checks::check_state_root;
use fable_eco::doctor::report::DoctorReport;
use fable_eco::doctor::support_bundle::create_support_bundle;
use fable_eco::observe::redact::{normalize_user_paths, redact_secrets};
use std::path::Path;

#[test]
fn test_secret_redaction_and_path_normalization() {
    let raw = "Authorization: Bearer my_secret_token_123456\nsk-proj1234567890abcdefghijklmnop\npassword: super_secret_pass_123";
    let redacted = redact_secrets(raw);
    assert!(!redacted.contains("my_secret_token_123456"));
    assert!(!redacted.contains("sk-proj1234567890abcdefghijklmnop"));
    assert!(!redacted.contains("super_secret_pass_123"));
    assert!(redacted.contains("[REDACTED]"));

    let user_path = "/Users/alice/projects/fable/secret";
    let normalized = normalize_user_paths(user_path, Some("/Users/alice"));
    assert_eq!(normalized, "~/projects/fable/secret");
}

#[test]
fn test_support_bundle_generation() {
    let check = check_state_root(Path::new("/tmp/test-state"));
    let report = DoctorReport::new(vec![check]);
    let raw_inv = r#"{"path": "/Users/alice/.fable/eco", "key": "Bearer my_secret_token_123"}"#;

    let bundle = create_support_bundle("macos/aarch64", Some("/Users/alice"), report, Some(raw_inv));
    assert_eq!(bundle.schema_version, 1);
    assert_eq!(bundle.fable_version, "1.9.0");
    assert_eq!(bundle.platform, "macos/aarch64");

    let inv = bundle.inventory_summary.expect("inventory present");
    assert!(inv.contains("~/.fable/eco"));
    assert!(!inv.contains("my_secret_token_123"));
}
