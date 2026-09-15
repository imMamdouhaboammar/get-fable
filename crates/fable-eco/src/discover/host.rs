use std::path::PathBuf;
use crate::model::machine::HostFact;

pub fn probe_hosts() -> Vec<HostFact> {
    let home = std::env::var("HOME").ok().map(PathBuf::from);
    let hosts = [
        ("claude", ".claude"),
        ("antigravity", ".gemini/config"),
        ("codex", ".codex"),
        ("cursor", ".cursor"),
        ("grok", ".grok"),
        ("opencode", ".opencode"),
        ("deepseek", ".deepseek"),
    ];

    let mut results = Vec::new();
    for (id, rel_path) in hosts {
        let (installed, config_dir) = match &home {
            Some(h) => {
                let dir = h.join(rel_path);
                (dir.exists(), Some(dir.to_string_lossy().to_string()))
            }
            None => (false, None),
        };
        results.push(HostFact {
            id: id.to_string(),
            config_dir,
            installed,
            version: None,
        });
    }
    results
}
