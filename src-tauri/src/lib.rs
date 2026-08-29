use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
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

// =========================================================================
// SECURITY BOUNDARY & PATH VALIDATION HELPERS
// =========================================================================

/// Validates that an identifier (such as project_id or document_id) is safe against directory traversal.
/// Rejects empty strings, strings exceeding 128 chars, path traversal sequences (`..`),
/// directory separators (`/`, `\`), null bytes, Windows path symbols, and control characters.
pub fn validate_safe_id(id: &str, field_name: &str) -> Result<(), String> {
    if id.is_empty() {
        return Err(format!("Security error: {} cannot be empty", field_name));
    }
    if id.len() > 128 {
        return Err(format!("Security error: {} exceeds maximum allowed length of 128 characters", field_name));
    }
    if id.contains("..") || id.contains('/') || id.contains('\\') || id.contains('\0') || id.contains(':') {
        return Err(format!("Security error: {} contains illegal characters or path traversal sequence", field_name));
    }
    if !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
        return Err(format!("Security error: {} contains invalid characters (only alphanumeric, '-' and '_' allowed)", field_name));
    }
    Ok(())
}

/// Sanitizes and validates a document filename.
/// Ensures that no path components, traversal tokens, reserved Windows filenames, or control characters exist.
pub fn sanitize_and_validate_filename(raw_filename: &str) -> Result<String, String> {
    if raw_filename.is_empty() {
        return Err("Security error: Filename cannot be empty".to_string());
    }
    if raw_filename.contains('\0') || raw_filename.contains('/') || raw_filename.contains('\\') || raw_filename.contains("..") {
        return Err("Security error: Filename contains illegal path characters or traversal sequence".to_string());
    }

    let path = Path::new(raw_filename);
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Security error: Invalid filename format".to_string())?
        .trim();

    if filename.is_empty() || filename.len() > 255 {
        return Err("Security error: Filename length must be between 1 and 255 characters".to_string());
    }

    // Reject Windows reserved device names (CON, PRN, AUX, NUL, COM1..9, LPT1..9)
    let stem = Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_uppercase();

    const RESERVED_NAMES: &[&str] = &[
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
        "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3",
        "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
    ];

    if RESERVED_NAMES.contains(&stem.as_str()) {
        return Err(format!("Security error: Filename '{}' uses reserved device name", filename));
    }

    Ok(filename.to_string())
}

/// Validates file extension against allowed document types.
pub fn validate_and_classify_extension(filename: &str) -> Result<(&'static str, String), String> {
    let p = Path::new(filename);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let format = match ext.as_str() {
        "pdf" => "PDF",
        "dwg" => "DWG",
        "dxf" => "DXF",
        "bim" | "rvt" | "ifc" => "BIM",
        "tiff" | "tif" => "TIFF",
        "xlsx" | "xls" | "csv" => "Excel",
        _ => {
            return Err(format!(
                "Unsupported file extension '.{}'. Supported: PDF, DWG, DXF, BIM, TIFF, Excel",
                ext
            ));
        }
    };

    Ok((format, ext))
}

/// Normalizes path representations (strips Windows `\\?\` UNC prefixes for uniform comparisons).
pub fn normalize_path(path: &Path) -> PathBuf {
    let path_str = path.to_string_lossy();
    if path_str.starts_with(r"\\?\") {
        PathBuf::from(&path_str[4..])
    } else {
        path.to_path_buf()
    }
}

/// Verifies that `target_path` is strictly contained within `base_boundary` after canonicalization.
pub fn verify_path_containment(target_path: &Path, base_boundary: &Path) -> Result<PathBuf, String> {
    let canonical_boundary = base_boundary
        .canonicalize()
        .map_err(|e| format!("Failed to resolve base boundary path: {}", e))?;

    let canonical_target = target_path
        .canonicalize()
        .map_err(|e| format!("Failed to resolve target path: {}", e))?;

    let norm_boundary = normalize_path(&canonical_boundary);
    let norm_target = normalize_path(&canonical_target);

    if !norm_target.starts_with(&norm_boundary) {
        return Err(format!(
            "Security violation: Path '{}' escapes designated security boundary '{}'",
            target_path.display(),
            base_boundary.display()
        ));
    }

    Ok(canonical_target)
}

