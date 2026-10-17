/* Part 0 · W1–W5 classical planning (final-exam review; written more compactly than the RL part).
 * Chapter ids a01–a11 are shown as P1–P11 so that the RL chapters keep their 1–38 numbering. */
(function (root) {
  'use strict';
  const R = String.raw;

  root.RL.content.add([
  /* ------------------------------------------------------------------ a01 */
  {
    id: 'a01', num: 'P1', part: 'q1', title: '规划是什么：模型与求解器', en: 'Autonomous behaviour, state models, planners',
    summary: '自主行为的核心是 **control problem**：下一步做什么。三条路线：手写规则（programming-based）、从经验学（learning-based）、写出问题模型让求解器自动算（model-based，也就是 AI planning）。经典规划模型假设状态有限离散、初始状态已知、转移确定、可完全观测，解是一个动作序列；放宽这些假设得到 conformant planning、MDP、POMDP。',
    goals: ['说出三种控制方法及各自的优缺点', '写出经典规划状态模型的六个组成部分，以及“解”和“最优解”', '区分 classical / conformant / MDP / POMDP：初始状态、转移、观测、解的形式', '说出 rational agent 的含义（不是全知）'],
    prereq: '无',
    what: R`
**Control problem**：agent 要决定下一步做什么。三种做法（W1-2 p.6–10）：

| 方法 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| Programming-based | 程序员手写控制规则（“没危险就跑，大马里奥遇到敌人就跳”） | 领域知识容易表达 | 处理不了程序员没预料到的情况 |
| Learning-based | 从经验或模拟中学控制器（RL、监督学习、进化方法） | 原则上不需要太多知识 | 实际上难以知道该学哪些特征，而且慢 |
| Model-based | 人写出问题模型（动作、初始状态、目标、传感器），**求解器自动算出控制器** | 通用、开发快（几十行描述 vs 几千行代码）、灵活、清晰 | 需要模型；计算上可能 intractable；没有领域知识时效率不如专用程序 |

Model-based 方法在 AI 里就叫 **planning**：Model ⟹ Planner ⟹ Controller。目标是“写一个程序，能有效地解一大类问题”（General Problem Solving，GPS 始于 1959）。

**经典规划的状态模型**（W1-2 p.14）：
- 有限、离散的状态空间 $S$；
- 已知的初始状态 $s_0\in S$；
- 目标状态集合 $S_G\subseteq S$；
- 每个状态可用的动作 $A(s)\subseteq A$；
- **确定**的转移函数 $s'=f(a,s)$，$a\in A(s)$；
- 正的动作代价 $c(a,s)$。

**解**：一串可执行的动作，把 $s_0$ 带到 $S_G$ 里的某个状态；总代价最小的解是**最优解**（例如步数最少）。
`,
    why: R`
**放宽经典模型的假设，就得到别的模型**（W1-2 p.15–18）：

- **Conformant planning**：初始状态不确定（给出一个可能的初始状态集合），转移非确定 $F(a,s)\subseteq S$，没有观测反馈。解仍是动作序列，但必须**对每一种可能的初始状态和转移结果**都能达到目标。验证一个计划是不是 conformant，最坏情况下就是 intractable 的。
- **MDP**：完全可观测，转移有概率 $P_a(s'\mid s)$，代价为正。解是 **policy**（状态 → 动作），最优 policy 最小化到达目标的期望代价。
- **POMDP**：部分可观测，有传感器模型 $P_a(o\mid s)$；agent 只能维护 **belief state**（状态上的概率分布）。解是从 belief 到动作的 policy。

课件的例子：agent 在已知地图上一格一格走到 G。动作确定、初始位置已知 → classical；动作随机、位置可观测 → MDP；动作随机、位置部分可观测 → POMDP。
`,
    intuition: R`
**Rational agent**（W1-1）：通过传感器感知环境、通过执行器作用于环境，并且**尽力**做“正确的事”——在已有的感知和知识下，最大化期望表现。它不是全知的（omniscient）：过马路前看了路况、却被陨石砸中，并不说明不理性。

AI 的四种定位：像人一样思考（认知科学）、理性地思考（逻辑推理）、像人一样行动（图灵测试）、**理性地行动**（做出好的动作选择）。这门课属于最后一种：给定模型，自动算出好的行动方案。

**“通用”的代价**：同一个规划器能解 FreeCell、Blocksworld、物流……但没有任何国际象棋知识的通用规划器，打不过专门写的国际象棋程序。课程的核心问题就是：**怎样让完全自动的通用算法也足够高效**——答案是搜索 + 自动生成的启发式（W2–W5）。
`,
    math: R`
**经典规划的解**：动作序列 $\pi=\langle a_1,\dots,a_n\rangle$，满足 $a_i\in A(s_{i-1})$、$s_i=f(a_i,s_{i-1})$、$s_n\in S_G$；代价 $c(\pi)=\sum_i c(a_i,s_{i-1})$。

**四种模型对比**

| 模型 | 初始状态 | 转移 | 观测 | 解的形式 | 最优标准 |
|---|---|---|---|---|---|
| Classical | 一个已知 $s_0$ | 确定 $f(a,s)$ | 完全 | 动作序列 | 总代价最小 |
| Conformant | 可能的集合 $S_0$ | 非确定 $F(a,s)$ | 无反馈 | 动作序列（对所有情况都成功） | — |
| MDP | $s_0$ | 概率 $P_a(s'\mid s)$ | 完全 | policy：状态 → 动作 | 期望代价最小 |
| POMDP | 初始 belief $b_0$ | 概率 | 部分（$P_a(o\mid s)$） | policy：belief → 动作 | 期望代价最小 |

**Planner**：一类模型上的求解器，输入模型描述（用 STRIPS、PDDL 等语言写），输出对应的控制器。
`,
    formulas: [{
      title: '经典规划的解',
      latex: R`\htmlClass{fx-pi}{\pi=\langle a_1,\dots,a_n\rangle},\qquad \htmlClass{fx-app}{a_i\in A(s_{i-1})},\quad \htmlClass{fx-f}{s_i=f(a_i,s_{i-1})},\quad \htmlClass{fx-goal}{s_n\in S_G}`,
      parts: [
        { key: 'pi', label: 'plan：动作序列', color: 'blue', text: '经典规划的解是一串动作，不是 policy——因为转移确定、初始状态已知，执行时不需要看结果再决定。' },
        { key: 'app', label: '每一步都可执行', color: 'orange', text: '第 $i$ 个动作必须在前一个状态里可用。' },
        { key: 'f', label: '确定的转移', color: 'teal', text: '同一个状态做同一个动作，结果唯一。这是“classical”与 MDP 的关键区别。' },
        { key: 'goal', label: '最后到达目标', color: 'green', text: '只要求最后一个状态在目标集合里。最优解还要求 $\\sum c$ 最小。' }
      ]
    }],
    example: R`
**FreeCell 是一个经典搜索问题**（W1-2 p.12）：状态 = 所有牌的位置；动作 = 移动一张牌；初始状态 = 开局；目标 = 所有牌回到 home；解 = 一串移牌动作。

**同一张地图，三种模型**：agent 在格子地图上走到 G。
1. 每次移动一定成功、知道自己在哪 → classical：直接规划一条路线（动作序列）。
2. 移动可能滑到别的格子、但总能看到自己在哪 → MDP：需要 policy，“到了哪一格再决定往哪走”。
3. 移动会滑、而且只能通过有噪声的传感器猜自己的位置 → POMDP：policy 作用在 belief 上。
`,
    viz: { id: 'classify', guide: R`
**怎么用**：打开或关掉“确定性”“完全可观测”等假设，看问题变成哪一类模型。四个都打开就是经典规划；只关“确定性”得到 MDP；再关“完全可观测”得到 POMDP。交互里没有单独的 conformant 选项：关掉“确定性”“完全可观测”“已知结果分布”三项得到 POND（部分可观测、非确定、没有概率），conformant 是其中“完全没有观测”的极端情况。` },
    compare: R`
| | Programming-based | Learning-based | Model-based（planning） |
|---|---|---|---|
| 人提供什么 | 控制规则本身 | 奖励 / 示例 / 模拟器 | 问题模型（动作、初始、目标） |
| 控制器从哪来 | 手写 | 从经验学出来 | 求解器自动算出来 |
| 新情况 | 没预料到就失败 | 要重新学 | 改模型、重新求解 |
| 主要代价 | 人工 | 数据和训练时间 | 计算复杂度 |
`,
    pitfalls: [
      { wrong: '经典规划允许转移有随机性，只要概率已知。', right: '经典规划的转移是**确定的**。有概率的是 MDP；只有非确定（不给概率）、又没有观测的是 conformant。' },
      { wrong: 'Conformant planning 的解是 policy。', right: '没有观测反馈，执行时无法“看情况再决定”，所以解仍是动作序列，只是要对所有可能情况都成功。' },
      { wrong: 'Rational agent 总能做出事后看来最好的选择。', right: '理性是指在已有的感知和知识下最大化**期望**表现，不是全知。' },
      { wrong: 'Model-based 方法没有缺点，因为它最通用。', right: '课件列出的缺点：需要一个模型；计算上可能 intractable；没有领域知识时效率不如专用程序。' }
    ],
    quiz: [
      { kind: '概念判断', q: '经典规划模型（classical planning model）的转移函数是？', options: ['Probabilistic', 'Non-deterministic', 'Deterministic', '以上都可以'], answer: 2, explain: '经典规划：$s\'=f(a,s)$ 唯一确定。', ctx: false },
      { kind: '概念判断', q: '哪种状态模型加入了转移概率，但仍然完全可观测当前状态？', options: ['Classical', 'Conformant', 'MDP', 'POMDP'], answer: 2, explain: 'MDP：完全可观测 + 转移概率；POMDP 还去掉了完全可观测。', ctx: false },
      { kind: '概念判断', q: 'Conformant planning 的解是什么？', options: ['一个 policy', '一个对所有可能初始状态和转移结果都能达到目标的动作序列', '一个 belief state', '一个期望代价最小的 policy'], answer: 1, explain: '没有观测，只能事先定好动作序列，而且必须对每种可能情况都成功。', ctx: false },
      { kind: '概念判断', q: '课件列出的 model-based（planning）方法的缺点是？', options: ['不能表达领域知识', '需要一个模型，而且计算上可能 intractable', '必须有大量训练数据', '只能解一个问题'], answer: 1, explain: 'W1-2 p.11：Disadvantage: need a model; computationally intractable；没有领域知识时效率会下降。', ctx: false }
    ],
    source: 'W1-1（AI 的定义、rational agents、四种定位）；W1-2 p.2–20（控制问题的三种方法、general problem solving、经典 / conformant / MDP / POMDP 模型、例子、models–languages–solvers）。'
  },
  /* ------------------------------------------------------------------ a02 */
  {
    id: 'a02', num: 'P2', part: 'q1', title: 'STRIPS、PDDL 与复杂度', en: 'STRIPS, PDDL, PlanEx and PlanLen',
    summary: 'STRIPS 用布尔原子描述状态：问题是 $\\langle F,O,I,G\\rangle$，每个动作有前提 Pre、添加 Add、删除 Del 三个列表；执行动作得到 $s\'=(s\\setminus Del)\\cup Add$。PDDL 是事实上的标准语言，分 domain 文件（谓词、动作模式）和 problem 文件（对象、初始状态、目标），初始状态遵循 **closed-world assumption**。判断有没有计划（PlanEx）和有没有不超过某长度的计划（PlanLen）都是 PSPACE-complete。',
    goals: ['写出 STRIPS 四元组和动作的三个列表，并按语义一步步执行动作', '为一个小领域写出 STRIPS / PDDL 动作（前提、添加、删除）', '说出 domain 文件和 problem 文件各放什么，以及 closed-world assumption', '说出 PlanEx / PlanLen 的复杂度，以及 satisficing 与 optimal planning 的区别'],
    prereq: '第 P1 章',
    what: R`
**STRIPS 问题** $P=\langle F,O,I,G\rangle$（W1-2 p.21）：
- $F$：所有原子（boolean 变量）；
- $O$：所有 operators（动作）；
- $I\subseteq F$：初始状态；$G\subseteq F$：目标。

每个动作 $o\in O$ 有三个列表：**Pre**$(o)$（前提）、**Add**$(o)$（添加）、**Del**$(o)$（删除），都是 $F$ 的子集。

**语义**（STRIPS 问题决定的状态模型，W1-2 p.22）：
- 状态是原子的集合，$S=2^F$；初始状态 $s_0=I$；
- 目标状态：$G\subseteq s$；
- 可执行动作：$Pre(a)\subseteq s$；
- 下一状态：$s'=s-Del(a)+Add(a)$；所有动作代价为 1。

**PDDL**（W1-2 p.24–28）：1998 年为国际规划竞赛（IPC）提出的标准语言。表示是 **lifted** 的：用带变量的谓词和动作模式（action schema），再用有限个对象实例化。
- **domain 文件**：requirements、types、predicates、actions（parameters / precondition / effect）。
- **problem 文件**：objects、:init（初始状态）、:goal。
- **Closed-world assumption**：:init 里没写的事实一律为**假**；没有“未知”。需要检查某事实为假时，用 negative precondition，如 (not (on A B))。
`,
    why: R`
**怎样知道模型写对了？**（W1-2 p.29–38）
- 用 **VAL** 验证计划：它会指出哪一步、哪个前提没满足。课件的规则：LLM 给出的计划一定先跑 VAL——非符号的规划器可能给出“看起来合理”但违反前提的计划；符号规划器是 sound 的。
- 规划器找不到计划时的三种调试策略：**goal decomposition**（一次只放一个目标，找出最小的不可达目标子集）；**expected plan 上的二分**（把一个“走到一半”的事实或 landmark 设为目标，判断 bug 离初始状态近还是离目标近）；**逐个检查动作前提**（把某个前提设为目标，看它能否达到）。
- 两种解析器：FF parser 报错能指出行号和词；FD parser 更啰嗦，可作第二意见。

**规划有多难？**（W1-2 p.41–48）
- **Satisficing planning**：找一个计划（或报告无解）。**Optimal planning**：找最优计划。两类技术几乎不相交，satisficing 在实践中有效得多。
- **PlanEx**：是否存在计划；**PlanLen**：是否存在长度 ≤ $B$ 的计划。定理：**都是 PSPACE-complete**（Bylander 1994）。
- 具体领域里，PlanLen 往往更难：Blocksworld、Logistics 中 PlanLen 是 NP-complete，而 PlanEx 在 P 里。
- 状态空间随问题规模指数增长：Blocksworld 1 块 1 个状态，3 块 13 个，5 块 501 个，10 块 58,941,091 个。
`,
    intuition: R`
**STRIPS 动作 = 一张“改状态”的清单**：先检查 Pre 里的事实都为真，然后删掉 Del 里的、加上 Add 里的。

写动作时最容易错的是**漏写删除**。课堂例子：stack(x, y) 忘了删除 clear(y)，那么叠上 x 之后 y 仍然“是空的”，规划器就可能再往 y 上叠另一块——出现两个不同的块同时在 y 上的非法状态。

**为什么 STRIPS 对后面重要**：它把状态拆成原子、把动作写成前提 / 添加 / 删除，规划器就能从这个结构里**自动算出启发式**（W4–W5 的 relaxation：比如“忽略所有删除”）。
`,
    math: R`
**STRIPS 语义**：动作 $a$ 在 $s$ 中可执行当且仅当 $Pre(a)\subseteq s$；执行后
$$s'=(s\setminus Del(a))\cup Add(a).$$

**Blocksworld**（W1-2 p.23）：谓词 on(x, y)、ontable(x)、clear(x)、holding(x)、armEmpty()（本站写作 handempty）；动作 pickup(x)、putdown(x)、stack(x, y)、unstack(x, y)。

| 动作 | Pre | Add | Del |
|---|---|---|---|
| pickup(x) | clear(x), ontable(x), handempty | holding(x) | ontable(x), clear(x), handempty |
| putdown(x) | holding(x) | ontable(x), clear(x), handempty | holding(x) |
| stack(x, y) | holding(x), clear(y) | on(x, y), clear(x), handempty | holding(x), clear(y) |
| unstack(x, y) | on(x, y), clear(x), handempty | holding(x), clear(y) | on(x, y), clear(x), handempty |

**PDDL 动作**（对应 stack）：
:parameters (?x ?y)　:precondition (and (holding ?x) (clear ?y))　:effect (and (on ?x ?y) (clear ?x) (handempty) (not (holding ?x)) (not (clear ?y)))
`,
    formulas: [{
      title: 'STRIPS 的状态转移',
      latex: R`\htmlClass{fx-app}{Pre(a)\subseteq s}\ \Longrightarrow\ s'=\big(s\setminus \htmlClass{fx-del}{Del(a)}\big)\cup \htmlClass{fx-add}{Add(a)}`,
      parts: [
        { key: 'app', label: '可执行条件', color: 'orange', text: '前提里的每个原子都在当前状态里为真。' },
        { key: 'del', label: '删除列表', color: 'red', text: '执行后变假的原子。漏写删除会产生不合物理的状态（例如 stack 忘了删 clear(y)）。' },
        { key: 'add', label: '添加列表', color: 'green', text: '执行后变真的原子。W5 的删除松弛就是把 Del 整个去掉，只保留 Add。' }
      ]
    }],
    example: R`
**Sussman anomaly**（3 块）：初始 C 在 A 上，A、B 在桌上：$s_0=$ {on(C,A), ontable(A), ontable(B), clear(C), clear(B), handempty}；目标 {on(A,B), on(B,C)}。

逐步执行最优计划（6 步）：
1. unstack(C,A)：Pre {on(C,A), clear(C), handempty} ⊆ $s_0$ ✔。删 on(C,A)、clear(C)、handempty，加 holding(C)、clear(A)。
2. putdown(C)：删 holding(C)，加 ontable(C)、clear(C)、handempty。
3. pickup(B)：删 ontable(B)、clear(B)、handempty，加 holding(B)。
4. stack(B,C)：Pre {holding(B), clear(C)} ✔。删 holding(B)、clear(C)，加 on(B,C)、clear(B)、handempty。
5. pickup(A)：A 在桌上且 clear(A)（第 1 步加的）✔。
6. stack(A,B)：Pre {holding(A), clear(B)} ✔（第 4 步加的 clear(B)）。目标 on(A,B)、on(B,C) 都为真。

**Closed world**：$s_0$ 里没写 on(A,B)，所以它为假；目标里要求它为真，规划器就知道必须用动作把它加出来。

**建模题怎么写**（考试常见题型）：按五步写——
1. **谓词 / 状态变量**：用哪些原子描述状态（例如 robot-at(x)、connected(x, y)）；
2. **初始状态**：列出所有为真的原子（没列出的为假）；
3. **目标**：要求哪些原子为真（不必写出完整状态）；
4. **动作**：每个动作的参数、Pre、Add、Del。例：move(x, y)，Pre {robot-at(x), connected(x, y)}，Add {robot-at(y)}，Del {robot-at(x)}；
5. **转移与代价**：$s'=(s\setminus Del)\cup Add$，题目没给代价就默认每个动作代价 1。

写完逐个动作检查：Del 里有没有漏掉“执行后不再成立”的事实（漏删 clear(y) 那种错误），Pre 里有没有漏掉“执行前必须成立”的条件（例如 move 忘了 connected(x, y)，机器人就能瞬移）。
`,
    viz: { id: 'stripsplay', props: { preset: 'blocks', relaxed: false }, guide: R`
**怎么用**：选“Blocksworld 3 块”，按上面的 6 步依次点按钮，看每一步删掉和加上了哪些事实；按钮只列出当前 Pre ⊆ s 的动作。读数里的 h* 是从当前状态出发的最优计划长度。` },
    compare: R`
| | domain.pddl | problem.pddl |
|---|---|---|
| 内容 | requirements、types、predicates、actions | objects、:init、:goal |
| 一个领域有几个 | 一个 | 很多（不同对象、初始、目标） |
| 例子 | stack / unstack 的定义 | 有哪几块、谁在谁上面、目标叠法 |

| 问题 | 问什么 | 复杂度（一般情形） |
|---|---|---|
| PlanEx（satisficing） | 有没有计划 | PSPACE-complete |
| PlanLen（optimal） | 有没有长度 ≤ B 的计划 | PSPACE-complete（Blocksworld、Logistics 中为 NP-complete，而 PlanEx 在 P） |
`,
    pitfalls: [
      { wrong: 'STRIPS 元组里的 O 是 objects。', right: 'O 是 **operators**（动作）。对象是 PDDL problem 文件里的 :objects。' },
      { wrong: ':init 里没写的事实是“未知”。', right: 'Closed-world assumption：没写的一律为**假**。' },
      { wrong: '少写一个删除效果没关系，只是记账。', right: '会让不合法的状态变得可达，例如 stack(x, y) 不删 clear(y)，就可能出现两个块同时在 y 上。' },
      { wrong: 'PlanLen 一定比 PlanEx 难。', right: '一般情形两者都是 PSPACE-complete；只是在很多具体领域里 PlanLen（NP-complete）比 PlanEx（在 P 里）难。' }
    ],
    quiz: [
      { kind: '概念判断', q: 'STRIPS 四元组 $\\langle F,O,I,G\\rangle$ 中 O 代表？', options: ['Objects', 'Operators', 'Outcomes', 'Ontology'], answer: 1, explain: 'O = operators（动作）。', ctx: false },
      { kind: '概念判断', q: '哪个文件包含 :predicates 和 :action 的定义？', options: ['problem.pddl', 'domain.pddl', 'plan.pddl', 'session 文件'], answer: 1, explain: 'domain 文件写谓词和动作；problem 文件写对象、初始状态和目标。', ctx: false },
      { kind: '概念判断', q: 'Blocksworld 中 unstack(x, y) 的效果是？', options: ['+holding(x), +clear(y) / −on(x,y), −clear(x), −handempty', '+on(x,y), +clear(x) / −holding(x), −clear(y)', '+clear(x), +handempty / −holding(x), −on(x,y)', '+holding(x), +on(x,y) / −clear(y), −handempty'], answer: 0, explain: '拿起 x：手里有 x、y 变空；x 不再在 y 上、x 不再“可被放东西”（它在手里）、手不再空。', ctx: false },
      { kind: '概念判断', q: 'stack(x, y) 忘了删除 clear(y)，会出现什么非法行为？', options: ['没影响，clear(y) 只是记账', '可能出现两个不同的块同时在 y 上', 'stack 永远不能执行', '原来的正确计划会失败'], answer: 1, explain: 'clear(y) 一直为真，就可以继续往 y 上叠别的块。', ctx: false },
      { kind: '概念判断', q: '对一般 STRIPS 问题，判断是否存在计划（PlanEx）的复杂度是？', options: ['P', 'NP-complete', 'PSPACE-complete', '不可判定'], answer: 2, explain: 'Bylander 1994：PlanEx 和 PlanLen 都是 PSPACE-complete。', ctx: false }
    ],
    source: 'W1-2 p.21–48（STRIPS 与语义、Blocksworld、PDDL 历史 / 生命周期 / domain 与 problem 结构、closed-world assumption、VAL 与调试策略、satisficing vs optimal、PlanEx / PlanLen、PSPACE、Blocksworld 状态数）；课堂测验（unstack 效果、漏删 clear(y)）。'
  },
  /* ------------------------------------------------------------------ a03 */
  {
    id: 'a03', num: 'P3', part: 'q2', title: '搜索基础与盲目搜索', en: 'Search terminology, BrFS, DFS, uniform cost, iterative deepening',
    summary: '规划即在状态图上找路。盲目搜索（blind search）只用问题本身：**BrFS**（FIFO）完备、代价统一时最优，但时间和空间都是 $O(b^d)$；**DFS**（LIFO）空间只要 $O(bm)$，但不最优、一般不完备；**iterative deepening** 反复做深度受限的 DFS，结合两者的优点：完备、代价统一时最优、空间 $O(bd)$、时间 $O(b^d)$。代价不统一时要用 **uniform-cost search**（Dijkstra）。',
    goals: ['分清 search state / search node、open list / closed list、生成与展开', '用完备性、最优性、时间、空间四个标准比较 BrFS、DFS、IDS、uniform cost', '在一棵树或一张图上写出各算法的展开顺序', '算出 BrFS 与 IDS 生成的节点数（例如 b=10、d=5 时 111,110 vs 123,450）'],
    prereq: '第 P1 章',
    what: R`
**规划即找路**（W2 p.3）：状态模型对应一张有向图，节点是状态，边是转移，边的代价就是对应动作的代价；解就是从初始状态到目标的路径。

**分类**：
- **Blind vs heuristic**：盲目搜索只用问题本身；启发式搜索还用估计到目标距离的启发式函数 $h$。
- **Systematic vs local**：系统搜索同时维护大量节点；局部搜索一次只管一个（或几个）候选。

**术语**（W2 p.7–9）：
- **Search node** $\sigma$：状态 + 怎么到达它的信息：state、parent、action、$g(\sigma)$（从根到它的路径代价）。
- **Expansion（展开）**：对节点的状态执行所有可用动作、生成所有后继。
- **Open list（frontier）**：所有等待展开的节点。**Closed list（explored set）**：已经展开过的状态，只在 graph search 里用。
- **Progression**（从初始状态往前搜）vs **regression**（从目标往回搜）；课程默认 progression，此时 world state = search state。

**评价标准**：**完备性**（有解时一定找到）、**最优性**（找到的一定最优）、**时间复杂度**（生成的状态数）、**空间复杂度**（存储的状态数）。参数：最大分支因子 $b$、最浅目标深度 $d$、搜索到达的最大深度 $m$。
`,
    why: R`
**四种盲目搜索**（W2 p.13–21；课件留空的性质按讲课内容整理）：

| | BrFS | DFS | Iterative deepening | Uniform cost |
|---|---|---|---|---|
| 策略 | 先生成的先展开（FIFO） | 最新的先展开（LIFO） | 深度上限 $L=0,1,2,\dots$ 的 DFS | 按 $g$ 最小展开（优先队列） |
| 完备 | 是（$b$ 有限时） | 否（无限深的路径或不查环时会陷进去） | 是 | 是（代价为正） |
| 最优 | 代价统一时是 | 否 | 代价统一时是 | 是 |
| 时间 | $O(b^d)$ | $O(b^m)$ | $O(b^d)$ | — |
| 空间 | $O(b^d)$ | $O(bm)$ | $O(bd)$ | — |

- BrFS 若在**展开**时（而不是生成时）才做目标测试，时间变成 $O(b^{d+1})$。
- BrFS 的瓶颈是**内存**：课件的数据（$b=10$，每个节点 1000 字节），深度 10 要 3 小时，但要 10 TB 内存。（课件标题写“每秒 10,000 个节点”，但表中时间其实是按每秒 $10^6$ 个节点算的：110 个节点用 0.11 毫秒，$10^{10}$ 个节点约 $10^4$ 秒 ≈ 3 小时；若真是每秒 $10^4$ 个，深度 10 要约 11.6 天。内存 $10^{10}\times1000$ B = 10 TB 不受影响。）
- DFS 如果碰巧走对方向，长度 $l$ 的解只要 $O(bl)$ 时间；但即使深度 1 就有解，它也可能先钻进一条很深的路。
- IDS 被课件称为“大状态空间、解的深度未知时首选的盲目搜索”。
- 课堂测验（官方答案）：如果某个状态有**无限多个动作**，BrFS 不再完备——它要先把这一层无限多个后继生成完，永远到不了下一层；DFS 仍然完备（前提是后继一个一个生成，而且排在目标前面要先搜的那些子树都能在有限时间内搜完：它生成一个后继就往下走，搜完这棵子树再生成下一个。只要求深度有限还不够——如果某个先搜的子树里也有无限分支，DFS 会卡在那里）。
`,
    intuition: R`
**BrFS 一层一层扫，DFS 一条路走到黑，IDS 用“越来越长的绳子”做 DFS。**

IDS 看起来在重复劳动——每次加深都从头再来——但浪费很少：在分支因子为 $b$ 的树里，最底层的节点数比上面所有层加起来还多，所以重复展开上面几层的代价不大。课件的例子：$b=10$、$d=5$，BrFS 生成 111,110 个节点，IDS 生成 123,450 个，只多 11%，空间却从 $O(b^d)$ 降到 $O(bd)$。

IDS 在实践中很早就出名：1970 年代的国际象棋程序用它应付比赛的时间限制——时间到了就用最近一轮完整搜索的结果；1980 年代的魔方求解器也用过它的变体（课堂测验题）。

**代价不统一时 BrFS 不再最优**：它只保证步数最少，不保证代价最小。课堂测验：代价不统一时 BrFS、DFS、IDS 都不保证最优，要用 uniform cost（按 $g$ 排序）。
`,
    math: R`
**生成的节点数**（$b$ 分支、$d$ 深度，在生成时做目标测试）：
$$\text{BrFS: } b+b^2+\dots+b^d\in O(b^d),\qquad \text{IDS: } d\,b+(d-1)\,b^2+\dots+2\,b^{d-1}+1\,b^d\in O(b^d).$$
IDS 里第 $k$ 层的节点在上限为 $k,k+1,\dots,d$ 的每次搜索里各生成一次，共 $d-k+1$ 次。

**一次深度受限搜索（limit $L$）** = 拒绝走得比 $L$ 更深的 DFS。

**Uniform-cost search** 在 open list 里按 $g(\sigma)$ 排序，第一次展开到的目标就是最便宜的（代价为正时）。
`,
    formulas: [{
      title: 'BrFS 与 IDS 生成的节点数',
      latex: R`\htmlClass{fx-bfs}{\sum_{k=1}^{d}b^k}\quad\text{vs}\quad \htmlClass{fx-ids}{\sum_{k=1}^{d}(d-k+1)\,b^k}`,
      parts: [
        { key: 'bfs', label: 'BrFS：每层生成一次', color: 'blue', text: '$b=10,d=5$：$10+100+1000+10000+100000=111{,}110$。' },
        { key: 'ids', label: 'IDS：第 k 层生成 d−k+1 次', color: 'orange', text: '$b=10,d=5$：$50+400+3000+20000+100000=123{,}450$。最底层只生成一次，而它占了绝大部分节点，所以重复的代价很小。' }
      ]
    }],
    example: R`
**课件 W2 的树**：根 A，第二层 B C，第三层 D E F G，第四层 H…O（每个节点两个孩子，按字母序生成），目标设为 M。

| 算法 | 展开顺序 |
|---|---|
| BrFS | A B C D E F G H I J K L M |
| DFS（先展开字母序靠前的孩子） | A B D H I E J K C F L M |
| IDS | L=0：A；L=1：A B C；L=2：A B D E C F G；L=3：A B D H I E J K C F L M |

**代价不统一的图**（本站的练习图，S 到 G）：BrFS 先找到 S→A→D→G（3 步，代价 9）；uniform cost 找到 S→B→D→G（代价 6，最优）。BrFS 只看步数。
`,
    viz: { id: 'searchtrace', props: { preset: 'tree', algo: 'bfs' }, guide: R`
**怎么用**：
1. 默认是课件的树、BrFS。一步步点“下一步”，看 open 列表（FIFO）怎样变化，核对上表的展开顺序。
2. 切到 DFS、IDS 对比顺序；IDS 每一轮从根重新开始。
3. 换成“带代价的图”：BrFS 找到代价 9 的路线，Uniform cost 找到代价 6 的路线。` },
    compare: R`
| 想要 | 选 |
|---|---|
| 步数最少、内存够 | BrFS |
| 内存很紧、只要有解 | DFS（有风险）或 IDS |
| 深度未知、状态空间大 | IDS（课件推荐） |
| 代价不统一、要最优 | Uniform cost（Dijkstra） |
`,
    pitfalls: [
      { wrong: 'BrFS 总是最优的。', right: '只有动作代价统一时才最优；代价不统一时它只保证步数最少。' },
      { wrong: 'IDS 重复搜索很多次，所以比 BrFS 慢一个数量级。', right: '时间同为 $O(b^d)$，只多一点（$b=10,d=5$ 时多约 11%），空间却只要 $O(bd)$。' },
      { wrong: 'BrFS 的空间比 DFS 小。', right: '相反：BrFS 是 $O(b^d)$，DFS 是 $O(bm)$（只存当前路径和上面的兄弟节点；这是不保存 closed 表的树搜索——若记录所有展开过的状态做重复检测，空间就不再是 $O(bm)$）。' },
      { wrong: 'Closed list 在 tree search 里也要用。', right: 'Closed list 只用于 graph search；tree search 不记录已展开的状态。' }
    ],
    quiz: [
      { kind: '概念判断', q: '动作代价不统一时，下列哪个盲目搜索保证返回最优（总代价最小）的计划？（课件 W2 测验）', options: ['Breadth-first search', 'Depth-first search', 'Iterative deepening', '都不保证'], answer: 3, explain: '三者都只关心步数或根本不保证。代价不统一时要用 uniform-cost search（按 g 排序）。', ctx: false },
      { kind: '概念判断', q: 'Iterative deepening 里一次上限为 L 的调用实际实现的是？', options: ['深度受限的 BrFS', '拒绝走得比 L 更深的 DFS', '深度受限的 IW', '深度受限的 uniform cost'], answer: 1, explain: '深度受限搜索就是带深度上限的 DFS。', ctx: false },
      { kind: '公式计算', q: '分支因子 b = 2，目标深度 d = 3，在生成时做目标测试。IDS 一共生成多少个节点（不算根）？', answer: 22, tol: 0, explain: '$3\\times2+2\\times4+1\\times8=6+8+8=22$。对比 BrFS：$2+4+8=14$。', ctx: false },
      { kind: '概念判断', q: '“盲目搜索在经典规划中一定比启发式搜索差”对吗？（课件 W2 测验）', options: ['对', '不对'], answer: 1, explain: '不对。例如 W2 的 IW（盲目、不用启发式）在单原子目标的基准上和 GBFS + h_add 一样好，SIW 甚至更好。', ctx: false },
      { kind: '概念判断', q: '某个状态有无限多个可用动作。哪种搜索仍然完备？（课堂测验）', options: ['BrFS', 'DFS', '都不完备', '都完备'], answer: 1, explain: '官方答案 DFS：BrFS 必须先生成这一层的全部后继，永远生成不完；DFS 生成一个后继就往下走（后继逐个生成、且排在目标前面的子树都能搜完时，迟早能轮到通向目标的那个后继；只有深度有限还不够）。', ctx: false },
      { kind: '轨迹推导', q: '课件 W2 的二叉树（A 为根，按字母序生成孩子），用 DFS（先展开字母序靠前的孩子），目标 M。第 6 个被展开的节点是？', options: ['C', 'E', 'I', 'J'], answer: 1, explain: '展开顺序 A B D H I E J K C F L M，第 6 个是 E。', ctx: false }
    ],
    source: 'W2 p.2–21、36–38（状态模型与图、搜索分类、术语、world / search state、search node、评价标准、BrFS / DFS / IDS 的示意与复杂度、BrFS 数据表、IDS 节点数对比、测验、总结）；W2 讲课录音（完备性、最优性的讨论）。'
  },
  /* ------------------------------------------------------------------ a04 */
  {
    id: 'a04', num: 'P4', part: 'q2', title: '宽度搜索：novelty、IW、SIW', en: 'Novelty, Iterated Width, Serialized IW',
    summary: '盲目搜索也可以利用状态的**原子结构**。状态 $s$ 的 **novelty** $w(s)$ 是 $s$ 中第一次在搜索里同时为真的最小原子组合的大小。**IW(k)** 是把 novelty > k 的新状态直接剪掉的广度优先搜索，最多展开 $O(n^k)$ 个状态（$n$ 为原子数）。很多基准领域在单原子目标下宽度很小；**SIW** 把多个目标串行化，用 IW 逐个达成，完全不用启发式就比 GBFS + h_add 更好。',
    goals: ['按定义算出一个状态的 novelty', '说出 IW(k) 的剪枝规则与 $O(n^k)$ 界', '解释为什么 IW(1) 在 {row, col} 网格上到不了对角的目标，而 IW(2) 可以', '说出 SIW 如何处理多个目标'],
    prereq: '第 P3 章',
    what: R`
**Novelty**（W2 p.27）：状态 $s$ 的 novelty $w(s)$ 是 $s$ 中**第一次在搜索中为真**的最小原子子集的大小：
- $w(s)=1$：有一个原子 $p\in s$，$s$ 是第一个让 $p$ 为真的状态；
- 否则 $w(s)=2$：有两个原子 $p,q\in s$，$s$ 是第一个让 $p\wedge q$ 同时为真的状态；
- 否则 $w(s)=3$……

**IW(k)**（W2 p.28）：广度优先搜索，把新生成的、novelty $>k$ 的状态剪掉。**IW** 依次调用 IW(0)、IW(1)、IW(2)……直到问题解出或 $k$ 超过变量个数。性质：IW(k) 最多展开 $O(n^k)$ 个状态。

**理论**（W2 p.30）：若问题的宽度为 $k$，则 IW(k) 在 $O(n^k)$ 时间内解出它；代价统一时解是最优的；对这类问题是完备的。Blocks、Logistics、Gripper、n-puzzle 在**单原子目标**下宽度有界，与问题规模无关。

**SIW（Serialized IW）**（W2 p.32–33）：对 $|G|=n$ 个目标做一种简单的“爬山”：用 IW 一次达成一个原子目标，既用 IW 分解问题、也用它解子问题。它是盲目的，IW 甚至不知道下一个要达成的目标是哪个。
`,
    why: R`
**为什么需要它**：规划是 PSPACE-complete 的，但现有规划器几秒内就能解大多数基准。宽度（width）解释了“容易”和“难”的分界：基准领域的单原子目标宽度很小，联合目标又容易串行化（W2 p.24–25）。

**实验**（W2 p.29–30）：把 IPC 实例拆成 37,921 个单目标实例——

| | IW | ID | BrFS | GBFS + h_add |
|---|---|---|---|---|
| 解出比例 | 91% | 24% | 23% | 91% |

按宽度分：$k=1$ 的占 37.0%，$k=2$ 的占 51.3%，即 IW(k ≤ 2) 就解出 88.3%；其余 11.7% 归在 $k>2$ 一列（其中一部分 IW 也没解出，IW 总覆盖率是 91%）。SIW 在联合目标的基准上比 GBFS + h_add 更快、覆盖更多、计划质量好得多。

**难的问题**：原子宽度高的问题（基准里几乎没有），以及多目标难以串行化的问题（如 Sokoban）。
`,
    intuition: R`
**IW(1) = “只保留带来新东西的状态”的 BFS**。一个状态如果没有让任何单个原子第一次为真，它对“探索新事实”就没有贡献，IW(1) 直接丢掉它。这样搜索最多保留约 $n$ 个状态（每个原子最多“第一次”一次），所以很快。

代价是可能剪掉通往目标的唯一路径。课堂测验的例子：网格上状态用 {row(r), col(c)} 两个原子表示。从 (0,0) 出发：(1,0) 带来新的 row1，(0,1) 带来新的 col1，都保留；但 (1,1) 的 row1 和 col1 都已单独出现过，novelty = 2，被 IW(1) 剪掉。于是对角方向的格子都到不了。IW(2) 会保留每个 (row, col) 组合第一次出现的状态，等于普通 BFS，所以总能找到最短路。

**SIW** 每次只求多满足一个目标原子（但不预先指定是哪一个——课件说 IW 甚至不知道下一个要达成的是谁）：每次调用 IW，找到一个让“已满足的目标原子数”变多的状态就停，再从那里出发找下一个——这就是课件说的“对目标集合做爬山”。
`,
    math: R`
**Novelty 的计算**：维护“已见过的原子组合”的集合。生成状态 $s$ 时，从 $k=1$ 开始找：$s$ 中是否存在一个大小为 $k$ 的原子组合不在集合里。最小的这种 $k$ 就是 $w(s)$；IW(k) 保留 $w(s)\le k$ 的状态，并把它的所有大小 $\le k$ 的组合加入集合。

**为什么 IW(k) 最多 $O(n^k)$ 个状态**：每个保留下来的状态都至少让一个大小 $\le k$ 的原子组合第一次出现，而这样的组合最多有 $O(n^k)$ 个。

**Atari 中的 IW(1)**（W3 p.42）：状态是 128 个字节、每个 256 种取值，看作 $128\times256$ 个原子；18 个动作，所以 IW(1) 最多生成 $128\times256\times18=589{,}824$ 个状态。
`,
    formulas: [{
      title: 'IW(k) 的剪枝规则',
      latex: R`\text{生成 } s:\quad \htmlClass{fx-w}{w(s)}>\htmlClass{fx-k}{k}\ \Rightarrow\ \htmlClass{fx-prune}{\text{剪掉}},\qquad \htmlClass{fx-bound}{|\text{保留的状态}|=O(n^k)}`,
      parts: [
        { key: 'w', label: 'novelty w(s)', color: 'blue', text: '$s$ 中第一次在搜索里同时为真的最小原子组合的大小。' },
        { key: 'k', label: '宽度参数 k', color: 'purple', text: 'IW(1) 只保留带来新原子的状态；IW 依次试 $k=0,1,2,\\dots$。' },
        { key: 'prune', label: '直接丢掉', color: 'red', text: '剪掉的是**新生成**的状态，不放进 BFS 队列。' },
        { key: 'bound', label: '状态数上界', color: 'green', text: '$n$ 是原子数。宽度为 $k$ 的问题，IW(k) 在 $O(n^k)$ 时间内解出（代价统一时最优）。' }
      ]
    }],
    example: R`
**3×3 网格，从 (0,0) 到 (2,2)**，状态 = {row(r), col(c)}，按 上 / 下 / 左 / 右 生成：

| 生成的状态 | 第一次出现的原子组合 | novelty | IW(1) |
|---|---|---|---|
| (1,0) | row1 | 1 | 保留 |
| (0,1) | col1 | 1 | 保留 |
| (2,0) | row2 | 1 | 保留 |
| (1,1) | 只有 {row1, col1} 这一对 | 2 | **剪掉** |
| (0,2) | col2 | 1 | 保留 |
| (2,1)、(1,2) | 只有成对组合是新的 | 2 | **剪掉** |

(2,2) 根本不会被生成：能走到它的 (2,1)、(1,2) 都被剪掉了，所以 IW(1) 到不了 (2,2)；IW(2) 保留所有第一次出现的 (row, col) 组合，4 步到达。
`,
    viz: { id: 'iwtrace', guide: R`
**怎么用**：默认 IW(1)，点“下一个生成的状态”逐个看 novelty 和剪枝结果；做完后会说明为什么到不了目标。再切到 IW(2) 对比。也可以换成“中间是墙”的地图。` },
    compare: R`
| | BrFS | IW(k) | GBFS + h_add |
|---|---|---|---|
| 用启发式吗 | 否 | 否（只用原子结构） | 是 |
| 剪枝 | 只去重 | novelty > k 的剪掉 | 不剪，按 h 排序 |
| 状态数 | 状态空间大小 | $O(n^k)$ | 视 h 而定 |
| 单原子目标基准（课件实验） | 23% | 91% | 91% |
`,
    pitfalls: [
      { wrong: 'IW(k) 剪掉 novelty 小于 k 的状态。', right: '剪掉的是 novelty **大于** k 的状态。' },
      { wrong: 'IW 是启发式搜索。', right: 'IW 和 SIW 都是盲目搜索：不估计到目标的距离，只看状态带来了多少“新”原子组合。' },
      { wrong: 'IW(1) 对任何单目标问题都完备。', right: '只有问题宽度 ≤ 1 时才保证。网格 {row, col} 的例子里，IW(1) 到不了对角目标，需要 IW(2)。' },
      { wrong: 'SIW 同时求解所有目标。', right: 'SIW 把目标串行化，用 IW 一个一个达成。' }
    ],
    quiz: [
      { kind: '概念判断', q: 'IW(k) 在广度优先搜索中做什么？', options: ['只展开目标状态', '剪掉 novelty > k 的状态', '剪掉 novelty < k 的状态', '按 novelty 给状态排序'], answer: 1, explain: 'IW(k) = BrFS + 剪掉新生成的、novelty 大于 k 的状态。', ctx: false },
      { kind: '概念判断', q: 'IW(k) 的时间复杂度是（n 为原子数）？', options: ['O(n)', 'O(2^n)', 'O(n^k)', 'O(k^n)'], answer: 2, explain: '每个保留的状态都让一个大小 ≤ k 的原子组合第一次出现，这种组合最多 $O(n^k)$ 个。', ctx: false },
      { kind: '概念判断', q: 'SIW 怎样处理多个（联合）目标？', options: ['用 BrFS 同时求解所有目标', '忽略多余的目标', '把目标串行化，用 IW 一个一个达成', '需要为每个目标手写因子化表示'], answer: 2, explain: 'Serialized IW：对目标集合做一种简单爬山，一次用 IW 达成一个原子目标。', ctx: false },
      { kind: '概念判断', q: '网格上状态表示为 {row(x), col(y)}，没有障碍。IW(1) 对单源最短路是否完备且最优？', options: ['是', '取决于障碍', '不完备；但 IW(2) 总是完备且（代价统一时）最优', '只有 IW(3) 才行'], answer: 2, explain: '(1,1) 这类格子的 row 和 col 都已单独出现过，novelty = 2，被 IW(1) 剪掉。IW(2) 保留每个 (row, col) 第一次出现的状态，相当于对格子做 BFS。（课堂测验原题网站未给答案，这里是按定义推出的。）', ctx: false },
      { kind: '概念判断', q: 'IW(1) 是把 novelty > 1 的新节点剪掉的 BrFS。IW(1) 能解 Australia 的 TSP 吗？（课堂测验）', options: ['能', '不能'], answer: 1, explain: '官方答案 False。目标是所有 v(x) 和 at(Sy) **同时**为真，需要“去过 Br 之后又回到 Sy”这样的状态：at(Sy)、v(Sy)、v(Br) 每个原子都已单独出现过，只有 {at(Sy), v(Br)} 这一对是新的，novelty = 2，被 IW(1) 剪掉。', ctx: false },
      { kind: '公式计算', q: 'Atari 中把 128 个字节、每字节 256 种取值看作原子，有 18 个动作。IW(1) 最多生成多少个状态？', answer: 589824, tol: 0, explain: '$128\\times256\\times18=589{,}824$（W3 p.42）。', ctx: false }
    ],
    source: 'W2 p.23–34、37–38（结构与宽度、novelty 定义、IW 与 $O(n^k)$、IW 实验与宽度理论、SIW、总结）；W3 p.42（Atari 中的 IW(1)）；课堂测验（IW(k) 的剪枝、复杂度、novelty 定义、SIW、网格 {row, col}）。'
  },
  /* ------------------------------------------------------------------ a05 */
  {
    id: 'a05', num: 'P5', part: 'q3', title: '启发式函数及其性质', en: 'Heuristic functions: safe, goal-aware, admissible, consistent',
    summary: '启发式函数 $h$ 估计从状态到**最近目标**的剩余代价；完美启发式 $h^*$ 给出真实最优代价。搜索表现取决于 $h$ 的 **informedness**（多接近 $h^*$）和计算开销。四个性质：**safe**（$h=\\infty$ 时真的无解）、**goal-aware**（目标处 $h=0$）、**admissible**（$h\\le h^*$）、**consistent**（$h(s)\\le c(a)+h(s\')$）。关系：consistent + goal-aware ⇒ admissible；admissible ⇒ safe 且 goal-aware。',
    goals: ['写出四个性质的定义', '证明 consistent + goal-aware ⇒ admissible，admissible ⇒ safe + goal-aware', '在一张图上先算 h*，再判断 h 满足哪些性质', '举出 admissible 但不 consistent 的例子'],
    prereq: '第 P3 章',
    what: R`
**定义**（W3 p.10）：
- **启发式函数** $h:S\to\mathbb R^+_0\cup\{\infty\}$，$h(s)$ 叫 $s$ 的 h 值。
- **剩余代价**：从 $s$ 出发的最优计划代价，无解时为 $\infty$。**完美启发式** $h^*$ 给每个状态它的剩余代价。

**四个性质**（W3 p.13）：
- **safe**：$h(s)=\infty\Rightarrow h^*(s)=\infty$（说“无解”时真的无解）；
- **goal-aware**：所有目标状态 $h(s)=0$；
- **admissible**：所有状态 $h(s)\le h^*(s)$（从不高估）；
- **consistent**：每条转移 $s\xrightarrow{a}s'$ 都有 $h(s)\le c(a)+h(s')$。
`,
    why: R`
**h 要好到什么程度？**（W3 p.11–12）很多搜索算法对 $h$ 没有任何要求也能正确、完备地运行——$h$ 可以是任何从状态到数字的函数。但**表现**取决于 $h$ 有多接近 $h^*$（informedness），以及计算 $h$ 的**开销**。

性质的用处在算法里：
- GBFS、A* 的完备性要 $h$ **safe**（不会把可解的状态当死路扔掉）；
- A* 的最优性要 $h$ **admissible**；
- $h$ admissible 且 consistent 时，A* 从不需要重新打开状态（第 P6 章）。

在规划里，$h$ 是从问题描述**自动生成**的（W4–W5 的 relaxation）。
`,
    intuition: R`
**Admissible = 乐观**：永远不高估还要走多远。

**Consistent = 一步一步都乐观**：走一步花 $c(a)$，估计值最多减少 $c(a)$。它像三角不等式：从 $s$ 的估计不应该大于“先走一步的代价 + 从下一状态的估计”。

**为什么 consistent + goal-aware ⇒ admissible**：沿着从 $s$ 到目标的最优路径 $s=s_0\to s_1\to\dots\to s_n$ 把 consistency 连起来：$h(s_0)\le c_1+h(s_1)\le c_1+c_2+h(s_2)\le\dots\le\sum c_i+h(s_n)$。goal-aware 给出 $h(s_n)=0$，于是 $h(s)\le h^*(s)$。没有 goal-aware 不行：常数 $h\equiv5$ 是 consistent 的（每条边 $5\le c+5$），但不 admissible。

**为什么 admissible ⇒ goal-aware 和 safe**：目标处 $h^*=0$，$h\le0$ 又 $h\ge0$，所以 $h=0$；若 $h(s)=\infty$，则 $h^*(s)\ge h(s)=\infty$。
`,
    math: R`
**关系图**

$$\text{consistent}+\text{goal-aware}\ \Longrightarrow\ \text{admissible}\ \Longrightarrow\ \text{safe}\ \wedge\ \text{goal-aware}$$

反方向都不成立：
- admissible ⇏ consistent（见下面的例子）；
- safe ⇏ admissible（例如 $h\equiv$ 一个很大的有限数：从不为 $\infty$，所以 safe，但高估）；
- goal-aware ⇏ admissible。

**判断步骤**：① 从目标倒着算每个状态的 $h^*$（Dijkstra）；② 逐个状态检查 safe、goal-aware、admissible；③ 逐条边检查 consistent。
`,
    formulas: [{
      title: '四个性质',
      latex: R`\htmlClass{fx-safe}{h(s)=\infty\Rightarrow h^*(s)=\infty},\quad \htmlClass{fx-ga}{h(s_G)=0},\quad \htmlClass{fx-adm}{h(s)\le h^*(s)},\quad \htmlClass{fx-con}{h(s)\le c(a)+h(s')}`,
      parts: [
        { key: 'safe', label: 'safe', color: 'gray', text: '只约束 $h=\\infty$ 的状态：不会把可解的状态误判为死路。' },
        { key: 'ga', label: 'goal-aware', color: 'green', text: '所有目标状态估计为 0。' },
        { key: 'adm', label: 'admissible', color: 'blue', text: '从不高估真实剩余代价。A* 最优性的条件。' },
        { key: 'con', label: 'consistent', color: 'orange', text: '对每条边成立。加上 goal-aware 就推出 admissible。' }
      ]
    }],
    example: R`
**练习图**（S→A 代价 1，S→B 代价 2，A→D 代价 5，D→G 代价 5，B→G 代价 3；$h$：S 5、A 2、B 3、D 1、G 0）

先算 $h^*$：G 0；D 5（D→G）；B 3（B→G）；A 10（A→D→G）；S 5（S→B→G）。

| 状态 | h | h* | h ≤ h*？ |
|---|---|---|---|
| S | 5 | 5 | 是 |
| A | 2 | 10 | 是 |
| B | 3 | 3 | 是 |
| D | 1 | 5 | 是 |
| G | 0 | 0 | 是 |

所以 $h$ **admissible**、goal-aware、safe。但边 S→A：$h(S)=5>c+h(A)=1+2=3$，**不 consistent**。这正是“admissible 不一定 consistent”的例子。
`,
    viz: { id: 'hprops', guide: R`
**怎么用**：默认是上面的练习图，核对表格和“S→A 不 consistent”。改动任意 h 值（例如把 h(A) 改成 4），看哪些性质随之改变；把 h(G) 改成 1，goal-aware 和 admissible 都会失败。` },
    compare: R`
| 性质 | 约束对象 | 谁需要它 |
|---|---|---|
| safe | $h=\infty$ 的状态 | GBFS、A* 的完备性 |
| goal-aware | 目标状态 | EHC 的完备性：目标处 $h=0$，才能严格低于当前的 $h$ 而被找到（HC/EHC 判断“到没到”用的是显式的目标测试，不靠 $h$） |
| admissible | 每个状态 | A* 的最优性；加权 A* 的 W 倍界 |
| consistent | 每条边 | A* 不需要重新打开状态 |
`,
    pitfalls: [
      { wrong: 'Admissible 的启发式一定 consistent。', right: '反过来才对（再加 goal-aware）。例子中 S→A 违反 consistency，但 h 仍 admissible。' },
      { wrong: 'Consistent 就一定 admissible。', right: '还需要 goal-aware。常数 $h\\equiv5$ consistent 但不 admissible。' },
      { wrong: 'h 估计的是到初始状态的距离。', right: '估计的是到**最近的目标状态**的剩余代价。' },
      { wrong: '搜索表现只取决于 h 有多接近 h*。', right: '还取决于计算 h 的开销（课堂测验答案：informedness 和 computation overhead）。' }
    ],
    quiz: [
      { kind: '概念判断', q: 'Goal-aware 的启发式给所有目标状态赋值 h = 0。', options: ['对', '错'], answer: 0, explain: '这正是 goal-aware 的定义。', ctx: false },
      { kind: '概念判断', q: '什么是 safe 的启发式？', options: ['若从 s 有解，则 h(s) < ∞', '若从 s 无解，则 h(s) = ∞', '若 h(s) < ∞，则从 s 有解', 'h(s) ≤ h*(s)'], answer: 0, explain: 'safe：$h(s)=\\infty\\Rightarrow h^*(s)=\\infty$，等价于逆否命题“有解（$h^*<\\infty$）⇒ $h<\\infty$”。B 是反方向，不要求。', ctx: false },
      { kind: '概念判断', q: '下列哪个推论正确？', options: ['admissible ⇒ consistent', 'consistent ⇒ admissible', 'consistent + goal-aware ⇒ admissible', 'safe ⇒ admissible'], answer: 2, explain: '沿最优路径把 consistency 连起来，再用 goal-aware 得到 $h\\le h^*$。', ctx: false },
      { kind: '概念判断', q: '启发式搜索的表现取决于？', options: ['启发式的 informedness 和计算开销', '只取决于 h 离 h* 多近', '日期', '只取决于 h 是否 admissible'], answer: 0, explain: '课堂测验答案：informedness 和 computation overhead 都重要。', ctx: false },
      { kind: '概念判断', q: '练习图：S→A(1)、S→B(2)、A→D(5)、D→G(5)、B→G(3)，h：S5、A2、B3、D1、G0。这个 h 满足哪些性质？', options: ['只有 safe', 'safe、goal-aware、admissible，但不 consistent', '四个都满足', 'safe、goal-aware、consistent，但不 admissible'], answer: 1, explain: 'h* 为 S5、A10、B3、D5、G0，h 处处 ≤ h*；但 $h(S)=5>1+h(A)=3$，S→A 违反 consistency。', ctx: false }
    ],
    source: 'W3 p.9–13（启发式搜索的基本思想、启发式函数与 h*、informedness 的讨论、四个性质与“Relationships?”）；课堂测验（goal-aware、safe 的定义、h 估计到最近目标、表现取决于 informedness 与开销、图上的性质判断）。'
  },
  /* ------------------------------------------------------------------ a06 */
  {
    id: 'a06', num: 'P6', part: 'q3', title: 'GBFS、A* 与加权 A*', en: 'Greedy best-first search, A*, weighted A*',
    summary: '三种系统的启发式搜索都用优先队列，只是排序依据不同：**GBFS** 按 $h$（快但不最优），**A*** 按 $f=g+h$（$h$ admissible 时最优，最常用于 optimal planning），**加权 A*** 按 $g+W\\cdot h$（$W>1$ 且 $h$ admissible 时有界次优：解最多是最优的 $W$ 倍）。W = 0、1、→∞ 时加权 A* 分别变成 uniform cost、A*、GBFS。',
    goals: ['按课件伪代码（弹出时查重、展开时做目标测试、A* 的重新打开）手动追踪三种算法', '说出 GBFS、A*、加权 A* 的完备性与最优性条件', '说出 W = 0 / 1 / ∞ 时加权 A* 变成什么，以及 h = 0 时 A* 和 GBFS 变成什么', '理解 A* 的 tie-breaking 与“never re-opens”的条件'],
    prereq: '第 P5 章',
    what: R`
**GBFS（带重复检测）**（W3 p.15）：
1. open = 按 $h$ 升序的优先队列，放入根节点；closed = ∅。
2. 循环：弹出 $h$ 最小的节点 $\sigma$；**若它的状态不在 closed**：加入 closed；若是目标，返回解；否则展开，把 $h<\infty$ 的后继放进 open。
3. open 空了：无解。

**A***（带重复检测和**重新打开**）（W3 p.17）：open 按 $f=g+h$ 排序；弹出 $\sigma$ 时，若状态不在 closed，**或者这次的 $g$ 比记录的 best-g 更小**，就（重新）打开它：放进 closed、更新 best-g、做目标测试、展开。

**加权 A***（W3 p.22）：同 A*，但按 $g+W\cdot h$ 排序。

**术语**（W3 p.19）：generated（曾放进 open 的节点）、expanded（弹出且通过查重的节点）、re-expanded / re-opened（展开时状态已在 closed 里）。
`,
    why: R`
**性质**（课件 W3 p.16、20、23 留空的部分按讲课整理）

| | GBFS | A* | 加权 A*（W > 1） |
|---|---|---|---|
| 排序 | $h$ | $g+h$ | $g+W\cdot h$ |
| 完备 | 是（$h$ safe、状态空间有限、做重复检测） | 是（同左） | 是（同左） |
| 最优 | 否 | $h$ admissible 时是 | 否，但**有界次优**：$h$ admissible 时解 ≤ W × 最优 |
| 用途 | satisficing 最常用的三种之一 | optimal planning 最常用 | satisficing 最常用的三种之一 |

- GBFS 在 $h$ 的任何严格单调变换下不变（乘正常数、加常数）——它只看排序。
- A* 常用的 tie-breaking：$f$ 相同时选 $h$ 更小的。$h$ admissible 且 consistent 时，A* 从不重新打开状态，可以简化。
- 常见而难发现的 bug：在错误的地方查重（课件特别提醒）。

**特殊情况**：加权 A* 的 W = 0 → uniform cost（Dijkstra）；W = 1 → A*；W → ∞ → GBFS。A* 中令 $h\equiv0$ → uniform-cost search；GBFS 中令 $h\equiv0$ → 所有节点优先级相同，完全由 tie-breaking 决定，可以变成 BrFS、DFS 或 uniform cost（课件测验答案 D）。
`,
    intuition: R`
**GBFS 只看“离目标还有多远”，A* 还算上“已经走了多远”。**

GBFS 会被 $h$ 误导：一条看起来很近、其实很贵的路，它会一头扎进去。A* 因为加上了 $g$，走贵的路会让 $f$ 变大，迟早让位给更便宜的路线。

**为什么 admissible 让 A* 最优**（直觉）：$h$ 从不高估，所以最优路径上的节点 $f\le$ 最优代价；而任何更贵的目标节点 $f=g>$ 最优代价。于是最优路径上的节点总会在更贵的目标之前被弹出。

**加权 A*** 在两者之间调节：W 越大越贪心、越快，解的质量下降，但不会比最优差超过 W 倍（$h$ admissible 时）。
`,
    math: R`
$$f_{\text{GBFS}}=h,\qquad f_{A^*}=g+h,\qquad f_{WA^*}=g+W\cdot h.$$

**有界次优**：$W>1$、$h$ admissible 时，加权 A* 返回的解代价 ≤ $W\cdot C^*$（$C^*$ 为最优代价）。

**本站追踪器的约定**（与课件伪代码一致）：节点**弹出**时才查重，已在 closed 里的直接丢弃、不算展开（A* 和加权 A* 例外：这次的 $g$ 更小就重新打开，算一次 re-expansion）；**展开**时才做目标测试；优先值相同时按插入顺序或字母序（考试题会说明 tie-breaking 规则，按题目来）。
`,
    formulas: [{
      title: 'A* 的排序依据',
      latex: R`\htmlClass{fx-f}{f(s)}=\htmlClass{fx-g}{g(s)}+\htmlClass{fx-w}{W}\cdot\htmlClass{fx-h}{h(s)}`,
      parts: [
        { key: 'g', label: 'g：已花的代价', color: 'blue', text: '从根到这个节点的路径代价。GBFS 不看它。' },
        { key: 'h', label: 'h：估计的剩余代价', color: 'orange', text: 'admissible 时 A* 最优。' },
        { key: 'w', label: '权重 W', color: 'purple', text: 'A* 中 $W=1$。$W=0$ → uniform cost；$W\\to\\infty$ → GBFS。$W>1$ 时解 ≤ W × 最优（h admissible）。' },
        { key: 'f', label: '优先值', color: 'green', text: 'open 列表按它升序弹出。' }
      ]
    }],
    example: R`
**课件 W3 的 A* 例子**（实线代价都是 1，节点旁的“g+h”）：

| 步 | 弹出（f） | 生成（g+h） |
|---|---|---|
| 1 | I（0+3=3） | a（1+2）、b（1+3） |
| 2 | a（3） | c（2+6）、d（2+7） |
| 3 | b（4） | e（2+5）、f（2+2） |
| 4 | f（4） | j（3+5）、k（3+1） |
| 5 | k（4） | G（4+0）、m（4+8） |
| 6 | G（4） | 目标，代价 4 |

A* 先被 a（f = 3）吸引，展开后发现它的孩子 f 值都很大，于是回到 b 那一支。

**本站练习图**（S 到 G，代价和 h 见交互，并列按字母序）：GBFS 展开 S C E G，得到代价 9 的路线；A* 展开 S A B D C G，得到代价 6 的最优路线；W = 2 的加权 A* 展开 S C E G，也是代价 9。
`,
    viz: { id: 'searchtrace', props: { preset: 'astar', algo: 'astar' }, guide: R`
**怎么用**：
1. 默认是课件的 A* 例子：逐步核对上表；open 列表显示每个节点的 g、h 和 f。
2. 切到 GBFS：只按 h 排序。换成“GBFS 被 h 误导”这张图，GBFS 得到代价 11 的路线，A* 得到代价 5。
3. 切到“带代价的图（并列按字母序）”，把并列规则设成“按字母序”，对比 GBFS、A*、加权 A*；拖动 W 从 0 到 5，看它从 uniform cost 变成 GBFS。` },
    compare: R`
| 想要 | 选 |
|---|---|
| 最优解 | A*（admissible h） |
| 快速找到一个解 | GBFS |
| 快，但解的质量有保证 | 加权 A*（W > 1 且 $h$ admissible 时，最多差 W 倍） |
| 不用启发式、代价不统一 | uniform cost（= A* with h ≡ 0） |
`,
    pitfalls: [
      { wrong: 'GBFS 用 admissible 的启发式就最优。', right: 'GBFS 不看 g，任何启发式性质都不能保证它最优；safe 只能保证它（在有限状态空间、做重复检测时）完备。' },
      { wrong: '加权 A* 的 W → ∞ 变成 BrFS。', right: '变成 GBFS（g 的作用被淹没）。W = 0 才是 uniform cost。' },
      { wrong: 'A* 只要 h safe 就最优。', right: 'safe 只保证完备；最优要 admissible。' },
      { wrong: '弹出一个已在 closed 里的节点也算一次展开。', right: '按课件伪代码，它会被直接丢弃（A* 中除非 g 更小而重新打开）。' }
    ],
    quiz: [
      { kind: '概念判断', q: '加权 A* 中 W → ∞ 时变成？', options: ['A*', 'Dijkstra', 'BrFS', 'GBFS'], answer: 3, explain: '$g+W h$ 中 $W h$ 主导排序，等价于只按 h：GBFS。', ctx: false },
      { kind: '概念判断', q: '令所有 h(n) = 0，A* 变成？（课件 W3 测验）', options: ['Breadth-first search', 'Depth-first search', 'Uniform-cost search', 'Depth-limited search'], answer: 2, explain: '$f=g$，按路径代价排序：uniform-cost search。', ctx: false },
      { kind: '概念判断', q: '令所有 h(n) = 0，GBFS 可以变成？（课件 W3 测验）', options: ['BrFS', 'DFS', 'Uniform-cost search', '以上都可以'], answer: 3, explain: '所有优先级相同，完全由 tie-breaking 决定：按插入先后 → BrFS，后进先出 → DFS，按 g → uniform cost。', ctx: false },
      { kind: '概念判断', q: 'A* 返回最优解的条件是？', options: ['h safe', 'h goal-aware', 'h admissible', 'h 任意'], answer: 2, explain: 'admissible（从不高估）保证最优；consistent 还能保证不需要重新打开状态。', ctx: false },
      { kind: '轨迹推导', q: '课件 W3 的 A* 例子中，第 4 个被展开的节点的 f 值和 h 值是？（节点记作 g+h，实线代价 1）', options: ['f=4，h=2（节点 2+2）', 'f=4，h=3（节点 1+3）', 'f=3，h=2（节点 1+2）', 'f=4，h=1（节点 3+1）'], answer: 0, explain: '展开顺序：I(3)、1+2(3)、1+3(4)、2+2(4)、3+1(4)、目标(4)。第 4 个是 2+2。', ctx: false }
    ],
    source: 'W3 p.7、15–23、50（系统启发式搜索的分类、GBFS 伪代码与性质、A* 伪代码、例子、术语、tie-breaking 与重新打开、加权 A* 与有界次优、h = 0 的测验）；课堂测验（W → ∞、GBFS 的保证）。'
  },
  /* ------------------------------------------------------------------ a07 */
  {
    id: 'a07', num: 'P7', part: 'q3', title: '局部搜索、BFWS 与模拟器上的规划', en: 'Hill-climbing, enforced hill-climbing, BFWS, planning with simulators',
    summary: '局部搜索一次只管一个节点。**Hill-climbing** 每步走到 $h$ 最小的后继，既不完备也不最优，容易卡在局部最小值。**Enforced hill-climbing（EHC）** 每次用 BrFS 找一个 $h$ **严格更小**的状态再跳过去；不最优；状态空间有限、没有死路、$h$ goal-aware 且非目标状态 $h>0$ 时能保证找到解。GBFS 是纯“利用”，**BFWS** 先按 novelty 再按 $h$ 排序，加入了利用状态结构的“探索”，是 IPC 2018 以来最好的 satisficing 规划器之一。IW 还能直接在模拟器（Atari）上做规划。',
    goals: ['写出 HC 与 EHC 的过程，并说明它们的完备性 / 最优性', '在图上追踪 HC 卡在局部最小值、EHC 跳出局部最小值', '说出 BFWS(⟨w, h⟩) 的排序方式和它解决的问题', '说出 IW 在 Atari 上的做法和课件给出的实验结论'],
    prereq: '第 P4、P6 章',
    what: R`
**Hill-climbing**（W3 p.25）：从根出发，若是目标就返回；否则在所有后继中选一个 $h$ 最小的（并列随机），**无论它是否比当前更好**，然后继续。
- 只有当非目标状态 $h>0$ 时才有意义；
- 容易卡在局部最小值（附近没有能立即降低 $h$ 的状态）；
- 有很多变体：tie-breaking、重启……

**Enforced hill-climbing**（W3 p.26–27）：
- improve(σ₀)：从 σ₀ 做**广度优先搜索**（带重复检测），找到第一个 $h(\sigma)<h(\sigma_0)$ 的状态就返回；搜完都没找到则失败。
- 主循环：σ := root；只要不是目标，σ := improve(σ)。

**IDA\***（iterative deepening A*，课件表格里的最后一列）：把 iterative deepening 的“深度上限”换成 **$f=g+h$ 的上限**。先以 $f(\text{root})$ 为上限做 DFS，剪掉 $f$ 超过上限的节点；没找到解，就把上限提高到这一轮被剪掉的节点中最小的 $f$，再从头 DFS。空间像 DFS 一样是线性的，$h$ admissible 时和 A* 一样最优。

**性质汇总**（W2 p.21 与 W3 p.28 的同一张表，课件留空，按讲课整理；EHC 一列是补充）

| | DFS | BrFS | ID | A* | HC | IDA* | EHC |
|---|---|---|---|---|---|---|---|
| 完备 | 否 | 是 | 是 | 是（h safe、有限状态空间） | 否 | 是（h safe、有限状态空间） | 无死路、h goal-aware 且非目标 h>0 时是 |
| 最优 | 否 | 代价统一时是 | 代价统一时是 | 是（h admissible） | 否 | 是（h admissible） | 否 |
| 时间 | $O(b^m)$ | $O(b^d)$ | $O(b^d)$ | $O(b^d)$ | 可能不终止 | $O(b^d)$ | — |
| 空间 | $O(bm)$ | $O(b^d)$ | $O(bd)$ | $O(b^d)$ | $O(b)$ | $O(bd)$ | — |

$b$ 是分支因子，$d$ 是解的深度，$m$ 是搜索到达的最大深度。HC 只存当前节点和它的后继，所以空间是 $O(b)$。DFS、ID、IDA* 的线性空间指不保存 closed 表的树搜索。A*、IDA* 的 $O(b^d)$ 是单位代价时的最坏界；一般正代价下要看有多少节点的 $f$ 小于最优代价——若有大量代价极小的边，A* 展开的节点可以远多于 $b^d$，IDA* 的递归深度也可能超过 $d$。
`,
    why: R`
**GBFS 的缺点：只有利用，没有探索**（W3 p.31–32）。GBFS 一味追随 $h$，经常卡在局部最小值。RL 和 MCTS 里也需要探索，但那些方法是“平的”探索，不看状态的结构；宽度方法用 novelty 利用了状态的原子结构。

**BFWS(f)**：$f=\langle w,f_1,\dots,f_n\rangle$，按 novelty $w$ 排序，并列时依次用 $f_1,\dots$ 打破。基本形式 BFWS(⟨w, h⟩)，$h=h_{add}$ 或 $h_{FF}$，novelty 用 $w_h$：只在与 $s$ **h 值相同**的已生成状态中比较“第一次出现的原子组合”。BFWS(⟨w, h⟩) 比纯贪心的 BFS(h) 好得多；一些变体是 IPC 2018 Agile 和 Satisficing 赛道的最佳表现者。

**模型 ≠ 语言**（W3 p.36–48）：很多问题符合经典规划模型，但很难写成 PDDL（Pacman、Tetris、Pong……）。在模拟器上规划时没有 PDDL、没有目标只有奖励，经典规划器用不了——但 IW 几乎可以直接用：
- IW(1) 用 Atari 的 128 个 RAM 字节（每个 256 种值）作原子，最多生成 589,824 个状态；子节点随机顺序生成；折扣 $\gamma=0.995$；执行通向奖励最高的 IW(1) 路径的那个动作。
- 结果（54 个游戏，每步 150,000 帧模拟预算）：IW(1) 26 次最好，2BFS 13 次，BrFS 1 次，UCT 19 次；BrFS 只能看 0.3 秒的未来，IW(1) 和 2BFS 能看 6–22 秒。
- 按游戏得分，IW 在 49 个游戏中的 45 个超过 DeepMind 的算法（输入不同：RAM vs 屏幕，比较方式仍有争议）。
`,
    intuition: R`
**HC = 只看脚下最陡的下坡**。走到一个“坑底”（局部最小值），周围都更高，它也只能挑一个最不高的走，然后又走回来，来回打转。

**EHC = 卡住了就环顾四周**：从当前位置做 BrFS，直到找到一个比现在更低的地方，直接跳过去。只要目标从当前状态可达、$h$ goal-aware，而且非目标状态都有 $h>0$（课件说 EHC 只在这种情况下才有意义），目标处的 $h=0$ 就一定比当前小，BrFS 最终一定能找到更低的状态，所以不会卡死；但跳过去的路线不一定最短。反例：若某个非目标状态 $h=0$，improve 要找 $h<0$ 的状态，永远找不到。

**有死路（dead end）时 EHC 会失败**：如果某一步走进了一个再也到不了目标的状态，那里的 BrFS 找不到更小的 h。FF 规划器用 EHC + helpful actions，失败时退回到完整的最佳优先搜索。
`,
    math: R`
**EHC 的完备性推导**（课件只问“Is this complete?”，以下是推导）：设状态空间有限，$h$ goal-aware，且非目标状态 $h>0$（课件 W3 p.27：EHC makes sense only if $h(s)>0$ for $s\notin S_G$）；当前状态 $\sigma$ 非目标且目标可达。improve(σ) 的 BrFS 会遍历从 σ 可达的所有状态，其中包括目标（$h=0<h(\sigma)$），所以一定返回某个更好的状态。每次成功的 improve 都让 $h$ 严格下降，而有限状态空间中 $h$ 值有限，所以循环会结束于目标。前提是走过的每个状态都能到达目标（没有 dead end），例如可逆 / 无向的状态空间。

**HC 不完备的例子**（本站练习图，无向）：S（h 3）连 A（h 1）和 C（h 2），C—D（h 1）—G（h 0）。HC：S → A（h 最小）→ A 只有邻居 S → S → A → ……永远来回。
`,
    formulas: [{
      title: 'EHC 的 improve 条件',
      latex: R`\text{BrFS from }\sigma_0\text{ until }\ \htmlClass{fx-h}{h(\sigma)}<\htmlClass{fx-h0}{h(\sigma_0)}`,
      parts: [
        { key: 'h0', label: '当前状态的 h', color: 'blue', text: '要找的是比它**严格**更小的状态。' },
        { key: 'h', label: '候选状态的 h', color: 'green', text: '按广度优先的顺序检查，第一个满足的就返回并跳过去；所以每次跳到的是“最近的”更好状态。' }
      ]
    }],
    example: R`
**本站练习图（无向，代价 1）**：S（h 3）—A（h 1），S—C（h 2），C—D（h 1），D—G（h 0）。最优路线 S → C → D → G，代价 3。

- **HC**：S 的邻居 A（1）、C（2）→ 走 A；A 的邻居只有 S（3）→ 走回 S；之后 S ↔ A 来回，到不了目标。
- **EHC**：从 S（h 3）做 BrFS：S、A（h 1 < 3）→ 跳到 A。从 A（h 1）做 BrFS：A、S（3）、C（2）、D（1，不严格小）、G（0 < 1）→ 跳到 G。路线 S → A → S → C → D → G，代价 5：找到了解，但不是最优。
`,
    viz: { id: 'searchtrace', props: { preset: 'local', algo: 'hc' }, guide: R`
**怎么用**：默认是爬山法练习图 + Hill-climbing，看它在 S、A 之间来回；切到 Enforced HC，看两次 BrFS 各访问了哪些状态；再切到 A*，对比它找到代价 3 的最优路线。课堂测验问过“A* **可能**比 HC 展开更多节点吗”：答案是可能（True）——A* 要系统地保证最优，HC 只走一条线；但不是总会，比如这张图上 HC 来回打转，A* 展开 5 个节点就结束了。` },
    compare: R`
| | GBFS | BFWS(⟨w, h⟩) | HC | EHC |
|---|---|---|---|---|
| 一次维护 | 整个 open 列表 | 整个 open 列表 | 一个节点 | 一个节点 + 局部 BrFS |
| 排序 / 选择 | h | 先 novelty，再 h | 后继中 h 最小 | BrFS 找 h 严格更小 |
| 探索 | 无 | 有（按状态结构） | 无 | 局部（BrFS） |
| 代表系统 | HSP（h_add） | IPC 2018 冠军 | — | FF（h_FF + helpful actions） |
`,
    pitfalls: [
      { wrong: 'Hill-climbing 只往 h 更小的方向走，所以不会走回头路。', right: '课件的 HC 每步选后继中 h 最小的，即使它比当前更大——所以会在局部最小值附近来回。' },
      { wrong: 'EHC 是最优的，因为它用了 BrFS。', right: 'BrFS 只用来找“最近的更好状态”，整条路线不保证最优（例子中代价 5 vs 最优 3）。' },
      { wrong: 'A* 展开的节点一定比 HC 少。', right: '不一定。HC 只沿一条线走，A* 为保证最优要系统地展开（课堂测验答案：True，A* 可能展开更多）。' },
      { wrong: 'IW 只能用于 PDDL 描述的问题。', right: 'IW 只需要状态的原子表示和一个能生成后继的模拟器，可以直接在 Atari RAM 上运行。' }
    ],
    quiz: [
      { kind: '概念判断', q: 'Hill-climbing 的保证（对所有搜索模型和任意启发式）是？', options: ['完备且最优', '完备但不一定最优', '最优但不一定完备', '既不完备也不最优'], answer: 3, explain: '可能卡在局部最小值（不完备），找到的路线也不保证最便宜（不最优）。', ctx: false },
      { kind: '概念判断', q: 'Enforced hill-climbing 的 improve 步骤做什么？', options: ['在后继中选 h 最小的', '用 BrFS 找第一个 h 严格小于当前的状态', '用 A* 找最优路径', '随机重启'], answer: 1, explain: 'improve：从当前状态做广度优先搜索，找到 h 更小的状态就跳过去。', ctx: false },
      { kind: '概念判断', q: 'BFWS(⟨w, h⟩) 怎样给节点排序？', options: ['只按 h', '先按 novelty w，再用 h 打破并列', '先按 h，再按 novelty', '按 g + h'], answer: 1, explain: 'BFWS(f) 按 f = ⟨w, f₁, …⟩ 字典序：novelty 优先，h 打破并列。', ctx: false },
      { kind: '概念判断', q: 'GBFS 在课件中被批评的主要缺点是？', options: ['不完备', '只有利用（exploitation）、没有探索，常卡在局部最小值', '需要 admissible 启发式', '空间是线性的'], answer: 1, explain: 'W3 p.31：GBFS is pure greedy “exploitation”; often gets stuck in local minima。', ctx: false },
      { kind: '概念判断', q: '课件中 IW(1) 在 54 个 Atari 游戏上的结果是？', options: ['IW(1) 26 次最好，UCT 19 次，2BFS 13 次，BrFS 1 次', 'UCT 在大多数游戏最好', 'BrFS 与 IW(1) 一样好', 'IW(1) 无法用于 Atari'], answer: 0, explain: 'W3 p.45 的表；BrFS 只能看 0.3 秒，IW(1) 和 2BFS 能看 6–22 秒。', ctx: false }
    ],
    source: 'W3 p.8、25–28（局部启发式搜索、hill-climbing、enforced hill-climbing、性质表）、p.30–48（GBFS 的缺点、BFWS、模型与语言、模拟器、ALE、IW 在 Atari、实验、与 DeepMind 的比较）；课堂测验（HC 的保证、A* 比 HC 展开更多、EHC）。'
  },
  /* ------------------------------------------------------------------ a08 */
  {
    id: 'a08', num: 'P8', part: 'q4', title: '松弛：怎样构造启发式', en: 'Relaxation: informally, formally, during search',
    summary: '**Relaxation** 是构造启发式的方法：把难问题 $P$ 简化成容易的 $P\'$，用 $P\'$ 的最优解代价估计原问题。形式上是三元组 $R=(P\',r,h\'^*)$，要求 $h^R(\\Pi)=h\'^*(r(\\Pi))\\le h^*(\\Pi)$。三个性质：**native**（$P\'\\subseteq P$ 且 $h\'^*=h^*$）、**efficiently constructible**（$r$ 多项式可算）、**efficiently computable**（$h\'^*$ 多项式可算）。例子：直线距离（假装是鸟）、8-puzzle 的 Manhattan 与错位数、goal counting。',
    goals: ['写出 relaxation 的形式定义和三个性质', '为直线距离、Manhattan、错位数、goal counting 写出 P′、r、h′*', '判断一个松弛是否 native / efficiently constructible / efficiently computable', '说出不可高效计算时的三种对策，以及搜索中怎样使用松弛'],
    prereq: '第 P5 章',
    what: R`
**非形式地**（W4 p.6）：
- 有一个问题 $P$，想估计它的完美启发式 $h^*$；
- 定义一个更简单的问题 $P'$，它的完美启发式 $h'^*$ 可以用来估计 $h^*$；
- 定义变换 $r$，把 $P$ 的实例简化成 $P'$ 的实例；
- 用 $h'^*(r(\Pi))$ 估计 $h^*(\Pi)$。

**形式定义**（W4 p.12）：$h^*$ 的松弛是三元组 $R=(P',r,h'^*)$，其中 $r:P\to P'$、$h'^*:P'\to\mathbb R^+_0\cup\{\infty\}$，使得对所有 $\Pi\in P$，**relaxation heuristic** $h^R(\Pi):=h'^*(r(\Pi))\le h^*(\Pi)$。它是：
- **native**：$P'\subseteq P$ 且 $h'^*=h^*$（简化后仍是同一类问题，用同一个完美启发式）；
- **efficiently constructible**：存在多项式时间算法计算 $r(\Pi)$；
- **efficiently computable**：存在多项式时间算法计算 $h'^*(\Pi')$。

**为什么要自动生成**（W4 p.4）：如果启发式要用户手写，规划就失去了通用、自主、灵活、快速原型这些卖点。
`,
    why: R`
**三个例子**（W4 p.7–9、15–18；课件留空的部分按定义整理，与课堂测验答案一致）

| 松弛 | $P'$ | $r$ | $h'^*$ | native | 可构造 | 可计算 |
|---|---|---|---|---|---|---|
| 直线距离（route finding） | 平面上两点间的直线距离（已经不是找路问题） | 假装自己是鸟 | 两点直线距离 | 否 | 是 | 是 |
| Manhattan（8-puzzle） | 数字可以移到任意**相邻**格，不管是否为空 | 去掉“目标格为空”的前提 | 各数字到目标位置的 Manhattan 距离之和 | 否 | 是 | 是 |
| 错位数（8-puzzle） | 数字可以移到任意格 | 去掉“相邻”和“为空”两个前提 | 不在目标位置的数字个数 | 否 | 是 | 是 |
| Goal counting（STRIPS） | 前提和删除都为空的 STRIPS 任务 | 删掉所有前提和删除 | 最优计划代价 | 是 | 是 | **否**（NP-hard） |

- 为什么 8-puzzle 的两个松弛不是 native：课件里 $P$ 是 8-puzzle，放宽规则后的“谜题”已经不是 8-puzzle，$P'\not\subseteq P$。直线距离同理：$P'$ 是“求两点直线距离”，不是找路问题。
- Goal counting：前提和删除为空的 STRIPS 最优规划仍是 **NP-hard**（从 MINIMUM COVER 归约：用最少的 add 列表覆盖目标集合），所以再近似一次：直接数**没满足的目标个数**。

**不能高效构造 / 计算怎么办**（W4 p.17）：(a) 近似 $r$ 或 $h'^*$；(b) 把它设计得通常可行；(c) 硬着头皮用。规划中已知的松弛大多可高效构造；可高效计算的很多，有些不行（如 W5 的 $h^+$），后者都用 (a)。
`,
    intuition: R`
**松弛 = 放宽规则，让问题变容易，但不允许“作弊得太狠”**：放宽后原问题的每个解仍然是松弛问题的解，所以松弛问题的最优解不会更贵——这就是 $h^R\le h^*$（admissible）的来源。

**8-puzzle 的两个松弛**：原规则“A 与 B 相邻且 B 为空，才能把数字从 A 移到 B”。
- 去掉“B 为空”：每个数字可以径直走向目标，互不阻挡，最少步数就是它的 Manhattan 距离。
- 再去掉“相邻”：每个错位的数字一步就能到位，最少步数就是错位数。
放宽得越少，越接近 $h^*$：错位数 ≤ Manhattan ≤ $h^*$。

**搜索中怎样用**（W4 p.20）：对每个搜索状态 $s$，把“从 $s$ 出发的任务” $\Pi_s$（初始状态换成 $s$）交给 $r$ 和 $h'^*$，得到 $h^R(s)=h'^*(r(\Pi_s))$。松弛**只用于计算 h**，搜索本身仍在原问题上进行——这点对 native 的松弛（如忽略删除）容易混淆。
`,
    math: R`
$$h^R(\Pi)=h'^*\big(r(\Pi)\big)\le h^*(\Pi),\qquad h^R(s)=h'^*\big(r(\Pi_s)\big),\ \ \Pi_s=(F,A,c,s,G).$$

**Goal counting 的性质**（W4 p.26 的问题）：$h$ = 没满足的目标数。
- 值域只有 $0\dots|G|$，很不 informative；任何任务都能改写成“所有非目标状态 $h=1$”（加一个新目标原子和一个需要全部旧目标才能执行的“完成”动作）；
- 完全不看动作；
- goal-aware：是（目标处没有未满足的目标）；safe：是（从不为 $\infty$）；admissible：一般不是（一个动作可能同时达成好几个目标，或代价小于 1）；consistent：一般不是。

**课堂测验（Gripper）**：$h$ = “还没在 B 房间的球数”能不能写成某个松弛的 $h^R$？答案是“当然，每个 admissible 的 $h$ 都能”——按定义，取 $P'=P$、$r$ 为恒等、$h'^*:=h$ 即可。只“去掉删除”得到的是 $h^+$，它还要计入拿起、放下、移动，不等于球数。
`,
    formulas: [{
      title: 'Relaxation heuristic',
      latex: R`\htmlClass{fx-hr}{h^{R}(\Pi)}=\htmlClass{fx-hp}{h'^{*}}\big(\htmlClass{fx-r}{r}(\Pi)\big)\ \htmlClass{fx-le}{\le h^{*}(\Pi)}`,
      parts: [
        { key: 'r', label: '变换 r：把问题简化', color: 'orange', text: '例如“去掉所有删除效果”“去掉 8-puzzle 中目标格为空的前提”。能多项式时间算出 → efficiently constructible。' },
        { key: 'hp', label: '简化问题的完美启发式', color: 'blue', text: '简化问题的最优解代价。能多项式时间算出 → efficiently computable；$P\'\\subseteq P$ 且 $h\'^*=h^*$ → native。' },
        { key: 'hr', label: '得到的启发式', color: 'green', text: '搜索中对每个状态 $s$ 计算 $h^R(s)=h\'^*(r(\\Pi_s))$。' },
        { key: 'le', label: '不高估', color: 'red', text: '形式定义直接要求这一条，所以由松弛得到的启发式都是 admissible 的（若再近似 $h\'^*$，如 goal counting，就可能失去这个性质）。' }
      ]
    }],
    example: R`
**Goal counting in Australia**（W4 p.9）：原子 at(x)、v(x)（x ∈ Sy, Ad, Br, Pe, Da）；drive(x, y)：Pre {at(x)}，Add {at(y), v(y)}，Del {at(x)}；初始 {at(Sy), v(Sy)}；目标 at(Sy) 和所有 v(x)。

去掉前提和删除后，每个 drive 只是“把 at(y)、v(y) 变真”，每个目标 v(x) 至少要一个动作，而一个动作只加一个 v：最少 4 个动作。goal counting 的值：没满足的目标是 v(Ad)、v(Br)、v(Pe)、v(Da)，$h=4$。对比真实最优代价 $h^*(I)=20$（第 P9 章）。

**8-puzzle**：在交互里打乱后对比错位数、Manhattan 和 $h^*$，总有 错位数 ≤ Manhattan ≤ $h^*$。
`,
    viz: { id: 'puzzle8', guide: R`
**怎么用**：点数字移动，或点“打乱 30 步”。表里同时给出两个松弛启发式的值、各自去掉了哪个前提，以及用 BFS 算出的真实最少步数 h*。` },
    compare: R`
| | native | efficiently constructible | efficiently computable |
|---|---|---|---|
| 问的是 | 简化后还是不是同一类问题 | 变换 r 好不好算 | 简化问题的最优解好不好算 |
| Goal counting（去掉前提和删除） | 是 | 是 | 否（NP-hard） |
| 删除松弛 $h^+$（W5） | 是 | 是 | 否（NP-hard） |
| 直线距离 | 否 | 是 | 是 |
`,
    pitfalls: [
      { wrong: '松弛会改变搜索所在的问题。', right: '松弛只用于在每个状态上**计算 h**；搜索仍在原问题上进行。' },
      { wrong: 'Goal counting 是 admissible 的，因为它来自松弛。', right: '去掉前提和删除后的**最优**代价是 admissible 的，但它 NP-hard；goal counting 是对它的再近似，一个动作可能同时达成几个目标，所以一般不 admissible。' },
      { wrong: '去掉“相邻”这个前提得到 Manhattan 距离。', right: '去掉“目标格为空”得到 Manhattan；两个前提都去掉才得到错位数。' },
      { wrong: '一个松弛必须同时满足 native、可构造、可计算才有用。', right: '课件：这些都不是硬性要求（h+ 就不可高效计算，但通过近似非常有用）。' }
    ],
    quiz: [
      { kind: '概念判断', q: '8-puzzle 的 PDDL 中，去掉哪个前提可以把它松弛成 Manhattan 距离？', options: ['去掉 adjacent', '去掉 empty（目标格为空）', '去掉 at', '以上都不对'], answer: 1, explain: '保留“相邻”，去掉“为空”：每个数字独立地走向目标，步数 = Manhattan 距离。', ctx: false },
      { kind: '概念判断', q: '哪个松弛使松弛问题的最优代价等于错位数（#misplaced tiles）？', options: ['可以移动，如果目标格为空', '可以移动，如果相邻且目标格为空', '可以移动，如果相邻', '可以无约束地移动'], answer: 3, explain: '没有任何约束时，每个错位的数字一步到位。', ctx: false },
      { kind: '概念判断', q: '8-puzzle 的两个松弛（Manhattan、错位数）是否 efficiently computable？', options: ['Manhattan 是，错位数不是', 'Manhattan 不是，错位数是', '都不是', '都是'], answer: 3, explain: '两者都能在多项式时间直接算出。（课堂测验答案 D）', ctx: false },
      { kind: '概念判断', q: 'Gripper：一个手爪、两个房间 A 和 B、n 个球。h = “还没在 B 的球数”能否写成某个松弛的 $h^R$？', options: ['不能', '能，只要去掉删除', '当然，每个 admissible 的 h 都能写成某个松弛的 $h^R$', '我宁愿去海边放松'], answer: 2, explain: '按定义，取 P′ = P、r 为恒等、h′* := h 即可。只去掉删除得到的是 h+，还要计入拿起、放下、移动，不等于球数。（课堂测验答案 C，D 也被标为正确——玩笑选项。）', ctx: false },
      { kind: '概念判断', q: '“去掉所有前提和删除、再用最优计划代价”（goal counting 的松弛）属于？', options: ['native、可构造、可计算', 'native、可构造，但不可高效计算（NP-hard）', '不是 native', '不可构造'], answer: 1, explain: 'P′ 仍是 STRIPS 任务且 h′* = h*（native），删掉前提和删除很容易（可构造），但最优求解仍 NP-hard（MINIMUM COVER），所以再近似成“数没满足的目标”。', ctx: false }
    ],
    source: 'W4 p.4–26（动机、非形式松弛、route finding / 8-puzzle / goal counting 例子、形式定义、native / 可构造 / 可计算、不可计算时的对策、搜索中使用松弛、Gripper 测验、总结、goal counting 的评述）；课堂测验（8-puzzle 的两个松弛及其性质、Gripper）。'
  },
  /* ------------------------------------------------------------------ a09 */
  {
    id: 'a09', num: 'P9', part: 'q4', title: '删除松弛与 h+', en: 'The delete relaxation and the optimal relaxed-plan heuristic h+',
    summary: '**Delete relaxation**：把每个 STRIPS 动作的删除列表清空（$a^+$），“曾经为真的永远为真”。松弛后的状态只会变大，**多一些事实为真总是更好**（dominance），所以原问题的每个计划都是松弛计划，最优松弛计划的代价 $h^+$ 是 admissible 的。找一个松弛计划很容易（贪心、多项式时间），但求**最优**松弛计划很难：判定版本是 NP-complete，计算 $h^+$ 是 NP-hard，所以实际系统都在近似 $h^+$。',
    goals: ['写出 a⁺、Π⁺、relaxed plan 的定义', '用 dominance 解释为什么 h+ admissible', '在 Australia 例子中写出最优计划（20）和最优松弛计划（10）', '说出 h+ 的复杂度与“native / 可构造 / 可计算”三个性质'],
    prereq: '第 P2、P8 章',
    what: R`
**定义**（W5 p.7）：
- STRIPS 动作 $a$ 的**删除松弛动作** $a^+$：$pre_{a^+}=pre_a$，$add_{a^+}=add_a$，$del_{a^+}=\emptyset$。
- $\Pi^+=(F,A^+,c,I,G)$：删除松弛后的任务。
- 状态 $s$ 的（最优）**relaxed plan**：$\Pi^+_s$ 的（最优）计划；$I$ 的 relaxed plan 也叫 $\Pi$ 的 relaxed plan。

**“TSP” in Australia**（W5 p.8）：初始 {at(Sy), v(Sy)}。依次执行 drive(Sy,Br)⁺、drive(Sy,Ad)⁺、drive(Ad,Pe)⁺、drive(Ad,Da)⁺：因为不删 at(x)，卡车“同时在所有去过的城市”，可以直接从 Ad 出发去 Pe 和 Da，最后也不必开回悉尼（at(Sy) 一直为真）。

**Dominance**（W5 p.9）：若 $s'^+\supseteq s^+$，则 $s'^+$ dominates $s^+$：(i) $s^+$ 是目标则 $s'^+$ 也是；(ii) 在 $s^+$ 可执行的动作序列在 $s'^+$ 也可执行，结果仍 dominate。→ **多一些事实为真总是更好**。

**$h^+$**（W5 p.13）：$h^+(s)$ = 从 $s$ 出发的最优松弛计划的代价。
`,
    why: R`
**为什么 $h^+$ admissible**（W5 p.10）：$appl(s,a^+)$ dominates $s$ 和 $appl(s,a)$。对计划长度做归纳：$appl(s,\vec a^+)$ dominates $appl(s,\vec a)$，所以原任务的任何计划 $\vec a$ 去掉删除后仍是松弛计划。最优松弛计划不会比最优计划更贵：$h^+\le h^*$。于是 $h^+$ admissible，也就 safe、goal-aware。

**找一个松弛计划很容易**（W5 p.11）：**贪心松弛规划**——只要目标没满足，就随便执行一个前提满足、且会加入新事实的动作；没有这样的动作就报告无解。它 sound、complete、多项式时间（每个动作最多选一次）。但用它的代价当 h：safe、goal-aware，却**不 admissible**，也不 informed——它会选与目标无关的动作。

**但求最优松弛计划很难**（W5 p.17）：PlanOpt⁺（是否存在代价 ≤ B 的松弛计划）是 **NP-complete**。归属：松弛计划里每个动作最多出现一次，长度有多项式上界，可以猜一个验证；困难：从 SAT 归约。

**作为松弛的性质**（W5 p.18）：$P'$ = 删除为空的 STRIPS 任务，$r$ = 去掉删除，$h'^*$ = 最优计划代价 → native ✔、efficiently constructible ✔、efficiently computable ✘。所以实际系统都在**近似** $h^+$（第 P10、P11 章）。
`,
    intuition: R`
**“世界只会变好”**：删除松弛下，没有任何东西会被“用掉”或“变坏”。几个直观后果：
- FreeCell：空的 free cell 一直保持空（课堂测验答案）。
- Sokoban（推箱子）：空位置一直空、两个箱子可以推到同一个位置、什么都不会被堵住——但**不能穿墙**（墙不是靠删除表示的，墙边的移动本来就不可执行）。
- TSP：$h^+$ 等于最小生成树的代价；Hanoi：$h^+=n$，而真实最优是 $2^n-1$ 步。迷宫里有**两个**金块时，课堂测验的答案也是最小生成树距离：忽略删除后可以从任何到过的格子继续走，松弛计划连成一棵树，而不是一条路径。（严格说 $h^+$ 是连通起点和两个金块的最小 Steiner 树，可以在中途分叉，有时比两两最短距离的最小生成树更小：起点 $(0,0)$、金块在 $(2,1)$ 与 $(1,2)$ 时，最小生成树是 $3+2=5$，而 $h^+=4$——先走到 $(1,1)$ 再分别走一步。考试按课堂测验的答案。）
- 迷宫里一个人走到一个金块：$h^+=h^*$。目标只有一个位置，忽略删除让你“同时在走过的所有格子”，但仍要一格格走到那里，最短路线不变。

**最优松弛计划里不会出现同一个动作两次**：第一次执行后它的添加效果就永远为真，再执行一次什么也不加（课堂测验：Australia 的最优松弛计划不会有两次 drive(Sy, Ad)）。
`,
    math: R`
$$a^+=(pre_a,\ add_a,\ \emptyset),\qquad appl(s,a^+)=s\cup add_a\ \supseteq\ s\ \text{且}\ \supseteq appl(s,a).$$

**Australia**（W5 p.14）：道路与代价 Sy–Br 1，Sy–Ad 1.5，Ad–Pe 3.5，Ad–Da 4；目标 at(Sy) 和所有 v(x)。
- 最优计划：Sy→Br→Sy→Ad→Pe→Ad→Da→Ad→Sy，代价 $1+1+1.5+3.5+3.5+4+4+1.5=20$，所以 $h^*(I)=20$。
- 最优松弛计划：drive(Sy,Br)、drive(Sy,Ad)、drive(Ad,Pe)、drive(Ad,Da)，代价 $1+1.5+3.5+4=10$，所以 $h^+(I)=10$。
`,
    formulas: [{
      title: '删除松弛动作与 h+',
      latex: R`\htmlClass{fx-a}{a^+=(pre_a,\ add_a,\ \emptyset)},\qquad \htmlClass{fx-h}{h^+(s)}=\text{cost of an optimal plan for }\htmlClass{fx-pi}{\Pi^+_s}\ \htmlClass{fx-le}{\le h^*(s)}`,
      parts: [
        { key: 'a', label: '去掉删除列表', color: 'orange', text: '前提和添加不变，删除为空：“曾经为真的永远为真”。' },
        { key: 'pi', label: '从 s 出发的松弛任务', color: 'blue', text: '$\\Pi_s$：把初始状态换成 $s$；再把所有动作换成 $a^+$。' },
        { key: 'h', label: '最优松弛计划的代价', color: 'green', text: 'Australia：$h^+(I)=10$。计算它是 NP-hard（判定版本 PlanOpt⁺ 是 NP-complete），所以实际中用 h_max、h_add、h_FF 近似。' },
        { key: 'le', label: 'admissible', color: 'red', text: '由 dominance：原问题的每个计划都是松弛计划。' }
      ]
    }],
    example: R`
**在交互里自己构造 Australia 的松弛计划**（删除松弛模式）：
1. 初始 {at(Sy), v(Sy)}。
2. drive(Sy,Br)：加 at(Br)、v(Br)；at(Sy) **不被删除**。
3. drive(Sy,Ad)：仍可执行（at(Sy) 还在）。加 at(Ad)、v(Ad)。
4. drive(Ad,Pe)：加 at(Pe)、v(Pe)。
5. drive(Ad,Da)：仍可执行（at(Ad) 还在）。加 at(Da)、v(Da)。此时目标全部为真，代价 10。

切回真实语义：开到 Br 后 at(Sy) 就被删除，必须开回悉尼才能去 Ad……总代价 20。
`,
    viz: { id: 'stripsplay', props: { preset: 'australia', relaxed: true }, guide: R`
**怎么用**：默认是 Australia + 删除松弛。按上面的顺序点 4 个 drive，看状态只增不减、目标在代价 10 时满足；读数里的 h+ 会随状态更新。再切到“真实 STRIPS”，自己找出代价 20 的最优计划。` },
    compare: R`
| | 真实任务 Π | 删除松弛任务 Π⁺ |
|---|---|---|
| 执行动作 | $s'=(s\setminus del)\cup add$ | $s'=s\cup add$ |
| 状态变化 | 可增可减 | 只增不减 |
| 找一个计划 | PSPACE-complete | 多项式时间（贪心） |
| 找最优计划 | PSPACE-complete | NP-hard（这就是 h+；判定版本 NP-complete） |
| Australia 的最优代价 | 20 | 10 |
`,
    pitfalls: [
      { wrong: '删除松弛下可以穿墙。', right: '墙不是靠删除效果表示的；原本不可执行的移动在松弛后仍不可执行。课堂测验中这是“错误”的说法。' },
      { wrong: '最优松弛计划可能多次执行同一个动作。', right: '第一次执行后它的添加效果永远为真，再执行毫无作用，最优松弛计划里每个动作最多一次。' },
      { wrong: '贪心松弛规划的代价是 admissible 的。', right: '它可能选很多无关动作，代价会高估；只有**最优**松弛计划的代价 h+ 才 admissible。' },
      { wrong: 'h+ 很容易计算，因为找松弛计划很容易。', right: '找**一个**松弛计划容易（多项式时间）；找**最优**的松弛计划是 NP-hard（判定版本 PlanOpt⁺ 是 NP-complete）。' }
    ],
    quiz: [
      { kind: '概念判断', q: '忽略删除列表怎样简化 FreeCell？', options: ['所有牌可以立刻移到目标位置', '空的 free cell 一直保持空'], answer: 1, explain: '把牌放进 free cell 本应删除“这个 cell 是空的”，忽略删除后它永远是空的。', ctx: false },
      { kind: '概念判断', q: '忽略 Sokoban 的删除列表后，下列哪个说法是**错误**的？', options: ['空位置一直保持空', '可以穿墙', '可以把两个箱子推到同一个位置', '什么都不会被堵住'], answer: 1, explain: '墙边的移动本来就不可执行，松弛不会让它变得可执行。', ctx: false },
      { kind: '概念判断', q: 'Australia 的一个最优删除松弛计划可以包含不止一个 drive(Sydney, Adelaide)。', options: ['对', '错'], answer: 1, explain: '第二次执行不会让任何新事实变真，最优松弛计划里每个动作最多一次。', ctx: false },
      { kind: '公式计算', q: 'Australia（Sy–Br 1，Sy–Ad 1.5，Ad–Pe 3.5，Ad–Da 4；从 Sy 出发访问所有城市并回到 Sy）。$h^+(I)$ 是多少？', answer: 10, tol: 0, explain: '最优松弛计划 drive(Sy,Br)、drive(Sy,Ad)、drive(Ad,Pe)、drive(Ad,Da)：$1+1.5+3.5+4=10$。at(Sy) 从未被删除，不用开回。', ctx: false },
      { kind: '概念判断', q: '迷宫里一个人要走到金块所在的格子（一个目标位置）。这里 $h^+$ 等于？', options: ['Manhattan 距离', 'h*', '水平距离', '竖直距离'], answer: 1, explain: '忽略删除只让你“同时在走过的格子”，并不能穿墙；要到达目标格仍需走一条完整的路，最短路长度不变，$h^+=h^*$。', ctx: false }
    ],
    source: 'W5 p.4–20（删除松弛的动机与定义、Australia 的松弛计划、dominance、删除松弛 admissible、贪心松弛规划、h+ 的定义与 admissibility、Australia 的 h* 与 h+、TSP 与 Hanoi、PlanOpt⁺ NP-complete、h+ 作为松弛的性质、迷宫测验）；W5 p.43（FreeCell、Sokoban）；课堂测验。'
  },
  /* ------------------------------------------------------------------ a10 */
  {
    id: 'a10', num: 'P10', part: 'q4', title: 'h_max 与 h_add', en: 'The max and additive heuristics, Bellman-Ford tables',
    summary: '$h_{max}$ 与 $h_{add}$ 都假设每个子目标**独立地**达成：单个事实的代价 = 最便宜的 achiever 的 $c(a)$ + 它前提的代价；一组事实的代价，$h_{max}$ 取**最大**（乐观、admissible，$h_{max}\\le h^+$），$h_{add}$ 取**求和**（悲观、不 admissible，$h_{add}\\ge h^+$，可能超过 $h^*$）。两者用 Bellman-Ford 表很快算出，且在“无解”上与 $h^+$ 一致。$h_{add}$ 更 informed，但会**重复计算共享的子计划**。',
    goals: ['写出 h_max、h_add 的递归定义', '用 Bellman-Ford 表手算 Australia（5.5 / 13）和 Logistics（h_add 7）', '说出 h_max ≤ h+ ≤ h* 和 h_add ≥ h+，并能举出 h_add > h* 的例子', '解释 h_add 为什么会过度计数（positive interactions）'],
    prereq: '第 P9 章',
    what: R`
**定义**（W5 p.22）：$h_{add}(s):=h_{add}(s,G)$，其中 $h_{add}(s,g)$ 是满足下式的逐点最大函数：
$$h_{add}(s,g)=\begin{cases}0 & g\subseteq s\\ \min_{a\in A,\ g\in add_a} c(a)+h_{add}(s,pre_a) & |g|=1\\ \sum_{g'\in g}h_{add}(s,\{g'\}) & |g|>1\end{cases}$$
$h_{max}$ 相同，只是把第三行的 $\sum$ 换成 $\max$。

**性质**（W5 p.23–24）：
- $h_{max}\le h^+$，所以 $h_{max}\le h^*$（**乐观**，admissible）；
- 对所有任务 $h_{add}\ge h^+$；存在 $h_{add}(s)>h^*(s)$ 的例子（**悲观**，不 admissible）；
- $h^+(s)=\infty\iff h_{max}(s)=\infty\iff h_{add}(s)=\infty$：没有松弛计划的状态都能被识别。

**Bellman-Ford 计算**（W5 p.25）：$T_0(g)=0$（若 $g\in s$），否则 $\infty$；每一轮
$$T_{i+1}(g)=\min\Big(T_i(g),\ \min_{a:\,g\in add_a} c(a)+C_i(pre_a)\Big),$$
$C_i$ 对集合取和（$h_{add}$）或取最大（$h_{max}$），空前提为 0。表不再变化时停止，收敛到 $h(s,g)$。
`,
    why: R`
**实际中的问题**（W5 p.29）：
- 两者都能较快算出；
- $h_{max}$ admissible，但通常**太乐观**（只看最难的一个子目标）；
- $h_{add}$ 不 admissible，但通常比 $h_{max}$ **informed 得多**；
- $h_{add}$ 有时比 $h^+$ 更接近 $h^*$，但原因是“错的”：它不是在考虑删除，而是忽略了 **positive interactions**——几个子目标共享的子计划被重复计算；
- 这种过度计数可能导致对 $h^*$ 的严重高估。Logistics 例子中若 C 处有 100 个包裹都要运到 D（目标 = t(D) 加上这 100 个包裹都在 D），$h_{add}=3+100\times7=703$，而真实最优只要 $2+100+1+100=203$（每个包裹有自己的原子，卡车容量不限：开到 C、装 100 次、开到 D、卸 100 次）。

下一章的 relaxed plan（$h_{FF}$）就是为了减少这种过度计数。
`,
    intuition: R`
**两者都把子目标当成互不相干**：
- $h_{max}$：“最难的那个子目标都要花这么多，所以至少这么多。”——忽略了其他子目标也要花代价，所以偏低。
- $h_{add}$：“每个子目标各自要花这么多，加起来。”——忽略了很多子目标可以共用同一段路，所以偏高。

**Australia 里 $h_{add}$ 多算了什么**：v(Ad)、v(Pe)、v(Da) 各自的代价里都包含“从 Sy 开到 Ad”的 1.5：
$h_{add}=0+0+1.5+1+(1.5+3.5)+(1.5+4)=13$，而 $h^+=10$——drive(Sy, Ad) 被算了 3 次，多算了 $2\times1.5=3$。
`,
    math: R`
**Australia 的 Bellman-Ford 表**（$h_{max}$ 与 $h_{add}$ 这里每一轮相同，因为每个 drive 只有一个前提）：

| i | at(Sy) | at(Ad) | at(Br) | at(Pe) | at(Da) | v(Sy) | v(Ad) | v(Br) | v(Pe) | v(Da) |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | ∞ | ∞ | ∞ | ∞ | 0 | ∞ | ∞ | ∞ | ∞ |
| 1 | 0 | 1.5 | 1 | ∞ | ∞ | 0 | 1.5 | 1 | ∞ | ∞ |
| 2 | 0 | 1.5 | 1 | 5 | 5.5 | 0 | 1.5 | 1 | 5 | 5.5 |
| 3 | 不再变化 | | | | | | | | | |

目标 {at(Sy), v(Sy), v(Ad), v(Br), v(Pe), v(Da)}：
$h_{max}(I)=\max(0,0,1.5,1,5,5.5)=5.5$；$h_{add}(I)=0+0+1.5+1+5+5.5=13$。对比 $h^+=10$、$h^*=20$。
`,
    formulas: [{
      title: 'h_add 的递归（h_max 把求和换成取最大）',
      latex: R`h(s,g)=\begin{cases}\htmlClass{fx-zero}{0} & g\subseteq s\\ \htmlClass{fx-min}{\min_{a:\,g\in add_a}\ c(a)+h(s,pre_a)} & |g|=1\\ \htmlClass{fx-sum}{\textstyle\sum_{g'\in g}h(s,\{g'\})\ \ /\ \ \max_{g'\in g}h(s,\{g'\})} & |g|>1\end{cases}`,
      parts: [
        { key: 'zero', label: '已经为真', color: 'gray', text: '当前状态里已有的事实代价为 0。' },
        { key: 'min', label: '单个事实：最便宜的 achiever', color: 'blue', text: '在所有能加出 $g$ 的动作中，取“动作代价 + 让它可执行的代价”的最小值。' },
        { key: 'sum', label: '一组事实：求和（h_add）或取最大（h_max）', color: 'orange', text: '求和假设各子目标完全独立、互不共享（偏高）；取最大只算最难的一个（偏低）。这是两者唯一的区别。' }
      ]
    }],
    example: R`
**Logistics**（W5 p.28）：卡车在直线 A–B–C–D 的 A，包裹在 C；目标 {t(A), p(D)}；dr(X,Y)、lo(X)、ul(X) 代价都是 1（lo(X)：Pre {t(X), p(X)}，Add {p(T)}；ul(X)：Pre {t(X), p(T)}，Add {p(X)}）。

$h_{add}$ 的表（第 4 轮后收敛）：

| | t(A) | t(B) | t(C) | t(D) | p(T) | p(A) | p(B) | p(C) | p(D) |
|---|---|---|---|---|---|---|---|---|---|
| $h_{add}$ | 0 | 1 | 2 | 3 | 3 | 4 | 5 | 0 | 7 |

- p(T)：lo(C)，$1+t(C)+p(C)=1+2+0=3$；p(D)：ul(D)，$1+t(D)+p(T)=1+3+3=7$。
- $h_{add}(I)=t(A)+p(D)=0+7=7$。而 $h^+=5$（dr, dr, lo, dr, ul）、$h^*=8$（还要开回 A）。$h_{add}>h^+$，因为 t(D) 和 p(T) 的代价里都算了 dr(A,B)、dr(B,C)。
- 目标改成 {t(D), p(D)}：$h_{add}=3+7=10>h^*=5$——这里 $h_{add}$ 真的超过了 $h^*$。
- $h_{max}$：p(D) $=1+\max(3,3)=4$，$h_{max}(I)=4$。
`,
    viz: { id: 'hmaxadd', props: { preset: 'australia', mode: 'max' }, guide: R`
**怎么用**：
1. 默认 Australia + h_max：点“下一轮”逐行填表，红色是这一轮变化的格子；收敛后得到 5.5。
2. 切到 h_add：表一样，但合并目标时求和，得到 13。
3. 切到 Logistics + h_add，核对上面的表；点表头的 p(D) 看它的值来自哪个 achiever。把目标改成 t(D), p(D)，看 h_add 变成 10、超过 h* = 5。` },
    compare: R`
| | h_max | h+ | h_add |
|---|---|---|---|
| 合并子目标 | 取最大 | （精确求最优松弛计划） | 求和 |
| 与 h* 的关系 | $\le h^+\le h^*$，admissible | $\le h^*$，admissible | $\ge h^+$，可能 $>h^*$ |
| 计算 | 多项式（Bellman-Ford） | NP-hard | 多项式（Bellman-Ford） |
| 实践 | 太乐观 | — | 更 informed，但会过度计数 |
| Australia | 5.5 | 10 | 13 |
| Logistics（t(A), p(D)） | 4 | 5 | 7 |
`,
    pitfalls: [
      { wrong: 'h_add ≥ h+，所以 h_add 更接近 h*，总是更好。', right: '它“更 informed”是因为重复计算共享的子计划，这是错的原因，可能严重高估 h*（100 个包裹的例子：703 vs 203）。' },
      { wrong: 'h_max 和 h_add 有时会把可解的状态判为 ∞。', right: '三者在 ∞ 上完全一致：$h^+=\\infty\\iff h_{max}=\\infty\\iff h_{add}=\\infty$。' },
      { wrong: 'Bellman-Ford 表中，已在初始状态里的事实也可能变小。', right: '它们一开始就是 0，不会再变。' },
      { wrong: 'h_max 和 h_add 的区别在于单个事实怎么算。', right: '单个事实都取最便宜的 achiever；区别只在**一组事实**怎样合并（max vs sum），包括合并动作的前提。' }
    ],
    quiz: [
      { kind: '概念判断', q: '哪个说法正确？', options: ['总有 h_max ≤ h+，有时 h* ≤ h_add', '有时 h_max ≤ h+，总有 h* ≤ h_add', '有时 h_max ≤ h+，有时 h* ≤ h_add', '总有 h_max ≤ h+，总有 h* ≤ h_add'], answer: 0, explain: 'h_max 永远不超过 h+；h_add ≥ h+，但只是有时超过 h*（课堂测验答案 A）。', ctx: false },
      { kind: '公式计算', q: 'Australia（Sy–Br 1，Sy–Ad 1.5，Ad–Pe 3.5，Ad–Da 4；目标 at(Sy) 与所有 v(x)）。$h_{max}(I)$ 是多少？', answer: 5.5, tol: 0.001, explain: 'v(Da) 的代价 1.5 + 4 = 5.5 最大。', ctx: false },
      { kind: '公式计算', q: '同一个 Australia 问题，$h_{add}(I)$ 是多少？', answer: 13, tol: 0.001, explain: '$0+0+1.5+1+5+5.5=13$；drive(Sy,Ad) 被 v(Ad)、v(Pe)、v(Da) 各算了一次。', ctx: false },
      { kind: '公式计算', q: 'Logistics（卡车在 A，包裹在 C，直线 A–B–C–D，所有动作代价 1），目标 {t(A), p(D)}。$h_{add}(I)$ 是多少？', answer: 7, tol: 0, explain: 'p(T) = 1 + t(C) 2 + p(C) 0 = 3；p(D) = 1 + t(D) 3 + p(T) 3 = 7；加上 t(A) = 0。', ctx: false },
      { kind: '概念判断', q: 'h_add 会过度估计的根本原因是？', options: ['它考虑了删除效果', '它忽略了 positive interactions：被多个子目标共享的子计划被重复计算', '它用了 max', '它不是从松弛问题得到的'], answer: 1, explain: 'W5 p.29：rather than accounting for deletes, it overcounts by ignoring positive interactions.', ctx: false }
    ],
    source: 'W5 p.22–29（h_add 与 h_max 的定义、性质、与 h+ 在 ∞ 上一致、Bellman-Ford 变体、Australia 的 h_max / h_add 表、Logistics 的 h_add 表、实践中的问题与 100 个包裹的问题）；课堂测验（h_max ≤ h+、h* ≤ h_add 的关系）。课件留空的表格数值由本站按定义计算，并与课件 p.32 给出的 h_add 值完全一致。'
  },
  /* ------------------------------------------------------------------ a11 */
  {
    id: 'a11', num: 'P11', part: 'q4', title: '松弛计划 h_FF 与 helpful actions', en: 'Best supporters, relaxed plan extraction, h_FF, helpful actions',
    summary: '**Relaxed plan heuristic $h_{FF}$**：先用 $h_{max}$ 或 $h_{add}$ 给每个事实选一个**最佳支持者**（best supporter，最便宜的 achiever），再从目标出发倒推，把用到的动作收集成集合 RPlan，$h_{FF}=\\sum_{a\\in RPlan}c(a)$。因为 RPlan 是集合，共享的动作只算一次，不会像 $h_{add}$ 那样过度计数。理论性质与 $h_{add}$ 相同（$\\ge h^+$，可能 $>h^*$），实践中通常不高估。RPlan 中在当前状态就能执行的动作叫 **helpful actions**。',
    goals: ['写出 best supporter 的定义和松弛计划提取过程', '说出提取正确所需的三个前提（A）（B）（C），以及为什么由 h_max / h_add 得到的支持者满足它们', '手算 Logistics 的 h_FF = 5，以及目标改为 {t(D), p(D)} 时为什么仍是 5', '说出 helpful actions 的定义，以及 HSP、FF、LAMA、BFWS 分别用了什么'],
    prereq: '第 P10 章',
    what: R`
**最佳支持者**（W5 p.32）：对 $0<h(s,\{p\})<\infty$ 的事实 $p$，
$$bs(p):=\arg\min_{a\in A,\ p\in add_a}\ c(a)+h(s,pre_a),\qquad h\in\{h_{max},h_{add}\}.$$

**松弛计划提取**（W5 p.33）：
1. Open := $G\setminus s$；Closed := ∅；RPlan := ∅。
2. 当 Open 非空：取出一个 $g$，放进 Closed；RPlan := RPlan ∪ {bs(g)}；Open := Open ∪ ($pre_{bs(g)}\setminus(s\cup$ Closed$)$)。
3. 返回 RPlan。
迭代次数不超过 $|F|$，每次几乎常数时间，很快。

**正确性需要的前提**（W5 p.35）：best-supporter function 是部分函数 bs: $F\setminus s\to A$。
- (A) $a=bs(p)$ 时 $p\in add_a$；
- (B) **closed**：凡是在 support graph 里有路径通到某个目标的 $p\in F\setminus s$，bs(p) 都有定义；
- (C) **well-founded**：support graph（边 $p\to a$ 若 $p\in pre_a$，$a\to p$ 若 $a=bs(p)$）**无环**。有环时，倒推可能永远到不了当前状态 $s$。

**由 h_max / h_add 得到的 bs 满足这些**（W5 p.37）：所有 $c(a)>0$ 且 $h^+(s)<\infty$ 时，$bs^{max}_s$ 和 $bs^{add}_s$ 都 closed 且 well-founded。理由：沿 support graph 的路径，$h$ 值严格增大（$c(a)>0$），所以不可能成环。
`,
    why: R`
**$h_{FF}$ 的定义与性质**（W5 p.39–40）：若没有松弛计划，$h_{FF}=\infty$；否则 $h_{FF}=\sum_{a\in RPlan}c(a)$，RPlan 由 closed well-founded 的 bs 提取。
- $h_{FF}\ge h^+$（RPlan 能排成一个松弛计划）；
- $h^+(s)=\infty\iff h_{FF}(s)=\infty$；
- 存在 $h_{FF}(s)>h^*(s)$（bs 选得不好时）→ **不 admissible**，理论性质与 $h_{add}$ 一样。

**那它好在哪？** RPlan 是集合，被多个子目标共用的动作只算一次，所以 $h_{FF}$ **不会过度计数**；它仍可能不 admissible，但原因更微妙。实践中 $h_{FF}$ 通常不高估 $h^*$（或高估不多）。

**Helpful actions**（W5 p.41）：在 $s$ 中可执行、且在 RPlan 里的动作。FF 只让 EHC 展开 helpful actions（这样不保证完备）；其他规划器把它们当作 preferred operators，优先展开由它们产生的节点。

**代表系统**（W5 p.45–46）：
- **HSP**：GBFS + $h_{add}$（IPC'98 有竞争力）；
- **FF**：EHC + 由 $h_{max}$ 支持者提取的 $h_{FF}$ + helpful actions 剪枝（IPC'00 压倒对手）；
- **LAMA**：多队列 GBFS + $h_{FF}$ + landmarks 启发式（类似 goal counting），各有一条只用 helpful actions 的队列（IPC'08、'11 冠军）；
- **BFWS**：best-first width search + novelty + $h_{FF}$ 的变体 + goal counting。
`,
    intuition: R`
**$h_{add}$ vs $h_{FF}$：同样从目标倒推，一个是“每个子目标各算一遍”，一个是“把需要的动作列成一张清单，重复的划掉”。**

Logistics 里 t(D) 和 p(T) 都需要卡车先开到 C：$h_{add}$ 把 dr(A,B)、dr(B,C) 算了两次（得 7）；$h_{FF}$ 的 RPlan 是集合，它们只出现一次（得 5）。

**为什么 bs 不能有环**：比如让 t(B) 的支持者是 dr(C, B)、t(C) 的支持者是 dr(B, C)，倒推时 t(B) 需要 t(C)、t(C) 又需要 t(B)，永远回不到卡车真正所在的 A。用 $h_{max}$ / $h_{add}$ 选支持者就不会这样：t(B) 的值 1 小于 t(C) 的值 2，支持者总是从值更小的事实“推出来”的。
`,
    math: R`
$$h_{FF}(s)=\sum_{a\in RPlan(s)}c(a),\qquad h^+\le h_{FF},\qquad h_{FF}(s)=\infty\iff h^+(s)=\infty.$$

**Logistics 的 $bs^{add}$**（W5 p.32，与第 P10 章的 $h_{add}$ 值对应）：

| | t(B) | t(C) | t(D) | p(T) | p(A) | p(B) | p(D) |
|---|---|---|---|---|---|---|---|
| $bs^{add}$ | dr(A,B) | dr(B,C) | dr(C,D) | lo(C) | ul(A) | ul(B) | ul(D) |

**Helpful actions**：$\{a\in RPlan:\ pre_a\subseteq s\}$。
`,
    formulas: [{
      title: '最佳支持者与 h_FF',
      latex: R`\htmlClass{fx-bs}{bs(p)=\arg\min_{a:\,p\in add_a}c(a)+h(s,pre_a)},\qquad \htmlClass{fx-ff}{h_{FF}(s)=\textstyle\sum_{a\in RPlan}c(a)}`,
      parts: [
        { key: 'bs', label: '最佳支持者', color: 'blue', text: '$h$ 取 $h_{max}$ 或 $h_{add}$。FF 原论文用 $h_{max}$ 的支持者；课件的 Logistics 例子用 $h_{add}$。' },
        { key: 'ff', label: '松弛计划的代价', color: 'green', text: 'RPlan 是**集合**：被几个子目标共用的动作只算一次，这就是它不会像 $h_{add}$ 那样过度计数的原因。' }
      ]
    }],
    example: R`
**Logistics，目标 {t(A), p(D)}**（W5 p.34）：Open = {p(D)}（t(A) 已在 s 里）。

| # | 取出 | bs | 新加入 Open |
|---|---|---|---|
| 1 | p(D) | ul(D) | t(D)、p(T) |
| 2 | t(D) | dr(C,D) | t(C) |
| 3 | p(T) | lo(C) | —（t(C) 已在 Open，p(C) 在 s 里） |
| 4 | t(C) | dr(B,C) | t(B) |
| 5 | t(B) | dr(A,B) | —（t(A) 在 s 里） |

RPlan = {ul(D), dr(C,D), lo(C), dr(B,C), dr(A,B)}，$h_{FF}=5$。这里 $h_{FF}=h^+=5$；而 $h_{add}=7$、$h^*=8$。Helpful action：dr(A,B)（唯一在 s 中可执行的）。

**目标改为 {t(D), p(D)}**：t(D) 已经因为 p(D) 被加进了 RPlan（dr(C,D)），所以**一个驾驶动作也不用加**，$h_{FF}$ 仍是 5；而 $h_{add}$ 变成 10。若目标只有 p(D)，$h_{FF}=5=h^+=h^*$（课堂测验）。
`,
    viz: { id: 'rplan', guide: R`
**怎么用**：默认是 Logistics、支持者来自 h_add。第一张表是每个事实的 h 值和 bs；点“下一步”逐个处理 Open，核对上表。把目标切到 t(D), p(D)，看 RPlan 不变、h_FF 仍为 5；把支持者切到 h_max 对比。` },
    compare: R`
| | h_add | h_FF |
|---|---|---|
| 怎么合并子目标 | 每个子目标的代价求和 | 收集一个动作**集合** |
| 共享的子计划 | 重复计算 | 只算一次 |
| 理论性质 | $\ge h^+$，可能 $>h^*$ | 同左 |
| 实践 | 可能严重高估 | 通常不高估 |
| Logistics（t(A), p(D)） | 7 | 5 |
| Logistics（t(D), p(D)） | 10 | 5 |
`,
    pitfalls: [
      { wrong: 'h_FF 总是比 h_max、h_add 更接近 h*。', right: '没有这个保证。h_FF 与 h_add 理论性质相同，只是实践中通常更好。' },
      { wrong: 'h_FF 不会过度计数，所以它是 admissible 的。', right: '它可能因 bs 选得不好而高估 h*，仍然不 admissible。' },
      { wrong: 'Helpful actions 就是 RPlan 里的所有动作。', right: '只算 RPlan 中**在当前状态就能执行**的动作。' },
      { wrong: '只展开 helpful actions 仍然完备。', right: '课件：expanding only helpful actions does not guarantee completeness。' }
    ],
    quiz: [
      { kind: '公式计算', q: 'Logistics（卡车在 A，包裹在 C，直线 A–B–C–D，动作代价 1），目标**只有** p(D)。$h_{FF}$（由 h_add 支持者提取）是多少？', answer: 5, tol: 0, explain: 'RPlan = {ul(D), dr(C,D), lo(C), dr(B,C), dr(A,B)}，代价 5；这里也等于 h+ 和 h*（课堂测验）。', ctx: false },
      { kind: '概念判断', q: '目标从 {t(A), p(D)} 改为 {t(D), p(D)}，松弛计划（RP）怎样变化？', options: ['为支持 t(D) 增加 3 个驾驶动作', '增加 2 个', '增加 1 个', '一个也不增加'], answer: 3, explain: '为了 p(D) 已经要用 ul(D)，它的前提 t(D) 早就由 dr(C,D) 支持并放进了 RPlan；t(A) 本来就在 s 里。所以 RPlan 不变，h_FF 仍是 5。', ctx: false },
      { kind: '概念判断', q: 'Helpful actions 是？', options: ['RPlan 中的所有动作', 'RPlan 中在当前状态可执行的动作', '所有能降低 h 的动作', '所有 best supporter'], answer: 1, explain: 'W5 p.41：an action applicable to s is called helpful if it is contained in RPlan。', ctx: false },
      { kind: '概念判断', q: '为什么由 h_max 或 h_add 得到的最佳支持者函数是 well-founded（support graph 无环）？', options: ['因为 h_max 是 admissible 的', '因为动作代价 > 0 时，沿 support graph 的路径 h 值严格增大，不可能回到起点', '因为 RPlan 是集合', '因为 h+ < ∞'], answer: 1, explain: '若 a = bs(p)，则 a 的每个前提 q 都有 h(q) < h(p)。路径上 h 严格增大，所以没有环。', ctx: false },
      { kind: '概念判断', q: 'FF 规划器用的是？', options: ['GBFS + h_add', 'EHC + 由 h_max 支持者提取的 h_FF + helpful actions 剪枝', 'A* + h_max', '多队列 GBFS + landmarks'], answer: 1, explain: 'W5 p.45。GBFS + h_add 是 HSP；多队列 GBFS + h_FF + landmarks 是 LAMA。', ctx: false }
    ],
    source: 'W5 p.31–46（relaxed plan 的基本思想、best supporter、提取算法、前提 (A)(B)(C)、support graph 的正反例、由 h_max / h_add 得到 closed well-founded 的 bs、正确性、h_FF 的定义与性质、helpful actions、总结、代表系统与评述）；课堂测验（h_FF = 5、目标改为 t(D), p(D) 时 RP 不变）。'
  }
  ]);
})(window);
