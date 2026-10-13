/* Week 9 visualisers: table size, linear value approximation, neural Q / DQN (conceptual). */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout } = RL.gridView;
  const { courseGrid, rng: rngOf, sampleIndex } = RL.mdp;
  const dp = RL.dp, L = RL.learn, F = RL.examples.FEATURES;
  const AN = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' };
  const tf = (x, d) => fmt(x, d == null ? 4 : d).replace('−', '-');
  const vstar = (() => { let c; return g => c || (c = (() => { let V = dp.zeros(g); for (let i = 0; i < 400; i++) V = dp.valueIterationSweep(g, V).V; return V; })()); })();

  /* ---------- c23: how big is the table? ---------- */
  RL.viz.register('tablesize', {
    title: '表格规模计算器：Q-table 需要多少个条目？',
    mount(el) {
      const P = { w: 4, h: 3, wall: 1, terms: 2, keys: 1 };
      let actionMode = 'directions';
      const out = h('div');
      const presets = [['4×3（课程 Gridworld）', { w: 4, h: 3, wall: 1, terms: 2, keys: 0 }], ['40×30，墙 10×10', { w: 40, h: 30, wall: 100, terms: 2, keys: 0 }],
        ['40×30 + 10 键控制器', { w: 40, h: 30, wall: 100, terms: 2, keys: 10 }], ['1000×1000 + 10 键', { w: 1000, h: 1000, wall: 0, terms: 0, keys: 10 }]];
      const sliders = {};
      function draw() {
        const states = Math.max(0, P.w * P.h - P.wall - P.terms), actions = actionMode === 'keys' ? Math.pow(2, P.keys) : 4, entries = states * actions;
        const invalid = P.wall + P.terms > P.w * P.h;
        sliders.keys.style.display = actionMode === 'keys' ? '' : 'none';
        clear(out).put(readout([['非终止状态数', states.toLocaleString()], ['动作模式 / 动作数', actionMode === 'keys' ? '按键组合：2^' + P.keys + ' = ' + actions.toLocaleString() + '（k=' + P.keys + '，每个键按/不按，含全部不按）' : '标准方向：4（上 / 下 / 左 / 右）'],
          ['Q-table 条目数', h('b', entries.toLocaleString() + (entries > 1e6 ? '（≈ ' + entries.toExponential(3) + '）' : ''))], ['若每个条目至少要 10 次访问', (10 * entries).toLocaleString() + ' 次交互']]),
          invalid ? h('p.warn-text', '墙格数 + 终止格数超过了总格数，这个组合不合法；状态数按 0 计。') : null,
          h('p.viz-note', '内存可能还放得下，但真正的问题是：每个条目都要单独积累经验，一次更新只改一个格子。连续状态空间（x∈[0,40], y∈[0,30]）根本无法列成有限表。'),
          table(['表示方式', '要学习的参数数'], [['Tabular Q', entries.toLocaleString()], ['线性 Method 1（2 个特征，已知模型、只近似 V）', '2'], ['线性 Method 3（3 个特征）', '3'], ['线性 Q，按动作分块 w = (w_a1, …, w_an)', (3 * actions).toLocaleString() + '（3 个特征 × ' + actions + ' 个动作）']]));
      }
      const mk = (key, label, min, max, step) => (sliders[key] = slider(label, { min, max, step, value: P[key], onInput: v => { P[key] = v; draw(); } }));
      const actionSeg = segmented([{ value: 'directions', label: '标准 4 个方向' }, { value: 'keys', label: 'k 个可同时按下的按键，共 2^k 种组合' }], actionMode, v => { actionMode = v; draw(); }, '动作模式');
      el.put(h('div.viz-row', presets.map(([n, p]) => button(n, () => {
        Object.assign(P, p); actionMode = p.keys ? 'keys' : 'directions'; P.keys = Math.max(1, p.keys);
        actionSeg.select(actionMode); Object.entries(sliders).forEach(([k, s]) => s.set(P[k])); draw();
      }, 'btn'))),
        mk('w', '宽', 2, 1000, 1), mk('h', '高', 2, 1000, 1), mk('wall', '墙格数', 0, 400, 1), mk('terms', '终止格数', 0, 4, 1),
        actionSeg, mk('keys', '可同时按下的按键数量 k', 1, 12, 1), out);
      draw();
    }
  });

  /* ---------- c24: linear value approximation ---------- */
  RL.viz.register('linear', {
    title: '线性近似实验室：一次更新，所有状态的预测一起变',
    mount(el) {
      const g = courseGrid(), Vs = vstar(g);
      let method = 'method1', w, alpha = 0.1, lastUpdate = null, history = [], rng = rngOf(4);
      const gridBox = h('div'), info = h('div'), chartBox = h('div');
      const view = gridView(gridBox, g);
      const x = s => F[method].fn(g.coordOf[s]);
      const Vhat = s => (g.isTerminal(s) ? 0 : L.dot(w, x(s)));
      function reset() { w = F[method].fn([0, 0]).map(() => 0); lastUpdate = null; history = []; draw(); }
      function courseUpdate() {
        // the slide's update starts from w = (0, 0); repeating it from an updated w would be a different calculation
        if (lastUpdate || w.some(v => v !== 0)) { clear(info).put(h('p.viz-note', '课件的那一次更新是从 w = 0 出发的。请先点“重置 w = 0”再执行。')); return; }
        const before = {}; g.nonTerminal.forEach(s => { before[s] = Vhat(s); });
        const u = L.linearUpdate(w, x(10), 1, alpha);
        const oldW = w.slice(); w = u.next;
        lastUpdate = { u, before, oldW };
        draw();
      }
      function train(n) {
        const pol = { 1: 'N', 2: 'W', 3: 'N', 4: 'W', 5: 'N', 6: 'N', 8: 'E', 9: 'E', 10: 'E' };
        for (let k = 0; k < n; k++) {
          const steps = RL.vizUtil.generateEpisode(g, pol, rng);
          steps.forEach(e => { const target = e.r + 0.9 * Vhat(e.next); w = L.linearUpdate(w, x(e.s), target, alpha).next; });
          history.push(Math.sqrt(g.nonTerminal.reduce((a, s) => a + (Vhat(s) - Vs[s]) ** 2, 0) / g.nonTerminal.length));
        }
        lastUpdate = null; draw();
      }
      function draw() {
        const values = {}, labels = {};
        g.nonTerminal.forEach(s => { values[s] = Vhat(s); labels[s] = '(' + x(s).map(v => fmt(v, 1).replace(/\.0$/, '')).join(',') + ')'; });
        view.update({ values, decimals: 4, labels, highlight: lastUpdate ? { 10: 'blue' } : {} });
        // states sharing identical features
        const groups = {}; g.nonTerminal.forEach(s => { const k = x(s).map(v => v.toFixed(4)).join(','); (groups[k] = groups[k] || []).push('s' + s); });
        const aliased = Object.values(groups).filter(gr => gr.length > 1);
        clear(info).put(h('p.viz-note', h('b', F[method].name), '　特征 x(s) = (' + F[method].labels.join(', ') + ')；格子底部是每个状态的特征向量（紧凑显示，最多 1 位小数），中间是 V̂(s) = wᵀx(s)。'),
          readout([['权重 w', '(' + w.map(v => fmt(v, 4)).join(', ') + ')'], ['特征完全相同的状态', aliased.length ? aliased.map(a => '{' + a.join(', ') + '}').join('  ') : '无']]));
        if (lastUpdate) {
          const { u, before, oldW } = lastUpdate;
          const q = dp.backupDetail(g, Object.assign(dp.zeros(g), values), 10, 'E');
          info.put(h('div.viz-step', h('b', '课件更新：观察 s10 —Right, +1→ s11（终止），α = ' + alpha),
            h('div', { html: texHTML('\\delta = 1 - \\hat V(s_{10};\\mathbf w) = 1 - ' + tf(u.prediction) + ' = ' + tf(u.error), true) }),
            h('div', { html: texHTML('\\mathbf w^{+} = \\mathbf w + \\alpha\\,\\delta\\,\\mathbf x(s_{10}) = (' + oldW.map(v => tf(v)).join(',') + ') + ' + alpha + '\\times' + tf(u.error) + '\\times(' + x(10).map(v => tf(v, 3)).join(',') + ') = (' + u.next.map(v => tf(v)).join(',') + ')', true) }),
            h('div', { html: texHTML('\\hat Q^{+}(s_{10},\\text{Right}) = \\sum_{s\'}p\\,[r+\\gamma\\hat V^{+}(s\')] = ' + q.terms.map(t => fmt(t.prob, 1) + '(' + tf(t.reward, 0) + '+0.9\\times' + tf(t.vNext) + ')').join('+') + ' = ' + tf(q.q), true) })),
            table(['状态', 'V̂ 更新前', 'V̂ 更新后', '变化'], g.nonTerminal.map(s => ({ cells: ['s' + s, fmt(before[s], 4), fmt(values[s], 4), fmt(values[s] - before[s], 4)], cls: s === 10 ? 'hl' : null }))),
            h('p.muted', '只观察了 s10 一个状态，但所有特征非零的状态预测都变了——这就是参数共享带来的泛化（也可能带来干扰）。'));
        }
        clear(chartBox).put(history.length > 1 ? [RL.vizUtil.lineChart([{ values: history, color: 'purple' }], { xlabel: 'episode', min: 0 }),
          table(['状态', 'V̂(s)', 'V*(s)'], g.nonTerminal.map(s => ['s' + s, fmt(values[s], 3), fmt(Vs[s], 3)])),
          h('p.muted', '曲线：所有状态上 V̂ 与 V* 的均方根误差（用最优 policy 产生经验，线性 TD(0) 更新）。Method 2 无论怎么训练，底行都被迫预测 0；Method 3 的 bias 让底行可以非零，但底行四个状态仍然共享同一个值。')] : null);
      }
      el.put(segmented([{ value: 'method1', label: 'Method 1' }, { value: 'method2', label: 'Method 2' }, { value: 'method3', label: 'Method 3（+bias）' }], method, v => { method = v; reset(); }, '特征'),
        slider('α', { min: 0.01, max: 0.5, step: 0.01, value: alpha, format: v => v.toFixed(2), onInput: v => { alpha = v; } }),
        h('div.viz-row', button('执行课件的一次更新', courseUpdate, 'btn primary'), button('用 200 条 episode 训练', () => train(200), 'btn'), button('重置 w = 0', reset, 'btn ghost')),
        gridBox, info, chartBox);
      reset();
    }
  });

  /* ---------- c25: neural Q / DQN (conceptual; replay & target net are extensions) ---------- */
  function mlp(sizes, rng) {
    const layers = [];
    for (let l = 0; l < sizes.length - 1; l++) {
      const n = sizes[l], m = sizes[l + 1], sc = Math.sqrt(1 / n);
      layers.push({ W: Array.from({ length: m }, () => Array.from({ length: n }, () => (rng() * 2 - 1) * sc)), b: new Array(m).fill(0) });
    }
    return layers;
  }
  function forward(net, x) {
    const acts = [x];
    net.forEach((ly, i) => {
      const out = ly.W.map((row, j) => row.reduce((a, w, k) => a + w * acts[acts.length - 1][k], ly.b[j]));
      acts.push(i < net.length - 1 ? out.map(Math.tanh) : out);
    });
    return acts;
  }
  function sgd(net, x, actionIdx, target, lr) { // squared error on one output, backprop through tanh layers
    const acts = forward(net, x);
    let grad = acts[acts.length - 1].map((q, i) => (i === actionIdx ? q - target : 0));
    for (let l = net.length - 1; l >= 0; l--) {
      const ly = net[l], input = acts[l];
      const gIn = input.map((_, k) => ly.W.reduce((a, row, j) => a + row[k] * grad[j], 0));
      ly.W.forEach((row, j) => { row.forEach((_, k) => { row[k] -= lr * grad[j] * input[k]; }); ly.b[j] -= lr * grad[j]; });
      if (l > 0) grad = gIn.map((gv, k) => gv * (1 - input[k] * input[k]));
    }
  }
  const clone = net => net.map(ly => ({ W: ly.W.map(r => r.slice()), b: ly.b.slice() }));
  RL.viz.register('dqn', {
    title: 'DQN conceptual visualizer：state → 神经网络 → Q(s,a) → action',
    mount(el) {
      const g = courseGrid(), A = g.actions, Qstar = dp.qTable(g, vstar(g));
      const enc = s => { const [x, y] = g.coordOf[s]; return [x / 3, y / 2]; };
      const P = { replay: true, target: true, sync: 50, eps: 0.2, lr: 0.05 };
      let net, tnet, buffer, s, steps, rng, sel = 1, picked = [], lastBatchTarget = null, sinceSync;
      const netBox = h('div'), outBox = h('div'), gridBox = h('div'), bufBox = h('div'), stats = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { sel = st; draw(); } } });
      function reset() { rng = rngOf(12); net = mlp([2, 16, 16, 4], rng); tnet = clone(net); buffer = []; s = g.start; steps = 0; picked = []; sinceSync = 0; lastBatchTarget = null; draw(); }
      function q(netw, st) { return forward(netw, enc(st)).pop(); }
      function trainSteps(n) {
        for (let k = 0; k < n; k++) {
          const qs = q(net, s), probs = L.epsilonGreedyProbs(qs, P.eps), ai = sampleIndex(probs, rng());
          const o = g.step(s, A[ai], rng), tr = { s, a: ai, r: o.reward, next: o.next, done: g.isTerminal(o.next) };
          buffer.push(tr); if (buffer.length > 500) buffer.shift();
          const batch = P.replay ? Array.from({ length: Math.min(16, buffer.length) }, () => Math.floor(rng() * buffer.length)) : [buffer.length - 1];
          picked = batch;
          batch.forEach(i => {
            const b = buffer[i], qn = b.done ? 0 : Math.max(...q(P.target ? tnet : net, b.next));
            const y = b.r + 0.9 * qn; sgd(net, enc(b.s), b.a, y, P.lr / batch.length);
            if (i === batch[0]) lastBatchTarget = { b, y, qn };
          });
          steps++; sinceSync++;
          if (P.target && sinceSync >= P.sync) { tnet = clone(net); sinceSync = 0; }
          if (!P.target) tnet = net;
          s = tr.done ? g.start : o.next;
        }
        draw();
      }
      function drawNet() {
        const acts = forward(net, enc(sel)), W = 380, H = 190, cols = [2, 6, 6, 4];
        const xs = [40, 140, 240, 330];
        const pos = cols.map((n, c) => Array.from({ length: n }, (_, i) => [xs[c], 20 + (i + 0.5) * (H - 30) / n]));
        const show = (layer, i) => (layer === 1 || layer === 2 ? acts[layer][i * 2] : acts[layer][i]);
        const qOut = acts[3], best = qOut.indexOf(Math.max(...qOut));
        const S = svg;
        return S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' },
          pos.slice(0, 3).map((col, c) => col.map(p => pos[c + 1].map(p2 => S('line', { x1: p[0], y1: p[1], x2: p2[0], y2: p2[1], class: 'nn-edge' })))),
          pos.map((col, c) => col.map((p, i) => {
            const v = show(c, i);
            return [S('circle', { cx: p[0], cy: p[1], r: c === 3 ? 13 : 9, class: 'nn-node' + (c === 3 && i === best ? ' on' : ''), 'fill-opacity': 1 }),
              c === 0 ? S('text', { x: p[0] - 16, y: p[1] + 4, class: 'nn-text', 'text-anchor': 'end', text: (i ? 'y=' : 'x=') + fmt(v, 2) }) : null,
              c === 3 ? S('text', { x: p[0] + 20, y: p[1] + 4, class: 'nn-text', 'text-anchor': 'start', text: AN[A[i]] + ' ' + fmt(v, 2) }) : null,
              (c === 1 || c === 2) ? S('circle', { cx: p[0], cy: p[1], r: 3 + 5 * Math.abs(v), fill: v >= 0 ? 'var(--c-purple)' : 'var(--c-orange)', opacity: 0.8 }) : null];
          })),
          ['输入 (x, y)', '隐藏层 1', '隐藏层 2', 'Q(s,a)'].map((t, i) => S('text', { x: xs[i], y: H - 2, class: 'tick', 'text-anchor': 'middle', text: t })));
      }
      function draw() {
        const Q = {}; g.nonTerminal.forEach(st => { const v = q(net, st); Q[st] = {}; A.forEach((a, i) => { Q[st][a] = v[i]; }); });
        view.update({ q: Q, qDecimals: 2, selected: sel, agent: s });
        clear(netBox).put(h('h4', '选中 s' + sel + ' = (' + g.coordOf[sel].join(',') + ') 的前向计算'), drawNet(),
          h('p.muted', '两个隐藏层各有 16 个神经元，图中每层只画出其中 6 个。'));
        const qs = q(net, sel), best = qs.indexOf(Math.max(...qs));
        clear(outBox).put(table(['动作', 'Q(s' + sel + ', a) 网络输出', 'q*(s,a)（VI 精确值）'], A.map((a, i) => ({ cells: [AN[a], fmt(qs[i], 3), fmt(Qstar[sel][a], 3)], cls: i === best ? 'hl' : null }))),
          h('p.muted', '一个状态进网络，一次输出所有动作的 Q；贪心 policy 选最大的 → ' + AN[A[best]] + '。'));
        const err = Math.sqrt(g.nonTerminal.reduce((a, st) => a + A.reduce((b, ac, i) => b + (Q[st][ac] - Qstar[st][ac]) ** 2, 0), 0) / (g.nonTerminal.length * 4));
        clear(stats).put(readout([['训练步数', String(steps)], ['replay buffer 大小', buffer.length + ' / 500'], ['距下次同步 target network', P.target ? (P.sync - sinceSync) + ' 步' : '（未使用）'],
          ['所有 Q 与 q* 的 RMSE', fmt(err, 4)]]),
          lastBatchTarget ? h('div', { html: texHTML('Y = r + \\gamma\\max_{a\'}Q_{' + (P.target ? '\\theta^-' : '\\theta') + '}(s\',a\') = ' + tf(lastBatchTarget.b.r, 0) + ' + 0.9\\times' + tf(lastBatchTarget.qn, 3) + ' = ' + tf(lastBatchTarget.y, 3), true) }) : null);
        clear(bufBox).put(h('div.buffer', buffer.slice(-60).map((b, i) => h('span' + (picked.includes(buffer.length - Math.min(60, buffer.length) + i) ? '.picked' : ''), 's' + b.s + ' ' + AN[A[b.a]] + ' ' + (b.r ? (b.r > 0 ? '+1' : '−1') : '0') + ' s' + b.next))));
      }
      const tog = (label, key) => { const box = h('input', { type: 'checkbox', checked: P[key] }); box.addEventListener('change', () => { P[key] = box.checked; reset(); }); return h('label', box, label); };
      el.put(h('div.callout.callout-ext', h('div.callout-title', '课件范围'), h('p', '神经网络 Q 与 DQN 在 W9 中标为 Not examinable，只要求概念。experience replay 与 target network 课件没有讲，这里作为延伸展示，不考。')),
        h('div.toggle-list', tog(' 使用 experience replay buffer（每步从最近 500 条经验中随机抽 16 条训练）', 'replay'), tog(' 使用 target network（target 用每 50 步同步一次的旧参数 θ⁻ 计算）', 'target')),
        h('div.viz-row', button('训练 1 步', () => trainSteps(1), 'btn primary'), button('训练 500 步', () => trainSteps(500), 'btn'), button('训练 3000 步', () => trainSteps(3000), 'btn'), button('重置网络', reset, 'btn ghost')),
        netBox, outBox, gridBox, h('p.muted', '格子里是网络当前对每个 (s,a) 的输出。点格子查看该状态的前向计算。'), stats, h('h4', 'Replay buffer（紫色＝本步被抽中训练的经验）'), bufBox);
      reset();
    }
  });
})(window);