// =========================================================================
// HARDENED STAGING & RETRIEVAL IMPLEMENTATIONS
// =========================================================================

pub fn stage_project_document_impl(
    app_data_dir: &Path,
    project_id: String,
    document_id: String,
    source_path: String,
) -> Result<DocumentStagingResponse, String> {
    validate_safe_id(&project_id, "project_id")?;
    validate_safe_id(&document_id, "document_id")?;

    let src = Path::new(&source_path);
    if !src.exists() || !src.is_file() {
        return Err("Source document does not exist or is not an accessible file".to_string());
    }

    let raw_filename = src
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Source path does not contain a valid filename".to_string())?;

    let filename = sanitize_and_validate_filename(raw_filename)?;
    let (format, _ext) = validate_and_classify_extension(&filename)?;

    let metadata = std::fs::metadata(src).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size_bytes = metadata.len();
    let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);

    if size_mb > 500.0 {
        return Err(format!("File size ({:.1} MB) exceeds maximum limit of 500 MB", size_mb));
    }

    // Ensure root app data dir exists
    std::fs::create_dir_all(app_data_dir)
        .map_err(|e| format!("Failed to initialize app data directory: {}", e))?;

    let target_dir = app_data_dir
        .join("projects")
        .join(&project_id)
        .join("documents")
        .join(&document_id);

    std::fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create project document directory: {}", e))?;

    // Verify target directory is strictly contained within app data boundary
    verify_path_containment(&target_dir, app_data_dir)?;

    let target_file = target_dir.join(&filename);

    // Copy file into validated project document storage directory
    std::fs::copy(src, &target_file)
        .map_err(|e| format!("Failed to stage document file: {}", e))?;

    // Verify written file is strictly contained within target directory
    let canonical_target_file = verify_path_containment(&target_file, &target_dir)?;

    let staged_path = canonical_target_file.to_string_lossy().to_string();
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
        is_supported: true,
    })
}

pub fn read_project_document_bytes_impl(
    app_data_dir: &Path,
    project_id: String,
    document_id: String,
) -> Result<Vec<u8>, String> {
    validate_safe_id(&project_id, "project_id")?;
    validate_safe_id(&document_id, "document_id")?;

    let doc_dir = app_data_dir
        .join("projects")
        .join(&project_id)
        .join("documents")
        .join(&document_id);

    if !doc_dir.exists() || !doc_dir.is_dir() {
        return Err(format!(
            "Document directory not found for project {} and document {}",
            project_id, document_id
        ));
    }

    // Verify document directory is contained within app data directory
    let canonical_doc_dir = verify_path_containment(&doc_dir, app_data_dir)?;

    let entries = std::fs::read_dir(&canonical_doc_dir)
        .map_err(|e| format!("Failed to read document directory: {}", e))?;

    let first_file = entries
        .filter_map(|entry| entry.ok())
        .map(|e| e.path())
        .find(|p| p.is_file())
        .ok_or_else(|| "No document file found in staging directory".to_string())?;

    // Verify file is contained within canonical document directory
    let canonical_file = verify_path_containment(&first_file, &canonical_doc_dir)?;

    std::fs::read(&canonical_file).map_err(|e| format!("Failed to read document bytes: {}", e))
}

// =========================================================================
// TAURI COMMANDS
// =========================================================================

#[tauri::command]
fn inspect_document_file(project_id: String, path: String) -> Result<DocumentMetadataResponse, String> {
    validate_safe_id(&project_id, "project_id")?;

    let p = Path::new(&path);
    if !p.exists() || !p.is_file() {
        return Err("Selected path is not a valid accessible file".to_string());
    }

    let raw_filename = p
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "Selected path does not contain a valid filename".to_string())?;

    let filename = sanitize_and_validate_filename(raw_filename)?;
    let (format, _ext) = validate_and_classify_extension(&filename)?;

    let metadata = std::fs::metadata(p).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size_bytes = metadata.len();
    let size_mb = (size_bytes as f64) / (1024.0 * 1024.0);

    if size_mb > 500.0 {
        return Err(format!("File size ({:.1} MB) exceeds maximum limit of 500 MB", size_mb));
    }

    let storage_reference = format!("projects/{}/documents/{}", project_id, filename);

    Ok(DocumentMetadataResponse {
        filename,
        file_path: path,
        size_bytes,
        size_mb: (size_mb * 100.0).round() / 100.0,
        format: format.to_string(),
        is_supported: true,
        storage_reference,
    })
}

