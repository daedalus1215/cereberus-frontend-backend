mod config;
#[cfg(target_os = "android")]
mod spike;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())
    .plugin(tauri_plugin_http::init())
    .plugin(tauri_plugin_opener::init());

  // Called from Rust, so it needs no permission in capabilities/default.json, and the
  // webview can't reach it.
  #[cfg(target_os = "android")]
  let builder = builder
    .plugin(tauri_plugin_biometric::init())
    .invoke_handler(tauri::generate_handler![
      config::get_api_config,
      config::save_api_config,
      spike::spike_results,
      spike::spike_encrypt,
      spike::spike_decrypt,
      spike::spike_timing
    ]);

  #[cfg(not(target_os = "android"))]
  let builder = builder.invoke_handler(tauri::generate_handler![
    config::get_api_config,
    config::save_api_config
  ]);

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
