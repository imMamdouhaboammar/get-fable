pub mod host;
pub mod platform;
pub mod runtime;

pub use host::probe_hosts;
pub use platform::{probe_arch, probe_os};
pub use runtime::probe_runtimes;

use crate::model::machine::MachineFacts;

pub fn discover_machine() -> MachineFacts {
    MachineFacts {
        os: probe_os(),
        arch: probe_arch(),
        runtimes: probe_runtimes(),
        hosts: probe_hosts(),
    }
}
