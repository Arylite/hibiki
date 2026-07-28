mod alerts;
mod commands;
mod db;
mod models;
mod nowplaying;
mod server;
mod state;
mod twitch;

use std::sync::Arc;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use state::AppState;

/// Brings the window back from the tray, wherever it was hidden from.
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            let data_dir = app.path().app_data_dir().expect("no app data dir available");
            std::fs::create_dir_all(&data_dir).expect("failed to create app data dir");
            let media_dir = data_dir.join("media");
            std::fs::create_dir_all(&media_dir).expect("failed to create media dir");
            let conn = db::init(&data_dir.join("hibiki.db"));
            let settings = db::load_settings(&conn);
            let port = settings.ws_port;
            let has_credentials = db::load_credentials(&conn).is_some();

            // The window shows Twitch credentials, so it stays out of screen
            // captures by default.
            commands::apply_capture_protection(app.handle(), settings.hide_from_capture);

            let state = Arc::new(AppState::new(conn, media_dir));
            app.manage(state.clone());

            tauri::async_runtime::spawn(server::run(state.clone(), app_handle.clone(), port));
            nowplaying::spawn(state.clone(), app_handle.clone());

            if has_credentials {
                twitch::eventsub::spawn(state.clone(), app_handle.clone());
            }

            // The tray is the only way back from a hidden window, but a missing
            // icon must not take the whole app down with it.
            let Some(icon) = app.default_window_icon().cloned() else {
                eprintln!("warning: no window icon available, skipping tray icon");
                return Ok(());
            };
            let open_item = MenuItem::with_id(app, "open", "Open Hibiki", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Hibiki", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;
            TrayIconBuilder::with_id("main")
                .icon(icon)
                .tooltip("Hibiki")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_settings,
            commands::update_settings,
            commands::get_alert_styles,
            commands::update_alert_style,
            commands::import_media,
            commands::hide_to_tray,
            commands::get_now_playing,
            commands::media_command,
            commands::clear_alert_history,
            commands::reset_goal,
            commands::get_auth_status,
            commands::get_recent_alerts,
            commands::get_recent_chat,
            commands::get_server_status,
            commands::send_test_alert,
            commands::start_login,
            commands::logout,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
