mod registry;

pub use registry::{name_or, required_scopes, AlertStyles, ALERTS};

use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter};

use crate::models::{Alert, AlertKind};
use crate::state::AppState;
use crate::{db, server};

/// Pushes an alert through the pipeline: sqlite history, WS broadcast to the
/// overlays, Tauri event to the window. Real events and test alerts alike.
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
/// one of its kind. Test alerts bypass it on purpose.
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
        reward: None,
        points: None,
        created_at: now.as_millis() as i64,
    }
}

/// A representative payload with obviously fake usernames, for the test button.
pub fn sample_alert(kind: AlertKind) -> Alert {
    let mut alert = new_alert(kind);
    alert.username = "test_viewer".to_string();
    (kind.def().sample)(&mut alert);
    alert
}
