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

/** Bytes as base64, without the data-URL prefix. Browsers hide real paths, so
 *  media travels this way in both directions: to the backend on import, and
 *  into a style file on export. */
export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read the file"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

/** The inverse, for media coming back out of a style file. */
export async function fromBase64(data: string, name: string): Promise<File> {
  const blob = await (await fetch(`data:application/octet-stream;base64,${data}`)).blob();
  return new File([blob], name);
}
