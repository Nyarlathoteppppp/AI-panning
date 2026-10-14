/* Part 3 · W7 Introduction to RL: model-free, bandits, MC prediction. */
(function (root) {
  'use strict';
  const R = String.raw;
  const fig = (src, caption) => ({ src, caption });
  root.RL.content.add([
  /* ------------------------------------------------------------------ c12 */
  {
    id: 'c12', part: 'p3', title: '模型未知：什么是强化学习', en: 'Model-free RL: prediction, control, exploration',
    summary: 'VI 和 PI 都假设知道 $p(s\'\\mid s,a)$ 和 $r(s,a,s\')$。现实中常常不知道。**强化学习**让智能体与环境交互，从经验中学出好的 policy。',
    goals: ['说清 model-based / model-free 的区别，以及“model-free 不等于什么都不知道”', '区分 offline / online、prediction / control、exploration / exploitation', '知道 W7–W10 的路线图'],
    prereq: '第 2、11 章',
    figure: [fig('13_model_based_vs_model_free.jpg', '原课程教学图：model-based 使用转移与奖励模型；model-free 直接从 (s,a,r,s′) 学习。')],
    what: R`
**强化学习（Reinforcement Learning, RL）**：一种学习范式，智能体通过与环境**交互**来学会做决策。

- 环境满足经典 MDP 假设；在时刻 $t$ 处于 $S_t$，智能体执行 $A_t$，环境返回 $S_{t+1}$ 和 $R_{t+1}$。
- **目标**：学到最优 policy $\pi^*$。
- **方法**：反复与环境交互、收集奖励，并根据收集到的奖励更新 policy。

课件的分类：

| 情况 | 方法 |
|---|---|
| 模型已知，确定性 | 经典规划 |
| 模型已知，随机，declarative | 动态规划（VI、PI，W6） |
| 模型已知，generative | Monte Carlo Tree Search（W11） |
| 模型未知，先学模型 | Model-based RL（**本课不讲**） |
| 模型未知，直接从经验学 | **Model-free RL**（W7–W10） |

model-free RL 的假设：仍满足经典 MDP 假设；**状态空间 $S$ 和动作空间 $A$ 已知**。
`,
    why: R`
VI/PI 的“大前提”：我们知道模型，即 $p(s'\mid s,a)$ 和 $r(s,a,s')$。很多真实问题做不到：

- 机器人在新地面上打滑的概率是多少？没人能事先写出来。
- 游戏、交通灯控制、LLM 微调——环境太复杂，没有可以查询的转移表。

但 Bellman 方程描述的长期结构仍然成立，变化的只是**怎样估计其中的期望**：不能枚举所有后继，就用实际经历的样本来近似。

RL 的例子（课件）：玩 Atari 游戏、让人形机器人走路、交通灯控制、下围棋（W11）、用人类/AI 反馈微调 LLM（W12）。
`,
    intuition: R`
**model-free 的 “free” 指什么**：不要求先建立一个供规划使用的显式模型，而不是说没有状态、动作、折扣，或者学习不依赖环境规律。

区分 model-based 与 model-free 时，看算法**学习并调用什么**：

- 预测“做这个动作会到哪里、拿到什么奖励”，再用这些预测推演后续 → 关心的是**模型**（model-based）。
- 直接把一个 $(s,a)$ 映射到长期回报的估计 → 关心的是**价值**（model-free）。

数据来自模拟器还是真实环境，不能单独决定分类：一个可采样的模拟器同样能给 model-free 方法提供经验；用学出来的模拟器生成样本来规划，仍然是 model-based。
`,
    math: R`
**RL 的三个关键维度（W7）**

**1. Offline vs Online（计算与执行）**

- *Offline*：先计算（DP 中先求 policy；RL 中先**训练**出 policy），再执行。
- *Online*：计算与执行交替：根据当前状态和过去经验找下一个动作 $A_t$，执行，观察 $S_{t+1},R_{t+1}$，再重新计算。

注意这里的 offline 训练阶段**仍然可以与环境交互和探索**；不要把它换成某些文献里“只能用一份固定数据集学习”的意思，也不要和 off-policy/on-policy 混为一谈。

**2. Prediction vs Control**

- *Prediction*：给定 policy $\pi$，估计 $v_\pi(s)$ 或 $q_\pi(s,a)$。
- *Control*：找最优 policy $\pi^*$，使期望 return 最大。

**3. Exploration vs Exploitation**

- *Exploration*：了解更多未知信息（尝试“新”动作）。
- *Exploitation*：利用已知信息（选当前看来最好的动作）。
- 在 **online RL** 中：探索是为了发现动作效果、可能提高**未来**奖励；利用是为了最大化**眼前**的奖励（课件原话 “maximise the immediate reward”）。在 bandit 里每次只有一步，“眼前的奖励”就是全部；到了多步的 MDP，利用指的是选**当前估计长期回报最高**的动作，它不一定是即时奖励最高的动作。
- 在 **offline RL** 中：探索是为了找到更好的 policy；利用是为了**确认或修正**对当前最好动作的估计。（offline 训练期间拿到的奖励不计成绩，只有最后交出的 policy 算数；所以这时的“利用”是多采样当前看起来最好的动作，确认它是否真的好——估高了就会被修正。）

**后续路线图（W7 slide 12）**：prediction 相关——MC vs bootstrapping（W7–W8）、bias vs variance（W8）、on-policy vs off-policy（W8）；control 相关——value-based（W9）、policy-based（W10）、actor-critic（W10，课件只列名）。
`,
    formulas: [{
      title: '智能体与环境的交互循环',
      latex: R`\htmlClass{fx-s}{S_t}\ \xrightarrow{\ \htmlClass{fx-a}{A_t\sim\pi(\cdot\mid S_t)}\ }\ \htmlClass{fx-env}{\text{环境}}\ \longrightarrow\ \htmlClass{fx-out}{(R_{t+1},S_{t+1})}\ \longrightarrow\ \htmlClass{fx-learn}{\text{更新估计 / policy}}`,
      parts: [
        { key: 's', label: '当前状态', color: 'blue', text: '智能体能完整观察到它（经典 MDP 假设）。' },
        { key: 'a', label: '按当前 policy 选动作', color: 'orange', text: '训练时的 policy 通常带有探索（ε-greedy 等）。' },
        { key: 'env', label: '未知的环境', color: 'gray', text: 'model-free：看不到 $p$ 和 $r$，只能把动作交给环境，等它返回结果。' },
        { key: 'out', label: '一个样本', color: 'green', text: '一次交互只得到一个样本，不是完整分布——这就是 generative access。（交互里可以反复在同一个状态采样，是演示允许“重置到选定状态”；真实环境里通常只能从当前位置继续走，想再采样同一个 (s,a) 得先走回来。）' },
        { key: 'learn', label: '从经验学习', color: 'purple', text: '用样本更新价值估计或 policy。MC、TD、SARSA、Q-learning 的区别都在这一步。' }
      ]
    }],
    example: R`
**同一个 Gridworld，两种处境**

- **有模型（W6）**：想知道 $s_6$ 选 North 的价值，可以直接算 $0.8[0+0.9V(s_{10})]+0.1[0+0.9V(s_6)]+0.1[-1]$，不需要真的移动机器人，甚至可以对从没去过的格子做 backup。
- **没模型（W7 起）**：只能让机器人在 $s_6$ 真的选 North，看这一次到了哪里、拿到多少奖励。想知道 0.8/0.1/0.1，只能多试很多次再统计频率。

后面的 MC/TD 演示虽然画着同一张地图，但更新规则**只读取观察到的轨迹**：地图画给你看，不等于学习算法读取了转移概率。
`,
    viz: { id: 'mdp', props: { state: 6, action: 'N', mode: 'generative' }, guide: R`
**怎么用**：这里默认是“只能采样”模式，站在 $s_6$ 选 North。

1. 采样 10 次、100 次、1000 次，看频率怎样慢慢接近 0.8 / 0.1 / 0.1——model-free 智能体看到的就是这种信息。
2. 切到“已知模型”，对照真实分布。
3. 思考：如果每个 $(s,a)$ 都要这样采样上千次才能估计模型，再去做 VI，代价有多大？model-free 方法跳过“估计模型”这一步，直接估计价值。` },
    compare: R`
| | Model-based（W6 DP） | Model-free RL（W7–W10） |
|---|---|---|
| 需要 $p, r$ | 是 | 否（只需能交互） |
| 需要 $S, A$ | 是 | 是 |
| 计算方式 | 用模型做期望 backup | 用样本近似期望 |
| 例子 | VI、PI | MC、TD、SARSA、Q-learning、REINFORCE |

| 维度 | 问的是 |
|---|---|
| Offline / Online | 计算与执行是否交错 |
| Prediction / Control | 评价给定 policy，还是寻找最优 policy |
| Exploration / Exploitation | 收集信息，还是利用现有信息 |
| On-policy / Off-policy（W8） | 学的是正在执行的 policy，还是另一个 policy |
`,
    pitfalls: [
      { wrong: 'Model-free 意味着智能体对环境一无所知。', right: '它仍然知道状态空间和动作空间，环境也满足 MDP 假设；只是不知道（也不去学）$p$ 和 $r$。' },
      { wrong: '有模拟器的方法都是 model-based。', right: '分类看算法**怎样使用**信息：只是从模拟器拿样本、直接学价值，是 model-free。' },
      { wrong: 'Offline 和 off-policy 是一回事。', right: 'Offline/online 讲计算与执行是否交错；off-policy/on-policy 讲学习的目标 policy 是否就是产生数据的 policy（W8）。' },
      { wrong: 'VI、PI 一定属于强化学习。', right: '有争议：教材把它们算进 RL，讲师认为不算。确定无疑的是它们是 **model-based** 方法。' }
    ],
    quiz: [
      { kind: '概念判断', q: '“给定一个 policy，估计它的 $q_\\pi(s,a)$”属于？', options: ['Control', 'Prediction', 'Exploration', 'Planning'], answer: 1, explain: 'Prediction 评价给定 policy；Control 寻找最优 policy。' },
      { kind: '概念判断', q: 'Model-free RL 仍然假设已知什么？', options: ['转移概率 $p$', '奖励函数 $r$', '状态空间 $S$ 和动作空间 $A$', '最优价值 $v_*$'], answer: 2, explain: '课件：Assumptions — classical MDP assumptions, known state and action spaces。' },
      { kind: '概念判断', q: '按课件 W7 的说法，online RL 中“exploitation”的目的是？', options: ['发现动作效果', '最大化眼前的奖励', '确认或修正估计', '学习转移概率'], answer: 1, explain: 'W7 p.11：online 中利用是为了最大化 immediate reward（课件原话）；offline 中利用是为了确认或修正估计。到了多步的 MDP，利用是按当前估计的长期回报（Q）选动作，不一定是即时奖励最高的那个。' },
      { kind: '概念判断', q: '先从数据中学出 $\\hat p,\\hat r$，再用 VI 求 policy。这属于？', options: ['Model-free RL', 'Model-based RL', 'Monte Carlo', '经典规划'], answer: 1, explain: '学了模型并用模型规划 → model-based RL（本课不讲）。' }
    ],
    source: 'W7 slides 3–12（回顾、模型已知/未知、RL 定义与例子、offline/online、prediction/control、exploration/exploitation、路线图）；W8 slides 3–4；W6-1 slide 25。'
  },
  /* ------------------------------------------------------------------ c13 */
  {
    id: 'c13', part: 'p3', title: 'Multi-armed Bandit 与增量平均', en: 'Multi-armed bandits & incremental averaging',
    summary: '只有一个状态的 MDP：一排老虎机，每次选一台，得到一个随机奖励。用**样本平均**估计每台的价值，并用增量公式在线更新。',
    goals: ['写出 k-armed bandit 的形式定义', '推导增量平均 $Q\\leftarrow Q+\\frac1N(R-Q)$', '理解“只有被选中的臂才会得到新数据”'],
    prereq: '第 12 章',
    figure: [fig('01_bandit.jpg', '原课程教学图：四台老虎机，选择 → 观察 → 更新。')],
    what: R`
**Multi-armed bandit（多臂老虎机）**：一个赌徒面对一排 $k$ 台老虎机，每台的奖励分布未知；每次只能玩一台，得到按这台机器的分布抽出的奖励。

**形式定义**：k-armed bandit 是 MDP 的特例——

- **只有一个状态** $s_0$；
- 有 $k$ 个动作（$k$ 个“单臂老虎机”）；
- 每个动作 $a$ 的奖励分布 $p(R_{t+1}\mid S_t=s_0,A_t=a,S_{t+1}=s_0)$ 未知；
- 只有一个状态，每次拉杆都“访问”了 $s_0$，所以 $N(s_0)$ 就等于总次数 $t$；写成 $N(s,a)$ 是为了推广到多状态：在 MDP 里每个状态各自计数，UCB 中的 $t$ 换成 $N(s)$，$N(a)$ 换成 $N(s,a)$。

**怎样估计每个动作的价值**：平均奖励

$$Q_t(a)=\frac{R_1+R_2+\cdots+R_{N_t(a)}}{N_t(a)}$$

其中 $R_1,\dots$ 只是**选了 $a$ 的那些次**得到的奖励（把选 $a$ 的那几次重新编号，不是第 1、2 次拉杆的奖励）。
`,
    why: R`
Bandit 把 RL 最核心的困难单独拿出来：**估计**哪个动作好，同时必须**根据不完整的估计去行动**。采样本身就是行动——选错机器会损失真实收益。

它也是后面所有算法的积木：

- MC prediction 把“每个状态当成一个 bandit”，臂的“奖励”换成 return（第 15 章）；
- MC/TD control 的“改进 policy”这一步，直接借用 bandit 的探索策略（第 16、18 章）。

关于 horizon 与折扣（W7 slide 15）：若次数无限，目标是最大化**平均每次奖励**；在 bandit 中不打折（undiscounted）：每次拉杆的奖励按同样的权重累加。课件的理由是每条“轨迹”的长度（次数）相同；但要注意，长度相同并不保证折扣不影响比较——例如奖励序列 (0, 2) 和 (1, 0)：不打折时前者总和 2 更好，γ = 0.1 时前者 $0+0.1\times2=0.2$、后者 $1$，后者更好。这里只是选择了“不打折”这个目标。
`,
    intuition: R`
**课件提的三个问题**：如果钱有限，该怎么做？如果硬币无限，该怎么做？如果硬币有限呢？——次数越多，现在花在“了解机器”上的代价越有机会在以后收回；只剩一次时就该直接选当前最好的。

**Q 的含义随时间变化**：大写 $Q_t(a)$ 是我们**现在**的估计；真实但未知的是 $q_*(a)=\mathbb E[R\mid A=a]$。一次得到 1 不说明真实均值是 1，一次得到 0 也不说明这台机器不好。

:::warn Q = 0 可能是两种情况
“从没试过，初始化为 0”和“试过很多次，平均确实接近 0”在 Q 上看不出区别——必须同时看计数 $N(a)$。
:::

Bandit 中的 $Q(a)$ 是**平均单步奖励**；到 MDP 中，$Q(s,a)$ 会扩展为**长期 return** 的期望，不要把两者的时间范围混在一起。
`,
    math: R`
**从样本平均推出增量更新**：设动作 $a$ 已被选了 $n$ 次，奖励为 $r_1,\dots,r_n$，均值 $Q^{(n)}=\frac1n\sum_{i=1}^n r_i$。第 $n+1$ 个奖励到来时，把旧和写成 $nQ^{(n)}$：

$$Q^{(n+1)}=\frac{nQ^{(n)}+r_{n+1}}{n+1}=\frac{(n+1)Q^{(n)}-Q^{(n)}+r_{n+1}}{n+1}=Q^{(n)}+\frac{1}{n+1}\big[r_{n+1}-Q^{(n)}\big]$$

中间一步把 $n$ 写成 $(n+1)-1$，拆出一个完整的 $Q^{(n)}$。

不用保存全部历史，只存当前均值和计数。也常写成：

$$Q_{t+1}(a)=Q_t(a)+\frac{1}{N(s,a)}\big(r-Q_t(a)\big),\qquad Q_t(a)=\frac{\sum_{i=1}^t r_i\,\mathbb I(a_i=a)}{\sum_{i=1}^t\mathbb I(a_i=a)}$$

下标有两套：$Q^{(n)}$ 按“这台机器第几次被选”编号，$Q_t(a)$ 按“总共第几次拉杆”编号；第 $t$ 次没选 $a$ 时 $Q_{t+1}(a)=Q_t(a)$。

**实现顺序**：先把 $N(a)$ 加一，再用新的 $1/N(a)$ 作为步长。这样第一次采样时 $N=1$，估计直接等于这次奖励，也不会出现除以零。

把 $1/N(a)$ 记作 $\alpha$，更新就是 **“旧估计 + α × 预测误差”**。后面 MC、TD 甚至梯度更新都沿用这个形状，只是把“目标”换掉：

$$\text{estimate}\leftarrow\text{estimate}+\alpha\,(\text{target}-\text{estimate})$$
`,
    formulas: [{
      title: '增量平均（incremental update）',
      latex: R`\htmlClass{fx-new}{Q_{t+1}(a)}=\htmlClass{fx-old}{Q_t(a)}+\htmlClass{fx-lr}{\frac{1}{N(a)}}\big(\htmlClass{fx-r}{r}-\htmlClass{fx-old}{Q_t(a)}\big)`,
      parts: [
        { key: 'old', label: 'current estimate 旧估计', color: 'blue', text: '这台机器当前的平均奖励估计。' },
        { key: 'r', label: 'target：刚得到的奖励', color: 'green', text: '这一次拉杆实际得到的奖励——新的证据。' },
        { key: 'lr', label: '步长 1/N(a)', color: 'purple', text: '$N(a)$ 是**包括这一次**在内这台机器被选的次数。步长越来越小：后来的样本对平均的影响越来越小，正好得到样本均值。' },
        { key: 'new', label: '新估计', color: 'teal', text: '向“这次奖励”移动一小步。误差为正就上调，为负就下调。' }
      ]
    }],
    example: R`
**手算**：某台机器前两次奖励是 1 和 0，均值 $Q=0.5$，$N=2$。第三次得到 1：

$$N\leftarrow3,\qquad Q\leftarrow0.5+\tfrac13(1-0.5)=0.6667$$

与直接算 $(1+0+1)/3=2/3$ 完全相同。

**补充**：model-free RL 与 bandit 的关系——bandit 就是 $|S|=1$、$|A|=k$、未知 $p(r\mid a)$、有限 horizon $T$ 的 MDP；online 计数 $t=N(s)$ 和 $N(s,a)$。

:::example 代码
${'```'}python
Q, N = [0.0] * 4, [0] * 4
def update(a, r):
    N[a] += 1                       # 先计数
    Q[a] += (r - Q[a]) / N[a]       # 再用 1/N 更新
${'```'}
:::
`,
    viz: { id: 'bandit-manual', guide: R`
**怎么用**：

1. 先只拉机器 A 几次：只有 A 的 $N$ 和 $Q$ 在变，其他机器保持 0——它们不是没有收益，而是这一轮没被观察。
2. 每次更新都会把数字代入增量公式。注意第一次拉某台机器时，估计直接等于那次奖励。
3. 试着只靠拉杆猜出哪台最好，再“显示真实均值”核对。你是怎样分配拉杆次数的？这就是下一章的探索策略问题。` },
    compare: R`
| | Bandit | MDP |
|---|---|---|
| 状态 | 只有一个 | 多个，动作会改变状态 |
| 动作价值 | 平均**即时**奖励 | 期望**长期** return |
| 估计方法 | 样本平均 | MC：平均 return；TD：bootstrapping |
| 难点 | 探索 vs 利用 | 探索 vs 利用 + 信用分配（哪一步导致了最终结果） |
`,
    pitfalls: [
      { wrong: '$Q(a)=0$ 表示这台机器不好。', right: '也可能是从没试过。要结合 $N(a)$ 看。' },
      { wrong: '增量更新里的 $N$ 是所有机器的总次数。', right: '是**这台机器**被选的次数 $N(a)$（课件也写作 $N(s,a)$）。' },
      { wrong: '先用旧的 $N$ 算步长，再把 $N$ 加一。', right: '应先 $N\\leftarrow N+1$ 再用 $1/N$。否则第一次会除以 0，且结果不再是样本平均。' },
      { wrong: 'Bandit 也需要折扣因子。', right: '课件把 bandit 当作 undiscounted（不打折）：目标就是奖励的总和或平均。注意“每条轨迹长度相同”并不保证打折后的排序不变（例如 (0, 2) 与 (1, 0)），这里只是选择了不打折的目标。' }
    ],
    quiz: [
      { kind: '公式计算', q: '某机器已被选 4 次，$Q=2.5$。第 5 次得到奖励 5。新 $Q$ 是多少？', answer: 3, tol: 0.001, explain: '$N\\leftarrow5$，$Q\\leftarrow2.5+\\frac15(5-2.5)=3$。' },
      { kind: '公式计算', q: '奖励依次为 2、4、0（都来自同一台机器），从 $Q=0,N=0$ 开始用增量公式，最后 $Q$ 是多少？', answer: 2, tol: 0.001, explain: '2 → 2+½(4−2)=3 → 3+⅓(0−3)=2，等于 (2+4+0)/3。' },
      { kind: '概念判断', q: 'k-armed bandit 作为 MDP 的特例，有几个状态？', options: ['k 个', '1 个', '2 个（起点和终点）', '无穷多个'], answer: 1, explain: '只有一个状态 $s_0$，每次选完都回到它。' },
      { kind: '概念判断', q: '增量更新 $Q\\leftarrow Q+\\alpha(\\text{target}-Q)$ 中，bandit 的 target 是？', options: ['return $G_t$', '这一次的奖励 $r$', '$r+\\gamma Q$', '真实均值 $q_*$'], answer: 1, explain: 'Bandit 的目标就是这次奖励；MC 换成 $G_t$，TD 换成 $r+\\gamma V(s\')$。' }
    ],
    source: 'W7 slides 14–15（场景、形式定义、平均奖励估计、horizon、折扣、online）；W8-1 slides 4–5（增量更新、与 model-free 的关系）。'
  },
  /* ------------------------------------------------------------------ c14 */
  {
    id: 'c14', part: 'p3', title: 'Bandit 探索策略', en: 'ε-first, ε-greedy, ε-decreasing, UCB, Softmax',
    summary: '关键问题是平衡探索与利用。课件给出五种策略：**ε-first、ε-greedy、ε-decreasing、UCB、Softmax**。它们的区别在于“什么时候探索、怎样分配探索机会”。',
    goals: ['写出五种策略的规则', '算出 ε-greedy 下各动作的总概率', '解释 UCB 的不确定性加分与 softmax 的温度', '读懂课件的比较图（含 drift）'],
    prereq: '第 13 章',
    figure: [fig('02_exploration_vs_exploitation.jpg', '原课程教学图：一直利用会错过隐藏的好机器。'), fig('03_epsilon_greedy.jpg', '原课程教学图：ε-greedy 的决策门。'), fig('03b_bandit_strategies.jpg', '原课程教学图：五种策略是替代方案，不是从左到右的优劣排序。')],
    what: R`
| 策略 | 规则 |
|---|---|
| **ε-first** | 前 ε 比例的次数随机选（探索）；剩下 $1-\epsilon$ 比例一直选当前最好的（利用）。需要事先知道总次数 $T$：前 $\epsilon T$ 次随机，之后一直利用 |
| **ε-greedy** | 每一次：以概率 ε 随机选一个动作；以概率 $1-\epsilon$ 选当前最好的 |
| **ε-decreasing** | 选衰减系数 $\alpha\in(0,1)$ 和初始探索率 $\epsilon_0$；第 $t$ 次用 $\epsilon_t=\epsilon_0\cdot\alpha^t$ 做 ε-greedy |
| **UCB** | 维护 $N(a)$ 和 $Q_t(a)$；选 $\arg\max_a\big[Q_t(a)+c\sqrt{\ln t/N(a)}\big]$ |
| **Softmax** | 按概率 $P(a)=e^{Q_t(a)/\tau}/\sum_b e^{Q_t(b)/\tau}$ 选动作，$\tau$ 是温度 |
`,
    why: R`
**纯贪心（ε=0）会自我锁死**：假设机器 B 最初运气差、估计偏低，算法就总选 A；不再选 B，就没有新样本去纠正 B 的估计。跑多久都只是把 A 估得更准，不会自动发现 B 更好。这不是均值公式错了，而是**选动作的规则让数据缺失**。

另一个极端，永远均匀随机，虽然每台都有数据，却不会随着学习增加好动作的比例，浪费了已经学到的知识。

所以需要一条规则说明：何时利用、何时尝试，以及把有限的探索机会给谁。
`,
    intuition: R`
**信息也有价值**：A 的 $Q=0.7$ 试了 100 次，B 的 $Q=0.6$ 只试了 1 次——B 的 0.6 可能只是运气差。再试一次 B 可能牺牲这一轮的收益，却可能发现以后一直应该选它。信息的价值体现在它帮助我们以后少犯错，所以**剩余次数越多，探索越值得**。

- **ε-greedy** 的随机分支不区分动作：明显很差的机器和差一点、但还没估准的机器得到同样的机会。
- **ε-first** 把“探索够了”的决定提前做死；如果初期样本误导了判断，后期无法纠正。
- **ε-decreasing**：先了解、再利用；但衰减过快，重要的动作可能得不到足够样本。
- **UCB**：给试得少的动作“乐观加分”，有方向地探索，不必每次抛硬币。
- **Softmax**：概率直接反映价值差距——差一点的动作常被试，差很多的动作很少被试。
`,
    math: R`
**ε-greedy 的动作概率**：$k$ 个动作、只有一个最好动作 $a^*$。利用分支一定选它，探索分支也有 $1/k$ 的机会选到它：

$$\Pr(A_t=a^*)=1-\epsilon+\frac{\epsilon}{k},\qquad \Pr(A_t=a)=\frac{\epsilon}{k}\ (a\ne a^*)$$

若有 $m$ 个并列最好的动作，并且利用分支在它们之间均匀打破平局，每个最好动作的概率是 $(1-\epsilon)/m+\epsilon/k$。初始化时所有 $Q=0$，正是最容易平局的时候。

**UCB**：第二项是 exploration bonus。固定 $t$ 时，$N(a)$ 越小加分越大；一个动作长期不被选，$\ln t$ 增长又会让它重新值得考虑。$c$ 控制对不确定性的重视程度。$N(a)=0$ 时公式无定义，通常先让每个臂至少试一次。

**Softmax**：两个动作的概率比是 $\exp\big((Q(a)-Q(b))/\tau\big)$。$\tau$ 大 → 接近均匀；$\tau\to0$ → 接近贪心（$\tau$ 必须为正，不能直接代 0）。

**奖励漂移（drift）**：若最好的机器随时间改变，停止探索的规则迟迟发现不了；即使持续探索，样本平均也会被大量旧数据拖慢。此时常数步长 $Q\leftarrow Q+\alpha(R-Q)$ 让新样本保持较大影响。要区分两个开关：**选动作的规则决定采什么数据，步长决定怎样吸收数据**。
`,
    formulas: [{
      title: 'UCB',
      latex: R`a_t=\arg\max_a\Big[\htmlClass{fx-q}{Q_t(a)}+\htmlClass{fx-c}{c}\htmlClass{fx-bonus}{\sqrt{\frac{\ln t}{N(a)}}}\Big]`,
      parts: [
        { key: 'q', label: '利用：当前估计', color: 'blue', text: '平均奖励越高越想选。' },
        { key: 'bonus', label: '探索：不确定性加分', color: 'orange', text: '**UCB = Upper Confidence Bound（置信上界）**。把 $Q_t(a)$ 看成“估计 ± 误差范围”：样本均值的误差大约按 $1/\\sqrt{N(a)}$ 缩小（试 4 倍的次数，误差减半），所以加分写成 $\\sqrt{\\cdot/N(a)}$。UCB 不用估计本身，而用这个范围的**上端**——“它最好可能有多好”。$t$ 是所有机器加起来已经玩的总次数，$\\ln t$ 随它缓慢增长：久未被选的机器上界会一点点升高，所以不会被永远放弃；用 $\\ln$ 而不是 $t$，是为了让这种重试越来越稀疏。' },
        { key: 'c', label: '可调参数 c', color: 'purple', text: '控制探索程度，是人为设定的旋钮，不是推导出来的常数。$c=0$ 退化为纯贪心。' }
      ]
    }, {
      title: 'Softmax（Boltzmann）',
      latex: R`P(a)=\frac{e^{\htmlClass{fx-q}{Q_t(a)}/\htmlClass{fx-tau}{\tau}}}{\htmlClass{fx-z}{\sum_b e^{Q_t(b)/\tau}}}`,
      parts: [
        { key: 'q', label: '动作的估计价值', color: 'blue', text: '价值越高，指数越大，被选概率越高。' },
        { key: 'tau', label: '温度 τ', color: 'red', text: 'τ 大：所有指数接近，概率接近均匀（多探索）；τ 小：最大值主导（多利用）。' },
        { key: 'z', label: '归一化', color: 'gray', text: '所有动作求和，保证概率之和为 1。' }
      ]
    }],
    example: R`
**ε-greedy 概率**：$k=4$，$\epsilon=0.1$。最好动作 $0.9+0.025=0.925$，其余三个各 $0.025$，合计 1。所以 ε **不是**“选非最好动作的概率”——这里那个概率是 $3\times0.025=0.075$。

${'```'}python
# 原课程代码单元：greedy action 的总概率包含随机分支中再次选中它的概率
epsilon = 0.1
num_actions = 4
p_greedy_total = (1 - epsilon) + epsilon / num_actions
p_each_other = epsilon / num_actions
print(f"P(greedy action) = {p_greedy_total:.3f}")      # 0.925
print(f"P(each non-greedy action) = {p_each_other:.3f}")  # 0.025
${'```'}

**UCB 计算**：$t=100$，$c=1$。A：$Q=0.6,N=80$；B：$Q=0.5,N=5$。
A 的分数 $0.6+\sqrt{\ln100/80}=0.6+0.240=0.840$；B 的分数 $0.5+\sqrt{\ln100/5}=0.5+0.960=1.460$ → 选 B。

**课件的比较图（500 步）**：UCB 的平均每步奖励最高，ε-decreasing（α=0.99）次之，ε-greedy（ε=0.1）再次，softmax（τ=1）最低。在约第 250 步发生 drift 后，所有策略的表现都大幅下降；ε-decreasing（ε 已衰减到很小）和这些参数下的 UCB（旧机器的计数已经很大，加分很小，要很久才会重新试）适应最慢，softmax 因为一直按概率随机选，反而下降最少。

右侧实验的模拟和课件的图不完全一样：无 drift 时 ε-greedy 与 ε-decreasing 的先后可能对调；本站的 drift 很剧烈（最好的 D 从 3 掉到 0），D 的样本平均很快被拉低，而 A 试得少、加分大，所以 UCB 在这里反而恢复得最快。课件图中 UCB 适应慢，取决于漂移幅度和当时的计数。最稳的结论是：ε 已经衰减到接近 0 的 ε-decreasing 和不再探索的 ε-first 适应最差。
`,
    viz: { id: 'bandit', guide: R`
**怎么用**：

1. 选 ε-greedy，把 ε 设为 0，跑完：会锁死在**第一台被拉到的机器**上（不一定是差的）。原因：Q 初始 0 比所有机器的真实均值都低，被拉过的那台 Q>0，没拉过的都还是 0，贪心再也不会去试它们。多点几次“重置”，看锁定的机器是否每次不同。然后把 ε 调到 0.1，**先点“重置”按钮**再跑完（不重置的话，前面的计数还在，而且已经跑满的步数不会重跑，就不是公平的对照）。
2. 点“对比不同 ε”：120 次独立运行的平均曲线。ε=0 起步快但常常卡住；ε=0.3 一直在浪费；ε=0.1 左右通常最好。
3. 点“对比五种策略”，与课件的比较图对照；再勾选 drift 重新对比（本站模拟与课件图的差别见上面例题末尾）。读数“探索步数”：ε 类策略统计走随机分支的次数，UCB / softmax 统计选了非贪心动作的次数，两者不能直接比。` },
    compare: R`
| 策略 | 什么时候探索 | 怎样选探索对象 | 主要风险 |
|---|---|---|---|
| ε-first | 只在开始 | 均匀随机 | 早期判断错了无法纠正 |
| ε-greedy | 一直（固定比例） | 均匀随机 | 学好以后仍在浪费 |
| ε-decreasing | 越来越少 | 均匀随机 | 衰减太快 → 探索不足 |
| UCB | 由不确定性决定 | 试得少的优先 | 环境漂移时反应慢 |
| Softmax | 一直 | 按价值高低 | τ 难调；τ 大时浪费 |
`,
    pitfalls: [
      { wrong: 'ε-greedy 中 ε 是选“非最优动作”的概率。', right: '随机分支也可能选到当前 Q 最大的动作。$k$ 个动作、Q 最大的动作唯一时，它的总概率是 $1-\\epsilon+\\epsilon/k$。注意 ε-greedy 只认识**当前估计**最好的动作：真正最好的动作如果暂时被估低了，也只有 $\\epsilon/k$ 的概率被选中。' },
      { wrong: 'ε-decreasing 公式里的 α 是学习率。', right: '它是探索率的**衰减系数**，与价值更新中的学习率 α 不是一回事。' },
      { wrong: 'UCB 是给奖励加分。', right: 'UCB 给的是**选动作时用的乐观评分**，奖励和 Q 的更新本身不变。' },
      { wrong: '探索就是选从没试过的动作。', right: '探索也可以是再次选择一个试过但仍不确定的动作。' }
    ],
    quiz: [
      { kind: '公式计算', q: 'ε-greedy，$k=5$ 个动作，$\\epsilon=0.2$，当前 Q 最大的动作只有一个。它被选中的总概率是？', answer: 0.84, tol: 0.001, explain: '$0.8+0.2/5=0.84$。' },
      { kind: '公式计算', q: 'ε-greedy，$k=4$，$\\epsilon=0.2$，有两个动作的 Q 并列最大（利用分支在它们之间均分）。每个并列动作的概率？', answer: 0.45, tol: 0.001, explain: '$(1-0.2)/2+0.2/4=0.4+0.05=0.45$。' },
      { kind: '公式计算', q: 'ε-decreasing，$\\epsilon_0=1$，$\\alpha=0.99$。第 $t=100$ 次的 $\\epsilon_t$ 约为？', answer: 0.366, tol: 0.002, explain: '$0.99^{100}\\approx0.366$。' },
      { kind: '算法比较', q: '哪种策略的探索对象由“试过的次数”决定？', options: ['ε-greedy', 'ε-first', 'UCB', 'Softmax'], answer: 2, explain: 'UCB 的加分项 $c\\sqrt{\\ln t/N(a)}$ 随 $N(a)$ 减小而增大。' },
      { kind: '概念判断', q: 'Softmax 中把温度 τ 调得很大，会怎样？', options: ['接近纯贪心', '接近均匀随机', '只选最差的动作', '概率之和大于 1'], answer: 1, explain: '所有 $Q/\\tau$ 都接近 0，指数都接近 1，概率接近均匀。' }
    ],
    source: 'W7 slides 16–22（五种策略、比较图、drift 比较图）；W8-1 slide 4。'
  },
  /* ------------------------------------------------------------------ c15 */
  {
    id: 'c15', part: 'p3', title: 'Monte Carlo Prediction', en: 'Learning values from complete episodes',
    summary: '把 MDP 的每个状态当成一个 bandit，臂的“奖励”换成 discounted return $G_t$。按 policy 跑完整条 episode，倒序计算每一步的 $G_t$，再用增量平均更新 $Q(S_t,A_t)$。',
    goals: ['写出 MC prediction 算法（课件版本）', '倒序计算 $G_t$ 并更新 $N$ 与 $Q$', '复现课件三条 episode 的全部数值', '区分 first-visit 与 every-visit'],
    prereq: '第 5、13 章',
    figure: [fig('14_monte_carlo.jpg', '原课程教学图：等到终止，计算完整 return，再更新。')],
    what: R`
**Monte Carlo（MC）prediction**：给定 policy $\pi$，用完整 episode 的实际 return 估计 $q_\pi(s,a)$。

1. 初始化 $Q(s,a)\leftarrow0$，$N(s,a)\leftarrow0$，对所有 $s\in S$，$a\in A(s)$。
2. 对每条 episode：
   - 按 $\pi$ 生成一条 episode：$S_0,A_0,R_1,S_1,A_1,R_2,\dots,S_T$；
   - 对 $t=T-1,T-2,\dots,0$（**倒序**）：
     - 计数加一：$N(S_t,A_t)\leftarrow N(S_t,A_t)+1$；
     - 更新 return：$G_t\leftarrow R_{t+1}+\gamma G_{t+1}$（$G_T=0$）；
     - 更新价值：$Q(S_t,A_t)\leftarrow Q(S_t,A_t)+\frac{1}{N(S_t,A_t)}\big[G_t-Q(S_t,A_t)\big]$。

名字来源：Monte Carlo 是摩纳哥以赌场闻名的城市；MC 方法指依靠**反复随机采样**得到数值结果的一类算法，就像赌博。
`,
    why: R`
没有模型就不能算 $\sum_{s'}p(s'\mid s,a)[\dots]$。但 value 的定义本来就是期望 return：$q_\pi(s,a)=\mathbb E_\pi[G_t\mid S_t=s,A_t=a]$。期望可以用**样本平均**估计——环境替我们完成转移采样，我们不需要知道它为什么以某个概率滑移。

从 bandit 推广到 MDP（W7 slide 24）：

| | Bandit | MDP |
|---|---|---|
| 状态 | 一个 | 多个 |
| 未知 | 奖励分布 | $p$ 和 $r$ |
| 动作价值 | 平均奖励 | 平均 return |

做法：把每个状态 $S_t$ 当作一个 bandit 问题，从该状态执行的每个动作 $A_t$ 是一个臂，臂的“回报”是 discounted return $G_t$。
`,
    intuition: R`
与 bandit 的增量平均只有一个关键变化：**目标从单个奖励换成完整 return**。

**什么叫“倒序”算 return？** agent 走路的顺序是正常的；倒过来的只是 episode **结束以后**“算账”的顺序：从最后一步往前，依次算出每个时刻的 $G_t$。

以下面数值例子的 Episode 1 为例：$s_1\to s_5\to s_8\to s_9\to s_{10}\to s_{11}$，5 步的奖励是 $R_1=R_2=R_3=R_4=0$，$R_5=+1$（进入 $s_{11}$），$\gamma=0.9$。

*正着按定义算*，每个时刻都要把后面所有奖励重新加一遍：$G_0=R_1+0.9R_2+0.9^2R_3+0.9^3R_4+0.9^4R_5=0.6561$，$G_1=R_2+0.9R_3+0.9^2R_4+0.9^3R_5=0.729$……每行都是一长串，前后大量重复。

*倒着算*利用
$$G_t=R_{t+1}+\gamma\underbrace{\big(R_{t+2}+\gamma R_{t+3}+\cdots\big)}_{=\,G_{t+1}}=R_{t+1}+\gamma G_{t+1}:$$
“从 $t$ 开始的回报” = “下一步的奖励” + γ × “从 $t+1$ 开始的回报”。先知道后一步的 $G$，前一步一步就能算出。起点是终止状态：之后没有奖励，$G_5=0$。

| 计算顺序 | 时刻 | 计算 | $G_t$ |
|---|---|---|---|
| 第 1 个 | $t=4$，$(s_{10},\text{R})$ | $R_5+0.9G_5=1+0$ | 1 |
| 第 2 个 | $t=3$，$(s_9,\text{R})$ | $R_4+0.9G_4=0+0.9\times1$ | 0.9 |
| 第 3 个 | $t=2$，$(s_8,\text{R})$ | $0+0.9\times0.9$ | 0.81 |
| 第 4 个 | $t=1$，$(s_5,\text{U})$ | $0+0.9\times0.81$ | 0.729 |
| 第 5 个 | $t=0$，$(s_1,\text{U})$ | $0+0.9\times0.729$ | 0.6561 |

结果与按定义算完全相同，但每一步只要一次乘法、一次加法。这也是数值例子的表格从 $t=4$ 排到 $t=0$ 的原因——表格的行序就是计算顺序。也正因为起点 $G_T=0$ 要到终止才知道，MC 必须等 episode 结束才能开始更新。

:::key MC 的倒序递推不是 bootstrapping
这里的 $G_{t+1}$ 是**从这条轨迹实际算出来的 return**，不是价值估计。所以 MC 没有“用估计更新估计”——这正是它和下一部分 TD 的根本区别。
:::

**代价**：必须等到 episode 真正结束才有完整的目标；如果一直不结束，算法就一直没有东西可以更新。
`,
    math: R`
**MC 估计的是什么**：$Q(s,a)$ 是所有访问 $(s,a)$ 时观察到的 $G_t$ 的样本平均。由大数定律，访问次数趋于无穷时 $Q(s,a)\to q_\pi(s,a)$。MC 的 **target 无偏**（unbiased：一个随机量的**期望正好等于要估计的真值**，单次可能偏高或偏低，但不会总是偏向同一边）：$q_\pi(s,a)$ 的定义本来就是 $\mathbb E_\pi[G_t\mid S_t=s,A_t=a]$，所以每个 $G_t$ 都是它的一个无偏样本。（every-visit 时，同一条 episode 里的几个 return 彼此相关，严格说只保证样本越多越接近真值；用常数步长并从 0 初始化时，初始值也会让早期估计暂时偏低。）

**First-visit vs every-visit（W8-2 变体）**

- *Every-visit MC*：同一 episode 中 $(s,a)$ 每出现一次都用对应的 $G_t$ 更新一次（课件算法就是这样，逐时间点更新）。
- *First-visit MC*：只用按时间**正序第一次**出现的那个位置的 $G_t$。

例：一条 episode 里 $(s,a)$ 出现了两次，对应的 return 分别是 3 和 2，之前 $N=0$。First-visit 只用正序第一次的 3：$N=1$，$Q=3$。Every-visit 两次都用：$N=2$，$Q=(3+2)/2=2.5$。

注意：倒着扫描时最先遇到的重复项其实是**最后一次**访问，不能误称为 first-visit。倒序实现 first-visit 的做法：$G_t\leftarrow R_{t+1}+\gamma G_{t+1}$ 每一步照常算（不能跳过累加）；只有当 $(S_t,A_t)$ 没在更早的时刻 $0..t-1$ 出现过时，才做 $N+1$ 和 $Q$ 的更新（可以先正着扫一遍，记下每个 $(s,a)$ 第一次出现的时刻）。

**估计 V 而不是 Q**：把表的键从 $(S_t,A_t)$ 换成 $S_t$，其余完全相同。没有模型时我们更需要 Q，因为没有模型时，只有 Q 能直接告诉你同一状态下哪个动作更好。
`,
    formulas: [{
      title: 'MC 更新（课件 slide 25）',
      latex: R`\htmlClass{fx-cur}{Q(S_t,A_t)}\leftarrow \htmlClass{fx-cur}{Q(S_t,A_t)}+\htmlClass{fx-lr}{\frac{1}{N(S_t,A_t)}}\big[\htmlClass{fx-g}{G_t}-\htmlClass{fx-cur}{Q(S_t,A_t)}\big]`,
      parts: [
        { key: 'cur', label: 'current estimate', color: 'blue', text: '这个状态—动作对目前的平均 return。' },
        { key: 'g', label: 'target：实际 return G_t', color: 'green', text: '$G_t=R_{t+1}+\\gamma G_{t+1}$，从这条 episode 的真实奖励算出——没有用任何估计值。' },
        { key: 'lr', label: '步长 1/N', color: 'purple', text: '样本平均（sample average）。W8-2 也讨论常数步长 α：让近期样本影响更大。' }
      ],
      steps: [
        { keys: ['g'], text: '先算出这一步的 return。episode 结束后从最后一步往前算：终止后 $G_T=0$，然后 $G_t=R_{t+1}+\\gamma G_{t+1}$（下一步的奖励 + γ × 后一个时刻已经算好的 return）。Episode 1：$G_4=1+0.9\\times0=1$，$G_3=0+0.9\\times1=0.9$，$G_2=0.81$，$G_1=0.729$，$G_0=0.6561$——与按定义把后面所有奖励逐项相加的结果相同。' },
        { keys: ['lr'], text: '计数加一：$N(S_t,A_t)\\leftarrow N+1$，步长是新的 $1/N$。' },
        { keys: ['cur', 'g'], text: '误差 $G_t-Q$：这次 return 比当前平均高多少。' },
        { keys: ['cur'], text: '向 $G_t$ 移动 $1/N$ 的比例，得到新的样本平均。' }
      ]
    }],
    example: R`
**课件例子**（$\gamma=0.9$，policy 1：$s_1,s_5$ ↑；$s_8,s_9,s_{10}$ →；$s_2$ →；$s_3$ ↑；$s_4$ ←；$s_6$ ↑）

**Episode 1**：$s_1\xrightarrow{\text{Up}}s_5\xrightarrow{\text{Up}}s_8\xrightarrow{\text{Right}}s_9\xrightarrow{\text{Right}}s_{10}\xrightarrow{\text{Right},+1}s_{11}$

| $t$ | $(S_t,A_t)$ | $G_t$ | $N$ | $Q$ |
|---|---|---|---|---|
| 4 | $(s_{10},\text{R})$ | 1 | 1 | 1 |
| 3 | $(s_9,\text{R})$ | 0.9 | 1 | 0.9 |
| 2 | $(s_8,\text{R})$ | 0.81 | 1 | 0.81 |
| 1 | $(s_5,\text{U})$ | 0.729 | 1 | 0.729 |
| 0 | $(s_1,\text{U})$ | 0.6561 | 1 | 0.6561 |

**Episode 2**：$s_1$ 选 Up 却**右滑**到 $s_2$，之后 $s_2\to s_3\to s_6\to s_{10}\to s_{11}$。$G$ 值同样是 1、0.9、0.81、0.729、0.6561。$(s_{10},\text{R})$ 的 $N=2$，$Q=1$；$(s_1,\text{U})$ 的 $N=2$，$Q=0.6561$；新访问的 $(s_6,\text{U})=0.9$、$(s_3,\text{U})=0.81$、$(s_2,\text{R})=0.729$。

**Episode 3**：$\dots s_{10}$ 选 Right 却**右滑向下**到 $s_6$（$R=0$），$s_6$ 选 Up 又**右滑**进 $s_7$（$R=-1$）。

| $t$ | $(S_t,A_t)$ | $G_t$ | $N$ | 新 $Q$ |
|---|---|---|---|---|
| 5 | $(s_6,\text{U})$ | −1 | 2 | $(0.9-1)/2=-0.05$ |
| 4 | $(s_{10},\text{R})$ | −0.9 | 3 | $(1+1-0.9)/3=0.3667$ |
| 3 | $(s_9,\text{R})$ | −0.81 | 2 | $(0.9-0.81)/2=0.045$ |
| 2 | $(s_8,\text{R})$ | −0.729 | 2 | $(0.81-0.729)/2=0.0405$ |
| 1 | $(s_5,\text{U})$ | −0.6561 | 2 | $(0.729-0.6561)/2=0.0365$ |
| 0 | $(s_1,\text{U})$ | −0.5905 | 3 | $(0.6561\cdot2-0.5905)/3=0.2406$ |

$Q(s_{10},\text{R})$ 降到 0.3667，并不是“忘掉”了前两次成功，而是承认同一个动作可能有不同的长期结果。三条 episode 远远不够：课件说明需要多条 episode 才能得到好的估计（policy 1 与 policy 2 各跑 100 条后比较）。
`,
    viz: { id: 'mc', guide: R`
**怎么用**：

1. 一步步点“处理一步（从最后一步往前）”：第一下处理的是 Episode 1 的最后一步 $t=4$（$s_{10}$ 选 Right 进 $+1$），$G_4=1$；第二下是 $t=3$，$G_3=0+0.9\times1=0.9$……“本条 episode”表格会逐行填出 $G_t$。对照上面的三张表，一直到 Episode 3 后的 $Q(s_1,\text{Up})=0.2406$。
2. 再点“再跑 100 条随机 episode”：表格最后一列是解方程得到的真实 $q_\pi$，看估计怎样逼近它。
3. 切换到 Policy 2（只在 $s_2$ 改为 ←），比较两个 policy 的 $Q(s_1,\text{Up})$——这就是课件“用 MC 比较两个 policy”。
4. 切到“估计 V(s)”：算法完全相同，只是表的键不同。` },
    compare: R`
| | MC prediction | Policy Evaluation（DP） |
|---|---|---|
| 需要模型 | 否 | 是 |
| 目标 | 实际 return $G_t$（样本） | $\sum p[r+\gamma V]$（期望） |
| 什么时候更新 | episode 结束后 | 任何时候 |
| 能更新没去过的状态吗 | 不能 | 能 |
| 结果 | 样本平均 → $q_\pi$ | 精确 $v_\pi$ |

| | Bandit 增量平均 | MC 更新 |
|---|---|---|
| 目标 | 一次奖励 $r$ | 一次 return $G_t$ |
| 步长 | $1/N(a)$ | $1/N(s,a)$ |
`,
    pitfalls: [
      { wrong: 'MC 的 $G_t=R_{t+1}+\\gamma G_{t+1}$ 用到了估计值，所以也是 bootstrapping。', right: '$G_{t+1}$ 是同一条轨迹上**实际**算出的 return，不是 $V$ 或 $Q$ 的估计。MC 不 bootstrap。' },
      { wrong: '倒序扫描时最先遇到的重复访问就是 first-visit。', right: '倒序最先遇到的是**最后一次**访问。first-visit 指按时间正序的第一次。' },
      { wrong: 'MC 可以在 episode 中途更新。', right: '必须等 episode 终止、得到完整 return 后才能更新。' },
      { wrong: '一次 episode 后的 Q 就是 policy 的价值。', right: '单条 episode 的 return 是随机的。课件强调需要多条 episode 才能得到好的估计。' }
    ],
    quiz: [
      { kind: '轨迹推导', q: '一条 episode 的奖励 $R_1..R_4=(0,0,0,1)$，$\\gamma=0.9$。$G_1$ 是多少？', answer: 0.81, tol: 0.001, explain: '$G_3=1$，$G_2=0.9$，$G_1=0.81$。' },
      { kind: '轨迹推导', q: '$(s_6,\\text{Up})$ 第一次得到 $G=0.9$，第二次得到 $G=-1$。MC（$1/N$）后的 $Q$ 是多少？', answer: -0.05, tol: 0.001, explain: '$(0.9+(-1))/2=-0.05$，与课件 Episode 3 一致。' },
      { kind: '轨迹推导', q: '课件 Episode 3 中，$s_1$ 选 Up 后共 6 步才掉进 $-1$（$R_6=-1$）。$G_0$ 是多少？', answer: -0.5905, tol: 0.0005, explain: '$G_0=\\gamma^5\\times(-1)=-0.59049$。' },
      { kind: '公式计算', q: '$(s_1,\\text{Up})$ 前两条 episode 的 return 都是 0.6561，第三条是 $-0.59049$。用样本平均（$1/N$）更新，第三次后 $Q$ 是多少？', answer: 0.2406, tol: 0.0005, explain: '$(0.6561+0.6561-0.5905)/3=0.2406$。' },
      { kind: '算法比较', q: 'MC prediction 与 bandit 增量平均的关键区别是？', options: ['MC 不用计数', 'MC 的目标是完整 return 而不是单次奖励', 'MC 用 max', 'MC 需要转移模型'], answer: 1, explain: '形状完全相同，只是 target 从 $r$ 变成 $G_t$。' }
    ],
    source: 'W7 slides 24–34（从 bandit 到 MDP、MC prediction 算法、三条 episode 的完整数值、policy 比较）；W8-1 slides 7–15；W8-2 slide 34（first-visit / every-visit）。'
  }
  ]);
})(window);
