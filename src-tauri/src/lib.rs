use serde::{Deserialize, Serialize};
use tauri::Manager;

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DocumentStagingResponse {
    pub document_id: String,
    pub filename: String,
    pub original_path: String,
    pub staged_path: String,
    pub local_reference: String,
    pub size_bytes: u64,
    pub size_mb: f64,
    pub format: String,
    pub is_supported: bool,
}

#[tauri::command]
fn stage_project_document(
    app_handle: tauri::AppHandle,
    project_id: String,
    document_id: String,
    source_path: String,
) -> Result<DocumentStagingResponse, String> {
    let src = std::path::Path::new(&source_path);
    if !src.exists() || !src.is_file() {
        return Err("Source document does not exist or is not an accessible file".to_string());
    }

    let filename = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document")
        .to_string();

    let ext = src
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

    let metadata = std::fs::metadata(src).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size_bytes = metadata.len();
    let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);

    if size_mb > 500.0 {
        return Err(format!("File size ({:.1} MB) exceeds maximum limit of 500 MB", size_mb));
    }

    // Resolve app data directory for staging
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    let target_dir = app_data_dir
        .join("projects")
        .join(&project_id)
        .join("documents")
        .join(&document_id);

    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create project document directory: {}", e))?;

    let target_file = target_dir.join(&filename);

    // Copy file into project storage directory
    std::fs::copy(src, &target_file)
        .map_err(|e| format!("Failed to stage document file: {}", e))?;

    let staged_path = target_file.to_string_lossy().to_string();
    let local_reference = format!("projects/{}/documents/{}/{}", project_id, document_id, filename);

    Ok(DocumentStagingResponse {
        document_id,
        filename,
        original_path: source_path,
        staged_path,
        local_reference,
        size_bytes,
        size_mb: (size_mb * 100.0).round() / 100.0,
        format: format.to_string(),
        is_supported,
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
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app.get_webview_window("main").map(|w| {
                let _ = w.show();
                let _ = w.set_focus();
                let _ = w.unminimize();
            });
        }))
        .invoke_handler(tauri::generate_handler![
            get_engine_status,
            get_platform_info,
            inspect_document_file,
            stage_project_document,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