#[tauri::command]
fn stage_project_document(
    app_handle: tauri::AppHandle,
    project_id: String,
    document_id: String,
    source_path: String,
) -> Result<DocumentStagingResponse, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    stage_project_document_impl(&app_data_dir, project_id, document_id, source_path)
}

#[tauri::command]
fn read_project_document_bytes(
    app_handle: tauri::AppHandle,
    project_id: String,
    document_id: String,
) -> Result<Vec<u8>, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data directory: {}", e))?;

    read_project_document_bytes_impl(&app_data_dir, project_id, document_id)
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
            read_project_document_bytes,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// =========================================================================
// UNIT & INTEGRATION TESTS
// =========================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_validate_safe_id_accepts_valid_identifiers() {
        assert!(validate_safe_id("proj_123", "project_id").is_ok());
        assert!(validate_safe_id("doc-abc-456", "document_id").is_ok());
        assert!(validate_safe_id("p1", "project_id").is_ok());
        assert!(validate_safe_id("UUID-9876_XYZ", "id").is_ok());
    }

    #[test]
    fn test_validate_safe_id_rejects_path_traversal_attempts() {
        let bad_ids = [
            "../etc",
            "../../etc/passwd",
            "..\\windows\\system32",
            "..\\..\\..\\windows\\system32",
            "../../../var/log",
            "foo/bar",
            "foo\\bar",
            "foo\0bar",
            "C:\\Windows",
            "/etc/shadow",
            "proj:123",
            "proj*test",
            "proj?test",
            "proj<test>",
            "proj|test",
            "",
            "   ",
            ".",
            "..",
        ];

        for bad in bad_ids {
            let res = validate_safe_id(bad, "test_id");
            assert!(res.is_err(), "Expected identifier '{}' to be rejected", bad);
            let err = res.unwrap_err();
            assert!(err.contains("Security error") || err.contains("cannot be empty"));
        }
    }

    #[test]
    fn test_sanitize_and_validate_filename_valid() {
        assert_eq!(sanitize_and_validate_filename("drawing.pdf").unwrap(), "drawing.pdf");
        assert_eq!(sanitize_and_validate_filename("floor_plan_E104.dwg").unwrap(), "floor_plan_E104.dwg");
        assert_eq!(sanitize_and_validate_filename("feeder_schedule.xlsx").unwrap(), "feeder_schedule.xlsx");
        assert_eq!(sanitize_and_validate_filename("building_model.ifc").unwrap(), "building_model.ifc");
    }

    #[test]
    fn test_sanitize_and_validate_filename_rejects_traversal_and_reserved_names() {
        let bad_filenames = [
            "../../passwd.pdf",
            "..\\..\\windows\\system32\\cmd.exe",
            "CON.pdf",
            "NUL.dwg",
            "COM1.xlsx",
            "AUX.tif",
            "PRN.pdf",
            "file\0name.pdf",
            "../drawing.pdf",
            "sub/drawing.pdf",
            "sub\\drawing.pdf",
            "",
        ];

        for bad in bad_filenames {
            let res = sanitize_and_validate_filename(bad);
            assert!(res.is_err(), "Expected filename '{}' to be rejected", bad);
        }
    }

    #[test]
    fn test_validate_and_classify_extension() {
        assert_eq!(validate_and_classify_extension("test.pdf").unwrap().0, "PDF");
        assert_eq!(validate_and_classify_extension("model.DWG").unwrap().0, "DWG");
        assert_eq!(validate_and_classify_extension("sheet.DXF").unwrap().0, "DXF");
        assert_eq!(validate_and_classify_extension("arch.ifc").unwrap().0, "BIM");
        assert_eq!(validate_and_classify_extension("scan.TIFF").unwrap().0, "TIFF");
        assert_eq!(validate_and_classify_extension("takeoff.XLSX").unwrap().0, "Excel");
        assert_eq!(validate_and_classify_extension("items.csv").unwrap().0, "Excel");

        assert!(validate_and_classify_extension("script.sh").is_err());
        assert!(validate_and_classify_extension("program.exe").is_err());
        assert!(validate_and_classify_extension("malicious.bat").is_err());
    }

    #[test]
    fn test_stage_project_document_success() {
        let tmp_app_dir = tempdir().unwrap();
        let tmp_src_dir = tempdir().unwrap();

        let source_file = tmp_src_dir.path().join("drawing_E101.pdf");
        std::fs::write(&source_file, b"%PDF-1.4 Mock Electrical Drawing Data").unwrap();

        let res = stage_project_document_impl(
            tmp_app_dir.path(),
            "proj-101".to_string(),
            "doc-001".to_string(),
            source_file.to_string_lossy().to_string(),
        );

        assert!(res.is_ok(), "Staging should succeed: {:?}", res.err());
        let staging_info = res.unwrap();
        assert_eq!(staging_info.filename, "drawing_E101.pdf");
        assert_eq!(staging_info.format, "PDF");
        assert_eq!(staging_info.local_reference, "projects/proj-101/documents/doc-001/drawing_E101.pdf");

        // Verify staged file actually exists at staged_path
        let staged_path = Path::new(&staging_info.staged_path);
        assert!(staged_path.exists());
        assert_eq!(std::fs::read(staged_path).unwrap(), b"%PDF-1.4 Mock Electrical Drawing Data");
    }

    #[test]
    fn test_stage_project_document_rejects_path_traversal() {
        let tmp_app_dir = tempdir().unwrap();
        let tmp_src_dir = tempdir().unwrap();

        let source_file = tmp_src_dir.path().join("valid_drawing.pdf");
        std::fs::write(&source_file, b"content").unwrap();

        // 1. Traversal in project_id
        let res1 = stage_project_document_impl(
            tmp_app_dir.path(),
            "../../../etc".to_string(),
            "doc-1".to_string(),
            source_file.to_string_lossy().to_string(),
        );
        assert!(res1.is_err());
        assert!(res1.unwrap_err().contains("Security error"));

        // 2. Traversal in project_id on Windows
        let res2 = stage_project_document_impl(
            tmp_app_dir.path(),
            "..\\..\\windows\\system32".to_string(),
            "doc-1".to_string(),
            source_file.to_string_lossy().to_string(),
        );
        assert!(res2.is_err());
        assert!(res2.unwrap_err().contains("Security error"));

        // 3. Traversal in document_id
        let res3 = stage_project_document_impl(
            tmp_app_dir.path(),
            "p1".to_string(),
            "../../escape_doc".to_string(),
            source_file.to_string_lossy().to_string(),
        );
        assert!(res3.is_err());
        assert!(res3.unwrap_err().contains("Security error"));
    }

    #[test]
    fn test_read_project_document_bytes_success() {
        let tmp_app_dir = tempdir().unwrap();
        let tmp_src_dir = tempdir().unwrap();

        let source_file = tmp_src_dir.path().join("spec_sheet.pdf");
        let sample_data = b"Sample Specification Content for Feeder Verification";
        std::fs::write(&source_file, sample_data).unwrap();

        stage_project_document_impl(
            tmp_app_dir.path(),
            "proj-a".to_string(),
            "doc-b".to_string(),
            source_file.to_string_lossy().to_string(),
        ).unwrap();

        let read_res = read_project_document_bytes_impl(
            tmp_app_dir.path(),
            "proj-a".to_string(),
            "doc-b".to_string(),
        );

        assert!(read_res.is_ok());
        assert_eq!(read_res.unwrap(), sample_data);
    }

    #[test]
    fn test_read_project_document_bytes_rejects_path_traversal() {
        let tmp_app_dir = tempdir().unwrap();

        // 1. Path traversal in project_id
        let res1 = read_project_document_bytes_impl(
            tmp_app_dir.path(),
            "../../../etc".to_string(),
            "passwd".to_string(),
        );
        assert!(res1.is_err());
        assert!(res1.unwrap_err().contains("Security error"));

        // 2. Windows traversal in document_id
        let res2 = read_project_document_bytes_impl(
            tmp_app_dir.path(),
            "p1".to_string(),
            "..\\..\\windows\\system32".to_string(),
        );
        assert!(res2.is_err());
        assert!(res2.unwrap_err().contains("Security error"));
    }
}
