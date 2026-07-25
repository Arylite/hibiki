use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

use crate::db;
use crate::models::{PublicUser, TwitchCredentials};
use crate::state::AppState;

use super::helix;

const LOGIN_TIMEOUT_SECS: u64 = 180;

pub async fn login(state: Arc<AppState>, app: AppHandle) -> Result<PublicUser, String> {
    let (client_id, ws_port) = {
        let conn = state.db.lock().unwrap();
        let settings = db::load_settings(&conn);
        (settings.client_id, settings.ws_port)
    };
    if client_id.trim().is_empty() {
        return Err("Add your Twitch application Client ID in Settings before signing in.".into());
    }

    // Twitch requires HTTPS redirect URIs except for the literal hostname
    // `localhost` (127.0.0.1 is NOT exempted and gets rejected).
    let redirect_uri = format!("http://localhost:{ws_port}/auth/callback");
    let state_token = random_token();
    *state.expected_auth_state.lock().unwrap() = Some(state_token.clone());

    let (tx, rx) = oneshot::channel();
    *state.pending_auth.lock().unwrap() = Some(tx);

    let url = build_authorize_url(&client_id, &redirect_uri, &state_token);
    open_in_browser(&url);

    let token = tokio::time::timeout(Duration::from_secs(LOGIN_TIMEOUT_SECS), rx)
        .await
        .map_err(|_| "Sign-in timed out. Try again.".to_string())?
        .map_err(|_| "Sign-in window was closed before finishing.".to_string())?;

    let user = helix::get_user(&state.http, &client_id, &token).await?;

    let creds = TwitchCredentials {
        access_token: token,
        user_id: user.user_id.clone(),
        login: user.login.clone(),
        display_name: user.display_name.clone(),
        profile_image_url: user.profile_image_url.clone(),
    };
    db::save_credentials(&state.db.lock().unwrap(), &creds);

    let _ = app.emit("auth-changed", Some(&user));
    super::eventsub::spawn(state, app);

    Ok(user)
}

fn build_authorize_url(client_id: &str, redirect_uri: &str, state: &str) -> String {
    format!(
        "https://id.twitch.tv/oauth2/authorize?response_type=token&client_id={}&redirect_uri={}&scope={}&state={}&force_verify=true",
        percent_encode(client_id),
        percent_encode(redirect_uri),
        percent_encode(&super::required_scopes()),
        percent_encode(state)
    )
}

fn percent_encode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for b in input.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(b as char),
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

fn random_token() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    format!("{:x}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos())
}

fn open_in_browser(url: &str) {
    #[cfg(target_os = "windows")]
    {
        // cmd.exe treats `&` as a command separator unless quoted, and our
        // query string always contains several `&`-joined params, so we
        // build the raw command line ourselves rather than let `&` leak in
        // unquoted through the normal argv escaping.
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("cmd");
        cmd.raw_arg(format!("/C start \"\" \"{url}\""));
        let _ = cmd.spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(url).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(url).spawn();
    }
}
