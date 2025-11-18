use serde::{Deserialize, Serialize};

/// Main settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub version: String,
    #[serde(default = "default_app_theme")]
    pub app_theme: String,
    pub font_size: u32,
    pub font_family: String,
    #[serde(default = "default_terminal_theme_id")]
    pub terminal_theme_id: String,
}

fn default_app_theme() -> String {
    "dark".to_string()
}

fn default_terminal_theme_id() -> String {
    "retro".to_string()
}

// Default implementation
impl Default for Settings {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            app_theme: "dark".to_string(),
            font_size: 14,
            font_family: "Cascadia Code, Consolas, Monaco, monospace".to_string(),
            terminal_theme_id: "retro".to_string(),
        }
    }
}
