use crate::model::machine::Fact;

pub fn probe_os() -> Fact<String> {
    let os = std::env::consts::OS;
    match os {
        "macos" | "linux" | "windows" => Fact::Present(os.to_string()),
        _ => Fact::Unknown,
    }
}

pub fn probe_arch() -> Fact<String> {
    let arch = std::env::consts::ARCH;
    match arch {
        "aarch64" => Fact::Present("arm64".to_string()),
        "x86_64" => Fact::Present("x86_64".to_string()),
        _ => Fact::Unknown,
    }
}
