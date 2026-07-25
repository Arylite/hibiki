import { OverlayConfigSchema, type OverlayConfig } from "@/types/settings";

/** Fetched from the local server (no Tauri IPC in an OBS browser source).
 *  Returns null rather than inventing defaults - a wrong-looking alert is
 *  worse than a late one, and the page retries. */
export async function fetchOverlayConfig(): Promise<OverlayConfig | null> {
  try {
    const res = await fetch("/config");
    if (!res.ok) return null;
    const parsed = OverlayConfigSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
