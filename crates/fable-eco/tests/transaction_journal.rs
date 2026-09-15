use std::fs;
use std::path::Path;
use tempfile::tempdir;
use fable_eco::install::*;
use fable_eco::model::*;

#[test]
fn test_journal_creation_and_state_updates() {
    let dir = tempdir().unwrap();
    let op = JournalOperation {
        id: "install:fable/rtk".to_string(),
        state: OperationState::Pending,
        reversible: true,
        before_digest: None,
        after_digest: None,
        rollback_ref: None,
    };
    let mut journal = create_journal("tx-123", vec![op]);
    assert_eq!(journal.operations[0].state, OperationState::Pending);

    update_op_state(&mut journal, "install:fable/rtk", OperationState::Applied);
    assert_eq!(journal.operations[0].state, OperationState::Applied);

    assert!(save_journal(&journal, dir.path()).is_ok());
    assert!(dir.path().join("journal.json").is_file());
}

#[test]
fn test_staging_path_traversal_prevention() {
    let staging = StagingRoot::new().unwrap();
    assert!(staging.safe_join("valid/sub/dir").is_ok());
    assert!(staging.safe_join("../escape").is_err());
    assert!(staging.safe_join("/absolute/escape").is_err());
}

#[test]
fn test_artifact_cache_hashing() {
    let dir = tempdir().unwrap();
    let cache = ArtifactCache::new(dir.path());
    let data = b"sample binary artifact content";
    let (digest, path) = cache.put(data).unwrap();

    assert_eq!(digest.len(), 64);
    assert!(path.is_file());

    let found = cache.get(&digest);
    assert_eq!(found, Some(path));
}

#[test]
fn test_crash_recovery_classification() {
    let mut journal = create_journal("tx-456", vec![]);
    assert_eq!(classify_crash(&journal), CrashClassification::SafeToRollback);

    journal.commit_marker = true;
    assert_eq!(classify_crash(&journal), CrashClassification::AlreadyCommitted);

    journal.commit_marker = false;
    journal.operations.push(JournalOperation {
        id: "fail-op".to_string(),
        state: OperationState::RollbackFailed,
        reversible: true,
        before_digest: None,
        after_digest: None,
        rollback_ref: None,
    });
    assert_eq!(classify_crash(&journal), CrashClassification::RecoveryRequired);
}

#[test]
fn test_copy_skill_driver_and_rollback() {
    let src_dir = tempdir().unwrap();
    let dest_dir = tempdir().unwrap();

    fs::write(src_dir.path().join("SKILL.md"), "# Skill content").unwrap();

    let rtk: CapabilityManifest = toml::from_str(
        include_str!("../../../docs/fable-eco-production-spec/examples/rtk.capability.toml")
    ).unwrap();

    let driver = CopySkillDriver;
    let owned = driver.install(&rtk, src_dir.path(), dest_dir.path()).unwrap();
    assert_eq!(owned.len(), 1);
    assert!(Path::new(&owned[0]).is_file());

    driver.rollback(&owned).unwrap();
    assert!(!Path::new(&owned[0]).is_file());
}
