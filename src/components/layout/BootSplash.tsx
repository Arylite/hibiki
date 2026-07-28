import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Logo } from "@/components/ui/logo";
import { useSettingsStore } from "@/stores/settingsStore";

const WORD = "REBORN";
/** Long enough to read, short enough that nobody waits on it. */
const MIN_MS = 1100;
/** A backend that never answers must not trap the user behind the ident. */
const MAX_MS = 3000;
const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;

/** Cold-start ident. Mounted by the app shell only: the OBS overlay route must
 *  never see it, or the team name lands on stream. */
export function BootSplash() {
  const loaded = useSettingsStore((s) => s.settings !== null);
  const [minElapsed, setMinElapsed] = useState(false);
  const [expired, setExpired] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const min = setTimeout(() => setMinElapsed(true), MIN_MS);
    const max = setTimeout(() => setExpired(true), MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  // Covers the first data load, so the app is ready underneath when it lifts.
  const done = (minElapsed && loaded) || expired;

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          data-tauri-drag-region
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas select-none"
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <Logo size={36} />
          </motion.div>

          <motion.h1
            className="mt-5 text-[32px] leading-none font-semibold tracking-[-0.03em] text-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.14, duration: 0.45, ease: EASE_OUT }}
          >
            {WORD}
          </motion.h1>

          <motion.span
            className="mt-3 text-sm text-ink-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            Hibiki
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
