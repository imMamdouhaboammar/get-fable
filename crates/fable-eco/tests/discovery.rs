use fable_eco::discover_machine;

#[test]
fn test_discover_machine_facts_and_platform_string() {
    let facts = discover_machine();
    assert!(facts.os.is_present());
    assert!(facts.arch.is_present());
    let plat = facts.platform_string().unwrap();
    assert!(plat.contains('/'));
    assert!(facts.has_runtime("git") || facts.has_runtime("bun") || facts.has_runtime("cargo"));
}
