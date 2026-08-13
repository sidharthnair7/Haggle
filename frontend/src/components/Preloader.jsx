import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Preloader({ onComplete }) {
  const [phase, setPhase] = useState('drawing'); // drawing → hold → exit
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Draw logo stroke
    const holdTimer = setTimeout(() => setPhase('hold'), 1000);
    const exitTimer = setTimeout(() => setPhase('exit'), 1400);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 1900);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Wipe overlay that slides up on exit */}
          <motion.div
            className="preloader__wipe"
            animate={phase === 'exit' ? { y: '-100%' } : { y: '0%' }}
            transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
          />

          {/* Center content */}
          <div className="preloader__content">
            {/* Hexagon logo with stroke draw */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              className="preloader__logo"
            >
              <motion.polygon
                points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"
                stroke="#6366F1"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0, opacity: 0.3 }}
                animate={
                  phase === 'drawing' || phase === 'hold'
                    ? { pathLength: 1, opacity: 1 }
                    : { pathLength: 1, opacity: 1 }
                }
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Inner glow fill that fades in */}
              <motion.polygon
                points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"
                fill="rgba(99, 102, 241, 0.08)"
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === 'hold' || phase === 'exit' ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
            </svg>

            {/* Brand name */}
            <motion.span
              className="preloader__brand"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: phase !== 'drawing' ? 0.6 : 0, y: phase !== 'drawing' ? 0 : 8 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              Haggle
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
