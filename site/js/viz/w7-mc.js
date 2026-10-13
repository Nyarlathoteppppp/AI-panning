/* Week 7 visualiser: Monte Carlo prediction (course algorithm, slide 25). */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, clear, fmt, segmented, button, texHTML } = RL.dom;
  const { create: gridView, table, readout, A_ZH } = RL.gridView;
  const { courseGrid, rng: rngOf, ARROWS } = RL.mdp;
  const dp = RL.dp, L = RL.learn;
  const AN = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' };

  /** Generate one episode following a deterministic policy. */
  function generate(g, policy, rng, maxSteps) {
    const steps = []; let s = g.start;
    while (!g.isTerminal(s) && steps.length < (maxSteps || 100)) {
      const a = policy[s], o = g.step(s, a, rng);
      steps.push({ s, a, r: o.reward, next: o.next, slip: o.kind !== 'intended' ? o.kind : null }); s = o.next;
    }
    return steps;
  }
  RL.vizUtil = Object.assign(RL.vizUtil || {}, { generateEpisode: generate });

  RL.viz.register('mc', {
    title: 'Monte Carlo simulator：整条 episode 结束后，倒序计算 G 并更新',
    mount(el) {
      const g = courseGrid(), gamma = 0.9;
      let mode = 'q', polKey = 'p1', episodes, epIndex, pending, log, table_, seed, lastLine, ops = 0, replaying = false;
      const gridBox = h('div'), info = h('div'), tableBox = h('div'), traceBox = h('div');
      const view = gridView(gridBox, g);
      const policy = () => (polKey === 'p1' ? RL.examples.POLICY1 : RL.examples.POLICY2);
      const keyOf = e => (mode === 'q' ? e.s + e.a : String(e.s));
      const ARW = { N: '↑', E: '→', S: '↓', W: '←' };
      const policyText = () => { const by = {}; g.nonTerminal.forEach(st => { const a = policy()[st]; (by[a] = by[a] || []).push('s' + st); });
        return ['N', 'E', 'S', 'W'].filter(a => by[a]).map(a => by[a].join('、') + ' ' + ARW[a]).join('；'); };
      const polLine = h('p.viz-note'), modeNote = h('p.muted'), routeLine = h('p.viz-note');
      function reset() {
        episodes = polKey === 'p1' ? RL.examples.MC_EPISODES.map(e => e.steps.map(x => Object.assign({}, x))) : [];
        epIndex = 0; pending = null; table_ = {}; seed = 3; lastLine = null; log = []; ops = 0;
        if (!replaying) draw();
      }
      function currentEpisode() { return episodes[epIndex]; }
      function startEpisode() {
        // MC needs complete episodes: resample in the (rare) case an episode does not terminate within the step cap
        if (!currentEpisode()) { let ep; for (let k = 0; k < 50; k++) { ep = generate(g, policy(), rngOf(seed++)); const last = ep[ep.length - 1]; if (last && g.isTerminal(last.next)) break; } episodes.push(ep); }
        const ep = currentEpisode();
        ep.forEach(x => { delete x.G; });
        pending = { t: ep.length - 1, G: 0, ep };
      }
      function stepBack() {
        if (!pending) startEpisode();
        const { ep } = pending, t = pending.t, e = ep[t];
        const key = keyOf(e), cell = table_[key] || (table_[key] = { Q: 0, N: 0 });
        const Gnext = pending.G, G = e.r + gamma * Gnext, before = cell.Q;
        cell.N += 1; cell.Q = before + (G - before) / cell.N; pending.G = G;
        e.G = G; // remember the return of this time step for the trace table
        lastLine = { t, e, Gnext, G, before, after: cell.Q, N: cell.N, key };
        log.push(lastLine);
        pending.t -= 1;
        if (pending.t < 0) { pending = null; epIndex++; }
        ops++;
        if (!replaying) draw();
      }
      function finishEpisode() { if (!pending) startEpisode(); const idx = epIndex; while (pending && epIndex === idx) stepBack(); }
      function runMany(n) { replaying = true; for (let k = 0; k < n; k++) finishEpisode(); replaying = false; draw(); }
      // step back = rebuild from scratch and replay one primitive step fewer (episodes after the course ones come from fixed seeds)
      function undo() { if (!ops) return; const k = ops - 1; replaying = true; reset(); for (let i = 0; i < k; i++) stepBack(); replaying = false; draw(); }
      function exactQ() {
        const V = dp.policyEvaluationExact(g, policy());
        return { V, Q: dp.qTable(g, V) };
      }
      function draw() {
        const ep = pending ? pending.ep : episodes[Math.max(0, epIndex - 1)] || episodes[0];
        const trail = ep ? [ep[0].s].concat(ep.map(x => x.next)) : [];
        const q = {}, values = {};
        g.nonTerminal.forEach(s => { q[s] = {}; g.actions.forEach(a => { const c = table_[s + a]; if (c) q[s][a] = c.Q; }); const vc = table_[String(s)]; if (vc) values[s] = vc.Q; });
        const hl = {}; if (lastLine) hl[lastLine.e.s] = 'blue';
        if (mode === 'q') view.update({ q, qDecimals: 3, trail, highlight: hl });
        else view.update({ values, decimals: 3, trail, highlight: hl, policy: policy() });
        const epNo = pending ? epIndex + 1 : epIndex;
        const course = polKey === 'p1' && epNo >= 1 && epNo <= 3;
        clear(info).put(readout([['当前 episode', (pending ? '第 ' + (epIndex + 1) + ' 条（处理中）' : epIndex ? '已完成 ' + epIndex + ' 条' : '尚未开始') + (course ? '（课件 Episode ' + epNo + '）' : '')],
          ['episode 长度 T', ep ? String(ep.length) : '—'], ['下一个要处理的 t', pending ? String(pending.t) : '—（开始新 episode 时从 t = T−1 倒着走）']]));
        if (lastLine) {
          const l = lastLine, name = mode === 'q' ? 'Q(s_{' + l.e.s + '},\\text{' + AN[l.e.a] + '})' : 'V(s_{' + l.e.s + '})';
          info.put(h('div.viz-step', h('b', 't = ' + l.t + '：S = s' + l.e.s + '，A = ' + AN[l.e.a] + '，R = ' + fmt(l.e.r, 0)),
            h('div', { html: texHTML('G_{' + l.t + '} = R_{' + (l.t + 1) + '} + \\gamma G_{' + (l.t + 1) + '} = ' + fmt(l.e.r, 0).replace('−', '-') + ' + 0.9\\times' + fmt(l.Gnext, 4).replace('−', '-') + ' = ' + fmt(l.G, 4).replace('−', '-'), true) }),
            h('div', { html: texHTML('N \\leftarrow ' + l.N + ',\\quad ' + name + ' \\leftarrow ' + fmt(l.before, 4).replace('−', '-') + ' + \\tfrac{1}{' + l.N + '}\\big(' + fmt(l.G, 4).replace('−', '-') + ' - ' + fmt(l.before, 4).replace('−', '-') + '\\big) = ' + fmt(l.after, 4).replace('−', '-'), true) })));
        }
        modeNote.textContent = mode === 'q'
          ? '估计 Q(s,a)：把每个 G 记到“状态 + 动作”那一格（如 (s1, Up)），表示在 s 做 a 之后的平均回报。课件用这个：没有模型时，要比较同一状态下不同动作的好坏，只能靠 Q。'
          : '估计 V(s)：把每个 G 只记到状态那一格（如 s1），表示从 s 出发的平均回报。算法完全相同。policy 固定时每个状态只做一个动作，所以这里的 V(s) 和 Q(s, π(s)) 数字一样。';
        if (ep) {
          const slips = ep.filter(x => x.slip);
          const route = ['s' + ep[0].s].concat(ep.map(x => (x.slip ? '—' + AN[x.a] + '（' + (x.slip === 'slip left' ? '向左打滑' : '向右打滑') + '）→ ' : '→ ') + 's' + x.next)).join(' ');
          routeLine.innerHTML = '<b>这一条 episode 的路线</b>（虚线）：' + route + '。' + (slips.length
            ? ' 这条路线有 ' + slips.length + ' 处打滑，所以和“一直按箭头走”的路线不同。'
            : ' 这一条一次都没打滑，正好沿着箭头走。') +
            ' policy 每次都一样，但动作有 0.8 的概率按意图移动、左右各 0.1 的概率打滑，所以每条 episode 的路线都可能不同。同一个 (s,a) 在不同 episode 里会得到不同的 G（有时进 +1，有时掉进 −1），MC 把它们平均起来，才得到这个 policy 的期望回报。';
        } else routeLine.innerHTML = '';
        polLine.innerHTML = '当前 policy（每个格子固定走的方向）：' + policyText() + '。' + (mode === 'q' ? ' 每个格子只有 policy 选的那个动作会被访问，所以只有那个三角形会出现数字。' : '');
        const ex = exactQ();
        const rows = Object.entries(table_).map(([k, c]) => {
          const s = parseInt(k, 10), a = k.replace(/^\d+/, '');
          const truth = mode === 'q' ? ex.Q[s][a] : ex.V[s];
          return { cells: [mode === 'q' ? 's' + s + ', ' + AN[a] : 's' + s, c.N, fmt(c.Q, 4), fmt(truth, 4)], cls: lastLine && lastLine.key === k ? 'hl' : null };
        }).sort((x, y) => parseInt(x.cells[0].slice(1)) - parseInt(y.cells[0].slice(1)));
        clear(tableBox).put(rows.length ? [table([mode === 'q' ? '(s, a)' : 's', 'N（G 的个数）', '估计 = G 的平均', '真实值 ' + (mode === 'q' ? 'q<sub>π</sub>' : 'v<sub>π</sub>') + '（对照）'], rows),
          h('p.muted', '真实值是用转移概率解 Bellman 方程得到的，MC 本身用不到它，放在这里只是为了检验：N 越大，估计越接近真实值。')] : h('p.muted', '还没有更新任何条目。'));
        const nextT = pending ? pending.t : -1;
        clear(traceBox).put(ep ? table(['t', 'S<sub>t</sub>', 'A<sub>t</sub>', '实际结果', 'R<sub>t+1</sub>', 'G<sub>t</sub> = R<sub>t+1</sub> + 0.9·G<sub>t+1</sub>', '状态'],
          ep.map((x, t) => ({ cells: ['' + t, 's' + x.s, AN[x.a], (x.slip ? (x.slip === 'slip left' ? '向左打滑' : '向右打滑') : '按意图') + ' → s' + x.next + (g.isTerminal(x.next) ? '（终止）' : ''), fmt(x.r, 0),
            x.G != null ? fmt(x.r, 0) + ' + 0.9×' + fmt(t + 1 < ep.length && ep[t + 1].G != null ? ep[t + 1].G : 0, 4) + ' = <b>' + fmt(x.G, 4) + '</b>' : '—',
            x.G != null ? (lastLine && lastLine.e === x ? '刚处理' : '已处理') : t === nextT ? '下一个' : '等待'],
            cls: lastLine && lastLine.e === x ? 'hl' : null }))) : null,
          ep ? h('p.muted', '表格按时间顺序列出这条 episode（agent 就是这样走的）。处理却从最后一行 t = ' + (ep.length - 1) + ' 开始往上：最后一步之后是终止状态，G = 0，所以它的 G 能直接算；每往上一行，用下面那一行刚算好的 G。') : null);
      }
      const modeSeg = segmented([{ value: 'q', label: '估计 Q(s,a)（课件）' }, { value: 'v', label: '估计 V(s)' }], mode, v => { mode = v; reset(); }, '估计对象');
      const polSeg = segmented([{ value: 'p1', label: 'Policy 1' }, { value: 'p2', label: 'Policy 2（s2 改为 ←）' }], polKey, v => { polKey = v; reset(); }, 'policy');
      const intro = h('div.viz-note', { html: '<b>这个实验在做什么</b>：policy 固定不变（下面列出每个格子走哪个方向），我们<b>不知道</b>打滑概率，只能让 agent 按 policy 跑 episode，看实际拿到的奖励，用这些经验估计 ' +
        texHTML('q_\\pi(s,a)') + '（这个 policy 下，在 s 做 a 之后平均能拿多少回报）。<br>每条 episode 分两段：① 先按 policy 走完（下面“本条 episode”表格就是走出来的轨迹）；② 再<b>从最后一步往前</b>处理，每点一次“处理一步”算出一个 ' + texHTML('G_t') +
        '，并把它平均进那个格子的 Q。格子里的数 = 目前为止该 (s,a) 所有 G 的平均。前三条 episode 是课件的轨迹，之后的按 policy 随机生成（每次打滑不同）。' });
      el.put(intro, modeSeg, modeNote, polSeg,
        h('div.viz-row', button('← 上一步', undo, 'btn'), button('处理一步（从最后一步往前）', stepBack, 'btn primary'), button('处理完这条 episode', finishEpisode, 'btn'), button('再跑 100 条随机 episode', () => runMany(100), 'btn'), button('重置', reset, 'btn ghost')),
        polLine, gridBox, h('p.muted', '虚线 = 本条 episode 走过的路线；蓝框 = 刚刚更新的格子。'), routeLine, info, h('h4', '本条 episode（按时间顺序；处理时从最后一行往上）'), traceBox, h('h4', '估计表：访问过的条目'), tableBox);
      reset();
    }
  });
})(window);
