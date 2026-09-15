use fable_eco::project::{bind_project, load_project_binding, unbind_project};
use tempfile::tempdir;

#[test]
fn test_project_binding_lifecycle() {
    let dir = tempdir().expect("tempdir");
    let root = dir.path();

    // Initial load returns None
    let initial = load_project_binding(root).expect("load initial");
    assert!(initial.is_none());

    // Bind capability and profile
    let binding = bind_project(
        root,
        Some("core".into()),
        vec!["fable/rtk".into(), "fable/codegraph".into()],
        vec!["claude".into()],
    )
    .expect("bind project");

    assert_eq!(binding.profile, Some("core".into()));
    assert_eq!(binding.capabilities.len(), 2);
    assert_eq!(binding.hosts, vec!["claude".to_string()]);
    assert_eq!(binding.schema_version, 1);

    // Reload from disk
    let reloaded = load_project_binding(root).expect("reload").expect("present");
    assert_eq!(binding, reloaded);

    // Idempotent additional binding
    let updated = bind_project(
        root,
        None,
        vec!["fable/rtk".into(), "fable/impeccable".into()],
        vec!["codex".into()],
    )
    .expect("update bind");
    assert_eq!(updated.capabilities.len(), 3);
    assert_eq!(updated.hosts.len(), 2);

    // Unbind
    let removed = unbind_project(root).expect("unbind");
    assert!(removed);
    let after_unbind = load_project_binding(root).expect("load after unbind");
    assert!(after_unbind.is_none());
}
