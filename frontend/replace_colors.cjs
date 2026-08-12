const fs = require('fs');
const path = require('path');
const files = ['Workspace.jsx', 'LandingPage.jsx', 'Footer.jsx', 'Navbar.jsx'];

files.forEach(f => {
  let p = path.join('src', 'components', f);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  
  c = c.replace(/#0c0c18/g, 'var(--bg-card)');
  c = c.replace(/#0d0d1a/g, 'var(--bg-card)');
  c = c.replace(/#0b0b18/g, 'var(--bg-card)');
  c = c.replace(/#060610/g, 'var(--bg-card)');
  c = c.replace(/#070710/g, 'var(--bg-primary)');
  c = c.replace(/#07070f/g, 'var(--bg-primary)');
  c = c.replace(/#06060f/g, 'var(--bg-primary)');
  c = c.replace(/#09091a/g, 'var(--bg-card)');
  
  // Terminal chrome specific
  c = c.replace(/#0f0f22/g, '#F2F2F5');
  
  c = c.replace(/rgba\(255,255,255,/g, 'rgba(0,0,0,');
  c = c.replace(/color: '#fff'/g, "color: 'var(--text-primary)'");
  c = c.replace(/color: '#e8e8f0'/g, "color: 'var(--text-primary)'");
  c = c.replace(/color: '#000'/g, "color: 'var(--text-primary)'");
  
  fs.writeFileSync(p, c);
});
console.log("Done");
