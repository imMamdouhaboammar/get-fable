use fable_eco::doctor::checks::{
    check_capability_installation, check_inventory, check_state_root, check_unresolved_journal,
    DoctorStatus,
};
use fable_eco::doctor::report::DoctorReport;
use tempfile::tempdir;

#[test]
fn test_doctor_checks_and_report_generation() {
    let dir = tempdir().expect("tempdir");
    let root = dir.path();

    let c1 = check_state_root(&root.join("eco"));
    assert_eq!(c1.status, DoctorStatus::Warn);

    std::fs::create_dir_all(root.join("eco")).expect("mkdir");
    let c1_ok = check_state_root(&root.join("eco"));
    assert_eq!(c1_ok.status, DoctorStatus::Pass);

    let journal_dir = root.join("eco/journals");
    let c2 = check_unresolved_journal(&journal_dir);
    assert_eq!(c2.status, DoctorStatus::Pass);

    // Add a pending journal file
    std::fs::create_dir_all(&journal_dir).expect("mkdir");
    std::fs::write(journal_dir.join("tx-123.json"), "{}").expect("write journal");
    let c2_blocked = check_unresolved_journal(&journal_dir);
    assert_eq!(c2_blocked.status, DoctorStatus::Blocked);

    let inventory_file = root.join("eco/inventory.json");
    std::fs::write(&inventory_file, "{ invalid json }").expect("write bad json");
    let c3 = check_inventory(&inventory_file);
    assert_eq!(c3.status, DoctorStatus::Fail);

    let cap_missing = check_capability_installation("fable/rtk", &root.join("skills/rtk"));
    assert_eq!(cap_missing.status, DoctorStatus::Fail);

    // Build report and repair plan
    let mut report = DoctorReport::new(vec![c1_ok, c2_blocked, c3, cap_missing]);
    assert_eq!(report.overall_status, DoctorStatus::Blocked);
    assert_eq!(report.summary.pass_count, 1);
    assert_eq!(report.summary.blocked_count, 1);
    assert_eq!(report.summary.fail_count, 2);

    report.generate_repair_plan();
    let plan = report.repair_plan.expect("repair plan generated");
    assert!(!plan.operations.is_empty());
}
