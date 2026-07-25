use serde::Deserialize;
use serde_json::Value;

use crate::models::PublicUser;

#[derive(Deserialize)]
struct UsersResponse {
    data: Vec<HelixUser>,
}

#[derive(Deserialize)]
struct HelixUser {
    id: String,
    login: String,
    display_name: String,
    profile_image_url: String,
}

pub async fn get_user(http: &reqwest::Client, client_id: &str, token: &str) -> Result<PublicUser, String> {
    let resp = http
        .get("https://api.twitch.tv/helix/users")
        .header("Authorization", format!("Bearer {token}"))
        .header("Client-Id", client_id)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("Twitch rejected the sign-in (status {})", resp.status()));
    }

    let body: UsersResponse = resp.json().await.map_err(|e| e.to_string())?;
    let user = body.data.into_iter().next().ok_or("Twitch returned no user")?;
    Ok(PublicUser {
        user_id: user.id,
        login: user.login,
        display_name: user.display_name,
        profile_image_url: user.profile_image_url,
    })
}

pub async fn create_eventsub_subscription(
    http: &reqwest::Client,
    client_id: &str,
    token: &str,
    event_type: &str,
    version: &str,
    condition: Value,
    session_id: &str,
) -> Result<(), String> {
    let body = serde_json::json!({
        "type": event_type,
        "version": version,
        "condition": condition,
        "transport": { "method": "websocket", "session_id": session_id },
    });

    let resp = http
        .post("https://api.twitch.tv/helix/eventsub/subscriptions")
        .header("Authorization", format!("Bearer {token}"))
        .header("Client-Id", client_id)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("subscribe to {event_type} failed: {status} {text}"));
    }
    Ok(())
}
