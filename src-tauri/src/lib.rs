mod commands;
mod fs;
mod pty;
mod settings;
mod ssh;
mod ipc;

use pty::PtyManager;
use settings::SettingsManager;
use ssh::SshManager;
use ipc::IpcServer;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize settings manager
    let settings_manager =
        SettingsManager::new().expect("Failed to initialize settings manager");

    // IPC 서버 상태 관리
    let ipc_server: Arc<Mutex<Option<IpcServer>>> = Arc::new(Mutex::new(None));
    let ipc_server_clone = ipc_server.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(settings_manager)
        .setup(move |app| {
            // IPC 서버 시작 (비동기 실행)
            let ipc_clone = ipc_server_clone.clone();
            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                match IpcServer::start(app_handle).await {
                    Ok(server) => {
                        *ipc_clone.lock().unwrap() = Some(server);
                        println!("IPC server started successfully");
                    }
                    Err(e) => {
                        eprintln!("Failed to start IPC server: {}", e);
                    }
                }
            });

            Ok(())
        })
        .on_window_event(move |_window, event| {
            use tauri::WindowEvent;

            if let WindowEvent::CloseRequested { .. } = event {
                // 앱 종료 시 IPC 서버 종료
                if let Some(mut server) = ipc_server.lock().unwrap().take() {
                    server.shutdown();
                    println!("IPC server stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::pty_commands::create_pty,
            commands::pty_commands::write_to_pty,
            commands::pty_commands::resize_pty,
            commands::pty_commands::close_pty,
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::reset_settings,
            commands::keyring_commands::save_credential,
            commands::keyring_commands::get_credential,
            commands::keyring_commands::delete_credential,
            // SSH commands
            commands::ssh_commands::create_ssh_session,
            commands::ssh_commands::write_to_ssh,
            commands::ssh_commands::resize_ssh_session,
            commands::ssh_commands::close_ssh_session,
            // Local file system commands
            commands::fs_commands::get_user_home_dir,
            commands::fs_commands::list_local_directory,
            commands::fs_commands::get_local_file_stats,
            commands::fs_commands::create_local_directory,
            commands::fs_commands::delete_local_file,
            commands::fs_commands::delete_local_directory,
            commands::fs_commands::rename_local_item,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
