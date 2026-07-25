use std::collections::{HashMap, VecDeque};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, AtomicUsize};
use std::sync::Mutex;

use rusqlite::Connection;
use tokio::sync::{broadcast, oneshot};

use crate::models::{AlertKind, ChatMessage};
use crate::nowplaying::NowPlaying;

pub struct AppState {
    pub db: Mutex<Connection>,
    /// Managed dir for imported images/sounds - the only place the overlay
    /// server is allowed to serve user files from.
    pub media_dir: PathBuf,
    pub http: reqwest::Client,
    pub alert_tx: broadcast::Sender<serde_json::Value>,
    pub pending_auth: Mutex<Option<oneshot::Sender<String>>>,
    pub expected_auth_state: Mutex<Option<String>>,
    pub eventsub_handle: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
    pub eventsub_connected: AtomicBool,
    pub overlay_clients: AtomicUsize,
    /// Last time each kind fired, for the per-alert cooldown.
    pub last_alert_at: Mutex<HashMap<AlertKind, i64>>,
    /// Last track seen, so a late-joining overlay starts populated.
    pub now_playing: Mutex<Option<NowPlaying>>,
    /// Bounded ring of recent chat, in memory only - see `twitch::chat`.
    pub chat: Mutex<VecDeque<ChatMessage>>,
    /// Whether the chat subscription took. False on a token issued before the
    /// chat scope existed, which is the one case worth telling the user about.
    pub chat_ready: AtomicBool,
}

impl AppState {
    /// Pushes one frame to every connected overlay. Send failures mean nobody
    /// is listening, which is the normal state when OBS is closed.
    pub fn broadcast(&self, kind: &str, payload: impl serde::Serialize) {
        let _ = self.alert_tx.send(crate::server::frame(kind, payload));
    }

    pub fn new(db: Connection, media_dir: PathBuf) -> Self {
        let (alert_tx, _rx) = broadcast::channel(64);
        Self {
            db: Mutex::new(db),
            media_dir,
            http: reqwest::Client::new(),
            alert_tx,
            pending_auth: Mutex::new(None),
            expected_auth_state: Mutex::new(None),
            eventsub_handle: Mutex::new(None),
            eventsub_connected: AtomicBool::new(false),
            overlay_clients: AtomicUsize::new(0),
            last_alert_at: Mutex::new(HashMap::new()),
            now_playing: Mutex::new(None),
            chat: Mutex::new(VecDeque::new()),
            chat_ready: AtomicBool::new(false),
        }
    }
}
