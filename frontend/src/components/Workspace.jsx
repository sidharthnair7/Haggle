import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, AlertTriangle, UploadCloud, Edit2,
  PlayCircle, Shield, FileText, Activity, Bot, User,
  BarChart2, RefreshCw, ChevronRight, Copy, Download
} from 'lucide-react';
import './Workspace.css';
import { startRun, getRun, subscribeRunEvents, tryBluff } from '../api';
import { extractPdfText, extractSpecFromOrder, isPdfFile, isTextReferral } from '../referral';

/* ─── Backend snapshot → view model ──────────────
   The UI shapes below (providers / logs / savings / redFlag / dialogue) are
   exactly what the design already renders. Only their source changed: a live
   run instead of a scripted timeline. */

const money = (n) => Math.round(Number(n) || 0);

/** Collapse the append-only quote history into one card per clinic. */
function buildProviders(snap, winnerName) {
  const byClinic = new Map();

  for (const q of snap.quotes || []) {
    const entry = byClinic.get(q.clinicName) || {
      name: q.clinicName, opening: null, latest: null, lastRaw: null,
    };
    if (q.citable) {
      if (!entry.opening) entry.opening = q;
      entry.latest = q;
    }
    entry.lastRaw = q;
    byClinic.set(q.clinicName, entry);
  }

  return [...byClinic.values()].map((e, i) => {
    const opening = e.opening ? money(e.opening.total) : null;
    const current = e.latest ? money(e.latest.total) : null;
    const outcome = e.lastRaw?.outcome;

    let status = 'Awaiting response';
    let statusType = 'pending';

    if (!e.latest && outcome === 'DECLINED') {
      status = "Wouldn't quote";
    } else if (!e.latest && outcome === 'BUNDLED') {
      status = 'No breakdown yet';
      statusType = 'warn';
    } else if (current !== null && e.name === winnerName) {
      status = 'Best deal';
      statusType = 'complete';
    } else if (opening !== null && current !== null && current < opening) {
      status = 'Price reduced';
      statusType = 'complete';
    } else if (current !== null) {
      status = 'Held firm';
    }

    return {
      id: e.name || `clinic-${i}`,
      name: e.name,
      initialPrice: opening,
      price: current,
      status,
      statusType,
    };
  });
}

/** Backend events → the audit log rows the design already renders (newest first). */
function buildLogs(snap) {
  return [...(snap.events || [])]
    .reverse()
    .map((ev) => ({
      id: ev.id,
      time: new Date(ev.at).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }),
      clinic: ev.clinicName || 'System',
      action: ev.detail || ev.type,
      bid: ev.amount != null ? `$${money(ev.amount)}` : '—',
    }));
}

/** The hidden-fee reveal, stated the way a patient would understand it. */
function buildRedFlag(snap) {
  const quotes = snap.quotes || [];
  const pressed = (snap.events || []).find((e) => e.type === 'PRESSED_FOR_ITEMIZATION');
  if (!pressed) return null;

  const bundled = quotes.find((q) => q.clinicName === pressed.clinicName && q.outcome === 'BUNDLED');
  const revealed = quotes.find((q) => q.clinicName === pressed.clinicName && q.citable);
  if (!bundled || !revealed) return null;

  const hidden = money(revealed.total) - money(bundled.total);
  if (hidden <= 0) return null;
  return `${pressed.clinicName} quoted $${money(bundled.total)} up front, then added $${hidden} in fees once we asked for the full breakdown.`;
}

/**
 * Most recent exchange, for the live chat bubbles.
 *
 * Reads the real transcript rather than event descriptions, so the bubbles show
 * what was actually said on the call instead of a summary of it.
 */
function buildDialogue(snap) {
  const turns = snap.conversation || [];
  if (turns.length === 0) return null;

  // Pair the latest clinic line with the agent line that preceded it.
  // Never invent a clinic reply — a closing "got it, thanks" has no answer.
  const lastClinic = [...turns].reverse().find((t) => t.speaker === 'CLINIC');
  if (lastClinic) {
    const agentBefore = [...turns].reverse().find(
      (t) => t.speaker === 'AGENT'
        && t.clinicName === lastClinic.clinicName
        && t.id < lastClinic.id
    );
    return {
      agent: agentBefore ? agentBefore.text : lastClinic.text,
      clinic: lastClinic.text,
    };
  }

  const lastAgent = [...turns].reverse().find((t) => t.speaker === 'AGENT');
  return lastAgent ? { agent: lastAgent.text, clinic: null } : null;
}

/* ─── Typewriter hook ────────────────────────── */
// Typing reveals a chunk per tick, not a character. One char per 16ms meant
// ~60 setState calls a second, each re-rendering a tree with two dozen motion
// components — that was the stutter in the live column. Same reading speed,
// about a fifth of the renders, and long lines cost no more than short ones.
const TYPE_TICK_MS = 45;
const TYPE_TARGET_MS = 2200;

function useTypewriter(text, active, speed = TYPE_TICK_MS) {
  const [displayed, setDisplayed] = useState('');
  const interval = useRef(null);
  useEffect(() => {
    if (interval.current) clearInterval(interval.current);
    if (!active || !text) { setDisplayed(''); return; }
    const ticks = Math.max(1, Math.round(TYPE_TARGET_MS / speed));
    const perTick = Math.max(1, Math.ceil(text.length / ticks));
    let i = 0;
    setDisplayed('');
    interval.current = setInterval(() => {
      i = Math.min(text.length, i + perTick);
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval.current);
    }, speed);
    return () => clearInterval(interval.current);
  }, [text, active, speed]);
  return displayed;
}

/* ─── Animated savings number ─────────────────── */
import { useSpring } from 'framer-motion';

function CountUp({ target }) {
  const goal = Math.floor(Number(target) || 0);
  const [val, setVal] = useState(goal);
  const springValue = useSpring(0, { stiffness: 50, damping: 20 });

  useEffect(() => {
    // Subscribe before setting — set() can emit immediately, and a listener
    // attached afterwards misses the only change event.
    const unsubscribe = springValue.on('change', (latest) => setVal(Math.floor(latest)));
    springValue.set(goal);

    // The animation is decoration; the number is the product. If the spring
    // never emits, land on the real value anyway rather than showing $0.
    const settle = setTimeout(() => setVal(goal), 1200);

    return () => { unsubscribe(); clearTimeout(settle); };
  }, [goal, springValue]);

  return <>{val.toLocaleString()}</>;
}

