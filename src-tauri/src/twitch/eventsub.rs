use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;

use futures_util::StreamExt;
use serde_json::Value;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message as TMessage;

use crate::alerts;
use crate::db;
use crate::models::Alert;
use crate::state::AppState;

use super::{chat, helix};

const EVENTSUB_URL: &str = "wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30";

pub fn spawn(state: Arc<AppState>, app: AppHandle) {
    stop(&state);
    let handle = tauri::async_runtime::spawn(run(state.clone(), app));
    *state.eventsub_handle.lock().unwrap() = Some(handle);
}

pub fn stop(state: &AppState) {
    if let Some(handle) = state.eventsub_handle.lock().unwrap().take() {
        handle.abort();
    }
    state.eventsub_connected.store(false, Ordering::SeqCst);
}

enum RunOutcome {
    Reconnect(String),
    Disconnected,
}

async fn run(state: Arc<AppState>, app: AppHandle) {
    let mut url = EVENTSUB_URL.to_string();
    loop {
        match run_once(&state, &app, &url).await {
            RunOutcome::Reconnect(new_url) => {
                url = new_url;
            }
            RunOutcome::Disconnected => {
                state.eventsub_connected.store(false, Ordering::SeqCst);
                let _ = app.emit("eventsub-status", false);
                tokio::time::sleep(Duration::from_secs(5)).await;
                url = EVENTSUB_URL.to_string();
            }
        }
    }
}

async fn run_once(state: &AppState, app: &AppHandle, url: &str) -> RunOutcome {
    let (ws_stream, _) = match tokio_tungstenite::connect_async(url).await {
        Ok(pair) => pair,
        Err(err) => {
            eprintln!("eventsub connect failed: {err}");
            return RunOutcome::Disconnected;
        }
    };
    let (_write, mut read) = ws_stream.split();

    while let Some(msg) = read.next().await {
        let msg = match msg {
            Ok(m) => m,
            Err(_) => return RunOutcome::Disconnected,
        };
        let text = match msg {
            TMessage::Text(t) => t.to_string(),
            TMessage::Close(_) => return RunOutcome::Disconnected,
            _ => continue,
        };
        let payload: Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let message_type = payload["metadata"]["message_type"].as_str().unwrap_or("");

        match message_type {
            "session_welcome" => {
                let session_id = payload["payload"]["session"]["id"].as_str().unwrap_or("").to_string();
                subscribe_all(state, &session_id).await;
                let _ = app.emit("chat-ready", state.chat_ready.load(Ordering::SeqCst));
                state.eventsub_connected.store(true, Ordering::SeqCst);
                let _ = app.emit("eventsub-status", true);
            }
            "session_reconnect" => {
                let new_url = payload["payload"]["session"]["reconnect_url"]
                    .as_str()
                    .unwrap_or(EVENTSUB_URL)
                    .to_string();
                return RunOutcome::Reconnect(new_url);
            }
            "notification" => {
                let sub_type = payload["payload"]["subscription"]["type"].as_str().unwrap_or("");
                if sub_type == chat::EVENT_TYPE {
                    if let Some(message) = chat::parse(&payload["payload"]["event"]) {
                        chat::dispatch(state, app, message);
                    }
                } else if let Some(alert) = parse_notification(&payload) {
                    if alerts::should_dispatch(state, &alert) {
                        alerts::dispatch(state, app, alert);
                    }
                }
            }
            _ => {}
        }
    }

    RunOutcome::Disconnected
}

/// Subscribes to every alert in the catalogue. A failure is per-subscription:
/// missing scope for one alert must not cost the streamer the other four.
async fn subscribe_all(state: &AppState, session_id: &str) {
    let (client_id, token, broadcaster_id) = {
        let conn = state.db.lock().unwrap();
        let settings = db::load_settings(&conn);
        match db::load_credentials(&conn) {
            Some(creds) => (settings.client_id, creds.access_token, creds.user_id),
            None => return,
        }
    };

    for def in alerts::ALERTS {
        let result = helix::create_eventsub_subscription(
            &state.http,
            &client_id,
            &token,
            def.event_type,
            def.event_version,
            (def.condition)(&broadcaster_id),
            session_id,
        )
        .await;
        if let Err(err) = result {
            eprintln!("{err}");
        }
    }

    chat::subscribe(state, &client_id, &token, &broadcaster_id, session_id).await;
}

/// Maps a notification onto its catalogue row; an event type we never
/// subscribed to is simply not ours.
fn parse_notification(payload: &Value) -> Option<Alert> {
    let sub_type = payload["payload"]["subscription"]["type"].as_str()?;
    let def = alerts::ALERTS.iter().find(|def| def.event_type == sub_type)?;
    let event = &payload["payload"]["event"];

    let mut alert = alerts::new_alert(def.kind);
    alert.username = alerts::name_or(event, "user_name", &alert.username);
    (def.parse)(event, &mut alert);
    Some(alert)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::AlertKind;

    fn notification(sub_type: &str, event: Value) -> Value {
        serde_json::json!({
            "metadata": { "message_type": "notification" },
            "payload": {
                "subscription": { "type": sub_type },
                "event": event,
            }
        })
    }

    #[test]
    fn parses_follow() {
        let alert = parse_notification(&notification("channel.follow", serde_json::json!({ "user_name": "viewer1" }))).unwrap();
        assert_eq!(alert.kind, AlertKind::Follow);
        assert_eq!(alert.username, "viewer1");
    }

    #[test]
    fn parses_subscribe_with_tier() {
        let alert = parse_notification(&notification(
            "channel.subscribe",
            serde_json::json!({ "user_name": "viewer2", "tier": "2000" }),
        ))
        .unwrap();
        assert_eq!(alert.kind, AlertKind::Subscribe);
        assert_eq!(alert.tier.as_deref(), Some("Tier 2"));
    }

    #[test]
    fn parses_subscription_gift_defaults_anonymous() {
        let alert = parse_notification(&notification(
            "channel.subscription.gift",
            serde_json::json!({ "user_name": "", "total": 5, "tier": "1000" }),
        ))
        .unwrap();
        assert_eq!(alert.kind, AlertKind::SubscribeGift);
        assert_eq!(alert.username, "An anonymous gifter");
        assert_eq!(alert.gift_count, Some(5));
    }

    #[test]
    fn parses_raid_viewers() {
        let alert = parse_notification(&notification(
            "channel.raid",
            serde_json::json!({ "from_broadcaster_user_name": "bigstreamer", "viewers": 42 }),
        ))
        .unwrap();
        assert_eq!(alert.kind, AlertKind::Raid);
        assert_eq!(alert.viewers, Some(42));
    }

    #[test]
    fn parses_anonymous_cheer() {
        let alert = parse_notification(&notification(
            "channel.cheer",
            serde_json::json!({ "is_anonymous": true, "bits": 100, "message": "gg" }),
        ))
        .unwrap();
        assert_eq!(alert.kind, AlertKind::Cheer);
        assert_eq!(alert.username, "Anonymous");
        assert_eq!(alert.bits, Some(100));
    }

    #[test]
    fn unknown_subscription_type_returns_none() {
        assert!(parse_notification(&notification("channel.unknown", serde_json::json!({}))).is_none());
    }
}
