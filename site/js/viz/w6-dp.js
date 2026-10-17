/* Week 6-2 visualisers: Bellman backups and dynamic programming. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout, A_ZH } = RL.gridView;
  const { courseGrid, ARROWS } = RL.mdp;
  const dp = RL.dp;
  const f = (x, d) => fmt(x, d == null ? 3 : d).replace('−', '-');
  const BR = { intended: '按预期', 'slip left': '左滑', 'slip right': '右滑' };

  function viHistory(g, n) { const list = [dp.zeros(g)]; for (let i = 0; i < n; i++) list.push(dp.valueIterationSweep(g, list[list.length - 1]).V); return list; }
  function uniformPolicy(g) { const p = {}; g.nonTerminal.forEach(s => { p[s] = { N: .25, E: .25, S: .25, W: .25 }; }); return p; }
  /** Line chart: series = [{values, color, label}] */
  function lineChart(series, opts) {
    const W = 360, H = 150, pad = opts && opts.log ? 44 : 30, n = Math.max(2, ...series.map(s => s.values.length));
    const all = series.flatMap(s => s.values).filter(v => Number.isFinite(v));
    let lo = opts && opts.min != null ? opts.min : Math.min(0, ...all), hi = opts && opts.max != null ? opts.max : Math.max(1e-9, ...all);
    if (opts && opts.log) {
      const logs = all.map(v => Math.log10(Math.max(v, 1e-8)));
      lo = Math.floor(Math.min(...logs)); hi = Math.ceil(Math.max(...logs));
      if (hi === lo) hi = lo + 1;
    }
    const X = i => pad + i / (n - 1) * (W - pad - 8), Y = v => { const t = opts && opts.log ? Math.log10(Math.max(v, 1e-8)) : v; return 8 + (1 - (t - lo) / ((hi - lo) || 1)) * (H - 8 - 20); };
    return svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' },
      svg('line', { x1: pad, x2: W - 8, y1: H - 20, y2: H - 20, class: 'axis' }), svg('line', { x1: pad, x2: pad, y1: 8, y2: H - 20, class: 'axis' }),
      svg('text', { x: pad - 4, y: 14, class: 'tick', 'text-anchor': 'end', text: opts && opts.log ? '1e' + Math.round(hi) : fmt(hi, 2) }),
      svg('text', { x: pad - 4, y: H - 22, class: 'tick', 'text-anchor': 'end', text: opts && opts.log ? (lo === -8 ? '≤' : '') + '1e' + lo : fmt(lo, 2) }),
      svg('text', { x: W - 8, y: H - 6, class: 'tick', 'text-anchor': 'end', text: (opts && opts.xlabel) || '' }),
      series.map(s => svg('polyline', { points: s.values.map((v, i) => X(i) + ',' + Y(v)).join(' '), fill: 'none', stroke: 'var(--c-' + s.color + ')', 'stroke-width': 2, 'stroke-dasharray': s.dash || null })));
  }

  /* ---------- c07: Bellman backup ---------- */
  RL.viz.register('bellman', {
    title: 'Bellman backup：点一个状态，把数字逐项代入',
    mount(el) {
      const g = courseGrid(), hist = viHistory(g, 200);
      const sources = { v0: { label: 'V₀ = 0（全零）', V: hist[0] }, v1: { label: 'V₁（一次 VI 后）', V: hist[1] }, v2: { label: 'V₂', V: hist[2] }, vstar: { label: 'V*（收敛后）', V: hist[200] },
        vpi0: { label: 'V^π₀（课件随手挑的确定性 policy π₀）', V: dp.policyEvaluationExact(g, RL.examples.PI0) } };
      let src = 'v1', s = 10, a = 'E', mode = 'opt', step = 0;
      const gridBox = h('div'), steps = h('div'), ctrl = h('div.viz-row');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { s = st; step = 0; draw(); } } });
      const srcSel = h('select.viz-select', Object.entries(sources).map(([k, v]) => h('option', { value: k, selected: k === src }, v.label)));
      srcSel.addEventListener('change', () => { src = srcSel.value; step = 0; draw(); });
      const actSeg = segmented(g.actions.map(x => ({ value: x, label: ARROWS[x] + ' ' + x })), a, v => { a = v; step = 0; draw(); }, '动作');
      const modeSeg = segmented([{ value: 'opt', label: 'Optimality：取 max' }, { value: 'exp', label: 'Expectation：按 π 加权' }], mode, v => { mode = v; step = 0; draw(); }, '方程');
      function draw() {
        const V = sources[src].V, d = dp.backupDetail(g, V, s, a);
        const hl = {}; d.terms.forEach(t => { hl[t.next] = 'green'; });
        view.update({ values: V, decimals: 3, selected: s, highlight: hl });
        const all = g.actions.map(x => dp.backupDetail(g, V, s, x));
        const cards = [];
        cards.push(h('div.viz-step', h('b', '第 1 步 · 列出 (s, a) 的所有后继'), h('p', 's = s' + s + '，a = ' + A_ZH[a] + '。三次移动尝试：'),
          table(['尝试', 'p', 's′', 'r(s,a,s′)', 'V(s′)'], d.terms.map(t => [BR[t.kind], fmt(t.prob, 1), 's' + t.next + (t.blocked ? '（原地）' : ''), fmt(t.reward, 0), fmt(t.vNext, 3) + (g.isTerminal(t.next) ? '（终止，按定义＝0）' : t.vNext === 0 ? '（表中暂为 0：还没学到）' : '')]))));
        cards.push(h('div.viz-step', h('b', '第 2 步 · 每个分支算“即时奖励 + 折扣后的未来价值”'),
          h('div', { html: texHTML(d.terms.map(t => 'r + \\gamma V(s_{' + t.next + '}) = ' + f(t.reward, 0) + ' + 0.9\\times' + f(t.vNext) + ' = ' + f(t.inner, 4)).join('\\\\'), true) })));
        cards.push(h('div.viz-step', h('b', '第 3 步 · 按概率加权求和，得到 Q(s, a)'),
          h('div', { html: texHTML('Q(s_{' + s + '},' + a + ') = ' + d.terms.map(t => f(t.prob, 1) + '\\times' + f(t.inner, 4)).join(' + ') + ' = \\mathbf{' + f(d.q, 4) + '}', true) })));
        const qRows = all.map(x => [A_ZH[x.a], fmt(x.q, 4)]);
        if (mode === 'opt') {
          const best = Math.max(...all.map(x => x.q));
          cards.push(h('div.viz-step', h('b', '第 4 步 · 对四个动作都做同样计算，取最大值（Bellman optimality）'),
            table(['动作', 'Q(s,a)'], all.map(x => ({ cells: [A_ZH[x.a], fmt(x.q, 4)], cls: Math.abs(x.q - best) < 1e-12 ? 'hl' : null }))),
            h('div', { html: texHTML('V_{\\text{new}}(s_{' + s + '}) = \\max_a Q(s_{' + s + '},a) = \\mathbf{' + f(best, 4) + '}', true) }),
            h('p.muted', '新值写回“下一轮”的表；本轮其他状态仍用旧的 V 计算（同步更新）。')));
        } else {
          const pol = RL.examples.PI0, va = all.find(x => x.a === pol[s]);
          cards.push(h('div.viz-step', h('b', '第 4 步 · 按 policy 的动作概率加权（Bellman expectation）'),
            h('p', '以课件 π₀ 为例：在 s' + s + ' 以概率 1 选 ' + A_ZH[pol[s]] + '，其余动作概率 0：'),
            table(['动作', 'π(a|s)', 'Q(s,a)'], all.map(x => ({ cells: [A_ZH[x.a], x.a === pol[s] ? '1' : '0', fmt(x.q, 4)], cls: x.a === pol[s] ? 'hl' : null }))),
            h('div', { html: texHTML('V^{\\pi}_{\\text{new}}(s_{' + s + '}) = \\sum_a \\pi(a|s)\\,Q(s,a) = \\mathbf{' + f(va.q, 4) + '}', true) }),
            h('p.muted', '若 V 来源选 “V^π₀”，这里得到的数应与 V^π₀(s) 本身相等——这正是“V^π 满足 Bellman expectation 方程”的含义。')));
        }
        clear(steps).put(cards.slice(0, step + 1));
        clear(ctrl).put(button('上一步', () => { step = Math.max(0, step - 1); draw(); }, 'btn'), button(step < cards.length - 1 ? '下一步' : '已到最后', () => { step = Math.min(cards.length - 1, step + 1); draw(); }, 'btn primary'),
          h('span.muted', '第 ' + (step + 1) + ' / ' + cards.length + ' 步'), button('全部展开', () => { step = cards.length - 1; draw(); }, 'btn ghost'));
      }
      el.put(h('div.viz-row', h('span', '用哪张 V 表：'), srcSel), h('div.viz-row', actSeg), h('div.viz-row', modeSeg), gridBox,
        h('p.muted', '绿框＝该动作可能到达的后继 s′。点格子选择状态 s。选 V₀ + s10 + E 得到课件的 0.8；选 V₁ + s10 + E 得到 0.872。'), ctrl, steps);
      draw();
    }
  });

  /* ---------- c08: iterative + exact policy evaluation ---------- */
  RL.viz.register('policyeval', {
    title: 'Policy Evaluation：固定 π，一轮一轮更新 V(s)',
    mount(el) {
      const g = courseGrid();
      const policies = { pi0: ['课件 π₀', RL.examples.PI0], pi1: ['课件 π₁（最优）', null], uni: ['均匀随机 π(a|s)=0.25', uniformPolicy(g)], p1: ['课件示例 policy（W7 用）', RL.examples.POLICY1] };
      policies.pi1[1] = dp.improvePolicy(g, dp.policyEvaluationExact(g, RL.examples.PI0), RL.examples.PI0).policy;
      let key = 'pi0', V, k, deltas, history, sel = 10, showExact = false;
      const gridBox = h('div'), info = h('div'), chart = h('div'), displayLabel = h('p.viz-note');
      const exactBtn = button('显示精确解（线性方程）', () => { showExact = !showExact; draw(); }, 'btn');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { sel = st; draw(); } } });
      const seg = segmented(Object.entries(policies).map(([v, p]) => ({ value: v, label: p[0] })), key, v => { key = v; reset(); }, 'policy');
      function reset() { V = dp.zeros(g); k = 0; deltas = []; history = [V]; showExact = false; draw(); }
      function sweep(n) { showExact = false; for (let i = 0; i < n; i++) { const r = dp.policyEvaluationSweep(g, V, policies[key][1]); V = r.V; k++; deltas.push(r.delta); history.push(V); if (r.delta < 1e-10) break; } draw(); }
      function draw() {
        const pol = policies[key][1], exact = dp.policyEvaluationExact(g, pol);
        const arrows = {}; g.nonTerminal.forEach(st => { arrows[st] = typeof pol[st] === 'string' ? pol[st] : pol[st]; });
        view.update({ values: showExact ? exact : V, decimals: 4, policy: arrows, selected: sel });
        exactBtn.textContent = showExact ? '返回迭代值 V_k' : '显示精确解（线性方程）';
        exactBtn.setAttribute('aria-pressed', String(showExact));
        displayLabel.textContent = showExact ? '格子当前显示：精确解 V^π。下方保留第 ' + k + ' 轮的迭代记录，便于对照。' : '格子当前显示：第 ' + k + ' 轮迭代值 V_k。';
        const prev = history[Math.max(0, history.length - 2)];
        const probs = dp.policyProbs(g, pol, sel);
        const parts = g.actions.filter(a => probs[a] > 0).map(a => ({ a, p: probs[a], d: dp.backupDetail(g, prev, sel, a) }));
        const stoch = parts.length > 1, rows = parts.map(x => ({ cells: [
          A_ZH[x.a], fmt(x.p, 2),
          x.d.terms.map(t => fmt(t.prob, 1) + '×(' + fmt(t.reward, 0) + '+0.9×' + fmt(t.vNext, 3) + ')').join(' + '),
          fmt(x.d.q, 4), fmt(x.p * x.d.q, 4)] }));
        clear(info).put(
          readout([['已做 sweep 数 k', String(k)], ['最近一轮 max|Δ|', deltas.length ? fmt(deltas[deltas.length - 1], 6) : '—'],
            ['s' + sel + ' 当前 V<sub>k</sub>', fmt(V[sel], 4)], ['s' + sel + ' 精确 V<sup>π</sup>', fmt(exact[sel], 4)]]),
          k > 0 ? h('div.viz-step', h('b', '第 ' + k + ' 轮在 s' + sel + ' 的计算（读第 ' + (k - 1) + ' 轮的表）'),
            h('p.muted', stoch ? '这个 policy 在 s' + sel + ' 会以不同概率选几个动作：先算每个动作的 Q（三条滑动分支），再按 π(a|s) 加权求和。'
              : '这个 policy 在 s' + sel + ' 只选一个动作，所以只有一行：它的 Q 就是新的 V。'),
            table(['动作 a', 'π(a|s)', '三条分支：p ×（r + 0.9 × V<sub>k−1</sub>(s′)）', 'Q(s,a)', 'π × Q'], rows.concat([{ cells: ['合计', '', '', '', '<b>' + fmt(V[sel], 4) + '</b>'], cls: 'hl' }]))) :
            h('p.muted', '还没开始：V₀ 全为 0。点“做 1 轮”。'),
          h('details', h('summary', '所有状态：当前 V_k 与精确解对比'),
            table(['状态', 'V<sub>k</sub>', '精确 V<sup>π</sup>', '差'], g.nonTerminal.map(st => ({ cells: ['s' + st, fmt(V[st], 4), fmt(exact[st], 4), fmt(Math.abs(V[st] - exact[st]), 4)], cls: st === sel ? 'hl' : null })))));
        clear(chart).put(deltas.length > 1 ? lineChart([{ values: deltas, color: 'blue' }], { log: true, xlabel: 'sweep k' }) : h('span'),
          deltas.length > 1 ? h('p.muted', { html: 'max|V<sub>k</sub> − V<sub>k−1</sub>|（对数坐标）：每轮误差按约 γ 的比例缩小。' }) : null);
      }
      const explain = h('div.viz-note', { html:
        '<b>这个图在做什么：</b>policy 固定不变，我们求它的价值。' +
        '<br>• <b>格子里的数字</b> = 当前这一轮算出的 V<sub>k</sub>(s)，一开始全是 0。' +
        '<br>• <b>橙色箭头</b> = 被评估的 policy 在这个格子选哪个动作。随机 policy（如“均匀随机”）会画出好几根，粗细表示概率——均匀随机就是上下左右四根一样粗，各 0.25。' +
        '<br>• <b>“做 1 轮”</b> = 对每个格子做一次 Bellman expectation backup：用上一轮的表，按 policy 的动作概率和 0.8/0.1/0.1 的滑动，算出新值。重复下去，数字会收敛到“精确解”。' +
        '<br>• <b>点任意格子</b>看它这一轮是怎么算出来的。' });
      el.put(explain, seg, h('div.viz-row', button('做 1 轮', () => sweep(1), 'btn primary'), button('做 10 轮', () => sweep(10), 'btn'), button('直到收敛', () => sweep(1000), 'btn'),
        exactBtn, button('重置', reset, 'btn ghost')), displayLabel, gridBox,
        h('p.muted', '“显示精确解”：格子里改为显示解线性方程（第 8 章“直觉”的方法）得到的 V^π，可与迭代结果对照。'), info, chart);
      reset();
    }
  });

  /* ---------- c09: policy iteration stepper ---------- */
  RL.viz.register('policyiter', {
    title: 'Policy Iteration：精确评估 → 贪心改进 → 直到 policy 不变',
    mount(el) {
      const g = courseGrid();
      const inits = { pi0: ['课件 π₀', () => Object.assign({}, RL.examples.PI0)], left: ['全部向左', () => Object.fromEntries(g.nonTerminal.map(s => [s, 'W']))],
        down: ['全部向下', () => Object.fromEntries(g.nonTerminal.map(s => [s, 'S']))] };
      let init = 'pi0', pi, V, Q, phase, iter, changed, logRows;
      const gridBox = h('div'), info = h('div'), log = h('div'), polLine = h('p.viz-note');
      const nextBtn = button('下一阶段', next, 'btn primary');
      const view = gridView(gridBox, g);
      const seg = segmented(Object.entries(inits).map(([v, p]) => ({ value: v, label: p[0] })), init, v => { init = v; reset(); }, '初始 policy');
      function reset() { pi = inits[init][1](); V = null; Q = null; phase = 'start'; iter = 0; changed = []; logRows = []; draw(); }
      function next() {
        if (phase === 'start' || phase === 'improved') { V = dp.policyEvaluationExact(g, pi); phase = 'evaluated'; }
        else if (phase === 'evaluated') {
          const r = dp.improvePolicy(g, V, pi); Q = r.Q; changed = r.changed; iter++;
          logRows.push(['第 ' + iter + ' 轮', fmt(V[1], 4), r.changed.length ? r.changed.map(s => 's' + s + ': ' + ARROWS[pi[s]] + '→' + ARROWS[r.policy[s]]).join('，') : '无变化 → 收敛']);
          pi = r.policy; phase = r.stable ? 'done' : 'improved';
        }
        draw();
      }
      function draw() {
        const hl = {}; changed.forEach(s => { hl[s] = 'orange'; });
        if (phase === 'evaluated') view.update({ values: V, decimals: 4, policy: pi });
        else if (phase === 'improved' || phase === 'done') view.update({ q: Q, qDecimals: 3, highlight: hl });
        else view.update({ policy: pi });
        nextBtn.textContent = phase === 'done' ? '已收敛（π 不再变化）' : '下一阶段';
        nextBtn.disabled = phase === 'done';
        polLine.textContent = '当前 policy（策略）：' + g.nonTerminal.map(s => 's' + s + ' ' + ARROWS[pi[s]]).join('；') + '。Q 视图不画箭头，以免遮住数字。';
        const msg = {
          start: '从初始 policy 开始。下一步：精确评估它（解 9 个未知数的线性方程）。',
          evaluated: '已得到 V^π（每格数字）。它满足 V(s) = Σ p(s′|s,π(s))[r + γV(s′)]。下一步：用它算每个状态四个动作的 Q^π，取 argmax 作为新 policy。',
          improved: '三角形是 Q^π(s,a)，黄色是每格最大者；橙框是动作发生变化的状态。policy 变了，所以要再评估一次。',
          done: '改进后 policy 与评估时完全相同（π_{k+1} = π_k），Policy Iteration 结束：这就是最优 policy，V^π = V*。'
        }[phase];
        clear(info).put(h('div.viz-step', h('b', { start: '准备', evaluated: 'Policy evaluation（exact）', improved: 'Policy improvement', done: '收敛' }[phase]), h('p', msg)));
        clear(log).put(logRows.length ? table(['改进轮次', '改进前 V^π(s1)', '发生变化的状态'], logRows) : h('span'));
      }
      el.put(seg, h('div.viz-row', nextBtn, button('重置', reset, 'btn ghost')), polLine, gridBox,
        h('p.muted', '橙框＝本轮贪心动作发生改变的状态。'), info, log);
      reset();
    }
  });

  /* ---------- c10: value iteration ---------- */
  RL.viz.register('valueiter', {
    title: 'Value Iteration：每轮对所有状态做一次 Bellman optimality backup',
    mount(el) {
      const g = courseGrid();
      let V, t, deltas, policies, sel = 10, view_ = 'q', eps = 0.001;
      const gridBox = h('div'), info = h('div'), chart = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { sel = st; draw(); } } });
      const seg = segmented([{ value: 'q', label: '看 Q_t(s,a)（课件右图）' }, { value: 'v', label: '看本轮更新后的 V_t(s)' }], view_, v => { view_ = v; draw(); }, '视图');
      const epsSlider = slider('停止阈值 ε', { min: -6, max: -1, step: 1, value: -3, format: v => '1e' + v, onInput: v => { eps = Math.pow(10, v); draw(); } });
      let lastQ = null, prevV = null;
      function reset() { V = dp.zeros(g); t = 0; deltas = []; policies = []; lastQ = null; prevV = null; draw(); }
      function iterate(n) {
        for (let i = 0; i < n; i++) {
          const r = dp.valueIterationSweep(g, V); prevV = V; V = r.V; lastQ = r.Q; t++; deltas.push(r.delta);
          policies.push(dp.greedyPolicy(g, V));
          if (n > 1 && r.delta < eps) break;
        }
        draw();
      }
      function draw() {
        const pol = t ? dp.greedyPolicy(g, V) : null;
        if (view_ === 'q' && lastQ) view.update({ q: lastQ, qDecimals: 3, selected: sel });
        else view.update({ values: V, decimals: 3, policy: pol, selected: sel });
        const changes = [];
        for (let i = 1; i < policies.length; i++) {
          const diff = g.nonTerminal.filter(s => policies[i][s] !== policies[i - 1][s]);
          if (diff.length) changes.push('第 ' + (i + 1) + ' 轮：' + diff.map(s => 's' + s + ' ' + ARROWS[policies[i - 1][s]] + '→' + ARROWS[policies[i][s]]).join('，'));
        }
        const rows = prevV ? g.actions.map(a => { const d = dp.backupDetail(g, prevV, sel, a); return { a, d }; }) : [];
        const best = rows.length ? Math.max(...rows.map(r => r.d.q)) : 0;
        clear(info).put(
          readout([['迭代 t', String(t)], ['max|V<sub>t</sub> − V<sub>t−1</sub>|', deltas.length ? fmt(deltas[deltas.length - 1], 6) : '—'], ['是否满足停止条件', deltas.length && deltas[deltas.length - 1] < eps ? '是（< ε）' : '否'], ['V_t(s1)', fmt(V[1], 4) + '（V*(s1) ≈ 0.5452）']]),
          rows.length ? h('div.viz-step', h('b', { html: 's' + sel + ' 在第 ' + t + ' 轮：Q<sub>t</sub> 用 V<sub>t−1</sub> 计算，再取 max' }),
            table(['动作', 'Q<sub>t</sub>(s,a) = Σ p[r + γV<sub>t−1</sub>(s′)]', '值'], rows.map(r => ({ cells: [A_ZH[r.a], r.d.terms.map(x => fmt(x.prob, 1) + '×(' + fmt(x.reward, 0) + '+0.9×' + fmt(x.vNext, 3) + ')').join(' + '), fmt(r.d.q, 4)], cls: Math.abs(r.d.q - best) < 1e-12 ? 'hl' : null })))) : h('p.muted', '点“下一轮”开始。V₀(s) = 0 对所有 s（不是必须的初值）。'),
          changes.length ? h('details', h('summary', '贪心 policy 在哪些轮发生了变化（' + changes.length + ' 次）'), h('ul', changes.map(c => h('li', c)))) : null);
        clear(chart).put(h('h4', '每轮最大变化 Δ = max_s |V_t(s) − V_{t−1}(s)|'),
          deltas.length > 1 ? lineChart([{ values: deltas, color: 'purple' }], { log: true, xlabel: '迭代 t' }) : h('span'));
      }
      el.put(seg, h('div.viz-row', button('下一轮', () => iterate(1), 'btn primary'), button('跑 10 轮', () => iterate(10), 'btn'), button('直到 max|Δ| < ε', () => iterate(500), 'btn'), button('重置', reset, 'btn ghost')),
        epsSlider, gridBox,
        h('div.viz-note', 'V 视图显示本轮更新后的 V_t（初始为 V₀），不是课件左图的旧表 V_{t−1}；箭头由当前 V_t 做一步前瞻后取贪心动作得到。Q_t 则由旧表 V_{t−1} 计算，Q 视图不画箭头。'),
        h('p.muted', 'Q 视图：每格四个三角形分别是 N（上）、E（右）、S（下）、W（左），黄色＝最大值，即贪心动作。点格子看该状态的四个 backup。'), info, chart);
      reset();
    }
  });

  /* ---------- c11: GPI spectrum ---------- */
  RL.viz.register('gpi', {
    title: 'GPI：m=1：第一轮先评估初始 π₀，之后每轮更新等价于 Value Iteration（价值迭代）',
    mount(el) {
      const g = courseGrid();
      let Vstar = dp.zeros(g); for (let i = 0; i < 400; i++) Vstar = dp.valueIterationSweep(g, Vstar).V;
      const piStar = dp.greedyPolicy(g, Vstar);
      let m = 1;
      const out = h('div'), chart = h('div');
      const mSlider = slider('每次改进前的评估轮数 m', { min: 1, max: 60, step: 1, value: 1, onInput: v => { m = v; run(); } });
      function runGPI(mm) {
        let V = dp.zeros(g), pi = Object.assign({}, RL.examples.PI0), sweeps = 0, improvements = 0, err = [], firstOptimal = null;
        for (let outer = 0; outer < 400 && sweeps < 400; outer++) {
          for (let k = 0; k < mm; k++) { V = dp.policyEvaluationSweep(g, V, pi).V; sweeps++; err.push(Math.max(...g.nonTerminal.map(s => Math.abs(V[s] - Vstar[s])))); }
          const r = dp.improvePolicy(g, V, pi); pi = r.policy; improvements++;
          if (firstOptimal == null && g.nonTerminal.every(s => pi[s] === piStar[s])) firstOptimal = sweeps;
          if (err[err.length - 1] < 1e-6) break;
        }
        return { err, sweeps, improvements, firstOptimal };
      }
      function run() {
        const r = runGPI(m), vi = runGPI(1), pi = runGPI(60);
        clear(out).put(table(['方案', '评估 sweep 总数', '改进次数', 'policy 首次等于 π* 时的 sweep 数'], [
          ['m = 1（先评估 π₀，之后等价于 VI）', vi.sweeps, vi.improvements, vi.firstOptimal], ['当前 m = ' + m, r.sweeps, r.improvements, r.firstOptimal],
          ['m = 60（≈ Policy Iteration 的精确评估）', pi.sweeps, pi.improvements, pi.firstOptimal]]),
          h('p.viz-note', '从课件 π₀、V=0 出发，直到 ‖V − V*‖ < 10⁻⁶。m 越大，每次改进前的评估越准，改进次数越少，但每次改进的成本更高。policy 往往比 V 早很多变成最优。'));
        clear(chart).put(lineChart([{ values: vi.err, color: 'purple' }, { values: r.err, color: 'orange' }, { values: pi.err, color: 'teal', dash: '5 4' }], { log: true, xlabel: '累计评估 sweep 数' }),
          h('div.legend', h('span', h('i', { style: { background: 'var(--c-purple)' } }), 'm=1'), h('span', h('i', { style: { background: 'var(--c-orange)' } }), 'm=' + m), h('span', h('i', { style: { background: 'var(--c-teal)' } }), 'm=60')));
      }
      el.put(mSlider, out, chart, h('p.muted', '纵轴：max_s |V(s) − V*(s)|（对数）。注意：严格的 PI 用解线性方程完成评估，这里用 m 轮迭代近似它。'));
      run();
    }
  });

  RL.vizUtil = Object.assign(RL.vizUtil || {}, { lineChart, viHistory, uniformPolicy });
})(window);
