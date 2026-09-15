use std::process::Command;
use crate::model::machine::RuntimeFact;

pub fn probe_runtimes() -> Vec<RuntimeFact> {
    let binaries = ["git", "bun", "node", "rustc", "cargo", "python3", "uv"];
    let mut facts = Vec::new();
    for b in binaries {
        if let Some(fact) = probe_binary(b) {
            facts.push(fact);
        }
    }
    facts
}

fn probe_binary(name: &str) -> Option<RuntimeFact> {
    let output = Command::new(name)
        .arg("--version")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let version = stdout.lines().next().map(|l| l.trim().to_string());
    Some(RuntimeFact {
        name: name.to_string(),
        path: None,
        version,
    })
}
