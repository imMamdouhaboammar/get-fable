use crate::error::EcoError;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

pub fn compute_digest(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    format!("{:x}", hasher.finalize())
}

pub fn verify_precondition(path: &Path, expected: Option<&str>) -> Result<(), EcoError> {
    let Some(exp) = expected else { return Ok(()) };
    let actual = if path.exists() {
        compute_digest(&fs::read(path)?)
    } else {
        compute_digest(b"")
    };
    if actual != exp {
        return Err(EcoError::StateIntegrity(format!(
            "Precondition mismatch for {}: expected {}, found {}",
            path.display(),
            exp,
            actual
        )));
    }
    Ok(())
}

fn read_json_or_default(path: &Path) -> Result<serde_json::Value, EcoError> {
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let text = fs::read_to_string(path)?;
    serde_json::from_str(&text).map_err(|e| EcoError::Config(e.to_string()))
}

fn write_bytes_atomic(path: &Path, content: &[u8]) -> Result<String, EcoError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temp_path = path.with_extension(format!("tmp.{}", std::process::id()));
    fs::write(&temp_path, content)?;
    fs::rename(&temp_path, path)?;
    Ok(compute_digest(content))
}

pub fn apply_json_insert(
    path: &Path,
    key: &str,
    val: &serde_json::Value,
    expected_precondition: Option<&str>,
) -> Result<String, EcoError> {
    verify_precondition(path, expected_precondition)?;
    let mut root = read_json_or_default(path)?;
    let obj = root
        .as_object_mut()
        .ok_or_else(|| EcoError::Config("Root JSON is not an object".into()))?;
    obj.insert(key.to_string(), val.clone());
    let formatted = serde_json::to_string_pretty(&root)
        .map_err(|e| EcoError::Config(e.to_string()))?;
    write_bytes_atomic(path, formatted.as_bytes())
}

pub fn apply_json_remove(
    path: &Path,
    key: &str,
    expected_precondition: Option<&str>,
) -> Result<String, EcoError> {
    verify_precondition(path, expected_precondition)?;
    if !path.exists() {
        return Ok(compute_digest(b""));
    }
    let mut root = read_json_or_default(path)?;
    if let Some(obj) = root.as_object_mut() {
        obj.remove(key);
    }
    let formatted = serde_json::to_string_pretty(&root)
        .map_err(|e| EcoError::Config(e.to_string()))?;
    write_bytes_atomic(path, formatted.as_bytes())
}

fn format_block(block_id: &str, content: &str) -> String {
    format!(
        "<!-- fable-eco:start id=\"{}\" -->\n{}\n<!-- fable-eco:end id=\"{}\" -->\n",
        block_id, content.trim_end(), block_id
    )
}

fn replace_or_append_block(orig: &str, block_id: &str, new_block: &str) -> String {
    let start_tag = format!("<!-- fable-eco:start id=\"{}\" -->", block_id);
    let end_tag = format!("<!-- fable-eco:end id=\"{}\" -->", block_id);
    let (Some(start_idx), Some(end_rel)) = (orig.find(&start_tag), orig.find(&end_tag)) else {
        let prefix = if orig.is_empty() || orig.ends_with('\n') { "" } else { "\n" };
        return format!("{}{}{}", orig, prefix, new_block);
    };
    let end_idx = end_rel + end_tag.len();
    let end_with_nl = if orig[end_idx..].starts_with('\n') { end_idx + 1 } else { end_idx };
    format!("{}{}{}", &orig[..start_idx], new_block, &orig[end_with_nl..])
}

pub fn apply_managed_block(
    path: &Path,
    block_id: &str,
    content: &str,
    expected_precondition: Option<&str>,
) -> Result<String, EcoError> {
    verify_precondition(path, expected_precondition)?;
    let orig = if path.exists() { fs::read_to_string(path)? } else { String::new() };
    let new_block = format_block(block_id, content);
    let updated = replace_or_append_block(&orig, block_id, &new_block);
    write_bytes_atomic(path, updated.as_bytes())
}

pub fn apply_remove_block(
    path: &Path,
    block_id: &str,
    expected_precondition: Option<&str>,
) -> Result<String, EcoError> {
    verify_precondition(path, expected_precondition)?;
    if !path.exists() {
        return Ok(compute_digest(b""));
    }
    let orig = fs::read_to_string(path)?;
    let start_tag = format!("<!-- fable-eco:start id=\"{}\" -->", block_id);
    let end_tag = format!("<!-- fable-eco:end id=\"{}\" -->", block_id);
    let (Some(s_idx), Some(e_rel)) = (orig.find(&start_tag), orig.find(&end_tag)) else {
        return Ok(compute_digest(orig.as_bytes()));
    };
    let e_idx = e_rel + end_tag.len();
    let e_with_nl = if orig[e_idx..].starts_with('\n') { e_idx + 1 } else { e_idx };
    let updated = format!("{}{}", &orig[..s_idx], &orig[e_with_nl..]);
    write_bytes_atomic(path, updated.as_bytes())
}
