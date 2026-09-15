use fable_eco::host::patch::{
    apply_json_insert, apply_json_remove, apply_managed_block, apply_remove_block, compute_digest,
};
use tempfile::tempdir;

#[test]
fn test_json_patch_insert_remove_and_preconditions() {
    let dir = tempdir().expect("tempdir");
    let json_file = dir.path().join("settings.json");

    let d0 = compute_digest(b"");
    let d1 = apply_json_insert(
        &json_file,
        "mcpServers",
        &serde_json::json!({ "rtk": { "command": "rtk" } }),
        Some(&d0),
    )
    .expect("insert json key");

    // Idempotent or updated insert
    let d2 = apply_json_insert(
        &json_file,
        "theme",
        &serde_json::json!("dark"),
        Some(&d1),
    )
    .expect("insert second key");

    // Precondition mismatch should fail safely
    let err = apply_json_insert(
        &json_file,
        "wrong",
        &serde_json::json!(true),
        Some("invalid-hash"),
    );
    assert!(err.is_err());

    // Remove key
    let d3 = apply_json_remove(&json_file, "theme", Some(&d2)).expect("remove key");
    let text = std::fs::read_to_string(&json_file).expect("read json");
    assert!(!text.contains("dark"));
    assert!(text.contains("rtk"));
    assert_ne!(d2, d3);
}

#[test]
fn test_text_managed_block_lifecycle_and_idempotency() {
    let dir = tempdir().expect("tempdir");
    let md_file = dir.path().join("CLAUDE.md");
    std::fs::write(&md_file, "# Project Header\n\nExisting user content.\n").expect("write file");

    let orig_digest = compute_digest(std::fs::read(&md_file).unwrap().as_slice());

    // Insert block
    let d1 = apply_managed_block(
        &md_file,
        "eco-test-block",
        "Managed instruction content",
        Some(&orig_digest),
    )
    .expect("insert block");

    let c1 = std::fs::read_to_string(&md_file).expect("read file");
    assert!(c1.contains("Existing user content."));
    assert!(c1.contains("<!-- fable-eco:start id=\"eco-test-block\" -->"));
    assert!(c1.contains("Managed instruction content"));
    assert!(c1.contains("<!-- fable-eco:end id=\"eco-test-block\" -->"));

    // Update existing block in place
    let d2 = apply_managed_block(
        &md_file,
        "eco-test-block",
        "Updated instruction content",
        Some(&d1),
    )
    .expect("update block");
    let c2 = std::fs::read_to_string(&md_file).expect("read file");
    assert!(!c2.contains("Managed instruction content"));
    assert!(c2.contains("Updated instruction content"));

    // Remove block
    let _d3 = apply_remove_block(&md_file, "eco-test-block", Some(&d2)).expect("remove block");
    let c3 = std::fs::read_to_string(&md_file).expect("read file");
    assert!(!c3.contains("Updated instruction content"));
    assert!(!c3.contains("<!-- fable-eco:start"));
    assert!(c3.contains("Existing user content."));
}
