use serde::{Deserialize, Serialize};

/// Declaration order is the order the overlay and the styles page list them
/// in. Every variant needs a row in [`crate::alerts::ALERTS`].
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[serde(rename_all = "camelCase")]
pub enum AlertKind {
    Follow,
    Subscribe,
    SubscribeGift,
    Raid,
    Cheer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alert {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: AlertKind,
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tier: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bits: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub viewers: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gift_count: Option<i64>,
    pub created_at: i64,
}

impl Alert {
    /// The number this event is "worth": bits, viewers, gifted subs. Drives
    /// both the minimum-amount filter and goal progress.
    pub fn amount(&self) -> i64 {
        self.bits.or(self.viewers).or(self.gift_count).unwrap_or(0)
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum AlertPosition {
    TopLeft,
    TopCenter,
    TopRight,
    CenterLeft,
    Center,
    CenterRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub ws_port: u16,
    pub global_volume: f32,
    pub overlay_url: String,
    pub client_id: String,
    pub alert_position: AlertPosition,
    /// Breathing room between two alerts, so a raid does not machine-gun them.
    pub alert_gap_ms: u32,
    /// How far every widget sits from the edge of the stream, in pixels.
    pub overlay_padding: u32,
    /// Keeps the window out of OBS display capture, screen shares and the
    /// Game Bar. On by default: the window shows an access token's worth of
    /// account state.
    pub hide_from_capture: bool,
    /// Minimising sends the window to the tray. Off leaves it in the taskbar.
    pub minimize_to_tray: bool,
    pub now_playing: NowPlayingWidget,
    pub goal: GoalWidget,
    pub chat: ChatWidget,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            ws_port: 3982,
            global_volume: 0.8,
            overlay_url: "http://127.0.0.1:3982/overlay".to_string(),
            client_id: String::new(),
            alert_position: AlertPosition::Center,
            alert_gap_ms: 600,
            overlay_padding: 40,
            hide_from_capture: true,
            minimize_to_tray: true,
            now_playing: NowPlayingWidget::default(),
            goal: GoalWidget::default(),
            chat: ChatWidget::default(),
        }
    }
}

/// One line of Twitch chat, as it arrives from EventSub. Kept in memory only:
/// chat is a live feed, not a record, and a busy channel would fill sqlite
/// with text nobody reads twice.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub username: String,
    /// The colour the chatter picked on Twitch. Empty when they never set one.
    pub color: String,
    pub text: String,
    /// Badge set ids: `broadcaster`, `moderator`, `subscriber`, `vip`...
    pub badges: Vec<String>,
    pub created_at: i64,
}

/// Chat on stream. Off by default, like every other widget.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct ChatWidget {
    pub enabled: bool,
    pub position: AlertPosition,
    pub accent: String,
    pub text_color: String,
    pub background: String,
    /// 100 is opaque; below that the stream shows through the backdrop.
    pub background_opacity: u32,
    pub font_size: u32,

    // Frame
    pub corner_radius: u32,
    pub border_color: String,
    pub border_width: u32,
    pub padding: u32,
    pub width: u32,

    // Type
    pub font_family: String,
    pub font_weight: u32,
    pub text_shadow: TextShadow,

    // Feed
    /// How many lines stay on screen.
    pub max_messages: u32,
    /// Drop `!commands` - they are for the bot, not the viewers.
    pub hide_commands: bool,
    /// Drop the usual chat bots.
    pub hide_bots: bool,
    pub show_badges: bool,
    /// Names in each chatter's own Twitch colour, rather than the accent.
    pub use_twitch_colors: bool,
    /// Remove a line this long after it arrives. 0 keeps it until it is
    /// pushed off the bottom.
    pub fade_after_secs: u32,
    pub message_gap: u32,
}

impl Default for ChatWidget {
    fn default() -> Self {
        Self {
            enabled: false,
            position: AlertPosition::BottomRight,
            accent: "#22c55e".to_string(),
            text_color: "#ffffff".to_string(),
            background: "transparent".to_string(),
            background_opacity: 100,
            font_size: 20,

            corner_radius: 12,
            border_color: "transparent".to_string(),
            border_width: 0,
            padding: 12,
            width: 380,

            font_family: "inter".to_string(),
            font_weight: 500,
            text_shadow: TextShadow::Auto,

            max_messages: 8,
            hide_commands: true,
            hide_bots: true,
            show_badges: true,
            use_twitch_colors: true,
            fade_after_secs: 0,
            message_gap: 8,
        }
    }
}

