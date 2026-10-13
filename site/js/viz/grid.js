/* Registry for visualisers + a reusable SVG Gridworld renderer.
 * The renderer draws the slide conventions: state ids in the corner, values in the middle,
 * Q-values in four triangles (N top, E right, S bottom, W left) with the max highlighted. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { s: svg, h, clear, fmt } = RL.dom;

  const registry = {};
  RL.viz = { register(id, def) { registry[id] = def; }, get: id => registry[id] };

  const CELL = 100;
  const ARROW_PATH = { N: 'M0,-26 L0,22 M-11,-13 L0,-27 L11,-13', S: 'M0,26 L0,-22 M-11,13 L0,27 L11,13',
    E: 'M26,0 L-22,0 M13,-11 L27,0 L13,11', W: 'M-26,0 L22,0 M-13,-11 L-27,0 L-13,11' };

  /**
   * opts: { onCell(s), compact }
   * update(state): { values, q, policy, probs, highlight: {s: cls}, agent, trail, labels, decimals,
   *                  qDecimals, selected, note: {s: text}, counts: {s: {a: n}} }
   */
  function create(container, mdp, opts) {
    opts = opts || {};
    const W = mdp.width * CELL, H = mdp.height * CELL, pad = opts.compact ? 4 : 22;
    const root = svg('svg', { viewBox: (-pad) + ' -4 ' + (W + pad + 4) + ' ' + (H + pad + 4), class: 'grid-svg', role: 'img',
      'aria-label': opts.label || 'Gridworld' });
    container.appendChild(root);
    const toXY = st => { const [x, y] = mdp.coordOf[st]; return [x * CELL, (mdp.height - 1 - y) * CELL]; };

    function draw(state) {
      state = state || {};
      clear(root);
      const dec = state.decimals == null ? 2 : state.decimals, qdec = state.qDecimals == null ? 2 : state.qDecimals;
      // walls
      mdp.wallSet.forEach(key => {
        const [x, y] = key.split(',').map(Number);
        root.appendChild(svg('rect', { x: x * CELL, y: (mdp.height - 1 - y) * CELL, width: CELL, height: CELL, class: 'g-wall' }));
      });
      mdp.states.forEach(st => {
        const [x0, y0] = toXY(st), cx = x0 + CELL / 2, cy = y0 + CELL / 2;
        const g = svg('g', { class: 'g-cellgroup' + (opts.onCell ? ' clickable' : ''), tabindex: opts.onCell ? 0 : null,
          role: opts.onCell ? 'button' : null, 'aria-label': mdp.label(st) });
        const term = mdp.isTerminal(st);
        const reward = term ? mdp.terminalReward(st) : 0;
        g.appendChild(svg('rect', { x: x0, y: y0, width: CELL, height: CELL, class: 'g-cell' + (term ? (reward >= 0 ? ' g-goal' : ' g-pit') : '') }));
        const v = state.values ? state.values[st] : null;
        if (!term && v != null && !state.q) {
          const a = Math.min(1, Math.abs(v)) * 0.55;
          if (a > 0.005) g.appendChild(svg('rect', { x: x0, y: y0, width: CELL, height: CELL, class: v >= 0 ? 'g-heat-pos' : 'g-heat-neg', 'fill-opacity': a.toFixed(3) }));
        }
        if (state.highlight && state.highlight[st]) g.appendChild(svg('rect', { x: x0 + 3, y: y0 + 3, width: CELL - 6, height: CELL - 6, class: 'g-hl ' + state.highlight[st] }));
        if (state.q && !term) drawQ(g, st, x0, y0, state.q[st], qdec, state.qHighlight && state.qHighlight[st]);
        if (term) g.appendChild(svg('text', { x: cx, y: cy + 8, class: 'g-term', text: (reward > 0 ? '+' : reward < 0 ? '−' : '') + Math.abs(reward) + (state.termLabel ? '' : '') }));
        else if (v != null && !state.q) g.appendChild(svg('text', { x: cx, y: state.policy ? y0 + CELL - 12 : cy + 7, class: 'g-val', text: fmt(v, dec) }));
        if (state.policy && !term && state.policy[st]) drawArrows(g, cx, state.policy && !state.q && v != null ? cy - 8 : cy, state.policy[st], state.q ? 0.55 : 1);
        if (state.labels && state.labels[st] != null) g.appendChild(svg('text', { x: cx, y: y0 + CELL - 10, class: 'g-note', text: state.labels[st] }));
        if (opts.bigIds && !term && v == null && !state.q) g.appendChild(svg('text', { x: cx, y: cy + 10, class: 'g-bigid', text: mdp.label(st) }));
        else g.appendChild(svg('text', { x: x0 + CELL - 6, y: y0 + 16, class: 'g-id' + (opts.bigIds ? ' big' : ''), 'text-anchor': 'end', text: mdp.label(st) }));
        if (state.selected === st) g.appendChild(svg('rect', { x: x0 + 2, y: y0 + 2, width: CELL - 4, height: CELL - 4, class: 'g-selected' }));
        if (opts.onCell) {
          g.addEventListener('click', () => opts.onCell(st));
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onCell(st); } });
        }
        root.appendChild(g);
      });
      // trail of visited states
      if (state.trail && state.trail.length > 1) {
        const pts = state.trail.map(st => toXY(st).map(c => c + CELL / 2));
        root.appendChild(svg('polyline', { points: pts.map(p => p.join(',')).join(' '), class: 'g-trail' }));
      }
      if (state.agent != null) {
        const [ax, ay] = toXY(state.agent);
        root.appendChild(svg('circle', { cx: ax + 24, cy: ay + 24, r: 13, class: 'g-agent' }));
      }
      if (!opts.compact) {
        for (let x = 0; x < mdp.width; x++) root.appendChild(svg('text', { x: x * CELL + CELL / 2, y: H + 16, class: 'g-axis', text: x }));
        for (let y = 0; y < mdp.height; y++) root.appendChild(svg('text', { x: -12, y: (mdp.height - 1 - y) * CELL + CELL / 2 + 4, class: 'g-axis', text: y }));
      }
    }
    function drawQ(g, st, x0, y0, qs, dec, forced) {
      if (!qs) return;
      const c = [x0 + CELL / 2, y0 + CELL / 2];
      const tri = { N: [[x0, y0], [x0 + CELL, y0]], E: [[x0 + CELL, y0], [x0 + CELL, y0 + CELL]], S: [[x0 + CELL, y0 + CELL], [x0, y0 + CELL]], W: [[x0, y0 + CELL], [x0, y0]] };
      const pos = { N: [c[0], y0 + 22], E: [x0 + CELL - 6, c[1] + 4], S: [c[0], y0 + CELL - 12], W: [x0 + 6, c[1] + 4] };
      const anchor = { N: 'middle', S: 'middle', E: 'end', W: 'start' };
      const vals = Object.values(qs), best = Math.max(...vals);
      ['N', 'E', 'S', 'W'].forEach(a => {
        const v = qs[a]; if (v == null) return;
        const [p1, p2] = tri[a];
        const isBest = forced ? forced === a : Math.abs(v - best) < 1e-9 && vals.some(x => x !== v || vals.length === 1);
        const alpha = Math.min(1, Math.abs(v)) * 0.5;
        g.appendChild(svg('polygon', { points: [p1, p2, c].map(p => p.join(',')).join(' '), class: 'g-tri ' + (v >= 0 ? 'g-heat-pos' : 'g-heat-neg'), 'fill-opacity': alpha.toFixed(3) }));
        g.appendChild(svg('polygon', { points: [p1, p2, c].map(p => p.join(',')).join(' '), class: 'g-tri-line' }));
        g.appendChild(svg('text', { x: pos[a][0], y: pos[a][1], 'text-anchor': anchor[a], class: 'g-q' + (isBest ? ' best' : ''), text: fmt(v, dec) }));
      });
    }
    function drawArrows(g, cx, cy, spec, scale) {
      const list = typeof spec === 'string' ? [[spec, 1]] : Array.isArray(spec) ? spec.map(a => [a, 1]) : Object.entries(spec).filter(e => e[1] > 0.001);
      if (list.length === 1) {
        list.forEach(([a, p]) => g.appendChild(svg('path', { d: ARROW_PATH[a], transform: 'translate(' + cx + ',' + cy + ') scale(' + scale + ')',
          class: 'g-arrow', 'stroke-opacity': Math.max(0.25, p).toFixed(2), 'stroke-width': (2.5 + 4 * p).toFixed(1) })));
        return;
      }
      // several actions (stochastic policy or ties): short arrows radiating from the centre; width ∝ probability
      const OUT = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
      g.appendChild(svg('circle', { cx, cy, r: 3, class: 'g-arrow-dot' }));
      list.forEach(([a, p]) => {
        const [dx, dy] = OUT[a], L = 24 * scale, x2 = cx + dx * L, y2 = cy + dy * L, hx = -dy * 6, hy = dx * 6;
        g.appendChild(svg('path', { d: 'M' + (cx + dx * 5) + ',' + (cy + dy * 5) + ' L' + x2 + ',' + y2 + ' M' + (x2 - dx * 8 + hx) + ',' + (y2 - dy * 8 + hy) + ' L' + x2 + ',' + y2 + ' L' + (x2 - dx * 8 - hx) + ',' + (y2 - dy * 8 - hy),
          class: 'g-arrow', 'stroke-opacity': Math.max(0.35, Math.min(1, p * 2)).toFixed(2), 'stroke-width': (1.5 + 5 * p).toFixed(1) }));
      });
    }
    draw(opts.initial);
    return { update: draw, svg: root };
  }

  /** Small helpers for visualisers. */
  function table(headers, rows, cls) {
    return h('table.data' + (cls ? '.' + cls : ''), h('thead', h('tr', headers.map(x => h('th', { html: x })))),
      h('tbody', rows.map(r => h('tr', r.cells ? { class: r.cls || null } : null, (r.cells || r).map(x => x instanceof Node ? h('td', x) : h('td', typeof x === 'object' && x ? { html: x.html, class: x.cls || null } : { html: x == null ? '' : String(x) }))))));
  }
  function readout(pairs) { return h('dl.readout', pairs.map(([k, v]) => [h('dt', { html: k }), v instanceof Node ? h('dd', v) : h('dd', { html: v })])); }
  const A_ZH = { N: 'Up / N', E: 'Right / E', S: 'Down / S', W: 'Left / W' };

  RL.gridView = { create, table, readout, A_ZH, CELL };
})(window);
