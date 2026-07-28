//! The alert catalogue: one row per alert kind.
//!
//! Adding an alert type is a variant on [`AlertKind`] plus a row here. The
//! OAuth scope, the EventSub subscription, the notification parser, the
//! default style and the preview payload all live in that row - nothing else
//! in the backend matches on the kind.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::models::{Alert, AlertKind, AlertStyle};

pub struct AlertDef {
    pub kind: AlertKind,
    /// Key in the sqlite rows and in the styles JSON, independent of any
    /// display label.
    pub key: &'static str,
    /// EventSub subscription that feeds this alert.
    pub event_type: &'static str,
    pub event_version: &'static str,
    /// OAuth scope that subscription needs, if any.
    pub scope: Option<&'static str>,
    /// Subscription condition, given the broadcaster's user id.
    pub condition: fn(&str) -> Value,
    /// What a fresh install shows for this alert.
    pub style: fn() -> AlertStyle,
    /// Kind-specific fields read off an EventSub `event` object. `username`
    /// arrives pre-filled from `user_name`.
    pub parse: fn(&Value, &mut Alert),
    /// The same fields with obvious test data, for the preview button.
    pub sample: fn(&mut Alert),
}

pub const ALERTS: &[AlertDef] = &[
    AlertDef {
        kind: AlertKind::Follow,
        key: "follow",
        event_type: "channel.follow",
        event_version: "2",
        scope: Some("moderator:read:followers"),
        condition: |id| json!({ "broadcaster_user_id": id, "moderator_user_id": id }),
        style: || AlertStyle::new("New Follower", "{user} just followed!", "#22c55e"),
        parse: |_, _| {},
        sample: |_| {},
    },
    AlertDef {
        kind: AlertKind::Subscribe,
        key: "subscribe",
        event_type: "channel.subscribe",
        event_version: "1",
        scope: Some("channel:read:subscriptions"),
        condition: |id| json!({ "broadcaster_user_id": id }),
        style: || AlertStyle::new("New Subscriber", "{user} subscribed! {tier}", "#a855f7"),
        parse: |event, alert| alert.tier = format_tier(event["tier"].as_str()),
        sample: |alert| alert.tier = Some("Tier 1".to_string()),
    },
    AlertDef {
        kind: AlertKind::SubscribeGift,
        key: "subscribeGift",
        event_type: "channel.subscription.gift",
        event_version: "1",
        scope: Some("channel:read:subscriptions"),
        condition: |id| json!({ "broadcaster_user_id": id }),
        style: || AlertStyle::new("Gifted Subs", "{user} gifted {amount} subs!", "#ec4899"),
        parse: |event, alert| {
            // Twitch omits the gifter entirely on an anonymous gift.
            alert.username = name_or(event, "user_name", "An anonymous gifter");
            alert.tier = format_tier(event["tier"].as_str());
            alert.gift_count = event["total"].as_i64();
        },
        sample: |alert| {
            alert.tier = Some("Tier 1".to_string());
            alert.gift_count = Some(5);
        },
    },
    AlertDef {
        kind: AlertKind::Raid,
        key: "raid",
        event_type: "channel.raid",
        event_version: "1",
        scope: None,
        condition: |id| json!({ "to_broadcaster_user_id": id }),
        style: || AlertStyle::new("Incoming Raid", "{user} raided with {amount} viewers!", "#f97316"),
        parse: |event, alert| {
            alert.username = name_or(event, "from_broadcaster_user_name", "someone");
            alert.viewers = event["viewers"].as_i64();
        },
        sample: |alert| {
            alert.username = "test_streamer".to_string();
            alert.viewers = Some(25);
        },
    },
    AlertDef {
        kind: AlertKind::Cheer,
        key: "cheer",
        event_type: "channel.cheer",
        event_version: "1",
        scope: Some("bits:read"),
        condition: |id| json!({ "broadcaster_user_id": id }),
        style: || AlertStyle::new("Cheer", "{user} cheered {amount} bits!", "#3b82f6"),
        parse: |event, alert| {
            if event["is_anonymous"].as_bool().unwrap_or(false) {
                alert.username = "Anonymous".to_string();
            }
            alert.bits = event["bits"].as_i64();
            alert.message = event["message"].as_str().map(str::to_string);
        },
        sample: |alert| {
            alert.bits = Some(100);
            alert.message = Some("Great stream!".to_string());
        },
    },
];

