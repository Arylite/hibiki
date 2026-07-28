import { invoke } from "@tauri-apps/api/core";

import { toBase64 } from "@/lib/media";
import type { AlertKind, AlertPayload } from "@/types/alert";
import type { AlertStyle, AlertStyles } from "@/types/settings";

export const alertsService = {
  getRecent: (limit?: number) => invoke<AlertPayload[]>("get_recent_alerts", { limit }),
  clearHistory: () => invoke<void>("clear_alert_history"),
  getStyles: () => invoke<AlertStyles>("get_alert_styles"),
  updateStyle: (kind: AlertKind, style: AlertStyle) => invoke<AlertStyles>("update_alert_style", { kind, style }),
  sendTest: (kind: AlertKind) => invoke<void>("send_test_alert", { kind }),
  importMedia: async (file: File) =>
    invoke<string>("import_media", { fileName: file.name, data: await toBase64(file) }),
};
