use fable_eco::catalog::*;
use fable_eco::discover_machine;
use fable_eco::model::*;
use fable_eco::resolve::*;

#[test]
fn test_resolve_rtk_and_codegraph() {
    let rtk: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml")
    ).unwrap();
    let codegraph: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/codegraph.capability.toml")
    ).unwrap();

    let mut catalog = Catalog::default();
    catalog.entries.insert(rtk.id.clone(), rtk.clone());
    catalog.entries.insert(codegraph.id.clone(), codegraph.clone());

    let machine = discover_machine();
    let requested = vec![rtk.id.clone(), codegraph.id.clone()];

    let res = resolve_capabilities(&requested, &catalog, &machine).unwrap();
    assert_eq!(res.selected.len(), 2);
    assert!(res.conflicts.is_empty());
}

#[test]
fn test_dependency_cycle_fails() {
    let mut a: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml")
    ).unwrap();
    let mut b: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/codegraph.capability.toml")
    ).unwrap();

    a.id = "fable/a".parse().unwrap();
    b.id = "fable/b".parse().unwrap();

    a.dependencies.push(DependencyEdge {
        dep_type: DependencyType::Required,
        target: "fable/b".to_string(),
        constraint: None,
    });
    b.dependencies.push(DependencyEdge {
        dep_type: DependencyType::Required,
        target: "fable/a".to_string(),
        constraint: None,
    });

    let mut catalog = Catalog::default();
    catalog.entries.insert(a.id.clone(), a.clone());
    catalog.entries.insert(b.id.clone(), b.clone());

    let machine = discover_machine();
    let requested = vec![a.id.clone()];

    let err = resolve_capabilities(&requested, &catalog, &machine).unwrap_err();
    assert!(err.to_string().contains("ECO_DEPENDENCY_CYCLE"));
}
