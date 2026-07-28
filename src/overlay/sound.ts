import { mediaUrl } from "@/lib/media";
import type { AlertKind } from "@/types/alert";

// Short synthesized chimes, used when the streamer has not picked a file.
const NOTES: Record<AlertKind, number[]> = {
  follow: [660, 880],
  subscribe: [523, 659, 784],
  subscribeGift: [523, 659, 784, 988],
  raid: [392, 494, 587, 784],
  cheer: [784, 988],
  channelPoints: [880, 1046],
};

const NOTE_DURATION_S = 0.14;

/** Plays the alert's own sound file, falling back to the built-in chime. */
export function playAlertSound(kind: AlertKind, file: string | null, volume: number): void {
  if (volume <= 0) return;
  if (file) {
    const audio = new Audio(mediaUrl(file));
    audio.volume = Math.min(1, Math.max(0, volume));
    // Autoplay can be refused (a browser tab that was never clicked); the
    // visual alert still has to show, so never let this reject upwards.
    audio.play().catch(() => {});
    return;
  }
  playChime(kind, volume);
}

function playChime(kind: AlertKind, volume: number): void {
  const ctx = new AudioContext();
  const notes = NOTES[kind];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    const startAt = ctx.currentTime + i * NOTE_DURATION_S;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume * 0.3, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + NOTE_DURATION_S);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + NOTE_DURATION_S + 0.02);
  });

  setTimeout(() => ctx.close(), (notes.length * NOTE_DURATION_S + 0.3) * 1000);
}
