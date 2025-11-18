use serde::{Deserialize, Serialize};

/// Main settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub version: String,
    pub font_size: u32,
    pub font_family: String,
    pub theme: TerminalTheme,
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
            font_size: 14,
            font_family: "Cascadia Code, Consolas, Monaco, monospace".to_string(),
            theme: TerminalTheme::default(),
        }
    }
}

impl Default for TerminalTheme {
    fn default() -> Self {
        Self {
            background: "#1e1e1e".to_string(),
            foreground: "#cccccc".to_string(),
            cursor: "#ffffff".to_string(),
            cursor_accent: Some("#000000".to_string()),
            selection_background: Some("#264f78".to_string()),
            // ANSI colors are optional and not saved by default
            black: None,
            red: None,
            green: None,
            yellow: None,
            blue: None,
            magenta: None,
            cyan: None,
            white: None,
            bright_black: None,
            bright_red: None,
            bright_green: None,
            bright_yellow: None,
            bright_blue: None,
            bright_magenta: None,
            bright_cyan: None,
            bright_white: None,
        }
    }
}
