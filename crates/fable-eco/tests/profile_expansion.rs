use fable_eco::catalog::*;
use fable_eco::model::profile::Profile;
use std::collections::HashMap;
use std::path::Path;

#[test]
fn test_expand_core_and_inheritance() {
    let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let core_path = manifest_dir.join("../../eco/profiles/core.toml");
    let frontend_path = manifest_dir.join("../../eco/profiles/frontend.toml");

    let core = load_profile_file(&core_path).unwrap();
    let frontend = load_profile_file(&frontend_path).unwrap();

    let mut map = HashMap::new();
    map.insert("core".to_string(), core);
    map.insert("frontend".to_string(), frontend);

    let core_expanded = expand_profile("core", &map, None, false, false).unwrap();
    assert_eq!(core_expanded.len(), 6);

    let fe_expanded = expand_profile("frontend", &map, None, false, false).unwrap();
    // 6 from core + fable/impeccable + fable/agent-browser = 8
    assert_eq!(fe_expanded.len(), 8);
    assert!(fe_expanded
        .iter()
        .any(|id| id.to_string() == "fable/impeccable"));
    assert!(fe_expanded.iter().any(|id| id.to_string() == "fable/rtk"));
}

#[test]
fn test_profile_cycle_detection() {
    let mut map = HashMap::new();
    map.insert(
        "a".to_string(),
        Profile {
            schema_version: 1,
            id: "a".to_string(),
            extends: vec!["b".to_string()],
            capabilities: vec!["fable/rtk".to_string()],
            optional: vec![],
        },
    );
    map.insert(
        "b".to_string(),
        Profile {
            schema_version: 1,
            id: "b".to_string(),
            extends: vec!["a".to_string()],
            capabilities: vec!["fable/codegraph".to_string()],
            optional: vec![],
        },
    );

    let err = expand_profile("a", &map, None, false, false).unwrap_err();
    assert!(err.to_string().contains("cycle detected"));
}
