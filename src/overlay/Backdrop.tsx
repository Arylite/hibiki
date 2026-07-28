import { isVideo, mediaUrl } from "@/lib/media";

/**
 * An image or looping video filling a widget's box, over its backdrop colour.
 * Sits at a negative z-index inside the box's own stacking context, so it
 * paints above that colour and below the text without wrapping the content.
 */
export function Backdrop({ file }: { file: string | null }) {
  if (!file) return null;

  const className = "pointer-events-none absolute inset-0 -z-10 size-full object-cover";
  return isVideo(file) ? (
    // Muted is not a preference: an autoplaying video with sound is refused.
    <video src={mediaUrl(file)} className={className} autoPlay loop muted playsInline />
  ) : (
    <img src={mediaUrl(file)} alt="" className={className} />
  );
}
