import React from 'react';
import { Hexagon } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '64px 0 32px', marginTop: '100px' }}>
      <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Hexagon size={24} color="var(--accent-indigo)" fill="rgba(99, 102, 241, 0.2)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '1px' }}>HaggleAI</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '250px' }}>
              The autonomous medical price negotiation layer. Deploy agents to secure the lowest cash pay rate.
            </p>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <a href="/workspace">Workspace</a>
              <a href="#">Cookbook</a>
              <a href="#">Benchmarks</a>
              <a href="#">Pricing</a>
            </div>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>Developers</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <a href="#">Documentation</a>
              <a href="#">API Reference</a>
              <a href="#">Cookbook</a>
              <a href="#">GitHub</a>
            </div>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>Company</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '16px', fontSize: '0.9rem' }}>Legal</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '32px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            &copy; 2026 HaggleAI, Inc. All rights reserved.
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div className="status-dot pulse"></div>
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
}
