import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Topography from './Topography/Topography';
import MagneticButton from './MagneticButton';

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────────────────────────────────
   WORD REVEAL COMPONENT
   Splits text into words and animates each with staggered y-reveal
───────────────────────────────────────────────────── */
function WordReveal({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const words = typeof children === 'string' ? children.split(' ') : [children];

  return (
    <span ref={ref} className={className} style={{ ...style, display: 'inline' }}>
      {words.map((word, i) => (
        <span key={i} className="word-reveal" style={{ marginRight: '0.3em' }}>
          <motion.span
            className="word-reveal__inner"
            initial={{ y: '110%', opacity: 0 }}
            animate={inView ? { y: '0%', opacity: 1 } : {}}
            transition={{
              duration: 0.6,
              delay: delay + i * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ─────────────────────────────────────────────────────
   LINE REVEAL — mask reveal per line
───────────────────────────────────────────────────── */
function LineReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <div ref={ref} style={{ overflow: 'hidden' }}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={inView ? { y: '0%', opacity: 1 } : {}}
        transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   TERMINAL STREAM HOOK
   Streams an array of log lines with realistic delays
───────────────────────────────────────────────────── */
/**
 * Paces the log by each line's `delay` step rather than its index, so related
 * lines (the five clinic quotes, say) land together and there's a real beat
 * between phases. Streaming at a flat rate per line reads as a wall of text
 * arriving at once — the pauses are what make it legible.
 */
function useTerminalStream(lines, active, stepMs = 620) {
  const [visible, setVisible] = useState([]);
  const [cursor, setCursor] = useState(true);
  const timeouts = useRef([]);

  useEffect(() => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setVisible([]);
    if (!active) return;

    let groupIndex = 0;
    let lastStep = null;
    lines.forEach((line) => {
      const step = line.delay ?? 0;
      // Small stagger inside a group so a burst doesn't snap in all at once.
      groupIndex = step === lastStep ? groupIndex + 1 : 0;
      lastStep = step;

      const at = step * stepMs + groupIndex * 130;
      const t = setTimeout(() => {
        setVisible(prev => [...prev, line]);
      }, at);
      timeouts.current.push(t);
    });
    return () => timeouts.current.forEach(clearTimeout);
  }, [active]);

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  return { visible, cursor };
}

/* ─────────────────────────────────────────────────────
   TYPEWRITER HOOK
───────────────────────────────────────────────────── */
function useTypewriter(text, active, speed = 28) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active) { setDisplayed(''); return; }
    let i = 0;
    setDisplayed('');
    const t = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text, active]);
  return displayed;
}

/* ─────────────────────────────────────────────────────
   LIVE TERMINAL HERO
───────────────────────────────────────────────────── */
/**
 * Transcript of an actual run, copied verbatim from the API — same clinics,
 * same figures, same spoken lines you get in the workspace. The page and the
 * product have to tell the same story; invented numbers here would be the first
 * thing to fall apart when someone clicks through.
 */
const AGENT_LINES = [
  { text: '> haggle run --procedure "MRI lumbar spine, no contrast" --near Toronto', color: 'var(--accent-indigo)', delay: 0 },
  { text: '✓ Spec parsed · 5 clinics dialled in parallel', color: '#059669', delay: 1 },
  { text: '', delay: 2 },
  { text: '  Agent  → "Hi, this is the Haggle agent calling for a patient..."', color: 'var(--accent-indigo)', delay: 2 },
  { text: '  Scarborough Health Scan   "Hold on, is this an AI? Sorry, we don\'t do this."', color: '#e11d48', delay: 3 },
  { text: '  Danforth Medical           $460   itemized', color: 'rgba(0,0,0,0.7)', delay: 4 },
  { text: '  Bloor West Imaging       $495   itemized', color: 'rgba(0,0,0,0.7)', delay: 4 },
  { text: '  Yorkville Radiology      $610   itemized', color: 'rgba(0,0,0,0.7)', delay: 5 },
  { text: '  Queen Street Diag.     $380   ⚠ no breakdown given', color: '#e11d48', delay: 5 },
  { text: '', delay: 6 },
  { text: '» Pressing Queen Street for an itemized breakdown...', color: 'rgba(0,0,0,0.5)', delay: 6 },
  { text: '  Clinic → "the scan is $380, then $120 facility and $75 contrast admin."', color: 'rgba(0,0,0,0.7)', delay: 7 },
  { text: '  Queen Street Diag.     $575   ← $195 in fees revealed', color: '#e11d48', delay: 8 },
  { text: '', delay: 9 },
  { text: '» Round 2 · citing verified competing quotes', color: 'rgba(0,0,0,0.5)', delay: 9 },
  { text: '  Agent  → "Danforth Medical quoted me $460 — can you get closer to that?"', color: 'var(--accent-indigo)', delay: 10 },
  { text: '  Clinic → "Uh, let me see... I can get you a total of $481."', color: 'rgba(0,0,0,0.7)', delay: 11 },
  { text: '  ✗ REFUSED  agent tried to cite $200 — not in the quote store', color: '#e11d48', delay: 12 },
  { text: '', delay: 13 },
  { text: '══ RANKED REPORT ═══════════════════════════════════', color: '#4f46e5', delay: 14 },
  { text: '  RANK 1  Danforth Medical Imaging     $460   ← BEST DEAL', color: '#059669', delay: 14 },
  { text: '  RANK 2  Bloor West Imaging           $465', color: 'rgba(0,0,0,0.7)', delay: 14 },
  { text: '  RANK 3  Yorkville Radiology          $469', color: 'rgba(0,0,0,0.7)', delay: 14 },
  { text: '  RANK 4  Queen Street Diagnostics    $481', color: 'rgba(0,0,0,0.7)', delay: 15 },
  { text: '  Scarborough Health Scan       declined to quote', color: 'rgba(0,0,0,0.4)', delay: 15 },
  { text: '', delay: 16 },
  { text: '  Opening market  $460–$575    saved vs. one clinic at random  $62', color: '#059669', delay: 16 },
  { text: '  Largest concession  $94 (Queen Street Diag.)', color: '#059669', delay: 17 },
  { text: '✓ Every cited figure verified against the quote store.', color: '#059669', delay: 18 },
];

function LiveTerminal({ running, onComplete }) {
  const { visible, cursor } = useTerminalStream(AGENT_LINES, running, 620);
  useEffect(() => {
    if (visible.length === AGENT_LINES.length && onComplete) {
      const t = setTimeout(onComplete, 800);
      return () => clearTimeout(t);
    }
  }, [visible.length]);
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 'clamp(0.72rem, 1.1vw, 0.85rem)',
      lineHeight: 1.75,
      color: '#e2e8f0',
      padding: '20px 24px',
      minHeight: '360px',
      maxHeight: '360px',
      overflowY: 'auto',
      background: 'transparent',
    }}>
      {visible.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ color: line.color || 'rgba(0,0,0,0.7)', whiteSpace: 'pre', marginBottom: '1px' }}
        >
          {line.text}
        </motion.div>
      ))}
      {running && visible.length < AGENT_LINES.length && (
        <span style={{ color: '#a78bfa', opacity: cursor ? 1 : 0 }}>█</span>
      )}
      {!running && visible.length === 0 && (
        <span style={{ color: 'rgba(0,0,0,0.15)' }}>
          Waiting for input...{cursor ? '█' : ' '}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   INTERACTIVE PIPELINE — Scroll-driven flowchart
───────────────────────────────────────────────────── */
const PIPELINE_STEPS = [
  {
    num: '01',
    label: 'Parse',
    title: 'Spec Extraction',
    desc: 'Upload a doctor\'s order PDF or type the procedure. The agent parses it into a frozen negotiation spec — procedure, modality, facility type, and contrast requirements.',
    color: '#6366f1',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    num: '02',
    label: 'Query',
    title: 'Provider Sweep',
    desc: 'Every clinic is worked at once on its own thread. Queen Street Diagnostics quotes $380 — until we ask for the breakdown and $195 in fees appear.',
    color: '#0ea5e9',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 1h3.02a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 15.92z"/>
      </svg>
    ),
  },
  {
    num: '03',
    label: 'Haggle',
    title: 'Autonomous Negotiation',
    desc: 'The agent calls back citing verified competing quotes. It cannot invent a figure — every price it names is checked against the quote store first, or refused.',
    color: '#8b5cf6',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
  {
    num: '04',
    label: 'Report',
    title: 'Ranked Audit Report',
    desc: 'Offers ranked, with the full call transcript behind each one. Danforth Medical wins at $460, and every price movement traces to the quote that caused it.',
    color: '#10b981',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

function PipelineStep({ step, index, isActive, onClick }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className="elevated-card"
      style={{
        padding: '24px 28px',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isActive ? step.color + '40' : 'rgba(0,0,0,0.06)'}`,
        background: isActive ? `${step.color}08` : 'rgba(0,0,0,0.02)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        perspective: '600px',
      }}
    >
      {/* Left accent bar */}
      <motion.div
        animate={{ height: isActive ? '100%' : '0%' }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute', left: 0, top: 0,
          width: '3px',
          background: step.color,
          borderRadius: '0 3px 3px 0',
        }}
      />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: `${step.color}18`,
          border: `1px solid ${step.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: step.color,
          transition: 'all 0.3s ease',
          boxShadow: isActive ? `0 0 20px ${step.color}30` : 'none',
        }}>
          {step.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: step.color, fontWeight: 700, letterSpacing: '0.1em',
            }}>
              {step.num}
            </span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
              color: isActive ? 'var(--text-primary)' : 'rgba(0,0,0,0.65)',
              transition: 'color 0.3s',
            }}>
              {step.title}
            </span>
          </div>
          <AnimatePresence>
            {isActive && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.62)', lineHeight: 1.65 }}
              >
                {step.desc}
              </motion.p>
            )}
          </AnimatePresence>
          {!isActive && (
            <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>
              {step.desc.slice(0, 60)}…
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────
   WAVEFORM — phone call visual
───────────────────────────────────────────────────── */
function CallWave({ active, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '28px' }}>
      {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.55, 0.85, 0.65, 0.95].map((h, i) => (
        <motion.div
          key={i}
          style={{ width: '3px', borderRadius: '3px', background: color || 'var(--accent-indigo)' }}
          animate={active ? {
            height: [`${8}px`, `${Math.round(h * 24)}px`, `${8}px`],
          } : { height: '4px' }}
          transition={active ? {
            duration: 0.9 + i * 0.06,
            repeat: Infinity,
            delay: i * 0.08,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   DEMO STRIP — interactive 3-panel walkthrough
───────────────────────────────────────────────────── */
// Same clinics and figures the workspace produces — see AGENT_LINES above.
const PROVIDERS = [
  { name: 'Danforth Medical Imaging', initial: 460, final: 460, color: '#10b981' },
  { name: 'Bloor West Imaging', initial: 495, final: 465, color: '#94a3b8' },
  { name: 'Queen Street Diagnostics', initial: 575, final: 481, color: '#f43f5e', flag: true },
];

function InteractiveDemo() {
  const [step, setStep] = useState(0); // 0=spec, 1=calling, 2=results
  const [parsed, setParsed] = useState(false);
  const [callingDone, setCallingDone] = useState(false);
  const [orderText, setOrderText] = useState(
    'Schedule lumbar MRI without contrast at an outpatient freestanding imaging center. Rule out L4-S1 disc herniation.'
  );
  const sectionRef = useRef(null);

  const specText = useTypewriter(
    parsed ? 'MRI · Lumbar Spine · No Contrast · Outpatient Freestanding' : '',
    parsed,
    22
  );

  // Pacing: each stage needs long enough to be read, not just seen. The quotes
  // arriving and then moving is the whole point of stage 2 — rushing past it
  // leaves the viewer with three panels they never actually looked at.
  const handleParse = () => {
    setParsed(true);
    setTimeout(() => setStep(1), 1800);
  };

  const handleCalling = () => {
    setStep(1);
    setTimeout(() => setCallingDone(true), 5200);
    setTimeout(() => setStep(2), 6400);
  };

  const reset = () => {
    setStep(0); setParsed(false); setCallingDone(false);
    setOrderText('Schedule lumbar MRI without contrast at an outpatient freestanding imaging center. Rule out L4-S1 disc herniation.');
  };

  // Scroll-scrubbed tab switching
  useEffect(() => {
    if (!sectionRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 60%',
      end: 'bottom 40%',
      onUpdate: (self) => {
        const progress = self.progress;
        if (progress < 0.33) {
          // Parsing phase
          if (step === 0 && !parsed) {
            setParsed(true);
            setTimeout(() => setStep(1), 1800);
          }
        } else if (progress < 0.66) {
          if (step === 1 && !callingDone) {
            setCallingDone(true);
            // Scrolling past shouldn't skip the negotiation — this was 700ms,
            // which meant the quotes appeared and resolved in one blink.
            setTimeout(() => setStep(2), 2600);
          }
        }
      },
    });

    return () => trigger.kill();
  }, [step, parsed, callingDone]);

  const STEP_LABELS = ['1 · Parse Spec', '2 · Call Providers', '3 · Ranked Results'];

  return (
    <div ref={sectionRef} style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
    }}>
      {/* Header tabs — .demo-tabs lets these wrap instead of overflowing on phones */}
      <div className="demo-tabs" style={{
        display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(0,0,0,0.02)',
      }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{
            flex: 1, padding: '12px',
            textAlign: 'center',
            fontSize: '0.72rem', fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            color: step === i ? 'var(--text-primary)' : 'rgba(0,0,0,0.4)',
            borderBottom: `2px solid ${step === i ? 'var(--accent-indigo)' : 'transparent'}`,
            transition: 'all 0.3s',
            cursor: 'pointer',
          }} onClick={() => {
            if (i === 0) reset();
            else if (i === 1 && step >= 1) setStep(1);
            else if (i === 2 && step >= 2) setStep(2);
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Panel */}
      <div style={{ padding: '28px', minHeight: '260px' }}>
        <AnimatePresence mode="wait">

          {/* STEP 0 — Spec */}
          {step === 0 && (
            <motion.div key="spec"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px' }}>
                Doctor's Order
              </div>
              <textarea
                value={orderText}
                onChange={e => { setOrderText(e.target.value); setParsed(false); }}
                rows={3}
                style={{
                  width: '100%', padding: '14px',
                  background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.15)',
                  borderRadius: 'var(--radius-md)', resize: 'none',
                  color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.6,
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(0,0,0,0.09)'}
              />

              {parsed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: '12px', padding: '12px 16px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-indigo)',
                  }}
                >
                  ✓ {specText}
                  {specText.length < 'MRI · Lumbar Spine · No Contrast · Outpatient Freestanding'.length && (
                    <span style={{ opacity: 0.5 }}>█</span>
                  )}
                </motion.div>
              )}

              <button
                className="btn-gradient"
                onClick={handleParse}
                style={{ marginTop: '16px', width: '100%', padding: '12px', fontSize: '0.88rem', borderRadius: 'var(--radius-md)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: '6px' }}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Parse Order & Build Spec
              </button>
            </motion.div>
          )}

          {/* STEP 1 — Calling */}
          {step === 1 && (
            <motion.div key="calling"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Calling Providers
                </div>
                {!callingDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    <div className="status-dot pulse" style={{ width: '5px', height: '5px' }} />
                    LIVE
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {PROVIDERS.map((p, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.4, duration: 0.4 }}
                    style={{
                      padding: '14px 16px',
                      background: 'rgba(0,0,0,0.02)', border: `1px solid ${callingDone ? p.color + '30' : 'rgba(0,0,0,0.07)'}`,
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'border-color 0.5s',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(0,0,0,0.8)', marginBottom: '4px' }}>{p.name}</div>
                      {callingDone
                        ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: p.color, fontWeight: 700 }}>${p.initial} initial</div>
                        : <div style={{ fontSize: '0.72rem', color: 'rgba(0,0,0,0.45)' }}>Dialing...</div>
                      }
                    </div>
                    <CallWave active={!callingDone} color={callingDone ? p.color : 'rgba(99,102,241,0.6)'} />
                  </motion.div>
                ))}
              </div>
              {!callingDone && (
                <button onClick={handleCalling} disabled={true}
                  style={{ marginTop: '16px', width: '100%', padding: '12px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.3)', cursor: 'not-allowed' }}>
                  Sweeping providers…
                </button>
              )}
              {callingDone && (
                <button className="btn-gradient" onClick={() => setStep(2)}
                  style={{ marginTop: '16px', width: '100%', padding: '12px', fontSize: '0.88rem', borderRadius: 'var(--radius-md)' }}>
                  Start Negotiation →
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 2 — Results */}
          {step === 2 && (
            <motion.div key="results"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Verified Offers
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>
                  $460 best · opened at $575
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PROVIDERS.map((p, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      padding: '14px 16px',
                      background: i === 0 ? 'rgba(16,185,129,0.06)' : p.flag ? 'rgba(244,63,94,0.04)' : 'rgba(0,0,0,0.02)',
                      border: `1px solid ${p.color}30`,
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(0,0,0,0.45)' }}>
                        #{i + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'rgba(0,0,0,0.85)' }}>{p.name}</div>
                        {p.flag && <div style={{ fontSize: '0.68rem', color: '#f43f5e', fontWeight: 600 }}>⚠ Over Benchmark</div>}
                        {i === 0 && <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>✓ Best Deal</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem', color: p.color }}>
                        ${p.final}
                      </div>
                      {p.final !== p.initial && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.4)', textDecoration: 'line-through' }}>
                          ${p.initial}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={reset} style={{
                marginTop: '16px', width: '100%', padding: '10px', fontSize: '0.82rem',
                borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.6)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.color = 'rgba(0,0,0,0.4)'; }}
              >
                ↺ Run Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [terminalRunning, setTerminalRunning] = useState(true);
  const [terminalDone, setTerminalDone] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Auto-cycle pipeline steps
  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep(s => (s + 1) % PIPELINE_STEPS.length);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', position: 'relative', overflowX: 'hidden' }}>

      {/* ══════════════════════════════ HERO ══ */}
      {/* ══════════════════════════════ HERO ══ */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        paddingTop: '120px', paddingBottom: '80px',
      }}>
        {/* Topography bg — subtle overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <Topography
            lowColor="#10b981" midColor="#0ea5e9" highColor="#8b5cf6"
            speed={0.25} morphAmount={2.5} morphSpeed={0.04}
            bands={2.5} thickness={0.015} scale={1.1}
            pixelSize={1.0} glow={0.7} colorMode="elevation"
            contrast={2.2} brightness={1.2} fillBands={false}
            opacity={0.45} grain={true} grainIntensity={0.03}
            mouseInteraction={true} mouseRadius={0.35} mouseStrength={0.35}
          />
        </div>

        {/* Gradient fade to bg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 90% 80% at 50% 0%, transparent 0%, var(--bg-primary) 75%)',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '0', padding: '0 24px', width: '100%', maxWidth: '1100px',
        }}>

          {/* Tag */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: '24px', textAlign: 'center' }}
          >
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '5px 14px 5px 10px',
              background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '100px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)',
              color: 'var(--accent-indigo)',
              backdropFilter: 'blur(8px)',
            }}>
              <div className="status-dot indigo" style={{ width: '5px', height: '5px' }} />
              hackathon demo · simulated clinics
            </div>
          </motion.div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 7.5vw, 6.5rem)',
              fontWeight: 900, lineHeight: 0.95,
              letterSpacing: '-0.04em', margin: '0 0 28px',
              textAlign: 'center', color: '#111827',
            }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'block' }}
            >
              Five clinics compete.
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'block',
                background: 'linear-gradient(in oklch, #6366f1, #a78bfa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                paddingBottom: '0.15em',
              }}
            >
              Every price verified.
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              color: 'var(--text-secondary)', maxWidth: '560px',
              fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', lineHeight: 1.65,
              textAlign: 'center', marginBottom: '12px',
            }}
          >
            Say what scan you need. A negotiator agent works every clinic at once, plays their quotes against each other, and comes back with the lowest itemized cash price — and it can't cite a figure no clinic actually gave.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
            style={{
              color: 'rgba(17,24,39,0.45)', maxWidth: '520px',
              fontSize: '0.82rem', lineHeight: 1.5, textAlign: 'center',
              fontFamily: 'var(--font-mono)', marginBottom: '40px',
            }}
          >
            The five desks are simulated. Quotes, itemization, and the honesty gate are real.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            style={{ display: 'flex', gap: '12px', marginBottom: '60px', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <MagneticButton
              className="btn-gradient"
              onClick={() => navigate('/workspace')}
              buttonStyle={{ padding: '14px 32px', fontSize: '1.05rem', borderRadius: 'var(--radius-pill)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run a Negotiation
            </MagneticButton>
            <button
              onClick={() => { setTerminalRunning(false); setTimeout(() => setTerminalRunning(true), 50); setTerminalDone(false); }}
              style={{
                padding: '14px 28px', fontSize: '1.05rem', borderRadius: 'var(--radius-pill)',
                background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                transition: 'all 0.2s', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: '8px'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              &gt;_ Watch Agent Run
            </button>
          </motion.div>

          {/* Terminal Window */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: '100%', maxWidth: '820px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.12), 0 0 0 1px rgba(99,102,241,0.1)',
            }}
          >
            {/* Terminal chrome */}
            <div style={{
              padding: '12px 18px', background: '#F2F2F5',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
              <span style={{
                marginLeft: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                color: 'rgba(0,0,0,0.45)', letterSpacing: '0.05em',
              }}>
                haggle — agent runtime v0.1.0
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                {!terminalRunning && (
                  <button
                    onClick={() => { setTerminalRunning(true); setTerminalDone(false); }}
                    style={{
                      padding: '3px 12px', borderRadius: '100px', fontSize: '0.7rem',
                      background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)',
                      color: 'var(--accent-indigo)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      fontWeight: 700, letterSpacing: '0.04em',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.35)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                  >
                    ▶ run
                  </button>
                )}
                {terminalRunning && !terminalDone && (
                  <button
                    onClick={() => { setTerminalRunning(false); setTerminalDone(false); }}
                    style={{
                      padding: '3px 12px', borderRadius: '100px', fontSize: '0.7rem',
                      background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.3)',
                      color: '#f43f5e', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      fontWeight: 700, letterSpacing: '0.04em',
                    }}
                  >
                    ■ stop
                  </button>
                )}
                {terminalDone && (
                  <button
                    onClick={() => { setTerminalRunning(false); setTimeout(() => { setTerminalRunning(true); setTerminalDone(false); }, 60); }}
                    style={{
                      padding: '3px 12px', borderRadius: '100px', fontSize: '0.7rem',
                      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                      color: '#10b981', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                      fontWeight: 700, letterSpacing: '0.04em',
                    }}
                  >
                    ↺ replay
                  </button>
                )}
              </div>
            </div>
            <LiveTerminal
              running={terminalRunning}
              onComplete={() => setTerminalDone(true)}
            />
          </motion.div>
        </div>
      </section>

      {/* ════════════════════ INTERACTIVE DEMO STRIP ══ */}
      <section style={{ padding: '150px 0', background: 'var(--bg-primary)', position: 'relative' }}>
        {/* Divider glow */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', width: '60%', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.3), transparent)',
        }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>

            {/* Left — description */}
            <div>
              <div className="section-eyebrow">
                <div className="section-eyebrow__rule" />
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Try it yourself
              </div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
                fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em',
                marginBottom: '16px',
              }}>
                <LineReveal>Three steps.</LineReveal>
                <LineReveal delay={0.15}>
                  <span style={{ color: 'rgba(0,0,0,0.55)' }}>One bill that's fair.</span>
                </LineReveal>
              </h2>
              <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '380px' }}>
                This is the actual product flow. Edit the doctor's order, watch the agent call providers, and see the ranked results — all right here.
              </p>
              <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {['Parse any doctor\'s order in seconds', 'Every clinic worked in parallel', 'Negotiation with gate-verified leverage', 'Full call transcript, every time'].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'rgba(0,0,0,0.65)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {item}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right — interactive demo */}
            <InteractiveDemo />
          </div>
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS PIPELINE ══ */}
      <section style={{ padding: '150px 0', background: 'var(--bg-card)', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '20%', width: '60%', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent)',
        }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
              <div className="section-eyebrow__rule" />
              Under the hood
              <div className="section-eyebrow__rule" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em',
            }}>
              <LineReveal>The negotiation pipeline</LineReveal>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
            {PIPELINE_STEPS.map((step, i) => (
              <PipelineStep
                key={i} step={step} index={i}
                isActive={activeStep === i}
                onClick={() => setActiveStep(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FINAL CTA ══ */}
      <section style={{ padding: '150px 0 200px', background: 'var(--bg-primary)', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: '20%', width: '60%', height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.25), transparent)',
        }} />
        {/* ambient */}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: 'min(600px, 100%)', height: '300px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
              <div className="section-eyebrow__rule" />
              No setup. No signup. Just run it.
              <div className="section-eyebrow__rule" />
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.04em',
              color: 'var(--text-primary)', marginBottom: '20px',
            }}>
              <WordReveal>See it work.</WordReveal>{' '}
              <span style={{
                background: 'linear-gradient(in oklch, #0ea5e9, #6366f1)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                <WordReveal delay={0.3}>Now.</WordReveal>
              </span>
            </h2>
            <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: '1rem', lineHeight: 1.65, marginBottom: '40px' }}>
              Open the workspace, enter a procedure, and watch the agent negotiate in real time.
            </p>
            <MagneticButton
              className="btn-gradient"
              onClick={() => navigate('/workspace')}
              buttonStyle={{
                padding: '16px 40px', fontSize: '1.05rem',
                borderRadius: 'var(--radius-pill)',
                boxShadow: '0 8px 40px rgba(99,102,241,0.4)',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: '6px' }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Enter Workspace
            </MagneticButton>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
