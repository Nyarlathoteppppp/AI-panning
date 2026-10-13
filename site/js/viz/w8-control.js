/* Week 8-2 visualisers: tabular TD control (SARSA / Q-learning) and their comparison. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, clear, fmt, slider, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout } = RL.gridView;
  const { courseGrid, createGrid, rng: rngOf, sampleIndex, ARROWS } = RL.mdp;
  const dp = RL.dp, L = RL.learn;
  const AN = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' };
  const tf = (x, d) => fmt(x, d == null ? 4 : d).replace('−', '-');

  /** A tabular TD-control agent that can be stepped one transition at a time. */
  function makeAgent(env, opts) {
    const A = env.actions;
    const agent = { Q: {}, algo: opts.algo, alpha: opts.alpha, epsilon: opts.epsilon, gamma: opts.gamma, rng: rngOf(opts.seed || 1), episode: 0, history: [] };
    env.states.forEach(s => { agent.Q[s] = {}; A.forEach(a => { agent.Q[s][a] = 0; }); });
    agent.choose = function (s) {
      const qs = A.map(a => agent.Q[s][a]), probs = L.epsilonGreedyProbs(qs, agent.epsilon);
      const i = sampleIndex(probs, agent.rng()), best = Math.max(...qs);
      return { a: A[i], explored: qs[i] !== best, probs };
    };
    agent.reset = function () { agent.s = env.start; agent.pending = agent.algo === 'sarsa' ? agent.choose(agent.s) : null; agent.G = 0; agent.t = 0; agent.trail = [agent.s]; };
    agent.step = function () {
      const s = agent.s, choice = agent.pending || agent.choose(s), a = choice.a;
      const o = env.step(s, a, agent.rng);
      const done = env.isTerminal(o.next) || agent.t + 1 >= (opts.maxSteps || 200);
      const row = A.map(b => agent.Q[o.next][b]);
      let next = null, target;
      if (agent.algo === 'sarsa') {
        if (!env.isTerminal(o.next)) next = agent.choose(o.next);
        target = L.sarsaTarget(o.reward, agent.gamma, next ? agent.Q[o.next][next.a] : 0, env.isTerminal(o.next));
      } else target = L.qLearningTarget(o.reward, agent.gamma, row, env.isTerminal(o.next));
      const before = agent.Q[s][a], u = L.tdUpdate(before, target, agent.alpha);
      agent.Q[s][a] = u.after;
      const rec = { s, a, explored: choice.explored, r: o.reward, next: o.next, kind: o.kind, nextChoice: next, row, target, before, after: u.after, error: u.error, terminal: env.isTerminal(o.next) };
      agent.G += Math.pow(agent.gamma, agent.t) * o.reward; agent.t++;
      agent.s = o.next; agent.pending = next; agent.trail.push(o.next);
      if (done) { agent.history.push({ G: agent.G, len: agent.t }); agent.episode++; rec.episodeEnd = true; agent.reset(); }
      return rec;
    };
    agent.reset();
    return agent;
  }
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { makeAgent });

  /* ---------- c20 / c21: Q-learning (or SARSA) in the course Gridworld ---------- */
  RL.viz.register('qlearn', {
    title: 'Q-Learning GridWorld：一步一步看 Q 表怎样被更新',
    mount(el, props) {
      const g = courseGrid();
      const P = { algo: props.algo || 'qlearning', alpha: 0.5, epsilon: 0.1, gamma: 0.9 };
      let agent, last, initialP, executed, sel = null;
      const gridBox = h('div'), info = h('div'), qtable = h('div'), chartBox = h('div'), stats = h('div');
      const view = gridView(gridBox, g, { onCell: st => { sel = g.isTerminal(st) || sel === st ? null : st; draw(); } });
      const backBtn = button('上一步', back, 'btn'), polLine = h('p.viz-note');
      function resetState() { agent = makeAgent(g, Object.assign({ seed: 7 }, initialP)); last = null; executed = []; }
      function reset() { initialP = Object.assign({}, P); resetState(); draw(); }
      // Preserve the parameters used at each transition, including SARSA's pending action.
      function advance(params) {
        agent.alpha = params.alpha; agent.epsilon = params.epsilon;
        last = agent.step(); last.alpha = params.alpha;
        executed.push({ alpha: params.alpha, epsilon: params.epsilon });
      }
      function back() {
        if (!executed.length) return;
        const params = executed.slice(0, -1);
        resetState(); params.forEach(advance);
        agent.alpha = P.alpha; agent.epsilon = P.epsilon; draw();
      }
      function step() { advance(P); draw(); }
      function nextEpisode() { const e = agent.episode; let k = 0; while (agent.episode === e && k++ < 500) advance(P); draw(); }
      function runMany(n) { const target = agent.episode + n; let k = 0; while (agent.episode < target && k++ < n * 300) advance(P); draw(); }
      function draw() {
        backBtn.disabled = executed.length === 0;
        const pol = {}; g.nonTerminal.forEach(s => { pol[s] = dp.argmaxActions(agent.Q[s], 1e-12); });
        polLine.textContent = '当前 greedy policy（贪心策略）：' + g.nonTerminal.map(s => 's' + s + ' ' + pol[s].map(a => ARROWS[a]).join('/')).join('；') + '。Q 网格不画箭头，以免遮住数字。';
        const hl = {}; if (last) { hl[last.s] = 'blue'; hl[last.next] = last.next === last.s ? 'blue' : 'green'; }
        if (sel) hl[sel] = 'purple';
        view.update({ q: agent.Q, qDecimals: 2, agent: agent.s, trail: agent.trail, highlight: hl, qHighlight: last ? { [last.s]: null } : null });
        const isQ = agent.algo === 'qlearning';
        clear(info);
        if (last) {
          const bootVal = last.terminal ? 0 : isQ ? Math.max(...last.row) : (last.nextChoice ? last.row[g.actions.indexOf(last.nextChoice.a)] : 0);
          const bootTex = last.terminal ? '0' : isQ ? '\\max_{a\'}Q(s_{' + last.next + '},a\')' : 'Q(s_{' + last.next + '},\\text{' + AN[last.nextChoice.a] + '})';
          info.put(h('h4', '刚处理的这一步（总第 ' + executed.length + ' 步，α = ' + fmt(last.alpha, 2) + '）'), table(['当前 state S', '选择 action A', 'reward R', 'next state S′', isQ ? '' : '下一动作 A′（ε-greedy 抽样）'].filter(Boolean), [[
            's' + last.s, AN[last.a] + (last.explored ? '（非贪心）' : '（贪心）'), fmt(last.r, 0), 's' + last.next + (last.kind !== 'intended' ? '（' + (last.kind === 'slip left' ? '左滑' : '右滑') + '）' : '') + (last.terminal ? ' 终止' : ''),
            isQ ? null : (last.nextChoice ? AN[last.nextChoice.a] + (last.nextChoice.explored ? '（非贪心）' : '') : '—')].filter(x => x !== null)]),
            h('div.viz-cols',
              h('div.viz-card', h('h4.t-green', 'TD target'), h('div', { html: texHTML('Y = R + \\gamma\\,' + bootTex + ' = ' + tf(last.r, 0) + ' + 0.9\\times' + tf(bootVal) + ' = ' + tf(last.target), true) }), last.terminal ? h('p.muted', 'S′ 是终止状态：target 只剩奖励 R。') : null),
              h('div.viz-card', h('h4.t-red', 'TD error'), h('div', { html: texHTML('\\delta = ' + tf(last.target) + ' - ' + tf(last.before) + ' = ' + tf(last.error), true) })),
              h('div.viz-card', h('h4.t-teal', '更新 Q(S,A)'), h('div', { html: texHTML('Q(s_{' + last.s + '},\\text{' + AN[last.a] + '}) \\leftarrow ' + tf(last.before) + ' + ' + last.alpha + '\\times' + tf(last.error) + ' = ' + tf(last.after), true) }))),
            RL.vizUtil.numberLine(last.before, last.target, last.after, -1, 1),
            last.episodeEnd ? h('p.viz-step', last.terminal ? '这一步进入终止状态，episode 结束，智能体回到 s1 开始下一条。' : '达到演示的步数上限 200（这不是终止状态），本条 episode 被截断，智能体回到 s1 重新开始；这一步的 target 仍按正常方式 bootstrap。（SARSA 这里抽出的 A′ 只用来算 target，截断后不会被执行。）') : null,
            h('p.muted', '“贪心 / 非贪心”只看选中的动作是不是当前 Q 最大的那个：ε-greedy 的随机分支也可能抽到贪心动作，所以标“贪心”的一步不一定没有经过随机分支。'));
        } else info.put(h('p.muted', '点“单步执行”。蓝框＝S，绿框＝S′，蓝点＝智能体现在的位置，虚线＝本条 episode 的轨迹。'));
        const greedy = Object.fromEntries(g.nonTerminal.map(s => [s, pol[s][0]]));
        const vg = dp.policyEvaluationExact(g, greedy);
        clear(stats).put(readout([['算法', isQ ? 'Q-learning（off-policy）' : 'SARSA（on-policy）'], ['已完成 episode', String(agent.episode)], ['本条已走步数', String(agent.t)],
          ['贪心 policy 的真实价值 v(s1)', fmt(vg[1], 4) + '（最优 0.5452）']]));
        const rows = (sel ? [sel] : g.nonTerminal).map(s => ({ cells: ['s' + s].concat(g.actions.map(a => fmt(agent.Q[s][a], 3) + (pol[s].includes(a) ? ' ★' : ''))), cls: last && last.s === s ? 'hl' : null }));
        clear(qtable).put(h('h4', 'Q-table（Q 表）' + (sel ? '（只看 s' + sel + '，再点一次该格可恢复全部状态）' : '')), table(['state', 'Up', 'Right', 'Down', 'Left'], rows), sel ? button('显示全部状态', () => { sel = null; draw(); }, 'btn ghost') : null);
        const hist = agent.history, W = 20;
        const avg = hist.map((_, i) => { const sl = hist.slice(Math.max(0, i - W + 1), i + 1); return sl.reduce((a, b) => a + b.G, 0) / sl.length; });
        clear(chartBox).put(hist.length > 2 ? [RL.vizUtil.lineChart([{ values: avg, color: 'orange' }], { xlabel: 'episode', min: -1, max: 1 }), h('p.muted', '训练中每条 episode 的 G₀（最近 20 条平均，含探索）。')] : null);
      }
      el.put(h('div.viz-note', '这个实验在做什么：用 Q-learning（Q 学习）或 SARSA（同策略时序差分控制）逐步学习 Q(s,a)，每次单步执行都立即更新一个状态—动作对。上一步从相同随机种子重放到前一步。点格子筛选 Q 表，再点同一个格子取消选择。'),
        segmented([{ value: 'qlearning', label: 'Q-learning' }, { value: 'sarsa', label: 'SARSA' }], P.algo, v => { P.algo = v; reset(); }, '算法'),
        slider('α', { min: 0.05, max: 1, step: 0.05, value: P.alpha, format: v => v.toFixed(2), onInput: v => { P.alpha = v; agent.alpha = v; } }),
        slider('ε', { min: 0, max: 0.5, step: 0.01, value: P.epsilon, format: v => v.toFixed(2), onInput: v => { P.epsilon = v; agent.epsilon = v; } }),
        h('div.viz-row', backBtn, button('单步执行', step, 'btn primary'), button('走完本条 episode', nextEpisode, 'btn'), button('跑 100 条 episode', () => runMany(100), 'btn'), button('重置', reset, 'btn ghost')),
        polLine, gridBox, info, stats, qtable, chartBox);
      reset();
    }
  });

  /* ---------- c22: SARSA vs Q-learning ---------- */
  function cliffEnv() {
    // 6 x 4 grid; bottom row: start (0,0), cliff (1..4,0), goal (5,0). Deterministic moves.
    const base = createGrid({ width: 6, height: 4, terminals: { '5,0': 0 }, start: [0, 0], success: 1, gamma: 0.9 });
    const cliff = new Set([2, 3, 4, 5]); // ids of (1,0)..(4,0)
    const env = Object.assign({}, base, {
      cliff,
      step(s, a) {
        const next = base.moveFrom(s, a);
        if (cliff.has(next)) return { next: base.start, reward: -5, kind: 'cliff', done: false };
        return { next, reward: base.isTerminal(next) ? 0 : -1, kind: 'intended', done: base.isTerminal(next) };
      }
    });
    env.allStates = base.states;
    env.states = base.states.filter(s => !cliff.has(s));
    return env;
  }
  RL.viz.register('sarsaq', {
    title: 'SARSA vs Q-learning：同一个 transition，不同的 target',
    mount(el) {
      let tab = 'same';
      const body = h('div');
      function same() {
        const S = { q: [0.3, 0.8, 0.2, 0.4], chosen: 3, r: 0, gamma: 0.9, alpha: 0.1, cur: 0.5 };
        const names = ['Up', 'Right', 'Down', 'Left'];
        const out = h('div'), inputs = h('div.viz-row');
        names.forEach((n, i) => inputs.put(h('label.viz-row', { style: { gap: '4px' } }, h('span.muted', "Q(s′," + n + ')'), h('input.viz-input', { type: 'number', step: '0.1', value: S.q[i], oninput: e => { S.q[i] = parseFloat(e.target.value) || 0; draw(); } }))));
        const chosenSeg = segmented(names.map((n, i) => ({ value: i, label: n })), S.chosen, v => { S.chosen = v; draw(); }, "A′");
        function draw() {
          const sarsa = S.r + S.gamma * S.q[S.chosen], ql = S.r + S.gamma * Math.max(...S.q);
          const us = S.cur + S.alpha * (sarsa - S.cur), uq = S.cur + S.alpha * (ql - S.cur);
          const best = names[S.q.indexOf(Math.max(...S.q))];
          clear(out).put(h('div.viz-cols',
            h('div.viz-card', h('h4', 'SARSA（on-policy）'), h('div', { html: texHTML('\\htmlClass{fx-hl}{r+\\gamma Q(s\',a\')} = ' + S.r + ' + ' + S.gamma + '\\times Q(s\',\\text{' + names[S.chosen] + '}) = ' + tf(sarsa), true) }),
              h('p.muted', '用行为 policy 实际选出的 A′ = ' + names[S.chosen] + '（可能是探索动作）。'),
              h('div', { html: texHTML('Q(s,a) \\leftarrow ' + S.cur + ' + ' + S.alpha + '(' + tf(sarsa) + ' - ' + S.cur + ') = ' + tf(us), true) })),
            h('div.viz-card', h('h4', 'Q-learning（off-policy）'), h('div', { html: texHTML('\\htmlClass{fx-hl}{r+\\gamma\\max_{a}Q(s\',a)} = ' + S.r + ' + ' + S.gamma + '\\times Q(s\',\\text{' + best + '}) = ' + tf(ql), true) }),
              h('p.muted', '不管实际选了什么，都用 s′ 中最大的 Q（' + best + '）。'),
              h('div', { html: texHTML('Q(s,a) \\leftarrow ' + S.cur + ' + ' + S.alpha + '(' + tf(ql) + ' - ' + S.cur + ') = ' + tf(uq), true) }))),
            h('p.viz-note', S.q[S.chosen] === Math.max(...S.q) ? 'A′ 恰好是贪心动作时，两个 target 相同。差别只出现在行为 policy 选了非贪心（探索）动作的那些步。'
              : '行为 policy 选了 ' + names[S.chosen] + '（不是贪心动作），SARSA 把这个探索的后果计入 target，所以 target 更低：' + tf(sarsa) + ' < ' + tf(ql) + '。'));
        }
        body.put(h('p.muted', '同一条经验 (s, a, r, s′)，智能体下一步在 s′ 用 ε-greedy 实际选了 A′。修改 s′ 的四个 Q 值和 A′，比较两个 target。'),
          inputs, h('div.viz-row', h('span', '实际选出的 A′：'), chosenSeg),
          slider('r', { min: -1, max: 1, step: 0.1, value: S.r, format: v => v.toFixed(1), onInput: v => { S.r = v; draw(); } }),
          slider('当前 Q(s,a)', { min: -1, max: 1, step: 0.05, value: S.cur, format: v => v.toFixed(2), onInput: v => { S.cur = v; draw(); } }), out);
        draw();
      }
      function cliff() {
        const env = cliffEnv();
        let episodes = 300, eps = 0.1, alpha = 0.5;
        const out = h('div'), grids = h('div.viz-cols');
        function run() {
          const res = ['sarsa', 'qlearning'].map(algo => {
            const ag = makeAgent(env, { algo, alpha, epsilon: eps, gamma: 0.9, seed: 3, maxSteps: 300 });
            while (ag.episode < episodes) ag.step();
            return ag;
          });
          clear(grids);
          res.forEach(ag => {
            const box = h('div'), v = gridView(box, Object.assign({}, env, { states: env.allStates }), { compact: false });
            const pol = {}; env.states.forEach(s => { if (!env.isTerminal(s)) pol[s] = dp.argmaxActions(ag.Q[s], 1e-9)[0]; });
            // greedy path from start
            const path = [env.start]; let s = env.start; for (let k = 0; k < 30 && !env.isTerminal(s); k++) { const o = env.step(s, pol[s]); if (o.kind === 'cliff') break; s = o.next; path.push(s); }
            const hl = {}; env.cliff.forEach(c => { hl[c] = 'red'; });
            v.update({ policy: pol, trail: path, highlight: hl, labels: Object.fromEntries([...env.cliff].map(c => [c, '悬崖 −5'])) });
            grids.put(h('div', h('h4', ag.algo === 'sarsa' ? 'SARSA 学到的贪心路线' : 'Q-learning 学到的贪心路线'), box,
              h('p.muted', '贪心路线长度 ' + (path.length - 1) + ' 步；训练最后 50 条 episode 的平均 G₀ = ' + fmt(ag.history.slice(-50).reduce((a, b) => a + b.G, 0) / 50, 2))));
          });
          const W = 20, sm = arr => arr.map((_, i) => { const sl = arr.slice(Math.max(0, i - W + 1), i + 1); return sl.reduce((a, b) => a + b.G, 0) / sl.length; });
          clear(out).put(RL.vizUtil.lineChart([{ values: sm(res[0].history), color: 'blue' }, { values: sm(res[1].history), color: 'red' }], { xlabel: 'episode' }),
            h('div.legend', h('span', h('i', { style: { background: 'var(--c-blue)' } }), 'SARSA'), h('span', h('i', { style: { background: 'var(--c-red)' } }), 'Q-learning')),
            h('p.viz-note', 'Q-learning 的 target 用 max，相当于假设“以后都会走最优（贪心）路线”，所以学到贴着悬崖的最短路线；但训练时行为仍是 ε-greedy，偶尔一步探索就掉下去，训练中的回报更差。SARSA 的 target 包含实际（带探索）的下一动作，学到远离悬崖、更安全的路线。'));
        }
        body.put(h('p.muted', '课件 Cliffworld 的结论演示（6×4，底行中间四格是悬崖）。本站的演示设定（课件未给出全部数值）：确定性移动，普通一步奖励 −1；掉下悬崖奖励 −5 并回到起点（不是额外再扣 −1）；进入终点奖励 0，γ=0.9。'),
          slider('ε', { min: 0.01, max: 0.3, step: 0.01, value: eps, format: v => v.toFixed(2), onInput: v => { eps = v; } }),
          slider('episode 数', { min: 100, max: 1000, step: 50, value: episodes, onInput: v => { episodes = v; } }),
          button('训练两种算法', run, 'btn primary'), grids, out);
        run();
      }
      function draw() { clear(body); if (tab === 'same') same(); else cliff(); }
      el.put(segmented([{ value: 'same', label: '同一 transition 的 target' }, { value: 'cliff', label: 'Cliffworld' }], tab, v => { tab = v; draw(); }, '视图'), body);
      draw();
    }
  });
})(window);
