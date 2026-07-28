import { getVersion } from "@tauri-apps/api/app";

/** Where the installers are published. Prereleases — the dev builds every push
 *  to main leaves behind — are not what `/latest` answers with. */
const LATEST_RELEASE = "https://api.github.com/repos/Arylite/hibiki/releases/latest";

export interface UpdateInfo {
  current: string;
  latest: string;
  /** The release page, which is where the installer lives. */
  url: string;
}

/** Compares the version triple and nothing else: `0.10.0` beats `0.9.9`, and a
 *  `-dev` suffix on the same triple is not an update. */
export function isNewer(latest: string, current: string): boolean {
  const parts = (version: string) =>
    version
      .replace(/^v/, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);
  const [next, now] = [parts(latest), parts(current)];
  for (let i = 0; i < 3; i++) {
    if ((next[i] ?? 0) !== (now[i] ?? 0)) return (next[i] ?? 0) > (now[i] ?? 0);
  }
  return false;
}

/** Null when this is already the newest release. Throws if GitHub cannot be
 *  reached — being offline is not an update. */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const current = await getVersion();
  const response = await fetch(LATEST_RELEASE, { headers: { Accept: "application/vnd.github+json" } });
  // 404 is the answer while only dev prereleases exist: nothing to update to.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
  const release = (await response.json()) as { tag_name?: string; html_url?: string };
  const latest = String(release.tag_name ?? "").replace(/^v/, "");
  return isNewer(latest, current) ? { current, latest, url: String(release.html_url ?? "") } : null;
}
