use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::alerts::AlertStyles;
use crate::models::{Alert, AlertKind, AlertStyle, ChatMessage, PublicUser, Settings};
use crate::nowplaying::{self, NowPlaying};
use crate::state::AppState;
use crate::{alerts, db, server, twitch};

#[tauri::command]
pub fn get_settings(state: State<'_, Arc<AppState>>) -> Settings {
    db::load_settings(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn update_settings(state: State<'_, Arc<AppState>>, settings: Settings) -> Settings {
    db::save_settings(&state.db.lock().unwrap(), &settings);
    push_overlay_config(&state);
    settings
}

#[tauri::command]
pub fn get_alert_styles(state: State<'_, Arc<AppState>>) -> AlertStyles {
    db::load_alert_styles(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn update_alert_style(
    state: State<'_, Arc<AppState>>,
    kind: AlertKind,
    style: AlertStyle,
) -> AlertStyles {
    let styles = {
        let conn = state.db.lock().unwrap();
        let mut styles = db::load_alert_styles(&conn);
        styles.set(kind, style);
        db::save_alert_styles(&conn, &styles);
        styles
    };
    push_overlay_config(&state);
    styles
}

const MAX_MEDIA_BYTES: usize = 25 * 1024 * 1024;

/// Copies a picked image/sound into the managed media dir and returns the
/// name the overlay should request. The client-supplied name is never used as
/// a path - only its extension survives - so a hostile name cannot escape the
/// directory.
#[tauri::command]
pub fn import_media(
    state: State<'_, Arc<AppState>>,
    file_name: String,
    data: String,
) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data.as_bytes())
        .map_err(|_| "could not decode file".to_string())?;
    if bytes.is_empty() {
        return Err("file is empty".to_string());
    }
    if bytes.len() > MAX_MEDIA_BYTES {
        return Err(format!("file is larger than {} MB", MAX_MEDIA_BYTES / 1024 / 1024));
    }

    let ext: String = std::path::Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(8)
        .collect::<String>()
        .to_lowercase();
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let name = if ext.is_empty() {
        format!("{stamp}")
    } else {
        format!("{stamp}.{ext}")
    };

    std::fs::create_dir_all(&state.media_dir).map_err(|e| e.to_string())?;
    std::fs::write(state.media_dir.join(&name), bytes).map_err(|e| e.to_string())?;
    Ok(name)
}

/// Initial value for a freshly mounted UI - the poller only emits on change,
/// so without this the app would show nothing until the track switches.
#[tauri::command]
pub async fn get_now_playing() -> Option<NowPlaying> {
    // WinRT's .get() blocks; never run it on the window's own thread.
    tauri::async_runtime::spawn_blocking(nowplaying::current)
        .await
        .ok()
        .flatten()
}

/// Play/pause, next, previous on whichever player owns the session - the same
/// thing the keyboard's media keys do.
#[tauri::command]
pub async fn media_command(action: String) -> bool {
    tauri::async_runtime::spawn_blocking(move || nowplaying::control(&action))
        .await
        .unwrap_or(false)
}

/// Minimising sends the window to the tray instead of the taskbar - the
/// server keeps running, so alerts keep firing while it is hidden.
#[tauri::command]
pub fn hide_to_tray(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

/// Overlays already open (OBS, browser) re-render on the next frame instead of
/// needing a refresh after every tweak.
fn push_overlay_config(state: &AppState) {
    let conn = state.db.lock().unwrap();
    state.broadcast(
        "config",
        server::overlay_config(&db::load_settings(&conn), &db::load_alert_styles(&conn)),
    );
}

fn push_goal(state: &AppState) {
    let conn = state.db.lock().unwrap();
    state.broadcast("goal", server::goal_state(&db::load_settings(&conn), &conn));
}

#[tauri::command]
pub fn get_auth_status(state: State<'_, Arc<AppState>>) -> Option<PublicUser> {
    db::load_credentials(&state.db.lock().unwrap()).map(|creds| PublicUser {
        user_id: creds.user_id,
        login: creds.login,
        display_name: creds.display_name,
        profile_image_url: creds.profile_image_url,
    })
}

const DEFAULT_HISTORY_LIMIT: i64 = 100;

#[tauri::command]
pub fn get_recent_alerts(state: State<'_, Arc<AppState>>, limit: Option<i64>) -> Vec<Alert> {
    db::recent_alerts(&state.db.lock().unwrap(), limit.unwrap_or(DEFAULT_HISTORY_LIMIT))
}

#[tauri::command]
pub fn clear_alert_history(state: State<'_, Arc<AppState>>) {
    db::clear_alerts(&state.db.lock().unwrap());
}

/// Restarts goal counting from now; the history itself is left alone.
#[tauri::command]
pub fn reset_goal(state: State<'_, Arc<AppState>>) -> Settings {
    let mut settings = db::load_settings(&state.db.lock().unwrap());
    settings.goal.started_at = alerts::now_millis();
    db::save_settings(&state.db.lock().unwrap(), &settings);
    push_overlay_config(&state);
    push_goal(&state);
    settings
}

#[tauri::command]
pub fn get_server_status(state: State<'_, Arc<AppState>>) -> serde_json::Value {
    let settings = db::load_settings(&state.db.lock().unwrap());
    serde_json::json!({
        "wsPort": settings.ws_port,
        "overlayUrl": settings.overlay_url,
        "overlayClients": state.overlay_clients.load(Ordering::SeqCst),
        "eventsubConnected": state.eventsub_connected.load(Ordering::SeqCst),
        "chatReady": state.chat_ready.load(Ordering::SeqCst),
    })
}

/// The in-memory chat ring, oldest first. The window asks for it on open so
/// the feed is not blank until the next person says something.
#[tauri::command]
pub fn get_recent_chat(state: State<'_, Arc<AppState>>) -> Vec<ChatMessage> {
    twitch::chat::recent(&state, twitch::chat::BUFFER)
}

#[tauri::command]
pub async fn start_login(state: State<'_, Arc<AppState>>, app: AppHandle) -> Result<PublicUser, String> {
    let inner = state.inner().clone();
    twitch::auth::login(inner, app).await
}

#[tauri::command]
pub fn send_test_alert(state: State<'_, Arc<AppState>>, app: AppHandle, kind: AlertKind) {
    alerts::dispatch(&state, &app, alerts::sample_alert(kind));
}

#[tauri::command]
pub fn logout(state: State<'_, Arc<AppState>>, app: AppHandle) {
    twitch::eventsub::stop(&state);
    db::clear_credentials(&state.db.lock().unwrap());
    let _ = app.emit("auth-changed", Option::<PublicUser>::None);
}
