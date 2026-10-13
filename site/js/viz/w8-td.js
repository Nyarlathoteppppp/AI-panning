/* Week 8-1 visualisers: TD prediction, MC control, the s10 loop, bias/variance, n-step & λ. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout } = RL.gridView;
  const { courseGrid, rng: rngOf, ARROWS } = RL.mdp;
  const dp = RL.dp, L = RL.learn;
  const AN = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' };
  const tf = (x, d) => fmt(x, d == null ? 4 : d).replace('−', '-');
  const gen = (g, pol, rng) => RL.vizUtil.generateEpisode(g, pol, rng);

  /** Number line showing estimate → target with the α-step. */
  function numberLine(est, target, after, lo, hi) {
    lo = Math.min(lo, est, target, after) - 0.05; hi = Math.max(hi, est, target, after) + 0.05;
    const W = 380, X = v => 20 + (v - lo) / (hi - lo) * (W - 40);
    const mark = (v, color, label, y) => [svg('circle', { cx: X(v), cy: 40, r: 6, fill: 'var(--c-' + color + ')' }),
      svg('text', { x: X(v), y, class: 'label', 'text-anchor': 'middle', fill: 'var(--c-' + color + ')', text: label + ' ' + fmt(v, 4) })];
    return svg('svg', { viewBox: '0 0 ' + W + ' 86', class: 'chart' },
      svg('line', { x1: 20, x2: W - 20, y1: 40, y2: 40, class: 'axis' }),
      [lo, 0, hi].filter((v, i, a) => a.indexOf(v) === i && v >= lo && v <= hi).map(v => [svg('line', { x1: X(v), x2: X(v), y1: 36, y2: 44, class: 'axis' }), svg('text', { x: X(v), y: 58, class: 'tick', 'text-anchor': 'middle', text: fmt(v, 2) })]),
      svg('line', { x1: X(est), x2: X(target), y1: 40, y2: 40, stroke: 'var(--c-red)', 'stroke-width': 4, opacity: 0.35 }),
      svg('line', { x1: X(est), x2: X(after), y1: 40, y2: 40, stroke: 'var(--c-teal)', 'stroke-width': 4 }),
      mark(est, 'blue', '旧估计', 20), mark(target, 'green', 'target', 78), Math.abs(X(after) - X(est)) < 70 || Math.abs(X(after) - X(target)) < 70 ? svg('circle', { cx: X(after), cy: 40, r: 6, fill: 'var(--c-teal)' }) : mark(after, 'teal', '新估计', 20));
  }
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { numberLine });

  /* ---------- c17: TD prediction ---------- */
  RL.viz.register('td', {
    title: 'TD Learning simulator：走一步就更新——TD target、TD error 与更新',
    mount(el) {
      const g = courseGrid(), gamma = 0.9, pol = RL.examples.POLICY1;
      let mode = 'q', alpha = 0.1, episodes, ep, t, table_, last, seed, executed, showMC = true;
      const gridBox = h('div'), info = h('div'), tableBox = h('div'), trace = h('div.trace');
      const view = gridView(gridBox, g);
      const est = (s, a) => (mode === 'q' ? (table_[s + a] || 0) : (table_[String(s)] || 0));
      const backBtn = button('上一步', back, 'btn');
      const polLine = h('p.viz-note', '固定 policy（策略）：' + g.nonTerminal.map(s => 's' + s + ' ' + ARROWS[pol[s]]).join('；') + '。Q 视图不画箭头，以免遮住数字。');
      function resetState() { episodes = RL.examples.MC_EPISODES.map(e => e.steps); ep = 0; t = 0; table_ = {}; last = null; seed = 5; executed = []; }
      function reset() { resetState(); draw(); }
      function episode() { while (!episodes[ep]) episodes.push(gen(g, pol, rngOf(seed++))); return episodes[ep]; }
      // Replay from the same seed; record numeric step parameters, never clone an RNG closure.
      function back() {
        if (!executed.length) return;
        const rates = executed.slice(0, -1);
        resetState(); rates.forEach(advance); draw();
      }
      function advance(rate) {
        const e = episode()[t], done = g.isTerminal(e.next);
        const key = mode === 'q' ? e.s + e.a : String(e.s);
        const boot = done ? 0 : (mode === 'q' ? est(e.next, pol[e.next]) : est(e.next));
        const target = e.r + gamma * boot, before = table_[key] || 0;
        const u = L.tdUpdate(before, target, rate);
        table_[key] = u.after;
        const G = L.returnsBackward(episode().map(x => x.r), gamma)[t];
        last = { e, t, ep, done, boot, target, before, after: u.after, error: u.error, G, key, alpha: rate };
        executed.push(rate);
        t++; if (t >= episode().length) { ep++; t = 0; }
      }
      function step() { advance(alpha); draw(); }
      function finish() { const k = ep; while (ep === k) advance(alpha); draw(); }
      function draw() {
        backBtn.disabled = executed.length === 0;
        const cur = episode(), trail = [cur[0].s].concat(cur.slice(0, t).map(x => x.next));
        const q = {}, values = {};
        g.nonTerminal.forEach(s => { q[s] = {}; g.actions.forEach(a => { if (table_[s + a] != null) q[s][a] = table_[s + a]; }); if (table_[String(s)] != null) values[s] = table_[String(s)]; });
        const agent = t < cur.length ? cur[t].s : null, hl = {}; if (last) { hl[last.e.next] = 'green'; hl[last.e.s] = 'blue'; }
        if (mode === 'q') view.update({ q, qDecimals: 4, trail, agent, highlight: hl });
        else view.update({ values, decimals: 4, trail, agent, highlight: hl, policy: pol });
        clear(info).put(readout([['episode', (ep + 1) + (ep < 3 ? '（课件 Episode ' + (ep + 1) + '）' : '（随机生成）')], ['下一步 t', String(t)], ['α / γ', alpha + ' / ' + gamma]]));
        if (last) {
          const l = last, nm = mode === 'q' ? 'Q(s_{' + l.e.s + '},\\text{' + AN[l.e.a] + '})' : 'V(s_{' + l.e.s + '})';
          const bootName = l.done ? '0\\ (\\text{终止})' : (mode === 'q' ? 'Q(s_{' + l.e.next + '},\\pi(s_{' + l.e.next + '}))' : 'V(s_{' + l.e.next + '})');
          info.put(h('h4', '刚处理的这一步：第 ' + (l.ep + 1) + ' 条 episode，t = ' + l.t + '，α = ' + fmt(l.alpha, 2)),
            h('div.viz-cols',
            h('div.viz-card', h('h4.t-green', '① TD target'), h('div', { html: texHTML('Y = R + \\gamma\\,' + bootName + ' = ' + tf(l.e.r, 0) + ' + 0.9\\times' + tf(l.boot) + ' = ' + tf(l.target), true) }),
              h('p.muted', l.done ? '下一状态是终止状态，未来价值为 0，target 只剩奖励。' : '真实的一步奖励 + 对下一状态的估计（bootstrap）。')),
            h('div.viz-card', h('h4.t-red', '② TD error'), h('div', { html: texHTML('\\delta = Y - ' + nm + ' = ' + tf(l.target) + ' - ' + tf(l.before) + ' = ' + tf(l.error), true) }),
              h('p.muted', l.error > 0 ? '比预期好 → 上调。' : l.error < 0 ? '比预期差 → 下调。' : '与预期一致 → 不变。')),
            h('div.viz-card', h('h4.t-teal', '③ 更新'), h('div', { html: texHTML(nm + ' \\leftarrow ' + tf(l.before) + ' + ' + l.alpha + '\\times' + tf(l.error) + ' = ' + tf(l.after), true) }),
              h('p.muted', '只向 target 移动 α 的比例。'))),
            numberLine(l.before, l.target, l.after, -1, 1),
            showMC ? h('p.viz-note', '同一步若用 MC：target 是这条 episode 的实际 return ', h('b', 'G = ' + fmt(l.G, 4)), '，要等 episode 结束才知道；TD 现在就能用 ', h('b', fmt(l.target, 4)), ' 更新。') : null);
        } else info.put(h('p.muted', '点“走一步”。每一步都会立即更新刚离开的那个' + (mode === 'q' ? '状态—动作对' : '状态') + '。'));
        clear(trace).put(cur.map((x, i) => h('div' + (last && last.e === x ? '.cur' : ''), (i < t ? '✓ ' : '  ') + 't=' + i + '  s' + x.s + ' ' + AN[x.a] + (x.slip ? '（' + (x.slip === 'slip left' ? '左滑' : '右滑') + '）' : '') + ' → R=' + fmt(x.r, 0) + ', s' + x.next)));
        const rows = Object.entries(table_).filter(([, v]) => Math.abs(v) > 1e-12).map(([k, v]) => [mode === 'q' ? 's' + parseInt(k, 10) + ', ' + AN[k.replace(/^\d+/, '')] : 's' + k, fmt(v, 4)]);
        clear(tableBox).put(rows.length ? table([mode === 'q' ? '(s, a)' : 's', '非零估计'], rows) : h('p.muted', '所有估计仍为 0。'));
      }
      const modeSeg = segmented([{ value: 'q', label: '学 Q(s,a)（课件）' }, { value: 'v', label: '学 V(s)' }], mode, v => { mode = v; reset(); }, '对象');
      el.put(h('div.viz-note', '这个实验在做什么：固定 policy（策略），用 TD(0)（单步时序差分）每走一步就立即更新，不必等 episode（回合）结束。蓝框＝S_t，绿框＝S_{t+1}（原地不动时两者重合，只显示蓝框）。“学 Q(s,a)”把估计记到状态—动作对，并用 Q(s′,π(s′)) bootstrap（自举）；“学 V(s)”只估计状态价值，用 V(s′) 自举。切换对象会重置。'),
        modeSeg, slider('学习率 α', { min: 0.05, max: 1, step: 0.05, value: alpha, format: v => v.toFixed(2), onInput: v => { alpha = v; } }),
        h('div.viz-row', backBtn, button('走一步', step, 'btn primary'), button('走完这条 episode', finish, 'btn'), button('重置', reset, 'btn ghost')),
        polLine, gridBox, info, h('h4', '本条 episode'), trace, tableBox);
      reset();
    }
  });

  /* ---------- the s10 loop (W8 slides 29, 32, 41) ---------- */
  function loopDemo(container, method) {
    const g = courseGrid();
    const base = dp.qTable(g, dp.policyEvaluationExact(g, { 1: 'N', 2: 'W', 3: 'N', 4: 'W', 5: 'N', 6: 'N', 8: 'E', 9: 'E', 10: 'E' }));
    let Q, s, steps, log, rng, alpha = 0.2;
    const box = h('div'), out = h('div');
    function reset() { Q = JSON.parse(JSON.stringify(base)); Object.assign(Q[10], { N: 0.86, E: 0.8527, W: 0.7375, S: 0.6319 }); /* slide 29's constructed table */ s = 10; steps = 0; log = []; rng = rngOf(9); draw(); }
    function act() {
      if (g.isTerminal(s)) return;
      const qs = Q[s], a = Object.keys(qs).reduce((x, y) => (qs[y] > qs[x] ? y : x));
      const o = g.step(s, a, rng); steps++;
      let line = 's' + s + ' 选 ' + AN[a] + ' → s' + o.next + (o.reward ? '（R=' + o.reward + '）' : '');
      if (method === 'td' && s === 10) {
        const target = o.reward + (g.isTerminal(o.next) ? 0 : 0.9 * Math.max(...Object.values(Q[o.next])));
        const u = L.tdUpdate(Q[s][a], target, alpha);
        line += '；Δ = ' + fmt(u.error, 4) + '，Q(s10,' + AN[a] + ') ← ' + fmt(u.after, 4);
        Q[s][a] = u.after;
      }
      log.push(line); s = o.next; draw();
    }
    function draw() {
      const v = RL.gridView.create(clear(box), g, {});
      v.update({ q: { 10: Q[10], 9: Q[9], 6: Q[6] }, qDecimals: 4, agent: g.isTerminal(s) ? null : s, selected: 10 });
      const greedy = Object.keys(Q[10]).reduce((x, y) => (Q[10][y] > Q[10][x] ? y : x));
      clear(out).put(readout([['已走步数', String(steps)], ['当前位置', 's' + s + (g.isTerminal(s) ? '（终止）' : '')], ['s10 的贪心动作', AN[greedy]],
        ['Q(s10, Up)', fmt(Q[10].N, 4)], ['Q(s10, Right)', fmt(Q[10].E, 4)]]),
        h('div.trace', log.slice(-8).map(x => h('div', x))),
        h('p.viz-note', method === 'mc'
          ? 'MC：episode 没结束就没有 return，Q 一个数都不能改。s10 选 Up 有 0.8 的概率撞墙留在原地，下一步还是选 Up……只有靠 0.1 的滑动概率（滑向 s11 或 s9）才能跳出。'
          : 'TD（α=0.2）：第一次在 s10 撞墙后 Δ = 0 + 0.9×0.86 − 0.86 = −0.086，Q(s10,Up) 立即降到 0.8428，低于 Right 的 0.8527，下一步就改选 Right——policy 在 episode 中途就改变了。'));
    }
    container.put(h('p.muted', '课件为说明问题构造的 Q 表：s10 的 Up=0.86、Right=0.8527、Left=0.7375、Down=0.6319，Up 恰好最大（Up 会撞上边界留在原地）。智能体在 s10，按贪心（ε 很小）行动。'),
      h('div.viz-row', button('走一步', act, 'btn primary'), button('走 10 步', () => { for (let i = 0; i < 10; i++) act(); }, 'btn'), button('重置', reset, 'btn ghost')), box, out);
    reset();
  }

  /* ---------- c16: MC control ---------- */
  RL.viz.register('mccontrol', {
    title: 'MC Control：MC prediction + ε-greedy 改进',
    mount(el) {
      const g = courseGrid();
      let tab = 'train';
      const body = h('div');
      function train() {
        let eps = 0.1, Q, N, rng, history, lastEp, lastTrunc = false, skipped = 0, episodesRun = 0, viewMode = 'q';
        const gridBox = h('div'), out = h('div'), chartBox = h('div'), polLine = h('p.viz-note');
        const view = gridView(gridBox, g);
        function reset() { Q = {}; N = {}; g.nonTerminal.forEach(s => { Q[s] = { N: 0, E: 0, S: 0, W: 0 }; N[s] = { N: 0, E: 0, S: 0, W: 0 }; }); rng = rngOf(21); history = []; lastEp = null; lastTrunc = false; skipped = 0; episodesRun = 0; draw(); }
        function episode() {
          const steps = []; let s = g.start;
          while (!g.isTerminal(s) && steps.length < 200) {
            const qs = g.actions.map(a => Q[s][a]), probs = L.epsilonGreedyProbs(qs, eps);
            const a = g.actions[RL.mdp.sampleIndex(probs, rng())], o = g.step(s, a, rng);
            steps.push({ s, a, r: o.reward, next: o.next }); s = o.next;
          }
          // MC needs a complete return: an episode cut off at the step cap never reached a terminal state, so it is not used for updates
          const truncated = !g.isTerminal(s);
          if (!truncated) {
            let G = 0;
            for (let t = steps.length - 1; t >= 0; t--) { const e = steps[t]; G = e.r + 0.9 * G; N[e.s][e.a]++; Q[e.s][e.a] += (G - Q[e.s][e.a]) / N[e.s][e.a]; }
          } else skipped++;
          if (!truncated) history.push({ len: steps.length, G: L.returnsBackward(steps.map(x => x.r), 0.9)[0] || 0 }); // truncated episodes are left out of the curve too
          episodesRun++; lastEp = steps; lastTrunc = truncated;
        }
        function run(n) { for (let i = 0; i < n; i++) episode(); draw(); }
        function draw() {
          const pol = {}; g.nonTerminal.forEach(s => { pol[s] = dp.argmaxActions(Q[s], 1e-12); });
          const trail = lastEp ? [g.start].concat(lastEp.map(x => x.next)) : null;
          view.update(viewMode === 'q' ? { q: Q, qDecimals: 2, trail } : { policy: pol, trail });
          polLine.textContent = '当前 greedy policy（贪心策略）：' + g.nonTerminal.map(s => 's' + s + ' ' + pol[s].map(a => ARROWS[a]).join('/')).join('；') + '。';
          const greedyV = dp.policyEvaluationExact(g, Object.fromEntries(g.nonTerminal.map(s => [s, pol[s][0]])));
          clear(out).put(readout([['已训练 episode', String(episodesRun) + (skipped ? '（其中 ' + skipped + ' 条走满 200 步仍未到终点，没有完整 return，未用于更新）' : '')], ['最近一条长度', lastEp ? String(lastEp.length) + (lastTrunc ? '（走满演示上限 200 步仍未终止：MC 拿不到完整 return，这条不更新）' : '') : '—'],
            ['当前贪心 policy 的真实价值 v(s1)', fmt(greedyV[1], 4) + '（最优 0.5452）']]));
          const W = 20, avg = history.map((_, i) => { const sl = history.slice(Math.max(0, i - W + 1), i + 1); return sl.reduce((a, b) => a + b.G, 0) / sl.length; });
          clear(chartBox).put(history.length > 2 ? [RL.vizUtil.lineChart([{ values: avg, color: 'orange' }], { xlabel: 'episode', min: -1, max: 1 }), h('p.muted', '每条 episode 的 G₀（最近 20 条平均），包含探索动作。')] : null);
        }
        body.put(slider('ε', { min: 0, max: 0.5, step: 0.01, value: eps, format: v => v.toFixed(2), onInput: v => { eps = v; } }),
          h('div.viz-row', button('1 条 episode', () => run(1), 'btn primary'), button('10 条', () => run(10), 'btn'), button('200 条', () => run(200), 'btn'), button('重置', reset, 'btn ghost')),
          segmented([{ value: 'q', label: '看 Q 数值' }, { value: 'policy', label: '看 policy 箭头' }], viewMode, v => { viewMode = v; draw(); }, '网格视图'),
          polLine, gridBox, h('p.muted', '每条 episode 结束后才倒序更新 Q（1/N 平均）。Q 视图不画箭头；policy 视图中，几个动作的 Q 并列最大时画多个短箭头，学到差别且最大动作唯一后变成一个箭头。行为用 ε-greedy（ε-贪心）。'), out, chartBox);
        reset();
      }
      function draw() { clear(body); if (tab === 'train') train(); else loopDemo(body, 'mc'); }
      el.put(segmented([{ value: 'train', label: '训练 MC control' }, { value: 'loop', label: '局限：s10 循环' }], tab, v => { tab = v; draw(); }, '视图'), body);
      draw();
    }
  });

  /* ---------- c18: bias/variance + TD escape from the loop ---------- */
  RL.viz.register('biasvar', {
    title: 'MC vs TD：偏差、方差，以及 TD 怎样立刻改变 policy',
    mount(el) {
      const g = courseGrid();
      let tab = 'bv';
      const body = h('div');
      const opt = { 1: 'N', 2: 'W', 3: 'N', 4: 'W', 5: 'N', 6: 'N', 8: 'E', 9: 'E', 10: 'E' };
      const truth = dp.policyEvaluationExact(g, opt);
      function bv() {
        let runs = 200, episodes = 150, alpha = 0.1;
        const out = h('div');
        function run() {
          const mc = [], td = [];
          for (let e = 0; e < episodes; e++) { mc.push([]); td.push([]); }
          for (let k = 0; k < runs; k++) {
            const rng = rngOf(500 + k), Vm = dp.zeros(g), Vt = dp.zeros(g);
            for (let e = 0; e < episodes; e++) {
              const steps = gen(g, opt, rng);
              steps.forEach(x => { const target = x.r + 0.9 * (g.isTerminal(x.next) ? 0 : Vt[x.next]); Vt[x.s] += alpha * (target - Vt[x.s]); });
              const G = L.returnsBackward(steps.map(x => x.r), 0.9), seen = new Set();
              steps.forEach((x, t) => { if (seen.has(x.s)) return; seen.add(x.s); Vm[x.s] += alpha * (G[t] - Vm[x.s]); }); // first-visit
              mc[e].push(Vm[1]); td[e].push(Vt[1]);
            }
          }
          const stats = arr => arr.map(xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length, v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length; return { m, bias2: (m - truth[1]) ** 2, v, mse: (m - truth[1]) ** 2 + v }; });
          const sm = stats(mc), st = stats(td);
          const pick = (arr, f) => arr.map(f);
          clear(out).put(
            h('h4', '平均学到的 V(s1)（真值 ' + fmt(truth[1], 4) + '）'), RL.vizUtil.lineChart([{ values: pick(sm, x => x.m), color: 'blue' }, { values: pick(st, x => x.m), color: 'orange' }, { values: sm.map(() => truth[1]), color: 'gray', dash: '4 3' }], { xlabel: 'episode', min: 0, max: 0.6 }),
            h('h4', 'Bias²（平均值离真值多远）'), RL.vizUtil.lineChart([{ values: pick(sm, x => x.bias2), color: 'blue' }, { values: pick(st, x => x.bias2), color: 'orange' }], { xlabel: 'episode', min: 0 }),
            h('h4', 'Variance（不同运行之间的分散程度）'), RL.vizUtil.lineChart([{ values: pick(sm, x => x.v), color: 'blue' }, { values: pick(st, x => x.v), color: 'orange' }], { xlabel: 'episode', min: 0 }),
            h('div.legend', h('span', h('i', { style: { background: 'var(--c-blue)' } }), 'First-visit MC'), h('span', h('i', { style: { background: 'var(--c-orange)' } }), 'TD(0)')),
            table(['', 'Bias²', 'Variance', 'MSE'], [
              ['MC，第 10 条', fmt(sm[9].bias2, 5), fmt(sm[9].v, 5), fmt(sm[9].mse, 5)], ['TD，第 10 条', fmt(st[9].bias2, 5), fmt(st[9].v, 5), fmt(st[9].mse, 5)],
              ['MC，最后一条', fmt(sm[episodes - 1].bias2, 5), fmt(sm[episodes - 1].v, 5), fmt(sm[episodes - 1].mse, 5)], ['TD，最后一条', fmt(st[episodes - 1].bias2, 5), fmt(st[episodes - 1].v, 5), fmt(st[episodes - 1].mse, 5)]]),
            h('p.viz-note', '固定最优 policy，从 s1 出发，' + runs + ' 次独立运行，每次两种方法看到相同的轨迹、相同的 α=' + alpha + '、初始 V=0。MC 的目标是实际 return：起步快、偏差很快消失，但一直保留较大方差；TD 的目标依赖其他状态的估计：早期偏差大（要等价值从终点一步步传回来），之后方差小得多。'));
        }
        body.put(slider('运行次数', { min: 50, max: 500, step: 50, value: runs, onInput: v => { runs = v; } }), slider('每次 episode 数', { min: 50, max: 400, step: 25, value: episodes, onInput: v => { episodes = v; } }),
          slider('α', { min: 0.02, max: 0.5, step: 0.02, value: alpha, format: v => v.toFixed(2), onInput: v => { alpha = v; } }), button('运行实验', run, 'btn primary'), out);
        run();
      }
      function draw() { clear(body); if (tab === 'bv') bv(); else loopDemo(body, 'td'); }
      el.put(segmented([{ value: 'bv', label: 'Bias / Variance 实验' }, { value: 'loop', label: 'TD 跳出 s10 循环' }], tab, v => { tab = v; draw(); }, '视图'), body);
      draw();
    }
  });

  /* ---------- c19: n-step and λ-return ---------- */
  RL.viz.register('nstep', {
    title: 'n-step return 与 λ-return：在 MC 和 TD 之间连续调节',
    mount(el) {
      const g = courseGrid();
      const steps = RL.examples.MC_EPISODES[0].steps; // s1→s5→s8→s9→s10→s11
      let n = 1, lambda = 0.5, t = 0, Vsrc = 'zero';
      const out = h('div');
      const Vstar = (() => { let V = dp.zeros(g); for (let i = 0; i < 300; i++) V = dp.valueIterationSweep(g, V).V; return V; })();
      function V(s) { return g.isTerminal(s) ? 0 : (Vsrc === 'zero' ? 0 : Vsrc === 'half' ? 0.5 : Vstar[s]); }
      function draw() {
        const T = steps.length, rem = T - t, rewards = steps.slice(t).map(x => x.r);
        const stateAfter = k => (t + k < T ? steps[t + k].s : steps[T - 1].next);
        const nret = k => L.nStepReturn(rewards, 0.9, k, V(stateAfter(k)));
        const G = nret(n);
        const ws = L.lambdaWeights(lambda, rem), gl = ws.reduce((a, w, i) => a + w * nret(i + 1), 0);
        const terms = []; for (let k = 0; k < Math.min(n, rem); k++) terms.push((k ? '\\gamma^{' + k + '}' : '') + 'R_{' + (t + k + 1) + '}');
        const usesBoot = n < rem;
        clear(out).put(
          h('div', { html: texHTML('G^{(' + n + ')}_{' + t + '} = ' + terms.join(' + ') + (usesBoot ? ' + \\gamma^{' + n + '}V(S_{' + (t + n) + '})' : '') + ' = ' + tf(G), true) }),
          h('p.viz-note', usesBoot ? '用了 ' + n + ' 个真实奖励，然后在 S' + (t + n) + ' = s' + stateAfter(n) + ' 处用估计 V = ' + fmt(V(stateAfter(n)), 3) + ' 补上未来（bootstrap）。n=1 就是 TD target。'
            : 'n ≥ 剩余步数 ' + rem + '：已经到达终点，没有可以 bootstrap 的状态——这就是 MC 的完整 return。'),
          table(['n', '用到的真实奖励', 'bootstrap 状态', 'G^(n)', 'λ 权重'], ws.map((w, i) => ({ cells: [i + 1 === rem ? '≥ ' + rem + '（完整 return G_t）' : String(i + 1), String(Math.min(i + 1, rem)), i + 1 < rem ? 's' + stateAfter(i + 1) : '—（终止）', fmt(nret(i + 1), 4), fmt(w, 4)], cls: i + 1 === Math.min(n, rem) ? 'hl' : null }))),
          h('div', { html: texHTML(rem === 1 ? 'G^{\\lambda}_{' + t + '} = G_{' + t + '} = ' + tf(gl) : 'G^{\\lambda}_{' + t + '} = (1-\\lambda)\\sum_{n=1}^{' + (rem - 1) + '}\\lambda^{n-1}G^{(n)}_{' + t + '} + \\lambda^{' + (rem - 1) + '}G_{' + t + '} = ' + tf(gl), true) }),
          h('p.muted', 'λ 权重之和 = ' + fmt(ws.reduce((a, b) => a + b, 0), 4) + '。λ=0 只剩 1-step（TD），λ=1 只剩完整 return（MC）。'));
      }
      const tS = slider('起点时刻 t', { min: 0, max: steps.length - 1, step: 1, value: 0, onInput: v => { t = v; draw(); } });
      el.put(h('p.muted', '轨迹：课件 Episode 1，s1 → s5 → s8 → s9 → s10 → s11，奖励 (0,0,0,0,1)，γ=0.9。'),
        segmented([{ value: 'zero', label: 'V 全为 0' }, { value: 'half', label: 'V 全为 0.5' }, { value: 'star', label: 'V = V*' }], Vsrc, v => { Vsrc = v; draw(); }, '估计'),
        tS, slider('n', { min: 1, max: 6, step: 1, value: n, onInput: v => { n = v; draw(); } }), slider('λ', { min: 0, max: 1, step: 0.05, value: lambda, format: v => v.toFixed(2), onInput: v => { lambda = v; draw(); } }), out);
      draw();
    }
  });
})(window);
