//! Darklock Secure Notes — Tauri Backend
//!
//! Rust commands exposed to the frontend via IPC.
//! All file I/O is sandboxed to the app data directory.

mod commands;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::read_vault_file,
            commands::write_vault_file,
            commands::delete_vault_file,
            commands::list_vault_dir,
            commands::get_data_dir,
            commands::secure_zeroize,
        ])
        .setup(|app| {
            // Ensure data directory exists
            let data_dir = commands::resolve_data_dir(app.handle());
            std::fs::create_dir_all(&data_dir).ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running darklock notes");
}
