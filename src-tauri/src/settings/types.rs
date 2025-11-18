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

/// Terminal color theme
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalTheme {
    pub background: String,
    pub foreground: String,
    pub cursor: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor_accent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_background: Option<String>,
    // ANSI colors
    #[serde(skip_serializing_if = "Option::is_none")]
    pub black: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub red: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub green: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub yellow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub blue: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub magenta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cyan: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub white: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_black: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_red: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_green: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_yellow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_blue: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_magenta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_cyan: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bright_white: Option<String>,
}

// Default implementations
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

impl Default for TerminalTheme {
    fn default() -> Self {
        // Default to Retro theme (classic green on black)
        Self {
            background: "#000000".to_string(),
            foreground: "#13a10e".to_string(),
            cursor: "#13a10e".to_string(),
            cursor_accent: Some("#000000".to_string()),
            selection_background: Some("#ffffff".to_string()),
            black: Some("#13a10e".to_string()),
            red: Some("#13a10e".to_string()),
            green: Some("#13a10e".to_string()),
            yellow: Some("#13a10e".to_string()),
            blue: Some("#13a10e".to_string()),
            magenta: Some("#13a10e".to_string()),
            cyan: Some("#13a10e".to_string()),
            white: Some("#13a10e".to_string()),
            bright_black: Some("#16ba10".to_string()),
            bright_red: Some("#16ba10".to_string()),
            bright_green: Some("#16ba10".to_string()),
            bright_yellow: Some("#16ba10".to_string()),
            bright_blue: Some("#16ba10".to_string()),
            bright_magenta: Some("#16ba10".to_string()),
            bright_cyan: Some("#16ba10".to_string()),
            bright_white: Some("#16ba10".to_string()),
        }
    }
}
