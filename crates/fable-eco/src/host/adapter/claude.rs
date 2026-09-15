use crate::error::EcoError;
use crate::host::ownership::{create_receipt, record_patch_application};
use crate::host::patch::{apply_managed_block, apply_remove_block};
use crate::model::capability::CapabilityManifest;
use crate::model::host::{
    FeatureSupport, HostBindingReceipt, HostCapabilityMatrix, HostDetection, HostDetectionStatus,
    HostPatchOperation, HostPatchPlan,
};
use crate::model::machine::MachineFacts;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

pub struct ClaudeHostAdapter;

impl ClaudeHostAdapter {
    pub fn new() -> Self {
        Self
    }

    pub fn detect(&self, facts: &MachineFacts) -> HostDetection {
        let host_fact = facts.hosts.iter().find(|h| h.id == "claude");
        let status = if host_fact.is_some_and(|h| h.installed) {
            HostDetectionStatus::Present
        } else {
            HostDetectionStatus::Absent
        };
        let config_root = host_fact.and_then(|h| h.config_dir.as_ref()).map(PathBuf::from);
        HostDetection {
            host_id: "claude".into(),
            status,
            version: host_fact.and_then(|h| h.version.clone()),
            config_root,
            project_config_root: Some(PathBuf::from(".claude")),
            details: BTreeMap::new(),
        }
    }

    pub fn capability_matrix(&self, _facts: &MachineFacts) -> HostCapabilityMatrix {
        let mut features = BTreeMap::new();
        features.insert("skills".into(), FeatureSupport::Supported);
        features.insert("mcp".into(), FeatureSupport::Supported);
        features.insert("pre_tool_hook".into(), FeatureSupport::Supported);
        features.insert("post_tool_hook".into(), FeatureSupport::Supported);
        features.insert("command_wrapper".into(), FeatureSupport::Supported);
        features.insert("project_instructions".into(), FeatureSupport::Supported);
        HostCapabilityMatrix {
            schema_version: 1,
            host_id: "claude".into(),
            detection: HostDetectionStatus::Present,
            version: None,
            features,
        }
    }

    pub fn plan_project_instruction(
        &self,
        project_dir: &Path,
        manifest: &CapabilityManifest,
    ) -> HostPatchPlan {
        let target = project_dir.join("CLAUDE.md");
        let block_id = format!("eco-cap-{}", manifest.id);
        let version_label = manifest
            .version
            .constraint
            .as_deref()
            .or(manifest.version.revision.as_deref())
            .unwrap_or("latest");
        let content = format!(
            "### Capability: {}\nVersion: {}\n{}",
            manifest.id, version_label, manifest.description
        );
        HostPatchPlan {
            host_id: "claude".into(),
            target_path: target,
            operation: HostPatchOperation::ManagedTextBlock { block_id, content },
            precondition_digest: None,
        }
    }

    pub fn apply_patch(&self, plan: &HostPatchPlan) -> Result<HostBindingReceipt, EcoError> {
        let mut receipt = create_receipt(&plan.host_id, plan.target_path.clone());
        let digest = match &plan.operation {
            HostPatchOperation::ManagedTextBlock { block_id, content } => {
                apply_managed_block(&plan.target_path, block_id, content, None)?
            }
            HostPatchOperation::RemoveTextBlock { block_id } => {
                apply_remove_block(&plan.target_path, block_id, None)?
            }
            _ => return Err(EcoError::Config("Unsupported operation for Claude".into())),
        };
        record_patch_application(&mut receipt, plan, digest);
        Ok(receipt)
    }

    pub fn remove_patch(&self, receipt: &HostBindingReceipt) -> Result<(), EcoError> {
        for block_id in &receipt.managed_blocks {
            apply_remove_block(&receipt.target_path, block_id, None)?;
        }
        Ok(())
    }
}

impl Default for ClaudeHostAdapter {
    fn default() -> Self {
        Self::new()
    }
}
