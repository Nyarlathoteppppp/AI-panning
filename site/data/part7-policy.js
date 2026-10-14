/* Part 7 · W10 Policy-based approaches. */
(function (root) {
  'use strict';
  const R = String.raw;
  const REINFORCE_TAB = {
    title: 'Tabular REINFORCE 的偏好更新',
    latex: R`\htmlClass{fx-h}{h(S_t,b)}\leftarrow h(S_t,b)+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-disc}{\gamma^{t}}\,\htmlClass{fx-g}{G_t}\,\htmlClass{fx-grad}{\big[\mathbb 1\{b=A_t\}-\pi(b\mid S_t)\big]}\quad\text{对所有 }b\in A(S_t)`,
    parts: [
      { key: 'h', label: '动作偏好 h（被更新的对象）', color: 'blue', text: '不是价值也不是概率；越大越常被选。**同时**更新当前状态的所有动作。' },
      { key: 'lr', label: 'learning rate α', color: 'purple', text: '步长。' },
      { key: 'disc', label: 'γᵗ', color: 'gray', text: '$G_t$ 从时刻 $t$ 重新计时，而目标 $J$ 从 episode 的时刻 0 计时；$\\gamma^t$ 把这一段贡献放回原始时间轴（不是重复打折）。' },
      { key: 'g', label: 'return G_t（学习信号）', color: 'green', text: '这次动作之后实际得到的 discounted return（Monte Carlo）。$G_t>0$：强化被选动作；$G_t<0$：反过来；$G_t=0$：不变。' },
      { key: 'grad', label: '∂log π / ∂h', color: 'orange', text: '被选动作：$1-\\pi(A_t\\mid S_t)>0$，偏好上升；其他动作：$-\\pi(b\\mid S_t)<0$，偏好下降。所有增量之和为 0。' }
    ]
  };
  const REINFORCE = {
    title: 'REINFORCE（Monte Carlo Policy Gradient）',
    latex: R`\htmlClass{fx-theta}{\boldsymbol\theta}\leftarrow\boldsymbol\theta+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-disc}{\gamma^{t}}\,\htmlClass{fx-g}{G_t}\,\htmlClass{fx-grad}{\nabla_{\boldsymbol\theta}\log\pi_{\boldsymbol\theta}(A_t\mid S_t)}`,
    parts: [
      { key: 'theta', label: 'policy 参数 θ', color: 'blue', text: 'tabular 时 θ 就是偏好表 $h(s,a)$；近似时是共享参数。' },
      { key: 'lr', label: 'α', color: 'purple', text: '步长。注意是**加号**：对期望回报做梯度**上升**。' },
      { key: 'disc', label: 'γᵗ', color: 'gray', text: '把从 $t$ 开始计时的 return 放回从 0 开始的时间轴。' },
      { key: 'g', label: 'Monte Carlo return G_t', color: 'green', text: '“这个动作有多好”：用实际 return 估计 $q^{\\pi_\\theta}(S_t,A_t)$。' },
      { key: 'grad', label: '∇ log π（课件叫 policy gradient，也叫 score function）', color: 'orange', text: '沿这个方向改 θ，$A_t$ 在 $S_t$ 的 log 概率上升最快。tabular 时就是 $\\mathbb 1\\{b=A_t\\}-\\pi(b\\mid S_t)$。注意它不是 $\\nabla J$：$\\nabla J$ 是 $\\gamma^tG_t\\nabla\\log\\pi$ 的期望。' }
    ]
  };
  root.RL.content.add([
  /* ------------------------------------------------------------------ c26 */
  {
    id: 'c26', part: 'p7', title: '为什么要直接学 policy', en: 'Value-based vs policy-based',
    summary: 'Value-based 方法先学 Q 再取 argmax，遇到**大或连续的动作空间**和没有**最好的确定性动作**的情况就有困难。Policy-based 方法直接学一个（可以是随机的）policy。',
    goals: ['列出 value-based 方法的两类局限', '用石头剪刀布和 Aliased Gridworld 说明随机 policy 何时必要', '复现 Aliased Gridworld 的数值：确定性 0.542 / 到达率 0.6，随机 0.5/0.5 更好'],
    prereq: '第 6、21、24 章',
    what: R`
**Value-based 方法**：学价值函数 $V(s)$ 或 $Q(s,a)$，再从中导出 policy：$\pi(s)=\arg\max_aQ(s,a)$。

**Policy-based 方法**：**直接**学 policy $\pi(s)$（或 $\pi_\theta(a\mid s)$），能够表示随机 policy。

**回顾：扩展假设之后的两条线**

- 状态空间很大或连续 → 价值函数近似：已知 MDP 近似 $\hat V(s;\mathbf w)$，未知 MDP 近似 $\hat Q(s,a;\mathbf w)$。局限：近似误差可能导致次优 policy；按课件的构造，模型未知时每个动作单独一组权重 $\mathbf w=(\mathbf w_{a_1},\dots,\mathbf w_{a_{|A|}})$（也可以用动作相关的共享特征，课件未展开）。
- **动作空间很大或连续**（且动作效果未知）→ 以前用 $\pi(s)=\arg\max_aQ(s,a)$ 找 policy，动作连续时还能这样做吗？
`,
    why: R`
**Value-based 方法的局限（W10 slide 8；指本课此前使用的“表格 / 枚举所有动作取 argmax”的做法）**

1. 预测动作的价值 $Q(s,a)$：无法处理很大的动作空间，也无法处理连续动作空间。
2. 从价值函数导出 policy $\pi(s)=\arg\max_aQ(s,a)$：无法处理连续动作空间；**如果根本没有最好的动作呢？**

在普通的完全可观测 MDP 中，总存在一个最好的动作（确定性最优 policy，第 6 章）。但如果环境是下面这样呢？
`,
    intuition: R`
**例 1：多人石头剪刀布（no best action — multi-player）**

剪刀赢布、布赢石头、石头赢剪刀。确定性 policy（比如总出石头）有一个固定的克制策略（总出布）；**均匀随机**地出三者是最优的（Nash 均衡（纳什均衡）：任何一方单独改变自己的策略都占不到便宜；只要你偏向某一手，对手就能专门克制它）。注意这里有会思考的对手，已经不是“转移规律固定”的单智能体 MDP。

**例 2：Aliased Gridworld（no best action — partially observed）**

上排五格 w1、g1、w2、g2、w3；w1 和 w3 下方是骷髅（−1），w2 下方是钱袋（+1）。智能体**分不清两个灰格**（它们看起来一样），所以 policy 在两个灰格上必须相同。动作是确定性的：四个动作 Up / Down / Left / Right；向上、出界、灰格向下都原地不动；w1、w3 向下掉进骷髅（−1，终止），w2 向下拿到钱袋（+1，终止）。

- 最好的确定性 policy：两个灰格都向右（或都向左）。无论哪种，**总有一个灰格会卡住**，永远到不了钱袋：都向右时，g2 → w3，而 w3 必须向左回到 g2，于是 g2 ↔ w3 永远来回。
- 最优的随机 policy：$\pi(\text{Right}\mid\text{grey})=0.5$，$\pi(\text{Left}\mid\text{grey})=0.5$。它能以很高的概率在几步之内到达目标。

问题不在于移动本身随机，而在于**输入无法区分需要不同动作的位置**。如果能看到真实位置或记住历史，问题就变了，不能用这个例子证明所有完全可观测 MDP 都需要随机化。
`,
    math: R`
**为什么确定性 policy 只有 0.542**（γ=0.9，起点在五格中均匀分布，灰格都向右，w1 →、w2 ↓、w3 ←）：

| 起点 | 轨迹 | 折扣回报 |
|---|---|---|
| w1 | w1 → g1 → w2 ↓ 钱袋 | $0+0.9\times0+0.81\times1=0.81$ |
| g1 | g1 → w2 ↓ 钱袋 | $0.9$ |
| w2 | w2 ↓ 钱袋 | $1$ |
| g2 | g2 → w3 ← g2 → w3 …（循环） | 0 |
| w3 | w3 ← g2 → w3 …（循环） | 0 |

平均 $J=(0.81+0.9+1+0+0)/5=0.542$；100 步内到达钱袋的概率 $=3/5=0.6$。这正是课件曲线中“Best deterministic policy”的两条虚线（≈0.54 与 0.6）。随机 0.5/0.5 时循环会被打破：到达率 → 1，平均回报 ≈ 0.77（课件中 “Balanced stochastic reference”）。验算（w1 →、w2 ↓、w3 ← 不变，灰格各 0.5）：由对称性 $V(g_1)=V(g_2)=v_g$，$V(w_1)=V(w_3)=0.9v_g$，$V(w_2)=1$；灰格一半走向 w1/w3、一半走向 w2：$v_g=0.5\times0.9\times0.9v_g+0.5\times0.9\times1$，解得 $v_g\approx0.756$，$V(w_1)\approx0.681$；平均 $(2\times0.681+2\times0.756+1)/5\approx0.775$。

**训练时的探索 vs 交付的随机 policy**：ε-greedy 的随机性常常只是为了收集数据，评价时可以换成贪心；这里随机性是**最终方案的一部分**。不能把 REINFORCE 学到的分布最后随手换成 argmax——换了就是另一个 policy，在灰格例子里会重新陷入循环。
`,
    formulas: [{
      title: '两种方法得到 policy 的方式',
      latex: R`\htmlClass{fx-vb}{\pi(s)=\arg\max_aQ(s,a)}\qquad\text{vs}\qquad \htmlClass{fx-pb}{\pi_{\boldsymbol\theta}(a\mid s)=\frac{e^{h(s,a;\boldsymbol\theta)}}{\sum_be^{h(s,b;\boldsymbol\theta)}}}`,
      parts: [
        { key: 'vb', label: 'Value-based：从价值导出（确定性）', color: 'blue', text: '先学 Q，再在每个状态取最大。本课的做法需要枚举/比较所有动作，得到确定性的贪心 policy（连续动作需要另外求最大值，本课不讲）。' },
        { key: 'pb', label: 'Policy-based：直接参数化（可以随机）', color: 'orange', text: '直接学一组参数决定动作分布。$h(s,a;\\boldsymbol\\theta)$ 是参数算出的动作“偏好分”，只用来比较动作，本身不是价值（下一章细讲）。可以学出 0.5/0.5 这样的随机 policy；连续动作也可以换成连续分布（本课不展开）。' }
      ]
    }],
    example: R`
**课件的实验结果（W10 slides 17–22；以下设置与数值读自课件的实验图及图注：50,000 次训练转移，30 个种子，γ=0.9，起点均匀分布在五个格子，softmax 温度 T=1）**

| | 100 步内到达钱袋的概率 | 平均折扣回报 |
|---|---|---|
| Q-learning（贪心 policy） | ≈0.6（= 最好的确定性 policy） | ≈0.54 |
| REINFORCE（按学到的分布采样） | ≈1.0 | ≈0.77（接近平衡随机 policy） |
| softmax Q-learning（T=1） | ≈0.7 | ≈0.18 |

**“确定性对随机，比较不公平？那用 softmax 套在学到的 Q 上呢？”** 课件的回答是图：softmax Q-learning 的平均回报反而最低。原因的分析（本站补充）：它学到的两个灰格 Q 值相同（g1、g2 共享同一组 Q），softmax 只是按这些 Q 的大小随机——图中 w1、w3 的 Q 值差距不大（例如 w1 约为 0.63、0.69 与向下的 −1），温度 T=1 时仍有相当概率向下掉进骷髅；灰格上的随机性也不是为了“平衡两侧”而学出来的。

**结论**：softmax 只说明“怎样由一组数选动作”，不说明“这些数是怎样学出来的”。REINFORCE 的偏好 $h$ 是为了最大化期望回报而学的；Q 值是为了预测回报而学的。
`,
    viz: { id: 'aliased', guide: R`
**怎么用**：拖动 $\pi(\text{Right}\mid\text{grey})$。

1. 点“确定性：都向右”：核对表格——g2、w3 的价值为 0，平均 0.542，到达率 0.6。
2. 点“随机：0.5/0.5”：所有起点都能到达，平均回报最高。
3. 看下方曲线：J 关于这个概率的最大值在 0.5 附近——最优 policy 是随机的。` },
    compare: R`
| | Value-based | Policy-based |
|---|---|---|
| 学什么 | $V(s)$ 或 $Q(s,a)$ | policy $\pi_\theta(a\mid s)$ |
| 得到 policy | $\arg\max_aQ$（确定性） | 直接给出（可随机） |
| 连续/大量动作 | 难（本课的做法要枚举 argmax） | 可以（连续动作需用连续分布，本课不展开） |
| “无最好动作”的情况 | 做不到 | 可以学随机 policy |
| 例子 | Q-learning、SARSA、DQN | REINFORCE |

（还有一类 actor-critic 方法把两者结合起来：policy 负责选动作，价值函数负责评价动作。W10-2 专门讲。）
`,
    pitfalls: [
      { wrong: '随机 policy 比确定性 policy 更好，所以 MDP 都应该用随机 policy。', right: '完全可观测的有限折扣 MDP 总有确定性最优 policy。随机性在多智能体博弈、状态混叠（部分可观测）等情况下才是必要的。' },
      { wrong: 'Aliased Gridworld 的问题是动作会打滑。', right: '动作是确定性的。问题是两个灰格**看起来一样**，policy 只能在它们上面用同一个分布。' },
      { wrong: '对学到的 Q 用 softmax，就等于 policy-based 方法。', right: 'softmax Q-learning 的数值是为预测回报而学的；课件实验中它的表现最差。' },
      { wrong: '训练完可以把 REINFORCE 的分布换成 argmax 来部署。', right: '那是另一个确定性 policy，在灰格例子中会重新卡住。随机性是解的一部分。' }
    ],
    quiz: [
      { kind: '公式计算', q: 'Aliased Gridworld，固定 policy：w1 向右、w2 向下、w3 向左，两个灰格都向右；移动奖励为 0，进入钱袋得 +1 并终止，γ=0.9。从 w1 出发的折扣回报是？', answer: 0.81, tol: 0.001, explain: 'w1→g1→w2↓：奖励在第 3 步，$0.9^2=0.81$。' },
      { ctx: 'aliased', kind: '公式计算', q: 'Aliased Gridworld，固定 policy：w1 向右、w2 向下、w3 向左，两个灰格都向右。五个起点均匀分布，100 步内到达钱袋的概率是？', answer: 0.6, tol: 0.001, explain: 'w1、g1、w2 能到；g2、w3 永远循环：3/5。' },
      { kind: '概念判断', q: '石头剪刀布中最优 policy 是随机的，原因是？', options: ['环境转移是随机的', '有对手：任何确定性 policy 都有固定的克制策略', '奖励是负的', 'γ<1'], answer: 1, explain: '多智能体：均匀随机是 Nash 均衡。' },
      { kind: '算法比较', q: '下列哪项**不是**课件列出的 value-based 局限？', options: ['难以处理连续动作空间', '难以处理很大的动作空间', '可能不存在最好的确定性动作', '无法处理随机的环境转移'], answer: 3, explain: 'Q-learning 可以处理随机转移（Gridworld 就会打滑）。' },
      { kind: '算法比较', q: '课件 Aliased Gridworld 实验中平均回报最低的是？', options: ['Q-learning（贪心）', 'REINFORCE', 'softmax Q-learning', '平衡随机 policy'], answer: 2, explain: 'softmax Q-learning（T=1）约 0.18，低于 Q-learning 的 0.54 和 REINFORCE 的 0.77。' }
    ],
    source: 'W10 slides 3–13（回顾、扩展假设、value-based 的局限、石头剪刀布、Aliased Gridworld 三页、value-based vs policy-based）、17–23（REINFORCE vs Q-learning vs softmax Q-learning 的实验）；W6-2 transcript（石头剪刀布的例子）。'
  },
  /* ------------------------------------------------------------------ c27 */
  {
    id: 'c27', part: 'p7', title: 'Tabular REINFORCE', en: 'Action preferences & Monte Carlo policy gradient',
    summary: '为每个 $(s,a)$ 学一个**动作偏好** $h(s,a)$，用 softmax 得到 policy。每条 episode 结束后，按 return $G_t$ 同时更新该状态**所有**动作的偏好：被选动作 +，其他动作 −。',
    goals: ['区分 h、Q 和动作概率', '默写 tabular REINFORCE 算法', '手算一次更新：[0,0] → [−0.05, 0.05]，π(Right)=0.52498', '解释 $G_t$ 的正负与 γᵗ 的作用'],
    prereq: '第 15、26 章',
    what: R`
**动作偏好（action preference）** $h(s,a)$：偏好越大，该动作越常被选；但偏好**没有**奖励上的含义。

- 目标：找到使期望回报 $J$ 最大的最优 policy $\pi^*$；
- 学习对象：每个状态—动作对的偏好 $h(s,a)$；
- 学习的 policy：$\pi(a\mid s)=\dfrac{e^{h(s,a)}}{\sum_be^{h(s,b)}}$（softmax）；
- 学习算法：**tabular REINFORCE**（Monte Carlo Policy Gradient），按 return $G_t$ 更新偏好；
- 返回的 policy 就是训练用的 policy（on-policy）。

**算法（W10 slide 16）**

1. 初始化一次：选 $\alpha>0$，令 $h(s,a)=0$。
2. 对每条 episode：
   - 按 $\pi$ 一直走到终止：$S_0,A_0,R_1,\dots,S_T$；
   - episode 结束后，对 $t=0,\dots,T-1$：
     - $G_t=\sum_{k=t+1}^{T}\gamma^{k-t-1}R_k$；
     - **同时**更新 $S_t$ 上的每个动作偏好，对 $b\in A(S_t)$：
$$h(S_t,b)\leftarrow h(S_t,b)+\alpha\gamma^tG_t\big[\mathbb 1\{b=A_t\}-\pi(b\mid S_t)\big]$$
- $\mathbb 1\{b=A_t\}$ 对被选动作为 1，其余为 0；
- $G_t>0$：提高被选动作的偏好，降低其他动作；$G_t<0$：反过来。
`,
    why: R`
要学一个随机 policy，最直接的办法是给每个动作一个“偏好分” $h$，再用 softmax 变成概率。REINFORCE 回答了“偏好分怎么学”：**这次选的动作之后回报高，就让它在这个状态更可能被选**。

它是 Monte Carlo 方法：需要完整 episode 的 return，不 bootstrap，没有 $Y-Q$ 形式的 TD error——return 直接缩放更新方向。
`,
    intuition: R`
**h 不是 Q，也不是概率**：$h=2$ 不表示期望回报为 2，也不表示概率为 2。只有 softmax 的输出才非负且和为 1。所有偏好同时加 10，概率不变——决定分布的是偏好之间的**差**。（实现时先减去最大偏好再取指数，数值更稳定，结果不变。）

**为什么同时更新所有动作**：被选动作的括号是 $1-\pi(A_t\mid S_t)$（正），其他动作是 $-\pi(b\mid S_t)$（负），增量之和为 0。原本越有把握（π 越大），同样的 return 带来的强化越小。

**一次行更新的顺序**：先读取这一行完整的旧概率向量，算出所有增量，再一起写回。不能更新第一个偏好后就重算概率再更新第二个。

**Monte Carlo 噪声**：某个动作恰好遇上幸运的 episode，就会被强化；一条样本不能证明它最好，要靠很多 episode 平均。
`,
    math: R`
**$\partial\log\pi/\partial h$ 的推导**：$\log\pi(a\mid s)=h(s,a)-\log\sum_be^{h(s,b)}$。对某个 $h(s,c)$ 求导：第一项贡献 $\mathbb 1\{c=a\}$，第二项要用两层链式法则：令 $Z=\sum_be^{h(s,b)}$，则 $\frac{\partial\log Z}{\partial h(s,c)}=\frac1Z\cdot\frac{\partial Z}{\partial h(s,c)}=\frac{e^{h(s,c)}}{Z}=\pi(c\mid s)$（$Z$ 里只有 $e^{h(s,c)}$ 这一项含 $h(s,c)$，其他项对它的导数为 0；这里的 log 是自然对数）：

$$\frac{\partial\log\pi(a\mid s)}{\partial h(s,c)}=\mathbb 1\{c=a\}-\pi(c\mid s)$$

这个导数常叫 score（score function，得分函数）。乘上 $\alpha\gamma^tG_t$ 就得到 tabular 更新（课件 slide 27：“effectively, we update for all actions”）。

**为什么对 $\log\pi$ 求导、再乘 $G_t$**：$\partial\log\pi/\partial h=(\partial\pi/\partial h)/\pi$。分子是“让这个动作更可能”的方向；除以 $\pi$，是因为常被选的动作会被抽到更多次——不除的话，它光凭“被抽得多”就会被反复强化。除以 $\pi$ 之后，平均下来每个动作被推动的力度只取决于它之后的回报：$\sum_a\pi(a)\,q(a)\,\frac{\nabla\pi(a)}{\pi(a)}=\sum_aq(a)\nabla\pi(a)$，这正是期望回报 $\sum_a\pi(a)q(a)$ 上升最快的方向。乘 $G_t$ 就是用这一次实际得到的回报代替 $q$（下一章的 Policy Gradient Theorem 把这件事推广到整条轨迹）。

**Return 的计算**：episode 结束后可以从末尾令 $G=0$，倒序 $G\leftarrow R_{t+1}+\gamma G$ 存下所有 $G_t$，再按时间正序处理各时刻。**不要每条 episode 都把 h 清零**——h 只在训练开始时初始化一次。

**为什么还要乘 $\gamma^t$**：$G_t$ 从时刻 $t$ 重新计时，而目标 $J=\mathbb E[G_0]$ 从时刻 0 计时；$\gamma^t$ 把这一段贡献放回原来的时间轴，不是重复打折。例：奖励 $(0,0,1)$，$\gamma=0.9$，$G_0=0.81,G_1=0.9,G_2=1$，乘上 $\gamma^t$ 后都是 0.81。
`,
    formulas: [REINFORCE_TAB],
    example: R`
**两个动作手算一次**：Left、Right，$h=[0,0]$；这次选 Right，$t=0$，$G_t=1$，$\alpha=0.1$。

| | Left | Right |
|---|---|---|
| 旧概率 $\pi$ | 0.5 | 0.5 |
| $\mathbb 1\{b=A_t\}-\pi$ | −0.5 | +0.5 |
| $\Delta h=\alpha\gamma^0G_t(\cdot)$ | −0.05 | +0.05 |
| 新 $h$ | −0.05 | 0.05 |
| 新概率 | 0.47502 | **0.52498** |

注意不是给 Right 的概率直接加 0.05：先改偏好，再重新 softmax。若 $G_t=-1$，方向反过来；若 $G_t=0$，不更新（这个不减基线的版本）。

**课件 Aliased Gridworld 训练结果（读自课件 slide 19 的图：50,000 次转移，seed 0，γ=0.9）**：灰格的偏好 Left 与 Right 都约为 2.06 / 1.95，其余两个动作约 −2.0，于是 $\pi(\text{Left}\mid\text{grey})\approx0.516$、$\pi(\text{Right}\mid\text{grey})\approx0.466$——接近 0.5/0.5；w1 几乎总是向右（0.974），w2 几乎总是向下（0.994），w3 几乎总是向左（0.961）。对比 Q-learning：两个灰格共享同一组 Q 值，贪心只能选一个方向。

**完整 episode 的流程**

${'```'}text
仅在训练开始时初始化 h[s,a] = 0
每条 episode：
    按 softmax(h[S,·]) 采样动作，记录 (S_t, A_t, R_{t+1}) 直到终止
    G ← 0；从最后时刻向前：G ← R_{t+1} + γG，保存 returns[t] ← G
    从 t = 0 向后：
        p ← softmax(h[S_t,·])               # 先保存整行旧概率
        对每个动作 b：Δh[b] ← α γ^t returns[t] (1{b=A_t} − p[b])
        把整行 Δh 同时加到 h[S_t,·]
交付 policy：在状态 s 按 softmax(h[s,·]) 采样动作
${'```'}
`,
    viz: { id: 'reinforce', guide: R`
**怎么用**：

1. “一次更新逐项看”：保持 h=[0,0,0]，选 a₂，G=1，α=0.1——三个动作的概率 1/3 → 被选动作上升。把 G 拖成负数，方向反转；拖到 0，不变。Δh 之和始终为 0。
2. “在 Aliased Gridworld 上训练”（为避免无限循环，每条 episode 最多 100 步，未终止就按截断后的 return 更新；表中的 J 是按无限时域精确计算的）：训练 1000 条 episode，看灰格的 π(Left)、π(Right) 趋近 0.5，w1/w2/w3 的动作越来越确定，平均回报超过最好确定性 policy 的 0.542。` },
    compare: R`
| | Q（Q-learning） | h（REINFORCE） | π（softmax 输出） |
|---|---|---|---|
| 含义 | 期望回报的估计 | 相对偏好（无奖励含义） | 动作概率 |
| 取值范围 | 任意实数 | 任意实数（只有差有意义） | [0,1]，和为 1 |
| 学习信号 | TD error $Y-Q$ | return × $(\mathbb 1-\pi)$ | —（由 h 决定） |
| 一次更新改动 | 一个 $(s,a)$ | 当前状态的整行 | — |
`,
    pitfalls: [
      { wrong: '$h(s,a)$ 越大说明这个动作的期望回报越大。', right: '偏好没有奖励含义；只说明相对更常被选。' },
      { wrong: '只更新被选动作的偏好。', right: '同时更新该状态所有动作：被选 $+(1-\\pi)$，其他 $-\\pi$。' },
      { wrong: 'REINFORCE 用 TD error 更新。', right: '它是 Monte Carlo：用完整 return $G_t$，不 bootstrap，没有 $Y-Q$。' },
      { wrong: '每条 episode 开始时把 h 清零。', right: 'h 只在训练开始时初始化一次，否则学到的 policy 会丢失。' },
      { wrong: '更新完第一个动作就重算概率，再更新第二个。', right: '先读取整行旧概率，算出全部增量，再一起写回。' }
    ],
    quiz: [
      { kind: '公式计算', q: '两动作 $h=[0,0]$，选 Right，$G_t=1$，$t=0$，$\\alpha=0.1$。更新后 $\\pi(\\text{Right})$？', answer: 0.52498, tol: 0.0001, explain: '$h=[-0.05,0.05]$，$\\pi(R)=e^{0.05}/(e^{-0.05}+e^{0.05})\\approx0.52498$。' },
      { kind: '公式计算', q: '三个动作 $h=[0,0,0]$，选第 1 个，$G_t=2$，$t=0$，$\\alpha=0.3$。第 2 个动作的 $\\Delta h$？', answer: -0.2, tol: 0.001, explain: '$\\pi=1/3$；$\\Delta h=0.3\\times2\\times(0-1/3)=-0.2$。' },
      { kind: '公式计算', q: '奖励 $(0,0,1)$，$\\gamma=0.9$。时刻 $t=1$ 的更新中 $\\gamma^tG_t$ 是多少？', answer: 0.81, tol: 0.001, explain: '$G_1=0.9$，$\\gamma^1G_1=0.81$。' },
      { kind: '概念判断', q: '所有偏好同时加 10，policy 会怎样？', options: ['被选概率变大', '不变', '变成均匀分布', '变成确定性'], answer: 1, explain: 'softmax 只依赖偏好之差。' },
      { kind: 'On/Off-policy', q: 'Tabular REINFORCE 用按当前 policy 采样的 episode 更新同一个 policy。它属于？', options: ['On-policy', 'Off-policy'], answer: 0, explain: '课件：返回的 policy 就是训练的 policy。不能随意用别的 policy 的旧轨迹做未修正的更新。' }
    ],
    source: 'W10 slides 15–22（action preference、softmax policy、tabular REINFORCE 算法、实验结果、Q 值 vs h 值）、27（∂log π/∂h）。'
  },
  /* ------------------------------------------------------------------ c28 */
  {
    id: 'c28', part: 'p7', title: 'Policy Gradient 与线性 policy 近似', en: 'Policy gradient theorem & linear policy approximation',
    summary: '偏好表也会太大，于是用共享参数 $h(s,a;\\boldsymbol\\theta)=\\boldsymbol\\theta^\\top f(s,a)$。**Policy Gradient Theorem** 给出期望回报的梯度，REINFORCE 用 $G_t$ 估计其中的 $q^{\\pi_\\theta}$。最后对比 value learning 与 policy learning 的学习目标。',
    goals: ['写出 Policy Gradient Theorem 并说明其中每一项', '推导线性 softmax 的 $\\nabla_\\theta\\log\\pi=f(s,a)-\\sum_b\\pi f(s,b)$', '说明 tabular REINFORCE 是 one-hot 特征的特例', '对比四种方法“学什么、学习目标是什么”'],
    prereq: '第 24、27 章',
    what: R`
**Policy approximation（W10 slide 25）**

- 动机：课件写道 tabular policy-based 方法“受限于 policy 空间 $|S|\times|A|$”——指偏好表要存 $|S|\times|A|$ 个条目（确定性 policy 的个数其实是 $|A|^{|S|}$）。状态—动作很多或连续怎么办？
- **线性 policy 近似**：用参数化函数表示 policy $\pi_\theta(a\mid s)$；$\boldsymbol\theta=(\theta_1,\dots,\theta_n)^\top$；
$$h(s,a;\boldsymbol\theta)=\boldsymbol\theta^\top f(s,a)=\sum_{i=1}^n\theta_if_i(s,a),\qquad \pi_\theta(a\mid s)=\frac{e^{h(s,a;\theta)}}{\sum_be^{h(s,b;\theta)}}$$
- 参数 $\boldsymbol\theta$ 用 policy gradient 方法（如 REINFORCE）学习；
- 另一种方案：神经网络 policy 近似（**本课不覆盖**）。

**REINFORCE（W10 slide 26）**：初始化 $\boldsymbol\theta=0$；每条 episode 按 $\pi_\theta$ 走到终止；之后对 $t=0,\dots,T-1$：$G_t=\sum_{k=t+1}^T\gamma^{k-t-1}R_k$，
$$\boldsymbol\theta\leftarrow\boldsymbol\theta+\alpha\gamma^tG_t\nabla_{\boldsymbol\theta}\log\pi_{\boldsymbol\theta}(A_t\mid S_t)$$

**Policy Gradient Theorem（W10 slide 27）**：期望回报 $J(\boldsymbol\theta)$ 对参数的梯度为
$$\nabla_{\boldsymbol\theta}J(\boldsymbol\theta)=\mathbb E_{\pi_\theta}\big[q^{\pi_\theta}(s,a)\,\nabla_{\boldsymbol\theta}\log\pi_{\boldsymbol\theta}(a\mid s)\big]$$
要求：$\pi_\theta(a\mid s)$ 对 $\boldsymbol\theta$ 可微。

记号说明：这里的期望按“当前 policy 下（带折扣）访问状态和选择动作的频率”加权，严格写法是对折扣占用度求和；在本课 $J=\mathbb E[G_0]$ 的定义下，可直接用下面推导出的 $\mathbb E\big[\sum_t\gamma^tG_t\nabla\log\pi_\theta(A_t\mid S_t)\big]$ 计算，两者是同一个量。（精确写法：定义折扣占用度 $d_\gamma(s)=\sum_t\gamma^tP(S_t=s,\ t<T)$，则 $\nabla J=\sum_sd_\gamma(s)\sum_a\pi(a\mid s)q^\pi(s,a)\nabla\log\pi(a\mid s)$。$d_\gamma$ 加起来不一定等于 1；若把它归一化成概率分布再写成期望，前面还要乘它的总和。考试按课件的期望写法即可。）
`,
    why: R`
直接对 $J(\boldsymbol\theta)$ 求导看似需要知道环境（参数改变动作，动作改变轨迹，轨迹又由环境决定）。Policy Gradient Theorem 说：梯度可以写成一个**只需要采样**就能估计的期望——环境的转移概率不依赖 $\boldsymbol\theta$，在 $\nabla\log$ 中消失了。

于是：

- **REINFORCE** 用实际 return $G_t$（Monte Carlo）估计 $q^{\pi_\theta}(s,a)$，不需要先拟合 Q；
- **Tabular REINFORCE** 中 $\nabla_{h(s,a)}\log\pi(a\mid s)$ 有点“tricky”，实际上对所有动作 $b$ 更新：$\partial\log\pi(a\mid s)/\partial h(s,b)=\mathbb 1\{b=a\}-\pi(b\mid s)$；
- **线性偏好** $h(s,a;\theta)$：$\nabla_\theta\log\pi_\theta(a\mid s)=f(s,a)-\sum_b\pi_\theta(b\mid s)f(s,b)$。

“实际上，tabular REINFORCE 是 REINFORCE 的特例：每个特征是一个状态—动作对的 one-hot 编码。”
`,
    intuition: R`
- **Policy gradient** $\nabla\log\pi_\theta(A_t\mid S_t)$：沿这个方向改 θ，$A_t$ 在 $S_t$ 的 log 概率上升最快。（术语：课件把 $\nabla_\theta\log\pi_\theta$ 叫 policy gradient，更通用的名字是 score function，tabular 版就是上一章的 $\mathbb 1\{b=A_t\}-\pi$；真正的“policy 的梯度”是 $\nabla J(\theta)$，它等于 $\gamma^tG_t\nabla\log\pi$ 的期望。）
- **Monte Carlo return** $G_t$：这个动作有多好。

直觉：return 为正，就提高被选动作的概率；为负则降低。

**特征差**：$f(s,a)-\sum_b\pi f(s,b)$ = 被选动作的特征 − 当前 policy 下的“平均特征”。它衡量被选动作相对于平均选择有什么不同，**不是**把 $G_t$ 当作让 h 去拟合的标签。

**参数共享**：若其他状态也用到这些特征，它们的动作概率也会随之改变——泛化，也可能是干扰（和 W9 一样）。

:::warn 一个 bias 陷阱
在价值近似里，加常数特征可以修复零预测。但在 softmax policy 里，如果给**所有动作**加同一个、共享权重的常数特征，它只会把所有偏好平移同一个数，在 softmax 中完全抵消；该坐标的梯度也是 $1-\sum_b\pi_b=0$。要学动作之间的基线差异，需要**动作相关**的偏置。
:::
`,
    math: R`
**从期望回报到采样梯度（推导概要）**：$J(\theta)=\mathbb E_{\pi_\theta}[G_0]=\sum_\tau p_\theta(\tau)G_0(\tau)$，$\tau$ 是一整条轨迹，$p_\theta(\tau)$ 是它在当前 policy 下出现的概率。用 **log 技巧** $\nabla p=p\nabla\log p$——它只是链式法则：对 $p>0$，$\nabla\log p=\frac1p\nabla p$，两边乘 $p$ 即得。这一步只是改写概率的导数，优化目标仍然是 $\mathbb E[G_0]$，不是对数回报。

先对 θ 求导：$\nabla J=\sum_\tau\nabla p_\theta(\tau)\,G_0(\tau)$——一条轨迹一旦固定，它的回报就固定了，θ 只影响它出现的概率。这个和不是按 $p$ 加权的，没法用样本平均估计；用 log 技巧换掉 $\nabla p$，就变成按 $p$ 加权的和，也就是期望，可以用按当前 policy 采到的轨迹求平均：
$$\nabla J=\sum_\tau p_\theta(\tau)\,\nabla\log p_\theta(\tau)\,G_0(\tau)=\mathbb E_\tau\big[\nabla\log p_\theta(\tau)\,G_0(\tau)\big]$$
轨迹概率是每一步概率的连乘 $p_\theta(\tau)=p(s_0)\prod_t\pi_\theta(A_t\mid S_t)\,p(S_{t+1}\mid S_t,A_t)$，取 log 后连乘变成求和：
$$\nabla\log p_\theta(\tau)=\sum_t\nabla\log\pi_\theta(A_t\mid S_t)$$
（$p(s_0)$ 和 $p(s'\mid s,a)$ 不依赖 θ，求导后消失。）下一步去掉“过去的奖励”。把 $G_0$ 拆成 $C_t+\gamma^tG_t$，$C_t=R_1+\gamma R_2+\dots+\gamma^{t-1}R_t$ 是时刻 $t$ 之前已经拿到的奖励。记 $g_t=\nabla\log\pi_\theta(A_t\mid S_t)$。在 $A_t$ 被选出之前，$C_t$ 和 $S_t$ 都已经确定，而 $A_t$ 按 $\pi_\theta(\cdot\mid S_t)$ 抽样，所以
$$\begin{aligned}\mathbb E[g_t\mid\text{过去}]&=\sum_a\pi_\theta(a\mid S_t)\nabla\log\pi_\theta(a\mid S_t)=\sum_a\nabla\pi_\theta(a\mid S_t)\\&=\nabla\sum_a\pi_\theta(a\mid S_t)=\nabla1=0,\end{aligned}$$
因此 $\mathbb E[C_t\,g_t]=0$：过去的奖励乘上这一步的 score，平均为 0。只剩 $\gamma^tG_t$，得到 discounted episodic 形式：
$$\nabla_\theta J(\theta)=\mathbb E\Big[\sum_{t=0}^{T-1}\gamma^tG_t\nabla_\theta\log\pi_\theta(A_t\mid S_t)\Big]$$
给定 $S_t=s,A_t=a$ 时 $G_t$ 的条件期望正是 $q^{\pi_\theta}(s,a)$——这就是定理里出现 $q$ 的原因。REINFORCE 用一个样本 $G_t$ 代替它。

**线性 softmax 的梯度**：$\log\pi(a\mid s)=\theta^\top f(s,a)-\log\sum_be^{\theta^\top f(s,b)}$，对 $\theta$ 的第 $i$ 个坐标求导：$\partial e^{\theta^\top f(s,b)}/\partial\theta_i=e^{\theta^\top f(s,b)}f_i(s,b)$（指数的导数是它自己，再乘上指数里 $\theta_i$ 的系数 $f_i(s,b)$），所以 $\partial\log\pi(a\mid s)/\partial\theta_i=f_i(s,a)-\sum_b\pi(b\mid s)f_i(s,b)$。把所有坐标叠成向量：
$$\nabla_\theta\log\pi_\theta(a\mid s)=f(s,a)-\frac{\sum_be^{\theta^\top f(s,b)}f(s,b)}{\sum_be^{\theta^\top f(s,b)}}=f(s,a)-\sum_b\pi_\theta(b\mid s)f(s,b)$$

**学习目标对比（W10 slide 29）**

| 方法 | 学什么 | 学习目标 |
|---|---|---|
| Value-based tabular | 条目 $Q(s,a)$ | $\min_Q\frac12[Y_t-Q(S_t,A_t)]^2$ |
| Value approximation | 权重 $\mathbf w$ | $\min_{\mathbf w}\frac12[Y_t-\hat Q(S_t,A_t;\mathbf w)]^2$ |
| Tabular policy-based | 偏好 $h(s,a)$ | $\max_\pi J(\pi)$ |
| Policy approximation | 参数 $\boldsymbol\theta$ | $\max_{\boldsymbol\theta}J(\pi_{\boldsymbol\theta})$ |

求解 MDP 的目标是找到最大化 $J$ 的最优 policy；但这和**学习**的目标是一回事吗？value learning 最小化的是预测误差，policy learning 才直接最大化 $J$。
`,
    formulas: [REINFORCE, {
      title: 'Policy Gradient Theorem',
      latex: R`\htmlClass{fx-grad}{\nabla_{\boldsymbol\theta}J(\boldsymbol\theta)}=\htmlClass{fx-e}{\mathbb E_{\pi_\theta}}\big[\htmlClass{fx-q}{q^{\pi_\theta}(s,a)}\,\htmlClass{fx-score}{\nabla_{\boldsymbol\theta}\log\pi_{\boldsymbol\theta}(a\mid s)}\big]`,
      parts: [
        { key: 'grad', label: '要求的：J 对 θ 的梯度', color: 'blue', text: '沿这个方向改 θ，期望回报上升最快。' },
        { key: 'e', label: '在当前 policy 下的期望', color: 'gray', text: '按当前 policy 访问状态、选择动作的频率加权（包括折扣），所以可以用采样估计。不是对所有状态均匀平均。' },
        { key: 'q', label: '动作价值 q^{π_θ}(s,a)', color: 'green', text: '“这个动作有多好”。REINFORCE 用 Monte Carlo return $G_t$ 作为它的无偏样本。' },
        { key: 'score', label: '∇ log π（score function）', color: 'orange', text: '要求 policy 可微。softmax 偏好时：tabular 为 $\\mathbb 1\\{b=a\\}-\\pi(b\\mid s)$；线性为 $f(s,a)-\\sum_b\\pi(b\\mid s)f(s,b)$。' }
      ]
    }, {
      title: '线性 softmax policy 的梯度',
      latex: R`\nabla_{\boldsymbol\theta}\log\pi_{\boldsymbol\theta}(a\mid s)=\htmlClass{fx-f}{f(s,a)}-\htmlClass{fx-mean}{\sum_b\pi_{\boldsymbol\theta}(b\mid s)f(s,b)}`,
      parts: [
        { key: 'f', label: '被选动作的特征', color: 'blue', text: '来自 $\\log\\pi$ 中的 $\\theta^\\top f(s,a)$ 项。' },
        { key: 'mean', label: '当前 policy 下的平均特征', color: 'orange', text: '来自归一化项 $\\log\\sum_be^{\\theta^\\top f(s,b)}$ 的导数。one-hot 特征时，两项之差的第 $b$ 个分量就是 $\\mathbb 1\\{b=a\\}-\\pi(b\\mid s)$。' }
      ]
    }],
    example: R`
**一次手算（one-hot 特征 = tabular）**：$f(s,L)=[1,0]$，$f(s,R)=[0,1]$，$\boldsymbol\theta=[0,0]$，选 R，$G=1$，$t=0$，$\alpha=0.1$。

平均特征 $=0.5[1,0]+0.5[0,1]=[0.5,0.5]$；梯度 $=[0,1]-[0.5,0.5]=[-0.5,0.5]$；新 $\boldsymbol\theta=[-0.05,0.05]$——与第 27 章 tabular 的结果完全相同。

**共享特征**：三个动作 $f(a_1)=[1,0]$，$f(a_2)=[0,1]$，$f(a_3)=[1,1]$，$\boldsymbol\theta=[0.5,-0.5]$。偏好 $h=(0.5,-0.5,0)$，$\pi\approx(0.506,0.186,0.307)$。选 $a_1$：平均特征 $=(0.506+0.307,\ 0.186+0.307)\approx(0.814,0.494)$，梯度 $=(1,0)-(0.814,0.494)=(0.186,-0.494)$。更新会同时改变三个动作的偏好，因为 $a_3$ 与 $a_1$、$a_2$ 共享特征。

**价值学习 vs 策略学习的“学习信号”（W10 slide 30）**

| | Value learning：拟合一个 target | Policy learning：没有 target |
|---|---|---|
| 估计 | $q_{\text{est}}=Q(s,a)$ 或 $\hat Q(s,a;\mathbf w)$ | 偏好 $h_\theta(s,a)$ 定义动作分布 |
| target | MC：$G_t$；SARSA：$r+\gamma q_{\text{est}}(s',a')$；Q-learning：$r+\gamma\max_bq_{\text{est}}(s',b)$ | — |
| 学习信号 | $\delta_t=Y_t-q_{\text{est}}(s,a)$ | return $G_t$ 缩放 log-policy 梯度 |
| tabular 更新 | $Q(s,a)\leftarrow Q+\alpha\delta_t$ | $\theta$ 就是表 $h(s,a)$ |
| 近似更新 | $\mathbf w\leftarrow\mathbf w+\alpha\delta_t\nabla_{\mathbf w}\hat Q$（$Y_t$ 视为常数） | $\theta$ 是 $h_\theta(s,a)=\hat h(s,a;\theta)$ 的共享参数 |

“没有 target”指没有让 h 去拟合的回归目标，**不是**没有优化目标或不需要奖励。
`,
    viz: { id: 'policygrad', guide: R`
**怎么用**：

1. 选“one-hot 特征”（切换时 θ 会重置为全 0），选 a₁，G=1：梯度就是 $\mathbb 1\{b=a\}-\pi$，与第 27 章完全一致。
2. 切到“线性特征（共享）”（θ 重置为例题里的 (0.5, −0.5)）：a₃ 的特征 (1,1) 与 a₁、a₂ 都重叠。选 a₁ 更新后，看 a₃ 的概率怎样跟着变。
3. 把 G 改成负数：梯度方向不变，更新方向反过来。` },
    compare: R`
| 方法 | 存储/参数化的对象 | 一次经验提供什么 | 改变什么 |
|---|---|---|---|
| Tabular value learning | Q 条目 | target − 当前 Q | 当前 $(s,a)$ 的数值 |
| Value approximation | 价值权重 $\mathbf w$ | 误差 × 价值梯度 | 共享的价值预测 |
| Tabular REINFORCE | 偏好 $h$ | return × log-policy 梯度 | 当前状态所有动作的偏好 |
| Linear policy approximation | policy 参数 $\boldsymbol\theta$ | return × 特征差 | 共享的偏好与动作分布 |

**W10 总结**：value-based 方法通过拟合 return target 学 $Q(s,a)$ 或 $\hat Q(s,a;\mathbf w)$，再用价值选动作；policy-based 方法直接优化动作分布 $\pi_\theta(a\mid s)$ 以最大化期望回报。随机 policy 在竞争博弈和无记忆智能体无法区分状态时有帮助。REINFORCE 从完整 episode 学习，episode return 缩放 log-policy 梯度。**Value learning 拟合 return target；policy learning 提升期望回报。**
`,
    pitfalls: [
      { wrong: 'Policy Gradient Theorem 需要知道转移概率。', right: '转移概率不依赖 θ，在 $\\nabla\\log p_\\theta(\\tau)$ 中消失；梯度可以只靠采样估计。' },
      { wrong: 'REINFORCE 的更新是梯度下降。', right: '是对期望回报的梯度**上升**（加号）；value learning 才是对平方误差做梯度下降。' },
      { wrong: '线性 policy 的 $h=\\theta^\\top f$ 也是价值估计。', right: '形式与线性 Q 相同，但 h 只是偏好，用来塑造动作概率。' },
      { wrong: '给所有动作加一个共享的常数特征，就能学到动作的基线差异。', right: '共享常数只平移所有偏好，在 softmax 中抵消，梯度为 0。需要动作相关的偏置。' },
      { wrong: '直接学 policy 就不需要探索，也没有方差问题。', right: 'REINFORCE 仍需足够采样，完整 episode 的 return 方差也可能很大。' }
    ],
    quiz: [
      { kind: '公式计算', q: 'one-hot 特征、两动作、$\\theta=[0,0]$，选第 2 个动作。$\\nabla_\\theta\\log\\pi$ 的第 1 个分量？', answer: -0.5, tol: 0.001, explain: '$[0,1]-[0.5,0.5]=[-0.5,0.5]$。' },
      { kind: '概念判断', q: 'Policy Gradient Theorem 中，REINFORCE 用什么估计 $q^{\\pi_\\theta}(s,a)$？', options: ['TD target', 'Monte Carlo return $G_t$', '$\\max_aQ$', '特征向量'], answer: 1, explain: '课件 slide 27：Use the return $G_t$ (Monte Carlo) to estimate $q^{\\pi_\\theta}(s,a)$。' },
      { kind: '算法比较', q: '哪种方法的学习目标是 $\\max_{\\boldsymbol\\theta}J(\\pi_{\\boldsymbol\\theta})$？', options: ['Value-based tabular', 'Value approximation', 'Policy approximation', 'Q-learning'], answer: 2, explain: 'W10 slide 29 的表格。value 方法最小化平方误差。' },
      { kind: '概念判断', q: '“tabular REINFORCE 是 REINFORCE 的特例”指的是？', options: ['特征是状态—动作对的 one-hot 编码', 'γ=1', '只有一个状态', '用 max 代替 softmax'], answer: 0, explain: 'one-hot 时 θ 的每个分量就是一个 $h(s,a)$。' },
      { kind: '概念判断', q: 'Policy learning “没有 learning target”的意思是？', options: ['不需要奖励', '没有让 h 拟合的回归 target；return 直接缩放 log-policy 梯度', '没有优化目标', '不需要采样'], answer: 1, explain: '目标仍是最大化 J，只是不做回归。' }
    ],
    source: 'W10 slides 23–32（value-based vs policy-based、policy approximation、REINFORCE、Policy Gradient Theorem、学习目标表、learning target vs learning signal、总结）。'
  }
  ]);
})(window);
