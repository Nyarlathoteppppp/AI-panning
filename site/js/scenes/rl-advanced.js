/* 3B1B-style scenes for W7 bandits, W9 function approximation, W10 policy gradient, W11 MCTS. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { PAL, util } = RL.scene;
  const R = String.raw;
  const f = (x, d) => util.fmt(x, d == null ? 3 : d);

  /* ------------------------------------------------------------------ shared linear update (c24) */
  RL.scene.register('linear-update', {
    title: '一次梯度更新，改动所有共享特征的状态',
    intro: '课件 W9 slide 28 的算例：$\\hat V(s;\\mathbf w)=\\mathbf w^\\top\\mathbf x(s)$，初始 $\\mathbf w=(0,0)$，$\\alpha=0.1$。观察到 $s_{10}\\xrightarrow{\\text{Right},+1}s_{11}$（终止）。紫 = 权重 $\\mathbf w$，青 = 特征 $\\mathbf x$，蓝 = 预测 $\\hat V$，粉 = target，红 = $\\delta$。',
    w: 720, h: 330,
    colors: { w: PAL.purple, x: PAL.teal, V: PAL.blue, target: PAL.pink, delta: PAL.red, alpha: PAL.purple },
    build(st) {
      const x10 = [1 / 5, 2 / 5], x6 = [2 / 5, 1 / 5], alpha = 0.1, Y = 1;
      const w0 = [0, 0], delta = Y - (w0[0] * x10[0] + w0[1] * x10[1]);
      const w1 = [w0[0] + alpha * delta * x10[0], w0[1] + alpha * delta * x10[1]];
      const v10 = w1[0] * x10[0] + w1[1] * x10[1], v6 = w1[0] * x6[0] + w1[1] * x6[1];
      const BASE = 250, FX = 300, FW = 520; // feature bars: 1 unit = 300 px ; weight / V bars: 0.05 = 150 px
      const fx = v => v * FX, wv = v => v * 3000;
      const panel = (k, x, title) => { st.text(k, x, 34, title, { size: 14, color: PAL.dim }); st.add(k + 'b', 'line', { x1: x - 70, y1: BASE, x2: x + 70, y2: BASE, stroke: PAL.line, 'stroke-width': 1.5 }); };
      panel('pf', 130, '特征 x(s)'); panel('pw', 360, '权重 w'); panel('pv', FW + 70, '预测 V̂(s) = wᵀx');
      st.text('zw', 360, 52, '（放大 10 倍）', { size: 11, color: PAL.yellow });
      st.text('zv', FW + 70, 52, '（放大 10 倍）', { size: 11, color: PAL.yellow });
      // features of s10 and s6
      [['f10', x10, 95, PAL.teal, 's₁₀'], ['f6', x6, 165, PAL.teal, 's₆']].forEach(([k, xs, cx, col, lab]) => {
        xs.forEach((v, i) => {
          const bx = cx - 20 + i * 22;
          st.add(k + i, 'rect', { x: bx, y: BASE - fx(v), width: 18, height: fx(v), fill: col, 'fill-opacity': k === 'f10' ? 0.9 : 0.45, rx: 2 });
          st.text(k + 't' + i, bx + 9, BASE - fx(v) - 10, (i === 0 ? 'x₁=' : 'x₂=') + f(v, 1), { size: 10, color: PAL.dim });
        });
        st.text(k + 'l', cx, BASE + 18, lab, { size: 13 });
      });
      // weights
      ['w₁', 'w₂'].forEach((lab, i) => {
        st.add('w' + i, 'rect', { x: 320 + i * 50, y: BASE, width: 30, height: 0, fill: PAL.purple, rx: 2 });
        st.num('wn' + i, 335 + i * 50, BASE - 14, 0, { digits: 3, size: 13, color: PAL.purple, weight: 650 });
        st.text('wl' + i, 335 + i * 50, BASE + 18, lab, { size: 13, color: PAL.purple });
      });
      // predictions
      [['v10', FW + 30, 's₁₀'], ['v6', FW + 110, 's₆']].forEach(([k, x, lab]) => {
        st.add(k, 'rect', { x: x - 18, y: BASE, width: 36, height: 0, fill: PAL.blue, rx: 2 });
        st.num(k + 'n', x, BASE - 14, 0, { digits: 4, size: 13, color: PAL.blue, weight: 650 });
        st.text(k + 'l', x, BASE + 18, lab, { size: 13 });
      });
      st.add('tgt', 'path', { d: util.arrow(FW + 30, BASE - 20, FW + 30, 74, 9), stroke: PAL.red, 'stroke-width': 2.5, fill: 'none', 'stroke-dasharray': '6 4', op: 0 });
      st.tex('tgtl', FW + 30, 70, R`Y=1\ \text{（远在画面外）}`, { w: 150, h: 22, size: 12, color: PAL.pink, op: 0 });
      st.tex('dl', FW - 30, 150, R`\delta=1-0=1`, { w: 110, h: 22, size: 13, color: PAL.red, op: 0 });
      // movers: α δ x(s10) flying from the s10 feature bars onto the weights
      x10.forEach((v, i) => {
        st.add('mv' + i, 'rect', { x: 75 + i * 22, y: BASE - fx(v), width: 18, height: fx(v), fill: PAL.teal, op: 0, rx: 2 });
      });
      st.add('gen', 'path', { d: util.curve(FW + 30, BASE + 34, FW + 110, BASE + 34, -18, 7), stroke: PAL.gold, 'stroke-width': 2, fill: 'none', op: 0 });
      st.text('genl', FW + 70, BASE + 62, '没访问过 s₆，它也变了', { size: 12, color: PAL.gold, op: 0 });

      const T = R`\htmlClass{fx-w}{\mathbf w}\leftarrow\htmlClass{fx-w}{\mathbf w}+\htmlClass{fx-alpha}{\alpha}\,\htmlClass{fx-delta}{\delta}\,\htmlClass{fx-x}{\mathbf x(s)},\qquad \htmlClass{fx-delta}{\delta}=\htmlClass{fx-target}{Y}-\htmlClass{fx-V}{\hat V(s;\mathbf w)}`;
      const frames = [{ cap: '**只更新了一个状态，为什么别的状态也跟着变？** 每个状态不再有自己的格子，而是用两个特征描述（课件 Method 1）：$x_1$ = 到 +1 终点 $s_{11}$ 的曼哈顿距离 ÷5，$x_2$ = 到 −1 终点 $s_7$ 的距离 ÷5。$s_{10}$ 离 $s_{11}$ 1 步、离 $s_7$ 2 步，所以 $\\mathbf x(s_{10})=(\\tfrac15,\\tfrac25)$；$s_6$ 正好反过来。所有状态**共用**同一组权重 $\\mathbf w$。现在 $\\mathbf w=(0,0)$，所有预测都是 0。' }];
      frames.push({ set: { 'tgt.op': 1, 'tgtl.op': 1, 'dl.op': 1 }, dur: 1100, hl: ['target', 'delta'], pulse: ['v10n'],
        cap: '在 $s_{10}$ 选 Right 进入终止格，得 $+1$：target $Y=1$，预测 $\\hat V(s_{10})=0$，误差 $\\delta=1$（红箭头）。' });
      const shrink = i => ({ ['mv' + i + '.op']: 1, ['mv' + i + '.y']: BASE - fx(alpha * delta * x10[i]), ['mv' + i + '.height']: fx(alpha * delta * x10[i]) });
      frames.push({
        set: util.merge(shrink(0), shrink(1), { 'f10t0.op': 0.35, 'f10t1.op': 0.35 }), dur: 1200, hl: ['alpha', 'delta', 'x'], tex: T,
        cap: '梯度就是特征本身：$\\nabla_{\\mathbf w}\\hat V=\\mathbf x(s_{10})=(\\tfrac15,\\tfrac25)$。先把 $s_{10}$ 的特征条乘 $\\alpha\\delta=0.1\\times1$：两根青色条缩成原来的十分之一。'
      });
      const flyTo = i => ({ ['mv' + i + '.x']: 320 + i * 50 + 6, ['mv' + i + '.width']: 18, ['mv' + i + '.y']: BASE - wv(w1[i]), ['mv' + i + '.height']: wv(w1[i]) });
      frames.push({
        set: util.merge(flyTo(0), flyTo(1), { 'mv0.op': 0, 'mv1.op': 0, 'w0.y': BASE - wv(w1[0]), 'w0.height': wv(w1[0]), 'w1.y': BASE - wv(w1[1]), 'w1.height': wv(w1[1]), 'wn0.num': w1[0], 'wn1.num': w1[1], 'wn0.y': BASE - wv(w1[0]) - 14, 'wn1.y': BASE - wv(w1[1]) - 14, 'f10t0.op': 1, 'f10t1.op': 1 }),
        fn: { 'mv0.op': q => Math.min(1, 4 * (1 - q)), 'mv1.op': q => Math.min(1, 4 * (1 - q)) },
        timing: { mv0: [0, 0.75], mv1: [0.1, 0.85], w0: [0.6, 0.95], w1: [0.65, 1], wn0: [0.6, 0.95], wn1: [0.65, 1] },
        dur: 1800, hl: ['w'], pulse: ['w0', 'w1', 'zw'],
        cap: '再加到权重上：$\\mathbf w=(0,0)+(0.02,\\ 0.04)=(' + f(w1[0], 2) + ',\\ ' + f(w1[1], 2) + ')$。权重面板是**放大 10 倍**画的，所以 0.02 和原来 0.2 的特征条一样高。'
      });
      frames.push({
        set: { 'v10.y': BASE - wv(v10), 'v10.height': wv(v10), 'v10n.num': v10, 'v10n.y': BASE - wv(v10) - 14, 'tgt.op': 0.25 },
        dur: 1100, pulse: ['v10'], hl: ['V'],
        cap: '新的预测 $\\hat V(s_{10})=0.02\\times\\tfrac15+0.04\\times\\tfrac25=' + f(v10, 4) + '$（预测面板同样放大 10 倍）。离 target 1 还差得远：一步只挪了 2%。'
      });
      frames.push({
        set: { 'v6.y': BASE - wv(v6), 'v6.height': wv(v6), 'v6n.num': v6, 'v6n.y': BASE - wv(v6) - 14, 'gen.op': 1, 'gen.draw': 1, 'genl.op': 1 },
        dur: 1300, pulse: ['v6'],
        cap: '**关键：** $s_6$ 这次根本没被访问，但它和 $s_{10}$ 共用权重，所以 $\\hat V(s_6)=0.02\\times\\tfrac25+0.04\\times\\tfrac15=' + f(v6, 4) + '$ 也跟着变了。这就是函数近似的**泛化**——也是它可能互相干扰的原因。'
      });
      st.base['gen.draw'] = 0;
      return frames;
    }
  });

  /* ------------------------------------------------------------------ softmax policy gradient step (c27) */
  function softmax(h) { const m = Math.max(...h), e = h.map(x => Math.exp(x - m)), z = e.reduce((a, b) => a + b, 0); return e.map(x => x / z); }
  function pgScene(st, labels, steps, scale) {
    // steps: [{ chosen, G, alpha, cap }]
    const BX = 150, BW = 70, BASE = 190, PY = 322, PW = 460, PX = 200;
    const hb = v => Math.max(-1, Math.min(1, v / scale)) * 90;
    st.add('axis', 'line', { x1: 60, y1: BASE, x2: 360, y2: BASE, stroke: PAL.line, 'stroke-width': 1.5 });
    st.text('ht', 210, 30, '偏好 h(a)', { size: 14, color: PAL.dim });
    st.text('pt', PX + PW / 2, PY - 30, 'softmax 概率 π(a) —— 两段加起来是 1', { size: 13, color: PAL.dim });
    labels.forEach((lab, i) => {
      const x = BX + i * 120;
      st.add('hb' + i, 'rect', { x: x - BW / 2, y: BASE, width: BW, height: 0, fill: PAL.orange, 'fill-opacity': i ? 0.5 : 0.85, rx: 3 });
      st.text('hl' + i, x, 60, lab, { size: 14, weight: 650 });
      st.num('hn' + i, x, 80, 0, { digits: scale > 3 ? 4 : 3, trim: true, size: 13, weight: 650, color: PAL.orange, prefix: 'h = ' });
      st.add('sc' + i, 'path', { d: util.arrow(x + BW / 2 + 16, BASE, x + BW / 2 + 16, BASE - 1, 7), stroke: PAL.red, 'stroke-width': 2.5, fill: 'none', op: 0 });
      st.text('scl' + i, x + BW / 2 + 24, BASE + 16, '', { size: 11, color: PAL.red, anchor: 'start' });
    });
    st.add('pb0', 'rect', { x: PX, y: PY - 12, width: PW / 2, height: 24, fill: PAL.white, 'fill-opacity': 0.75, rx: 3 });
    st.add('pb1', 'rect', { x: PX + PW / 2, y: PY - 12, width: PW / 2, height: 24, fill: PAL.white, 'fill-opacity': 0.35, rx: 3 });
    st.num('pn0', PX + 70, PY + 28, 0.5, { digits: 5, trim: true, size: 13, color: PAL.white, weight: 700, prefix: 'π(' + labels[0] + ') = ' });
    st.num('pn1', PX + PW - 70, PY + 28, 0.5, { digits: 5, trim: true, size: 13, color: PAL.white, weight: 700, prefix: 'π(' + labels[1] + ') = ' });
    st.text('pl0', PX - 26, PY, labels[0], { size: 13 });
    st.text('pl1', PX + PW + 26, PY, labels[1], { size: 13 });
    st.add('pick', 'path', { d: 'M -7 -9 L 7 -9 L 0 0 Z', fill: PAL.white, op: 0, tx: BX, ty: 48 });
    st.text('scleg', 210, BASE + 112, '红箭头 = score 𝟙{b=Aₜ} − π（单独比例，不是偏好的刻度）', { size: 11, color: PAL.dim, op: 0 });
    st.text('note', 560, 120, '', { size: 13, color: PAL.dim });

    let h = [0, 0], frames = [];
    const T = R`\htmlClass{fx-h}{h(s,b)}\leftarrow h(s,b)+\htmlClass{fx-alpha}{\alpha}\,\gamma^t\htmlClass{fx-G}{G_t}\big(\htmlClass{fx-score}{\mathbb 1\{b=A_t\}-\pi(b\mid s)}\big)`;
    frames.push({ cap: steps.intro });
    steps.list.forEach(sp => {
      if (sp.preH) {
        const pp = softmax(sp.preH);
        frames.push({
          set: util.merge(util.each(2, b => ({ ['hb' + b + '.y']: BASE - Math.max(0, hb(sp.preH[b])), ['hb' + b + '.height']: Math.abs(hb(sp.preH[b])), ['hn' + b + '.num']: sp.preH[b], ['sc' + b + '.op']: 0, ['scl' + b + '.op']: 0 })),
            { 'scleg.op': 0, 'pb0.width': PW * pp[0], 'pb1.x': PX + PW * pp[0], 'pb1.width': PW * pp[1], 'pn0.num': pp[0], 'pn1.num': pp[1], 'note.text': sp.preNote || '' }),
          dur: 1000, cap: sp.preCap
        });
        h = sp.preH.slice();
      }
      const p = softmax(h), score = p.map((pi, b) => (b === sp.chosen ? 1 : 0) - pi), dh = score.map(x => sp.alpha * sp.G * x);
      const hn = h.map((x, b) => x + dh[b]), pn = softmax(hn);
      const bx = b => BX + b * 120;
      frames.push({
        set: util.merge({ 'pick.op': 1, 'pick.tx': bx(sp.chosen), 'scleg.op': 1, 'note.text': sp.note || '' },
          util.each(2, b => ({ ['sc' + b + '.op']: 1, ['scl' + b + '.op']: 1, ['sc' + b + '.d']: util.arrow(bx(b) + BW / 2 + 16, BASE - hb(h[b]), bx(b) + BW / 2 + 16, BASE - hb(h[b]) - score[b] * 70, 7), ['scl' + b + '.text']: (score[b] >= 0 ? '+' : '−') + util.fmt(Math.abs(score[b]), 5), ['scl' + b + '.y']: BASE - hb(h[b]) - score[b] * 70 + (score[b] >= 0 ? 6 : -6) }))),
        dur: 1100, hl: ['score', 'G'],
        cap: sp.cap1 || ('选中 ' + labels[sp.chosen] + '，$G=' + sp.G + '$。score $\\mathbb 1\\{b=A_t\\}-\\pi$（就是 $\\partial\\log\\pi(A_t)/\\partial h(b)$，告诉每个偏好该往哪边改）：被选的 $+' + util.fmt(score[sp.chosen], 5) + '$，另一个 $' + util.fmt(score[1 - sp.chosen], 5) + '$——两者相加为 0。')
      });
      frames.push({
        set: util.merge(util.each(2, b => ({ ['hb' + b + '.y']: BASE - Math.max(0, hb(hn[b])), ['hb' + b + '.height']: Math.abs(hb(hn[b])), ['hn' + b + '.num']: hn[b], ['sc' + b + '.op']: 0.25, ['scl' + b + '.op']: 0.25 }))),
        dur: 1100, hl: ['alpha', 'h'], pulse: ['hb0', 'hb1'], tex: T,
        cap: sp.cap2 || ('乘上 $\\alpha G=' + util.fmt(sp.alpha * sp.G, 2) + '$（这一步 $t=0$，$\\gamma^t=1$）加到偏好上：$h=(' + util.fmt(hn[0], 4) + ',\\ ' + util.fmt(hn[1], 4) + ')$。注意改的是**偏好**，不是概率。')
      });
      frames.push({
        set: { 'pb0.width': PW * pn[0], 'pb1.x': PX + PW * pn[0], 'pb1.width': PW * pn[1], 'pn0.num': pn[0], 'pn1.num': pn[1], 'pick.op': 0 },
        dur: 1300, pulse: ['pb' + sp.chosen],
        cap: sp.cap3 || ('再做一次 softmax：$\\pi=(' + util.fmt(pn[0], 5) + ',\\ ' + util.fmt(pn[1], 5) + ')$。概率朝被选动作移动多少，由偏好的差决定。')
      });
      h = hn;
    });
    if (steps.outro) frames.push({ cap: steps.outro });
    return frames;
  }
  RL.scene.register('softmax-pg', {
    title: 'REINFORCE 一步：偏好变，概率跟着变',
    intro: '本章手算的例子：两个动作 Left / Right，$h=[0,0]$，选了 Right，$G_t=1$，$\\alpha=0.1$。拖动 $G$ 看方向怎么反过来。',
    w: 720, h: 372,
    params: [{ key: 'G', label: '回报 G', min: -2, max: 2, step: 0.5, value: 1, format: v => v.toFixed(1) }],
    colors: { h: PAL.orange, alpha: PAL.purple, G: PAL.gold, score: PAL.red },
    build(st, p) {
      return pgScene(st, ['Left', 'Right'], {
        intro: '**这次选 Right 拿到了正回报，policy 该怎么改？** 上面是两个动作的**偏好** $h$（可正可负），下面的长条是 softmax 后的概率。一开始偏好相同，概率各 0.5。',
        list: [{ chosen: 1, G: p.G, alpha: 0.1 }],
        outro: p.G > 0 ? '回报为正：被选的动作变得更可能。$G$ 越大推得越远；$G<0$ 就往反方向推，$G=0$ 不动——这个版本没有减基线（baseline：从回报里统一减掉的参照值），所以回报的大小直接决定步长。'
          : p.G < 0 ? '回报为负：被选的 Right 反而变得**更不可能**，概率流向没被选的 Left。' : '$G=0$：完全不更新。'
      }, 0.3);
    }
  });
  RL.scene.register('softmax-saturate', {
    title: '大回报让 softmax 一步饱和（机器人例子）',
    intro: '课件 W10-2：动作 A 回报 101，B 回报 99，$\\alpha=0.1$，从 $h=[0,0]$ 开始。橙色柱 = 两个动作的偏好 $h$，白色长条 = softmax 概率。',
    w: 720, h: 372,
    colors: { h: PAL.orange, alpha: PAL.purple, G: PAL.gold, score: PAL.red },
    build(st) {
      return pgScene(st, ['A', 'B'], {
        intro: '**两个动作都很好（101 和 99），REINFORCE 能稳稳地学会偏向 A 吗？** 看看不减基线（baseline：从回报里统一减掉的参照值）时会发生什么。',
        list: [
          { chosen: 1, G: 99, alpha: 0.1, note: 'E1：采样到 B', cap2: 'E1 选到 B，$G=99$（一步 episode，$t=0$，$\\gamma^0=1$）：$\\Delta h=0.1\\times99\\times(\\mp0.5)=\\mp4.95$，一步就把偏好推到 $(-4.95,\\ +4.95)$。' },
          { preH: [-4.9969, 4.9969], preNote: 'E2–E100：都采样到 B', preCap: 'E2 到 E100 按 policy 采样，几乎全是 B；每次的 score 只有 $\\pm0.00005$ 左右，偏好只从 $\\pm4.95$ 慢慢漂到 $\\pm4.9969$（课件的数）。', chosen: 0, G: 101, alpha: 0.1, note: 'E101：强制选 A', cap1: 'E101 强制选 A：score 是 $(+0.99995,\\ -0.99995)$——A 的概率太小，所以它的 score 接近 1。', cap2: '$\\Delta h=0.1\\times101\\times(\\pm0.99995)\\approx\\pm10.1$：偏好一下子翻到另一边。' }
        ],
        outro: '一次 B 就让 $\\pi(A)$ 掉到 0.00005，一次 A 又让它跳到 0.99996：**回报的绝对值太大，每一步都把 softmax 推进饱和区**。两个动作明明差不多好，policy 却来回翻。这就是要减去基线（第 30 章）的原因。'
      }, 6);
    }
  });

  /* ------------------------------------------------------------------ UCB bonus shrinking (c14) */
  RL.scene.register('ucb-bonus', {
    title: 'UCB：没把握的选项先加分',
    intro: '本章的算例：$c=1$，$t=100$；A：$Q=0.6,N=80$；B：$Q=0.5,N=5$（另外 15 次拉的是其他机器）。青 = 估计 $Q$，黄框 = 不确定性加分。',
    w: 720, h: 330,
    colors: { Q: PAL.teal, bonus: PAL.yellow, N: PAL.white },
    build(st) {
      const c = 1, QA = 0.6, QB = 0.5, NA = 80, BASE = 270, SC = 150, XA = 240, XB = 480, BW = 90;
      const bonus = (t, n) => c * Math.sqrt(Math.log(t) / n);
      st.add('axis', 'line', { x1: 120, y1: BASE, x2: 600, y2: BASE, stroke: PAL.line, 'stroke-width': 1.5 });
      [['A', XA, QA], ['B', XB, QB]].forEach(([k, x, q]) => {
        st.add('q' + k, 'rect', { x: x - BW / 2, y: BASE - q * SC, width: BW, height: q * SC, fill: PAL.teal, 'fill-opacity': 0.85, rx: 3 });
        st.text('ql' + k, x, BASE - q * SC / 2, 'Q = ' + q, { size: 13, color: '#0f1a18', weight: 700 });
        st.add('b' + k, 'rect', { x: x - BW / 2, y: BASE - q * SC, width: BW, height: 0, fill: PAL.yellow, 'fill-opacity': 0.12, stroke: PAL.yellow, 'stroke-width': 2, 'stroke-dasharray': '5 3', rx: 3 });
        st.num('bn' + k, x + BW / 2 + 40, BASE - q * SC - 10, 0, { digits: 3, size: 13, color: PAL.yellow, prefix: '+', op: 0 });
        st.num('u' + k, x, BASE - q * SC - 16, q, { digits: 3, size: 15, weight: 700, op: 0 });
        st.text('l' + k, x, BASE + 20, '臂 ' + k, { size: 14, weight: 650 });
        st.num('n' + k, x, BASE + 40, k === 'A' ? NA : 5, { digits: 0, size: 12, color: PAL.dim, prefix: 'N = ' });
      });
      st.num('t', 650, 40, 100, { digits: 0, size: 14, color: PAL.dim, prefix: 't = ' });
      st.add('crown', 'path', { d: 'M 0 0 l 8 -10 l 8 10 l 8 -10 l 8 10 z', fill: PAL.yellow, op: 0, tx: XB - 16, ty: 40 });
      const T = R`\text{UCB}(a)=\htmlClass{fx-Q}{Q(a)}+\htmlClass{fx-bonus}{c\sqrt{\frac{\ln t}{\htmlClass{fx-N}{N(a)}}}}`;
      const frames = [{ cap: '**估计值更低的 B，为什么反而值得再试？** 只看估计值，A（0.6）比 B（0.5）好，贪心会一直选 A。但 B 只试过 5 次，它的 0.5 很不可靠。' }];
      const state = (t, nb) => {
        const bA = bonus(t, NA), bB = bonus(t, nb), uA = QA + bA, uB = QB + bB;
        return { set: { 'bA.y': BASE - uA * SC, 'bA.height': bA * SC, 'bB.y': BASE - uB * SC, 'bB.height': bB * SC, 'bnA.num': bA, 'bnB.num': bB, 'bnA.op': 1, 'bnB.op': 1, 'bnA.y': BASE - uA * SC + bA * SC / 2, 'bnB.y': BASE - uB * SC + bB * SC / 2,
          'uA.num': uA, 'uB.num': uB, 'uA.op': 1, 'uB.op': 1, 'uA.y': BASE - uA * SC - 14, 'uB.y': BASE - uB * SC - 14, 'nB.num': nb, 't.num': t, 'crown.op': 1, 'crown.tx': (uB > uA ? XB : XA) - 16, 'crown.ty': BASE - Math.max(uA, uB) * SC - 40 }, uA, uB, bA, bB };
      };
      const s0 = state(100, 5);
      frames.push({ set: s0.set, dur: 1400, hl: ['bonus'], pulse: ['bB'], tex: T,
        cap: '加上不确定性加分 $\\sqrt{\\ln t/N}$：A 试了 80 次，只加 ' + f(s0.bA) + '；B 只试了 5 次，加 ' + f(s0.bB) + '。分数 A $=' + f(s0.uA) + '$，B $=' + f(s0.uB) + '$ → **选 B**。' });
      // keep pulling B (assume its sample mean stays 0.5)
      // keep pulling B (its sample mean stays 0.5): find the first N_B where A's score overtakes B's
      let cross = 6;
      while (QA + bonus(100 + cross - 5, NA) <= QB + bonus(100 + cross - 5, cross)) cross++;
      let t = 100, nb = 5;
      [15, 30, cross].map((n, j, arr) => n - (j ? arr[j - 1] : 5)).forEach((k, i) => {
        t += k; nb += k;
        const s = state(t, nb);
        frames.push({ set: s.set, dur: 1300, pulse: [s.uB > s.uA ? 'bB' : 'bA'], hl: ['N'],
          cap: s.uA > s.uB
            ? '又试了几次之后，B 的加分缩到 ' + f(s.bB) + '，分数 ' + f(s.uB) + ' 终于低于 A 的 ' + f(s.uA) + '：**轮回 A**。A 的加分其实在慢慢涨（$\\ln t$ 在变大），没被选的臂迟早会再被试一次。'
            : '一直选 B（假设它的平均奖励保持 0.5）：$N_B=' + nb + '$，加分缩到 ' + f(s.bB) + '，分数 ' + f(s.uB) + '；A 没被选，$t$ 变大让它的加分略涨到 ' + f(s.bA) + '。' });
      });
      frames.push({ cap: '**面对不确定性保持乐观**：试得少 → 加分大 → 被选 → 加分变小。$\\ln t$ 一直在涨，所以没被选的臂迟早会再被试一次——探索越来越稀疏，但**永远不会完全停止**（差的臂只被试 $O(\\ln t)$ 次）。后面的树搜索（MCTS）会在树的每个节点上重复这条规则。' });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ MCTS four steps (c33) */
  RL.scene.register('mcts-steps', {
    title: 'MCTS 四步：选择、扩展、模拟、回传',
    intro: '本章例子的前 6 次迭代：根 $s_{10}$，$\\gamma=0.9$，UCB 的 $c=\\sqrt2$。每条边上写着 $Q$ / $N$。',
    w: 720, h: 410,
    colors: { Q: PAL.teal, N: PAL.white, G: PAL.gold, r: PAL.yellow, gamma: PAL.green },
    build(st) {
      const gam = 0.9, c = Math.SQRT2;
      const RT = { x: 360, y: 92 };
      const kids = { R: { x: 120, y: 200, name: 's_{11}', term: true }, L: { x: 280, y: 200, name: 's_9' }, U: { x: 440, y: 200, name: 's_{10}' }, D: { x: 600, y: 200, name: 's_6' } };
      const deep = { x: 440, y: 300, name: 's_{10}' };
      const phases = ['① Selection', '② Expansion', '③ Simulation', '④ Backpropagation'];
      phases.forEach((p, i) => st.text('ph' + i, 110 + i * 168, 22, p, { size: 13, color: PAL.dim, weight: 650 }));
      st.text('iter', 650, 52, '', { size: 13, color: PAL.dim });
      st.add('hlpath', 'path', { d: 'M 0 0 L 0 0', stroke: PAL.blue, 'stroke-width': 6, 'stroke-opacity': 0.3, fill: 'none', op: 0 }); // behind the nodes
      st.add('root', 'circle', { cx: RT.x, cy: RT.y, r: 22, fill: PAL.panel, stroke: PAL.blue, 'stroke-width': 2.5 });
      st.tex('rootl', RT.x, RT.y, 's_{10}', { w: 50, h: 24, size: 15 });
      st.num('rootn', RT.x + 40, RT.y - 18, 0, { digits: 0, size: 12, color: PAL.dim, prefix: 'N=' });
      Object.entries(kids).forEach(([a, k]) => {
        st.add('e' + a, 'line', { x1: RT.x, y1: RT.y + 22, x2: RT.x, y2: RT.y + 22, stroke: PAL.line, 'stroke-width': 2.5 });
        st.add('k' + a, 'circle', { cx: k.x, cy: k.y, r: 0, fill: k.term ? '#22301f' : PAL.panel, stroke: k.term ? PAL.green : PAL.blue, 'stroke-width': 2 });
        st.tex('kl' + a, k.x, k.y, k.name, { w: 50, h: 24, size: 14, op: 0 });
        const mx = (RT.x + k.x) / 2, my = (RT.y + k.y) / 2;
        st.text('ea' + a, mx + (k.x < RT.x ? -26 : 26), my - 6, { R: 'Right', L: 'Left', U: 'Up', D: 'Down' }[a], { size: 12, color: PAL.orange, op: 0 });
        st.text('eq' + a, mx + (k.x < RT.x ? -26 : 26), my + 10, '', { size: 12, color: PAL.teal, op: 0, weight: 650 });
        st.text('ucb' + a, k.x, k.y + 40, '', { size: 12, color: PAL.yellow, op: 0 });
      });
      st.add('eDeep', 'line', { x1: kids.U.x, y1: kids.U.y + 22, x2: kids.U.x, y2: kids.U.y + 22, stroke: PAL.line, 'stroke-width': 2.5 });
      st.add('kDeep', 'circle', { cx: deep.x, cy: deep.y, r: 0, fill: PAL.panel, stroke: PAL.blue, 'stroke-width': 2 });
      st.tex('klDeep', deep.x, deep.y, deep.name, { w: 50, h: 24, size: 14, op: 0 });
      st.text('eqDeep', deep.x + 40, (kids.U.y + deep.y) / 2 + 8, '', { size: 12, color: PAL.teal, op: 0, weight: 650 });
      st.text('eaDeep', deep.x + 40, (kids.U.y + deep.y) / 2 - 8, 'Right', { size: 12, color: PAL.orange, op: 0 });
      // rollout path (re-used): up to 3 dotted hops drawn to the lower area
      for (let i = 0; i < 3; i++) {
        st.add('ro' + i, 'circle', { cx: 0, cy: 0, r: 16, fill: 'none', stroke: PAL.orange, 'stroke-width': 1.5, 'stroke-dasharray': '3 3', op: 0 });
        st.tex('rol' + i, 0, 0, 's', { w: 40, h: 20, size: 13, op: 0 });
        st.add('roe' + i, 'path', { d: util.arrow(0, 0, 1, 0, 6), stroke: PAL.orange, 'stroke-width': 1.5, fill: 'none', 'stroke-dasharray': '4 3', op: 0 });
      }
      st.text('gtxt', 360, 394, '', { size: 14, color: PAL.gold, weight: 650 });

      const Q = {}, N = {}; let Nroot = 0;
      const frames = [];
      const phaseSet = k => util.each(4, i => ({ ['ph' + i + '.fill']: i === k ? PAL.yellow : PAL.dim }));
      const edgeLine = a => ({ ['e' + a + '.x2']: kids[a].x, ['e' + a + '.y2']: kids[a].y - 22, ['k' + a + '.r']: 22, ['kl' + a + '.op']: 1, ['ea' + a + '.op']: 1 });
      const qLabel = a => ({ ['eq' + a + '.text']: util.fmt(Q[a], 3).replace(/\.?0+$/, '') + ' / ' + N[a], ['eq' + a + '.op']: 1 });
      const hideRoll = util.each(3, i => ({ ['ro' + i + '.op']: 0, ['rol' + i + '.op']: 0, ['roe' + i + '.op']: 0 }));
      const roll = (from, path) => { // path: [{name, r}] ; drawn below-right of `from`
        const out = {}; let px = from.x, py = from.y;
        path.forEach((p, i) => { const nx = from.x + (i + 1) * 0 + (i - (path.length - 1) / 2) * 70, ny = from.y + 95;
          const x = Math.max(40, Math.min(680, nx)), y = Math.min(ny, 350);
          Object.assign(out, { ['ro' + i + '.op']: 1, ['ro' + i + '.cx']: x, ['ro' + i + '.cy']: y, ['rol' + i + '.op']: 1, ['rol' + i + '.x']: x - 20, ['rol' + i + '.y']: y - 10, ['rol' + i + '.tex']: p.name, ['roe' + i + '.op']: 1, ['roe' + i + '.d']: util.arrow(px, py + 16, x, y - 14, 6) });
          px = x; py = y; });
        return out;
      };
      const UCBT = R`\text{UCB}(s,a)=\htmlClass{fx-Q}{Q(s,a)}+c\sqrt{\frac{\ln N(s)}{\htmlClass{fx-N}{N(s,a)}}}`;
      frames.push({ cap: '**只有一个模拟器，怎样边试边把搜索集中到好的分支上？** 一开始树里只有根 $s_{10}$。每次迭代都走四步：**选择**（沿树往下）→ **扩展**（加一个新节点）→ **模拟**（从新节点随机走到结束）→ **回传**（把回报加回路径上的每条边）。' });
      // iterations 1-4: root has untried actions -> expand directly
      const its = [
        { a: 'R', r: 1, G: 0, path: [], gtxt: '终止状态，不用模拟：G = 0', cap: '**迭代 1**：根还有没试过的动作，直接扩展。试 Right：按意图进入 $s_{11}$，$r=+1$，而且是终止状态，所以不用模拟（$G=0$）。' },
        { a: 'L', r: 0, G: -0.81, path: [{ name: 's_{10}' }, { name: 's_6' }, { name: 's_7' }], gtxt: 'G = 0 + 0.9×0 + 0.81×(−1) = −0.81', cap: '**迭代 2**：根还有没试过的动作，试 Left，到达 $s_9$（$r=0$），把 $s_9$ 加进树。', capR: '从 $s_9$ 随机模拟到结束：$s_{10}$、向南打滑到 $s_6$、再掉进 $s_7$（$-1$），$G=0.81\\times(-1)=-0.81$。模拟走过的状态**不加进树里**（橙色虚线），只用来估计 $s_9$ 值多少。' },
        { a: 'U', r: 0, G: 1, path: [{ name: 's_{11}' }], gtxt: 'G = 1', cap: '**迭代 3**：试 Up，撞边界留在 $s_{10}$——这也是一个新节点（深度 1 的 $s_{10}$）。', capR: '从深度 1 的 $s_{10}$ 模拟：一步进 $s_{11}$，$G=1$。' },
        { a: 'D', r: 0, G: -1, path: [{ name: 's_7' }], gtxt: 'G = −1', cap: '**迭代 4**：试 Down，到达 $s_6$。', capR: '从 $s_6$ 模拟：掉进 $s_7$，$G=-1$。' }
      ];
      its.forEach((it, n) => {
        const ret = it.r + gam * it.G;
        frames.push({ set: util.merge(phaseSet(1), edgeLine(it.a), hideRoll, { 'iter.text': '迭代 ' + (n + 1), 'gtxt.text': '' }), dur: 1000, pulse: ['k' + it.a], cap: it.cap });
        if (it.path.length) frames.push({ set: util.merge(phaseSet(2), roll(kids[it.a], it.path), { 'gtxt.text': it.gtxt }), timing: util.each(3, i => ({ ['ro' + i]: [i * 0.25, i * 0.25 + 0.3], ['roe' + i]: [i * 0.25, i * 0.25 + 0.3], ['rol' + i]: [i * 0.25, i * 0.25 + 0.3] })), dur: 1300, hl: ['G'], cap: it.capR });
        Q[it.a] = ret; N[it.a] = 1; Nroot += 1;
        frames.push({ set: util.merge(phaseSet(3), hideRoll, qLabel(it.a), { 'rootn.num': Nroot, 'gtxt.text': 'R = r + γG = ' + it.r + ' + 0.9 × ' + util.fmt(it.G, 2).replace(/\.?0+$/, '') + ' = ' + util.fmt(ret, 3).replace(/\.?0+$/, '') }), dur: 1000, pulse: ['eq' + it.a], hl: ['r', 'gamma', 'G'],
          cap: '回传：这条边得到 $R=r+\\gamma G=' + util.fmt(ret, 3).replace(/\.?0+$/, '') + '$，$Q=' + util.fmt(ret, 3).replace(/\.?0+$/, '') + '$，$N=1$。' });
      });
      // iteration 5: all tried -> UCB
      const ucb = a => Q[a] + c * Math.sqrt(Math.log(Nroot) / N[a]);
      const ucbSet = () => util.each(4, i => { const a = 'RLUD'[i]; return { ['ucb' + a + '.text']: 'UCB ' + util.fmt(ucb(a), 4), ['ucb' + a + '.op']: 1 }; });
      const best = () => 'RLUD'.split('').reduce((b, a) => ucb(a) > ucb(b) ? a : b, 'R');
      let b5 = best();
      frames.push({ set: util.merge(phaseSet(0), ucbSet(), { 'iter.text': '迭代 5', 'gtxt.text': 'ln N(s₁₀) = ln 4 = 1.386，每个动作加分 √2·√(1.386/1) = 1.665' }, { 'hlpath.op': 1, 'hlpath.d': 'M ' + RT.x + ' ' + RT.y + ' L ' + kids[b5].x + ' ' + kids[b5].y }),
        dur: 1200, pulse: ['ucb' + b5], tex: UCBT, cap: '**迭代 5**：四个动作都试过了，开始用 UCB **选择**。它和 bandit 的 UCB 是同一个式子，只是把总次数 $t$ 换成这个节点的访问次数 $N(s)$。加分都一样（都只试过 1 次），所以 Q 最大的 Right 胜出（UCB ' + util.fmt(ucb(b5), 4) + '）。' });
      Q.R = Q.R + (1 - Q.R) / 2; N.R = 2; Nroot += 1;
      frames.push({ set: util.merge(phaseSet(3), qLabel('R'), { 'rootn.num': Nroot, 'gtxt.text': '到达已在树里的终止节点：R = 1，Q = 1 + (1 − 1)/2 = 1' }), dur: 1000, pulse: ['eqR'],
        cap: 'Right 又进入 $s_{11}$：这个子节点已经在树里而且是终止状态，所以没有扩展、没有模拟，直接回传 $R=1$：$Q=1$，$N=2$。' });
      // iteration 6
      const b6 = best();
      frames.push({ set: util.merge(phaseSet(0), ucbSet(), { 'iter.text': '迭代 6', 'gtxt.text': 'ln 5 = 1.609：Right 试了 2 次，加分变小', 'hlpath.d': 'M ' + RT.x + ' ' + RT.y + ' L ' + kids[b6].x + ' ' + kids[b6].y }), dur: 1200, pulse: ['ucb' + b6],
        cap: '**迭代 6**：Right 已经试了 2 次，加分缩小；Up 只试过 1 次。UCB：Right ' + util.fmt(ucb('R'), 4) + '，**Up ' + util.fmt(ucb('U'), 4) + '** → 这次选 Up，尽管它的 $Q$ 更低。' });
      frames.push({ set: util.merge(phaseSet(1), { 'eDeep.x2': deep.x, 'eDeep.y2': deep.y - 22, 'kDeep.r': 22, 'klDeep.op': 1, 'eaDeep.op': 1, 'gtxt.text': '', 'hlpath.d': 'M ' + RT.x + ' ' + RT.y + ' L ' + kids.U.x + ' ' + kids.U.y + ' L ' + deep.x + ' ' + deep.y }, util.each(4, i => ({ ['ucb' + 'RLUD'[i] + '.op']: 0 }))), dur: 1100, pulse: ['kDeep'],
        cap: 'Up 又撞墙回到 $s_{10}$，这个节点已经在树里，继续往下；它的动作都没试过，于是**扩展**：试 Right，向北打滑撞墙，又留在 $s_{10}$——新建深度 2 的 $s_{10}$ 节点。同一个状态在树里出现了三次。' });
      frames.push({ set: util.merge(phaseSet(2), roll(deep, [{ name: 's_{11}' }]), { 'gtxt.text': 'G = 1' }), dur: 1000, hl: ['G'], cap: '从深度 2 的 $s_{10}$ 模拟：一步进 $s_{11}$，$G=1$。' });
      const rDeep = 0 + gam * 1, rUp = 0 + gam * rDeep;
      Q.U = Q.U + (rUp - Q.U) / 2; N.U = 2; Nroot += 1;
      frames.push({ set: util.merge(phaseSet(3), hideRoll, qLabel('U'), { 'eqDeep.text': util.fmt(rDeep, 3).replace(/\.?0+$/, '') + ' / 1', 'eqDeep.op': 1, 'rootn.num': Nroot, 'gtxt.text': '下层 R = 0.9 × 1 = 0.9；上层 R = 0.9 × 0.9 = 0.81，Q = 0.9 + (0.81 − 0.9)/2 = ' + util.fmt(Q.U, 3) }),
        timing: { eqDeep: [0, 0.4], eqU: [0.5, 1], rootn: [0.6, 1] }, dur: 1600, pulse: ['eqDeep', 'eqU'], hl: ['gamma'],
        cap: '**回传从下往上**，每往上一层多乘一次 $\\gamma$：下层边 $R=0.9$；根的 Up 边 $R=0.81$，增量平均得 $Q=0.9+(0.81-0.9)/2=' + util.fmt(Q.U, 3) + '$，$N=2$。' });
      frames.push({ set: util.merge(phaseSet(-1), { 'hlpath.op': 0, 'gtxt.text': '' }), cap: '6 次迭代后：看起来好的分支被反复访问（Right、Up 各 2 次，Up 下面还长出了一层）；差的分支（Left、Down）只试过一次。迭代越多，树就越往好的方向长深。真正执行时，选根上 $Q$ 最大（或访问最多）的动作。' });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ process strips */
  RL.scene.setStages('linear-update', ['共用一组权重', '误差 $\\delta$', '$\\mathbf w$ 沿 $\\mathbf x$ 方向改', '$s_{10}$ 变了', '$s_6$ 也变了'], [0, 1, 2, 2, 3, 4]);
  RL.scene.setStages('softmax-pg', ['偏好与概率', 'score $\\mathbb 1\\{b=A_t\\}-\\pi$', '改偏好 $h$', '重新 softmax', '结论'], [0, 1, 2, 3, 4]);
  RL.scene.setStages('softmax-saturate', ['开始', 'E1：选到 B', 'E2–E100', 'E101：强制选 A', '结论'], [0, 1, 1, 1, 2, 3, 3, 3, 4]);
  RL.scene.setStages('ucb-bonus', ['只看估计值', '加上不确定性加分', '反复试 B', '轮到 A', '结论'], [0, 1, 2, 2, 3, 4]);
  RL.scene.setStages('mcts-steps', ['迭代 1–4：每个动作先试一次', '迭代 5：开始用 UCB 选', '迭代 6：树往深处长', '结论'], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 2, 3]);
  RL.scene.setAha('linear-update', [5]);
  RL.scene.setAha('softmax-pg', [3]);
  RL.scene.setAha('softmax-saturate', [-1]);
  RL.scene.setAha('ucb-bonus', [1, 4]);
  RL.scene.setAha('mcts-steps', [14, 17]);
})(window);
