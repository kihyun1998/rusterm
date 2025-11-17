use tauri::State;

use crate::settings::{Settings, SettingsManager};

/// Load settings from file
#[tauri::command]
pub async fn load_settings(manager: State<'_, SettingsManager>) -> Result<Settings, String> {
    Ok(manager.get_settings())
}

/// Save settings to file
#[tauri::command]
pub async fn save_settings(
    manager: State<'_, SettingsManager>,
    settings: Settings,
) -> Result<(), String> {
    manager.update_settings(settings).map_err(|e| e.to_string())
}

/// Reset settings to default values
#[tauri::command]
pub async fn reset_settings(manager: State<'_, SettingsManager>) -> Result<Settings, String> {
    manager.reset_to_default().map_err(|e| e.to_string())?;
    Ok(manager.get_settings())
}
