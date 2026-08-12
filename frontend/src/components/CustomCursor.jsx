import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 28, stiffness: 300, mass: 0.5 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [clicking, setClicking] = useState(false);
  const rafRef = useRef(null);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const onMouseMove = useCallback((e) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
  }, [cursorX, cursorY]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Track interactive elements
    const addHoverListeners = () => {
      const interactives = document.querySelectorAll(
        'a, button, [role="button"], input, textarea, select, .cursor-hover'
      );
      interactives.forEach((el) => {
        el.addEventListener('mouseenter', () => setHovered(true));
        el.addEventListener('mouseleave', () => setHovered(false));
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', () => setClicking(true));
    window.addEventListener('mouseup', () => setClicking(false));
    window.addEventListener('mouseleave', () => setHidden(true));
    window.addEventListener('mouseenter', () => setHidden(false));

    addHoverListeners();

    // Re-scan for interactive elements periodically (for dynamically added elements)
    const observer = new MutationObserver(() => {
      addHoverListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      observer.disconnect();
    };
  }, [onMouseMove, prefersReducedMotion]);

  // Don't render on touch devices or reduced motion
  if (prefersReducedMotion) return null;
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <>
      {/* Main dot */}
      <motion.div
        className="custom-cursor-dot"
        style={{
          x,
          y,
          opacity: hidden ? 0 : 1,
          scale: clicking ? 0.8 : hovered ? 2.5 : 1,
        }}
        transition={{ scale: { type: 'spring', stiffness: 400, damping: 20 } }}
      />
      {/* Outer glow ring */}
      <motion.div
        className="custom-cursor-ring"
        style={{
          x,
          y,
          opacity: hidden ? 0 : hovered ? 0.6 : 0,
          scale: clicking ? 1.8 : hovered ? 1 : 0.5,
        }}
        transition={{ scale: { type: 'spring', stiffness: 200, damping: 20 } }}
      />
    </>
  );
}
