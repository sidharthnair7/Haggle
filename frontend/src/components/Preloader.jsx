import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TRACE_MS = 800;
const WIPE_MS = 500;

/**
 * The page underneath finishes rendering in about 95ms, so this is a brand
 * moment, not a loading screen — it must never outlast what it covers.
 *
 * The stroke starts on the left vertex and draws clockwise (across the top,
 * left → right). The hold equals that draw. The instant it finishes, the
 * panel slides off to the right so the landing page comes up on the same beat.
 *
 * Timers drive the phase changes and the unmount; the animation only decorates
 * them. Framer-motion runs on requestAnimationFrame, which browsers throttle
 * in background tabs, so hanging the unmount off an animation callback would
 * strand anyone who opens the link in a background tab behind an opaque panel.
 */
export default function Preloader({ onComplete }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onComplete?.();
      return undefined;
    }

    const wipe = setTimeout(() => setLeaving(true), TRACE_MS);
    const done = setTimeout(() => onComplete?.(), TRACE_MS + WIPE_MS);

    return () => {
      clearTimeout(wipe);
      clearTimeout(done);
    };
  }, [onComplete]);

  // Apex first — the logo's natural start. The previous path opened on the
  // upper-left vertex, one point left of where the mark should begin.
  const hex = "M12 2 L22 8.5 L22 15.5 L12 22 L2 15.5 L2 8.5 Z";

  return (
    <motion.div
      className="preloader"
      initial={{ x: '0%' }}
      animate={{ x: leaving ? '100%' : '0%' }}
      transition={{ duration: WIPE_MS / 1000, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="preloader__content">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="preloader__logo" aria-hidden="true">
          <path d={hex} className="preloader__hex" />
          <path d={hex} pathLength="100" className="preloader__trace" />
        </svg>

        <span className="preloader__brand">Haggle</span>
      </div>
    </motion.div>
  );
}
