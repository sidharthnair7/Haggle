import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

/*
  HeroScene — Pure Three.js WebGL negotiation visualization
  
  Central "Agent" node connected to 3-4 "Provider" nodes via animated bezier tubes.
  Light particles travel along the connections. Prices tick above nodes as HTML overlays.
  Mouse parallax tilts the scene subtly. Light-mode aesthetic: white/lavender.
*/

// ─── Configuration ──────────────────────────────────
const AGENT_COLOR = 0x6366f1;
const AGENT_GLOW = 0x8b5cf6;
const PROVIDER_COLOR_DEFAULT = 0x94a3b8;
const PROVIDER_COLOR_ACCEPTED = 0x10b981;
const PROVIDER_COLOR_FLAGGED = 0xf43f5e;

const PROVIDERS = [
  { name: 'Valley Scan CT', initialPrice: 555, finalPrice: 455, status: 'accepted', angle: -Math.PI * 0.35 },
  { name: 'Apex Imaging', initialPrice: 620, finalPrice: 550, status: 'neutral', angle: Math.PI * 0.15 },
  { name: 'Bay Health MRI', initialPrice: 890, finalPrice: 890, status: 'flagged', angle: Math.PI * 0.65 },
  { name: 'Metro Radiology', initialPrice: 710, finalPrice: 580, status: 'neutral', angle: -Math.PI * 0.85 },
];

// ─── Helpers ────────────────────────────────────────
function createGlowSprite(color, size = 2.0) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const c = new THREE.Color(color);
  gradient.addColorStop(0, `rgba(${Math.floor(c.r*255)},${Math.floor(c.g*255)},${Math.floor(c.b*255)},0.6)`);
  gradient.addColorStop(0.4, `rgba(${Math.floor(c.r*255)},${Math.floor(c.g*255)},${Math.floor(c.b*255)},0.15)`);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  return sprite;
}

function createNode(radius, color) {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    emissive: color,
    emissiveIntensity: 0.15,
  });
  return new THREE.Mesh(geometry, material);
}

function createBezierCurve(start, end) {
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  // Add some curvature by offsetting the control points
  const dir = new THREE.Vector3().subVectors(end, start);
  const perpendicular = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
  const curveOffset = dir.length() * 0.25;
  
  const cp1 = new THREE.Vector3().copy(mid).add(perpendicular.clone().multiplyScalar(curveOffset));
  const cp2 = new THREE.Vector3().copy(mid).add(perpendicular.clone().multiplyScalar(-curveOffset * 0.3));
  
  return new THREE.CubicBezierCurve3(start.clone(), cp1, cp2, end.clone());
}

function createConnectionLine(curve, color) {
  const points = curve.getPoints(64);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.35,
    linewidth: 1,
  });
  return new THREE.Line(geometry, material);
}

function createParticle(color) {
  const geometry = new THREE.SphereGeometry(0.06, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);
  
  // Add glow
  const glow = createGlowSprite(color, 0.5);
  mesh.add(glow);
  
  return mesh;
}

