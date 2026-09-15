use std::fs;
use std::path::Path;
use crate::error::EcoResult;

pub fn rollback_paths(paths: &[String]) -> EcoResult<()> {
    for p_str in paths.iter().rev() {
        let p = Path::new(p_str);
        if p.is_file() {
            let _ = fs::remove_file(p);
        } else if p.is_dir() {
            let _ = fs::remove_dir_all(p);
        }
    }
    Ok(())
}