impl AlertKind {
    /// This kind's catalogue row. Panics only if a variant was added without
    /// one - see the module docs.
    pub fn def(self) -> &'static AlertDef {
        ALERTS
            .iter()
            .find(|def| def.kind == self)
            .expect("AlertKind has no ALERTS row")
    }

    pub fn key(self) -> &'static str {
        self.def().key
    }
}

/// Every scope the catalogue needs, deduped, so the login URL asks for exactly
/// what the subscriptions require.
pub fn required_scopes() -> String {
    let mut scopes: Vec<&str> = ALERTS.iter().filter_map(|def| def.scope).collect();
    scopes.sort_unstable();
    scopes.dedup();
    scopes.join(" ")
}

pub fn name_or(event: &Value, field: &str, fallback: &str) -> String {
    event[field]
        .as_str()
        .filter(|s| !s.is_empty())
        .unwrap_or(fallback)
        .to_string()
}

fn format_tier(raw: Option<&str>) -> Option<String> {
    raw.map(|tier| {
        match tier {
            "1000" => "Tier 1",
            "2000" => "Tier 2",
            "3000" => "Tier 3",
            other => other,
        }
        .to_string()
    })
}

/// Per-kind styles, keyed by the kind rather than named fields: a kind added
/// by an update needs no schema change, it just falls back to its row default.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(transparent)]
pub struct AlertStyles(BTreeMap<AlertKind, AlertStyle>);

impl Default for AlertStyles {
    fn default() -> Self {
        Self(ALERTS.iter().map(|def| (def.kind, (def.style)())).collect())
    }
}

impl AlertStyles {
    pub fn get(&self, kind: AlertKind) -> AlertStyle {
        self.0.get(&kind).cloned().unwrap_or_else(kind.def().style)
    }

    pub fn set(&mut self, kind: AlertKind, style: AlertStyle) {
        self.0.insert(kind, style);
    }

    pub fn enable(&mut self, kind: AlertKind, enabled: bool) {
        self.0.entry(kind).or_insert_with(kind.def().style).enabled = enabled;
    }

    /// Backfills kinds the stored sheet predates, so the overlay always gets a
    /// complete set and never has to guess a default.
    pub fn filled(mut self) -> Self {
        for def in ALERTS {
            self.0.entry(def.kind).or_insert_with(def.style);
        }
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_row_is_reachable_and_unique() {
        for def in ALERTS {
            assert_eq!(def.kind.def().key, def.key, "duplicate row for {}", def.key);
        }
    }

    #[test]
    fn styles_round_trip_through_json_keyed_by_kind() {
        let mut styles = AlertStyles::default();
        styles.enable(AlertKind::Cheer, false);
        let json = serde_json::to_string(&styles).unwrap();
        assert!(json.contains("\"subscribeGift\""), "{json}");

        let back: AlertStyles = serde_json::from_str(&json).unwrap();
        assert!(!back.get(AlertKind::Cheer).enabled);
        assert_eq!(back.get(AlertKind::Follow).title, "New Follower");
    }

    /// A kind missing from the stored sheet fills itself in from its row
    /// rather than needing a migration.
    #[test]
    fn missing_kinds_fall_back_to_their_row_default() {
        let stored: AlertStyles =
            serde_json::from_str(r#"{"follow":{"title":"Mine","enabled":false}}"#).unwrap();
        assert_eq!(stored.get(AlertKind::Follow).title, "Mine");
        assert!(!stored.get(AlertKind::Follow).enabled);
        assert_eq!(stored.get(AlertKind::Raid).title, "Incoming Raid");

        let filled = serde_json::to_value(stored.filled()).unwrap();
        assert_eq!(filled.as_object().unwrap().len(), ALERTS.len());
    }

    #[test]
    fn scopes_are_deduped() {
        let scopes = required_scopes();
        assert_eq!(scopes.matches("channel:read:subscriptions").count(), 1);
        assert!(scopes.contains("bits:read"));
    }
}
