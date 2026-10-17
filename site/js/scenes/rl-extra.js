/* More 3B1B-style RL scenes: incremental mean (c13), SARSA vs Q-learning (c22), REINFORCE baseline (c30). */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { PAL, util } = RL.scene;
  const R = String.raw;
  const f = (x, d) => util.fmt(x, d == null ? 3 : d);
  const tri = (x, y) => 'M ' + x + ' ' + (y - 12) + ' l -8 -14 l 16 0 z';

  /* ------------------------------------------------------------------ incremental mean (c13) */
  RL.scene.register('incremental-mean', {
    title: '增量平均：每来一个样本，只挪 1/N 那么远',
    intro: '某台机器依次给出奖励 1、0、1、1、0（前三个是本章手算的例子）。黄 = 新样本 $r$，青 = 估计 $Q$。',
    w: 720, h: 300,
    colors: { Q: PAL.teal, r: PAL.yellow, N: PAL.white },
    build(st) {
      const rs = [1, 0, 1, 1, 0], X = v => 80 + v * 560, Y = 170;
      st.add('axis', 'line', { x1: X(0) - 10, y1: Y, x2: X(1) + 10, y2: Y, stroke: PAL.line, 'stroke-width': 2 });
      for (let i = 0; i <= 4; i++) {
        st.add('tk' + i, 'line', { x1: X(i / 4), y1: Y - 5, x2: X(i / 4), y2: Y + 5, stroke: PAL.line, 'stroke-width': 1.5 });
        st.text('tn' + i, X(i / 4), Y + 22, String(i / 4), { size: 12, color: PAL.dim });
      }
      const Q = [0]; rs.forEach((r, k) => Q.push(Q[k] + (r - Q[k]) / (k + 1)));
      rs.forEach((r, k) => st.add('smp' + k, 'circle', { cx: X(r), cy: Y - 58, r: 9, fill: PAL.yellow, op: 0 }));
      st.add('gap', 'path', { d: util.arrow(X(0), Y - 30, X(0) + 1, Y - 30, 8), stroke: PAL.dim, 'stroke-width': 1.5, 'stroke-dasharray': '5 4', fill: 'none', op: 0 });
      st.add('step', 'path', { d: util.arrow(X(0), Y - 30, X(0) + 1, Y - 30, 8), stroke: PAL.teal, 'stroke-width': 3, fill: 'none', op: 0 });
      st.tex('frac', X(0.5), Y - 92, R`\tfrac11`, { w: 120, h: 30, size: 18, color: PAL.white, op: 0 });
      st.add('q', 'circle', { cx: X(0), cy: Y, r: 11, fill: PAL.teal });
      st.num('qn', X(0), Y + 46, 0, { digits: 4, trim: true, size: 15, color: PAL.teal, weight: 650, prefix: 'Q = ' });
      st.num('nn', 640, 40, 0, { digits: 0, size: 14, color: PAL.dim, prefix: 'N = ' });

      const frames = [{ cap: '**不把所有奖励存下来，怎么随时知道平均值？** 一开始没有样本，估计 $Q=0$。' }];
      rs.forEach((r, k) => {
        const N = k + 1, q0 = Q[k], q1 = Q[k + 1];
        frames.push({
          set: util.merge(util.each(rs.length, j => ({ ['smp' + j + '.op']: j === k ? 1 : (j < k ? 0.25 : 0), ['smp' + j + '.r']: j === k ? 9 : 6 })), {
            'gap.op': 1, 'gap.d': util.arrow(X(q0), Y - 30, X(r) + (r > q0 ? -0.01 : 0.01), Y - 30, 8),
            'step.op': 1, 'step.d': util.arrow(X(q0), Y - 30, X(q1) + (q1 >= q0 ? 0.01 : -0.01), Y - 30, 8),
            'frac.op': 1, 'frac.tex': R`\text{走 }\tfrac1{${N}}\text{ 的距离}`, 'q.cx': X(q1), 'qn.x': X(q1), 'qn.num': q1, 'nn.num': N }),
          timing: { ['smp' + k]: [0, 0.3], gap: [0.2, 0.45], step: [0.45, 0.8], q: [0.5, 0.95], qn: [0.5, 0.95], frac: [0.3, 0.5] },
          dur: 1500, pulse: ['q'], hl: N === 1 ? ['N'] : ['r', 'Q'],
          tex: R`\htmlClass{fx-Q}{Q}\leftarrow\htmlClass{fx-Q}{Q}+\tfrac{1}{\htmlClass{fx-N}{N}}\big(\htmlClass{fx-r}{r}-\htmlClass{fx-Q}{Q}\big)=${f(q0, 4).replace(/\.?0+$/, '') || '0'}+\tfrac1{${N}}(${r}-${f(q0, 4).replace(/\.?0+$/, '') || '0'})=${f(q1, 4).replace(/\.?0+$/, '') || '0'}`,
          cap: N === 1 ? '第 1 个样本 $r=1$：$N=1$，走完全部差距，$Q=1$——只有一个样本时，平均值就是它本身。'
            : N === 3 ? '第 3 个样本 $r=1$：只走差距的 $\\tfrac13$，$Q=0.5+\\tfrac13(1-0.5)=0.6667$，和直接算 $(1+0+1)/3$ 完全一样。'
              : '第 ' + N + ' 个样本 $r=' + r + '$：灰色虚线是“到新样本的差距”，青色只走它的 $\\tfrac1{' + N + '}$：$Q=' + f(q1, 4).replace(/\.?0+$/, '') + '$。'
        });
      });
      frames.push({
        set: util.merge(util.each(rs.length, j => ({ ['smp' + j + '.op']: 0.6, ['smp' + j + '.r']: 7 })), { 'gap.op': 0, 'step.op': 0, 'frac.op': 0 }),
        dur: 800, tex: R`\htmlClass{fx-Q}{Q_N}=\frac{r_1+\cdots+r_N}{N}=\frac{3}{5}=0.6`,
        cap: '5 个样本后 $Q=0.6$，正好是 $(1+0+1+1+0)/5$。**为什么步长越来越小，权重却一样？** 第 1 个样本进来时权重是 1，之后每次更新旧估计都要乘 $(1-\\tfrac1N)$：第 2 次乘 $\\tfrac12$，第 3 次乘 $\\tfrac23$……到第 5 次正好剩 $\\tfrac15$。后来的样本步长小，但被稀释的次数也少，最后每个样本都是 $\\tfrac15$。只需要记住 $Q$ 和 $N$。如果奖励分布会变（非平稳），就把 $\\tfrac1N$ 换成固定的 $\\alpha$：每次都乘同一个 $(1-\\alpha)$，$k$ 次之前的样本权重是 $\\alpha(1-\\alpha)^k$，越旧越小（指数衰减），新样本权重更大；初始值的权重 $(1-\\alpha)^k$ 也会被慢慢冲掉。'
      });
      return frames;
    }
  });

  /* ------------------------------------------------------------------ SARSA vs Q-learning (c22) */
  RL.scene.register('sarsa-vs-q', {
    title: 'SARSA 与 Q-learning：同一次经验，两个方向',
    intro: '本章的对照例子：在 $S$ 执行 $A$，$R=0$，到达 $B$；$B$ 的四个 $Q$ 是 Up 0.3、Down 0.2、Left 0.4、Right 0.8；ε-greedy 实际选了 Left；$\\gamma=0.9$，$\\alpha=0.1$，旧 $Q(S,A)=0.5$。',
    w: 720, h: 370,
    colors: { Q: PAL.teal, sarsa: PAL.orange, ql: PAL.teal, target: PAL.pink, gamma: PAL.green },
    build(st) {
      const qB = { Up: 0.3, Down: 0.2, Left: 0.4, Right: 0.8 }, acts = Object.keys(qB), chosen = 'Left';
      const best = acts.reduce((b, a) => (qB[a] > qB[b] ? a : b), acts[0]);
      const gam = 0.9, alpha = 0.1, q0 = 0.5, r = 0;
      const tS = r + gam * qB[chosen], tQ = r + gam * qB[best];
      const qS = q0 + alpha * (tS - q0), qQ = q0 + alpha * (tQ - q0);
      // left: S --A--> B with B's action values
      st.add('s', 'circle', { cx: 60, cy: 120, r: 22, fill: PAL.panel, stroke: PAL.blue, 'stroke-width': 2 });
      st.text('sl', 60, 120, 'S', { size: 16, weight: 650 });
      st.add('sa', 'path', { d: util.arrow(84, 120, 156, 120, 8), stroke: PAL.line, 'stroke-width': 2, fill: 'none' });
      st.text('sal', 120, 104, 'A, R = 0', { size: 12, color: PAL.dim });
      st.add('bbox', 'rect', { x: 160, y: 40, width: 220, height: 160, rx: 10, fill: PAL.panel, stroke: PAL.line });
      st.text('bl', 180, 58, 'B', { size: 15, weight: 650, anchor: 'start' });
      const BX = 220, BW = 130, by = i => 82 + i * 30;
      acts.forEach((a, i) => {
        st.text('al' + i, 210, by(i), a, { size: 13, anchor: 'end' });
        st.add('ab' + i, 'rect', { x: BX, y: by(i) - 9, width: BW * qB[a], height: 18, rx: 3, fill: PAL.teal, 'fill-opacity': 0.75 });
        st.text('av' + i, BX + BW * qB[a] + 6, by(i), String(qB[a]), { size: 12, color: PAL.teal, anchor: 'start' });
      });
      const ci = acts.indexOf(chosen), bi = acts.indexOf(best);
      st.add('pickC', 'rect', { x: BX - 4, y: by(ci) - 13, width: BW * qB[chosen] + 8, height: 26, rx: 5, fill: 'none', stroke: PAL.orange, 'stroke-width': 2.5, op: 0 });
      st.text('pickCl', 160, 222, 'ε-greedy 实际选中 Left（A′）', { size: 12, color: PAL.orange, anchor: 'start', op: 0 });
      st.add('pickB', 'rect', { x: BX - 4, y: by(bi) - 13, width: BW * qB[best] + 8, height: 26, rx: 5, fill: 'none', stroke: PAL.teal, 'stroke-width': 2.5, 'stroke-dasharray': '5 3', op: 0 });
      st.text('pickBl', 160, 240, '最好的是 Right（max）', { size: 12, color: PAL.teal, anchor: 'start', op: 0 });
      // right: two number lines for Q(S,A)
      const X = v => 440 + v * 250, YS = 110, YQ = 240;
      [['S', YS, 'SARSA', PAL.orange], ['Q', YQ, 'Q-learning', PAL.teal]].forEach(([k, y, name, col]) => {
        st.text('n' + k, 440, y - 46, name, { size: 14, color: col, weight: 700, anchor: 'start' });
        st.add('ax' + k, 'line', { x1: X(0), y1: y, x2: X(1), y2: y, stroke: PAL.line, 'stroke-width': 2 });
        [0, 0.5, 1].forEach((v, j) => st.text('t' + k + j, X(v), y + 20, String(v), { size: 11, color: PAL.dim }));
        st.add('tg' + k, 'path', { d: tri(X(0.5), y), fill: PAL.pink, op: 0 });
        st.num('tgn' + k, X(0.5), y - 34, 0.5, { digits: 2, trim: true, size: 12, color: PAL.pink, op: 0, prefix: 'target ' });
        st.add('dot' + k, 'circle', { cx: X(q0), cy: y, r: 9, fill: PAL.blue });
        st.num('dn' + k, X(q0), y + 38, q0, { digits: 3, trim: true, size: 13, color: PAL.blue, weight: 650 });
      });
      // flying copies of the next-action value, shrinking by γ
      [['S', ci, YS], ['Q', bi, YQ]].forEach(([k, i, y]) => {
        st.group('fly' + k, { op: 0, tx: BX + BW * qB[acts[i]] / 2, ty: by(i) });
        st.num('flyn' + k, 0, 0, qB[acts[i]], { digits: 2, trim: true, size: 13, color: PAL.white, weight: 700, parent: 'fly' + k });
      });
      st.text('xg', 400, 300, '', { size: 13, color: PAL.green });
      // cliff schematic for the last frame
      st.group('cliff', { op: 0 });
      const CX = 40, CY = 70, CS = 40;
      for (let rr = 0; rr < 4; rr++) for (let cc = 0; cc < 8; cc++) {
        const isCliff = rr === 3 && cc > 0 && cc < 7;
        st.add('cc' + rr + cc, 'rect', { x: CX + cc * CS, y: CY + rr * CS, width: CS - 2, height: CS - 2, rx: 3, fill: isCliff ? '#3a1f22' : PAL.panel, stroke: isCliff ? PAL.red : PAL.grid }, 'cliff');
      }
      st.text('cS', CX + CS / 2, CY + 3 * CS + CS / 2, 'S', { size: 14, weight: 700, parent: 'cliff' });
      st.text('cG', CX + 7 * CS + CS / 2, CY + 3 * CS + CS / 2, 'G', { size: 14, weight: 700, color: PAL.green, parent: 'cliff' });
      st.text('cliffl', CX + 4 * CS, CY + 3 * CS + CS / 2, '悬崖（掉下去 −100，回起点）', { size: 12, color: PAL.red, parent: 'cliff' });
      const P = (cc, rr) => (CX + cc * CS + CS / 2) + ' ' + (CY + rr * CS + CS / 2);
      st.add('pathQ', 'path', { d: 'M ' + P(0, 3) + ' L ' + P(0, 2) + ' L ' + P(7, 2) + ' L ' + P(7, 3), stroke: PAL.teal, 'stroke-width': 3.5, fill: 'none', op: 0 }, 'cliff');
      st.add('pathS', 'path', { d: 'M ' + P(0, 3) + ' L ' + P(0, 0) + ' L ' + P(7, 0) + ' L ' + P(7, 3), stroke: PAL.orange, 'stroke-width': 3.5, fill: 'none', op: 0 }, 'cliff');
      const leftSide = ['s', 'sl', 'sa', 'sal', 'bbox', 'bl', 'pickC', 'pickCl', 'pickB', 'pickBl', ...acts.flatMap((a, i) => ['al' + i, 'ab' + i, 'av' + i])];

      const TS = R`\text{SARSA: }\htmlClass{fx-target}{R+\htmlClass{fx-gamma}{\gamma}\,Q(S',\htmlClass{fx-sarsa}{A'})}`;
      const TQ = R`\text{Q-learning: }\htmlClass{fx-target}{R+\htmlClass{fx-gamma}{\gamma}\,\htmlClass{fx-ql}{\max_b}Q(S',b)}`;
      const frames = [{ cap: '**同一次经验，为什么 SARSA 把 $Q(S,A)$ 往下改，Q-learning 却往上改？** 刚从 $S$ 走到 $B$，奖励 0。右边两条数轴上的蓝点都是旧的 $Q(S,A)=0.5$。' }];
      frames.push({ set: { 'pickC.op': 1, 'pickCl.op': 1, 'pickB.op': 1, 'pickBl.op': 1 }, timing: { pickC: [0, 0.5], pickCl: [0, 0.5], pickB: [0.4, 0.9], pickBl: [0.4, 0.9] }, dur: 1200,
        cap: '在 $B$ 用 ε-greedy 选下一步：这次随机选到了 Left（0.4），而 $B$ 里最好的其实是 Right（0.8）。两种算法的区别只在于：**target 里用哪一个**。' });
      frames.push({
        set: { 'flyS.op': 0, 'tgnS.op': 1, 'tgnS.x': X(tS), 'tgnS.num': tS, 'flyS.tx': X(tS), 'flyS.ty': YS - 34, 'flynS.num': tS, 'tgS.op': 1, 'tgS.d': tri(X(tS), YS), 'xg.text': '×γ = 0.9' },
        timing: { flyS: [0, 0.7], flynS: [0.3, 0.7], tgS: [0.7, 1], tgnS: [0.7, 1] }, fn: { 'flyS.op': q => Math.min(1, 6 * q, 5 * (1 - q)) }, dur: 1600, tex: TS, hl: ['sarsa', 'gamma'],
        cap: '**SARSA** 用**实际选中的**下一步：$0+0.9\\times0.4=' + f(tS, 2) + '$（粉色 target）。它评估的是“我自己这套会偶尔乱走的 policy”。'
      });
      frames.push({ set: { 'dotS.cx': X(qS), 'dnS.x': X(qS), 'dnS.num': qS, 'xg.text': '' }, dur: 1100, pulse: ['dotS'],
        tex: R`Q(S,A)\leftarrow0.5+\alpha(${f(tS, 2)}-0.5)=${f(qS, 3)}`,
        cap: 'target 0.36 比旧值 0.5 低，SARSA 把 $Q(S,A)$ **往下**拉一点：$0.5+0.1\\times(0.36-0.5)=' + f(qS, 3) + '$。' });
      frames.push({
        set: { 'flyQ.op': 0, 'tgnQ.op': 1, 'tgnQ.x': X(tQ), 'tgnQ.num': tQ, 'flyQ.tx': X(tQ), 'flyQ.ty': YQ - 34, 'flynQ.num': tQ, 'tgQ.op': 1, 'tgQ.d': tri(X(tQ), YQ), 'xg.text': '×γ = 0.9' },
        timing: { flyQ: [0, 0.7], flynQ: [0.3, 0.7], tgQ: [0.7, 1], tgnQ: [0.7, 1] }, fn: { 'flyQ.op': q => Math.min(1, 6 * q, 5 * (1 - q)) }, dur: 1600, tex: TQ, hl: ['ql', 'gamma'],
        cap: '**Q-learning** 不管实际选了什么，用 $B$ 里**最好的**：$0+0.9\\times0.8=' + f(tQ, 2) + '$。它评估的是“以后都贪心”的 policy。'
      });
      frames.push({ set: { 'dotQ.cx': X(qQ), 'dnQ.x': X(qQ), 'dnQ.num': qQ, 'xg.text': '' }, dur: 1100, pulse: ['dotQ'],
        tex: R`Q(S,A)\leftarrow0.5+\alpha(${f(tQ, 2)}-0.5)=${f(qQ, 3)}`,
        cap: 'target 0.72 比 0.5 高，Q-learning 把 $Q(S,A)$ **往上**拉：$' + f(qQ, 3) + '$。同一条经验，一个下调、一个上调。' });
      frames.push({
        set: util.merge(util.each(leftSide.length, i => ({ [leftSide[i] + '.op']: 0 })), { 'cliff.op': 1, 'pathQ.op': 1, 'pathQ.draw': 1, 'pathS.op': 1, 'pathS.draw': 1 }),
        timing: util.merge(util.each(leftSide.length, i => ({ [leftSide[i]]: [0, 0.3] })), { cliff: [0.25, 0.5], pathQ: [0.45, 0.75], pathS: [0.65, 1] }),
        dur: 2200, tex: R`\htmlClass{fx-sarsa}{\text{SARSA：远离悬崖}}\qquad\htmlClass{fx-ql}{\text{Q-learning：贴着悬崖}}`,
        cap: '放到悬崖上就看出差别（每走一步 −1、进终点那一步 0，掉下悬崖 −100 并回到起点）：SARSA 的 target 里算进了“以后偶尔会乱走一步”，悬崖边的格子被掉崖拉低，于是学会**绕远路**（橙色）；Q-learning 假设以后都贪心，学到**贴边的最短路**（青色），但训练时 ε 乱走真会掉下去。'
      });
      st.base['pathQ.draw'] = 0; st.base['pathS.draw'] = 0;
      return frames;
    }
  });

  /* ------------------------------------------------------------------ REINFORCE with a learned baseline (c30) */
  RL.scene.register('baseline-shrink', {
    title: 'Baseline：只看“比平时好多少”',
    intro: '课件 W10-2 的机器人例子：B 的回报 99、A 的回报 101；$\\alpha=\\beta=0.1$，baseline $b$ 从 0 开始学。金 = 回报 $G$，青 = baseline $b$，红 = 更新信号 $\\delta=G-b$。',
    w: 720, h: 340,
    colors: { G: PAL.gold, b: PAL.teal, delta: PAL.red, alpha: PAL.purple },
    build(st) {
      const sm = h => { const m = Math.max(...h), e = h.map(x => Math.exp(x - m)), z = e[0] + e[1]; return e.map(x => x / z); };
      const a = 0.1, be = 0.1, GB = 99, GA = 101;
      // episodes 1..100 all pick B
      let h = [0, 0], b = 0; const hist = [{ b, h: h.slice(), d: null }];
      for (let k = 1; k <= 100; k++) { const p = sm(h), d = GB - b; h = [h[0] + a * d * (0 - p[0]), h[1] + a * d * (1 - p[1])]; b += be * (GB - b); hist.push({ b, h: h.slice(), d }); }
      const p100 = sm(h), d101 = GA - b, h101 = [h[0] + a * d101 * (1 - p100[0]), h[1] - a * d101 * (1 - p100[0])], pi101 = sm(h101)[0];
      const noBaseH = [-4.9969, 4.9969], pNB = sm(noBaseH), hNB = [noBaseH[0] + a * GA * (1 - pNB[0]), noBaseH[1] - a * GA * (1 - pNB[0])], piNB = sm(hNB)[0];
      const BASE = 280, SC = 2.0, XG = 140, XB = 230, XA = 330;
      st.add('axis', 'line', { x1: 80, y1: BASE, x2: 400, y2: BASE, stroke: PAL.line, 'stroke-width': 1.5 });
      st.add('gB', 'rect', { x: XG - 30, y: BASE - GB * SC, width: 60, height: GB * SC, fill: PAL.gold, 'fill-opacity': 0.8, rx: 3 });
      st.text('gBl', XG, BASE + 18, 'G（选 B）= 99', { size: 12, color: PAL.gold });
      st.add('bb', 'rect', { x: XB - 30, y: BASE, width: 60, height: 0, fill: PAL.teal, 'fill-opacity': 0.8, rx: 3 });
      st.num('bbn', XB, BASE + 18, 0, { digits: 3, trim: true, size: 12, color: PAL.teal, prefix: 'b旧 = ' });
      st.num('bnext', XB, BASE + 39, 0, { digits: 3, trim: true, size: 11, color: PAL.dim, prefix: '更新后 b新 = ' });
      st.add('dl', 'line', { x1: XB + 40, y1: BASE - GB * SC, x2: XB + 40, y2: BASE, stroke: PAL.red, 'stroke-width': 4 });
      st.add('dtop', 'line', { x1: XG + 30, y1: BASE - GB * SC, x2: XB + 46, y2: BASE - GB * SC, stroke: PAL.red, 'stroke-width': 1, 'stroke-dasharray': '4 3' });
      st.num('dn', XB + 52, BASE - GB * SC / 2, 99, { digits: 4, trim: true, size: 14, color: PAL.red, weight: 700, anchor: 'start', prefix: 'δ = ' });
      st.add('gA', 'rect', { x: XA - 30, y: BASE, width: 60, height: 0, fill: PAL.gold, 'fill-opacity': 0.8, rx: 3, op: 0 });
      st.text('gAl', XA, BASE + 18, 'G（选 A）= 101', { size: 12, color: PAL.gold, op: 0 });
      st.num('ep', 120, 40, 0, { digits: 0, size: 15, color: PAL.dim, prefix: 'Episode ' });
      // right: the policy
      st.text('pt', 560, 70, 'policy 在 s₀ 选 A 的概率', { size: 13, color: PAL.dim });
      st.num('pa', 560, 110, 0.5, { digits: 6, trim: true, size: 22, color: PAL.white, weight: 700, prefix: 'π(A) = ' });
      st.text('cmpT', 560, 190, '', { size: 13, color: PAL.dim });
      st.text('cmpB', 560, 220, '', { size: 14, color: PAL.teal, weight: 650 });
      st.text('cmpN', 560, 250, '', { size: 14, color: PAL.grey });

      const T = R`\htmlClass{fx-delta}{\delta}=\htmlClass{fx-G}{G_t}-\htmlClass{fx-b}{b_{\rm old}},\qquad h\leftarrow h+\htmlClass{fx-alpha}{\alpha}\,\htmlClass{fx-delta}{\delta}\,\nabla\log\pi,\qquad \htmlClass{fx-b}{b_{\rm new}}=\htmlClass{fx-b}{b_{\rm old}}+\beta\,\htmlClass{fx-delta}{\delta}`;
      const frames = [{ cap: '**回报动不动就是 99、101，怎样让更新只看“比平时好多少”？** 不减基线（baseline：从回报里统一减掉的参照值）时，更新信号就是回报本身（99），一步就把 softmax 推进饱和区。' }];
      const epFrame = (k, extra) => {
        const e = hist[k], prev = hist[k - 1];
        return Object.assign({
          set: { 'ep.num': k, 'bb.y': BASE - prev.b * SC, 'bb.height': prev.b * SC, 'bbn.num': prev.b, 'bnext.num': e.b, 'dl.y2': BASE - prev.b * SC, 'dn.num': e.d, 'dn.y': BASE - (GB + prev.b) * SC / 2, 'pa.num': sm(e.h)[0] },
          timing: { dl: [0, 0.35], dn: [0, 0.35], pa: [0.3, 0.7], bb: [0, 0.35], bbn: [0, 0.35], bnext: [0.6, 1] },
          dur: 1500, pulse: ['dn'], hl: ['delta', 'b']
        }, extra);
      };
      frames.push(epFrame(1, { tex: T, cap: 'E1 选到 B：$b$ 还是 0，所以 $\\delta=99-0=99$——和不减基线完全一样，偏好变成 $(\\mp4.95)$，$\\pi(A)$ 掉到 0.00005。然后 baseline 也学一步：$b=0+0.1\\times99=9.9$。' }));
      frames.push(epFrame(2, { cap: 'E2：$\\delta=99-9.9=' + f(hist[2].d, 1) + '$，$b$ 涨到 ' + f(hist[2].b, 2) + '。红色信号开始变短。' }));
      frames.push(epFrame(3, { cap: 'E3：$\\delta=' + f(hist[3].d, 2) + '$，$b=' + f(hist[3].b, 3) + '$。baseline 在追平均回报。' }));
      frames.push(Object.assign(epFrame(100, { cap: '一直到 E100：$b=' + f(hist[100].b, 5) + '$，几乎等于平时的回报 99，$\\delta$ 只剩 ' + f(hist[100].d, 4) + '——总是拿 99 的时候，“比平时好”几乎是 0，policy 不再被乱推。' }),
        { dur: 2200, timing: { dl: [0, 0.9], dn: [0, 0.9], bb: [0, 0.9], bbn: [0, 0.9], ep: [0, 0.9], pa: [0, 0.9] } }));
      frames.push({
        set: { 'ep.num': 101, 'bb.y': BASE - hist[100].b * SC, 'bb.height': hist[100].b * SC, 'bbn.num': hist[100].b, 'bnext.num': hist[100].b + be * d101, 'gA.op': 1, 'gA.y': BASE - GA * SC, 'gA.height': GA * SC, 'gAl.op': 1, 'dl.x1': XA + 40, 'dl.x2': XA + 40, 'dl.y1': BASE - GA * SC, 'dl.y2': BASE - hist[100].b * SC,
          'dtop.op': 0, 'dn.x': XA + 50, 'dn.num': d101, 'dn.y': BASE - GA * SC - 14, 'pa.num': pi101,
          'cmpT.text': 'E101 强制选 A（G = 101）之后：', 'cmpB.text': '有 baseline：δ = ' + f(d101, 3) + '，π(A) → ' + pi101.toExponential(2), 'cmpN.text': '没有 baseline：信号 101，π(A) → ' + f(piNB, 5) },
        timing: { gA: [0, 0.35], gAl: [0, 0.35], dl: [0.3, 0.6], dn: [0.3, 0.6], pa: [0.55, 0.9], cmpT: [0.6, 0.8], cmpB: [0.7, 0.9], cmpN: [0.8, 1] },
        dur: 2200, pulse: ['dn'], hl: ['delta'],
        cap: 'E101 强制选 A，$G=101$：$\\delta=101-' + f(hist[100].b, 3) + '=' + f(d101, 3) + '$，只是**比平时好一点**，于是只往 A 推一小步（$\\pi(A)$ 到 ' + pi101.toExponential(2) + '）。不减基线时信号是 101，$\\pi(A)$ 一下子翻到 ' + f(piNB, 5) + '。看起来不减反而一步“学对”了，其实只是一条样本把 policy 从一个极端甩到另一个极端，下次选到 B 又会被甩回去。有 baseline 时一条样本只推一小步，要多次 A 都比平时好才会累积起来——这才是稳定的学习。'
      });
      frames.push({ cap: '**baseline 把“绝对回报”换成“比平时好多少”**：信号变小、有正有负，更新就稳了（方差小）。它不改变梯度的期望，所以不会引入偏差。注意这个例子里 policy 在 E1 已经饱和，baseline 只能让后面的更新不再乱跳。（下一章的 actor-critic 改进的是另一件事：用 critic 的估计代替完整回报，每走一步就能更新；在这个一步就结束的例子里，从 0 开始学的 critic 第一步一样会饱和。）' });
      return frames;
    }
  });

  RL.scene.setStages('incremental-mean', ['没有样本', '每来一个：走 1/N', '结果 = 平均值'], [0, 1, 1, 1, 1, 1, 2]);
  RL.scene.setAha('incremental-mean', [3, -1]);
  RL.scene.setStages('sarsa-vs-q', ['同一次经验', '实际选的 vs 最好的', 'SARSA 的 target', 'Q-learning 的 target', '悬崖上的区别'], [0, 1, 2, 2, 3, 3, 4]);
  RL.scene.setAha('sarsa-vs-q', [5, 6]);
  RL.scene.setStages('baseline-shrink', ['回报很大', 'baseline 追上平均回报', 'δ 越来越小', '偶尔更好：小步推', '结论'], [0, 1, 1, 1, 2, 3, 4]);
  RL.scene.setAha('baseline-shrink', [5]);
})(window);
