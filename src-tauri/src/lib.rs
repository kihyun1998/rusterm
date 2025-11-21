mod commands;
mod pty;
mod settings;
mod ssh;
mod sftp;
mod ipc;

use pty::PtyManager;
use settings::SettingsManager;
use ssh::SshManager;
use sftp::SftpManager;
use ipc::IpcServer;
use std::sync::{Arc, Mutex};

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

    // IPC 서버 상태 관리
    let ipc_server: Arc<Mutex<Option<IpcServer>>> = Arc::new(Mutex::new(None));
    let ipc_server_clone = ipc_server.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PtyManager::new())
        .manage(SshManager::new())
        .manage(SftpManager::new())
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
            greet,
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
            // SFTP commands
            commands::sftp_commands::create_sftp_session,
            commands::sftp_commands::sftp_list_directory,
            commands::sftp_commands::sftp_upload_file,
            commands::sftp_commands::sftp_download_file,
            commands::sftp_commands::sftp_create_directory,
            commands::sftp_commands::sftp_delete_path,
            commands::sftp_commands::sftp_rename_path,
            commands::sftp_commands::close_sftp_session,
            // Local FS commands
            commands::fs_commands::get_local_home_directory,
            commands::fs_commands::list_local_directory,
            commands::fs_commands::get_local_file_info,
            commands::fs_commands::create_local_directory,
            commands::fs_commands::delete_local_path,
            commands::fs_commands::rename_local_path,
            commands::fs_commands::local_path_exists,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
