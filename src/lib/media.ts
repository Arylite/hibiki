/**
 * Imported media is served by the local overlay server. The overlay page is
 * served by it too, so a relative path is right there; the app window is not,
 * and has to name the server. The shell sets the base once the port is known.
 */
let base = "";

export function setMediaBase(port: number | undefined) {
  base = port ? `http://127.0.0.1:${port}` : "";
}

export function mediaUrl(file: string): string {
  return `${base}/media/${file}`;
}

const VIDEO = /\.(mp4|webm|mov|m4v|ogv)$/i;

export const isVideo = (file: string) => VIDEO.test(file);
