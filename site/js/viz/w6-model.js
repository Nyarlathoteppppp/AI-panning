/* Week 6-1 visualisers: modelling an MDP. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, clear, fmt, slider, segmented, button, tex, texHTML } = RL.dom;
  const { create: gridView, table, readout, A_ZH } = RL.gridView;
  const { courseGrid, rng: makeRng, ARROWS } = RL.mdp;
  const dp = RL.dp;
  const optimal = (() => { let cache; return () => cache || (cache = (() => {
    const g = courseGrid(); let V = dp.zeros(g); for (let i = 0; i < 300; i++) V = dp.valueIterationSweep(g, V).V;
    return { V, policy: dp.greedyPolicy(g, V) };
  })()); })();

  /* ---------- c01: which model fits? ---------- */
  RL.viz.register('classify', {
    title: '放宽经典规划的假设，会得到什么模型？',
    mount(el) {
      const assumptions = [
        ['deterministic', '确定性 Deterministic：每个动作只有一个结果'],
        ['observable', '完全可观测 Fully observable：知道当前状态'],
        ['single', '单一决策者 Single agent：只有我在做决定'],
        ['known', '已知结果分布：能写出每个结果的概率']
      ];
      const on = { deterministic: true, observable: true, single: true, known: true };
      const verdict = h('div.viz-step');
      const toggles = h('div.toggle-list', assumptions.map(([k, label]) => {
        const box = h('input', { type: 'checkbox', checked: true });
        box.addEventListener('change', () => { on[k] = box.checked; draw(); });
        return h('label', box, label);
      }));
      function draw() {
        let name, text;
        if (!on.single) { name = 'Multi-agent（如 stochastic game）'; text = '下一次决策时的局面还取决于对手的选择，例如下棋：你的落子是确定的，但对手接着会走。课件把它列为 MDP 的扩展，本课不展开。'; }
        else if (on.deterministic && on.observable) { name = '经典规划 Classical planning'; text = '一个动作只有一个后继，计划（plan）就是一串动作 ⟨a₀, a₁, …⟩。例：把一块积木放到另一块上。'; }
        else if (on.deterministic && !on.observable) { name = '部分可观测（确定性动作）'; text = '动作本身确定，但执行前不知道真实状态。例：打开箱子之前不知道猫是否活着。'; }
        else if (!on.known && on.observable) { name = 'FOND（Fully Observable Non-Deterministic）或“概率未知”'; text = '知道可能出现哪些结果，但没有概率：问朋友“喝茶还是咖啡”。若结果集合已知、概率要靠经验学出来，就是“新路面上测试赛车”的情况——这正是后面强化学习面对的问题。'; }
        else if (on.known && on.observable) { name = 'MDP（Markov Decision Process）'; text = '每个动作的结果服从已知概率分布，并且总能看到当前状态。例：抛硬币（0.5/0.5）；课程的 Gridworld（0.8 / 0.1 / 0.1）。这是 Week 6 的主角。'; }
        else if (on.known && !on.observable) { name = 'POMDP（Partially Observable MDP）'; text = '运动有概率，状态也只能部分观测。例：雾天在湿滑道路上开车。课件只要求认识名称。'; }
        else { name = 'POND（Partially Observable Non-Deterministic）'; text = '既不完全可观测，结果也没有概率。只需知道这个名字。'; }
        clear(verdict).put(h('div', h('span.pill.blue', '对应模型'), ' ', h('b', name)), h('p', text));
      }
      el.put(h('p.viz-note', '勾选表示该假设仍然成立。经典规划要求它们全部成立；本课程的 classical MDP 只放宽“确定性”。'), toggles, verdict);
      // Sorting exercise from W6-1 p.8.
      const examples = [
        ['把一块积木放到另一块上', 'det'], ['下一步棋，然后等对手走', 'multi'], ['问朋友喜欢茶还是咖啡', 'nondet'], ['抛一枚均匀硬币', 'prob'],
        ['打开箱子看猫是否活着', 'partial'], ['在新路面上测试赛车', 'unknown'], ['雾天在湿滑道路上开车', 'pomdp']];
      const opts = [['det', 'Deterministic'], ['multi', 'Multi-agent'], ['nondet', 'Nondeterministic'], ['prob', 'Probabilistic'], ['partial', 'Partial observability'], ['unknown', 'Unknown probabilities'], ['pomdp', 'POMDP']];
      const list = h('div.cards-sort', examples.map(([text, ans]) => {
        const sel = h('select.viz-select', h('option', { value: '' }, '选择类型…'), opts.map(([v, l]) => h('option', { value: v }, l)));
        const row = h('div.sort-item', h('span', text), sel);
        sel.addEventListener('change', () => { row.classList.toggle('ok', sel.value === ans); row.classList.toggle('bad', sel.value && sel.value !== ans); });
        return row;
      }));
      el.put(h('h4', '练习：把课件中的七个例子归类（选对变绿）'), list);
      draw();
    }
  });

  /* ---------- c02 / c12: MDP visualiser ---------- */
  RL.viz.register('mdp', {
    title: 'MDP visualizer：状态、动作、转移概率、奖励与 policy',
    mount(el, props) {
      const g = courseGrid();
      let s = props.state || 8, a = props.action || 'N', mode = props.mode || 'declarative', overlay = 'none';
      const counts = {}; let total = 0; const rng = makeRng(7);
      const gridBox = h('div'), info = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { s = st; resetCounts(); draw(); } } });
      const actionSeg = segmented(g.actions.map(x => ({ value: x, label: ARROWS[x] + ' ' + x })), a, v => { a = v; resetCounts(); draw(); }, '动作');
      const modeSeg = segmented([{ value: 'declarative', label: '已知模型（declarative）' }, { value: 'generative', label: '只能采样（generative）' }], mode, v => { mode = v; draw(); }, '访问方式');
      const overlaySeg = segmented([{ value: 'none', label: '不显示 policy' }, { value: 'pi0', label: '课件 π₀' }, { value: 'opt', label: '最优 π*' }], overlay, v => { overlay = v; draw(); }, 'policy');
      function resetCounts() { Object.keys(counts).forEach(k => delete counts[k]); total = 0; }
      function sample(n) { for (let i = 0; i < n; i++) { const o = g.step(s, a, rng); const k = o.next + '|' + o.reward; counts[k] = (counts[k] || 0) + 1; total++; } draw(); }
      function draw() {
        const branches = g.branches(s, a), outs = g.outcomes(s, a);
        const hl = {}; outs.forEach(o => { hl[o.next] = o.next === s ? 'orange' : 'green'; });
        const policy = overlay === 'pi0' ? RL.examples.PI0 : overlay === 'opt' ? optimal().policy : null;
        view.update({ selected: s, highlight: mode === 'declarative' ? hl : {}, policy, agent: s });
        clear(info);
        info.put(h('p', '当前：', h('b', 's' + s + ' = (' + g.coordOf[s].join(',') + ')'), '，动作 ', h('b.t-orange', A_ZH[a]),
          policy ? h('span', '；policy 在此状态选 ', h('b.t-orange', ARROWS[policy[s]] + ' ' + policy[s])) : null));
        if (mode === 'declarative') {
          info.put(h('h4', '① 三种移动尝试（0.8 按预期，0.1 向左滑，0.1 向右滑）'),
            table(['移动尝试', '实际方向', '概率', '后继 s′', '奖励 r(s,a,s′)'], branches.map(b => [b.kind === 'intended' ? '按预期' : b.kind === 'slip left' ? '向左滑' : '向右滑',
              ARROWS[b.dir] + ' ' + b.dir, fmt(b.prob, 1), 's' + b.next + (b.blocked ? '（撞墙/边界，原地）' : ''), fmt(b.reward, 0)])),
            h('h4', '② 合并成联合分布 p(s′, r | s, a)'),
            table(['s′', 'r', 'p(s′, r | s, a)', '来自'], outs.map(o => ['s' + o.next, fmt(o.reward, 0), fmt(o.prob, 1), o.from.map(k => k === 'intended' ? '按预期' : k === 'slip left' ? '左滑' : '右滑').join(' + ')])),
            h('h4', '③ 矩阵表示：P', h('sup', a), ' 的第 s' + s + ' 行（只列非零项，其余为 0）'),
            h('div.math-row', { html: texHTML('P^{' + a + '}_{s' + s + ',\\cdot} = (' + g.states.map(x => { const p = g.prob(s, a, x); return p ? (x + ':' + fmt(p, 1)) : null; }).filter(Boolean).join(',\\ ') + '),\\quad \\textstyle\\sum_j P^{' + a + '}_{s' + s + ',j} = 1', true) }));
        } else {
          const rows = Object.entries(counts).map(([k, c]) => { const [nx, r] = k.split('|'); return ['s' + nx, fmt(+r, 0), c, fmt(c / total, 3)]; });
          info.put(h('p.viz-note', '黑箱模拟器（generative model）只返回一个样本 (s′, r) ~ G(s, a)，不告诉你概率；不断采样，频率会接近真实概率。注意：它能任意指定起始状态、同一个 (s, a) 反复调用，所以仍算“有模型”。model-free agent 只能在真实环境里从当前状态往前走，拿到的样本形式相同，但不能回到任意状态重试。'),
            h('div.viz-row', button('采样 1 次', () => sample(1), 'btn'), button('采样 100 次', () => sample(100), 'btn'), button('采样 1000 次', () => sample(1000), 'btn'), button('清空', () => { resetCounts(); draw(); }, 'btn ghost')),
            total ? table(['s′', 'r', '次数', '频率'], rows) : h('p.muted', '还没有样本。'),
            total ? h('p.muted', '共 ' + total + ' 次。切回“已知模型”对照真实概率。') : null);
        }
      }
      el.put(h('div.viz-row', actionSeg), h('div.viz-row', modeSeg), h('div.viz-row', overlaySeg), gridBox, h('p.muted', '点击任意非终止格子选状态。橙框＝停在原地的后继，绿框＝移动到别处的后继。'), info);
      draw();
    }
  });

  /* ---------- c03: trajectory recorder ---------- */
  RL.viz.register('trajectory', {
    title: '轨迹记录器：history 越来越长，预测却只需要当前状态',
    mount(el) {
      const g = courseGrid(); const rng = makeRng(11);
      let s = g.start, t = 0, done = false; const hist = [];
      const gridBox = h('div'), info = h('div'), log = h('div.trace');
      const view = gridView(gridBox, g);
      function act(a) {
        if (done) return;
        const o = g.step(s, a, rng);
        hist.push({ t, s, a, r: o.reward, next: o.next, kind: o.kind });
        s = o.next; t++; done = o.done; draw();
      }
      function reset() { s = g.start; t = 0; done = false; hist.length = 0; draw(); }
      function draw() {
        view.update({ agent: s, trail: [g.start].concat(hist.map(x => x.next)), selected: s });
        clear(log); log.put(h('div', 'S₀ = s1')); hist.forEach(x => log.put(h('div', 'A' + sub(x.t) + ' = ' + x.a + (x.kind !== 'intended' ? '（' + (x.kind === 'slip left' ? '左滑' : '右滑') + '）' : '') + '  →  R' + sub(x.t + 1) + ' = ' + x.r + ',  S' + sub(x.t + 1) + ' = s' + x.next)));
        clear(info).put(
          readout([['时刻 t', String(t)], ['当前状态 S<sub>t</sub>', 's' + s + (done ? '（终止）' : '')], ['history 长度', (1 + 3 * hist.length) + ' 个量：H<sub>t</sub> = (S₀, A₀, R₁, …, S<sub>t</sub>)'],
            ['累计 return（γ=0.9）', fmt(hist.reduce((acc, x, k) => acc + Math.pow(0.9, k) * x.r, 0), 4)]]),
          done ? h('p.viz-step', 'Episode 结束（进入终止状态）。终止状态没有动作，也没有后续奖励。') :
            h('div.viz-step', h('b', 'Markov 性质：'), '无论之前走过哪条路，下一步 (S', sub(t + 1), ', R', sub(t + 1), ') 的分布只由 S', sub(t), '=s' + s + ' 和你现在选的动作决定。例如选 North：',
              h('span', g.outcomes(s, 'N').map(o => ' P(s' + o.next + ', ' + o.reward + ') = ' + fmt(o.prob, 1)).join('；'))));
      }
      const sub = n => String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[+d]).join('');
      el.put(h('div.viz-row', g.actions.map(a => button(ARROWS[a] + ' ' + a, () => act(a), 'btn')), button('重新开始', reset, 'btn ghost')), gridBox, info, h('h4', '记录的 trajectory'), log);
      draw();
    }
  });

  /* ---------- c04: fixed plan vs policy ---------- */
  RL.viz.register('planpolicy', {
    title: '固定 plan vs policy：在会打滑的世界里各跑 1000 次',
    mount(el) {
      const g = courseGrid();
      const policy = Object.assign({}, optimal().policy);
      const plan = ['N', 'N', 'E', 'E', 'E'];
      const gridBox = h('div'), out = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (g.isTerminal(st)) return; const order = g.actions; policy[st] = order[(order.indexOf(policy[st]) + 1) % 4]; run(); } });
      function simulate(kind, n, seed) {
        const rng = makeRng(seed); let goal = 0, pit = 0, timeout = 0, steps = 0, ret = 0;
        for (let i = 0; i < n; i++) {
          let s = g.start, k = 0, G = 0;
          while (!g.isTerminal(s) && k < 100) {
            const a = kind === 'plan' ? plan[k] : policy[s];
            if (!a) break; // plan exhausted
            const o = g.step(s, a, rng); G += Math.pow(0.9, k) * o.reward; s = o.next; k++;
          }
          if (s === 11) goal++; else if (s === 7) pit++; else timeout++;
          steps += k; ret += G;
        }
        return { goal: goal / n, pit: pit / n, other: timeout / n, steps: steps / n, ret: ret / n };
      }
      function bar(p, color) { return h('div.bar', h('i', { style: { width: (100 * p).toFixed(1) + '%', background: 'var(--c-' + color + ')' } })); }
      function run() {
        view.update({ policy, agent: g.start });
        const a = simulate('plan', 1000, 3), b = simulate('policy', 1000, 3);
        const exact = dp.policyEvaluationExact(g, policy)[g.start];
        clear(out).put(table(['', '到达 +1', '掉进 −1', '没到终点', '平均步数', '平均 discounted return'], [
          ['固定 plan ⟨N,N,E,E,E⟩', fmt(a.goal * 100, 1) + '%', fmt(a.pit * 100, 1) + '%', fmt(a.other * 100, 1) + '%', fmt(a.steps, 1), fmt(a.ret, 3)],
          ['policy（左图箭头）', fmt(b.goal * 100, 1) + '%', fmt(b.pit * 100, 1) + '%', fmt(b.other * 100, 1) + '%', fmt(b.steps, 1), fmt(b.ret, 3)]]),
          h('div.bar-row', h('span', 'plan 成功率'), bar(a.goal, 'orange'), h('span.num', fmt(a.goal * 100, 1) + '%')),
          h('div.bar-row', h('span', 'policy 成功率'), bar(b.goal, 'green'), h('span.num', fmt(b.goal * 100, 1) + '%')),
          h('p.viz-note', 'policy 从 s1 出发的精确期望回报 v', h('sub', 'π'), '(s1) = ', h('b', fmt(exact, 4)), '（由第 8 章的线性方程求得）。点击格子可以循环修改该格的动作，观察数字变化。plan 一旦打滑，后面的动作就是为另一个位置准备的；policy 在每个状态都重新决定。'));
      }
      el.put(h('div.viz-note', h('b', '点任意非终止格可以改变 policy 在该格的动作'),
        h('p', '这个实验比较固定 plan（计划）与按状态决定动作的 policy（策略）：plan 的 5 个动作用完就停，policy 最多模拟 100 步；停下时没到任何终点的都算超时。平均步数包含这些被截断的运行（plan 按实际执行步数、policy 超时按 100 步计）。')),
        gridBox, out, button('恢复最优 policy', () => { Object.assign(policy, optimal().policy); run(); }, 'btn ghost'));
      run();
    }
  });

  /* ---------- c05: return calculator ---------- */
  RL.viz.register('returncalc', {
    title: 'Return calculator：调奖励序列和 γ，看 discounted return 怎样累加',
    mount(el) {
      let rewards = [0, 0, 0, 0, 1], gamma = 0.9, startT = 0;
      const presets = [
        ['课件 Episode 1（s1→…→s11）', [0, 0, 0, 0, 1]], ['课件 Episode 3（掉进 −1）', [0, 0, 0, 0, 0, -1]],
        ['每步 −0.04 的“生存成本”', [-0.04, -0.04, -0.04, -0.04, 1]], ['先给 1 再给 −1', [1, -1, 0, 0, 0]]];
      const inputs = h('div.viz-row'), bars = h('div'), result = h('div');
      const gSlider = slider('γ', { min: 0, max: 1, step: 0.01, value: gamma, format: v => v.toFixed(2), onInput: v => { gamma = v; draw(); } });
      const tSlider = slider('从时刻 t 开始', { min: 0, max: rewards.length - 1, step: 1, value: 0, onInput: v => { startT = v; draw(); } });
      function buildInputs() {
        clear(inputs);
        rewards.forEach((r, i) => inputs.put(h('label.viz-row', { style: { gap: '4px' } }, h('span.muted', 'R' + (i + 1)),
          h('input.viz-input', { type: 'number', step: '0.1', value: r, oninput: e => { rewards[i] = parseFloat(e.target.value) || 0; draw(); } }))));
        inputs.put(button('+ 一步', () => { rewards.push(0); refresh(); }, 'btn ghost'), rewards.length > 1 ? button('− 一步', () => { rewards.pop(); refresh(); }, 'btn ghost') : null);
      }
      function refresh() { startT = Math.min(startT, rewards.length - 1); tSlider.input.max = rewards.length - 1; tSlider.set(startT); buildInputs(); draw(); }
      function draw() {
        const terms = rewards.slice(startT).map((r, k) => ({ k, r, w: Math.pow(gamma, k), v: Math.pow(gamma, k) * r }));
        const G = terms.reduce((a, t) => a + t.v, 0), maxAbs = Math.max(1e-9, ...terms.map(t => Math.abs(t.r)));
        clear(bars).put(terms.map(t => h('div.bar-row',
          h('span', { html: texHTML('\\gamma^{' + t.k + '}R_{' + (startT + t.k + 1) + '}') }),
          h('div.bar', h('i', { style: { width: (50 * Math.abs(t.v) / maxAbs).toFixed(1) + '%', left: t.v >= 0 ? '50%' : (50 - 50 * Math.abs(t.v) / maxAbs).toFixed(1) + '%', background: t.v >= 0 ? 'var(--c-green)' : 'var(--c-red)' } }),
            h('i', { style: { left: 'calc(50% - 1px)', width: '2px', background: 'var(--border-strong)' } })),
          h('span.num', fmt(t.w, 3) + '×' + fmt(t.r, 2)))));
        const expr = terms.map(t => (t.k === 0 ? '' : '\\gamma^{' + t.k + '}') + '(' + fmt(t.r, 2).replace('−', '-') + ')').join(' + ');
        clear(result).put(h('div', { html: texHTML('G_{' + startT + '} = ' + expr + ' = ' + fmt(G, 4).replace('−', '-'), true) }),
          h('p.viz-note', 'γ = 0 时只看即时奖励 R', h('sub', String(startT + 1)), '；γ 越接近 1，越远的奖励越重要。若每步奖励恒为 1 且永不终止（continuing），G = 1/(1−γ) = ', h('b', gamma < 1 ? fmt(1 / (1 - gamma), 2) : '∞'), '。'));
      }
      el.put(h('div.viz-row', presets.map(([name, r]) => button(name, () => { rewards = r.slice(); startT = 0; refresh(); }, 'btn'))), inputs, gSlider,
        h('p.viz-note', '这里允许 γ=1 只是为了比较有限长度奖励序列的不折扣总和；无限持续任务的回报不一定收敛。'),
        tSlider, bars, result);
      refresh();
    }
  });

  /* ---------- c06: from many returns to a value ---------- */
  RL.viz.register('valuedist', {
    title: '一条轨迹的 return 是随机的；value 是它的期望',
    mount(el, props) {
      const g = courseGrid();
      let start = 1, which = 'opt', samples = [], seed = 1;
      const gridBox = h('div'), chart = h('div'), info = h('div');
      const view = gridView(gridBox, g, { onCell: st => { if (!g.isTerminal(st)) { start = st; samples = []; draw(); } } });
      const pols = () => ({ opt: optimal().policy, pi0: RL.examples.PI0, p1: RL.examples.POLICY1 }[which]);
      const seg = segmented([{ value: 'opt', label: '最优 π*' }, { value: 'p1', label: '课件示例 policy（W7 用）' }, { value: 'pi0', label: '课件 π₀' }], which, v => { which = v; samples = []; draw(); }, 'policy');
      function sample(n) {
        const rng = makeRng(seed++), pol = pols();
        for (let i = 0; i < n; i++) {
          let s = start, k = 0, G = 0;
          while (!g.isTerminal(s) && k < 200) { const o = g.step(s, pol[s], rng); G += Math.pow(0.9, k) * o.reward; s = o.next; k++; }
          samples.push(G);
        }
        draw();
      }
      function draw() {
        const pol = pols(), exact = dp.policyEvaluationExact(g, pol);
        view.update({ policy: pol, selected: start, values: exact, decimals: 3 });
        clear(chart);
        const mean = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
        // histogram of returns in [-1, 1]
        const bins = 20, counts = new Array(bins).fill(0);
        samples.forEach(x => { counts[Math.min(bins - 1, Math.max(0, Math.floor((x + 1) / 2 * bins)))]++; });
        const maxC = Math.max(1, ...counts), W = 360, H = 130;
        const svgEl = RL.dom.s('svg', { viewBox: '0 0 ' + W + ' ' + (H + 30), class: 'chart' },
          counts.map((c, i) => RL.dom.s('rect', { x: 10 + i * (W - 20) / bins + 1, y: H - c / maxC * (H - 10), width: (W - 20) / bins - 2, height: c / maxC * (H - 10), fill: (i + 0.5) / bins * 2 - 1 >= 0 ? 'var(--c-green)' : 'var(--c-red)', opacity: 0.75 })),
          RL.dom.s('line', { x1: 10, x2: W - 10, y1: H, y2: H, class: 'axis' }),
          [-1, -0.5, 0, 0.5, 1].map(v => RL.dom.s('text', { x: 10 + (v + 1) / 2 * (W - 20), y: H + 14, class: 'tick', 'text-anchor': 'middle', text: v })),
          RL.dom.s('line', { x1: 10 + (exact[start] + 1) / 2 * (W - 20), x2: 10 + (exact[start] + 1) / 2 * (W - 20), y1: 0, y2: H, stroke: 'var(--c-blue)', 'stroke-width': 2, 'stroke-dasharray': '4 3' }),
          mean != null ? RL.dom.s('line', { x1: 10 + (mean + 1) / 2 * (W - 20), x2: 10 + (mean + 1) / 2 * (W - 20), y1: 0, y2: H, stroke: 'var(--c-orange)', 'stroke-width': 2 }) : null,
          RL.dom.s('text', { x: W / 2, y: H + 28, class: 'label', 'text-anchor': 'middle', text: '单条轨迹的 discounted return G₀' }));
        chart.put(svgEl, h('div.legend', h('span', h('i', { style: { background: 'var(--c-blue)' } }), '精确 v_π(s)'), h('span', h('i', { style: { background: 'var(--c-orange)' } }), '样本平均')));
        clear(info).put(readout([['起点', 's' + start], ['样本数', String(samples.length)], ['样本平均 return', mean == null ? '—' : fmt(mean, 4)], ['精确 v<sub>π</sub>(s)', fmt(exact[start], 4)],
          ['单条 return 的取值', samples.length ? '从 ' + fmt(Math.min(...samples), 3) + ' 到 ' + fmt(Math.max(...samples), 3) : '—']]),
          h('p.viz-note', '同一个 policy、同一个起点，每次的 return 都可能不同（打滑、掉坑）。value 不是某一次的结果，而是无数次的平均。'));
      }
      el.put(seg, h('div.viz-row', button('采样 1 条', () => sample(1), 'btn'), button('采样 100 条', () => sample(100), 'btn'), button('采样 2000 条', () => sample(2000), 'btn'), button('清空', () => { samples = []; draw(); }, 'btn ghost')),
        gridBox, h('p.muted', '格子里的数字是精确 v_π(s)。点格子换起点。'), chart, info);
      draw();
    }
  });
})(window);
