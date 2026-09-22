use std::path::PathBuf;
use std::sync::Mutex;

use zlynstall_core::{
    detect_system, HostVerifier, InstallPlan, PackageModel, Settings, SystemInfo,
};

#[derive(Default)]
pub struct AppState {
    pub settings: Mutex<Option<Settings>>,
}

#[tauri::command]
pub fn get_system_info() -> SystemInfo {
    detect_system()
}

#[tauri::command]
pub fn get_settings(state: tauri::State<'_, AppState>) -> Settings {
    let mut guard = state.settings.lock().expect("settings lock");
    guard.get_or_insert_with(Settings::load).clone()
}

#[tauri::command]
pub fn set_settings(state: tauri::State<'_, AppState>, settings: Settings) -> Result<(), String> {
    settings
        .save()
        .map_err(|e| format!("Could not save settings: {e}"))?;
    *state.settings.lock().expect("settings lock") = Some(settings);
    Ok(())
}

#[tauri::command]
pub fn get_startup_files() -> Vec<String> {
    crate::startup_files()
}

#[tauri::command]
pub async fn inspect_file(path: String) -> Result<PackageModel, String> {
    let path = PathBuf::from(path);
    tauri::async_runtime::spawn_blocking(move || {
        zlynstall_core::inspect(&path).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn plan_install(model: PackageModel) -> Result<InstallPlan, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let system = detect_system();
        let verifier = HostVerifier::new(system.family);
        zlynstall_core::plan(&model, &system, &verifier)
    })
    .await
    .map_err(|e| e.to_string())
}

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::ipc::Channel;
use zlynstall_core::{InstallOptions, InstalledEntry, JobContext, JobEvent, Registry};

#[derive(Default)]
pub struct JobState {
    pub cancel: Mutex<Option<Arc<AtomicBool>>>,
}

async fn pump(mut rx: tokio::sync::mpsc::UnboundedReceiver<JobEvent>, on_event: Channel<JobEvent>) {
    while let Some(ev) = rx.recv().await {
        let _ = on_event.send(ev);
    }
}

#[tauri::command]
pub async fn run_install(
    app_state: tauri::State<'_, AppState>,
    job_state: tauri::State<'_, JobState>,
    plan: zlynstall_core::InstallPlan,
    options: InstallOptions,
    on_event: Channel<JobEvent>,
) -> Result<(), String> {
    let settings = app_state
        .settings
        .lock()
        .expect("settings lock")
        .clone()
        .unwrap_or_else(Settings::load);
    let system = detect_system();
    let cancel = Arc::new(AtomicBool::new(false));
    *job_state.cancel.lock().expect("cancel lock") = Some(cancel.clone());

    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let ctx = JobContext::new(plan, options, system, settings, tx, cancel);
    let job = tauri::async_runtime::spawn(zlynstall_core::job::run(ctx));
    pump(rx, on_event).await;
    job.await.map_err(|e| e.to_string())?;
    *job_state.cancel.lock().expect("cancel lock") = None;
    Ok(())
}

#[tauri::command]
pub fn cancel_job(job_state: tauri::State<'_, JobState>) {
    if let Some(flag) = job_state.cancel.lock().expect("cancel lock").as_ref() {
        flag.store(true, Ordering::Relaxed);
    }
}

#[tauri::command]
pub fn list_installed() -> Vec<InstalledEntry> {
    Registry::load().entries
}

#[tauri::command]
pub async fn uninstall_entry(
    id: String,
    on_event: Channel<JobEvent>,
) -> Result<InstalledEntry, String> {
    let system = detect_system();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let pumping = tauri::async_runtime::spawn(pump(rx, on_event));
    let result = zlynstall_core::manage::uninstall(&id, &system, &tx).await;
    drop(tx);
    let _ = pumping.await;
    result.map_err(|e| e.message)
}

#[tauri::command]
pub async fn repair_entry(
    id: String,
    on_event: Channel<JobEvent>,
) -> Result<InstalledEntry, String> {
    let system = detect_system();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let pumping = tauri::async_runtime::spawn(pump(rx, on_event));
    let result = zlynstall_core::manage::repair(&id, &system, &tx).await;
    drop(tx);
    let _ = pumping.await;
    result.map_err(|e| e.message)
}

