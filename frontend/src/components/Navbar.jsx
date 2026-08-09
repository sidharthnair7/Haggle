import React, { useState, useEffect, useRef } from "react";
import { Hexagon } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

const NAV_LINKS = [
  { label: "Workspace", href: "/workspace" },
  { label: "Cookbook", href: "#" },
  { label: "Benchmarks", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "Company", href: "#" },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Twitter / X",
    href: "#",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

// Magnetic Button Component for Micro-interactions
const Magnetic = ({ children }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({x: 0, y: 0});
  
  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
    >
      {children}
    </motion.div>
  );
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const { scrollY } = useScroll();
  const [lastY, setLastY] = useState(0);

  // Intelligent scroll-aware behavior
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest < 50) {
      setIsCompact(false);
    } else if (latest > lastY && latest > 150) {
      setIsCompact(true); // Scrolling down, make it compact
    } else if (latest < lastY) {
      setIsCompact(false); // Scrolling up, expand
    }
    setLastY(latest);
  });

  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* ── Main Animated Navbar ── */}
      <div style={{ position: 'fixed', top: '24px', left: 0, width: '100%', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
        <motion.nav
          layout
          style={{
            pointerEvents: 'auto',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            padding: isCompact ? '8px 16px' : '8px 16px 8px 24px',
            gap: '16px'
          }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        >
          {/* Logo (Always visible) */}
          <motion.a layout="position" href="/" style={{ display: "flex", alignItems: "center", gap: '8px', textDecoration: 'none', color: '#000' }}>
            <Hexagon size={24} color="var(--accent-indigo)" fill="rgba(99, 102, 241, 0.2)" />
            <AnimatePresence>
              {!isCompact && (
                <motion.span 
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1rem', letterSpacing: '1px', whiteSpace: 'nowrap', overflow: 'hidden' }}
                >
                  HaggleAI
                </motion.span>
              )}
            </AnimatePresence>
          </motion.a>

          {/* Links (Visible only when expanded) */}
          <AnimatePresence>
            {!isCompact && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', width: 0 }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', width: 'auto' }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', width: 0 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', gap: '4px', overflow: 'hidden', alignItems: 'center', padding: '0 12px' }}
              >
                {NAV_LINKS.map((link, idx) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    style={{
                      position: 'relative',
                      padding: '8px 16px',
                      textDecoration: 'none',
                      color: '#000',
                      fontWeight: 500,
                      fontSize: '0.9rem',
                      zIndex: 1,
                      whiteSpace: 'nowrap',
                      transition: 'color 0.2s'
                    }}
                  >
                    {hoveredIndex === idx && (
                      <motion.div
                        layoutId="nav-pill"
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.06)', borderRadius: '100px', zIndex: -1 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {link.label}
                  </a>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA or Menu Button based on state */}
          <AnimatePresence mode="popLayout">
            {!isCompact ? (
              <motion.div
                key="cta"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <Magnetic>
                  <a href="/workspace" style={{ background: '#000', color: '#fff', padding: '10px 24px', borderRadius: '100px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-block', boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }}>
                    Enter Workspace
                  </a>
                </Magnetic>
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setOpen(true)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "8px", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#000", transition: "opacity 0.2s", borderRadius: '50%'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="currentColor">
                    <circle cx="3" cy="3" r="1.6" />
                    <circle cx="11" cy="3" r="1.6" />
                    <circle cx="19" cy="3" r="1.6" />
                    <circle cx="3" cy="9" r="1.6" />
                    <circle cx="11" cy="9" r="1.6" />
                    <circle cx="19" cy="9" r="1.6" />
                    <circle cx="3" cy="15" r="1.6" />
                    <circle cx="11" cy="15" r="1.6" />
                    <circle cx="19" cy="15" r="1.6" />
                  </svg>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>

      {/* ── Drawer Component ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", zIndex: 100
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { ease: [0.4, 0, 0.2, 1], duration: 0.3 } }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            style={{
              position: "fixed", top: 0, right: 0,
              height: "100dvh", width: "300px",
              background: "#0a0a0a", zIndex: 101,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "40px 32px 36px",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.6)"
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>

            {/* Top: nav links */}
            <div style={{ marginTop: '24px' }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#555", marginBottom: "28px", fontFamily: "monospace" }}>
                Navigation
              </p>

              <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link.label}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (i * 0.05), duration: 0.4, ease: "easeOut" }}
                    style={{
                      color: "#e8e8e8", textDecoration: "none", fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em",
                      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif", padding: "8px 0", borderBottom: "1px solid #1a1a1a",
                      display: "block", transition: "color 0.15s"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#e8e8e8")}
                  >
                    {link.label}
                  </motion.a>
                ))}
              </nav>

              <motion.a
                href="/workspace"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (NAV_LINKS.length * 0.05), duration: 0.4, ease: "easeOut" }}
                style={{
                  marginTop: "32px", display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", color: "#000",
                  textDecoration: "none", fontSize: "13px", fontWeight: 600, letterSpacing: "0.04em", padding: "10px 20px",
                  borderRadius: '100px', transition: "background 0.2s, transform 0.15s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#e8e8e8"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Enter Workspace
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </motion.a>
            </div>

            {/* Bottom: social icons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#555", marginBottom: "14px", fontFamily: "monospace" }}>
                Follow
              </p>
              <div style={{ display: "flex", gap: "16px" }}>
                {SOCIALS.map((s) => (
                  <a
                    key={s.label} href={s.href} aria-label={s.label}
                    style={{ color: "#888", transition: "color 0.15s, transform 0.15s", display: "flex", alignItems: "center" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
