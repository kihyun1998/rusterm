mod manager;
mod types;

pub use manager::{SettingsError, SettingsManager};
pub use types::{
    CursorStyle, GeneralSettings, Settings, TerminalSettings, TerminalTheme, WindowSettings,
};
