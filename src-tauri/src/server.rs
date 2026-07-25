use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::State as AxumState;
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse};
use axum::routing::{get, post};
use axum::{Json, Router};
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tauri::{AppHandle, Manager};
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};

use crate::alerts::AlertStyles;
use crate::db;
use crate::models::Settings;
use crate::state::AppState;

const AUTH_CALLBACK_HTML: &str = r#"<!doctype html>
<html>
<head><meta charset="utf-8"><title>Hibiki - Twitch Sign-in</title></head>
<body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div id="msg">Finishing sign-in&hellip;</div>
<script>
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('access_token');
  const state = params.get('state');
  const msg = document.getElementById('msg');
  if (token) {
    fetch('/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token, state }),
    })
      .then((r) => {
        msg.textContent = r.ok
          ? 'Signed in. You can close this window.'
          : 'Sign-in failed. Close this window and try again.';
      })
      .catch(() => { msg.textContent = 'Sign-in failed. Close this window and try again.'; });
  } else {
    msg.textContent = 'Sign-in was cancelled. Close this window and try again.';
  }
</script>
</body>
</html>"#;

#[derive(Deserialize)]
struct AuthTokenBody {
    access_token: String,
    state: Option<String>,
}

pub async fn run(state: Arc<AppState>, app: AppHandle, port: u16) {
    let dist_dir = resolve_dist_dir(&app);
    let index_path = dist_dir.join("index.html");
    if !index_path.exists() {
        eprintln!(
            "warning: {} not found - run `pnpm build` so the overlay has assets to serve",
            index_path.display()
        );
    }
    // ponytail: tower-http's not_found_service serves index.html for unknown
    // SPA routes (e.g. /overlay) but keeps the 404 status instead of 200.
    // Harmless - OBS's browser source and normal browsers both render the
    // body regardless - so not worth a dependency + custom Service impl to
    // "fix" a status code nobody reads.
    let serve_dir = ServeDir::new(&dist_dir).not_found_service(ServeFile::new(&index_path));

    // Only the managed media dir is exposed - ServeDir refuses to walk out of
    // it, and imported files are renamed on the way in.
    let media_dir = state.media_dir.clone();
    let _ = std::fs::create_dir_all(&media_dir);

    let router = Router::new()
        .route("/ws", get(ws_handler))
        .route("/config", get(config_handler))
        .nest_service("/media", ServeDir::new(media_dir))
        .route("/auth/callback", get(auth_callback_page))
        .route("/auth/token", post(auth_token_handler))
        .fallback_service(serve_dir)
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = match tokio::net::TcpListener::bind(("0.0.0.0", port)).await {
        Ok(listener) => listener,
        Err(err) => {
            eprintln!("failed to bind local server on port {port}: {err}");
            return;
        }
    };

    if let Err(err) = axum::serve(listener, router).await {
        eprintln!("local server stopped: {err}");
    }
}

fn resolve_dist_dir(app: &AppHandle) -> PathBuf {
    if let Ok(resolved) = app.path().resolve("dist", tauri::path::BaseDirectory::Resource) {
        if resolved.join("index.html").exists() {
            return resolved;
        }
    }
    // Dev fallback, independent of the process's CWD: the binary always
    // lives at <project>/src-tauri/target/<profile>/<exe>, so walk up to
    // <project> and into dist/.
    if let Ok(exe) = std::env::current_exe() {
        if let Some(project_root) = exe.ancestors().nth(4) {
            let candidate = project_root.join("dist");
            if candidate.join("index.html").exists() {
                return candidate;
            }
        }
    }
    PathBuf::from("../dist")
}

/// Public, non-secret subset of settings the externally-loaded overlay page
/// needs (it has no Tauri IPC access since OBS loads it as a plain browser
/// source, not a Tauri webview). Also pushed over the WebSocket on every edit
/// so an open overlay restyles itself live.
pub fn overlay_config(settings: &Settings, styles: &AlertStyles) -> serde_json::Value {
    serde_json::json!({
        "globalVolume": settings.global_volume,
        "alertPosition": settings.alert_position,
        "alertGapMs": settings.alert_gap_ms,
        "styles": styles,
        "nowPlaying": settings.now_playing,
        "goal": settings.goal,
        "chat": settings.chat,
    })
}

/// Live goal progress, kept apart from the config so it can be pushed on every
/// alert without resending the whole style sheet.
pub fn goal_state(settings: &Settings, conn: &rusqlite::Connection) -> serde_json::Value {
    serde_json::json!({
        "current": db::goal_progress(conn, settings.goal.kind, settings.goal.started_at),
        "target": settings.goal.target,
    })
}

/// The one shape every overlay message takes, on the socket and over the
/// broadcast channel alike.
pub fn frame(kind: &str, payload: impl serde::Serialize) -> serde_json::Value {
    serde_json::json!({ "type": kind, "payload": payload })
}

async fn config_handler(AxumState(state): AxumState<Arc<AppState>>) -> impl IntoResponse {
    let conn = state.db.lock().unwrap();
    axum::Json(overlay_config(
        &db::load_settings(&conn),
        &db::load_alert_styles(&conn),
    ))
}

async fn auth_callback_page() -> Html<&'static str> {
    Html(AUTH_CALLBACK_HTML)
}

async fn auth_token_handler(
    AxumState(state): AxumState<Arc<AppState>>,
    Json(body): Json<AuthTokenBody>,
) -> impl IntoResponse {
    let expected = state.expected_auth_state.lock().unwrap().take();
    if expected.is_none() || expected != body.state {
        return (StatusCode::BAD_REQUEST, "invalid or expired sign-in request").into_response();
    }
    let sender = state.pending_auth.lock().unwrap().take();
    match sender {
        Some(tx) => {
            let _ = tx.send(body.access_token);
            (StatusCode::OK, "ok").into_response()
        }
        None => (StatusCode::BAD_REQUEST, "no sign-in in progress").into_response(),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    AxumState(state): AxumState<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    state.overlay_clients.fetch_add(1, Ordering::SeqCst);
    let mut rx = state.alert_tx.subscribe();
    let (mut sender, mut receiver) = socket.split();

    // Both of these only broadcast on change, so an overlay that connects
    // mid-track or mid-goal would sit empty until the next event.
    let track = state.now_playing.lock().unwrap().clone();
    if track.is_some() {
        let hello = frame("nowPlaying", track);
        let _ = sender.send(Message::Text(hello.to_string().into())).await;
    }
    let goal = {
        let conn = state.db.lock().unwrap();
        goal_state(&db::load_settings(&conn), &conn)
    };
    let _ = sender.send(Message::Text(frame("goal", goal).to_string().into())).await;

    // A chat box that stays empty until the next message reads as broken, so
    // an overlay opening mid-stream is handed the tail of the conversation.
    for message in crate::twitch::chat::recent(&state, crate::twitch::chat::REPLAY) {
        let _ = sender
            .send(Message::Text(frame("chat", message).to_string().into()))
            .await;
    }

    let mut recv_task = tokio::spawn(async move { while let Some(Ok(_)) = receiver.next().await {} });

    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(payload) => {
                    if sender.send(Message::Text(payload.to_string().into())).await.is_err() {
                        break;
                    }
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    tokio::select! {
        _ = &mut recv_task => send_task.abort(),
        _ = &mut send_task => recv_task.abort(),
    }
    state.overlay_clients.fetch_sub(1, Ordering::SeqCst);
}
