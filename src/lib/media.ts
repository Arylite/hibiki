/** Imported media lives on the local overlay server, not on the app's own
 *  origin, so in-app previews need the absolute URL. */
export function mediaUrl(file: string, port: number | undefined): string {
  return `http://127.0.0.1:${port ?? 3982}/media/${file}`;
}
