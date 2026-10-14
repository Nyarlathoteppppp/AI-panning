/* Week 7 visualisers: multi-armed bandits. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { table, readout } = RL.gridView;
  const L = RL.learn, rngOf = RL.mdp.rng;
  const NAMES = ['A', 'B', 'C', 'D'];
  const MEANS = [1.0, 2.0, 1.5, 3.0]; // true expected reward of each arm (Gaussian, sd 1)

  function chart(series, opts) {
    const W = 380, H = 170, pad = 34;
    const n = Math.max(2, ...series.map(s => s.values.length));
    const all = series.flatMap(s => s.values);
    const lo = opts.min != null ? opts.min : Math.min(...all), hi = opts.max != null ? opts.max : Math.max(...all);
    const X = i => pad + i / (n - 1) * (W - pad - 8), Y = v => 8 + (1 - (v - lo) / ((hi - lo) || 1)) * (H - 30);
    const S = RL.dom.s;
    return S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart' },
      [0, 0.5, 1].map(f => { const v = lo + f * (hi - lo); return [S('line', { x1: pad, x2: W - 8, y1: Y(v), y2: Y(v), class: 'grid' }), S('text', { x: pad - 4, y: Y(v) + 3, class: 'tick', 'text-anchor': 'end', text: fmt(v, opts.dec == null ? 1 : opts.dec) })]; }),
      S('line', { x1: pad, x2: W - 8, y1: H - 22, y2: H - 22, class: 'axis' }),
      S('text', { x: W - 8, y: H - 6, class: 'tick', 'text-anchor': 'end', text: opts.xlabel || '' }),
      opts.vline != null ? S('line', { x1: X(opts.vline), x2: X(opts.vline), y1: 8, y2: H - 22, stroke: 'var(--c-red)', 'stroke-dasharray': '4 3' }) : null,
      series.map(s => S('polyline', { points: s.values.map((v, i) => X(i) + ',' + Y(v)).join(' '), fill: 'none', stroke: 'var(--c-' + s.color + ')', 'stroke-width': 2, 'stroke-dasharray': s.dash || null })));
  }
  function smooth(arr, k) { const out = []; let acc = 0; for (let i = 0; i < arr.length; i++) { acc += arr[i]; if (i >= k) acc -= arr[i - k]; out.push(acc / Math.min(i + 1, k)); } return out; }
  function legend(items) { return h('div.legend', items.map(([c, t]) => h('span', h('i', { style: { background: 'var(--c-' + c + ')' } }), t))); }

  /* ---------- c13: pull the arms by hand ---------- */
  RL.viz.register('bandit-manual', {
    title: '手动拉杆：每拉一次，用增量平均更新这台机器的估计',
    mount(el) {
      const rng = rngOf(5);
      let st, last, reveal = false, totalReward = 0;
      const machines = h('div.machines'), info = h('div'), log = h('div.trace');
      function reset() { st = { Q: [0, 0, 0, 0], N: [0, 0, 0, 0], t: 0 }; last = null; totalReward = 0; clear(log); draw(); }
      function pull(a) {
        const r = MEANS[a] + L.gaussian(rng), before = st.Q[a];
        totalReward += r;
        const u = L.banditUpdate(st, a, r);
        last = { a, r, before, after: u.after, n: u.n };
        log.put(h('div', 't=' + st.t + '  拉 ' + NAMES[a] + '  得到 R=' + fmt(r, 2) + '  →  Q(' + NAMES[a] + ') = ' + fmt(u.after, 3) + '（N=' + u.n + '）'));
        log.scrollTop = log.scrollHeight;
        draw();
      }
      function draw() {
        clear(machines).put(NAMES.map((n, a) => h('button.machine' + (last && last.a === a ? '.last' : ''), { type: 'button', onclick: () => pull(a) },
          h('b', '机器 ' + n), h('small', 'Q = ' + fmt(st.Q[a], 3)), h('small', 'N = ' + st.N[a]), reveal ? h('small.t-green', '真实均值 ' + MEANS[a].toFixed(1)) : null)));
        clear(info);
        if (last) {
          info.put(h('div.viz-step', h('b', '刚才的更新'),
            h('div', { html: texHTML('Q_{\\text{new}}(' + NAMES[last.a] + ') = Q_{\\text{old}} + \\tfrac{1}{N}(R - Q_{\\text{old}}) = ' + fmt(last.before, 3).replace('−', '-') + ' + \\tfrac{1}{' + last.n + '}(' + fmt(last.r, 3).replace('−', '-') + ' - ' + fmt(last.before, 3).replace('−', '-') + ') = ' + fmt(last.after, 3).replace('−', '-'), true) }),
            h('p.muted', '先把 N 加一，再用新的 1/N 作为步长——第一次拉时 N=1，估计直接等于这次奖励。其他三台机器这一轮没有被观察，所以它们的 Q 和 N 都不变。')));
        } else info.put(h('p.muted', '点一台机器拉一次杆。每次的奖励是随机的（真实均值 + 噪声），你看不到真实均值。'));
        info.put(readout([['总拉杆次数 t', String(st.t)], ['当前估计最好的机器', st.t ? NAMES[L.argmaxRandom(st.Q, 0)] : '—'], ['累计奖励', fmt(totalReward, 2)]]));
      }
      el.put(h('div.viz-row', button('重置', reset, 'btn ghost'), button('显示 / 隐藏真实均值', () => { reveal = !reveal; draw(); }, 'btn')),
        machines, info, h('h4', '记录'), log);
      reset();
    }
  });

  /* ---------- c14: strategy simulator ---------- */
  RL.viz.register('bandit', {
    title: 'Multi-Armed Bandit simulator：探索策略怎样影响累计奖励',
    mount(el) {
      const P = { strategy: 'epsilon-greedy', epsilon: 0.1, epsilon0: 1, alpha: 0.99, c: 1, tau: 1, horizon: 500, drift: false };
      const STRATS = [{ value: 'epsilon-greedy', label: 'ε-greedy' }, { value: 'epsilon-first', label: 'ε-first' }, { value: 'epsilon-decreasing', label: 'ε-decreasing' }, { value: 'ucb', label: 'UCB' }, { value: 'softmax', label: 'Softmax' }];
      let st, rng, rewards, optimal, explored, seed = 1;
      const params = h('div'), stats = h('div'), charts = h('div'), compare = h('div');
      function meansAt(t) { if (!P.drift || t < P.horizon / 2) return MEANS; return [3.0, 1.5, 2.0, 0.0]; } // after drift arm A becomes best, D worst
      function reset() { st = { Q: [0, 0, 0, 0], N: [0, 0, 0, 0], t: 0 }; rng = rngOf(seed++); rewards = []; optimal = []; explored = 0; draw(); }
      function stepOnce(state, rand, rec) {
        const m = meansAt(state.t), ch = L.banditChoose(P.strategy, P, state, rand);
        const r = m[ch.arm] + L.gaussian(rand);
        L.banditUpdate(state, ch.arm, r);
        if (rec) { rewards.push(r); optimal.push(ch.arm === m.indexOf(Math.max(...m)) ? 1 : 0); if (ch.explored) explored++; }
        return { r, arm: ch.arm };
      }
      function run(n) { for (let i = 0; i < n && st.t < P.horizon; i++) stepOnce(st, rng, true); draw(); }
      function paramControls() {
        clear(params);
        const add = x => params.put(x);
        if (P.strategy === 'epsilon-greedy') add(slider('ε', { min: 0, max: 1, step: 0.01, value: P.epsilon, format: v => v.toFixed(2), onInput: v => { P.epsilon = v; } }));
        if (P.strategy === 'epsilon-first') add(slider('ε（探索比例）', { min: 0, max: 0.5, step: 0.01, value: P.epsilon, format: v => v.toFixed(2), onInput: v => { P.epsilon = v; } }));
        if (P.strategy === 'epsilon-decreasing') { add(slider('ε₀', { min: 0, max: 1, step: 0.05, value: P.epsilon0, format: v => v.toFixed(2), onInput: v => { P.epsilon0 = v; } })); add(slider('衰减 α', { min: 0.9, max: 0.999, step: 0.001, value: P.alpha, format: v => v.toFixed(3), onInput: v => { P.alpha = v; } })); }
        if (P.strategy === 'ucb') add(slider('c', { min: 0, max: 3, step: 0.1, value: P.c, format: v => v.toFixed(1), onInput: v => { P.c = v; } }));
        if (P.strategy === 'softmax') add(slider('温度 τ', { min: 0.05, max: 5, step: 0.05, value: P.tau, format: v => v.toFixed(2), onInput: v => { P.tau = v; } }));
      }
      function describe() {
        return { 'epsilon-greedy': '每一步以概率 ε 随机选一台（探索），否则选当前 Q 最大的（利用）。greedy 动作的总概率是 1−ε+ε/k。',
          'epsilon-first': '前 ε×总次数 步完全随机，之后永远选当前最好的。探索“预算”一次性用完，之后无法纠错。',
          'epsilon-decreasing': '第 t 步用 ε_t = ε₀·α^t 做 ε-greedy：先多探索，逐渐转向利用。α 是探索率的衰减系数，不是学习率。',
          ucb: '选 Q(a) + c√(ln t / N(a)) 最大的：试得少的机器得到“不确定性加分”。每台先各试一次（N=0 时公式无定义）。',
          softmax: 'P(a) ∝ exp(Q(a)/τ)：价值越高越常被选。τ 大 → 接近均匀；τ → 0 → 接近贪心。' }[P.strategy];
      }
      function draw() {
        const cum = []; rewards.reduce((a, r, i) => (cum[i] = a + r), 0);
        const m = meansAt(st.t), best = Math.max(...m);
        clear(stats).put(h('p.viz-note', describe()),
          table(['机器', '真实均值', '估计 Q', '次数 N'], NAMES.map((n, a) => ({ cells: [n, fmt(m[a], 1) + (m[a] === best ? ' ★' : ''), fmt(st.Q[a], 3), st.N[a]], cls: st.t && a === L.argmaxRandom(st.Q, 0) ? 'hl' : null }))),
          readout([['已玩 t / 总次数', st.t + ' / ' + P.horizon], ['累计奖励', fmt(cum[cum.length - 1] || 0, 1)], ['平均每步奖励', st.t ? fmt(cum[cum.length - 1] / st.t, 3) : '—'],
            ['选中最优机器的比例', st.t ? fmt(100 * optimal.reduce((a, b) => a + b, 0) / st.t, 1) + '%' : '—'], ['探索步数', String(explored)], ['理想（一直选最优）每步', fmt(best, 1)]]));
        clear(charts).put(rewards.length > 2 ? [chart([{ values: smooth(rewards, 25), color: 'orange' }, { values: rewards.map((_, i) => Math.max(...meansAt(i))), color: 'green', dash: '4 3' }], { xlabel: '步数 t', vline: P.drift ? P.horizon / 2 : null, min: -0.5, max: 3.5 }),
          legend([['orange', '每步奖励（最近 25 步平均）'], ['green', '最优机器的真实均值']])] : h('p.muted', '点“走 10 步”或“跑完”开始。'));
      }
      function runCompare(kind) {
        const runs = 120, T = P.horizon, configs = kind === 'eps'
          ? [[0, 'gray', 'ε=0（纯贪心）'], [0.01, 'blue', 'ε=0.01'], [0.1, 'orange', 'ε=0.1'], [0.3, 'purple', 'ε=0.3']].map(([e, c, l]) => ({ p: Object.assign({}, P, { strategy: 'epsilon-greedy', epsilon: e }), c, l }))
          : [['epsilon-greedy', 'blue', 'ε-greedy (0.1)'], ['epsilon-decreasing', 'orange', 'ε-decreasing (α=0.99)'], ['softmax', 'green', 'Softmax (τ=1)'], ['ucb', 'red', 'UCB (c=1)'], ['epsilon-first', 'purple', 'ε-first (0.1)']]
            .map(([s, c, l]) => ({ p: Object.assign({}, P, { strategy: s, epsilon: 0.1, epsilon0: 1, alpha: 0.99, tau: 1, c: 1 }), c, l }));
        const series = configs.map(cfg => {
          const avg = new Array(T).fill(0);
          for (let k = 0; k < runs; k++) {
            const rand = rngOf(1000 + k), s = { Q: [0, 0, 0, 0], N: [0, 0, 0, 0], t: 0 };
            for (let t = 0; t < T; t++) {
              const mm = (P.drift && t >= T / 2) ? [3.0, 1.5, 2.0, 0.0] : MEANS;
              const ch = L.banditChoose(cfg.p.strategy, cfg.p, s, rand), r = mm[ch.arm] + L.gaussian(rand);
              L.banditUpdate(s, ch.arm, r); avg[t] += r / runs;
            }
          }
          return { values: smooth(avg, 10), color: cfg.c, label: cfg.l, total: avg.reduce((a, b) => a + b, 0) };
        });
        clear(compare).put(h('h4', (kind === 'eps' ? '不同 ε 的 ε-greedy' : '五种策略') + '：' + runs + ' 次独立运行的平均' + (P.drift ? '（第 ' + T / 2 + ' 步发生 drift）' : '')),
          chart(series, { xlabel: '步数 t', vline: P.drift ? T / 2 : null, min: 0, max: 3.2 }), legend(series.map(s => [s.color, s.label])),
          table(['策略', '平均累计奖励'], series.map(s => [s.label, fmt(s.total, 0)])),
          h('p.muted', kind === 'eps' ? 'ε=0 常常锁死在早期看起来不错的机器上；ε 太大则浪费太多步在已知较差的机器上。' : '课件的对比图中 UCB 表现最好、τ=1 的 softmax 最差；有 drift 时课件图里 ε-decreasing 和 UCB 适应最慢。本站的 drift 很剧烈（D 从 3 掉到 0），D 的平均很快被拉低、A 的加分又大，所以这里 UCB 反而恢复得最快；ε 已衰减到接近 0 的 ε-decreasing 和 ε-first 适应最差。'));
      }
      const stratSeg = segmented(STRATS, P.strategy, v => { P.strategy = v; paramControls(); reset(); }, '策略');
      const driftBox = h('input', { type: 'checkbox' }); driftBox.addEventListener('change', () => { P.drift = driftBox.checked; reset(); });
      el.put(stratSeg, params,
        h('label.viz-row', driftBox, ' 奖励分布漂移（drift）：第 ' + P.horizon / 2 + ' 步后机器 A 变成最好、D 变成最差'),
        h('div.viz-row', button('走 1 步', () => run(1), 'btn'), button('走 10 步', () => run(10), 'btn'), button('跑完 ' + P.horizon + ' 步', () => run(P.horizon), 'btn primary'), button('重置', reset, 'btn ghost')),
        stats, charts,
        h('div.viz-row', button('对比不同 ε', () => runCompare('eps'), 'btn'), button('对比五种策略', () => runCompare('all'), 'btn')), compare);
      paramControls(); reset();
    }
  });
})(window);
