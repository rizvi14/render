// Scroll reveals, card tilt, and the lineage DAG in the hero.
// Everything that moves is gated on prefers-reduced-motion; the DAG also
// degrades to the CSS gradient if WebGL or the CDN is unavailable.

// ?motion in the URL overrides the OS setting (handy for demos and headless checks)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !new URLSearchParams(location.search).has('motion');

// ---------- reveal on scroll ----------
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); revealer.unobserve(e.target); }
  }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el) => revealer.observe(el));

// ---------- card tilt ----------
if (!reduced && matchMedia('(hover: hover)').matches) {
  for (const card of document.querySelectorAll('.tilt')) {
    card.addEventListener('pointermove', (ev) => {
      const r = card.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      card.style.setProperty('--ry', `${(px - 0.5) * 6}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * 5}deg`);
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
}

// ---------- lineage DAG ----------
const canvas = document.getElementById('dag');
const hero = document.getElementById('hero');

function cssColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// sources -> staging -> marts -> dashboards, laid out along x
function buildGraph(THREE, small) {
  const layers = small ? [6, 4, 3, 2] : [10, 6, 4, 3];
  const xs = small ? [-3.6, -1.2, 1.2, 3.6] : [-6, -2, 2, 6];
  const rand = seeded(42);
  const nodes = [];
  layers.forEach((count, layer) => {
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * (small ? 1.25 : 1.05) + (rand() - 0.5) * 0.5;
      const z = (rand() - 0.5) * 3.2;
      nodes.push({ layer, pos: new THREE.Vector3(xs[layer], y, z) });
    }
  });
  const edges = [];
  for (let layer = 0; layer < 3; layer++) {
    const from = nodes.filter((n) => n.layer === layer);
    const to = nodes.filter((n) => n.layer === layer + 1);
    for (const a of from) {
      const fanOut = 1 + Math.floor(rand() * 2);
      const used = new Set();
      for (let j = 0; j < fanOut; j++) {
        const b = to[Math.floor(rand() * to.length)];
        if (used.has(b)) continue;
        used.add(b);
        edges.push([a, b]);
      }
    }
    for (const b of to) {
      if (!edges.some((e) => e[1] === b)) edges.push([from[Math.floor(rand() * from.length)], b]);
    }
  }
  return { nodes, edges };
}

// soft round sprite for the pulse points (Points render as squares otherwise)
function dotTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

async function startDag() {
  if (!canvas || reduced) return;
  const THREE = await import('three');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // sit the graph to the right of the headline on wide screens
  const group = new THREE.Group();
  group.position.x = innerWidth >= 1000 ? 4.2 : 0;
  scene.add(group);

  const accent = new THREE.Color(cssColor('--accent') || '#8290f3');
  const small = innerWidth < 640;
  const { nodes, edges } = buildGraph(THREE, small);

  // nodes
  const nodeGeo = new THREE.SphereGeometry(0.085, 14, 14);
  const nodeMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.95 });
  const nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, nodes.length);
  const m = new THREE.Matrix4();
  nodes.forEach((n, i) => { m.setPosition(n.pos); nodeMesh.setMatrixAt(i, m); });
  group.add(nodeMesh);

  // halo behind each node
  const haloGeo = new THREE.SphereGeometry(0.19, 12, 12);
  const haloMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
  const haloMesh = new THREE.InstancedMesh(haloGeo, haloMat, nodes.length);
  nodes.forEach((n, i) => { m.setPosition(n.pos); haloMesh.setMatrixAt(i, m); });
  group.add(haloMesh);

  // edges
  const edgePos = new Float32Array(edges.length * 6);
  edges.forEach(([a, b], i) => {
    edgePos.set([a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z], i * 6);
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  // pulses travelling along edges, left to right
  const pulsePos = new Float32Array(edges.length * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ map: dotTexture(THREE), color: 0xffffff, size: 0.26, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  group.add(new THREE.Points(pulseGeo, pulseMat));
  const rand = seeded(7);
  const phase = edges.map(() => rand());
  const speed = edges.map(() => 0.12 + rand() * 0.1);

  // theme changes
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    accent.set(cssColor('--accent') || '#8290f3');
    nodeMat.color.copy(accent); haloMat.color.copy(accent); edgeMat.color.copy(accent);
  });

  // pointer parallax
  const target = { x: 0, y: 0 };
  addEventListener('pointermove', (ev) => {
    target.y = (ev.clientX / innerWidth - 0.5) * 0.35;
    target.x = (ev.clientY / innerHeight - 0.5) * 0.25;
  }, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = small ? 13 : (w < 1000 ? 18 : 17);
    group.position.x = w >= 1000 ? 4.2 : 0;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, { passive: true });
  resize();

  // fade the canvas out as the hero scrolls away, and stop rendering when it's gone
  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
  function onScroll() {
    const t = Math.min(1, scrollY / (hero.offsetHeight * 0.9));
    canvas.style.opacity = String(1 - t * t);
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // gentle yaw/pitch drift so the left-to-right lineage stays readable
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden || !heroVisible) return;
    clock.getDelta();
    const t = clock.elapsedTime;
    const driftY = Math.sin(t * 0.18) * 0.32;
    const driftX = Math.sin(t * 0.11 + 1.3) * 0.12;
    group.rotation.y += ((driftY + target.y) - group.rotation.y) * 0.04;
    group.rotation.x += ((driftX + target.x) - group.rotation.x) * 0.04;
    for (let i = 0; i < edges.length; i++) {
      const [a, b] = edges[i];
      const u = (t * speed[i] + phase[i]) % 1;
      pulsePos[i * 3] = a.pos.x + (b.pos.x - a.pos.x) * u;
      pulsePos[i * 3 + 1] = a.pos.y + (b.pos.y - a.pos.y) * u;
      pulsePos[i * 3 + 2] = a.pos.z + (b.pos.z - a.pos.z) * u;
    }
    pulseGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  frame();
}

startDag().catch(() => { /* leave the CSS gradient in place */ });
