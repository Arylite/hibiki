pub mod auth;
pub mod chat;
pub mod eventsub;
pub mod helix;

/// Every scope the sign-in has to ask for: what the alert catalogue needs,
/// plus reading chat. Asking for exactly this and nothing more is the
/// difference between a permission screen a streamer accepts and one they
/// close.
pub fn required_scopes() -> String {
    let mut scopes = crate::alerts::required_scopes();
    scopes.push(' ');
    scopes.push_str(chat::SCOPE);
    scopes
}
