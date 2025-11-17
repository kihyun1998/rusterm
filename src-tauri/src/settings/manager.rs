use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use thiserror::Error;

use super::types::Settings;

/// Settings manager errors
#[derive(Debug, Error)]
pub enum SettingsError {
    #[error("Failed to read settings file: {0}")]
    ReadError(#[from] std::io::Error),

    #[error("Failed to parse settings: {0}")]
    ParseError(#[from] serde_json::Error),

    #[error("Settings directory not found")]
    DirectoryNotFound,
}

/// Manages application settings with file persistence
pub struct SettingsManager {
    settings: Arc<RwLock<Settings>>,
    settings_path: PathBuf,
}

impl SettingsManager {
    /// Create a new settings manager
    pub fn new() -> Result<Self, SettingsError> {
        let settings_path = Self::get_settings_path()?;
        let settings = Self::load_or_create(&settings_path)?;

        Ok(Self {
            settings: Arc::new(RwLock::new(settings)),
            settings_path,
        })
    }

    /// Get the path to the settings file
    fn get_settings_path() -> Result<PathBuf, SettingsError> {
        let config_dir = dirs::config_dir().ok_or(SettingsError::DirectoryNotFound)?;

        let app_dir = config_dir.join("rusterm");
        fs::create_dir_all(&app_dir)?;

        Ok(app_dir.join("settings.json"))
    }

    /// Load settings from file, or create default if not exists
    fn load_or_create(path: &PathBuf) -> Result<Settings, SettingsError> {
        if path.exists() {
            let content = fs::read_to_string(path)?;
            let settings = serde_json::from_str(&content)?;
            Ok(settings)
        } else {
            let settings = Settings::default();
            // Create initial file
            Self::save_to_file(path, &settings)?;
            Ok(settings)
        }
    }

    /// Save settings to file
    fn save_to_file(path: &PathBuf, settings: &Settings) -> Result<(), SettingsError> {
        let json = serde_json::to_string_pretty(settings)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Get a clone of current settings
    pub fn get_settings(&self) -> Settings {
        self.settings.read().unwrap().clone()
    }

    /// Update settings and save to file
    pub fn update_settings(&self, new_settings: Settings) -> Result<(), SettingsError> {
        {
            let mut settings = self.settings.write().unwrap();
            *settings = new_settings.clone();
        }
        Self::save_to_file(&self.settings_path, &new_settings)?;
        Ok(())
    }

    /// Reset settings to default values
    pub fn reset_to_default(&self) -> Result<(), SettingsError> {
        let default_settings = Settings::default();
        self.update_settings(default_settings)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = Settings::default();
        assert_eq!(settings.version, "1.0.0");
        assert_eq!(settings.terminal.font_size, 14);
        assert_eq!(settings.window.width, 1200);
    }
}
