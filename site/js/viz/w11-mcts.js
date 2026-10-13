/* Week 11-1 visualisers: one MCTS iteration step by step, UCB/UCT calculator, the slide-style MCTS Gridworld
 * (decisions 1-6 with subtree reuse), depth-limited Expectimax, PUCT vs UCT, and the self-play targets. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout } = RL.gridView;
  const { courseGrid, rng: rngOf } = RL.mdp;
  const M = RL.mcts, dp = RL.dp, L = RL.learn;
  const tf = (x, d) => fmt(x, d == null ? 4 : d).replace('−', '-');
  const AN = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' };
  const KIND = { intended: '按意图移动', 'slip left': '向左打滑', 'slip right': '向右打滑' };
  const q4 = x => (x < 0 ? '−' : '') + Math.abs(x).toFixed(4);
  const sName = s => 's' + s;
  const ucbStr = x => x === Infinity ? '+∞' : fmt(x, 4);

  /* ---------- slide-style grid: Q and N in four triangles per cell (W11 p.16-21) ---------- */
  function mctsGridSVG(g, stats, opts) {
    const C = 130, W = g.width * C, H = g.height * C, S = svg;
    const out = S('svg', { viewBox: '-18 -4 ' + (W + 24) + ' ' + (H + 24), class: 'grid-svg', role: 'img', 'aria-label': 'MCTS Gridworld' });
    const toXY = st => { const [x, y] = g.coordOf[st]; return [x * C, (g.height - 1 - y) * C]; };
    g.wallSet.forEach(key => {
      const [x, y] = key.split(',').map(Number), x0 = x * C, y0 = (g.height - 1 - y) * C;
      out.appendChild(S('rect', { x: x0, y: y0, width: C, height: C, class: 'g-wall' }));
      (opts.caption || []).forEach((t, i) => out.appendChild(S('text', { x: x0 + 12, y: y0 + 34 + i * 17, style: 'font-size:12px;fill:var(--text)', text: t })));
    });
    const pos = { N: [C / 2, 26], S: [C / 2, C - 22], W: [4, C / 2 - 4], E: [C - 4, C / 2 - 4] };
    const anchor = { N: 'middle', S: 'middle', W: 'start', E: 'end' };
    g.states.forEach(st => {
      const [x0, y0] = toXY(st), term = g.isTerminal(st);
      out.appendChild(S('rect', { x: x0, y: y0, width: C, height: C, class: 'g-cell' + (term ? (g.terminalReward(st) > 0 ? ' g-goal' : ' g-pit') : '') }));
      out.appendChild(S('text', { x: x0 + C - 6, y: y0 + 18, 'text-anchor': 'end', class: 'g-id', style: 'font-size:15px;font-weight:700', text: sName(st) }));
      if (term) { out.appendChild(S('text', { x: x0 + C / 2, y: y0 + C / 2 + 8, class: 'g-term', text: (g.terminalReward(st) > 0 ? '+1' : '−1') })); return; }
      out.appendChild(S('path', { d: 'M' + x0 + ',' + y0 + ' L' + (x0 + C) + ',' + (y0 + C) + ' M' + (x0 + C) + ',' + y0 + ' L' + x0 + ',' + (y0 + C), class: 'g-tri-line' }));
      const isRoot = st === opts.root, cur = stats[st], old = opts.stale && opts.stale[st];
      g.actions.forEach(a => {
        const v = cur && cur[a], o = !v && old && old[a], px = x0 + pos[a][0], py = y0 + pos[a][1];
        const chosen = isRoot && opts.chosen === a;
        if (chosen) out.appendChild(S('rect', { x: anchor[a] === 'start' ? px - 2 : anchor[a] === 'end' ? px - 58 : px - 30, y: py - 13, width: 60, height: 30, rx: 2, style: 'fill:#fff36b;stroke:#c9b800' }));
        const col = chosen ? '#111' : isRoot ? 'var(--text)' : v ? 'var(--c-teal)' : 'var(--muted)';
        const wt = isRoot ? 700 : 400, op = !v && o ? 0.55 : 1;
        const d = v || o;
        out.appendChild(S('text', { x: px, y: py, 'text-anchor': anchor[a], style: 'font-size:10.5px;font-weight:' + wt + ';fill:' + col + ';opacity:' + op, text: d ? 'Q=' + q4(d.Q) : 'Q=—' }));
        out.appendChild(S('text', { x: px, y: py + 12, 'text-anchor': anchor[a], style: 'font-size:10.5px;font-weight:' + wt + ';fill:' + col + ';opacity:' + op, text: 'N=' + (d ? d.N : 0) }));
      });
      if (isRoot) {
        out.appendChild(S('circle', { cx: x0 + C / 2, cy: y0 + C / 2 + 20, r: 10, style: 'fill:#1f77b4' }));
        out.appendChild(S('text', { x: x0 + C / 2, y: y0 + C / 2 + 24, 'text-anchor': 'middle', style: 'font-size:11px;font-weight:700;fill:#fff', text: 'R' }));
      }
    });
    for (let x = 0; x < g.width; x++) out.appendChild(S('text', { x: x * C + C / 2, y: H + 16, class: 'g-axis', text: x }));
    for (let y = 0; y < g.height; y++) out.appendChild(S('text', { x: -10, y: (g.height - 1 - y) * C + C / 2 + 4, class: 'g-axis', text: y }));
    return out;
  }

  /* The six decisions as printed on the slides (root state, Q/N for Up, Right, Down, Left, chosen action, what happened). */
  const SLIDE_DECISIONS = [
    { p: 16, s: 1, q: { N: [-0.0250, 64], E: [-0.1580, 36], S: [-0.0905, 48], W: [-0.0730, 52] }, pick: 'N', then: '选 Up，向左打滑撞墙，留在 (0,0)' },
    { p: 17, s: 1, q: { N: [-0.0035, 62], E: [-0.0947, 42], S: [-0.0526, 50], W: [-0.0525, 50] }, pick: 'N', then: '选 Up，成功到 (0,1) = s5' },
    { p: 18, s: 5, q: { N: [0.0680, 83], E: [-0.0069, 57], S: [-0.0083, 56], W: [-0.0093, 57] }, pick: 'N', then: '选 Up，成功到 (0,2) = s8' },
    { p: 19, s: 8, q: { N: [0.0714, 68], E: [0.1284, 75], S: [0.0603, 64], W: [0.0181, 53] }, pick: 'E', then: '选 Right，成功到 (1,2) = s9' },
    { p: 20, s: 9, q: { N: [0.1686, 30], E: [0.5249, 172], S: [0.1691, 30], W: [0.0716, 23] }, pick: 'E', then: '选 Right，成功到 (2,2) = s10' },
    { p: 21, s: 10, q: { N: [0.5268, 48], E: [0.8233, 266], S: [-0.1299, 9], W: [0.1224, 15] }, pick: 'E', then: '下一步选 Right，（很可能）进入 +1' }
  ];
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { mctsGridSVG, SLIDE_DECISIONS });

  /* ---------- c35: MCTS Gridworld, decisions with subtree reuse ---------- */
  RL.viz.register('mctsgrid', {
    title: 'MCTS Gridworld：每次决策 200 次迭代，执行后复用子树',
    mount(el) {
      const g = courseGrid(), P = { iters: 200, horizon: 60, c: Math.SQRT2, reuse: true, seed: 7, by: 'q' };
      let tree, s, rng, dec, log, stale, searched, done;
      const pic = h('div'), info = h('div'), logBox = h('div');
      function reset() { rng = rngOf(P.seed); s = g.start; tree = M.createTree(g, s); tree.carried = 0; dec = 1; log = []; stale = {}; searched = false; done = false; draw(); }
      function runSearch() {
        if (done) return;
        if (searched) { draw('这一状态已经搜索过；先执行动作，或 Reset。'); return; }
        M.search(g, tree, P.iters, { c: P.c, horizon: P.horizon, rng });
        searched = true; draw();
      }
      function act() {
        if (done) return;
        if (!searched) runSearch();
        const a = M.bestAction(g, tree.root, P.by), o = g.step(s, a, rng);
        const sum = M.rootVisits(g, tree.root);
        // states that will not be in the reused subtree keep their last numbers, shown grey (as on the slides)
        const cur = M.stateStats(g, tree); Object.keys(cur).forEach(k => { stale[k] = cur[k]; });
        log.push({ dec, s, sum, carried: tree.carried, a, next: o.next, kind: o.kind, q: tree.root.edges[a].Q, n: tree.root.edges[a].N });
        const nt = M.advance(g, tree, a, o.next, P.reuse);
        tree = { root: nt.root, iterations: 0, carried: nt.carried };
        s = o.next; dec++; searched = false;
        if (g.isTerminal(s)) done = true;
        draw();
      }
      function auto() { let k = 0; while (!done && k < 30) { if (!searched) runSearch(); act(); k++; } }
      function draw(msg) {
        const stats = searched || tree.carried ? M.stateStats(g, tree) : {};
        const staleNow = {}; Object.keys(stale).forEach(k => { if (!stats[k]) staleNow[k] = stale[k]; });
        const chosen = searched ? M.bestAction(g, tree.root, P.by) : null;
        clear(pic).put(mctsGridSVG(g, stats, { root: done ? null : s, chosen, stale: staleNow, caption: ['After ' + tree.iterations + ' iterations', 'γ=0.9', 'c=' + (Math.abs(P.c - Math.SQRT2) < 1e-9 ? '√2' : fmt(P.c, 2)), 'Horizon: ' + P.horizon] }));
        const sum = M.rootVisits(g, tree.root);
        clear(info).put(
          msg ? h('p.viz-note', msg) : null,
          done ? h('p.viz-step', '到达终止状态 ' + sName(s) + '（' + (g.terminalReward(s) > 0 ? '+1' : '−1') + '），这一回合结束。点 Reset 重新开始。') :
            h('p.viz-step', '决策 ' + dec + '：agent 在 ' + sName(s) + ' (' + g.coordOf[s].join(',') + ')。' + (searched ? '已完成 ' + tree.iterations + ' 次迭代。黄色框是要执行的动作（按' + (P.by === 'q' ? '最大 Q' : '最多访问次数') + '）。' : '还没搜索：点“运行 MCTS”。')),
          done ? null : readout([
            ['根节点 Σ<sub>a</sub> N(s0,a)', String(sum) + (tree.carried ? '　= ' + tree.carried + '（复用子树带来的旧次数）+ ' + tree.iterations + '（这次的迭代）' : '')],
            ['树中节点数', String(M.countNodes(tree.root))],
            ['根节点各动作', g.actions.map(a => AN[a] + ' ' + (tree.root.edges[a].N ? q4(tree.root.edges[a].Q) + '/' + tree.root.edges[a].N : '—')).join('　')]
          ]),
          h('p.muted', '每格四个三角形：上 = Up、右 = Right、下 = Down、左 = Left，写着 Q(s,a) 和 N(s,a)。粗体的是根节点（R 所在格）；青色是当前树里其他节点的统计（同一状态在树中出现多次时合并：N 相加、Q 按 N 加权平均——这是本站的显示方式）；灰色是旧树留下、没有被复用的数字。'));
        clear(logBox).put(log.length ? table(['决策', '根', 'Σ N(s0,a)', '其中复用', '执行', 'Q / N', '结果'],
          log.map(r => [String(r.dec), sName(r.s), String(r.sum), String(r.carried), AN[r.a], q4(r.q) + ' / ' + r.n, KIND[r.kind] + ' → ' + sName(r.next)])) : null);
      }
      el.put(
        h('div.viz-row', h('span', '执行后：'), segmented([{ value: true, label: '复用子树（课件）' }, { value: false, label: '丢弃旧树' }], P.reuse, v => { P.reuse = v; }, '子树复用'),
          h('span', '选动作按：'), segmented([{ value: 'q', label: '最大 Q（课件图）' }, { value: 'visits', label: '最多访问' }], P.by, v => { P.by = v; draw(); }, '根动作')),
        slider('每次决策的迭代次数', { min: 10, max: 1000, step: 10, value: P.iters, format: v => String(v), onInput: v => { P.iters = v; } }),
        slider('rollout horizon（最多步数）', { min: 1, max: 100, step: 1, value: P.horizon, format: v => String(v), onInput: v => { P.horizon = v; } }),
        slider('UCB 常数 c', { min: 0, max: 3, step: 0.01, value: P.c, format: v => fmt(v, 2), onInput: v => { P.c = v; } }),
        slider('随机种子', { min: 1, max: 50, step: 1, value: P.seed, format: v => String(v), onInput: v => { P.seed = v; reset(); } }),
        h('p.muted', '迭代次数、horizon、c 从下一次“运行 MCTS”开始生效，不改变已经算好的统计；“复用 / 丢弃”在下一次“执行动作”时生效。'),
        h('div.viz-row', button('运行 MCTS', runSearch, 'btn primary'), button('执行动作（会打滑）', act, 'btn'), button('自动跑到终止', auto, 'btn'), button('Reset', reset, 'btn ghost')),
        pic, info, logBox,
        h('p.muted', '模拟是随机的，具体数字不会和课件一样（课件也只是一次运行）。种子 7 恰好走出与课件相同的路线 Up → Up → Up → Right → Right → Right；可以换种子看其他结果，例如第一步就打滑。'));
      reset();
    }
  });

  /* ---------- c33: one iteration, phase by phase ---------- */
  function snap(g, node) {
    return { state: node.state, N: node.N, edges: g.actions.map(a => { const e = node.edges[a]; return { a, N: e.N, Q: e.Q, kids: [...e.kids.values()].map(k => ({ state: k.state, N: k.N, id: k.id })) }; }) };
  }
  function treeSVG(model, hl, c) {
    const S = svg, W = 680, out = S('svg', { viewBox: '0 0 ' + W + ' 236', class: 'chart', style: 'max-width:680px', role: 'img', 'aria-label': '搜索树前两层' });
    const rx = W / 2, ry = 26;
    out.appendChild(S('circle', { cx: rx, cy: ry, r: 20, style: 'fill:color-mix(in srgb, var(--c-blue) 22%, var(--surface));stroke:var(--c-blue);stroke-width:2' }));
    out.appendChild(S('text', { x: rx, y: ry + 4, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:700;fill:var(--text)', text: 's' + model.state }));
    out.appendChild(S('text', { x: rx + 28, y: ry + 4, style: 'font-size:11px;fill:var(--muted)', text: '根  N(s)=' + model.N }));
    model.edges.forEach((e, i) => {
      const ax = 85 + i * 170, ay = 98, on = hl && hl.a === e.a;
      out.appendChild(S('line', { x1: rx, y1: ry + 20, x2: ax, y2: ay - 22, style: 'stroke:' + (on ? 'var(--c-red)' : 'var(--border-strong)') + ';stroke-width:' + (on ? 3 : 1.2) }));
      out.appendChild(S('rect', { x: ax - 70, y: ay - 22, width: 140, height: 44, rx: 6, style: 'fill:var(--surface);stroke:' + (on ? 'var(--c-red)' : 'var(--border-strong)') + ';stroke-width:' + (on ? 2.5 : 1) }));
      const u = M.ucb(e.Q, e.N, Math.max(1, model.N), c);
      out.appendChild(S('text', { x: ax, y: ay - 6, 'text-anchor': 'middle', style: 'font-size:12px;font-weight:600;fill:var(--text)', text: AN[e.a] + '  N=' + e.N }));
      out.appendChild(S('text', { x: ax, y: ay + 11, 'text-anchor': 'middle', style: 'font-size:11px;fill:var(--muted)', text: e.N ? 'Q=' + q4(e.Q) + '  UCB=' + ucbStr(u) : '未试过：UCB = +∞' }));
      const n = e.kids.length;
      e.kids.forEach((k, j) => {
        const kx = ax + (j - (n - 1) / 2) * 46, ky = 186, kon = on && hl.kid === k.state, isNew = hl && hl.newId === k.id;
        out.appendChild(S('line', { x1: ax, y1: ay + 22, x2: kx, y2: ky - 17, style: 'stroke:' + (kon ? 'var(--c-red)' : 'var(--border)') + ';stroke-width:' + (kon ? 2.5 : 1) }));
        out.appendChild(S('circle', { cx: kx, cy: ky, r: 17, style: 'fill:' + (isNew ? 'color-mix(in srgb, var(--c-green) 30%, var(--surface))' : 'var(--surface)') + ';stroke:' + (isNew ? 'var(--c-green)' : kon ? 'var(--c-red)' : 'var(--border-strong)') + ';stroke-width:' + (isNew || kon ? 2.5 : 1) }));
        out.appendChild(S('text', { x: kx, y: ky + 4, 'text-anchor': 'middle', style: 'font-size:11px;fill:var(--text)', text: 's' + k.state }));
        out.appendChild(S('text', { x: kx, y: ky + 31, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--muted)', text: 'N=' + k.N }));
      });
    });
    return out;
  }
  RL.viz.register('mctsstep', {
    title: 'MCTS 单步解剖：一次迭代的四个阶段',
    mount(el) {
      const g = courseGrid(), P = { c: Math.SQRT2, horizon: 60, root: 1 };
      let tree, rng, trace, before, phase; // phase 0 = idle, 1..4 = selection .. backprop
      const gridBox = h('div'), chips = h('div.viz-row'), treeBox = h('div'), detail = h('div'), stats = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { P.root = st; reset(); } } });
      const NAMES = ['', '① Selection', '② Expansion', '③ Simulation', '④ Backpropagation'];
      // every iteration remembers the c and horizon it was run with, so stepping back replays exactly what was shown
      let params = [];
      const run1 = pr => M.iterate(g, tree, { c: pr.c, horizon: pr.horizon, rng });
      function reset() { tree = M.createTree(g, P.root); rng = rngOf(3); trace = null; before = null; phase = 0; params = []; draw(); }
      function next() {
        if (phase === 0 || phase === 4) { const pr = { c: P.c, horizon: P.horizon }; params.push(pr); before = snap(g, tree.root); trace = run1(pr); trace.c = pr.c; phase = 1; if (!trace.selection.length) phase = 2; }
        else phase++;
        draw();
      }
      const firstPhase = () => (trace && !trace.selection.length ? 2 : 1);
      // rebuild from an empty tree and replay the first k iterations; the last one is kept as the trace (shown at phase 4)
      function replay(k) {
        tree = M.createTree(g, P.root); rng = rngOf(3); trace = null; before = null; phase = 0;
        params = params.slice(0, k);
        if (k > 0) { for (let i = 0; i < k - 1; i++) run1(params[i]); before = snap(g, tree.root); trace = run1(params[k - 1]); trace.c = params[k - 1].c; phase = 4; }
      }
      // step back: inside an iteration go to the previous phase; at its first phase (or after a batch run), go to the end of the previous iteration
      function back() {
        if (trace && phase > firstPhase()) { phase--; draw(); return; }
        if (!tree.iterations) return;
        replay(trace ? tree.iterations - 1 : tree.iterations);
        draw();
      }
      function finish() { if (phase === 0 || phase === 4) next(); phase = 4; draw(); }
      function many(n) { for (let i = 0; i < n; i++) { const pr = { c: P.c, horizon: P.horizon }; params.push(pr); run1(pr); } trace = null; before = null; phase = 0; draw(); }
      function pathStates() {
        if (!trace) return [P.root];
        const xs = [tree.root.state];
        trace.selection.forEach(x => xs.push(x.next));
        if (trace.expansion && !trace.expansion.viaSample) xs.push(trace.expansion.next);
        return xs;
      }
      function draw() {
        const t = trace, tp = pathStates();
        const roll = t && phase >= 3 ? t.rollout.map(x => x.next) : [];
        const hl = {}; tp.forEach(st => { hl[st] = 'fill-blue'; });
        view.update({ agent: tree.root.state, trail: tp.concat(roll), highlight: hl, selected: tree.root.state });
        clear(chips).put([1, 2, 3, 4].map(k => h('span.pill' + (k === phase ? '.orange' : k < phase ? '.blue' : ''), NAMES[k])));
        const first = t ? (t.selection[0] ? { a: t.selection[0].a, kid: t.selection[0].next } : t.expansion ? { a: t.expansion.a, kid: t.expansion.next } : null) : null;
        const newId = t && t.expansion && phase >= 2 ? t.expansion.newNode : null;
        // phases 1-3 show the tree as it was before this iteration; from phase 2 on, a new node created directly under the root is added (N = 0)
        let model = phase === 4 || !before ? snap(g, tree.root) : before;
        const newAtRoot = t && t.expansion && t.expansion.depth === 0;
        if (phase >= 2 && phase < 4 && newAtRoot) {
          model = JSON.parse(JSON.stringify(model));
          const ed = model.edges.find(x => x.a === t.expansion.a);
          if (!ed.kids.some(k => k.id === newId)) ed.kids.push({ state: t.expansion.next, N: 0, id: newId });
        }
        clear(treeBox).put(treeSVG(model, first && phase >= 1 ? Object.assign({ newId }, first) : null, t && t.c != null ? t.c : P.c),
          h('p.muted', '只画了树的前两层：根 → 4 个动作（每个动作框写着 N(s,a)、Q(s,a) 和 UCB 分数）→ 每个动作已经采样到的后继状态。同一个动作可能有多个后继，因为动作会打滑。' +
            (phase && phase < 4 ? ' 这一次迭代还没回传，所以框里的 N、Q 是迭代前的数字' + (phase >= 2 && t.expansion ? (newAtRoot ? '；绿色圆圈是刚建的新节点（N = 0）' : '；新节点在第 ' + (t.expansion.depth + 1) + ' 层，图里没有画出来') : '') + '。' : '')));
        clear(detail);
        if (!t) detail.put(h('p.muted', '点“下一阶段”开始一次迭代。点格子可以换根状态（会重建空树）。'));
        else {
          if (phase >= 1) {
            if (!t.selection.length) detail.put(h('p.viz-step', NAMES[1] + '：根节点 ' + sName(tree.root.state) + ' 还有没试过的动作。规则是：一个节点只要还有没试过的动作，就先扩展其中一个（哪怕它已经有别的子节点），所以这次 selection 在根处就停下。'));
            else detail.put(h('p.viz-step', NAMES[1] + '：从根开始，每一层用 UCB 选动作，然后用 simulator 采样结果，沿着树往下走。'),
              t.selection.map((x, i) => h('div',
                h('p', '第 ' + (i + 1) + ' 层：在 ' + sName(x.state) + '（N(s) = ' + x.nodeN + '，四个动作都试过）'),
                table(['动作', 'Q(s,a)', 'N(s,a)', 'c·√(ln N(s) / N(s,a))', 'UCB'], g.actions.map(a => ({ cells: [AN[a], q4(x.scores[a].q), String(x.scores[a].n), x.scores[a].n ? fmt(x.scores[a].ucb - x.scores[a].q, 4) : '—', ucbStr(x.scores[a].ucb)], cls: a === x.a ? 'hl' : null }))),
                h('p.muted', '选 UCB 最大的 ' + AN[x.a] + '。simulator 返回：' + KIND[x.kind] + ' → ' + sName(x.next) + '，r = ' + x.reward + (x.newChild ? '。这个结果在树里还没有节点，所以这里转入 expansion。' : '。这个后继已经在树里，继续往下选。')))));
          }
          if (phase >= 2 && t.expansion) {
            const e = t.expansion;
            detail.put(h('p.viz-step', NAMES[2] + '：' + (e.viaSample ? '上一步采样到的后继 ' + sName(e.next) + ' 还不在树里，给它新建一个节点（绿色）。' :
              '在' + (e.depth ? '深度 ' + e.depth + ' 的 ' : '根节点 ') + sName(e.from) + ' 还没试过的动作有 ' + e.untried.map(a => AN[a]).join('、') + '（N(s,a) = 0，UCB 记作 +∞）。随机挑一个：' + AN[e.a] + '。simulator 返回 ' + KIND[e.kind] + ' → ' + sName(e.next) + '，r = ' + e.reward + '。为 ' + sName(e.next) + ' 新建子节点（绿色）。')));
          }
          if (phase >= 2 && !t.expansion && t.leafTerminal) detail.put(h('p.viz-step', NAMES[2] + '：沿途走到了终止状态 ' + sName(t.leaf) + '，没有可扩展的节点。'));
          if (phase >= 3) {
            const R = t.rollout;
            if (t.leafTerminal) detail.put(h('p.viz-step', NAMES[3] + '：新节点 ' + sName(t.leaf) + ' 是终止状态，不需要 rollout，它之后的回报按定义为 0：G = 0（进入它的奖励已经记在上面那条边上）。'));
            else {
              const show = R.length <= 10 ? R : R.slice(0, 6).concat([null]).concat(R.slice(-3));
              let disc = 1; const gk = R.map(() => { const d = disc; disc *= g.gamma; return d; });
              detail.put(h('p.viz-step', NAMES[3] + '：从新节点 ' + sName(t.leaf) + ' 开始，用随机 rollout policy 一直走，直到终止或走满 horizon = ' + P.horizon + ' 步。这一段不进树，只用来估计新节点的价值。'),
                table(['k', 's', '随机动作', 's′', 'r', 'γᵏ·r'], show.map(x => { if (!x) return ['⋯', '', '', '', '', '']; const k = R.indexOf(x); return [String(k), sName(x.s), AN[x.a], sName(x.next), String(x.reward), fmt(gk[k] * x.reward, 4)]; })),
                h('p', { html: 'rollout 走了 ' + R.length + ' 步' + (R.length && g.isTerminal(R[R.length - 1].next) ? '，在 ' + sName(R[R.length - 1].next) + ' 终止' : '，走满 horizon 仍未终止') + '。折扣回报 ' + texHTML('G=\\sum_k\\gamma^k r_k=' + tf(t.G, 4)) + '（只有进入终止格的那一步 r ≠ 0）。' }));
            }
          }
          if (phase >= 4) {
            detail.put(h('p.viz-step', NAMES[4] + '：从新节点往上回到根。每经过一条边 (s,a)，先把下面的回报乘 γ、再加上这条边的奖励：R ← r + γR，然后用增量平均更新 Q，N 加 1。'),
              table(['边（节点所在深度，状态，动作）', 'r', 'R = r + γ·R', 'Q ← Q + (R − Q)/(N + 1)', 'N'], t.backups.map(b => ['深度 ' + b.depth + '，' + sName(b.state) + '，' + AN[b.a], String(b.reward), fmt(b.R, 4),
                q4(b.qOld) + ' + (' + fmt(b.R, 4) + ' − ' + q4(b.qOld) + ')/' + (b.nOld + 1) + ' = ' + q4(b.qNew), b.nOld + ' → ' + b.nNew])),
              h('p.muted', '从表格第一行往下读：第一行是最靠近新节点的边，用 rollout 的 G = ' + fmt(t.G, 4) + ' 作起点；下一行用上一行算出的 R，乘 γ 再加上自己这条边的奖励，一直到最后一行（根上的边）。同一个状态可能在不同深度出现，它们是不同的节点，各自更新自己的 Q、N。这里只是计数和算平均，不求导，和神经网络的“反向传播”不是一回事。'));
          }
        }
        const e = tree.root.edges;
        const mid = phase >= 1 && phase < 4 && before;
        clear(stats).put(readout([['已完成迭代', mid ? (tree.iterations - 1) + '（当前这次还在进行，未计入）' : String(tree.iterations)],
          ['根 Σ N(s0,a)', mid ? String(before.edges.reduce((x, e) => x + e.N, 0)) : String(M.rootVisits(g, tree.root))], ['树中节点', String(M.countNodes(tree.root) - (mid && phase === 1 && t.expansion ? 1 : 0))],
          ['当前会执行（最大 Q）', (() => { if (mid) { const tried = before.edges.filter(e => e.N > 0); if (!tried.length) return '—（还没有统计）'; return AN[tried.reduce((x, e) => e.Q > x.Q ? e : x, tried[0]).a] + '（本次迭代回传前）'; }
            const a = M.bestAction(g, tree.root); return a ? AN[a] : '—（还没有统计）'; })()]]));
      }
      el.put(h('p.muted', 'c 和 horizon 从下一次迭代开始生效；已经做过的迭代、以及“上一阶段”重放时，都用当时的设定。'), slider('UCB 常数 c', { min: 0, max: 3, step: 0.01, value: P.c, format: v => fmt(v, 2), onInput: v => { P.c = v; draw(); } }),
        slider('rollout horizon', { min: 1, max: 100, step: 1, value: P.horizon, format: v => String(v), onInput: v => { P.horizon = v; } }),
        h('div.viz-row', button('← 上一阶段', back, 'btn'), button('下一阶段', next, 'btn primary'), button('完成本次迭代', finish, 'btn'), button('再跑 10 次', () => many(10), 'btn'), button('再跑 200 次', () => many(200), 'btn'), button('Reset 树', reset, 'btn ghost')),
        chips, gridBox, treeBox, detail, stats);
      reset();
    }
  });

  /* ---------- c34: UCB / UCT calculator on the slide roots ---------- */
  RL.viz.register('ucb', {
    title: 'UCB / UCT 计算器：用课件根节点的 Q 和 N',
    mount(el) {
      const ORDER = ['N', 'E', 'S', 'W'];
      const P = { preset: 0, c: Math.SQRT2, eps: 0.1, tau: 0.1 };
      let rows;
      const out = h('div');
      function load(i) { const d = SLIDE_DECISIONS[i]; rows = ORDER.map(a => ({ a, q: d.q[a][0], n: d.q[a][1] })); draw(); }
      function draw() {
        const ns = rows.reduce((t, r) => t + r.n, 0), d = SLIDE_DECISIONS[P.preset];
        const sc = rows.map(r => M.ucb(r.q, r.n, ns, P.c));
        const iU = sc.indexOf(Math.max(...sc)), qs = rows.map(r => r.q), iQ = qs.indexOf(Math.max(...qs));
        const eg = L.epsilonGreedyProbs(qs, P.eps), sm = L.softmax(qs.map(q => q / P.tau));
        clear(out).put(
          h('p', { html: '根状态 ' + sName(d.s) + '（课件 p.' + d.p + '）。' + texHTML('N(s)=\\sum_a N(s,a)=' + ns) + '，' + texHTML('\\ln N(s)=' + fmt(Math.log(ns), 4)) + '。' }),
          table(['动作', 'Q(s,a)', 'N(s,a)', 'bonus = c·√(ln N(s) / N(s,a))', 'UCB = Q + bonus', '', 'ε-greedy 概率', 'softmax 概率'],
            rows.map((r, i) => ({ cells: [AN[r.a], q4(r.q), String(r.n), r.n ? fmt(sc[i] - r.q, 4) : '+∞', ucbStr(sc[i]), button('+1 次访问', () => { r.n++; draw(); }, 'btn ghost'), fmt(eg[i], 3), fmt(sm[i], 3)], cls: i === iU ? 'hl' : null }))),
          h('p.viz-note', '高亮行 = UCB 最大，也就是下一次迭代在这个根上会选的动作：' + AN[rows[iU].a] + '。Q 最大的是 ' + AN[rows[iQ].a] + '。' +
            (iU !== iQ ? ' 两者不同：UCB 会去试一个 Q 不是最高、但访问次数较少的动作——这就是 exploration。' : '') +
            ' 四个 UCB 分数的差距只有 ' + fmt(Math.max(...sc) - Math.min(...sc), 4) + '：经过很多次迭代后，UCB 会把访问次数分配到各动作分数大致持平的位置。“+1 次访问”只增加 N（Q 不变），可以看到 bonus 立刻变小。'),
          h('p.muted', 'ε-greedy：贪心动作 1 − ε + ε/n，其他 ε/n（n = 4）。softmax：e^{Q/τ} / Σ e^{Q/τ}。这两种 tree policy 都是随机的，只看 Q，不看 N。'));
      }
      el.put(h('div.viz-row', h('span', '根节点：'), segmented(SLIDE_DECISIONS.map((d, i) => ({ value: i, label: '决策 ' + (i + 1) })), P.preset, v => { P.preset = v; load(v); }, '课件决策')),
        slider('c', { min: 0, max: 3, step: 0.01, value: P.c, format: v => fmt(v, 3), onInput: v => { P.c = v; draw(); } }),
        slider('ε（ε-greedy）', { min: 0, max: 1, step: 0.01, value: P.eps, format: v => fmt(v, 2), onInput: v => { P.eps = v; draw(); } }),
        slider('τ（softmax 温度）', { min: 0.01, max: 2, step: 0.01, value: P.tau, format: v => fmt(v, 2), onInput: v => { P.tau = v; draw(); } }),
        h('div.viz-row', button('恢复课件数字', () => load(P.preset), 'btn ghost')), out);
      load(0);
    }
  });

  /* ---------- c36: depth-limited Expectimax ---------- */
  RL.viz.register('expectimax', {
    title: 'Expectimax：decision node 取 max，chance node 取期望',
    mount(el) {
      const g = courseGrid(), P = { s: 10, d: 2, a: 'E' };
      const gridBox = h('div'), out = h('div'), cmp = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { P.s = st; draw(); clear(cmp); } } });
      function draw() {
        const r = M.expectimax(g, P.s, P.d), best = dp.argmaxActions(r.Q, 1e-12);
        let V = dp.zeros(g); for (let k = 0; k < P.d; k++) V = dp.valueIterationSweep(g, V).V;
        view.update({ selected: P.s, agent: P.s });
        const det = r.detail[P.a];
        clear(out).put(
          h('p.viz-step', 'Decision node：' + sName(P.s) + '，展开深度 d = ' + P.d + '（深度 = 还要做几次决策；深度用完的节点按 0 计）。每个动作下面是一个 chance node。'),
          table(['动作（chance node）', 'Q_d(s,a) = Σ P·(r + γ·V_{d−1}(s′))', ''], g.actions.map(a => ({ cells: [AN[a], fmt(r.Q[a], 4), button('展开', () => { P.a = a; draw(); }, 'btn ghost')], cls: best.includes(a) ? 'hl' : null }))),
          h('p', { html: texHTML('V_d(' + sName(P.s) + ')=\\max_a Q_d(' + sName(P.s) + ',a)=' + tf(r.V, 4)) + '（高亮行）。' }),
          h('p.viz-step', '展开 chance node（' + sName(P.s) + ', ' + AN[P.a] + '）：模型给出每个结果的概率，按概率加权平均。'),
          table(['结果', 'P(s′, r | s, a)', 's′', 'r', 'V_{d−1}(s′)', 'r + γ·V_{d−1}(s′)', 'P × (…)'], det.map(o => [o.from.map(k => KIND[k]).join(' + '), fmt(o.prob, 2), sName(o.next) + (g.isTerminal(o.next) ? '（终止，V = 0）' : ''), String(o.reward), fmt(o.v, 4), fmt(o.inner, 4), fmt(o.prob * o.inner, 4)])),
          h('p', { html: texHTML('Q_d(' + sName(P.s) + ',\\text{' + AN[P.a] + '})=' + det.map(o => fmt(o.prob, 2) + '\\times' + tf(o.inner, 4)).join('+') + '=' + tf(r.Q[P.a], 4)) }),
          h('p.viz-note', '对照：W6 value iteration 第 ' + P.d + ' 轮的 V_' + P.d + '(' + sName(P.s) + ') = ' + fmt(V[P.s], 4) + '。完全一样——深度 d 的 Expectimax 就是从这个状态出发做 d 次 Bellman optimality backup，只是只算从当前状态能到达的部分。完整展开这棵树有 ' + M.expectimaxLeaves(g, P.s, P.d) + ' 个叶子（深度每加 1，大约乘以 4 个动作 × 2–3 个结果）。'));
      }
      function compare() {
        const d = 30, ex = M.expectimax(g, P.s, d), t = M.createTree(g, P.s);
        M.search(g, t, 200, { rng: rngOf(11), horizon: 60 });
        clear(cmp).put(table(['动作', 'Expectimax（d = 30，≈ Q*）', 'MCTS 200 次迭代的 Q', 'MCTS 的 N'], g.actions.map(a => [AN[a], fmt(ex.Q[a], 4), t.root.edges[a].N ? q4(t.root.edges[a].Q) : '—', String(t.root.edges[a].N)])),
          h('p.muted', 'MCTS 的 Q 是样本平均：每个样本是“树里按 UCB 走 + 树外随机走”的一次回报，所以有噪声，而且比最优值低（随机 rollout 常常撞进 −1 或绕很久）。Expectimax 用模型精确算期望，没有采样噪声，代价是树按指数增长。两者通常选出同一个动作。（这里能一下算到深度 30，是因为本站的计算器把“同一个状态、同样剩余深度”的结果存起来重复使用；上面的叶子数说的是不共享重复部分、真的把树画出来时的大小。）'));
      }
      el.put(h('div.viz-row', h('span', '深度 d：'), segmented([1, 2, 3, 4, 5].map(v => ({ value: v, label: String(v) })), P.d, v => { P.d = v; draw(); }, '深度')),
        gridBox, out, h('div.viz-row', button('和 MCTS（200 次迭代）比较', compare, 'btn')), cmp,
        h('p.muted', '点格子换根状态。默认是 s10、深度 2：Right 的 0.872 就是 W6 第二次 backup 的结果。'));
      draw();
    }
  });

  /* ---------- c37: PUCT vs UCT on a three-action root ---------- */
  RL.viz.register('puct', {
    title: 'PUCT vs UCT：learned prior 决定先搜哪里',
    mount(el) {
      const TRUE = [0.1, 0.5, 0.2], NM = ['a₁', 'a₂', 'a₃'];
      const PRI = { right: [0.1, 0.8, 0.1], wrong: [0.8, 0.1, 0.1], flat: [1 / 3, 1 / 3, 1 / 3] };
      const P = { rule: 'puct', prior: 'wrong', c: 1.5, seed: 4 };
      let st;
      const out = h('div'), chart = h('div');
      function reset() { st = { N: [0, 0, 0], W: [0, 0, 0], hist: [], rng: rngOf(P.seed), last: null }; draw(); }
      function scores() {
        const pr = PRI[P.prior], n = st.N.reduce((a, b) => a + b, 0);
        return [0, 1, 2].map(i => { const q = st.N[i] ? st.W[i] / st.N[i] : 0; return P.rule === 'puct' ? M.puct(q, st.N[i], pr[i], n, P.c) : M.ucb(q, st.N[i], Math.max(1, n), P.c); });
      }
      // highest score; ties (e.g. all zero at the very start of PUCT) go to the larger prior
      function pick(sc) { const pr = PRI[P.prior]; let i = 0; sc.forEach((x, j) => { if (x > sc[i] + 1e-12 || (Math.abs(x - sc[i]) <= 1e-12 && P.rule === 'puct' && pr[j] > pr[i])) i = j; }); return i; }
      function sim() {
        const sc = scores(), i = pick(sc);
        const z = st.rng() < (1 + TRUE[i]) / 2 ? 1 : -1; // win/loss outcome with mean TRUE[i]
        st.N[i]++; st.W[i] += z; st.last = { i, z, sc }; st.hist.push(st.N.slice());
      }
      function run(n) { for (let k = 0; k < n; k++) sim(); draw(); }
      function draw() {
        const pr = PRI[P.prior], n = st.N.reduce((a, b) => a + b, 0), sc = scores();
        clear(out).put(
          table(['动作', '真实价值（隐藏）', 'prior P(s,b)', 'N(s,b)', 'Q(s,b)（样本平均）', (P.rule === 'puct' ? 'Q + c·P·√ΣN / (1 + N)' : 'Q + c·√(ln N(s) / N)') + '（下一次用的分数）', ''],
            [0, 1, 2].map(i => ({ cells: [NM[i], fmt(TRUE[i], 2), fmt(pr[i], 2), String(st.N[i]), st.N[i] ? fmt(st.W[i] / st.N[i], 3) : '—（按 0）', ucbStr(sc[i]),
              (st.last && st.last.i === i ? '上一次选了它' : '') + (pick(sc) === i ? (st.last && st.last.i === i ? '；' : '') + '下一次会选它' : '')], cls: st.last && st.last.i === i ? 'hl' : null }))),
          h('p.muted', '高亮行 = 上一次实际选中的动作。“真实价值”是这个动作每次模拟结果（赢 +1 / 输 −1）的期望：价值 v 对应赢的概率 (1 + v)/2，例如 0.5 = 75% 赢、25% 输；搜索看不到这一列，只能靠样本平均 Q 去估计。'),
          h('p.viz-note', '共 ' + n + ' 次模拟。' + (st.last ? '上一次选了 ' + NM[st.last.i] + '，结果 z = ' + (st.last.z > 0 ? '+1' : '−1') + '。' : '') +
            (P.rule === 'puct' ? ' PUCT：N = 0 时分数是 Q + c·P·√ΣN，不是 +∞，所以 prior 高的动作先被搜索，prior 很低的动作可能很久才被试。（第一次模拟前 ΣN = 0，三个分数都是 0；本演示在分数并列时选 prior 大的。）' : ' UCT：没有 prior，N = 0 的动作分数为 +∞，所以每个动作先各试一次。') +
            ' 最好的动作是 a₂（真实价值 0.5）。' + (P.rule === 'puct' && P.prior === 'wrong' ? ' prior 把 0.8 给了较差的 a₁：一开始搜索集中在 a₁；随着 a₁ 的 Q 被样本拉低、N 增大使它的 bonus 变小，搜索会转向 a₂——“search values can overturn the network’s initial preference”。但不保证很快：如果 a₂ 前一两次模拟碰巧得到 −1，它的 Q 被拉低、prior 又只有 0.1，可能要很久才被再次选中（换几个随机种子试试）。prior 越偏，纠正越慢。' : '')));
        const hs = st.hist;
        clear(chart).put(hs.length > 1 ? [RL.vizUtil.lineChart([0, 1, 2].map(i => ({ values: hs.map(v => v[i] / Math.max(1, v[0] + v[1] + v[2])), color: ['red', 'blue', 'orange'][i] })), { xlabel: '模拟次数', min: 0, max: 1 }),
          h('div.legend', [0, 1, 2].map(i => h('span', h('i', { style: { background: 'var(--c-' + ['red', 'blue', 'orange'][i] + ')' } }), NM[i] + ' 的访问比例 N/ΣN')))] : null);
      }
      el.put(h('div.viz-row', h('span', '选择规则：'), segmented([{ value: 'puct', label: 'PUCT（带 prior）' }, { value: 'uct', label: 'UCT（无 prior）' }], P.rule, v => { P.rule = v; reset(); }, '规则')),
        h('div.viz-row', h('span', '网络 prior：'), segmented([{ value: 'wrong', label: '偏向较差的 a₁' }, { value: 'right', label: '偏向最好的 a₂' }, { value: 'flat', label: '均匀' }], P.prior, v => { P.prior = v; reset(); }, 'prior')),
        slider('c / c_puct', { min: 0.1, max: 4, step: 0.1, value: P.c, format: v => fmt(v, 1), onInput: v => { P.c = v; draw(); } }),
        slider('随机种子', { min: 1, max: 30, step: 1, value: P.seed, format: v => String(v), onInput: v => { P.seed = v; reset(); } }),
        h('div.viz-row', button('模拟 1 次', () => run(1), 'btn primary'), button('模拟 10 次', () => run(10), 'btn'), button('模拟 200 次', () => run(200), 'btn'), button('Reset', reset, 'btn ghost')),
        out, chart, h('p.muted', '这是一个只有根节点的小例子：每次模拟选一个动作，得到 +1 或 −1（期望等于该动作的真实价值），再用增量平均更新 Q。真实的 AlphaGo Zero 在整棵树的每个节点都这样选。'));
      reset();
    }
  });

  /* ---------- c38: self-play targets ---------- */
  RL.viz.register('selfplay', {
    title: '自我对弈：根访问次数 → 搜索策略 π_t，再训练网络',
    mount(el) {
      const ORDER = ['N', 'E', 'S', 'W'];
      const P = { counts: [48, 266, 9, 15], tau: 1, z: 1, v: 0.6, p: [0.25, 0.25, 0.25, 0.25] };
      const out = h('div'), lossBox = h('div');
      function bars(vals, color) {
        return h('div', vals.map((x, i) => h('div.bar-row', h('span', AN[ORDER[i]]), h('div.bar', h('i', { style: { width: (100 * x).toFixed(1) + '%', background: 'var(--c-' + color + ')' } })), h('span.num', fmt(x, 3)))));
      }
      function draw() {
        if (P.counts.every(n => n === 0)) {
          clear(out).put(h('p.viz-note', '四个访问次数都是 0：还没有任何搜索结果，π_t 没有定义。请至少把一个动作的次数调成正数。'));
          clear(lossBox); return;
        }
        const pi = M.visitPolicy(P.counts, P.tau);
        clear(out).put(
          h('p', { html: texHTML('\\pi_t(a\\mid s_t)=\\frac{N(s_t,a)^{1/\\tau}}{\\sum_b N(s_t,b)^{1/\\tau}}') + '，τ = ' + fmt(P.tau, 2) + '。' }),
          table(['动作', 'N(s_t,a)', 'N^{1/τ}（相对最大值）', 'π_t(a|s_t)'], ORDER.map((a, i) => [AN[a], String(P.counts[i]), fmt(Math.pow(P.counts[i] / Math.max(...P.counts), 1 / P.tau), 4), fmt(pi[i], 4)])),
          bars(pi, 'blue'),
          h('p.viz-note', 'τ = 1：概率正比于访问次数。τ 变小：最常访问的动作概率趋近 1（接近“选访问最多的动作”）。τ 变大：分布变平，自我对弈时会尝试更多不同的走法。默认的访问次数借用课件决策 6 的根（Up 48、Right 266、Down 9、Left 15）。'));
        const loss = M.alphaZeroLoss(P.z, P.v, pi, P.p, 0, 0);
        clear(lossBox).put(
          h('p', { html: texHTML('L(\\theta)=\\underbrace{(z_t-v_\\theta(s_t))^2}_{\\text{value error}}-\\underbrace{\\sum_a\\pi_t(a\\mid s_t)\\log p_\\theta(a\\mid s_t)}_{\\text{match the search policy}}+\\beta\\lVert\\theta\\rVert^2', true) }),
          table(['动作', 'π_t（训练目标）', 'p_θ（网络当前输出）', '−π_t · log p_θ'], ORDER.map((a, i) => [AN[a], fmt(pi[i], 4), fmt(P.p[i], 4), fmt(pi[i] > 0 ? -pi[i] * Math.log(P.p[i]) : 0, 4)])),
          h('p', { html: 'value error = ' + texHTML('(' + P.z + '-' + tf(P.v, 2) + ')^2=' + tf(loss.value, 4)) + '；policy 项 = ' + fmt(loss.policy, 4) + '；β‖θ‖² 这里取 0。合计 ' + fmt(loss.total, 4) + '。' }),
          h('p.muted', '点“让 p_θ 等于 π_t”：policy 项降到最低（等于 π_t 的熵），说明这一项的作用是让网络 prior 去模仿搜索的结果。这个实验只演示训练目标和损失怎么算，不运行对弈或神经网络；按钮直接把 p_θ 设成理想值，真实训练是用很多次梯度更新让 p_θ 逐渐接近 π_t。'));
      }
      el.put(
        ORDER.map((a, i) => slider('N(s_t, ' + AN[a] + ')', { min: 0, max: 300, step: 1, value: P.counts[i], format: v => String(v), onInput: v => { P.counts[i] = v; draw(); } })),
        slider('温度 τ', { min: 0.05, max: 3, step: 0.05, value: P.tau, format: v => fmt(v, 2), onInput: v => { P.tau = v; draw(); } }),
        out,
        h('div.viz-row', h('span', '对局结果 z_t（站在 s_t 时该走棋一方的视角）：'), segmented([{ value: 1, label: '+1 赢' }, { value: 0, label: '0 和（AlphaZero）' }, { value: -1, label: '−1 输' }], P.z, v => { P.z = v; draw(); }, 'z')),
        slider('网络的 v_θ(s_t)', { min: -1, max: 1, step: 0.01, value: P.v, format: v => fmt(v, 2), onInput: v => { P.v = v; draw(); } }),
        h('div.viz-row', button('让 p_θ 等于 π_t', () => { if (P.counts.every(n => n === 0)) return; P.p = M.visitPolicy(P.counts, P.tau).map(x => Math.max(x, 1e-9)); draw(); }, 'btn'), button('p_θ 改回均匀', () => { P.p = [0.25, 0.25, 0.25, 0.25]; draw(); }, 'btn ghost')),
        lossBox);
      draw();
    }
  });
})(window);
