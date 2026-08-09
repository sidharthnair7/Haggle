import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, Check, AlertTriangle, UploadCloud, Edit2, PlayCircle, Shield, FileText, Activity } from 'lucide-react';
import './Workspace.css';

export default function Workspace() {
  const [stage, setStage] = useState(1); // 1, 2, 3
  
  // State for Simulation
  const [savings, setSavings] = useState(0);
  const [logs, setLogs] = useState([]);
  
  const [providers, setProviders] = useState([
    { id: 1, name: 'Valley Scan CT', initialPrice: null, price: null, status: 'idle', color: 'var(--text-secondary)' },
    { id: 2, name: 'Apex Imaging', initialPrice: null, price: null, status: 'idle', color: 'var(--text-secondary)' },
    { id: 3, name: 'Bay Health MRI', initialPrice: null, price: null, status: 'idle', color: 'var(--text-secondary)' }
  ]);
  const [redFlag, setRedFlag] = useState(null);
  const [activeFocus, setActiveFocus] = useState(null);
  const [dialogue, setDialogue] = useState(null);

  const startNegotiation = () => {
    setStage(2);
    runSimulation();
  };

  const updateProvider = (id, updates) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addLog = (time, clinic, action, bid) => {
    setLogs(prev => [{ id: Date.now(), time, clinic, action, bid }, ...prev]);
  };

  const animateSavings = (target) => {
    let current = savings;
    const step = target / 20;
    const intv = setInterval(() => {
      current += step;
      if (current >= target) {
        setSavings(target);
        clearInterval(intv);
      } else {
        setSavings(Math.floor(current));
      }
    }, 50);
  };

  const runSimulation = () => {
    setLogs([]);
    setSavings(0);
    setRedFlag(null);
    setActiveFocus(null);
    setDialogue(null);
    setProviders([
      { id: 1, name: 'Valley Scan CT', initialPrice: null, price: null, status: 'Calling...', color: 'var(--accent-indigo)' },
      { id: 2, name: 'Apex Imaging', initialPrice: null, price: null, status: 'Calling...', color: 'var(--accent-indigo)' },
      { id: 3, name: 'Bay Health MRI', initialPrice: null, price: null, status: 'Calling...', color: 'var(--accent-indigo)' }
    ]);
    
    addLog("10:58", "System", "Parsed specs, sent queries", "—");

    const timeline = [
      { delay: 1500, action: () => {
        updateProvider(3, { initialPrice: 890, price: 890, status: 'Hold: Over Benchmark', color: '#ef4444' });
        setRedFlag("Bay Health MRI price ($890) is 60% above Regional Outpatient Benchmark.");
        addLog("11:00", "Bay Health MRI", "Default Chargemaster Quote", "$890.00");
      }},
      { delay: 2500, action: () => {
        updateProvider(2, { initialPrice: 620, price: 620, status: 'Awaiting Response', color: 'var(--text-primary)' });
        addLog("11:01", "Apex Imaging", "Initial Quote Received", "$620.00");
      }},
      { delay: 3500, action: () => {
        updateProvider(1, { initialPrice: 555, price: 555, status: 'Awaiting Response', color: 'var(--text-primary)' });
        addLog("11:02", "Valley Scan CT", "Initial Quote Received", "$555.00");
      }},
      { delay: 4500, action: () => {
        setActiveFocus(1);
        updateProvider(1, { status: 'Active Agent Focus', color: 'var(--accent-indigo)' });
        setDialogue({ agent: "Doctor ordered free-standing outpatient diagnostic. Will you match our standard network ceiling fee?", clinic: "We can waive the technical component premium, lowering the total scan fee to $455." });
      }},
      { delay: 6500, action: () => {
        updateProvider(1, { price: 455, status: 'Deal Accepted', color: 'var(--accent-emerald)' });
        addLog("11:04", "Valley Scan CT", "Matched Outpatient Limit", "$455.00");
        animateSavings(1402 - 455); // Fake typical hospital fee $1402
      }},
      { delay: 7500, action: () => {
        setActiveFocus(2);
        updateProvider(2, { status: 'Active Agent Focus', color: 'var(--accent-indigo)' });
        setDialogue({ agent: "We have a competing offer at $455. Can you waive the premium cap to match?", clinic: "We can't match $455, but we can do $550." });
      }},
      { delay: 9500, action: () => {
        updateProvider(2, { price: 550, status: 'Final Counter', color: 'var(--text-primary)' });
        addLog("11:05", "Apex Imaging", "Waived Premium Cap", "$550.00");
      }},
      { delay: 11000, action: () => {
        setActiveFocus(null);
        setStage(3);
      }}
    ];

    timeline.forEach(event => {
      setTimeout(() => event.action(), event.delay);
    });
  };

  return (
    <div style={{ paddingTop: '100px', paddingBottom: '40px', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Top Bar */}
      <header style={{ padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hexagon size={24} color="var(--accent-indigo)" fill="rgba(99, 102, 241, 0.2)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '1px' }}>HaggleAI Agent</span>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 1, label: '1. Intake Spec' },
            { id: 2, label: '2. Live Negotiations' },
            { id: 3, label: '3. Audit Report' }
          ].map(s => (
            <div key={s.id} style={{ 
              padding: '6px 16px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500,
              background: stage >= s.id ? 'var(--bg-primary)' : 'transparent',
              color: stage >= s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: stage >= s.id ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
            }}>
              {s.label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-gradient" style={{ padding: '8px 16px', fontSize: '0.85rem', background: '#0EA5E9' }}>+ New Run</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Shield size={16} />
            </div>
            admin@haggle.ai
          </div>
        </div>
      </header>

      {/* 3-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '0 32px', flex: 1 }}>
        
        {/* COLUMN 1: INTAKE SPEC */}
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: stage >= 1 ? 1 : 0.5, transition: 'opacity 0.3s' }}>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>DOCTOR'S MEDICAL ORDER TEXT</div>
            <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.9rem', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Patient presents with persistent lower back pain radiating down left thigh. Please schedule high-resolution MRI of lumbar spine. Rule out disc herniation L4-S1. Scan should be completed WITHOUT contrast at an outpatient free-standing diagnostic imaging center to limit patient out-of-pocket exposure.
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>SUPPORTING DOCUMENTATION</div>
            <div style={{ padding: '24px', border: '1px dashed var(--border-subtle)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer', background: 'var(--bg-primary)' }}>
              <UploadCloud size={24} color="var(--accent-indigo)" />
              <div style={{ fontSize: '0.85rem' }}>Drop PDF referral or insurance card here</div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>EXTRACTED SPEC (EDITABLE)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Procedure', value: 'MRI' },
                { label: 'Body Part', value: 'Lumbar Spine (L1-S1)' },
                { label: 'Contrast', value: 'Without Contrast' },
                { label: 'Facility Type', value: 'Outpatient Out-of-Hospital' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ width: '120px', padding: '10px 12px', background: 'rgba(0,0,0,0.02)', borderRight: '1px solid var(--border-subtle)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                  <div style={{ flex: 1, padding: '10px 12px', fontSize: '0.85rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                    {item.value} <Edit2 size={14} color="var(--text-secondary)" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button 
              className="btn-gradient" 
              onClick={startNegotiation}
              disabled={stage > 1}
              style={{ width: '100%', padding: '14px', borderRadius: '30px', fontWeight: 600, fontSize: '0.95rem', opacity: stage > 1 ? 0.5 : 1, cursor: stage > 1 ? 'default' : 'pointer' }}
            >
              Confirm Spec & Query Clinics
            </button>
          </div>
        </div>

        {/* COLUMN 2: LIVE NEGOTIATIONS */}
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: stage >= 2 ? 1 : 0.5, transition: 'opacity 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Stage 2</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginTop: '4px' }}>Live Agent Negotiations</h2>
            </div>
            <div style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
              {stage > 2 ? 'Complete' : stage === 2 ? 'In Progress' : 'Pending'}
            </div>
          </div>

          {/* Realtime Quote Board */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px' }}>REALTIME QUOTE BOARD</div>
              {stage === 2 && <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}><div className="status-dot pulse"></div> Live Stream</div>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {providers.map(p => (
                <div key={p.id} style={{ padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color }}></div>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: p.price ? 'var(--text-primary)' : 'var(--border-subtle)' }}>
                    ${p.price || '---'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Red Flag Alert */}
          <AnimatePresence>
            {redFlag && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#ef4444', fontSize: '0.85rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div><strong>Red Flag:</strong> {redFlag}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detailed Bids List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
            <AnimatePresence>
              {stage >= 2 && providers.map(p => (
                <motion.div key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '16px', background: 'var(--bg-primary)', border: `1px solid ${activeFocus === p.id ? 'var(--accent-indigo)' : 'var(--border-subtle)'}`, borderRadius: '8px', position: 'relative' }}>
                  {activeFocus === p.id && <div style={{ position: 'absolute', left: 0, top: '16px', bottom: '16px', width: '3px', background: 'var(--accent-indigo)', borderRadius: '0 4px 4px 0' }}></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: activeFocus === p.id ? '16px' : '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: p.color, fontWeight: 500, textTransform: 'uppercase' }}>{p.status}</div>
                  </div>
                  
                  {activeFocus === p.id && dialogue && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                      <div><span style={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>Agent:</span> <span style={{ color: 'var(--text-secondary)' }}>{dialogue.agent}</span></div>
                      <div><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Clinic:</span> <span style={{ color: 'var(--text-secondary)' }}>{dialogue.clinic}</span></div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Bid</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: activeFocus === p.id ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                      ${p.price || '---'}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <PlayCircle size={18} color="var(--accent-indigo)" /> Replaying Auton Run #412
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--border-subtle)' }}>
              <span>1x</span><span style={{ color: 'var(--text-primary)' }}>2x</span><span>4x</span>
            </div>
          </div>
        </div>

        {/* COLUMN 3: NEGOTIATION REPORT */}
        <div className="bento-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', opacity: stage >= 3 ? 1 : 0.5, transition: 'opacity 0.3s' }}>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>TOTAL NEGOTIATED SAVINGS</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: '8px' }}>
              ${savings}.00 <span style={{ fontSize: '1.2rem', color: 'var(--accent-emerald)' }}>(-60%)</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Savings relative to typical hospital chargemaster fee of $1,402</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>RANKED COMPLIANT OFFERS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px solid var(--accent-emerald)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--accent-emerald)" /> RANK 1 - BEST DEAL <span style={{ color: 'var(--text-primary)' }}>Valley Scan CT</span></div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>$455</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>Scan Technical Fee</span><span>$350.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Contrast / Facility Fee</span><span>$105.00</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>RANK 2</span> <strong>Apex Imaging Center</strong></div>
                <div style={{ fontWeight: 600 }}>$550</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: 'var(--text-secondary)' }}>RANK 3</span> <strong>Bay Health MRI</strong> <AlertTriangle size={14} color="#ef4444" /></div>
                <div style={{ color: '#ef4444', fontWeight: 600 }}><span style={{ fontSize: '0.7rem', fontWeight: 400, marginRight: '8px' }}>Over Benchmark</span>$890</div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>TRANSACTION AUDIT LOG</div>
            <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr 60px', padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                <div>Time</div><div>Clinic</div><div>Action</div><div style={{ textAlign: 'right' }}>Bid</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '120px', overflowY: 'auto' }}>
                <AnimatePresence>
                  {logs.map(log => (
                    <motion.div key={log.id} initial={{ opacity: 0, backgroundColor: 'rgba(99, 102, 241, 0.1)' }} animate={{ opacity: 1, backgroundColor: 'transparent' }} style={{ display: 'grid', gridTemplateColumns: '60px 100px 1fr 60px', padding: '8px 12px', fontSize: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
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
