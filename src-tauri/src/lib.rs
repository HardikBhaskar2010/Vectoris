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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DocumentMetadataResponse {
    pub filename: String,
    pub file_path: String,
    pub size_bytes: u64,
    pub size_mb: f64,
    pub format: String,
    pub is_supported: bool,
    pub storage_reference: String,
}

#[tauri::command]
fn inspect_document_file(project_id: String, path: String) -> Result<DocumentMetadataResponse, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() || !p.is_file() {
        return Err("Selected path is not a valid accessible file".to_string());
    }

    let filename = p
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document")
        .to_string();

    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let (format, is_supported) = match ext.as_str() {
        "pdf" => ("PDF", true),
        "dwg" => ("DWG", true),
        "dxf" => ("DXF", true),
        "bim" | "rvt" | "ifc" => ("BIM", true),
        "tiff" | "tif" => ("TIFF", true),
        "xlsx" | "xls" | "csv" => ("Excel", true),
        _ => ("Other", false),
    };

    if !is_supported {
        return Err(format!(
            "Unsupported file extension '.{}'. Supported: PDF, DWG, DXF, BIM, TIFF, Excel",
            ext
        ));
    }

    let metadata = std::fs::metadata(p).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size_bytes = metadata.len();
    let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);

    if size_mb > 500.0 {
        return Err(format!("File size ({:.1} MB) exceeds maximum limit of 500 MB", size_mb));
    }

    // App-owned storage reference: projects/<project_id>/documents/<filename>
    let storage_reference = format!("projects/{}/documents/{}", project_id, filename);

    Ok(DocumentMetadataResponse {
        filename,
        file_path: path,
        size_bytes,
        size_mb: (size_mb * 100.0).round() / 100.0,
        format: format.to_string(),
        is_supported,
        storage_reference,
    })
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
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_engine_status,
            get_platform_info,
            inspect_document_file,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
