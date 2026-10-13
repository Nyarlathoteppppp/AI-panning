/* Week 10 visualisers: aliased gridworld, tabular REINFORCE, linear policy gradient. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { table, readout } = RL.gridView;
  const { rng: rngOf, sampleIndex } = RL.mdp;
  const L = RL.learn;
  const tf = (x, d) => fmt(x, d == null ? 4 : d).replace('−', '-');

  /* Aliased Gridworld (W10 slides 10-12): top row w1 g1 w2 g2 w3; below w1 and w3 a skull (−1),
   * below w2 the money (+1). Grey cells look identical, so the policy must be the same there.
   * Deterministic moves; Up and moving into the outer boundary or the wall cells keep the agent in place. */
  const CELLS = ['w1', 'g1', 'w2', 'g2', 'w3'], OBS = ['w1', 'grey', 'w2', 'grey', 'w3'];
  const ACT = ['Left', 'Right', 'Down', 'Up'];
  function stepAliased(i, a) { // returns {next (index or 'skull'|'money'), r}
    if (a === 'Left') return { next: Math.max(0, i - 1), r: 0 };
    if (a === 'Right') return { next: Math.min(4, i + 1), r: 0 };
    if (a === 'Down') { if (i === 2) return { next: 'money', r: 1 }; if (i === 0 || i === 4) return { next: 'skull', r: -1 }; return { next: i, r: 0 }; }
    return { next: i, r: 0 };
  }
  /** Exact discounted value of each start cell, and P(goal within H steps), for a policy over observations. */
  function evaluateAliased(pol, gamma, H) {
    const V = new Array(5).fill(0);
    for (let it = 0; it < 2000; it++) {
      const nv = CELLS.map((_, i) => ACT.reduce((acc, a) => { const p = pol[OBS[i]][a] || 0; if (!p) return acc; const o = stepAliased(i, a); return acc + p * (o.r + gamma * (typeof o.next === 'number' ? V[o.next] : 0)); }, 0));
      const d = Math.max(...nv.map((v, i) => Math.abs(v - V[i]))); V.splice(0, 5, ...nv); if (d < 1e-12) break;
    }
    let P = new Array(5).fill(0); // P(reach money within k steps)
    for (let k = 0; k < H; k++) P = CELLS.map((_, i) => ACT.reduce((acc, a) => { const p = pol[OBS[i]][a] || 0; if (!p) return acc; const o = stepAliased(i, a); return acc + p * (o.next === 'money' ? 1 : o.next === 'skull' ? 0 : P[o.next]); }, 0));
    return { V, P, J: V.reduce((a, b) => a + b, 0) / 5, goal: P.reduce((a, b) => a + b, 0) / 5 };
  }
  function aliasedSVG(pol, highlight) {
    const W = 380, cw = 72, S = svg;
    return S('svg', { viewBox: '0 0 ' + W + ' 160', class: 'chart' },
      CELLS.map((c, i) => {
        const x = 10 + i * cw, grey = OBS[i] === 'grey', p = pol[OBS[i]];
        const arrows = [['Left', -1, 0], ['Right', 1, 0], ['Down', 0, 1], ['Up', 0, -1]].filter(([a]) => (p[a] || 0) > 0.01);
        return [S('rect', { x, y: 10, width: cw, height: 70, fill: grey ? 'var(--wall)' : 'var(--surface)', stroke: highlight === i ? 'var(--c-blue)' : 'var(--border-strong)', 'stroke-width': highlight === i ? 4 : 1.2 }),
          S('text', { x: x + 6, y: 26, class: 'tick', text: c }),
          arrows.map(([a, dx, dy]) => S('line', { x1: x + cw / 2, y1: 50, x2: x + cw / 2 + dx * 24, y2: 50 + dy * 22, stroke: 'var(--c-red)', 'stroke-width': 1.5 + 5 * p[a], 'stroke-linecap': 'round', opacity: 0.35 + 0.65 * p[a] })),
          S('rect', { x, y: 80, width: cw, height: 60, fill: i === 2 ? 'var(--goal)' : (i === 0 || i === 4) ? 'var(--pit)' : 'var(--surface-3)', stroke: 'var(--border-strong)' }),
          S('text', { x: x + cw / 2, y: 116, class: 'g-term', style: 'font-size:16px', text: i === 2 ? '$ +1' : (i === 0 || i === 4) ? '☠ −1' : '' })];
      }));
  }
  RL.viz.register('aliased', {
    title: 'Aliased Gridworld：两个灰格看起来一样，确定性 policy 必有一个卡住',
    mount(el) {
      let p = 1;
      const pic = h('div'), out = h('div'), chart = h('div');
      const policyFor = pr => ({ w1: { Right: 1 }, w2: { Down: 1 }, w3: { Left: 1 }, grey: { Right: pr, Left: 1 - pr } });
      function draw() {
        const ev = evaluateAliased(policyFor(p), 0.9, 100);
        clear(pic).put(aliasedSVG(policyFor(p)));
        clear(out).put(table(['起点', 'w1', 'g1', 'w2', 'g2', 'w3', '平均'], [
          ['期望折扣回报 V', ...ev.V.map(v => fmt(v, 3)), h('b', fmt(ev.J, 3))], ['100 步内到达 $ 的概率', ...ev.P.map(v => fmt(v, 3)), h('b', fmt(ev.goal, 3))]]),
          h('p.viz-note', p === 1 ? '确定性“灰格都向右”：从 g2 或 w3 出发会在 g2 ↔ w3 之间永远来回（w3 向左回到 g2，g2 又向右）。平均到达率只有 3/5 = 0.6。'
            : p === 0 ? '确定性“灰格都向左”：对称地，从 w1、g1 出发会卡住。'
              : 'π(Right|grey) = ' + fmt(p, 2) + '：卡住的循环会以概率被打破。p = 0.5 时两边对称，平均回报最高。'));
        const xs = Array.from({ length: 51 }, (_, i) => i / 50), Js = xs.map(v => evaluateAliased(policyFor(v), 0.9, 100).J);
        const W = 360, H = 130, X = v => 30 + v * (W - 40), Y = v => 10 + (1 - (v + 0.1) / 1) * (H - 30);
        clear(chart).put(svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' },
          svg('line', { x1: 30, x2: W - 10, y1: H - 20, y2: H - 20, class: 'axis' }), [0, 0.5, 1].map(v => svg('text', { x: X(v), y: H - 6, class: 'tick', 'text-anchor': 'middle', text: v })),
          [0, 0.4, 0.8].map(v => svg('text', { x: 26, y: Y(v) + 3, class: 'tick', 'text-anchor': 'end', text: v })),
          svg('polyline', { points: xs.map((v, i) => X(v) + ',' + Y(Js[i])).join(' '), fill: 'none', stroke: 'var(--c-blue)', 'stroke-width': 2 }),
          svg('circle', { cx: X(p), cy: Y(ev.J), r: 5, fill: 'var(--c-orange)' }),
          svg('text', { x: W / 2, y: 12, class: 'label', 'text-anchor': 'middle', text: '平均期望回报 J 随 π(Right|grey) 的变化' })));
      }
      el.put(h('div.viz-note', '这个实验在做什么：观察 Aliased Gridworld（混叠网格世界）中随机 policy（策略）如何打破循环。w = 白格（各自可区分）；g = 灰格（两个灰格在 agent 看来一模一样，policy 在它们上面必须相同）。'),
        pic, slider('π(Right | grey)', { min: 0, max: 1, step: 0.05, value: p, format: v => v.toFixed(2), onInput: v => { p = v; draw(); } }),
        h('div.viz-row', button('确定性：都向右', () => { p = 1; sl(); }, 'btn'), button('确定性：都向左', () => { p = 0; sl(); }, 'btn'), button('随机：0.5 / 0.5', () => { p = 0.5; sl(); }, 'btn primary')), out, chart,
        h('p.muted', 'w1→、w2↓、w3← 固定为最优；只调整灰格（被混叠的状态）上的随机性。γ = 0.9，起点在五个上方格子中均匀分布（与课件实验相同）。'));
      const sl = () => { el.querySelector('input[type=range]').value = p; el.querySelector('.slider-value').textContent = p.toFixed(2); draw(); };
      draw();
    }
  });

  /* ---------- c27: tabular REINFORCE ---------- */
  RL.viz.register('reinforce', {
    title: 'Tabular REINFORCE：偏好 h → softmax 概率 → 按 return 更新',
    mount(el) {
      let tab = 'one';
      const body = h('div');
      function one() {
        const S = { h: [0, 0, 0], a: 1, G: 1, alpha: 0.1, gamma: 0.9, t: 0 };
        const names = ['a₁', 'a₂', 'a₃'];
        const out = h('div'), hInputs = h('div.viz-row');
        names.forEach((n, i) => hInputs.put(h('label.viz-row', { style: { gap: '4px' } }, h('span.muted', 'h(s,' + n + ')'),
          h('input.viz-input', { type: 'number', step: '0.1', value: S.h[i], oninput: e => { S.h[i] = parseFloat(e.target.value) || 0; draw(); } }))));
        function bars(vals, color) { return vals.map((v, i) => h('div.bar-row', h('span', names[i]), h('div.bar', h('i', { style: { width: (100 * v).toFixed(1) + '%', background: 'var(--c-' + color + ')' } })), h('span.num', fmt(v, 4)))); }
        function draw() {
          const r = L.reinforceTabular(S.h, S.a, S.G, S.alpha, S.gamma, S.t);
          clear(out).put(
            h('h4', '① 偏好 → 概率（softmax）'), bars(r.pi, 'blue'),
            h('h4', '② 每个动作的梯度项 1{b = A_t} − π(b|s)'),
            table(['动作 b', '1{b=A_t}', 'π(b|s)', '1{b=A_t} − π(b|s)', 'Δh = αγᵗG·(…)', '新 h'], names.map((n, b) => ({ cells: [n, b === S.a ? '1' : '0', fmt(r.pi[b], 4), fmt(r.grad[b], 4), fmt(r.delta[b], 4), fmt(r.next[b], 4)], cls: b === S.a ? 'hl' : null }))),
            h('div', { html: texHTML('\\alpha\\gamma^{t}G_t = ' + S.alpha + '\\times' + S.gamma + '^{' + S.t + '}\\times' + tf(S.G, 2) + ' = ' + tf(r.scale), true) }),
            h('h4', '③ 更新后的概率'), bars(r.after, 'green'),
            h('p.viz-note', 'Δh 之和恒为 ' + fmt(r.delta.reduce((a, b) => a + b, 0), 6) + '：选中的动作偏好上升多少，其他动作合计就下降多少。G > 0 时被选动作概率上升；G < 0 时反过来；G = 0 时什么都不变。'),
            button('应用这次更新（h ← 新 h）', () => { S.h = r.next.slice(); hInputs.querySelectorAll('input').forEach((x, i) => { x.value = S.h[i].toFixed(4); }); draw(); }, 'btn'));
        }
        body.put(hInputs, h('div.viz-row', h('span', '这一步选中的动作 A_t：'), segmented(names.map((n, i) => ({ value: i, label: n })), S.a, v => { S.a = v; draw(); }, 'A_t')),
          slider('G_t', { min: -2, max: 2, step: 0.1, value: S.G, format: v => v.toFixed(1), onInput: v => { S.G = v; draw(); } }),
          slider('α', { min: 0.01, max: 1, step: 0.01, value: S.alpha, format: v => v.toFixed(2), onInput: v => { S.alpha = v; draw(); } }),
          slider('时刻 t（γᵗ）', { min: 0, max: 10, step: 1, value: S.t, onInput: v => { S.t = v; draw(); } }), out);
        draw();
      }
      function train() {
        let H, rng, episodes, hist, alpha = 0.1;
        const pic = h('div'), out = h('div'), chart = h('div');
        function reset() { H = { w1: [0, 0, 0, 0], grey: [0, 0, 0, 0], w2: [0, 0, 0, 0], w3: [0, 0, 0, 0] }; rng = rngOf(8); episodes = 0; hist = []; draw(); }
        const pol = () => Object.fromEntries(Object.entries(H).map(([o, hv]) => { const p = L.softmax(hv, 1); return [o, Object.fromEntries(ACT.map((a, i) => [a, p[i]]))]; }));
        function run(n) {
          for (let k = 0; k < n; k++) {
            let i = Math.floor(rng() * 5); const traj = [];
            for (let t = 0; t < 100; t++) {
              const o = OBS[i], p = L.softmax(H[o], 1), a = sampleIndex(p, rng()), res = stepAliased(i, ACT[a]);
              traj.push({ o, a, r: res.r }); if (typeof res.next !== 'number') break; i = res.next;
            }
            const G = L.returnsBackward(traj.map(x => x.r), 0.9);
            traj.forEach((x, t) => { H[x.o] = L.reinforceTabular(H[x.o], x.a, G[t], alpha, 0.9, t).next; });
            episodes++;
            if (episodes % 10 === 0) hist.push(pol().grey.Right);
          }
          draw();
        }
        function draw() {
          const P = pol(), ev = evaluateAliased(P, 0.9, 100);
          clear(pic).put(aliasedSVG(P));
          clear(out).put(table(['观察', ...ACT.map(a => 'π(' + a + ')'), ...ACT.map(a => 'h(' + a + ')')], Object.keys(H).map(o => [o, ...ACT.map(a => fmt(P[o][a], 3)), ...H[o].map(v => fmt(v, 2))])),
            readout([['已训练 episode', String(episodes)], ['当前 policy 的平均期望回报 J', fmt(ev.J, 3) + '（最好的确定性 policy 0.542）'], ['100 步内到达 $ 的概率', fmt(ev.goal, 3)]]));
          clear(chart).put(h('h4', '纵轴：π(Right | grey)；虚线 0.5＝最好的对称随机 policy（策略）'),
            hist.length > 1 ? [RL.vizUtil.lineChart([{ values: hist, color: 'orange' }, { values: hist.map(() => 0.5), color: 'gray', dash: '4 3' }], { xlabel: 'episode / 10', min: 0, max: 1 }), h('p.muted', 'π(Right | grey) 的变化：REINFORCE 会把它推向 0.5 附近——确定性的 Q-learning 做不到。')] : null);
        }
        body.put(slider('α', { min: 0.01, max: 0.5, step: 0.01, value: alpha, format: v => v.toFixed(2), onInput: v => { alpha = v; } }),
          h('div.viz-row', button('训练 100 条 episode', () => run(100), 'btn primary'), button('训练 1000 条', () => run(1000), 'btn'), button('重置 h = 0', reset, 'btn ghost')), pic, out, chart);
        reset();
      }
      function draw() { clear(body); if (tab === 'one') one(); else train(); }
      el.put(segmented([{ value: 'one', label: '一次更新逐项看' }, { value: 'train', label: '在 Aliased Gridworld 上训练' }], tab, v => { tab = v; draw(); }, '视图'), body);
      draw();
    }
  });

  /* ---------- c28: linear softmax policy gradient ---------- */
  RL.viz.register('policygrad', {
    title: '线性 policy：∇θ log π(a|s) = f(s,a) − Σ π(b|s) f(s,b)',
    mount(el) {
      const S = { theta: [0.5, -0.5], a: 0, G: 1, alpha: 0.2, onehot: false };
      const featsLinear = [[1, 0], [0, 1], [1, 1]];
      const out = h('div');
      function feats() { return S.onehot ? [[1, 0, 0], [0, 1, 0], [0, 0, 1]] : featsLinear; }
      function draw() {
        const f = feats(), th = S.onehot ? (S.theta.length === 3 ? S.theta : [0, 0, 0]) : S.theta.slice(0, 2);
        const r = L.linearPolicyGradient(th, f, S.a), next = th.map((v, i) => v + S.alpha * S.G * r.grad[i]);
        const after = L.linearPolicyGradient(next, f, S.a);
        clear(out).put(
          table(['动作 b', 'f(s,b)', 'h = θᵀf', 'π(b|s)', 'π(b|s)·f(s,b)'], f.map((fv, b) => ({ cells: ['a' + (b + 1), '(' + fv.join(', ') + ')', fmt(r.prefs[b], 3), fmt(r.pi[b], 4), '(' + fv.map(v => fmt(r.pi[b] * v, 3)).join(', ') + ')'], cls: b === S.a ? 'hl' : null }))),
          h('div', { html: texHTML('\\nabla_\\theta\\log\\pi(a_' + (S.a + 1) + '|s) = f(s,a_' + (S.a + 1) + ') - \\textstyle\\sum_b\\pi(b|s)f(s,b) = (' + f[S.a].join(',') + ') - (' + r.mean.map(v => tf(v, 3)).join(',') + ') = (' + r.grad.map(v => tf(v, 3)).join(',') + ')', true) }),
          h('div', { html: texHTML('\\theta \\leftarrow \\theta + \\alpha G\\,\\nabla\\log\\pi = (' + th.map(v => tf(v, 3)).join(',') + ') + ' + S.alpha + '\\times' + tf(S.G, 1) + '\\times(' + r.grad.map(v => tf(v, 3)).join(',') + ') = (' + next.map(v => tf(v, 3)).join(',') + ')', true) }),
          table(['', 'π(a1)', 'π(a2)', 'π(a3)'], [['更新前', ...r.pi.map(v => fmt(v, 4))], ['更新后', ...after.pi.map(v => fmt(v, 4))]]),
          h('p.viz-note', S.onehot ? 'one-hot 特征：f(s,b) 是第 b 个位置为 1 的向量，θ 的每个分量就是一个偏好 h(s,b)，梯度变成 1{b=a} − π(b|s)——正好是 tabular REINFORCE。'
            : '共享特征：a3 的特征 (1,1) 同时包含 a1 和 a2 的特征。更新 θ 时，三个动作的偏好会一起改变——这就是 policy 近似中的“参数共享”。'));
      }
      const thetaSliders = h('div');
      function buildSliders() {
        clear(thetaSliders);
        const n = S.onehot ? 3 : 2; if (S.theta.length !== n) S.theta = new Array(n).fill(0).map((_, i) => S.theta[i] || 0);
        for (let i = 0; i < n; i++) thetaSliders.put(slider('θ' + (i + 1), { min: -2, max: 2, step: 0.1, value: S.theta[i], format: v => v.toFixed(1), onInput: v => { S.theta[i] = v; draw(); } }));
      }
      el.put(segmented([{ value: false, label: '线性特征（2 维，共享）' }, { value: true, label: 'one-hot 特征（= tabular）' }], S.onehot, v => { S.onehot = v; buildSliders(); draw(); }, '特征'),
        thetaSliders, h('div.viz-row', h('span', '选中的动作：'), segmented([0, 1, 2].map(i => ({ value: i, label: 'a' + (i + 1) })), S.a, v => { S.a = v; draw(); }, 'A_t')),
        slider('G（已含 γᵗ）', { min: -2, max: 2, step: 0.1, value: S.G, format: v => v.toFixed(1), onInput: v => { S.G = v; draw(); } }),
        slider('α', { min: 0.01, max: 1, step: 0.01, value: S.alpha, format: v => v.toFixed(2), onInput: v => { S.alpha = v; draw(); } }), out);
      buildSliders(); draw();
    }
  });
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { evaluateAliased, aliasedSVG });
})(window);
