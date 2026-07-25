mod registry;

pub use registry::{name_or, required_scopes, AlertStyles, ALERTS};

use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter};

use crate::models::{Alert, AlertKind};
use crate::state::AppState;
use crate::{db, server};

/// Pushes an alert through the pipeline: sqlite history, local WS broadcast
/// (overlay clients) and a Tauri event (dashboard UI). Used for both real
/// EventSub notifications and the "send test" button, so a test alert
/// exercises the exact same path a real one would.
pub fn dispatch(state: &AppState, app: &AppHandle, alert: Alert) {
    state
        .last_alert_at
        .lock()
        .unwrap()
        .insert(alert.kind, now_millis());

    let goal = {
        let conn = state.db.lock().unwrap();
        db::insert_alert(&conn, &alert);
        server::goal_state(&db::load_settings(&conn), &conn)
    };

    state.broadcast("alert", &alert);
    state.broadcast("goal", goal);
    let _ = app.emit("alert", &alert);
}

/// Filters a real event: switched off, too small, or too soon after the last
/// one of its kind. Test alerts bypass this on purpose - you press the button
/// precisely to see the thing you just configured.
pub fn should_dispatch(state: &AppState, alert: &Alert) -> bool {
    let style = db::load_alert_styles(&state.db.lock().unwrap()).get(alert.kind);
    if !style.enabled {
        return false;
    }
    if style.min_amount > 0 && alert.amount() < style.min_amount as i64 {
        return false;
    }
    if style.cooldown_ms > 0 {
        if let Some(last) = state.last_alert_at.lock().unwrap().get(&alert.kind) {
            if now_millis() - last < style.cooldown_ms as i64 {
                return false;
            }
        }
    }
    true
}

pub fn now_millis() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as i64
}

/// A timestamped, empty alert of this kind - registry rows fill in the rest.
/// The id is nanosecond-based because it is the history's primary key and two
/// events can land in the same millisecond.
pub fn new_alert(kind: AlertKind) -> Alert {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap();
    Alert {
        id: format!("{}-{}", kind.key(), now.as_nanos()),
        kind,
        username: "someone".to_string(),
        tier: None,
        bits: None,
        viewers: None,
        message: None,
        gift_count: None,
        created_at: now.as_millis() as i64,
    }
}

/// A representative payload, clearly test data (obvious usernames), for the
/// "send test" feature - it lets a streamer preview and position their overlay
/// without waiting for a real event.
pub fn sample_alert(kind: AlertKind) -> Alert {
    let mut alert = new_alert(kind);
    alert.username = "test_viewer".to_string();
    (kind.def().sample)(&mut alert);
    alert
}
