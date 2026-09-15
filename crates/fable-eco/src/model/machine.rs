use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", content = "value", rename_all = "kebab-case")]
pub enum Fact<T> {
    Present(T),
    Absent,
    Unknown,
    Error(String),
}

impl<T> Fact<T> {
    pub fn is_present(&self) -> bool {
        matches!(self, Fact::Present(_))
    }

    pub fn value(&self) -> Option<&T> {
        match self {
            Fact::Present(v) => Some(v),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuntimeFact {
    pub name: String,
    pub path: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HostFact {
    pub id: String,
    pub config_dir: Option<String>,
    pub installed: bool,
    pub version: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct MachineFacts {
    pub os: Fact<String>,
    pub arch: Fact<String>,
    pub runtimes: Vec<RuntimeFact>,
    pub hosts: Vec<HostFact>,
}

impl MachineFacts {
    pub fn platform_string(&self) -> Option<String> {
        let os = self.os.value()?;
        let arch = self.arch.value()?;
        Some(format!("{}/{}", os, arch))
    }

    pub fn has_runtime(&self, name: &str) -> bool {
        self.runtimes.iter().any(|r| r.name == name)
    }

    pub fn has_host(&self, id: &str) -> bool {
        self.hosts.iter().any(|h| h.id == id && h.installed)
    }
}
