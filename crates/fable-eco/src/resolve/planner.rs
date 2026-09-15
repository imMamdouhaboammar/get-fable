use chrono::Utc;
use crate::catalog::Catalog;
use crate::error::EcoResult;
use crate::model::capability::InstallDriver;
use crate::model::machine::MachineFacts;
use crate::model::plan::{InstallPlan, OperationType, PlanOperation, SkippedItem};
use crate::resolve::ResolutionSet;

pub fn build_install_plan(
    resolution: &ResolutionSet,
    catalog: &Catalog,
    _machine: &MachineFacts,
) -> EcoResult<InstallPlan> {
    let plan_id = format!("eco-plan-{}", Utc::now().timestamp_millis());
    let mut operations = Vec::new();
    let mut health_op_ids = Vec::new();

    for cap_id in &resolution.selected {
        let manifest = match catalog.entries.get(cap_id) {
            Some(m) => m,
            None => continue,
        };
        let cap_str = cap_id.to_string();

        let fetch_id = format!("fetch:{}", cap_str);
        operations.push(PlanOperation {
            id: fetch_id.clone(),
            op_type: OperationType::FetchMetadata,
            depends_on: vec![],
            mutation: false,
            reversible: true,
            targets: vec![manifest.source.repository.clone()],
            network: true,
            privilege_escalation: None,
            description: Some(format!("Fetch metadata for {}", cap_str)),
        });

        let install_op_type = match manifest.install.driver {
            InstallDriver::CopySkill => OperationType::InstallSkill,
            InstallDriver::GithubRelease | InstallDriver::BinaryArchive => OperationType::DownloadArtifact,
            _ => OperationType::InstallPackage,
        };

        let install_id = format!("install:{}", cap_str);
        operations.push(PlanOperation {
            id: install_id.clone(),
            op_type: install_op_type,
            depends_on: vec![fetch_id],
            mutation: true,
            reversible: true,
            targets: vec![cap_str.clone()],
            network: manifest.install.driver != InstallDriver::CopySkill,
            privilege_escalation: None,
            description: Some(format!("Install capability {}", cap_str)),
        });

        let health_id = format!("health:{}", cap_str);
        health_op_ids.push(health_id.clone());
        operations.push(PlanOperation {
            id: health_id,
            op_type: OperationType::RunHealthCheck,
            depends_on: vec![install_id],
            mutation: false,
            reversible: true,
            targets: vec![cap_str],
            network: false,
            privilege_escalation: None,
            description: Some("Run health verification".into()),
        });
    }

    let inv_id = "commit:inventory".to_string();
    operations.push(PlanOperation {
        id: inv_id.clone(),
        op_type: OperationType::WriteInventory,
        depends_on: health_op_ids.clone(),
        mutation: true,
        reversible: true,
        targets: vec!["inventory.json".into()],
        network: false,
        privilege_escalation: None,
        description: Some("Commit inventory".into()),
    });

    operations.push(PlanOperation {
        id: "commit:lock".to_string(),
        op_type: OperationType::WriteLock,
        depends_on: vec![inv_id],
        mutation: true,
        reversible: true,
        targets: vec!["eco.lock".into()],
        network: false,
        privilege_escalation: None,
        description: Some("Write lockfile".into()),
    });

    let selected = resolution.selected.iter().map(|id| id.to_string()).collect();
    let skipped = resolution.skipped.iter().map(|(id, r)| SkippedItem {
        capability_id: id.to_string(),
        reason_code: r.clone(),
    }).collect();

    Ok(InstallPlan {
        schema_version: 1,
        plan_id,
        selected,
        skipped,
        warnings: resolution.conflicts.clone(),
        operations,
    })
}
