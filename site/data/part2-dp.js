/* Part 2 · W6-2 Bellman equations, policy evaluation, policy iteration, value iteration, GPI. */
(function (root) {
  'use strict';
  const R = String.raw;
  const BELLMAN_Q = {
    title: 'Bellman 方程：一步展开的 Q(s,a)',
    latex: R`\htmlClass{fx-q}{Q(s,a)}=\htmlClass{fx-sum}{\sum_{s'}}\htmlClass{fx-p}{p(s'\mid s,a)}\big[\htmlClass{fx-r}{r(s,a,s')}+\htmlClass{fx-g}{\gamma}\,\htmlClass{fx-v}{V(s')}\big]`,
    parts: [
      { key: 'q', label: '要算的量：动作价值 Q(s,a)', color: 'blue', text: '在 $s$ 先做 $a$ 的长期价值。' },
      { key: 'sum', label: '对所有后继求和', color: 'orange', text: '动作结果随机，所以把每个可能的后继都算进来——这是一个**期望**。' },
      { key: 'p', label: '转移概率 p(s′ | s, a)', color: 'gray', text: '每个后继出现的概率。Gridworld 中是 0.8 / 0.1 / 0.1（合并后可能更少项）。' },
      { key: 'r', label: '即时奖励', color: 'green', text: '这一步转移本身的奖励，例如进入 $s_{11}$ 得 $+1$。' },
      { key: 'g', label: '折扣 γ', color: 'purple', text: '下一状态之后的价值要打一次折扣。' },
      { key: 'v', label: '下一状态的价值', color: 'teal', text: '从 $s\'$ 继续走下去的价值。终止状态 $V=0$。这一项让方程变成**递归**：用别的状态的价值定义这个状态。' }
    ]
  };
  root.RL.content.add([
  /* ------------------------------------------------------------------ c07 */
  {
    id: 'c07', part: 'p2', title: 'Bellman 方程', en: 'Bellman expectation & optimality equations',
    summary: '长期价值 = 这一步的奖励 + 折扣后的下一状态价值，再对随机结果取期望。按 policy 加权得到 **Bellman expectation equation**；取最大值得到 **Bellman optimality equation**。',
    goals: ['用课件三个直觉例子说明为什么需要 γ 和 Q', '写出 $Q(s,a)=\\sum p[r+\\gamma V]$ 并逐项解释', '区分 expectation 方程（$v_\\pi=\\sum\\pi q_\\pi$）与 optimality 方程（$V=\\max Q$）', '手算 $s_{10}$ 的两次 backup：0.8 与 0.872'],
    prereq: '第 6 章',
    what: R`
**Bellman 方程**把“从现在到无穷远的期望回报”写成“一步 + 下一状态价值”的递推关系。

**动作价值的 Bellman 方程**（对两种版本都一样）：

$$Q(s,a)=\mathbb{E}[R_{t+1}+\gamma V(S_{t+1})\mid S_t=s,A_t=a]=\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma V(s')\big]$$

**Bellman expectation equation（给定 policy π）**：

$$v_\pi(s)=\sum_a\pi(a\mid s)\,q_\pi(s,a),\qquad q_\pi(s,a)=\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma v_\pi(s')\big]$$

**Bellman optimality equation（最优价值）**：

$$V(s)=\max_a Q(s,a),\qquad Q(s,a)=\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma V(s')\big]$$
`,
    why: R`
直接按定义求 $v_\pi(s)=\mathbb{E}_\pi[G_t]$ 需要枚举所有可能的无穷长 trajectory，不可行。Bellman 方程只看**一步**，把问题变成了一组关于各状态价值的方程：

- 已知模型时，可以**解方程**（Policy Evaluation，第 8 章）或**反复迭代**（Value Iteration，第 10 章）。
- 不知道模型时，可以用**采样的一步**代替期望（TD、SARSA、Q-learning，第 17–21 章）。

transcript 原话：这个方程“会在后半学期反复出现，只是形式稍有变化”。它是整门 RL 的核心。
`,
    intuition: R`
课件用三个对比一步步“推出”Bellman 方程：

1. **$V(s_6)$ 与 $V(s_{10})$，哪个更好？** 两者即时奖励都是 0，但 $s_{10}$ 能到 $+1$，$s_6$ 有掉进 $-1$ 的风险。所以价值 = 即时奖励 + **未来状态的价值**：$V(S_t)=R_{t+1}+V(S_{t+1})$。
2. **$V(s_9)$ 与 $V(s_{10})$？** 两者都能到 $+1$，但 $s_{10}$ 更近。上式会得出 $V(s_9)=V(s_{10})$，不符合直觉——需要折扣：$V(S_t)=R_{t+1}+\gamma V(S_{t+1})$。先**假设动作一定成功**（只为看清折扣的作用）：$s_9$ 向右一步就到 $s_{10}$，于是 $V(s_9)=\gamma V(s_{10})<V(s_{10})$。真实的 Gridworld 会打滑：$s_9$ 选 Right 时 0.8 到 $s_{10}$，向左（北）、向右（南）打滑都会撞墙留在 $s_9$，所以 $v^*(s_9)=0.8\times0.9\,v^*(s_{10})+0.2\times0.9\,v^*(s_9)$，解得 $v^*(s_9)=\frac{0.72}{0.82}v^*(s_{10})$——比 $s_{10}$ 小，但比例不是正好 0.9。
3. **A：在 $s_9$ 向右；B：在 $s_{10}$ 向下？** A 更好，虽然 $s_9$ 不如 $s_{10}$。价值还取决于动作，所以引入 $Q(S_t,A_t)=R_{t+1}+\gamma V(S_{t+1})$，并且 $V(S_t)=\max_a Q(S_t,a)$。

最后，因为动作结果是随机的，把 $R_{t+1}+\gamma V(S_{t+1})$ 换成它的**期望**，就得到上面的方程。
`,
    math: R`
**两种方程的区别只在“怎样从 Q 得到 V”**：

| | 从 Q 得到 V | 描述的是 |
|---|---|---|
| Expectation | $v_\pi(s)=\sum_a\pi(a\mid s)q_\pi(s,a)$（按 policy 加权平均） | 一个**给定** policy 的价值 |
| Optimality | $V(s)=\max_aQ(s,a)$（取最好的动作） | **最优** policy 的价值 |

若 $\pi$ 是确定性的：$v_\pi(s)=q_\pi(s,\pi(s))$。

**终止状态**：$V(s_7)=V(s_{11})=0$，所有 $Q(s_7,\cdot)=Q(s_{11},\cdot)=0$。终止状态之后没有动作也没有奖励，所以价值为 0。（transcript 中讲师提到“设成别的值也不影响选动作”；但严格来说，若给终止状态非零价值，到达终点的路径长短不同，折扣后的那一项也不同，可能改变动作排序——所以始终按定义取 0。）

**一次 Bellman backup**：拿一张旧的价值表 $V$，对某个 $(s,a)$ 算出右边的数，就叫一次 backup。Value Iteration 就是对所有状态反复做 backup。
`,
    formulas: [BELLMAN_Q, {
      title: 'Expectation vs Optimality：从 Q 到 V',
      latex: R`\htmlClass{fx-exp}{v_\pi(s)=\sum_a\pi(a\mid s)\,q_\pi(s,a)}\qquad\text{vs}\qquad\htmlClass{fx-opt}{v_*(s)=\max_a q_*(s,a)}`,
      parts: [
        { key: 'exp', label: 'Bellman expectation', color: 'orange', text: '按 policy 的动作概率对 Q 求加权平均。用于**评价**一个给定的 policy（Policy Evaluation、TD prediction、SARSA）。' },
        { key: 'opt', label: 'Bellman optimality', color: 'red', text: '取最大的 Q。用于**寻找**最优 policy（Value Iteration、Q-learning）。' }
      ]
    }],
    example: R`
**课件例子：在 $s_{10}=(2,2)$ 做 backup，$\gamma=0.9$**

**第一次（所有 $V_0=0$）**：

$$\begin{aligned}
Q_1(s_{10},N)&=0.8(0+0.9\cdot0)+0.1(0+0.9\cdot0)+0.1(1+0.9\cdot0)=0.1\\
Q_1(s_{10},E)&=0.8(1+0.9\cdot0)+0.1(0+0.9\cdot0)+0.1(0+0.9\cdot0)=0.8\\
Q_1(s_{10},S)&=0.8(0+0.9\cdot0)+0.1(1+0.9\cdot0)+0.1(0+0.9\cdot0)=0.1\\
Q_1(s_{10},W)&=0.8(0+0.9\cdot0)+0.1(0+0.9\cdot0)+0.1(0+0.9\cdot0)=0
\end{aligned}$$

$V_1(s_{10})=\max\{0.1,0.8,0.1,0\}=0.8$。

逐项解读 $Q_1(s_{10},E)$：按预期向东（0.8）进入 $s_{11}$，奖励 1；左滑向北（0.1）撞边界留在 $s_{10}$；右滑向南（0.1）到 $s_6$。

这几个数看起来“只算了奖励”，其实三条分支的 $\gamma V(s')$ 都算了，只是 $V_0$ 全为 0（还没学到任何东西），所以只有“这一步直接进 $s_{11}$”的真实奖励留了下来。例如 $Q_1(s_{10},N)=0.1$：滑到 $s_9$ 后还能回来拿 +1 的机会装在 $0.1\times0.9\times V(s_9)$ 里，此刻 $V_0(s_9)=0$；用收敛后的真实价值算，$Q^*(s_{10},N)=0.853$。

**第二次（用 $V_1(s_{10})=0.8$，其余仍为 0）**：

$$\begin{aligned}
Q_2(s_{10},N)&=0.8(0+0.9\cdot0.8)+0.1(0+0.9\cdot0)+0.1(1+0)=0.676\\
Q_2(s_{10},E)&=0.8(1+0)+0.1(0+0.9\cdot0.8)+0.1(0+0.9\cdot0)=0.872\\
Q_2(s_{10},S)&=0.8(0+0.9\cdot0)+0.1(1+0)+0.1(0+0.9\cdot0)=0.1\\
Q_2(s_{10},W)&=0.8(0+0.9\cdot0)+0.1(0+0.9\cdot0.8)+0.1(0+0.9\cdot0)=0.072
\end{aligned}$$

$V_2(s_{10})=0.872$。值变了，是因为“撞墙留在 $s_{10}$”这个分支用到的 $V(s_{10})$ 从 0 变成了 0.8。

**为什么不能只算一个状态？** $V(s_{10})$ 依赖 $V(s_6)$（右滑），$V(s_6)$ 又依赖 $V(s_{10})$（向北）。所有状态互相依赖，需要对整张表反复迭代（第 10 章），或者直接解方程组（第 8 章）。
`,
    viz: { id: 'bellman', guide: R`
**怎么用**：

1. 选“V₀ = 0”，点 $s_{10}$，动作 E，一步步点“下一步”：得到 $Q=0.8$，第 4 步看到 $V_{\text{new}}=0.8$。
2. 改选“V₁”：同样的操作得到 0.872（课件第二次 backup）。
3. 选“V*”：任意状态做 optimality backup，结果等于它自己——$V^*$ 是 Bellman optimality 方程的**不动点**。
4. 切换到 Expectation，V 来源选“V^π₀”：按 π₀ 加权后结果也等于 V^π₀ 本身。` },
    compare: R`
| | Bellman expectation | Bellman optimality |
|---|---|---|
| 方程 | $v_\pi=\sum_a\pi\,q_\pi$ | $v_*=\max_a q_*$ |
| 是否线性 | 是（固定 π 后是线性方程组） | 否（含 max） |
| 解 | $v_\pi$ | $v_*$ |
| 用在 | Policy Evaluation、TD prediction、SARSA | Value Iteration、Q-learning |

**与 return 的关系**：$G_t=R_{t+1}+\gamma G_{t+1}$ 是一条 trajectory 上的恒等式；Bellman 方程是对它两边取期望的结果。
`,
    pitfalls: [
      { wrong: '$V(s)=R+\\gamma V(s\')$ 就是完整的 Bellman 方程。', right: '那是确定性世界的写法。动作结果随机时要对所有后继加权：$\\sum_{s\'}p(s\'\\mid s,a)[r+\\gamma V(s\')]$。' },
      { wrong: 'Bellman expectation 方程里的期望是对 policy 求的，所以与 $p$ 无关。', right: '有两层平均：先按 $\\pi(a\\mid s)$ 对动作平均，再按 $p(s\'\\mid s,a)$ 对后继平均。' },
      { wrong: '$V_1(s_{10})=0.8$ 就是 $s_{10}$ 的最终价值。', right: '它只是一次 backup 的结果。其他状态的值更新后，$s_{10}$ 的值会继续变化，最终收敛到 0.942。' },
      { wrong: '终止状态 $s_{11}$ 的价值是 +1。', right: '终止状态价值为 0；+1 是进入它的转移奖励，体现在 $r(s_{10},a,s_{11})$ 中。' }
    ],
    quiz: [
      { kind: '公式计算', q: '$V$ 全为 0，$\\gamma=0.9$。$Q(s_{10},N)$ 是多少？', answer: 0.1, tol: 0.001, explain: R`三条分支都要算，未来没有被忽略：
$$Q(s_{10},N)=\underbrace{0.8\,[0+0.9\,V(s_{10})]}_{\text{向北撞墙，留在 }s_{10}}+\underbrace{0.1\,[0+0.9\,V(s_9)]}_{\text{左滑到 }s_9}+\underbrace{0.1\,[1+0.9\cdot0]}_{\text{右滑进 }s_{11}}$$
“滑到 $s_9$ 之后还能走回来拿 +1”就装在 $\gamma V(s_9)$ 里——但题目前提是 **V 全为 0**（还没开始学），表里写着 $V(s_9)=V(s_{10})=0$，所以前两项为 0，只剩 $0.1\times1=0.1$。这是 VI 的第一次 backup（相当于“只剩 1 步”）。

若用真实价值 $V^*(s_{10})=0.942$、$V^*(s_9)=0.827$：$0.8\times0.9\times0.942+0.1\times0.9\times0.827+0.1\approx0.8527$，与课件最终 Q 表的 0.8527 一致——“回来的机会”随着价值表被学出来才体现。` },
      { kind: '公式计算', q: '用 $V_1$（只有 $V_1(s_{10})=0.8$，其余为 0）计算 $Q_2(s_{10},W)$。', answer: 0.072, tol: 0.0005, explain: 'West 按预期到 $s_9$（V=0），左滑向南到 $s_6$（V=0），右滑向北撞边界留在 $s_{10}$：$0.1\\times0.9\\times0.8=0.072$。' },
      { kind: '公式计算', q: '某状态 $Q=(0.3,0.7,0.5,0.1)$。Bellman optimality 给出的 $V(s)$ 是多少？若 policy 以 0.5/0.5 选第 1、3 个动作，expectation 给出的 $v_\\pi(s)$ 是多少？请输入第二个数。', answer: 0.4, tol: 0.001, explain: 'optimality：$\\max=0.7$；expectation：$0.5\\times0.3+0.5\\times0.5=0.4$。' },
      { kind: '概念判断', q: '课件为什么从 $V(S_t)=R_{t+1}+V(S_{t+1})$ 改成 $R_{t+1}+\\gamma V(S_{t+1})$？', options: ['为了让 $V(s_6)<V(s_{10})$', '为了让离目标更近的 $s_{10}$ 价值高于 $s_9$', '为了处理随机转移', '为了引入动作'], answer: 1, explain: '没有折扣时 $V(s_9)=V(s_{10})$，与“越早拿到奖励越好”的直觉矛盾。' },
      { kind: '概念判断', q: '终止状态的 $V$ 和 $Q$ 按定义是？', options: ['等于进入它的奖励', '0', '1', '未定义，不能使用'], answer: 1, explain: '终止后没有动作和奖励，V=Q=0（课堂 quiz 的答案）。' }
    ],
    source: 'W6-2 slides 8–11（直觉推导与 Bellman 方程、符号约定）、15–18（终止状态、s₁₀ 两次 backup）；W7 slide 3、W8 slide 3（expectation 形式）；transcript L2。'
  },
  /* ------------------------------------------------------------------ c08 */
  {
    id: 'c08', part: 'p2', title: 'Policy Evaluation', en: 'Evaluating a fixed policy',
    summary: '给定 policy π，求出它在每个状态的价值 $V^\\pi(s)$。PI 课件用**精确**方法：解一个线性方程组；也可以反复做 expectation backup，逐轮逼近同一个解。',
    goals: ['写出 Policy Evaluation 的线性方程组', '解释为什么 9 个未知数刚好有 9 个方程', '理解迭代式 evaluation 收敛到同一个解', '复现课件 π₀ 的 $V^{\\pi_0}$'],
    prereq: '第 7 章',
    what: R`
**Policy Evaluation（策略评估）**：policy $\pi$ 固定不变，计算 $V^\pi(s)$ 对所有状态成立。

对确定性 policy，每个非终止状态有一个方程：

$$V^{\pi}(s)=Q^{\pi}(s,\pi(s))=\sum_{s'}p(s'\mid s,\pi(s))\big[r(s,\pi(s),s')+\gamma V^{\pi}(s')\big]$$

- **Exact（课件 PI 用的方法）**：把每个 $V^\pi(s)$ 当作未知数，解这组线性方程。
- **Iterative**：从 $V_0$ 开始，反复用右边更新左边，$V_{k+1}(s)=\sum_{s'}p(\dots)[r+\gamma V_k(s')]$，直到不再变化。
`,
    why: R`
要改进一个 policy，首先要知道它现在有多好。Policy Evaluation 是 Policy Iteration 的前半步，也是后面“prediction”问题（MC prediction、TD prediction）的模型已知版本：

| | 模型已知 | 模型未知 |
|---|---|---|
| 评价给定 policy | Policy Evaluation（本章） | MC prediction（第 15 章）、TD prediction（第 17 章） |
`,
    intuition: R`
**用课件 π₀ 的顶行三格手算一遍。** π₀ 在 $s_8,s_9,s_{10}$ 都选 ↑。向上会撞顶留在原地（0.8），左右各滑 0.1：$s_8$ 左滑也撞墙留在原地、右滑到 $s_9$；$s_9$ 左滑到 $s_8$、右滑到 $s_{10}$；$s_{10}$ 左滑到 $s_9$、右滑进 $s_{11}$（+1，终止）。每个状态写成“价值 = 各分支概率 ×（奖励 + 0.9 × 下一状态价值）”：

$$\begin{aligned}
V_8&=0.9\,(0.9V_8)+0.1\,(0.9V_9)\\
V_9&=0.8\,(0.9V_9)+0.1\,(0.9V_8)+0.1\,(0.9V_{10})\\
V_{10}&=0.8\,(0.9V_{10})+0.1\,(0.9V_9)+0.1\,(1+0)
\end{aligned}$$

**“线性”指什么**：每个方程右边只有“数字 × 某个未知数”和常数——没有 $V_8\times V_9$、没有平方、没有 max，和初中的“$2x+3y=5$”是同一类方程。

**像初中一样消元**：第一个方程得 $0.19V_8=0.09V_9$，即 $V_8=0.4737\,V_9$；第三个方程得 $0.28V_{10}=0.09V_9+0.1$；代入第二个方程只剩 $V_9$，解得 $V_9=0.1542$，回代 $V_8=0.0730$、$V_{10}=0.4067$——正是课件 slide 35 的 $V^{\pi_0}$。

**为什么是 9 个未知数**：11 个状态中 $s_7,s_{11}$ 是终止状态，价值按定义为 0，不是未知数；剩下 9 个非终止状态各写一条方程，9 个方程 9 个未知数。顶行三格在 π₀ 下恰好自成一组（只在顶行走动或进入 $s_{11}$），其他状态的方程会用到它们的值，一起解即可。

**为什么 policy 必须固定**：如果“每个状态选哪个动作”也是未知的，方程就成了 $V=\max(\dots)$，而哪一项最大取决于还没解出来的 $V$，不能直接消元——所以 optimality 方程要用 VI 反复迭代；PI 则先固定 policy，把问题变成线性方程一次解完，再去改进 policy。

**$|S|^3$ 是什么**：消元法的计算量大约是状态数的三次方（transcript 的说法）。9 个状态约 729 次运算，瞬间完成；40×30 地图的 1098 个状态约 13 亿次，就慢了——大问题因此改用迭代。

迭代式的直觉：先假设所有价值都是 0；用一次 backup，离终点一步的状态先“感知”到奖励；再一次，离终点两步的状态也感知到……价值像涟漪一样从终点往外传播，每轮误差大约缩小到原来的 $\gamma$ 倍。
`,
    math: R`
**矩阵形式**（不考，帮助理解“线性”）：设 $\mathbf v$ 是非终止状态的价值向量，$P_\pi$ 是按 policy 选动作后的转移矩阵（只含非终止后继），$\mathbf r_\pi$ 是每个状态的期望即时奖励：

$$\mathbf v=\mathbf r_\pi+\gamma P_\pi\mathbf v\quad\Longrightarrow\quad(I-\gamma P_\pi)\mathbf v=\mathbf r_\pi$$

$\gamma<1$ 保证 $I-\gamma P_\pi$ 可逆，所以解存在且唯一。

**迭代式**：

$$V_{k+1}(s)=\sum_a\pi(a\mid s)\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma V_k(s')\big]$$

停止条件：$\max_s|V_{k+1}(s)-V_k(s)|<\epsilon$。当 $k\to\infty$ 时 $V_k\to V^\pi$。
`,
    formulas: [{
      title: '精确 Policy Evaluation 的一个方程',
      latex: R`\htmlClass{fx-v}{V^{\pi}(s)}=\sum_{s'}p(s'\mid s,\htmlClass{fx-pi}{\pi(s)})\big[r(s,\htmlClass{fx-pi}{\pi(s)},s')+\gamma\,\htmlClass{fx-vn}{V^{\pi}(s')}\big]`,
      parts: [
        { key: 'v', label: '未知数 V^π(s)', color: 'blue', text: '左边是一个未知数。每个非终止状态一个。' },
        { key: 'pi', label: '动作由 policy 固定', color: 'orange', text: '不取 max，也不比较动作：动作就是 $\\pi(s)$。这让方程保持线性。' },
        { key: 'vn', label: '右边也是未知数', color: 'teal', text: '$V^\\pi(s\')$ 是其他（或同一个）状态的未知数。9 个方程互相耦合，要联立求解。' }
      ]
    }],
    example: R`
**课件 π₀**：$s_8,s_9,s_{10}$ ↑；$s_5$ →；$s_6$ ↑；$s_1$ ←；$s_2$ ↓；$s_3$ ↓；$s_4$ →。

写出两个方程看看结构：

- $s_{10}$ 选 ↑：0.8 撞边界留在 $s_{10}$，0.1 左滑到 $s_9$，0.1 右滑进入 $s_{11}$（+1）
$$V(s_{10})=0.8\,[0+0.9V(s_{10})]+0.1\,[0+0.9V(s_9)]+0.1\,[1+0]$$
- $s_4$ 选 →：0.8 撞右边界留在 $s_4$，0.1 左滑向北进入 $s_7$（−1），0.1 右滑向南撞边界留在 $s_4$
$$V(s_4)=0.9\,[0+0.9V(s_4)]+0.1\,[-1+0]\ \Rightarrow\ V(s_4)=\frac{-0.1}{1-0.81}=-0.5263$$

解全部 9 个方程得到（课件 slide 35）：

| | 列 0 | 列 1 | 列 2 |
|---|---|---|---|
| 顶行 | $s_8$: 0.0730 | $s_9$: 0.1542 | $s_{10}$: 0.4067 |
| 中行 | $s_5$: 0.0277 | 墙 | $s_6$: 0.2119 |
| 底行 | $s_1$: 0.0131 | $s_2$: −0.0559 | $s_3$: −0.1872 |

以及 $V^{\pi_0}(s_4)=-0.5263$。π₀ 很差：$s_4$ 一直向右撞墙，偶尔滑进 $-1$。
`,
    viz: { id: 'policyeval', guide: R`
**怎么用**：policy 选“课件 π₀”。

1. 点“做 1 轮”几次，看 $s_{10}$ 先变成 0.1（直接右滑到 +1），$s_4$ 先变成 −0.1。
2. 点格子 $s_4$，看每一轮的代入式；“直到收敛”后与精确解 −0.5263 对比。
3. 下方曲线是每轮的最大变化量（对数坐标），近似一条直线——误差按 $\gamma$ 的比例缩小。
4. 换成“均匀随机 policy”：evaluation 也适用于随机 policy，只是方程里多了 $\pi(a\mid s)$ 加权。` },
    compare: R`
| | Exact（解线性方程） | Iterative（反复 backup） |
|---|---|---|
| 结果 | 一步得到精确 $V^\pi$ | 逐轮逼近 $V^\pi$ |
| 成本 | 约 $O(|S|^3)$ | 每轮 $O(|S|^2|A|)$，需要多轮 |
| 课件 | PI 的标准做法（slide 33：“exact”） | 课件未展开；Value Iteration 相当于“只做一轮再改进” |

| | Policy Evaluation | Value Iteration 的一轮 |
|---|---|---|
| 用的方程 | Bellman expectation（按 π） | Bellman optimality（取 max） |
| policy | 固定 | 隐含为当前贪心 policy |
`,
    pitfalls: [
      { wrong: 'Policy Evaluation 会顺便改进 policy。', right: '它只计算价值，policy 全程固定。改进是下一章 Policy Improvement 的工作。' },
      { wrong: '精确评估也需要迭代很多轮。', right: '课件 PI 的 exact evaluation 是一次性**解线性方程组**；迭代式只是另一种计算同一个解的方法。' },
      { wrong: '评估时对动作取 max。', right: '取 max 就变成了 optimality backup。评估一个 policy 时，动作由 $\\pi$ 决定（随机 policy 时按概率加权）。' }
    ],
    quiz: [
      { kind: '公式计算', q: '$s_4$ 一直选 →（Right）。用 $V(s_4)=0.9\\cdot0.9V(s_4)+0.1\\cdot(-1)$ 求 $V(s_4)$（保留 4 位）。', answer: -0.5263, tol: 0.0005, explain: '$V(1-0.81)=-0.1$，$V=-0.1/0.19=-0.5263$。与课件一致。' },
      { ctx: 'grid', kind: '概念判断', q: 'Gridworld 的精确 policy evaluation 有多少个未知数？', options: ['11', '9', '12', '4'], answer: 1, explain: '11 个状态中 2 个是终止状态（价值固定为 0），剩下 9 个未知数、9 个方程。' },
      { kind: '概念判断', q: '为什么固定 policy 后的 Bellman 方程是线性的？', options: ['因为 γ<1', '因为没有 max，只有按固定概率的加权和', '因为奖励都是 0 或 ±1', '因为状态有限'], answer: 1, explain: 'max 是非线性的；policy 固定后每个方程都是未知数的线性组合。' },
      { kind: '算法比较', q: 'Policy Evaluation 与 MC prediction 的共同目标是？', options: ['找最优 policy', '估计给定 policy 的价值', '学习转移概率', '最大化即时奖励'], answer: 1, explain: '两者都是 prediction：评价给定 policy。区别是前者用模型，后者用采样的 return。' }
    ],
    source: 'W6-2 slide 33（PI 算法、exact evaluation）、34–35（π₀ 与 V^π₀ 数值）；transcript L2（解线性方程、复杂度约 |S|³）。'
  },
  /* ------------------------------------------------------------------ c09 */
  {
    id: 'c09', part: 'p2', title: 'Policy Improvement 与 Policy Iteration', en: 'Greedy improvement and the PI loop',
    summary: '有了 $V^\\pi$，在每个状态选 $Q^\\pi(s,a)$ 最大的动作就得到一个不比原来差的新 policy。**评估 → 改进 → 评估 → …**，直到 policy 不再变化，这就是 Policy Iteration。',
    goals: ['写出 greedy improvement：$\\pi_{k+1}(s)=\\arg\\max_aQ^{\\pi_k}(s,a)$', '复现课件 π₀ → π₁ → 收敛', '说出 PI 的停止条件', '理解“policy 不再变 ⇒ 最优”'],
    prereq: '第 8 章',
    what: R`
**Policy Improvement（策略改进）**：用当前 policy 的价值 $V^{\pi_k}$ 算出每个动作的 $Q^{\pi_k}$，然后在每个状态选最好的动作：

$$\pi_{k+1}(s)=\arg\max_a Q^{\pi_k}(s,a)=\arg\max_a\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma V^{\pi_k}(s')\big]$$

**Policy Iteration（PI）**：

1. 初始化一个 policy $\pi_0$（例如随机的）。
2. **Policy evaluation（exact）**：解线性方程组得到 $V^{\pi_k}$。
3. **Policy improvement**：$\pi_{k+1}(s)=\arg\max_a Q^{\pi_k}(s,a)$。
4. 若 $\pi_{k+1}=\pi_k$，停止；否则 $k\leftarrow k+1$，回到第 2 步。
`,
    why: R`
暴力搜索所有 policy 不可行：Gridworld 有 $4^9=262{,}144$ 个确定性 policy。PI 利用 MDP 的结构，每一轮都保证新 policy **不比旧的差**，而 policy 的数量有限，所以一定会在有限轮内停下。课件例子中只用了 **2 轮**。
`,
    intuition: R`
**先只看一格：只把 $s_1$ 的动作换掉。** π₀ 在 $s_1$ 选 ←，$V^{\pi_0}(s_1)=0.0131$。用 $V^{\pi_0}$ 算出 $s_1$ 四个动作的 Q：↑ **0.0161**，←（现在选的）0.0131，↓ 0.0056，→ −0.0366。

$Q^{\pi_0}(s_1,\uparrow)=0.0161$ 的意思是：**第一步向上，之后每一步都按 π₀ 走**的期望回报。因为 $V^{\pi_0}$ 是 π₀ 的**精确**价值，0.0161 就是这种走法的**真实**价值——所以“第一步改成向上、之后照旧”确实比原来的 0.0131 好，这是算出来的事实。（真把 policy 改成“只在 $s_1$ 向上”，精确算出 $s_1$ 的价值是 0.0177，比 0.0161 还高，因为以后再回到 $s_1$ 也会向上。）

**所有状态一起换，为什么也不会变差。** 新 policy 在每个状态都选 Q 最大的动作。从任意状态出发，拆成一串“替换”：

1. 第一步按新规则、之后全按旧规则：不差（上一段的结论）。
2. 走到下一个状态后，“之后全按旧规则”这部分又可以换成“这一步按新规则、再之后按旧规则”：在那个状态，新动作的 Q 也不小于旧动作，所以还是不差。
3. 一直替换下去，每替换一步都不变差；替换无数步以后，就是“每一步都按新规则”，也就是完全按新 policy 走。

π₀ → π₁ 时**每个状态**的价值都上升了：$s_1$ 0.013 → 0.545，$s_4$ −0.526 → 0.308，$s_6$ 0.212 → 0.635，$s_{10}$ 0.407 → 0.942。

:::warn 这个保证建立在“旧 policy 的价值算得准确”之上
上面每一步都用到了“Q 就是真实价值”，这正是课件 PI 要求 **exact** evaluation 的原因。如果 V 只是粗略估计，改进可能反而变差。

例如只用很少的经验估计 Q：$s_6$ 向上只试过两次，其中一次碰巧滑进 −1，平均下来估计成 −0.05；其他三个动作还没试过，估计都是 0。按这张表贪心，$s_6$ 会放弃向上，在三个估计为 0 的动作里任选一个，例如向左（0 > −0.05）。可真实情况是向上 0.635、向左只有 0.590——如果选的是向左，改完以后 $s_6$ 的真实价值从 0.635 掉到 0.401。

所以：PI 每轮先精确评估，保证单调变好；MC control、SARSA、Q-learning 用经验估计的 Q 改进，单次改进没有这个保证，要靠持续探索、反复修正估计才逐渐变好。
:::

**policy 不再变化 ⇒ 最优**：每个状态都找不到比当前动作更好的动作，就说明 $V^\pi(s)=\max_aQ^\pi(s,a)$ 对所有状态成立——这正是 Bellman **optimality** 方程（第 7 章），所以 $\pi$ 是最优的。这一步同样要求 $V^\pi$ 是精确的。
`,
    math: R`
**Policy improvement theorem（直觉版）**：若对所有 $s$，$Q^{\pi}(s,\pi'(s))\ge V^{\pi}(s)$，则对所有 $s$，$V^{\pi'}(s)\ge V^{\pi}(s)$。贪心改进正好满足这个条件，因为 $\max_aQ^\pi(s,a)\ge Q^\pi(s,\pi(s))=V^\pi(s)$。

**停止条件**：$\pi_{k+1}=\pi_k$。为了保证能停下，有平局（两个动作 Q 相同）时**保留原来的动作**。

**输出**：最优 policy $\pi^*$ 和它的价值 $V^{\pi^*}=v_*$。
`,
    formulas: [{
      title: 'Greedy policy improvement',
      latex: R`\htmlClass{fx-new}{\pi_{k+1}(s)}=\htmlClass{fx-arg}{\arg\max_a}\ \htmlClass{fx-q}{\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma \htmlClass{fx-v}{V^{\pi_k}(s')}\big]}`,
      parts: [
        { key: 'v', label: '上一轮评估得到的价值', color: 'teal', text: '旧 policy 的精确价值 $V^{\\pi_k}$，在改进时保持不变。' },
        { key: 'q', label: 'Q^{π_k}(s,a)', color: 'blue', text: '“先做 $a$，之后按旧 policy”的价值。对每个动作都算一遍。' },
        { key: 'arg', label: 'argmax：取使 Q 最大的动作', color: 'red', text: '注意是 **argmax**（动作本身），不是 max（数值）。平局时保留旧动作。' },
        { key: 'new', label: '新的确定性 policy', color: 'orange', text: '每个状态选一个动作。若与旧 policy 完全相同，PI 结束。' }
      ]
    }],
    example: R`
**课件 PI 例子（$\gamma=0.9$）**

**第 1 轮**：评估 π₀ 得到 $V^{\pi_0}$（各状态：$s_1$ 0.0131、$s_2$ −0.0559、$s_3$ −0.1872、$s_4$ −0.5263、$s_5$ 0.0277、$s_6$ 0.2119、$s_8$ 0.0730、$s_9$ 0.1542、$s_{10}$ 0.4067）。在每个状态算四个 $Q^{\pi_0}$，例如 $s_1$：

| 动作 | $Q^{\pi_0}(s_1,a)$ |
|---|---|
| Up | **0.0161**（最大） |
| Left | 0.0131 |
| Down | 0.0056 |
| Right | −0.0366 |

π₀ 在 $s_1$ 选的是 Left（0.0131），改成 Up。全部改进后得到 π₁：

| | 列 0 | 列 1 | 列 2 | 列 3 |
|---|---|---|---|---|
| 顶行 | → | → | → | +1 |
| 中行 | ↑ | 墙 | ↑ | −1 |
| 底行 | ↑ | ← | ↑ | ← |

$s_8,s_9,s_{10},s_1,s_2,s_3,s_4,s_5$ 都改变了，只有 $s_6$ 保持 ↑。

**第 2 轮**：评估 π₁：$V^{\pi_1}(s_1)=0.5452$，$s_{10}$: 0.9420 ……再改进，每个状态的 argmax 都等于 π₁ 的动作 ⇒ $\pi_2=\pi_1$，结束。π₁ 就是最优 policy。

**注意最优 policy 中几个“反直觉”的动作**：

- $s_4$ 选 ←（离开右边）：$s_4$ 正上方就是 $-1$ 格 $s_7$，选 ↑ 时有 0.8 的概率**按意图**直接进入 $-1$；选 ← 时只有向右打滑（向北，0.1）才会进入 $s_7$。
- $s_2$ 选 ←：绕回左边那条路，避开 $s_3\to s_6$ 附近的风险。
- $s_6$ 选 ↑：0.1 的概率右滑进 $-1$，但 0.8 能到 $s_{10}$，期望仍比绕路好。
`,
    viz: { id: 'policyiter', guide: R`
**怎么用**：点“下一阶段”交替执行评估与改进。

- 评估后格子显示 $V^\pi$；改进后显示 $Q^\pi$ 的四个三角形，黄色是 argmax，**橙框**是动作变化的状态。
- 从课件 π₀ 出发，应在第 2 次改进时“无变化”收敛。
- 换成“全部向左”或“全部向下”出发，观察需要几轮。不论从哪里出发，最后都得到同一个最优 policy（这里最优 policy 唯一）。` },
    compare: R`
| | Policy Iteration | Value Iteration（下一章） |
|---|---|---|
| 维护 | 一个显式的 policy $\pi_k$ | 一张价值表 $V_t$ |
| 每轮 | 精确评估（解方程）+ 改进 | 对每个状态做一次 optimality backup |
| 轮数 | 很少（例子中 2 轮） | 较多（价值慢慢收敛） |
| 每轮成本 | 高（解方程） | 低 |
| 停止 | policy 不变 | $\max|V_t-V_{t-1}|<\epsilon$ 或达到预算 |
`,
    pitfalls: [
      { wrong: '改进时用 max 得到新 policy。', right: '新 policy 是 **argmax**——选出的是动作；$\\max$ 得到的是数值（那是 VI 更新 V 的方式）。' },
      { wrong: 'PI 停止的条件是 V 不再变化。', right: '课件的停止条件是 $\\pi_{k+1}=\\pi_k$。policy 不变时它的精确价值自然也不变。' },
      { wrong: '改进一次就能得到最优 policy。', right: '一般需要多轮。课件例子恰好 2 轮：第 1 轮改了 8 个状态，第 2 轮确认不再变化。' },
      { wrong: '有两个动作 Q 相同时随便选，PI 照样会停。', right: '平局时随意切换可能让 policy 来回跳而不停止，通常约定保留原动作。' }
    ],
    quiz: [
      { kind: '算法比较', q: 'Policy Iteration 的停止条件是？', options: ['$\\max_s|V_t-V_{t-1}|<\\epsilon$', '$\\pi_{k+1}=\\pi_k$', '迭代 100 次', '所有 Q 值都为正'], answer: 1, explain: 'PI 在 policy 不再改变时停止；$\\epsilon$ 判据是 VI 的。' },
      { kind: 'Q 值更新', q: '某状态 $Q^{\\pi_k}=$ (Up 0.0161, Right −0.0366, Down 0.0056, Left 0.0131)，旧 policy 选 Left。改进后选什么？', options: ['Left（保持）', 'Up', 'Down', 'Right'], answer: 1, explain: 'argmax 是 Up（0.0161 > 0.0131）。这就是课件中 $s_1$ 的改动。' },
      { kind: '概念判断', q: '为什么 PI 一定在有限轮内结束？', options: ['因为 γ<1', '因为每轮 policy 不变差，而确定性 policy 只有有限个', '因为每轮都解了方程', '因为终止状态价值为 0'], answer: 1, explain: '每轮 policy 不会变差；而且平局时保留旧动作，所以只要 policy 真的变了，就至少有一个状态的价值严格变大，不可能再回到以前的 policy。确定性 policy 只有有限个，所以有限轮内必定停止。' },
      { kind: '概念判断', q: '最优 policy 在 $s_4$（右下角）选 ← 而不是 ↑，主要原因是？', options: ['向左离目标更近', '向上有 0.8 的概率直接进入 −1', '向左不会撞墙', 'γ 太小'], answer: 1, explain: '$s_4$ 正上方就是 $s_7$（−1）。向左时只有 0.1 的概率（右滑向北）进入 $s_7$。' }
    ],
    source: 'W6-2 slides 33–38（PI 算法、π₀、V^π₀、Q^π₀、π₁、V^π₁、Q^π₁ 与收敛）；transcript L2。'
  },
  /* ------------------------------------------------------------------ c10 */
  {
    id: 'c10', part: 'p2', title: 'Value Iteration', en: 'Repeated Bellman optimality backups',
    summary: '不维护显式 policy，直接对价值表反复做 Bellman optimality backup：$V_t(s)=\\max_a\\sum p[r+\\gamma V_{t-1}]$。价值收敛后取 argmax 得到最优 policy。',
    goals: ['写出 VI 算法与两种停止条件', '读懂课件的 VI 表格（V 图与 Q 三角图）', '理解“同步更新”：第 t 轮全部使用 $V_{t-1}$', '知道 policy 往往比价值更早收敛'],
    prereq: '第 7 章',
    what: R`
**Value Iteration（VI）**，$\gamma=0.9$：

1. 初始化 $V_0(s)=0$ 对所有状态（不是必须的，任意初值都可以）。
2. 第 $t$ 轮，对每个状态 $s$：
   - 对每个动作算 $Q_t(s,a)=\sum_{s'}P(s'\mid s,a)\big[r(s,a,s')+\gamma V_{t-1}(s')\big]$；
   - $V_t(s)=\max_aQ_t(s,a)$。
3. 重复直到：
   - 理论上：收敛，$\max_s|V_t(s)-V_{t-1}(s)|<\epsilon$。这只是**近似**收敛：若这一轮的最大变化是 $\delta$，则 $V_t$ 离 $V^*$ 最多差 $\gamma\delta/(1-\gamma)$；
   - 实际中：再加一个计算预算——只在 $t<T_{\max}$ 时继续（达到 $T_{\max}$ 就停）。
4. 输出（理想情况）：最优价值 $V^*(s)$ 和最优 policy $\pi^*(s)=\arg\max_aQ^*(s,a)$。
`,
    why: R`
PI 每轮都要解一个线性方程组，状态多时很贵。VI 换一种思路：**每轮只做一次便宜的 backup**，而且直接用 optimality 方程（含 max），不需要单独的 policy。

它和 PI 的关系：VI 的一轮相当于“对当前贪心 policy 做一次（不完整的）评估，同时改进”。下一章会把两者统一成 GPI。
`,
    intuition: R`
把 $+1$ 想象成一个热源，VI 的每一轮让“热量”向外多传播一格：

- 第 1 轮只有 $s_{10}$ 有值（0.8）：它是唯一能一步进入 $+1$ 的状态。
- 第 2 轮 $s_9$、$s_6$ 也有了值（0.576、0.476），$s_{10}$ 升到 0.872。
- 到第 5 轮每个状态都有了有意义的值；第 10 轮左右数值几乎稳定。

transcript 提醒：第 5 轮之后，大多数状态的**贪心动作已经不再改变**，但数值还在变。实际工程中常常设固定轮数——policy 足够好就停。
`,
    math: R`
**为什么叫“同步”更新**：第 $t$ 轮算 $Q_t$ 时，所有状态都用**上一轮**的表 $V_{t-1}$，新算出的 $V_t$ 写进一张新表，本轮内不互相影响。课件的图就是这样画的：左边是 $V_{t-1}$，右边是用它算出的 $Q_t$。

**收敛性**：Bellman optimality backup 是一个“收缩映射”，每轮把与 $V^*$ 的最大误差至少缩小到 $\gamma$ 倍，所以从任何初值出发都收敛到唯一的 $V^*$。

**读课件的 Q 图**：每个格子被对角线分成四个三角形，上=N、右=E、下=S、左=W，三角形里的数字是 $Q_t(s,a)$，黄色是最大值（即贪心动作，也等于 $V_t(s)$）。
`,
    formulas: [{
      title: 'Value Iteration 的一轮更新',
      latex: R`\htmlClass{fx-new}{V_t(s)}=\htmlClass{fx-max}{\max_a}\underbrace{\sum_{s'}P(s'\mid s,a)\big[r(s,a,s')+\gamma\,\htmlClass{fx-old}{V_{t-1}(s')}\big]}_{\htmlClass{fx-q}{Q_t(s,a)}}`,
      parts: [
        { key: 'old', label: '上一轮的表 V_{t−1}', color: 'gray', text: '本轮所有状态都读取同一张旧表（同步更新）。$V_0$ 通常取 0。' },
        { key: 'q', label: '本轮的 Q_t(s,a)', color: 'blue', text: '用旧表做的一步期望：即时奖励 + 折扣后的旧价值。' },
        { key: 'max', label: '取最大（optimality）', color: 'red', text: '直接选最好的动作，不需要单独的 policy。这是 VI 与 Policy Evaluation 的唯一区别。' },
        { key: 'new', label: '新的价值 V_t(s)', color: 'green', text: '写入新表，下一轮使用。收敛后 $V_t\\to V^*$。' }
      ]
    }, {
      title: '停止条件与输出',
      latex: R`\text{停止：}\ \htmlClass{fx-stop}{\max_s|V_t(s)-V_{t-1}(s)|<\epsilon}\ \ \text{或}\ \ \htmlClass{fx-budget}{t\ge T_{\max}}\qquad \htmlClass{fx-out}{\pi^*(s)=\arg\max_aQ^*(s,a)}`,
      parts: [
        { key: 'stop', label: '理论停止条件', color: 'purple', text: '整张表的最大变化小于阈值 $\\epsilon$。' },
        { key: 'budget', label: '计算预算', color: 'orange', text: '实际中再加一个最大轮数，避免算太久。课件写作“只要 $t<T_{\\max}$ 就继续”，等价于 $t\\ge T_{\\max}$ 时停止。' },
        { key: 'out', label: '最后提取 policy', color: 'green', text: '用收敛后的价值做一次 argmax。注意 VI 的中间过程中不需要显式 policy。' }
      ]
    }],
    example: R`
**课件 VI 表（$\gamma=0.9$，$V_0=0$）**

| 状态 | $V_1$ | $V_2$ | $V_5$ | $V_{10}$ | $V^*$ |
|---|---|---|---|---|---|
| $s_{10}$ | 0.800 | 0.872 | 0.939 | 0.942 | 0.9420 |
| $s_9$ | 0 | 0.576 | 0.816 | 0.827 | 0.8271 |
| $s_8$ | 0 | 0 | 0.650 | 0.716 | 0.7166 |
| $s_6$ | 0 | 0.476 | 0.628 | 0.635 | 0.6354 |
| $s_5$ | 0 | 0 | 0.460 | 0.626 | 0.6292 |
| $s_1$ | 0 | 0 | 0.237 | 0.537 | 0.5452 |
| $s_2$ | 0 | 0 | 0.340 | 0.463 | 0.4787 |
| $s_3$ | 0 | 0 | 0.478 | 0.526 | 0.5283 |
| $s_4$ | 0 | 0 | 0.209 | 0.305 | 0.3081 |

（课件标题“Iteration $t$”的右图是 $Q_t$，左图是它所用的 $V_{t-1}$；上表列出的是 $V_t=\max_aQ_t$。）

**$V_2(s_9)=0.576$ 是怎么来的**：$s_9$ 选 E，0.8 到 $s_{10}$：$0.8\times0.9\times V_1(s_{10})=0.8\times0.9\times0.8=0.576$；两侧滑动都到值为 0 的状态。

**$V_2(s_6)=0.476$**：$s_6$ 选 N，$0.8\times0.9\times0.8=0.576$，加上右滑进 $s_7$ 的 $0.1\times(-1)=-0.1$，合计 0.476。

最终 policy 与 PI 得到的 π₁ 相同。
`,
    viz: { id: 'valueiter', guide: R`
**怎么用**：

1. 点“下一轮”两次，在 Q 视图中核对 $s_{10}$ 的 0.8→0.872、$s_9$ 的 0.576、$s_6$ 的 0.476。
2. 先点“重置”，再点“跑 10 轮”，确认显示的是第 10 轮，对照上表。展开“贪心 policy 在哪些轮发生了变化”，看到大部分变化发生在前几轮。
3. 调 ε，体会“停止阈值”与轮数的关系。曲线是每轮最大变化量（对数坐标），斜率由 γ 决定。` },
    compare: R`
| | Policy Evaluation | Value Iteration |
|---|---|---|
| 方程 | Bellman expectation | Bellman optimality |
| 动作 | 由 π 固定 | 取 max |
| 结果 | $V^\pi$ | $V^*$（再 argmax 得 $\pi^*$） |

| | Value Iteration | Policy Iteration |
|---|---|---|
| 中间结果有 policy 吗 | 没有（需要时取 argmax） | 每轮都有显式 π |
| 收敛判断 | 价值变化 < ε | policy 不变 |
| 适合 | 每轮便宜、轮数多 | 每轮贵、轮数少 |
`,
    pitfalls: [
      { wrong: '更新 $s_{10}$ 后，同一轮更新 $s_9$ 时就用 $s_{10}$ 的新值。', right: '课件的 VI 是同步更新：第 $t$ 轮全部读取 $V_{t-1}$。（“就地更新”是另一种变体，也能收敛，但数字和课件不同。）' },
      { wrong: '$V_t$ 是某个 policy 的真实价值。', right: '中间的 $V_t$ 一般不是任何 policy 的精确价值，只是逐步逼近 $V^*$ 的估计。' },
      { wrong: 'VI 必须从 $V_0=0$ 开始。', right: '课件注明“不是必须的”。初值越接近 $V^*$，收敛越快；任意初值都会收敛。' },
      { wrong: '价值收敛之前 policy 一定还不对。', right: 'policy 通常更早稳定。课件例子中第 5 轮后大部分动作已不再改变。' }
    ],
    quiz: [
      { kind: '公式计算', q: '$V_1$ 只有 $V_1(s_{10})=0.8$。求 $V_2(s_9)$（$s_9$ 最好的动作是 E）。', answer: 0.576, tol: 0.0005, explain: '$0.8\\times(0+0.9\\times0.8)+0.1\\times0+0.1\\times0=0.576$。' },
      { kind: '公式计算', q: '$\\gamma=0.9$，用旧表 $V_1$：$V_1(s_{10})=0.8$，其余非终止状态 $V_1=0$（终止状态价值为 0）。求 $Q_2(s_6,N)$。', answer: 0.476, tol: 0.0005, explain: '向北 0.8 到 $s_{10}$：$0.8\\times0.72=0.576$；左滑撞墙留在 $s_6$：$0.1\\times0.9\\times0=0$；右滑进 $s_7$：$0.1\\times(-1)=-0.1$。合计 0.476。' },
      { kind: '算法比较', q: 'VI 与 Policy Evaluation 每轮更新的唯一区别是？', options: ['VI 用 max，PE 按 policy 选动作', 'VI 不用转移概率', 'PE 不用 γ', 'VI 只更新一个状态'], answer: 0, explain: 'VI：optimality backup；PE：expectation backup。' },
      { kind: '概念判断', q: 'VI 的实际停止条件通常是？', options: ['policy 不变', '$\\max|V_t-V_{t-1}|<\\epsilon$ 或达到最大轮数', '所有 V 为正', '只跑一轮'], answer: 1, explain: '课件 slide 19：理论上用 ε，实践中加计算预算 $T_{\\max}$。' },
      { kind: '概念判断', q: '课件 VI 图中，“Iteration 2” 的左右两张图分别是？', options: ['$V_2$ 与 $Q_2$', '$V_1$ 与 $Q_2$', '$V_2$ 与 $Q_1$', '$V^*$ 与 $Q^*$'], answer: 1, explain: '“基于 $V_1$ 计算 $Q_2$”：左图是所用的旧表 $V_1$，右图是新算的 $Q_2$。' }
    ],
    source: 'W6-2 slides 17–31（s₁₀ backup、VI 算法、Iteration 0–10 与 Solution 表）；transcript L2（V₀ 非必须、第 5 轮后 policy 基本稳定、实际用固定轮数）。'
  },
  /* ------------------------------------------------------------------ c11 */
  {
    id: 'c11', part: 'p2', title: 'GPI：VI 与 PI 的统一视角', en: 'Generalised Policy Iteration',
    summary: '所有这些方法都在交替做两件事：**评估**当前 policy（让价值跟上 policy），**改进** policy（让 policy 对价值贪心）。PI 精确评估，VI 只评估一步——它们都是 Generalised Policy Iteration。',
    goals: ['画出 VI、PI、GPI 三个循环图并说出区别', '解释“VI 是近似评估的 PI”', '为后面的 MC control、TD control 建立框架'],
    prereq: '第 9、10 章',
    what: R`
**Generalised Policy Iteration（GPI）**：任何“评估 ↔ 改进”交替进行、直到收敛的过程。

- **Policy Iteration**：初始化 $\pi_0$ → **精确**评估 $\pi_t$ 得到 $v^{\pi_t}$ → 取 $\pi_{t+1}$ → 收敛后输出 policy。
- **Value Iteration**：初始化 $V_0$ → 用 $V_{t-1}$ 更新 $Q_t(s,a)$ → 更新 $V_t(s)$ → 收敛后输出 policy。
- **GPI**：初始化 $\pi_0$ → 评估 $\pi_t$（精确或不精确） → 取 $\pi_{t+1}$ → 满足条件后输出 policy。
`,
    why: R`
GPI 是理解后面所有 control 算法的模板。下表提前列出后面会学的方法，先认几个词：prediction（预测）= 评价一个固定的 policy；control（控制）= 改进 policy、找最好的 policy；ε-greedy = 大部分时候选当前估计最好的动作、以 ε 的小概率随机选；bootstrapping（自举）= 用已有的价值估计代替还没发生的未来；bandit = 只有一个状态、反复选动作拿奖励的问题。表中看不懂的方法，学到对应章节再回来看即可。

| 方法 | 评估怎么做 | 改进怎么做 |
|---|---|---|
| Policy Iteration | 精确解方程 | 贪心 argmax |
| Value Iteration | 一次 optimality backup | 隐含在 max 中 |
| MC Control（第 16 章） | MC prediction（采样 return） | bandit 式（ε-greedy 等） |
| TD Control / SARSA / Q-learning（第 18–21 章） | TD 更新（bootstrapping） | ε-greedy |

记住这个表，后面每个新算法只需要回答两个问题：**怎么评估？怎么改进？**
`,
    intuition: R`
两个过程互相拉扯又互相成全：

- 评估让价值去**符合**当前 policy；
- 改进让 policy 对当前价值**贪心**，这又让价值“过时”。

当两者同时稳定——价值正是这个 policy 的价值，policy 又正是对这个价值贪心——就满足 Bellman optimality 方程，得到最优解。

VI 的每次 max 都隐含了一个贪心 policy，只是没有写出来；它对这个隐含 policy 只做了“一步”评估。transcript：“PI 精确地评估 policy，而 VI 近似地评估当前的贪心 policy。”
`,
    math: R`
**一个连续谱**：每次改进之前做 $m$ 轮 expectation backup（称为 modified policy iteration，课件没有用这个名字，这里用来说明两者的关系）：

- $m=1$：评估一步就改进 ⇒ 当被评估的 policy 正是对当前 V 贪心的 policy 时，这一步与 optimality backup 相同，等价于 Value Iteration（从任意 π₀ 出发的第一轮除外）；
- $m\to\infty$：评估到收敛（= 精确解）再改进 ⇒ Policy Iteration。

**关于 RL 的归属**（transcript）：有人认为 VI/PI 也属于强化学习（Sutton & Barto 教材的观点），讲师个人认为不属于——它们是**已知模型**的方法。考试中只需知道它们是 model-based。
`,
    formulas: [{
      title: 'GPI 的两个交替步骤',
      latex: R`\htmlClass{fx-eval}{V\approx V^{\pi}}\quad\rightleftarrows\quad \htmlClass{fx-imp}{\pi\leftarrow\text{greedy}(V)}`,
      parts: [
        { key: 'eval', label: 'Evaluation：让 V 跟上 π', color: 'blue', text: 'PI：精确求解；VI：一次 backup；MC/TD：从经验估计。' },
        { key: 'imp', label: 'Improvement：让 π 对 V 贪心', color: 'orange', text: 'DP 中用 argmax；不知道模型时（后面各章）用 ε-greedy 等 bandit 策略保持探索。' }
      ]
    }],
    example: R`
**同一个起点、不同的 m**（右侧交互实测，从课件 π₀ 和 V=0 出发，直到 $\|V-V^*\|_\infty<10^{-6}$）：

- $m=1$（≈VI）：改进次数很多，但每次只评估一步；
- $m$ 较大（≈PI）：只需 2–3 次改进，但每次改进前要做很多次评估。

两种方案找到的最优 policy 完全相同，并且 policy 都比价值数字**更早**达到最优——这是 GPI 的普遍现象。
`,
    viz: { id: 'gpi', guide: R`
**怎么用**：拖动 m。表格比较三种方案的“评估 sweep 总数”“改进次数”以及“policy 第一次等于 π* 时已经做了多少 sweep”；曲线显示 $\max_s|V(s)-V^*(s)|$ 的下降过程。` },
    compare: R`
| | PI | VI | GPI（一般） |
|---|---|---|---|
| 初始化 | $\pi_0$ | $V_0$ | $\pi_0$ |
| 评估 | exact | 一次 backup | 任意精度 |
| 改进 | argmax | max（隐含） | 贪心或 ε-greedy |
| 结束 | π 不变 | V 收敛 | 满足条件 |
`,
    pitfalls: [
      { wrong: 'VI 和 PI 是完全不同的思想。', right: '两者都是 GPI：评估与改进交替。区别只是评估做得多精确。' },
      { wrong: 'GPI 只适用于已知模型。', right: 'GPI 是框架。MC control、SARSA、Q-learning 都是“用经验评估 + ε-greedy 改进”的 GPI。' }
    ],
    quiz: [
      { kind: '算法比较', q: '在 GPI 视角下，VI 与 PI 的本质区别是？', options: ['VI 不做改进', 'PI 精确评估，VI 每次只做一步评估', 'VI 需要模型而 PI 不需要', 'PI 用 max 而 VI 用 argmax'], answer: 1, explain: '两者都评估+改进；PI 评估到精确，VI 只做一次 backup。' },
      { kind: '算法比较', q: 'MC Control 中，“改进”这一步用的是？', options: ['解线性方程', 'Bandit 策略（如 ε-greedy）', 'Bellman optimality backup', '梯度下降'], answer: 1, explain: '课件 W8：Policy Evaluation = MC prediction，Policy Improvement = multi-armed bandits。' },
      { kind: '概念判断', q: '若每次只对**当前 V 的贪心 policy** 做 1 轮 expectation backup，再立即改进，这样的 GPI 等价于？', options: ['Policy Iteration', 'Value Iteration', 'Monte Carlo', 'Q-learning'], answer: 1, explain: '对贪心 policy 做一次 backup ⇔ 对所有动作取 max 的 optimality backup。' }
    ],
    source: 'W6-2 slide 40（VI、PI、GPI 三张流程图）、41（总结）；transcript L2（PI 精确评估、VI 近似评估当前贪心 policy；VI/PI 是否属于 RL 的讨论）。'
  }
  ]);
})(window);
