use std::process::Command;
use crate::model::capability::{HealthConfig, HealthKind};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HealthStatus {
    Pass,
    Fail(String),
}

pub fn run_health_check(health: &HealthConfig) -> HealthStatus {
    match health.kind {
        HealthKind::None => HealthStatus::Pass,
        HealthKind::Command => {
            let cmd_args = match &health.command {
                Some(args) if !args.is_empty() => args,
                _ => return HealthStatus::Fail("no command specified".into()),
            };
            let mut cmd = Command::new(&cmd_args[0]);
            if cmd_args.len() > 1 {
                cmd.args(&cmd_args[1..]);
            }
            match cmd.output() {
                Ok(out) if out.status.success() => HealthStatus::Pass,
                Ok(out) => HealthStatus::Fail(format!(
                    "exit status {}: {}",
                    out.status,
                    String::from_utf8_lossy(&out.stderr)
                )),
                Err(e) => HealthStatus::Fail(format!("execution failed: {}", e)),
            }
        }
        HealthKind::File => HealthStatus::Pass,
        HealthKind::HostBinding => HealthStatus::Pass,
    }
}