// ─── React Component ────────────────────────────────
export default function HeroScene() {
  const containerRef = useRef(null);
  const overlaysRef = useRef(null);
  const sceneRef = useRef(null);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [nodeData, setNodeData] = useState([]);
  const [animationPhase, setAnimationPhase] = useState('idle'); // idle → entering → negotiating → resolved
  const phaseRef = useRef('idle');
  const startTimeRef = useRef(0);

  const initScene = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // ─── Renderer ───
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // ─── Scene ───
    const scene = new THREE.Scene();

    // ─── Camera (slightly perspective for depth) ───
    const aspect = rect.width / rect.height;
    const camera = new THREE.PerspectiveCamera(35, aspect, 0.1, 100);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    // ─── Lighting ───
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(-5, 5, 8);
    keyLight.castShadow = false;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe8e0ff, 0.3);
    fillLight.position.set(3, -2, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc4b5fd, 0.25);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    // ─── Agent Node (center) ───
    const agentNode = createNode(0.45, AGENT_COLOR);
    agentNode.position.set(0, 0, 0);
    agentNode.scale.set(0, 0, 0); // Start hidden for animation
    scene.add(agentNode);

    // Agent glow
    const agentGlow = createGlowSprite(AGENT_GLOW, 3.0);
    agentNode.add(agentGlow);

    // Agent inner ring
    const ringGeometry = new THREE.RingGeometry(0.55, 0.6, 48);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: AGENT_GLOW,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const agentRing = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(agentRing);

    // ─── Provider Nodes ───
    const providerRadius = 3.5;
    const providerNodes = [];
    const connections = [];
    const particles = [];
    const curves = [];

    PROVIDERS.forEach((provider, i) => {
      const px = Math.cos(provider.angle) * providerRadius;
      const py = Math.sin(provider.angle) * providerRadius;

      const node = createNode(0.3, PROVIDER_COLOR_DEFAULT);
      node.position.set(px, py, 0);
      node.scale.set(0, 0, 0); // Start hidden
      scene.add(node);

      // Provider glow
      const glow = createGlowSprite(PROVIDER_COLOR_DEFAULT, 1.8);
      node.add(glow);

      // Connection curve
      const curve = createBezierCurve(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(px, py, 0)
      );
      curves.push(curve);

      const line = createConnectionLine(curve, AGENT_COLOR);
      line.visible = false; // Start hidden
      scene.add(line);
      connections.push(line);

      // Traveling particles (2 per connection)
      for (let p = 0; p < 2; p++) {
        const particle = createParticle(AGENT_COLOR);
        particle.visible = false;
        scene.add(particle);
        particles.push({
          mesh: particle,
          curve,
          speed: 0.3 + Math.random() * 0.2,
          offset: p * 0.5,
          connectionIndex: i,
        });
      }

      providerNodes.push({
        mesh: node,
        data: provider,
        initialPos: new THREE.Vector3(px, py, 0),
        glow,
      });
    });

    // ─── Animation State ───
    let elapsed = 0;
    let cameraTargetX = 0;
    let cameraTargetY = 0;
    let currentPhase = 'idle';
    const nodePositions = []; // For HTML overlay positioning

    // Start the animation sequence
    setTimeout(() => {
      currentPhase = 'entering';
      phaseRef.current = 'entering';
      setAnimationPhase('entering');
      startTimeRef.current = elapsed;
    }, 300);

    // ─── Resize ───
    const onResize = () => {
      const r = container.getBoundingClientRect();
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // ─── Mouse tracking ───
    const onMouseMove = (e) => {
      const r = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    container.addEventListener('mousemove', onMouseMove);

    // ─── Intersection Observer ───
    let isVisible = true;
    const io = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    io.observe(container);

    // ─── Render Loop ───
    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      elapsed += delta;
      const phaseTime = elapsed - startTimeRef.current;

      // ─── Camera parallax ───
      cameraTargetX += (mouseRef.current.x * 0.4 - cameraTargetX) * 0.05;
      cameraTargetY += (mouseRef.current.y * 0.3 - cameraTargetY) * 0.05;
      camera.position.x = cameraTargetX;
      camera.position.y = cameraTargetY;
      camera.lookAt(0, 0, 0);

      // ─── Phase: Entering ───
      if (currentPhase === 'entering') {
        // Agent node scales in
        const agentScale = Math.min(1, phaseTime * 2.5);
        const eased = 1 - Math.pow(1 - agentScale, 3);
        agentNode.scale.setScalar(eased);
        agentRing.scale.setScalar(eased);

        // Provider nodes stagger in
        providerNodes.forEach((pn, i) => {
          const delay = 0.3 + i * 0.2;
          const t = Math.max(0, phaseTime - delay);
          const s = Math.min(1, t * 2.5);
          const e = 1 - Math.pow(1 - s, 3);
          pn.mesh.scale.setScalar(e);

          // Lines draw in
          if (t > 0.1) {
            connections[i].visible = true;
            const lineProgress = Math.min(1, (t - 0.1) * 2);
            const geom = connections[i].geometry;
            const points = curves[i].getPoints(64);
            const visibleCount = Math.floor(lineProgress * 64);
            const visiblePoints = points.slice(0, Math.max(2, visibleCount));
            geom.setFromPoints(visiblePoints);
          }
        });

        // Transition to negotiating
        if (phaseTime > 1.8) {
          currentPhase = 'negotiating';
          phaseRef.current = 'negotiating';
          setAnimationPhase('negotiating');
          startTimeRef.current = elapsed;
          // Make all particles visible
          particles.forEach(p => { p.mesh.visible = true; });
        }
      }

      // ─── Phase: Negotiating ───
      if (currentPhase === 'negotiating') {
        // Particles travel along curves
        particles.forEach((p) => {
          const t = ((elapsed * p.speed + p.offset) % 1);
          const point = p.curve.getPoint(t);
          p.mesh.position.copy(point);
          p.mesh.material.opacity = Math.sin(t * Math.PI) * 0.9;
        });

        // Connection lines pulse
        connections.forEach((line, i) => {
          line.material.opacity = 0.2 + Math.sin(elapsed * 3 + i) * 0.15;
        });

        // After 3 seconds, start resolving
        if (phaseTime > 3) {
          currentPhase = 'resolving';
          phaseRef.current = 'resolving';
          setAnimationPhase('resolving');
          startTimeRef.current = elapsed;
        }
      }

      // ─── Phase: Resolving ───
      if (currentPhase === 'resolving') {
        providerNodes.forEach((pn, i) => {
          const delay = i * 0.5;
          const t = Math.max(0, phaseTime - delay);
          
          if (pn.data.status === 'accepted' && t > 0) {
            const progress = Math.min(1, t * 1.5);
            const color = new THREE.Color(PROVIDER_COLOR_DEFAULT).lerp(
              new THREE.Color(PROVIDER_COLOR_ACCEPTED), progress
            );
            pn.mesh.material.color.copy(color);
            pn.mesh.material.emissive.copy(color);
            
            // Update glow
            connections[i].material.color.set(PROVIDER_COLOR_ACCEPTED);
            connections[i].material.opacity = 0.3 + Math.sin(elapsed * 4) * 0.1;
          }
          
          if (pn.data.status === 'flagged' && t > 0) {
            const progress = Math.min(1, t * 1.5);
            const color = new THREE.Color(PROVIDER_COLOR_DEFAULT).lerp(
              new THREE.Color(PROVIDER_COLOR_FLAGGED), progress
            );
            pn.mesh.material.color.copy(color);
            pn.mesh.material.emissive.copy(color);
            
            // Flagged connection flickers
            connections[i].material.color.set(PROVIDER_COLOR_FLAGGED);
            connections[i].material.opacity = 0.15 + Math.sin(elapsed * 8) * 0.1;
          }
        });

        // After resolve, loop back
        if (phaseTime > 4) {
          currentPhase = 'resolved';
          phaseRef.current = 'resolved';
          setAnimationPhase('resolved');
          startTimeRef.current = elapsed;
        }
      }

      // ─── Phase: Resolved (ambient loop) ───
      if (currentPhase === 'resolved') {
        // Gentle ambient animation
        particles.forEach((p) => {
          const t = ((elapsed * p.speed * 0.5 + p.offset) % 1);
          const point = p.curve.getPoint(t);
          p.mesh.position.copy(point);
          p.mesh.material.opacity = Math.sin(t * Math.PI) * 0.5;
        });

        // Agent node gentle breathing
        const breathe = 1 + Math.sin(elapsed * 1.5) * 0.04;
        agentNode.scale.setScalar(breathe);

        // Ring rotation
        agentRing.rotation.z = elapsed * 0.2;
      }

      // ─── Agent ring rotation ───
      agentRing.rotation.z += delta * 0.5;

      // ─── Agent glow pulse ───
      if (agentGlow) {
        const glowScale = 3.0 + Math.sin(elapsed * 2) * 0.3;
        agentGlow.scale.set(glowScale, glowScale, 1);
      }

      // ─── Update HTML overlay positions ───
      const newPositions = [];
      
      // Agent position
      const agentScreenPos = agentNode.position.clone().project(camera);
      newPositions.push({
        name: 'HaggleAI Agent',
        x: (agentScreenPos.x * 0.5 + 0.5) * 100,
        y: (-agentScreenPos.y * 0.5 + 0.5) * 100,
        isAgent: true,
        price: null,
        status: 'agent',
      });

      // Provider positions
      providerNodes.forEach((pn, i) => {
        const screenPos = pn.mesh.position.clone().project(camera);
        const progress = currentPhase === 'resolving' || currentPhase === 'resolved'
          ? Math.min(1, (elapsed - startTimeRef.current) / 2)
          : currentPhase === 'negotiating'
            ? Math.min(1, (elapsed - startTimeRef.current) / 3)
            : 0;

        let displayPrice = pn.data.initialPrice;
        if (currentPhase === 'negotiating') {
          // Prices start showing during negotiation
          displayPrice = pn.data.initialPrice;
        } else if (currentPhase === 'resolving' || currentPhase === 'resolved') {
          // Prices tick down to final
          const priceProgress = Math.min(1, Math.max(0, (phaseTime - i * 0.5) * 0.8));
          const eased = 1 - Math.pow(1 - priceProgress, 2);
          displayPrice = Math.round(pn.data.initialPrice + (pn.data.finalPrice - pn.data.initialPrice) * eased);
        }

        newPositions.push({
          name: pn.data.name,
          x: (screenPos.x * 0.5 + 0.5) * 100,
          y: (-screenPos.y * 0.5 + 0.5) * 100,
          isAgent: false,
          price: displayPrice,
          status: pn.data.status,
          showPrice: currentPhase !== 'entering' && currentPhase !== 'idle',
        });
      });

      setNodeData(newPositions);

      // ─── Render ───
      renderer.render(scene, camera);
    };

    animate();

    // Store cleanup refs
    sceneRef.current = {
      renderer,
      scene,
      camera,
      raf,
      ro,
      io,
      container,
      onMouseMove,
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      container.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      try { container.removeChild(renderer.domElement); } catch {}
    };
  }, []);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  return (
    <div className="hero-scene-container" ref={containerRef}>
      {/* HTML overlays for node labels */}
      <div
        ref={overlaysRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {nodeData.map((node, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              opacity: animationPhase === 'idle' ? 0 : 1,
              transition: 'opacity 0.5s ease',
            }}
          >
            {/* Node name */}
            <span
              className="hero-scene__node-label"
              style={{
                color: node.isAgent ? '#6366f1' : 'rgba(0,0,0,0.55)',
                fontSize: node.isAgent ? '0.75rem' : '0.65rem',
                fontWeight: node.isAgent ? 700 : 600,
                marginTop: node.isAgent ? '36px' : '28px',
              }}
            >
              {node.name}
            </span>

            {/* Price (providers only) */}
            {node.showPrice && node.price && (
              <span
                className="hero-scene__node-price"
                style={{
                  color:
                    node.status === 'accepted' ? '#10b981'
                    : node.status === 'flagged' ? '#f43f5e'
                    : 'rgba(0,0,0,0.7)',
                  fontSize: '0.85rem',
                }}
              >
                ${node.price}
              </span>
            )}

            {/* Status badge */}
            {(animationPhase === 'resolving' || animationPhase === 'resolved') && node.status === 'accepted' && (
              <span style={{
                fontSize: '0.55rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: '#10b981',
                background: 'rgba(16,185,129,0.1)',
                padding: '2px 8px',
                borderRadius: '100px',
                letterSpacing: '0.06em',
              }}>
                DEAL ✓
              </span>
            )}
            {(animationPhase === 'resolving' || animationPhase === 'resolved') && node.status === 'flagged' && (
              <span style={{
                fontSize: '0.55rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                color: '#f43f5e',
                background: 'rgba(244,63,94,0.1)',
                padding: '2px 8px',
                borderRadius: '100px',
                letterSpacing: '0.06em',
              }}>
                FLAGGED ⚠
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
