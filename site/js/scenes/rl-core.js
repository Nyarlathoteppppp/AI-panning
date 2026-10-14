/* 3B1B-style scenes for the core RL chapters (W6–W8). See js/ui/scene.js for the frame format. */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { PAL, util } = RL.scene;
  const R = String.raw;
  const f2 = (x, d) => util.fmt(x, d == null ? 4 : d).replace(/\.?0+$/, '') || '0';

  /* ------------------------------------------------------------------ return computed backwards (c05) */
  RL.scene.register('return-backward', {
    title: '回报 G 为什么要倒着算',
    intro: '课件 Episode 1：5 步，只有最后一步拿到奖励 1。黄色 = 奖励 $R$，金色 = 回报 $G$，绿色 = 折扣 $\\gamma$。',
    w: 720, h: 330,
    params: [{ key: 'gamma', label: '折扣 γ', min: 0, max: 1, step: 0.05, value: 0.9, format: v => v.toFixed(2) }],
    colors: { G: PAL.gold, Gn: PAL.gold, r: PAL.yellow, gamma: PAL.green },
    build(st, p) {
      const g = p.gamma, rewards = [0, 0, 0, 0, 1], names = ['s_1', 's_5', 's_8', 's_9', 's_{10}', 's_{11}'];
      const X = i => 70 + i * 116, YS = 82, YG = 212;
      // G_t from the back: G_5 = 0, G_t = R_{t+1} + γ G_{t+1}
      const G = [0, 0, 0, 0, 0, 0];
      for (let t = 4; t >= 0; t--) G[t] = rewards[t] + g * G[t + 1];

      // trajectory
      for (let i = 0; i < 5; i++) {
        st.add('arr' + i, 'path', { d: util.arrow(X(i) + 26, YS, X(i + 1) - 28, YS, 8), stroke: PAL.line, 'stroke-width': 2, fill: 'none' });
        st.tex('rw' + i, (X(i) + X(i + 1)) / 2, YS - 26, R`R_{${i + 1}}=${rewards[i]}`, { w: 90, h: 26, size: 15, color: PAL.yellow });
      }
      for (let i = 0; i < 6; i++) {
        const term = i === 5;
        st.add('node' + i, 'circle', { cx: X(i), cy: YS, r: 22, fill: term ? '#22301f' : PAL.panel, stroke: term ? PAL.green : PAL.blue, 'stroke-width': 2 });
        st.tex('nl' + i, X(i), YS, names[i], { w: 50, h: 26, size: 16 });
        st.text('tl' + i, X(i), YS + 38, term ? '终止' : 't = ' + i, { size: 12, color: PAL.dim });
        // G boxes
        st.add('gb' + i, 'rect', { x: X(i) - 40, y: YG - 20, width: 80, height: 40, rx: 8, fill: PAL.panel, stroke: PAL.gold, 'stroke-width': term ? 1 : 1.6, op: term ? 0.5 : 1 });
        st.tex('gn' + i, X(i), YG - 34, 'G_{' + i + '}', { w: 50, h: 22, size: 14, color: PAL.gold });
        st.text('gq' + i, X(i), YG, term ? '0' : '?', { size: 18, color: term ? PAL.dim : PAL.dim });
        if (!term) st.num('gv' + i, X(i), YG, 0, { digits: 4, trim: true, size: 18, color: PAL.gold, op: 0, weight: 650 });
        // how many reward terms the forward definition needs for G_i (shown in the 'repetition' beat)
        if (!term) st.text('terms' + i, X(i), YG + 32, (5 - i) + ' 项', { size: 13, color: PAL.yellow, op: 0 });
      }
      // discount intuition: the final reward travelling back to t = 0
      const YB = YS - 54;
      st.group('ball', { op: 0, tx: (X(4) + X(5)) / 2, ty: YS - 26 });
      st.add('ballc', 'circle', { cx: 0, cy: 0, r: 15, fill: PAL.yellow, 'fill-opacity': 0.9 }, 'ball');
      st.num('balln', 0, 1, 1, { digits: 2, size: 12, color: '#1a1a1a', weight: 700, parent: 'ball' });
      for (let i = 0; i < 4; i++) st.tex('xg' + i, (X(i) + X(i + 1)) / 2, YS + 26, R`\times\gamma`, { w: 50, h: 22, size: 13, color: PAL.green, op: 0 });
      // movers for the backward pass: a copy of G_{t+1} shrinking by γ, and the reward dropping in
      for (let t = 0; t < 5; t++) {
        st.group('mv' + t, { op: 0, tx: X(t + 1), ty: YG, sc: 1 });
        st.add('mvr' + t, 'rect', { x: -34, y: -15, width: 68, height: 30, rx: 7, fill: 'none', stroke: PAL.gold, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, 'mv' + t);
        st.num('mvn' + t, 0, 1, G[t + 1], { digits: 4, trim: true, size: 14, color: PAL.gold, parent: 'mv' + t });
        st.group('rd' + t, { op: 0, tx: (X(t) + X(t + 1)) / 2, ty: YS - 26 });
        st.add('rdc' + t, 'circle', { cx: 0, cy: 0, r: 11, fill: PAL.yellow }, 'rd' + t);
        st.text('rdt' + t, 0, 1, String(rewards[t]), { size: 12, color: '#1a1a1a', weight: 700, parent: 'rd' + t });
      }
      st.text('note', 360, 300, '', { size: 14, color: PAL.dim });

      const frames = [];
      frames.push({
        cap: '**为什么回报 $G_t$ 要从后往前算？** 这条 episode 走了 5 步：$R_1$ 到 $R_4$ 都是 0，最后进入 $s_{11}$ 拿到 $R_5=1$。每个时刻的 $G_t$ 是多少？',
        tex: R`\htmlClass{fx-G}{G_t}=\htmlClass{fx-r}{R_{t+1}}+\htmlClass{fx-gamma}{\gamma}\htmlClass{fx-r}{R_{t+2}}+\htmlClass{fx-gamma}{\gamma}^2\htmlClass{fx-r}{R_{t+3}}+\cdots`
      });
      // the reward ball travels back to t = 0, shrinking by γ at every hop
      frames.push({
        // the reward belongs to t = 4; then it hops back to t = 0, and every landing multiplies it by γ
        set: util.merge({ 'ball.op': 1, 'ball.tx': X(0), 'ball.ty': YB, 'ball.sc': Math.max(0.3, Math.pow(g, 4)), 'balln.num': Math.pow(g, 4) },
          util.each(4, i => ({ ['xg' + i + '.op']: 1 }))),
        fn: (() => {
          const u = q => Math.max(0, (q - 0.12) / 0.88), hops = q => Math.min(4, Math.floor(4 * u(q) + 1e-6));
          return {
            'ball.tx': q => q < 0.12 ? (X(4) + X(5)) / 2 + (X(4) - (X(4) + X(5)) / 2) * (q / 0.12) : X(4) - (X(4) - X(0)) * u(q),
            'ball.ty': q => q < 0.12 ? (YS - 26) + (YB - YS + 26) * (q / 0.12) : YB - 24 * Math.abs(Math.sin(Math.PI * 4 * u(q))),
            'ball.sc': q => Math.max(0.3, Math.pow(g, hops(q))),
            'balln.num': q => Math.pow(g, hops(q))
          };
        })(),
        timing: Object.assign({ 'ball.op': [0, 0.06] }, util.each(4, j => ({ ['xg' + (3 - j)]: [0.12 + j * 0.22, 0.22 + j * 0.22] }))),
        dur: 3600,
        cap: '先看定义：奖励 1 是在 $t=4$ 这一步拿到的，算进 $G_4$ 时不打折。站在更早的时刻回头看，它每往前退一步就**乘一次 $\\gamma$**，退到 $t=0$ 只剩 $\\gamma^4=' + f2(Math.pow(g, 4)) + '$。越远的奖励，打的折越多。',
        hl: ['gamma']
      });
      frames.push({
        set: util.merge({ 'ball.op': 0, 'note.text': '正着算一共要加 5 + 4 + 3 + 2 + 1 = 15 项' }, util.each(4, i => ({ ['xg' + i + '.op']: 0 })), util.each(5, i => ({ ['terms' + i + '.op']: 1 }))),
        timing: util.each(5, i => ({ ['terms' + i]: [0.1 + i * 0.12, 0.35 + i * 0.12] })),
        cap: '如果对每个 $t$ 都按定义正着算，$G_0$ 要加 5 项、$G_1$ 加 4 项……后面的奖励被**重复**乘、重复加。倒着算可以把已经算好的部分直接拿来用。',
        tex: R`\htmlClass{fx-G}{G_t}=\htmlClass{fx-r}{R_{t+1}}+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Gn}{G_{t+1}},\qquad G_5=0`,
        hl: ['Gn']
      });
      for (let t = 4; t >= 0; t--) {
        const set = { ['mv' + t + '.tx']: X(t), ['mv' + t + '.sc']: Math.max(0.35, g), ['mvn' + t + '.num']: g * G[t + 1], ['rd' + t + '.tx']: X(t) + 30, ['rd' + t + '.ty']: YG - 6,
          ['gq' + t + '.op']: 0, ['gv' + t + '.op']: 1, ['gv' + t + '.num']: G[t], 'note.text': '' };
        if (t === 4) Object.assign(set, util.each(5, i => ({ ['terms' + i + '.op']: 0 })));
        frames.push({
          set,
          timing: { ['mv' + t + '.tx']: [0.05, 0.6], ['mv' + t + '.sc']: [0.05, 0.6], ['mvn' + t]: [0.15, 0.6], ['mv' + t + '.op']: [0, 0.8], ['rd' + t + '.tx']: [0.15, 0.6], ['rd' + t + '.ty']: [0.15, 0.6], ['rd' + t + '.op']: [0.1, 0.8], ['gq' + t]: [0.6, 0.75], ['gv' + t]: [0.65, 1], ['terms0']: [0, 0.2], ['terms1']: [0, 0.2], ['terms2']: [0, 0.2], ['terms3']: [0, 0.2], ['terms4']: [0, 0.2] },
          fn: { ['mv' + t + '.op']: q => Math.min(1, 6 * q, 4 * (1 - q)), ['rd' + t + '.op']: q => Math.min(1, 6 * q, 4 * (1 - q)) },
          dur: 1500,
          pulse: ['gb' + t],
          cap: t === 4
            ? '从最后一步开始：终止之后没有奖励，$G_5=0$。所以 $G_4=R_5+\\gamma\\cdot0=' + f2(G[4]) + '$——奖励直接落进盒子。'
            : '把右边刚算好的 $G_{' + (t + 1) + '}=' + f2(G[t + 1]) + '$ **整个搬过来，缩成 $\\gamma$ 倍**，再加上这一步的奖励 $R_{' + (t + 1) + '}=' + rewards[t] + '$：只做一次乘法、一次加法。',
          tex: R`\htmlClass{fx-G}{G_{${t}}}=\htmlClass{fx-r}{R_{${t + 1}}}+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Gn}{G_{${t + 1}}}=${rewards[t]}+${f2(g, 2)}\times${f2(G[t + 1])}=${f2(G[t])}`,
          hl: t === 4 ? ['r'] : ['gamma', 'Gn']
        });
      }
      frames.push({
        set: { 'note.text': '倒着算：5 个时刻，每个只做一次“乘 γ 再加 r”' },
        cap: '结果：$G_0=' + f2(G[0]) + '$，正好等于定义里的 $\\gamma^4\\times1$。**倒着算 = 把后面的回报当成一个整体，往前搬一步就乘一次 $\\gamma$。** 拖动下面的 γ 看看：γ 越小，金色数字往左缩得越快。',
        tex: R`\htmlClass{fx-G}{G_t}=\htmlClass{fx-r}{R_{t+1}}+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Gn}{G_{t+1}}`,
        hl: ['G']
      });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ Bellman backup tree at s10 (c07) */
  RL.scene.register('bellman-backup', {
    title: 'Bellman 备份：从叶子往上算',
    intro: '课件 W6-2 的第二次 Bellman 备份：在 $s_{10}$ 用第一轮的价值表 $V_1$（只有 $V_1(s_{10})=0.8$ 不为 0）。蓝 = $V$，青 = $Q$，黄 = 奖励 $r$，绿 = $\\gamma$。',
    w: 720, h: 390,
    colors: { V: PAL.blue, Vn: PAL.blue, Q: PAL.teal, r: PAL.yellow, gamma: PAL.green, p: PAL.white, pi: PAL.orange },
    build(st) {
      const g = RL.mdp.courseGrid(), dp = RL.dp, gamma = g.gamma;
      const V1 = dp.valueIterationSweep(g, dp.zeros(g)).V;
      const acts = ['N', 'E', 'S', 'W'], AX = [150, 305, 460, 615], YR = 46, YA = 150, YL = 268;
      const leaves = acts.map(a => g.branches(10, a).map(b => ({ next: b.next, p: b.prob, r: b.reward, v: g.isTerminal(b.next) ? 0 : V1[b.next] })));
      leaves.forEach(L => L.forEach(l => { l.val = l.r + gamma * l.v; }));
      const Q = leaves.map(L => L.reduce((t, l) => t + l.p * l.val, 0));
      const best = Q.indexOf(Math.max(...Q)), avg = Q.reduce((a, b) => a + b, 0) / 4;
      const f3 = x => util.fmt(x, 3), LX = (ai, j) => AX[ai] + (j - 1) * 52;

      // edges
      acts.forEach((a, ai) => {
        st.add('ea' + ai, 'line', { x1: 382, y1: YR + 22, x2: AX[ai], y2: YA - 16, stroke: PAL.line, 'stroke-width': 2 });
        leaves[ai].forEach((l, j) => {
          st.add('el' + ai + j, 'line', { x1: AX[ai], y1: YA + 16, x2: LX(ai, j), y2: YL - 18, stroke: PAL.line, 'stroke-width': 1.5 });
          st.text('ep' + ai + j, (AX[ai] + LX(ai, j)) / 2 + (j - 1) * 9, (YA + YL) / 2 - 4, String(Math.round(l.p * 10) / 10), { size: 11, color: PAL.dim });
        });
      });
      // root and action nodes
      st.add('root', 'circle', { cx: 382, cy: YR, r: 22, fill: PAL.panel, stroke: PAL.blue, 'stroke-width': 2.5 });
      st.tex('rootl', 382, YR, 's_{10}', { w: 50, h: 24, size: 16 });
      st.num('rootv', 442, YR, V1[10], { digits: 3, size: 17, color: PAL.blue, weight: 650 });
      st.tex('rootvl', 520, YR, R`=V_1(s_{10})`, { w: 140, h: 24, size: 14, color: PAL.blue, op: 0.8 });
      acts.forEach((a, ai) => {
        st.add('an' + ai, 'rect', { x: AX[ai] - 18, y: YA - 16, width: 36, height: 32, rx: 6, fill: PAL.panel, stroke: PAL.teal, 'stroke-width': 2 });
        st.text('al' + ai, AX[ai], YA, a, { size: 15, weight: 650 });
        st.num('aq' + ai, AX[ai] + 44, YA, Q[ai], { digits: 3, size: 15, color: PAL.teal, op: 0, weight: 650 });
        leaves[ai].forEach((l, j) => {
          const term = g.isTerminal(l.next);
          st.add('lc' + ai + j, 'circle', { cx: LX(ai, j), cy: YL, r: 17, fill: term ? (l.r > 0 ? '#22301f' : '#3a1f22') : PAL.panel, stroke: term ? (l.r > 0 ? PAL.green : PAL.red) : PAL.blue, 'stroke-width': 1.6 });
          st.tex('ll' + ai + j, LX(ai, j), YL, 's_{' + l.next + '}', { w: 40, h: 22, size: 12 });
          st.tex('lr' + ai + j, LX(ai, j), YL + 30, R`\color{#F4D345}{${l.r}}`, { w: 46, h: 18, size: 11 });
          st.tex('lv' + ai + j, LX(ai, j), YL + 47, R`\color{#58C4DD}{${f3(l.v)}}`, { w: 46, h: 18, size: 11 });
          st.num('lt' + ai + j, LX(ai, j), YL + 70, l.val, { digits: 3, size: 13, color: PAL.white, op: 0, weight: 650 });
          // mover: leaf value weighted by p flies to the action node
          st.group('mv' + ai + j, { op: 0, tx: LX(ai, j), ty: YL + 70, sc: 1 });
          st.num('mvn' + ai + j, 0, 0, l.p * l.val, { digits: 3, size: 13, color: PAL.teal, weight: 650, parent: 'mv' + ai + j });
        });
      });
      st.text('leg1', 10, YL + 30, 'r', { size: 11, color: PAL.yellow, anchor: 'start' });
      st.text('leg2', 10, YL + 47, 'V₁(s′)', { size: 11, color: PAL.blue, anchor: 'start' });
      st.text('leg3', 10, YL + 70, 'r+γV₁(s′)', { size: 11, color: PAL.white, anchor: 'start', op: 0 });

      const fade = q => Math.min(1, 4 * q, 4 * (1 - q));
      const qTex = ai => leaves[ai].map(l => f3(l.p) .replace(/0+$/, '').replace(/\.$/, '') + R`\times` + f3(l.val)).join('+');
      const frames = [];
      const T = R`\htmlClass{fx-V}{V_2(s)}=\max_a\sum_{s'}\htmlClass{fx-p}{p(s'\mid s,a)}\big[\htmlClass{fx-r}{r}+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Vn}{V_1(s')}\big]`;
      frames.push({ cap: '**$s_{10}$ 的价值，怎么用周围格子的价值算出来？** 把这一步摊开成一棵小树：根是 $s_{10}$，下面 4 个动作，每个动作分出 3 个可能结果（0.8 按意图、0.1 / 0.1 打滑）。叶子下面是这一步的奖励 $r$ 和下一状态现在的估计 $V_1(s\')$。' });
      frames.push({
        set: util.merge({ 'leg3.op': 1 }, util.each(4, ai => util.each(3, j => ({ ['lt' + ai + j + '.op']: 1 })))),
        timing: util.each(12, k => ({ ['lt' + Math.floor(k / 3) + (k % 3)]: [k * 0.06, k * 0.06 + 0.3] })),
        dur: 1400, hl: ['r', 'gamma', 'Vn'], tex: R`\htmlClass{fx-r}{r}+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Vn}{V(s')}`,
        cap: '**先在每片叶子上算** $r+\\gamma V_1(s\')$：比如进入 $s_{11}$ 得 $1+0.9\\times0=1$；撞墙留在 $s_{10}$ 得 $0+0.9\\times0.8=0.72$；其余都是 0。'
      });
      frames.push({
        set: util.merge(util.each(3, j => ({ ['mv1' + j + '.tx']: AX[1] + 44, ['mv1' + j + '.ty']: YA, ['mv1' + j + '.sc']: 0.6 })), { 'aq1.op': 1 }),
        fn: util.each(3, j => ({ ['mv1' + j + '.op']: fade })),
        timing: util.merge(util.each(3, j => ({ ['mv1' + j + '.op']: [j * 0.1, 0.75 + j * 0.08], ['mv1' + j + '.tx']: [j * 0.1, 0.65 + j * 0.1], ['mv1' + j + '.ty']: [j * 0.1, 0.65 + j * 0.1], ['mv1' + j + '.sc']: [j * 0.1, 0.65 + j * 0.1] })), { 'aq1': [0.75, 1] }),
        dur: 1800, pulse: ['an1'], hl: ['p', 'Q'], tex: R`\htmlClass{fx-Q}{Q(s,a)}=\sum_{s'}\htmlClass{fx-p}{p(s'\mid s,a)}\big[\htmlClass{fx-r}{r}+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Vn}{V_1(s')}\big]`,
        cap: '**再按概率加权，汇到动作上。** 动作 E：$Q(s_{10},E)=' + qTex(1) + '=' + f3(Q[1]) + '$。每片叶子先乘自己的概率，再一起加起来。'
      });
      frames.push({
        set: util.merge(...[0, 2, 3].map(ai => util.merge(util.each(3, j => ({ ['mv' + ai + j + '.tx']: AX[ai] + 44, ['mv' + ai + j + '.ty']: YA, ['mv' + ai + j + '.sc']: 0.6 })), { ['aq' + ai + '.op']: 1 }))),
        fn: util.merge(...[0, 2, 3].map(ai => util.each(3, j => ({ ['mv' + ai + j + '.op']: fade })))),
        timing: util.merge(...[0, 2, 3].map((ai, n) => util.merge(util.each(3, j => ({ ['mv' + ai + j + '.op']: [n * 0.12, n * 0.12 + 0.6], ['mv' + ai + j + '.tx']: [n * 0.12, n * 0.12 + 0.55], ['mv' + ai + j + '.ty']: [n * 0.12, n * 0.12 + 0.55], ['mv' + ai + j + '.sc']: [n * 0.12, n * 0.12 + 0.55] })), { ['aq' + ai]: [n * 0.12 + 0.5, n * 0.12 + 0.8] }))),
        dur: 1600, pulse: ['an0', 'an2', 'an3'],
        cap: '其余三个动作同样处理：$Q(N)=' + f3(Q[0]) + '$，$Q(S)=' + f3(Q[2]) + '$，$Q(W)=' + f3(Q[3]) + '$。四个数就是“在 $s_{10}$ 先做这个动作、之后按当前估计走”的价值。'
      });
      const dimOthers = util.each(4, ai => ai === best ? { ['ea' + ai + '.stroke']: PAL.blue, ['ea' + ai + '.stroke-width']: 4 } : { ['an' + ai + '.op']: 0.35, ['aq' + ai + '.op']: 0.35, ['ea' + ai + '.op']: 0.3 });
      frames.push({
        set: util.merge(dimOthers, { 'rootv.num': Q[best], 'rootvl.tex': R`=V_2(s_{10})` }), pulse: ['root'], dur: 1300, hl: ['V'], tex: T,
        cap: '**最后取最大：** $V_2(s_{10})=\\max(' + Q.map(f3).join(',\\ ') + ')=' + f3(Q[best]) + '$，最好的动作是 ' + acts[best] + '。这就是 Bellman **最优**方程的一次备份。'
      });
      frames.push({
        set: util.merge(util.each(4, ai => ({ ['an' + ai + '.op']: 1, ['aq' + ai + '.op']: 1, ['ea' + ai + '.op']: 1, ['ea' + ai + '.stroke']: PAL.orange, ['ea' + ai + '.stroke-width']: 2.5 })), { 'rootv.num': avg, 'rootvl.tex': R`=(T_\pi V_1)(s_{10})`, 'rootvl.color': PAL.orange, 'rootv.fill': PAL.orange }),
        pulse: ['root'], dur: 1300, hl: ['pi'],
        tex: R`\htmlClass{fx-V}{(T_\pi V_1)(s)}=\sum_a\htmlClass{fx-pi}{\pi(a\mid s)}\sum_{s'}p(s'\mid s,a)[r+\gamma V_1(s')]`,
        cap: '对比一次 Bellman **期望备份**：如果 policy 是四个方向各 $\\tfrac14$ 的随机策略，就不取最大，而是按 $\\pi$ 加权平均：$\\tfrac14(' + Q.map(f3).join('+') + ')=' + f3(avg) + '$。这得到的是对旧表 $V_1$ 做一次备份的 0.430，**不是**随机策略已收敛的 $v_\\pi$。（公式条里的 $T_\\pi V_1$ 就是“拿 $V_1$ 按 $\\pi$ 做一次期望备份得到的新表”。）'
      });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ TD update on a number line (c17) */
  RL.scene.register('td-pull', {
    title: 'TD 更新：把估计往 target 拉一小段',
    intro: '本章手算的那一次：$V(S_t)=0.2$，奖励 0，下一状态估计 0.8，$\\gamma=0.9$。拖动 $\\alpha$ 看每次拉多远。',
    w: 720, h: 300,
    params: [{ key: 'alpha', label: '学习率 α', min: 0.05, max: 1, step: 0.05, value: 0.1, format: v => v.toFixed(2) }],
    colors: { V: PAL.blue, Vn: PAL.blue, r: PAL.yellow, gamma: PAL.green, alpha: PAL.purple, target: PAL.pink, delta: PAL.red },
    build(st, p) {
      const a = p.alpha, X = v => 70 + v * 580, Y = 170;
      st.add('axis', 'line', { x1: X(0) - 10, y1: Y, x2: X(1) + 20, y2: Y, stroke: PAL.line, 'stroke-width': 2 });
      for (let i = 0; i <= 10; i++) {
        st.add('tk' + i, 'line', { x1: X(i / 10), y1: Y - 5, x2: X(i / 10), y2: Y + 5, stroke: PAL.line, 'stroke-width': 1.5 });
        st.text('tn' + i, X(i / 10), Y + 22, (i / 10).toFixed(1), { size: 12, color: PAL.dim });
      }
      const v0 = 0.2, vn = 0.8, r = 0, target = r + 0.9 * vn;
      const v1 = v0 + a * (target - v0);
      // later noisy targets for the same state
      const later = [0.54, 0.9, 0.72, 0.81, 0.63];
      const vs = [v1]; later.forEach(t => vs.push(vs[vs.length - 1] + a * (t - vs[vs.length - 1])));

      st.add('vn', 'circle', { cx: X(vn), cy: Y, r: 9, fill: 'none', stroke: PAL.blue, 'stroke-width': 2.5 });
      st.tex('vnl', X(vn), Y - 64, R`V(S_{t+1})=0.8`, { w: 140, h: 24, size: 14, color: PAL.blue });
      st.add('vnstem', 'line', { x1: X(vn), y1: Y - 52, x2: X(vn), y2: Y - 12, stroke: PAL.blue, 'stroke-width': 1, 'stroke-dasharray': '3 3' });
      st.add('gv', 'circle', { cx: X(vn), cy: Y, r: 9, fill: PAL.green, op: 0 });
      st.tex('gvl', X(target), Y + 50, R`\gamma V(S_{t+1})=0.72`, { w: 160, h: 24, size: 13, color: PAL.green, op: 0 });
      st.add('tg', 'path', { d: 'M ' + X(target) + ' ' + (Y - 12) + ' l -8 -14 l 16 0 z', fill: PAL.pink, op: 0 });
      st.tex('tgl', X(target), Y - 100, R`\text{target}=r+\gamma V(S_{t+1})=0.72`, { w: 280, h: 24, size: 14, color: PAL.pink, op: 0 });
      st.add('dl', 'path', { d: util.arrow(X(v0), Y - 30, X(v0) + 1, Y - 30, 8), stroke: PAL.red, 'stroke-width': 2.5, fill: 'none', op: 0 });
      st.tex('dll', (X(v0) + X(target)) / 2, Y - 46, R`\delta=0.72-0.2=0.52`, { w: 180, h: 22, size: 13, color: PAL.red, op: 0 });
      st.add('trail', 'g', {});
      vs.forEach((v, i) => st.add('ghost' + i, 'circle', { cx: X(v0), cy: Y, r: 6, fill: PAL.blue, op: 0 }, 'trail'));
      st.add('v', 'circle', { cx: X(v0), cy: Y, r: 11, fill: PAL.blue });
      st.num('vl', X(v0), Y + 50, v0, { digits: 3, size: 15, color: PAL.blue, weight: 650 });
      st.tex('vlab', X(v0), Y - 64, R`V(S_t)`, { w: 80, h: 24, size: 15, color: PAL.blue });
      st.add('ab', 'path', { d: 'M ' + X(v0) + ' ' + (Y + 34) + ' L ' + X(v0) + ' ' + (Y + 34), stroke: PAL.purple, 'stroke-width': 4, op: 0 });

      const TEX = R`\htmlClass{fx-V}{V(S_t)}\leftarrow\htmlClass{fx-V}{V(S_t)}+\htmlClass{fx-alpha}{\alpha}\big[\htmlClass{fx-delta}{\htmlClass{fx-target}{\htmlClass{fx-r}{R_{t+1}}+\htmlClass{fx-gamma}{\gamma}\htmlClass{fx-Vn}{V(S_{t+1})}}-V(S_t)}\big]`;
      const frames = [{ cap: '**来了一条新经验，估计该改多少？** 蓝点是当前估计 $V(S_t)=0.2$。刚走了一步：奖励 0，到达的下一状态现在估计是 0.8（空心蓝圈）。' }];
      frames.push({
        set: { 'gv.op': 1, 'gv.cx': X(target), 'gv.r': 7, 'gvl.op': 1 }, dur: 1200, hl: ['gamma', 'Vn'], tex: R`\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-Vn}{V(S_{t+1})}=0.9\times0.8=0.72`,
        cap: '下一状态的估计先打折：$0.9\\times0.8=0.72$（绿点往左缩了一点）。'
      });
      frames.push({
        set: { 'tg.op': 1, 'tgl.op': 1 }, dur: 900, pulse: ['tg'], hl: ['target'], tex: R`\htmlClass{fx-target}{\text{target}=\htmlClass{fx-r}{R_{t+1}}+\htmlClass{fx-gamma}{\gamma}\htmlClass{fx-Vn}{V(S_{t+1})}}=0+0.72`,
        cap: '再加上这一步的奖励 $r=0$，得到 **target** $=0.72$（粉色）。它是对 $V(S_t)$ 的一个新的、带噪声的“参考答案”——只看了一步真实奖励，其余用估计补齐（bootstrap）。'
      });
      frames.push({
        set: { 'dl.op': 1, 'dl.d': util.arrow(X(v0), Y - 30, X(target), Y - 30, 8), 'dll.op': 1 }, dur: 1100, hl: ['delta'], tex: R`\htmlClass{fx-delta}{\delta}=\htmlClass{fx-target}{\text{target}}-\htmlClass{fx-V}{V(S_t)}=0.72-0.2=0.52`,
        cap: '**TD error** $\\delta$ = target − 当前估计 = $0.52$（红箭头）。箭头的方向告诉我们往哪改，长度告诉我们差多少。'
      });
      frames.push({
        set: { 'v.cx': X(v1), 'vl.x': X(v1), 'vl.num': v1, 'vlab.x': X(v1) - 40, 'ab.op': 1, 'ab.d': 'M ' + X(v0) + ' ' + (Y + 34) + ' L ' + X(v1) + ' ' + (Y + 34), 'ghost0.op': 0.35 },
        dur: 1300, pulse: ['v'], hl: ['alpha'], tex: TEX,
        cap: '只走箭头的 $\\alpha=' + a.toFixed(2) + '$ 那一段（紫色）：$0.2+' + a.toFixed(2) + '\\times0.52=' + util.fmt(v1, 3) + '$。**不是直接跳到 target**，因为这一个 target 有噪声。把 α 拖到 1 试试：那就是完全相信这一次。'
      });
      later.forEach((t, i) => {
        const from = vs[i], to = vs[i + 1];
        frames.push({
          set: { 'tg.d': 'M ' + X(t) + ' ' + (Y - 12) + ' l -8 -14 l 16 0 z', 'tgl.x': X(t) - 140, 'tgl.tex': R`\text{target}=` + t.toFixed(2), 'gv.op': 0, 'gvl.op': 0, 'vn.op': 0, 'vnl.op': 0, 'vnstem.op': 0,
            'dl.d': util.arrow(X(from), Y - 30, X(t), Y - 30, 8), 'dll.op': 0, 'v.cx': X(to), 'vl.x': X(to), 'vl.num': to, 'vlab.x': X(to) - 40,
            'ab.d': 'M ' + X(from) + ' ' + (Y + 34) + ' L ' + X(to) + ' ' + (Y + 34), ['ghost' + (i + 1) + '.op']: 0.35, ['ghost' + (i + 1) + '.cx']: X(to) },
          timing: { tg: [0, 0.35], tgl: [0, 0.35], dl: [0.2, 0.5], v: [0.5, 1], vl: [0.5, 1], vlab: [0.5, 1], ab: [0.5, 1] },
          dur: 1300,
          cap: i === 0
            ? '以后每次再来到这个状态，target 都**不同**（下一状态、奖励都可能变）。这次 target $=' + t.toFixed(2) + '$，同样只拉 α 那么多：$' + util.fmt(from, 3) + '\\to' + util.fmt(to, 3) + '$。'
            : i === later.length - 1
              ? 'target $=' + t.toFixed(2) + '$：$' + util.fmt(from, 3) + '\\to' + util.fmt(to, 3) + '$。每次只挪一小段，蓝点会慢慢走向这些 target 的**加权平均**（这里约 0.72），不会被某一次噪声带跑。α 越大跟得越快、抖得越厉害；α 越小越稳、越慢。'
              : 'target $=' + t.toFixed(2) + '$：$' + util.fmt(from, 3) + '\\to' + util.fmt(to, 3) + '$。'
        });
      });
      // ghosts start where the dot was before each move
      vs.forEach((v, i) => { st.base['ghost' + i + '.cx'] = X(i === 0 ? v1 : v); });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ MC vs TD on a chain (c18) */
  RL.scene.register('mc-vs-td', {
    title: 'MC 等到结束再改，TD 走一步改一步',
    intro: '同一条路 $A\\to B\\to C\\to$ 终止，只有最后一步奖励 $+1$，$\\gamma=0.9$，初始估计全是 0。上排 MC（取平均），下排 TD（$\\alpha=0.1$）。',
    w: 720, h: 340,
    colors: { G: PAL.gold, target: PAL.pink, V: PAL.blue },
    build(st) {
      const gam = 0.9, alpha = 0.1, names = ['A', 'B', 'C'], X = i => 130 + i * 170, YM = 92, YT = 236;
      st.text('mclab', 30, YM, 'MC', { size: 16, color: PAL.gold, anchor: 'start', weight: 700 });
      st.text('tdlab', 30, YT, 'TD', { size: 16, color: PAL.pink, anchor: 'start', weight: 700 });
      st.add('sep', 'line', { x1: 20, y1: 164, x2: 700, y2: 164, stroke: PAL.grid, 'stroke-width': 1 });
      [['m', YM], ['t', YT]].forEach(([k, y]) => {
        for (let i = 0; i < 3; i++) {
          st.add(k + 'e' + i, 'path', { d: util.arrow(X(i) + 26, y, X(i + 1) - 26, y, 8), stroke: PAL.line, 'stroke-width': 2, fill: 'none' });
          st.add(k + 'n' + i, 'circle', { cx: X(i), cy: y, r: 24, fill: PAL.panel, stroke: PAL.blue, 'stroke-width': 2 });
          st.text(k + 'l' + i, X(i), y, names[i], { size: 16, weight: 650 });
          st.num(k + 'v' + i, X(i), y + 40, 0, { digits: 3, size: 15, color: PAL.blue, weight: 650 });
        }
        st.add(k + 'term', 'rect', { x: X(3) - 22, y: y - 22, width: 44, height: 44, rx: 8, fill: '#22301f', stroke: PAL.green, 'stroke-width': 2 });
        st.text(k + 'tl', X(3), y, '+1', { size: 15, color: PAL.green, weight: 700 });
        st.add(k + 'ag', 'circle', { cx: X(0), cy: y - 34, r: 8, fill: PAL.orange });
      });
      st.text('mnote', 360, YM - 58, '', { size: 13, color: PAL.dim });
      st.text('tnote', 360, YT - 58, '', { size: 13, color: PAL.dim });
      // MC returns flying back
      const G = [gam * gam, gam, 1];
      for (let i = 0; i < 3; i++) { st.group('mg' + i, { op: 0, tx: X(3), ty: YM - 34 }); st.num('mgn' + i, 0, 0, G[i], { digits: 3, size: 14, color: PAL.gold, weight: 700, parent: 'mg' + i }); }
      // TD estimates
      const td = [0, 0, 0];
      const tdUpd = i => { const tgt = (i === 2 ? 1 : 0) + (i === 2 ? 0 : gam * td[i + 1]); const old = td[i]; td[i] = old + alpha * (tgt - old); return { tgt, old, nv: td[i] }; };

      const TEXM = R`\begin{gathered}\text{MC: }\htmlClass{fx-V}{V(S_t)}\leftarrow\text{平均}\big(\htmlClass{fx-G}{G_t}\big)\\ \text{TD: }\htmlClass{fx-V}{V(S_t)}\leftarrow V(S_t)+\alpha\big[\htmlClass{fx-target}{R_{t+1}+\gamma V(S_{t+1})}-V(S_t)\big]\end{gathered}`;
      const frames = [{ cap: '**同一条经验，MC 和 TD 分别在什么时候改？拿什么当参考答案？** 两种方法同时看同一条 episode，橙点是智能体。' }];
      const step = (i) => {
        const u = tdUpd(i);
        frames.push({
          set: { 'mag.cx': X(i + 1), 'tag.cx': X(i + 1), ['tv' + i + '.num']: u.nv, 'mnote.text': i < 2 ? 'MC：只把奖励记下来，先不改' : 'MC：episode 结束了，现在才能算 G', 'tnote.text': 'TD 在 ' + names[i] + '：target = ' + (i === 2 ? '1' : '0 + 0.9 × ' + util.fmt(u.tgt / gam || 0, 3)) + ' = ' + util.fmt(u.tgt, 3) },
          timing: { mag: [0, 0.5], tag: [0, 0.5], ['tv' + i]: [0.5, 1] },
          pulse: ['tn' + i], dur: 1200,
          cap: i < 2
            ? 'Episode 1 走到 ' + names[i + 1] + '，奖励 0。**TD 马上更新 ' + names[i] + '**：target $=0+0.9\\times V(' + names[i + 1] + ')=0$，所以 $V(' + names[i] + ')$ 还是 0——不是 ' + names[i] + ' 没价值，而是 ' + names[i + 1] + ' 的估计目前还是 0。'
            : '最后一步拿到 $+1$：TD 更新 C，target $=1$，$V(C)=0+0.1\\times(1-0)=' + util.fmt(u.nv, 3) + '$。Episode 1 里 TD **只改动了 C 一个格子**。'
        });
      };
      [0, 1, 2].forEach(step);
      frames.push({
        set: util.merge(util.each(3, i => ({ ['mg' + i + '.op']: 1, ['mg' + i + '.tx']: X(i), ['mg' + i + '.ty']: YM + 40, ['mv' + i + '.num']: G[i] })), { 'mnote.text': 'MC：从后往前算 G，每个状态都拿到真实回报', 'tnote.text': '' }),
        timing: util.merge(...[2, 1, 0].map((i, n) => ({ ['mg' + i]: [n * 0.25, n * 0.25 + 0.4], ['mv' + i]: [n * 0.25 + 0.35, n * 0.25 + 0.5] }))),
        dur: 2000, pulse: ['mn0', 'mn1', 'mn2'], hl: ['G'],
        cap: '**MC 要等 episode 结束**，才倒着算出 $G_C=1$、$G_B=0.9$、$G_A=0.81$，三个状态一次全改（第一条 episode，平均值就是这个回报）。注意 C 这里是 1、TD 那边只有 0.1，主要是步长不同（MC 取平均，第一次就等于回报；TD 用 $\\alpha=0.1$）；TD 和 MC 的真正区别是：TD 的 A、B 还是 0。'
      });
      // episode 2 for TD
      frames.push({
        set: util.merge(util.each(3, i => ({ ['mg' + i + '.op']: 0 })), { 'mag.cx': X(0), 'tag.cx': X(0), 'mnote.text': '', 'tnote.text': 'Episode 2 开始' }),
        dur: 700, cap: '再走一遍同样的路（Episode 2）。'
      });
      const ep2 = [0, 1, 2].map(i => tdUpd(i));
      frames.push({
        set: util.merge(util.each(3, i => ({ ['tv' + i + '.num']: ep2[i].nv })), { 'mag.cx': X(3), 'tag.cx': X(3), 'mnote.text': 'MC：同样的回报，平均值不变', 'tnote.text': 'TD：B 读到了 V(C) = 0.1，信息往前传了一格' }),
        timing: { mag: [0, 0.9], tag: [0, 0.9], tv0: [0.25, 0.4], tv1: [0.5, 0.65], tv2: [0.8, 0.95] },
        dur: 2200, pulse: ['tn1', 'tn2'],
        cap: 'TD 在 B：target $=0+0.9\\times0.1=0.09$，$V(B)=0.009$；在 C：$V(C)=0.1+0.1\\times(1-0.1)=' + util.fmt(ep2[2].nv, 3) + '$。**TD 每条 episode 只把信息往前传一格**：C 先有值，下一条 episode 才传到 B，再下一条才传到 A。'
      });
      frames.push({
        set: { 'mnote.text': 'MC：target 是真实回报 G —— 无偏，但一整条路的运气都算进去（方差大）', 'tnote.text': 'TD：target 用了估计 V(S′) —— 有偏，但只看一步的运气（方差小），而且走一步就能改' },
        dur: 600, tex: TEXM,
        cap: '总结：MC 的 target 是**真实回报**，要等结束，受整条路随机性影响；TD 的 target 只用一步真实奖励再加**当前估计**，可以边走边学，但估计不准时 target 也不准。'
      });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ process strips */
  RL.scene.setStages('return-backward', ['提出问题', '越远打折越多', '正着算会重复', '倒着算：乘 $\\gamma$ 再加 $r$', '结论'], [0, 1, 2, 3, 3, 3, 3, 3, 4]);
  RL.scene.setStages('bellman-backup', ['摊成一棵树', "叶子：$r+\\gamma V(s')$", '按概率加权得 $Q$', '取最大得 $V$', '对比：按 $\\pi$ 平均'], [0, 1, 2, 2, 3, 4]);
  RL.scene.setStages('td-pull', ['当前估计', "打折 $\\gamma V(S')$", 'target', '误差 $\\delta$', '只走 $\\alpha$ 那么多', '反复更新'], [0, 1, 2, 3, 4, 5, 5, 5, 5, 5]);
  RL.scene.setStages('mc-vs-td', ['同一条 episode', 'TD：每走一步就改', 'MC：结束后倒着改', '第二条 episode', '对比'], [0, 1, 1, 1, 2, 3, 3, 4]);
  RL.scene.setAha('return-backward', [1, -1]);
  RL.scene.setAha('bellman-backup', [4]);
  RL.scene.setAha('td-pull', [4, -1]);
  RL.scene.setAha('mc-vs-td', [3, 6]);
})(window);
