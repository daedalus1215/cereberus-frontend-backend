use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

const CONFIG_FILE_NAME: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiConfig {
    pub api_base_url: String,
    pub cf_access_client_id: String,
    pub cf_access_client_secret: String,
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("could not resolve app config dir: {e}"))?;
    Ok(dir.join(CONFIG_FILE_NAME))
}

#[tauri::command]
pub fn get_api_config(app: AppHandle) -> Result<Option<ApiConfig>, String> {
    let path = config_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("could not read config: {e}"))?;
    let config: ApiConfig =
        serde_json::from_str(&raw).map_err(|e| format!("could not parse config: {e}"))?;
    Ok(Some(config))
}

#[tauri::command]
pub fn save_api_config(app: AppHandle, config: ApiConfig) -> Result<(), String> {
    let path = config_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("could not create config dir: {e}"))?;
    }
    let raw = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("could not serialize config: {e}"))?;
    write_private(&path, &raw).map_err(|e| format!("could not write config: {e}"))?;
    Ok(())
}

// The config holds the Cloudflare Access client secret, so keep it readable
// by the owning user only.
#[cfg(unix)]
fn write_private(path: &Path, contents: &str) -> std::io::Result<()> {
    use std::io::Write;
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

    let mut file = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)?;
    // `mode` only applies when the file is created; tighten a pre-existing
    // one before writing the secret into it.
    file.set_permissions(fs::Permissions::from_mode(0o600))?;
    file.write_all(contents.as_bytes())
}

#[cfg(not(unix))]
fn write_private(path: &Path, contents: &str) -> std::io::Result<()> {
    fs::write(path, contents)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    fn mode_of(path: &Path) -> u32 {
        fs::metadata(path).unwrap().permissions().mode() & 0o777
    }

    #[test]
    fn write_private_creates_owner_only_file() {
        let path = std::env::temp_dir().join(format!("cereberus-config-new-{}", std::process::id()));
        let _ = fs::remove_file(&path);

        write_private(&path, "secret").unwrap();

        assert_eq!(mode_of(&path), 0o600);
        assert_eq!(fs::read_to_string(&path).unwrap(), "secret");
        fs::remove_file(&path).unwrap();
    }

    #[test]
    fn write_private_tightens_existing_file() {
        let path = std::env::temp_dir().join(format!("cereberus-config-old-{}", std::process::id()));
        fs::write(&path, "old contents that are longer").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();

        write_private(&path, "new").unwrap();

        assert_eq!(mode_of(&path), 0o600);
        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
        fs::remove_file(&path).unwrap();
    }
}
