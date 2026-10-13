/* Part 1 · W6-1 Markov Decision Processes. */
(function (root) {
  'use strict';
  const R = String.raw;
  root.RL.content.add([
  /* ------------------------------------------------------------------ c01 */
  {
    id: 'c01', part: 'p1', title: '从经典规划到 MDP', en: 'From Classical Planning to MDPs',
    summary: '经典规划假设“一个动作只有一个结果”。现实中动作会失败、会打滑，于是需要能描述**概率结果**的模型——Markov Decision Process。',
    goals: ['说出经典规划的 7 条假设，以及 MDP 保留了哪些、放宽了哪一条', '区分 deterministic、nondeterministic、probabilistic、partially observable', '知道 Markov chain → MRP → MDP 的关系，以及本课研究的 classical MDP 是什么'],
    what: R`
**经典规划（Classical planning）** 是课程前半段的模型：给定状态空间、初始状态、目标集合、每个状态可用的动作、确定性的转移函数 $f(s,a)$ 和代价 $c(s,a)$，求一串动作（plan）从初始状态到达目标。

$$\Sigma = \langle S,\ s_0,\ S_G,\ A,\ f,\ c\rangle$$

**Markov Decision Process（MDP）** 保留了“有限、离散、完全可观测、单一决策者”等假设，但把“每个动作只有一个结果”换成“每个动作的结果服从一个**已知的概率分布**”，并用**奖励**代替“到达目标集合”来表达目标。

本课程研究的 **classical MDP** 是：有限、完全可观测、转移规律和奖励规律都已知、单一智能体、离散的决策步、使用折扣回报（discounted return）。
`,
    why: R`
经典规划的 7 条假设：

| 假设 | 含义 |
|---|---|
| Finite and discrete 有限离散 | 状态和动作都是有限个 |
| Fully observable 完全可观测 | 总是确切知道当前状态 |
| **Deterministic 确定性** | 每个可用动作只有一个结果 |
| Static 静态 | 除了自己的动作，没有别的东西改变世界 |
| Restricted goals 目标集合 | 成功＝到达某个目标状态 |
| Implicit time 隐式时间 | 动作瞬间完成 |
| Single agent 单一决策者 | 只有一个“做决定的人”（可以指挥多个执行者） |

现实中“确定性”经常不成立：机器人可能打滑、抛硬币有两种结果。一旦动作结果不确定，**预先排好的一串动作就会失效**：第一步滑到了意料之外的格子，后面的动作就是为另一个位置准备的。我们需要一个能描述“可能结果及其概率”的模型，以及一种“在每个状态都重新决定”的解（下一章会看到，这个解叫 policy）。

:::note 关于“单一决策者”
课程第一个作业的多智能体寻路仍属于 single agent：只有一个中心化的决策者告诉所有执行者做什么。真正的 multi-agent 是每个智能体自己做决定。
:::
`,
    intuition: R`
把“动作的不确定”分成几种情况（课件的 7 个例子）：

- **Deterministic**：把积木放到另一块上——一个结果，概率 1。
- **Multi-agent**：下一步棋——你的落子是确定的，但下次轮到你时的局面还取决于对手怎么走。
- **Nondeterministic**：问朋友“喝茶还是咖啡”——可能有几种回答，但**没有给出概率**。这类问题叫 FOND（Fully Observable Non-Deterministic）。
- **Probabilistic**：抛均匀硬币——正面 0.5、反面 0.5。**MDP 处理的正是这一类**。
- **Partial observability**：打开箱子前不知道猫是否活着——动作本身确定，但状态事先看不见。
- **Unknown probabilities**：在新路面上测赛车——知道可能出现哪些结果，但概率要靠经验学出来（这就是后面强化学习面对的情况）。
- **POMDP**：雾天在湿滑道路上开车——运动有概率，状态又只能部分观测。

从模型家族看：**Markov chain**（状态按概率演化）＋**奖励** → **Markov reward process（MRP）**（转移会产生奖励）＋**动作选择** → **MDP**（智能体选择动作）。
`,
    math: R`
经典规划模型的组成：

| 记号 | 含义 |
|---|---|
| $S$ | 有限离散的状态集合 |
| $s_0\in S$ | 初始状态 |
| $S_G\subseteq S$ | 目标状态集合 |
| $A(s)$ | 状态 $s$ 下可用的有限动作集合 |
| $f(s,a)$ | 转移函数：执行 $a$ 后**唯一**到达的状态 |
| $c(s,a)$ | 在 $s$ 执行 $a$ 的代价 |

MDP 把 $f(s,a)$ 换成概率 $p(s'\mid s,a)$，把目标集合与代价换成奖励 $r(s,a,s')$ 和折扣因子 $\gamma$（下一章给出完整定义）：

$$f(s,a)=s' \quad\Longrightarrow\quad p(s'\mid s,a)\ \text{满足}\ \sum_{s'}p(s'\mid s,a)=1$$

确定性就是这个分布的特例：某个 $s'$ 的概率为 1，其余为 0。
`,
    formulaIntro: R`下面这条式子是整门 W6 的出发点：把“唯一后继”换成“后继的概率分布”。`,
    formulas: [{
      title: '从确定性转移到概率转移',
      latex: R`\htmlClass{fx-f}{f(s,a)=s'}\ \Longrightarrow\ \htmlClass{fx-p}{p(s'\mid s,a)}\ \text{且}\ \htmlClass{fx-sum}{\sum_{s'\in S}p(s'\mid s,a)=1}`,
      parts: [
        { key: 'f', label: '确定性转移 f(s,a)', color: 'gray', text: '经典规划：从 $s$ 执行 $a$，**一定**到达同一个 $s\'$。plan 可以提前排好。' },
        { key: 'p', label: '转移概率 p(s′|s,a)', color: 'blue', text: '竖线右边是条件（当前状态和动作），左边是候选结果。它返回“从 $s$ 做 $a$ 之后落在 $s\'$”的概率。' },
        { key: 'sum', label: '概率归一化', color: 'green', text: '对所有可能的后继求和必须等于 1：执行动作后一定会落在某个状态（可能是原地）。' }
      ]
    }],
    example: R`
**例子：经典规划问题能否写成 MDP？（课堂 quiz）**

能。做法：

1. 目标状态 → 进入目标时给正奖励（例如下一章的 Gridworld：右上角的目标格，进入时得 $+1$）。
2. 代价 → 负奖励（cost 就是 negative reward）。
3. 若想让“最短 plan”同样是 MDP 的最优解，可以给每一步一个小的负奖励，或者保持奖励不变、用 $\gamma<1$：同一个 $+1$，4 步拿到价值 $0.9^{3}=0.729$，5 步拿到只有 $0.9^{4}=0.6561$，所以越早到达越好。
4. 确定性转移就是“某个后继概率为 1”的特例。

因此 MDP 比经典规划更一般：它把经典规划当作特例包含进来。
`,
    viz: { id: 'classify', guide: R`
**怎么用**：取消勾选“确定性”，看问题从经典规划变成 MDP；再取消“完全可观测”，变成 POMDP。去掉“已知结果分布”有两种不同情况：模型**根本不提供**概率、只给可能结果集合 → FOND；概率**存在但未知**、要靠经验学 → 未知模型的 MDP，这正是 W7 起强化学习要解决的问题。下方把课件的 7 个例子逐一归类，选对会变绿。` },
    compare: R`
| | 经典规划 | MDP（本课 classical MDP） |
|---|---|---|
| 动作结果 | 唯一（$f(s,a)$） | 概率分布（$p(s'\mid s,a)$） |
| 目标表达 | 目标状态集合 $S_G$ + 代价 | 奖励 $r(s,a,s')$ + 折扣 $\gamma$ |
| 解的形式 | plan：一串动作 | policy：每个状态该做什么 |
| 怎样算“好” | plan 总代价最小 | 期望折扣回报最大 |
| 求解方法 | 搜索（blind / heuristic） | 动态规划（W6-2）、强化学习（W7+） |

| 扩展模型 | 改变了什么 |
|---|---|
| POMDP | 状态只能部分观测 |
| Robust / uncertain MDP | 转移模型本身不确定 |
| Constrained MDP | 多个约束 |
| Stochastic game / multi-agent MDP | 多个决策者 |
| Semi-MDP | 一个动作持续一段时间 |

这些扩展只需认识名称，不考细节。
`,
    pitfalls: [
      { wrong: 'Nondeterministic 和 probabilistic 是一回事。', right: 'Nondeterministic（FOND）只知道“可能有哪些结果”，**没有概率**；probabilistic 给出了每个结果的概率。MDP 属于后者。' },
      { wrong: '多智能体寻路一定是 multi-agent 问题。', right: '若只有一个中心化决策者告诉所有执行者怎么做，仍然是 single agent。multi-agent 指多个**决策者**各自决定。' },
      { wrong: 'MDP 没有目标，所以不能表示经典规划。', right: 'MDP 用奖励表达目标：进入目标状态给正奖励，代价写成负奖励；再用 $\\gamma<1$ 或每步负奖励鼓励更短的路径。例如每步代价相同、动作确定的最短路问题，就是 MDP 的一个特例。（一般的代价最小规划要仔细设计终止和奖励：只把代价取负再加 $\\gamma<1$，后面的代价也会被打折，不一定保持原来的总代价排序。）' },
      { wrong: '“Static” 意思是状态永远不变。', right: 'Static 指**只有智能体自己的动作**会改变状态，没有未建模的外部力量在改变世界。' }
    ],
    quiz: [
      { kind: '概念判断', q: '经典规划的哪一条假设被 MDP 放宽了？', options: ['完全可观测', '确定性（每个动作只有一个结果）', '有限离散', '单一决策者'], answer: 1,
        explain: 'Classical MDP 仍然有限、完全可观测、单一决策者，只是允许动作结果服从已知的概率分布。', why: ['MDP 仍完全可观测；放宽它得到 POMDP。', '', 'Classical MDP 仍有限离散。', '多决策者是 stochastic game 等扩展。'] },
      { kind: '概念判断', q: '“问朋友喜欢茶还是咖啡：可能回答茶、咖啡或都行，但不知道各自的概率。”这属于哪一类？', options: ['Deterministic', 'Probabilistic', 'Nondeterministic（FOND）', 'Partial observability'], answer: 2,
        explain: '有多个可能结果但没有概率，就是 nondeterministic。若给出了概率才是 probabilistic。' },
      { kind: '概念判断', q: '下列哪个例子最接近 POMDP？', options: ['抛一枚均匀硬币', '雾天在湿滑道路上开车', '把积木放到另一块上', '和对手下棋'], answer: 1,
        explain: '运动有随机性（打滑）且状态看不清（雾），两者同时存在就是 POMDP。' },
      { kind: '公式计算', q: '奖励只在进入目标时给 $+1$，$\\gamma=0.9$。从起点计分为 $R_1+\\gamma R_2+\\gamma^2R_3+\\gamma^3R_4+\\dots$（第 1 步的奖励不打折）。第 4 步进入目标（奖励出现在 $R_4$），从起点看这份奖励折扣后值多少？', answer: 0.729, tol: 0.001,
        explain: '$R_4$ 前面的系数是 $\\gamma^{3}=0.9^3=0.729$。第 5 步才到只值 $0.9^4=0.6561$，所以 $\\gamma<1$ 鼓励更快到达。' },
      { kind: '概念判断', q: 'Markov chain、Markov reward process、MDP 依次增加了什么？', options: ['先加动作，再加奖励', '先加奖励，再加动作选择', '先加观测，再加奖励', '先加折扣，再加动作'], answer: 1,
        explain: 'Markov chain 只有按概率演化的状态；MRP 在转移上加了奖励；MDP 再让智能体**选择动作**。' }
    ],
    source: 'W6-1 slides 5–11（经典规划模型与假设、不确定性类型、Markov chain→MRP→MDP、classical MDP 定义）；slide 18–19（quiz：经典规划可写成 MDP）；transcript L1。'
  },
  /* ------------------------------------------------------------------ c02 */
  {
    id: 'c02', part: 'p1', title: 'MDP 五元组与 Gridworld', en: 'The discounted-reward MDP ⟨S, A, p, r, γ⟩',
    summary: '一个 discounted-reward MDP 由五个部分组成：状态、动作、转移概率、奖励、折扣因子。课程从头到尾使用同一个 4×3 Gridworld。',
    goals: ['写出 $M=\\langle S,A,p,r,\\gamma\\rangle$ 并解释每一项', '把 Gridworld 完整建模：11 个状态、0.8/0.1/0.1 滑动、进入时奖励', '在 joint $p(s\',r\\mid s,a)$、separate $P_a(s\'\\mid s)+r$、矩阵 $P^a$ 三种表示之间转换', '区分 declarative 和 generative 两种访问模型的方式'],
    prereq: '第 1 章',
    what: R`
一个 **discounted-reward MDP** 是五元组

$$M=\langle S,\ A,\ p,\ r,\ \gamma\rangle$$

- $S$：有限状态集合；$A$：有限动作集合；
- $p(s'\mid s,a)$：在 $s$ 执行 $a$ 后到达 $s'$ 的概率；
- $r(s,a,s')$：这次转移得到的奖励；
- $0\le\gamma<1$：折扣因子。

再加上“哪些状态是终止状态、从哪里开始”这样的约定，任务就完整了。

**课程 Gridworld**（W6–W11 一直用它）：

- 4 列 × 3 行，坐标 $(x,y)$，左下角是 $(0,0)$；$(1,1)$ 是墙（灰格，不是状态）。
- 11 个状态按“从左到右、从下到上”编号：底行 $s_1..s_4$，中行 $s_5$、墙、$s_6$、$s_7$，顶行 $s_8..s_{11}$。
- 起点 $s_1=(0,0)$；$s_{11}=(3,2)$ 是 $+1$ 终点，$s_7=(3,1)$ 是 $-1$ 终点。
- 动作 $\{N,S,E,W\}$（也写作 Up/Down/Right/Left），每个非终止状态四个动作都可用。
- 选择一个方向：0.8 按预期移动，0.1 向左侧滑，0.1 向右侧滑；撞墙或出界就留在原地。“左 / 右”是**面向所选方向时**的左右，和机器人原来朝哪无关：选 N（上）时左 = W、右 = E；选 E（右）时左 = N、右 = S；选 S（下）时左 = E、右 = W；选 W（左）时左 = S、右 = N。
- 奖励：从非终止状态**进入** $s_{11}$ 得 $+1$，进入 $s_7$ 得 $-1$，其余 0；$\gamma=0.9$。到达终点 episode 就结束，不会再在终点里重复拿奖励。（如果要把它写成转移矩阵、让每行概率和为 1，就把终点当成“吸收态”：终点自己转到自己的概率为 1，奖励为 0。）
`,
    why: R`
要计算或学习“该怎么做”，首先要把问题说清楚：**有哪些情况（S），能做什么（A），做了之后会怎样（p），好不好（r），未来值多少（γ）**。五元组把这些信息完整、无歧义地写下来，后面所有算法（VI、PI、MC、TD、Q-learning……）都建立在这五项之上。

两个容易被忽略的设计决定：

1. **奖励写成 $r(s,a,s')$，在“进入”终点时给**。如果把奖励写成“待在某个格子里就给”，在 continuing 建模（终点变成永远停留的吸收态）中会无限次拿到奖励。
2. **每个状态的动作集合都一样**。经典规划里，在左下角只有 Up/Right 可用；MDP 里四个动作都能选，向墙走只是“原地不动”。
`,
    intuition: R`
想象机器人在冰面上：你让它向北走，它 80% 真的向北，10% 滑向左，10% 滑向右。

**左上角 $s_8=(0,2)$ 选 North** 时三种移动尝试：

| 尝试 | 概率 | 实际结果 |
|---|---|---|
| 向北 | 0.8 | 撞上边界，留在 $s_8$ |
| 向西（左滑） | 0.1 | 撞左边界，留在 $s_8$ |
| 向东（右滑） | 0.1 | 到达右边 $s_9$ |

三种尝试只产生两个不同结果：留在原地（$0.8+0.1=0.9$），到 $s_9$（0.1）。这就是“分支合并”。
`,
    math: R`
**Separate 表示（本课主用，来自 Tim Miller 的笔记）**

$$P_a(s'\mid s)=\Pr(S_{t+1}=s'\mid S_t=s,A_t=a),\qquad r(s,a,s')$$

**Joint 表示（Sutton & Barto）**：同时给出后继和奖励的分布

$$p(s',r\mid s,a)=\Pr(S_{t+1}=s',R_{t+1}=r\mid S_t=s,A_t=a),\qquad \sum_{s'\in S}\sum_r p(s',r\mid s,a)=1$$

两者的关系：对奖励求和就得到只关于后继的概率

$$P_a(s'\mid s)=\sum_r p(s',r\mid s,a)$$

如果奖励由 $(s,a,s')$ 唯一确定（本课的假设），separate 表示就足够做期望回报的规划。

**矩阵表示（David Silver）**：把状态排成 $s_1,\dots,s_n$，对每个动作 $a$

$$P^a_{ij}=P_a(s_j\mid s_i),\qquad R^a_{ij}=r(s_i,a,s_j),\qquad \sum_{j=1}^n P^a_{ij}=1$$

**访问模型的两种方式**

- **Declarative（声明式）**：模型直接给出分布——完整的表/矩阵、紧凑的符号描述（如 PPDDL），或者程序返回某个 $(s,a)$ 的所有非零后继和概率。
- **Generative（生成式）**：给定 $(s,a)$，黑箱模拟器或真实环境只返回**一个样本** $(s',r)\sim G(s,a)$。反复交互可以估计期望，但看不到完整分布。

区别在于“接口返回什么”，而不是“是不是代码”。
`,
    formulas: [{
      title: '联合转移概率 p(s′, r | s, a)',
      latex: R`\htmlClass{fx-p}{p(}\htmlClass{fx-out}{s',r}\mid \htmlClass{fx-cond}{s,a}\htmlClass{fx-p}{)}=\Pr(\htmlClass{fx-out}{S_{t+1}=s',R_{t+1}=r}\mid \htmlClass{fx-cond}{S_t=s,A_t=a})`,
      parts: [
        { key: 'cond', label: '条件：当前状态与动作', color: 'blue', text: '竖线右边是已知条件：现在在 $s$，选了动作 $a$。' },
        { key: 'out', label: '候选结果：下一状态与奖励', color: 'green', text: '竖线左边是一个候选结果：下一状态是 $s\'$ 且奖励是 $r$。四个参数 $(s\',r,s,a)$ 一起确定一个问题。' },
        { key: 'p', label: '返回值：这组结果的概率', color: 'purple', text: '函数返回概率，而不是奖励。例：$p(s_8,0\\mid s_8,N)=0.9$ 中，奖励是 0，**概率**是 0.9。' }
      ]
    }, {
      title: '从 joint 到 separate：对奖励求和',
      latex: R`\htmlClass{fx-sep}{P_a(s'\mid s)}=\htmlClass{fx-sum}{\sum_r}\ \htmlClass{fx-joint}{p(s',r\mid s,a)}`,
      parts: [
        { key: 'joint', label: '联合概率', color: 'purple', text: '同时指定后继和奖励。' },
        { key: 'sum', label: '对所有奖励求和', color: 'orange', text: '把“到达同一个 $s\'$ 但奖励不同”的情况加起来——丢掉奖励细节，只保留后继分布。' },
        { key: 'sep', label: '只关于后继的转移概率', color: 'blue', text: '本课的 separate 表示：$P_a(s\'\\mid s)$ 配合确定的 $r(s,a,s\')$。' }
      ]
    }],
    example: R`
**Gridworld 的 MDP 写法（课件 slide 15）**

| 部分 | Gridworld 中的取值 |
|---|---|
| $S$ | $\{s_1,\dots,s_{11}\}$，灰格不是状态 |
| $A$ | $\{N,S,E,W\}$，每个非终止状态都可用 |
| $p$ | 0.8 按预期，0.1 向两侧；被挡住就留在原地 |
| $r$ | 进入 $s_{11}$ 得 $+1$，进入 $s_7$ 得 $-1$，其余 0；$s_7,s_{11}$ 终止 |
| $\gamma$ | 0.9 |

**在左上角 $s_8$ 选 North**：

$$p(s_8,0\mid s_8,N)=0.9,\qquad p(s_9,0\mid s_8,N)=0.1$$

$$P_N(s_8\mid s_8)=0.9,\quad P_N(s_9\mid s_8)=0.1,\quad r(s_8,N,s_8)=r(s_8,N,s_9)=0$$

**哪些转移带非零奖励**：$r(s_{10},\cdot,s_{11})=+1$（从 $s_{10}$ 选 N、E、S 都可能进入 $s_{11}$）；$r(s_6,\cdot,s_7)=-1$、$r(s_4,\cdot,s_7)=-1$。从 $s_{10}$ 选 W 永远到不了 $s_{11}$，所以那一项即使写成 $+1$ 也不会被用到。
`,
    viz: { id: 'mdp', props: { state: 8, action: 'N' }, guide: R`
**建议操作**

1. 保持 $s_8$ + North，核对上面的 0.9 / 0.1。
2. 点 $s_{10}$ 选 East：0.8 进入 $s_{11}$（奖励 +1），左滑到 $s_{10}$ 上方是边界（原地），右滑到 $s_6$。
3. 点 $s_6$ 选 North：右滑会进入 $s_7$ 得 −1——这就是为什么 $s_6$ 比 $s_{10}$ 危险。
4. 切到“只能采样”，采样 1000 次，看频率怎样逼近真实概率。这就是 generative access。
5. 打开“最优 π*”叠加 policy 箭头：MDP 的五元组描述世界，policy 描述智能体。` },
    compare: R`
| 表示 | 写法 | 优点 | 何时用 |
|---|---|---|---|
| Joint | $p(s',r\mid s,a)$ | 最一般，奖励也可随机 | Sutton & Barto 教材 |
| Separate | $P_a(s'\mid s)$ + $r(s,a,s')$ | 奖励确定时更直观 | **本课主用** |
| Matrix | $P^a$, $R^a$（$n\times n$） | 计算高效 | David Silver 课件、实现 |

| 访问方式 | 返回什么 | 典型方法 |
|---|---|---|
| Declarative | 完整分布 | 动态规划（VI、PI） |
| Generative | 一个样本 $(s',r)$ | MCTS（W11）、强化学习 |
`,
    pitfalls: [
      { wrong: '$p(s\',r\\mid s,a)$ 返回的是奖励。', right: '它返回**概率**。$p(s_8,0\\mid s_8,N)=0.9$ 中 0 是奖励、0.9 是概率。' },
      { wrong: '左上角选 North 有三种结果，所以要写三个概率。', right: '三种**移动尝试**中有两种都留在原地，合并后只有两个不同结果：留在原地 0.9，到右边 0.1。' },
      { wrong: '灰色墙格也是一个状态。', right: '墙不是状态，所以 4×3 网格只有 11 个状态；撞墙意味着留在原地。' },
      { wrong: '奖励是“待在 +1 格子里”得到的。', right: '本课的奖励是 $r(s,a,s\')$：**进入** $s_{11}$ 时得到。这样即使把终点建模为吸收态（continuing），也不会重复拿奖励。' },
      { wrong: '有代码的模拟器就是 declarative 模型。', right: '看接口返回什么：只返回一个样本 $(s\',r)$ 的是 generative；返回完整分布（哪怕是由程序算出来的）才是 declarative。' }
    ],
    quiz: [
      { kind: '公式计算', q: '在 $s_{10}=(2,2)$ 选 East。进入 $s_{11}$ 的概率是多少？', answer: 0.8, tol: 0.001, explain: '按预期向东移动（0.8）进入 $s_{11}$。左滑（向北）撞边界留在 $s_{10}$，右滑（向南）到 $s_6$。' },
      { kind: '公式计算', q: '在 $s_{10}$ 选 North。$P_N(s_{11}\\mid s_{10})$ 是多少？', answer: 0.1, tol: 0.001, explain: 'North 的右侧是 East：以 0.1 右滑进入 $s_{11}$。按预期向北会撞边界留在原地（0.8），左滑向西到 $s_9$（0.1）。' },
      { kind: '公式计算', q: '在 $s_1=(0,0)$ 选 West。$P_W(s_1\\mid s_1)$ 是多少？', answer: 0.9, tol: 0.001, explain: 'West 按预期撞左边界（0.8，原地）；West 的左侧是 South，撞下边界（0.1，原地）；右侧是 North，到 $s_5$（0.1）。原地合计 0.9。' },
      { kind: '概念判断', q: '以下哪一项描述了 generative access？', options: ['给定 $(s,a)$，返回所有后继及其概率', '给定 $(s,a)$，返回一个采样的 $(s\',r)$', '用 PPDDL 写出完整的转移规则', '给出每个动作的矩阵 $P^a$'], answer: 1,
        explain: 'Generative 只给样本；其余三项都暴露了完整分布，属于 declarative。' },
      { kind: '概念判断', q: '矩阵 $P^a$ 的每一行有什么性质？', options: ['每行和为 1', '每列和为 1', '对角线全为 0', '所有元素相等'], answer: 0,
        explain: '第 $i$ 行是从 $s_i$ 执行 $a$ 后的后继分布：$\\sum_j P^a_{ij}=1$。' }
    ],
    source: 'W6-1 slides 12–15（Gridworld、五元组、Gridworld 建模）、19、21–25（三种表示、矩阵、declarative/generative）；W6-2 slide 7（episodic/continuing 与 r(s,a,s′)）；transcript L1、L2。'
  },
  /* ------------------------------------------------------------------ c03 */
  {
    id: 'c03', part: 'p1', title: 'Markov 性质、轨迹与 history', en: 'Markov property, trajectories and histories',
    summary: '一次交互是 $S_t\\xrightarrow{A_t}(R_{t+1},S_{t+1})$。把它们首尾相接就是 trajectory。Markov 性质说：预测下一步只需要当前状态和动作，过去的历史不提供额外信息。',
    goals: ['读懂 $S_t, A_t, R_{t+1}$ 的下标与大小写', '写出 history $H_t$ 和 trajectory', '说出 Markov property 的公式与直觉'],
    prereq: '第 2 章',
    what: R`
**一次转移（one transition）**：在时刻 $t$ 处于 $S_t$，选择 $A_t$，环境返回奖励 $R_{t+1}$ 和下一状态 $S_{t+1}$。

$$S_t \xrightarrow{\ A_t\ } (R_{t+1},\ S_{t+1})$$

**History**：选择 $A_t$ 之前观察到的全部信息

$$H_t=(S_0,A_0,R_1,S_1,\dots,R_t,S_t)$$

从初始状态一直到终止状态的完整序列称为 **episode**。trajectory（轨迹）泛指 agent 与环境交互得到的状态—动作—奖励序列，可以有限也可以无限；episode 是“从开始到终止”的那种有限 trajectory。

**Markov property**：知道 $S_t$ 和 $A_t$ 就足以预测下一状态和奖励的分布，更早的历史不提供额外信息。
`,
    why: R`
如果下一步的结果依赖整段历史，那么每个决策都要考虑越来越长的序列，状态数会爆炸，Bellman 方程（第 7 章）也无法写成“只看下一步”的递推形式。

Markov 性质让我们可以：

- 用 $p(s'\mid s,a)$ 这样**只含当前状态**的函数描述世界；
- 让 policy 只依赖当前状态 $\pi(a\mid s)$；
- 把长期价值拆成“一步 + 下一状态的价值”。

它也给“状态”提出了要求：**状态必须概括所有与未来有关的历史**。如果某些重要信息没写进状态（例如机器人不知道自己朝向哪），就要把它加进状态，否则 Markov 性质不成立。
`,
    intuition: R`
下棋时，当前局面就是状态：怎么走到这一步的不重要，未来只取决于现在的局面和你下一步怎么走。（严格说，“局面”不只是棋子的位置，还要包括轮到谁走、以及会影响合法走法和胜负判定的规则信息，例如国际象棋的王车易位权；把这些都放进状态里，Markov 性质才成立。）

在 Gridworld 中，$S_t$ 是机器人的位置，$A_t$ 是它选的方向，$R_{t+1}$ 是移动后的奖励。无论机器人是直接走到 $s_6$ 还是绕了一大圈，从 $s_6$ 选 North 的结果分布都一样：0.8 到 $s_{10}$，0.1 原地（左滑撞墙），0.1 到 $s_7$。
`,
    math: R`
**符号约定**

- $t=0,1,2,\dots$：决策步的下标。
- **大写** $S_t, A_t, R_{t+1}$：随机变量（还没确定取值）。
- **小写** $s, a, r$：具体取值，例如 $S_t=s$。
- 奖励下标是 $t+1$：它是动作 $A_t$ **之后**才出现的。

**Markov property**

$$\Pr(S_{t+1},R_{t+1}\mid H_t,A_t)=\Pr(S_{t+1},R_{t+1}\mid S_t,A_t)$$

**一条 episode**：$S_0,A_0,R_1,S_1,A_1,R_2,\dots,R_T,S_T$。若共执行 3 次动作，最后的动作是 $A_2$、最后的奖励是 $R_3$、终止状态是 $S_3$；一般地最后的动作是 $A_{T-1}$，到达终止状态后没有 $A_T$。
`,
    formulas: [{
      title: 'Markov property',
      latex: R`\Pr(\htmlClass{fx-next}{S_{t+1},R_{t+1}}\mid \htmlClass{fx-hist}{H_t},\htmlClass{fx-act}{A_t})=\Pr(\htmlClass{fx-next}{S_{t+1},R_{t+1}}\mid \htmlClass{fx-cur}{S_t},\htmlClass{fx-act}{A_t})`,
      parts: [
        { key: 'next', label: '下一步的结果', color: 'green', text: '我们想预测的量：下一状态和随之而来的奖励（随机变量）。' },
        { key: 'hist', label: '完整历史 H_t', color: 'gray', text: '$H_t=(S_0,A_0,R_1,\\dots,R_t,S_t)$：选择 $A_t$ 前看到的一切。' },
        { key: 'cur', label: '当前状态 S_t', color: 'blue', text: '只用当前状态替换整段历史，结果分布不变——当前状态已经“记住了”所有相关的过去。' },
        { key: 'act', label: '当前动作 A_t', color: 'orange', text: '两边都需要当前动作：结果当然依赖你现在做什么。' }
      ]
    }],
    example: R`
**课件 MC 示例中的 Episode 1**（policy 固定，$\gamma=0.9$）：

| $t$ | $S_t$ | $A_t$ | $R_{t+1}$ | $S_{t+1}$ |
|---|---|---|---|---|
| 0 | $s_1$ | Up | 0 | $s_5$ |
| 1 | $s_5$ | Up | 0 | $s_8$ |
| 2 | $s_8$ | Right | 0 | $s_9$ |
| 3 | $s_9$ | Right | 0 | $s_{10}$ |
| 4 | $s_{10}$ | Right | **1** | $s_{11}$（终止） |

这里 $T=5$：最后的动作是 $A_4$，最后的奖励是 $R_5=1$，终止状态是 $S_5=s_{11}$。程序中常把每一行存成 (s, a, r, next_s)。

**Episode 2**：$s_1$ 选 Up 却右滑到 $s_2$ —— 同一个 policy 产生了不同的 trajectory。这就是为什么后面要对很多条 trajectory 求平均。
`,
    viz: { id: 'trajectory', guide: R`
**怎么用**：用四个方向按钮控制机器人，每一步都按真实的 0.8/0.1/0.1 抽样。观察：

- 记录区里的 $A_t$、$R_{t+1}$、$S_{t+1}$ 下标是怎样对齐的；
- history 的长度一直增长，但下方“下一步分布”只取决于当前格子；
- 进入终点后 episode 结束，没有下一个动作。` },
    compare: R`
| 概念 | 含义 | 例子 |
|---|---|---|
| Transition | 一步：$(S_t,A_t,R_{t+1},S_{t+1})$ | $(s_{10},\text{E},1,s_{11})$ |
| History $H_t$ | 截至 $t$ 看到的所有量 | $(s_1,\text{Up},0,s_5,\dots,s_{10})$ |
| Episode | 从开始到终止的整条序列（有限的 trajectory） | 上表全部五行 |
| State | 足以预测未来的“摘要” | 机器人位置 |
`,
    pitfalls: [
      { wrong: '$R_t$ 是在状态 $S_t$ 得到的奖励。', right: '课件用 $R_{t+1}$ 表示执行 $A_t$ **之后**得到的奖励，它和 $S_{t+1}$ 一起出现。' },
      { wrong: 'Markov 性质说过去没有影响。', right: '过去当然影响你现在在哪；Markov 性质说的是：**给定当前状态**，过去不再提供额外的预测信息。' },
      { wrong: '终止状态也要选一个动作。', right: '到达终止状态 $S_T$ 后 episode 结束，没有 $A_T$，也没有后续奖励；因此终止状态的价值定义为 0。' }
    ],
    quiz: [
      { kind: '轨迹推导', q: '一条 episode 共执行了 4 次动作才结束。最后的奖励和终止状态分别记为？', options: ['$R_4$，$S_4$', '$R_3$，$S_4$', '$R_5$，$S_5$', '$R_4$，$S_5$'], answer: 0,
        explain: '动作是 $A_0..A_3$，奖励是 $R_1..R_4$，状态是 $S_0..S_4$；$S_4$ 是终止状态。' },
      { kind: '概念判断', q: 'Markov property 的含义是？', options: ['未来与过去完全无关', '给定当前状态和动作，历史不再提供关于下一步的额外信息', '奖励只取决于动作', '状态转移是确定性的'], answer: 1, explain: 'Markov 性质是条件独立：$\\Pr(S_{t+1},R_{t+1}\\mid H_t,A_t)=\\Pr(S_{t+1},R_{t+1}\\mid S_t,A_t)$。' },
      { kind: '概念判断', q: '大写 $S_t$ 与小写 $s$ 的区别是？', options: ['没有区别', '$S_t$ 是随机变量，$s$ 是一个具体状态', '$S_t$ 是终止状态', '$s$ 是状态集合'], answer: 1, explain: '大写表示还没确定取值的随机变量，小写表示一次具体取值，例如 $S_t=s_6$。' },
      { kind: '轨迹推导', q: '在课件 Episode 3 中，机器人在 $s_{10}$ 选 Right 却到了 $s_6$。这是哪种滑动？', options: ['左滑（向北）', '右滑（向南）', '按预期移动', '撞墙'], answer: 1, explain: 'Right（East）的右侧是 South：从 $(2,2)$ 向南到 $(2,1)=s_6$。' }
    ],
    source: 'W6-1 slide 16（Markov property、符号、history）、slide 28（trajectory 分布）；W7 slides 26–32（episode 例子）；transcript L1。'
  },
  /* ------------------------------------------------------------------ c04 */
  {
    id: 'c04', part: 'p1', title: 'Policy：从 plan 到 policy', en: 'Policies: deterministic and stochastic',
    summary: '动作结果随机时，提前排好的一串动作会失效。MDP 的解是 **policy**：为每一个可能遇到的状态指定该做什么。',
    goals: ['解释为什么固定 plan 在 Gridworld 中失效', '区分 deterministic $\\pi(s)$ 与 stochastic $\\pi(a\\mid s)$', '区分 policy 的随机性与环境的随机性', '认识 stationary / time-dependent / history-dependent policy'],
    prereq: '第 2、3 章',
    what: R`
**Policy（策略）** 告诉智能体每次需要做决定时该做什么。课程主要使用 **stationary Markov policy**：只依赖当前状态，在每一步都用同一条规则。

- **Deterministic policy**：$\pi(s)=a$，每个状态选一个确定的动作。
- **Stochastic policy**：$\pi(a\mid s)=\Pr\{A_t=a\mid S_t=s\}$，给每个状态一个动作分布。

更一般的 policy 可以依赖时间步（$\pi_t(s)$、$\pi_t(a\mid s)$，time-dependent / non-stationary），或依赖整段历史（$\pi(a\mid H_t)$，history-dependent）。
`,
    why: R`
**课件例子**：在 Gridworld 中按经典规划思路得到 plan $\langle N,N,E,E,E\rangle$。第一步 North 可能：

- 0.8 向北移动；
- 0.1 右滑到 $s_2$；
- 0.1 左滑撞边界留在原地。

如果右滑到 $s_2=(1,0)$，下一步还选 North 就会撞上墙 $(1,1)$。剩下的动作序列是为“第一步成功后到达 $s_5$”准备的，与实际位置不符。

所以 MDP 需要**反馈**：每一步先看实际到了哪里，再决定下一步——这正是 policy。
`,
    intuition: R`
plan 像一张写死的路线单：“直走、直走、右转、右转、右转”。policy 像一张地图，每个路口都标着箭头：不管你被风吹到哪个路口，都能看到该往哪走。

**两种随机性要分开**：

- **Policy 的随机性** $\pi(a\mid s)$：智能体**怎么选**动作（例如 50% 向上、50% 向右）。
- **环境的随机性** $p(s'\mid s,a)$：动作**做完之后**发生什么（例如选了向上，却打滑到右边）。

即使 policy 是确定的，环境的随机性也会让每次运行得到不同的 trajectory。
`,
    math: R`
**Deterministic**：$\pi:S\to A$，$\ \pi(s)=a$。

**Stochastic**：$\pi(a\mid s)=\Pr\{A_t=a\mid S_t=s\}$，满足 $\sum_a \pi(a\mid s)=1$。

确定性 policy 是随机 policy 的特例：某个动作概率为 1。

**按 policy 行动产生 trajectory**：

$$A_t\sim\pi(\cdot\mid S_t),\qquad (S_{t+1},R_{t+1})\sim p(\cdot,\cdot\mid S_t,A_t)$$

**一条 trajectory 的概率**（episodic，长度 $T$）：

$$p_\pi(\tau)=p(s_0)\prod_{t=0}^{T-1}\pi(a_t\mid s_t)\,p(s_{t+1}\mid s_t,a_t)$$

两个乘积因子分别对应“智能体怎么选”和“环境怎么回应”。
`,
    formulas: [{
      title: '一条 trajectory 在 policy π 下的概率',
      latex: R`p_\pi(\tau)=\htmlClass{fx-init}{p(s_0)}\prod_{t=0}^{T-1}\htmlClass{fx-pi}{\pi(a_t\mid s_t)}\,\htmlClass{fx-env}{p(s_{t+1}\mid s_t,a_t)}`,
      parts: [
        { key: 'init', label: '起点分布 p(s₀)', color: 'gray', text: '从哪个状态开始的概率。课程 Gridworld 固定从 $s_1$ 出发，所以 $p(s_1)=1$。' },
        { key: 'pi', label: 'policy 的选择概率', color: 'orange', text: '智能体在 $s_t$ 选 $a_t$ 的概率——**智能体的随机性**。确定性 policy 下这一项是 1 或 0。' },
        { key: 'env', label: '环境的转移概率', color: 'blue', text: '执行 $a_t$ 后到达 $s_{t+1}$ 的概率——**环境的随机性**，由 MDP 给定，智能体无法控制。' }
      ]
    }],
    example: R`
**计算一条 trajectory 的概率**：最优 policy 下从 $s_1$ 出发，沿 $s_1\to s_5\to s_8\to s_9\to s_{10}\to s_{11}$ 走（每一步都按预期移动）。

policy 是确定的，每步 $\pi(a_t\mid s_t)=1$；每步环境按预期移动的概率是 0.8：

$$p_\pi(\tau)=1\times(1\times0.8)^5=0.8^5\approx0.328$$

也就是说，最优 policy 下“一步都不打滑”的路线只占约 1/3。其余运行虽然会打滑，但 policy 会在新位置继续给出正确的动作。

**课件 π₀（用于 Policy Iteration）**：$s_8,s_9,s_{10}$ ↑，$s_5$ →，$s_6$ ↑，$s_1$ ←，$s_2$ ↓，$s_3$ ↓，$s_4$ →。它是一个合法的确定性 policy（每个非终止状态都有动作），只是很差。
`,
    viz: { id: 'planpolicy', guide: R`
**怎么用**：表格比较固定 plan ⟨N,N,E,E,E⟩ 与 policy 各跑 1000 次的结果。点任意格子会循环改变该格的动作：

- 把 $s_6$ 改成 →，看掉进 −1 的比例怎样上升；
- 把 $s_1$ 改成 ←，看平均步数增加（向左撞墙浪费时间）；
- 注意 plan 有相当一部分运行“没到终点”：动作用完了，机器人还停在路上。` },
    compare: R`
| | Plan | Deterministic policy | Stochastic policy |
|---|---|---|---|
| 形式 | $\langle a_0,a_1,\dots\rangle$ | $\pi(s)=a$ | $\pi(a\mid s)$ |
| 是否看当前状态 | 否 | 是 | 是 |
| 适用 | 确定性世界 | 本课 classical MDP 足够（存在最优确定性 policy，见第 6 章） | 探索、多智能体博弈、部分可观测（W10） |
`,
    pitfalls: [
      { wrong: '确定性 policy 每次运行都得到相同的 trajectory。', right: '环境是随机的：即使动作固定，结果也会因打滑而不同。' },
      { wrong: 'policy 只需要给“会经过的路线”上的状态指定动作。', right: 'policy 要为**每个可能遇到的状态**指定动作，因为打滑可能把你带到任何地方。' },
      { wrong: '$\\pi(a\\mid s)$ 和 $p(s\'\\mid s,a)$ 都是“随机”，所以可以合并成一个。', right: '一个是智能体的选择，一个是环境的反应。学习算法只能改变前者。' }
    ],
    quiz: [
      { ctx: 'grid', kind: '概念判断', q: '为什么 plan ⟨N,N,E,E,E⟩ 在 Gridworld 中不是一个可靠的解？', options: ['因为 North 不是合法动作', '因为打滑后实际位置与 plan 假设的位置不同，后续动作不再合适', '因为 plan 太短', '因为 Gridworld 没有目标'], answer: 1, explain: '例如第一步右滑到 $s_2$，第二步 North 会撞墙。MDP 的解必须根据实际状态决定动作。' },
      { kind: '公式计算', q: '确定性 policy、每步按预期移动的概率 0.8。一条“连续 3 步都不打滑”的轨迹片段概率是多少？', answer: 0.512, tol: 0.001, explain: '$\\pi=1$ 每步，环境 $0.8$ 每步：$0.8^3=0.512$。' },
      { kind: '概念判断', q: '下列哪项是**环境**的随机性？', options: ['$\\pi(\\text{Up}\\mid s_1)=0.5$', '选了 Up 却以 0.1 的概率滑到右边', 'ε-greedy（大部分时候选当前最好的动作，以 ε 的概率随机选）', 'softmax（按偏好大小给每个动作一个概率再抽样）'], answer: 1, explain: '打滑由 $p(s\'\\mid s,a)$ 决定，属于环境；其余三项都是智能体选择动作的方式。' },
      { kind: '概念判断', q: '$\\pi_t(a\\mid s)$ 依赖时间步 $t$，这种 policy 称为？', options: ['Stationary', 'Time-dependent / non-stationary', 'History-dependent', 'Deterministic'], answer: 1, explain: '规则随时间步变化的 policy 是 non-stationary；依赖 $H_t$ 的才是 history-dependent。' }
    ],
    source: 'W6-1 slide 17（固定 plan 失效 → policy）、slide 27（policy 类型、两种随机性）、slide 28（trajectory 分布）；W6-2 slide 4（$p_\\pi(\\tau)$）、slide 34（π₀）。'
  },
  /* ------------------------------------------------------------------ c05 */
  {
    id: 'c05', part: 'p1', title: 'Return 与折扣因子 γ', en: 'Return and the discount factor',
    summary: '奖励是一步的反馈；**return** 把一条 trajectory 之后的所有奖励折扣后加起来，用来给这条 trajectory 打分。',
    goals: ['写出 episodic 和 continuing 两种 return', '解释 γ 的作用和 γ=0、γ→1 的极端情况', '会从后往前递推 $G_t=R_{t+1}+\\gamma G_{t+1}$'],
    prereq: '第 3、4 章',
    what: R`
**Return（回报）** $G_t$：从时刻 $t$ 之后实际得到的所有奖励的折扣和。

$$G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+\cdots=\sum_{k=0}^{\infty}\gamma^kR_{t+k+1}$$

- **Episodic**（有终止状态，在 $T$ 结束）：$G_t=R_{t+1}+\gamma R_{t+2}+\cdots+\gamma^{T-t-1}R_T$。
- **Continuing**（没有终止，永远运行）：无穷级数，$\gamma<1$ 且奖励有界时它收敛。

return 是**一条具体 trajectory** 的分数：它是“实现了的”（realised）。
`,
    why: R`
policy 会产生很多步交互，我们需要一个数来比较“哪条 trajectory 更好”。直接把奖励加起来有两个问题：

1. **不区分早晚**。课件问：$s_9$ 和 $s_{10}$ 都能到达 $+1$，哪个更好？直觉上 $s_{10}$ 更近、更早拿到奖励，应该更好。不折扣时两者都算 1，看不出区别。
2. **continuing 任务会发散**。无限步的奖励和可能是无穷大。

折扣因子 $\gamma\in[0,1)$ 同时解决这两个问题：越远的奖励乘以越多个 $\gamma$，价值越小；并且级数收敛（若每步奖励都是 1，和为 $1/(1-\gamma)$）。
`,
    intuition: R`
$\gamma$ 可以理解为“明天的 1 块钱今天值多少”。$\gamma=0.9$：一步之后的奖励打 9 折，两步之后打 81 折。

- $\gamma=0$：只看眼前，完全短视（$G_t=R_{t+1}$）。
- $\gamma$ 接近 1：非常有远见，远处的奖励几乎和眼前一样重要。

在 Gridworld 中，所有非终点奖励都是 0，只有最后一步有 $\pm1$。于是 return 就是 $\pm\gamma^{(\text{剩余步数}-1)}$：**越早到达 $+1$，return 越大**。
`,
    math: R`
**递推形式**（从后往前算最方便，MC 算法就是这样做的）：

$$G_t=R_{t+1}+\gamma G_{t+1},\qquad G_T=0$$

**比较 policy**：同一个 policy 会产生不同 trajectory（环境随机），所以用**期望 return** 比较：

$$J_\pi=\mathbb{E}_\pi[G_0]=\sum_\tau p_\pi(\tau)\,G_0(\tau)$$

下一章把“从某个状态出发的期望 return”定义为 value。
`,
    formulas: [{
      title: 'Discounted return',
      latex: R`\htmlClass{fx-g}{G_t}=\htmlClass{fx-r1}{R_{t+1}}+\htmlClass{fx-gam}{\gamma}\,R_{t+2}+\htmlClass{fx-gam}{\gamma^2}R_{t+3}+\cdots=\htmlClass{fx-sum}{\sum_{k=0}^{\infty}\gamma^kR_{t+k+1}}`,
      parts: [
        { key: 'g', label: 'Return G_t', color: 'blue', text: '从时刻 $t$ 往后看的总分。它属于一条**具体的** trajectory，是一个实现了的数字。' },
        { key: 'r1', label: '即时奖励 R_{t+1}', color: 'green', text: '执行 $A_t$ 后马上得到的奖励，系数是 $\\gamma^0=1$，不打折。' },
        { key: 'gam', label: '折扣 γ^k', color: 'purple', text: '$k$ 步之后的奖励乘以 $\\gamma^k$。$\\gamma=0.9$ 时：1, 0.9, 0.81, 0.729, 0.6561, …' },
        { key: 'sum', label: '求和形式', color: 'orange', text: '$k$ 从 0 开始，第 $k$ 项是 $\\gamma^kR_{t+k+1}$。episodic 任务在 $T$ 截断：$k$ 最大到 $T-t-1$。' }
      ]
    }, {
      title: '从后往前递推',
      latex: R`\htmlClass{fx-g}{G_t}=\htmlClass{fx-r}{R_{t+1}}+\htmlClass{fx-gam}{\gamma}\,\htmlClass{fx-next}{G_{t+1}}`,
      parts: [
        { key: 'r', label: '这一步的奖励', color: 'green', text: '执行 $A_t$ 后的奖励。' },
        { key: 'gam', label: '折扣一次', color: 'purple', text: '下一时刻之后的全部回报整体乘一个 $\\gamma$。' },
        { key: 'next', label: '下一时刻的 return', color: 'teal', text: '已经从后面算好的 $G_{t+1}$。终止时 $G_T=0$，所以最后一步 $G_{T-1}=R_T$。' },
        { key: 'g', label: '当前 return', color: 'blue', text: '一次加法和一次乘法就得到，不必重新把整串奖励加一遍。' }
      ]
    }],
    example: R`
**课件 Episode 1**：奖励序列 $R_1..R_5=(0,0,0,0,1)$，$\gamma=0.9$。从后往前：

| $t$ | 状态 | $R_{t+1}$ | $G_t=R_{t+1}+0.9\,G_{t+1}$ |
|---|---|---|---|
| 4 | $s_{10}$ | 1 | $1+0.9\times0=1$ |
| 3 | $s_9$ | 0 | $0+0.9\times1=0.9$ |
| 2 | $s_8$ | 0 | $0.9\times0.9=0.81$ |
| 1 | $s_5$ | 0 | $0.9\times0.81=0.729$ |
| 0 | $s_1$ | 0 | $0.9\times0.729=0.6561$ |

**课件 Episode 3**：$(0,0,0,0,0,-1)$，掉进 $-1$。$G_0=0.9^5\times(-1)=-0.59049\approx-0.5905$。

同一个 policy、同一个起点，两条 trajectory 的 return 一正一负——这就是为什么要用期望来评价 policy。
`,
    viz: { id: 'returncalc', guide: R`
**怎么用**：

1. 选“课件 Episode 1”，把 $t$ 从 0 拖到 4，看 $G_t$ 依次是 0.6561、0.729、0.81、0.9、1。
2. 把 γ 拖到 0：只剩第一项；拖到 0.99：远处奖励几乎不打折。
3. 选“每步 −0.04”：这种设定会让智能体更急于结束（每多走一步都有代价）。` },
    compare: R`
课件的一句话：**Reward is immediate; return is realised; value is expected.**

| 量 | 时间范围 | 随机吗 | 例子 |
|---|---|---|---|
| Reward $R_{t+1}$ | 一步 | 是（一次观察） | 进入 $s_{11}$ 得 1 |
| Return $G_t$ | 从 $t$ 到结束 | 是（取决于这条 trajectory） | Episode 1 的 $G_0=0.6561$ |
| Value $v_\pi(s)$ | 从 $s$ 到结束，求期望 | 否（是一个确定的函数值） | 最优 policy 下 $v(s_1)\approx0.5452$ |
`,
    pitfalls: [
      { wrong: 'return 就是即时奖励。', right: 'return 是从 $t$ 起**所有**未来奖励的折扣和；即时奖励只是其中第一项。' },
      { wrong: '第一个奖励也要乘 γ。', right: '第一项 $R_{t+1}$ 的系数是 $\\gamma^0=1$；第 $k$ 项（$k$ 从 0 数）乘 $\\gamma^k$。' },
      { wrong: '只要某条 trajectory 的 return 很高，这个 policy 就好。', right: '一条幸运的 trajectory 不是证据。比较 policy 要看**期望** return（下一章的 value）。' },
      { wrong: 'γ 越大越好。', right: 'γ 是问题定义的一部分，表达“多重视未来”。课程 Gridworld 规定 γ=0.9；改变 γ 会改变最优 policy 和所有价值。' }
    ],
    quiz: [
      { kind: '公式计算', q: '奖励序列 $R_1,R_2,R_3=(0,0,1)$，$\\gamma=0.9$。$G_0$ 是多少？', answer: 0.81, tol: 0.001, explain: '$G_0=0+0.9\\times0+0.9^2\\times1=0.81$。' },
      { kind: '公式计算', q: '奖励序列 $(1,-1,0,0)$，$\\gamma=0.5$。$G_0$ 是多少？', answer: 0.5, tol: 0.001, explain: '$1+0.5\\times(-1)=0.5$。' },
      { kind: '公式计算', q: 'continuing 任务，每步奖励恒为 1，$\\gamma=0.9$。$G_0$ 是多少？', answer: 10, tol: 0.01, explain: '几何级数 $1+0.9+0.81+\\dots=1/(1-0.9)=10$。' },
      { kind: '轨迹推导', q: '已知 $G_3=0.9$、$R_3=0$、$\\gamma=0.9$。用递推求 $G_2$。', answer: 0.81, tol: 0.001, explain: '$G_2=R_3+\\gamma G_3=0+0.9\\times0.9=0.81$（注意 $G_2$ 用的是 $R_3$）。' },
      { kind: '概念判断', q: '$\\gamma=0$ 时智能体会怎样？', options: ['只关心即时奖励', '把所有未来奖励看得一样重要', 'return 发散', '永远选最远的目标'], answer: 0, explain: '$G_t=R_{t+1}$，完全短视。' }
    ],
    source: 'W6-1 slide 29（discounted return、三个量的区别）；W6-2 slides 4、9（episodic/continuing return、$J_\\pi$、$s_9$ vs $s_{10}$ 引出 γ）；W7 slides 27–32（Episode 1/3 的 G 值）。'
  },
  /* ------------------------------------------------------------------ c06 */
  {
    id: 'c06', part: 'p1', title: 'Value：期望回报与最优 policy', en: 'State value, action value and optimality',
    summary: 'State value $v_\\pi(s)$ 是从 $s$ 出发、按 $\\pi$ 行动的**期望** return；action value $q_\\pi(s,a)$ 先做 $a$ 再按 $\\pi$。最优 policy 在每个状态都让 value 最大，并且一定存在确定性的最优 policy。',
    goals: ['写出 $v_\\pi(s)$ 和 $q_\\pi(s,a)$ 的定义并区分', '理解 reward / return / value 三个层级', '说出有限折扣 MDP 最优确定性 policy 存在定理的条件', '记住 V/v、Q/q、π、* 的符号约定'],
    prereq: '第 5 章',
    what: R`
**状态价值函数（State Value Function）**：从状态 $s$ 出发、之后一直按 policy $\pi$ 行动，能得到的期望 return

$$v_\pi(s)=\mathbb{E}_\pi[G_t\mid S_t=s]$$

**动作价值函数（Action Value Function）**：在 $s$ 先执行动作 $a$（不管 $\pi$ 会不会选它），之后再按 $\pi$ 行动的期望 return

$$q_\pi(s,a)=\mathbb{E}_\pi[G_t\mid S_t=s,A_t=a]$$

**最优（optimal）**：policy $\pi^*$ 是最优的，如果对**每个**状态 $s$ 都有

$$v_{\pi^*}(s)=v_*(s)=\max_\pi v_\pi(s)$$
`,
    why: R`
一条 trajectory 的 return 是随机的（同一个 policy 跑两次，可能一次到 +1、一次掉进 −1），不能用来公平比较 policy。value 把随机性“平均掉”，给每个状态一个确定的分数，于是可以说“policy A 在每个状态都不比 B 差”。

为什么还需要 Q？课件的例子：比较“在 $s_9$ 向右走”（A）和“在 $s_{10}$ 向下走”（B）。$s_{10}$ 本身比 $s_9$ 好，但 A 更好——它可能到达 $s_{10}$，而 B 可能掉进 $s_7$。**只看状态价值无法比较动作**，所以需要 $Q(s,a)$。有了 Q，挑动作只要取最大的那个。
`,
    intuition: R`
- $v_\pi(s)$：“如果我现在在 $s$，并且以后都按 $\pi$ 走，平均能拿多少分？”
- $q_\pi(s,a)$：“如果我现在在 $s$，**这一步先做 $a$**，之后按 $\pi$ 走，平均能拿多少分？”

两者的关系很直接：$v_\pi(s)$ 是按 $\pi$ 的动作概率对 $q_\pi(s,a)$ 求平均（第 7 章会正式写出）。如果 $\pi$ 在 $s$ 确定地选 $a$，那么 $v_\pi(s)=q_\pi(s,\pi(s))$。

**为什么 MDP 常常不给初始状态？** 若只关心从 $s_1$ 出发，那么只需要从 $s_1$ 能到达的状态上 policy 是对的，别处随便——求出的 policy 可能只是“部分”最优（partially optimal），不保证在其他到不了的状态上也最优。MDP 通常要求的是**对每个状态都最优**的 policy，所以定义里不写初始状态。
`,
    math: R`
**符号约定（W6-2 slide 11）**

| 记号 | 含义 |
|---|---|
| $V$, $Q$ | 算法中的近似值/估计值（大写） |
| $V^\pi$, $Q^\pi$ | 针对 policy $\pi$ 的估计 |
| $v$, $q$ | 按定义的真实值（小写） |
| $v_\pi$, $q_\pi$ | policy $\pi$ 的真实价值 |
| $v_*$, $q_*$ | 最优 policy 的价值（$*$ 表示最优） |
| $G_t$ | 从 $t$ 到结束的实际 return |

**最优确定性 policy 存在定理（finite discounted MDP）**：若状态集和动作集有限、奖励有界、转移规律不随时间变化（stationary dynamics）、$0\le\gamma<1$，则存在一个**最优的 stationary deterministic Markov policy**：

- deterministic：每个状态一个动作；
- stationary：每个时间步用同一条规则；
- Markov：只依赖当前状态。

注意“存在”：最优 policy 不一定唯一；有限 horizon 时最优 policy 可能依赖时间；有约束、风险敏感、部分可观测或多智能体时可能需要随机化（第 26 章的例子）。
`,
    formulas: [{
      title: 'State value 与 action value',
      latex: R`\htmlClass{fx-v}{v_\pi(s)}=\htmlClass{fx-e}{\mathbb{E}_\pi}[\htmlClass{fx-g}{G_t}\mid \htmlClass{fx-cond}{S_t=s}],\qquad \htmlClass{fx-q}{q_\pi(s,a)}=\htmlClass{fx-e}{\mathbb{E}_\pi}[\htmlClass{fx-g}{G_t}\mid \htmlClass{fx-cond}{S_t=s},\htmlClass{fx-a}{A_t=a}]`,
      parts: [
        { key: 'v', label: '状态价值 v_π(s)', color: 'blue', text: '一个状态的分数：从 $s$ 开始按 $\\pi$ 走的平均 return。' },
        { key: 'e', label: '期望 E_π', color: 'purple', text: '对所有可能的 trajectory 按它们在 $\\pi$ 和环境下出现的概率加权平均。下标 $\\pi$ 表示“之后的动作由 $\\pi$ 选”。' },
        { key: 'g', label: 'Return G_t', color: 'green', text: '被平均的对象：一条 trajectory 从 $t$ 开始的折扣回报。' },
        { key: 'cond', label: '条件：从 s 出发', color: 'gray', text: '只考虑在时刻 $t$ 位于 $s$ 的那些 trajectory。' },
        { key: 'a', label: '额外条件：第一步做 a', color: 'orange', text: '$q_\\pi$ 多了这个条件：第一步动作固定为 $a$，从第二步起才按 $\\pi$。' },
        { key: 'q', label: '动作价值 q_π(s,a)', color: 'teal', text: '状态—动作对的分数，可以直接用来比较同一状态下的不同动作。' }
      ]
    }],
    example: R`
**最优价值（$\gamma=0.9$，第 10 章用 Value Iteration 算出，课件 PI 例子也得到同样的数）**

| | 列 0 | 列 1 | 列 2 | 列 3 |
|---|---|---|---|---|
| 顶行 | $s_8$: 0.7166 | $s_9$: 0.8271 | $s_{10}$: 0.9420 | $s_{11}$: +1（终止，V=0） |
| 中行 | $s_5$: 0.6292 | 墙 | $s_6$: 0.6354 | $s_7$: −1（终止，V=0） |
| 底行 | $s_1$: 0.5452 | $s_2$: 0.4787 | $s_3$: 0.5283 | $s_4$: 0.3081 |

读表：

- $v_*(s_{10})=0.942>v_*(s_9)=0.827$：离 $+1$ 更近。
- $v_*(s_6)=0.635<v_*(s_{10})$：$s_6$ 有掉进 $-1$ 的风险。
- 终止状态价值为 0：进入终点的奖励已经算在“进入那一步”的 $r$ 里了。

**Q 值例子**：在 $s_1$ 的四个最优动作价值 $q_*(s_1,\cdot)$：Up 0.5452，Left 0.4982，Down 0.4847，Right 0.4504。最大的是 Up，所以 $\pi^*(s_1)=\text{Up}$，并且 $v_*(s_1)=\max_a q_*(s_1,a)=0.5452$。
`,
    viz: { id: 'valuedist', guide: R`
**怎么用**：格子里的数字是精确的 $v_\pi(s)$。点“采样 100 条”，直方图显示单条 return 的分布：大多数接近 $+0.5\sim+0.7$，少数是负数（掉进 −1）。

- 蓝色虚线是 $v_\pi(s)$，橙线是样本平均。采样越多，橙线越接近蓝线。
- 换成课件 π₀：大部分 return 变成负数或很小——这个 policy 很差。
- 这正是 **Monte Carlo**（第 15 章）的思想：没有模型时，用样本平均估计 value。` },
    compare: R`
| | $v_\pi(s)$ | $q_\pi(s,a)$ |
|---|---|---|
| 输入 | 状态 | 状态 + 动作 |
| 第一步动作 | 由 $\pi$ 选 | 固定为 $a$ |
| 用途 | 评价状态、比较 policy | 比较动作、直接导出贪心 policy |
| 关系 | $v_\pi(s)=\sum_a\pi(a\mid s)q_\pi(s,a)$ | $q_\pi(s,a)=\sum_{s'}p(s'\mid s,a)[r+\gamma v_\pi(s')]$ |

| | Policy $\pi$ | Value $v_\pi$, $q_\pi$ |
|---|---|---|
| 作用 | **决定**做什么 | **评价**有多好 |
| 输出 | 动作（或动作分布） | 数字 |
`,
    pitfalls: [
      { wrong: 'value 就是 return。', right: 'return 是一条 trajectory 的实际分数（随机）；value 是 return 的**期望**（确定的函数值）。' },
      { wrong: '$q_\\pi(s,a)$ 只对 $\\pi$ 会选的动作有定义。', right: '对任何动作都有定义：第一步强制做 $a$，之后才按 $\\pi$。这正是能用 Q 比较“如果换个动作会怎样”的原因。' },
      { wrong: '终止状态 $s_{11}$ 的价值是 1。', right: '终止状态价值为 0。$+1$ 是**进入** $s_{11}$ 那一步的奖励，已经计入前一个状态的 value 中。' },
      { wrong: '最优 policy 是唯一的，而且必须是随机的才能最优。', right: '定理只说**存在**一个确定性的最优 policy，不保证唯一（例如两个动作 Q 值相同）。classical MDP 不需要随机化。' },
      { wrong: 'V 和 v 是同一个东西。', right: '课件约定：大写 $V,Q$ 是算法中的估计，小写 $v,q$ 是定义上的真实值。' }
    ],
    quiz: [
      { kind: '概念判断', q: '“Reward is immediate; return is realised; value is ___.”', options: ['maximised', 'expected', 'discounted', 'deterministic'], answer: 1, explain: 'value 是 return 的期望。' },
      { kind: '概念判断', q: '课件比较：A＝在 $s_9$ 向右；B＝在 $s_{10}$ 向下。为什么说只有 $V(s)$ 不够？', options: ['因为 $V(s_9)>V(s_{10})$', '因为同一状态下不同动作的好坏不同，需要 $Q(s,a)$', '因为 γ 太小', '因为 $s_{10}$ 是终止状态'], answer: 1, explain: '$s_{10}$ 比 $s_9$ 好，但“在 $s_{10}$ 向下”可能掉进 $s_7$，而“在 $s_9$ 向右”会接近目标。要比较动作，需要动作价值。' },
      { kind: '公式计算', q: '某状态 $q_\\pi(s,\\cdot)$ = (Up 0.6, Right 0.2, Down 0.1, Left 0.1)，policy 以 0.5 选 Up、0.5 选 Right。$v_\\pi(s)$ 是多少？', answer: 0.4, tol: 0.001, explain: '$v_\\pi(s)=\\sum_a\\pi(a\\mid s)q_\\pi(s,a)=0.5\\times0.6+0.5\\times0.2=0.4$。' },
      { kind: '概念判断', q: '最优确定性 policy 存在定理**不**需要哪个条件？', options: ['状态、动作有限', '$0\\le\\gamma<1$', '最优 policy 唯一', '奖励有界、转移规律平稳'], answer: 2, explain: '定理只保证存在，不保证唯一。' },
      { kind: '概念判断', q: '为什么 MDP 通常不指定初始状态？', options: ['因为初始状态总是 $s_1$', '因为指定初始状态后求出的 policy 可能只在可达区域最优（partially optimal），而我们想要每个状态都最优的 policy', '因为 Bellman 方程不允许', '因为终止状态没有价值'], answer: 1, explain: '课件 W6-2 slide 6 与 transcript 的解释：给定起点后，到不了的状态上的动作无所谓。' }
    ],
    source: 'W6-1 slides 29–30（value、最优、存在定理）；W6-2 slides 6、8–11（目标、为何不给初始状态、V/Q 直觉、符号约定）、37–38（V^π₁ = V* 数值）；transcript L2。'
  }
  ]);
})(window);
