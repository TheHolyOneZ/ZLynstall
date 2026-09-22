mod commands;

use tauri::{Emitter, Manager};

fn package_args(args: impl IntoIterator<Item = String>) -> Vec<String> {
    args.into_iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .filter_map(|a| {
            let a = a.strip_prefix("file://").unwrap_or(&a).to_string();
            std::fs::canonicalize(&a)
                .ok()
                .map(|p| p.to_string_lossy().into_owned())
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let paths = package_args(args);
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            if !paths.is_empty() {
                let _ = app.emit("zlynstall://open-files", paths);
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(commands::AppState::default())
        .manage(commands::JobState::default())
        .manage(commands::AuthState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_system_info,
            commands::get_settings,
            commands::set_settings,
            commands::get_startup_files,
            commands::inspect_file,
            commands::plan_install,
            commands::run_install,
            commands::cancel_job,
            commands::list_installed,
            commands::uninstall_entry,
            commands::repair_entry,
            commands::launch_entry,
            commands::install_tool,
            commands::uninstall_entries,
            commands::scan_updates,
            commands::set_update_dir,
            commands::ignore_version,
            commands::set_desktop_shortcut,
            commands::desktop_shortcut_ids,
            commands::privilege_status,
            commands::unlock_session,
            commands::lock_session,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                zlynstall_core::elevate::session_lock();
            }
        });
}

pub(crate) fn startup_files() -> Vec<String> {
    package_args(std::env::args())
}
