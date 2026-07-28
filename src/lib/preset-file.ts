import { z } from "zod";

import { mediaUrl } from "@/lib/media";
import { pack, unpack } from "@/lib/rbn";
import { alertsService } from "@/services/alerts/alertsService";
import { AlertKindSchema } from "@/types/alert";
import {
  AlertStyleSchema,
  ChatWidgetSchema,
  GoalWidgetSchema,
  NowPlayingWidgetSchema,
} from "@/types/settings";

/** What a `.rbn` carries beside its media: the alerts and the three on-stream
 *  widgets. Every field is optional and merged onto what is there, so a file
 *  written by another version is worth reading rather than rejecting. */
export const StyleSheetSchema = z.object({
  hibikiStyles: z.literal(1),
  // Partial, not `record`: a record keyed by an enum demands every alert, and
  // a file carrying two of them is still worth reading.
  styles: z.partialRecord(AlertKindSchema, AlertStyleSchema.partial()).optional(),
  nowPlaying: NowPlayingWidgetSchema.partial().optional(),
  goal: GoalWidgetSchema.partial().optional(),
  chat: ChatWidgetSchema.partial().optional(),
});
export type StyleSheet = z.infer<typeof StyleSheetSchema>;

/** The three fields anywhere in a sheet that name a file. */
type Referring = { image?: string | null; sound?: string | null; backgroundMedia?: string | null };
const MEDIA_FIELDS = ["image", "sound", "backgroundMedia"] as const;

function referring(sheet: StyleSheet): (Referring | undefined)[] {
  return [...Object.values(sheet.styles ?? {}), sheet.nowPlaying, sheet.goal, sheet.chat];
}

/** Only fields that are actually present are touched: writing `image:
 *  undefined` into a patch would clear an image the recipient already had. */
function repoint<T extends Referring>(entry: T, renamed: Map<string, string>): T {
  const next: Referring = { ...entry };
  for (const field of MEDIA_FIELDS) {
    const name = next[field];
    if (typeof name === "string" && renamed.has(name)) next[field] = renamed.get(name);
  }
  return next as T;
}

/** Everything the sheet points at, fetched from the local media server. A file
 *  deleted by hand is skipped rather than failing the whole export. */
async function collect(sheet: StyleSheet): Promise<Map<string, Blob>> {
  const names = new Set(
    referring(sheet)
      .flatMap((entry) => MEDIA_FIELDS.map((field) => entry?.[field]))
      .filter((name): name is string => Boolean(name)),
  );

  const media = new Map<string, Blob>();
  for (const name of names) {
    const response = await fetch(mediaUrl(name));
    if (response.ok) media.set(name, await response.blob());
  }
  return media;
}

/** A whole look as one downloadable file, media inside. */
export async function exportPreset(sheet: StyleSheet): Promise<void> {
  const file = pack(sheet, await collect(sheet));
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hibiki-${new Date().toISOString().slice(0, 10)}.rbn`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Reads a `.rbn` back: writes its media into this install's media dir and
 * repoints the styles at the names the backend hands out. Throws on anything
 * that is not one of ours - the file came from outside.
 */
export async function importPreset(file: File): Promise<StyleSheet> {
  const { manifest, media } = await unpack(file);
  const sheet = StyleSheetSchema.parse(manifest);

  const renamed = new Map<string, string>();
  for (const [name, blob] of media) {
    renamed.set(name, await alertsService.importMedia(new File([blob], name)));
  }
  if (renamed.size === 0) return sheet;

  return {
    ...sheet,
    styles:
      sheet.styles &&
      (Object.fromEntries(
        Object.entries(sheet.styles).map(([kind, style]) => [kind, repoint(style, renamed)]),
      ) as StyleSheet["styles"]),
    nowPlaying: sheet.nowPlaying && repoint(sheet.nowPlaying, renamed),
    goal: sheet.goal && repoint(sheet.goal, renamed),
    chat: sheet.chat && repoint(sheet.chat, renamed),
  };
}
