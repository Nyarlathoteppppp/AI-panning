/* Content registry. Each part file calls RL.content.add(chapters). */
(function (root) {
  'use strict';
  const RL = root.RL;
  RL.content = {
    parts: [
      { id: 'q1', week: 'W1', title: '规划：模型、语言与复杂度', intro: '什么是 AI planning：用模型描述问题、由求解器自动算出行动方案。经典规划模型及其变体（conformant、MDP、POMDP）；用 STRIPS / PDDL 描述问题；规划问题有多难（PSPACE-complete）。' },
      { id: 'q2', week: 'W2', title: '盲目搜索与宽度搜索', intro: '把规划看成图上的找路：BrFS、DFS、uniform cost、iterative deepening 的完备性、最优性和复杂度；利用状态的原子结构做剪枝的 novelty、IW(k) 与 SIW。' },
      { id: 'q3', week: 'W3', title: '启发式搜索', intro: '启发式函数的四个性质（safe、goal-aware、admissible、consistent）；GBFS、A*、加权 A* 与爬山法、强制爬山法；BFWS 与在模拟器（Atari）上做规划。' },
      { id: 'q4', week: 'W4–W5', title: '松弛与删除松弛启发式', intro: '怎样自动构造启发式：松弛（relaxation）的形式定义；忽略删除效果的 delete relaxation、h+，以及近似它的 h_max、h_add、h_FF 与 helpful actions。' },
      { id: 'p1', week: 'W6-1', title: 'MDP 建模', intro: '为什么动作结果不确定时需要新模型；把问题写成 ⟨S, A, p, r, γ⟩；解是 policy；用 return 和 value 评价 policy。' },
      { id: 'p2', week: 'W6-2', title: '已知模型：Bellman 与动态规划', intro: '把长期价值拆成一步：Bellman 方程。已知模型时用 Policy Evaluation、Policy Iteration、Value Iteration 求最优 policy。' },
      { id: 'p3', week: 'W7', title: '模型未知：RL 入门', intro: '不知道 p 和 r 时只能靠交互。先研究只有一个状态的 Multi-armed Bandit，再把“对回报求平均”推广到 MDP：Monte Carlo Prediction。' },
      { id: 'p4', week: 'W8-1', title: 'MC Control 与 TD', intro: '用 bandit 式探索改进 policy（MC Control）；不等 episode 结束、用下一状态的估计来更新（TD），并比较两者的 bias 和 variance。' },
      { id: 'p5', week: 'W8-2', title: 'n-step、SARSA、Q-learning', intro: '在 MC 与 TD 之间连续调节（n-step、TD(λ)）；两种 TD control：on-policy 的 SARSA 与 off-policy 的 Q-learning。' },
      { id: 'p6', week: 'W9', title: '价值函数近似', intro: '状态太多时不再给每个 (s,a) 存一个数，而是学参数 w：线性特征、梯度更新、特征设计，以及神经网络 Q（概念）。' },
      { id: 'p7', week: 'W10-1', title: 'Policy-based 方法', intro: '不再从 Q 推出动作，而是直接学动作分布：softmax 偏好、REINFORCE、Policy Gradient Theorem 与线性 policy 近似。' },
      { id: 'p8', week: 'W10-2', title: 'Actor-Critic 方法', intro: 'REINFORCE 只用 return 当信号，方差大、容易饱和（机器人例子）。先减去 baseline，再让 critic（价值函数）给 actor（policy）提供评价：Q actor–critic、A2C、TD / n-step / TD(λ) actor–critic。' },
      { id: 'p9', week: 'W11-1', title: 'Monte Carlo Tree Search', intro: '跳出 RL 看决策的全局：离线算出整个 policy 太贵时，改为在线——只为当前状态做决定。MCTS 用 simulator 反复模拟，在当前状态周围长出一棵搜索树（selection、expansion、simulation、backpropagation）；再看 Expectimax 等变体，以及 AlphaGo 家族如何用学到的 policy、value 和 model 改进搜索。' }
    ],
    chapters: [],
    glossary: [],
    formulaSheet: [],
    chain: [],
    howTo: '',
    add(list) { list.forEach(c => this.chapters.push(c)); }
  };
  RL.content.howTo = String.raw`
- **左侧目录**按课件顺序排列：先是 W1–W5 经典规划的 11 章（编号 P1–P11，期末复习用，写得较精简），再是 W6–W11 的 38 章。圆点表示状态：空心＝未读，蓝圈＝读过，绿色＝你标记“已掌握”。
- **每章 10 个环节**可以从顶部的标签直接跳转；顶部细线显示你读到第几个环节。
- **公式逐项解释**：点“下一步”逐项高亮公式中的每一部分（例如 current estimate、learning rate、TD target、TD error），或直接点某一部分。
- **交互可视化**：默认放在每章第 7 个环节，不占右侧位置；宽屏时可以用顶部按钮把它固定到右侧，边读边操作。课件里的每个数值例子（VI 的 0.8/0.872、PI 的 π₀→π₁、MC 的 0.2406、TD 的 0.1718 等）都能在交互中逐步复现。
- **Quiz** 每题都有解释，错选项也有逐项说明；答题记录和“已掌握”标记只保存在当前浏览器（localStorage）。
- **复习工具**：术语表、公式速查表、按题型抽题的综合复习测验。快捷键 Alt + ← / → 切换章节。
- 页面完全离线运行，不需要服务器；课件原文的文本版保存在 ${'`reference/`'} 目录，学习时不需要打开。
`;
  RL.content.firstTime = String.raw`
**不需要任何 RL 基础**：会一点编程、知道“概率”“期望（加权平均）”就够了。左侧目录分两大块：**P1–P11 是 W1–W5 经典规划**（写得紧凑，适合期末复习），**第 1–38 章是 W6–W11 强化学习与 MCTS**（写得最详细，从第 1 章往下读，后面的章节都建立在前面之上）。

**每章建议这样读**（顶部标签可以直接跳转）：
1. 先读 **① 是什么、② 为什么、③ 直觉**——用大白话和例子建立直观印象，不用急着看公式。
2. 再看 **⑥ 数值例子**，跟着算一遍；看不懂某个符号时回到 **④ 数学定义** 和 **⑤ 公式逐项解释**（点“下一步”，公式会一项一项高亮并解释）。
3. 然后在 **⑦ 交互** 里亲手复现数值例子：每个实验上方都写着“这个实验在做什么、怎么用”。
4. 最后看 **⑨ 误区**，做 **⑩ Quiz**。每题都有解释；题目用到地图时会直接附图，不用翻回去。

**遇到看不懂的词**：右上角“术语表”可以搜索中文、英文或符号；“公式速查”汇总了全部公式和每个符号的含义。

前 11 章（P1–P11）是 W1–W5 的经典规划，期末复习用，每章都有考试常见的手算例子和逐步追踪的交互；从第 1 章（W6）开始是强化学习。右边这张 Gridworld 从强化学习第 2 章起几乎每章都会用到，先记住它的编号和规则。
`;
  RL.content.chain = [
    { label: 'STRIPS / PDDL', id: 'a02' }, { label: '盲目搜索', id: 'a03' }, { label: 'IW', id: 'a04' }, { label: '启发式性质', id: 'a05' }, { label: 'A*', id: 'a06' }, { label: '松弛', id: 'a08' }, { label: 'h+ / h_max / h_add', id: 'a10' }, { label: 'h_FF', id: 'a11' },
    { label: 'MDP', id: 'c02' }, { label: 'State / Action / Reward / Transition', id: 'c02' }, { label: 'Policy', id: 'c04' },
    { label: 'Return', id: 'c05' }, { label: 'V(s)', id: 'c06' }, { label: 'Q(s,a)', id: 'c06' }, { label: 'Bellman 方程', id: 'c07' },
    { label: 'Policy Evaluation', id: 'c08' }, { label: 'Policy Iteration', id: 'c09' }, { label: 'Value Iteration', id: 'c10' },
    { label: 'Bandit', id: 'c13' }, { label: 'Monte Carlo', id: 'c15' }, { label: 'MC Control', id: 'c16' }, { label: 'TD', id: 'c17' },
    { label: 'n-step / TD(λ)', id: 'c19' }, { label: 'SARSA', id: 'c20' }, { label: 'Q-learning', id: 'c21' },
    { label: '函数近似', id: 'c23' }, { label: 'DQN（概念）', id: 'c25' }, { label: 'REINFORCE', id: 'c27' }, { label: 'Policy Gradient', id: 'c28' }, { label: 'Baseline', id: 'c30' }, { label: 'Actor-Critic', id: 'c31' },
    { label: '在线规划', id: 'c32' }, { label: 'MCTS', id: 'c33' }, { label: 'UCT', id: 'c34' }, { label: 'Expectimax', id: 'c36' }, { label: 'AlphaGo 家族', id: 'c37' }
  ];
})(window);
