//! Twitch chat, read over the same EventSub socket the alerts use.
//!
//! Chat is a live feed rather than a record, so messages are held in a bounded
//! in-memory ring and never touch sqlite: a busy channel would otherwise write
//! thousands of rows an hour that nobody reads twice.

use std::sync::atomic::Ordering;

use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

use crate::alerts::now_millis;
use crate::models::ChatMessage;
use crate::state::AppState;

/// Reading a channel's chat as the broadcaster needs this and nothing else.
pub const SCOPE: &str = "user:read:chat";
pub const EVENT_TYPE: &str = "channel.chat.message";
pub const EVENT_VERSION: &str = "1";

/// How much backlog the app and a late-joining overlay can ask for.
pub const BUFFER: usize = 200;
/// What a freshly connected overlay is handed, so its box is not empty.
pub const REPLAY: usize = 10;

/// The broadcaster reads their own chat: both ids are theirs.
pub fn condition(broadcaster_id: &str) -> Value {
    json!({ "broadcaster_user_id": broadcaster_id, "user_id": broadcaster_id })
}

/// Takes what the overlay needs off an EventSub `channel.chat.message` event.
/// Fragments (emotes, cheermotes, mentions) collapse to their text — the
/// overlay renders words, not images.
pub fn parse(event: &Value) -> Option<ChatMessage> {
    let text = event["message"]["text"].as_str()?.trim().to_string();
    if text.is_empty() {
        return None;
    }

    let badges = event["badges"]
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(|badge| badge["set_id"].as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();

    Some(ChatMessage {
        id: event["message_id"]
            .as_str()
            .map(str::to_string)
            .unwrap_or_else(|| format!("chat-{}", now_millis())),
        username: event["chatter_user_name"]
            .as_str()
            .filter(|name| !name.is_empty())
            .or_else(|| event["chatter_user_login"].as_str())
            .unwrap_or("someone")
            .to_string(),
        color: event["color"].as_str().unwrap_or_default().to_string(),
        text,
        badges,
        created_at: now_millis(),
    })
}

/// Rings the message into the buffer, then hands it to both consumers: the
/// app window and every connected overlay. Nothing is filtered here — which
/// lines reach the stream is the widget's decision, and the app's own chat
/// view is meant to show everything.
pub fn dispatch(state: &AppState, app: &AppHandle, message: ChatMessage) {
    {
        let mut buffer = state.chat.lock().unwrap();
        buffer.push_back(message.clone());
        while buffer.len() > BUFFER {
            buffer.pop_front();
        }
    }

    state.broadcast("chat", &message);
    let _ = app.emit("chat", &message);
}

/// Newest last, which is the order both the app list and the overlay read in.
pub fn recent(state: &AppState, limit: usize) -> Vec<ChatMessage> {
    let buffer = state.chat.lock().unwrap();
    buffer.iter().rev().take(limit).rev().cloned().collect()
}

/// Subscribed separately from the alert catalogue: chat is not an alert, and
/// a channel with no chat scope on its token must still get its alerts.
pub async fn subscribe(
    state: &AppState,
    client_id: &str,
    token: &str,
    broadcaster_id: &str,
    session_id: &str,
) {
    let result = super::helix::create_eventsub_subscription(
        &state.http,
        client_id,
        token,
        EVENT_TYPE,
        EVENT_VERSION,
        condition(broadcaster_id),
        session_id,
    )
    .await;

    match result {
        Ok(()) => state.chat_ready.store(true, Ordering::SeqCst),
        Err(err) => {
            // Almost always a token predating the chat scope. The app asks the
            // streamer to sign in again rather than showing an empty feed.
            state.chat_ready.store(false, Ordering::SeqCst);
            eprintln!("chat subscription failed: {err}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn event() -> Value {
        json!({
            "chatter_user_name": "nova_kai",
            "chatter_user_login": "nova_kai",
            "message_id": "abc",
            "color": "#FF69B4",
            "message": { "text": "  hello there  " },
            "badges": [{ "set_id": "moderator", "id": "1" }, { "set_id": "subscriber", "id": "12" }],
        })
    }

    #[test]
    fn parses_a_message() {
        let msg = parse(&event()).unwrap();
        assert_eq!(msg.username, "nova_kai");
        assert_eq!(msg.text, "hello there");
        assert_eq!(msg.color, "#FF69B4");
        assert_eq!(msg.badges, vec!["moderator", "subscriber"]);
    }

    #[test]
    fn skips_an_empty_message() {
        let mut raw = event();
        raw["message"]["text"] = json!("   ");
        assert!(parse(&raw).is_none());
    }

    #[test]
    fn falls_back_to_the_login_when_there_is_no_display_name() {
        let mut raw = event();
        raw["chatter_user_name"] = json!("");
        assert_eq!(parse(&raw).unwrap().username, "nova_kai");
    }
}