#[tauri::command]
pub fn launch_entry(id: String) -> Result<(), String> {
    let registry = Registry::load();
    let entry = registry
        .find(&id)
        .ok_or("That entry is no longer in the library.")?;
    zlynstall_core::manage::launch(entry)
}

#[tauri::command]
pub async fn install_tool(package: String, on_event: Channel<JobEvent>) -> Result<(), String> {
    let system = detect_system();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let pumping = tauri::async_runtime::spawn(pump(rx, on_event));
    let result = zlynstall_core::manage::install_tool(&package, &system, &tx).await;
    drop(tx);
    let _ = pumping.await;
    result.map_err(|e| e.message)
}

#[tauri::command]
pub async fn uninstall_entries(
    ids: Vec<String>,
    on_event: Channel<JobEvent>,
) -> zlynstall_core::manage::BulkResult {
    let system = detect_system();
    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
    let pumping = tauri::async_runtime::spawn(pump(rx, on_event));
    let result = zlynstall_core::manage::uninstall_many(&ids, &system, &tx).await;
    drop(tx);
    let _ = pumping.await;
    result
}

#[tauri::command]
pub async fn scan_updates() -> Vec<zlynstall_core::update::UpdateCandidate> {
    tauri::async_runtime::spawn_blocking(zlynstall_core::manage::scan_updates)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub fn set_update_dir(id: String, dir: Option<String>) -> Result<InstalledEntry, String> {
    zlynstall_core::manage::set_update_dir(&id, dir.map(PathBuf::from))
}

#[tauri::command]
pub fn ignore_version(id: String, version: String) -> Result<InstalledEntry, String> {
    zlynstall_core::manage::ignore_version(&id, &version)
}

#[tauri::command]
pub fn set_desktop_shortcut(id: String, want: bool) -> Result<InstalledEntry, String> {
    zlynstall_core::manage::set_desktop_shortcut(&id, want)
}

#[tauri::command]
pub fn desktop_shortcut_ids() -> Vec<String> {
    Registry::load()
        .entries
        .iter()
        .filter(|e| zlynstall_core::manage::has_desktop_shortcut(e))
        .map(|e| e.id.clone())
        .collect()
}

use zlynstall_core::elevate;
use zlynstall_core::PrivilegeMode;

#[derive(Default)]
pub struct AuthState {
    pub keepalive: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivilegeStatus {
    pub mode: PrivilegeMode,
    pub sudo_available: bool,
    pub pkexec_available: bool,
    pub unlocked: bool,
    pub is_root: bool,
}

#[tauri::command]
pub async fn privilege_status(
    app_state: tauri::State<'_, AppState>,
) -> Result<PrivilegeStatus, String> {
    let mode = app_state
        .settings
        .lock()
        .expect("settings lock")
        .clone()
        .unwrap_or_else(Settings::load)
        .privilege_mode;
    Ok(
        tauri::async_runtime::spawn_blocking(move || PrivilegeStatus {
            mode,
            sudo_available: elevate::sudo_path().is_some(),
            pkexec_available: zlynstall_core::distro::which("pkexec").is_some(),
            unlocked: mode == PrivilegeMode::Session && elevate::session_unlocked(),
            is_root: zlynstall_core::detect_system().is_root,
        })
        .await
        .map_err(|e| e.to_string())?,
    )
}

#[tauri::command]
pub async fn unlock_session(
    auth: tauri::State<'_, AuthState>,
    password: String,
) -> Result<(), elevate::UnlockError> {
    tauri::async_runtime::spawn_blocking(move || elevate::session_unlock(&password))
        .await
        .map_err(|e| elevate::UnlockError::Io {
            message: e.to_string(),
        })??;

    let handle = tauri::async_runtime::spawn(async {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(240)).await;
            let alive = tauri::async_runtime::spawn_blocking(elevate::session_refresh)
                .await
                .unwrap_or(false);
            if !alive {
                break;
            }
        }
    });
    if let Some(old) = auth
        .keepalive
        .lock()
        .expect("keepalive lock")
        .replace(handle)
    {
        old.abort();
    }
    Ok(())
}

#[tauri::command]
pub async fn lock_session(auth: tauri::State<'_, AuthState>) -> Result<(), String> {
    if let Some(h) = auth.keepalive.lock().expect("keepalive lock").take() {
        h.abort();
    }
    tauri::async_runtime::spawn_blocking(elevate::session_lock)
        .await
        .map_err(|e| e.to_string())
}
