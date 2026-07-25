use rusqlite::{params, Connection};
use std::path::Path;

use crate::alerts::AlertStyles;
use crate::models::{Alert, AlertConfig, AlertKind, GoalKind, Settings, TwitchCredentials};

/// Alerts older than this fall off the end - the history is a stream log, not
/// an archive, and it has to stay cheap to query on every dashboard poll.
const HISTORY_CAP: i64 = 500;

pub fn init(path: &Path) -> Connection {
    let conn = Connection::open(path).expect("failed to open sqlite db");
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            kind TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS alerts_created_at ON alerts (created_at DESC);",
    )
    .expect("failed to init schema");
    conn
}

pub fn insert_alert(conn: &Connection, alert: &Alert) {
    let payload = serde_json::to_string(alert).unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO alerts (id, kind, amount, payload, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![alert.id, alert.kind.key(), alert.amount(), payload, alert.created_at],
    )
    .ok();
    conn.execute(
        "DELETE FROM alerts WHERE id NOT IN (SELECT id FROM alerts ORDER BY created_at DESC LIMIT ?1)",
        params![HISTORY_CAP],
    )
    .ok();
}

pub fn recent_alerts(conn: &Connection, limit: i64) -> Vec<Alert> {
    let mut stmt = match conn.prepare("SELECT payload FROM alerts ORDER BY created_at DESC LIMIT ?1") {
        Ok(stmt) => stmt,
        Err(_) => return Vec::new(),
    };
    let rows = stmt.query_map(params![limit], |row| row.get::<_, String>(0));
    match rows {
        Ok(rows) => rows
            .filter_map(|row| row.ok())
            .filter_map(|payload| serde_json::from_str(&payload).ok())
            .collect(),
        Err(_) => Vec::new(),
    }
}

pub fn clear_alerts(conn: &Connection) {
    conn.execute("DELETE FROM alerts", []).ok();
}

/// Follows and subs count events; cheers count bits, and gifted subs count the
/// subs they gifted rather than the single event.
pub fn goal_progress(conn: &Connection, kind: GoalKind, since: i64) -> i64 {
    let sql = match kind {
        GoalKind::Follow => "SELECT COUNT(*) FROM alerts WHERE created_at >= ?1 AND kind = 'follow'",
        GoalKind::Subscribe => {
            "SELECT COALESCE(SUM(CASE WHEN kind = 'subscribeGift' THEN MAX(amount, 1) ELSE 1 END), 0)
             FROM alerts WHERE created_at >= ?1 AND kind IN ('subscribe', 'subscribeGift')"
        }
        GoalKind::Cheer => "SELECT COALESCE(SUM(amount), 0) FROM alerts WHERE created_at >= ?1 AND kind = 'cheer'",
    };
    conn.query_row(sql, params![since], |row| row.get(0)).unwrap_or(0)
}

fn get(conn: &Connection, key: &str) -> Option<String> {
    conn.query_row("SELECT value FROM kv WHERE key = ?1", params![key], |r| r.get(0))
        .ok()
}

