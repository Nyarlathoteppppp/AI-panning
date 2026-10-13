/* Weeks 1–5 visualisers: graph-search tracer (blind, heuristic, local), heuristic-property checker, STRIPS player
 * (real vs delete-relaxed semantics), h_max / h_add Bellman-Ford tables, relaxed-plan extraction, IW(k) tracer, 8-puzzle. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { table, readout } = RL.gridView;
  const P = RL.plan;
  const num = x => (x === Infinity ? '∞' : Number.isInteger(x) ? String(x) : fmt(x, 1));

  /* ---------------------------------------------------------------- preset graphs */
  const GRAPHS = {
    astar: { title: '课件 W3 的 A* 例子', g: P.ASTAR_EXAMPLE,
      pos: { I: [40, 170], a: [170, 95], b: [170, 250], c: [310, 45], d: [310, 120], e: [310, 195], f: [310, 275], j: [440, 225], k: [440, 320], m: [560, 330], G: [600, 160] } },
    tree: { title: '课件 W2 的 BFS / DFS 树（目标 M）', g: (() => {
      const names = 'ABCDEFGHIJKLMNO'.split(''), edges = [];
      for (let i = 0; i < 7; i++) { edges.push([names[i], names[2 * i + 1], 1]); edges.push([names[i], names[2 * i + 2], 1]); }
      const nodes = {}; names.forEach(n => { nodes[n] = { h: 0 }; });
      return { nodes, edges, start: 'A', goals: ['M'] };
    })(), pos: (() => { const p = {}, names = 'ABCDEFGHIJKLMNO'.split(''); names.forEach((n, i) => { const d = Math.floor(Math.log2(i + 1)), k = i + 1 - 2 ** d, w = 600 / 2 ** d; p[n] = [20 + w * (k + 0.5), 30 + d * 95]; }); return p; })() },
    trap: { title: '练习：GBFS 被 h 误导', g: {
      nodes: { S: { h: 5 }, A: { h: 2 }, B: { h: 3 }, D: { h: 1 }, G: { h: 0 } },
      edges: [['S', 'A', 1], ['S', 'B', 2], ['A', 'D', 5], ['D', 'G', 5], ['B', 'G', 3]], start: 'S', goals: ['G'] },
      pos: { S: [40, 170], A: [220, 70], B: [260, 280], D: [430, 70], G: [590, 190] } },
    exam: { title: '练习：带代价的图（并列按字母序）', g: {
      nodes: { S: { h: 6 }, A: { h: 4 }, B: { h: 5 }, C: { h: 2 }, D: { h: 2 }, E: { h: 1 }, G: { h: 0 } },
      edges: [['S', 'A', 2], ['S', 'B', 1], ['S', 'C', 4], ['A', 'D', 3], ['B', 'D', 1], ['B', 'E', 5], ['C', 'E', 2], ['D', 'G', 4], ['E', 'G', 3]], start: 'S', goals: ['G'] },
      pos: { S: [40, 180], A: [210, 50], B: [210, 180], C: [210, 310], D: [400, 100], E: [400, 270], G: [590, 180] } },
    local: { title: '练习：爬山法的局部最小值（无向图）', g: {
      nodes: { S: { h: 3 }, A: { h: 1 }, C: { h: 2 }, D: { h: 1 }, G: { h: 0 } },
      edges: [['S', 'A', 1], ['S', 'C', 1], ['C', 'D', 1], ['D', 'G', 1]], start: 'S', goals: ['G'], undirected: true },
      pos: { S: [60, 180], A: [200, 60], C: [230, 260], D: [420, 260], G: [590, 180] } }
  };
  const cloneGraph = g => JSON.parse(JSON.stringify(g));

  function graphSVG(gp, st) {
    const g = st.graph || gp.g, pos = gp.pos, S = svg;
    const out = S('svg', { viewBox: '0 0 640 370', class: 'chart', style: 'max-width:640px', role: 'img', 'aria-label': '搜索图' });
    out.appendChild(S('defs', S('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      S('path', { d: 'M0,0 L10,5 L0,10 z', style: 'fill:var(--muted)' }))));
    const onPath = new Set(); (st.path || []).forEach((x, i, a) => { if (i) onPath.add(a[i - 1] + '>' + x); });
    g.edges.forEach(([a, b, c]) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), r = 21;
      const sx = x1 + dx / L * r, sy = y1 + dy / L * r, ex = x2 - dx / L * r, ey = y2 - dy / L * r;
      const hot = onPath.has(a + '>' + b) || onPath.has(b + '>' + a);
      out.appendChild(S('line', { x1: sx, y1: sy, x2: ex, y2: ey, 'marker-end': g.undirected ? null : 'url(#arr)', style: 'stroke:' + (hot ? 'var(--c-green)' : 'var(--border-strong)') + ';stroke-width:' + (hot ? 4 : 1.5) }));
      out.appendChild(S('text', { x: (sx + ex) / 2 + 6, y: (sy + ey) / 2 - 5, style: 'font-size:12px;fill:var(--muted)', text: String(c == null ? 1 : c) }));
    });
    Object.keys(g.nodes).forEach(n => {
      const [x, y] = pos[n], closed = st.closed && st.closed.includes(n), open = st.open && st.open.some(o => o.s === n), cur = st.cur === n;
      const fill = closed ? 'color-mix(in srgb, var(--c-blue) 28%, var(--surface))' : open ? 'color-mix(in srgb, var(--c-orange) 18%, var(--surface))' : 'var(--surface)';
      out.appendChild(S('circle', { cx: x, cy: y, r: 21, style: 'fill:' + fill + ';stroke:' + (cur ? 'var(--c-red)' : g.goals.includes(n) ? 'var(--c-green)' : 'var(--border-strong)') + ';stroke-width:' + (cur ? 4 : g.goals.includes(n) ? 3 : 1.5) }));
      out.appendChild(S('text', { x, y: y + 1, 'text-anchor': 'middle', style: 'font-size:13px;font-weight:700;fill:var(--text)', text: n }));
      if (st.showH !== false) out.appendChild(S('text', { x, y: y + 14, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--muted)', text: 'h=' + num(g.nodes[n].h) }));
    });
    return out;
  }

  /* ---------------------------------------------------------------- search tracer */
  const ALGOS = [
    { v: 'bfs', l: 'BrFS' }, { v: 'dfs', l: 'DFS' }, { v: 'ucs', l: 'Uniform cost' }, { v: 'ids', l: 'IDS' },
    { v: 'gbfs', l: 'GBFS' }, { v: 'astar', l: 'A*' }, { v: 'wastar', l: '加权 A*' }, { v: 'hc', l: 'Hill-climbing' }, { v: 'ehc', l: 'Enforced HC' }];
  const PRIO = { bfs: '插入顺序（FIFO）', dfs: '最后插入的先出（LIFO）', ucs: 'g', gbfs: 'h', astar: 'f = g + h', wastar: 'g + W·h' };
  function buildSteps(gp, algo, opts) {
    const g = gp.g;
    if (algo === 'ids') {
      const r = P.iterativeDeepening(g, 6), steps = [];
      r.rounds.forEach(rd => rd.order.forEach((n, i) => steps.push({ cur: n, closed: rd.order.slice(0, i + 1), text: '深度上限 L = ' + rd.L + '：访问 ' + n + (g.goals.includes(n) ? '（目标！）' : ''), L: rd.L })));
      return { steps, result: r.found ? '找到：' + r.path.join(' → ') + '，代价 ' + r.cost : '在上限内没找到', path: r.path };
    }
    if (algo === 'hc') {
      const r = P.hillClimbing(g, 12), steps = [];
      r.path.forEach((n, i) => { const tr = r.trace[i]; steps.push({ cur: n, closed: r.path.slice(0, i + 1), text: tr && tr.options ? '在 ' + n + '：后继 ' + tr.options.map(o => o.s + '(h=' + num(o.h) + ')').join('、') + ' → 走到 h 最小的 ' + tr.to + (g.nodes[tr.to].h >= g.nodes[n].h ? '（h 没有变小：局部最小值附近）' : '') : (g.goals.includes(n) ? '到达目标 ' + n : '停在 ' + n) }); });
      return { steps, result: r.found ? '到达目标：' + r.path.join(' → ') + '，代价 ' + r.cost : '没有到达目标：' + r.reason, path: r.found ? r.path : null };
    }
    if (algo === 'ehc') {
      const r = P.enforcedHillClimbing(g), steps = [];
      r.phases.forEach(ph => ph.order.forEach((n, i) => steps.push({ cur: n, closed: ph.order.slice(0, i + 1), text: '从 ' + ph.from + '（h=' + num(ph.h0) + '）做 BrFS，找 h 严格更小的状态：访问 ' + n + '（h=' + num(g.nodes[n].h) + '）' + (n === ph.to ? ' ← 找到，跳过去' : '') })));
      return { steps, result: r.found ? '到达目标：' + r.path.join(' → ') + '，代价 ' + r.cost : '某次 BrFS 找不到更小的 h，失败', path: r.found ? r.path : null };
    }
    const r = P.bestFirst(g, algo, opts), steps = r.trace.map(t => ({
      cur: t.pop, closed: t.closed, open: t.open,
      text: t.skipped ? '弹出 ' + t.pop + '（g=' + num(t.g) + '），但它已在 closed 里：丢弃，不算一次展开' :
        t.goal ? '弹出 ' + t.pop + '（g=' + num(t.g) + '）：是目标，结束' :
          '展开 ' + t.pop + '（g=' + num(t.g) + (algo === 'bfs' || algo === 'dfs' ? '' : '，优先值 ' + num(t.f)) + '）' + (t.reopened ? '（以更小的 g 重新打开）' : '') + '，生成 ' + (t.generated.length ? t.generated.join('、') : '无'),
      skipped: t.skipped }));
    return { steps, result: r.found ? '找到：' + r.path.join(' → ') + '，代价 ' + num(r.cost) + '；展开顺序 ' + r.expanded.join(', ') : '没有找到解', path: r.path, expanded: r.expanded };
  }
  RL.viz.register('searchtrace', {
    title: '搜索算法逐步追踪：open / closed 列表与展开顺序',
    mount(el, props) {
      const S = { preset: (props && props.preset) || 'astar', algo: (props && props.algo) || 'astar', tie: 'fifo', w: 2, i: 0 };
      let run;
      const pic = h('div'), info = h('div'), lists = h('div');
      function rebuild() { run = buildSteps(GRAPHS[S.preset], S.algo, { tie: S.tie, w: S.w }); S.i = 0; draw(); }
      function draw() {
        const gp = GRAPHS[S.preset], st = run.steps[S.i] || {}, done = S.i >= run.steps.length - 1;
        clear(pic).put(graphSVG(gp, { cur: st.cur, closed: st.closed, open: st.open, path: done ? run.path : null, showH: !['bfs', 'dfs', 'ucs', 'ids'].includes(S.algo) }));
        clear(info).put(h('p.viz-step', '第 ' + (S.i + 1) + ' / ' + run.steps.length + ' 步：' + (st.text || '')), done ? h('p.viz-note', run.result) : null);
        clear(lists);
        if (st.open) {
          const prioName = PRIO[S.algo];
          const rows = st.open.map(o => [o.s, num(o.g), num(o.h), S.algo === 'bfs' || S.algo === 'dfs' ? '—' : num(o.p)]);
          lists.put(h('p', h('b', 'Open 列表'), '（排序依据：' + prioName + '；并列时：' + (S.tie === 'alpha' ? '按字母序' : '先进先出') + '）'),
            rows.length ? table(['节点', 'g', 'h', '优先值'], rows) : h('p.muted', '空'),
            h('p', h('b', 'Closed 列表（已展开）'), '：' + (st.closed || []).join(', ')));
        } else if (st.closed) lists.put(h('p', h('b', '已访问'), '：' + st.closed.join(', ')));
      }
      el.put(
        h('div.viz-note', { html: '<b>这个实验在做什么</b>：在一张图上逐步运行搜索算法。蓝色 = 已展开（closed），橙色 = 在 open 列表里，红圈 = 这一步处理的节点，绿圈 = 目标，最后的绿色粗线 = 找到的路径。按课件伪代码：节点<b>弹出</b>时才查重（已在 closed 的丢弃）、<b>展开</b>时才做目标测试。' }),
        h('div.viz-row', h('span', '图：'), segmented(Object.keys(GRAPHS).map(k => ({ value: k, label: GRAPHS[k].title })), S.preset, v => { S.preset = v; rebuild(); }, '图')),
        h('div.viz-row', h('span', '算法：'), segmented(ALGOS.map(a => ({ value: a.v, label: a.l })), S.algo, v => { S.algo = v; rebuild(); }, '算法')),
        h('div.viz-row', h('span', '优先值并列时：'), segmented([{ value: 'fifo', label: '先进先出' }, { value: 'alpha', label: '按字母序' }], S.tie, v => { S.tie = v; rebuild(); }, 'tie')),
        slider('加权 A* 的 W', { min: 0, max: 5, step: 0.5, value: S.w, format: v => fmt(v, 1), onInput: v => { S.w = v; if (S.algo === 'wastar') rebuild(); } }),
        h('div.viz-row', button('← 上一步', () => { S.i = Math.max(0, S.i - 1); draw(); }, 'btn'), button('下一步 →', () => { S.i = Math.min(run.steps.length - 1, S.i + 1); draw(); }, 'btn primary'),
          button('走到底', () => { S.i = run.steps.length - 1; draw(); }, 'btn'), button('重置', () => { S.i = 0; draw(); }, 'btn ghost')),
        pic, info, lists);
      rebuild();
    }
  });

  /* ---------------------------------------------------------------- heuristic properties */
  RL.viz.register('hprops', {
    title: '启发式性质检查：safe、goal-aware、admissible、consistent',
    mount(el) {
      const S = { preset: 'trap' }; let g;
      const pic = h('div'), editor = h('div'), out = h('div');
      function load() { g = cloneGraph(GRAPHS[S.preset].g); drawEditor(); draw(); }
      function drawEditor() {
        clear(editor).put(h('div.viz-row', Object.keys(g.nodes).map(n => h('label', { style: { marginRight: '10px' } }, 'h(' + n + ')=',
          h('input', { type: 'number', step: '0.5', min: '0', value: g.nodes[n].h === Infinity ? '' : g.nodes[n].h, placeholder: '∞', style: { width: '56px' },
            oninput: e => { const v = e.target.value.trim(); g.nodes[n].h = v === '' ? Infinity : Math.max(0, +v); draw(); } })))),
          h('p.muted', '留空表示 h = ∞。'));
      }
      function draw() {
        const r = P.heuristicProperties(g);
        clear(pic).put(graphSVG(Object.assign({}, GRAPHS[S.preset], { g }), { graph: g }));
        const mark = ok => (ok ? '✔ 满足' : '✘ 不满足');
        clear(out).put(
          table(['状态', 'h', 'h*（真实剩余代价）', 'h ≤ h*？'], Object.keys(g.nodes).map(n => ({ cells: [n, num(g.nodes[n].h), num(r.hStar[n]), g.nodes[n].h <= r.hStar[n] + 1e-12 ? '是' : '<b>否</b>'], cls: r.viol.admissible.includes(n) ? 'hl' : null }))),
          table(['性质', '定义', '结果', '违反的地方'], [
            ['safe', 'h(s) = ∞ ⇒ h*(s) = ∞', mark(r.safe), r.viol.safe.join(', ') || '—'],
            ['goal-aware', '目标状态 h = 0', mark(r.goalAware), r.viol.goalAware.join(', ') || '—'],
            ['admissible', 'h(s) ≤ h*(s)', mark(r.admissible), r.viol.admissible.join(', ') || '—'],
            ['consistent', 'h(s) ≤ c(a) + h(s′)，每条边', mark(r.consistent), r.viol.consistent.join(', ') || '—']]),
          h('p.viz-note', '关系：consistent + goal-aware ⇒ admissible；admissible ⇒ safe 且 goal-aware。反过来不成立：admissible 不一定 consistent（试试“GBFS 被 h 误导”这张图的 S→A 边）。'));
      }
      el.put(h('div.viz-note', { html: '<b>这个实验在做什么</b>：先用 Dijkstra 从目标倒着算出每个状态的真实剩余代价 h*，再逐条检查四个性质。改动下面任意一个 h 值，结论立刻更新。' }),
        h('div.viz-row', h('span', '图：'), segmented(['trap', 'exam', 'astar', 'local'].map(k => ({ value: k, label: GRAPHS[k].title })), S.preset, v => { S.preset = v; load(); }, '图')),
        pic, editor, out);
      load();
    }
  });

  /* ---------------------------------------------------------------- STRIPS player */
  const BLOCKS = (() => {
    const B = ['A', 'B', 'C'], facts = ['handempty'], acts = [];
    B.forEach(x => { facts.push('ontable(' + x + ')', 'clear(' + x + ')', 'holding(' + x + ')'); B.forEach(y => { if (x !== y) facts.push('on(' + x + ',' + y + ')'); }); });
    B.forEach(x => {
      acts.push({ name: 'pickup(' + x + ')', pre: ['clear(' + x + ')', 'ontable(' + x + ')', 'handempty'], add: ['holding(' + x + ')'], del: ['ontable(' + x + ')', 'clear(' + x + ')', 'handempty'], cost: 1 });
      acts.push({ name: 'putdown(' + x + ')', pre: ['holding(' + x + ')'], add: ['ontable(' + x + ')', 'clear(' + x + ')', 'handempty'], del: ['holding(' + x + ')'], cost: 1 });
      B.forEach(y => { if (x === y) return;
        acts.push({ name: 'stack(' + x + ',' + y + ')', pre: ['holding(' + x + ')', 'clear(' + y + ')'], add: ['on(' + x + ',' + y + ')', 'clear(' + x + ')', 'handempty'], del: ['holding(' + x + ')', 'clear(' + y + ')'], cost: 1 });
        acts.push({ name: 'unstack(' + x + ',' + y + ')', pre: ['on(' + x + ',' + y + ')', 'clear(' + x + ')', 'handempty'], add: ['holding(' + x + ')', 'clear(' + y + ')'], del: ['on(' + x + ',' + y + ')', 'clear(' + x + ')', 'handempty'], cost: 1 }); });
    });
    return { facts, actions: acts, init: ['on(C,A)', 'ontable(A)', 'ontable(B)', 'clear(C)', 'clear(B)', 'handempty'], goal: ['on(A,B)', 'on(B,C)'] };
  })();
  const PROBLEMS = {
    australia: { title: '“TSP” in Australia（W4–W5）', p: P.AUSTRALIA },
    logistics: { title: 'Logistics（W5）', p: P.logistics() },
    blocks: { title: 'Blocksworld 3 块（Sussman）', p: BLOCKS }
  };
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { PLAN_PROBLEMS: PROBLEMS, PLAN_GRAPHS: GRAPHS });
  RL.viz.register('stripsplay', {
    title: 'STRIPS 动作执行器：真实语义 vs 删除松弛',
    mount(el, props) {
      const S = { preset: (props && props.preset) || 'blocks', relaxed: !!(props && props.relaxed) };
      let state, plan, costSoFar;
      const out = h('div');
      function reset() { state = new Set(PROBLEMS[S.preset].p.init); plan = []; costSoFar = 0; draw(); }
      function apply(a) {
        const n = new Set(state);
        if (!S.relaxed) a.del.forEach(f => n.delete(f));
        a.add.forEach(f => n.add(f));
        state = n; plan.push(a.name); costSoFar += a.cost == null ? 1 : a.cost; draw();
      }
      function draw() {
        const pr = PROBLEMS[S.preset].p, goalOk = pr.goal.every(g => state.has(g));
        const appl = pr.actions.filter(a => a.pre.every(f => state.has(f)));
        const useful = a => a.add.some(f => !state.has(f)) || (!S.relaxed && a.del.some(f => state.has(f)));
        const hs = P.optimalCost(Object.assign({}, pr, { init: [...state] }), S.relaxed);
        clear(out).put(
          h('p', h('b', '当前状态 s'), '（' + state.size + ' 个事实为真）：'),
          h('div.viz-row', [...state].sort().map(f => h('span.pill' + (pr.goal.includes(f) ? '.blue' : ''), f))),
          h('p', h('b', '目标 G'), '：' + pr.goal.map(g => (state.has(g) ? '✔' : '✘') + ' ' + g).join('　')),
          goalOk ? h('p.viz-note', '目标全部满足：' + (S.relaxed ? '这是一个松弛计划（relaxed plan）' : '这是一个计划') + '，代价 ' + num(costSoFar) + '。') : null,
          h('p', h('b', '可执行的动作'), '（Pre(a) ⊆ s）：'),
          h('div.viz-row', appl.length ? appl.map(a => button(a.name + (a.cost && a.cost !== 1 ? '（' + num(a.cost) + '）' : ''), () => apply(a), 'btn' + (useful(a) ? '' : ' ghost'))) : h('span.muted', '没有')),
          h('p.muted', S.relaxed ? '删除松弛：s′ = s ∪ Add(a)，Del 被忽略，事实只增不减。灰色按钮 = 执行了也不会让任何新事实变真。' : '真实语义：s′ = (s \\ Del(a)) ∪ Add(a)。'),
          readout([['已执行', plan.length ? plan.join(' → ') : '—'], ['已花代价', num(costSoFar)],
            [S.relaxed ? '从当前状态出发的 h+（最优松弛计划代价）' : '从当前状态出发的 h*（最优计划代价）', num(hs.cost) + (hs.plan ? '：' + hs.plan.join(' → ') : '')]]));
      }
      el.put(h('div.viz-note', { html: '<b>这个实验在做什么</b>：点按钮执行 STRIPS 动作，看状态怎样变化。切到“删除松弛”后，执行动作只会让更多事实变真（比如卡车可以“同时在多个城市”），这样求出的最优代价就是 h+。' }),
        h('div.viz-row', h('span', '问题：'), segmented(Object.keys(PROBLEMS).map(k => ({ value: k, label: PROBLEMS[k].title })), S.preset, v => { S.preset = v; reset(); }, '问题')),
        h('div.viz-row', h('span', '语义：'), segmented([{ value: false, label: '真实 STRIPS' }, { value: true, label: '删除松弛（忽略 Del）' }], S.relaxed, v => { S.relaxed = v; reset(); }, '语义'),
          button('重置', reset, 'btn ghost')),
        out);
      reset();
    }
  });

  /* ---------------------------------------------------------------- h_max / h_add tables */
  RL.viz.register('hmaxadd', {
    title: 'h_max 与 h_add：Bellman-Ford 表逐轮填写',
    mount(el, props) {
      const S = { preset: (props && props.preset) || 'australia', mode: (props && props.mode) || 'max', goal: 'default', upto: 0, cell: null };
      const out = h('div');
      const problem = () => (S.preset === 'logistics' && S.goal === 'tD' ? P.logistics(['t(D)', 'p(D)']) : PROBLEMS[S.preset].p);
      function draw() {
        const pr = problem(), bf = P.bellmanFord(pr, null, S.mode), T = bf.tables, last = Math.min(S.upto, T.length - 1);
        const rows = T.slice(0, last + 1).map((row, i) => ({ cells: ['T' + i].concat(pr.facts.map(f => ({ html: (i && row[f] !== T[i - 1][f] ? '<b style="color:var(--c-red)">' : '') + num(row[f]) + (i && row[f] !== T[i - 1][f] ? '</b>' : '') }))) }));
        const conv = last === T.length - 1;
        const comb = S.mode === 'max' ? 'max' : 'sum';
        const hv = pr.goal.map(g => num(bf.values[g])).join(S.mode === 'max' ? ', ' : ' + ');
        const others = { hmax: P.bellmanFord(pr, null, 'max').h, hadd: P.bellmanFord(pr, null, 'add').h, hplus: P.optimalCost(pr, true).cost, hstar: P.optimalCost(pr, false).cost, hff: P.hFF(pr, S.mode).h };
        let cellBox = null;
        if (S.cell && conv) {
          const f = S.cell, ach = pr.actions.filter(a => a.add.includes(f));
          cellBox = h('div.viz-note', h('b', f + ' 的值是怎么来的'), table(['achiever a（Add 里有 ' + f + '）', 'c(a)', 'Pre(a) 的值', comb + '(Pre) ', 'c(a) + ' + comb + '(Pre)'],
            ach.map(a => { const pv = a.pre.map(p => bf.values[p]); const c = S.mode === 'max' ? (pv.length ? Math.max(...pv) : 0) : pv.reduce((t, v) => t + v, 0); return [a.name, num(a.cost == null ? 1 : a.cost), a.pre.map((p, i) => p + '=' + num(pv[i])).join('，') || '（无前提）', num(c), num((a.cost == null ? 1 : a.cost) + c)]; })),
            h('p.muted', pr.init.includes(f) ? f + ' 在初始状态里，值固定为 0。' : '取最后一列的最小值 = ' + num(bf.values[f]) + '。'));
        }
        clear(out).put(
          h('div', { style: { overflowX: 'auto' } }, table(['i'].concat(pr.facts.map(f => '<span style="cursor:pointer;text-decoration:underline dotted" data-f="' + f + '">' + f + '</span>')), rows)),
          conv ? h('p', { html: '表不再变化，收敛。' + texHTML('h^{\\text{' + S.mode + '}}(I)=\\text{' + comb + '}(' + hv + ')=' + num(bf.h)) + '。点表头的事实看它的值是怎么算出来的。' }) : h('p.muted', '红色 = 这一轮变化的格子。继续点“下一轮”。'),
          cellBox,
          conv ? table(['h_max', 'h+', 'h_FF（' + S.mode + ' 支持者）', 'h_add', 'h*'], [[num(others.hmax), num(others.hplus), num(others.hff), num(others.hadd), num(others.hstar)]]) : null,
          conv ? h('p.muted', '总有 h_max ≤ h+ ≤ h*；h_add 和 h_FF 都 ≥ h+，可能超过 h*（不 admissible）。') : null);
        out.querySelectorAll('[data-f]').forEach(x => x.addEventListener('click', () => { S.cell = x.dataset.f; S.upto = 99; draw(); }));
      }
      el.put(h('div.viz-note', { html: '<b>这个实验在做什么</b>：按课件 W5 的 Bellman-Ford 变体，一轮一轮填出每个事实的估计代价。T₀：初始状态里的事实为 0，其他为 ∞；之后每轮对每个事实取 min(旧值, 所有能加出它的动作 c(a) + Pre(a) 的代价)，Pre(a) 的代价用 <b>max</b>（h_max）或<b>求和</b>（h_add）合并。' }),
        h('div.viz-row', h('span', '问题：'), segmented([{ value: 'australia', label: 'Australia' }, { value: 'logistics', label: 'Logistics' }], S.preset, v => { S.preset = v; S.upto = 0; S.cell = null; draw(); }, '问题'),
          h('span', '目标（Logistics）：'), segmented([{ value: 'default', label: 't(A), p(D)' }, { value: 'tD', label: 't(D), p(D)' }], S.goal, v => { S.goal = v; S.upto = 0; S.cell = null; draw(); }, '目标')),
        h('div.viz-row', h('span', '合并方式：'), segmented([{ value: 'max', label: 'h_max（取最大）' }, { value: 'add', label: 'h_add（求和）' }], S.mode, v => { S.mode = v; S.upto = 0; S.cell = null; draw(); }, '模式'),
          button('下一轮', () => { S.upto++; draw(); }, 'btn primary'), button('直接填完', () => { S.upto = 99; draw(); }, 'btn'), button('重置', () => { S.upto = 0; S.cell = null; draw(); }, 'btn ghost')),
        out);
      draw();
    }
  });

  /* ---------------------------------------------------------------- relaxed plan extraction */
  RL.viz.register('rplan', {
    title: '松弛计划提取：从目标倒推最佳支持者',
    mount(el) {
      const S = { preset: 'logistics', goal: 'default', mode: 'add', upto: 0 };
      const out = h('div');
      const problem = () => (S.preset === 'logistics' && S.goal === 'tD' ? P.logistics(['t(D)', 'p(D)']) : PROBLEMS[S.preset].p);
      function draw() {
        const pr = problem(), r = P.hFF(pr, S.mode), steps = r.steps || [], k = Math.min(S.upto, steps.length);
        const byName = {}; pr.actions.forEach(a => { byName[a.name] = a; });
        const chosen = new Set(steps.slice(0, k).map(x => x.action));
        const helpful = [...chosen].filter(n => byName[n].pre.every(p => pr.init.includes(p)));
        clear(out).put(
          h('p', h('b', '第 1 步：用 h_' + S.mode + ' 算出最佳支持者 bs(p)'), '（对每个不在 s 里的事实，选 c(a) + h(Pre(a)) 最小的 achiever）'),
          h('div', { style: { overflowX: 'auto' } }, table(['事实 p'].concat(Object.keys(r.bs)), [['h_' + S.mode + '(p)'].concat(Object.keys(r.bs).map(p => num(r.bf.values[p]))), ['bs(p)'].concat(Object.keys(r.bs).map(p => r.bs[p]))])),
          h('p', h('b', '第 2 步：从目标倒推'), '：Open := G \\ s；每次取出一个子目标 g，把 bs(g) 放进 RPlan，再把 bs(g) 的前提中“不在 s、也没处理过”的加入 Open。'),
          table(['#', '取出的子目标 g', '加入 RPlan 的 bs(g)', '新加入 Open', '此时 Open'], steps.slice(0, k).map((x, i) => [String(i + 1), x.goal, x.action + (steps.slice(0, i).some(y => y.action === x.action) ? '（已在 RPlan 中）' : ''), x.newOpen.join('、') || '—', x.open.join('、') || '空'])),
          k >= steps.length ? h('p.viz-note', { html: 'RPlan = {' + r.plan.join(', ') + '}，' + texHTML('h^{FF}=\\sum_{a\\in RPlan}c(a)=' + num(r.h)) + '。对比 h_add = ' + num(P.bellmanFord(pr, null, 'add').h) + '、h+ = ' + num(P.optimalCost(pr, true).cost) + '、h* = ' + num(P.optimalCost(pr, false).cost) + '。RPlan 是集合：被几个子目标共用的动作只算一次，所以 h_FF 不会像 h_add 那样重复计数。Helpful actions（RPlan 里在 s 中就能执行的动作）：' + (helpful.join('、') || '无') + '。' }) : h('p.muted', '点“下一步”逐个处理 Open 里的子目标。'));
      }
      el.put(h('div.viz-note', { html: '<b>这个实验在做什么</b>：h_FF 分两步：先用 h_max 或 h_add 给每个事实选一个“最便宜的”达成动作（best supporter），再从目标出发倒推，把用到的动作收集成一个集合 RPlan，代价之和就是 h_FF。' }),
        h('div.viz-row', h('span', '问题：'), segmented([{ value: 'logistics', label: 'Logistics' }, { value: 'australia', label: 'Australia' }], S.preset, v => { S.preset = v; S.upto = 0; draw(); }, '问题'),
          h('span', '目标（Logistics）：'), segmented([{ value: 'default', label: 't(A), p(D)' }, { value: 'tD', label: 't(D), p(D)' }], S.goal, v => { S.goal = v; S.upto = 0; draw(); }, '目标')),
        h('div.viz-row', h('span', '支持者来自：'), segmented([{ value: 'add', label: 'h_add' }, { value: 'max', label: 'h_max' }], S.mode, v => { S.mode = v; S.upto = 0; draw(); }, 'bs'),
          button('下一步', () => { S.upto++; draw(); }, 'btn primary'), button('做完', () => { S.upto = 99; draw(); }, 'btn'), button('重置', () => { S.upto = 0; draw(); }, 'btn ghost')),
        out);
      draw();
    }
  });

  /* ---------------------------------------------------------------- IW(k) tracer */
  RL.viz.register('iwtrace', {
    title: 'IW(k)：按 novelty 剪枝的广度优先搜索',
    mount(el) {
      const S = { k: 1, rows: 3, cols: 3, blocked: false, upto: 0 };
      const out = h('div');
      function draw() {
        const sp = P.gridSpace(S.rows, S.cols, [0, 0], [S.rows - 1, S.cols - 1], S.blocked ? [[1, 1]] : []);
        const r = P.iw(sp, S.k), tr = r.trace, k = Math.min(S.upto, tr.length);
        const status = {}; status['(0,0)'] = 'start';
        tr.slice(0, k).forEach(t => { if (!t.pruned) status[t.to] = 'kept'; else if (!status[t.to]) status[t.to] = 'pruned'; });
        const C = 70, S2 = svg, pic = S2('svg', { viewBox: '0 0 ' + (S.cols * C + 10) + ' ' + (S.rows * C + 10), class: 'chart', style: 'max-width:' + (S.cols * C + 10) + 'px' });
        for (let rr = 0; rr < S.rows; rr++) for (let cc = 0; cc < S.cols; cc++) {
          const id = '(' + rr + ',' + cc + ')', stt = status[id], wall = S.blocked && rr === 1 && cc === 1, goal = rr === S.rows - 1 && cc === S.cols - 1;
          const fill = wall ? 'var(--muted)' : stt === 'kept' || stt === 'start' ? 'color-mix(in srgb, var(--c-blue) 28%, var(--surface))' : stt === 'pruned' ? 'color-mix(in srgb, var(--c-red) 22%, var(--surface))' : 'var(--surface)';
          pic.appendChild(S2('rect', { x: 5 + cc * C, y: 5 + rr * C, width: C, height: C, style: 'fill:' + fill + ';stroke:' + (goal ? 'var(--c-green)' : 'var(--border-strong)') + ';stroke-width:' + (goal ? 3 : 1) }));
          pic.appendChild(S2('text', { x: 5 + cc * C + C / 2, y: 5 + rr * C + C / 2 + 4, 'text-anchor': 'middle', style: 'font-size:12px;fill:var(--text)', text: wall ? '墙' : id }));
        }
        clear(out).put(pic,
          h('p.muted', '状态只有两个原子：row(r) 和 col(c)。蓝 = 保留进队列，红 = 被剪掉（novelty > k），绿框 = 目标 (' + (S.rows - 1) + ',' + (S.cols - 1) + ')。'),
          table(['#', '从', '动作', '生成', 'novelty', '结果'], tr.slice(0, k).map((t, i) => [String(i + 1), t.from, t.action, t.to, t.duplicate ? '—' : String(t.novelty), t.duplicate ? '重复状态，跳过' : t.pruned ? '<b>剪掉</b>（novelty > ' + S.k + '）' : '保留'])),
          k >= tr.length ? h('p.viz-note', r.found ? 'IW(' + S.k + ') 找到目标：' + r.path.join(' ') + '（' + r.path.length + ' 步）。' : 'IW(' + S.k + ') 没有找到目标：所有能到目标的状态都被剪掉了。' + (S.k === 1 ? '比如 (1,1)：它的 row1 和 col1 都在之前单独出现过，没有任何“第一次为真”的单个原子，novelty = 2。换成 IW(2)，每个 (row, col) 组合第一次出现时都保留，相当于普通 BFS。' : '')) : null);
      }
      el.put(h('div.viz-note', { html: '<b>这个实验在做什么</b>：IW(k) 是广度优先搜索，但生成一个状态时先算它的 novelty：这个状态里第一次在搜索中同时为真的最小原子组合有多大。大于 k 就直接丢掉。所以 IW(1) 只保留“带来某个全新原子”的状态。' }),
        h('div.viz-row', h('span', 'k：'), segmented([{ value: 1, label: 'IW(1)' }, { value: 2, label: 'IW(2)' }], S.k, v => { S.k = v; S.upto = 0; draw(); }, 'k'),
          h('span', '地图：'), segmented([{ value: false, label: '3×3 空地' }, { value: true, label: '3×3，中间是墙' }], S.blocked, v => { S.blocked = v; S.upto = 0; draw(); }, '地图')),
        h('div.viz-row', button('下一个生成的状态', () => { S.upto++; draw(); }, 'btn primary'), button('做完', () => { S.upto = 999; draw(); }, 'btn'), button('重置', () => { S.upto = 0; draw(); }, 'btn ghost')),
        out);
      draw();
    }
  });

  /* ---------------------------------------------------------------- 8-puzzle relaxations */
  RL.viz.register('puzzle8', {
    title: '8-puzzle：去掉不同的前提，得到不同的启发式',
    mount(el) {
      const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];
      let st = [2, 0, 3, 1, 5, 6, 4, 7, 8];
      const out = h('div');
      const misplaced = s => s.filter((v, i) => v && v !== GOAL[i]).length;
      const manhattan = s => s.reduce((t, v, i) => (v ? t + Math.abs(Math.floor(i / 3) - Math.floor((v - 1) / 3)) + Math.abs((i % 3) - ((v - 1) % 3)) : t), 0);
      function hStar(s) {
        const goalK = GOAL.join(''), seen = new Map([[s.join(''), 0]]); let frontier = [s];
        for (let d = 0; d < 40 && frontier.length; d++) {
          const next = [];
          for (const x of frontier) {
            if (x.join('') === goalK) return d;
            const z = x.indexOf(0), r = Math.floor(z / 3), c = z % 3;
            [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { const R = r + dr, C = c + dc; if (R < 0 || R > 2 || C < 0 || C > 2) return; const y = x.slice(); y[z] = y[R * 3 + C]; y[R * 3 + C] = 0; const k = y.join(''); if (!seen.has(k)) { seen.set(k, d + 1); next.push(y); } });
          }
          frontier = next;
        }
        return Infinity;
      }
      function move(i) { const z = st.indexOf(0); if (Math.abs(Math.floor(i / 3) - Math.floor(z / 3)) + Math.abs(i % 3 - z % 3) !== 1) return; st = st.slice(); st[z] = st[i]; st[i] = 0; draw(); }
      function shuffle() { for (let k = 0; k < 30; k++) { const z = st.indexOf(0), opts = []; for (let i = 0; i < 9; i++) if (Math.abs(Math.floor(i / 3) - Math.floor(z / 3)) + Math.abs(i % 3 - z % 3) === 1) opts.push(i); const i = opts[Math.floor(Math.random() * opts.length)]; st[z] = st[i]; st[i] = 0; } draw(); }
      function draw() {
        const board = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: '4px', margin: '8px 0' } },
          st.map((v, i) => h('button.btn' + (v ? '' : '.ghost'), { type: 'button', style: { height: '56px', fontSize: '20px' }, onclick: () => move(i) }, v ? String(v) : '')));
        const md = st.map((v, i) => (v ? Math.abs(Math.floor(i / 3) - Math.floor((v - 1) / 3)) + Math.abs((i % 3) - ((v - 1) % 3)) : null));
        clear(out).put(board, h('p.muted', '点空格旁边的数字移动它；目标是 1 2 3 / 4 5 6 / 7 8 空。'),
          table(['启发式', '对应的松弛（动作规则放宽成）', '去掉了哪个前提', '值'], [
            ['misplaced tiles（错位数）', '任何格子可以直接移到任何格子', '“相邻”和“目标格为空”都去掉', String(misplaced(st))],
            ['Manhattan distance', '可以移到相邻格子，不管它空不空', '只去掉“目标格为空”', String(manhattan(st)) + '（各数字：' + st.map((v, i) => (v ? v + ':' + md[i] : null)).filter(Boolean).join(' ') + '）'],
            ['h*（真实最少步数）', '原规则：相邻且为空', '—', num(hStar(st))]]),
          h('p.viz-note', '两个松弛都允许原问题的每一步，所以松弛问题的最优解不会更长：misplaced ≤ Manhattan ≤ h*。Manhattan 放宽得更少，所以更接近 h*（更 informed）。'));
      }
      el.put(h('div.viz-note', { html: '<b>这个实验在做什么</b>：8-puzzle 的移动规则是“数字可以从 A 移到 B，如果 A、B 相邻且 B 是空格”。去掉不同的前提，松弛问题就变得容易算，它的最优解就是一个 admissible 启发式。' }),
        h('div.viz-row', button('打乱 30 步', shuffle, 'btn'), button('恢复示例状态', () => { st = [2, 0, 3, 1, 5, 6, 4, 7, 8]; draw(); }, 'btn ghost')), out);
      draw();
    }
  });
})(window);
