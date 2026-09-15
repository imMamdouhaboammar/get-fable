use super::input::RoutingDecisionInput;
use super::playbook::Playbook;
use crate::error::EcoError;
use crate::model::capability::CapabilityManifest;
use crate::model::contract::{
    ContractCapability, ContractStep, ContractStepMode, EvidenceExpectation, ExecutionContract,
};
use crate::model::host::HostCapabilityMatrix;
use crate::model::policy::EcoPolicy;
use crate::policy::check_capability_policy;

pub fn plan_runtime_execution(
    decision: &RoutingDecisionInput,
    playbook: &Playbook,
    installed: &[CapabilityManifest],
    host_matrix: &HostCapabilityMatrix,
    policy: &EcoPolicy,
) -> Result<ExecutionContract, EcoError> {
    if !playbook.matches_routing(decision) {
        return Err(EcoError::Validation(format!(
            "Playbook {} does not match routing task_shape {}",
            playbook.id, decision.task_shape
        )));
    }

    let mut capabilities = Vec::new();
    let mut steps = Vec::new();
    let mut evidence_expectations = Vec::new();
    let mut permissions = Vec::new();

    for step in &playbook.steps {
        if let Some(ref feat) = step.requires_feature {
            // Find candidate installed capabilities providing this feature
            let mut candidates: Vec<&CapabilityManifest> = installed
                .iter()
                .filter(|m| m.provides.contains(feat))
                .collect();

            // Sort deterministically: lowest privilege (fewer permissions) then ID
            candidates.sort_by_key(|m| (m.permissions.len(), m.id.clone()));

            let mut selected_manifest = None;
            for candidate in candidates {
                if check_capability_policy(candidate, policy).is_ok() {
                    selected_manifest = Some(candidate);
                    break;
                }
            }

            let Some(manifest) = selected_manifest else {
                if step.required {
                    return Err(EcoError::ResolutionConflict(format!(
                        "No installed capability satisfies required feature '{}' under current policy",
                        feat
                    )));
                }
                continue;
            };

            let grade = manifest
                .hosts
                .iter()
                .find(|h| h.id == host_matrix.host_id)
                .and_then(|h| h.minimum_grade)
                .unwrap_or(crate::model::capability::EnforcementGrade::B);

            if let Some(min_grade) = step.minimum_grade {
                if !grade.satisfies(&min_grade) && !playbook.fallback_policy.allow_grade_downgrade {
                    if step.required {
                        return Err(EcoError::ResolutionConflict(format!(
                            "Capability {} grade {:?} does not satisfy required minimum grade {:?}",
                            manifest.id, grade, min_grade
                        )));
                    }
                    continue;
                }
            }

            let cap_id_str = manifest.id.to_string();
            if !capabilities.iter().any(|c: &ContractCapability| c.id == cap_id_str) {
                let ver = manifest
                    .version
                    .constraint
                    .as_deref()
                    .or(manifest.version.revision.as_deref())
                    .unwrap_or("latest");
                capabilities.push(ContractCapability {
                    id: cap_id_str.clone(),
                    version: ver.to_string(),
                    enforcement_grade: grade,
                });
            }

            steps.push(ContractStep {
                id: step.id.clone(),
                capability_id: cap_id_str,
                mode: ContractStepMode::HostSkill,
                required: step.required,
                minimum_grade: step.minimum_grade.unwrap_or(grade),
                timeout_ms: 30_000,
                fallback_capabilities: Vec::new(),
            });

            if let Some(ref ev) = step.evidence {
                evidence_expectations.push(EvidenceExpectation {
                    step_id: step.id.clone(),
                    kind: ev.clone(),
                });
            }
        }
    }

    // Include permissions summary
    permissions.push(format!("default:{}", policy.default_permission));
    permissions.push(format!("network:{:?}", policy.network).to_lowercase());

    let contract_id = format!("contract-{}-{}", playbook.id, &decision.decision_digest[..8]);
    Ok(ExecutionContract {
        schema_version: 1,
        contract_id,
        routing_decision_digest: decision.decision_digest.clone(),
        host_id: host_matrix.host_id.clone(),
        capabilities,
        steps,
        permissions,
        evidence_expectations,
        stop_conditions: vec!["failure_streak >= 2".into(), "user_interrupt".into()],
    })
}
