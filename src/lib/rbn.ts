/**
 * The `.rbn` container: one file holding a whole look, media and all.
 *
 *   "RBN1"              4 bytes, so a wrong file is rejected before parsing
 *   u32                 manifest length, little endian
 *   manifest            UTF-8, the styles and an index of what follows
 *   media               the files themselves, back to back, raw
 *
 * Media travels as bytes rather than text: base64 in a JSON file cost a third
 * again in size, on assets that are already compressed.
 */

const MAGIC = "RBN1";
const HEADER_BYTES = MAGIC.length + 4;

/** Names the blobs in the order they appear after the manifest. */
export interface MediaIndex {
  name: string;
  length: number;
}

export function pack(manifest: unknown, media: Map<string, Blob>): Blob {
  const index: MediaIndex[] = [...media].map(([name, blob]) => ({ name, length: blob.size }));
  const head = new TextEncoder().encode(JSON.stringify({ ...(manifest as object), media: index }));

  const prefix = new Uint8Array(HEADER_BYTES);
  prefix.set(new TextEncoder().encode(MAGIC));
  new DataView(prefix.buffer).setUint32(MAGIC.length, head.length, true);

  return new Blob([prefix, head, ...media.values()], { type: "application/octet-stream" });
}

export async function unpack(file: Blob): Promise<{ manifest: unknown; media: Map<string, Blob> }> {
  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  if (header.length < HEADER_BYTES || new TextDecoder().decode(header.slice(0, MAGIC.length)) !== MAGIC) {
    throw new Error("not a Hibiki preset file");
  }

  const headLength = new DataView(header.buffer).getUint32(MAGIC.length, true);
  const head = await file.slice(HEADER_BYTES, HEADER_BYTES + headLength).text();
  const manifest = JSON.parse(head) as { media?: MediaIndex[] };

  const media = new Map<string, Blob>();
  let at = HEADER_BYTES + headLength;
  for (const entry of manifest.media ?? []) {
    media.set(entry.name, file.slice(at, at + entry.length));
    at += entry.length;
  }
  return { manifest, media };
}
