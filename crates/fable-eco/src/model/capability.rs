use crate::error::{EcoError, EcoResult};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt;
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub struct CapabilityId {
    namespace: String,
    name: String,
}

impl CapabilityId {
    pub fn new(namespace: impl Into<String>, name: impl Into<String>) -> EcoResult<Self> {
        let ns = namespace.into();
        let n = name.into();
        Self::validate_segment(&ns)?;
        Self::validate_segment(&n)?;
        Ok(Self {
            namespace: ns,
            name: n,
        })
    }

    pub fn namespace(&self) -> &str {
        &self.namespace
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    fn validate_segment(s: &str) -> EcoResult<()> {
        if s.is_empty() || s.contains("..") || s.contains('/') || s.contains('\\') {
            return Err(EcoError::Validation(format!("invalid segment '{}'", s)));
        }
        let bytes = s.as_bytes();
        if !bytes[0].is_ascii_lowercase() && !bytes[0].is_ascii_digit() {
            return Err(EcoError::Validation(format!(
                "segment '{}' must start with lowercase alnum",
                s
            )));
        }
        for &b in bytes {
            if !b.is_ascii_lowercase() && !b.is_ascii_digit() && b != b'.' && b != b'_' && b != b'-'
            {
                return Err(EcoError::Validation(format!(
                    "invalid char in segment '{}'",
                    s
                )));
            }
        }
        Ok(())
    }
}

impl fmt::Display for CapabilityId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.namespace, self.name)
    }
}

impl FromStr for CapabilityId {
    type Err = EcoError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split('/').collect();
        if parts.len() != 2 {
            return Err(EcoError::Validation(format!(
                "capability ID must be <namespace>/<name>, got '{}'",
                s
            )));
        }
        Self::new(parts[0], parts[1])
    }
}

impl Serialize for CapabilityId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl<'de> Deserialize<'de> for CapabilityId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        s.parse::<CapabilityId>().map_err(serde::de::Error::custom)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CapabilityKind {
    Skill,
    Tool,
    Plugin,
    Agent,
    Service,
    Library,
    Bundle,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SupportTier {
    Stable,
    Optional,
    Experimental,
    Compatibility,
    Blocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Permission {
    #[serde(rename = "filesystem.read:workspace")]
    FilesystemReadWorkspace,
    #[serde(rename = "filesystem.write:workspace")]
    FilesystemWriteWorkspace,
    #[serde(rename = "filesystem.read:user-config")]
    FilesystemReadUserConfig,
    #[serde(rename = "filesystem.write:user-config")]
    FilesystemWriteUserConfig,
    #[serde(rename = "filesystem.write:host-config")]
    FilesystemWriteHostConfig,
    #[serde(rename = "network:public-internet")]
    NetworkPublicInternet,
    #[serde(rename = "network:scoped-target")]
    NetworkScopedTarget,
    #[serde(rename = "process:spawn")]
    ProcessSpawn,
    #[serde(rename = "browser:control")]
    BrowserControl,
    #[serde(rename = "git:read")]
    GitRead,
    #[serde(rename = "git:write")]
    GitWrite,
    #[serde(rename = "credentials:host-provided")]
    CredentialsHostProvided,
    #[serde(rename = "security:active-testing")]
    SecurityActiveTesting,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ConflictKind {
    Hard,
    PrimaryProvider,
    ContextOverlap,
    HookOrder,
    Version,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DependencyType {
    Required,
    Runtime,
    Install,
    Optional,
    Host,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InstallDriver {
    GithubRelease,
    BinaryArchive,
    GitCheckout,
    BunPackage,
    NpmPackage,
    CargoPackage,
    UvTool,
    CopySkill,
    Bundled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum TargetScope {
    EcoManaged,
    HostManaged,
    ProjectManaged,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SourceType {
    GithubRelease,
    Registry,
    GitTag,
    GitRevision,
    Bundled,
    BinaryArchive,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VersionStrategy {
    GithubRelease,
    Registry,
    GitTag,
    GitRevision,
    Bundled,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VersionChannel {
    Stable,
    Beta,
    Experimental,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum HealthKind {
    Command,
    File,
    HostBinding,
    None,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum HostMode {
    Skill,
    Mcp,
    Plugin,
    Wrapper,
    Instructions,
    None,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum EnforcementGrade {
    A,
    B,
    C,
    N,
}

impl EnforcementGrade {
    pub fn is_enforceable(&self) -> bool {
        matches!(self, Self::A | Self::B)
    }

    pub fn rank(&self) -> u8 {
        match self {
            Self::A => 0,
            Self::B => 1,
            Self::C => 2,
            Self::N => 3,
        }
    }

    pub fn satisfies(&self, required: &Self) -> bool {
        self.rank() <= required.rank()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ExpectedCost {
    FreeLocal,
    NetworkFree,
    ProviderBilled,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceConfig {
    #[serde(rename = "type")]
    pub source_type: SourceType,
    pub repository: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub registry: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub package: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct VersionConfig {
    pub strategy: VersionStrategy,
    pub channel: VersionChannel,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub constraint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub revision: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InstallConfig {
    pub driver: InstallDriver,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub target_scope: Option<TargetScope>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact_pattern: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DependencyEdge {
    #[serde(rename = "type")]
    pub dep_type: DependencyType,
    pub target: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub constraint: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ConflictRule {
    pub kind: ConflictKind,
    pub target: String,
    pub reason_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HealthConfig {
    pub kind: HealthKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub command: Option<Vec<String>>,
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HostBinding {
    pub id: String,
    pub mode: HostMode,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub minimum_grade: Option<EnforcementGrade>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuntimeConfig {
    pub intents: Vec<String>,
    pub task_shapes: Vec<String>,
    pub mutates_workspace: bool,
    pub parallel_safe: bool,
    pub network_required: bool,
    pub interactive: bool,
    pub expected_cost: ExpectedCost,
    pub fallbacks: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct GovernanceConfig {
    pub support_tier: SupportTier,
    pub license: String,
    pub adapter_owner: String,
    pub security_sensitive: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub qualification_record: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CapabilityManifest {
    pub schema_version: u32,
    pub id: CapabilityId,
    pub name: String,
    pub description: String,
    pub kind: CapabilityKind,
    pub classes: Vec<String>,
    pub source: SourceConfig,
    pub version: VersionConfig,
    pub install: InstallConfig,
    pub platforms: Vec<String>,
    #[serde(default)]
    pub dependencies: Vec<DependencyEdge>,
    #[serde(default)]
    pub conflicts: Vec<ConflictRule>,
    #[serde(default)]
    pub provides: Vec<String>,
    #[serde(default)]
    pub permissions: Vec<Permission>,
    pub health: HealthConfig,
    #[serde(default)]
    pub hosts: Vec<HostBinding>,
    pub runtime: RuntimeConfig,
    pub governance: GovernanceConfig,
}
