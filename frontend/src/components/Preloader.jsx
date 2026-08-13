import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const HOLD_MS = 550;
const WIPE_MS = 450;

/**
 * The page underneath finishes rendering in about 95ms, so this is a brand
 * moment, not a loading screen — it must never outlast what it covers. The
 * previous version sat on a flat 1900ms timer, which meant roughly 1.9s of
 * blank white over a site that was already fully painted.
 *
 * Timers drive the phase changes and the unmount; the animation only decorates
 * them. That ordering matters: framer-motion runs on requestAnimationFrame,
 * which browsers throttle hard in background tabs, so hanging the unmount off
 * an animation callback would strand anyone who opens the link in a background
 * tab behind an opaque panel. Worst case here, the panel simply disappears on
 * schedule without the wipe.
 */
export default function Preloader({ onComplete }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onComplete?.();
      return undefined;
    }

    const wipe = setTimeout(() => setLeaving(true), HOLD_MS);
    const done = setTimeout(() => onComplete?.(), HOLD_MS + WIPE_MS);

    return () => {
      clearTimeout(wipe);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="preloader"
      initial={{ y: '0%' }}
      animate={{ y: leaving ? '-100%' : '0%' }}
      transition={{ duration: WIPE_MS / 1000, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.div
        className="preloader__content"
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="preloader__logo">
          <motion.polygon
            points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0.3 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.polygon
            points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"
            fill="rgba(99, 102, 241, 0.08)"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          />
        </svg>

        <motion.span
          className="preloader__brand"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          Haggle
        </motion.span>
      </motion.div>
    </motion.div>
  );
}
