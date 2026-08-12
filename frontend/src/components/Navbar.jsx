import React, { useState, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

/* ── Magnetic hover micro-interaction ─────────── */
const Magnetic = ({ children }) => {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    setPos({ x: (clientX - (left + width / 2)) * 0.18, y: (clientY - (top + height / 2)) * 0.18 });
  };
  const reset = () => setPos({ x: 0, y: 0 });
  return (
    <motion.div ref={ref} onMouseMove={handleMouse} onMouseLeave={reset}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 160, damping: 14, mass: 0.1 }}>
      {children}
    </motion.div>
  );
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isWorkspace = location.pathname === '/workspace';

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  const spring = { type: 'spring', bounce: 0.1, duration: 0.42 };

  return (
    <motion.div
      animate={{ top: scrolled ? '12px' : '24px' }}
      transition={spring}
      style={{
        position: 'fixed', left: 0, width: '100%',
        display: 'flex', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 50,
      }}
    >
      <motion.nav
        layout="size"
        animate={{
          background: scrolled ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.45)',
          boxShadow: scrolled
            ? '0 8px 32px rgba(31, 38, 135, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.7)'
            : '0 8px 32px rgba(31, 38, 135, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
        }}
        style={{
          pointerEvents: 'auto',
          borderRadius: '100px',
          display: 'flex',
          alignItems: 'center',
          /* Symmetric padding: top/bottom and left/right */
          padding: '6px 6px 6px 18px',
          gap: '10px',
          border: '1px solid rgba(0,0,0,0.05)',
          backdropFilter: 'blur(24px) saturate(200%)',
          WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        }}
        transition={spring}
      >
        {/* ── Logo ── */}
        <a
          href="/"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="rgba(99,102,241,0.12)" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
          </svg>
          <span style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: '0.88rem',
            letterSpacing: '-0.01em',
            color: '#111827',
            whiteSpace: 'nowrap',
          }}>
            HaggleAI
          </span>
        </a>

        {/* ── Status badge — fades out on scroll ── */}
        <AnimatePresence>
          {!scrolled && (
            <motion.div
              key="status-group"
              initial={{ opacity: 0, maxWidth: 0 }}
              animate={{ opacity: 1, maxWidth: '160px' }}
              exit={{ opacity: 0, maxWidth: 0 }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.25 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                overflow: 'hidden', flexShrink: 0,
              }}
            >
              {/* Divider */}
              <div style={{
                width: '1px', height: '14px',
                background: 'rgba(0,0,0,0.10)', flexShrink: 0,
              }} />
              {/* Status dot + label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div
                  className="status-dot pulse"
                  style={{ width: '6px', height: '6px', background: '#10B981', boxShadow: '0 0 8px rgba(16,185,129,0.7)', flexShrink: 0 }}
                />
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600, color: '#059669',
                  letterSpacing: '0.02em', fontFamily: "'Inter', system-ui, sans-serif",
                  whiteSpace: 'nowrap',
                }}>
                  {isWorkspace ? 'Agent Active' : 'Live Demo'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CTA button ── */}
        <Magnetic>
          <motion.button
            onClick={() => navigate('/workspace')}
            layout
            transition={spring}
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
              color: '#fff',
              borderRadius: '100px',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              /* Square-ish padding when icon-only; wide when label shown */
              padding: scrolled ? '8px 10px' : '9px 20px',
              gap: '7px',
              whiteSpace: 'nowrap',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.84rem',
              letterSpacing: '0.01em',
              boxShadow: '0 2px 10px rgba(99,102,241,0.28)',
              flexShrink: 0,
              transition: 'padding 0.25s ease',
            }}
            whileHover={{ filter: 'brightness(1.08)', boxShadow: '0 4px 18px rgba(99,102,241,0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Play icon — always shown */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ flexShrink: 0 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>

            {/* Label — removed when scrolled */}
            <AnimatePresence>
              {!scrolled && (
                <motion.span
                  key="btn-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ type: 'tween', ease: 'easeInOut', duration: 0.22 }}
                  style={{ overflow: 'hidden', display: 'inline-block', whiteSpace: 'nowrap' }}
                >
                  Run Demo
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </Magnetic>
      </motion.nav>
    </motion.div>
  );
}

