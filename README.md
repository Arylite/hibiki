# Hibiki

Twitch alerts, chat, now-playing and goal widgets for OBS, in one Windows app.

Hibiki signs in to your own Twitch application, listens on EventSub, and serves
the overlay from a local HTTP server. OBS points a Browser Source at that
address; everything you change in the app restyles the running overlay without
a refresh.

## Requirements

- Windows 10 or 11
- OBS, or anything else that can load a Browser Source
- A Twitch application of your own (see below)

## Setup

1. Register an application at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
   with OAuth Client Type **Public**.
2. Set its redirect URI to exactly `http://localhost:3982/auth/callback`. Twitch
   rejects `127.0.0.1` here; it has to be `localhost`. If you change the port in
   Settings, change it here too.
3. Paste the Client ID into Settings, then Connect Twitch.
4. Copy the overlay URL from the Overlay page into an OBS Browser Source at
   1920x1080. Each widget also has its own URL, so OBS can place and scale them
   independently.

## Widgets

| Page    | What it puts on stream                                    |
| ------- | --------------------------------------------------------- |
| Alerts  | Follow, subscription, gifted subs, raid and cheer cards    |
| Music   | Whatever is playing in any player Windows knows about      |
| Goal    | Progress towards a follow, subscription or bits target     |
| Chat    | Your channel's chat, filtered for the stream               |

Styles export to and import from a single JSON file in Settings, and one
alert's look can be copied onto the others from its own page.

## Development

```sh
pnpm install
pnpm tauri dev
```

Checks, the same ones CI runs:

```sh
pnpm build                                    # tsc, then vite
node --experimental-strip-types src/lib/time.check.ts
node --experimental-strip-types src/lib/overlay-style.check.ts
node --experimental-strip-types src/types/chat.check.ts
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml -- --skip nowplaying::
```

The `nowplaying::` tests read this machine's live media session, so they are
skipped where there is not one.

## Releases

Pushing to `main` publishes a dev prerelease. A `vX.Y.Z` tag publishes a real
release, and the tag has to match `version` in `src-tauri/tauri.conf.json`.

Installed copies check the releases page at startup and can install a newer
build over themselves. That needs the update signing key: keep
`TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in the
repository secrets, and keep the private key itself somewhere safe. Losing it
means every installed copy has to be reinstalled by hand.

## Layout

```
src/                 app window (React)
src/overlay/         what OBS renders
src-tauri/src/       Tauri commands, sqlite, the local server, Twitch
```

The alert catalogue lives in `src-tauri/src/alerts/registry.rs`: one row per
alert kind carries its scope, subscription, parser, default style and preview
payload. Adding an alert type is a variant plus a row.
