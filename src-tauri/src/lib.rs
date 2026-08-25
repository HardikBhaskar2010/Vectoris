use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EngineStatusResponse {
    pub status: String,
    pub message: String,
    pub is_tauri: bool,
    pub platform: String,
    pub arch: String,
    pub app_version: String,
    pub core_connected: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlatformInfoResponse {
    pub os: String,
    pub arch: String,
    pub app_version: String,
    pub is_desktop: bool,
}

#[tauri::command]
fn get_engine_status() -> EngineStatusResponse {
    EngineStatusResponse {
        status: "standby".to_string(),
        message: "Desktop shell active · Local inference engine in standby".to_string(),
        is_tauri: true,
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        core_connected: false,
    }
}

#[tauri::command]
fn get_platform_info() -> PlatformInfoResponse {
    PlatformInfoResponse {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        is_desktop: true,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_engine_status,
            get_platform_info,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
