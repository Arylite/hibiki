import { z } from "zod";

import { AlertKindSchema } from "@/types/alert";
import {
  AlertStyleSchema,
  ChatWidgetSchema,
  GoalWidgetSchema,
  NowPlayingWidgetSchema,
} from "@/types/settings";

/** A whole look in one file: the alerts and the three on-stream widgets. Every
 *  field is optional and merged onto what is there, so a file written by
 *  another version is worth reading rather than rejecting. */
export const StyleFileSchema = z.object({
  hibikiStyles: z.literal(1),
  // Partial, not `record`: a record keyed by an enum demands every alert, and
  // a file carrying two of them is still worth reading.
  styles: z.partialRecord(AlertKindSchema, AlertStyleSchema.partial()).optional(),
  nowPlaying: NowPlayingWidgetSchema.partial().optional(),
  goal: GoalWidgetSchema.partial().optional(),
  chat: ChatWidgetSchema.partial().optional(),
});
export type StyleFile = z.infer<typeof StyleFileSchema>;

/** The webview's own download, so no file-system permission is needed. */
export function downloadStyleFile(file: StyleFile) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `hibiki-styles-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Throws on anything that is not one of ours - the file came from outside. */
export async function readStyleFile(file: File): Promise<StyleFile> {
  return StyleFileSchema.parse(JSON.parse(await file.text()));
}
