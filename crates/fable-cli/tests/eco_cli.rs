use std::process::Command;

fn get_bin_path() -> String {
    env!("CARGO_BIN_EXE_get-fable-native").to_string()
}

#[test]
fn test_cli_eco_discover_json() {
    let bin = get_bin_path();
    let output = Command::new(&bin)
        .args(["eco", "discover", "--json-v1"])
        .output()
        .expect("run eco discover");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("valid json envelope");
    assert_eq!(json["schema_version"], 1);
    assert_eq!(json["command"], "eco.discover");
    assert_eq!(json["ok"], true);
    assert!(json["result"]["os"].is_object());
}

#[test]
fn test_cli_eco_catalog_json() {
    let bin = get_bin_path();
    let output = Command::new(&bin)
        .args(["eco", "catalog", "--json-v1"])
        .output()
        .expect("run eco catalog");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("valid json envelope");
    assert_eq!(json["schema_version"], 1);
    assert_eq!(json["command"], "eco.catalog");
    assert!(json["result"].is_array());
}

#[test]
fn test_cli_eco_doctor_json() {
    let bin = get_bin_path();
    let output = Command::new(&bin)
        .args(["eco", "doctor", "--json-v1"])
        .output()
        .expect("run eco doctor");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("valid json envelope");
    assert_eq!(json["schema_version"], 1);
    assert_eq!(json["command"], "eco.doctor");
    assert!(json["result"]["overall_status"].is_string());
}

#[test]
fn test_cli_eco_hosts_json() {
    let bin = get_bin_path();
    let output = Command::new(&bin)
        .args(["eco", "hosts", "--json-v1"])
        .output()
        .expect("run eco hosts");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("valid json envelope");
    assert_eq!(json["schema_version"], 1);
    assert_eq!(json["command"], "eco.hosts");
    assert!(json["result"].is_array());
}

#[test]
fn test_cli_eco_profiles_json() {
    let bin = get_bin_path();
    let output = Command::new(&bin)
        .args(["eco", "profiles", "--json-v1"])
        .output()
        .expect("run eco profiles");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("valid json envelope");
    assert_eq!(json["schema_version"], 1);
    assert_eq!(json["command"], "eco.profiles");
    assert!(json["result"].is_array());
}

#[test]
fn test_cli_eco_plan_json() {
    let bin = get_bin_path();
    let output = Command::new(&bin)
        .args(["eco", "plan", "core", "--json-v1"])
        .output()
        .expect("run eco plan");

    assert!(output.status.success());
    let stdout = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&stdout).expect("valid json envelope");
    assert_eq!(json["schema_version"], 1);
    assert_eq!(json["command"], "eco.plan");
    assert!(json["result"]["actions"].is_array());
}