/// How on-stream text is kept readable over gameplay. `Auto` means a soft
/// shadow while the widget is transparent, none once it has a backdrop.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum TextShadow {
    #[default]
    Auto,
    None,
    Soft,
    Strong,
    Outline,
}

/// `Auto` follows the layout - centred when the image sits above or below,
/// ranged left when it sits beside the text.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum TextAlign {
    #[default]
    Auto,
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum GoalKind {
    #[default]
    Follow,
    Subscribe,
    Cheer,
}

/// A progress bar on stream. Counts follows and subs as events; cheers as
/// bits, because "100 bits" is the number a viewer is answering.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GoalWidget {
    pub enabled: bool,
    pub kind: GoalKind,
    pub target: u32,
    pub label: String,
    pub position: AlertPosition,
    pub accent: String,
    pub text_color: String,
    pub background: String,
    /// 100 is opaque; below that the stream shows through the backdrop.
    pub background_opacity: u32,
    pub font_size: u32,
    /// Counting starts here, so "reset" is a timestamp rather than a delete.
    pub started_at: i64,

    // Frame
    pub corner_radius: u32,
    pub border_color: String,
    pub border_width: u32,
    pub padding: u32,
    /// 0 keeps the responsive default width.
    pub width: u32,

    // Type
    pub font_family: String,
    pub font_weight: u32,
    pub text_shadow: TextShadow,

    // Bar
    /// 0 derives the height from the font size.
    pub bar_height: u32,
    pub bar_radius: u32,
    pub track_color: String,
    pub show_value: bool,
    pub show_percent: bool,
}

impl Default for GoalWidget {
    fn default() -> Self {
        Self {
            enabled: false,
            kind: GoalKind::Follow,
            target: 10,
            label: "Follow goal".to_string(),
            position: AlertPosition::TopRight,
            accent: "#22c55e".to_string(),
            text_color: "#ffffff".to_string(),
            background: "transparent".to_string(),
            background_opacity: 100,
            font_size: 18,
            started_at: 0,

            corner_radius: 12,
            border_color: "transparent".to_string(),
            border_width: 0,
            padding: 16,
            width: 0,

            font_family: "inter".to_string(),
            font_weight: 600,
            text_shadow: TextShadow::Auto,

            bar_height: 0,
            bar_radius: 999,
            track_color: "rgba(255,255,255,0.22)".to_string(),
            show_value: true,
            show_percent: false,
        }
    }
}

/// The on-stream music widget. Off by default: nothing lands on a broadcast
/// because someone installed an update.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct NowPlayingWidget {
    pub enabled: bool,
    pub position: AlertPosition,
    pub accent: String,
    pub text_color: String,
    pub background: String,
    /// 100 is opaque; below that the stream shows through the backdrop.
    pub background_opacity: u32,
    pub font_size: u32,
    pub show_artist: bool,
    pub show_source: bool,
    pub show_art: bool,
    pub hide_when_paused: bool,

    // Frame
    pub corner_radius: u32,
    pub border_color: String,
    pub border_width: u32,
    pub padding: u32,
    /// 0 keeps the responsive default width.
    pub width: u32,

    // Type
    pub font_family: String,
    pub font_weight: u32,
    pub text_shadow: TextShadow,

    // Contents
    pub show_album: bool,
    pub show_equalizer: bool,
    /// 0 derives the cover size from the font size.
    pub art_size: u32,
    pub art_radius: u32,
    /// Cut the track title at this many characters. 0 leaves it whole.
    pub title_max_chars: u32,
    /// Scroll a title that does not fit instead of clipping it.
    pub title_scroll: bool,
    /// Pixels per second for that scroll.
    pub title_scroll_speed: u32,
}

