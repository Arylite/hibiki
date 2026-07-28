use std::sync::Arc;
use std::time::Duration;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    GlobalSystemMediaTransportControlsSessionMediaProperties as MediaProperties,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
};
use windows::Storage::Streams::DataReader;
use windows::Win32::System::Com::{CoInitializeEx, COINIT_MULTITHREADED};

use crate::state::AppState;

// ponytail: 2s poll instead of GSMTC's change events - one WinRT call, no COM
// callbacks to re-register when the session switches. Move to
// CurrentSessionChanged/MediaPropertiesChanged if the lag ever shows.
const POLL_MS: u64 = 2000;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    /// The app model id publishing the session, e.g. "Spotify.exe".
    pub source: String,
    pub playing: bool,
    /// Cover art as a data URL, when the player publishes one.
    pub art: Option<String>,
}

/// Safe to repeat: on an already-initialised apartment this is a refcount
/// bump, and it keeps every caller (poll thread, command pool) valid.
fn co_init() {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
}

fn read(session: &Session) -> Option<NowPlaying> {
    let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
    let title = props.Title().ok()?.to_string();
    if title.trim().is_empty() {
        return None;
    }
    let status = session.GetPlaybackInfo().ok()?.PlaybackStatus().ok()?;

    Some(NowPlaying {
        title,
        artist: props.Artist().ok().map(|s| s.to_string()).unwrap_or_default(),
        album: props.AlbumTitle().ok().map(|s| s.to_string()).filter(|s| !s.is_empty()),
        source: session.SourceAppUserModelId().ok().map(|s| s.to_string()).unwrap_or_default(),
        playing: status == PlaybackStatus::Playing,
        art: artwork(&props),
    })
}

const MAX_ART_BYTES: u64 = 4 * 1024 * 1024;

/// The cover as a data URL: the overlay is a plain browser page with no access
/// to this machine's WinRT streams, so the bytes have to travel inline.
fn artwork(props: &MediaProperties) -> Option<String> {
    let stream = props.Thumbnail().ok()?.OpenReadAsync().ok()?.get().ok()?;
    let size = stream.Size().ok()?;
    if size == 0 || size > MAX_ART_BYTES {
        return None;
    }
    let reader = DataReader::CreateDataReader(&stream).ok()?;
    reader.LoadAsync(size as u32).ok()?.get().ok()?;
    let mut bytes = vec![0u8; size as usize];
    reader.ReadBytes(&mut bytes).ok()?;

    let mime = stream
        .ContentType()
        .map(|s| s.to_string())
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "image/jpeg".to_string());
    Some(format!("data:{mime};base64,{}", BASE64.encode(&bytes)))
}

/// Whatever is *playing* wins: `GetCurrentSession` returns the session Windows
/// considers focused, which is regularly stale or unset while another player
/// is mid-track.
fn pick_session(manager: &SessionManager) -> Option<Session> {
    let mut fallback = None;
    if let Ok(sessions) = manager.GetSessions() {
        for session in sessions {
            let playing = session
                .GetPlaybackInfo()
                .and_then(|info| info.PlaybackStatus())
                .map(|status| status == PlaybackStatus::Playing)
                .unwrap_or(false);
            if playing {
                return Some(session);
            }
            if fallback.is_none() {
                fallback = Some(session);
            }
        }
    }
    fallback.or_else(|| manager.GetCurrentSession().ok())
}

/// Drives the player that owns the current session.
pub fn control(action: &str) -> bool {
    co_init();
    let Some(session) = SessionManager::RequestAsync()
        .ok()
        .and_then(|op| op.get().ok())
        .and_then(|manager| pick_session(&manager))
    else {
        return false;
    };

    let result = match action {
        "playpause" => session.TryTogglePlayPauseAsync().and_then(|op| op.get()),
        "next" => session.TrySkipNextAsync().and_then(|op| op.get()),
        "previous" => session.TrySkipPreviousAsync().and_then(|op| op.get()),
        _ => Ok(false),
    };
    result.unwrap_or(false)
}

/// Reads the sessions behind Windows' own media flyout, so anything that feeds
/// it (Spotify, browsers, Apple Music) shows up here.
pub fn current() -> Option<NowPlaying> {
    co_init();
    let manager = SessionManager::RequestAsync().ok()?.get().ok()?;
    read(&pick_session(&manager)?)
}

/// Publishes only when the track or its state actually changes: a Tauri event
/// for the app window, and a WebSocket broadcast for the overlay in OBS.
pub fn spawn(state: Arc<AppState>, app: AppHandle) {
    std::thread::spawn(move || {
        let mut last: Option<NowPlaying> = None;
        loop {
            let next = current();
            if next != last {
                *state.now_playing.lock().unwrap() = next.clone();
                let _ = app.emit("now-playing", &next);
                state.broadcast("nowPlaying", &next);
                last = next;
            }
            std::thread::sleep(Duration::from_millis(POLL_MS));
        }
    });
}

#[cfg(test)]
mod tests {
    /// Exercises the COM init + WinRT round trip on this machine. `None` is a
    /// valid result (nothing playing); a hang or panic is not.
    #[test]
    fn reads_the_session_without_panicking() {
        println!("now playing: {:?}", super::current());
    }

    /// Diagnostic: what does Windows itself expose right now?
    #[test]
    fn lists_every_session() {
        super::co_init();
        let manager = super::SessionManager::RequestAsync().unwrap().get().unwrap();
        let sessions = manager.GetSessions().unwrap();
        println!("session count: {}", sessions.Size().unwrap());
        for session in sessions {
            println!(
                "  source={:?} status={:?} read={:?}",
                session.SourceAppUserModelId().map(|s| s.to_string()),
                session.GetPlaybackInfo().and_then(|i| i.PlaybackStatus()),
                super::read(&session).map(|t| t.title),
            );
        }
        println!(
            "current session: {:?}",
            manager.GetCurrentSession().map(|s| s.SourceAppUserModelId().map(|s| s.to_string()))
        );
    }
}
