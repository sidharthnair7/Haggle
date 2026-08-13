import React from 'react';
import Topography from './Topography/Topography';

export default function Footer() {
  return (
    <footer style={{
      background: '#07070F', // Dark bg for footer looks premium
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: '100px',
      paddingBottom: '40px',
    }}>
      {/* Topography bg — subtle overlay */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.15 }}>
        <Topography
          lowColor="#100b2e" midColor="#6366F1" highColor="#8b5cf6"
          speed={0.15} morphAmount={2.0} morphSpeed={0.03}
          bands={2.5} thickness={0.02} scale={1.2}
          pixelSize={1.0} glow={0.5} colorMode="elevation"
          contrast={2.0} brightness={1.0} fillBands={true}
          opacity={0.3} grain={true} grainIntensity={0.04}
          mouseInteraction={true} mouseRadius={0.4} mouseStrength={0.5}
        />
      </div>
      
      {/* Top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: '0', width: '100%', height: '1px',
        background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.5), transparent)',
      }} />

      <div style={{
        maxWidth: '1220px', margin: '0 auto', padding: '0 24px',
        position: 'relative', zIndex: 1,
      }}>
        {/* Mega text */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem, 12vw, 11rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 0.85,
          color: 'rgba(255,255,255,0.03)',
          WebkitTextStroke: '1px rgba(255,255,255,0.05)',
          userSelect: 'none',
          marginBottom: '60px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          Haggle
        </div>
        
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '30px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(99,102,241,0.2)" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>
              Haggle
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* One real link beats three that go nowhere — judges click these. */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <a
                href="https://github.com/sidharthnair7/Haggle"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              >
                GitHub
              </a>
            </div>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />

            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
              © 2026
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