fn set(conn: &Connection, key: &str, value: &str) {
    conn.execute(
        "INSERT INTO kv (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .expect("failed to write kv");
}

fn delete(conn: &Connection, key: &str) {
    conn.execute("DELETE FROM kv WHERE key = ?1", params![key]).ok();
}

pub fn load_settings(conn: &Connection) -> Settings {
    get(conn, "settings")
        .and_then(|v| serde_json::from_str(&v).ok())
        .unwrap_or_default()
}

pub fn save_settings(conn: &Connection, settings: &Settings) {
    set(conn, "settings", &serde_json::to_string(settings).unwrap());
}

/// Falls back to the pre-styles `alert_config` booleans so an existing install
/// keeps whichever alerts it had switched off.
pub fn load_alert_styles(conn: &Connection) -> AlertStyles {
    let stored: Option<AlertStyles> = get(conn, "alert_styles").and_then(|v| serde_json::from_str(&v).ok());
    if let Some(stored) = stored {
        return stored.filled();
    }
    let legacy: AlertConfig = get(conn, "alert_config")
        .and_then(|v| serde_json::from_str(&v).ok())
        .unwrap_or_default();
    let mut styles = AlertStyles::default();
    for (kind, enabled) in [
        (AlertKind::Follow, legacy.follow),
        (AlertKind::Subscribe, legacy.subscribe),
        (AlertKind::SubscribeGift, legacy.subscribe),
        (AlertKind::Raid, legacy.raid),
        (AlertKind::Cheer, legacy.cheer),
    ] {
        styles.enable(kind, enabled);
    }
    styles
}

pub fn save_alert_styles(conn: &Connection, styles: &AlertStyles) {
    set(conn, "alert_styles", &serde_json::to_string(styles).unwrap());
}

pub fn load_credentials(conn: &Connection) -> Option<TwitchCredentials> {
    get(conn, "twitch_credentials").and_then(|v| serde_json::from_str(&v).ok())
}

pub fn save_credentials(conn: &Connection, creds: &TwitchCredentials) {
    set(conn, "twitch_credentials", &serde_json::to_string(creds).unwrap());
}

pub fn clear_credentials(conn: &Connection) {
    delete(conn, "twitch_credentials");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn alert(id: &str, kind: AlertKind, amount: i64, created_at: i64) -> Alert {
        Alert {
            id: id.to_string(),
            kind,
            username: "viewer".to_string(),
            tier: None,
            bits: if matches!(kind, AlertKind::Cheer) { Some(amount) } else { None },
            viewers: if matches!(kind, AlertKind::Raid) { Some(amount) } else { None },
            message: None,
            gift_count: if matches!(kind, AlertKind::SubscribeGift) { Some(amount) } else { None },
            created_at,
        }
    }

    #[test]
    fn goals_count_events_but_sum_bits_and_gifted_subs() {
        let conn = init(Path::new(":memory:"));
        insert_alert(&conn, &alert("a", AlertKind::Follow, 0, 100));
        insert_alert(&conn, &alert("b", AlertKind::Follow, 0, 200));
        insert_alert(&conn, &alert("c", AlertKind::Subscribe, 0, 200));
        insert_alert(&conn, &alert("d", AlertKind::SubscribeGift, 5, 200));
        insert_alert(&conn, &alert("e", AlertKind::Cheer, 100, 200));

        assert_eq!(goal_progress(&conn, GoalKind::Follow, 0), 2);
        // one plain sub + five gifted, not two events
        assert_eq!(goal_progress(&conn, GoalKind::Subscribe, 0), 6);
        assert_eq!(goal_progress(&conn, GoalKind::Cheer, 0), 100);

        // `since` is what "reset" moves, so older rows must drop out
        assert_eq!(goal_progress(&conn, GoalKind::Follow, 150), 1);
        assert_eq!(goal_progress(&conn, GoalKind::Cheer, 300), 0);
    }

    #[test]
    fn history_returns_newest_first_and_round_trips() {
        let conn = init(Path::new(":memory:"));
        insert_alert(&conn, &alert("old", AlertKind::Follow, 0, 100));
        insert_alert(&conn, &alert("new", AlertKind::Cheer, 50, 900));

        let rows = recent_alerts(&conn, 10);
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].id, "new");
        assert_eq!(rows[0].bits, Some(50));
        assert_eq!(recent_alerts(&conn, 1).len(), 1);

        clear_alerts(&conn);
        assert!(recent_alerts(&conn, 10).is_empty());
    }

    /// The pre-styles schema only knew "subscribe", which covered gifts too.
    #[test]
    fn legacy_alert_config_carries_over_the_off_switches() {
        let conn = init(Path::new(":memory:"));
        set(&conn, "alert_config", r#"{"follow":true,"subscribe":false,"raid":true,"cheer":false}"#);

        let styles = load_alert_styles(&conn);
        assert!(styles.get(AlertKind::Follow).enabled);
        assert!(!styles.get(AlertKind::Subscribe).enabled);
        assert!(!styles.get(AlertKind::SubscribeGift).enabled);
        assert!(!styles.get(AlertKind::Cheer).enabled);
    }
}
