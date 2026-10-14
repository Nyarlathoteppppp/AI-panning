/* Part 9 · W11-1 Monte Carlo Tree Search (online planning, the four steps, UCT, the Gridworld run, Expectimax, AlphaGo family). */
(function (root) {
  'use strict';
  const R = String.raw;

  const GEN = {
    title: 'Generative model（simulator）的一次调用',
    latex: R`\htmlClass{fx-in}{(s,a)}\;\longmapsto\;\htmlClass{fx-out}{(s',r)}\sim\htmlClass{fx-p}{p(\cdot,\cdot\mid s,a)}`,
    parts: [
      { key: 'in', label: '输入：任意状态和动作', color: 'blue', text: '可以是**任何**状态，不一定是 agent 现在所在的状态，而且同一个 $(s,a)$ 可以反复调用。真实环境做不到：环境只接受“当前状态下执行一个动作”，执行了就不能撤销。' },
      { key: 'out', label: '输出：一个样本', color: 'green', text: '每次只返回**一个**下一状态和奖励。例：课程 Gridworld 中在 $s_1$ 调用 Up，80% 的调用返回 $(s_5,0)$，10% 返回 $(s_1,0)$（向左打滑撞墙），10% 返回 $(s_2,0)$（向右打滑）。' },
      { key: 'p', label: '背后的分布（调用者看不到）', color: 'gray', text: 'declarative model 会把这张概率表直接写出来；generative model 只给样本。MCTS 只需要样本，所以 generative model 就够用。' }
    ]
  };
  const ROLLOUT = {
    title: 'Simulation：rollout 得到的折扣回报',
    latex: R`\htmlClass{fx-g}{G}=\sum_{k=0}^{\htmlClass{fx-k}{K-1}}\htmlClass{fx-d}{\gamma^{k}}\,\htmlClass{fx-r}{r_{k}},\qquad a_k\sim\htmlClass{fx-pi}{\pi_{\text{sim}}}(\cdot\mid s_k)`,
    parts: [
      { key: 'pi', label: 'rollout policy π_sim', color: 'purple', text: '课件：通常是简单的 policy，例如**均匀随机**或简单启发式。重点是计算便宜、能快速把这一局走完；不要求最优，但用好一点的启发式可以让估计更准。本站交互用均匀随机。' },
      { key: 'r', label: '第 k 步的奖励', color: 'gray', text: '从新节点出发第 $k$ 步拿到的奖励。课程 Gridworld 中只有进入 $+1$ 或 $-1$ 格时 $r\\neq0$。' },
      { key: 'd', label: '折扣 γ^k', color: 'teal', text: '越晚拿到的奖励乘的 γ 越多。$\\gamma=0.9$：第 0 步进 $+1$ 得 1，第 2 步进 $+1$ 只得 $0.81$。' },
      { key: 'k', label: 'K：rollout 实际走的步数', color: 'orange', text: '走到终止状态就停；否则最多走 horizon 步（课件例子是 60）。走满 horizon 还没终止，后面的奖励就不算了。课件写的 “$r\\leftarrow R+\\gamma\\times r$” 记号不够明确：如果按时间顺序把“新奖励 + γ × 已有累计”算下去，折扣会倒过来（奖励 0, 0, 1 会得到 1 而不是 0.81）。正确做法是前向 $G\\leftarrow G+\\gamma^k r_k$，或走完后从后往前 $G\\leftarrow r_k+\\gamma G$。' },
      { key: 'g', label: 'G：新节点的一个价值样本', color: 'green', text: '这一个数就是 simulation 的全部产出：对“新节点之后还能拿多少”的一次有噪声的估计。rollout 经过的状态**不加入树**。' }
    ]
  };
  const BACKUP = {
    title: 'Backpropagation：逐层回传并更新平均值',
    latex: R`\htmlClass{fx-R}{R}\leftarrow\htmlClass{fx-r}{r}+\gamma R,\qquad \htmlClass{fx-q}{Q(s,a)}\leftarrow Q(s,a)+\htmlClass{fx-lr}{\frac{1}{N(s,a)+1}}\big[\htmlClass{fx-err}{R-Q(s,a)}\big],\qquad \htmlClass{fx-n}{N(s,a)\leftarrow N(s,a)+1}`,
    parts: [
      { key: 'R', label: 'R：从这条边开始的回报', color: 'green', text: '起点是 rollout 的 $G$（新节点是终止状态时 $G=0$）。每往根的方向走一条边，先把下面那一段的回报 $R$ 乘 γ，再加上这条边自己的奖励（这条边的奖励不打折）。课件只写了 $R$，没写这一步；不做的话，不同深度的 $Q$ 就不是同一个量。' },
      { key: 'r', label: '这条边的奖励 r', color: 'gray', text: '在 expansion / selection 时 simulator 返回的那个 $r$。例：$s_{10}$ 选 Right 进入 $s_{11}$ 时 $r=+1$。' },
      { key: 'q', label: '旧的 Q(s,a)', color: 'blue', text: '这条边以前所有样本的平均回报。' },
      { key: 'lr', label: '步长 1/(N+1)', color: 'purple', text: '用**更新前**的 $N$。它让 $Q$ 恰好等于全部样本的算术平均：$\\frac{NQ+R}{N+1}=Q+\\frac{R-Q}{N+1}$。和 bandit、MC prediction 的增量平均是同一个公式。' },
      { key: 'err', label: '误差 R − Q', color: 'red', text: '新样本比旧平均高就往上调，低就往下调。' },
      { key: 'n', label: '访问次数加 1', color: 'orange', text: '边的 $N(s,a)$ 和节点的 $N(s)$ 都加 1。一直做到根为止。新节点刚建立时也算被访问了一次（$N(s)=1$），但这一次是从它直接开始 rollout，没有经过它的任何动作，所以它的各个 $N(s,a)$ 仍是 0。因此除了最初的根节点，一个节点通常满足 $N(s)=1+\\sum_aN(s,a)$。' }
    ]
  };
  const UCB = {
    title: 'UCB tree policy（c = √2 时为 UCB1，MCTS 称为 UCT）',
    latex: R`\pi_{\text{tree}}(s)=\arg\max_a\Big[\htmlClass{fx-q}{Q(s,a)}+\htmlClass{fx-c}{c}\,\htmlClass{fx-bonus}{\sqrt{\frac{\ln \htmlClass{fx-ns}{N(s)}}{\htmlClass{fx-nsa}{N(s,a)}}}}\Big]`,
    parts: [
      { key: 'q', label: 'exploitation：目前的平均回报', color: 'blue', text: '只看这一项就是 greedy。课件决策 1 的根：Up $-0.0250$，Left $-0.0730$，Down $-0.0905$，Right $-0.1580$。' },
      { key: 'c', label: '探索强度 c', color: 'purple', text: '$c=0$：纯 greedy；$c$ 越大越重视少试的动作。UCB1 取 $c=\\sqrt2$（课件例子使用的值）。' },
      { key: 'bonus', label: 'exploration bonus', color: 'green', text: '“这个估计还有多不确定”。决策 1 的根：Up 试了 64 次，bonus $=\\sqrt2\\sqrt{\\ln200/64}=0.4069$；Right 只试了 36 次，bonus $=0.5425$，更大。' },
      { key: 'ns', label: 'N(s)：节点总访问次数', color: 'teal', text: '放在 $\\ln$ 里，增长很慢。父节点不断被访问而某动作一直没被选，它的 bonus 会慢慢变大，所以不会被永远放弃。' },
      { key: 'nsa', label: 'N(s,a)：这个动作试过的次数', color: 'orange', text: '在分母，试得越多 bonus 越小。$N(s,a)=0$ 时按惯例记作 $+\\infty$：每个动作先各试一次。' }
    ]
  };
  const EXPECTIMAX = {
    title: 'Expectimax 的两种节点',
    latex: R`\htmlClass{fx-chance}{Q(s,a)=\sum_{s',r}P(s',r\mid s,a)\big(r+\gamma\max_{a'}Q(s',a')\big)},\qquad \htmlClass{fx-dec}{V(s)=\max_a Q(s,a)}`,
    parts: [
      { key: 'chance', label: 'chance node：取期望', color: 'orange', text: '“自然”决定结果。用模型给出的概率把每个结果的 $r+\\gamma V(s\')$ 加权平均。终止状态的后续价值按定义为 0。例：$s_{10}$ 选 Right 深度 2：$0.8\\times(1+0)+0.1\\times(0+0.9\\times0.8)+0.1\\times(0+0.9\\times0)=0.872$。' },
      { key: 'dec', label: 'decision node：取最大', color: 'blue', text: 'agent 自己选动作，所以取最好的那个。两式合起来就是 Bellman optimality equation，只是画成了一棵从当前状态展开的树。' }
    ]
  };
  const VLEAF = {
    title: 'AlphaGo 的叶节点评估',
    latex: R`\htmlClass{fx-v}{V_{\text{leaf}}}=(1-\htmlClass{fx-l}{\lambda})\,\htmlClass{fx-net}{v_\theta(s_L)}+\lambda\,\htmlClass{fx-z}{z_{\text{rollout}}}`,
    parts: [
      { key: 'net', label: 'value network 的预测', color: 'blue', text: '看一眼局面 $s_L$ 就给出当前走棋方的胜负期望：预测的是结果 $z$（赢 $+1$、输 $-1$）的平均值，不是直接预测胜率。没有平局时 $v=2P(\\text{赢})-1$，例如 $v=0.5$ 对应 75% 赢。网络由自我对弈产生的 $(s,z)$ 训练。' },
      { key: 'z', label: '快速 rollout 的结果', color: 'green', text: '从 $s_L$ 用快速 rollout policy 下到终局，赢 $+1$、输 $-1$。是真实结果，但只是一局，噪声大。' },
      { key: 'l', label: '混合系数 λ', color: 'purple', text: '$\\lambda=0$ 只用网络，$\\lambda=1$ 只用 rollout。课件没有给具体值（原论文取 0.5，课件未讲）。' },
      { key: 'v', label: '回传的评估值', color: 'red', text: '代替普通 MCTS 中 rollout 的 $G$，沿路径回传更新 $N(s,a)$ 和平均 $Q(s,a)$。网络值和 rollout 结果都要从**同一方**（叶节点上轮到走棋的一方）的视角算。往上回传时，每到另一方的节点就取一次负：例如叶节点轮到白方、评估 $+0.6$（对白方有利）；它的父节点轮到黑方，黑方那一步收到的评估是 $-0.6$；再上一层轮到白方，又是 $+0.6$（围棋没有中间奖励，折扣取 1）。' }
    ]
  };
  const PUCT = {
    title: 'PUCT（AlphaGo Zero / AlphaZero 的 selection）',
    latex: R`a=\arg\max_b\Big[\htmlClass{fx-q}{Q(s,b)}+\htmlClass{fx-c}{c_{\text{puct}}}\,\htmlClass{fx-p}{P(s,b)}\,\htmlClass{fx-num}{\frac{\sqrt{\sum_u N(s,u)}}{1+N(s,b)}}\Big]`,
    parts: [
      { key: 'q', label: 'search value', color: 'blue', text: '树中对这一步的平均评估，和 UCT 里的 $Q$ 一样。' },
      { key: 'c', label: 'c_puct', color: 'purple', text: '探索强度。' },
      { key: 'p', label: 'learned prior P(s,b)', color: 'green', text: '网络认为“这一步值得看”的概率 $p_\\theta(b\\mid s)$。prior 高的动作在搜索初期得到更多关注。' },
      { key: 'num', label: '访问次数项', color: 'orange', text: '分母 $1+N(s,b)$：同一个动作被选得越多，加分越少。和 UCT 不同，$N(s,b)=0$ 时这一项是有限值 $\\sqrt{\\sum_u N}$，不是 $+\\infty$——prior 很低的动作可能很久都不会被试。没访问过的动作还没有样本平均，$Q$ 记作 0（AlphaGo Zero 把新边初始化为 $N=0,Q=0,P=p_\\theta$），所以它的分数就是 $c_{\\text{puct}}P\\sqrt{\\sum_uN}$。' }
    ]
  };
  const SELFPI = {
    title: '自我对弈：根访问次数变成搜索策略',
    latex: R`\htmlClass{fx-pi}{\pi_t(a\mid s_t)}=\frac{\htmlClass{fx-n}{N(s_t,a)}^{1/\htmlClass{fx-tau}{\tau}}}{\sum_b N(s_t,b)^{1/\tau}},\qquad a_t\sim\pi_t`,
    parts: [
      { key: 'n', label: '根节点各动作的访问次数', color: 'orange', text: '搜索结束后统计。访问越多 = 搜索越认为它好。' },
      { key: 'tau', label: '温度 τ > 0', color: 'purple', text: '$\\tau=1$：概率正比于访问次数；$\\tau$ 越小越集中在访问最多的动作（访问最多的动作唯一时，$\\tau\\to0$ 相当于直接选它）；$\\tau$ 越大越平均，对弈更多样。访问次数为 0 的动作概率始终为 0。' },
      { key: 'pi', label: '搜索策略 π_t', color: 'blue', text: '既用来**抽样落子**，又被记录下来当作训练网络 policy 的目标。它不是网络直接输出的 $p_\\theta$，而是“网络 + 搜索”之后的结果，通常比 $p_\\theta$ 更好。' }
    ]
  };
  const LOSS = {
    title: 'AlphaGo Zero 的训练损失',
    latex: R`L(\theta)=\htmlClass{fx-v}{\big(z_t-v_\theta(s_t)\big)^2}-\htmlClass{fx-p}{\sum_a\pi_t(a\mid s_t)\log p_\theta(a\mid s_t)}+\htmlClass{fx-reg}{\beta\lVert\theta\rVert^2}`,
    parts: [
      { key: 'v', label: 'value error', color: 'blue', text: '让 $v_\\theta(s_t)$ 接近这局的实际结果 $z_t$（站在 $s_t$ 时走棋方的视角：赢 $+1$，输 $-1$；AlphaZero 还有平局 0）。例：$z=+1$、$v=0.6$ 时为 $0.16$。' },
      { key: 'p', label: 'match the search policy', color: 'green', text: '交叉熵：让网络 prior $p_\\theta$ 去模仿搜索策略 $\\pi_t$。$p_\\theta=\\pi_t$ 时这一项最小。' },
      { key: 'reg', label: 'L2 正则', color: 'gray', text: '防止参数过大（过拟合）。' }
    ]
  };
  const MUZERO = {
    title: 'MuZero 学到的三个函数',
    latex: R`\htmlClass{fx-h}{x_0=h_\theta(o_{\le t})},\qquad \htmlClass{fx-g}{(x_{k+1},\hat r_{k+1})=g_\theta(x_k,a_k)},\qquad \htmlClass{fx-f}{(p_k,v_k)=f_\theta(x_k)}`,
    parts: [
      { key: 'h', label: 'representation：观测 → 内部状态', color: 'blue', text: '把到目前为止的观测（棋盘、游戏画面）编码成一个学到的内部状态 $x_0$，作为搜索树的根。' },
      { key: 'g', label: 'dynamics：学到的“模型”', color: 'orange', text: '给内部状态和动作，预测下一个内部状态和奖励。MCTS 的 expansion 就调用它，代替 AlphaZero 中已知的游戏规则。它不需要重建下一张图像或棋盘，只需要预测搜索用得到的东西。' },
      { key: 'f', label: 'prediction：policy prior 与 value', color: 'green', text: '和 AlphaZero 的网络作用相同：给 selection 提供 prior，给新节点提供价值估计。$x_k$ 是搜索深度 $k$ 处的内部状态。' }
    ]
  };

  root.RL.content.add([
  /* ------------------------------------------------------------------ c32 */
  {
    id: 'c32', part: 'p9', title: '在线决策与模型', en: 'Online vs offline decision-making; declarative vs generative models',
    summary: '前面课程里的 DP 和 RL 都按**离线**流程使用：先算出（或训练出）一个能直接执行的 policy，再执行。问题太大、时间太紧时，改成**在线**：只为**当前**状态决定一个动作，执行、观察结果，再为新状态决定。在线规划需要一个模型：**declarative**（把 $p$、$r$ 全写出来）或 **generative**（simulator：给 $(s,a)$ 返回一个采样的 $(s\',r)$）。',
    goals: ['说出离线与在线决策的步骤差别，以及 online planning 与 online RL 的差别', '列出让离线方法吃力的因素：状态/动作空间大、horizon 长、多智能体、不完全信息、随机转移、决策时间有限', '区分 declarative model、generative model（simulator）与 model-free', '解释“在线”和“高效的在线”各需要什么'],
    prereq: '第 2 章（MDP）、第 12 章（model-based vs model-free）',
    what: R`
**回顾：model-free RL 学了什么（W11 p.3）**

| 方法 | 学什么 | 例子 |
|---|---|---|
| Value-based（tabular） | $Q(s,a)\to\pi$ | SARSA、Q-learning |
| Value-based（近似） | $Q(s,a;\mathbf w)\approx Q(s,a)\to\pi$ | 近似 Q-learning |
| Policy-based（tabular） | $\pi(a\mid s)$ | REINFORCE |
| Policy-based（近似） | $\pi(a\mid s;\boldsymbol\theta)\approx\pi(a\mid s)$ | |
| Actor-critic（近似） | actor $\pi(a\mid s;\boldsymbol\theta)$ + critic $V(s;\mathbf w)\approx V(s)$ | REINFORCE with baseline、A2C |

RL 部分到此结束。W11 “跳出来”看决策问题的全局。

**离线决策（offline）**：给定问题 → 计算出 plan 或 policy → 执行它。
- 经典规划：算出一个 plan；
- 已知模型的 MDP：用动态规划（value iteration、policy iteration）算出 policy；
- 模型未知的 MDP：用 RL **学**出 policy。

**在线决策（online）**：观察当前状态 → 选一个动作 → 执行 → 观察结果，重复。
- **Online planning**：用规划模型预测每个动作的后果，找出一个 plan，**只执行第一步**，然后在新状态重新规划。
- **Online RL**：按当前 policy 选动作，再根据观察到的结果更新 policy。课件的说法：关键在于 policy **是否还在变化**——就像 multi-armed bandit，边拉杆边改策略。
`,
    why: R`
**为什么需要在线方法（W11 p.6）**

课件的关键词是 **complex**。离线方法表现差的典型例子：棋类（围棋、国际象棋、牌类）和电子游戏（StarCraft II、Dota 2，尤其是团队对战）。

什么让问题对离线方法来说“太复杂”：
- **问题规模太大**：状态空间大、动作空间大、规划 horizon 长；多个智能体、不完全信息、随机转移。例如围棋 19×19 的棋盘，粗略的局面数 $3^{361}\approx1.7\times10^{172}$——不可能为每个局面都存一个动作。
- **决策时间有限**：例如 lifelong Multi-Agent Path Finding（MAPF）：2000 个 agent，只有 1 秒做决定。

离线得到的 policy 必须能对**任何**可能遇到的状态给出动作（表格方法要逐个状态存，函数近似也要在所有状态上都可靠），而在线方法每次只需要回答“**现在**这个状态该怎么走”。

课件提出的两个问题：
- 什么让一个方法成为“在线”的？**按时**给出决策。
- 什么让在线方法**高效**？**复用之前决策时算过的结果**（MCTS 的做法：执行动作后保留对应的子树，下次接着用）。
`,
    intuition: R`
**出发前把整本地图的每个路口都写好走法 vs 每到一个路口才往前推演几步**

- 课程 4×3 Gridworld 只有 11 个状态，value iteration 可以离线把 11 个状态的价值全部算出来（例如 $V^*(s_1)=0.5452$），之后查表就能行动。
- 围棋做不到：状态多到无法列举。但在任意时刻，**真正需要**的只是当前局面的一步棋。在线规划把全部计算花在“从当前状态出发、可能到达的那一小部分状态”上。
- 代价：每一步都要现场计算，而且需要一个能预测后果的**模型**。这个模型可以是完整的概率表，也可以只是一个能“试走”的 simulator。
`,
    math: R`
**Model-based：agent 能访问问题的模型（W11 p.7）**

- **Declarative model**（声明式）：把问题完整写出来。
  - 经典规划：$P=\langle S,s_0,S_G,A,T,c\rangle$（状态、初始状态、目标状态集合、动作、转移函数、代价）；
  - MDP：$M=\langle S,A,p,r,\gamma\rangle$。
- **Generative model**（生成式模型，也叫 simulator / 模拟器）：一个函数，输入状态 $s$ 和动作 $a$，返回**一个**下一状态 $s'$ 和奖励 $r$。

**Model-free**：agent 只能和**环境**交互——执行动作 $A_t$，观察结果 $(S_{t+1},R_{t+1})$。

三者的关系：
- declarative 模型可以当 generative 用（按 $p$ 抽样即可），反过来不行。
- generative model 和真实环境都只给样本，区别在于：simulator 可以从**任意**状态开始、同一个 $(s,a)$ 反复调用、试错没有代价；真实环境只能从当前状态往前走，走了就不能撤销。

课件的提醒：**方案的表现往往取决于模型的质量**。模型预测错了，基于它做出的规划也会错。
`,
    formulas: [GEN],
    example: R`
**课程 Gridworld，在 $s_1=(0,0)$ 选 Up**（动作以 0.8 的概率按意图移动，各 0.1 的概率向意图方向的左边或右边打滑；撞墙或出界则留在原地；只有进入 $+1$ 格 $s_{11}$ 或 $-1$ 格 $s_7$ 时有奖励）

Declarative model 直接给出整张表：

| 移动尝试 | 概率 | 结果 | $r$ |
|---|---|---|---|
| 按意图向上 | 0.8 | $s_5=(0,1)$ | 0 |
| 向左打滑（向西） | 0.1 | 撞左边界，留在 $s_1$ | 0 |
| 向右打滑（向东） | 0.1 | $s_2=(1,0)$ | 0 |

Generative model 只能一次次调用：第 1 次返回 $(s_5,0)$，第 2 次 $(s_5,0)$，第 3 次 $(s_2,0)$……调用很多次后，频率才接近 0.8 / 0.1 / 0.1。

**同一个问题的离线与在线做法**
- 离线：value iteration 对 11 个状态反复做 Bellman backup，得到 $\pi^*(s_1)=\text{Up}$，然后执行。
- 在线（MCTS，课件例子）：站在 $s_1$，用 simulator 模拟 200 次，只为 $s_1$ 选出一个动作（也是 Up）；执行后到了新状态，再模拟 200 次……
`,
    viz: { id: 'mdp', props: { state: 1, action: 'N', mode: 'generative' }, guide: R`
**怎么用**：

1. 选 $s_1$、动作 Up，访问方式切到“已知模型（declarative）”：直接看到三条移动尝试和合并后的 $p(s',r\mid s,a)$。
2. 切到“只能采样（generative）”：反复采样，看频率怎样逐渐接近 0.8 / 0.1 / 0.1。MCTS 只需要这种访问方式。` },
    compare: R`
| | 离线（DP / RL 训练） | 在线规划（如 MCTS） | 在线 RL |
|---|---|---|---|
| 什么时候计算 | 执行之前算好（或训练好） | 每一步执行前，现场算 | 边执行边更新 |
| 为哪些状态计算 | 要覆盖所有可能遇到的状态 | 只为当前状态（及其附近） | 实际经过的状态 |
| 需要模型吗 | DP 需要 declarative；RL 不需要 | 需要（generative 即可） | 不必需要（也可以学一个模型来用） |
| 输出 | 完整的 policy | 当前这一步的动作 | 不断改进的 policy |
| 适合 | 状态少、有充足的离线时间 | 状态极多、有 simulator、每步有计算预算 | 没有模型，只能与环境交互 |
`,
    pitfalls: [
      { wrong: 'Q-learning 训练时边走边更新，所以算在线 RL。', right: '看 policy 被**真正使用**时是否还在变。训练完再部署、部署后 policy 冻结，属于离线；执行真实任务的同时还在更新，才是在线 RL。在线/离线也和 on-policy/off-policy 无关，后者问的是“被学习的 policy 和产生数据的 policy 是不是同一个”。' },
      { wrong: '在线方法就是 model-free 的。', right: '在线**规划**（例如 MCTS）恰恰需要模型或 simulator 来预测后果；在线 RL 可以不用模型。在线 / 离线说的是“何时计算”，model-based / model-free 说的是“能不能访问模型”，这是两个独立的维度。' },
      { wrong: 'Generative model 就是真实环境。', right: '两者都只给样本，但 simulator 可以从任意状态开始、同一个 $(s,a)$ 反复试，试错没有后果；真实环境只能从当前状态往前走，不能撤销。' },
      { wrong: '在线规划每一步都从零开始算，所以一定很浪费。', right: '课件强调高效的在线方法要**复用**之前的结果：MCTS 执行动作后保留对应子树，下次搜索接着用（课件 Gridworld 例子中，根节点的访问次数因此超过 200）。' },
      { wrong: '有了模型，规划结果就一定可靠。', right: '课件的警告：表现往往取决于**模型质量**。模型预测错了，规划也会错。' }
    ],
    quiz: [
      { kind: '概念判断', q: '下列哪一项是**在线规划**（online planning）？', options: ['用 value iteration 为所有状态算出 policy，然后执行', '在当前状态用模型预测各动作的后果，找出一个 plan，只执行第一步，然后在新状态重新规划', '用 Q-learning 在环境中训练很多条 episode，训练完再部署', '按当前 policy 行动，并根据观察到的奖励更新 policy'], answer: 1, explain: '在线规划：每一步都用模型现场规划，只执行第一个动作。', why: ['这是离线（DP）。', '正确。', '这是离线训练 RL，再执行。', '这是在线 RL：边行动边更新 policy。'], ctx: false },
      { kind: '概念判断', q: '一个程序可以输入任意状态 $s$ 和动作 $a$，每次返回一个随机的 $(s\',r)$，但不告诉你概率。它是？', options: ['Declarative model', 'Generative model（simulator）', '真实环境', 'Policy'], answer: 1, explain: '只给样本、不给概率表，并且可以从任意状态调用：这是 generative model。真实环境只能从当前状态往前走。', why: ['declarative model 会直接写出 $p$ 和 $r$。', '正确。', '真实环境不能任意指定起始状态，也不能撤销。', 'policy 输出动作，不输出下一状态。'], ctx: false },
      { kind: '概念判断', q: '课件认为什么让一个在线方法变得**高效**？', options: ['离线算出所有状态的 policy', '复用之前决策时得到的结果', '只用 model-free 方法', '把 horizon 设为无穷大'], answer: 1, explain: '课件 p.6：在线 = 按时做决定；高效 = 复用之前的结果。MCTS 的子树复用就是一个例子。', ctx: false },
      { kind: '概念判断', q: '课程 Gridworld 中，在 $s_1=(0,0)$ 选 Up，向左打滑的结果是？', options: ['移动到 (−1, 0)', '撞到左边界，留在 $s_1$', '移动到 $s_5$', '移动到 $s_2$'], answer: 1, explain: 'Up 的左边是西。$s_1$ 在最左列，向西出界，所以留在原地，概率 0.1，奖励 0。', why: ['网格外没有状态。', '正确。', '这是按意图移动（0.8）。', '这是向右打滑（向东，0.1）。'] }
    ],
    source: 'W11-1 p.3（model-free RL 回顾表）、p.4（离线 vs 在线决策）、p.6（在线方法的动机）、p.7（model-based vs model-free、declarative vs generative）。'
  },
  /* ------------------------------------------------------------------ c33 */
  {
    id: 'c33', part: 'p9', title: 'MCTS 的四个步骤', en: 'Selection, expansion, simulation, backpropagation',
    summary: 'MCTS 用**模拟经验**估计当前状态各动作的价值，并在当前状态周围建一棵**搜索树**，把计算集中在有希望的分支上。每次迭代四步：① **selection**：沿着树用 tree policy 往下走；② **expansion**：给树加一个新节点；③ **simulation**：从新节点用简单的 rollout policy 走到底，得到一个回报样本；④ **backpropagation**：把回报沿路径传回根，更新每条边的访问次数 $N$ 和平均回报 $Q$。预算用完后，按根节点各动作的价值选动作执行。随时停下都能给出当前最好的动作，更多计算**可以**改进估计（anytime）。',
    goals: ['说出 MCTS 结合了哪三样东西（Monte Carlo 估计、树搜索、在线规划）', '按顺序说出四步各做什么、用哪个 policy', '手算 rollout 的折扣回报和 backpropagation 的逐层更新', '解释“树内用 tree policy、树外用 rollout policy”的分工', '说出 high-level 流程：找根 → 迭代 → 选动作 → 执行 → 复用子树'],
    prereq: '第 13 章（bandit 与增量平均）、第 15 章（MC prediction）、第 32 章',
    what: R`
**核心思想（W11 p.9）**：用模拟得到的经验估计动作价值，并围绕当前状态建一棵搜索树，把后续计算集中到有希望的地方。

MCTS 结合了三样东西：
- **Monte Carlo 估计**：从采样到的回报估计 $Q(s,a)$，不必枚举所有可能的未来；
- **树搜索**：把之前模拟的结果存在树里，集中搜索有希望的动作；
- **在线规划**：把可用的计算预算全部用在“从当前状态选一个动作”上。

**需要**：一个能生成后继状态和奖励的模型或 simulator（模拟器）。只能采样的 generative model（生成式模型）就够了。

**先认识搜索树**（以课程 Gridworld、agent 站在 $s_1$ 为例）
- **根节点**（root node）：agent **真实**所在的当前状态 $s_1$，深度 0。
- 从一个节点出发，选一个动作、用 simulator 采样一个结果，就到达一个**子节点**，深度加 1。例如 $s_1$ 选 Up、按意图到 $s_5$：$s_5$ 是 $s_1$ 的子节点，深度 1；$s_1$ 是它的**父节点**。
- 还没有任何已存子节点的节点叫**叶节点**（leaf node）。叶节点不一定是终止状态，它只是“树目前只长到这里”。
- 整棵树记录的是**想象中的未来**：搜索时 agent 一步也没有真的走，所有移动都发生在 simulator 里。搜索结束后，agent 才真正执行一个动作。

| 深度 | 节点 | 怎么来的 |
|---|---|---|
| 0 | $s_1$（根） | agent 真实所在的状态 |
| 1 | $s_5$ | 根选 Up，按意图移动 |
| 1 | $s_1$ | 根选 Up，向左打滑撞墙，留在原地（同一个动作的另一个结果，是另一个子节点） |
| 2 | $s_8$ | 深度 1 的 $s_5$ 选 Up，按意图移动 |

**树里存什么**：每个节点对应一个状态 $s$，记录访问次数 $N(s)$；节点下的每个动作 $a$ 记录 $N(s,a)$（试过几次）和 $Q(s,a)$（这些次的平均回报）。动作会打滑，所以同一个动作下面可能挂着好几个子节点（每个采样到的后继状态一个）。同一个状态可能在树里出现好几次（不同深度、不同路径），每个节点**各自**存一份统计；所以 $N(s)$、$Q(s,a)$ 指的是“当前这个节点”的统计。

**四步（每次迭代都做一遍）**

1. **Selection 选择**（p.10）：从根出发，在每个节点按 **tree policy** $\pi_{\text{tree}}$ 选一个**动作**，由 simulator 抽一个结果，走到对应的子节点；反复往下，直到到达一个还要往下长的节点。
2. **Expansion 扩展**（p.11）：在这个节点按 $\pi_{\text{tree}}$ 选一个动作 $a$，用 simulator 得到结果 $(s',r)$，为 $s'$ 加一个**新子节点**。
3. **Simulation 模拟 / rollout**（p.13）：从新节点出发，用 **rollout policy** $\pi_{\text{sim}}$（也叫 default policy；通常是随机或简单启发式）一直走，直到终止状态或用完模拟预算，累计折扣奖励。
4. **Backpropagation 回传**（p.14）：从新节点开始往根走，沿途更新每条边的 $Q(s,a)$、$N(s,a)$ 和每个节点的 $N(s)$，直到根。（这里只是计数和算平均，不求导，和神经网络训练里的“反向传播”不是一回事。）

**Anytime**：搜索可以在任何时候停下，返回当前最好的动作；更多计算可以改进估计（课件：“can improve”），但不保证每多一次迭代都更好。
`,
    why: R`
**为什么不直接对每个动作做纯 Monte Carlo？**

最简单的想法：在根上对每个动作各做很多次随机 rollout，取平均。问题是随机 rollout 估计的是“**之后都随机走**”的价值，不是“之后走得好”的价值。课程 Gridworld 中，均匀随机 policy 下 $s_1$ 的价值约为 $-0.066$，而最优价值是 $0.5452$——随机走的回报会严重低估好的动作。

MCTS 的树记住了之前的模拟：靠近根的部分被访问很多次，在那里 agent 按 tree policy **有选择地**走（偏向好的动作），只在树的边缘之外才随机走。树越长越深，“随机走”的部分越靠后、影响越小，根附近的估计也就越接近好的走法。

**为什么不把整棵树展开（Expectimax：把每个动作的所有可能结果都展开、按概率求期望的完整搜索树）？**

完全展开的树按指数增长：课程 Gridworld 中，从 $s_1$ 展开 1 层有 10 个叶子（Up、Right 各有 3 个不同结果，Down、Left 各有 2 个，因为撞墙的分支会落回同一格），2 层 100 个，3 层 1018 个。MCTS 每次迭代只加一个节点，而且多加在有希望的分支上，树是**不对称**的。
`,
    intuition: R`
**树是“记忆”，rollout 是“速写”**

- **树内**（selection）：这些状态已经访问过很多次，有统计数据，就用 tree policy 认真地选——既照顾 $Q$ 高的动作，也给试得少的动作机会。
- **树的边缘**（expansion）：每次迭代只把**一个**新状态记进树里。
- **树外**（simulation）：没有任何统计，只好用便宜的 rollout policy 快速走完，得到一个粗糙的价值样本。rollout 经过的状态**不**记进树。
- **回传**（backpropagation）：这个样本让路径上每条边的平均值都更新一点。下次 selection 就会更偏向表现好的分支。

**selection 什么时候停**：课件 p.10 说“通常树是 fully expanded 的，所以要扩展的节点是叶节点”。意思是：一个节点的所有动作都试过（fully expanded）就继续往下选；遇到还有**没试过的动作**的节点，或者采样到一个树里还没有的后继状态，就停下来扩展。

**一次迭代最多往树里加一个节点**：如果 selection 一路走到了树里已有的终止节点，就没有可扩展的地方（下面例子的第 5 次迭代就是这样）。所以 200 次迭代的新树最多有 1 + 200 个节点。
`,
    math: R`
**Simulation（p.13）**：从新节点 $s_0$ 开始，重复“选 $a_k=\pi_{\text{sim}}(s_k)$，观察 $(s_{k+1},r_k)$”，直到终止或走满 horizon $H$：
$$G=r_0+\gamma r_1+\gamma^2r_2+\dots=\sum_{k=0}^{K-1}\gamma^k r_k,\qquad K\le H.$$
课件把这一步写成 “$s\leftarrow s'$ 且 $r\leftarrow R+\gamma\times r$”，记号不够明确：按时间顺序照字面算会把折扣倒过来（奖励 0, 0, 1 得到 1，正确值是 0.81）。应当前向累加 $G\leftarrow G+\gamma^k r_k$，或者走完后从后往前算 $G\leftarrow r_k+\gamma G$，两者结果相同。如果新节点本身是终止状态，就不需要 rollout，$G=0$。

**Backpropagation（p.14）**：从新节点往根逐条边处理。设 $R$ 一开始等于 $G$，对路径上从下往上的每条边 $(s,a)$（它在 selection / expansion 时得到的奖励是 $r$）：
$$\begin{gathered}R\leftarrow r+\gamma R\\Q(s,a)\leftarrow Q(s,a)+\frac{1}{N(s,a)+1}\big[R-Q(s,a)\big],\qquad N(s,a)\leftarrow N(s,a)+1.\end{gathered}$$
第一式课件没有写出，但必须有：边 $(s,a)$ 的回报 = 这条边的奖励 + γ × 下面那一段的回报。

为什么第二式是平均：若 $Q$ 是前 $N$ 个样本的平均，则 $\frac{NQ+R}{N+1}=Q+\frac{R-Q}{N+1}$ 正好是 $N+1$ 个样本的平均。

**High-level 流程（p.15）**
1. 初始化搜索树：如果已有树，在其中找到当前状态的节点作为根；否则为当前状态新建根节点。
2. 反复做 selection、expansion、simulation、backpropagation，直到计算预算用完。
3. 根据根节点各子节点的价值选动作（课件图：选 $Q$ 最大的动作）。
4. 用模型（或真实环境）执行这个动作，得到 $s'$ 和 $r$；保留所选动作下对应 $s'$ 的子树，回到第 1 步，直到问题解决。
`,
    formulas: [ROLLOUT, BACKUP],
    example: R`
**一棵新树的前 6 次迭代**（根 = $s_{10}=(2,2)$，$\gamma=0.9$，UCB 的 $c=\sqrt2$。下面的随机结果是选定的一种可能，每一步的算术都可以照着验证。$s_{10}$ 的四个动作：Right 按意图进 $+1$ 格 $s_{11}$；Up 按意图撞上边界留在 $s_{10}$；Down 按意图到 $s_6=(2,1)$；Left 按意图到 $s_9=(1,2)$。）

| 迭代 | Selection | Expansion | Simulation（rollout） | Backpropagation |
|---|---|---|---|---|
| 1 | 根还有未试动作，直接扩展 | 试 Right：按意图进 $s_{11}$，$r=+1$；新节点 $s_{11}$ 是终止状态 | 不需要，$G=0$ | $R=1+0.9\times0=1$；$Q(s_{10},\text{R})=1$，$N=1$ |
| 2 | 同上 | 试 Left：到 $s_9$，$r=0$ | $s_9\xrightarrow{\text{R}}s_{10}$（0），$s_{10}\xrightarrow{\text{R，向右打滑=向南}}s_6$（0），$s_6\xrightarrow{\text{R}}s_7$（$-1$）：$G=0+0.9\times0+0.81\times(-1)=-0.81$ | $R=0+0.9\times(-0.81)=-0.729$；$Q(s_{10},\text{L})=-0.729$ |
| 3 | 同上 | 试 Up：撞边界留在 $s_{10}$，$r=0$；新建一个**深度 1** 的 $s_{10}$ 节点 | $s_{10}\xrightarrow{\text{R}}s_{11}$（$+1$）：$G=1$ | $R=0+0.9\times1=0.9$；$Q(s_{10},\text{U})=0.9$ |
| 4 | 同上 | 试 Down：到 $s_6$，$r=0$ | $s_6\xrightarrow{\text{R}}s_7$（$-1$）：$G=-1$ | $R=-0.9$；$Q(s_{10},\text{D})=-0.9$ |

此时根的 4 个动作都试过一次，$N(s_{10})=4$。selection 用 UCB 打分：$\text{UCB}(s,a)=Q(s,a)+c\sqrt{\ln N(s)/N(s,a)}$。它和 bandit 的 UCB 是同一个式子，只是把“总共拉了几次杆”$t$ 换成这个节点的访问次数 $N(s)$（新树的根 $N(s)=\sum_aN(s,a)$），分数最高的动作被选中。**迭代 5** 开始用 UCB 选：$\ln4=1.3863$，每个动作的 bonus 都是 $\sqrt2\sqrt{1.3863/1}=1.6651$。

| 动作 | $Q$ | $N$ | UCB |
|---|---|---|---|
| Right | 1 | 1 | **2.6651** |
| Up | 0.9 | 1 | 2.5651 |
| Left | −0.729 | 1 | 0.9361 |
| Down | −0.9 | 1 | 0.7651 |

选 Right，采样又是按意图进 $s_{11}$。这个子节点已经在树里而且是终止状态：selection 到此结束，没有新节点、没有 rollout，$G=0$，$R=1$。$Q(s_{10},\text{R})=1+(1-1)/2=1$，$N=2$；$N(s_{10})=5$。

**迭代 6**：$\ln5=1.6094$。Right：$1+\sqrt2\sqrt{1.6094/2}=1+1.2686=2.2686$；Up：$0.9+\sqrt2\sqrt{1.6094/1}=0.9+1.7941=$ **2.6941**；Left：$1.0651$；Down：$0.8941$。这次选 **Up**——它的 $Q$ 比 Right 低，但只试过 1 次，bonus 更大（exploration）。

- Selection：Up 又撞边界留在 $s_{10}$，这个后继节点（深度 1 的 $s_{10}$）已经存在，往下走。它的 4 个动作都没试过，停下。
- Expansion：在深度 1 的 $s_{10}$ 试 Right，这次向左打滑（Right 的左边是北），撞边界留在 $s_{10}$，$r=0$；新建**深度 2** 的 $s_{10}$ 节点。
- Simulation：$s_{10}\xrightarrow{\text{R}}s_{11}$（$+1$），$G=1$。
- Backpropagation（从下往上）：边（深度 1 的 $s_{10}$，Right）：$R=0+0.9\times1=0.9$，$Q=0.9$，$N=1$。边（根 $s_{10}$，Up）：$R=0+0.9\times0.9=0.81$，$Q=0.9+(0.81-0.9)/2=0.855$，$N=2$。

注意两点：同一个状态 $s_{10}$ 在树里出现了三次（根、深度 1、深度 2），因为“撞墙留在原地”也是一个后继；越往上，$R$ 多乘一次 $\gamma$。
`,
    viz: { id: 'mctsstep', guide: R`
**怎么用**：

1. 默认根是 $s_1$。点“下一阶段”，按 ① → ④ 一步步看一次迭代：前 4 次迭代根还有没试过的动作，selection 为空，直接扩展。
2. 第 5 次起，selection 表格列出每层四个动作的 $Q$、$N$、bonus 和 UCB，高亮的是被选中的动作。
3. ③ 列出 rollout 的每一步和 $\gamma^k r$；④ 列出从下往上每条边的 $R=r+\gamma R$ 和增量平均。
4. 点“再跑 200 次”后看树的前两层：$N$ 集中在少数动作上，根下面同一动作挂着多个后继（打滑）。点格子可以换根，例如 $s_{10}$。没试过的动作随机挑一个先试；例题里的顺序和打滑结果只是其中一种可能，所以换根到 $s_{10}$ 后数字不一定和例题相同，但每一步的算法一样。` },
    compare: R`
| | 树内（selection） | 树的边缘（expansion） | 树外（simulation） |
|---|---|---|---|
| 用哪个 policy | tree policy（UCB 等） | tree policy（先试没试过的动作） | rollout policy（随机 / 简单启发式） |
| 有没有统计数据 | 有：$N(s,a)$、$Q(s,a)$ | 刚刚建立 | 没有 |
| 经过的状态存进树吗 | 已经在树里 | 新增**一个**节点 | 不存 |
| 目的 | 在已知区域里平衡利用与探索 | 让树慢慢长大 | 快速得到新节点的价值样本 |

**和 W7 的 MC prediction 比**：两者都用增量平均 $Q\leftarrow Q+\frac{1}{N+1}(G-Q)$ 估计价值；MC prediction 评估一个**固定**的 policy，MCTS 的树内 policy 随统计不断变化，并且只为当前状态服务。
`,
    pitfalls: [
      { wrong: 'Tree policy 和 rollout policy 是同一个。', right: '树内用 tree policy（如 UCB），要平衡利用与探索；树外用便宜的 rollout policy（通常随机），只负责快速走完。' },
      { wrong: 'rollout 经过的每个状态都会被加入树。', right: '每次迭代最多加入**一个**新节点；rollout 的状态用完就丢，只留下回报 $G$。' },
      { wrong: 'Backpropagation 时，路径上每条边都用同一个 $G$ 更新。', right: '每往上一层要先算 $R\\leftarrow r+\\gamma R$：把下面的回报乘 γ，再加上这条边的奖励。离根越近的边，回报包含的步数越多。' },
      { wrong: 'MCTS 需要知道转移概率 $p(s\',r\\mid s,a)$。', right: '只需要 simulator 能给出样本 $(s\',r)$。expansion、simulation 和 selection 中的“采样后继”都只调用 simulator。' },
      { wrong: '新节点是终止状态时也要做 rollout。', right: '终止状态之后没有奖励，$G=0$；进入终止状态的奖励（如 $+1$）已经记在通往它的那条边上，回传时由 $R=r+\\gamma R$ 加进去。' }
    ],
    quiz: [
      { kind: '概念判断', q: 'MCTS 的四个步骤中，哪一步使用 rollout policy $\\pi_{\\text{sim}}$？', options: ['Selection', 'Expansion', 'Simulation', 'Backpropagation'], answer: 2, explain: 'Selection 和 expansion 用 tree policy；simulation 从新节点用 rollout policy 走到底；backpropagation 不选动作。', ctx: false },
      { kind: '公式计算', q: '某条边 $Q(s,a)=0.4$、$N(s,a)=3$，回传的 $R=0.8$。更新后 $Q(s,a)$ 是多少？', answer: 0.5, tol: 0.0005, explain: '$Q\\leftarrow0.4+\\frac{1}{3+1}(0.8-0.4)=0.4+0.1=0.5$，然后 $N=4$。等价于：前 3 次平均 0.4（总和 1.2），加上 0.8 后 4 次总和 2.0，平均 0.5。', ctx: false },
      { kind: '轨迹推导', q: '课程 Gridworld（$\\gamma=0.9$）。一次迭代的路径：根 $s_8$ 选 Right 到 $s_9$（$r=0$），$s_9$ 是新节点；rollout：$s_9\\to s_{10}$（$r=0$），$s_{10}\\to s_{11}$（$r=+1$）。回传到根的边 $(s_8,\\text{Right})$ 时 $R$ 是多少？', answer: 0.81, tol: 0.0005, explain: 'rollout：$G=0+0.9\\times1=0.9$。边 $(s_8,\\text{Right})$：$R=r+\\gamma G=0+0.9\\times0.9=0.81$。从 $s_8$ 看，$+1$ 是第 3 个奖励，乘 $\\gamma^2$。' },
      { kind: '概念判断', q: '一棵新树做了 200 次 MCTS 迭代，树中有多少个节点（每次迭代都成功扩展一个新节点）？', options: ['200', '201', '800', '取决于 rollout 的长度'], answer: 1, explain: '根 1 个，每次迭代加 1 个，共 201 个。rollout 的状态不进树，所以和 rollout 长度无关。', ctx: false },
      { kind: '概念判断', q: '关于 MCTS 的 “anytime” 性质，正确的是？', options: ['必须跑满预算才能给出动作', '随时可以停下返回当前最好的动作，更多计算可以改进估计', '每次迭代都会改变最终选择的动作', '只能用于确定性问题'], answer: 1, explain: '课件 p.9：搜索可以随时停下返回当前最佳动作；更多计算能改进估计。', ctx: false }
    ],
    source: 'W11-1 p.9（MCTS 核心思想）、p.10（selection）、p.11（expansion）、p.13（simulation）、p.14（backpropagation）、p.15（high-level 流程）。'
  },
  /* ------------------------------------------------------------------ c34 */
  {
    id: 'c34', part: 'p9', title: 'Tree policy：ε-greedy、softmax、UCB/UCT', en: 'Common tree policies and UCB1 / UCT',
    summary: 'Tree policy 在树内选动作，必须平衡 **exploitation**（去 $Q$ 高的地方）和 **exploration**（去试得少的地方）——树里的每个节点都是一个 bandit 问题。课件列出三种：ε-greedy、softmax、UCB。UCB 给 $Q$ 加一个随 $N(s,a)$ 减小的 bonus；$c=\\sqrt2$ 时称为 UCB1，用 UCB1 的 MCTS 叫 **UCT**。用课件决策 1 的根节点数字算，四个动作的 UCB 分数都约为 0.38。',
    goals: ['写出 ε-greedy、softmax、UCB 三种 tree policy', '用课件决策 1 的 Q、N 手算 UCB', '解释 bonus 中 $\\ln N(s)$ 与 $N(s,a)$ 的作用', '区分“搜索中用 UCB 选”与“搜索结束后按 Q 或 N 选要执行的动作”'],
    prereq: '第 13–14 章（bandit 与 UCB）、第 33 章',
    what: R`
**记号（W11 p.12）**
- $|A|=n$：状态 $s$ 中可选动作的个数；
- $Q(s,a)$：在 $s$ 选 $a$ 的估计价值；$a^*=\arg\max_aQ(s,a)$：$s$ 中的贪心动作；
- $N(s)$：这个节点被访问的次数（同一状态在树里可能有几个节点，各记各的）；$N(s,a)$：在这个节点选过 $a$ 的次数。

**ε-greedy**
$$\pi_{\text{tree}}(a\mid s)=\begin{cases}1-\varepsilon+\dfrac{\varepsilon}{n}, & a=a^*\ (\text{greedy}),\\[4pt] \dfrac{\varepsilon}{n}, & a\neq a^*\ (\text{non-greedy}).\end{cases}$$

**Softmax**
$$\pi_{\text{tree}}(a\mid s)=\frac{e^{Q(s,a)/\tau}}{\sum_be^{Q(s,b)/\tau}}.$$

**Upper Confidence Bound（UCB）**
$$\pi_{\text{tree}}(s)=\arg\max_a\Big[Q(s,a)+c\sqrt{\frac{\ln N(s)}{N(s,a)}}\Big].$$
UCB1：$c=\sqrt2$。使用 UCB1 作为 tree policy 的 MCTS 称为 **UCT**（Upper Confidence bounds applied to Trees）。
`,
    why: R`
**树里的每个节点都是一个 multi-armed bandit**

在节点 $s$ 选动作，就像拉 bandit 的杆：每个动作的“奖励”（回报样本）是随机的，我们只知道样本平均 $Q(s,a)$。

- 只选 $Q$ 最大的（greedy）：某个其实很好的动作，可能因为前一两次运气差而被永远放弃。
- 只顾探索：计算浪费在明显差的分支上，好分支长不深。

课件决策 1 的根就是例子：Right 的平均值最低（$-0.158$），但它只被试了 36 次；Up 被试了 64 次。还要不要再试 Right？UCB 用公式回答这个问题。
`,
    intuition: R`
**UCB = 平均值 + “还有多不确定”**

- bonus $c\sqrt{\ln N(s)/N(s,a)}$ 随 $N(s,a)$ 增大而变小：试得越多，平均值越可信，加分越少。
- $\ln N(s)$ 增长很慢：父节点不断被访问、某个动作却一直没被选，它的 bonus 会慢慢回升，所以不会被永远放弃。
- 结果像“**注水**”：UCB 去分数最高的那个动作；被选中后它的 bonus 变小，分数**通常**下降，于是轮到别的动作（新样本若特别好，$Q$ 上升，也可能连续被选）。经过很多次迭代，各动作的 UCB 分数往往会接近——这时 $Q$ 高的动作访问次数多，$Q$ 低的访问次数少。这是常见的现象，不是每棵树都保证的性质。

课件决策 1 的根正好是这样：200 次迭代后，四个 UCB 分数在 0.378 到 0.385 之间。

**ε-greedy 和 softmax** 是随机的，而且**只看 $Q$、不看 $N$**：一个只试过 1 次的动作和一个试过 100 次的动作，只要 $Q$ 相同就被同等对待。UCB 总是选分数最高的动作（分数并列时要另定规则，例如随机或固定顺序；本站对未试过的动作随机挑），并且直接用访问次数衡量不确定性。
`,
    math: R`
**$N(s,a)=0$ 怎么办**：分母为 0，按惯例把 UCB 记作 $+\infty$，所以每个动作都会先被试一次——这正是 expansion 先试未试动作的原因。

**$c$ 的两个极端**：$c=0$ 时退化为 greedy；$c$ 很大时 $Q$ 几乎不起作用，访问次数趋于平均分配。$c$ 的合适大小和回报的范围有关（课程 Gridworld 的回报在 $[-1,1]$ 内）：bonus 和 $Q$ 直接相加，单位必须一致。回报全部乘 10，$Q$ 之间的差距放大 10 倍，bonus 却不变，探索就相对变弱。UCB1 的 $\sqrt2$ 是按回报在 $[0,1]$ 内推出来的，回报范围变了，$c$ 也要跟着缩放。

**和 W7 bandit 的 UCB 对照**：bandit 中是 $Q_t(a)+c\sqrt{\ln t/N(a)}$，$t$ 是总共拉了几次杆。MCTS 中每个节点各自是一个 bandit，$t$ 换成这个节点的访问次数 $N(s)$。

**搜索中选动作 ≠ 最终执行的动作**：UCB 只用于搜索**过程中**决定往哪里模拟；搜索结束后，执行的动作按根节点子节点的价值选（课件图：$Q$ 最大；AlphaGo：访问次数最多）。
`,
    formulas: [UCB],
    example: R`
**课件决策 1 的根节点（$s_1$，200 次迭代后，$c=\sqrt2$）**

$N(s_1)=64+52+36+48=200$，$\ln200=5.2983$。

| 动作 | $Q(s,a)$ | $N(s,a)$ | bonus $=\sqrt2\sqrt{5.2983/N(s,a)}$ | UCB |
|---|---|---|---|---|
| Up | −0.0250 | 64 | $\sqrt2\times\sqrt{0.08279}\approx0.4069$ | 0.3819 |
| Left | −0.0730 | 52 | $\sqrt2\times\sqrt{0.10189}\approx0.4514$ | 0.3784 |
| Right | −0.1580 | 36 | $\sqrt2\times\sqrt{0.14718}\approx0.5425$ | **0.3845** |
| Down | −0.0905 | 48 | $\sqrt2\times\sqrt{0.11038}\approx0.4699$ | 0.3794 |

读这张表：
1. 四个 UCB 只差 0.006——UCB 已经把 200 次访问分配到了“分数持平”的位置。
2. 如果再做一次迭代，UCB 会选 **Right**（0.3845），尽管它的 $Q$ 最低：它试得最少，不确定性最大。
3. 但真正要**执行**的动作看 $Q$：Up 的 $Q=-0.0250$ 最高（它的访问次数 64 也最多），所以 agent 选 Up。

**同一组 $Q$ 下的另外两种 tree policy**
- ε-greedy，$\varepsilon=0.1$，$n=4$：Up $=1-0.1+0.1/4=0.925$，其余各 $0.025$。
- softmax，$\tau=0.1$：$Q/\tau=(-0.25,-0.73,-1.58,-0.905)$，概率 Up 0.4162、Left 0.2575、Right 0.1101、Down 0.2162。$Q$ 只差零点几，但温度很低，差距被放大。
`,
    viz: { id: 'ucb', guide: R`
**怎么用**：

1. 默认是决策 1 的根：核对表中 0.3819 / 0.3784 / 0.3845 / 0.3794，高亮行（UCB 最大）是 Right，而 $Q$ 最大的是 Up。
2. 点 Right 的“+1 次访问”：它的 bonus 立刻变小，高亮移到另一个动作——这就是 UCB 的轮换。
3. 把 $c$ 拖到 0：变成 greedy，高亮回到 Up。把 $c$ 拖大：$Q$ 的影响变小。
4. 切到“决策 6”（根 $s_{10}$，Right 已被访问 266 次）：看 Right 的 bonus 有多小，以及 ε-greedy / softmax 的概率怎么变。

小注：决策 2–6 的根来自复用的子树，按上一章的约定 $N(s)$ 应为 $1+\sum_aN(s,a)$；计算器为了和图上的数字对照用 $\sum_aN(s,a)$，$\ln$ 只差约 0.003–0.005，不影响选择。` },
    compare: R`
| | ε-greedy | Softmax | UCB / UCT |
|---|---|---|---|
| 随机还是确定 | 随机 | 随机 | 选最高分（只有并列时需要额外规则） |
| 用到的信息 | 只有 $Q$（只看谁最大） | 只有 $Q$（看差距） | $Q$、$N(s)$、$N(s,a)$ |
| 怎么探索 | 以 ε 的概率均匀乱选 | $Q$ 越高概率越大 | 给试得少的动作加分 |
| 参数 | ε | 温度 τ | $c$（UCB1：$\sqrt2$） |
| 试得多 / 少的动作 | 不区分 | 不区分 | 试得少的加分多 |
`,
    pitfalls: [
      { wrong: '搜索结束后，执行 UCB 分数最高的动作。', right: 'UCB 只用来在搜索中决定往哪里模拟。执行的动作按 $Q$ 最大（课件图）或访问次数最多（AlphaGo）来选。课件决策 1：UCB 最高的是 Right，执行的是 Up。' },
      { wrong: 'UCB 分数最高的动作一定是 $Q$ 最高的动作。', right: 'bonus 可以让试得少、$Q$ 较低的动作胜出（决策 1 的 Right）。这正是 exploration。' },
      { wrong: '$c=\\sqrt2$ 总是最好的。', right: '$\\sqrt2$ 是 UCB1 的取值（课件例子用它）。$c$ 是可以调的参数，合适的值和回报的范围有关。' },
      { wrong: 'ε-greedy 和 softmax 也会照顾访问次数少的动作。', right: '它们只看 $Q$。两个 $Q$ 相同的动作，不论各试过几次，概率都一样。' }
    ],
    quiz: [
      { kind: '公式计算', q: '某节点 $N(s)=200$，动作 $a$ 的 $Q=-0.025$、$N(s,a)=64$，$c=\\sqrt2$。UCB 分数是多少（保留 4 位）？', answer: 0.3819, tol: 0.0006, explain: '$\\ln200=5.2983$；bonus $=\\sqrt2\\sqrt{5.2983/64}=1.4142\\times0.2877=0.4069$；UCB $=-0.0250+0.4069=0.3819$。这是课件决策 1 根节点的 Up。', ctx: false },
      { kind: '概念判断', q: '课件决策 1 的根（$s_1$）：Up $Q=-0.0250,N=64$；Left $-0.0730,52$；Right $-0.1580,36$；Down $-0.0905,48$；$c=\\sqrt2$。若再做一次迭代，UCB 在根选哪个动作？agent 最终执行哪个？', options: ['都选 Up', '迭代选 Right；执行 Up', '迭代选 Up；执行 Right', '都选 Right'], answer: 1, explain: 'UCB：Up 0.3819、Left 0.3784、Right 0.3845、Down 0.3794，Right 最高（试得最少，bonus 0.5425 最大）。执行看 $Q$：Up 的 $-0.0250$ 最高。', why: ['UCB 最高的不是 Up。', '正确。', '反了。', '执行的动作看 $Q$，Right 的 $Q$ 最低。'] },
      { kind: '公式计算', q: 'ε-greedy tree policy，$n=4$ 个动作，$\\varepsilon=0.2$。贪心动作的概率是多少？', answer: 0.85, tol: 0.0005, explain: '$1-\\varepsilon+\\varepsilon/n=1-0.2+0.05=0.85$；其他每个动作 $0.05$。', ctx: false },
      { kind: '概念判断', q: '某节点有个动作还从没被试过（$N(s,a)=0$）。UCB 怎么处理它？', options: ['分数为 0，最后才试', '分数视为 $+\\infty$，会先被试', '直接删除这个动作', '用 softmax 代替'], answer: 1, explain: '分母为 0，按惯例记作 $+\\infty$，所以每个动作都会先各试一次。', ctx: false },
      { kind: '概念判断', q: '把 UCB 的常数 $c$ 设为 0，tree policy 变成？', options: ['均匀随机', '纯 greedy（只看 Q）', 'softmax', '按访问次数最少选'], answer: 1, explain: 'bonus 消失，只剩 $\\arg\\max_aQ(s,a)$。', ctx: false }
    ],
    source: 'W11-1 p.12（记号、ε-greedy、softmax、UCB、UCB1 / UCT）、p.16（决策 1 根节点的 Q 与 N，用于手算 UCB）。'
  },
  /* ------------------------------------------------------------------ c35 */
  {
    id: 'c35', part: 'p9', title: 'Gridworld 例子：6 次决策与子树复用', en: 'MCTS with UCB on the course Gridworld',
    summary: '课件在课程 Gridworld 上跑 MCTS：$\\gamma=0.9$，$c=\\sqrt2$，每次决策 200 次迭代，rollout 最多 60 步。agent 从 $s_1$ 出发，6 次决策依次是 Up（打滑留在原地）、Up、Up、Right、Right、Right，正好沿最优路线走向 $+1$。决策 2–6 根节点的 $\\sum_aN(s_0,a)$ 是 204、253、260、255、338，都超过 200——因为每次执行后**复用**了上一棵树里对应的子树，旧的访问次数被保留了下来。',
    goals: ['读懂课件 6 张决策图：每格四个三角形的 Q 和 N、粗体根、黄色框、灰色数字', '解释为什么决策 1 的 Q 都接近 0 甚至为负', '回答课件的问题：为什么 ΣN(s0,a) 不等于 200', '从单样本格子（N=1）倒推回报的折扣：−0.9、0.81、1.0'],
    prereq: '第 33–34 章',
    what: R`
**设定（W11 p.16–21）**

- 课程 4×3 Gridworld：坐标 $(x,y)$ 原点在左下；$(1,1)$ 是墙；$s_{11}=(3,2)$ 是 $+1$ 终止格，$s_7=(3,1)$ 是 $-1$ 终止格；状态从左下 $s_1$ 开始按行编号。动作按意图移动的概率 0.8，向左、向右打滑各 0.1；撞墙或出界留在原地；只有进入终止格时有奖励。
- MCTS：$\gamma=0.9$，UCB 的 $c=\sqrt2$，每次决策做 200 次迭代，rollout horizon 60（最多模拟 60 步）。

**怎么读图**：每格画成四个三角形，上 / 右 / 下 / 左分别是 Up / Right / Down / Left，写着 $Q(s,a)$ 和 $N(s,a)$。蓝色圆圈 R 是 agent 所在格（根），根的数字是粗体；黄色框是要执行的动作（根上 $Q$ 最大的）；“$Q=—,N=0$”表示树里没有这条统计；从决策 4 起出现的灰色数字是旧树留下、没有被复用的统计。非根格子：同一状态在树里可能对应好几个节点，图上把它们合并成一个数（$N$ 相加，$Q$ 按 $N$ 加权平均；课件没说明它的图怎样合并，本站按这种方式显示）。根格子只对应一个节点，数字就是根节点自己的统计。

**6 次决策的根节点**（$Q$ / $N$；最后一列是 Σ N(s0,a)）

| 决策 | 根 | Up | Right | Down | Left | 执行与结果 | Σ |
|---|---|---|---|---|---|---|---|
| 1 | $s_1$ (0,0) | **−0.0250 / 64** | −0.1580 / 36 | −0.0905 / 48 | −0.0730 / 52 | Up，向左打滑撞墙，留在 (0,0) | 200 |
| 2 | $s_1$ (0,0) | **−0.0035 / 62** | −0.0947 / 42 | −0.0526 / 50 | −0.0525 / 50 | Up，成功到 (0,1) | 204 |
| 3 | $s_5$ (0,1) | **0.0680 / 83** | −0.0069 / 57 | −0.0083 / 56 | −0.0093 / 57 | Up，成功到 (0,2) | 253 |
| 4 | $s_8$ (0,2) | 0.0714 / 68 | **0.1284 / 75** | 0.0603 / 64 | 0.0181 / 53 | Right，成功到 (1,2) | 260 |
| 5 | $s_9$ (1,2) | 0.1686 / 30 | **0.5249 / 172** | 0.1691 / 30 | 0.0716 / 23 | Right，成功到 (2,2) | 255 |
| 6 | $s_{10}$ (2,2) | 0.5268 / 48 | **0.8233 / 266** | −0.1299 / 9 | 0.1224 / 15 | 课件：下一步选 Right，（很可能）拿到 $+1$ | 338 |
`,
    why: R`
**这个例子展示了在线规划的完整循环**：搜索 → 执行一步 → 观察（可能打滑）→ 以新状态为根再搜索。

决策 1 选了 Up，但向左打滑撞墙，留在原地。离线 policy 遇到这种情况只是查表；在线方法则在原地**重新搜索**，而且不是从零开始。

**为什么 Σ N(s0,a) ≠ 200（课件 p.17 的问题）**：决策 1 的树里，“$s_1$ 选 Up → 打滑留在 $s_1$”这个结果已经被模拟过几次，对应的子节点有自己的统计。执行之后，这个子节点成了新的根，原有的统计被保留（**子树复用**），新的 200 次迭代再加上去：$204=200+4$。以后每次同理：

| 决策 | Σ N(s0,a) | 其中复用的旧访问 |
|---|---|---|
| 1 | 200 | 0（第一次，没有旧树） |
| 2 | 204 | 4 |
| 3 | 253 | 53 |
| 4 | 260 | 60 |
| 5 | 255 | 55 |
| 6 | 338 | 138 |

复用的旧次数取决于上一棵树在实际到达的那个分支上花了多少模拟，不保证单调变化（这次运行是 4、53、60、55、138，决策 6 最多：从 $s_9$ 选 Right 到 $s_{10}$ 是上一棵树最集中探索的分支）。这正是课件说的“高效的在线方法要复用之前的结果”。
`,
    intuition: R`
**决策 1 的 Q 为什么都接近 0、甚至为负？**

最优价值 $V^*(s_1)=0.5452$，但图中 $s_1$ 四个动作的 $Q$ 在 $-0.1580$ 到 $-0.0250$ 之间。一个合理的解释（课件说 rollout 通常用随机或简单启发式 policy；本站按均匀随机来推测）：树外的 rollout 是随机走的。在随机 policy 下，从 $s_1$ 出发的价值约为 $-0.066$（随机乱走常常撞进 $-1$，或者绕很久才到 $+1$，被 γ 打折）。200 次迭代的树还很浅，回报里随机 rollout 的成分很大，所以 $Q$ 远低于最优值，和“随机走”的水平相近。有限样本还有噪声，不能保证每个 $Q$ 都落在某个固定区间里。

**越靠近目标，Q 越高、越集中**：决策 6 在 $s_{10}$，Right 一步就可能进 $+1$，$Q(s_{10},\text{Right})=0.8233$，访问 266 次。精确的最优值是 $Q^*(s_{10},\text{Right})=0.9420$：MCTS 的估计仍偏低（仍有部分回报来自随机 rollout），但**排序**是对的。

**MCTS 走的路线就是最优 policy**：value iteration 算出的最优动作是 $s_1$ Up、$s_5$ Up、$s_8$ Right、$s_9$ Right、$s_{10}$ Right，和这 6 次决策一致。在线方法只在实际经过的 5 个状态上做了“以它为根”的搜索；$s_2,s_3,s_4,s_6$ 从没当过根，只是作为模拟中的节点得到过一些统计（例如下面提到的 $Q(s_4,\text{Down})$）。

**灰色数字**：执行动作后，只有所到达的那个子节点的子树被保留，旧树的其他部分被丢掉。图上仍显示它们最后的值，但用灰色表示“不在当前树里”。
`,
    math: R`
**在线循环**（每次决策）
1. 根 = 上一棵树中“上次执行的动作 $a$ 下、对应实际到达的 $s'$”的子节点（如果存在）；否则新建根。
2. 做 $K=200$ 次迭代。
3. 执行 $a_t=\arg\max_aQ(s_t,a)$，观察 $s_{t+1}$。

**根节点的访问次数**：每次迭代都从根出发、经过根的一条边，所以一棵新树做 $K$ 次迭代后 $\sum_aN(s_0,a)=K$；复用子树时
$$\sum_aN(s_0,a)=N_{\text{旧}}+K.$$

**从 $N=1$ 的格子倒推折扣**（下面三个格子的数字读自课件的决策图）：只有一个样本时，$Q$ 就等于那一次的回报 $R$。课程 Gridworld 只有终止奖励，所以若这次采样进入了终止格，$R=\pm\gamma^m$，$m$ 是从这条边出发、到进入终止格之前经过的 0 奖励步数；rollout 走满 horizon 仍未终止则 $R=0$。同一个 $R$ 可能对应几种不同的具体轨迹：
- 决策 3 的 $Q(s_{10},\text{Right})=1.0000$：$s_{10}$ 选 Right 直接进 $+1$，$m=0$，$R=1$。
- 决策 1 的 $Q(s_9,\text{Right})=0.8100$：$R=0.9^2$，从 $s_9$ 出发第 3 个奖励才是 $+1$（例如 $s_9\to s_{10}$，在 $s_{10}$ 再停留一步，然后进 $s_{11}$）。
- 决策 2 的 $Q(s_4,\text{Down})=-0.9000$：$s_4=(3,0)$ 向下出界留在 $s_4$（$r=0$），rollout 第一步向上进 $s_7$（$-1$）：$G=-1$，$R=0+0.9\times(-1)=-0.9$。
`,
    formulas: [{
      title: '复用子树后根节点的访问次数',
      latex: R`\htmlClass{fx-sum}{\sum_a N(s_0,a)}=\htmlClass{fx-old}{N_{\text{旧}}}+\htmlClass{fx-k}{K}`,
      parts: [
        { key: 'sum', label: '图中根节点四个 N 的和', color: 'blue', text: '决策 2：$62+42+50+50=204$。' },
        { key: 'old', label: '复用的子树原有的访问次数', color: 'orange', text: '复用的子树根节点原有的**动作访问次数之和** $\\sum_aN_{\\text{复用前}}(s_0,a)$。决策 2：4；决策 6：138。没有旧树（决策 1）或选择丢弃旧树时为 0。（这个节点自身的访问次数还要多 1：它被创建的那次迭代从它开始 rollout，没有经过它的任何动作。）' },
        { key: 'k', label: '这一次的迭代次数', color: 'green', text: '课件每次决策都是 $K=200$。每次迭代都经过根的某一条边，所以每次让和加 1。' }
      ]
    }],
    example: R`
**决策 2 的根是怎么来的**

决策 1 结束时，根 $s_1$ 的 Up 被试了 64 次。Up 有三种结果：按意图到 $s_5$（0.8）、向左打滑留在 $s_1$（0.1）、向右打滑到 $s_2$（0.1）。64 次里，有几次采样到“留在 $s_1$”，对应的子节点之后又被往下选过，它的四个动作一共累积了 4 次访问。

agent 执行 Up，实际打滑留在 $s_1$。新的根就是那个子节点：它原有 4 次访问，再做 200 次迭代，图中四个 $N$ 之和 $=62+42+50+50=204$。

**决策 6 的选择**

| 动作 | $Q$（MCTS，决策 6） | $Q^*$（value iteration 收敛值） |
|---|---|---|
| Up | 0.5268 | 0.8527 |
| Right | **0.8233** | **0.9420** |
| Down | −0.1299 | 0.6319 |
| Left | 0.1224 | 0.7375 |

MCTS 的估计都偏低，Down 甚至是负的（Down 按意图会走到 $s_6$，旁边就是 $-1$，随机 rollout 很容易掉进去）。但最好的动作仍然是 Right，所以决策是对的。
`,
    viz: { id: 'mctsgrid', guide: R`
**怎么用**：

1. 点“运行 MCTS”：在 $s_1$ 做 200 次迭代，得到和课件决策 1 同样格式的图。核对 Σ N(s0,a) = 200；树中节点最多 201 个（有的迭代走到已有的终止节点，不加新节点）。
2. 点“执行动作”：按最大 $Q$ 选动作，带 0.8/0.1/0.1 的打滑。再点“运行 MCTS”：读数显示“= 旧次数 + 200”，这就是课件问题的答案。
3. 在**点“执行动作”之前**切到“丢弃旧树”，再执行、再运行 MCTS：新根没有旧统计，Σ 正好是 200。（开关只影响下一次执行动作时怎么处理树，已经复用的当前树不会被清掉。）
4. “自动跑到终止”看完整一回合；下面的表格记录每次决策。种子 7 走出与课件相同的路线；换种子能看到打滑导致的其他路线。` },
    compare: R`
| | 离线 value iteration | 在线 MCTS（课件例子） |
|---|---|---|
| 计算了哪些状态 | 全部 11 个，反复迭代到收敛 | 只有实际经过的 5 个状态作为根，以及它们附近被模拟到的状态 |
| 得到的数值 | 精确的 $V^*$、$Q^*$（如 $Q^*(s_{10},\text{Right})=0.9420$） | 有噪声、偏低的估计（$0.8233$） |
| 打滑之后 | 查表 | 在新状态重新搜索，复用子树 |
| 需要什么 | 完整的概率表 | 一个能采样的 simulator |
| 本例的路线 | 最优动作：$s_1$ Up、$s_5$ Up、$s_8$ Right、$s_9$ Right、$s_{10}$ Right | 6 次决策 Up（打滑未动）、Up、Up、Right、Right、Right：经过的每个状态上都选了最优动作 |
`,
    pitfalls: [
      { wrong: '图中的 Q 就是最优价值 $Q^*$。', right: 'MCTS 的 $Q$ 是“树内按 UCB 走、树外随机走”的样本平均，通常低于 $Q^*$。决策 6 的 $Q(s_{10},\\text{Right})=0.8233$，而 $Q^*=0.9420$。' },
      { wrong: '每次决策做 200 次迭代，所以根节点的 N 之和一定是 200。', right: '只有新树才是 200。复用子树时还要加上旧的访问次数：$204=4+200$，$338=138+200$。' },
      { wrong: '图中灰色的数字也是当前树的统计。', right: '灰色是旧树留下、没有被复用的统计，只是还显示在图上。' },
      { wrong: '决策 1 选了 Up 却留在原地，说明 MCTS 选错了。', right: 'Up 是正确的选择（最优 policy 也是 Up）；留在原地是 0.1 概率的打滑。在线方法的好处正是：在新状态重新规划。' }
    ],
    quiz: [
      { kind: '概念判断', q: '课件决策 2 的根节点：$N$ 分别为 62、42、50、50，和为 204，而这次只做了 200 次迭代。原因是？', options: ['课件印错了', '执行 Up 后复用了上一棵树中对应的子树，保留了它原有的 4 次访问', 'UCB 让某些迭代被计算了两次', 'rollout 的步数被计入了 N'], answer: 1, explain: '决策 1 的树中，“Up 后打滑留在 $s_1$”的子节点的四个动作已累积 4 次访问。它成为新根，原有统计保留，再加上 200 次迭代。', why: ['其他决策（253、260、255、338）也都超过 200，规律一致。', '正确。', '每次迭代只经过根一次。', 'rollout 不进树，不改变 $N$。'] },
      { kind: '轨迹推导', q: '课件决策 2 的图中，$Q(s_4,\\text{Down})=-0.9000$，$N=1$。（$\\gamma=0.9$）这一个样本最可能的过程是？', options: ['$s_4$ 选 Down 直接进入 $s_7$', '$s_4$ 向下出界留在 $s_4$（$r=0$），rollout 第一步进入 $s_7$（$-1$）', '$s_4$ 选 Down 到 $s_3$，rollout 走了很多步才进入 $s_7$', 'rollout 走满 60 步都没终止'], answer: 1, explain: '只有一个样本，$Q=R$。$R=-0.9=0+0.9\\times(-1)$：这条边奖励 0，下一步就进 $-1$。$s_4=(3,0)$ 向下出界留在原地；$s_4$ 向上就是 $s_7$。', why: ['Down 不会进入 $s_7$（它在 $s_4$ 上方）；而且那样 $R=-1$。', '正确。', '走很多步会有 $0.9^m$（$m>1$），绝对值小于 0.9。', '没终止的话 $R=0$。'] },
      { kind: '公式计算', q: '课程 Gridworld，$\\gamma=0.9$。某条边只被访问 1 次，那一次从这条边开始，前两步奖励都是 0，第三步进入 $+1$ 格。这条边的 $Q$ 是多少？', answer: 0.81, tol: 0.0005, explain: '$R=0+0.9\\times0+0.9^2\\times1=0.81$。这就是课件决策 1 中 $Q(s_9,\\text{Right})=0.8100$ 的来历。', ctx: false },
      { kind: '概念判断', q: '课件决策 4 的根是 $s_8$：Up $0.0714/68$、Right $0.1284/75$、Down $0.0603/64$、Left $0.0181/53$。agent 执行哪个动作？', options: ['Up', 'Right', 'Down', 'Left'], answer: 1, explain: '按根节点 $Q$ 最大选：Right（0.1284）。这里访问次数最多的也是 Right（75）。', ctx: false },
      { kind: '概念判断', q: '课件决策 1 中 $s_1$ 四个动作的 $Q$ 在 $-0.1580$ 到 $-0.0250$ 之间，而 $V^*(s_1)=0.5452$。最合理的解释是？', options: ['MCTS 的 backpropagation 公式错了', '树还很浅，大部分回报来自随机 rollout，随机走的价值很低', 'γ 太大', '课程 Gridworld 的最优价值其实是负的'], answer: 1, explain: '若 rollout 是随机的（课件说通常如此），随机 policy 下 $s_1$ 的价值约为 $-0.066$。200 次迭代的树很浅，估计更接近“随机走”的水平。越接近目标，树覆盖的路线越完整，$Q$ 越高（决策 6 的 0.8233）。', ctx: false }
    ],
    source: 'W11-1 p.15（选最大 Q、复用子树）、p.16–21（Gridworld 决策 1–6 的图与文字，含 p.17 的问题“Why does the summation of N(s0,a) is not equal to 200?”）。最优值 0.5452、0.9420 等来自本站对课程 Gridworld 做的 value iteration（与 W6 的结果一致）。'
  },
  /* ------------------------------------------------------------------ c36 */
  {
    id: 'c36', part: 'p9', title: 'MCTS 变体与 Expectimax', en: 'Design choices, problem-setting variants, Expectimax tree',
    summary: 'MCTS 的变体来自两方面：四个步骤中的设计选择（扩展一个结果还是多个、用 rollout 还是价值函数评估新节点、用增量平均还是精确期望回传、最后按价值还是访问次数选动作），以及问题设定（双人零和、POMDP、不完全信息、大动作空间）。模型已知时可以用 **Expectimax tree**：decision node 取最大值，chance node 按概率取期望，得到精确的 $Q(s,a)$。有限深度的 Expectimax 就是从当前状态出发做几次 Bellman optimality backup。',
    goals: ['列出四个步骤各自的设计选择', '说出双人零和、POMDP、不完全信息、大动作空间对应的变体名称', '区分 decision node 与 chance node 的取值方式', '手算 $s_{10}$ 深度 1、2 的 Expectimax，并说明它和 value iteration 的关系', '比较 MCTS 的样本平均与 Expectimax 的精确期望'],
    prereq: '第 7 章（Bellman optimality）、第 10 章（value iteration）、第 33 章',
    what: R`
**来自四个步骤的设计选择（W11 p.23）**

| 步骤 | MCTS 的做法 | 变体 |
|---|---|---|
| Selection | tree policy（UCB 等） | 换别的 tree policy |
| Expansion | 为所选动作采样到的**一个**结果加新节点 | Expectimax tree：可以采样多个结果，或加入全部结果 |
| Simulation | 从新节点做 rollout 估计价值 | **Simulation-free MCTS**：用价值函数估计新节点的价值 |
| Backpropagation | 用增量平均更新节点价值 | Expectimax tree：用模型直接计算期望 |
| 最后执行的动作 | 价值最高的动作，或访问次数最多的动作 | |

**来自问题设定的变体**（课件只列名称）
- **双人零和 MCTS**：我的收益就是对手的损失。实现时**选一种**约定：(a) 所有节点都存根方视角的 $Q$，轮到对手的节点选 $\arg\max_a\big[-Q(s,a)+c\sqrt{\ln N(s)/N(s,a)}\big]$，探索加分照样是**加**（不是对 $Q+\text{bonus}$ 取 argmin）；(b) 每个节点存“该节点走棋方”视角的 $Q$，回传时每上一层把 $R$ 取一次负（negamax），这样每个节点都直接用普通 UCB。两种做法等价，但不能同时用（否则负负得正）。
- **POMDP**（状态部分可观测）：Partially Observable Monte Carlo Planning（POMCP）。
- **不完全信息博弈**：Information Set MCTS（ISMCTS）。Imperfect information（不完全信息）指有些信息对手知道而我看不到，例如扑克的底牌；围棋、国际象棋双方都看得到全部局面，是完全信息。POMDP 说的是单个 agent 看不全状态；不完全信息博弈说的是几个玩家各自看到不同的信息。
- **大动作空间**：Progressive Widening（逐步放宽每个节点考虑的动作数）。

**Expectimax tree（p.24）**：两种节点交替出现。
- **Decision node**：agent 选择动作 $a$。它的价值是子节点价值的**最大值**。
- **Chance node**：模型按转移概率给出 $s'$ 和 $r$。它的价值是子节点价值的**期望**。

用本章的例子画出来：$s_{10}$（decision node）→ 选动作 Right（chance node）→ 按概率分到 $s_{11}$（0.8）、$s_{10}$（0.1，左滑撞边界）、$s_6$（0.1，右滑）；每个结果又是一个 decision node，在那里再选动作、再接 chance node……层层交替。
`,
    why: R`
**MCTS 的 $Q$ 是怎么来的？** 对采样得到的回报取平均（p.24）。同一个 $(s,a)$ 被试很多次后，各后继出现的频率接近 $P(s'\mid s,a)$，所以样本平均是在用频率代替概率，近似 chance node 的加权求和；Expectimax 直接用真实概率，省掉了这部分噪声。它有两层随机性：转移结果是采样的，树外的 rollout 也是随机的。

**模型已知时能不能做得更好？** 能。转移概率已知，chance node 就不必靠采样估计，直接按概率加权求和，得到精确的期望——这就是 Expectimax tree。

**代价**：如果每个 chance node 都展开全部结果，树按指数增长。课程 Gridworld 中从 $s_1$ 完整展开（同一动作下相同的结果合并，终止状态不再展开，只数叶子）：深度 1 有 10 个叶子，深度 2 有 100 个，深度 3 有 1018 个（本站按模型算出的数字）。所以课件说扩展时“可以加入全部结果，也可以只采样一个”，按实现取舍；只采样一个结果、或叶节点仍用 rollout 评估时，估计里依然有采样噪声。
`,
    intuition: R`
**agent 走一步，“自然”走一步**

- decision node 是 agent 的回合：我能选，所以选最好的 → **max**。
- chance node 是“自然”的回合：结果不由我定，只能按概率平均 → **期望**。

这两步合起来就是 Bellman optimality equation：
$$V(s)=\max_a\sum_{s',r}P(s',r\mid s,a)\big(r+\gamma V(s')\big).$$
Expectimax 只是把它画成从当前状态展开的一棵树，并且只算**从当前状态能到达**的部分。限定深度 $d$、深度用完的节点按 0 计时，结果和 value iteration 第 $d$ 轮得到的 $V_d(s)$ 完全相同。

**和双人博弈的 minimax 对比**：minimax（极小化极大）是两人轮流的搜索：我方节点取 max，对手节点取 min（对手要让我的价值最小）；Expectimax 中“对手”是随机的自然，所以取期望。
`,
    math: R`
**Expectimax 的四步（W11 p.25）**
- **Selection**：按 $\pi_{\text{tree}}$ 反复选节点往下走（与 MCTS 相同）。
- **Expansion**：按 $\pi_{\text{tree}}$ 选动作 $a$（与 MCTS 相同）；为 $a$ 加一个新的 chance node；然后视实现而定：把所有可能结果 $(s',r)$ 都作为 chance node 的子节点加入，或采样一个结果加入。
- **Simulation**：从新加入的节点做 rollout（与 MCTS 相同）。
- **Backpropagation**：
  - chance node：$\displaystyle Q(s,a)=\sum_{s',r}P(s',r\mid s,a)\cdot\big(r+\gamma\max_{a'}Q(s',a')\big)$；
  - decision node：$\displaystyle V(s)=\max_aQ(s,a)$。

终止状态的后续价值按定义为 0（进入它的奖励已经算在 $r$ 里）。这个回传式默认 chance node 的全部结果都已加入树；新加入、还没有动作统计的子节点，用它的 rollout 回报 $G$（或价值函数估计）充当 $\max_{a'}Q(s',a')$。selection 经过 chance node 时，按 $P$ 抽一个后继往下走。只采样加入部分结果时，求和不完整，结果仍是近似。

上面四步是“用 Expectimax 方式回传的增量搜索”，和 MCTS 一样一次长一点。本站交互用的是另一种更直接的做法：**固定深度、一次完全展开**，枚举所有动作和结果，再从下往上算，不做 UCB selection，也不做随机 rollout。

**有限深度版本**（本站交互使用）：$V_0(s)=0$；$Q_d(s,a)=\sum P\,(r+\gamma V_{d-1}(s'))$；$V_d(s)=\max_aQ_d(s,a)$。这与 value iteration 的递推式一模一样。
`,
    formulas: [EXPECTIMAX],
    example: R`
**从 $s_{10}=(2,2)$ 展开**（$\gamma=0.9$；深度用完的节点按 0 计）

**深度 1**：后继的价值都按 0 计，只剩即时奖励。$s_{10}$ 右边就是 $+1$ 格 $s_{11}$。

| 动作 | 结果（概率） | $Q_1$ |
|---|---|---|
| Up | 按意图撞上边界留在 $s_{10}$（0.8）；向左打滑到 $s_9$（0.1）；向右打滑进 $s_{11}$，$r=+1$（0.1） | $0.1\times1=0.1$ |
| Right | 按意图进 $s_{11}$，$r=+1$（0.8）；向左打滑（北）留在 $s_{10}$（0.1）；向右打滑（南）到 $s_6$（0.1） | $0.8$ |
| Down | 按意图到 $s_6$（0.8）；向左打滑（东）进 $s_{11}$（0.1）；向右打滑（西）到 $s_9$（0.1） | $0.1$ |
| Left | 按意图到 $s_9$（0.8）；向左打滑（南）到 $s_6$（0.1）；向右打滑（北）留在 $s_{10}$（0.1） | $0$ |

$V_1(s_{10})=\max=0.8$。同理可算 $V_1(s_6)=0$（$s_6=(2,1)$ 选 Left 不会碰到任何终止格；其他动作都有 0.1 或 0.8 的概率进 $-1$ 格 $s_7$）。

**深度 2，展开 chance node（$s_{10}$, Right）**：

| 结果 | $P$ | $r$ | $V_1(s')$ | $r+\gamma V_1(s')$ | $P\times(\dots)$ |
|---|---|---|---|---|---|
| 进 $s_{11}$ | 0.8 | +1 | 0（终止状态） | 1 | 0.8 |
| 留在 $s_{10}$ | 0.1 | 0 | 0.8 | 0.72 | 0.072 |
| 到 $s_6$ | 0.1 | 0 | 0 | 0 | 0 |

$Q_2(s_{10},\text{Right})=0.872$。其他动作（还要用到 $V_1(s_9)=0$：$s_9$ 一步到不了任何终止格）：Up $0.8\times0.9\times0.8+0.1\times0.9\times0+0.1\times1=0.676$；Down $0.8\times0.9\times0+0.1\times1+0.1\times0.9\times0=0.1$；Left $0.8\times0.9\times0+0.1\times0.9\times0+0.1\times0.9\times0.8=0.072$。所以 $V_2(s_{10})=0.872$——正是 W6 value iteration 在 $s_{10}$ 第二次 backup 的结果。
`,
    viz: { id: 'expectimax', guide: R`
**怎么用**：

1. 默认 $s_{10}$、深度 2：四个动作的 $Q_2$ 中 Right 的 0.872 最大；下面展开 (s10, Right) 的 chance node，逐项核对上面的表。
2. 改成深度 1：Right 变成 0.8。点不同动作的“展开”看各自的结果分布。
3. 点 $s_1$，把深度从 1 调到 5：叶子数 10 → 100 → 1018 → … 快速增长。$V_d(s_1)$ 在深度 1–4 都是 0：$+1$ 格离 $s_1$ 至少 5 步，深度不够就看不到任何奖励（$-1$ 能避开，所以 max 取 0）；深度 5 才第一次变成 0.2372。要接近 0.5452 需要更深，可以点“和 MCTS 比较”看深度 30 的结果。
4. 点“和 MCTS 比较”：深度 30 的 Expectimax（≈ 精确的 $Q^*$）与 200 次迭代 MCTS 的样本平均放在一起。` },
    compare: R`
下表中的 Expectimax 指本站交互使用的版本：完整展开、固定深度、深度用完的节点按 0 计。

| | MCTS | Expectimax tree（完整展开） | Value iteration |
|---|---|---|---|
| 需要的模型 | simulator（只要样本） | 完整概率 $P(s',r\mid s,a)$ | 完整概率 |
| chance 部分怎么算 | 采样，取平均 | 按概率精确求期望 | 按概率精确求期望 |
| 计算范围 | 当前状态出发、被模拟到的部分（不对称地生长） | 当前状态出发、可到达的部分（按深度指数增长） | 所有状态 |
| 结果 | 有噪声的估计 | 给定深度下精确 | 收敛到 $V^*$ |
| 在线 / 离线 | 在线 | 在线 | 离线 |
`,
    pitfalls: [
      { wrong: 'chance node 的价值也取子节点的最大值。', right: 'chance node 的结果不由 agent 决定，只能按概率取**期望**；只有 decision node 取最大值。' },
      { wrong: '有限深度的 Expectimax 得到的是精确的 $Q^*$。', right: '深度用完的节点按 0（或某个估计值）计，所以深度 $d$ 得到的是 $V_d$、$Q_d$，不是 $V^*$。$s_{10}$ 深度 2 的 0.872 小于 $V^*(s_{10})=0.942$。' },
      { wrong: 'Expectimax 不需要模型，所以比 MCTS 更通用。', right: '恰好相反：Expectimax 需要完整的转移概率，MCTS 只需要能采样的 simulator。' },
      { wrong: '双人零和 MCTS 中，对手也想让我的 $Q$ 最大。', right: '零和：对手的收益是 $-Q$。站在对手的节点上要换成对手视角（取负），对手会选对他最好、也就是对我最差的动作。' }
    ],
    quiz: [
      { kind: '概念判断', q: 'Expectimax tree 中，chance node 的价值怎么算？', options: ['取子节点价值的最大值', '取子节点价值的最小值', '按转移概率对子节点的 $r+\\gamma V$ 求期望', '取访问次数最多的子节点'], answer: 2, explain: 'chance node 代表随机的结果，按 $P(s\',r\\mid s,a)$ 加权平均；decision node 才取最大值。', ctx: false },
      { kind: '公式计算', q: '课程 Gridworld，$\\gamma=0.9$。已知 $V_1(s_{10})=0.8$、$V_1(s_6)=0$。$s_{10}$ 选 Right：0.8 进 $s_{11}$（$r=+1$），0.1 留在 $s_{10}$，0.1 到 $s_6$。深度 2 的 $Q_2(s_{10},\\text{Right})$ 是多少？', answer: 0.872, tol: 0.0005, explain: '$0.8\\times(1+0.9\\times0)+0.1\\times(0+0.9\\times0.8)+0.1\\times(0+0.9\\times0)=0.8+0.072+0=0.872$。$s_{11}$ 是终止状态，后续价值按定义为 0。' },
      { kind: '概念判断', q: '“Simulation-free MCTS” 改变的是哪一步？', options: ['Selection：不用 UCB', 'Expansion：一次加入所有结果', 'Simulation：用价值函数估计新节点的价值，代替 rollout', 'Backpropagation：不再更新 N'], answer: 2, explain: '课件 p.23：simulation-free MCTS 用价值函数估计新加入节点的价值。AlphaGo Zero 就是这样做的。', ctx: false },
      { kind: '概念判断', q: '模型已知、Expectimax 完整展开每个 chance node 时，它相比 MCTS 的主要好处和代价是？', options: ['好处：不需要模型；代价：有噪声', '好处：chance node 按概率精确求期望，没有转移采样的噪声；代价：要展开所有结果，树按指数增长', '好处：树更小；代价：需要神经网络', '两者完全等价'], answer: 1, explain: 'MCTS 用样本平均估计 $Q$；Expectimax 按概率精确计算，但每个 chance node 要展开全部结果。课程 Gridworld 从 $s_1$ 展开 3 层已有 1018 个叶子。', ctx: false },
      { kind: '概念判断', q: '双人零和 MCTS 中，课件说对对手使用什么？', options: ['$Q(s,a)$', '$-Q(s,a)$', '$Q(s,a)^2$', '均匀随机'], answer: 1, explain: '零和：我的收益就是对手的损失，所以对手的价值是 $-Q(s,a)$。', ctx: false }
    ],
    source: 'W11-1 p.23（MCTS 的基本变体与问题设定变体）、p.24（Expectimax tree 的定义与示意图）、p.25（Expectimax 的四步与回传公式）。'
  },
  /* ------------------------------------------------------------------ c37 */
  {
    id: 'c37', part: 'p9', title: 'AlphaGo 与 AlphaGo Zero：学习如何改进搜索', en: 'Go, policy priors, value networks, PUCT',
    summary: '围棋的状态空间太大，普通 MCTS 加随机 rollout 远远不够。学习可以改进 MCTS 的三个部分：**policy**（哪些走法值得多搜：prior $P(s,a)$）、**value**（这个叶节点有多好：$v(s)$ 补充或代替 rollout）、**model**（没有转移模型时学一个）。AlphaGo 用人类棋谱训练 policy、用自我对弈训练 value 网络，叶节点评估混合 $v_\\theta$ 与 rollout 结果；AlphaGo Zero 不用人类棋谱、不用 rollout，一个网络同时输出 $(p_\\theta,v_\\theta)$，selection 用 **PUCT**。',
    goals: ['说出围棋为什么难：19×19、361 个落点加 pass、$3^{361}\\approx1.7\\times10^{172}$、对局很长', '说出学习可以改进 MCTS 的三个部分', '说出 AlphaGo 的三个训练阶段，以及搜索中各网络的用途', '写出 $V_{\\text{leaf}}$ 与 PUCT，并和 UCT 比较', '说出 AlphaGo Zero 去掉了什么、保留了什么'],
    prereq: '第 33–34、36 章',
    what: R`
**围棋（W11 p.27）**
- 双人、零和、完全信息博弈。
- $19\times19$ 的棋盘：最多 361 个落点，加上 pass。
- 粗略的局面数 $3^{361}\approx1.7\times10^{172}$（每个点黑、白、空三种，包含不合法的局面）。
- 对局很长，穷举搜索不可行。
- 基本规则：黑白轮流落子或 pass；一块相连的棋子没有“气”（相邻的空点）时被提走；禁止重复局面以防循环；连续两次 pass 通常结束对局；按地或子计分，白方有贴目补偿。

**AlphaGo 家族的里程碑（p.28）**

| 时间 | 系统 | 里程碑 |
|---|---|---|
| 2015 年 10 月 | AlphaGo Fan | 5–0 战胜欧洲冠军樊麾 |
| 2016 年 3 月 | AlphaGo Lee | 4–1 战胜李世石 |
| 2017 年 5 月 | AlphaGo Master | 3–0 战胜世界第一柯洁 |
| 2017 年 10 月 | AlphaGo Zero | 不用人类棋谱学会围棋 |
| 2017 年 12 月 | AlphaZero | 通过自我对弈学会国际象棋、将棋和围棋 |
| 2019 年 11 月 | MuZero | 用学到的模型做规划 |

**学习能改进 MCTS 的哪些部分（p.29）**——回忆 MCTS 的两个 policy：$\pi_{\text{tree}}$ 在树内选动作，$\pi_{\text{sim}}$ 在树外 rollout 估计叶节点价值 $V(s)$。
1. **Policy**：哪些走法值得多搜？学一个 prior $P(s,a)$，引导 selection 并初始化新的边。
2. **Value**：这个叶节点有多好？学 $v(s)$，补充或代替 rollout。
3. **Model**：执行动作后会发生什么？没有转移模型时，学习后继状态和奖励。

课件的总结句：搜索改进**当下**的决策；学到的预测把经验带到**以后**的决策中。

**AlphaGo（2016）：先学习，再搜索（p.30）**
1. **从人类棋谱学习**：训练监督 policy $p_\sigma(a\mid s)$ 预测人类的下一手；另外训练一个用简单模式特征的**快速 rollout policy**。
2. **自我对弈改进 policy**：用 $p_\sigma$ 初始化 RL policy $p_\rho$，通过自我对弈让它更会赢。
3. **学习评估局面**：用 $p_\rho$ 自我对弈产生局面和结果 $(s,z)$，训练 value 网络 $v_\theta(s)$ 预测 $z\in\{-1,+1\}$。

搜索中用到什么：监督 policy $p_\sigma$ 提供落子 prior；value 网络和快速 rollout policy 一起评估叶节点；围棋规则生成后继局面。

**AlphaGo Zero：不用人类棋谱（p.32）**
- 训练：从随机参数开始，完全靠自我对弈。
- 网络：policy 和 value 共用一个网络：$(p_\theta(\cdot\mid s),v_\theta(s))=f_\theta(s)$。
- Selection / expansion：用网络的 policy prior，后继由已知的围棋规则生成。
- 评估：非终止叶节点用 $v_\theta(s_L)$，**树外不再 rollout**。
- 回传：同样更新访问次数和平均值。
- 训练三天后以 100–0 战胜 AlphaGo Lee。
- “Zero” 去掉的是**人类棋谱**和 **rollout 评估**；系统仍然知道围棋规则，仍然要搜索一棵树。
`,
    why: R`
**为什么普通 MCTS 在围棋上不够**

（以下两点是本站的解释，课件没有展开。）
- 每个节点最多 362 个动作：在朴素的 UCT 实现里，未试过的动作分数为 $+\infty$、每次迭代只在根选一个动作，那么光让根的每个动作各试一次就要 362 次迭代，树很难长深。prior 让搜索一开始就集中在少数像样的走法上。
- 简单随机 rollout 的结果噪声很大，而且两个随机落子的“棋手”下出的胜负，和高水平对局中谁占优关系不大，所以对局面价值的估计很不准。value 网络“看一眼”局面就能给出评估。

**搜索和学习互补**：网络给出快速但不完美的直觉；搜索在直觉的引导下向前推演，修正直觉的错误，得到更好的当下决策；搜索的结果又可以用来训练网络（下一章的自我对弈）。
`,
    intuition: R`
**高手下棋：直觉 + 计算**

- prior $P(s,a)$ ≈ 棋手的**棋感**：一眼看出哪几步值得考虑，其余几百个点基本不看。
- value $v_\theta(s)$ ≈ **形势判断**：不必把棋下完，看局面就知道谁好。
- 搜索 ≈ **计算**：在棋感挑出的几步里往下推演几步，用形势判断评估推演到的局面。

**MCTS 的结构不变（p.31）**：仍然是 selection、expansion、评估、回传四步，学到的东西只是插进其中几步——prior 决定往哪里搜，value 改进回传的是什么。
`,
    math: R`
**AlphaGo 对四步的改动（p.31）**
1. **Selection**：同时考虑 $Q(s,a)$、访问次数和学到的 prior $P(s,a)=p_\sigma(a\mid s)$。
2. **Expansion**：用已知的围棋规则生成后继局面；把 policy prior 存在新的边上。
3. **Simulation / evaluation**：把 value 网络的预测和一次快速 rollout 的结果 $z_{\text{rollout}}$ 合起来：
$$V_{\text{leaf}}=(1-\lambda)\,v_\theta(s_L)+\lambda\,z_{\text{rollout}}.$$
4. **Backpropagation**：把这个评估沿经过的边回传，更新 $N(s,a)$ 和平均 $Q(s,a)$。

搜索结束后，执行根节点上**访问次数最多**的动作。双方轮流走棋，所以回传时要把价值换算到对应一方的视角。

**Selection：UCT 与 policy 引导的搜索（p.33）**

UCT：$\displaystyle a=\arg\max_b\Big[Q(s,b)+c\sqrt{\frac{\ln N(s)}{N(s,b)}}\Big]$。

AlphaGo Zero / AlphaZero 用的 **PUCT**：
$$a=\arg\max_b\Big[\underbrace{Q(s,b)}_{\text{search value}}+c_{\text{puct}}\underbrace{P(s,b)}_{\text{learned prior}}\frac{\sqrt{\sum_uN(s,u)}}{1+N(s,b)}\Big].$$

课件的四点说明：
- prior 高的动作在搜索早期得到更多关注；
- 访问次数增加会减小重复被选动作的加分；
- 搜索得到的价值可以推翻网络最初的偏好；
- 网络 prior $P$ 引导搜索，但它**不是**最终的搜索策略。

**PUCT 与 UCT 的两个差别**：加分乘了 prior $P(s,b)$；访问次数项是 $\sqrt{\sum N}/(1+N)$ 而不是 $\sqrt{\ln N(s)/N(s,b)}$，所以 $N(s,b)=0$ 时加分是有限的——prior 低的动作不一定会被先试。

**AlphaGo Zero 的一次搜索迭代怎么走**（和 UCT 的流程对照）：
- 第一次到达一个局面时，网络算出 $(p_\theta,v_\theta)$：$p_\theta$ 给该局面每个合法动作一个 prior，$v_\theta$ 作为这个新节点的评估值直接回传（不 rollout）。
- 以后再到达这个局面，**直接用 PUCT 比较所有动作**，包括还没访问过的动作——不再要求“先把每个动作各试一次”（UCT 那样会让 362 个动作都先试一遍，prior 就失去作用）。
- 选中的动作如果还没有后继节点，就用围棋规则生成后继局面、建立新节点、请网络评估它；然后回传，更新路径上的 $N$ 和平均 $Q$。
`,
    formulas: [VLEAF, PUCT],
    example: R`
**PUCT 的一次选择**（一个虚构的根节点，$c_{\text{puct}}=1$）

三个动作已共被访问 $\sum_uN=16$ 次，$\sqrt{16}=4$。

| 动作 | $Q$ | $N$ | $P$ | 加分 $=P\times4/(1+N)$ | PUCT |
|---|---|---|---|---|---|
| $a_1$ | 0.5 | 3 | 0.2 | $0.2\times4/4=0.2$ | **0.7** |
| $a_2$ | 0.3 | 10 | 0.6 | $0.6\times4/11=0.218$ | 0.518 |
| $a_3$ | 0.1 | 3 | 0.2 | $0.2$ | 0.3 |

prior 最高的是 $a_2$，它也被访问得最多；但搜索发现 $a_1$ 的 $Q$ 更高，而且 $a_2$ 已被访问 10 次、加分变小，所以这次选 $a_1$——**搜索价值推翻了网络的偏好**。

（同样的数字用 UCT，$c=1$：$\ln16=2.7726$，$a_1$：$0.5+\sqrt{2.7726/3}=1.461$；$a_2$：$0.3+\sqrt{2.7726/10}=0.827$；$a_3$：$1.061$。UCT 不看 prior，只看 $Q$ 和访问次数。）

**AlphaGo 的叶节点评估**：value 网络给出 $v_\theta(s_L)=0.2$，一次快速 rollout 赢了（$z_{\text{rollout}}=+1$）。取 $\lambda=0.5$（原论文的取值，课件未给）：$V_{\text{leaf}}=0.5\times0.2+0.5\times1=0.6$。
`,
    viz: { id: 'puct', guide: R`
**怎么用**：

1. 默认是 PUCT，prior 偏向较差的 $a_1$（0.8）。点“模拟 1 次”几次：搜索先集中在 $a_1$，$a_2$ 一开始几乎不被试——PUCT 在 $N=0$ 时不给 $+\infty$。
2. 点“模拟 200 次”：$a_1$ 的 $Q$ 被样本拉低，访问次数项又让它的加分变小，访问比例逐渐转向真正最好的 $a_2$。换几个随机种子：有时 $a_2$ 前几次运气差，纠正会很慢。
3. prior 切到“偏向最好的 $a_2$”：搜索几乎立刻集中到 $a_2$——好的 prior 节省大量搜索。
4. 规则切到 UCT：每个动作先各试一次，之后只按 $Q$ 和访问次数分配。` },
    compare: R`
| | 普通 MCTS（UCT） | AlphaGo（2016） | AlphaGo Zero |
|---|---|---|---|
| Selection | $Q$ + UCB 加分 | $Q$ + 访问次数 + prior $p_\sigma$ | PUCT：$Q$ + prior $p_\theta$ |
| Expansion | simulator | 已知围棋规则 | 已知围棋规则 |
| 叶节点评估 | 随机 rollout | $(1-\lambda)v_\theta+\lambda z_{\text{rollout}}$ | 只用 $v_\theta(s_L)$ |
| 回传 | 平均回报 | 平均评估 | 平均评估 |
| 最后执行 | 最大 $Q$（课件 Gridworld 例子） | 最多访问 | 最多访问（训练时按 $\pi_t$ 抽样；$\pi_t$ 是把根节点各动作的访问次数归一化得到的落子概率，下一章细讲） |
| 训练数据 | 无（不学习） | 人类棋谱 + 自我对弈 | 只有带搜索的自我对弈 |
| 网络 | 无 | $p_\sigma$、快速 rollout policy、$p_\rho$、$v_\theta$ | 一个共享网络 $f_\theta\to(p_\theta,v_\theta)$ |
`,
    pitfalls: [
      { wrong: '网络的 prior $P(s,a)$ 就是最终的走棋策略。', right: '课件 p.33：prior 引导搜索，**不是**最终的搜索策略。搜索价值可以推翻它，最终按访问次数（或由访问次数得到的 $\\pi_t$）走棋。' },
      { wrong: 'AlphaGo Zero 什么都不知道，从零学会了围棋规则。', right: '“Zero” 去掉的是人类棋谱和 rollout 评估。它仍然知道围棋规则（用来生成后继局面），仍然搜索一棵树。' },
      { wrong: 'AlphaGo 用 value 网络完全代替了 rollout。', right: 'AlphaGo（2016）把两者混合：$V_{\\text{leaf}}=(1-\\lambda)v_\\theta+\\lambda z_{\\text{rollout}}$。完全去掉 rollout 的是 AlphaGo Zero。' },
      { wrong: 'PUCT 和 UCT 一样，每个动作都会先被试一次。', right: 'PUCT 在 $N(s,b)=0$ 时加分是有限值 $c_{\\text{puct}}P\\sqrt{\\sum N}$，prior 很低的动作可能很久都不被试。' },
      { wrong: 'AlphaGo 搜索后执行 $Q$ 最大的动作。', right: '课件 p.31：执行根节点上**访问次数最多**的动作。' }
    ],
    quiz: [
      { kind: '公式计算', q: 'PUCT，$c_{\\text{puct}}=1$，$\\sum_uN(s,u)=16$。某动作 $Q=0.3$、$N=10$、$P=0.6$。PUCT 分数是多少（保留 3 位）？', answer: 0.518, tol: 0.001, explain: '$0.3+1\\times0.6\\times\\sqrt{16}/(1+10)=0.3+2.4/11=0.3+0.218=0.518$。', ctx: false },
      { kind: '公式计算', q: 'AlphaGo 叶节点：$v_\\theta(s_L)=-0.4$，快速 rollout 结果 $z=+1$，$\\lambda=0.5$。$V_{\\text{leaf}}$ 是多少？', answer: 0.3, tol: 0.0005, explain: '$(1-0.5)\\times(-0.4)+0.5\\times1=-0.2+0.5=0.3$。', ctx: false },
      { kind: '概念判断', q: 'AlphaGo Zero 名字里的 “Zero” 去掉了什么？', options: ['围棋规则和树搜索', '人类棋谱和 rollout 评估', 'value 网络', '访问次数统计'], answer: 1, explain: '课件 p.32：去掉人类棋谱和 rollout；仍然知道规则、仍然搜索。', ctx: false },
      { kind: '概念判断', q: '课件说学习可以改进 MCTS 的三个部分。下面哪个**不是**其中之一？', options: ['Policy：学 prior 引导 selection', 'Value：学 v(s) 补充或代替 rollout', 'Model：没有转移模型时学习后继和奖励', 'Backpropagation：学一个新的平均公式'], answer: 3, explain: '课件 p.29 的三项是 policy、value、model。回传仍然是更新访问次数和平均值。', ctx: false },
      { kind: '算法比较', q: '关于 PUCT 与 UCT，正确的是？', options: ['PUCT 不使用 Q', 'UCT 的加分乘以网络 prior', 'PUCT 的加分乘以 prior P，且 N=0 时加分有限；UCT 的 N=0 加分为 +∞', '两者对未访问的动作处理相同'], answer: 2, explain: 'PUCT：$Q+c_{\\text{puct}}P\\sqrt{\\sum N}/(1+N)$；UCT：$Q+c\\sqrt{\\ln N(s)/N(s,b)}$。', ctx: false }
    ],
    source: 'W11-1 p.27（围棋）、p.28（里程碑）、p.29（学习能改进 MCTS 的三部分）、p.30（AlphaGo 的训练）、p.31（AlphaGo 对四步的改动）、p.32（AlphaGo Zero）、p.33（UCT 与 PUCT）。λ = 0.5 来自 Silver et al. 2016，课件未给出。'
  },
  /* ------------------------------------------------------------------ c38 */
  {
    id: 'c38', part: 'p9', title: '自我对弈、AlphaZero、MuZero 与总结', en: 'Self-play training, AlphaZero, MuZero, comparison and summary',
    summary: 'AlphaGo Zero 的训练循环：每一步用当前网络做 MCTS，把根的访问次数变成搜索策略 $\\pi_t$ 并按它落子；对局结束记下结果 $z_t$；用 $(s_t,\\pi_t,z_t)$ 训练网络，让 $p_\\theta$ 模仿 $\\pi_t$、$v_\\theta$ 预测 $z_t$——**搜索教网络**。AlphaZero 把同一套方法用于国际象棋、将棋和围棋（允许平局）。MuZero 的搜索不再调用给定的游戏规则：它从环境经验中学一个只预测“搜索需要的东西”的内部模型 $h_\\theta,g_\\theta,f_\\theta$，在学到的模型上做 MCTS。',
    goals: ['写出 $\\pi_t\\propto N^{1/\\tau}$（$\\propto$ 读作“正比于”：先算 $N^{1/\\tau}$，再除以所有动作的总和），说明 τ 的作用', '写出 AlphaGo Zero 的损失并解释每一项', '区分树回传（更新 N、Q）与梯度反向传播（训练 θ）', '说出 AlphaZero 相对 AlphaGo Zero 的变化', '说出 MuZero 的三个函数、训练目标，以及模型误差的影响', '复述课件的比较表和 W11 总结'],
    prereq: '第 37 章',
    what: R`
**自我对弈：搜索教网络（W11 p.34）**

“自我对弈”是指程序自己控制黑白双方下完整盘棋：双方用的是同一个当前网络，轮到谁走，就从当前局面运行一次 MCTS，记下 $(s_t,\pi_t)$ 并按 $\pi_t$ 落子。整盘结束后，才给每条记录补上结果 $z_t$——站在 $s_t$ 时走棋一方的视角：黑方赢了，黑方走棋时的记录 $z_t=+1$，白方走棋时的记录 $z_t=-1$。这些 $(s_t,\pi_t,z_t)$ 就是训练数据。具体步骤：

1. 在状态 $s_t$，用当前网络运行 MCTS。
2. 把根节点的访问次数变成搜索策略并选一步：
$$\pi_t(a\mid s_t)=\frac{N(s_t,a)^{1/\tau}}{\sum_bN(s_t,b)^{1/\tau}},\qquad a_t\sim\pi_t.$$
3. 对局结束时，记录站在 $s_t$ 的那一方的结果 $z_t$。
4. 用 $(s_t,\pi_t,z_t)$ 训练网络，之后的搜索使用改进后的网络：
$$L(\theta)=\underbrace{(z_t-v_\theta(s_t))^2}_{\text{value error}}-\underbrace{\sum_a\pi_t(a\mid s_t)\log p_\theta(a\mid s_t)}_{\text{match the search policy}}+\beta\lVert\theta\rVert^2.$$
- $\tau>0$ 控制落子的随机程度；$\tau$ 小时偏向访问最多的动作。
- **树回传**更新 $N$、$Q$；**梯度反向传播**训练 $\theta$——两个都叫 backpropagation，但是不同的东西。

**AlphaZero：同一方法用于多种棋（p.35）**
- 把 AlphaGo Zero 推广到国际象棋、将棋和围棋；
- 保留共享的 policy–value 网络和 MCTS 学习循环；
- **每种棋各训练一个网络**；
- 按每种棋的规则调整状态和动作的表示；
- 允许平局：$z\in\{-1,0,+1\}$；
- 自我对弈使用持续更新的网络。

MCTS 中什么变了？角色不变：policy prior、叶节点价值、树回传；expansion 仍然需要一个知道游戏规则的 simulator。课件留下的问题：**agent 没有现成的转移模型时，还能规划吗？**

**MuZero：学习搜索用的模型（p.36）**——从与环境交互的经验中学三个函数：
- $x_0=h_\theta(o_{\le t})$：观测的表示（representation）；
- $(x_{k+1},\hat r_{k+1})=g_\theta(x_k,a_k)$：内部的后继状态与奖励（dynamics）；
- $(p_k,v_k)=f_\theta(x_k)$：policy prior 与价值（prediction）。

$x_k$ 是搜索深度 $k$ 处学到的内部状态。MCTS 通过对内部状态调用 $g_\theta$ 来扩展树。模型只预测搜索需要的东西，**不重建**下一张图像或棋盘。和 model-based RL 的联系：AlphaZero 使用给定的转移模型；MuZero 学一个用于规划的模型，同时学习 policy 和 value 预测。

**MuZero 对 MCTS 和学习的改动（p.37）**
1. Selection：用搜索价值、访问次数和学到的 policy prior。
2. Expansion：用 $g_\theta$ 预测下一个内部状态和奖励。
3. Evaluation：用新内部状态的预测价值。
4. Backup：把路径上预测的奖励和叶节点价值合起来；更新访问次数和平均回报。

训练目标：policy 目标 = MCTS 的搜索策略；reward 目标 = 环境中观察到的奖励；value 目标 = 棋类用最终结果，Atari 用 n-step 奖励加搜索价值 bootstrap。课件的提醒：学到的模型让搜索成为可能，但**模型的误差会影响规划**。
`,
    why: R`
**为什么用 $\pi_t$ 训练 $p_\theta$**：搜索在网络 prior 的基础上往前推演，修正了 prior 的错误，所以搜索策略 $\pi_t$ 通常比 $p_\theta$ 更好。让 $p_\theta$ 模仿 $\pi_t$，下一次搜索的起点就更好；更好的起点又让搜索结果更好。这是一个“评估—改进”的循环：搜索负责**改进** policy，训练负责把改进**记住**。

**为什么用 $z_t$ 训练 $v_\theta$**：对局的真实结果是对局面价值最直接的监督信号，这和 Monte Carlo 用完整回报做目标是同一个思路。

**为什么需要 MuZero**：AlphaZero 的 expansion 要调用游戏规则生成后继局面。很多问题（例如 Atari 游戏、现实任务）虽然有可以交互的环境，却没有一个能交给规划器、在树里随意调用的转移模型。MuZero 用与环境交互的经验学一个内部模型，只要求它在搜索中预测对奖励、价值和 policy，不必还原真实的画面。
`,
    intuition: R`
**老师（搜索）教学生（网络），学生变强后老师也变强**

- 网络 = 学生的直觉；MCTS = 学生在直觉引导下认真算出来的答案。
- 训练 = 让直觉向“认真算出来的答案”靠拢。
- 直觉越准，下次在同样的计算量下能算得越深、越准。

**τ 是“下得多冒险”**：$\tau=1$ 按访问比例抽样，对弈中会出现各种走法，训练数据更丰富；$\tau\to0$ 几乎总是走访问最多的那一步，适合正式比赛。

**MuZero 的模型是“够用就好”**：不预测下一帧画面长什么样，只预测“在那里能拿多少奖励、局面有多好、接下来该搜哪几步”。这些量预测对了，搜索就能工作；预测错了，搜索会被误导。
`,
    math: R`
**τ 的两个极限**：$\tau=1$ 时 $\pi_t\propto N$；$\tau\to0$ 时，访问次数最多的动作（若唯一）概率趋于 1，若有几个并列最多则在它们之间平分；$\tau\to\infty$ 时在**访问次数大于 0** 的动作之间趋于均匀，访问次数为 0 的动作在任何温度下概率都是 0（例如 $(30,10,0)$ 的极限是 $(0.5,0.5,0)$）。公式要求至少有一个动作被访问过。

**损失各项的最小值**：value 项在 $v_\theta(s_t)=z_t$ 时为 0；policy 项（交叉熵）在 $p_\theta=\pi_t$ 时最小，最小值等于 $\pi_t$ 的熵 $-\sum_a\pi_t\log\pi_t$。

Cross-entropy（交叉熵）$-\sum_a\pi_t(a)\log p_\theta(a)$ 用目标分布 $\pi_t$ 给 $-\log p_\theta$ 加权：$\pi_t$ 把概率放在哪些动作上，$p_\theta$ 就必须在那些动作上也给大概率，否则 $-\log p_\theta$ 很大。两者完全相同时这一项最小，最小值是 Entropy（熵）$-\sum_a\pi_t\log\pi_t$，它衡量 $\pi_t$ 本身有多分散。这里的 log 是自然对数 ln。

**两种 backpropagation**
- 树回传：沿搜索路径更新每条边的 $N(s,a)$ 和平均 $Q(s,a)$，在**每次搜索迭代**中进行，不改网络。
- 梯度反向传播：对损失 $L(\theta)$ 求梯度、更新网络参数 $\theta$，在**收集到自我对弈数据之后**进行。

**AlphaGo 家族比较（p.38）**

| | AlphaGo（2016） | AlphaGo Zero、AlphaZero | MuZero |
|---|---|---|---|
| Selection | 学到的 policy prior | 学到的 policy prior | 学到的 policy prior |
| Expansion | 已知游戏规则 | 已知游戏规则 | 学到的内部动态 |
| 叶节点评估 | value 网络 + rollout | value 网络 | 价值预测 |
| Backup | 平均评估 | 平均评估 | 用预测奖励计算平均回报 |
| 训练数据 | 人类棋谱 + 自我对弈 | 带搜索的自我对弈 | 带搜索的环境经验 |

- AlphaGo Zero：去掉人类示例和 rollout；
- AlphaZero：把学习循环用于多种棋；
- MuZero：学习搜索内部使用的转移模型。
`,
    formulas: [SELFPI, LOSS, MUZERO],
    example: R`
**把访问次数变成 $\pi_t$**（借用课件决策 6 根节点的访问次数：Up 48、Right 266、Down 9、Left 15，共 338）

| τ | Up | Right | Down | Left |
|---|---|---|---|---|
| 1 | $48/338=0.142$ | $266/338=0.787$ | $0.027$ | $0.044$ |
| 0.5（各次数先平方） | $2304/73366=0.031$ | $70756/73366=0.964$ | $0.001$ | $0.003$ |
| 2（各次数先开方） | 0.230 | 0.542 | 0.100 | 0.129 |

**算一次损失**（$\beta\lVert\theta\rVert^2$ 取 0）：这一局最后赢了，$z_t=+1$；网络预测 $v_\theta(s_t)=0.6$；网络的 policy 是均匀的 $p_\theta=(0.25,0.25,0.25,0.25)$；目标是上面 $\tau=1$ 的 $\pi_t$。
- value error：$(1-0.6)^2=0.16$；
- policy 项：$-\sum_a\pi_t(a)\log0.25=\log4\times\sum_a\pi_t(a)=1.386$；
- 合计 $1.546$。

如果网络的 policy 恰好等于 $\pi_t$，policy 项降到 $\pi_t$ 的熵：$0.142\times1.952+0.787\times0.240+0.027\times3.626+0.044\times3.115\approx0.700$（每项是 $\pi_t(a)\times(-\ln\pi_t(a))$）——这是它能达到的最小值。
`,
    viz: { id: 'selfplay', guide: R`
**怎么用**：

1. 默认访问次数是课件决策 6 的根。把 τ 从 1 拖到 0.5、0.1：Right 的概率趋于 1；拖到 3：分布变平。
2. 调整某个动作的访问次数，看 $\pi_t$ 怎样变化。
3. 下半部分：选 $z_t$、调 $v_\theta$，看 value error；点“让 $p_\theta$ 等于 $\pi_t$”，policy 项降到最小（$\pi_t$ 的熵）。` },
    compare: R`
**W11 总结（p.41）**
- **在线、基于模型的规划**：用模型或 simulator，在计算预算内从当前状态往前看。
- **四步**：selection、expansion、simulation、backpropagation。
  - tree policy 平衡 exploration 与 exploitation；
  - rollout policy 估计树外的价值；
  - backpropagation 更新访问次数和平均回报。
- **执行并复用**：选一个根动作，观察结果，下次决策复用对应的子树。
- **变体**：改变树怎样扩展、叶节点怎样评估、价值怎样回传。
  - 价值函数可以代替 rollout 评估；
  - Expectimax 使用 decision node 和 chance node，在 chance node 做概率加权回传。
- **核心思想**：把搜索精力分配给有希望的动作，通过反复采样改进当前的决策。

**延伸阅读（p.39）**：Silver et al. 2016（AlphaGo）、2017（AlphaGo Zero）、2018（AlphaZero）；Schrittwieser et al. 2020（MuZero）。
`,
    pitfalls: [
      { wrong: '$\\pi_t$ 是网络直接输出的 policy。', right: '$\\pi_t$ 由 MCTS 根节点的**访问次数**算出，是“网络 + 搜索”的结果；网络输出的是 $p_\\theta$，训练时让 $p_\\theta$ 去模仿 $\\pi_t$。' },
      { wrong: '自我对弈中的 backpropagation 和 MCTS 的回传是同一件事。', right: '树回传更新 $N$、$Q$；梯度反向传播训练 $\\theta$。课件 p.34 特意区分了这两者。' },
      { wrong: 'AlphaZero 用同一个网络下三种棋。', right: '课件 p.35：每种棋**各训练一个网络**，共享的是方法和循环。' },
      { wrong: 'MuZero 学的模型能重建下一帧画面或棋盘。', right: '它只预测搜索需要的内部状态、奖励、policy 和价值，不重建观测。' },
      { wrong: 'AlphaZero 的 $z$ 只能是 $\\pm1$。', right: 'AlphaZero 允许平局：$z\\in\\{-1,0,+1\\}$。' }
    ],
    quiz: [
      { kind: '公式计算', q: '根节点访问次数为 $(30,10,0)$，$\\tau=1$。$\\pi_t$ 中第一个动作的概率是多少？', answer: 0.75, tol: 0.0005, explain: '$30/(30+10+0)=0.75$。', ctx: false },
      { kind: '公式计算', q: '同样的访问次数 $(30,10,0)$，$\\tau=0.5$。第一个动作的概率是多少？', answer: 0.9, tol: 0.0005, explain: '$1/\\tau=2$：$30^2=900$，$10^2=100$，$0$；$900/1000=0.9$。τ 越小越集中。', ctx: false },
      { kind: '公式计算', q: 'AlphaGo Zero 损失的 value 项：$z_t=-1$，$v_\\theta(s_t)=0.2$。value error 是多少？', answer: 1.44, tol: 0.0005, explain: '$(z_t-v_\\theta)^2=(-1-0.2)^2=1.44$。', ctx: false },
      { kind: '概念判断', q: 'MuZero 与 AlphaZero 最主要的区别是？', options: ['MuZero 不做树搜索', 'MuZero 用学到的内部动态 $g_\\theta$ 扩展搜索树，树内不调用给定的转移模型（游戏规则）', 'MuZero 只用人类棋谱训练', 'MuZero 不学价值函数'], answer: 1, explain: 'AlphaZero 用已知规则生成后继；MuZero 学 $g_\\theta$，在内部状态上扩展树，同时仍学 policy 和价值。', ctx: false },
      { kind: '概念判断', q: '自我对弈训练中，网络 policy $p_\\theta$ 的训练目标是？', options: ['人类棋谱的下一手', '对局结果 $z_t$', 'MCTS 根访问次数得到的搜索策略 $\\pi_t$', '均匀分布'], answer: 2, explain: '损失中的交叉熵项让 $p_\\theta$ 匹配 $\\pi_t$；$z_t$ 是 $v_\\theta$ 的目标。', ctx: false }
    ],
    source: 'W11-1 p.34（自我对弈与损失）、p.35（AlphaZero）、p.36（MuZero 的三个函数）、p.37（MuZero 对 MCTS 与训练的改动）、p.38（比较表）、p.39（延伸阅读）、p.41（总结）。'
  }
  ]);
})(window);
