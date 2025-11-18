mod commands;
mod pty;
mod settings;

use pty::PtyManager;
use settings::SettingsManager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize settings manager
    let settings_manager =
        SettingsManager::new().expect("Failed to initialize settings manager");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(settings_manager)
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::pty_commands::create_pty,
            commands::pty_commands::write_to_pty,
            commands::pty_commands::resize_pty,
            commands::pty_commands::close_pty,
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::reset_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