impl Default for NowPlayingWidget {
    fn default() -> Self {
        Self {
            enabled: false,
            position: AlertPosition::BottomLeft,
            accent: "#22c55e".to_string(),
            text_color: "#ffffff".to_string(),
            background: "transparent".to_string(),
            background_opacity: 100,
            font_size: 18,
            show_artist: true,
            show_source: false,
            show_art: true,
            hide_when_paused: true,

            corner_radius: 12,
            border_color: "transparent".to_string(),
            border_width: 0,
            padding: 12,
            width: 0,

            font_family: "inter".to_string(),
            font_weight: 600,
            text_shadow: TextShadow::Auto,

            show_album: false,
            show_equalizer: true,
            art_size: 0,
            art_radius: 4,
            title_max_chars: 0,
            title_scroll: false,
            title_scroll_speed: 40,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum AlertAnimation {
    #[default]
    SlideUp,
    Fade,
    Pop,
    SlideLeft,
    Drop,
}

/// The shared prefix is the point: `Top`/`Left` alone would not say what is
/// being placed.
#[allow(clippy::enum_variant_names)]
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum AlertLayout {
    #[default]
    ImageTop,
    ImageLeft,
    ImageRight,
    ImageBottom,
}

/// Everything a streamer can change about one alert's on-stream appearance.
/// `image`/`sound` are file names inside the managed media dir, never paths -
/// they are handed straight to the overlay as `/media/<name>`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AlertStyle {
    pub enabled: bool,
    pub title: String,
    pub message: String,
    pub image: Option<String>,
    pub sound: Option<String>,
    pub volume: f32,
    pub duration_ms: u32,
    pub animation: AlertAnimation,
    pub layout: AlertLayout,
    pub accent: String,
    pub text_color: String,
    pub background: String,
    /// 100 is opaque; below that the stream shows through the backdrop.
    pub background_opacity: u32,
    pub image_size: u32,
    pub font_size: u32,
    /// Ignore repeats of this alert for N ms. 0 disables it.
    pub cooldown_ms: u32,
    /// Skip events worth less than this - bits, viewers, gifted subs.
    pub min_amount: u32,

    // Frame
    pub corner_radius: u32,
    pub border_color: String,
    pub border_width: u32,
    pub padding: u32,

    // Type
    pub font_family: String,
    pub font_weight: u32,
    pub text_shadow: TextShadow,
    pub text_align: TextAlign,
    pub uppercase_title: bool,
    /// The heading, as a percentage of the message size.
    pub title_size: u32,

    // Image
    pub image_radius: u32,
}

impl Default for AlertStyle {
    fn default() -> Self {
        Self {
            enabled: true,
            title: "Alert".to_string(),
            message: "{user}".to_string(),
            image: None,
            sound: None,
            volume: 0.8,
            duration_ms: 6000,
            animation: AlertAnimation::SlideUp,
            layout: AlertLayout::ImageTop,
            accent: "#22c55e".to_string(),
            text_color: "#ffffff".to_string(),
            background: "transparent".to_string(),
            background_opacity: 100,
            image_size: 200,
            font_size: 32,
            cooldown_ms: 0,
            min_amount: 0,

            corner_radius: 16,
            border_color: "transparent".to_string(),
            border_width: 0,
            padding: 32,

            font_family: "inter".to_string(),
            font_weight: 700,
            text_shadow: TextShadow::Auto,
            text_align: TextAlign::Auto,
            uppercase_title: true,
            title_size: 45,

            image_radius: 0,
        }
    }
}

impl AlertStyle {
    /// Only the three things a catalogue row bothers to say; everything else
    /// is the same starting point for every alert.
    pub fn new(title: &str, message: &str, accent: &str) -> Self {
        Self {
            title: title.to_string(),
            message: message.to_string(),
            accent: accent.to_string(),
            ..Default::default()
        }
    }
}

/// Pre-styles schema, kept only so an existing install keeps whichever alerts
/// it had switched off. Safe to delete once no install predates alert styles.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AlertConfig {
    pub follow: bool,
    pub subscribe: bool,
    pub raid: bool,
    pub cheer: bool,
}

impl Default for AlertConfig {
    fn default() -> Self {
        Self {
            follow: true,
            subscribe: true,
            raid: true,
            cheer: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TwitchCredentials {
    pub access_token: String,
    pub user_id: String,
    pub login: String,
    pub display_name: String,
    pub profile_image_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicUser {
    pub user_id: String,
    pub login: String,
    pub display_name: String,
    pub profile_image_url: String,
}
