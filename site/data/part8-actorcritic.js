/* Part 8 · W10-2 Actor-critic methods (limitations of REINFORCE, baselines, actor-critic family). */
(function (root) {
  'use strict';
  const R = String.raw;
  const ROBOT_UPDATE = {
    title: '机器人例子的一次 REINFORCE 更新（一步 episode，t = 0）',
    latex: R`\htmlClass{fx-h}{h_{\text{new}}(s_0,j)}=h_{\text{old}}(s_0,j)+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-g}{G_0}\,\htmlClass{fx-grad}{\big[\mathbb 1\{j=a\}-\pi_{\text{old}}(j\mid s_0)\big]}`,
    parts: [
      { key: 'h', label: '被更新的偏好（A、B 两个都更新）', color: 'blue', text: '$j$ 依次取 A 和 B。两个偏好用**同一个旧概率向量**同时算增量，再一起写回。' },
      { key: 'lr', label: 'learning rate α = 0.1', color: 'purple', text: '课件取 0.1。它和 $G_0$ 相乘决定一步走多远：$0.1\\times99=9.9$，这已经是一个很大的步长。' },
      { key: 'g', label: '学习信号 G₀（这里就是那一步的奖励）', color: 'green', text: '一步就终止，所以 $G_0=r$。原题中无论选 A 还是 B，$G_0$ 都约为 100，**永远是正的**——被选中的动作总会被强化。' },
      { key: 'grad', label: '∂log π(a|s₀)/∂h(s₀,j)', color: 'orange', text: '被选动作：$1-\\pi$；另一个动作：$-\\pi$。当被选动作的概率已经接近 1 时，$1-\\pi\\approx0$，更新几乎停下——这就是“饱和”。' }
    ]
  };
  const BASELINE = {
    title: 'REINFORCE with baseline',
    latex: R`\htmlClass{fx-theta}{\boldsymbol\theta}\leftarrow\boldsymbol\theta+\htmlClass{fx-lr}{\alpha}\,\big(\htmlClass{fx-g}{G_t}-\htmlClass{fx-b}{b(S_t)}\big)\,\htmlClass{fx-score}{\nabla_{\boldsymbol\theta}\log\pi_{\boldsymbol\theta}(A_t\mid S_t)}`,
    parts: [
      { key: 'theta', label: 'actor 参数 θ', color: 'blue', text: 'tabular 时就是偏好表 $h(s,a)$。' },
      { key: 'lr', label: 'actor 步长 α', color: 'purple', text: '仍是梯度**上升**。（课件的通用写法省略了 $\\gamma^t$；按回合从起点计时的严格版本还要再乘 $\\gamma^t$。）' },
      { key: 'g', label: 'Monte Carlo return G_t', color: 'green', text: '这次实际得到的回报，和不带 baseline 的 REINFORCE 相同。' },
      { key: 'b', label: 'baseline b(S_t)', color: 'red', text: '一个**只依赖状态、不依赖所选动作**的参照值。可以给定（如启发式），也可以学习：$b(s)=V(s)$。$G_t-b(S_t)$ 课件称为 advantage：这次比“平常”好多少。严格的优势函数定义是 $A^\\pi(s,a)=q^\\pi(s,a)-v^\\pi(s)$；只有当 $b=v^\\pi$ 时，$G_t-b(S_t)$ 的平均才等于它，而单次值仍有噪声。任意只依赖状态的 baseline 都不改变期望梯度，但不一定给出准确的优势。' },
      { key: 'score', label: 'score function ∇log π', color: 'orange', text: '和原来一样：tabular 时为 $\\mathbb 1\\{j=a\\}-\\pi(j\\mid s)$。' }
    ]
  };
  const BASELINE_LEARN = {
    title: '学习 baseline（tabular）',
    latex: R`\htmlClass{fx-b}{b_{\text{new}}(s)}=b_{\text{old}}(s)+\htmlClass{fx-lr}{\beta}\,\htmlClass{fx-d}{\big(G_t-b_{\text{old}}(s)\big)}`,
    parts: [
      { key: 'b', label: 'baseline，也就是 V(s) 的估计', color: 'red', text: '课件：tabular 时 $b(s_t)=V(s_t)$；函数近似时 $b(s_t)=V_{\\mathbf w}(s_t)$，更新参数 $\\mathbf w$。' },
      { key: 'lr', label: 'baseline 步长 β', color: 'purple', text: '课件通用公式里两处都写 α，机器人例子分开写 α（actor）和 β（baseline），都取 0.1。' },
      { key: 'd', label: 'δ = G_t − b_old', color: 'green', text: '和 actor 用的是**同一个** δ，而且都用更新前的 $b_{\\text{old}}$。这就是 MC prediction 的增量平均：target 是完整的 $G_t$，**不 bootstrap**。' }
    ]
  };
  const TDAC = {
    title: 'TD actor–critic',
    latex: R`\htmlClass{fx-d}{\delta_t}=\htmlClass{fx-r}{r_{t+1}}+\gamma\,\htmlClass{fx-boot}{V_{\mathbf w}(s_{t+1})}-\htmlClass{fx-v}{V_{\mathbf w}(s_t)},\quad \htmlClass{fx-theta}{\boldsymbol\theta\leftarrow\boldsymbol\theta+\alpha\,\delta_t\,g_t},\quad \htmlClass{fx-w}{\mathbf w\leftarrow\mathbf w+\beta\,\delta_t\,\nabla_{\mathbf w}V_{\mathbf w}(s_t)}`,
    parts: [
      { key: 'r', label: '真实奖励 r_{t+1}', color: 'gray', text: '这一步实际拿到的奖励。' },
      { key: 'boot', label: 'bootstrap：critic 对下一状态的估计', color: 'teal', text: '用估计代替“还没发生的未来”，所以每一步都能更新，不必等 episode 结束。$s_{t+1}$ 是终止状态时，这一项**按定义取 0**。' },
      { key: 'v', label: '当前状态的估计 V_w(s_t)', color: 'blue', text: '充当 baseline：同一个状态的“平常水平”。' },
      { key: 'd', label: 'TD error δ_t', color: 'red', text: '“结果比 critic 预期好多少”。critic 准确时 $\\mathbb E[\\delta_t\\mid s,a]=A^\\pi(s,a)$，所以它是 advantage 的一个样本。' },
      { key: 'theta', label: 'actor 更新', color: 'orange', text: '$g_t=\\nabla_\\theta\\log\\pi_\\theta(a_t\\mid s_t)$。δ>0：提高刚才那个动作的概率；δ<0：降低。' },
      { key: 'w', label: 'critic 更新', color: 'green', text: '就是 W9 的半梯度 TD(0)：把 $V_{\\mathbf w}(s_t)$ 往 TD target 推。tabular 时为 $V(s_t)\\leftarrow V(s_t)+\\beta\\delta_t$。' }
    ]
  };
  root.RL.content.add([
  /* ------------------------------------------------------------------ c29 */
  {
    id: 'c29', part: 'p8', title: 'Policy-based 方法的局限：机器人例子', en: 'Limitations of REINFORCE: variance and saturation',
    summary: 'REINFORCE 只用 return $G_t$ 当学习信号。课件的“机器人例子”说明：当所有回报都是很大的正数（101 / 99）时，第一次采样到的动作会被猛推；如果碰巧先选到较差的 B，policy 一步就**饱和**在 B 上；把奖励换成 +1 / −1（只保留差值）后学习变得稳定。这引出下一个问题：能否系统地把回报“减去一个参照值”？',
    goals: ['说出两张 sample-efficiency 图的结论：确定性 Aliased Gridworld 中 REINFORCE 更好；打滑 Gridworld 中 Q-learning 快得多', '手算机器人 E1、E2、E101 的偏好与概率', '解释饱和：为什么 π≈1 以后更新几乎停止', '说明 101/99 与 +1/−1 两个版本的期望更新相同、单次更新大小完全不同'],
    prereq: '第 27 章（Tabular REINFORCE）',
    what: R`
**回顾：两大类方法（W10-2 slide 3）**

- **Value-based RL**：学价值函数，再由它导出 policy。tabular：MC control、TD control（SARSA、Q-learning）；近似：线性函数近似。
- **Policy-based RL**：直接学 policy。tabular：tabular REINFORCE（每个特征对应一个状态—动作对的特例）；近似：REINFORCE。

**机器人例子（Robot example）**

- 状态 $S=\{s_0,s_{t1},s_{t2}\}$，只有 $s_0$ 需要决策；$s_{t1}$、$s_{t2}$ 是终止状态。
- 动作 $A=\{A,B\}$，确定性：$p(s_{t1}\mid s_0,A)=p(s_{t2}\mid s_0,B)=1$。
- 奖励 $r(s_0,A,s_{t1})=101$，$r(s_0,B,s_{t2})=99$。所以 **A 才是更好的动作**。
- 每条 episode 只有一步，$G_0$ 就等于这一步的奖励；偏好 $h(s_0,A)=h(s_0,B)=0$ 起步，policy 是两者的 softmax，$\alpha=0.1$。

两个动作时 softmax 可以写成 $\pi(A\mid s_0)=\dfrac{1}{1+e^{\,h(s_0,B)-h(s_0,A)}}$——只取决于两个偏好的**差**。
`,
    why: R`
**问题从哪里来：两张 sample-efficiency 图（W10-2 slides 4–5）**

| 环境 | 结果（读自图） | 说明了什么 |
|---|---|---|
| Aliased Gridworld（两个不同位置看起来一样，policy 只能对它们用同一个动作分布），动作确定 | REINFORCE 约 1–2 万次转移后接近 0.77（平衡随机 policy）；Q-learning 停在 0.54（最好的确定性 policy） | 状态混叠时，能学随机 policy 的方法赢 |
| 课程 4×3 Gridworld，动作打滑 0.8/0.1/0.1 | Q-learning 几千次转移就到约 0.48–0.5；REINFORCE 要约 3 万次转移才追上，最终两者都接近最优值 0.545 | 普通 MDP 中，REINFORCE 学得慢得多 |

图中的“Optimal value”约 0.545，正是从 $s_1$ 出发的最优价值 $V^*(s_1)=0.5452$。

为什么 REINFORCE 慢？Sutton & Barto 的说法是：作为 Monte Carlo 方法，REINFORCE “may be of high variance and thus produce slow learning”。机器人例子把这个问题放大到一眼就能看出来。
`,
    intuition: R`
**学习信号的“绝对大小”在起作用，而不是“A 比 B 好多少”**

原题中 $G_0$ 不是 101 就是 99，**永远是一个约 100 的正数**。REINFORCE 的规则是“回报为正就强化被选动作”，所以：

1. **第一次碰巧选了 B**（概率 0.5）：增量 $0.1\times99\times0.5=4.95$，偏好变成 $(-4.95,+4.95)$，差为 9.9，$\pi(B)\approx0.99995$。一次更新就几乎把 policy 定死在**较差**的动作上。
2. **饱和（saturation）**：之后再选 B，梯度项 $1-\pi(B)\approx0.00005$，每次只动 $0.1\times99\times0.00005\approx0.0005$。100 条 episode 之后偏好也只到 $\pm4.9969$。
3. **A 几乎不会被采样到**：每条 episode 选 A 的概率约 0.00005，100 条里一次都选不到 A 的概率约 $0.99995^{100}\approx0.995$。不采样到 A，就永远不知道 A 更好。
4. **人工强制选一次 A**（E101，$G_0=101$）：被选动作 A 的梯度项是 $1-0.00005\approx0.99995$，增量约 $0.1\times101\times1=10.1$，偏好一下子翻到 $(+5.10,-5.10)$，$\pi(A)\approx0.99996$。一条样本就让 policy 从一个极端跳到另一个极端。（“强制选某个动作”只是为了演示更新的算术：动作不是按当前 policy 抽样的，所以这些强制更新不能当作普通 REINFORCE 的梯度样本来理解。）课件中“强制 B、A、B、A …交替”的图里，偏好在 ±8 左右来回摆动，说明更新完全被单条样本支配。

**把奖励换成 +1 / −1** 后：选 B 得到 $G_0=-1$，B 的偏好**下降**、A 的上升；选 A 得到 $+1$，A 的偏好上升。无论采样到哪个动作，更新方向都是“往 A 走”。一开始（$\pi=(0.5,0.5)$）每步正好 0.05；之后幅度随 policy 变化——选 A（$G_0=+1$）时 $\Delta h(s_0,A)=0.1\times1\times(1-\pi(A))$；选 B（$G_0=-1$）时 $\Delta h(s_0,A)=0.1\times(-1)\times(0-\pi(A))=0.1\,\pi(A)$。随着 $\pi(A)$ 变大，前者越来越小；B 也越来越少被选到。每步都很小，曲线平稳上升（课件的一次运行：100 条中 86 次选 A，最终 $h=\pm1.86$，$\pi(A)=0.9765$）。
`,
    math: R`
**两个动作时的 score function**：$\log\pi(a\mid s_0)=h(s_0,a)-\log\big(e^{h(s_0,A)}+e^{h(s_0,B)}\big)$，所以
$$\frac{\partial\log\pi(a\mid s_0)}{\partial h(s_0,j)}=\mathbb 1\{j=a\}-\pi(j\mid s_0).$$
两个分量互为相反数：被选动作 $+\big(1-\pi(a)\big)$，另一个动作 $-\pi(\text{另一个})=-(1-\pi(a))$。

**两个版本的期望更新完全相同**（在 $h=(0,0)$，$\pi=(0.5,0.5)$ 时算 $\mathbb E[\Delta h(s_0,A)]$，两个动作各以 0.5 的概率被选中）：

| 奖励 | 选 A（概率 0.5） | 选 B（概率 0.5） | 期望 $\Delta h(s_0,A)$ |
|---|---|---|---|
| 101 / 99 | $0.1\times101\times(+0.5)=+5.05$ | $0.1\times99\times(-0.5)=-4.95$ | $0.5\times5.05+0.5\times(-4.95)=\mathbf{0.05}$ |
| +1 / −1 | $0.1\times1\times(+0.5)=+0.05$ | $0.1\times(-1)\times(-0.5)=+0.05$ | $\mathbf{0.05}$ |

**平均**往哪个方向走、走多远，两者一模一样（都朝 A，0.05）；区别在于**单次**更新：101/99 版本每次是 +5.05 或 −4.95，围绕均值剧烈摆动（方差大）；+1/−1 版本在这一点上每次都是 +0.05（方差为 0）。+1/−1 正好是原奖励整体减去 100——减去一个与动作无关的常数不改变期望梯度，只改变方差。下一章把这个“常数”换成可以学习的 baseline。
`,
    formulas: [ROBOT_UPDATE],
    example: R`
**课件的逐步计算（原奖励 101 / 99，α = 0.1）**

| episode | 选的动作，$G_0$ | 旧 $\pi(A),\pi(B)$ | 梯度项 $(\partial/\partial h_A,\ \partial/\partial h_B)$ | 新 $h(s_0,A),h(s_0,B)$ | 新 $\pi(A)$ |
|---|---|---|---|---|---|
| E1 | B，99 | 0.5，0.5 | $(0-0.5,\ 1-0.5)=(-0.5,+0.5)$ | $(-4.95,\ +4.95)$ | $\dfrac{1}{1+e^{9.9}}\approx0.00005$ |
| E2 | B，99 | 0.00005，0.99995 | $(-0.00005,\ +0.00005)$ | $(-4.950495,\ +4.950495)$ | ≈0.00005 |
| E3–E100 | 都是 B（按 policy 采样） | ≈0.00005，≈0.99995 | 几乎为 0 | $(-4.9969,\ +4.9969)$ | ≈0.00005 |
| E101 | **强制** A，101 | 0.00005，0.99995 | $(1-0.00005,\ 0-0.99995)=(+0.99995,-0.99995)$ | $(+5.102614,\ -5.102614)$ | $\dfrac{1}{1+e^{-10.205}}\approx0.99996$ |

逐项核对 E1：$h_{\text{new}}(s_0,A)=0+0.1\times99\times(-0.5)=-4.95$；$h_{\text{new}}(s_0,B)=0+0.1\times99\times(+0.5)=+4.95$。E101：$-4.9969+0.1\times101\times0.99995\approx-4.9969+10.0995\approx5.1026$。

（课件 E2 的 $-4.950495$ 是用四舍五入后的 0.00005 算的；用未取整的 $\pi(A)=0.0000502$ 得到 $-4.950497$，差别只在第 6 位小数。）

**改成 +1 / −1 的 E1**：选 B，$G_0=-1$。$h(s_0,A)=0+0.1\times(-1)\times(-0.5)=+0.05$，$h(s_0,B)=0+0.1\times(-1)\times(+0.5)=-0.05$；$\pi(A)=\dfrac{e^{0.05}}{e^{0.05}+e^{-0.05}}\approx0.525$。选了 B，却是 A 的概率上升——因为 B 的回报是负的。
`,
    viz: { id: 'robot', props: { rewards: 'orig', base: 'none' }, guide: R`
**怎么用**：

1. 奖励选“A = 101, B = 99”，baseline 选“无”。点一次“强制选 B”：核对表中的 −4.95 / +4.95 和 $\pi(A)\approx0.00005$（E1）。再点一次：增量只有 ±0.000497（E2）。
2. 点“一直强制 B 到第 100 条”：偏好只从 4.95 挪到 4.9969——饱和（按 policy 采样时，100 条里几乎也全是 B）。然后点“强制选 A”：这正是 E101，偏好一下子翻转成 ±5.1026。
3. Reset 后点“从 B 开始交替 B, A, B, A …”：看偏好曲线在 ±8 左右摆动。
4. 奖励切到“+1 / −1”，Reset 后“采样 100 条”：两条曲线平稳分开，A 越来越常被选。` },
    compare: R`
| | 奖励 101 / 99 | 奖励 +1 / −1 |
|---|---|---|
| 被选动作总被强化？ | 是（$G_0>0$ 永远成立） | 只有 A 被强化；选到 B 时 B 被削弱 |
| $h=(0,0)$ 时的期望 $\Delta h(s_0,A)$ | 0.05 | 0.05（相同） |
| $h=(0,0)$ 时的单次 $\Delta h(s_0,A)$ | +5.05 或 −4.95 | 总是 +0.05 |
| 结果 | 第一步就可能饱和在 B；之后几乎学不动 | 平稳地学到 A |
| 对应的改进 | — | 相当于从回报中减去 100：就是 baseline 的想法 |
`,
    pitfalls: [
      { wrong: 'REINFORCE 学错了，是因为它的梯度估计有偏。', right: '它的期望更新是正确的（两个版本期望都是 +0.05，朝 A）。问题是**方差**：单条样本的更新太大，第一步就把 policy 推到饱和。' },
      { wrong: '选了 B 并拿到正回报，所以 B 一定是好动作。', right: '回报的绝对值不能说明动作好坏。A 给 101、B 给 99，B 的回报虽然为正，却比 A 差。需要和“平常水平”比较。' },
      { wrong: '饱和以后只要多训练几条 episode，就会慢慢改过来。', right: '$\\pi(B)\\approx0.99995$ 时，梯度项 $1-\\pi(B)\\approx0.00005$，A 几乎采样不到；100 条后偏好只从 4.95 变到 4.9969。没有人工干预，要非常久才能学到 A。' },
      { wrong: '把学习率调大就能学得更快。', right: '课件：大学习率可能发散（一次更新就跳到极端），小学习率学得慢。学习率不能解决“信号尺度不对”的问题。' }
    ],
    quiz: [
      { kind: '公式计算', q: '机器人例子：$h(s_0,A)=h(s_0,B)=0$，$\\alpha=0.1$。第一条 episode 选 B，$G_0=99$。更新后 $h(s_0,A)$ 是多少？', answer: -4.95, tol: 0.001, explain: '$A$ 不是被选动作，梯度项 $0-\\pi(A)=-0.5$。$\\Delta h=0.1\\times99\\times(-0.5)=-4.95$，所以 $h(s_0,A)=0-4.95=-4.95$。' },
      { kind: '公式计算', q: '机器人例子：偏好为 $h(s_0,A)=0.05$，$h(s_0,B)=-0.05$。$\\pi(A\\mid s_0)$ 是多少（保留 3 位）？', answer: 0.525, tol: 0.001, h: [0.05, -0.05], rewards: { A: 1, B: -1 }, explain: '$\\pi(A)=1/(1+e^{h_B-h_A})=1/(1+e^{-0.1})\\approx0.525$。只看两个偏好的差 $-0.1$。' },
      { kind: '概念判断', q: '机器人例子在 E1 之后 $\\pi(B\\mid s_0)\\approx0.99995$。E2 再选 B（$G_0=99$），偏好几乎不变，主要原因是？', options: ['$G_0$ 太小', '梯度项 $1-\\pi(B)\\approx0.00005$ 几乎为 0（饱和）', '学习率在第二步自动衰减', 'B 是终止动作'], answer: 1, explain: '$\\Delta h(s_0,B)=0.1\\times99\\times0.00005\\approx0.0005$。信号很大，但被选动作的概率已经接近 1，score function 接近 0。', why: ['$G_0=99$ 和 E1 一样大。', '正确。', '课件中 α 固定为 0.1。', '两个动作都会立即终止；这与更新大小无关。'] },
      { kind: '概念判断', q: '机器人例子在 $\\pi=(0.5,0.5)$ 时，奖励 101/99 与 +1/−1 两个版本的 REINFORCE 更新，下列说法正确的是？', options: ['期望更新相同，单次更新的波动不同', '期望更新不同，单次更新的波动相同', '两者完全相同', '+1/−1 版本的期望更新方向朝 B'], answer: 0, explain: '两者的期望 $\\Delta h(s_0,A)$ 都是 0.05（朝 A）。101/99 版本每次是 +5.05 或 −4.95；+1/−1 版本每次都是 +0.05。减去与动作无关的常数 100 只降低方差。' },
      { kind: '算法比较', q: '在动作打滑（0.8/0.1/0.1）的课程 4×3 Gridworld 中，课件的 sample-efficiency 图显示？', options: ['REINFORCE 比 Q-learning 快得多', 'Q-learning 很快接近最优值，REINFORCE 要约 3 万次转移才追上', 'Q-learning 永远停在 0.54', '两者都学不到最优值'], answer: 1, explain: 'Q-learning 几千次转移就到约 0.48–0.5；REINFORCE 约 3 万次转移才接近最优值 0.545。停在 0.54 的是 Aliased Gridworld 中的 Q-learning。', ctx: false }
    ],
    source: 'W10-2 slides 3–23（回顾 value-based vs policy-based、两张 sample-efficiency 图、Sutton & Barto 引文、机器人例子 E1/E2/E100/E101、偏好曲线、+1/−1 版本 E1 与 100 条结果、value-based vs policy-based 总结）。'
  },
  /* ------------------------------------------------------------------ c30 */
  {
    id: 'c30', part: 'p8', title: 'REINFORCE with baseline', en: 'Baselines and the advantage signal',
    summary: '把学习信号从 $G_t$ 换成 $G_t-b(S_t)$：只依赖状态的 baseline 不改变期望梯度，却能大幅降低方差。baseline 可以给定，也可以学习（$b(s)=V(s)$，用 MC 更新）。机器人例子显示：learned baseline 从 0 开始，第一步仍然会饱和，之后才逐渐把信号从 99 降到接近 0。',
    goals: ['写出 REINFORCE with baseline 与 baseline 的更新式', '证明与动作无关的 baseline 不改变期望梯度', '手算 learned baseline 的 E1、E2（δ = 99 → 89.1，b = 9.9 → 18.81）', '推出 $b_{100}=99(1-0.9^{100})$，并解释为什么它趋于 99 而不是 100'],
    prereq: '第 15、29 章',
    what: R`
**REINFORCE with baseline（W10-2 slide 25）**：在原来的 REINFORCE 上加一个 baseline $b(s_t)$，用来降低 policy gradient 估计的方差。

- 更新用 $G_t-b(s_t)$ 代替 $G_t$。课件称 $G_t-b(s_t)$ 为 advantage（优势）：这次的结果比这个状态的“平常水平”好多少。
- baseline 可以**给定**（例如一个启发式函数）：这时仍是纯 policy-based RL。
- baseline 也可以**学习**：
  - tabular：$b(s_t)=V(s_t)$，更新 $V(s_t)\leftarrow V(s_t)+\alpha\big(G_t-V(s_t)\big)$；
  - 函数近似：$b(s_t)=V_{\mathbf w}(s_t)$，同样向 $G_t$ 更新，改的是参数：$\mathbf w\leftarrow\mathbf w+\beta\big(G_t-V_{\mathbf w}(s_t)\big)\nabla_{\mathbf w}V_{\mathbf w}(s_t)$（课件两处步长都写 α）。
- 课件留的问题：学习 baseline 以后，它还算 policy-based，还是 actor-critic？——课件在介绍 actor-critic 时把 “REINFORCE with baseline” 列为例子（learned $V$ 就是 critic）；同时强调这个 critic **不 bootstrap**（target 是完整的 $G_t$）。有些教材（如 Sutton & Barto）只把会 bootstrap 的评价器称为 critic，因此不把它算作 actor-critic；考试以课件为准。

**机器人例子中的完整规则（slide 26）**：$h(s_0,A)=h(s_0,B)=0$，$b(s_0)=0$，$\alpha=\beta=0.1$，按 softmax 采样。
$$\delta=G_0-b_{\text{old}}(s_0),\qquad h_{\text{new}}(s_0,j)=h_{\text{old}}(s_0,j)+\alpha\delta\big[\mathbb 1\{j=a\}-\pi_{\text{old}}(j\mid s_0)\big],\qquad b_{\text{new}}(s_0)=b_{\text{old}}(s_0)+\beta\delta$$
两个偏好都用**旧** baseline 和**旧**概率；baseline 也从同一条已结束的 episode 学习。
`,
    why: R`
**为什么减 baseline 不会把梯度带偏**：在任一状态 $s$，只要 $b(s)$ 不依赖所选动作，
$$\mathbb E_{A\sim\pi}\big[b(s)\,\nabla\log\pi(A\mid s)\big]=b(s)\sum_a\pi(a\mid s)\frac{\nabla\pi(a\mid s)}{\pi(a\mid s)}=b(s)\,\nabla\sum_a\pi(a\mid s)=b(s)\,\nabla1=0.$$
所以 $\mathbb E\big[(G_t-b)\nabla\log\pi\big]=\mathbb E\big[G_t\nabla\log\pi\big]$：**期望梯度不变**。tabular 时也能直接验证：固定被求导的偏好分量 $j$，对**采样到的动作** $a$ 按 $\pi(a)$ 加权求和，$\sum_a\pi(a)\big[\mathbb 1\{j=a\}-\pi(j)\big]=\pi(j)-\pi(j)\sum_a\pi(a)=\pi(j)-\pi(j)=0$。

**为什么通常能降低方差**：要看的是整个更新量 $(G_t-b)\nabla\log\pi$ 的方差，而不只是 $G_t$。当回报整体偏离 0 很远时（如机器人的约 100），不减 baseline 的更新量主要由这个“整体偏移”决定，忽大忽小；选一个接近这个状态平均回报 $v^\pi(s)=\mathbb E[G_t\mid S_t=s]$ 的 $b(s)$，$G_t-b(s)$ 有正有负、数值小：比平常好的动作被强化，比平常差的被削弱。这是“通常”而不是“保证”：某些 policy 和奖励下，减去准确的 $v^\pi$ 反而可能让方差变大；期望不变则是一定成立的。机器人例子中给定 $b=100$，信号从 101/99 变成 +1/−1：选 A 得 +1（A 被强化），选 B 得 −1（B 被削弱），无论采样到哪个动作都朝 A 走。一开始（$\\pi(A)=0.5$）每步正好 0.05，之后幅度随 policy 和所选动作变化：选 A 时 $\\Delta h_A=0.1\\,(1-\\pi(A))$，选 B 时 $\\Delta h_A=0.1\\,\\pi(A)$（例如 $\\pi(A)=0.9$ 时分别是 0.01 和 0.09），都很小，学习平稳。

**如果 baseline 依赖动作**（例如 $b=Q(s,a)$），上面的求和里 $b$ 不能提到外面，$\mathbb E[b(s,A)\nabla\log\pi(A\mid s)]$ 一般不再为 0，期望梯度可能被改变——这时需要另外的论证。actor-critic 中常见的 $Q(s,a)-V(s)$ 没有这个问题：被减掉的 $V(s)$ 仍然只依赖状态。
`,
    intuition: R`
**learned baseline 的“慢热”**：baseline 从 0 开始，第一条 episode 的 $\delta=99-0=99$，和不带 baseline 时完全一样，所以**第一步照样饱和**到 B。之后 baseline 逐渐学到“这里平常能拿 99”，$\delta$ 从 99 降到 89.1、80.19……越来越接近 0，后面的更新越来越小。

但这时 $\pi(B)$ 已经 ≈0.99995：A 依然几乎采样不到，baseline 也就只学到“选 B 时的平均回报 99”，而不是两个动作混合时的 100。**baseline 不能立刻撤销已经发生的饱和**；它降低的是以后更新的波动。课件也提醒：这只是一次采样运行，不是一般的收敛或性能结论。
`,
    math: R`
**learned baseline 的闭式解**（每条 episode 都选 B，$G_0=99$，$\beta=0.1$）：
$$b_k=b_{k-1}+0.1(99-b_{k-1})\ \Longrightarrow\ 99-b_k=0.9\,(99-b_{k-1})\ \Longrightarrow\ 99-b_k=0.9^k(99-b_0).$$
$b_0=0$，所以 $b_k=99(1-0.9^k)$：$b_1=9.9$，$b_2=18.81$，$b_{100}=99(1-0.9^{100})\approx98.997370$。

这里的 $0.9$ 是 $1-\beta$，**不是**折扣因子 γ。baseline 是在估计“当前 policy 下 $s_0$ 的平均回报”：policy 几乎总选 B，所以目标是 99。$b=100$ 是 0.5/0.5 policy 下的平均值，baseline 不会自动“知道”它。

**每一步的 δ**：$\delta_k=99-b_{k-1}=99\times0.9^{k-1}$：99、89.1、80.19、…，第 100 条约 0.0029。
`,
    formulas: [BASELINE, BASELINE_LEARN],
    example: R`
**课件的逐步计算（原奖励 101 / 99，learned baseline，α = β = 0.1）**

| episode | 选的动作，$G_0$ | $b_{\text{old}}$ | $\delta=G_0-b_{\text{old}}$ | 旧 $\pi(A)$ | 新 $h(s_0,A),h(s_0,B)$ | 新 $b$ |
|---|---|---|---|---|---|---|
| E1 | B，99 | 0 | 99 | 0.5 | $(-4.95,\ +4.95)$ | 9.9 |
| E2 | B，99 | 9.9 | 89.1 | 0.0000501722 | $(-4.950447034,\ +4.950447034)$ | 18.81 |
| E100 | 全部 100 条都选 B | — | — | — | $(-4.954451384,\ +4.954451384)$ | 98.997370 |

逐项核对：

- **E1**：$\nabla_h\log\pi(B\mid s_0)=(0-0.5,\ 1-0.5)=(-0.5,+0.5)$。$h(s_0,A)=0+0.1\times99\times(-0.5)=-4.95$，$h(s_0,B)=+4.95$。和不带 baseline 的 E1 **完全相同**，因为 baseline 初值是 0。$b=0+0.1\times(99-0)=9.9$。新概率 $\pi(A)=e^{-4.95}/(e^{-4.95}+e^{4.95})\approx0.0000501722$。
- **E2**：$\delta=99-9.9=89.1$。梯度项用旧概率 $(-0.0000501722,+0.0000501722)$。$h(s_0,A)=-4.95+0.1\times89.1\times(-0.0000501722)\approx-4.950447034$。$b=9.9+0.1\times(99-9.9)=18.81$。baseline 把 policy 的更新信号从 99 降到了 89.1。新 $\pi(A)=1/(1+e^{9.900894068})\approx0.0000501273$。
- **E100**：$\pi(A)\approx0.0000497275$；与不带 baseline 的 $\pm4.9969$ 相比，偏好只到 $\pm4.9545$——后面的更新更小了，但 policy 仍然饱和在 B。
`,
    viz: { id: 'robot', props: { rewards: 'orig', base: 'learned' }, guide: R`
**怎么用**：

1. baseline 选“learned b(s0)，初值 0”。点“强制选 B”两次：核对 δ = 99 → 89.1，b = 9.9 → 18.81，以及 E2 的 −4.950447。
2. 再点“采样 100 条”：b 逐渐接近 99，偏好几乎不变（饱和没有被撤销）。
3. baseline 切到“给定 b = 100”，Reset 后“采样 100 条”：信号变成 +1 / −1，学习平稳地走向 A——和把奖励换成 +1 / −1 的效果一样。
4. 对比“learned”与“给定”两条偏好曲线：baseline 的价值取决于它**何时**变准。` },
    compare: R`
| | REINFORCE | REINFORCE + 给定 baseline | REINFORCE + learned baseline |
|---|---|---|---|
| actor 信号 | $G_t$ | $G_t-b(S_t)$ | $G_t-V(S_t)$ |
| 额外学习的东西 | 无 | 无 | $V(s)$（MC 目标 $G_t$） |
| 期望梯度 | 正确 | 与左边相同 | 与左边相同（$V$ 不依赖动作） |
| 方差 | 回报整体偏移大时很大 | 取决于 $b$ 选得好不好 | 通常随着 $V$ 变准而降低（不保证） |
| 更新时机 | episode 结束 | episode 结束 | episode 结束 |
| 是否 bootstrap | 否 | 否 | 否 |
| 课件归类 | policy-based | policy-based | 列为 actor-critic 的例子 |
`,
    pitfalls: [
      { wrong: '减去 baseline 会让梯度估计有偏。', right: '只要 $b$ 只依赖状态、不依赖所选动作，$\\mathbb E[b\\,\\nabla\\log\\pi]=b\\nabla\\sum_a\\pi=0$，期望不变。' },
      { wrong: 'learned baseline 能立刻修复机器人例子的饱和。', right: 'baseline 从 0 开始，E1 的更新和不带 baseline 完全一样，第一步就饱和到 B。baseline 需要经验才会变得有用。' },
      { wrong: '$b_{100}$ 趋于 100，因为两个动作的平均奖励是 100。', right: '它估计的是**当前 policy** 下的平均回报。policy 几乎总选 B，所以趋于 99：$b_{100}=99(1-0.9^{100})$。' },
      { wrong: '$b_{100}=99(1-0.9^{100})$ 中的 0.9 是折扣因子 γ。', right: '0.9 是 $1-\\beta$：每次更新后与目标 99 的差缩小为原来的 0.9 倍。机器人例子只有一步，没有折扣。' },
      { wrong: 'learned baseline 用 $r+\\gamma V(s\')$ 更新，所以它是 TD。', right: '课件的 learned baseline 用完整回报 $G_t$ 更新（Monte Carlo），不 bootstrap；用 $r+\\gamma V(s\')$ 的是 TD actor–critic。' }
    ],
    quiz: [
      { kind: '公式计算', q: '机器人例子，learned baseline，$\\beta=0.1$。E1 后 $b(s_0)=9.9$。E2 选 B，$G_0=99$。E2 的 $\\delta$ 是多少？', answer: 89.1, tol: 0.001, explain: '$\\delta=G_0-b_{\\text{old}}(s_0)=99-9.9=89.1$。用的是更新前的 baseline。' },
      { kind: '公式计算', q: '机器人例子，learned baseline，$\\beta=0.1$。E2 开始时 $b(s_0)=9.9$，E2 选 B 得 $G_0=99$。E2 之后 $b(s_0)$ 是多少？', answer: 18.81, tol: 0.001, explain: '$b_{\\text{new}}=9.9+0.1\\times89.1=18.81$。' },
      { kind: '公式计算', q: '机器人例子，learned baseline 从 0 开始，$\\beta=0.1$，每条 episode 都选 B 得 99。第 3 条 episode 之后 $b(s_0)$ 是多少？', answer: 26.829, tol: 0.001, explain: '$b_k=99(1-0.9^k)$，$b_3=99\\times(1-0.729)=26.829$。也可以逐步算：$18.81+0.1\\times(99-18.81)=26.829$。' },
      { kind: '概念判断', q: '下列哪个 baseline **不能一般地保证** policy gradient 的期望不变？', options: ['$b(s)=0$', '$b(s)=V(s)$ 的任意估计', '$b(s,a)$：依赖所选动作的函数', '$b(s)=100$'], answer: 2, explain: '证明中把 $b(s)$ 提到 $\\sum_a$ 外面才得到 0；依赖动作时不能提出来，$\\mathbb E[b(s,A)\\nabla\\log\\pi]$ 一般不为 0。', why: ['常数 0 当然不改变。', '任何只依赖状态的函数都不改变期望，不管它准不准。', '正确。', '常数也只依赖状态。'] },
      { kind: '概念判断', q: '机器人例子中，learned baseline 的第一次更新为什么和不带 baseline 的 REINFORCE 完全相同？', options: ['因为 α = β', '因为 baseline 初值为 0，δ = G₀ − 0 = G₀', '因为只有两个动作', '因为第一次选的是 B'], answer: 1, explain: '课件 slide 27：“The first policy update is identical to REINFORCE without a baseline, because the baseline starts at zero.”' }
    ],
    source: 'W10-2 slides 25–32（REINFORCE with baseline、tabular / 近似的 baseline 更新、learned baseline 规则、E1/E2/E100、偏好曲线与说明）、43（“与动作无关的 baseline 保持期望梯度”）。'
  },
  /* ------------------------------------------------------------------ c31 */
  {
    id: 'c31', part: 'p8', title: 'Actor-Critic 方法', en: 'Q actor–critic, A2C, TD / n-step / TD(λ) actor–critic',
    summary: '**Actor** 是 policy，负责选动作；**critic** 是价值函数，负责评价 actor 的动作。不同的 actor-critic 方法只在“用什么评价信号乘 score function”上不同：$Q_w$、$Q_w-V_w$、TD error $\\delta_t$、n-step 优势、或带资格迹的 δ。共同模式：**policy 更新 = 学习率 × 评价信号 × policy score gradient**。',
    goals: ['说清 actor 与 critic 各是什么（tabular 与近似）', '写出 Q actor–critic、A2C、TD actor–critic 的更新式并比较信号', '解释为什么 $\\mathbb E[\\delta_t\\mid s,a]=A^\\pi(s,a)$', '说明 n-step 与 TD(λ) actor–critic 如何在 MC 与一步 TD 之间折中', '在 Gridworld 上手算一次 TD actor–critic 更新'],
    prereq: '第 17、19、24、30 章',
    what: R`
**Actor-critic 方法**结合 value-based 与 policy-based 的优点（W10-2 slide 34）：

- **Actor** 是 policy 函数，负责选动作。tabular：softmax 偏好 $h(s,a)$；近似：$\pi_\theta(a\mid s)$。
- **Critic** 是价值函数，负责评价 actor 选的动作。tabular：$V(s)$ 或 $Q(s,a)$；近似：$V_{\mathbf w}(s)$ 或 $Q_{\mathbf w}(s,a)$。
- 例子：REINFORCE with baseline、A2C 等。

记号：$g_t=\nabla_\theta\log\pi_\theta(a_t\mid s_t)$（score function）。课件用 continuing-task 的写法；episodic、从起点计时的严格版本还要给 actor 的 $g_t$ 乘上 $\gamma^t$。

**从 learned baseline 到 bootstrapped critic（slide 35）**

| | REINFORCE with baseline | TD actor–critic |
|---|---|---|
| Target | $G_t$ | $r_{t+1}+\gamma V_{\mathbf w}(s_{t+1})$ |
| 信号 | $G_t-V_{\mathbf w}(s_t)$ | $\delta_t$ |
| 更新时机 | episode 结束 | 每一个 transition |

learned 的 Monte Carlo baseline 本身不 bootstrap。机器人例子的 episode 一步就终止：$G_0=r_1$，而下一状态 $S_1\in\{s_{t1},s_{t2}\}$ 是终止状态，终止后没有未来奖励，价值按定义为 0，所以两个信号恰好相同；episode 更长时才看得出区别。

**Q actor–critic（slide 36）**：critic 用 on-policy 的 SARSA target 估计 $Q^{\pi_\theta}$。采样 $a_{t+1}\sim\pi_\theta(\cdot\mid s_{t+1})$：
$$\delta^Q_t=r_{t+1}+\gamma Q_{\mathbf w}(s_{t+1},a_{t+1})-Q_{\mathbf w}(s_t,a_t),\qquad \underbrace{\theta\leftarrow\theta+\alpha\,Q_{\mathbf w}(s_t,a_t)\,g_t}_{\text{actor}},\qquad \underbrace{\mathbf w\leftarrow\mathbf w+\beta\,\delta^Q_t\,\nabla_{\mathbf w}Q_{\mathbf w}(s_t,a_t)}_{\text{critic}}$$
actor 的信号是 critic 的动作价值估计；两个更新都用**旧**参数计算；终止时下一状态的 bootstrap 项取 0。

**Advantage actor–critic（A2C，slide 37）**：把动作价值以当前 policy 的状态价值为中心：
$$V_{\mathbf w}(s)=\sum_b\pi_\theta(b\mid s)Q_{\mathbf w}(s,b),\qquad A_{\mathbf w}(s,a)=Q_{\mathbf w}(s,a)-V_{\mathbf w}(s),\qquad \theta\leftarrow\theta+\alpha\,A_{\mathbf w}(s_t,a_t)\,g_t$$

**TD actor–critic（slide 38）**：只学一个状态价值 critic，用它的 TD error 同时训练 actor 和 critic：
$$\delta_t=r_{t+1}+\gamma V_{\mathbf w}(s_{t+1})-V_{\mathbf w}(s_t),\qquad \theta\leftarrow\theta+\alpha\,\delta_t\,g_t,\qquad \mathbf w\leftarrow\mathbf w+\beta\,\delta_t\,\nabla_{\mathbf w}V_{\mathbf w}(s_t)$$
episode 终止时 $V_{\mathbf w}(s_{t+1})=0$。

**n-step actor–critic（slide 39）**：用几步真实奖励再接一个 bootstrap 值：
$$G^{(n)}_t=\sum_{k=0}^{n-1}\gamma^kr_{t+k+1}+\gamma^nV_{\mathbf w}(s_{t+n}),\qquad \hat A^{(n)}_t=G^{(n)}_t-V_{\mathbf w}(s_t),\qquad \theta\leftarrow\theta+\alpha\hat A^{(n)}_tg_t,\qquad \mathbf w\leftarrow\mathbf w+\beta\hat A^{(n)}_t\nabla_{\mathbf w}V_{\mathbf w}(s_t)$$
$n=1$ 就是一步 TD actor–critic；遇到终止就停在终止处，不加 bootstrap 值（$n$ 达到或超过剩余步数时，$G^{(n)}_t$ 就是完整回报 $G_t$）。

**TD(λ) actor–critic（slide 40）**：用资格迹（eligibility traces）把当前的 δ 也分给更早的决策：
$$e^V_t=\gamma\lambda_Ve^V_{t-1}+\nabla_{\mathbf w}V_{\mathbf w}(s_t),\quad e^\pi_t=\gamma\lambda_\pi e^\pi_{t-1}+g_t,\quad \delta_t=r_{t+1}+\gamma V_{\mathbf w}(s_{t+1})-V_{\mathbf w}(s_t),\quad \mathbf w\leftarrow\mathbf w+\beta\delta_te^V_t,\quad \theta\leftarrow\theta+\alpha\delta_te^\pi_t$$
迹初始化为 0，每个 episode 之间重置；$\lambda_V=\lambda_\pi=0$ 时退化为一步更新。
`,
    why: R`
**为什么要把两者结合（slide 23 的总结）**

| | Value-based | Policy-based |
|---|---|---|
| 做法 | 学价值函数，再导出 policy | 直接学 policy |
| 弱点 | 不能处理很大或连续的动作空间（指本课“枚举所有动作取 argmax”的做法） | 可能慢、不稳定、方差大（如 REINFORCE） |
| 适合 | 贪心 policy 就是最优时（如动作确定、完全可观测） | 大或连续的动作空间；需要随机 policy 时 |

actor-critic 保留 policy-based 的“直接学（随机）policy”，再借 value-based 的价值估计提供一个**更低方差、可以每步更新**的评价信号。

**Q actor–critic 的问题（slide 36 的提问）**：如果所有估计的回报都很大且为正，$Q_{\mathbf w}(s,a)>0$ 能说明 $a$ 比其他动作好吗？——不能。这和不带 baseline 的 REINFORCE 是同一个问题：机器人例子中 $Q(s_0,A)=101$、$Q(s_0,B)=99$，两者都是大正数，选到哪个就强化哪个。A2C 减去 $V$ 后才变成“相对评价”。
`,
    intuition: R`
**为什么 TD error 可以当 advantage 用**：对**准确**的价值函数 $v^\pi$，
$$\mathbb E[\delta_t\mid s_t=s,a_t=a]=\mathbb E\big[r_{t+1}+\gamma v^\pi(s_{t+1})\mid s,a\big]-v^\pi(s)=q^\pi(s,a)-v^\pi(s)=A^\pi(s,a).$$
第一步用了 $q^\pi$ 的 Bellman 定义：在 $s$ 做 $a$，得到即时奖励再按 $\pi$ 继续，期望就是 $q^\pi(s,a)$。所以**一个 TD error 同时训练 actor 和 critic**：critic 用它修正 $V$，actor 用它当“这个动作比平常好多少”的样本。$V_{\mathbf w}$ 有近似误差时，这个优势估计会有偏差。

**偏差—方差折中**（和 W8 的 n-step / TD(λ) 一样）：

- $G_t-V(s_t)$（REINFORCE with baseline）：用完整回报，不依赖 critic 是否准确，但要等 episode 结束，噪声大。
- $\delta_t$（一步 TD）：只用一步真实奖励，其余交给 critic；每步都能更新、噪声小，但 critic 不准时有偏差。
- $\hat A^{(n)}_t$：$n$ 越大，bootstrap 越少、采样噪声越多。

**资格迹的直觉**：$e^\pi_t$ 是最近若干个 score function 的衰减累加。当某一步出现较大的 δ（例如终于到达 +1），不只最后一个动作，之前几步的动作也按 $(\gamma\lambda)^k$ 分到功劳。注意迹是**带正负号的向量**，不是访问次数：例如两个动作、$\gamma\lambda_\pi=0.72$，第 0 步的 score 是 $g_0=(-0.5,0.5)$、第 1 步是 $g_1=(0.5,-0.5)$，则 $e^\pi_1=0.72\,g_0+g_1=(0.14,-0.14)$——前后两步方向相反，大部分相互抵消了。当前的 δ 乘的就是这个累积后的向量。

**课件总结的共同模式**：policy 更新 = 学习率 × 评价信号 × policy score gradient。设计时问三个问题：用什么来评价动作？target 往前看多远？哪些参数得到功劳？
`,
    math: R`
**A2C 中减去 $V$ 不改变期望**：$V_{\mathbf w}(s)$ 只依赖状态，可以提到求和外面：$\mathbb E_a[V_{\mathbf w}(s)\nabla\log\pi(a\mid s)]=V_{\mathbf w}(s)\sum_a\pi(a\mid s)\nabla\log\pi(a\mid s)=V_{\mathbf w}(s)\nabla\sum_a\pi(a\mid s)=V_{\mathbf w}(s)\nabla1=0$。所以 A2C 与 Q actor–critic 的期望 actor 更新相同；当 Q 整体偏离 0 很远时（如机器人的约 100），A2C 的方差通常小得多。

**$V_{\mathbf w}(s)$ 的含义**：$\sum_b\pi(b\mid s)Q(s,b)$ 就是“按当前 policy 选动作时的平均动作价值”，即 $v^\pi(s)=\sum_b\pi(b\mid s)q^\pi(s,b)$。$A(s,a)$ 在 policy 下的平均恒为 0：$\sum_a\pi(a\mid s)A(s,a)=V-V=0$。

**一步 episode 时信号重合**：机器人例子中下一状态 $S_1\in\{s_{t1},s_{t2}\}$ 是终止状态，价值按定义为 0，所以 $\delta_0=r_1+\gamma\cdot0-V(s_0)=G_0-V(s_0)$，与 REINFORCE with baseline 完全相同。

**n-step 的两端**：$n=1$ 时 $G^{(1)}_t=r_{t+1}+\gamma V_{\mathbf w}(s_{t+1})$，$\hat A^{(1)}_t=\delta_t$；$n$ 达到或超过剩余步数时，求和在终止处停下且没有 bootstrap 项，$G^{(n)}_t=G_t$，$\hat A^{(n)}_t=G_t-V_{\mathbf w}(s_t)$，与 REINFORCE with baseline 的信号相同。

**对比表（slide 41）**

| 方法 | 学习的评价 | actor 增量 $\Delta\theta/\alpha$ |
|---|---|---|
| REINFORCE + baseline | MC 训练的 $V_{\mathbf w}$ | $(G_t-V_{\mathbf w}(s_t))\,g_t$ |
| Q actor–critic | $Q_{\mathbf w}$ | $Q_{\mathbf w}(s_t,a_t)\,g_t$ |
| Advantage actor–critic | $Q_{\mathbf w}$ 与状态 baseline | $A_{\mathbf w}(s_t,a_t)\,g_t$ |
| TD actor–critic | $V_{\mathbf w}$ | $\delta_t\,g_t$ |
| n-step actor–critic | $V_{\mathbf w}$ | $\hat A^{(n)}_t\,g_t$ |
| TD(λ) actor–critic | $V_{\mathbf w}$ 与迹 | $\delta_t\,e^\pi_t$ |
`,
    formulas: [TDAC, {
      title: 'Advantage actor–critic（A2C）',
      latex: R`\htmlClass{fx-v}{V_{\mathbf w}(s)=\sum_b\pi_\theta(b\mid s)Q_{\mathbf w}(s,b)},\qquad \htmlClass{fx-a}{A_{\mathbf w}(s,a)=Q_{\mathbf w}(s,a)-V_{\mathbf w}(s)},\qquad \htmlClass{fx-theta}{\theta\leftarrow\theta+\alpha\,A_{\mathbf w}(s_t,a_t)\,g_t}`,
      parts: [
        { key: 'v', label: '当前 policy 下的平均动作价值', color: 'blue', text: '用 actor 的概率给 critic 的 Q 加权平均，得到这个状态的“平常水平”。机器人：$0.5\\times101+0.5\\times99=100$。' },
        { key: 'a', label: 'advantage：比平常好多少', color: 'green', text: '机器人：$A(s_0,A)=+1$，$A(s_0,B)=-1$。这是**相对**评价；环境实际支付的仍是 101 / 99。critic 不准时，不一定立刻得到这些值。' },
        { key: 'theta', label: 'actor 更新', color: 'orange', text: '$A>0$ 的动作被强化，$A<0$ 的被削弱。期望与 Q actor–critic 相同（减去的 $V$ 只依赖状态）；Q 整体偏离 0 很远时，方差通常小得多。完整算法里 critic 的 $Q_{\\mathbf w}$ 仍按 Q actor–critic 那样用 on-policy 的 SARSA target 更新：先用旧的 Q 和旧的 policy 算出 V、advantage 和 TD error，再分别更新 actor 和 critic。' }
      ]
    }, {
      title: 'n-step actor–critic',
      latex: R`\htmlClass{fx-g}{G^{(n)}_t=\sum_{k=0}^{n-1}\gamma^kr_{t+k+1}}+\htmlClass{fx-boot}{\gamma^nV_{\mathbf w}(s_{t+n})},\qquad \htmlClass{fx-a}{\hat A^{(n)}_t=G^{(n)}_t-V_{\mathbf w}(s_t)}`,
      parts: [
        { key: 'g', label: 'n 步真实奖励（折扣累加）', color: 'green', text: '实际观察到的部分。若 episode 在 $n$ 步内终止，就只加到终止为止。' },
        { key: 'boot', label: '第 n 步之后交给 critic', color: 'teal', text: '在终止前停下时才有这一项；到达终止状态则省略（取 0）。' },
        { key: 'a', label: 'n-step 优势估计', color: 'red', text: '同时用于 actor（乘 $g_t$）和 critic（乘 $\\nabla_{\\mathbf w}V_{\\mathbf w}(s_t)$）。$n=1$ 时等于 $\\delta_t$。' }
      ]
    }, {
      title: 'TD(λ) actor–critic 的资格迹',
      latex: R`\htmlClass{fx-ev}{e^V_t=\gamma\lambda_Ve^V_{t-1}+\nabla_{\mathbf w}V_{\mathbf w}(s_t)},\qquad \htmlClass{fx-ep}{e^\pi_t=\gamma\lambda_\pi e^\pi_{t-1}+g_t},\qquad \htmlClass{fx-up}{\mathbf w\leftarrow\mathbf w+\beta\delta_te^V_t,\ \ \theta\leftarrow\theta+\alpha\delta_te^\pi_t}`,
      parts: [
        { key: 'ev', label: 'critic 的迹', color: 'blue', text: '最近访问过的状态的价值梯度的衰减累加。tabular 时就是“每个状态最近被访问的衰减计数”。' },
        { key: 'ep', label: 'actor 的迹', color: 'orange', text: '最近若干步 score function 的衰减累加：之前的动作也能分到当前 δ 的功劳，权重 $(\\gamma\\lambda_\\pi)^k$。' },
        { key: 'up', label: '用同一个 δ 乘各自的迹更新', color: 'green', text: '迹在每个 episode 开始时清零。$\\lambda=0$ 时迹只剩当前梯度，退化为一步 TD actor–critic。' }
      ]
    }],
    example: R`
**例 1：机器人例子中的 A2C（准确的 critic，初始 policy）**

$Q(s_0,A)=101$，$Q(s_0,B)=99$，$\pi=(0.5,0.5)$：

| | A | B |
|---|---|---|
| $Q_{\mathbf w}(s_0,\cdot)$ | 101 | 99 |
| $V_{\mathbf w}(s_0)=0.5\times101+0.5\times99$ | 100 | 100 |
| $A_{\mathbf w}=Q-V$ | **+1** | **−1** |
| Q actor–critic 的信号（选到该动作时） | 101（强化） | 99（也强化） |
| A2C 的信号 | +1（强化） | −1（削弱） |

A2C 相当于自动把奖励 101/99 换成了 +1/−1：选到 A 就强化 A，选到 B 就削弱 B，不需要人工改奖励。

**例 2：课程 Gridworld 上的 TD actor–critic（tabular，α = 0.2，β = 0.1，γ = 0.9）**

环境：4×3，起点 $s_1$，$s_{11}$ 终止 +1，$s_7$ 终止 −1，动作按 0.8 / 0.1 / 0.1 打滑（另外两个 0.1 是意图方向的左右两侧），撞墙或出界原地不动，进入格子时给奖励。状态位置：

| | 第 1 列 | 第 2 列 | 第 3 列 | 第 4 列 |
|---|---|---|---|---|
| 上排 | $s_8$ | $s_9$ | $s_{10}$ | $s_{11}$（+1，终止） |
| 中排 | $s_5$ | 墙 | $s_6$ | $s_7$（−1，终止） |
| 下排 | $s_1$（起点） | $s_2$ | $s_3$ | $s_4$ |

开始时所有 $h=0$（四个动作各 0.25），所有 $V=0$。

**第一个非零更新**：前面若干步奖励都是 0，且 $V$ 全为 0，$\delta=0+0.9\times0-0=0$——actor 和 critic 都不动。直到智能体在 $s_{10}$ 选 Right（概率 0.25），以 0.8 的概率进入 $s_{11}$：

- $\delta=1+0.9\times V(s_{11})-V(s_{10})=1+0.9\times0-0=1$。这里 $V(s_{11})=0$ 是因为 $s_{11}$ **是终止状态，按定义取 0**，不是“还没学到”。
- critic：$V(s_{10})\leftarrow0+0.1\times1=0.1$。
- actor：Right 的 $\Delta h=0.2\times1\times(1-0.25)=+0.15$；Up、Down、Left 各 $0.2\times1\times(0-0.25)=-0.05$。新概率 $\pi(\text{Right}\mid s_{10})=\dfrac{e^{0.15}}{e^{0.15}+3e^{-0.05}}\approx0.289$，其余各 ≈0.237。

**信用如何往回传**：假设在这之后、$V(s_{10})$ 和 $V(s_9)$ 都还没有被别的更新改动时（即 $V(s_{10})=0.1$，$V(s_9)=0$），某条 episode 在 $s_9$ 选 Right 并（以 0.8 的概率）进入 $s_{10}$，奖励 0：

- $\delta=0+0.9\times V(s_{10})-V(s_9)=0+0.9\times0.1-0=0.09$（$V(s_9)=0$ 是因为它还没被更新过，是初值，不是“按定义为 0”；$s_{10}$ 不是终止状态，所以用它的估计 0.1）。
- critic：$V(s_9)\leftarrow0.009$；actor：Right 的 $\Delta h=0.2\times0.09\times0.75=+0.0135$，其余各 $-0.0045$。

$s_9$ 的动作没有等 episode 结束，就因为“到了 critic 认为更好的 $s_{10}$”而被强化——这就是 bootstrapping 带来的每步更新。反过来，如果某次在 $s_{10}$ 选 Right 却右滑（意图向右时，右侧是向下）到 $s_6$，则 $\delta=0+0.9\,V(s_6)-V(s_{10})$，在 $V(s_6)$ 还小时为负：这次 Right 被**削弱**，虽然 Right 平均来看是好动作——这就是单步样本的噪声，要靠多次平均消除。
`,
    viz: { id: 'actorcritic', guide: R`
**怎么用**：

1. “三种 actor 信号（机器人）”：默认就是例 1。把 $\pi(A\mid s_0)$ 拖到 0.9，看 $V$ 和优势怎样变化；把 TD critic 的 $V_w(s_0)$ 拖离 100，看 TD 信号怎样跟着偏移（critic 不准 → 优势估计有偏）。
2. “TD actor–critic 逐步看”：连续点 Next Step。前面很多步 δ = 0，直到第一次到达终止格；之后看 $V$ 从 $s_{10}$ 附近往回传，箭头（policy 概率）随之变粗。再点 Run 100 Episodes，看当前 policy 的真实价值 $v^\pi(s_1)$ 随训练上升（最优是 0.5452）。
3. “学习曲线对比”：同样的 α、β、同样的 γᵗ 约定下，比较 REINFORCE、REINFORCE + learned baseline 与 TD actor–critic 的 $v^\pi(s_1)$（10 个种子的均值 ± 标准差）。在这个回报只在 −1 到 1 之间的小 Gridworld 里，三者平均进度相近，TD actor–critic 的种子间波动最小；baseline 的好处要在回报整体偏移很大的情形（机器人例子）才明显。` },
    compare: R`
| | REINFORCE | REINFORCE + baseline | Q actor–critic | A2C | TD actor–critic | n-step / TD(λ) actor–critic |
|---|---|---|---|---|---|---|
| actor 信号（标量） | $G_t$ | $G_t-V(s_t)$ | $Q_{\mathbf w}(s_t,a_t)$ | $Q_{\mathbf w}-V_{\mathbf w}$ | $\delta_t$ | $\hat A^{(n)}_t$ / $\delta_t$ |
| 乘的方向 | $g_t$ | $g_t$ | $g_t$ | $g_t$ | $g_t$ | $g_t$ / 迹 $e^\pi_t$ |
| critic | 无 | $V$（MC） | $Q_{\mathbf w}$（SARSA） | $Q_{\mathbf w}$ | $V_{\mathbf w}$（TD(0)） | $V_{\mathbf w}$（n-step / TD(λ)） |
| bootstrap | 否 | 否 | 是 | 是 | 是 | 是（程度可调） |
| 更新时机 | episode 结束 | episode 结束 | 每步 | 每步 | 每步 | n 步后 / 每步 |
| 信号是否“相对” | 否 | 是 | 否 | 是 | 是 | 是 |

**与 value-based 方法比较**：critic 都用 TD 式误差（target − 估计）更新，但预测对象和 target 不同——Q actor–critic 的 critic 用 SARSA target $r+\gamma Q(s',a')$（$a'$ 按当前 policy 采样），TD actor–critic 的 critic 是 TD(0) 预测 $r+\gamma V(s')$；都**不是** Q-learning 的 $\max$ target。actor-critic 最终交付的是 actor 的（可能随机的）policy，而不是对 Q 取 argmax。
`,
    pitfalls: [
      { wrong: 'Q actor–critic 中 $Q_{\\mathbf w}(s,a)>0$，说明 $a$ 是好动作。', right: '所有回报都是大正数时，所有动作的 Q 都为正。要看相对值：$A=Q-V$。机器人中 $Q(s_0,B)=99>0$，但 $A(s_0,B)=-1$。' },
      { wrong: 'A2C 的 advantage $+1/-1$ 意味着环境奖励变成了 +1/−1。', right: '环境仍然支付 101/99。advantage 是 critic 给出的相对评价，只用于 actor 的更新。' },
      { wrong: 'TD error 永远是 advantage 的无偏估计。', right: '只有 $V$ 是准确的 $v^\\pi$ 时，$\\mathbb E[\\delta_t\\mid s,a]=A^\\pi(s,a)$。$V_{\\mathbf w}$ 有近似误差时会有偏差。' },
      { wrong: '终止状态的 $V(s_{t+1})$ 为 0，是因为还没学到。', right: '终止状态之后没有奖励，按定义 $V=0$；更新时必须把 bootstrap 项设为 0，而不是用表里的任何数。' },
      { wrong: '先更新 critic，再用新的 critic 值计算 actor 的信号。', right: '课件：两个更新都用旧参数计算（同一个 δ）。' },
      { wrong: 'TD(λ) actor–critic 的迹可以跨 episode 保留。', right: '迹初始化为 0，并在每个 episode 之间重置；否则上一个 episode 的动作会错误地分到功劳。' }
    ],
    quiz: [
      { kind: '公式计算', q: '机器人例子：critic 准确，$Q(s_0,A)=101$，$Q(s_0,B)=99$，当前 policy $\\pi(A\\mid s_0)=0.8$。A2C 中 $A_{\\mathbf w}(s_0,B)$ 是多少？', answer: -1.6, tol: 0.001, explain: '$V=0.8\\times101+0.2\\times99=100.6$；$A(s_0,B)=99-100.6=-1.6$。$V$ 随 policy 变化，优势也随之变化。' },
      { kind: '公式计算', q: '课程 Gridworld，tabular TD actor–critic，$\\gamma=0.9$，$\\beta=0.1$。当前 $V(s_9)=0.2$，$V(s_{10})=0.5$。在 $s_9$ 选 Right，到达 $s_{10}$，奖励 0。$\\delta$ 是多少？', answer: 0.25, tol: 0.001, explain: '$\\delta=0+0.9\\times0.5-0.2=0.45-0.2=0.25$。$s_{10}$ 不是终止状态，所以要用它的估计 0.5。' },
      { kind: '公式计算', q: '课程 Gridworld，tabular TD actor–critic（沿用课件的写法，actor 更新不乘 $\\gamma^t$）：在 $s_9$ 选 Right 后算得 $\\delta=0.25$。$s_9$ 的四个动作偏好都为 0（概率各 0.25），$\\alpha=0.2$。Right 的偏好增量是多少？', answer: 0.0375, tol: 0.0001, explain: '$\\Delta h(s_9,\\text{Right})=\\alpha\\,\\delta\\,(1-\\pi)=0.2\\times0.25\\times0.75=0.0375$；其他三个动作各 $0.2\\times0.25\\times(-0.25)=-0.0125$，合计为 0。' },
      { kind: '公式计算', q: '课程 Gridworld，TD actor–critic，$\\gamma=0.9$。在 $s_{10}$ 选 Right 进入终止状态 $s_{11}$（奖励 +1），当前 $V(s_{10})=0.6$，表中 $V(s_{11})$ 存的是 0.3（一个没有用的旧数）。$\\delta$ 是多少？', answer: 0.4, tol: 0.001, explain: '$s_{11}$ 是终止状态，bootstrap 项按定义取 0，与表里存的数无关：$\\delta=1+0.9\\times0-0.6=0.4$。' },
      { kind: '概念判断', q: '为什么对准确的 $v^\\pi$，$\\mathbb E[\\delta_t\\mid s,a]=A^\\pi(s,a)$？', options: ['因为 $\\mathbb E[r_{t+1}+\\gamma v^\\pi(s_{t+1})\\mid s,a]=q^\\pi(s,a)$', '因为 δ 总是为 0', '因为 actor 是 softmax', '因为 γ<1'], answer: 0, explain: '在 $s$ 做 $a$ 后按 π 继续，“即时奖励 + 折扣后的下一状态价值”的期望就是 $q^\\pi(s,a)$，再减去 $v^\\pi(s)$ 得到优势。' },
      { kind: '算法比较', q: 'n-step actor–critic：episode 从时刻 $t$ 起还剩 5 步就终止，取 $n=10$。此时 $\\hat A^{(10)}_t$ 等于？', options: ['$\\delta_t=r_{t+1}+\\gamma V_{\\mathbf w}(s_{t+1})-V_{\\mathbf w}(s_t)$', '$G_t-V_{\\mathbf w}(s_t)$（完整回报，不 bootstrap）', '$\\sum_{k=0}^{9}\\gamma^kr_{t+k+1}+\\gamma^{10}V_{\\mathbf w}(s_{t+10})-V_{\\mathbf w}(s_t)$', '$Q_{\\mathbf w}(s_t,a_t)$'], answer: 1, explain: '求和在终止处停下且没有 bootstrap 项：$G^{(10)}_t=G_t$，$\\hat A_t=G_t-V_{\\mathbf w}(s_t)$，与 REINFORCE with baseline 的信号相同。', why: ['那是 $n=1$；这里用了 5 步真实奖励。', '正确。', '终止后没有 $s_{t+10}$，也没有奖励可加。', '这是 Q actor–critic 的信号。'] },
      { kind: '概念判断', q: '课件总结的共同模式“policy 更新 = ? × ? × ?”是？', options: ['学习率 × 评价信号 × policy score gradient', '学习率 × TD target × Q 值', '奖励 × 折扣 × 概率', '学习率 × 偏好 × 特征'], answer: 0, explain: '各种方法只是“评价信号”不同：$G_t$、$G_t-V$、$Q_{\\mathbf w}$、$A_{\\mathbf w}$、$\\delta_t$、$\\hat A^{(n)}_t$。' }
    ],
    source: 'W10-2 slides 34–44（actor 与 critic、从 learned baseline 到 bootstrapped critic、Q actor–critic、A2C、TD actor–critic、n-step、TD(λ)、对比表、两页总结）、23（value-based vs policy-based 总结）。'
  }
  ]);
})(window);
