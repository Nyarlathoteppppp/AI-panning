/* Week 10-2 visualisers: the one-step robot example (REINFORCE, reward shift, learned baseline)
 * and tabular actor-critic (signal comparison, TD actor-critic in the course Gridworld, learning curves). */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, s: svg, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout } = RL.gridView;
  const { courseGrid, rng: rngOf, sampleIndex } = RL.mdp;
  const dp = RL.dp, L = RL.learn;
  const tf = (x, d) => fmt(x, d == null ? 4 : d).replace('−', '-');
  const AN = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' };
  // probabilities very close to 0 or 1 need more digits, otherwise 0.00005 shows as 0.0000
  const pf = p => p < 1e-3 ? p.toFixed(10).replace(/0+$/, '') : p > 1 - 1e-3 ? p.toFixed(10) : fmt(p, 4);

  /* Robot example (W10-2 slides 7-32): s0 with actions A (→ s_t1) and B (→ s_t2); each episode is one step. */
  function robotSVG(st, R) {
    // side (terminal) cells are narrow so the decision cell stays legible on phones
    const S = svg, sw = 92, mw = 200, W = 2 * sw + mw, x0 = sw, pA = L.softmax([st.h[0], st.h[1]])[0];
    const short = p => (p < 1e-3 || p > 1 - 1e-3) ? p.toFixed(5) : fmt(p, 4);
    const cell = (x, w, label, extra) => [S('rect', { x, y: 4, width: w, height: 124, fill: 'var(--surface)', stroke: 'var(--border-strong)', 'stroke-width': 1.5 }),
      S('text', { x: x + 6, y: 20, class: 'label', text: label })].concat(extra || []);
    const box = (x, y, text, color) => [S('rect', { x, y, width: 94, height: 22, rx: 3, style: 'fill:color-mix(in srgb, var(--c-' + color + ') 24%, var(--surface))' }),
      S('text', { x: x + 47, y: y + 15.5, 'text-anchor': 'middle', style: 'font-size:10px;fill:var(--text)', text })];
    const term = (x, r) => S('text', { x: x + sw / 2, y: 74, 'text-anchor': 'middle', style: 'font-size:22px;font-weight:600;fill:var(--c-red)', text: (r > 0 ? '+' : '') + r });
    const lastA = st.last && st.last.a === 0, lastB = st.last && st.last.a === 1;
    const arrow = (x1, x2, on, p) => S('path', { d: 'M' + x1 + ',70 L' + x2 + ',70 M' + (x2 + (x2 < x1 ? 9 : -9)) + ',62 L' + x2 + ',70 L' + (x2 + (x2 < x1 ? 9 : -9)) + ',78',
      stroke: on ? 'var(--c-orange)' : 'var(--c-blue)', 'stroke-width': 2 + 5 * p, fill: 'none', 'stroke-linecap': 'round' });
    return S('svg', { viewBox: '0 0 ' + W + ' 132', class: 'chart', style: 'max-width:520px' },
      cell(0, sw, 'sₜ₁', [term(0, R.A)]),
      cell(x0, mw, 's₀', [
        box(x0 + 4, 26, '偏好 h=' + fmt(st.h[0], 4), 'green'), box(x0 + 102, 26, '偏好 h=' + fmt(st.h[1], 4), 'green'),
        arrow(x0 + 60, x0 + 6, lastA, pA), arrow(x0 + 140, x0 + 194, lastB, 1 - pA),
        S('text', { x: x0 + 30, y: 62, style: 'font-size:12px;fill:var(--muted)', text: 'A' }), S('text', { x: x0 + 166, y: 62, style: 'font-size:12px;fill:var(--muted)', text: 'B' }),
        S('text', { x: x0 + mw / 2, y: 78, 'text-anchor': 'middle', style: 'font-size:22px', text: '🤖' }),
        box(x0 + 4, 100, '概率 π=' + short(pA), 'blue'), box(x0 + 102, 100, '概率 π=' + short(1 - pA), 'blue')]),
      cell(x0 + mw, sw, 'sₜ₂', [term(x0 + mw, R.B)]));
  }
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { robotSVG });
  RL.viz.register('robot', {
    title: '机器人例子：一步 episode 上的 REINFORCE、奖励平移与 learned baseline',
    mount(el, props) {
      const P = { rewards: (props && props.rewards) || 'orig', base: (props && props.base) || 'none', alpha: 0.1, beta: 0.1 };
      const REW = { orig: { A: 101, B: 99 }, pm: { A: 1, B: -1 } };
      let st;
      const pic = h('div'), detail = h('div'), stats = h('div'), chart = h('div');
      function reset() { st = { h: [0, 0], b: P.base === 'fixed' ? 100 : 0, ep: 0, nA: 0, nB: 0, hist: [[0, 0]], last: null, rng: rngOf(1) }; draw(); }
      function play(a) {
        const R = REW[P.rewards], G = a === 0 ? R.A : R.B;
        const useB = P.base !== 'none', b = useB ? st.b : 0;
        const u = L.reinforceBaseline(st.h, a, G, b, P.alpha, P.base === 'learned' ? P.beta : 0);
        st.last = { a, G, b, hOld: st.h.slice(), u, bOld: st.b };
        st.h = u.next; if (P.base === 'learned') st.b = u.bNext;
        st.ep++; if (a === 0) st.nA++; else st.nB++;
        st.hist.push(st.h.slice());
      }
      const sample = () => sampleIndex(L.softmax(st.h), st.rng());
      function run(n, how) { for (let k = 0; k < n; k++) play(how === 'alt' ? (k % 2 === 0 ? 1 : 0) : sample()); draw(); }
      function forceBUntil(n) { while (st.ep < n) play(1); draw(); }
      function draw() {
        const R = REW[P.rewards];
        clear(pic).put(robotSVG(st, R));
        clear(detail);
        const x = st.last;
        if (x) {
          const nm = ['A', 'B'], useB = P.base !== 'none';
          detail.put(h('p.viz-step', '第 ' + st.ep + ' 条 episode：在 s0 选 ' + nm[x.a] + '，得到 reward ' + x.G + '，随即终止，所以 G₀ = ' + x.G + '。'),
            useB ? h('div', { html: texHTML('\\delta = G_0 - b_{\\text{old}}(s_0) = ' + x.G + ' - ' + tf(x.bOld, 4) + ' = ' + tf(x.u.advantage, 4), true) }) : h('p.muted', '没有 baseline：学习信号就是 G₀ = ' + x.G + ' 本身。'),
            table(['动作 j', '1{j = A_t}', 'π<sub>old</sub>(j|s0)', '∂log π(A_t|s0)/∂h(s0,j)', 'Δh = α·' + (useB ? 'δ' : 'G₀') + '·(…)', '新 h(s0,j)'],
              [0, 1].map(j => ({ cells: [nm[j], j === x.a ? '1' : '0', pf(x.u.pi[j]), tf(x.u.grad[j], 6), tf(x.u.delta[j], 6), tf(x.u.next[j], 6)], cls: j === x.a ? 'hl' : null }))),
            h('div', { html: texHTML('\\pi_{\\text{new}}(A\\mid s_0)=\\frac{1}{1+e^{h(s_0,B)-h(s_0,A)}}=\\frac{1}{1+e^{' + tf(x.u.next[1] - x.u.next[0], 4) + '}}\\approx ' + pf(x.u.after[0]), true) }),
            P.base === 'learned' ? h('div', { html: texHTML('b_{\\text{new}}(s_0) = b_{\\text{old}} + \\beta\\,\\delta = ' + tf(x.bOld, 4) + ' + ' + P.beta + '\\times' + tf(x.u.advantage, 4) + ' = ' + tf(x.u.bNext, 4), true) }) : null,
            h('p.viz-note', '两个偏好都用旧概率同时更新；Δh 之和恒为 0。' + (Math.abs(x.u.grad[x.a]) < 1e-3 ? ' 注意：被选动作的旧概率已经接近 1，梯度项 1 − π 几乎为 0，所以即使信号很大，h 也几乎不动——这就是“饱和”。' : '')));
        } else detail.put(h('p.muted', P.rewards === 'orig' && P.base !== 'fixed' && P.alpha === 0.1 ? '点“强制选 B”复现课件 E1：h 从 (0, 0) 变成 (−4.95, +4.95)。' : '点任一按钮开始；每条 episode 只有一步。'));
        const pA = L.softmax(st.h)[0];
        clear(stats).put(readout([['已完成 episode', String(st.ep) + '（A ' + st.nA + ' 次，B ' + st.nB + ' 次）'], ['h(s0,A), h(s0,B)', tf(st.h[0], 6) + ', ' + tf(st.h[1], 6)],
          ['π(A|s0), π(B|s0)', pf(pA) + ', ' + pf(1 - pA)], P.base === 'none' ? ['baseline', '无'] : ['b(s0)', tf(st.b, 6) + (P.base === 'fixed' ? '（固定）' : '（learned）')]]));
        const hs = st.hist;
        clear(chart).put(hs.length > 2 ? [RL.vizUtil.lineChart([{ values: hs.map(v => v[0]), color: 'blue' }, { values: hs.map(v => v[1]), color: 'orange' }, { values: hs.map(() => 0), color: 'gray', dash: '3 3' }], { xlabel: 'episode' }),
          h('div.legend', h('span', h('i', { style: { background: 'var(--c-blue)' } }), 'h(s0,A)'), h('span', h('i', { style: { background: 'var(--c-orange)' } }), 'h(s0,B)'))] : null);
      }
      const ctrl = h('div',
        h('div.viz-row', h('span', '奖励：'), segmented([{ value: 'orig', label: 'A = 101, B = 99（原题）' }, { value: 'pm', label: 'A = +1, B = −1（差值）' }], P.rewards, v => { P.rewards = v; reset(); }, '奖励')),
        h('div.viz-row', h('span', 'baseline：'), segmented([{ value: 'none', label: '无（REINFORCE）' }, { value: 'learned', label: 'learned b(s0)，初值 0' }, { value: 'fixed', label: '给定 b = 100' }], P.base, v => { P.base = v; reset(); }, 'baseline')),
        slider('α（actor 步长）', { min: 0.01, max: 0.5, step: 0.01, value: P.alpha, format: v => v.toFixed(2), onInput: v => { P.alpha = v; } }),
        slider('β（baseline 步长）', { min: 0.01, max: 1, step: 0.01, value: P.beta, format: v => v.toFixed(2), onInput: v => { P.beta = v; } }),
        h('div.viz-row', button('强制选 A', () => { play(0); draw(); }, 'btn'), button('强制选 B', () => { play(1); draw(); }, 'btn'),
          button('按 policy 采样 1 条', () => run(1), 'btn primary'), button('采样 100 条', () => run(100), 'btn'),
          button('一直强制 B 到第 100 条', () => forceBUntil(100), 'btn'), button('从 B 开始交替 B, A, B, A …（100 条）', () => run(100, 'alt'), 'btn'), button('重置', reset, 'btn ghost')));
      el.put(ctrl, pic, detail, stats, chart,
        h('p.muted', '采样用本站自己的随机数种子，不是课件的 seed 0，所以“100 条里 A 出现几次”这类结果会与课件不同；单步手算的数值（E1、E2、E101、learned baseline 的 E1/E2）在课件显示的精度内一致（课件 E2 的 −4.950495 用了取整后的 0.00005，未取整为 −4.950497）。'));
      reset();
    }
  });

  /* ---------- c31: actor-critic ---------- */
  RL.viz.register('actorcritic', {
    title: 'Actor-Critic：critic 打分，actor 按分数改 policy',
    mount(el) {
      let tab = 'signal';
      const body = h('div');

      function signal() {
        const S = { qA: 101, qB: 99, pA: 0.5, v: 100, a: 0 }, r = [101, 99];
        const out = h('div');
        function draw() {
          const pi = [S.pA, 1 - S.pA], q = [S.qA, S.qB], V = pi[0] * q[0] + pi[1] * q[1], vTrue = pi[0] * r[0] + pi[1] * r[1], nm = ['A', 'B'];
          const grad = [0, 1].map(j => (j === S.a ? 1 : 0) - pi[j]), delta = r[S.a] - S.v;
          const sig = [['Q actor–critic（信号 Q<sub>w</sub>(s0,a)）', q[S.a]], ['A2C（信号 Q<sub>w</sub> − Σπ Q<sub>w</sub>）', q[S.a] - V], ['TD actor–critic（信号 δ = r − V<sub>w</sub>(s0)）', delta]];
          clear(out).put(
            h('div', { html: texHTML('\\textstyle\\sum_b\\pi(b\\mid s_0)Q_w(s_0,b)=' + fmt(pi[0], 2) + '\\times' + fmt(S.qA, 1) + '+' + fmt(pi[1], 2) + '\\times' + fmt(S.qB, 1) + '=' + tf(V, 3), true) }),
            table(['动作 a', '环境奖励 r', 'critic 的 Q<sub>w</sub>(s0,a)', 'A<sub>w</sub> = Q<sub>w</sub> − Σπ Q<sub>w</sub>', 'A2C 对该动作'], [0, 1].map(j => ({ cells: [nm[j], String(r[j]), fmt(q[j], 1), tf(q[j] - V, 3), q[j] - V > 0 ? '强化' : q[j] - V < 0 ? '削弱' : '不变'], cls: j === S.a ? 'hl' : null }))),
            table(['方法', '学习信号（乘在 ∇log π 前面）', 'Δh(s0,A)', 'Δh(s0,B)'], sig.map(([k, v]) => [k, tf(v, 3), tf(0.1 * v * grad[0], 4), tf(0.1 * v * grad[1], 4)])),
            h('p.viz-note', 'α = 0.1，这一步选了 ' + nm[S.a] + '。Q actor–critic 的信号是 Q 本身：当所有 Q 都是很大的正数时，无论选哪个动作都会被强化，只是幅度不同。A2C 减去 Σπ Q 后只剩“比平均好多少”：好动作被强化、差动作被削弱。' +
              ' TD actor–critic 不学 Q，只学一个状态价值 V_w(s0)：δ = r + γ·0 − V_w(s0)（下一状态是终止状态，价值按定义为 0）。当前 policy 的真实状态价值是 ' + fmt(pi[0], 2) + '×101 + ' + fmt(pi[1], 2) + '×99 = ' + tf(vTrue, 2) +
              '；V_w(s0) 等于它时，δ 就是这个动作的真实优势（' + tf(r[S.a] - vTrue, 2) + '），V_w 不准时信号整体偏移' + (Math.abs(S.v - vTrue) > 1e-9 ? '（现在偏了 ' + tf(vTrue - S.v, 2) + '）' : '') + '。'));
        }
        body.put(h('p.muted', '机器人例子：在 s0 选 A 得 101、选 B 得 99，随即终止，所以 r = G₀。下面两个 Q 滑块是 critic 的估计（初值等于真实值 101、99），拖动它们模拟“critic 不准”；环境奖励不会变。'),
          slider('critic 的 Q_w(s0, A)', { min: 90, max: 110, step: 0.5, value: S.qA, format: v => v.toFixed(1), onInput: v => { S.qA = v; draw(); } }),
          slider('critic 的 Q_w(s0, B)', { min: 90, max: 110, step: 0.5, value: S.qB, format: v => v.toFixed(1), onInput: v => { S.qB = v; draw(); } }),
          slider('π(A | s0)', { min: 0.01, max: 0.99, step: 0.01, value: S.pA, format: v => v.toFixed(2), onInput: v => { S.pA = v; draw(); } }),
          slider('TD critic 的 V_w(s0)', { min: 0, max: 110, step: 0.5, value: S.v, format: v => v.toFixed(1), onInput: v => { S.v = v; draw(); } }),
          h('div.viz-row', h('span', '这一步选中的动作：'), segmented([{ value: 0, label: 'A' }, { value: 1, label: 'B' }], S.a, v => { S.a = v; draw(); }, 'A_t')), out);
        draw();
      }

      function grid() {
        const g = courseGrid(), P = { alpha: 0.2, beta: 0.1, gamma: 0.9 };
        let H, V, rng, s, t, ep, last, trail, hist;
        const gridBox = h('div'), info = h('div'), stats = h('div'), tableBox = h('div'), chartBox = h('div');
        const view = gridView(gridBox, g, {});
        const policy = () => Object.fromEntries(g.nonTerminal.map(st => { const p = L.softmax(H[st]); return [st, Object.fromEntries(g.actions.map((a, i) => [a, p[i]]))]; }));
        function reset() { H = {}; V = {}; g.states.forEach(st => { H[st] = [0, 0, 0, 0]; V[st] = 0; }); rng = rngOf(5); s = g.start; t = 0; ep = 0; last = null; trail = [s]; hist = []; draw(); }
        function step() {
          const pi = L.softmax(H[s]), ai = sampleIndex(pi, rng()), o = g.step(s, g.actions[ai], rng), term = g.isTerminal(o.next);
          const u = L.tdActorCritic(H[s], ai, o.reward, V[s], V[o.next], term, P.alpha, P.beta, P.gamma);
          last = { s, ai, pi, r: o.reward, next: o.next, kind: o.kind, term, u, vOld: V[s], vNext: V[o.next] };
          H[s] = u.actor.next; V[s] = u.vAfter; t++;
          s = o.next; trail.push(s);
          if (term || t >= 200) { ep++; last.episodeEnd = true; last.truncated = !term; s = g.start; t = 0; trail = [s]; if (ep % 10 === 0) hist.push(dp.policyEvaluationExact(g, policy())[1]); }
        }
        function nextEpisode() { const e = ep; let k = 0; while (ep === e && k++ < 400) step(); draw(); }
        function runMany(n) { const target = ep + n; let k = 0; while (ep < target && k++ < n * 300) step(); draw(); }
        function draw() {
          const pol = policy(), hl = {};
          if (last) { hl[last.s] = 'blue'; hl[last.next] = last.next === last.s ? 'blue' : 'green'; }
          view.update({ values: V, policy: pol, agent: s, trail, highlight: hl, decimals: 3 });
          clear(info);
          if (last) {
            const a = g.actions[last.ai], x = last.u;
            info.put(table(['S<sub>t</sub>', 'A<sub>t</sub>（按 π 采样）', 'R<sub>t+1</sub>', 'S<sub>t+1</sub>'], [['s' + last.s, AN[a] + '（π = ' + fmt(last.pi[last.ai], 3) + '）', fmt(last.r, 0),
              's' + last.next + (last.kind !== 'intended' ? '（' + (last.kind === 'slip left' ? '左滑' : '右滑') + '）' : '') + (last.next === last.s ? '（撞墙，原地不动）' : '') + (last.term ? ' 终止' : '')]]),
              h('div',
                h('div.viz-card', h('h4.t-red', '① TD error（critic 的评价）'), h('div', { html: texHTML('\\delta=R+\\gamma V(s_{' + last.next + '})-V(s_{' + last.s + '})=' + tf(last.r, 0) + '+0.9\\times' + tf(x.boot) + '-' + tf(last.vOld) + '=' + tf(x.delta), true) }),
                  last.term ? h('p.muted', 'S′ 是终止状态：V(S′) 按定义取 0（不是“还没学到”）。') : null),
                h('div.viz-card', h('h4.t-teal', '② critic：更新 V(S)'), h('div', { html: texHTML('V(s_{' + last.s + '})\\leftarrow' + tf(last.vOld) + '+' + P.beta + '\\times' + tf(x.delta) + '=' + tf(x.vAfter), true) })),
                h('div.viz-card', h('h4.t-blue', '③ actor：更新 h(S, ·)'), h('div', { html: texHTML('h(s_{' + last.s + '},b)\\mathrel{+}=' + P.alpha + '\\times' + tf(x.delta) + '\\times[\\mathbb 1\\{b=A_t\\}-\\pi(b\\mid s_{' + last.s + '})]', true) }))),
              table(['动作 b', '旧 π(b|S)', '1{b=A_t} − π', 'Δh', '新 h', '新 π'], g.actions.map((b, i) => ({ cells: [AN[b], fmt(x.actor.pi[i], 3), tf(x.actor.grad[i], 3), tf(x.actor.delta[i], 4), tf(x.actor.next[i], 3), fmt(x.actor.after[i], 3)], cls: i === last.ai ? 'hl' : null }))),
              h('p.viz-note', x.delta > 0 ? 'δ > 0：结果比 critic 预期的好，actor 提高刚才那个动作在 s' + last.s + ' 的概率。' : x.delta < 0 ? 'δ < 0：结果比预期差，actor 降低刚才那个动作的概率。' : 'δ = 0：结果与预期一致，actor 和 critic 都不变（训练刚开始、奖励为 0、V 全为 0 时经常如此）。'),
              last.episodeEnd ? h('p.viz-step', last.truncated ? '本条 episode 达到演示设置的 200 步上限，截断后回到 s1。S′ 不是终止状态，所以这一步照常用了 V(S′)。' : '这一步进入终止状态，episode 结束，智能体回到 s1。') : null);
          } else info.put(h('p.muted', '点 Next Step。格子中的数字是 critic 的 V(s)，箭头是 actor 的 softmax policy（越粗概率越大）。蓝框＝S，绿框＝S′。'));
          clear(stats).put(readout([['已完成 episode', String(ep)], ['本条已走步数', String(t)], ['当前随机 policy 的真实价值 v<sup>π</sup>(s1)', fmt(dp.policyEvaluationExact(g, pol)[1], 4) + '（最优 0.5452）'], ['critic 的估计 V(s1)', fmt(V[1], 4)]]));
          clear(tableBox).put(h('details', h('summary', '全部状态的 h 与 π'), table(['state', ...g.actions.map(a => 'π(' + AN[a] + ')'), ...g.actions.map(a => 'h(' + AN[a] + ')'), 'V(s)'],
            g.nonTerminal.map(st => { const p = L.softmax(H[st]); return ['s' + st, ...p.map(v => fmt(v, 3)), ...H[st].map(v => fmt(v, 2)), fmt(V[st], 3)]; }))));
          clear(chartBox).put(hist.length > 1 ? [RL.vizUtil.lineChart([{ values: hist, color: 'blue' }, { values: hist.map(() => 0.5452), color: 'gray', dash: '4 3' }], { xlabel: 'episode / 10', min: -0.2, max: 0.6 }),
            h('p.muted', '每 10 条 episode 精确计算一次当前 policy 的 v^π(s1)；虚线是最优值 0.5452。')] : null);
        }
        body.put(h('p.muted', '课程 4×3 Gridworld（打滑 0.8/0.1/0.1，γ = 0.9）。actor 是每个状态一行偏好 h(s,·)，critic 是表格 V(s)。每走一步就用同一个 TD error 同时更新两者（按课件的写法，actor 不乘 γᵗ）。为避免无限游走，每条 episode 最多 200 步，到上限就截断；显示的 v^π(s1) 是当前 policy 的真实（无限时域）价值。'),
          slider('α（actor）', { min: 0.05, max: 1, step: 0.05, value: P.alpha, format: v => v.toFixed(2), onInput: v => { P.alpha = v; } }),
          slider('β（critic）', { min: 0.05, max: 1, step: 0.05, value: P.beta, format: v => v.toFixed(2), onInput: v => { P.beta = v; } }),
          h('div.viz-row', button('Next Step', () => { step(); draw(); }, 'btn primary'), button('Next Episode', nextEpisode, 'btn'), button('Run 100 Episodes', () => runMany(100), 'btn'), button('Reset', reset, 'btn ghost')),
          gridBox, info, stats, tableBox, chartBox);
        reset();
      }

      function compare() {
        const g = courseGrid();
        let alpha = 0.3, beta = 0.1, episodes = 600, discActor = false;
        const out = h('div');
        const policyOf = H => Object.fromEntries(g.nonTerminal.map(st => { const p = L.softmax(H[st]); return [st, Object.fromEntries(g.actions.map((a, i) => [a, p[i]]))]; }));
        /** A resumable trainer: advance(n) runs n more episodes, so work can be split across ticks. */
        function trainer(kind, seed) {
          const rng = rngOf(seed), H = {}, V = {}, curve = [];
          let e = 0;
          const A = alpha, B = beta, N = episodes, D = discActor; // snapshot: controls may move while training runs
          g.states.forEach(st => { H[st] = [0, 0, 0, 0]; V[st] = 0; });
          return { curve, n: N, done: () => e >= N, advance(n) { for (const stop = Math.min(N, e + n); e < stop;) { e++; episode(); } } };
          function episode() {
            let s = g.start; const tr = [];
            for (let t = 0; t < 200; t++) {
              const ai = sampleIndex(L.softmax(H[s]), rng()), o = g.step(s, g.actions[ai], rng), term = g.isTerminal(o.next);
              if (kind === 'td') { const u = L.tdActorCritic(H[s], ai, o.reward, V[s], V[o.next], term, A * (D ? Math.pow(0.9, t) : 1), B, 0.9); H[s] = u.actor.next; V[s] = u.vAfter; }
              else tr.push({ s, ai, r: o.reward });
              s = o.next; if (term) break;
            }
            if (kind !== 'td') {
              // the baseline used by the actor is frozen at the start of the episode, so it cannot contain this episode's actions
              const G = L.returnsBackward(tr.map(x => x.r), 0.9), b0 = Object.assign({}, V);
              tr.forEach((x, t) => { H[x.s] = L.reinforceBaseline(H[x.s], x.ai, G[t], kind === 'base' ? b0[x.s] : 0, A * (D ? Math.pow(0.9, t) : 1), 0).next; });
              if (kind === 'base') tr.forEach((x, t) => { V[x.s] += B * (G[t] - V[x.s]); });
            }
            if (e % 20 === 0) curve.push(dp.policyEvaluationExact(g, policyOf(H))[1]);
          }
        }
        let token = 0;
        function run() {
          // train in small chunks so the page stays responsive (3 methods × 10 seeds)
          const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], kinds = [['none', 'red', 'REINFORCE'], ['base', 'orange', 'REINFORCE + learned baseline'], ['td', 'blue', 'TD actor–critic']];
          const jobs = kinds.flatMap(([k], ki) => seeds.map(sd => ({ ki, sd, tr: trainer(k, sd) }))), my = ++token;
          const progress = h('p.muted', '训练中…');
          clear(out).put(progress);
          (function next(j) {
            if (my !== token || !out.isConnected) return;
            if (j < jobs.length) {
              const job = jobs[j];
              progress.textContent = '训练中… ' + (j + 1) + ' / ' + jobs.length + '（' + kinds[job.ki][2] + '，种子 ' + job.sd + '）';
              job.tr.advance(100);
              setTimeout(() => next(job.tr.done() ? j + 1 : j), 0);
              return;
            }
            const N = jobs[0].tr.n, runs = kinds.map((_, ki) => jobs.filter(x => x.ki === ki).map(x => x.tr.curve));
            const stat = (ki, i) => { const v = runs[ki].map(c => c[i]), m = v.reduce((a, b) => a + b, 0) / v.length; return { m, sd: Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length) }; };
            const curves = runs.map((_, ki) => runs[ki][0].map((__, i) => stat(ki, i).m));
            const last = curves[0].length - 1, marks = [[4, '第 100 条后'], [14, '第 300 条后'], [last, '最后（第 ' + N + ' 条）']].filter(([i], k, arr) => i <= last && (k === arr.length - 1 || i < last));
            const cell = (ki, i) => { const x = stat(ki, i); return fmt(x.m, 3) + ' ± ' + fmt(x.sd, 3); };
            const fin = kinds.map((_, ki) => stat(ki, last)), best = Math.max(...fin.map(x => x.m)), close = fin.every(x => best - x.m < 0.015);
            const sdOrder = fin.map((x, ki) => [x.sd, kinds[ki][2]]).sort((p, q) => p[0] - q[0]);
            clear(out).put(RL.vizUtil.lineChart(curves.map((c, i) => ({ values: c, color: kinds[i][1] })).concat([{ values: curves[0].map(() => 0.5452), color: 'gray', dash: '4 3' }]), { xlabel: '第 k 个点 = 第 20k 条 episode 之后', min: -0.2, max: 0.6 }),
              h('div.legend', kinds.map(([, c, n]) => h('span', h('i', { style: { background: 'var(--c-' + c + ')' } }), n))),
              table(['v<sup>π</sup>(s1)：均值 ± 种子间标准差', ...kinds.map(k => k[2])], marks.map(([i, label]) => [label, ...kinds.map((_, ki) => cell(ki, i))])),
              h('p.viz-note', '本次结果（10 个种子）：最后的平均价值上，' + (close ? '三种方法相差不到 0.015，进度基本相同' : '最高的是 ' + kinds[fin.findIndex(x => x.m === best)][2]) +
                '；种子间波动最小的是 ' + sdOrder[0][1] + '（±' + fmt(sdOrder[0][0], 3) + '），最大的是 ' + sdOrder[2][1] + '（±' + fmt(sdOrder[2][0], 3) + '）。' +
                ' 结论只针对这个小 Gridworld 和当前参数，不是一般结论。'));
          })(0);
        }
        body.put(h('p.muted', '同一个 Gridworld、同样的 α 和 β，比较三种方法。纵轴是当前 policy 的真实价值 v^π(s1)（精确计算，10 个种子平均；虚线是最优 0.5452）。三种方法的 actor 用同一种 γᵗ 约定，否则步长不可比。每条 episode 最多 200 步。'),
          h('div.viz-row', h('span', 'actor 步长是否乘 γᵗ（三种方法统一）：'), segmented([{ value: false, label: '不乘（W10-2 写法）' }, { value: true, label: '乘（W10-1 REINFORCE 写法）' }], discActor, v => { discActor = v; }, 'γᵗ')),
          slider('α', { min: 0.05, max: 0.6, step: 0.05, value: alpha, format: v => v.toFixed(2), onInput: v => { alpha = v; } }),
          slider('β', { min: 0.05, max: 0.5, step: 0.05, value: beta, format: v => v.toFixed(2), onInput: v => { beta = v; } }),
          slider('episode 数', { min: 200, max: 2000, step: 100, value: episodes, onInput: v => { episodes = v; } }),
          button('重新训练并比较', run, 'btn primary'), out,
          h('p.muted', '读图提示（在试过的 α = 0.05–0.6、两种 γᵗ 约定下都如此）：在这个环境里 return 本来就在 −1 到 1 之间，“回报整体偏大”的问题不存在，所以 baseline 的作用不明显；actor–critic 的好处主要表现为种子间更一致（波动更小），而不是平均更快。机器人例子（回报整体约 100）才是 baseline 作用最明显的情形。'));
        run();
      }

      function draw() { clear(body); if (tab === 'signal') signal(); else if (tab === 'grid') grid(); else compare(); }
      el.put(segmented([{ value: 'signal', label: '三种 actor 信号（机器人）' }, { value: 'grid', label: 'TD actor–critic 逐步看' }, { value: 'compare', label: '学习曲线对比' }], tab, v => { tab = v; draw(); }, '视图'), body);
      draw();
    }
  });
})(window);