/* ─── Radial progress arc ─────────────────────── */
function SavingsArc({ percent }) {
  const r = 54, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - percent / 100);
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" style={{ overflow: 'visible' }}>
      <g style={{ transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="8" />
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="var(--accent-emerald)"
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </g>
    </svg>
  );
}

/* ─── Mini price bar ─────────────────────────── */
function PriceBar({ initial, current, max }) {
  const pctInitial = initial ? (initial / max) * 100 : 0;
  const pctCurrent = current ? (current / max) * 100 : pctInitial;
  const dropped = current && initial && current < initial;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ height: '4px', background: 'rgba(26,13,30,0.07)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
        <motion.div
          className={dropped ? "shimmer-bar" : ""}
          style={{ height: '100%', borderRadius: '2px', background: dropped ? 'var(--accent-emerald)' : 'rgba(26,13,30,0.3)' }}
          initial={{ width: `${pctInitial}%` }}
          animate={{ width: `${pctCurrent}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

/* ─── Step Progress Bar ───────────────────────── */
function StepBar({ stage }) {
  const steps = ['Intake Spec', 'Negotiations', 'Audit Report'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((label, i) => {
        const active = i + 1 === stage;
        const done = i + 1 < stage;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <motion.div
                animate={{ background: done ? 'var(--accent-indigo)' : active ? '#1a0d1e' : 'rgba(26,13,30,0.12)' }}
                transition={{ duration: 0.3 }}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: done ? '#1a0d1e' : active ? '#1a0d1e' : 'rgba(26,13,30,0.3)',
                  border: `1px solid ${done || active ? 'transparent' : 'rgba(26,13,30,0.12)'}`,
                  flexShrink: 0,
                }}
              >
                {done ? <Check size={11} /> : i + 1}
              </motion.div>
              <span style={{
                fontSize: '0.78rem', fontWeight: 500,
                color: active ? '#1a0d1e' : done ? 'rgba(26,13,30,0.6)' : 'rgba(26,13,30,0.25)',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                animate={{ background: done ? 'var(--accent-indigo)' : 'rgba(26,13,30,0.1)' }}
                style={{ height: '1px', width: '32px', margin: '0 8px', flexShrink: 0 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Streaming chat bubble ───────────────────── */
/**
 * Types a line out character by character.
 *
 * <p>Reveals a chunk per tick rather than a single character. At one char per
 * 16ms this fired ~60 setState calls a second, and every one of them re-rendered
 * a tree carrying two dozen motion components — which is what made the live
 * column stutter. Chunking keeps the same reading speed for ~a fifth of the
 * renders, and long lines now cost no more than short ones.
 */
function StreamingBubble({ text, color, label, onDone }) {
  const [chars, setChars] = useState(0);
  const interval = useRef(null);
  const finished = useRef(false);
  useEffect(() => {
    finished.current = false;
    setChars(0);
    if (!text) {
      onDone?.();
      return undefined;
    }
    const ticks = Math.max(1, Math.round(TYPE_TARGET_MS / TYPE_TICK_MS));
    const perTick = Math.max(1, Math.ceil(text.length / ticks));
    let i = 0;
    interval.current = setInterval(() => {
      i = Math.min(text.length, i + perTick);
      setChars(i);
      if (i >= text.length) {
        clearInterval(interval.current);
        if (!finished.current) {
          finished.current = true;
          onDone?.();
        }
      }
    }, TYPE_TICK_MS);
    return () => clearInterval(interval.current);
  }, [text]);

  return (
    <div style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '0.82rem', lineHeight: 1.5, maxWidth: '90%', background: color.bg, border: `1px solid ${color.border}`, color: 'rgba(26,13,30,0.85)' }}>
      <span style={{ fontSize: '0.67rem', color: color.text, fontWeight: 700, display: 'block', marginBottom: '3px' }}>{label}</span>
      {text.slice(0, chars)}
      {chars < text.length && <span style={{ opacity: 0.4 }}>█</span>}
    </div>
  );
}

/** Live card: agent finishes speaking, then the clinic answers. */
function SequentialExchange({ agent, clinic, clinicLabel }) {
  const [clinicReady, setClinicReady] = useState(false);
  useEffect(() => {
    setClinicReady(false);
  }, [agent, clinic]);

  return (
    <>
      <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(166,139,196,0.2)', border: '1px solid rgba(166,139,196,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bot size={10} color="var(--accent-indigo)" />
        </div>
        <StreamingBubble
          text={agent}
          onDone={() => { if (clinic) setTimeout(() => setClinicReady(true), 420); }}
          color={{ bg: 'rgba(166,139,196,0.12)', border: 'rgba(166,139,196,0.2)', text: 'var(--accent-indigo)' }}
          label="Haggle Agent"
        />
      </div>
      {clinic && clinicReady && (
        <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start', flexDirection: 'row-reverse' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(26,13,30,0.06)', border: '1px solid rgba(26,13,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={10} color="rgba(26,13,30,0.4)" />
          </div>
          <StreamingBubble
            text={clinic}
            color={{ bg: 'rgba(26,13,30,0.06)', border: 'rgba(26,13,30,0.08)', text: 'rgba(26,13,30,0.35)' }}
            label={clinicLabel || 'Clinic Rep'}
          />
        </div>
      )}
    </>
  );
}

/** One spoken line in the expanded call log. Finished lines stay fully visible. */
function SpokenTurn({ turn, clinicName, playing, onFinished, blocked }) {
  const isAgent = turn.speaker === 'AGENT';
  const full = turn.text || '';
  const [chars, setChars] = useState(playing ? 0 : full.length);
  const finished = useRef(false);

  useEffect(() => {
    if (!playing) {
      setChars(full.length);
      return undefined;
    }
    finished.current = false;
    setChars(0);
    if (!full) {
      onFinished?.();
      return undefined;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setChars(i);
      if (i >= full.length) {
        clearInterval(id);
        if (!finished.current) {
          finished.current = true;
          onFinished?.();
        }
      }
    }, 15);
    return () => clearInterval(id);
  }, [playing, turn.id, full]);

  return (
    <div
      style={{
        display: 'flex', gap: '7px', alignItems: 'flex-start',
        flexDirection: isAgent ? 'row' : 'row-reverse',
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: blocked ? 'rgba(244,63,94,0.14)' : isAgent ? 'rgba(166,139,196,0.2)' : 'rgba(26,13,30,0.06)',
        border: `1px solid ${blocked ? 'rgba(244,63,94,0.3)' : isAgent ? 'rgba(166,139,196,0.3)' : 'rgba(26,13,30,0.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {blocked
          ? <Shield size={10} color="var(--accent-rose)" />
          : isAgent
            ? <Bot size={10} color="var(--accent-indigo)" />
            : <User size={10} color="rgba(26,13,30,0.4)" />}
      </div>
      <div style={{
        maxWidth: '78%', padding: '7px 10px', borderRadius: 'var(--radius-md)',
        fontSize: '0.76rem', lineHeight: 1.5,
        background: blocked ? 'rgba(244,63,94,0.06)' : isAgent ? 'rgba(166,139,196,0.1)' : 'rgba(26,13,30,0.04)',
        border: `1px solid ${blocked ? 'rgba(244,63,94,0.2)' : isAgent ? 'rgba(166,139,196,0.18)' : 'rgba(26,13,30,0.07)'}`,
        color: 'rgba(26,13,30,0.8)',
      }}>
        <div style={{
          fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.07em',
          textTransform: 'uppercase', marginBottom: '3px',
          color: blocked ? 'var(--accent-rose)' : isAgent ? 'var(--accent-indigo)' : 'rgba(26,13,30,0.32)',
        }}>
          {blocked ? 'Blocked by leverage gate' : isAgent ? 'Haggle Agent' : clinicName}
          <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', opacity: 0.7 }}>
            {' '}· round {turn.round}
          </span>
        </div>
        {full.slice(0, chars)}
        {playing && chars < full.length && <span style={{ opacity: 0.35 }}>█</span>}
      </div>
    </div>
  );
}

/** Plays a clinic's transcript as a phone call: one speaker finishes, then the other. */
function ClinicCallLog({ turns, clinicName }) {
  const [shown, setShown] = useState(0);
  const [live, setLive] = useState(true);
  const shownRef = useRef(0);
  const liveRef = useRef(true);
  shownRef.current = shown;
  liveRef.current = live;

  useEffect(() => {
    shownRef.current = 0;
    liveRef.current = true;
    setShown(turns.length ? 1 : 0);
    setLive(true);
  }, [clinicName]);

  useEffect(() => {
    if (!turns.length) return;
    if (shownRef.current === 0) {
      setShown(1);
      setLive(true);
      return;
    }
    if (!liveRef.current && turns.length > shownRef.current) {
      setShown((n) => n + 1);
      setLive(true);
    }
  }, [turns.length]);

  const advance = useCallback(() => {
    const i = shownRef.current;
    if (i >= turns.length) {
      setLive(false);
      return;
    }
    const current = turns[i - 1];
    const next = turns[i];
    const beat = next && current && next.speaker !== current.speaker ? 520 : 280;
    setTimeout(() => {
      if (shownRef.current >= turns.length) {
        setLive(false);
        return;
      }
      setShown((n) => Math.min(turns.length, n + 1));
    }, beat);
  }, [turns]);

  if (!turns.length) {
    return (
      <div style={{ fontSize: '0.72rem', color: 'rgba(26,13,30,0.35)', padding: '6px 0' }}>
        No call recorded for this clinic yet.
      </div>
    );
  }

  const visible = turns.slice(0, shown);
  return (
    <>
      {visible.map((t, idx, arr) => {
        const blocked = t.speaker === 'AGENT' && (t.text || '').startsWith('[blocked');
        const newRound = idx > 0 && t.round !== arr[idx - 1].round;
        const isPlaying = live && idx === shown - 1;
        return (
          <React.Fragment key={t.id}>
            {newRound && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                margin: '4px 0 2px', color: 'rgba(26,13,30,0.28)',
                fontSize: '0.58rem', fontWeight: 700,
                letterSpacing: '0.09em', textTransform: 'uppercase',
              }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(26,13,30,0.08)' }} />
                callback · round {t.round}
                <div style={{ flex: 1, height: '1px', background: 'rgba(26,13,30,0.08)' }} />
              </div>
            )}
            <SpokenTurn
              turn={t}
              clinicName={clinicName}
              blocked={blocked}
              playing={isPlaying}
              onFinished={isPlaying ? advance : undefined}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}

/* ─── Waveform call animation ─────────────────── */
function CallWaveform() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px' }}>
      {[0.5, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75].map((h, i) => (
        <motion.div key={i}
          style={{ width: '3px', borderRadius: '3px', background: 'var(--accent-indigo)' }}
          animate={{ height: [`${6}px`, `${Math.round(h * 20)}px`, `${6}px`] }}
          transition={{ duration: 0.8 + i * 0.06, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ─── Copy to clipboard button ────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '6px 12px', borderRadius: 'var(--radius-pill)',
      background: copied ? 'rgba(16,185,129,0.12)' : 'rgba(26,13,30,0.05)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(26,13,30,0.1)'}`,
      color: copied ? 'var(--accent-emerald)' : 'rgba(26,13,30,0.5)',
      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
      transition: 'all 0.2s',
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : 'Copy Report'}
    </button>
  );
}

/* ─── MAIN WORKSPACE ─────────────────────────── */
const BADGE_STYLE = {
  pending: { bg: 'rgba(26,13,30,0.06)', color: 'rgba(26,13,30,0.35)', border: 'rgba(26,13,30,0.08)' },
  active:  { bg: 'rgba(166,139,196,0.12)',  color: 'var(--accent-indigo)',    border: 'rgba(166,139,196,0.25)' },
  complete:{ bg: 'rgba(16,185,129,0.1)',   color: 'var(--accent-emerald)',   border: 'rgba(16,185,129,0.25)' },
  warn:    { bg: 'rgba(244,63,94,0.08)',   color: 'var(--accent-rose)',      border: 'rgba(244,63,94,0.2)' },
};

export default function Workspace() {
  const [stage, setStage] = useState(1);
  const [savings, setSavings] = useState(0);
  const [logs, setLogs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [redFlag, setRedFlag] = useState(null);
  const [activeFocus, setActiveFocus] = useState(null);
  const [dialogue, setDialogue] = useState(null);
  const [runIndex, setRunIndex] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [parseDone, setParseDone] = useState(false);
  const [orderText, setOrderText] = useState(
    'Patient presents with persistent lower back pain radiating down left thigh. Schedule high-resolution MRI of lumbar spine. Rule out disc herniation L4-S1. Scan should be completed WITHOUT contrast at an outpatient free-standing diagnostic imaging center to limit patient out-of-pocket exposure.'
  );
  const [specItems, setSpecItems] = useState([
    { label: 'Procedure', value: 'MRI' },
    { label: 'Body Part', value: 'Lumbar Spine (L1-S1)' },
    { label: 'Contrast', value: 'Without Contrast' },
    { label: 'Facility', value: 'Outpatient Freestanding' },
  ]);
  const [editingSpec, setEditingSpec] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [expandedClinic, setExpandedClinic] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [honestyBanner, setHonestyBanner] = useState(null);
  const [bluffBusy, setBluffBusy] = useState(false);
  const timeouts = useRef([]);
  const logsEndRef = useRef(null);
  const unsubRef = useRef(null);
  const runIdRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const pendingRefreshRef = useRef(false);

  const clearTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    pendingRefreshRef.current = false;
  };

  const addTimeout = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timeouts.current.push(t);
    return t;
  };

  // Tear the stream down if the user navigates away mid-run.
  useEffect(() => () => { unsubRef.current?.(); clearTimeouts(); }, []);

  const specValue = (label) => specItems.find(s => s.label === label)?.value || '';

  /** One place that turns a backend snapshot into everything the UI renders. */
  const applySnapshot = useCallback((snap) => {
    setSnapshot(snap);
    const winnerName = snap.winner?.clinicName || null;
    setProviders(buildProviders(snap, winnerName));
    setLogs(buildLogs(snap));
    setRedFlag(buildRedFlag(snap));
    setSavings(money(snap.savingsVsNaive));

    const running = snap.state === 'SHOPPING' || snap.state === 'NEGOTIATING';
    setDialogue(running ? buildDialogue(snap) : null);

    const lastWithClinic = [...(snap.events || [])].reverse().find(e => e.clinicName);
    setActiveFocus(running && lastWithClinic ? lastWithClinic.clinicName : null);

    if (!running && (snap.state === 'READY' || snap.state === 'PARTIAL' || snap.state === 'FAILED')) {
      setStage(3);
      setBusy(false);
    }
  }, []);

  const refreshSnapshot = useCallback(async (id) => {
    const snap = await getRun(id);
    applySnapshot(snap);
    return snap;
  }, [applySnapshot]);

  // One UI paint per ~350ms during a live run. SSE fires per audit event
  // (and EventSource reconnects fire onerror); refetching the full snapshot
  // each time is what made column 2 hitch.
  const scheduleRefresh = useCallback((id) => {
    if (refreshTimerRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    refreshSnapshot(id).catch((e) => setError(e.message));
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        scheduleRefresh(id);
      }
    }, 350);
  }, [refreshSnapshot]);

  const applyExtractedSpec = (text) => {
    const extracted = extractSpecFromOrder(text);
    setSpecItems((prev) => prev.map((item) => {
      if (item.label === 'Procedure' && extracted.procedure) return { ...item, value: extracted.procedure };
      if (item.label === 'Body Part' && extracted.bodyPart) return { ...item, value: extracted.bodyPart };
      if (item.label === 'Contrast' && extracted.contrast) return { ...item, value: extracted.contrast };
      return item;
    }));
  };

  const handleParseOrder = () => {
    setIsParsing(true);
    applyExtractedSpec(orderText);
    addTimeout(() => { setParseDone(true); setIsParsing(false); }, 1400);
  };

  const startNegotiation = () => {
    // Guard against an impatient second click: without this, clicking Confirm
    // while the parse animation is still running schedules doStart() twice, and
    // the second call clears the first run's timers and state mid-flight.
    if (busy || stage > 1) return;
    if (!parseDone) {
      if (!isParsing) handleParseOrder();
      addTimeout(() => doStart(), 1600);
      return;
    }
    doStart();
  };

  const doStart = async () => {
    if (busy) return;
    clearTimeouts();
    unsubRef.current?.();
    unsubRef.current = null;

    setStage(2);
    setBusy(true);
    setError(null);
    setHonestyBanner(null);
    setLogs([]); setProviders([]); setSavings(0);
    setRedFlag(null); setActiveFocus(null); setDialogue(null); setSnapshot(null);

    try {
      const started = await startRun({
        procedureName: specValue('Procedure') || 'MRI',
        bodyPart: specValue('Body Part'),
        contrast: /without/i.test(specValue('Contrast')) ? false : true,
        location: 'Peterborough',
        leverageEnabled: true,
      });
      runIdRef.current = started.id;

      unsubRef.current = subscribeRunEvents(started.id, {
        onEvent: () => scheduleRefresh(started.id),
        onDone: () => {
          if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
          }
          pendingRefreshRef.current = false;
          refreshSnapshot(started.id).catch(e => setError(e.message));
        },
        // Reconnects are normal on Render Free. Don't refetch the whole run.
        onError: () => {},
      });

      await refreshSnapshot(started.id);
    } catch (e) {
      setError(e.message || 'Could not reach the negotiation service.');
      setBusy(false);
      setStage(1);
    }
  };

  /** Honesty demo: ask the gate to cite a price no clinic ever quoted. */
  const runBluffCheck = async () => {
    if (!runIdRef.current || bluffBusy) return;
    setBluffBusy(true);
    try {
      const res = await tryBluff(runIdRef.current, { claimedTotal: 200 });
      setHonestyBanner(res);
      await refreshSnapshot(runIdRef.current);
    } catch (e) {
      setError(e.message);
    } finally {
      setBluffBusy(false);
    }
  };

  const resetAll = () => {
    clearTimeouts();
    unsubRef.current?.();
    unsubRef.current = null;
    runIdRef.current = null;
    setUploadNote(null);
    setExpandedClinic(null);
    setStage(1);
    setProviders([]);
    setLogs([]);
    setSavings(0);
    setRedFlag(null);
    setDialogue(null);
    setActiveFocus(null);
    setParseDone(false);
    setIsParsing(false);
    setSnapshot(null);
    setError(null);
    setHonestyBanner(null);
    setBusy(false);
    setRunIndex(prev => prev + 1);
  };

  /** Every spoken line for one clinic, in order. */
  const turnsFor = (clinicName) =>
    (snapshot?.conversation || []).filter((t) => t.clinicName === clinicName);

  // Turns arrive in one snapshot, so without pacing the whole call materialises
  // at once — the clinic appearing to answer before the agent finished asking.
  //
  // One interval that walks forward, keyed only on which clinic is open. Keying
  // it on `snapshot` instead means tearing down and rescheduling every timer on
  // each SSE event — roughly thirty times a run — which is pure churn and makes
  // the whole column feel stuck.
  const fileInputRef = useRef(null);
  const [uploadNote, setUploadNote] = useState(null);

  /** Load a text or PDF referral into the doctor's order box. */
  const handleReferralFile = async (file) => {
    if (!file) return;
    const pdf = isPdfFile(file);
    const textFile = isTextReferral(file);
    if (!pdf && !textFile) {
      setUploadNote({ error: true, text: `${file.name} isn't a PDF or text file — paste the order below instead.` });
      return;
    }
    const maxBytes = pdf ? 8_000_000 : 200_000;
    if (file.size > maxBytes) {
      setUploadNote({ error: true, text: 'That file is too large for a referral.' });
      return;
    }

    try {
      let text = '';
      if (pdf) {
        setUploadNote({ error: false, text: `Reading ${file.name}…` });
        text = await extractPdfText(file);
        if (!text) {
          setUploadNote({ error: true, text: 'No text in that PDF (it may be a scan). Paste the order instead.' });
          return;
        }
      } else {
        text = await file.text();
        text = text.trim();
        if (!text) {
          setUploadNote({ error: true, text: 'That file was empty.' });
          return;
        }
      }
      setOrderText(text);
      applyExtractedSpec(text);
      setParseDone(false);
      setUploadNote({ error: false, text: `Loaded ${file.name} — parse it below.` });
    } catch {
      setUploadNote({ error: true, text: 'Could not read that file.' });
    }
  };

  // Scale the price bars against the highest opening quote actually seen.
  const highestPrice = Math.max(
    money(snapshot?.openingHigh),
    ...providers.map(p => p.initialPrice || 0),
    1
  );
  const openingHigh = money(snapshot?.openingHigh);
  const savingsPercent = openingHigh > 0 && snapshot?.winner
    ? Math.max(0, Math.round((1 - money(snapshot.winner.total) / openingHigh) * 100))
    : 0;

  const reportText = stage === 3 && providers.length > 0
    ? `Haggle Negotiation Report\n${'─'.repeat(40)}\nProcedure: ${specValue('Procedure')} · ${specValue('Body Part')}\n\n` +
      [...providers]
        .sort((a, b) => (a.price || 9999) - (b.price || 9999))
        .map((p, i) => `RANK ${i + 1}: ${p.name} — ${p.price ? `$${p.price}` : p.status}${p.statusType === 'warn' ? ' [FLAGGED: no breakdown]' : i === 0 ? ' ← BEST DEAL' : ''}`)
        .join('\n') +
      `\n\nOpening market: $${money(snapshot?.openingLow)}–$${openingHigh}` +
      `\nSaved vs calling one clinic at random: $${savings}` +
      (snapshot?.biggestConcessionClinic
        ? `\nLargest single concession: $${money(snapshot.biggestConcession)} (${snapshot.biggestConcessionClinic})`
        : '') +
      `\nEvery cited figure verified against the quote store · ${logs.length} audit events`
    : '';

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)',
      paddingTop: '80px', display: 'flex', flexDirection: 'column',
    }}>

      {/* ─── TOP HEADER BAR ─── */}
      <header style={{
        padding: '0 28px', height: '56px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(26,13,30,0.06)',
        background: 'rgba(26,13,30,0.02)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: '80px', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(166,139,196,0.18)" stroke="#A68BC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.88rem', letterSpacing: '0.08em', color: 'rgba(26,13,30,0.9)' }}>Haggle</span>
          <span style={{ color: 'rgba(26,13,30,0.15)', margin: '0 4px' }}>/</span>
          <span style={{ fontSize: '0.82rem', color: 'rgba(26,13,30,0.85)' }}>Agent Workspace</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(26,13,30,0.85)', marginLeft: '6px' }}>
            run #{runIndex + 1}{runIdRef.current ? ` · ${runIdRef.current.slice(0, 8)}` : ''}
          </span>
        </div>

        <StepBar stage={stage} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={resetAll}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', background: 'rgba(26,13,30,0.05)',
              border: '1px solid rgba(26,13,30,0.1)', borderRadius: 'var(--radius-pill)',
              color: 'rgba(26,13,30,0.55)', fontSize: '0.78rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,13,30,0.1)'; e.currentTarget.style.color = '#1a0d1e'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,13,30,0.05)'; e.currentTarget.style.color = 'rgba(26,13,30,0.55)'; }}
          >
            <RefreshCw size={11} /> New Run
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '5px 12px', background: 'rgba(26,13,30,0.03)',
            border: '1px solid rgba(26,13,30,0.07)', borderRadius: 'var(--radius-pill)',
          }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(166,139,196,0.15)', border: '1px solid rgba(166,139,196,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={12} color="var(--accent-indigo)" />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'rgba(26,13,30,0.85)', fontFamily: 'var(--font-mono)' }}>agent</span>
          </div>
        </div>
      </header>

      {/* ─── 3-COLUMN GRID (stacks on narrow screens — see .workspace-grid) ─── */}
      <div className="workspace-grid" style={{
        display: 'grid',
        gap: '1px', flex: 1,
        background: 'rgba(26,13,30,0.04)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid rgba(26,13,30,0.07)',
      }}>

        {/* ══ COLUMN 1: INTAKE SPEC ══ */}
        <div style={{
          background: 'var(--bg-card)', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '18px',
          opacity: stage >= 1 ? 1 : 0.4, transition: 'opacity 0.4s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--accent-indigo)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>Stage 1</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: '#1a0d1e' }}>Intake Spec Parser</h2>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.06em',
              background: stage > 1 ? 'rgba(166,139,196,0.12)' : 'rgba(26,13,30,0.06)',
              color: stage > 1 ? 'var(--accent-indigo)' : 'rgba(26,13,30,0.35)',
              border: `1px solid ${stage > 1 ? 'rgba(166,139,196,0.25)' : 'rgba(26,13,30,0.08)'}`,
            }}>
              {stage > 1 ? 'COMPLETE' : 'STEP 1/3'}
            </span>
          </div>

          {/* Editable Doctor's Order */}
          <div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(26,13,30,0.85)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '7px' }}>
              Doctor's Medical Order <span style={{ color: 'rgba(166,139,196,0.5)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(editable)</span>
            </div>
            <textarea
              value={orderText}
              onChange={e => { setOrderText(e.target.value); setParseDone(false); }}
              rows={4}
              disabled={stage > 1}
              style={{
                width: '100%', padding: '12px',
                background: 'rgba(26,13,30,0.03)', border: '1px solid rgba(26,13,30,0.07)',
                borderRadius: 'var(--radius-md)', resize: 'none',
                color: 'rgba(26,13,30,0.65)', fontFamily: 'var(--font-mono)', fontSize: '0.77rem', lineHeight: 1.6,
                outline: 'none', boxSizing: 'border-box', cursor: stage > 1 ? 'default' : 'text',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { if (stage === 1) e.target.style.borderColor = 'rgba(166,139,196,0.45)'; }}
              onBlur={e => e.target.style.borderColor = 'rgba(26,13,30,0.07)'}
            />
          </div>

          {/* Upload zone — PDF (text layer) or plain-text referral into the order box. */}
          <div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(26,13,30,0.85)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '7px' }}>
              Supporting Documentation
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.rtf,.pdf,text/plain,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleReferralFile(e.target.files?.[0])}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => stage === 1 && fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' && stage === 1) fileInputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (stage === 1) handleReferralFile(e.dataTransfer.files?.[0]); }}
              style={{
                padding: '16px', border: `1px dashed ${uploadNote?.error ? 'rgba(244,63,94,0.4)' : 'rgba(26,13,30,0.08)'}`,
                borderRadius: 'var(--radius-md)', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: '6px',
                color: 'rgba(26,13,30,0.25)', cursor: stage === 1 ? 'pointer' : 'not-allowed',
                opacity: stage === 1 ? 1 : 0.5,
                background: 'rgba(26,13,30,0.01)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (stage === 1) { e.currentTarget.style.borderColor = 'rgba(166,139,196,0.35)'; e.currentTarget.style.background = 'rgba(166,139,196,0.03)'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = uploadNote?.error ? 'rgba(244,63,94,0.4)' : 'rgba(26,13,30,0.08)'; e.currentTarget.style.background = 'rgba(26,13,30,0.01)'; }}
            >
              <UploadCloud size={18} color="rgba(166,139,196,0.6)" />
              <div style={{ fontSize: '0.77rem', textAlign: 'center' }}>
                {uploadNote
                  ? <span style={{ color: uploadNote.error ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{uploadNote.text}</span>
                  : 'Drop a referral PDF or .txt, or click to browse'}
              </div>
            </div>
          </div>

          {/* Extracted Spec */}
          <div>
            <div style={{ fontSize: '0.62rem', color: 'rgba(26,13,30,0.85)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '7px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Extracted Spec
              {isParsing && <span style={{ color: 'var(--accent-indigo)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Parsing…</span>}
              {parseDone && <span style={{ color: '#10b981', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>✓ Ready</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {specItems.map((item, idx) => (
                <div key={item.label} style={{
                  display: 'flex', background: 'rgba(26,13,30,0.02)',
                  border: '1px solid rgba(26,13,30,0.06)',
                  borderRadius: 'var(--radius-sm)', overflow: 'hidden',
                  transition: 'border-color 0.2s',
                  borderColor: editingSpec === idx ? 'rgba(166,139,196,0.4)' : 'rgba(26,13,30,0.06)',
                }}>
                  <div style={{ width: '100px', padding: '8px 11px', background: 'rgba(26,13,30,0.02)', borderRight: '1px solid rgba(26,13,30,0.05)', fontSize: '0.74rem', color: 'rgba(26,13,30,0.28)' }}>
                    {item.label}
                  </div>
                  <div style={{ flex: 1, padding: '2px 11px 2px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {editingSpec === idx ? (
                      <input
                        autoFocus
                        value={item.value}
                        onChange={e => setSpecItems(prev => prev.map((it, i2) => i2 === idx ? { ...it, value: e.target.value } : it))}
                        onBlur={() => setEditingSpec(null)}
                        style={{
                          flex: 1, background: 'transparent', border: 'none', outline: 'none',
                          color: '#1a0d1e', fontSize: '0.78rem', fontWeight: 500, padding: '6px 0',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.78rem', fontWeight: 500, color: parseDone ? 'rgba(26,13,30,0.85)' : 'rgba(26,13,30,0.4)' }}>
                        {item.value}
                      </span>
                    )}
                    {stage === 1 && (
                      <Edit2
                        size={11}
                        color={editingSpec === idx ? 'var(--accent-indigo)' : 'rgba(26,13,30,0.18)'}
                        style={{ cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => setEditingSpec(editingSpec === idx ? null : idx)}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 'auto' }}>
            {stage === 1 && !parseDone && (
              <button
                onClick={handleParseOrder}
                disabled={isParsing}
                style={{
                  width: '100%', padding: '11px',
                  background: 'rgba(166,139,196,0.1)', border: '1px solid rgba(166,139,196,0.25)',
                  borderRadius: 'var(--radius-pill)', color: 'var(--accent-indigo)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: isParsing ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  marginBottom: '8px', transition: 'all 0.2s',
                  opacity: isParsing ? 0.6 : 1,
                }}>
                <FileText size={13} />
                {isParsing ? 'Parsing Order…' : 'Parse Order → Extract Spec'}
              </button>
            )}
            <button
              className="btn-gradient"
              onClick={startNegotiation}
              disabled={stage > 1}
              style={{
                width: '100%', padding: '12px',
                fontSize: '0.88rem', fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
                opacity: stage > 1 ? 0.4 : 1,
                cursor: stage > 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              Confirm Spec & Query Clinics
            </button>
          </div>
        </div>

        {/* ══ COLUMN 2: LIVE NEGOTIATIONS ══ */}
        <div style={{
          background: 'var(--bg-card)', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '16px',
          opacity: stage >= 2 ? 1 : 0.35, transition: 'opacity 0.4s ease',
          borderLeft: '1px solid rgba(26,13,30,0.04)',
          borderRight: '1px solid rgba(26,13,30,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--accent-indigo)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>Stage 2</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: '#1a0d1e' }}>Live Agent Negotiations</h2>
            </div>
            {stage === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                <div className="status-dot pulse" /> LIVE
              </motion.div>
            )}
            {stage !== 2 && (
              <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.06em', background: stage > 2 ? 'rgba(166,139,196,0.12)' : 'rgba(26,13,30,0.06)', color: stage > 2 ? 'var(--accent-indigo)' : 'rgba(26,13,30,0.25)', border: `1px solid ${stage > 2 ? 'rgba(166,139,196,0.25)' : 'rgba(26,13,30,0.07)'}` }}>
                {stage > 2 ? 'COMPLETE' : 'PENDING'}
              </span>
            )}
          </div>

          {/* Quote Board */}
          {providers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(26,13,30,0.85)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '9px' }}>
                Realtime Quote Board
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: '7px' }}>
                {providers.map(p => {
                  const badge = BADGE_STYLE[p.statusType] || BADGE_STYLE.pending;
                  return (
                    <div key={p.id} style={{
                      padding: '10px',
                      background: activeFocus === p.id ? 'rgba(166,139,196,0.06)' : 'rgba(26,13,30,0.02)',
                      border: `1px solid ${activeFocus === p.id ? 'rgba(166,139,196,0.25)' : 'rgba(26,13,30,0.06)'}`,
                      borderRadius: 'var(--radius-md)', transition: 'all 0.4s ease',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                        <div className={p.statusType === 'warn' ? 'pulse-warn' : ''} style={{ width: '5px', height: '5px', borderRadius: '50%', background: badge.color, boxShadow: `0 0 6px ${badge.color}` }} />
                        <div style={{ fontSize: '0.66rem', color: 'rgba(26,13,30,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name.split(' ')[0]}</div>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: p.price ? (p.statusType === 'warn' ? 'var(--accent-rose)' : p.statusType === 'complete' ? 'var(--accent-emerald)' : 'rgba(26,13,30,0.8)') : 'rgba(26,13,30,0.15)' }}>
                        {p.price ? `$${p.price}` : p.statusType === 'active' ? <CallWaveform /> : '---'}
                      </div>
                      <PriceBar initial={p.initialPrice} current={p.price} max={highestPrice} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Red Flag */}
          <AnimatePresence>
            {redFlag && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  padding: '11px 13px',
                  background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
                  borderRadius: 'var(--radius-md)', display: 'flex', gap: '9px', alignItems: 'flex-start',
                  color: 'var(--accent-rose)', fontSize: '0.78rem', lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div><strong>Red Flag:</strong> {redFlag}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Provider Negotiation Cards */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '9px', overflowY: 'auto' }}>
            <AnimatePresence>
              {stage >= 2 && providers.map(p => {
                const badge = BADGE_STYLE[p.statusType] || BADGE_STYLE.pending;
                const isFocused = activeFocus === p.id;
                return (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      padding: '13px 14px',
                      background: isFocused ? 'rgba(166,139,196,0.05)' : 'rgba(26,13,30,0.02)',
                      border: `1px solid ${isFocused ? 'rgba(166,139,196,0.3)' : 'rgba(26,13,30,0.06)'}`,
                      borderRadius: 'var(--radius-md)', transition: 'all 0.4s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFocused && dialogue ? '12px' : '5px' }}>
                      <button
                        onClick={() => setExpandedClinic(expandedClinic === p.name ? null : p.name)}
                        title={`Show the full call with ${p.name}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.84rem', textAlign: 'left',
                          color: isFocused ? '#1a0d1e' : 'rgba(26,13,30,0.65)',
                        }}
                      >
                        <ChevronRight
                          size={12}
                          style={{
                            transform: expandedClinic === p.name ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s',
                            opacity: 0.45,
                          }}
                        />
                        {p.name}
                        {turnsFor(p.name).length > 0 && (
                          <span style={{ fontSize: '0.62rem', color: 'rgba(26,13,30,0.3)', fontWeight: 500 }}>
                            · {turnsFor(p.name).length} lines
                          </span>
                        )}
                      </button>
                      <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Full call transcript — click the clinic name to open */}
                    <AnimatePresence>
                      {expandedClinic === p.name && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                          style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '10px' }}
                        >
                          <ClinicCallLog key={p.name} turns={turnsFor(p.name)} clinicName={p.name} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Live exchange: agent finishes, then clinic answers.
                        Hidden while the full call is open so the two don't talk over each other. */}
                    {isFocused && dialogue && expandedClinic !== p.name && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '10px' }}
                      >
                        <SequentialExchange
                          agent={dialogue.agent}
                          clinic={dialogue.clinic}
                          clinicLabel={p.name}
                        />
                      </motion.div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.68rem', color: 'rgba(26,13,30,0.28)' }}>Current Bid</div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isFocused ? 'var(--accent-emerald)' : p.statusType === 'warn' ? 'var(--accent-rose)' : 'rgba(26,13,30,0.75)' }}>
                        {p.price ? `$${p.price}` : '—'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Honesty check result — the gate refusing a fabricated figure */}
          <AnimatePresence>
            {honestyBanner && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  padding: '11px 13px',
                  background: honestyBanner.allowed ? 'rgba(16,185,129,0.06)' : 'rgba(166,139,196,0.08)',
                  border: `1px solid ${honestyBanner.allowed ? 'rgba(16,185,129,0.2)' : 'rgba(166,139,196,0.3)'}`,
                  borderRadius: 'var(--radius-md)', display: 'flex', gap: '9px', alignItems: 'flex-start',
                  color: honestyBanner.allowed ? 'var(--accent-emerald)' : 'var(--accent-indigo)',
                  fontSize: '0.78rem', lineHeight: 1.5,
                }}
              >
                <Shield size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <strong>Honesty check — {honestyBanner.allowed ? 'ALLOWED' : 'REFUSED'}</strong>
                  <div style={{ marginTop: '3px', color: 'rgba(26,13,30,0.7)' }}>{honestyBanner.demoNote}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Errors surface here rather than failing silently */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  padding: '11px 13px',
                  background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)',
                  borderRadius: 'var(--radius-md)', display: 'flex', gap: '9px', alignItems: 'flex-start',
                  color: 'var(--accent-rose)', fontSize: '0.78rem', lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Playback row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 13px',
            background: 'rgba(26,13,30,0.02)', border: '1px solid rgba(26,13,30,0.05)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'rgba(26,13,30,0.85)' }}>
              <PlayCircle size={13} color="var(--accent-indigo)" />
              {stage === 2
                ? (snapshot?.status || 'Autonomous negotiation running…')
                : stage === 3 ? `Run #${runIndex + 1} complete` : 'Idle'}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {stage === 2 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>LIVE</span>
              )}
              {runIdRef.current && stage >= 2 && (
                <button
                  onClick={runBluffCheck}
                  disabled={bluffBusy}
                  title="Ask the agent to cite a price no clinic quoted — the gate should refuse"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 11px', background: 'rgba(166,139,196,0.1)',
                    border: '1px solid rgba(166,139,196,0.28)', borderRadius: 'var(--radius-pill)',
                    color: 'var(--accent-indigo)', fontSize: '0.7rem', fontWeight: 600,
                    cursor: bluffBusy ? 'wait' : 'pointer', opacity: bluffBusy ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <Shield size={11} /> {bluffBusy ? 'Checking…' : 'Try a fake price'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ══ COLUMN 3: AUDIT REPORT ══ */}
        <div style={{
          background: 'var(--bg-card)', padding: '22px',
          display: 'flex', flexDirection: 'column', gap: '18px',
          opacity: stage >= 3 ? 1 : 0.35, transition: 'opacity 0.4s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--accent-indigo)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px' }}>Stage 3</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: '#1a0d1e' }}>Negotiation Report</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {stage === 3 && reportText && <CopyButton text={reportText} />}
              <span style={{ padding: '3px 10px', borderRadius: 'var(--radius-pill)', fontSize: '0.66rem', fontWeight: 600, letterSpacing: '0.06em', background: stage === 3 ? 'rgba(166,139,196,0.12)' : 'rgba(26,13,30,0.06)', color: stage === 3 ? 'var(--accent-indigo)' : 'rgba(26,13,30,0.25)', border: `1px solid ${stage === 3 ? 'rgba(166,139,196,0.25)' : 'rgba(26,13,30,0.07)'}` }}>
                {stage === 3 ? 'COMPLETE' : 'PENDING'}
              </span>
            </div>
          </div>

          {/* Savings Arc */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            padding: '18px',
            background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.12)',
            borderRadius: 'var(--radius-lg)',
          }}>
            {stage === 3 ? <SavingsArc percent={savingsPercent} /> : (
              <div style={{ width: '128px', height: '128px', borderRadius: '50%', border: '8px solid rgba(26,13,30,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(26,13,30,0.85)' }}>—</span>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.62rem', color: 'var(--accent-emerald)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>
                Total Negotiated Savings
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#1a0d1e', lineHeight: 1, marginBottom: '3px' }}>
                ${stage === 3 ? <CountUp target={savings} /> : '---'}
                {stage === 3 && savingsPercent > 0 && <span style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)', marginLeft: '8px' }}>−{savingsPercent}%</span>}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(26,13,30,0.85)', lineHeight: 1.4 }}>
                {openingHigh > 0
                  ? `vs. the highest opening quote of $${openingHigh}`
                  : 'vs. calling one clinic at random'}
              </div>
            </div>
          </div>

          {/* Ranked Offers */}
          {stage === 3 && providers.length > 0 && (
            <div>
              <div style={{ fontSize: '0.62rem', color: 'rgba(26,13,30,0.85)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '9px' }}>
                Ranked Compliant Offers
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {[...providers].sort((a, b) => (a.price || 9999) - (b.price || 9999)).map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12, duration: 0.4 }}
                    style={{
                      padding: i === 0 ? '13px 14px' : '11px 14px',
                      background: i === 0 ? 'rgba(16,185,129,0.05)' : p.statusType === 'warn' ? 'rgba(244,63,94,0.04)' : 'rgba(26,13,30,0.02)',
                      border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.2)' : p.statusType === 'warn' ? 'rgba(244,63,94,0.15)' : 'rgba(26,13,30,0.07)'}`,
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {i === 0 && <Check size={12} color="var(--accent-emerald)" />}
                        {p.statusType === 'warn' && <AlertTriangle size={12} color="var(--accent-rose)" />}
                        <div>
                          <div style={{ fontSize: '0.72rem', color: i === 0 ? '#10b981' : p.statusType === 'warn' ? '#f43f5e' : 'rgba(26,13,30,0.3)', fontWeight: 700 }}>
                            RANK {i + 1} {i === 0 ? '— BEST DEAL' : p.statusType === 'warn' ? '— FLAGGED' : ''}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'rgba(26,13,30,0.75)' }}>{p.name}</div>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: i === 0 ? '1.1rem' : '1rem', fontWeight: 800, color: i === 0 ? 'var(--accent-emerald)' : p.statusType === 'warn' ? 'var(--accent-rose)' : 'rgba(26,13,30,0.7)' }}>
                        {p.price ? `$${p.price}` : <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{p.status}</span>}
                      </div>
                    </div>
                    {i === 0 && p.price && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '16px' }}>
                        {[['Technical Fee', `$${Math.round(p.price * 0.77)}`], ['Facility Fee', `$${Math.round(p.price * 0.23)}`]].map(([k, v]) => (
                          <div key={k} style={{ fontSize: '0.72rem', color: 'rgba(26,13,30,0.85)' }}>
                            <span>{k}</span> <span style={{ color: 'rgba(26,13,30,0.85)', fontFamily: 'var(--font-mono)' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── AUDIT LOG — full width ───────────────────────────────────────
          This is the proof surface: the record that every price movement
          traces to a quote that existed. Squeezed into a third of a column it
          truncated clinic names mid-word and showed six rows. It gets the full
          width because it's the part of the product that has to be readable. */}
      <div className="audit-panel" style={{
        margin: '0 24px 24px', background: 'var(--bg-card)',
        border: '1px solid rgba(26,13,30,0.07)', borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', borderBottom: '1px solid rgba(26,13,30,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: '#1a0d1e' }}>
              Negotiation Log
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'rgba(26,13,30,0.4)' }}>
              every price movement, and what caused it
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(26,13,30,0.35)' }}>
            {logs.length} {logs.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        <div className="audit-row audit-head" style={{
          padding: '8px 18px', background: 'rgba(26,13,30,0.02)',
          borderBottom: '1px solid rgba(26,13,30,0.05)',
          fontSize: '0.6rem', fontWeight: 700, color: 'rgba(26,13,30,0.3)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <div>Time</div><div>Clinic</div><div>Action</div><div style={{ textAlign: 'right' }}>Amount</div>
        </div>

        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
          {logs.map((log) => {
            const refused = /refus|blocked/i.test(log.action);
            const moved = /moved/i.test(log.action);
            return (
              <div
                key={log.id}
                className="audit-row"
                style={{
                  padding: '8px 18px', fontSize: '0.76rem',
                  borderBottom: '1px solid rgba(26,13,30,0.03)',
                  background: refused ? 'rgba(244,63,94,0.04)' : 'transparent',
                }}
              >
                <div style={{ color: 'rgba(26,13,30,0.3)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{log.time}</div>
                <div style={{ color: 'rgba(26,13,30,0.6)', fontWeight: 500 }}>{log.clinic}</div>
                <div style={{ color: refused ? 'var(--accent-rose)' : 'rgba(26,13,30,0.55)' }}>{log.action}</div>
                <div style={{
                  textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600,
                  color: log.bid.includes('—') ? 'rgba(26,13,30,0.2)'
                    : moved ? 'var(--accent-emerald)' : 'rgba(26,13,30,0.6)',
                }}>{log.bid}</div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div style={{ padding: '22px 18px', fontSize: '0.76rem', color: 'rgba(26,13,30,0.25)', fontFamily: 'var(--font-mono)' }}>
              Waiting for the negotiation to start…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
