use thiserror::Error;

#[derive(Debug, Error)]
pub enum EcoError {
    #[error("invalid eco data: {0}")]
    InvalidData(String),
    #[error("validation error: {0}")]
    Validation(String),
    #[error("catalog error: {0}")]
    Catalog(String),
    #[error("state integrity error: {0}")]
    StateIntegrity(String),
    #[error("configuration error: {0}")]
    Config(String),
    #[error("resolution conflict: {0}")]
    ResolutionConflict(String),
    #[error("policy denied: {0}")]
    PolicyDenied(String),
    #[error("host integration unsupported: {0}")]
    HostUnsupported(String),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("toml de error: {0}")]
    TomlDe(#[from] toml::de::Error),
    #[error("toml ser error: {0}")]
    TomlSer(#[from] toml::ser::Error),
}

impl EcoError {
    pub fn error_code(&self) -> &'static str {
        match self {
            Self::InvalidData(_) => "ECO_INVALID_DATA",
            Self::Validation(_) => "ECO_VALIDATION_ERROR",
            Self::Catalog(_) => "ECO_CATALOG_INVALID",
            Self::ResolutionConflict(_) => "ECO_RESOLUTION_CONFLICT",
            Self::PolicyDenied(_) => "ECO_POLICY_DENIED",
            Self::StateIntegrity(_) => "ECO_STATE_INTEGRITY",
            Self::Config(_) => "ECO_CONFIG_ERROR",
            Self::HostUnsupported(_) => "ECO_HOST_UNSUPPORTED",
            Self::Io(_) => "ECO_IO_ERROR",
            Self::Json(_) => "ECO_JSON_ERROR",
            Self::TomlDe(_) | Self::TomlSer(_) => "ECO_TOML_ERROR",
        }
    }

    pub fn exit_code(&self) -> i32 {
        match self {
            Self::InvalidData(_) | Self::Validation(_) => 2,
            Self::Catalog(_) => 11,
            Self::ResolutionConflict(_) => 13,
            Self::PolicyDenied(_) => 14,
            Self::StateIntegrity(_) => 23,
            Self::HostUnsupported(_) => 40,
            _ => 1,
        }
    }
}

pub type EcoResult<T> = Result<T, EcoError>;
