import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, Check, AlertTriangle, UploadCloud, Edit2, PlayCircle, Shield } from 'lucide-react';
import { startRun, getRun, subscribeRunEvents, tryBluff } from '../api';
import './Workspace.css';

const DEFAULT_SPEC = {
  procedureName: 'MRI',
  bodyPart: 'Lumbar Spine (L1-S1)',
  contrast: false,
  location: 'Peterborough',
  radiusKm: 50,
};

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '---';
  return `$${Math.round(n)}`;
}

function eventToLog(ev) {
  const time = ev.at ? new Date(ev.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--';
  return {
    id: ev.id ?? `${ev.type}-${ev.at}-${ev.clinicName}`,
    time,
    clinic: ev.clinicName || 'System',
    action: ev.detail || ev.type,
    bid: ev.amount != null ? formatMoney(ev.amount) : '—',
  };
}

function providersFromQuotes(quotes) {
  const latest = {};
  for (const q of quotes || []) {
    latest[q.clinicName] = q;
  }
  return Object.values(latest).map((q, i) => ({
    id: i + 1,
    name: q.clinicName,
    initialPrice: q.total,
    price: q.citable || q.outcome === 'BUNDLED' ? q.total : null,
    status: q.outcome,
    color: q.outcome === 'DECLINED'
      ? '#ef4444'
      : q.citable
        ? 'var(--accent-emerald)'
        : 'var(--text-primary)',
    citable: q.citable,
    lineItems: q.lineItems || [],
  }));
}

export default function Workspace() {
  const [stage, setStage] = useState(1);
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [runId, setRunId] = useState(null);
  const [savings, setSavings] = useState(0);
  const [logs, setLogs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [redFlag, setRedFlag] = useState(null);
  const [activeFocus, setActiveFocus] = useState(null);
  const [dialogue, setDialogue] = useState(null);
  const [winner, setWinner] = useState(null);
  const [ranked, setRanked] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [honestyBanner, setHonestyBanner] = useState(null);
  const [bluffBusy, setBluffBusy] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => () => unsubRef.current?.(), []);

  const refreshSnapshot = async (id) => {
    const snap = await getRun(id);
    setProviders(providersFromQuotes(snap.quotes));
    setLogs((snap.events || []).map(eventToLog).reverse());
    setSavings(Math.round(snap.savingsVsHighest || 0));
    setWinner(snap.winner || null);

    const latest = {};
    for (const q of snap.quotes || []) {
      if (q.citable) latest[q.clinicName] = q;
    }
    const rankedList = Object.values(latest).sort((a, b) => a.total - b.total);
    setRanked(rankedList);

    const bundledPress = (snap.events || []).find((e) => e.type === 'PRESSED_FOR_ITEMIZATION');
    if (bundledPress) {
      setRedFlag(`${bundledPress.clinicName}: pressed for itemization — hidden fees may apply.`);
    }

    const leverage = [...(snap.events || [])].reverse().find(
      (e) => e.type === 'LEVERAGE_ALLOWED' || e.type === 'PRICE_MOVED'
    );
    if (leverage) {
      setActiveFocus(leverage.clinicName);
      setDialogue({
        agent: leverage.type === 'LEVERAGE_ALLOWED'
          ? leverage.detail
          : `Citing competing leverage against ${leverage.clinicName}.`,
        clinic: leverage.type === 'PRICE_MOVED' ? leverage.detail : 'Clinic reviewing the competing quote…',
      });
    }

    if (snap.answerable || snap.state === 'FAILED') {
      setStage(3);
    } else if (snap.state === 'SHOPPING' || snap.state === 'NEGOTIATING' || snap.state === 'CREATED') {
      setStage(2);
    }
    return snap;
  };

  const startNegotiation = async () => {
    setError(null);
    setBusy(true);
    setLogs([]);
    setProviders([]);
    setSavings(0);
    setRedFlag(null);
    setActiveFocus(null);
    setDialogue(null);
    setWinner(null);
    setRanked([]);
    setStage(2);

    try {
      const started = await startRun({
        procedureName: spec.procedureName,
        bodyPart: spec.bodyPart,
        contrast: spec.contrast,
        location: spec.location,
        radiusKm: spec.radiusKm,
        leverageEnabled: true,
      });
      setRunId(started.id);
      unsubRef.current?.();
      unsubRef.current = subscribeRunEvents(started.id, {
        onEvent: async () => {
          try {
            await refreshSnapshot(started.id);
          } catch (e) {
            setError(e.message);
          }
        },
        onDone: async () => {
          try {
            await refreshSnapshot(started.id);
            setStage(3);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        },
        onError: () => {
          // EventSource retries; also poll once as fallback
          refreshSnapshot(started.id).catch(() => {});
        },
      });
      await refreshSnapshot(started.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setStage(1);
    }
  };

  const reset = () => {
    unsubRef.current?.();
    unsubRef.current = null;
    setStage(1);
    setRunId(null);
    setLogs([]);
    setProviders([]);
    setSavings(0);
    setError(null);
    setBusy(false);
    setWinner(null);
    setRanked([]);
    setHonestyBanner(null);
  };

  const runBluffDemo = async () => {
    if (!runId) return;
    setBluffBusy(true);
    setError(null);
    try {
      const result = await tryBluff(runId, { claimedTotal: 200 });
      setHonestyBanner(result);
      setDialogue({
        agent: `Try citing $${result.claimedTotal} against ${result.againstClinic}…`,
        clinic: result.allowed
          ? result.reason
          : `Gate: ${result.reason}`,
      });
      setActiveFocus(result.againstClinic);
      await refreshSnapshot(runId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBluffBusy(false);
    }
  };

  const updateSpecField = (key, value) => {
    setSpec((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '40px', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <header style={{ padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hexagon size={24} color="var(--accent-indigo)" fill="rgba(99, 102, 241, 0.2)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '1px' }}>HaggleAI Agent</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 1, label: '1. Intake Spec' },
            { id: 2, label: '2. Live Negotiations' },
            { id: 3, label: '3. Audit Report' },
          ].map((s) => (
            <div key={s.id} style={{
              padding: '6px 16px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500,
              background: stage >= s.id ? 'var(--bg-primary)' : 'transparent',
              color: stage >= s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: stage >= s.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
            }}>
              {s.label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-gradient" style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#0EA5E9' }} onClick={reset}>+ New Run</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} />
            </div>
            {runId ? `run ${runId.slice(0, 8)}…` : 'ready'}
          </div>
        </div>
      </header>

      {error && (
        <div style={{ margin: '0 32px 16px', padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#ef4444', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '0 32px', flex: 1 }}>
        {/* COLUMN 1 */}
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: stage >= 1 ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Stage 1</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '4px' }}>Intake Spec Parser</h2>
            </div>
            <div style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
              {stage > 1 ? 'Complete' : 'Step 1 of 3'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>SUPPORTING DOCUMENTATION</div>
            <div style={{ padding: '24px', border: '1px dashed var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
              <UploadCloud size={24} color="var(--accent-indigo)" />
              <div style={{ fontSize: '0.85rem' }}>PDF intake optional — use fields below</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>EXTRACTED SPEC (EDITABLE)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'procedureName', label: 'Procedure' },
                { key: 'bodyPart', label: 'Body Part' },
                { key: 'location', label: 'Location' },
              ].map((item) => (
                <div key={item.key} style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: '120px', padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRight: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                  <input
                    disabled={stage > 1}
                    value={spec[item.key] || ''}
                    onChange={(e) => updateSpecField(item.key, e.target.value)}
                    style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', fontWeight: 500, border: 'none', background: 'transparent', color: 'var(--text-primary)' }}
                  />
                  <div style={{ padding: '10px 12px' }}><Edit2 size={14} color="var(--text-secondary)" /></div>
                </div>
              ))}
              <div style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: '120px', padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRight: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Contrast</div>
                <select
                  disabled={stage > 1}
                  value={spec.contrast ? 'with' : 'without'}
                  onChange={(e) => updateSpecField('contrast', e.target.value === 'with')}
                  style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', border: 'none', background: 'transparent' }}
                >
                  <option value="without">Without Contrast</option>
                  <option value="with">With Contrast</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button
              className="btn-gradient"
              onClick={startNegotiation}
              disabled={stage > 1 || busy}
              style={{ width: '100%', padding: '14px', borderRadius: '30px', fontWeight: 600, fontSize: '0.95rem', opacity: stage > 1 ? 0.5 : 1, cursor: stage > 1 ? 'default' : 'pointer' }}
            >
              Confirm Spec & Query Clinics
            </button>
          </div>
        </div>

        {/* COLUMN 2 */}
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: stage >= 2 ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Stage 2</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '4px' }}>Live Agent Negotiations</h2>
            </div>
            <div style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
              {stage > 2 ? 'Complete' : stage === 2 ? (busy ? 'In Progress' : 'Live') : 'Pending'}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>REALTIME QUOTE BOARD</div>
              {stage === 2 && busy && <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}><div className="status-dot pulse"></div> Live Stream</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '8px' }}>
              {(providers.length ? providers : [{ id: 0, name: 'Waiting…', price: null, color: 'var(--border-subtle)' }]).map((p) => (
                <div key={p.id || p.name} style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }}></div>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: p.price != null ? 'var(--text-primary)' : 'var(--border-subtle)' }}>
                    {p.price != null ? formatMoney(p.price) : '---'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {redFlag && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#ef4444', fontSize: '0.85rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div><strong>Red Flag:</strong> {redFlag}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {honestyBanner && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{
                padding: '12px',
                background: honestyBanner.allowed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                border: `1px solid ${honestyBanner.allowed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.35)'}`,
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}>
                <strong>{honestyBanner.allowed ? 'Allowed' : 'Honesty check — REFUSED'}</strong>
                <div style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{honestyBanner.reason}</div>
                <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{honestyBanner.demoNote}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', maxHeight: 360 }}>
            <AnimatePresence>
              {stage >= 2 && providers.map((p) => (
                <motion.div key={p.name} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '16px', background: 'var(--bg-primary)', border: `1px solid ${activeFocus === p.name ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`, borderRadius: '8px', position: 'relative' }}>
                  {activeFocus === p.name && <div style={{ position: 'absolute', left: 0, top: '16px', bottom: '16px', width: '3px', background: 'var(--accent-indigo)', borderRadius: '0 4px 4px 0' }}></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: activeFocus === p.name ? '16px' : '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: p.color, fontWeight: 500, textTransform: 'uppercase' }}>{p.status}</div>
                  </div>
                  {activeFocus === p.name && dialogue && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                      <div><span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>Agent:</span> <span style={{ color: 'var(--text-secondary)' }}>{dialogue.agent}</span></div>
                      <div><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Clinic:</span> <span style={{ color: 'var(--text-secondary)' }}>{dialogue.clinic}</span></div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Bid</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{p.price != null ? formatMoney(p.price) : '---'}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <PlayCircle size={18} color="var(--accent-indigo)" /> {busy ? 'Live SSE feed' : 'Idle'}
            </div>
            <button
              type="button"
              onClick={runBluffDemo}
              disabled={!runId || bluffBusy}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--accent-indigo)',
                background: 'transparent',
                color: 'var(--accent-indigo)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: !runId || bluffBusy ? 'default' : 'pointer',
                opacity: !runId ? 0.4 : 1,
              }}
              title="Attempts to cite a fake $200 quote — the leverage gate should refuse"
            >
              {bluffBusy ? 'Testing…' : 'Try bluff ($200)'}
            </button>
          </div>
        </div>

        {/* COLUMN 3 */}
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: stage >= 3 ? 1 : 0.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Stage 3</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '4px' }}>Negotiation Report</h2>
            </div>
            <div style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
              {stage === 3 ? 'Complete' : 'Pending'}
            </div>
          </div>

          <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>SPREAD VS HIGHEST CITABLE</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {formatMoney(savings)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {winner ? `Best: ${winner.clinicName} at ${formatMoney(winner.total)}` : 'Waiting for citable quotes'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>RANKED COMPLIANT OFFERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ranked.length === 0 && (
                <div style={{ padding: 16, background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  No ranked offers yet.
                </div>
              )}
              {ranked.map((q, idx) => (
                <div key={q.clinicName} style={{ padding: '16px', background: 'var(--bg-primary)', border: `1px solid ${idx === 0 ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: idx === 0 ? 12 : 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {idx === 0 && <Check size={16} color="var(--accent-emerald)" />}
                      RANK {idx + 1} {idx === 0 ? '- BEST DEAL' : ''} <span style={{ color: 'var(--text-primary)' }}>{q.clinicName}</span>
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: idx === 0 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>{formatMoney(q.total)}</div>
                  </div>
                  {idx === 0 && (q.lineItems || []).map((li) => (
                    <div key={li.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span>{li.label}</span><span>{formatMoney(li.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>TRANSACTION AUDIT LOG</div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr 60px', padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                <div>Time</div><div>Clinic</div><div>Action</div><div style={{ textAlign: 'right' }}>Bid</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '160px', overflowY: 'auto' }}>
                <AnimatePresence>
                  {logs.map((log) => (
                    <motion.div key={log.id} initial={{ opacity: 0, backgroundColor: 'rgba(99, 102, 241, 0.1)' }} animate={{ opacity: 1, backgroundColor: 'transparent' }} style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr 60px', padding: '8px 12px', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{log.time}</div>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.clinic}</div>
                      <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.action}</div>
                      <div style={{ textAlign: 'right', color: log.bid.includes('—') ? 'var(--text-secondary)' : 'var(--accent-emerald)', fontWeight: 500 }}>{log.bid}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
