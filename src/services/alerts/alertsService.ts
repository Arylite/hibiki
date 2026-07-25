import { invoke } from "@tauri-apps/api/core";

import type { AlertKind, AlertPayload } from "@/types/alert";
import type { AlertStyle, AlertStyles } from "@/types/settings";

/** Browsers hide real paths, so picked files travel as bytes and the backend
 *  copies them into its own media dir. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`could not read ${file.name}`));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export const alertsService = {
  getRecent: (limit?: number) => invoke<AlertPayload[]>("get_recent_alerts", { limit }),
  clearHistory: () => invoke<void>("clear_alert_history"),
  getStyles: () => invoke<AlertStyles>("get_alert_styles"),
  updateStyle: (kind: AlertKind, style: AlertStyle) => invoke<AlertStyles>("update_alert_style", { kind, style }),
  sendTest: (kind: AlertKind) => invoke<void>("send_test_alert", { kind }),
  importMedia: async (file: File) =>
    invoke<string>("import_media", { fileName: file.name, data: await toBase64(file) }),
};
