use serde::{Deserialize, Serialize};

/// Main settings structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub version: String,
    pub terminal: TerminalSettings,
    pub window: WindowSettings,
    pub general: GeneralSettings,
}

/// Terminal-specific settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSettings {
    pub font_size: u32,
    pub font_family: String,
    pub line_height: f32,
    pub cursor_style: CursorStyle,
    pub cursor_blink: bool,
    pub scrollback: u32,
    pub shell: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub startup_directory: Option<String>,
    pub theme: TerminalTheme,
}

/// Cursor style options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CursorStyle {
    Block,
    Underline,
    Bar,
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

/// Window settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<i32>,
}

/// General application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSettings {
    pub confirm_before_quit: bool,
    pub auto_save: bool,
}

// Default implementations
impl Default for Settings {
    fn default() -> Self {
        Self {
            version: "1.0.0".to_string(),
            terminal: TerminalSettings::default(),
            window: WindowSettings::default(),
            general: GeneralSettings::default(),
        }
    }
}

impl Default for TerminalSettings {
    fn default() -> Self {
        Self {
            font_size: 14,
            font_family: "Consolas, \"Courier New\", monospace".to_string(),
            line_height: 1.2,
            cursor_style: CursorStyle::Block,
            cursor_blink: true,
            scrollback: 1000,
            shell: String::new(),
            startup_directory: None,
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
            black: Some("#000000".to_string()),
            red: Some("#cd3131".to_string()),
            green: Some("#0dbc79".to_string()),
            yellow: Some("#e5e510".to_string()),
            blue: Some("#2472c8".to_string()),
            magenta: Some("#bc3fbc".to_string()),
            cyan: Some("#11a8cd".to_string()),
            white: Some("#e5e5e5".to_string()),
            bright_black: Some("#666666".to_string()),
            bright_red: Some("#f14c4c".to_string()),
            bright_green: Some("#23d18b".to_string()),
            bright_yellow: Some("#f5f543".to_string()),
            bright_blue: Some("#3b8eea".to_string()),
            bright_magenta: Some("#d670d6".to_string()),
            bright_cyan: Some("#29b8db".to_string()),
            bright_white: Some("#ffffff".to_string()),
        }
    }
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            width: 1200,
            height: 800,
            x: None,
            y: None,
        }
    }
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            confirm_before_quit: true,
            auto_save: true,
        }
    }
}
