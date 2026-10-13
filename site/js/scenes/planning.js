/* 3Blue1Brown-style step animations for classical planning (Weeks 1–5). See js/ui/scene.js for the frame format.
 * Scenes:
 *   'astar-queue'       - W3 A* priority queue: pop / expand / re-sort, why it turns back, why the result is optimal (a06)
 *   'iw-novelty'        - W2 IW(1) novelty pruning on a 3×3 grid, contrasted with IW(2) (a04)
 *   'delete-relax'      - W5 real STRIPS vs delete relaxation on the Australia tour (a09)
 *   'hadd-propagation'  - W5 Bellman-Ford tables for h_max / h_add on Logistics (a10)
 *   'hill-landscape'    - W3 hill-climbing stuck in a local minimum, enforced hill-climbing escaping it (a07)
 *   'hff-extract'       - W5 relaxed plan extraction with best supporters: h_FF counts shared actions once (a11)
 *
 * Every number shown is computed at build time from RL.plan (js/core/planning.js).
 */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};
  const { PAL, SYM, util } = RL.scene;
  const R = String.raw;

  /* ------------------------------------------------------------------ shared helpers */
  const sig = x => 1 / (1 + Math.exp(-x));
  /** The engine's easing (Manim's smooth); fn callbacks receive smooth(p) of the linear progress p. */
  const smooth = t => (sig(10 * (t - 0.5)) - sig(-5)) / (sig(5) - sig(-5));
  /** Inverse of smooth: lets an fn callback recover linear time, so a multi-leg motion can ease every leg on its own. */
  const unsmooth = q => { let lo = 0, hi = 1; for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (smooth(m) < q) lo = m; else hi = m; } return (lo + hi) / 2; };
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const numStr = x => (x === Infinity ? '∞' : Number.isInteger(x) ? String(x) : String(+x.toFixed(2)));
  /** Split eased progress q into n equal legs: returns [leg index, eased progress inside that leg]. */
  /** Two centred formula lines (keeps the formula strip narrow enough for phones). */
  const two = (a, b) => String.raw`\begin{gathered}` + a + String.raw`\\ ` + b + String.raw`\end{gathered}`;
  const legs = n => q => { const u = unsmooth(q) * n, k = Math.min(n - 1, Math.floor(u)); return [k, smooth(Math.min(1, u - k))]; };

  /* ==========================================================================
   * 1. astar-queue (a06: GBFS, A* 与加权 A*)
   * ========================================================================== */
  RL.scene.register('astar-queue', {
    title: 'A* 怎样用优先队列搜索',
    intro: '课件 W3 的 A* 例子：实线代价 1，虚线是课件里“到目标还剩多少”的代价。左边每个节点下的条 = $g$（蓝，已经花的）+ $h$（金，估计还要花的）；右边是 Open 优先队列，按 $f=g+h$ 从小到大排，每次弹出队首展开。',
    w: 720,
    h: 350,
    colors: { f: SYM.f, g: SYM.g, h: SYM.h, open: SYM.open, closed: SYM.closed },
    build(st) {
      const P = RL.plan, graph = P.ASTAR_EXAMPLE, nodes = graph.nodes, goal = graph.goals[0];
      const res = P.bestFirst(graph, 'astar'), trace = res.trace;
      const gbfs = P.bestFirst(graph, 'gbfs');
      const props = P.heuristicProperties(graph);
      // g of every generated node, read from the Open snapshots of the trace (each node is generated once here)
      const gOf = { [graph.start]: 0 };
      trace.forEach(t => t.open.forEach(o => { if (gOf[o.s] == null) gOf[o.s] = o.g; }));
      const hOf = id => nodes[id].h, fOf = id => gOf[id] + hOf(id);
      // Open in pop order: smallest f first, ties by insertion order (the snapshot keeps insertion order)
      const queue = open => open.map((o, i) => ({ s: o.s, p: o.p, i })).sort((a, b) => a.p - b.p || a.i - b.i).map(o => o.s);
      const nm = id => (id === 'f' ? '节点 $f$' : '$' + id + '$'); // node f vs the function f
      const sum = id => '$' + gOf[id] + '+' + hOf(id) + '=' + fOf(id) + '$';

      const pos0 = (RL.vizUtil && RL.vizUtil.PLAN_GRAPHS && RL.vizUtil.PLAN_GRAPHS.astar && RL.vizUtil.PLAN_GRAPHS.astar.pos) || {
        I: [40, 170], a: [170, 95], b: [170, 250], c: [310, 45], d: [310, 120],
        e: [310, 195], f: [310, 275], j: [440, 225], k: [440, 320], m: [560, 330], G: [600, 160]
      };
      const mapX = x => 30 + (x - 40) / 560 * 360, mapY = y => 42 + (y - 45) / 285 * 258;
      const XY = id => [mapX(pos0[id][0]), mapY(pos0[id][1])];

      st.add('div_line', 'line', { x1: 420, y1: 18, x2: 420, y2: 336, stroke: PAL.line, 'stroke-width': 1, 'stroke-dasharray': '4 4' });
      st.text('open_title', 570, 26, 'Open 优先队列（按 f 从小到大）', { size: 13, weight: 700 });

      // edges with their costs; the solution path gets a green overlay
      const onPath = new Set(res.path.slice(1).map((v, i) => res.path[i] + '>' + v));
      graph.edges.forEach(([u, v, c]) => {
        const [x1, y1] = XY(u), [x2, y2] = XY(v);
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, r = 15;
        const sx = x1 + dx / L * r, sy = y1 + dy / L * r, ex = x2 - dx / L * r, ey = y2 - dy / L * r;
        const dashed = v === goal && c > 1; // the slide's dashed "remaining cost" lines
        st.add('edge_' + u + '_' + v, 'path', {
          d: util.arrow(sx, sy, ex, ey, dashed ? 5 : 6), fill: 'none',
          stroke: dashed ? '#3a404c' : PAL.line, 'stroke-width': dashed ? 1.2 : 1.6, 'stroke-dasharray': dashed ? '3 3' : 'none'
        });
        const nx = -dy / L, ny = dx / L, side = ny > 0 ? -1 : 1; // label on the upper side of the edge
        st.text('cost_' + u + '_' + v, (sx + ex) / 2 + nx * 10 * side, (sy + ey) / 2 + ny * 10 * side, String(c),
          { size: 12, weight: 600, color: dashed ? PAL.dim : '#b4b9c2' });
        if (onPath.has(u + '>' + v)) st.add('path_' + u + '_' + v, 'path', { d: util.arrow(sx, sy, ex, ey, 7), stroke: PAL.green, 'stroke-width': 3.5, fill: 'none', op: 0 });
      });

      // nodes, each with a g + h bar underneath (shown once the node is generated)
      Object.keys(nodes).forEach(id => {
        const [cx, cy] = XY(id), isG = id === goal;
        st.group('nodegrp_' + id, { tx: cx, ty: cy });
        st.add('node_' + id, 'circle', { cx: 0, cy: 0, r: 14, fill: PAL.panel, stroke: isG ? PAL.green : PAL.line, 'stroke-width': isG ? 2.5 : 1.8 }, 'nodegrp_' + id);
        st.text('nlbl_' + id, 0, 1, id, { size: 13, weight: 700, color: isG ? PAL.green : PAL.text, parent: 'nodegrp_' + id });
        if (gOf[id] == null) return;
        st.group('nbar_' + id, { tx: cx - 18, ty: cy + 17, op: 0 });
        st.add('nb_g_' + id, 'rect', { x: 0, y: 0, width: gOf[id] * 4, height: 4, rx: 1, fill: SYM.g }, 'nbar_' + id);
        st.add('nb_h_' + id, 'rect', { x: gOf[id] * 4, y: 0, width: hOf(id) * 4, height: 4, rx: 1, fill: SYM.h }, 'nbar_' + id);
        st.text('nb_t_' + id, 18, 13, gOf[id] + '+' + hOf(id) + '=' + fOf(id), { size: 11, color: '#b4b9c2', parent: 'nbar_' + id });
      });

      // Open cards: they start on their node in the graph and fly into the queue when generated
      const QX = 435, U = 11, slotY = i => 54 + i * 45;
      const home = id => [XY(id)[0] - 16, XY(id)[1] - 4];
      Object.keys(gOf).forEach(id => {
        const [hx, hy] = home(id);
        st.group('open_' + id, { tx: hx, ty: hy, op: 0 });
        st.add('op_bg_' + id, 'rect', { x: 0, y: -13, width: 272, height: 35, rx: 6, fill: PAL.panel, stroke: PAL.grid, 'stroke-width': 1.2 }, 'open_' + id);
        st.add('op_c_' + id, 'circle', { cx: 16, cy: 4, r: 11, fill: SYM.open }, 'open_' + id);
        st.text('op_t_' + id, 16, 5, id, { size: 12, weight: 700, color: PAL.bg, parent: 'open_' + id });
        st.add('op_g_' + id, 'rect', { x: 34, y: -4, width: gOf[id] * U, height: 16, rx: 2, fill: SYM.g }, 'open_' + id);
        st.add('op_h_' + id, 'rect', { x: 34 + gOf[id] * U, y: -4, width: hOf(id) * U, height: 16, rx: 2, fill: SYM.h }, 'open_' + id);
        st.text('op_f_' + id, 34 + fOf(id) * U + 8, 5, 'f=' + fOf(id) + '  (' + gOf[id] + '+' + hOf(id) + ')', { size: 12, weight: 600, color: SYM.f, anchor: 'start', parent: 'open_' + id });
      });

      // the f(G) line for the optimality argument: every bar left in Open ends to its right
      const last = trace[trace.length - 1], restQ = queue(last.open), fG = last.f;
      const minRest = Math.min(...last.open.map(o => o.p));
      const lineX = QX + 34 + fG * U;
      st.add('fline', 'line', { x1: lineX, y1: slotY(0) - 18, x2: lineX, y2: slotY(restQ.length - 1) + 26, stroke: PAL.green, 'stroke-width': 2, 'stroke-dasharray': '5 4', op: 0 });
      st.text('fline_lbl', lineX, slotY(restQ.length - 1) + 40, 'f(' + goal + ') = ' + fG, { size: 13, weight: 700, color: PAL.green, op: 0 });

      const frames = [];
      frames.push({
        set: { ['open_' + graph.start + '.op']: 1, ['open_' + graph.start + '.tx']: QX, ['open_' + graph.start + '.ty']: slotY(0), ['node_' + graph.start + '.stroke']: SYM.open, ['nbar_' + graph.start + '.op']: 1 },
        cap: 'A\\* 维护一个按 $f=g+h$ 从小到大排的 **Open 优先队列**。开始时队列里只有起点 $' + graph.start + '$：已花 $g=0$，估计还要 $h=' + hOf(graph.start) + '$，所以 $f=' + fOf(graph.start) + '$。',
        tex: R`\htmlClass{fx-f}{f(s)} = \htmlClass{fx-g}{g(s)} + \htmlClass{fx-h}{h(s)}`,
        hl: ['f']
      });

      // one frame per trace step: pop the head, expand it, re-sort the queue
      trace.forEach((t, k) => {
        const q = queue(t.open), gen = t.generated || [], head = q[0], set = {}, timing = {};
        const [px, py] = home(t.pop);
        Object.assign(set, {
          ['open_' + t.pop + '.op']: 0, ['open_' + t.pop + '.tx']: px, ['open_' + t.pop + '.ty']: py,
          ['node_' + t.pop + '.fill']: t.goal ? '#1e3823' : '#1a2736', ['node_' + t.pop + '.stroke']: t.goal ? PAL.green : SYM.closed
        });
        timing['open_' + t.pop] = [0, 0.4]; timing['node_' + t.pop] = [0.3, 0.55];
        q.forEach((id, i) => {
          set['open_' + id + '.ty'] = slotY(i);
          const j = gen.indexOf(id);
          if (j >= 0) {
            Object.assign(set, { ['open_' + id + '.op']: 1, ['open_' + id + '.tx']: QX, ['node_' + id + '.stroke']: id === goal ? PAL.green : SYM.open, ['nbar_' + id + '.op']: 1 });
            timing['open_' + id] = [0.4 + 0.1 * j, 0.9 + 0.1 * j]; timing['node_' + id] = [0.45 + 0.1 * j, 0.9 + 0.1 * j]; timing['nbar_' + id] = [0.45 + 0.1 * j, 0.9 + 0.1 * j];
          } else timing['open_' + id + '.ty'] = [0.25, 0.75];
        });
        let cap;
        if (t.goal) {
          cap = '弹出 ' + nm(t.pop) + '（$f=' + t.f + '$）：**目标测试成功**，搜索停止。展开顺序 $' + res.expanded.join(R`\to `) + '$，找到的路径代价 $g(' + goal + ')=' + res.cost + '$。';
        } else {
          cap = (k === 0 ? '弹出队首 ' : '弹出 ') + nm(t.pop) + '（$f=' + t.f + '$）' + (k === 0 ? '，它变蓝 = 进入 Closed；' : '并') + '展开，生成 ' +
            gen.map(id => nm(id) + '（' + sum(id) + '）').join('和') + '。';
          if (gen.includes(head)) cap += '**' + nm(head) + ' 的 $f$ 值 ' + fOf(head) + ' 最小，直接排到队首**。';
          else cap += '新节点的 $f$ 都比较大，排到后面——**' + nm(head) + '（$f=' + fOf(head) + '$）升到队首**，A\\* 暂时放下了 ' + nm(t.pop) + ' 这一支。';
          if (head === goal) cap += '但**还没结束**：A\\* 要等目标**出队**时才做目标测试。';
        }
        frames.push({
          set, timing, dur: 1100, cap,
          pulse: t.goal ? ['node_' + t.pop] : ['node_' + head, 'open_' + head],
          hl: t.goal ? ['closed'] : k === 0 ? ['open'] : ['f']
        });
      });

      // why did it turn back? a's children have large h, not because of g
      const detour = res.expanded.filter(id => !res.path.includes(id))[0];
      const detourStep = trace.find(t => t.pop === detour), kids = detourStep.generated;
      const back = res.expanded[res.expanded.indexOf(detour) + 1];
      const sameAsGbfs = gbfs.expanded.join() === res.expanded.join();
      const kidTex = kids.map(id => 'f(' + id + ')=' + gOf[id] + R`+\htmlClass{fx-h}{` + hOf(id) + '}=' + fOf(id)).join(R`,\ `);
      frames.push({
        set: util.merge(...kids.map(id => ({ ['node_' + id + '.stroke']: PAL.red, ['op_bg_' + id + '.stroke']: PAL.red })),
          { ['node_' + back + '.stroke']: PAL.green }),
        pulse: kids.map(id => 'nb_h_' + id).concat(['node_' + back]),
        dur: 900,
        cap: '**为什么 A\\* 会从 $' + detour + '$ 回到 $' + back + '$？** 不是 $g$ 在起作用：$' + detour + '$ 的后继 ' + kids.map(id => '$h(' + id + ')=' + hOf(id) + '$').join('、') +
          ' 太大，$f=' + kids.map(fOf).join('$、$') + '$ 都超过了 $f(' + back + ')=' + fOf(back) + '$。' +
          (sameAsGbfs ? '只按 $h$ 排序的 GBFS 在这张图上的展开顺序一模一样（$' + gbfs.expanded.join(R`\to `) + '$）。' : ''),
        tex: two(kidTex, R`>\ f(` + back + ')=' + gOf[back] + R`+\htmlClass{fx-h}{` + hOf(back) + '}=' + fOf(back)),
        hl: ['h']
      });

      // why is it the cheapest path? G left Open with the smallest f; h never overestimates
      frames.push({
        set: util.merge(...res.path.slice(1).map((v, i) => ({ ['path_' + res.path[i] + '_' + v + '.op']: 1 })),
          ...kids.map(id => ({ ['node_' + id + '.stroke']: SYM.open, ['op_bg_' + id + '.stroke']: PAL.grid })),
          { ['node_' + back + '.stroke']: SYM.closed, 'fline.op': 1, 'fline_lbl.op': 1 }),
        timing: { fline: [0.3, 0.8], fline_lbl: [0.5, 1] },
        pulse: ['fline'],
        dur: 1300,
        cap: '**为什么这就是最便宜的路？** $' + goal + '$ 出队时 $f(' + goal + ')=g(' + goal + ')=' + res.cost + '$，而 Open 里剩下的节点 $f$ 最小也是 ' + minRest + '——条形全在虚线右边。' +
          '$h$ ' + (props.admissible ? 'admissible（从不高估剩余代价）' : '') + '，所以任何别的路都要经过某个 Open 节点 $n$，代价至少 $f(n)\\ge ' + minRest + '$，不会比 ' + res.cost + ' 便宜。最优路径 $' + res.path.join(R`\to `) + '$。',
        tex: two(R`\text{别的路}\ge g(n)+\htmlClass{fx-h}{h^*(n)}\ge g(n)+\htmlClass{fx-h}{h(n)}=\htmlClass{fx-f}{f(n)}`, R`\ge\ \htmlClass{fx-f}{f(` + goal + ')}=' + R`\htmlClass{fx-g}{g(` + goal + ')=' + res.cost + '}'),
        hl: ['f', 'g']
      });
      return frames;
    }
  });
  /* ==========================================================================
   * 2. iw-novelty (Chapter a04: 宽度搜索与原子剪枝)
   * ========================================================================== */
  RL.scene.register('iw-novelty', {
    title: '宽度搜索：Novelty 与 IW(1) 的原子剪枝',
    intro: '3×3 网格，状态因子化为原子 $\\{row(r), col(c)\\}$。从 $(0,0)$ 走向 $(2,2)$，动作顺序为 上、下、左、右。Novelty $> 1$ 的状态被立即剪枝。',
    w: 720,
    h: 340,
    colors: { w: PAL.blue, k: PAL.purple, prune: PAL.red, bound: PAL.green },
    build(st) {
      const P = RL.plan;
      const space = P.gridSpace(3, 3, [0, 0], [2, 2]);

      const iw1Res = P.iw(space, 1); // IW(1): goal never generated
      const iw2Res = P.iw(space, 2); // IW(2): finds the goal
      // novelty of each generated cell (first non-duplicate generation) under IW(1) / IW(2)
      const novMap = res => { const m = {}; res.trace.forEach(t => { if (!t.duplicate && m[t.to] == null) m[t.to] = { w: t.novelty, pruned: t.pruned }; }); return m; };
      const nov1 = novMap(iw1Res), nov2 = novMap(iw2Res);
      const w1 = (r, c) => nov1['(' + r + ',' + c + ')'].w;
      // IW(2)'s plan replayed on the grid: list of [row, col] cells
      const iw2Cells = [[0, 0]];
      if (iw2Res.found) {
        let atoms = space.start;
        iw2Res.path.forEach(act => { atoms = space.succ(atoms).find(x => x.action === act).atoms; iw2Cells.push([+atoms[0].slice(3), +atoms[1].slice(3)]); });
      }

      // Left 3x3 Grid layout
      const ox = 35, oy = 40, cw = 80, ch = 76, gap = 12;
      const cellPos = (r, c) => [ox + c * (cw + gap), oy + r * (ch + gap)];

      st.text('grid_title', ox + (3 * (cw + gap) - gap) / 2, 24, '3×3 网格空间（状态 = {row, col}）', { size: 12, weight: 700, color: PAL.dim });

      const eachCell = fn => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) fn(r, c, ...cellPos(r, c), r === 0 && c === 0, r === 2 && c === 2); };
      eachCell((r, c, cx, cy, isStart, isGoal) => st.add('cell_' + r + '_' + c, 'rect', {
        x: cx, y: cy, width: cw, height: ch, rx: 7, fill: PAL.panel,
        stroke: isGoal ? PAL.green : isStart ? PAL.blue : PAL.grid, 'stroke-width': isGoal || isStart ? 2 : 1.2
      }));
      // IW(2) path (hidden until the last frame): above the cell backgrounds, below the cell texts
      const dPath = 'M ' + iw2Cells.map(([r, c]) => {
        const [x, y] = cellPos(r, c);
        return (x + cw / 2).toFixed(1) + ' ' + (y + ch / 2 + 4).toFixed(1);
      }).join(' L ');
      st.add('iw2_path', 'path', { d: dPath, stroke: PAL.green, 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-opacity': 0.55, fill: 'none', op: 0, draw: 0 });
      eachCell((r, c, cx, cy, isStart, isGoal) => {
        st.text('clbl_' + r + '_' + c, cx + cw / 2, cy + 26, '(' + r + ',' + c + ')', { size: 14, weight: 650, color: PAL.text });
        st.text('catoms_' + r + '_' + c, cx + cw / 2, cy + 46, 'r' + r + ', c' + c, { size: 11, color: PAL.dim });
        st.text('cstat_' + r + '_' + c, cx + cw / 2, cy + 62, isStart ? '起点 S' : isGoal ? '目标 G' : '', {
          size: 11, weight: 600, color: isStart ? PAL.blue : isGoal ? PAL.green : PAL.dim
        });
      });

      // Right Side: Atom Table & Novelty Evaluation
      const rx = 330;
      st.add('grid_divider', 'line', { x1: rx - 15, y1: 20, x2: rx - 15, y2: 320, stroke: PAL.line, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
      st.text('atom_title', rx + 195, 24, '已见单原子集合（Novelty 判定依据）', { size: 12, weight: 700, color: PAL.text });

      // Chips for rows & cols
      const atomNames = ['row0', 'row1', 'row2', 'col0', 'col1', 'col2'];
      const atomPos = {
        row0: [rx + 10, 50], row1: [rx + 138, 50], row2: [rx + 266, 50],
        col0: [rx + 10, 102], col1: [rx + 138, 102], col2: [rx + 266, 102]
      };
      atomNames.forEach(name => {
        const [x, y] = atomPos[name];
        st.add('atom_box_' + name, 'rect', { x, y, width: 114, height: 38, rx: 6, fill: PAL.panel, stroke: PAL.line, 'stroke-width': 1.2 });
        st.text('atom_name_' + name, x + 24, y + 19, name, { size: 12, weight: 650, color: PAL.dim, anchor: 'start' });
        st.text('atom_badge_' + name, x + 102, y + 19, '未见', { size: 11, weight: 600, color: PAL.dim, anchor: 'end' });
      });

      // Current evaluation card
      st.add('eval_box', 'rect', { x: rx + 10, y: 160, width: 370, height: 80, rx: 7, fill: PAL.panel, stroke: PAL.grid, 'stroke-width': 1.2 });
      st.text('eval_state', rx + 24, 180, '当前考察: 准备生成', { size: 12, weight: 600, color: PAL.text, anchor: 'start' });
      st.text('eval_atoms', rx + 24, 200, '包含原子: ∅', { size: 11, color: PAL.dim, anchor: 'start' });
      st.text('eval_result', rx + 24, 222, 'Novelty: —', { size: 12, weight: 700, color: PAL.yellow, anchor: 'start' });

      // BFS Queue display box
      st.add('queue_box', 'rect', { x: rx + 10, y: 255, width: 370, height: 50, rx: 7, fill: '#181b22', stroke: PAL.grid, 'stroke-width': 1 });
      st.text('queue_text', rx + 24, 280, 'BFS 队列: [(0,0)]', { size: 11, color: PAL.teal, anchor: 'start' });

      // Frames
      const frames = [];

      // Frame 0: Initial state at (0,0)
      frames.push({
        set: {
          'atom_box_row0.fill': '#1b2d3d', 'atom_box_row0.stroke': PAL.blue, 'atom_name_row0.color': PAL.text, 'atom_badge_row0.text': '✔ 初始', 'atom_badge_row0.color': PAL.blue,
          'atom_box_col0.fill': '#1b2d3d', 'atom_box_col0.stroke': PAL.blue, 'atom_name_col0.color': PAL.text, 'atom_badge_col0.text': '✔ 初始', 'atom_badge_col0.color': PAL.blue,
          'eval_state.text': '当前考察: 根节点 (0,0)',
          'eval_atoms.text': '包含原子: {row0, col0}',
          'eval_result.text': '初始状态: 将原子加入已见集合',
          'eval_result.color': PAL.blue
        },
        cap: '起点 $(0,0)$ 的原子为 $\\{row0, col0\\}$，初始加入已见集合。**IW(1)** 是只保留带来**至少一个全新单原子**（$w(s)=1$）的广度优先搜索。',
        tex: two(R`\text{生成 } s:\quad \htmlClass{fx-w}{w(s)} \le \htmlClass{fx-k}{1} \implies \htmlClass{fx-bound}{\text{保留入队}}`, R`\htmlClass{fx-w}{w(s)} > \htmlClass{fx-k}{1} \implies \htmlClass{fx-prune}{\text{剪掉}}`),
        hl: ['w', 'k']
      });

      // Frame 1: Generate (1,0) [下] -> row1 is new -> Kept!
      frames.push({
        set: {
          'cell_1_0.fill': '#1b2d3d', 'cell_1_0.stroke': PAL.blue, 'cstat_1_0.text': '保留 ✔', 'cstat_1_0.color': PAL.blue,
          'atom_box_row1.fill': '#1b2d3d', 'atom_box_row1.stroke': PAL.blue, 'atom_name_row1.color': PAL.text, 'atom_badge_row1.text': '✔ 首次', 'atom_badge_row1.color': PAL.blue,
          'eval_state.text': '生成: (1,0) [动作: 下]',
          'eval_atoms.text': '包含原子: {row1, col0}',
          'eval_result.text': 'Novelty: w(s) = ' + w1(1, 0) + ' (新原子: row1) → 保留入队 ✔',
          'eval_result.color': PAL.green,
          'queue_text.text': 'BFS 队列: [(1,0)]'
        },
        pulse: ['cell_1_0', 'atom_box_row1'],
        dur: 1000,
        cap: '展开 $(0,0)$，向下生成 $(1,0)$：包含原子 $\\{row1, col0\\}$。**$row1$ 首次出现**，因此 $w(s)=' + w1(1, 0) + '$。状态保留，加入 BFS 队列。',
        hl: ['bound']
      });

      // Frame 2: Generate (0,1) [右] -> col1 is new -> Kept!
      frames.push({
        set: {
          'cell_0_1.fill': '#1b2d3d', 'cell_0_1.stroke': PAL.blue, 'cstat_0_1.text': '保留 ✔', 'cstat_0_1.color': PAL.blue,
          'atom_box_col1.fill': '#1b2d3d', 'atom_box_col1.stroke': PAL.blue, 'atom_name_col1.color': PAL.text, 'atom_badge_col1.text': '✔ 首次', 'atom_badge_col1.color': PAL.blue,
          'eval_state.text': '生成: (0,1) [动作: 右]',
          'eval_atoms.text': '包含原子: {row0, col1}',
          'eval_result.text': 'Novelty: w(s) = ' + w1(0, 1) + ' (新原子: col1) → 保留入队 ✔',
          'eval_result.color': PAL.green,
          'queue_text.text': 'BFS 队列: [(1,0), (0,1)]'
        },
        pulse: ['cell_0_1', 'atom_box_col1'],
        dur: 1000,
        cap: '从 $(0,0)$ 向右生成 $(0,1)$：包含原子 $\\{row0, col1\\}$。**$col1$ 首次出现**，因此 $w(s)=' + w1(0, 1) + '$。保留入队。',
        hl: ['bound']
      });

      // Frame 3: Expand (1,0), generate (2,0) [下] -> row2 is new -> Kept!
      frames.push({
        set: {
          'cell_2_0.fill': '#1b2d3d', 'cell_2_0.stroke': PAL.blue, 'cstat_2_0.text': '保留 ✔', 'cstat_2_0.color': PAL.blue,
          'atom_box_row2.fill': '#1b2d3d', 'atom_box_row2.stroke': PAL.blue, 'atom_name_row2.color': PAL.text, 'atom_badge_row2.text': '✔ 首次', 'atom_badge_row2.color': PAL.blue,
          'eval_state.text': '展开 (1,0) → 生成: (2,0) [下]',
          'eval_atoms.text': '包含原子: {row2, col0}',
          'eval_result.text': 'Novelty: w(s) = ' + w1(2, 0) + ' (新原子: row2) → 保留入队 ✔',
          'eval_result.color': PAL.green,
          'queue_text.text': 'BFS 队列: [(0,1), (2,0)]'
        },
        pulse: ['cell_2_0', 'atom_box_row2'],
        dur: 1000,
        cap: '展开 $(1,0)$，向下生成 $(2,0)$：原子 $\\{row2, col0\\}$。**$row2$ 首次出现**，$w(s)=' + w1(2, 0) + '$。保留并进入队列。',
        hl: ['bound']
      });

      // Frame 4: Generate (1,1) [右] -> both row1, col1 seen -> Pruned!
      frames.push({
        set: {
          'cell_1_1.fill': '#3d1d22', 'cell_1_1.stroke': PAL.red, 'cstat_1_1.text': '剪掉 ✘', 'cstat_1_1.color': PAL.red,
          'eval_state.text': '从 (1,0) → 生成: (1,1) [右]',
          'eval_atoms.text': '包含原子: {row1, col1}',
          'eval_result.text': 'Novelty: w(s) = ' + w1(1, 1) + ' (row1、col1 均已见过) → 剪枝丢弃 ✘',
          'eval_result.color': PAL.red,
          'queue_text.text': 'BFS 队列: [(0,1), (2,0)] (未将 (1,1) 加入)'
        },
        pulse: ['cell_1_1'],
        dur: 1100,
        cap: '从 $(1,0)$ 向右生成 $(1,1)$：包含 $\\{row1, col1\\}$。**$row1$ 与 $col1$ 都已单独为真过**！没有新单原子，$w(s)=' + w1(1, 1) + '$。在 IW(1) 中 $w > 1$ **直接剪掉**！',
        hl: ['prune']
      });

      // Frame 5: Expand (0,1), generate (0,2) [右] -> col2 is new -> Kept!
      frames.push({
        set: {
          'cell_0_2.fill': '#1b2d3d', 'cell_0_2.stroke': PAL.blue, 'cstat_0_2.text': '保留 ✔', 'cstat_0_2.color': PAL.blue,
          'atom_box_col2.fill': '#1b2d3d', 'atom_box_col2.stroke': PAL.blue, 'atom_name_col2.color': PAL.text, 'atom_badge_col2.text': '✔ 首次', 'atom_badge_col2.color': PAL.blue,
          'eval_state.text': '展开 (0,1) → 生成: (0,2) [右]',
          'eval_atoms.text': '包含原子: {row0, col2}',
          'eval_result.text': 'Novelty: w(s) = ' + w1(0, 2) + ' (新原子: col2) → 保留入队 ✔',
          'eval_result.color': PAL.green,
          'queue_text.text': 'BFS 队列: [(2,0), (0,2)]'
        },
        pulse: ['cell_0_2', 'atom_box_col2'],
        dur: 1000,
        cap: '展开 $(0,1)$，向右生成 $(0,2)$：$col2$ 首次出现，$w(s)=' + w1(0, 2) + '$ 保留。至此，网格的所有行和列原子**已经全部点亮过**！',
        hl: ['bound']
      });

      // Frame 6: Generate (2,1) and (1,2) -> novelty 2 -> Pruned!
      frames.push({
        set: {
          'cell_2_1.fill': '#3d1d22', 'cell_2_1.stroke': PAL.red, 'cstat_2_1.text': '剪掉 ✘', 'cstat_2_1.color': PAL.red,
          'cell_1_2.fill': '#3d1d22', 'cell_1_2.stroke': PAL.red, 'cstat_1_2.text': '剪掉 ✘', 'cstat_1_2.color': PAL.red,
          'eval_state.text': '生成: (2,1) 与 (1,2)',
          'eval_atoms.text': '{row2, col1} 与 {row1, col2}',
          'eval_result.text': 'Novelty: w(s) = ' + w1(2, 1) + ' (所有单原子均已被点亮) → 全部剪掉 ✘',
          'eval_result.color': PAL.red,
          'queue_text.text': 'BFS 队列: [] (队列变空！)'
        },
        pulse: ['cell_2_1', 'cell_1_2'],
        dur: 1100,
        cap: '后继 $(2,1)$ 与 $(1,2)$ 生成时，所有原子都已单独出现过，没有全新单原子，$w(s)=' + w1(2, 1) + '$ **全部被剪掉**！队列已清空。',
        hl: ['prune']
      });

      // Frame 7: Target (2,2) never generated!
      frames.push({
        set: {
          'eval_state.text': 'IW(1) 搜索结束：未找到目标',
          'eval_atoms.text': '目标 (2,2) 的前驱邻居全部被剪枝',
          'eval_result.text': '无状态可展开，搜索失败',
          'eval_result.color': PAL.dim,
          'queue_text.text': 'BFS 队列: [] (IW(1) 状态数界限 ≤ n)'
        },
        pulse: ['cell_2_2'],
        dur: 1000,
        cap: '**IW(1) 无法到达对角目标**！目标 $(2,2)$ 根本没有被生成，因为能到达它的 $(1,2)$ 和 $(2,1)$ 在更早时就被剪除了。',
        hl: ['prune']
      });

      // Frame 8: Contrast with IW(2): reset IW(1)'s "剪掉" badges, show which cells IW(2) keeps and its path
      const onIw2Path = new Set(iw2Cells.map(([r, c]) => r + '_' + c));
      const revived = Object.keys(nov2).filter(lbl => !nov2[lbl].pruned && nov1[lbl] && nov1[lbl].pruned);
      const goalLbl = '(2,2)', nSteps = iw2Res.found ? iw2Res.path.length : 0;
      const f8 = {
        'iw2_path.op': 1, 'iw2_path.draw': 1,
        'atom_title.text': 'IW(2) 记录原子对：每个 {row, col} 都是新的对',
        'eval_state.text': '切换到 IW(2)：Novelty 按原子对算',
        'eval_atoms.text': revived.join('、') + ' 的原子对第一次出现',
        'eval_result.text': 'w(s) = 2 ≤ 2 → 保留；' + nSteps + ' 步到达 ' + goalLbl + ' ✔',
        'eval_result.color': PAL.green,
        'queue_text.text': '路径: ' + iw2Cells.map(([r, c]) => '(' + r + ',' + c + ')').join(' → ')
      };
      Object.keys(nov2).forEach(lbl => {
        const v = nov2[lbl]; if (v.pruned) return;
        const [r, c] = lbl.slice(1, -1).split(',').map(Number), key = r + '_' + c, onPath = onIw2Path.has(key);
        f8['cell_' + key + '.fill'] = onPath ? '#1b3b24' : '#1b2d3d';
        f8['cell_' + key + '.stroke'] = onPath ? PAL.green : PAL.blue;
        f8['cstat_' + key + '.color'] = onPath ? PAL.green : PAL.blue;
        if (lbl === goalLbl) f8['cstat_' + key + '.text'] = '到达目标 ✔';
        else if (revived.includes(lbl)) f8['cstat_' + key + '.text'] = 'w=' + v.w + ' ≤ 2 保留';
      });
      frames.push({
        set: f8,
        timing: { iw2_path: [0.35, 1] },
        pulse: ['cell_2_2'].concat(revived.map(lbl => 'cell_' + lbl.slice(1, -1).replace(',', '_'))),
        dur: 1500,
        cap: '**对比 IW(2)**：它记录的是**原子对**。' + revived.map(l => '$' + l + '$').join('、') + ' 虽然没有新的单原子，但各自的 $\\{row, col\\}$ 对是第一次出现，$w(s)=2\\le 2$，全部保留。' +
          '网格里每个格子都是一个新的对，IW(2) 就等于带去重的 BFS，**' + nSteps + ' 步到达目标 $(2,2)$**。代价：要记的组合从 $O(n)$ 个变成 $O(n^2)$ 个。',
        tex: two(R`\text{IW(2)}:\quad \htmlClass{fx-w}{w(s)} \le \htmlClass{fx-k}{2} \implies \htmlClass{fx-bound}{\text{保留入队}}`, R`\text{记录的组合 } O(n^2),\quad \text{步数} = ` + nSteps),
        hl: ['k', 'bound']
      });

      return frames;
    }
  });

  /* ==========================================================================
   * 3. delete-relax (a09: 删除松弛与 h+)
   * ========================================================================== */
  RL.scene.register('delete-relax', {
    title: '删除松弛与 h+：为什么多一些事实总是更好',
    intro: 'Australia 旅行商问题（课件 W5）：从悉尼出发，访问所有城市并回到悉尼。对比真实 STRIPS 语义与删除松弛（忽略 Del 列表）下的执行过程与代价。',
    w: 720,
    h: 360,
    colors: { a: PAL.orange, pi: PAL.blue, h: PAL.green, le: PAL.red },
    build(st) {
      const P = RL.plan, prob = P.AUSTRALIA;
      const real = P.optimalCost(prob, false), relaxed = P.optimalCost(prob, true);
      const costReal = real.cost, costRelaxed = relaxed.cost;
      const byName = {}; prob.actions.forEach(a => { byName[a.name] = a; });
      const legOf = name => { const m = name.match(/drive\((\w+),(\w+)\)/); return { name, from: m[1], to: m[2], cost: byName[name].cost }; };
      const realLegs = real.plan.map(legOf), relaxLegs = relaxed.plan.map(legOf);
      const start = prob.init.find(f => f.startsWith('at(')).slice(3, -1);
      const CN = { Sy: '悉尼', Br: '布里斯班', Ad: '阿德莱德', Pe: '珀斯', Da: '达尔文' };
      const cities = ['Pe', 'Da', 'Ad', 'Sy', 'Br'];
      const cityPos = { Pe: [90, 160], Da: [270, 50], Ad: [350, 175], Sy: [530, 175], Br: [610, 80] };
      const TDY = 31; // the truck drives just below the city, so the city name stays readable
      const truckXY = c => [cityPos[c][0], cityPos[c][1] + TDY];
      // roads: [u, v, label x, label y]
      const roads = [['Sy', 'Br', 572, 116], ['Sy', 'Ad', 440, 160], ['Ad', 'Pe', 220, 152], ['Ad', 'Da', 322, 100]];
      const roadOf = (x, y) => roads.find(r => (r[0] === x && r[1] === y) || (r[0] === y && r[1] === x));
      const rkey = (x, y) => { const r = roadOf(x, y); return r[0] + '_' + r[1]; };
      const costOf = (x, y) => byName['drive(' + x + ',' + y + ')'].cost;

      roads.forEach(([u, v, lx, ly]) => {
        const [x1, y1] = cityPos[u], [x2, y2] = cityPos[v];
        st.add('road_' + u + '_' + v, 'line', { x1, y1, x2, y2, stroke: '#353e4f', 'stroke-width': 2.5 });
      });
      // a leg drawn along its road, shifted to the right of the driving direction: out and back sit side by side
      const legPath = (leg, off) => {
        const [x1, y1] = cityPos[leg.from], [x2, y2] = cityPos[leg.to];
        const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, r = 21, nx = -uy * off, ny = ux * off;
        return 'M ' + (x1 + ux * r + nx).toFixed(1) + ' ' + (y1 + uy * r + ny).toFixed(1) + ' L ' + (x2 - ux * r + nx).toFixed(1) + ' ' + (y2 - uy * r + ny).toFixed(1);
      };
      st.group('rlegs', {});
      realLegs.forEach((leg, k) => st.add('rleg' + k, 'path', { d: legPath(leg, 5), stroke: PAL.orange, 'stroke-width': 3, 'stroke-linecap': 'butt', fill: 'none', draw: 0 }, 'rlegs'));
      st.group('xlegs', {});
      relaxLegs.forEach((leg, k) => st.add('xleg' + k, 'path', { d: legPath(leg, 0), stroke: PAL.green, 'stroke-width': 3.5, fill: 'none', draw: 0 }, 'xlegs'));
      roads.forEach(([u, v, lx, ly]) => {
        st.add('rcost_bg_' + u + '_' + v, 'rect', { x: lx - 17, y: ly - 11, width: 34, height: 22, rx: 4, fill: PAL.panel, stroke: PAL.grid });
        st.text('rcost_t_' + u + '_' + v, lx, ly + 1, numStr(costOf(u, v)), { size: 13, color: PAL.yellow, weight: 650 });
        st.text('x2_' + u + '_' + v, lx + 33, ly + 1, '×2', { size: 13, weight: 700, color: PAL.orange, op: 0, parent: 'rlegs' });
      });
      // which leg drives each road for the second time (that is when its ×2 appears)
      const secondLeg = {}, seen = {};
      realLegs.forEach((leg, k) => { const key = rkey(leg.from, leg.to); seen[key] = (seen[key] || 0) + 1; if (seen[key] === 2) secondLeg[key] = k; });
      // every road driven exactly twice -> write the cost as 2 × (sum of the roads)
      const allTwice = Object.keys(seen).length === roads.length && Object.values(seen).every(v => v === 2);
      const realTex = allTwice ? R`2\times(` + roads.map(r => numStr(costOf(r[0], r[1]))).join('+') + ')' : realLegs.map(l => numStr(l.cost)).join('+');

      cities.forEach(c => {
        const [cx, cy] = cityPos[c];
        st.add('city_' + c, 'circle', { cx, cy, r: 18, fill: PAL.panel, stroke: PAL.blue, 'stroke-width': 2 });
        st.text('citylbl_' + c, cx, cy + 1, c, { size: 13, weight: 700 });
        // the clone left behind in the delete relaxation (at(c) stays true)
        st.group('ghost_' + c, { tx: cx, ty: cy - 32, op: 0 });
        st.add('gh_c_' + c, 'rect', { x: -21, y: -11, width: 42, height: 22, rx: 11, fill: '#1b2d3d', stroke: PAL.blue, 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, 'ghost_' + c);
        st.text('gh_t_' + c, 0, 1, '分身', { size: 12, weight: 600, color: PAL.blue, parent: 'ghost_' + c });
      });

      st.group('truck', { tx: truckXY(start)[0], ty: truckXY(start)[1] });
      st.add('truck_circ', 'circle', { cx: 0, cy: 0, r: 11, fill: PAL.orange, stroke: '#ffffff', 'stroke-width': 1.5 }, 'truck');
      st.text('truck_lbl', 0, 1, '车', { size: 11, weight: 700, color: PAL.bg, parent: 'truck' });

      // fact strip
      st.add('div_strip', 'line', { x1: 20, y1: 226, x2: 700, y2: 226, stroke: PAL.line, 'stroke-width': 1 });
      st.text('strip_title', 24, 244, '事实状态 s：', { size: 12, weight: 700, color: PAL.dim, anchor: 'start' });
      cities.forEach((c, i) => {
        const fx = 140 + i * 68;
        st.add('chip_at_' + c, 'rect', { x: fx - 31, y: 254, width: 62, height: 28, rx: 5, fill: PAL.panel, stroke: PAL.line, 'stroke-width': 1 });
        st.text('txt_at_' + c, fx, 269, 'at(' + c + ')', { size: 12, color: PAL.dim });
        st.add('chip_v_' + c, 'rect', { x: fx - 31, y: 288, width: 62, height: 28, rx: 5, fill: PAL.panel, stroke: PAL.line, 'stroke-width': 1 });
        st.text('txt_v_' + c, fx, 303, 'v(' + c + ')', { size: 12, color: PAL.dim });
      });
      st.add('info_box', 'rect', { x: 495, y: 238, width: 205, height: 100, rx: 7, fill: PAL.panel, stroke: PAL.grid });
      st.text('info_mode', 597, 256, '语义: 真实 STRIPS', { size: 12, weight: 700, color: PAL.yellow });
      st.text('info_cost_lbl', 548, 284, '累积代价:', { size: 12, color: PAL.dim, anchor: 'end' });
      st.num('info_cost_val', 558, 284, 0, { digits: 1, size: 18, weight: 700, color: PAL.gold, anchor: 'start' });
      st.text('info_goal', 597, 314, '已访问: 1 / 5', { size: 12, color: PAL.teal });

      const ON = { at: ['#1b2d3d', PAL.blue], v: ['#1e3823', PAL.green] };
      const chipKeys = (kind, c) => ['chip_' + kind + '_' + c + '.fill', 'chip_' + kind + '_' + c + '.stroke', 'txt_' + kind + '_' + c + '.color'];
      const chipVals = (kind, on) => (on ? [ON[kind][0], ON[kind][1], PAL.text] : [PAL.panel, PAL.line, PAL.dim]);
      const chip = (kind, c, on) => { const k = chipKeys(kind, c), v = chipVals(kind, on); return { [k[0]]: v[0], [k[1]]: v[1], [k[2]]: v[2] }; };
      /** the full chip state: every frame sets all 20 chip keys, so what is lit always matches the facts */
      const chips = (atSet, vSet) => util.merge(...cities.map(c => util.merge(chip('at', c, atSet.has(c)), chip('v', c, vSet.has(c)))));
      const visitedTxt = (vSet, extra) => '已访问: ' + vSet.size + ' / ' + cities.length + (extra || '');
      const frames = [];

      // ---- real semantics
      let vSet = new Set([start]), cost = 0;
      frames.push({
        set: util.merge(chips(new Set([start]), vSet), { 'info_mode.text': '语义: 真实 STRIPS', 'info_cost_val.num': 0, 'info_goal.text': visitedTxt(vSet) }),
        cap: '从悉尼出发，访问所有城市并回到悉尼。**真实语义下**执行动作时要执行删除效果 $Del$：卡车开走后，原来的城市就不再有卡车。真实最优代价 $h^* = ' + costReal + '$。',
        tex: R`\htmlClass{fx-a}{a = (pre_a,\, add_a,\, del_a)},\qquad \htmlClass{fx-le}{h^*(I) = ` + costReal + R`}`,
        hl: ['le']
      });
      [0, 1].forEach(k => {
        const leg = realLegs[k];
        cost += leg.cost; vSet = new Set([...vSet, leg.to]);
        const key = rkey(leg.from, leg.to), second = secondLeg[key] === k;
        frames.push({
          set: util.merge(chips(new Set([leg.to]), vSet), {
            'truck.tx': truckXY(leg.to)[0], 'truck.ty': truckXY(leg.to)[1], ['rleg' + k + '.draw']: 1,
            'info_cost_val.num': cost, 'info_goal.text': visitedTxt(vSet)
          }, second ? { ['x2_' + key + '.op']: 1 } : {}),
          timing: { truck: [0, 0.7], ['rleg' + k]: [0, 0.7], 'info_cost_val': [0, 0.7], ['chip_at_' + leg.from]: [0.35, 0.55], ['txt_at_' + leg.from]: [0.35, 0.55], ['chip_at_' + leg.to]: [0.55, 0.8], ['txt_at_' + leg.to]: [0.55, 0.8], ['x2_' + key]: [0.75, 1] },
          pulse: ['city_' + leg.to, 'chip_at_' + leg.to],
          dur: 1200,
          cap: k === 0
            ? '执行 `' + leg.name + '`（代价 ' + numStr(leg.cost) + '）：卡车到达' + CN[leg.to] + '，**`at(' + leg.from + ')` 被删除**——它的卡片熄灭，卡车不能同时在两个城市。'
            : CN[leg.from] + '是死胡同，要去别处**必须原路开回**：`' + leg.name + '`（代价 ' + numStr(leg.cost) + '），这条路被开了**第二次（×2）**。累积代价 ' + numStr(cost) + '。',
          hl: ['a']
        });
      });
      // the rest of the optimal tour in one continuous drive: legs ease one by one, cost counts up
      const tail = realLegs.slice(2), seg = legs(tail.length), before = [];
      tail.forEach(l => { before.push(cost); cost += l.cost; });
      const vBefore = new Set(vSet);
      const atAt = q => { const [k, t] = seg(q); return t < 0.5 ? tail[k].from : tail[k].to; };
      const visitedAt = q => { const [k, t] = seg(q), s = new Set(vBefore); tail.forEach((l, j) => { if (j < k || (j === k && t >= 0.5)) s.add(l.to); }); return s; };
      const fn3 = {
        'truck.tx': q => { const [k, t] = seg(q); return lerp(truckXY(tail[k].from)[0], truckXY(tail[k].to)[0], t); },
        'truck.ty': q => { const [k, t] = seg(q); return lerp(truckXY(tail[k].from)[1], truckXY(tail[k].to)[1], t); },
        'info_cost_val.num': q => { const [k, t] = seg(q); return before[k] + tail[k].cost * t; },
        'info_goal.text': q => visitedTxt(visitedAt(q))
      };
      tail.forEach((l, j) => { fn3['rleg' + (j + 2) + '.draw'] = q => { const [k, t] = seg(q); return k > j ? 1 : k < j ? 0 : t; }; });
      Object.keys(secondLeg).forEach(key => {
        const j2 = secondLeg[key] - 2; if (j2 < 0) return;
        fn3['x2_' + key + '.op'] = q => { const [k, t] = seg(q); return k > j2 ? 1 : k < j2 ? 0 : clamp01((t - 0.7) / 0.3); };
      });
      cities.forEach(c => {
        chipKeys('at', c).forEach((key, i) => { fn3[key] = q => chipVals('at', atAt(q) === c)[i]; });
        chipKeys('v', c).forEach((key, i) => { fn3[key] = q => chipVals('v', visitedAt(q).has(c))[i]; });
      });
      vSet = new Set(cities);
      frames.push({
        set: util.merge(chips(new Set([tail[tail.length - 1].to]), vSet), util.each(tail.length, j => ({ ['rleg' + (j + 2) + '.draw']: 1 })),
          util.merge(...Object.keys(secondLeg).map(key => ({ ['x2_' + key + '.op']: 1 }))), {
            'truck.tx': truckXY(tail[tail.length - 1].to)[0], 'truck.ty': truckXY(tail[tail.length - 1].to)[1],
            'info_cost_val.num': costReal, 'info_goal.text': visitedTxt(vSet, '，回到 ' + start + ' ✔')
          }),
        fn: fn3,
        dur: 5200,
        pulse: ['info_box'],
        cap: '真实最优计划：每条支线都要开进去再开出来，$' + realLegs.map(l => numStr(l.cost)).join('+') + '=' + costReal + '$。**每条路都开了两次（×2）**，$h^*=' + costReal + '$。',
        tex: R`\htmlClass{fx-le}{h^*(I) = ` + realTex + ' = ' + costReal + '}',
        hl: ['le']
      });

      // ---- delete relaxation
      let atSet = new Set([start]); vSet = new Set([start]); cost = 0;
      frames.push({
        set: util.merge(chips(atSet, vSet), {
          'rlegs.op': 0, 'truck.tx': truckXY(start)[0], 'truck.ty': truckXY(start)[1], ['ghost_' + start + '.op']: 0.9,
          'info_mode.text': '语义: 删除松弛 (Del=∅)', 'info_mode.color': PAL.green, 'info_cost_val.num': 0, 'info_goal.text': visitedTxt(vSet)
        }),
        timing: { rlegs: [0, 0.4], truck: [0.2, 0.7], ['ghost_' + start]: [0.5, 1] },
        pulse: ['ghost_' + start],
        dur: 1100,
        cap: '**进入删除松弛世界**：把每个动作的删除列表清空（$Del=\\emptyset$）。“曾经为真的永远为真”：卡车在每个去过的城市都留下一个**分身**，**事实只增不减**。',
        tex: R`\htmlClass{fx-a}{a^+ = (pre_a,\, add_a,\, \emptyset)},\qquad \htmlClass{fx-h}{h^+(s)} \le \htmlClass{fx-le}{h^*(s)}`,
        hl: ['a', 'h']
      });
      relaxLegs.forEach((leg, j) => {
        const cur = j === 0 ? start : relaxLegs[j - 1].to, jump = cur !== leg.from, c0 = cost;
        cost += leg.cost; atSet = new Set([...atSet, leg.to]); vSet = new Set([...vSet, leg.to]);
        const drive = q => (jump ? clamp01((q - 0.3) / 0.7) : q);
        const fn = {
          'truck.tx': q => (jump && q < 0.3 ? truckXY(q < 0.15 ? cur : leg.from)[0] : lerp(truckXY(leg.from)[0], truckXY(leg.to)[0], drive(q))),
          'truck.ty': q => (jump && q < 0.3 ? truckXY(q < 0.15 ? cur : leg.from)[1] : lerp(truckXY(leg.from)[1], truckXY(leg.to)[1], drive(q))),
          ['xleg' + j + '.draw']: drive,
          'info_cost_val.num': q => c0 + leg.cost * drive(q)
        };
        if (jump) fn['truck.op'] = q => (q < 0.15 ? 1 - q / 0.15 : q < 0.3 ? (q - 0.15) / 0.15 : 1);
        const done = vSet.size === cities.length;
        frames.push({
          set: util.merge(chips(atSet, vSet), {
            'truck.tx': truckXY(leg.to)[0], 'truck.ty': truckXY(leg.to)[1], 'truck.op': 1, ['xleg' + j + '.draw']: 1, ['ghost_' + leg.to + '.op']: 0.9,
            'info_cost_val.num': cost, 'info_goal.text': visitedTxt(vSet, done ? '（全部完成 ✔）' : '')
          }),
          fn,
          timing: { ['ghost_' + leg.to]: [0.8, 1], ['chip_at_' + leg.to]: [0.75, 1], ['txt_at_' + leg.to]: [0.75, 1], ['chip_v_' + leg.to]: [0.75, 1], ['txt_v_' + leg.to]: [0.75, 1] },
          pulse: ['ghost_' + leg.from, 'city_' + leg.to],
          dur: jump ? 1600 : 1200,
          cap: j === 0
            ? '执行 `' + leg.name + '⁺`（代价 ' + numStr(leg.cost) + '）：得到 `at(' + leg.to + ')` 与 `v(' + leg.to + ')`。**关键：`at(' + leg.from + ')` 没有被删除**，' + CN[leg.from] + '的分身还在。'
            : jump
              ? '直接从**' + CN[leg.from] + '的分身**出发执行 `' + leg.name + '⁺`（代价 ' + numStr(leg.cost) + '），**不用从' + CN[cur] + '开回来**。' + CN[leg.to] + '也留下一个分身。'
              : '从' + CN[leg.from] + '执行 `' + leg.name + '⁺`（代价 ' + numStr(leg.cost) + '）访问' + CN[leg.to] + '，`at(' + leg.from + ')` 依然为真，分身仍在。',
          hl: ['h']
        });
      });
      frames.push({
        set: { 'info_goal.text': '目标达成！h+ = ' + numStr(costRelaxed) },
        pulse: ['ghost_' + start, 'info_box'],
        dur: 1200,
        cap: '**目标全部达成**：因为 $at(' + start + ')$ 从未被删除，**卡车甚至不用开回' + CN[start] + '**。最优松弛计划代价 $h^+=' + numStr(costRelaxed) + '$。真实计划在松弛语义下照样能执行（多出来的事实不会妨碍任何动作），所以 $h^+\\le h^*$ **恒成立**：$h^+$ 是 admissible 的。',
        tex: R`\htmlClass{fx-h}{h^+(I) = ` + relaxLegs.map(l => numStr(l.cost)).join('+') + ' = ' + numStr(costRelaxed) + R`} \le \htmlClass{fx-le}{h^*(I) = ` + costReal + R`}`,
        hl: ['h', 'le']
      });
      return frames;
    }
  });

  /* ==========================================================================
   * 4. hadd-propagation (a10: h_max 与 h_add)
   * ========================================================================== */
  /** Actions reachable backwards from fact f through best supporters (the "sub-plan" behind f's value). */
  function supportClosure(prob, bs, f, out) {
    out = out || new Set();
    const a = bs[f] && prob.actions.find(x => x.name === bs[f]);
    if (!a || out.has(a.name)) return out;
    out.add(a.name);
    a.pre.forEach(p => supportClosure(prob, bs, p, out));
    return out;
  }
  const aid = a => a.replace(/\W/g, ''); // 'dr(A,B)' -> 'drAB', usable in object names
  const HADD_STAGES = {
    add: ['初始：已有事实为 0', '逐轮传播（Bellman-Ford）', '合并目标', '为什么会多算'],
    max: ['初始：已有事实为 0', '逐轮传播（Bellman-Ford）', '合并目标', '为什么偏乐观']
  };
  RL.scene.register('hadd-propagation', {
    title: 'h_max 与 h_add：Bellman-Ford 一轮轮传播',
    intro: 'Logistics 实例（课件 W5）：卡车在 A，包裹在 C，直线 A–B–C–D，各动作代价均为 1。比较前提合并时取最大（$h_{max}$，admissible）与求和（$h_{add}$）。拖动下方滑块切换。',
    w: 720,
    h: 340,
    params: [
      { key: 'mode', label: '计算模式', min: 0, max: 1, step: 1, value: 1, format: v => (v === 1 ? 'h_add (求和)' : 'h_max (取最大)') }
    ],
    colors: { min: PAL.blue, sum: PAL.gold, h: PAL.green, over: PAL.red, zero: PAL.grey },
    build(st, p) {
      const P = RL.plan;
      const isAdd = (p.mode == null || p.mode === 1), modeStr = isAdd ? 'add' : 'max';
      const prob = P.logistics(['t(A)', 'p(D)']);
      const bf = P.bellmanFord(prob, null, modeStr), tables = bf.tables, hVal = bf.h;
      const bs = P.bestSupporters(prob, bf.values, modeStr);
      const hPlus = P.optimalCost(prob, true), hStar = P.optimalCost(prob, false).cost;
      const byName = {}; prob.actions.forEach(a => { byName[a.name] = a; });
      const modeCol = isAdd ? PAL.gold : PAL.blue, modeKey = isAdd ? 'sum' : 'min';
      const hName = isAdd ? 'h_{add}' : 'h_{max}';

      // fact graph: truck row on top, package row below, p(T) in between
      const truckPos = { A: 90, B: 240, C: 390, D: 540 }, pkgPos = { C: 390, T: 465, D: 540 };
      const arrowsOf = { 'dr(A,B)': ['arr_dr_AB'], 'dr(B,C)': ['arr_dr_BC'], 'dr(C,D)': ['arr_dr_CD'], 'lo(C)': ['arr_lo_tC', 'arr_lo_pC'], 'ul(D)': ['arr_ul_tD', 'arr_ul_pT'] };
      const labelOf = { 'dr(A,B)': 'lbl_dr_AB', 'dr(B,C)': 'lbl_dr_BC', 'dr(C,D)': 'lbl_dr_CD', 'lo(C)': 'lbl_lo_C', 'ul(D)': 'lbl_ul_D' };
      [['dr_AB', 'dr(A,B)', 90, 240], ['dr_BC', 'dr(B,C)', 240, 390], ['dr_CD', 'dr(C,D)', 390, 540]].forEach(([id, name, x1, x2]) => {
        st.add('arr_' + id, 'path', { d: util.arrow(x1 + 36, 50, x2 - 36, 50, 6), stroke: PAL.line, 'stroke-width': 2, fill: 'none' });
        st.text('lbl_' + id, (x1 + x2) / 2, 36, name, { size: 12, color: PAL.dim });
      });
      st.add('arr_lo_tC', 'path', { d: util.arrow(410, 68, 447, 90, 6), stroke: PAL.line, 'stroke-width': 1.6, fill: 'none' });
      st.add('arr_lo_pC', 'path', { d: util.arrow(410, 132, 447, 110, 6), stroke: PAL.line, 'stroke-width': 1.6, fill: 'none' });
      st.text('lbl_lo_C', 392, 100, 'lo(C)', { size: 12, color: PAL.yellow });
      st.add('arr_ul_tD', 'path', { d: util.arrow(530, 68, 530, 130, 6), stroke: PAL.line, 'stroke-width': 1.6, fill: 'none' });
      st.add('arr_ul_pT', 'path', { d: util.arrow(495, 106, 512, 142, 6), stroke: PAL.line, 'stroke-width': 1.6, fill: 'none' });
      st.text('lbl_ul_D', 542, 100, 'ul(D)', { size: 12, color: PAL.yellow, anchor: 'start' });
      // badges for the final frame: ×2 (h_add counts it twice) or "没算" (h_max drops it)
      Object.keys(labelOf).forEach(a => {
        const el = st.objs[labelOf[a]], x = +el.getAttribute('x'), y = +el.getAttribute('y');
        const below = a.startsWith('dr');
        st.text('bdg_' + aid(a), below ? x : x + (a === 'ul(D)' ? 18 : 0), below ? 66 : y + 16, '', { size: 12, weight: 700, color: PAL.red, op: 0 });
      });

      const card = (key, x, y, label, goal) => {
        st.add('bg_' + key, 'rect', { x: x - 32, y: y - 16, width: 64, height: 32, rx: 6, fill: PAL.panel, stroke: goal ? PAL.green : PAL.grid, 'stroke-width': goal ? 2 : 1.5 });
        st.text('lbl_' + key, x - 12, y + 1, label, { size: 12, weight: 650, color: goal ? PAL.green : PAL.text });
        st.text('val_' + key, x + 17, y + 1, '∞', { size: 13, weight: 700, color: PAL.dim });
      };
      ['A', 'B', 'C', 'D'].forEach(c => card('t' + c, truckPos[c], 50, 't(' + c + ')', false));
      ['C', 'T', 'D'].forEach(c => card('p' + c, pkgPos[c], c === 'T' ? 100 : 150, 'p(' + c + ')', c === 'D'));
      const facts = ['t(A)', 't(B)', 't(C)', 't(D)', 'p(C)', 'p(T)', 'p(D)'];
      const keyOf = f => f[0] + f[2]; // 't(B)' -> 'tB'

      // Bellman-Ford table
      st.add('div_bf', 'line', { x1: 20, y1: 192, x2: 700, y2: 192, stroke: PAL.line, 'stroke-width': 1 });
      const tblX = 35, tblY = 210, colW = 62, rows = Math.min(4, tables.length - 1);
      st.text('tbl_title', tblX + 210, 203, 'Bellman-Ford 迭代表（第 i 轮的事实代价 T_i）', { size: 12, weight: 700, color: PAL.dim });
      facts.forEach((f, j) => st.text('th_' + j, tblX + 45 + j * colW, tblY + 12, f, { size: 12, weight: 700, color: PAL.dim }));
      for (let i = 0; i <= rows; i++) {
        const ry = tblY + 30 + i * 19;
        st.text('tr_lbl_' + i, tblX + 6, ry, 'i = ' + i, { size: 12, color: PAL.dim });
        facts.forEach((f, j) => st.text('tc_' + i + '_' + j, tblX + 45 + j * colW, ry, '—', { size: 12, color: PAL.dim }));
      }
      st.add('goal_box', 'rect', { x: 505, y: 214, width: 190, height: 116, rx: 7, fill: PAL.panel, stroke: PAL.grid });
      st.text('goal_th', 600, 232, '目标: { ' + prob.goal.join(', ') + ' }', { size: 12, weight: 700 });
      st.text('goal_mode', 600, 252, '模式: ' + (isAdd ? 'h_add (求和)' : 'h_max (取最大)'), { size: 12, color: modeCol });
      st.text('goal_eq', 600, 278, 'h = ?', { size: 15, weight: 700, color: modeCol });
      st.text('goal_sub', 600, 308, '松弛最优代价 h+ = ' + hPlus.cost, { size: 12, color: PAL.dim });

      const fv = v => numStr(v);
      const cellCol = (i, f) => (i > 0 && tables[i][f] !== tables[i - 1][f] ? PAL.yellow : tables[i][f] === 0 ? PAL.blue : tables[i][f] === Infinity ? PAL.dim : PAL.text);
      const rowSet = i => util.merge(...facts.map((f, j) => ({ ['tc_' + i + '_' + j + '.text']: fv(tables[i][f]), ['tc_' + i + '_' + j + '.color']: cellCol(i, f) })));
      const comb = vals => (vals.length > 1 ? (isAdd ? vals.join('+') : R`\max(` + vals.join(',') + ')') : String(vals[0]));
      const gloss = { 't(B)': '卡车能到 B', 't(C)': '卡车能到 C', 't(D)': '卡车能到 D', 'p(T)': '包裹装上车', 'p(D)': '包裹卸在 D' };
      const frames = [];

      const init = facts.filter(f => tables[0][f] === 0);
      frames.push({
        set: util.merge(...init.map(f => ({ ['val_' + keyOf(f) + '.text']: '0', ['val_' + keyOf(f) + '.color']: PAL.blue })), rowSet(0)),
        pulse: init.map(f => 'bg_' + keyOf(f)),
        cap: '初始状态：卡车在 A（$t(A)=0$），包裹在 C（$p(C)=0$）。其余事实还没达成，代价都是 $\\infty$。之后每一轮，用上一轮的值更新每个事实。',
        tex: two(R`T_{i+1}(g) = \min\Bigl(T_i(g),\ \min_{a:\, g\in add_a} c(a) + \htmlClass{fx-` + modeKey + R`}{C_i(pre_a)}\Bigr)`, R`\htmlClass{fx-` + modeKey + R`}{C_i(pre_a) = ` + (isAdd ? R`\sum_{q\in pre_a} T_i(q)` : R`\max_{q\in pre_a} T_i(q)`) + '}'),
        hl: [modeKey]
      });

      let lit = [];
      for (let i = 1; i <= rows; i++) {
        const changed = facts.filter(f => tables[i][f] !== tables[i - 1][f]);
        const acts = changed.map(f => bs[f]);
        const on = [].concat(...acts.map(a => arrowsOf[a] || []));
        const set = util.merge(rowSet(i), ...lit.map(id => ({ [id + '.stroke']: PAL.line })), ...on.map(id => ({ [id + '.stroke']: PAL.yellow })),
          ...changed.map(f => ({ ['val_' + keyOf(f) + '.text']: fv(tables[i][f]), ['val_' + keyOf(f) + '.color']: byName[bs[f]].pre.length > 1 ? modeCol : PAL.gold })));
        lit = on;
        const parts = changed.map(f => {
          const a = byName[bs[f]], pv = a.pre.map(q => tables[i - 1][q]);
          return '`' + a.name + '` 的前提 ' + a.pre.map((q, j) => '$' + q + '=' + fv(pv[j]) + '$').join('、') + ' 都已达成，$' + f + '=' + a.cost + '+' + comb(pv) + '=' + fv(tables[i][f]) + '$（' + gloss[f] + '）';
        });
        const joins = changed.filter(f => byName[bs[f]].pre.length > 1 && f === 'p(D)');
        let cap = '第 ' + i + ' 轮：' + parts.join('；') + '。';
        let tex;
        if (joins.length) {
          const a = byName[bs['p(D)']], pv = a.pre.map(q => tables[i - 1][q]), C = isAdd ? pv.reduce((s, v) => s + v, 0) : Math.max(...pv);
          cap += isAdd ? '在 $h_{add}$ 下两个前提的代价**相加**。' : '在 $h_{max}$ 下只取**最贵**的那个前提。';
          tex = two(R`C(pre_{\text{ul(D)}}) = ` + comb(pv) + ' = ' + C, R`T_{` + i + '}(p(D)) = ' + a.cost + ' + ' + C + R` = \htmlClass{fx-` + modeKey + '}{' + fv(tables[i]['p(D)']) + '}');
        }
        frames.push(Object.assign({ set, pulse: changed.map(f => 'bg_' + keyOf(f)), dur: 1100, cap, hl: [joins.length ? modeKey : 'min'] }, tex ? { tex } : {}));
      }

      // convergence
      const pD = bf.values['p(D)'];
      frames.push({
        set: util.merge(...lit.map(id => ({ [id + '.stroke']: PAL.line })), { 'goal_eq.text': (isAdd ? 'h_add' : 'h_max') + ' = ' + fv(hVal) }),
        pulse: ['goal_box'],
        dur: 900,
        cap: '第 ' + (tables.length - 1) + ' 轮：没有任何值再变，Bellman-Ford 收敛。合并目标 $\\{' + prob.goal.join(', ') + '\\}$：$t(A)=0$，$p(D)=' + fv(pD) + '$，' + (isAdd ? '求和' : '取最大') + '得 $' + hName + '=' + fv(hVal) + '$。',
        tex: R`\htmlClass{fx-h}{` + hName + '(I)} = ' + comb(prob.goal.map(g => bf.values[g])) + ' = ' + fv(hVal),
        hl: ['h']
      });

      // the reason: sub-plans of ul(D)'s two premises share the drives to C
      const ul = byName[bs['p(D)']], [pa, pb] = ul.pre;
      const ca = supportClosure(prob, bs, pa), cb = supportClosure(prob, bs, pb);
      const actIdx = a => prob.actions.findIndex(x => x.name === a), byIdx = (x, y) => actIdx(x) - actIdx(y);
      const shared = [...ca].filter(a => cb.has(a)).sort(byIdx), onlyB = [...cb].filter(a => !ca.has(a)).sort(byIdx);
      const plusTxt = hPlus.plan.map(n => '`' + n + '`').join('、');
      let finalSet, cap, tex, pulse;
      if (isAdd) {
        const over = hVal - hPlus.cost;
        finalSet = util.merge(...shared.map(a => util.merge(...arrowsOf[a].map(id => ({ [id + '.stroke']: PAL.red, [id + '.stroke-width']: 3.5 })), { ['bdg_' + aid(a) + '.text']: '×2', ['bdg_' + aid(a) + '.op']: 1 })),
          { 'goal_sub.text': '高估！比 h+ = ' + hPlus.cost + ' 多算了 ' + fv(over), 'goal_sub.color': PAL.red });
        pulse = shared.map(a => labelOf[a]).concat(['goal_box']);
        cap = '**为什么会多算？** $' + pa + '$ 和 $' + pb + '$ 背后的子计划都要先把卡车开到 C：' + shared.map(a => '`' + a + '`').join('、') + ' 在两边**各算了一次**。最优松弛计划只需 ' + plusTxt + '，$h^+=' + hPlus.cost + '$；$h_{add}=' + fv(hVal) + '$ 多出的 ' + fv(over) + ' 正是这段被重复计算的路。';
        tex = two(R`\htmlClass{fx-over}{h_{add}(I) = ` + fv(hVal) + R`} > \htmlClass{fx-h}{h^+ = ` + hPlus.cost + '}', R`\text{` + shared.join(', ') + R` 各算了两次}`);
      } else {
        finalSet = util.merge(...shared.map(a => util.merge(...arrowsOf[a].map(id => ({ [id + '.stroke']: PAL.blue, [id + '.stroke-width']: 3 })))),
          ...onlyB.map(a => util.merge(...arrowsOf[a].map(id => ({ [id + '.stroke']: PAL.red, [id + '.stroke-dasharray']: '4 3' })), { ['bdg_' + aid(a) + '.text']: '没算', ['bdg_' + aid(a) + '.op']: 1 })),
          { 'goal_sub.text': '偏乐观：h+ = ' + hPlus.cost + '，少算了 ' + fv(hPlus.cost - hVal), 'goal_sub.color': PAL.green });
        pulse = onlyB.map(a => labelOf[a]).concat(['goal_box']);
        cap = '**会不会太乐观？会。** `' + ul.name + '` 要 $' + pa + '$ 和 $' + pb + '$ 两个前提，各需 ' + fv(bf.values[pa]) + '，$h_{max}$ 只取 $\\max=' + fv(Math.max(bf.values[pa], bf.values[pb])) + '$，相当于假装另一个前提**顺带就有了**——' + onlyB.map(a => '`' + a + '`').join('、') + ' 没被算进去。' +
          '最优松弛计划要 ' + plusTxt + '，所以 $h_{max}=' + fv(hVal) + '\\le h^+=' + hPlus.cost + '\\le h^*=' + hStar + '$：从不高估（admissible），但偏低。';
        tex = R`\htmlClass{fx-min}{h_{max}(I) = ` + fv(hVal) + R`} \le \htmlClass{fx-h}{h^+ = ` + hPlus.cost + R`} \le \htmlClass{fx-h}{h^*(I) = ` + hStar + '}';
      }
      frames.push({ set: finalSet, pulse, dur: 1200, cap, tex, hl: [isAdd ? 'over' : 'min'] });
      return frames;
    }
  });

  /* ==========================================================================
   * 5. hill-landscape (a07: 局部搜索——hill-climbing 与 enforced hill-climbing)
   * ========================================================================== */
  RL.scene.register('hill-landscape', {
    title: '爬山法为什么会卡住，EHC 怎样跳出来',
    intro: '练习图（无向，每条边代价 1）：S–A、S–C、C–D、D–G 正好连成一条线。把它摊成一段地形：**地面高度 = $h$**（金色），橙色小球 = 当前状态。',
    w: 720,
    h: 380,
    colors: { h: SYM.h, h0: PAL.blue, hn: SYM.h, cost: PAL.orange, opt: PAL.green },
    build(st) {
      const P = RL.plan;
      const g = (RL.vizUtil && RL.vizUtil.PLAN_GRAPHS && RL.vizUtil.PLAN_GRAPHS.local && RL.vizUtil.PLAN_GRAPHS.local.g) || {
        nodes: { S: { h: 3 }, A: { h: 1 }, C: { h: 2 }, D: { h: 1 }, G: { h: 0 } },
        edges: [['S', 'A', 1], ['S', 'C', 1], ['C', 'D', 1], ['D', 'G', 1]], start: 'S', goals: ['G'], undirected: true
      };
      const hc = P.hillClimbing(g, 6), ehc = P.enforcedHillClimbing(g), opt = P.bestFirst(g, 'astar');
      const props = P.heuristicProperties(g);
      const ids = Object.keys(g.nodes), H = id => g.nodes[id].h, goal = g.goals[0], s0 = g.start;
      const nbrs = id => P.succ(g, id).map(k => k.to);
      // the graph is a path: lay it out left to right, starting from the end that is not the goal
      const ends = ids.filter(id => nbrs(id).length === 1);
      const order = [ends.find(id => id !== goal) || ends[0]];
      while (order.length < ids.length) { const nx = nbrs(order[order.length - 1]).find(id => !order.includes(id)); if (!nx) break; order.push(nx); }
      const X0 = 130, DX = 130, NX = {};
      order.forEach((id, i) => { NX[id] = X0 + i * DX; });
      const hMax = Math.max(...ids.map(H)), Y = h => 286 - 56 * h, BR = 12;
      // smooth ground: cosine interpolation between the nodes (flat where a state sits)
      const yAt = x => {
        const i = Math.max(0, Math.min(order.length - 2, Math.floor((x - X0) / DX))), t = clamp01((x - NX[order[i]]) / DX);
        const a = Y(H(order[i])), b = Y(H(order[i + 1]));
        return a + (b - a) * (1 - Math.cos(Math.PI * t)) / 2;
      };
      const XL = X0 - 18, XR = NX[order[order.length - 1]] + 18;
      const groundPts = (xa, xb, off) => { const out = [], n = Math.max(2, Math.round(Math.abs(xb - xa) / 4)); for (let i = 0; i <= n; i++) { const x = lerp(xa, xb, i / n); out.push([x, yAt(x) - off]); } return out; };
      const ptsD = pts => 'M ' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L ');
      const roll = seq => { // fn that rolls the ball along the ground through seq, easing every hop
        const seg = legs(seq.length - 1), xOf = q => { const [k, t] = seg(q); return lerp(NX[seq[k]], NX[seq[k + 1]], t); };
        return { 'ball.tx': xOf, 'ball.ty': q => yAt(xOf(q)) - BR };
      };
      const ballAt = id => ({ 'ball.tx': NX[id], 'ball.ty': Y(H(id)) - BR });

      // h axis and level lines
      st.add('axis', 'line', { x1: 78, y1: Y(0) + 8, x2: 78, y2: Y(hMax) - 18, stroke: PAL.line, 'stroke-width': 1.5 });
      st.text('axis_h', 78, Y(hMax) - 30, 'h', { size: 16, weight: 700, color: SYM.h });
      for (let v = 0; v <= hMax; v++) {
        st.add('lvl_' + v, 'line', { x1: 84, y1: Y(v), x2: XR + 22, y2: Y(v), stroke: PAL.grid, 'stroke-width': 1, 'stroke-dasharray': '2 5' });
        st.text('tick_' + v, 68, Y(v), String(v), { size: 13, color: SYM.h, anchor: 'end' });
      }
      const gp = groundPts(XL, XR, 0);
      st.add('ground_fill', 'path', { d: ptsD(gp) + ' L ' + XR + ' 340 L ' + XL + ' 340 Z', fill: '#1d222b' });
      st.add('ground', 'path', { d: ptsD(gp), fill: 'none', stroke: SYM.h, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });

      // BrFS rings, clipped to the air above the ground
      const clipId = 'hl-clip-' + Math.random().toString(36).slice(2, 9);
      st.add('ring_clip', 'clipPath', { id: clipId });
      st.add('ring_clip_p', 'path', { d: 'M 0 ' + yAt(XL).toFixed(1) + ' L ' + ptsD(gp).slice(2) + ' L 720 ' + yAt(XR).toFixed(1) + ' L 720 0 L 0 0 Z' }, 'ring_clip');
      st.group('rings', { 'clip-path': 'url(#' + clipId + ')' });
      const depthFrom = from => { const d = { [from]: 0 }, q = [from]; while (q.length) { const u = q.shift(); nbrs(u).forEach(v => { if (d[v] == null) { d[v] = d[u] + 1; q.push(v); } }); } return d; };
      const dist = (a, b) => Math.hypot(NX[a] - NX[b], Y(H(a)) - Y(H(b)));
      const ringR = {}, phaseDepth = ehc.phases.map(ph => depthFrom(ph.from));
      ehc.phases.forEach((ph, pi) => {
        const d = phaseDepth[pi], maxD = Math.max(...ph.order.map(id => d[id]));
        for (let k = 1; k <= maxD; k++) {
          ringR[pi + '_' + k] = Math.max(...ph.order.filter(id => d[id] === k).map(id => dist(ph.from, id)));
          st.add('ring' + pi + '_' + k, 'circle', { cx: NX[ph.from], cy: Y(H(ph.from)), r: 0, fill: 'none', stroke: PAL.teal, 'stroke-width': 2, op: 0 }, 'rings');
        }
      });

      // EHC routes (orange; a road driven a second time sits higher) and the optimal route (green)
      const pathIdx = [0];
      ehc.phases.forEach(ph => { const j = ehc.path.indexOf(ph.to, pathIdx[pathIdx.length - 1] + 1); pathIdx.push(j); });
      const ehcRoutes = ehc.phases.map((ph, k) => ehc.path.slice(pathIdx[k], pathIdx[k + 1] + 1));
      const edgeCount = {};
      const offsFor = seq => seq.slice(1).map((v, i) => { const e = [seq[i], v].sort().join('-'); edgeCount[e] = (edgeCount[e] || 0) + 1; return edgeCount[e] === 1 ? 9 : 17; });
      const routeD = (seq, offs) => { let pts = []; for (let i = 0; i + 1 < seq.length; i++) pts = pts.concat(groundPts(NX[seq[i]], NX[seq[i + 1]], offs[i])); return ptsD(pts); };
      ehcRoutes.forEach((seq, k) => st.add('route' + k, 'path', { d: routeD(seq, offsFor(seq)), stroke: PAL.orange, 'stroke-width': 3, 'stroke-linejoin': 'round', fill: 'none', op: 0, draw: 0 }));
      st.add('route_opt', 'path', { d: routeD(opt.path, opt.path.slice(1).map(() => 28)), stroke: PAL.green, 'stroke-width': 3, 'stroke-linejoin': 'round', fill: 'none', op: 0, draw: 0 });

      // states on the ground: name and h below, a badge above
      order.forEach(id => {
        const x = NX[id], y = Y(H(id)), isG = id === goal;
        st.add('dot_' + id, 'circle', { cx: x, cy: y, r: 6, fill: isG ? PAL.green : PAL.panel, stroke: isG ? PAL.green : PAL.text, 'stroke-width': 2 });
        st.text('nm_' + id, x, y + 24, id, { size: 16, weight: 700, color: isG ? PAL.green : PAL.text });
        st.text('hv_' + id, x, y + 43, 'h=' + H(id), { size: 13, weight: 600, color: SYM.h });
        st.text('bd_' + id, x, y - 44, '', { size: 13, weight: 700, op: 0 });
      });

      // HC "look" arrows: from the ball to each neighbour, bending upwards
      const lookPath = (from, to) => {
        const dir = Math.sign(NX[to] - NX[from]), x1 = NX[from] + dir * 10, y1 = Y(H(from)) - 30, x2 = NX[to] - dir * 4, y2 = Y(H(to)) - 24, bend = -dir * 30;
        const L = Math.hypot(x2 - x1, y2 - y1), cx = (x1 + x2) / 2 - (y2 - y1) / L * bend, cy = (y1 + y2) / 2 + (x2 - x1) / L * bend;
        return { d: util.curve(x1, y1, x2, y2, bend, 8), lx: 0.25 * x1 + 0.5 * cx + 0.25 * x2, ly: 0.25 * y1 + 0.5 * cy + 0.25 * y2 - 12 };
      };
      const look = (name, from, to, col, label) => {
        const lp = lookPath(from, to);
        st.add(name, 'path', { d: lp.d, stroke: col, 'stroke-width': 2.2, fill: 'none', op: 0, draw: 0 });
        st.text(name + '_t', lp.lx, lp.ly, label, { size: 13, weight: 700, color: col, op: 0 });
      };
      const t0 = hc.trace[0], t1 = hc.trace[1];
      t0.options.forEach(o => look('look_' + o.s, s0, o.s, o.s === t0.to ? PAL.green : PAL.dim, 'h=' + o.h + (o.s === t0.to ? ' 最小' : '')));
      t1.options.forEach(o => look('back_' + o.s, t1.at, o.s, PAL.red, 'h=' + o.h + '，唯一的邻居'));
      // the S <-> A loop
      const [la, lb] = [t1.at, t1.to];
      st.add('loop1', 'path', { d: util.curve(NX[lb] - 16, Y(H(lb)) - 40, NX[la] + 10, Y(H(la)) - 34, 34, 8), stroke: PAL.red, 'stroke-width': 2.2, fill: 'none', op: 0, draw: 0 });
      st.add('loop2', 'path', { d: util.curve(NX[la] + 22, Y(H(la)) - 24, NX[lb] - 24, Y(H(lb)) - 22, 10, 8), stroke: PAL.red, 'stroke-width': 2.2, fill: 'none', op: 0, draw: 0 });
      st.text('loop_t', (NX[la] + NX[lb]) / 2 - 22, Math.min(Y(H(la)), Y(H(lb))) - 34, lb + ' ↔ ' + la + ' 永远来回', { size: 14, weight: 700, color: PAL.red, op: 0 });

      // threshold of improve(σ): "find a state below this line"
      st.group('thr', { tx: 0, ty: Y(H(s0)), op: 0 });
      st.add('thr_line', 'line', { x1: 84, y1: 0, x2: XR + 22, y2: 0, stroke: PAL.blue, 'stroke-width': 2, 'stroke-dasharray': '7 5' }, 'thr');
      st.text('thr_lbl', XR - 46, -12, 'h(σ) = ' + H(s0), { size: 13, weight: 700, color: PAL.blue, anchor: 'end', parent: 'thr' });

      // status line, cost, BrFS order chips, legend and conclusion panel
      st.text('algo', 24, 24, 'Hill-climbing（HC）', { size: 15, weight: 700, anchor: 'start' });
      st.text('trail', 24, 48, '', { size: 13, color: PAL.dim, anchor: 'start' });
      st.num('cost', 700, 24, 0, { digits: 0, prefix: '路线代价 ', size: 15, weight: 700, color: PAL.orange, anchor: 'end', op: 0 });
      st.text('bfs_title', 24, 361, 'BrFS 检查顺序：', { size: 13, color: PAL.dim, anchor: 'start', op: 0 });
      const maxOrder = Math.max(...ehc.phases.map(ph => ph.order.length));
      for (let k = 0; k < maxOrder; k++) {
        st.group('chip' + k, { tx: 176 + k * 88, ty: 361, op: 0 });
        st.add('chipr' + k, 'rect', { x: -40, y: -14, width: 80, height: 28, rx: 6, fill: PAL.panel, stroke: PAL.grid, 'stroke-width': 1.2 }, 'chip' + k);
        st.text('chipt' + k, 0, 1, '', { size: 13, weight: 650, parent: 'chip' + k });
      }
      st.text('leg_ehc', 700, 50, 'EHC：' + ehc.path.join('→') + '，代价 ' + ehc.cost, { size: 13, weight: 650, color: PAL.orange, anchor: 'end', op: 0 });
      st.text('leg_opt', 700, 72, '最优（A*）：' + opt.path.join('→') + '，代价 ' + opt.cost, { size: 13, weight: 650, color: PAL.green, anchor: 'end', op: 0 });
      const noDead = ids.every(id => props.hStar[id] < Infinity), posOff = ids.every(id => g.goals.includes(id) || H(id) > 0);
      const hs = ehc.phases.map(ph => ph.h0).concat([H(goal)]);
      st.group('concl', { op: 0 });
      st.add('concl_bg', 'rect', { x: 420, y: 38, width: 280, height: 90, rx: 8, fill: PAL.panel, stroke: PAL.grid }, 'concl');
      [(noDead ? '✔' : '✘') + ' 没有死路：每个状态都能到 ' + goal,
        (props.goalAware ? '✔' : '✘') + ' h goal-aware：h(' + goal + ') = ' + H(goal),
        (posOff ? '✔' : '✘') + ' 非目标状态的 h > 0',
        '⇒ improve 次次成功，h：' + hs.join(' → ')].forEach((line, i) =>
        st.text('concl' + i, 434, 56 + i * 20, line, { size: 13, weight: i === 3 ? 700 : 500, color: i === 3 ? PAL.blue : PAL.text, anchor: 'start', parent: 'concl' }));

      st.group('ball', { tx: NX[s0], ty: Y(H(s0)) - BR });
      st.add('ball_c', 'circle', { cx: 0, cy: 0, r: BR, fill: PAL.orange, stroke: '#ffffff', 'stroke-width': 1.5 }, 'ball');

      const frames = [];
      const hcTex = R`\text{HC}:\ s \leftarrow \arg\min_{s'\in succ(s)} \htmlClass{fx-h}{h(s')}`;
      const impTex = R`\text{improve}(\sigma):\ \text{BrFS 直到 }\htmlClass{fx-hn}{h(\sigma')} < \htmlClass{fx-h0}{h(\sigma)}`;
      frames.push({
        cap: '把练习图摊成一段地形：从左到右 ' + order.join('–') + ' 正好就是图里的边，每走一格代价 1；**地面高度就是 $h$**。橙色小球是当前状态 $' + s0 + '$（$h=' + H(s0) + '$），目标 $' + goal + '$ 在最低处（$h=' + H(goal) + '$）。'
      });
      // HC: look at the neighbours, take the lowest
      frames.push({
        set: util.merge(...t0.options.map(o => ({ ['look_' + o.s + '.op']: 1, ['look_' + o.s + '.draw']: 1, ['look_' + o.s + '_t.op']: 1 }))),
        timing: util.merge(...t0.options.map((o, i) => ({ ['look_' + o.s]: [0.1 * i, 0.6 + 0.1 * i], ['look_' + o.s + '_t']: [0.5 + 0.1 * i, 0.9 + 0.1 * i] }))),
        pulse: ['hv_' + t0.to],
        dur: 1100,
        cap: '**Hill-climbing** 每步只看**邻居**，走到 $h$ 最小的那个：$' + s0 + '$ 的邻居是 ' + t0.options.map(o => '$' + o.s + '$（$h=' + o.h + '$）').join('、') + '，最小的是 $' + t0.to + '$。',
        tex: hcTex, hl: ['h']
      });
      frames.push({
        set: util.merge(ballAt(t0.to), ...t0.options.map(o => ({ ['look_' + o.s + '.op']: 0, ['look_' + o.s + '_t.op']: 0 })), { 'trail.text': 'HC 走过：' + hc.path.slice(0, 2).join(' → ') }),
        fn: roll([s0, t0.to]),
        timing: util.merge(...t0.options.map(o => ({ ['look_' + o.s]: [0, 0.3], ['look_' + o.s + '_t']: [0, 0.3] }))),
        dur: 1100,
        cap: '小球滚到 $' + t0.to + '$，$h$ 从 ' + H(s0) + ' 降到 ' + H(t0.to) + '——看起来进展不错。'
      });
      frames.push({
        set: util.merge(ballAt(t1.to), ...t1.options.map(o => ({ ['back_' + o.s + '.op']: 1, ['back_' + o.s + '.draw']: 1, ['back_' + o.s + '_t.op']: 1 })), { 'trail.text': 'HC 走过：' + hc.path.slice(0, 3).join(' → ') }),
        fn: roll([t1.at, t1.to]),
        timing: util.merge({ ball: [0.4, 1] }, ...t1.options.map(o => ({ ['back_' + o.s]: [0, 0.35], ['back_' + o.s + '_t']: [0.2, 0.4] }))),
        dur: 1500,
        cap: '但 $' + t1.at + '$ 的邻居只有 $' + t1.to + '$（$h=' + H(t1.to) + '$）。HC **不管它是否比现在好**，照样走 $h$ 最小的邻居——只好爬回 $' + t1.to + '$。',
        tex: two(hcTex, R`\text{哪怕比当前的 }\htmlClass{fx-h}{h(s)}\text{ 还大}`), hl: ['h']
      });
      const loopSeq = hc.path.slice(2);
      frames.push({
        set: util.merge(ballAt(loopSeq[loopSeq.length - 1]), ...t1.options.map(o => ({ ['back_' + o.s + '.op']: 0, ['back_' + o.s + '_t.op']: 0 })),
          { 'loop1.op': 1, 'loop1.draw': 1, 'loop2.op': 1, 'loop2.draw': 1, 'loop_t.op': 1, 'trail.text': 'HC 走过：' + hc.path.join(' → ') + ' → …（' + (hc.found ? '到达' : '到不了 ' + goal) + '）' }),
        fn: roll(loopSeq),
        timing: util.merge({ loop1: [0, 0.3], loop2: [0.15, 0.45], loop_t: [0.3, 0.5] }, ...t1.options.map(o => ({ ['back_' + o.s]: [0, 0.2], ['back_' + o.s + '_t']: [0, 0.2] }))),
        pulse: ['dot_' + t0.to],
        dur: 3200,
        cap: '**卡住了**：回到 $' + t1.to + '$ 又会选 $' + t0.to + '$，于是 $' + loopSeq.slice(0, 4).join(R`\to `) + R`\to\cdots$` + ' 永远来回。$' + t0.to + '$ 是**局部最小值**：周围没有更低的点，可真正的目标 $' + goal + '$ 在另一边。HC 不完备。'
      });

      // EHC phase 1: improve(S)
      const ph0 = ehc.phases[0], ph1 = ehc.phases[1];
      const chipTxt = (id, h0) => id + '  ' + H(id) + (H(id) < h0 ? ' ✔' : ' ✘');
      const chipSet = (ph, k) => ({ ['chip' + k + '.op']: 1, ['chipt' + k + '.text']: chipTxt(ph.order[k], ph.h0), ['chipt' + k + '.color']: H(ph.order[k]) < ph.h0 ? PAL.green : PAL.red, ['chipr' + k + '.stroke']: H(ph.order[k]) < ph.h0 ? PAL.green : PAL.grid });
      const badge = (id, h0) => ({ ['bd_' + id + '.op']: 1, ['bd_' + id + '.text']: H(id) + (H(id) < h0 ? ' < ' : H(id) === h0 ? ' = ' : ' > ') + h0 + (H(id) < h0 ? ' ✔' : ' ✘'), ['bd_' + id + '.color']: H(id) < h0 ? PAL.green : PAL.red });
      const ringsOf = pi => Object.keys(ringR).filter(k => k.startsWith(pi + '_')).map(k => +k.split('_')[1]);
      const sameLayer = ph0.order.length - 1 < Object.keys(phaseDepth[0]).filter(id => phaseDepth[0][id] === phaseDepth[0][ph0.to]).length;
      frames.push({
        set: util.merge(
          { 'algo.text': 'Enforced hill-climbing（EHC）', 'trail.text': '', 'loop1.op': 0, 'loop2.op': 0, 'loop_t.op': 0, 'thr.op': 1, 'bfs_title.op': 1, 'cost.op': 1, 'cost.num': 0 },
          ...ph0.order.map((id, k) => chipSet(ph0, k)),
          ...ringsOf(0).map(k => ({ ['ring0_' + k + '.op']: 0.8, ['ring0_' + k + '.r']: ringR['0_' + k] })),
          badge(ph0.to, ph0.h0)),
        timing: util.merge({ loop1: [0, 0.2], loop2: [0, 0.2], loop_t: [0, 0.2], thr: [0.05, 0.3], bfs_title: [0.1, 0.3], cost: [0.1, 0.3], chip0: [0.25, 0.4], chipt0: [0.25, 0.4], chipr0: [0.25, 0.4] },
          ...ringsOf(0).map(k => ({ ['ring0_' + k]: [0.35, 0.75] })),
          ...ph0.order.slice(1).map((id, j) => ({ ['chip' + (j + 1)]: [0.72, 0.88], ['chipt' + (j + 1)]: [0.72, 0.88], ['chipr' + (j + 1)]: [0.72, 0.88] })),
          { ['bd_' + ph0.to]: [0.72, 0.9] }),
        pulse: ['dot_' + ph0.to],
        dur: 2200,
        cap: '**EHC 卡住时不只看邻居**。improve($' + ph0.from + '$) 从 $' + ph0.from + '$ 做广度优先搜索（BrFS），一层层往外找，直到碰到 $h$ **严格小于** $h(' + ph0.from + ')=' + ph0.h0 + '$ 的状态——蓝色虚线以下。$' + ph0.from + '$ 自己不算；第一层先检查 $' + ph0.to + '$，$' + H(ph0.to) + '<' + ph0.h0 + '$，找到了' + (sameLayer ? '，同一层的其余状态不用再看' : '') + '。',
        tex: impTex, hl: ['hn', 'h0']
      });
      frames.push({
        set: util.merge(ballAt(ph0.to), { 'route0.op': 1, 'route0.draw': 1, 'thr.ty': Y(ph1.h0), 'thr_lbl.text': 'h(σ) = ' + ph1.h0, 'cost.num': ehcRoutes[0].length - 1, 'trail.text': 'EHC 走过：' + ehcRoutes[0].join(' → '), ['bd_' + ph0.to + '.op']: 0 },
          ...ringsOf(0).map(k => ({ ['ring0_' + k + '.op']: 0 })), ...ph0.order.map((id, k) => ({ ['chip' + k + '.op']: 0 }))),
        fn: roll(ehcRoutes[0]),
        timing: util.merge({ ball: [0.1, 0.75], route0: [0.1, 0.75], cost: [0.1, 0.75], thr: [0.65, 1], thr_lbl: [0.65, 1], ['bd_' + ph0.to]: [0, 0.25] },
          ...ringsOf(0).map(k => ({ ['ring0_' + k]: [0, 0.3] })), ...ph0.order.map((id, k) => ({ ['chip' + k]: [0, 0.3] }))),
        dur: 1500,
        cap: '跳到 $' + ph0.to + '$，路线代价 ' + (ehcRoutes[0].length - 1) + '。蓝线降到新的门槛 $h(' + ph1.from + ')=' + ph1.h0 + '$：下一次要找比 ' + ph1.h0 + ' 还低的点。'
      });
      // EHC phase 2: the BrFS ripples out from A, ring by ring
      const d1 = phaseDepth[1], rings1 = ringsOf(1), RW = 0.8 / Math.max(1, rings1.length);
      const tim7 = { chip0: [0, 0.08], chipt0: [0, 0.08], chipr0: [0, 0.08] };
      rings1.forEach((k, i) => {
        const a = 0.08 + RW * i, b = a + RW;
        tim7['ring1_' + k] = [a, b];
        ph1.order.forEach((id, j) => { if (d1[id] === k) { const w = [b - 0.05, Math.min(1, b + 0.05)]; tim7['chip' + j] = w; tim7['chipt' + j] = w; tim7['chipr' + j] = w; tim7['bd_' + id] = w; } });
      });
      const tie = ph1.order.filter(id => id !== ph1.from && H(id) === ph1.h0);
      frames.push({
        set: util.merge(...ph1.order.map((id, k) => chipSet(ph1, k)), ...rings1.map(k => ({ ['ring1_' + k + '.op']: 0.6, ['ring1_' + k + '.r']: ringR['1_' + k] })),
          ...ph1.order.filter(id => id !== ph1.from).map(id => badge(id, ph1.h0))),
        timing: tim7,
        pulse: ['dot_' + ph1.to],
        dur: 4200,
        cap: '**improve($' + ph1.from + '$) 的 BrFS 一圈圈往外扩**：' + ph1.order.filter(id => id !== ph1.from && H(id) > ph1.h0).map(id => '$' + id + '$（' + H(id) + '）').join('、') + ' 都在虚线上方；' +
          (tie.length ? tie.map(id => '$' + id + '$').join('、') + ' 的 $h=' + ph1.h0 + '$ 正好**压在线上，不是严格更小**；' : '') +
          '直到第 ' + d1[ph1.to] + ' 层的 $' + ph1.to + '$（$h=' + H(ph1.to) + '$）才满足。邻居全都更高也没关系：BrFS 越过了 $' + t1.to + '$ 这座山。',
        tex: impTex, hl: ['hn', 'h0']
      });
      const seq2 = ehcRoutes[1];
      const seg2 = legs(seq2.length - 1), c0 = ehcRoutes[0].length - 1;
      frames.push({
        set: util.merge(ballAt(ph1.to), { 'route1.op': 1, 'route1.draw': 1, 'cost.num': ehc.cost, 'thr.op': 0, 'bfs_title.op': 0, 'trail.text': 'EHC 走过：' + ehc.path.join(' → ') },
          ...rings1.map(k => ({ ['ring1_' + k + '.op']: 0 })), ...ph1.order.map((id, k) => ({ ['chip' + k + '.op']: 0 })), ...ph1.order.map(id => ({ ['bd_' + id + '.op']: 0 }))),
        fn: util.merge(roll(seq2), { 'cost.num': q => { const [k, t] = seg2(q); return c0 + k + t; }, 'route1.draw': q => { const [k, t] = seg2(q); return (k + t) / (seq2.length - 1); } }),
        timing: util.merge({ ball: [0.1, 1], route1: [0.1, 1], cost: [0.1, 1], thr: [0, 0.2], bfs_title: [0, 0.2] },
          ...rings1.map(k => ({ ['ring1_' + k]: [0, 0.2] })), ...ph1.order.map((id, k) => ({ ['chip' + k]: [0, 0.2], ['bd_' + id]: [0, 0.2] }))),
        pulse: ['dot_' + goal],
        dur: 3400,
        cap: '沿 BrFS 找到的那条路 $' + seq2.join(R`\to `) + '$ 走过去（先爬回 $' + seq2[1] + '$ 再下山），到达目标。EHC 的完整路线 $' + ehc.path.join(R`\to `) + '$，代价 ' + ehc.cost + '。',
        tex: R`\text{EHC 路线代价} = \htmlClass{fx-cost}{` + ehc.cost + '}', hl: ['cost']
      });
      frames.push({
        set: { 'route_opt.op': 1, 'route_opt.draw': 1, 'leg_ehc.op': 1, 'leg_opt.op': 1 },
        timing: { route_opt: [0, 0.7], leg_ehc: [0, 0.3], leg_opt: [0.5, 0.8] },
        dur: 1400,
        cap: 'EHC 找到了解，但**不是最优**：开头的 $' + ehc.path.slice(0, 3).join(R`\to `) + '$ 白走了 ' + (ehc.cost - opt.cost) + ' 步。A\\* 在这张图上找到 $' + opt.path.join(R`\to `) + '$，代价 ' + opt.cost + '。',
        tex: R`\htmlClass{fx-cost}{\text{EHC} = ` + ehc.cost + R`}\ >\ \htmlClass{fx-opt}{h^*(` + s0 + ') = ' + opt.cost + '}', hl: ['cost', 'opt']
      });
      frames.push({
        set: { 'leg_ehc.op': 0, 'leg_opt.op': 0, 'concl.op': 1 },
        timing: { leg_ehc: [0, 0.3], leg_opt: [0, 0.3], concl: [0.3, 0.8] },
        pulse: ['concl_bg'],
        dur: 1200,
        cap: '**结论**：这里 EHC 一定能到目标——没有死路，$h$ goal-aware 且非目标处 $h>0$，所以目标的 $h=0$ 总比当前小，BrFS 迟早找到更低的点；$h$ 每次严格下降（' + hs.join('→') + '），状态有限，最后停在目标。但 improve 只找“最近的更低点”，不管整条路多长，所以**不最优**。',
        tex: two(impTex, R`\htmlClass{fx-h0}{h}:\ ` + hs.join(R`\to `) + R`\ \text{（严格下降）}`), hl: ['hn', 'h0']
      });
      return frames;
    }
  });

  /* ==========================================================================
   * 6. hff-extract (a11: 松弛计划 h_FF 与 helpful actions)
   * ========================================================================== */
  RL.scene.register('hff-extract', {
    title: 'h_FF：从目标倒推，共享的动作只算一次',
    intro: 'Logistics（课件 W5）：卡车在 A，包裹在 C，直线 A–B–C–D，动作代价都是 1。左边是事实（方框）和它们的最佳支持者（圆角小框）；右边是倒推时的 Open、Closed 和收集到的动作集合 RPlan。',
    w: 720,
    h: 380,
    colors: { bs: PAL.teal, ff: PAL.green, add: SYM.h, open: SYM.open, closed: SYM.closed, help: PAL.orange },
    build(st) {
      const P = RL.plan, prob = P.logistics(['t(A)', 'p(D)']);
      const ff = P.hFF(prob, 'add'), bs = ff.bs, vals = ff.bf.values, hAdd = ff.bf.h, steps = ff.steps, plan = ff.plan;
      const hPlus = P.optimalCost(prob, true).cost;
      const sSet = new Set(prob.init), byName = {};
      prob.actions.forEach(a => { byName[a.name] = a; });
      const fid = f => f.replace(/\W/g, ''), aidOf = a => a.replace(/\W/g, '');

      // layout of the fact layer (facts as boxes, best supporters as small chips between them)
      const FP = { 't(A)': [55, 92], 't(B)': [165, 92], 't(C)': [275, 92], 't(D)': [385, 92], 'p(C)': [160, 172], 'p(T)': [275, 252], 'p(D)': [385, 332] };
      const AP = { 'dr(A,B)': [110, 34], 'dr(B,C)': [220, 34], 'dr(C,D)': [330, 34], 'lo(C)': [275, 172], 'ul(D)': [385, 252] };
      const FW = 35, FH = 16, AW = 31, AH = 12;
      const facts = Object.keys(FP), drawnActs = facts.filter(f => bs[f] && AP[bs[f]]).map(f => bs[f]);
      const edge = (cx, cy, hw, hh, dx, dy) => { const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity); return [cx + dx * t, cy + dy * t]; };
      const boxArrow = (from, fw, fh, to, tw, th) => {
        const dx = to[0] - from[0], dy = to[1] - from[1];
        const [x1, y1] = edge(from[0], from[1], fw + 2, fh + 2, dx, dy), [x2, y2] = edge(to[0], to[1], tw + 3, th + 3, -dx, -dy);
        return util.arrow(x1, y1, x2, y2, 7);
      };
      const arrowsOf = {};
      drawnActs.forEach(an => {
        const a = byName[an], ap = AP[an], ids = [];
        a.pre.forEach((p, j) => { if (!FP[p]) return; const id = 'ar_' + aidOf(an) + '_' + j; ids.push(id); st.add(id, 'path', { d: boxArrow(FP[p], FW, FH, ap, AW, AH), stroke: PAL.line, 'stroke-width': 1.6, fill: 'none' }); });
        a.add.forEach((q, j) => { if (!FP[q] || bs[q] !== an) return; const id = 'ar_' + aidOf(an) + '_o' + j; ids.push(id); st.add(id, 'path', { d: boxArrow(ap, AW, AH, FP[q], FW, FH), stroke: PAL.line, 'stroke-width': 1.6, fill: 'none' }); });
        arrowsOf[an] = ids;
      });
      drawnActs.forEach(an => {
        const [x, y] = AP[an], k = aidOf(an);
        st.add('ac_' + k, 'rect', { x: x - AW, y: y - AH, width: 2 * AW, height: 2 * AH, rx: 11, fill: PAL.panel, stroke: PAL.line, 'stroke-width': 1.4, 'stroke-dasharray': '3 2' });
        st.text('act_' + k, x, y + 1, an, { size: 12, weight: 600, color: PAL.dim });
        st.text('x2_' + k, x + AW + 14, y - 8, '×2', { size: 13, weight: 700, color: PAL.red, op: 0 });
      });
      facts.forEach(f => {
        const [x, y] = FP[f], k = fid(f), inS = sSet.has(f), isGoal = prob.goal.includes(f);
        st.add('fc_' + k, 'rect', { x: x - FW, y: y - FH, width: 2 * FW, height: 2 * FH, rx: 6, fill: inS ? '#1b2d3d' : PAL.panel, stroke: isGoal ? PAL.green : PAL.grid, 'stroke-width': isGoal ? 2.2 : 1.4 });
        st.text('fl_' + k, x - 10, y + 1, f, { size: 13, weight: 650, color: isGoal ? PAL.green : PAL.text });
        st.text('fv_' + k, x + 23, y + 1, numStr(vals[f]), { size: 13, weight: 700, color: SYM.h });
      });
      st.text('note', 18, 368, '蓝底 = 当前状态 s 里已有    绿框 = 目标    金色 = h_add 值', { size: 12, color: PAL.dim, anchor: 'start' });

      // right panel: Open, Closed, RPlan
      st.add('divider', 'line', { x1: 450, y1: 14, x2: 450, y2: 368, stroke: PAL.line, 'stroke-width': 1, 'stroke-dasharray': '4 4' });
      const head = (name, y, title, col, desc, dx) => {
        st.text(name, 464, y, title, { size: 14, weight: 700, color: col, anchor: 'start' });
        st.text(name + '_d', 464 + dx, y, desc, { size: 12, color: PAL.dim, anchor: 'start' });
      };
      head('h_open', 30, 'Open', SYM.open, '待处理的子目标', 46);
      head('h_closed', 112, 'Closed', SYM.closed, '已处理', 58);
      head('h_rp', 178, 'RPlan', PAL.green, '集合：每个动作只记一次', 50);
      st.text('shared_note', 464, 88, '', { size: 12, weight: 700, color: PAL.yellow, anchor: 'start', op: 0 });
      const openXY = k => [492 + k * 54, 60], closedXY = k => [489 + k * 49, 140], rpXY = k => [500, 204 + k * 25];
      const TOK = { open: ['#2b1f12', SYM.open], closed: ['#1a2736', SYM.closed] };
      const everOpen = [...new Set(prob.goal.filter(g => !sSet.has(g)).concat(...steps.map(s => s.newOpen)))];
      everOpen.forEach(f => {
        const k = fid(f);
        st.group('tok_' + k, { tx: FP[f][0], ty: FP[f][1], op: 0 });
        st.add('tokr_' + k, 'rect', { x: -23, y: -13, width: 46, height: 26, rx: 6, fill: TOK.open[0], stroke: TOK.open[1], 'stroke-width': 1.6 }, 'tok_' + k);
        st.text('tokt_' + k, 0, 1, f, { size: 12, weight: 650, parent: 'tok_' + k });
      });
      plan.forEach((an, k) => {
        const from = AP[an] || [400, 300];
        st.group('rp_' + k, { tx: from[0], ty: from[1], op: 0 });
        st.add('rpr_' + k, 'rect', { x: -32, y: -11, width: 64, height: 22, rx: 11, fill: '#1e3823', stroke: PAL.green, 'stroke-width': 1.4 }, 'rp_' + k);
        st.text('rpt_' + k, 0, 1, an, { size: 12, weight: 650, parent: 'rp_' + k });
        st.text('rpc_' + k, 42, 1, '+' + numStr(byName[an].cost), { size: 12, color: PAL.dim, anchor: 'start', parent: 'rp_' + k });
      });
      st.tex('ff_tex', 556, 336, R`h_{FF}=\sum c(a)=`, { w: 170, h: 30, size: 17, color: PAL.green, op: 0 });
      st.num('ff_val', 624, 337, 0, { digits: 0, size: 19, weight: 700, color: PAL.green, anchor: 'start', op: 0 });
      st.tex('add_tex', 534, 364, R`h_{add}=` + numStr(hAdd), { w: 170, h: 28, size: 17, color: SYM.h, op: 0 });

      const tokAt = (f, xy, kind) => ({ ['tok_' + fid(f) + '.tx']: xy[0], ['tok_' + fid(f) + '.ty']: xy[1], ['tok_' + fid(f) + '.op']: 1, ['tokr_' + fid(f) + '.fill']: TOK[kind][0], ['tokr_' + fid(f) + '.stroke']: TOK[kind][1] });
      const frames = [];
      const ul = byName[bs[prob.goal.find(g => !sSet.has(g))]];
      frames.push({
        cap: '卡车在 A、包裹在 C，目标 $\\{' + prob.goal.join(', ') + '\\}$。金色数字是每个事实的 $h_{add}$ 值，例如 $p(D)=' + ul.cost + '+' + ul.pre.map(q => numStr(vals[q])).join('+') + '=' + numStr(vals['p(D)']) + '$：两边的 ' + numStr(vals[ul.pre[0]]) + ' 里都含“把卡车开到 C”的那两步。',
        tex: two(R`\htmlClass{fx-add}{h_{add}(p(D))} = ` + ul.cost + ' + ' + ul.pre.map(q => R`h(` + q + ')').join(' + '), '= ' + ul.cost + ' + ' + ul.pre.map(q => numStr(vals[q])).join(' + ') + ' = ' + numStr(vals['p(D)'])),
        hl: ['add']
      });
      // best supporters: for one fact with several achievers, show why the cheaper one wins
      const ex = facts.find(f => !sSet.has(f) && prob.actions.filter(a => a.add.includes(f)).length > 1);
      const alt = prob.actions.filter(a => a.add.includes(ex) && a.name !== bs[ex]).map(a => ({ a, v: a.cost + a.pre.reduce((t, q) => t + vals[q], 0) })).sort((x, y) => x.v - y.v)[0];
      const win = byName[bs[ex]], winV = win.cost + win.pre.reduce((t, q) => t + vals[q], 0);
      frames.push({
        set: util.merge(...drawnActs.map(an => ({ ['ac_' + aidOf(an) + '.stroke']: PAL.teal, ['ac_' + aidOf(an) + '.stroke-dasharray']: 'none', ['act_' + aidOf(an) + '.color']: PAL.teal })),
          ...drawnActs.map(an => util.merge(...arrowsOf[an].map(id => ({ [id + '.stroke']: '#3f7f73' }))))),
        timing: util.merge(...drawnActs.map((an, i) => { const w = [i * 0.12, i * 0.12 + 0.4]; return util.merge({ ['ac_' + aidOf(an)]: w, ['act_' + aidOf(an)]: w }, ...arrowsOf[an].map(id => ({ [id]: w }))); })),
        dur: 1500,
        cap: '每个事实挑一个**最佳支持者** $bs(p)$：在能达成它的动作里，选 $c(a)+h(pre_a)$ 最小的那个。比如 $' + ex + '$ 也能由 `' + alt.a.name + '` 达成，但 $' + alt.a.cost + '+h(' + alt.a.pre.join(')+h(') + ')=' + numStr(alt.v) + '>' + win.cost + '+h(' + win.pre.join(')+h(') + ')=' + numStr(winV) + '$，所以 $bs(' + ex + ')=$ `' + win.name + '`。图里只画出这些最佳支持者。',
        tex: R`\htmlClass{fx-bs}{bs(p)=\arg\min_{a:\,p\in add_a}\ c(a)+h(pre_a)}`,
        hl: ['bs']
      });
      const open0 = prob.goal.filter(g => !sSet.has(g)), inGoalS = prob.goal.filter(g => sSet.has(g));
      frames.push({
        set: util.merge(...open0.map((f, k) => tokAt(f, openXY(k), 'open')), { 'ff_tex.op': 1, 'ff_val.op': 1, 'ff_val.num': 0, 'note.text': '目标里的 ' + inGoalS.join('、') + ' 已在 s 中，不用管' }),
        timing: util.merge(...open0.map(f => ({ ['tok_' + fid(f)]: [0.2, 0.8] })), { ff_tex: [0.6, 1], ff_val: [0.6, 1] }),
        pulse: inGoalS.map(f => 'fc_' + fid(f)).concat(open0.map(f => 'fc_' + fid(f))),
        dur: 1300,
        cap: '**从目标倒推。** 目标里的 ' + inGoalS.map(f => '$' + f + '$').join('、') + ' 已经在 $s$ 中，不用管；只把 ' + open0.map(f => '$' + f + '$').join('、') + ' 放进 Open。RPlan 先是空集。',
        tex: R`\htmlClass{fx-open}{\text{Open}} := G\setminus s = \{` + open0.join(', ') + R`\},\qquad \htmlClass{fx-ff}{\text{RPlan}} := \emptyset`,
        hl: ['open']
      });

      // one frame per extraction step
      const closed = [];
      let costSoFar = 0, prevShared = null;
      steps.forEach((s, i) => {
        const a = byName[s.action], openBefore = i === 0 ? open0 : steps[i - 1].open;
        const k = plan.indexOf(s.action), set = {}, timing = {}, pulse = [];
        closed.push(s.goal);
        Object.assign(set, tokAt(s.goal, closedXY(closed.length - 1), 'closed'), { ['fc_' + fid(s.goal) + '.stroke']: SYM.closed, ['fc_' + fid(s.goal) + '.stroke-width']: 2.4 });
        timing['tok_' + fid(s.goal)] = [0, 0.35]; timing['tokr_' + fid(s.goal)] = [0.15, 0.35]; timing['fc_' + fid(s.goal)] = [0.2, 0.4];
        if (prevShared) { set['tokr_' + fid(prevShared) + '.stroke'] = closed.includes(prevShared) ? TOK.closed[1] : TOK.open[1]; set['tokr_' + fid(prevShared) + '.stroke-width'] = 1.6; }
        if (AP[s.action]) {
          Object.assign(set, { ['ac_' + aidOf(s.action) + '.fill']: '#1e3823', ['ac_' + aidOf(s.action) + '.stroke']: PAL.green, ['act_' + aidOf(s.action) + '.color']: PAL.text },
            ...arrowsOf[s.action].map(id => ({ [id + '.stroke']: PAL.green, [id + '.stroke-width']: 2.4 })));
          timing['ac_' + aidOf(s.action)] = [0.3, 0.55]; timing['act_' + aidOf(s.action)] = [0.3, 0.55];
          arrowsOf[s.action].forEach(id => { timing[id] = [0.3, 0.55]; });
          pulse.push('ac_' + aidOf(s.action));
        }
        costSoFar += a.cost;
        Object.assign(set, { ['rp_' + k + '.tx']: rpXY(k)[0], ['rp_' + k + '.ty']: rpXY(k)[1], ['rp_' + k + '.op']: 1, 'ff_val.num': costSoFar });
        timing['rp_' + k] = [0.35, 0.7]; timing['ff_val'] = [0.6, 0.75];
        s.open.forEach((f, j) => {
          const nIdx = s.newOpen.indexOf(f);
          Object.assign(set, nIdx >= 0 ? tokAt(f, openXY(j), 'open') : { ['tok_' + fid(f) + '.tx']: openXY(j)[0] });
          timing['tok_' + fid(f)] = nIdx >= 0 ? [0.6 + 0.12 * nIdx, 0.88 + 0.12 * nIdx] : [0.3, 0.6];
        });
        // the preconditions of bs(g): already true in s, already waiting in Open / Closed (shared), or new
        const inS = a.pre.filter(p => sSet.has(p));
        const shared = a.pre.filter(p => !sSet.has(p) && !s.newOpen.includes(p));
        prevShared = shared.find(p => openBefore.includes(p) && p !== s.goal) || null;
        const who = prevShared ? steps.slice(0, i).find(t => t.newOpen.includes(prevShared)) : null;
        if (prevShared) {
          Object.assign(set, { 'shared_note.op': 1, 'shared_note.text': '↑ ' + prevShared + ' 已在 Open：共享，不再加入', ['tokr_' + fid(prevShared) + '.stroke']: PAL.yellow, ['tokr_' + fid(prevShared) + '.stroke-width']: 2.6 });
          timing.shared_note = [0.6, 0.9]; timing['tokr_' + fid(prevShared)] = [0.6, 0.8];
          pulse.push('tok_' + fid(prevShared), 'fc_' + fid(prevShared));
        } else Object.assign(set, { 'shared_note.op': 0 });
        set['note.text'] = '取出 ' + s.goal + ' → bs = ' + s.action + (s.newOpen.length ? '；推入 ' + s.newOpen.join('、') : '') + (prevShared ? '；' + prevShared + ' 已在 Open' : '') + (inS.length ? '；' + inS.join('、') + ' ∈ s' : '');
        const m = list => list.map(p => '$' + p + '$').join('、');
        const fresh = a.pre.filter(p => s.newOpen.includes(p)), done = a.pre.filter(p => !sSet.has(p) && !s.newOpen.includes(p) && p !== prevShared);
        const preTxt = [
          fresh.length ? m(fresh) + ' 是新的子目标，放进 Open' : '',
          prevShared ? '$' + prevShared + '$ **已经在 Open 里**' + (who ? '（取出 $' + who.goal + '$ 时为 `' + who.action + '` 加进来的）' : '') + '——它被两条线共用，**不再加第二次**' : '',
          done.length ? m(done) + ' 已处理过' : '',
          inS.length ? m(inS) + ' 已在 $s$ 中' : ''
        ].filter(Boolean).join('；');
        frames.push({
          set, timing, pulse, dur: 1700, aha: !!prevShared,
          cap: '取出 $' + s.goal + '$ 放进 Closed，它的最佳支持者 `' + s.action + '` 加进 RPlan（代价 +' + numStr(a.cost) + '）。`' + s.action + '` 的前提：' + preTxt + '。' + (s.open.length ? '' : ' Open 空了，提取结束。'),
          tex: R`\begin{gathered}\htmlClass{fx-ff}{\text{RPlan}\leftarrow\text{RPlan}\cup\{bs(g)\}}\\ \htmlClass{fx-open}{\text{Open}\leftarrow\text{Open}\cup\bigl(pre_{bs(g)}\setminus(s\cup\text{Closed})\bigr)}\end{gathered}`,
          hl: prevShared ? ['open'] : ['ff']
        });
      });

      // compare with h_add: the drives behind both premises of ul(D) are counted twice there
      const closure = (f, out) => { out = out || new Set(); const an = bs[f]; if (!an || out.has(an)) return out; out.add(an); byName[an].pre.forEach(q => closure(q, out)); return out; };
      const [pa, pb] = ul.pre, ca = closure(pa), cb = closure(pb), twice = [...ca].filter(an => cb.has(an)).sort((x, y) => plan.indexOf(y) - plan.indexOf(x));
      const fset = { 'add_tex.op': 1, 'shared_note.op': 0, 'note.text': 'h_add 把 ' + twice.join('、') + ' 算了两遍；RPlan 里各一次' };
      if (prevShared) { fset['tokr_' + fid(prevShared) + '.stroke'] = TOK.closed[1]; fset['tokr_' + fid(prevShared) + '.stroke-width'] = 1.6; }
      twice.forEach(an => { fset['x2_' + aidOf(an) + '.op'] = 1; const k = plan.indexOf(an); fset['rpc_' + k + '.text'] = '+' + numStr(byName[an].cost) + '  只记一次'; fset['rpc_' + k + '.color'] = PAL.green; });
      frames.push({
        set: fset,
        timing: util.merge({ add_tex: [0, 0.4] }, ...twice.map(an => ({ ['x2_' + aidOf(an)]: [0.3, 0.7], ['rpc_' + plan.indexOf(an)]: [0.5, 0.9] }))),
        pulse: twice.map(an => 'ac_' + aidOf(an)).concat(['ff_val']),
        dur: 1400,
        cap: '**RPlan 是集合**：' + plan.length + ' 个动作各算一次，$h_{FF}=' + numStr(ff.h) + '$。$h_{add}=' + numStr(hAdd) + '$ 多出来的 ' + numStr(hAdd - ff.h) + '，正是 ' + twice.map(an => '`' + an + '`').join('、') + ' 被 $' + pa + '$ 和 $' + pb + '$ 两条线**各算了一遍**。这里 $h_{FF}=h^+=' + hPlus + '$。',
        tex: R`\htmlClass{fx-ff}{h_{FF}=\textstyle\sum_{a\in RPlan}c(a)=` + numStr(ff.h) + R`}\ <\ \htmlClass{fx-add}{h_{add}=` + numStr(hAdd) + '}',
        hl: ['ff', 'add']
      });
      // helpful actions: the RPlan actions applicable right now
      const helpful = plan.filter(an => byName[an].pre.every(p => sSet.has(p)));
      frames.push({
        set: util.merge(...helpful.map(an => ({ ['ac_' + aidOf(an) + '.stroke']: PAL.orange, ['ac_' + aidOf(an) + '.fill']: '#2e2212', ['rpr_' + plan.indexOf(an) + '.stroke']: PAL.orange, ['rpr_' + plan.indexOf(an) + '.stroke-width']: 2.4 })),
          { 'note.text': 'helpful action：' + helpful.join('、') + '（前提已在 s 中，现在就能执行）' }),
        pulse: helpful.map(an => 'ac_' + aidOf(an)),
        dur: 1100,
        cap: 'RPlan 里**现在就能执行**的动作叫 **helpful action**：只有 ' + helpful.map(an => '`' + an + '`（前提 $' + byName[an].pre.join(', ') + '\\in s$）').join('、') + '。FF 规划器在 EHC 里只展开 helpful actions，把搜索集中在松弛计划指出的方向上（代价是不再保证完备）。',
        tex: two(R`\htmlClass{fx-help}{\text{helpful}(s)=\{a\in RPlan:\ pre_a\subseteq s\}}`, R`=\{` + helpful.join(', ') + R`\}`),
        hl: ['help']
      });
      return frames;
    }
  });


  /* ------------------------------------------------------------------ hook questions and process strips (lead) */
  /** Prefix frame 0 with the hook question; q may depend on the scene's slider values. */
  const hook = (id, q) => {
    const d = RL.scene.defs[id], build = d.build;
    d.build = function (st, p) {
      const fr = build.call(this, st, p), text = typeof q === 'function' ? q(p || {}) : q;
      if (fr[0]) fr[0].cap = '**' + text + '** ' + (fr[0].cap || '');
      return fr;
    };
  };
  hook('astar-queue', '每一步该展开哪个节点？为什么 A\\* 最后找到的一定是最便宜的路？');
  hook('iw-novelty', '不用启发式，怎样只保留“带来新东西”的状态？');
  hook('delete-relax', '为什么“忽略删除”算出来的代价一定不会高估？');
  hook('hadd-propagation', p => (p.mode === 0 ? '$h_{max}$ 只看最难的那个子目标，会不会太乐观？' : '$h_{add}$ 是怎么一轮轮算出来的？它为什么会多算？'));
  hook('hill-landscape', '爬山法为什么会卡住？EHC 怎么跳出来？');
  hook('hff-extract', '$h_{add}$ 把共享的路算了两遍，$h_{FF}$ 怎么只算一遍？');
  RL.scene.setStages('astar-queue', ['放入起点', '反复：弹出 $f$ 最小 → 展开 → 重排', '目标出队就停', '回看：为什么回头、为什么最优'], [0, 1, 1, 1, 1, 1, 2, 3, 3]);
  RL.scene.setStages('iw-novelty', ['起点', '逐个生成：保留或剪掉', 'IW(1) 到不了目标', '对比 IW(2)'], [0, 1, 1, 1, 1, 1, 1, 2, 3]);
  RL.scene.setStages('delete-relax', ['真实语义：$at$ 会被删除', '删除松弛：状态只增不减', '对比 $h^+\\le h^*$'], [0, 0, 0, 0, 1, 1, 1, 1, 1, 2]);
  RL.scene.setStages('hadd-propagation', p => HADD_STAGES[p.mode === 0 ? 'max' : 'add'], [0, 1, 1, 1, 1, 2, 3]); // labels follow the slider
  RL.scene.setStages('hill-landscape', ['地形：高度 = $h$', 'HC：走向最低的邻居', 'HC 卡住：来回打转', 'EHC：BrFS 找更低的点', '结论：能到，但不最优'], [0, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4]);
  RL.scene.setStages('hff-extract', ['事实与最佳支持者', 'Open := $G\\setminus s$', '倒推：取出 → 加 $bs$ → 推前提', '$h_{FF}$ 与 helpful action'], [0, 0, 1, 2, 2, 2, 2, 2, 3, 3]);
  RL.scene.setAha('astar-queue', [2, 8]);
  RL.scene.setAha('iw-novelty', [4, 7]);
  RL.scene.setAha('delete-relax', [6, 9]);
  RL.scene.setAha('hadd-propagation', [6]);
  RL.scene.setAha('hill-landscape', [4, 7]);
  RL.scene.setAha('hff-extract', [-2]); // plus the "already in Open" step, marked inside build
})(typeof window === 'undefined' ? globalThis : window);
