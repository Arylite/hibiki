use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use base64::Engine;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::alerts::AlertStyles;
use crate::models::{Alert, AlertKind, AlertStyle, ChatMessage, GoalWidget, Preset, PublicUser, Settings};
use crate::nowplaying::{self, NowPlaying};
use crate::state::AppState;
use crate::{alerts, db, server, twitch};

#[tauri::command]
pub fn get_settings(state: State<'_, Arc<AppState>>) -> Settings {
    db::load_settings(&state.db.lock().unwrap())
}

#[tauri::command]
pub fn update_settings(state: State<'_, Arc<AppState>>, app: AppHandle, settings: Settings) -> Settings {
    db::save_settings(&state.db.lock().unwrap(), &settings);
    // Applied on the spot: the streamer is toggling it to see the effect now.
    apply_capture_protection(&app, settings.hide_from_capture);
    push_overlay_config(&state);
    settings
}

/// Windows drops the window out of every screen capture at the compositor,
/// so nothing that records the desktop can see it. A failure is not fatal -
/// on a platform without display affinity the window is simply capturable.
pub fn apply_capture_protection(app: &AppHandle, protected: bool) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(err) = window.set_content_protected(protected) {
            eprintln!("failed to set capture protection: {err}");
        }
    }
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

/// Initial value for a freshly mounted UI: the poller only emits on change.
#[tauri::command]
pub async fn get_now_playing() -> Option<NowPlaying> {
    // WinRT's .get() blocks; never run it on the window's own thread.
    tauri::async_runtime::spawn_blocking(nowplaying::current)
        .await
        .ok()
        .flatten()
}

/// Play/pause, next, previous on whichever player owns the session.
#[tauri::command]
pub async fn media_command(action: String) -> bool {
    tauri::async_runtime::spawn_blocking(move || nowplaying::control(&action))
        .await
        .unwrap_or(false)
}

/// Hides the window to the tray. The server keeps running, so alerts keep
/// firing while it is hidden.
#[tauri::command]
pub fn hide_to_tray(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

/// Saved looks, newest first. Only the names and dates: the sheets themselves
/// are only ever needed by [`apply_preset`], which reads them here.
#[tauri::command]
pub fn get_presets(state: State<'_, Arc<AppState>>) -> Vec<serde_json::Value> {
    db::load_presets(&state.db.lock().unwrap())
        .iter()
        .map(|preset| serde_json::json!({ "name": preset.name, "savedAt": preset.saved_at }))
        .collect()
}

/// Snapshots the current look under a name, replacing one of the same name.
#[tauri::command]
pub fn save_preset(state: State<'_, Arc<AppState>>, name: String) -> Result<(), String> {
    let name = name.trim().to_string();
    if name.is_empty() {
        return Err("a preset needs a name".to_string());
    }

    let conn = state.db.lock().unwrap();
    let settings = db::load_settings(&conn);
    let preset = Preset {
        name: name.clone(),
        saved_at: alerts::now_millis(),
        styles: db::load_alert_styles(&conn),
        now_playing: settings.now_playing,
        goal: settings.goal,
        chat: settings.chat,
    };

    let mut presets = db::load_presets(&conn);
    presets.retain(|existing| existing.name != name);
    presets.insert(0, preset);
    db::save_presets(&conn, &presets);
    Ok(())
}

/// Puts a saved look back on stream. The goal's clock is left alone: it counts
/// this stream's events, not the preset's.
#[tauri::command]
pub fn apply_preset(state: State<'_, Arc<AppState>>, app: AppHandle, name: String) -> Result<Settings, String> {
    let settings = {
        let conn = state.db.lock().unwrap();
        let preset = db::load_presets(&conn)
            .into_iter()
            .find(|preset| preset.name == name)
            .ok_or_else(|| format!("no preset named {name}"))?;

        let mut settings = db::load_settings(&conn);
        settings.now_playing = preset.now_playing;
        settings.goal = GoalWidget {
            started_at: settings.goal.started_at,
            ..preset.goal
        };
        settings.chat = preset.chat;
        db::save_settings(&conn, &settings);
        db::save_alert_styles(&conn, &preset.styles);
        settings
    };

    let _ = app.emit("styles-changed", ());
    push_overlay_config(&state);
    Ok(settings)
}

#[tauri::command]
pub fn delete_preset(state: State<'_, Arc<AppState>>, name: String) {
    let conn = state.db.lock().unwrap();
    let mut presets = db::load_presets(&conn);
    presets.retain(|preset| preset.name != name);
    db::save_presets(&conn, &presets);
}

/// Open overlays re-render on the next frame instead of needing a refresh.
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

impl From<crate::models::TwitchCredentials> for PublicUser {
    fn from(creds: crate::models::TwitchCredentials) -> Self {
        Self {
            user_id: creds.user_id,
            login: creds.login,
            display_name: creds.display_name,
            profile_image_url: creds.profile_image_url,
        }
    }
}

#[tauri::command]
pub fn get_auth_status(state: State<'_, Arc<AppState>>) -> Option<PublicUser> {
    db::load_credentials(&state.db.lock().unwrap()).map(PublicUser::from)
}

/// Every signed-in account, the active one first.
#[tauri::command]
pub fn get_accounts(state: State<'_, Arc<AppState>>) -> Vec<PublicUser> {
    db::load_accounts(&state.db.lock().unwrap())
        .into_iter()
        .map(PublicUser::from)
        .collect()
}

/// Streams as a different signed-in account: the EventSub socket is torn down
/// and reopened on the new token, so alerts and chat follow the switch.
#[tauri::command]
pub fn switch_account(
    state: State<'_, Arc<AppState>>,
    app: AppHandle,
    user_id: String,
) -> Result<PublicUser, String> {
    let user = {
        let conn = state.db.lock().unwrap();
        if !db::activate_account(&conn, &user_id) {
            return Err("that account is not signed in".to_string());
        }
        db::load_credentials(&conn).map(PublicUser::from).ok_or("no account")?
    };

    twitch::eventsub::stop(&state);
    twitch::eventsub::spawn(state.inner().clone(), app.clone());
    let _ = app.emit("auth-changed", Some(&user));
    Ok(user)
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

/// The in-memory chat ring, oldest first. Asked for when the window opens, so
/// the feed is not blank until the next person speaks.
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

/// Signs out of the active account. Another signed-in account takes over
/// rather than leaving the app connected to nothing.
#[tauri::command]
pub fn logout(state: State<'_, Arc<AppState>>, app: AppHandle) -> Option<PublicUser> {
    twitch::eventsub::stop(&state);
    let next = {
        let conn = state.db.lock().unwrap();
        db::clear_credentials(&conn);
        db::load_credentials(&conn).map(PublicUser::from)
    };
    if next.is_some() {
        twitch::eventsub::spawn(state.inner().clone(), app.clone());
    }
    let _ = app.emit("auth-changed", next.clone());
    next
}
