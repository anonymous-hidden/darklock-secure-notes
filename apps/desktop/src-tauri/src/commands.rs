//! Darklock Secure Notes — Tauri IPC Commands
//!
//! All file operations are sandboxed inside the app data directory.
//! Paths are validated to prevent directory traversal.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use zeroize::Zeroize;

/// Resolve the app data directory.
pub fn resolve_data_dir(app: &AppHandle) -> PathBuf {
    // Prefer XDG on Linux, AppData on Windows
    if let Some(dir) = dirs::data_dir() {
        dir.join("darklock-notes")
    } else {
        // Fallback
        PathBuf::from(".").join(".darklock-notes")
    }
}

/// Validate that a relative path doesn't escape the data directory.
fn safe_path(data_dir: &Path, relative: &str) -> Result<PathBuf, String> {
    // Reject absolute paths and traversal
    if relative.starts_with('/') || relative.starts_with('\\') || relative.contains("..") {
        return Err("Invalid path: directory traversal not allowed".into());
    }

    let full = data_dir.join(relative);

    // Canonicalize and verify it's still inside data_dir
    // (for new files, check the parent)
    let check_path = if full.exists() {
        full.canonicalize().map_err(|e| e.to_string())?
    } else {
        let parent = full.parent().ok_or("Invalid path")?;
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        parent.canonicalize().map_err(|e| e.to_string())?.join(
            full.file_name().ok_or("Invalid filename")?,
        )
    };

    let canon_data = data_dir.canonicalize().unwrap_or_else(|_| data_dir.to_path_buf());
    if !check_path.starts_with(&canon_data) {
        return Err("Path escapes data directory".into());
    }

    Ok(full)
}

/// Read a file from the vault data directory.
#[tauri::command]
pub async fn read_vault_file(app: AppHandle, path: String) -> Result<Vec<u8>, String> {
    let data_dir = resolve_data_dir(&app);
    let full_path = safe_path(&data_dir, &path)?;
    std::fs::read(&full_path).map_err(|e| format!("Read failed: {}", e))
}

/// Write a file to the vault data directory.
#[tauri::command]
pub async fn write_vault_file(app: AppHandle, path: String, data: Vec<u8>) -> Result<(), String> {
    let data_dir = resolve_data_dir(&app);
    let full_path = safe_path(&data_dir, &path)?;

    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&full_path, &data).map_err(|e| format!("Write failed: {}", e))
}

/// Delete a file from the vault data directory.
#[tauri::command]
pub async fn delete_vault_file(app: AppHandle, path: String) -> Result<(), String> {
    let data_dir = resolve_data_dir(&app);
    let full_path = safe_path(&data_dir, &path)?;

    if full_path.exists() {
        // Overwrite with zeros before deleting (best-effort secure delete)
        if let Ok(meta) = std::fs::metadata(&full_path) {
            let zeros = vec![0u8; meta.len() as usize];
            std::fs::write(&full_path, &zeros).ok();
        }
        std::fs::remove_file(&full_path).map_err(|e| format!("Delete failed: {}", e))
    } else {
        Ok(())
    }
}

/// List files in a subdirectory of the data dir.
#[tauri::command]
pub async fn list_vault_dir(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    let data_dir = resolve_data_dir(&app);
    let full_path = safe_path(&data_dir, &path)?;

    if !full_path.is_dir() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&full_path).map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            names.push(name.to_string());
        }
    }
    Ok(names)
}

/// Get the resolved data directory path.
#[tauri::command]
pub async fn get_data_dir(app: AppHandle) -> Result<String, String> {
    let dir = resolve_data_dir(&app);
    Ok(dir.to_string_lossy().to_string())
}

/// Secure zeroize — placeholder for wiping sensitive data on the Rust side.
/// In production, this would interface with the crypto module's memory management.
#[tauri::command]
pub async fn secure_zeroize(label: String) -> Result<(), String> {
    // Log the zeroize request (in debug builds)
    #[cfg(debug_assertions)]
    println!("[darklock] secure_zeroize called for: {}", label);

    // Actual sensitive data zeroization would happen here
    // using the `zeroize` crate on Rust-held secrets
    Ok(())
}
