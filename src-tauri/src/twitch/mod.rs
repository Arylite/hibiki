pub mod auth;
pub mod chat;
pub mod eventsub;
pub mod helix;

/// Every scope the sign-in asks for: what the alert catalogue needs, plus
/// reading chat. Nothing beyond that.
pub fn required_scopes() -> String {
    let mut scopes = crate::alerts::required_scopes();
    scopes.push(' ');
    scopes.push_str(chat::SCOPE);
    scopes
}
