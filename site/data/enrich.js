/* 整合原图文课程（RL_visual_course.html / notebook）的教学图、深入讲解、代码与误区。
 * 每个条目按章节 id 合并进 data/part*.js 中的章节对象：
 *   figure: [{src, caption}]  显示在“直觉”环节末尾
 *   extra: {section: markdown}  追加到对应环节
 *   morePitfalls / moreQuiz: 追加到误区 / Quiz */
(function (root) {
  'use strict';
  const R = String.raw;
  const fig = (src, caption) => ({ src, caption });
  const E = {
    c01: {
      figure: [fig('04_mdp.jpg', '原课程教学图：Bandit 每次回到同一个选择点；MDP 中动作会改变下一次所处的局面。')],
      extra: { compare: R`
:::note MDP 是“模型形式”，model-based / model-free 是“求解方式”
MDP 描述世界怎样运行（$S,A,p,r,\gamma$）。是否**知道** $p,r$ 是另一个问题：知道就用规划（W6-2），不知道就从经验学习（W7 起）。两者不是同一层面的分类。
:::` }
    },
    c02: {
      extra: { intuition: R`
**读格子时区分“动作”与“位移”**：在墙左边的 $s_5$ 选 East，按预期的那条分支（0.8）也会撞墙留在原地。所以“成功概率 0.8”不等于“位置改变的概率 0.8”。在角落里两条不同方向的分支还可能落到同一格，按 $p(s'\mid s,a)$ 写模型时要把它们加起来；可视化里把三条分支分行显示，是为了保留每条分支的来源，先分行加权再求和与先合并概率完全等价。

**图上的 +1 / −1 是奖励标记**：表示**进入**终点那次转移得到的奖励，不是“待在那里每一步都再领一次”。这个约定决定了后面 Bellman backup 和 TD 更新中终止项怎样处理。` }
    },
    c03: {
      figure: [fig('05_state_action_reward_transition.jpg', '原课程教学图：一次交互 $(s, a, r, s\')$ 与环境循环。'),
        fig('04b_markov_property.jpg', '原课程教学图：state 必须概括与未来相关的历史。')],
      extra: { intuition: R`
### 用“钥匙”检查状态是否足够

设想地图上多了一扇要钥匙才能打开的门。同样站在门口，有钥匙和没钥匙时执行“进入”的结果不同；如果状态只记录位置，这两段历史就被混为一谈，Markov 性质不成立。把“是否持有钥匙”加入状态后才恢复 Markov 性。汽车也是一样：同一位置、不同速度会到达不同的下一位置，所以状态要包含速度。

**判断方法**：找两段最后得到**相同状态表示**的历史，固定同一个动作，比较后继和奖励的**分布**是否仍有差别。有差别，说明表示漏掉了相关变量。

:::warn Markov ≠ deterministic
随机 Gridworld 中两次在同一格选 North 可以走到不同位置，这完全符合 Markov 性质。Markov 说的是“分布只由当前状态和动作决定”，不是“结果唯一”。
:::

State 也可以由历史**计算**出来（例如剩余资源是此前消耗的累计）。只要这个摘要足以预测未来，就不必保存全部历史。部分可观测时不能把不充分的观测直接当成 Markov state。`,
        example: R`
**一条记录怎么存**：程序里常把一步写成 s, a, r, next_s（再加一个 done 标志）。有些算法省略时间下标写成 $S,A,R,S',A'$：当前状态、当前动作、刚收到的奖励、下一状态、下一动作；撇号表示“下一步”，不是求导。SARSA 会用到全部五个量。

模型中的所有可能分支，与一次经验中**实际出现**的那一个分支要分开：动作滑移到下方格子，就记录那个实际结果，而不是本来想去的格子。` },
      morePitfalls: [{ wrong: '把“本来想去的格子”记作 $S_{t+1}$。', right: '记录的是实际到达的后继。课件 Episode 2 中 $s_1$ 选 Up 却滑到 $s_2$，记录的就是 $S_1=s_2$。' }]
    },
    c04: {
      figure: [fig('07_policy.jpg', '原课程教学图：policy 负责选择，value 负责评价。图中各面板的数字只是独立的示意，不属于同一张价值表，也不是课程 Gridworld 的结果。')],
      extra: { compare: R`
:::tip 最优 policy 为什么可以是确定的（直觉）
当每个动作正确的长期价值都已知时，按概率**混合**几个动作得到的只是它们的加权平均，不会超过其中的最大值；直接选最大值的那个动作就够了。环境仍然会滑移——这个结论没有消除环境随机性，只是说智能体自己不必掷骰子。

但“存在确定的最优 policy”不等于“学习时可以不探索”：前者讨论**已知正确价值**后怎样选，后者讨论**价值未知**时怎样收集证据（W7 起）。若任务只剩有限步，同一位置在“还剩 1 步”和“还剩 10 步”时可能需要不同动作，最优 policy 就会依赖时间。
:::` }
    },
    c05: {
      figure: [fig('06_return_and_gamma.jpg', '原课程教学图：reward 是即时的，return 是长期的。')],
      extra: { math: R`
**continuing 任务为什么有限**：若每步奖励的绝对值不超过 $R_{\max}$ 且 $\gamma<1$，则
$$|G_t|\le\sum_{k\ge0}\gamma^kR_{\max}=\frac{R_{\max}}{1-\gamma}.$$
γ 决定**越晚的奖励打折越多**（按时间远近加权），不是学习率，也不是探索概率。`,
        example: R`
用代码算同一件事（原课程代码单元）：

${'```'}python
# 从一条 realised reward sequence 计算 discounted return
rewards = [0, 0, 1]
gamma = 0.9
G = sum((gamma ** k) * r for k, r in enumerate(rewards))
print("G_t =", G)   # 0.81
${'```'}` },
      morePitfalls: [
        { wrong: '走了三步，最后的奖励就乘 $\\gamma^3$。', right: '第一笔未来奖励是 $R_{t+1}$，指数为 0。奖励 $(0,0,1)$ 的 return 是 $0+\\gamma\\cdot0+\\gamma^2\\cdot1$。但若只观察两步、再用 $V(S_{t+2})$ 补未来，这个价值要乘 $\\gamma^2$——它从两步之后开始计价。奖励下标与 bootstrap 时点不同，是 n-step 公式最常见的错位来源。' },
        { wrong: '终止状态价值设成 1，再在前一步加 $\\gamma V(\\text{terminal})$。', right: '这会把同一次终点奖励重复计算。进入终点的转移已经支付了 $+1$，终止状态价值为 0。' }
      ]
    },
    c06: {
      figure: [fig('08_v_vs_q.jpg', '原课程教学图：V 评价一个状态，Q 评价一个状态—动作对。这是一张独立的示意网格（坐标从 1 开始、没有墙和终点），不是课程 Gridworld，数字也不是课程结果。')],
      extra: { compare: R`
**有了价值，怎样选动作？**

- **已知 $p,r$**：只存 $V(s)$ 就能比较动作——把每个动作展开一步，算 $\sum p[r+\gamma V(s')]$。
- **不知道模型**：手里即使有 $V(s')$，也不知道每个动作会以什么概率到哪些 $s'$，无法比较动作；直接学 $Q(s,a)$ 才能用 $\arg\max_aQ(s,a)$ 选动作。这就是 W7–W8 的 model-free 方法都学 Q 的原因。

**max 与 argmax**：$\max_aQ(s,a)$ 返回“最好有多好”（一个数），$\arg\max_aQ(s,a)$ 返回“哪个动作最好”（一个动作）。写 policy improvement 和 Q-learning 时不要把两者混用。

**检查自己读对了下标**：$q_\pi(s,\text{East})$ 只承诺第一步 East，此后按 $\pi$；$v_\pi(s)$ 连第一步都交给 $\pi$。即使第一步、即时奖励和模型都不变，换掉后续 policy，两者也会一起变。` },
      moreQuiz: [{ kind: '公式计算', q: '两个动作的真实长期价值是 0.8 和 0.2，policy 以 0.75 和 0.25 选择它们。$v_\\pi(s)$ 是多少？', answer: 0.65, tol: 0.001, explain: '$0.75\\times0.8+0.25\\times0.2=0.65$，不是 0.8。只有最优值才有 $v_*=\\max_a q_*$。' }]
    },
    c07: {
      figure: [fig('09_bellman_equation.jpg', '原课程教学图：价值 = 现在一步 + 之后的价值，三层递进。')],
      extra: { math: R`
:::key max 为什么在概率求和的**外面**
$$v_*(s)=\max_a\sum_{s'}p(s'\mid s,a)\big[r+\gamma v_*(s')\big]$$
智能体必须先选一个动作，然后才知道随机结果。如果把 max 移到每个结果里面，就好像允许智能体看到随机结果之后再倒过来选动作——解决的已经不是原问题。环境的随机性不能被 max 消掉，最优 policy 也要承担滑移风险。
:::

读 expectation 方程时：先固定动作，看一个可能的后继 $s'$——这条分支的长期结果是它的即时奖励加折扣后的后续价值；再乘该分支的概率，对所有后继求和；第二个式子 $v_\pi=\sum_a\pi q_\pi$ 才处理动作选择的随机性。对 $s'$ 求和不是说智能体同时去了所有格子，而是把互斥结果按概率平均。`,
        example: R`
**一次随机 backup 的代码**（原课程代码单元；三个后继价值取 0.8、0.2、0.5，奖励都为 0）：

${'```'}python
# 一次 stochastic Bellman backup：三个互斥 successor outcomes
gamma = 0.9
prob = [0.8, 0.1, 0.1]
reward = [0.0, 0.0, 0.0]
next_value = [0.8, 0.2, 0.5]
q_sa = sum(p * (r + gamma * v) for p, r, v in zip(prob, reward, next_value))
print(f"Q(s,a) = {q_sa:.3f}")   # 0.9 × (0.8×0.8 + 0.1×0.2 + 0.1×0.5) = 0.639
${'```'}

Bellman 方程描述的是正确价值必须满足的**自洽关系**；把当前估计代进去并重复计算，才构成第 8、10 章的迭代算法。` }
    },
    c08: {
      figure: [fig('10_policy_evaluation.jpg', '原课程教学图：固定 policy，只更新它的价值。注意图中的数字只是示意（大致相当于动作不会打滑），不是课程 Gridworld（0.8 / 0.1 / 0.1 打滑、进入终点时给奖励）的结果；例如课程规则下第一轮评估，终点左边那格向右的价值是 0.8 而不是 0.9。课程的实际数字以本章数值例子和交互为准。')],
      extra: { math: R`
**为什么反复 backup 会收敛（contraction 的直觉）**：两张价值表在任意状态上的最大差距，经过一次按概率的加权平均不会被放大，再乘 $\gamma$ 还会缩小到最多原来的 $\gamma$ 倍。所以每轮误差至少乘一次 $\gamma$，表会趋向唯一的 $v_\pi$。$\max_s|V_{k+1}(s)-V_k(s)|$ 足够小时即可停止——这个阈值描述的是“估计不再变化”，不代表 policy 已经最优。

这里 $k$ 是**计算轮数**，不是环境交互的时刻 $t$。同步版本读 $V_k$、写 $V_{k+1}$；原地更新会立即使用本轮新值，数值传播顺序不同，但仍围绕同一个固定 policy。`,
        example: R`
**一个更小的例子：为什么不能只算一轮**

某状态按固定 policy 以 0.5 进入终点得到 1，以 0.5 留在原地（奖励 0），$\gamma=0.9$。它满足
$$v=0.5\cdot1+0.5\cdot0.9\,v=0.5+0.45v\ \Rightarrow\ v=\frac{0.5}{0.55}=\frac{10}{11}\approx0.9091.$$
从 0 开始迭代：0.5 → 0.725 → 0.82625 → … → 0.9091。第一轮漏掉的不是即时奖励，而是“这次没成功，以后还能再试”的未来价值。` },
      moreQuiz: [{ kind: '公式计算', q: '某状态按固定 policy 以 0.5 得到 1 并终止、以 0.5 原地不动（奖励 0），$\\gamma=0.9$。从 $V_0=0$ 迭代，$V_2$ 是多少？', answer: 0.725, tol: 0.0005, explain: '$V_1=0.5$；$V_2=0.5+0.45\\times0.5=0.725$。精确值是 $10/11\\approx0.9091$。' }]
    },
    c09: {
      figure: [fig('11_policy_improvement.jpg', '原课程教学图：用价值选出更好的动作。')],
      extra: { math: R`
**为什么贪心改进有依据**：原 policy 的动作也是候选之一，所以每个状态都有
$$q_{\pi_k}\big(s,\pi_{k+1}(s)\big)=\max_aq_{\pi_k}(s,a)\ \ge\ q_{\pi_k}\big(s,\pi_k(s)\big)=v_{\pi_k}(s).$$
“先按新规则选一次、之后回到旧规则”的期望回报至少不差；把同样的论证用到后续每一步，就得到 $v_{\pi_{k+1}}(s)\ge v_{\pi_k}(s)$。这个结论用的是**准确的**旧 policy 价值；如果价值估计误差很大（例如从少量经验学来的），每次贪心改动就没有同样严格的保证。

**“只向前看一步”≠“只看即时奖励”**：括号里的 $v_{\pi_k}(s')$ 已经总结了之后的全部未来。一个眼前奖励为 0、却能把你带到好状态的动作，可以胜过眼前有小奖励但未来很差的动作。`,
        example: R`
**改了 policy 为什么还要再评价**：某格旧 policy 选 North，四个动作的 $Q^{\pi_k}$ 为 0.5、0.2、0.7、0.4，于是改选 0.7 的动作。但 0.7 仍是“第一步换动作、以后按**旧** policy”的评价；新 policy 在别的格子也换了动作，真实的新价值必须重新 evaluation。` }
    },
    c10: {
      figure: [fig('12_policy_iteration_vs_value_iteration.jpg', '原课程教学图：PI 把评估与改进分开，VI 把它们合在每次 backup 中。')],
      extra: { example: R`
### 照着做的伪代码（原课程整理）

${'```'}python
# Value Iteration（V_old 是本轮开始时的副本；终止状态的价值固定为 0）
V = {s: 0 for s in S}
while True:
    V_old = dict(V)
    for s in nonterminal_states:
        Q = {a: sum(p * (r + gamma * V_old[s2]) for s2, r, p in outcomes(s, a)) for a in A}
        V[s] = max(Q.values())
    if max(abs(V[s] - V_old[s]) for s in S) < eps:
        break
policy = {s: argmax_a(sum(p * (r + gamma * V[s2]) for s2, r, p in outcomes(s, a))) for s in nonterminal_states}

# Policy Iteration
pi = initial_policy()
while True:
    V = solve_linear_equations(pi)          # 精确评估（或迭代到足够准确）
    stable = True
    for s in nonterminal_states:
        best = argmax_a(sum(p * (r + gamma * V[s2]) for s2, r, p in outcomes(s, a)))
        if Q(s, best) > Q(s, pi[s]):        # 平局时保留原动作
            pi[s], stable = best, False
    if stable:
        break
${'```'}

VI 的一次循环只更新价值；PI 的一轮包含“完整评价 + 改进策略”，所以**不能只比较循环次数来判断谁更快**。

**为什么不能一看到“每个格子都有非零数”就停**：地图有随机滑移和原地停留，收益传播到所有格子以后仍要继续校正。transcript 也指出：某个动作连续几轮看似最好，后续仍可能因远处价值变化而被替换。` }
    },
    c11: {
      figure: [fig('12b_generalised_policy_iteration.jpg', '原课程教学图：evaluation 与 improvement 相互追赶。')],
      extra: { compare: R`
**从规划衔接到经验学习**：后面的 model-free control 也重复这两个过程，只是 evaluation 不再枚举完整模型，而是用采到的经验修正 $Q$。例如更新某个 $Q(s,a)$ 后让训练 policy 对新表保持 ε-greedy，就把价值学习和策略改进连接起来。这里的 improvement **不是**每一步都彻底取消探索，而是在保留探索的同时，让更多概率移向当前较好的动作。统一视角并不意味着任意穿插方式都自动收敛，具体收敛仍依赖算法和问题条件。` }
    }
  };
  root.RL.content.enrich = function (map) {
    Object.entries(map).forEach(([id, add]) => {
      const c = root.RL.content.chapters.find(x => x.id === id);
      if (!c) return;
      if (add.figure) c.figure = [].concat(c.figure || [], add.figure);
      if (add.extra) { c.extra = c.extra || {}; Object.entries(add.extra).forEach(([k, v]) => { c.extra[k] = (c.extra[k] ? c.extra[k] + '\n\n' : '') + v; }); }
      if (add.morePitfalls) c.morePitfalls = (c.morePitfalls || []).concat(add.morePitfalls);
      if (add.moreQuiz) c.moreQuiz = (c.moreQuiz || []).concat(add.moreQuiz);
    });
  };
  root.RL.content.enrich(E);

  // 读者提问整合：Bellman optimality 与“枚举所有 policy 取最大”的关系；是否要走到终点才知道好坏。
  root.RL.content.enrich({
    c07: { extra: { compare: String.raw`
:::note 常见疑问 1：optimality 不就是“把所有 policy 的 expectation 算一遍，取最大”吗？
**结果上是**：定义 $v_*(s)=\max_\pi v_\pi(s)$ 就是在所有 policy 里取最好的。

**做法上不是**：Bellman optimality 方程不枚举 policy，只在每个状态比较几个**动作**：
$$v_*(s)=\max_a\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma\,v_*(s')\big]$$
为什么比较动作就够：不管第一步选什么，之后能做到的最好结果就是 $v_*(s')$——“后面的最优”已经装在 $v_*(s')$ 里，只剩第一步要决定。

| | 枚举所有 policy | Bellman optimality（VI） |
|---|---|---|
| 要比较的对象 | Gridworld 有 $4^9=262{,}144$ 个确定性 policy | 每个状态 4 个动作 |
| 每个对象的成本 | 解一组 9 元线性方程（Policy Evaluation） | 一次一步期望 |
| 结果 | $v_*$ 与 $\pi^*$ | 同样的 $v_*$ 与 $\pi^*$ |

而且有一个定理保证：有限、折扣的 MDP 一定存在**同一个**确定性 policy 在所有状态上同时达到最大，所以“每个状态各取最好动作”拼出来的就是整体最优 policy。
:::

:::note 常见疑问 2：选得好不好，不是要走到终点、拿到反馈才知道吗？
**要看模型知不知道。**

- **模型已知（W6，本章）**：不用真的走。$p$ 和 $r$ 已经写明每一步会到哪、拿多少，终点的“反馈”就是 $r(s_{10},\cdot,s_{11})=+1$ 这一项。Value Iteration 从终点往回推：第 1 轮只有 $s_{10}$ 得到 0.8，第 2 轮 $s_9$、$s_6$ 也有了值……每一轮把终点的信息往前传一格——相当于在纸上把“走到终点”的所有可能按概率算完。
- **模型未知（W7 起）**：必须真的走。**Monte Carlo** 正是“走到终点看实际 return”；**TD** 不等到终点，用下一状态的估计 $V(S')$ 代替“剩下的路”。

另外，真的走一次得到的 return 只是一个随机样本；“有多好”指的是**期望**——模型已知时可以直接算，未知时才要靠多次采样估计。
:::` } }
  });

  // 读者提问整合：“不知道之后怎么走，怎么决定第一步？”——VI 的“剩 k 步”解释。
  root.RL.content.enrich({
    c10: { extra: { intuition: String.raw`
:::key 不知道“之后”，怎么决定“第一步”？——把 $V_k$ 读成“只剩 $k$ 步时的最优价值”
从 $V_0=0$ 开始做同步的 optimality backup，第 $k$ 轮的 $V_k(s)$ 恰好是：**如果只剩 $k$ 步可走，从 $s$ 出发最好能拿到的期望折扣回报**。

- **剩 0 步**：什么也做不了，$V_0=0$——这是确定的，不是猜的。
- **剩 1 步**：“之后”就是 $V_0=0$，只看这一步的奖励。只有 $s_{10}$ 一步能进 $+1$：$V_1(s_{10})=0.8$。
- **剩 2 步**：第一步之后还剩 1 步，而“剩 1 步最好能拿多少”上一轮已经算好了（$V_1$）。$V_2(s_9)=0.8\times0.9\times0.8=0.576$。
- **剩 k 步**：第一步怎么选，只需查上一轮的 $V_{k-1}$。每一轮里“之后的价值”都是**已经算好的**，没有循环依赖。

| $k$ | $V_k(s_{10})$ | $V_k(s_9)$ | $V_k(s_1)$ |
|---|---|---|---|
| 1 | 0.800 | 0 | 0 |
| 2 | 0.872 | 0.576 | 0 |
| 3 | 0.921 | 0.732 | 0 |
| 4 | 0.934 | 0.795 | 0 |
| 5 | 0.939 | 0.816 | **0.237** |
| 6 | 0.941 | 0.823 | 0.383 |
| ∞ | 0.942 | 0.827 | 0.545 |

$s_1$ 离终点最少 5 步，所以 $V_1$ 到 $V_4$ 里它都是 0，直到“剩 5 步”才第一次看得到终点。

**无限步**：让 $k$ 继续变大。因为 $\gamma<1$，越远的奖励权重越小（$0.9^{50}\approx0.005$），$V_k$ 的变化越来越小，最后停在 $v_*$。等它收敛后，再对每个状态取 $\arg\max$ 得到第一步怎么走——中间轮次的“最好动作”还可能改变。
:::` } },
    c07: { extra: { compare: String.raw`
:::note 常见疑问 3：可是“之后的” $v_*(s')$ 我们也不知道，怎么用它来选第一步？
用 **Value Iteration（VI，价值迭代，第 10 章）**：先把“之后”设成“没有之后”（$V_0=0$），算出“只剩 1 步”时的最优价值 $V_1$；再用 $V_1$ 当作“之后”，算出“只剩 2 步”的 $V_2$……每一轮里“之后的价值”都是上一轮已经算好的，所以没有循环依赖。$k$ 足够大时 $V_k$ 不再变化，就是 $v_*$。第 10 章“直觉”环节有逐轮的数字表。
:::` } }
  });
})(window);

/* 读者反馈整合（Quiz 解释）：把“只写结论”的解释改成完整分支 + 说明每个 0 的来源。按章节 id 与题号（从 1 数）覆盖 explain。 */
(function (root) {
  'use strict';
  const R = String.raw;
  const X = {
    c07: { 2: R`三条分支都要算：
$$Q_2(s_{10},W)=\underbrace{0.8\,[0+0.9\,V_1(s_9)]}_{\text{按预期向西到 }s_9}+\underbrace{0.1\,[0+0.9\,V_1(s_6)]}_{\text{左滑（向南）到 }s_6}+\underbrace{0.1\,[0+0.9\,V_1(s_{10})]}_{\text{右滑（向北）撞墙留在 }s_{10}}=0+0+0.1\times0.9\times0.8=0.072$$
$s_9$、$s_6$ 那两项为 0，不是因为到了那里就没希望，而是 $V_1$ 是“只剩 1 步”的价值：从 $s_9$ 或 $s_6$ 一步之内拿不到 +1，所以表里还是 0。
用真实价值（$V^*(s_9)=0.827$、$V^*(s_6)=0.635$、$V^*(s_{10})=0.942$）时：$0.8\times0.9\times0.827+0.1\times0.9\times0.635+0.1\times0.9\times0.942=0.7375$，与课件最终 Q 表一致。` },
    c08: { 1: R`方程是这样来的：$s_4=(3,0)$ 选 Right——按预期向东撞右边界留在 $s_4$（0.8）；左滑（向北）进入 $s_7$，得 $-1$ 并终止（0.1）；右滑（向南）撞下边界留在 $s_4$（0.1）。所以
$$V(s_4)=0.9\,[0+0.9\,V(s_4)]+0.1\,[-1+0]\ \Rightarrow\ V(1-0.81)=-0.1\ \Rightarrow\ V=-0.5263$$
它为负：一直向右撞墙永远到不了 +1，而每一步都有 0.1 的概率滑进 $-1$。这是精确解，与课件一致。` },
    c09: { 4: R`比较两个动作的真实 Q 值（用 $V^*(s_3)=0.528$、$V^*(s_4)=0.308$）：
- **↑**：0.8 直接进入 $s_7$（$-1$）；左滑（向西）到 $s_3$；右滑（向东）撞墙留在 $s_4$。$Q=0.8\times(-1)+0.1\times0.9\times0.528+0.1\times0.9\times0.308=-0.725$。
- **←**：0.8 到 $s_3$；左滑（向南）撞墙留在 $s_4$；右滑（向北）进入 $s_7$。$Q=0.8\times0.9\times0.528+0.1\times0.9\times0.308+0.1\times(-1)=0.308$。

向左只有 0.1 的概率掉进 $-1$，向上是 0.8。` },
    c10: {
      1: R`$s_9$ 选 East 的三条分支：
$$V_2(s_9)\ge Q_2(s_9,E)=\underbrace{0.8\,[0+0.9\,V_1(s_{10})]}_{\text{向东到 }s_{10}}+\underbrace{0.1\,[0+0.9\,V_1(s_9)]}_{\text{左滑（向北）撞边界}}+\underbrace{0.1\,[0+0.9\,V_1(s_9)]}_{\text{右滑（向南）撞墙 (1,1)}}=0.576+0+0=0.576$$
两次滑动都留在 $s_9$，而 $V_1(s_9)=0$——“只剩 1 步”时 $s_9$ 到不了终点，并非 $s_9$ 没有价值。其他动作：North 0.072、South 0.072、West 0，所以 East 最好，$V_2(s_9)=0.576$。（收敛后 $V^*(s_9)=0.827$。）`,
      2: R`三条分支：
- 向北 0.8 到 $s_{10}$：$0.8\times(0+0.9\times0.8)=0.576$；
- 左滑（向西）撞墙 (1,1) 留在 $s_6$：$0.1\times(0+0.9\times V_1(s_6))=0$——$V_1(s_6)=0$ 是因为“只剩 1 步”时 $s_6$ 最好的选择是向西（不冒险），拿到 0；
- 右滑（向东）进入 $s_7$：$0.1\times(-1+0)=-0.1$——这一项是**真实的负奖励**，终止状态之后没有未来。

合计 $0.476$。收敛后 $Q^*(s_6,N)=0.635$。`
    },
    c15: { 3: R`$G_0=R_1+\gamma R_2+\gamma^2R_3+\gamma^3R_4+\gamma^4R_5+\gamma^5R_6$。前五步奖励都是 0，只有第 6 个奖励 $R_6=-1$，它的系数是 $\gamma^5$：$G_0=0.9^5\times(-1)=-0.59049$。
注意：起点自己这一步的奖励是 0，但 MC 把整条 episode 最后的结果（掉进 $-1$）折扣后算给了**之前的每一步**——这就是“return”与“reward”的区别。` },
    c17: { 3: R`Q 初始全为 0，用 TD（target $=R+\gamma Q(S',\pi(S'))$）走 Episode 1：
- 前四步（$s_1\to s_5\to s_8\to s_9\to s_{10}$）奖励都是 0，target 里的 $Q(S',\cdot)$ 也还是 0，所以 target $=0$，Q 不变；
- 最后一步进入终止状态 $s_{11}$，target 就是真实奖励 1：$Q(s_{10},\text{R})=0+0.1\times(1-0)=0.1$。

这不是说前面几步的动作没有价值，而是 TD 每次只看**下一步**的估计，而这些估计还没学到东西。在这个 Q 从 0 开始、路线不重复的例子里，信息每条 episode 只往回多传一格：Episode 2 中 $s_6$ 才从 $Q(s_{10},\text{R})=0.1$ 得到 0.009。对比 MC：同一条 episode 结束后，5 个 Q 都会更新（1、0.9、0.81、0.729、0.6561）。` },
    c18: { 1: R`$s_{10}$ 选 Up 撞上边界，下一状态仍是 $s_{10}$。这里的更新用的是刚选的 Up 在 $s_{10}$ 的 Q 值作 bootstrap：$0.86$。在这张表里 Up 恰好也是 $s_{10}$ 最大的（0.86 > Right 0.8527），所以 SARSA（下一步仍选 Up 时）和 Q-learning（用 max）在这一步得到同一个 target；如果 SARSA 已经抽出了别的 $A'$，就要用那个 $A'$ 的 Q，不能改用 max。
$$Y=0+0.9\times0.86=0.774,\qquad \delta=0.774-0.86=-0.086,\qquad Q\leftarrow0.86+0.2\times(-0.086)=0.8428$$
含义：撞墙回到原地、白白多付一次折扣，说明 Up 没有原来以为的那么好。0.8428 已低于 Right 的 0.8527，贪心动作立刻变成 Right（按贪心选时下次就选 Right；保留 ε 探索时是更倾向 Right）——policy 在 episode 中途就变了。` },
    c19: { 1: R`$$G^{(2)}_t=R_{t+1}+\gamma R_{t+2}+\gamma^2V(S_{t+2})=0+0.9\times0+0.81\times0.8=0.648$$
两个真实奖励都是 0，所以只剩 bootstrap 项；它乘的是 $\gamma^2$（不是 $\gamma$），因为这个估计从两步之后才开始计价。` },
    c20: { 1: R`SARSA 用的是**实际选出的** $A'$ 的价值 0.4（即使 $S'$ 里可能有更大的 Q，比如探索时没选那个动作）：
$$Y=0+0.9\times0.4=0.36,\qquad \delta=0.36-0.5=-0.14,\qquad Q\leftarrow0.5+0.1\times(-0.14)=0.486$$
估计下调：下一步实际要走的选择不如原来预期。` },
    c21: {
      1: R`Q-learning 用 $S'$ 一行里**最大**的 Q（0.8），不管下一步实际执行哪个动作：
$$Y=0+0.9\times\max(0.3,0.8,0.2,0.4)=0.72,\qquad \delta=0.72-0.5=0.22,\qquad Q\leftarrow0.5+0.1\times0.22=0.522$$
同一条经验若用 SARSA（假设实际选了 0.4 的动作）会得到 0.486——差别只在 target 里接哪个动作。`,
      2: R`$$\Delta=r(s_{10},\text{Right},s_{11})+\gamma\max_bQ(s_{11},b)-Q(s_{10},\text{Right})=1+0.9\times0-0=1,\qquad Q=0+0.1\times1=0.1$$
这里 $\max_bQ(s_{11},b)=0$ 是**按定义**为 0：$s_{11}$ 是终止状态，之后没有未来（不是“还没学到”）。$Q(s_{10},\text{Right})=0$ 才是“还没学到”的初始值。`,
      3: R`Q 初始全为 0。前 4 步奖励为 0，而且下一状态那一行的最大 Q 也都还是 0，所以 target $=0+0.9\times0=0$，Q 不变；只有最后一步进入终止状态，target 是真实奖励 1，得到 0.1。
不是前面的动作没有价值，而是 Q-learning 每次只读**下一状态**的估计，而那些估计还是空的。再跑一条同样的 episode：$Q(s_{10})$ 变成 0.19，$Q(s_9)$ 才第一次变成 $0.1\times0.9\times0.1=0.009$——在这种路线不重复的例子里，信息每条 episode 往回多传一格。`
    },
    c26: {
      1: R`灰格都向右时，从 w1 出发：w1 → g1（$R_1=0$），g1 向右 → w2（$R_2=0$），w2 向下进钱袋（$R_3=+1$）。
$$G=0+0.9\times0+0.9^2\times1=0.81$$`,
      2: R`逐个起点看（灰格都向右，w1→、w2↓、w3←）：
- w1：w1 → g1 → w2 ↓，到达；
- g1：g1 → w2 ↓，到达；
- w2：直接 ↓，到达；
- g2：g2 → w3，w3 ← 回到 g2，g2 又 → w3……永远循环；
- w3：w3 ← g2 → w3……同样永远循环。

5 个起点中 3 个能到：$3/5=0.6$。`
    },
    c27: { 3: R`$G_1$ 从时刻 1 开始算：$G_1=R_2+\gamma R_3=0+0.9\times1=0.9$。再乘 $\gamma^t=\gamma^1$：$0.9\times0.9=0.81$。
（同理 $\gamma^0G_0=0.81$、$\gamma^2G_2=0.81$——三个时刻的权重都等于这份奖励在原始时间轴上的折扣值。）` }
  };
  Object.entries(X).forEach(([id, map]) => {
    const c = root.RL.content.chapters.find(x => x.id === id);
    if (!c) return;
    const all = (c.quiz || []).concat(c.moreQuiz || []);
    Object.entries(map).forEach(([n, text]) => { if (all[n - 1]) all[n - 1].explain = text; });
  });
})(window);

/* 读者反馈整合（更多“公式逐项解释”）：把正文里只静态显示的关键公式也做成可逐项高亮的讲解。 */
(function (root) {
  'use strict';
  const R = String.raw;
  const F = {
    c02: [{
      title: '矩阵表示：$P^a_{ij}$ 的行、列和动作',
      latex: R`\htmlClass{fx-pa}{P^{\htmlClass{fx-a}{a}}_{\htmlClass{fx-i}{i}\htmlClass{fx-j}{j}}}=P_a(s_j\mid s_i),\qquad \htmlClass{fx-sum}{\sum_{j=1}^{n}P^a_{ij}=1}`,
      parts: [
        { key: 'a', label: '上标 a：每个动作一张矩阵', color: 'orange', text: 'Gridworld 有 4 个动作，所以有 $P^N,P^E,P^S,P^W$ 四张 $n\\times n$ 的矩阵。' },
        { key: 'i', label: '行 i：出发状态', color: 'blue', text: '第 $i$ 行描述“在 $s_i$ 执行 $a$ 之后”会去哪里。' },
        { key: 'j', label: '列 j：到达状态', color: 'green', text: '第 $j$ 列是候选后继 $s_j$。到不了的格子就是 0。' },
        { key: 'pa', label: '矩阵元素 = 一个转移概率', color: 'purple', text: '例：$s_8$ 选 North，第 $s_8$ 行只有两个非零元素：$P^N_{8,8}=0.9$，$P^N_{8,9}=0.1$。' },
        { key: 'sum', label: '每一行加起来为 1', color: 'gray', text: '执行动作后一定会落在某个状态（可能是原地），所以一行是一个完整的概率分布。列加起来不一定是 1。' }
      ]
    }],
    c06: [{
      title: '最优价值：对 policy 取 max，等于对动作取 max',
      latex: R`\htmlClass{fx-vs}{v_*(s)}=\htmlClass{fx-maxpi}{\max_\pi v_\pi(s)}=\htmlClass{fx-maxa}{\max_a q_*(s,a)}`,
      parts: [
        { key: 'vs', label: '最优状态价值', color: 'blue', text: '从 $s$ 出发，按最好的方式行动，期望能拿到的最多回报。Gridworld 中 $v_*(s_1)=0.5452$。' },
        { key: 'maxpi', label: '定义：在所有 policy 里取最好', color: 'purple', text: '这是**定义**：把每个 policy 在 $s$ 的价值都算出来取最大。直接这样算要枚举 $4^9$ 个 policy，不现实。' },
        { key: 'maxa', label: '等价写法：只比较第一步的动作', color: 'orange', text: '$q_*(s,a)$ 是“第一步做 $a$，之后都按最优走”。所以只要比较第一步的几个动作就够了——这就是第 7 章 Bellman optimality 方程和第 10 章 VI 的出发点。' }
      ]
    }],
    c07: [{
      title: '完整的 Bellman expectation 方程：两层平均',
      latex: R`v_\pi(s)=\htmlClass{fx-pi}{\sum_a\pi(a\mid s)}\ \htmlClass{fx-env}{\sum_{s'}p(s'\mid s,a)}\big[\htmlClass{fx-r}{r(s,a,s')}+\gamma\,\htmlClass{fx-v}{v_\pi(s')}\big]`,
      parts: [
        { key: 'pi', label: '第一层：按 policy 平均动作', color: 'orange', text: '智能体以 $\\pi(a\\mid s)$ 的概率选每个动作——**智能体的随机性**。确定性 policy 时只有一个动作的权重是 1。' },
        { key: 'env', label: '第二层：按环境平均后继', color: 'gray', text: '选定动作后，环境以 $p(s\'\\mid s,a)$ 把你送到不同后继——**环境的随机性**（0.8/0.1/0.1）。' },
        { key: 'r', label: '这一步的奖励', color: 'green', text: '每条分支自己的即时奖励。' },
        { key: 'v', label: '之后的价值（同一个 policy）', color: 'teal', text: '到了 $s\'$ 以后**继续按同一个 $\\pi$** 走能拿到的价值。等号两边都是 $v_\\pi$——这是一个自洽关系，也是一组线性方程（第 8 章）。' }
      ],
      steps: [
        { keys: ['r', 'v'], text: '先看一条分支：这一步的奖励 + 折扣后的“之后的价值”。' },
        { keys: ['env'], text: '对同一个动作的所有后继按 $p$ 加权：得到 $q_\\pi(s,a)$。' },
        { keys: ['pi'], text: '再对所有动作按 $\\pi$ 加权：得到 $v_\\pi(s)$。两层平均分别对应智能体和环境两种随机性。' }
      ]
    }, {
      title: '完整的 Bellman optimality 方程：max 在求和外面',
      latex: R`v_*(s)=\htmlClass{fx-max}{\max_a}\ \htmlClass{fx-env}{\sum_{s'}p(s'\mid s,a)}\big[\htmlClass{fx-r}{r(s,a,s')}+\gamma\,\htmlClass{fx-v}{v_*(s')}\big]`,
      parts: [
        { key: 'max', label: '对动作取最大（不再按 π 平均）', color: 'red', text: '把 expectation 方程里的 $\\sum_a\\pi(a\\mid s)$ 换成 $\\max_a$：每个状态都选最好的动作。' },
        { key: 'env', label: '环境仍然要平均', color: 'gray', text: '**max 在求和外面**：智能体必须先选动作，才知道会不会打滑。不能把 max 放进求和里——那等于“看到滑到哪里之后再选动作”，不是原问题。' },
        { key: 'r', label: '这一步的奖励', color: 'green', text: '每条分支的即时奖励。' },
        { key: 'v', label: '之后按最优走', color: 'teal', text: '到了 $s\'$ 以后继续按最优方式走。等号两边都是 $v_*$；因为有 max，这组方程不是线性的，所以用 VI 反复迭代求解。' }
      ],
      steps: [
        { keys: ['r', 'v'], text: '一条分支：奖励 + 折扣后的“之后最优价值”。' },
        { keys: ['env'], text: '对同一个动作的所有后继按 $p$ 加权 → $q_*(s,a)$。打滑的风险在这里被计入。' },
        { keys: ['max'], text: '最后在动作之间取最大 → $v_*(s)$。' }
      ]
    }],
    c08: [{
      title: '迭代式 Policy Evaluation：读旧表，写新表',
      latex: R`\htmlClass{fx-new}{V_{k+1}(s)}=\sum_a\pi(a\mid s)\sum_{s'}p(s'\mid s,a)\big[r(s,a,s')+\gamma\,\htmlClass{fx-old}{V_k(s')}\big]`,
      parts: [
        { key: 'old', label: '旧表 V_k', color: 'gray', text: '本轮所有状态都读同一张旧表。$k$ 是**计算轮数**，不是环境里的时间步 $t$——这里没有真的走任何一步。' },
        { key: 'new', label: '新表 V_{k+1}', color: 'blue', text: '算完写进新表，下一轮再读。轮数越多越接近 $v_\\pi$；误差每轮至少缩小到原来的 $\\gamma$ 倍。' }
      ]
    }, {
      title: '矩阵形式：为什么能一次解出来',
      latex: R`\htmlClass{fx-v}{\mathbf v}=\htmlClass{fx-r}{\mathbf r_\pi}+\gamma\,\htmlClass{fx-p}{P_\pi}\,\htmlClass{fx-v}{\mathbf v}\quad\Longrightarrow\quad(I-\gamma P_\pi)\,\mathbf v=\mathbf r_\pi`,
      parts: [
        { key: 'v', label: '未知数向量 v', color: 'blue', text: '9 个非终止状态的价值排成一列，等号两边都是它。' },
        { key: 'r', label: '期望即时奖励 r_π', color: 'green', text: '第 $i$ 个分量是“在 $s_i$ 按 $\\pi$ 走一步的期望奖励”，例如 $s_4$ 一直向右时是 $0.1\\times(-1)=-0.1$。' },
        { key: 'p', label: '按 policy 的转移矩阵 P_π', color: 'gray', text: '第 $i$ 行是“在 $s_i$ 按 $\\pi$ 选动作后到各状态的概率”（只保留非终止后继；终止状态价值为 0）。' }
      ],
      steps: [
        { keys: ['v'], text: '把 9 个方程写成一个向量方程，未知数是 $\\mathbf v$。' },
        { keys: ['r'], text: '常数项：每个状态一步的期望奖励。' },
        { keys: ['p', 'v'], text: '“之后的价值”是 $P_\\pi\\mathbf v$：按概率把后继的价值加权。' },
        { keys: ['v', 'p'], text: '把含 $\\mathbf v$ 的项移到左边：$(I-\\gamma P_\\pi)\\mathbf v=\\mathbf r_\\pi$。$\\gamma<1$ 保证左边的矩阵可逆，所以解唯一——这就是课件 PI 的“exact evaluation”。' }
      ]
    }],
    c09: [{
      title: 'Policy improvement：为什么新 policy 不会更差',
      latex: R`\htmlClass{fx-new}{q_{\pi_k}\big(s,\pi_{k+1}(s)\big)}=\htmlClass{fx-max}{\max_a q_{\pi_k}(s,a)}\ \ge\ \htmlClass{fx-old}{q_{\pi_k}\big(s,\pi_k(s)\big)=v_{\pi_k}(s)}\quad\Rightarrow\quad\htmlClass{fx-res}{v_{\pi_{k+1}}(s)\ge v_{\pi_k}(s)}`,
      parts: [
        { key: 'new', label: '新动作的价值（之后按旧 policy）', color: 'orange', text: '第一步换成新 policy 选的动作，之后仍按旧 policy 走。' },
        { key: 'max', label: '它就是所有动作里最大的', color: 'red', text: '新动作是 argmax，所以它的 Q 是最大值。' },
        { key: 'old', label: '旧动作的价值 = 旧 policy 的价值', color: 'gray', text: '旧动作也是候选之一，所以最大值至少不比它小。' },
        { key: 'res', label: '结论：每个状态都不变差', color: 'green', text: '“先按新规则走一步、之后按旧规则”已经不差；把同样的论证用到之后每一步，就得到新 policy 在每个状态都不比旧的差。取等号时说明已经最优，PI 停止。' }
      ]
    }],
    c13: [{
      title: '样本平均：分子、分母各数的是什么',
      latex: R`Q_t(a)=\frac{\htmlClass{fx-num}{\sum_{i=1}^{t}r_i\,\mathbb I(a_i=a)}}{\htmlClass{fx-den}{\sum_{i=1}^{t}\mathbb I(a_i=a)}}`,
      parts: [
        { key: 'num', label: '分子：选 a 那几次的奖励之和', color: 'green', text: '$\\mathbb I(a_i=a)$ 是指示函数：第 $i$ 次选的是 $a$ 就为 1，否则为 0。没选 $a$ 的那些次的奖励被乘 0 去掉。' },
        { key: 'den', label: '分母：选了 a 多少次', color: 'purple', text: '就是 $N_t(a)$。它为 0 时（从没选过）平均值没有定义，实现里通常先设 $Q=0$——这就是为什么要同时看 $N$。' }
      ]
    }],
    c14: [{
      title: 'ε-greedy 的动作概率',
      latex: R`\Pr(A_t=a^*)=\htmlClass{fx-exploit}{1-\epsilon}+\htmlClass{fx-explore}{\frac{\epsilon}{k}},\qquad \Pr(A_t=a)=\htmlClass{fx-explore}{\frac{\epsilon}{k}}\quad(a\ne a^*)`,
      parts: [
        { key: 'exploit', label: '利用分支：一定选最好的', color: 'blue', text: '以概率 $1-\\epsilon$ 进入利用分支，选当前 Q 最大的动作 $a^*$。' },
        { key: 'explore', label: '探索分支：均匀随机', color: 'orange', text: '以概率 $\\epsilon$ 进入探索分支，在 $k$ 个动作里均匀抽——**也可能抽到 $a^*$**。所以 $a^*$ 的总概率要把两部分加起来。例：$k=4,\\epsilon=0.1$ 时 $a^*$ 是 0.925，其他各 0.025。' }
      ]
    }, {
      title: 'ε-decreasing：探索率随时间衰减',
      latex: R`\htmlClass{fx-et}{\epsilon_t}=\htmlClass{fx-e0}{\epsilon_0}\cdot\htmlClass{fx-a}{\alpha}^{\,t}`,
      parts: [
        { key: 'e0', label: '初始探索率', color: 'orange', text: '开始时探索多少，例如 $\\epsilon_0=1$（完全随机）。' },
        { key: 'a', label: '衰减系数 α（不是学习率）', color: 'purple', text: '$0<\\alpha<1$。每玩一次乘一次 α。课件比较图用 $\\alpha=0.99$：第 100 次时 $\\epsilon\\approx0.366$，第 500 次时约 0.0066。' },
        { key: 'et', label: '第 t 次用的 ε', color: 'blue', text: '用它做 ε-greedy：先多探索、后多利用。衰减太快会探索不足。' }
      ]
    }],
    c18: [{
      title: 'TD target 的偏差从哪里来',
      latex: R`\mathbb E[\htmlClass{fx-y}{Y_t}\mid S_t=s]-v_\pi(s)=\gamma\,\mathbb E\big[\htmlClass{fx-err}{V(S_{t+1})-v_\pi(S_{t+1})}\mid S_t=s\big]`,
      parts: [
        { key: 'y', label: 'TD target', color: 'orange', text: '$Y_t=R_{t+1}+\\gamma V(S_{t+1})$。' },
        { key: 'err', label: '下一状态估计的误差', color: 'red', text: '偏差 = γ × 下一状态估计误差的平均。所以：估计还不准时（例如全为 0），TD 的 target 系统性偏低或偏高；估计变准后偏差自动消失。MC 的 target $G_t$ 不含估计，所以没有这一项。' }
      ]
    }],
    c19: [{
      title: 'λ 权重：怎么分、为什么和为 1',
      latex: R`\underbrace{\htmlClass{fx-w1}{(1-\lambda)}}_{n=1}+\underbrace{\htmlClass{fx-w2}{(1-\lambda)\lambda}}_{n=2}+\cdots+\underbrace{(1-\lambda)\lambda^{T-t-2}}_{n=T-t-1}+\underbrace{\htmlClass{fx-last}{\lambda^{T-t-1}}}_{\text{完整 return}}=1`,
      parts: [
        { key: 'w1', label: '1-step 的权重', color: 'teal', text: '在不终止的各项里它的权重最大（1−λ）。但 episode 快结束时，剩下的权重全部给完整 return，那一项可能更大：例如剩 3 步、λ = 0.9，三项权重是 0.1、0.09、0.81。λ = 0 时 1-step 的权重是 1、其他全为 0 ⇒ TD(0)。' },
        { key: 'w2', label: '每多看一步，权重乘 λ', color: 'purple', text: '2-step 是 $(1-\\lambda)\\lambda$，3-step 是 $(1-\\lambda)\\lambda^2$……指数衰减。' },
        { key: 'last', label: '剩下的全部给完整 return', color: 'green', text: '前面的几何级数加起来是 $1-\\lambda^{T-t-1}$，剩下的 $\\lambda^{T-t-1}$ 给 MC return，总和正好是 1。λ=1 时它是 1 ⇒ MC。例：剩 3 步、λ=0.5：0.5、0.25、0.25。' }
      ]
    }],
    c20: [{
      title: 'SARSA target 的期望：为什么它对应 expectation 方程',
      latex: R`\mathbb E_{\htmlClass{fx-ap}{A'\sim\pi'}}\big[R+\gamma Q(S',A')\big]=R+\gamma\,\htmlClass{fx-avg}{\sum_a\pi'(a\mid S')\,Q(S',a)}`,
      parts: [
        { key: 'ap', label: 'A′ 是按训练 policy 抽的', color: 'orange', text: '每次只抽一个 $A\'$，可能是探索动作。' },
        { key: 'avg', label: '平均下来 = 按 π′ 加权的 Q', color: 'teal', text: '很多次平均后，bootstrap 部分就是 Bellman **expectation** 方程里的 $\\sum_a\\pi\'(a\\mid S\')Q(S\',a)$——学的是训练 policy $\\pi\'$ 自己的价值，所以是 on-policy。Q-learning 把这一项换成 $\\max_aQ(S\',a)$。' }
      ]
    }],
    c23: [{
      title: '从损失推出更新：加号是怎么来的',
      latex: R`\htmlClass{fx-loss}{L(\mathbf w)=\tfrac12\big(Y-\hat Q\big)^2}\ \Rightarrow\ \htmlClass{fx-grad}{\nabla_{\mathbf w}L=-\big(Y-\hat Q\big)\nabla_{\mathbf w}\hat Q}\ \Rightarrow\ \htmlClass{fx-upd}{\mathbf w\leftarrow\mathbf w-\alpha\nabla_{\mathbf w}L=\mathbf w+\alpha\big(Y-\hat Q\big)\nabla_{\mathbf w}\hat Q}`,
      parts: [
        { key: 'loss', label: '① 损失：预测离 target 多远', color: 'red', text: '把 target $Y$ 当成常数（semi-gradient），只看当前预测 $\\hat Q(S_t,A_t;\\mathbf w)$ 差多少。$\\tfrac12$ 只是为了求导干净；课件不写 $\\tfrac12$，多出的 2 吸收进 α。' },
        { key: 'grad', label: '② 求导：链式法则', color: 'purple', text: '外层 $\\tfrac12u^2$ 的导数是 $u$，内层 $Y-\\hat Q$ 对 $\\mathbf w$ 的导数是 $-\\nabla\\hat Q$，相乘出现负号。' },
        { key: 'upd', label: '③ 梯度下降：负负得正', color: 'green', text: '沿负梯度走一步，负号抵消，得到 $+\\alpha(Y-\\hat Q)\\nabla\\hat Q$：误差为正就沿“让预测变大”的方向改参数。' }
      ]
    }],
    c24: [{
      title: '一次更新对别的状态有多大影响',
      latex: R`\Delta\hat Q(\htmlClass{fx-z}{\mathbf z})=\htmlClass{fx-ad}{\alpha\,\delta}\ \htmlClass{fx-xz}{\mathbf x^\top\mathbf z}`,
      parts: [
        { key: 'ad', label: '这次更新的力度', color: 'red', text: '学习率 × TD error。例：Method 1 课件更新中 $\\alpha\\delta=0.1\\times1$。' },
        { key: 'z', label: '另一个状态的特征', color: 'blue', text: '我们没有观察这个状态，只看它的预测会被顺带改多少。' },
        { key: 'xz', label: '两个特征的重叠程度', color: 'purple', text: '被更新状态的特征 $\\mathbf x$ 与它的点积。重叠越多一起变得越多（泛化）；正交（点积为 0）就完全不受影响；点积为负会反向变化（干扰）。例：$\\mathbf x(s_{10})=(0.2,0.4)$，$\\mathbf z=\\mathbf x(s_6)=(0.4,0.2)$，$\\Delta\\hat V(s_6)=0.1\\times(0.08+0.08)=0.016$——正好是课件的 $\\hat V(s_6)$。' }
      ]
    }],
    c27: [{
      title: 'Softmax policy：偏好怎样变成概率',
      latex: R`\pi(a\mid s)=\frac{\htmlClass{fx-exp}{e^{h(s,a)}}}{\htmlClass{fx-z}{\sum_b e^{h(s,b)}}}`,
      parts: [
        { key: 'exp', label: '指数：把任意实数变成正数', color: 'orange', text: '偏好 $h$ 可以是负数，取指数后一定为正；偏好越大，这一项越大。' },
        { key: 'z', label: '归一化：除以所有动作的总和', color: 'gray', text: '保证概率之和为 1。所有偏好同时加同一个常数，分子分母同乘一个因子，概率不变——**只有偏好之差有意义**。例：$h=[0,0]$ 时各 0.5；$h=[-0.05,0.05]$ 时 Right 为 0.525。' }
      ]
    }, {
      title: '∂log π / ∂h 的推导：1−π 和 −π 从哪来',
      latex: R`\log\pi(a\mid s)=\htmlClass{fx-t1}{h(s,a)}-\htmlClass{fx-t2}{\log\sum_be^{h(s,b)}}\ \Rightarrow\ \frac{\partial\log\pi(a\mid s)}{\partial h(s,c)}=\htmlClass{fx-t1}{\mathbb 1\{c=a\}}-\htmlClass{fx-t2}{\pi(c\mid s)}`,
      parts: [
        { key: 't1', label: '第一项：只有被选动作贡献 1', color: 'green', text: '$h(s,a)$ 对 $h(s,c)$ 求导：$c=a$ 时为 1，否则为 0。' },
        { key: 't2', label: '第二项：每个动作都贡献 −π', color: 'red', text: '$\\log\\sum_be^{h(s,b)}$ 对 $h(s,c)$ 求导是 $e^{h(s,c)}/\\sum_be^{h(s,b)}=\\pi(c\\mid s)$，前面有负号。所以被选动作得 $1-\\pi$，其他动作得 $-\\pi$——每个动作都被更新，增量之和为 0。' }
      ]
    }],
    c28: [{
      title: '轨迹梯度：环境概率为什么消失、γᵗ 从哪来',
      latex: R`\nabla_\theta J=\htmlClass{fx-e}{\mathbb E_\tau}\big[\htmlClass{fx-log}{\nabla_\theta\log p_\theta(\tau)}\,G_0(\tau)\big],\qquad \htmlClass{fx-log}{\nabla_\theta\log p_\theta(\tau)}=\htmlClass{fx-sum}{\sum_t\nabla_\theta\log\pi_\theta(A_t\mid S_t)}\ \Rightarrow\ \htmlClass{fx-res}{\nabla_\theta J=\mathbb E\Big[\sum_t\gamma^tG_t\,\nabla_\theta\log\pi_\theta(A_t\mid S_t)\Big]}`,
      parts: [
        { key: 'e', label: '① 对所有轨迹求期望', color: 'gray', text: '$J=\\sum_\\tau p_\\theta(\\tau)G_0(\\tau)$。用恒等式 $\\nabla p=p\\,\\nabla\\log p$ 把“对概率求导”变成“对样本求平均”——所以可以靠采样估计。' },
        { key: 'log', label: '② 对数概率的梯度', color: 'purple', text: '$\\log p_\\theta(\\tau)=\\log p(s_0)+\\sum_t\\log\\pi_\\theta(a_t\\mid s_t)+\\sum_t\\log p(s_{t+1}\\mid s_t,a_t)$。' },
        { key: 'sum', label: '③ 环境项消失，只剩 policy 项', color: 'orange', text: '起点分布和转移概率不依赖 θ，求导为 0。所以**不需要知道环境模型**。' },
        { key: 'res', label: '④ 去掉过去的奖励，得到 γᵗ Gₜ', color: 'green', text: '时刻 $t$ 的动作改变不了之前已经发生的奖励，那些项的期望贡献为 0；保留从 $t$ 起的部分 $\\gamma^tG_t$（$G_t$ 从 $t$ 重新计时，$\\gamma^t$ 把它放回时刻 0 的时间轴）。这就是 REINFORCE 的更新方向。' }
      ]
    }]
  };
  Object.entries(F).forEach(([id, list]) => {
    const c = root.RL.content.chapters.find(x => x.id === id);
    if (c) c.formulas = [].concat(c.formulas || [], list);
  });
})(window);

/* 读者提问整合：第 8 章矩阵形式里的“价值向量 / 转移矩阵 / 期望奖励向量”是什么。 */
(function (root) {
  'use strict';
  const R = String.raw;
  root.RL.content.enrich({ c08: { extra: { math: R`
:::example 矩阵形式拆开看：用 π₀ 的顶行三格
**价值向量 $\mathbf v$**：把要求的未知数按固定顺序排成一列，没有别的含义。只看顶行时 $\mathbf v=(V_8,V_9,V_{10})^\top$；完整 Gridworld 就是 9 个非终止状态的价值排成一列。终止状态 $s_7,s_{11}$ 价值按定义为 0，已知，所以不放进去。

**转移矩阵 $P_\pi$**：一张“从哪去哪”的概率表，第 $i$ 行 = 从第 $i$ 个状态出发（按 policy 选动作后），第 $j$ 列 = 到第 $j$ 个状态。π₀ 在顶行都选 ↑：

| 从 \ 到 | $s_8$ | $s_9$ | $s_{10}$ | （$s_{11}$，终止） |
|---|---|---|---|---|
| $s_8$ | 0.9 | 0.1 | 0 | 0 |
| $s_9$ | 0.1 | 0.8 | 0.1 | 0 |
| $s_{10}$ | 0 | 0.1 | 0.8 | 0.1 |

“只含非终止后继”= 删掉最后一列：进入 $s_{11}$ 后价值为 0，乘出来也是 0。所以 $s_{10}$ 那一行加起来只有 0.9，缺的 0.1 就是“这一步结束”的概率。

**期望奖励向量 $\mathbf r_\pi$**：每个状态按 policy 走一步的期望奖励，$\mathbf r_\pi=(0,\,0,\,0.1)^\top$——只有 $s_{10}$ 有 0.1 的概率滑进 $s_{11}$ 拿 +1。被删掉的那一列，奖励就算在这里。

**按行展开**：
$$\begin{bmatrix}V_8\\V_9\\V_{10}\end{bmatrix}=\begin{bmatrix}0\\0\\0.1\end{bmatrix}+0.9\begin{bmatrix}0.9&0.1&0\\0.1&0.8&0.1\\0&0.1&0.8\end{bmatrix}\begin{bmatrix}V_8\\V_9\\V_{10}\end{bmatrix}$$
矩阵乘向量 = 每一行与向量逐项相乘再相加。第一行就是 $V_8=0.9\,(0.9V_8+0.1V_9)$——和“③ 直觉”里手写的第一个方程完全相同。矩阵式只是把这几条方程叠在一起写。

**移项**：$(I-\gamma P_\pi)\mathbf v=\mathbf r_\pi$，
$$\begin{bmatrix}0.19&-0.09&0\\-0.09&0.28&-0.09\\0&-0.09&0.28\end{bmatrix}\begin{bmatrix}V_8\\V_9\\V_{10}\end{bmatrix}=\begin{bmatrix}0\\0\\0.1\end{bmatrix}\ \Rightarrow\ \mathbf v=\begin{bmatrix}0.0730\\0.1542\\0.4067\end{bmatrix}$$
验算第三行：$-0.09\times0.1542+0.28\times0.4067=0.1$。
:::` } } });
})(window);
