import React from 'react';
import { motion } from 'framer-motion';
import { Cross, Stethoscope, Activity, Heart, Shield, Settings, Database, Sparkles, PhoneCall, Layers, FileText, ChevronRight, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Topography from './Topography/Topography';
import LogoLoop from './LogoLoop/LogoLoop';

export default function LandingPage() {
  const navigate = useNavigate();

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const hospitalLogos = [
    { node: <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}><Cross size={24} /> Apex Imaging</div>, title: "Apex Imaging", href: "#" },
    { node: <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}><Stethoscope size={24} /> Valley Scan</div>, title: "Valley Scan", href: "#" },
    { node: <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}><Activity size={24} /> City Health</div>, title: "City Health", href: "#" },
    { node: <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}><Heart size={24} /> General Hospital</div>, title: "General Hospital", href: "#" },
    { node: <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}><Shield size={24} /> United Care</div>, title: "United Care", href: "#" },
  ];

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>

      {/* --- HERO SECTION --- */}
      <section style={{ position: 'relative', minHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingTop: '80px' }}>

        {/* Topography Background */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden', zIndex: -1 }}>
          <Topography
            lowColor="#ff0000"
            midColor="#00ff00"
            highColor="#0000ff"
            speed={0.35}
            morphAmount={3.0}
            morphSpeed={0.05}
            bands={2.0}
            thickness={0.01}
            scale={1.0}
            pixelSize={1.0}
            glow={0.5}
            colorMode="elevation"
            contrast={3.0}
            brightness={1.0}
            fillBands={false}
            opacity={0.3}
            grain={true}
            grainIntensity={0.05}
            mouseInteraction={true}
            mouseRadius={0.3}
            mouseStrength={0.4}
          />
        </div>

        <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.h1 variants={fadeUp} style={{ fontSize: '4.5rem', fontWeight: 600, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em', maxWidth: '900px' }}>
            Autonomous Medical <br /> Price Negotiation
          </motion.h1>

          <motion.p variants={fadeUp} style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '40px', maxWidth: '600px', lineHeight: 1.6, background: 'rgba(255,255,255,0.7)', padding: '16px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
            Deploy the agent to call providers, gather itemized quotes, and use real leverage to drive prices down across your healthcare network.
          </motion.p>

          <motion.div variants={fadeUp} style={{ display: 'flex', gap: '16px' }}>
            <button className="btn-gradient" onClick={() => navigate('/workspace')} style={{ padding: '12px 24px', fontSize: '1rem', background: '#0EA5E9', boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' }}>Enter Workspace</button>
            <button className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>Explore the Platform</button>
          </motion.div>
        </motion.div>

        {/* Bottom Providers Bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 1 }} style={{ position: 'absolute', bottom: '40px', width: '100%', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>Compatible with major healthcare providers.</div>
          <div style={{ height: '60px', width: '100%', position: 'relative', overflow: 'hidden', opacity: 0.6 }}>
            <LogoLoop
              logos={hospitalLogos}
              speed={120}
              direction="left"
              logoHeight={40}
              gap={64}
              hoverSpeed={0}
              scaleOnHover={true}
              fadeOut={true}
              fadeOutColor="#FFFFFF"
            />
          </div>
        </motion.div>
      </section>

      {/* --- VERTICAL CARDS SECTION --- */}
      <section className="container" style={{ paddingTop: '120px', paddingBottom: '120px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '64px' }}>
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ fontSize: '3rem', maxWidth: '500px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Built for patients who need fair prices
          </motion.h2>
          <motion.p initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ color: 'var(--text-secondary)', maxWidth: '400px', fontSize: '1rem', lineHeight: 1.6 }}>
            HaggleAI gives patients and advocates the infrastructure to deploy advanced negotiation agents on their own terms. <br /><br />
            Use real market dynamics and itemized quotes to secure the absolute lowest cash pay rate for any procedure.
          </motion.p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {/* Card 1 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="bento-card" style={{ padding: 0, height: '450px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '60%', background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, transparent 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={64} color="var(--accent-indigo)" opacity={0.5} />
            </div>
            <div style={{ padding: '32px', flex: 1 }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Autonomous Calling.</h3>
              <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>Learn More ↗</a>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="bento-card" style={{ padding: 0, height: '450px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '60%', background: 'linear-gradient(180deg, rgba(14, 165, 233, 0.1) 0%, transparent 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={64} color="var(--accent-cyan)" opacity={0.5} />
            </div>
            <div style={{ padding: '32px', flex: 1 }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Provable Leverage.</h3>
              <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>Learn More ↗</a>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="bento-card" style={{ padding: 0, height: '450px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '60%', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, transparent 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={64} color="var(--accent-emerald)" opacity={0.5} />
            </div>
            <div style={{ padding: '32px', flex: 1 }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Maximum Savings.</h3>
              <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>Learn More ↗</a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- FOUR CARD GRID SECTION --- */}
      <section className="container" style={{ paddingBottom: '120px' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>The operating layer for medical negotiation</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>HaggleAI brings together the core systems patients need to build and operate AI agents in production.</p>
          <a href="#" style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '16px', fontWeight: 500 }}>Explore the Platform ↗</a>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { icon: FileText, title: 'Job Spec Intake', text: 'Upload your doctor\'s order and let the agent parse it into a frozen spec.' },
            { icon: Network, title: 'Market Simulation', text: 'Call every local provider instantly to gather a baseline of itemized quotes.' },
            { icon: Settings, title: 'Automated Haggling', text: 'Give AI systems persistent context to counter-offer and negotiate aggressively.' },
            { icon: Sparkles, title: 'Ranked Reporting', text: 'Build, evaluate, and view your final savings across all providers seamlessly.' }
          ].map((c, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} className="bento-card" style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'rgba(0,0,0,0.05)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <c.icon size={20} color="var(--text-primary)" />
              </div>
              <h4 style={{ fontSize: '1.2rem', marginBottom: '12px' }}>{c.title}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- NUMBERED LIST SECTION --- */}
      <section className="container" style={{ paddingBottom: '160px', display: 'flex', gap: '100px' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{ flex: 1 }}>
          <h2 style={{ fontSize: '3.5rem', lineHeight: 1.1, letterSpacing: '-0.02em', position: 'sticky', top: '120px' }}>
            Negotiate for <br /> any procedure <br /> you need
          </h2>
        </motion.div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {[
            { num: '01', title: 'MRIs & Imaging', desc: 'Secure the best cash pay rate for MRIs, CT scans, and X-rays across local imaging centers.' },
            { num: '02', title: 'Outpatient Surgeries', desc: 'Negotiate facility fees, anesthesia, and surgeon fees for elective outpatient procedures.' },
            { num: '03', title: 'Lab Diagnostics', desc: 'Deploy agents to find the lowest cost for routine blood work and specialized pathology.' },
            { num: '04', title: 'Dental & Specialists', desc: 'Run optimized AI directly against dental clinics and specialized practices for lower latency pricing.' }
          ].map((item, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp} style={{ display: 'flex', gap: '32px', padding: '40px 0', borderTop: i === 0 ? '1px solid var(--border-subtle)' : '1px solid var(--border-subtle)', borderBottom: i === 3 ? '1px solid var(--border-subtle)' : 'none' }}>
              <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{item.num}</div>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* --- PRE-FOOTER CTA --- */}
      <section className="container" style={{ paddingBottom: '120px' }}>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp} style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
          border: '1px solid rgba(14, 165, 233, 0.3)',
          borderRadius: '24px',
          padding: '80px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Internal Glow */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, transparent 60%)', filter: 'blur(80px)', zIndex: 0 }}></div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '4rem', fontWeight: 600, marginBottom: '24px', letterSpacing: '-0.02em' }}>Negotiate on your terms.</h2>
            <p style={{ color: 'rgba(0,0,0,0.8)', fontSize: '1.1rem', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
              Build and operate advanced AI negotiation systems with more control over data, performance, and cost.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn-gradient" onClick={() => navigate('/workspace')} style={{ padding: '12px 32px', fontSize: '1rem', background: '#0EA5E9' }}>Enter Workspace</button>
              <button className="btn-primary" style={{ padding: '12px 32px', fontSize: '1rem', background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.2)' }}>Explore the Platform</button>
            </div>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
