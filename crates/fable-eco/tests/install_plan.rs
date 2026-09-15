use fable_eco::catalog::*;
use fable_eco::discover_machine;
use fable_eco::model::*;
use fable_eco::resolve::*;

#[test]
fn test_build_install_plan_for_rtk() {
    let rtk: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml")
    ).unwrap();

    let mut catalog = Catalog::default();
    catalog.entries.insert(rtk.id.clone(), rtk.clone());

    let machine = discover_machine();
    let resolution = resolve_capabilities(std::slice::from_ref(&rtk.id), &catalog, &machine).unwrap();
    let plan = build_install_plan(&resolution, &catalog, &machine).unwrap();

    assert_eq!(plan.schema_version, 1);
    assert!(plan.selected.contains(&"fable/rtk".to_string()));
    assert!(!plan.operations.is_empty());

    // check operation dependencies: commit operations depend on health checks
    let commit_inv = plan.operations.iter().find(|op| op.id == "commit:inventory").unwrap();
    assert!(commit_inv.depends_on.contains(&"health:fable/rtk".to_string()));

    let commit_lock = plan.operations.iter().find(|op| op.id == "commit:lock").unwrap();
    assert!(commit_lock.depends_on.contains(&"commit:inventory".to_string()));
}
