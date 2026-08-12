const fs = require('fs');
let c = fs.readFileSync('src/components/Workspace.jsx', 'utf8');

// Replace any color: 'rgba(something low)' with 0.85 opacity for readability
c = c.replace(/color:\s*['"]rgba\((26,13,30|0,0,0),\s*0\.[0-7]\)['"]/g, "color: 'rgba(26,13,30,0.85)'");
c = c.replace(/color:\s*['"]rgba\((26,13,30|0,0,0),\s*\.[0-7]\)['"]/g, "color: 'rgba(26,13,30,0.85)'");

// Fix the active step number which is #FFFFFF (white on white)
c = c.replace(/: active \? '#FFFFFF' :/g, ": active ? '#1a0d1e' :");

fs.writeFileSync('src/components/Workspace.jsx', c);
console.log('Workspace fixed');
