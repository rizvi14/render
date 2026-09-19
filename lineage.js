// Interactive lineage diagrams: SVG layered graph + <dialog> project sheet.
// Click a node to light up everything upstream and downstream of it.

import { projects, layers } from './projects.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches && !new URLSearchParams(location.search).has('motion');

const dialog = document.getElementById('project');
const els = {
  company: dialog.querySelector('.sheet-company'),
  title: dialog.querySelector('.sheet-title'),
  dates: dialog.querySelector('.sheet-dates'),
  stack: dialog.querySelector('.sheet-stack'),
  summary: dialog.querySelector('.sheet-summary'),
  graph: dialog.querySelector('.sheet-graph'),
  panel: dialog.querySelector('.sheet-panel'),
  switcher: dialog.querySelector('.sheet-switch'),
  close: dialog.querySelector('.sheet-close'),
};

// ---------- layout ----------
const NODE_H = 38, COL_GAP = 60, ROW_GAP = 16, PAD_X = 12, PAD_TOP = 44, PAD_BOTTOM = 14, CHAR_W = 7.6, LABEL_PAD = 38;

// column widths follow their longest label so nothing truncates
function layout(project) {
  const cols = layers.map((_, i) => project.nodes.filter((n) => n.layer === i));
  const colW = cols.map((col) => Math.max(120, ...col.map((n) => Math.ceil(n.label.length * CHAR_W + LABEL_PAD))));
  const colX = colW.map((_, i) => PAD_X + colW.slice(0, i).reduce((a, b) => a + b, 0) + i * COL_GAP);
  const rows = Math.max(...cols.map((c) => c.length));
  const height = PAD_TOP + rows * NODE_H + (rows - 1) * ROW_GAP + PAD_BOTTOM;
  const width = PAD_X * 2 + colW.reduce((a, b) => a + b, 0) + (layers.length - 1) * COL_GAP;
  const pos = new Map();
  cols.forEach((col, li) => {
    const colH = col.length * NODE_H + (col.length - 1) * ROW_GAP;
    const y0 = PAD_TOP + (height - PAD_TOP - PAD_BOTTOM - colH) / 2;
    col.forEach((n, i) => {
      pos.set(n.id, { x: colX[li], y: y0 + i * (NODE_H + ROW_GAP), w: colW[li] });
    });
  });
  return { width, height, pos, colX, colW };
}

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function edgePath(a, b) {
  const x1 = a.x + a.w, y1 = a.y + NODE_H / 2;
  const x2 = b.x, y2 = b.y + NODE_H / 2;
  const c = (x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + c},${y1} ${x2 - c},${y2} ${x2},${y2}`;
}

// ---------- graph ----------
function buildGraph(project) {
  const { width, height, pos, colX, colW } = layout(project);
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, class: 'lineage', role: 'img', 'aria-label': `${project.title} data lineage` });
  svg.style.minWidth = `${Math.min(width, 980)}px`;

  // layer headings
  layers.forEach((name, i) => {
    el('text', { x: colX[i] + colW[i] / 2, y: 22, class: 'layer-label', 'text-anchor': 'middle' }, svg).textContent = name;
  });

  const edgesG = el('g', { class: 'edges' }, svg);
  const nodesG = el('g', { class: 'nodes' }, svg);
  const byId = new Map(project.nodes.map((n) => [n.id, n]));

  const edgeEls = project.edges.map(([from, to], i) => {
    const kindFrom = byId.get(from).kind;
    const p = el('path', { d: edgePath(pos.get(from), pos.get(to)), class: `edge${kindFrom === 'orchestration' ? ' edge-orch' : ''}`, pathLength: 1, 'data-from': from, 'data-to': to }, edgesG);
    p.style.setProperty('--i', String(byId.get(from).layer));
    return p;
  });

  const nodeEls = new Map();
  project.nodes.forEach((n, i) => {
    const { x, y, w } = pos.get(n.id);
    const g = el('g', { class: `node kind-${n.kind}`, transform: `translate(${x},${y})`, tabindex: 0, role: 'button', 'aria-label': `${n.label}: show lineage`, 'data-id': n.id }, nodesG);
    g.style.setProperty('--i', String(n.layer));
    el('rect', { width: w, height: NODE_H, rx: 9 }, g);
    el('circle', { cx: 14, cy: NODE_H / 2, r: 4, class: 'dot' }, g);
    const t = el('text', { x: 26, y: NODE_H / 2 + 4.5 }, g);
    t.textContent = n.label;
    nodeEls.set(n.id, g);
  });

  return { svg, edgeEls, nodeEls, byId };
}

// upstream/downstream closure
function lineageOf(project, id) {
  const up = new Set(), down = new Set();
  const walk = (start, dir, out) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      for (const [a, b] of project.edges) {
        const [from, to] = dir === 'up' ? [b, a] : [a, b];
        if (from === cur && !out.has(to)) { out.add(to); stack.push(to); }
      }
    }
  };
  walk(id, 'up', up);
  walk(id, 'down', down);
  return { up, down };
}

// ---------- sheet ----------
let current = null;
let graph = null;

function renderPanel(project, node) {
  if (!node) {
    els.panel.innerHTML = `
      <p class="panel-hint">Click any model to trace what feeds it and what it feeds.</p>
      <dl class="panel-legend">
        <div><dt class="kind-source"></dt><dd>Source</dd></div>
        <div><dt class="kind-model"></dt><dd>Model</dd></div>
        <div><dt class="kind-rule"></dt><dd>Rule / scoring</dd></div>
        <div><dt class="kind-mart"></dt><dd>Mart</dd></div>
        <div><dt class="kind-output"></dt><dd>Consumer</dd></div>
      </dl>`;
    return;
  }
  const { up, down } = lineageOf(project, node.id);
  els.panel.innerHTML = `
    <p class="panel-kicker mono">${layers[node.layer]} · ${node.kind}</p>
    <h3 class="panel-title">${node.label}</h3>
    <p class="panel-desc">${node.desc}</p>
    <p class="panel-counts mono"><span>${up.size}</span> upstream · <span>${down.size}</span> downstream</p>
    <button type="button" class="panel-clear">Clear selection</button>`;
  els.panel.querySelector('.panel-clear').addEventListener('click', () => select(null));
}

function select(id) {
  if (!graph || !current) return;
  const { edgeEls, nodeEls, byId } = graph;
  if (id && !byId.has(id)) id = null;
  graph.svg.classList.toggle('has-focus', !!id);
  if (!id) {
    nodeEls.forEach((g) => g.classList.remove('is-focus', 'is-up', 'is-down', 'is-dim'));
    edgeEls.forEach((p) => p.classList.remove('is-lit', 'is-dim'));
    renderPanel(current, null);
    return;
  }
  const { up, down } = lineageOf(current, id);
  const upSet = new Set([id, ...up]), downSet = new Set([id, ...down]);
  nodeEls.forEach((g, nid) => {
    g.classList.toggle('is-focus', nid === id);
    g.classList.toggle('is-up', up.has(nid));
    g.classList.toggle('is-down', down.has(nid));
    g.classList.toggle('is-dim', !upSet.has(nid) && !downSet.has(nid));
  });
  // an edge is lit when both ends sit in the upstream cone or both in the downstream cone
  edgeEls.forEach((p) => {
    const a = p.dataset.from, b = p.dataset.to;
    const on = (upSet.has(a) && upSet.has(b)) || (downSet.has(a) && downSet.has(b));
    p.classList.toggle('is-lit', on);
    p.classList.toggle('is-dim', !on);
  });
  renderPanel(current, byId.get(id));
}

function renderSwitcher(activeId) {
  els.switcher.innerHTML = projects.map((p) =>
    `<button type="button" data-project="${p.id}" class="${p.id === activeId ? 'is-active' : ''}">${p.company}</button>`).join('');
  els.switcher.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => show(b.dataset.project)));
}

function show(id) {
  const project = projects.find((p) => p.id === id);
  if (!project) return;
  current = project;
  els.company.textContent = project.company;
  els.title.textContent = project.title;
  els.dates.textContent = project.dates;
  els.stack.innerHTML = project.stack.map((s) => `<span>${s}</span>`).join('');
  els.summary.textContent = project.summary;
  renderSwitcher(id);

  graph = buildGraph(project);
  els.graph.replaceChildren(graph.svg);
  graph.nodeEls.forEach((g, nid) => {
    g.addEventListener('click', () => select(g.classList.contains('is-focus') ? null : nid));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.click(); } });
  });
  renderPanel(project, null);

  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.sheet-inner').focus({ preventScroll: true });
  dialog.scrollTop = 0;
  history.replaceState(null, '', `#${id}`);

  // draw in, then land on the model that matters
  if (reduced) { graph.svg.classList.add('is-drawn'); select(project.highlight); return; }
  requestAnimationFrame(() => {
    graph.svg.classList.add('is-drawn');
    setTimeout(() => { if (current === project && !graph.svg.classList.contains('has-focus')) select(project.highlight); }, 1300);
  });
}

function close() {
  dialog.close();
}

dialog.addEventListener('close', () => {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  graph = null; current = null;
});
els.close.addEventListener('click', close);
dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

document.querySelectorAll('[data-project]').forEach((btn) => {
  if (btn.closest('.sheet-switch')) return;
  btn.addEventListener('click', (e) => { e.preventDefault(); show(btn.dataset.project); });
});

// deep link: /#stripe
const initial = location.hash.slice(1);
if (projects.some((p) => p.id === initial)) show(initial);
addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (projects.some((p) => p.id === id)) show(id);
});
