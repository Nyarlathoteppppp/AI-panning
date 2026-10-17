/* Part 4 · W8-1 MC control, TD prediction, TD control, MC vs TD. */
(function (root) {
  'use strict';
  const R = String.raw;
  const fig = (src, caption) => ({ src, caption });
  const TD_FORMULA = {
    title: 'TD(0) 更新：target、error、update 三者的关系',
    latex: R`\htmlClass{fx-cur}{V(S_t)}\leftarrow \htmlClass{fx-cur}{V(S_t)}+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-err}{\big[\htmlClass{fx-tgt}{\htmlClass{fx-r}{R_{t+1}}+\gamma\,\htmlClass{fx-boot}{V(S_{t+1})}}-V(S_t)\big]}`,
    parts: [
      { key: 'cur', label: 'current estimate', color: 'blue', text: '被更新的旧估计 $V(S_t)$：在刚离开的状态上，我们原来以为能拿多少。' },
      { key: 'lr', label: 'learning rate α', color: 'purple', text: '每次向 target 移动的比例。α=1 直接替换为 target；α 小则平滑多个有噪声的样本。TD 的 target 里含有还在变化的估计 $V(S_{t+1})$，早期的 target 不太准，所以常用常数 α 让新的 target 权重更大（也可以用 1/N）。' },
      { key: 'r', label: 'reward', color: 'green', text: '这一步真实得到的奖励 $R_{t+1}$——这是**已经发生**的部分。' },
      { key: 'boot', label: 'bootstrap estimate', color: 'teal', text: '对剩余未来的**估计** $V(S_{t+1})$。用一个估计去修正另一个估计，这就叫 bootstrapping。若 $S_{t+1}$ 是终止状态，这一项为 0。' },
      { key: 'tgt', label: 'TD target', color: 'orange', text: '$Y_t=R_{t+1}+\\gamma V(S_{t+1})$：一步真实奖励 + 折扣后的估计未来。对应 Bellman 方程中“一步奖励加后续价值”，但只用这一次采到的后继，而不是对所有后继求期望。' },
      { key: 'err', label: 'TD error δ', color: 'red', text: '$\\delta_t=Y_t-V(S_t)$：这一步的结果加上估计的未来，比原来预想的好多少。正 → 上调，负 → 下调。' }
    ],
    steps: [
      { keys: ['cur'], text: '从被更新的旧估计开始。' },
      { keys: ['r'], text: '走一步，观察到真实奖励 $R_{t+1}$ 和下一状态 $S_{t+1}$。' },
      { keys: ['boot'], text: '未来还没发生，用当前对 $S_{t+1}$ 的估计代替。' },
      { keys: ['tgt'], text: '两者组合成 TD target $Y_t$。' },
      { keys: ['err'], text: 'TD error = target − 旧估计。' },
      { keys: ['lr'], text: '只移动 α 倍的误差。' },
      { keys: ['cur', 'lr', 'err'], text: '新估计 = 旧估计 + α × TD error。所有 TD 类算法（SARSA、Q-learning、函数近似）都是这个形状，只是 target 不同。' }
    ]
  };
  root.RL.content.add([
  /* ------------------------------------------------------------------ c16 */
  {
    id: 'c16', part: 'p4', title: 'Monte Carlo Control 与其局限', en: 'MC control with ε-greedy improvement',
    summary: '把 Policy Iteration 的两步换成不需要模型的版本：**评估**用 MC prediction，**改进**用 bandit 的探索策略（如 ε-greedy）。它的局限是：policy 只能在 episode 结束后改变。',
    goals: ['说明为什么不能直接用 PI 的 argmax 改进', '写出 MC control（ε-greedy 训练）', '解释课件 s10 循环例子中的问题'],
    prereq: '第 9、14、15 章',
    figure: [fig('14b_monte_carlo_control.jpg', '原课程教学图：MC prediction 评估 + ε-greedy 改进。')],
    what: R`
**Monte Carlo Control** = Policy Evaluation + Policy Improvement：

- **Policy Evaluation**：Monte Carlo prediction；
- **Policy Improvement**：multi-armed bandits 的策略（ε-greedy、ε-decreasing、UCB、softmax……）。

**用 ε-greedy 训练的 MC control**（课件 W8 slide 22）：

1. 初始化 $Q(s,a)\leftarrow0$，$N(s,a)\leftarrow0$。
2. 对每条 episode：
   - 按 **ε-greedy policy**（对当前 Q）生成一条 episode $S_0,A_0,R_1,\dots,S_T$；
   - 对 $t=T-1,\dots,0$：$N\leftarrow N+1$；$G_t\leftarrow R_{t+1}+\gamma G_{t+1}$；$Q(S_t,A_t)\leftarrow Q+\frac1N[G_t-Q]$。

与 MC prediction 的唯一区别：生成 episode 的不是固定 policy，而是**对当前 Q 的 ε-greedy**，并且 Q 每更新一次，下一条 episode 的行为就会变化。
`,
    why: R`
我们已经能**评价**和**比较** policy（MC prediction），现在想要的是**找到** $\pi^*$。最自然的想法是照搬 Policy Iteration：评估 + 改进。

**课堂 quiz：不知道模型，还能用 PI 改进 policy 吗？** PI 的改进步骤是

$$\pi'(s)=\arg\max_a\sum_{s'}p(s'\mid s,a)[r+\gamma V(s')]$$

它需要 $p$ 和 $r$——不知道模型就算不出来。改用 Q 可以绕过模型（直接 $\arg\max_aQ(s,a)$），但还有第二个问题：纯贪心会自我锁死——某个动作一开始估计偏低，就再也不会被选，也就永远没机会被纠正。所以课件说：**改进时借用 bandit 的方法**，在每个状态做 ε-greedy 等探索。

不过这里的 $q$ 值“不再是简单的平均奖励”：它是长期 return 的平均，而且随 policy 变化而变化。
`,
    intuition: R`
在某个状态内部，可以把每个动作看成一台老虎机：选它，最终得到一个 return，用它更新动作价值。但这些“老虎机”是**连在一起的**：一个动作会把机器人带到别的状态，后续 policy 一变，这个动作的长期收益也跟着变。所以“MDP = 多个 bandit”只是帮助理解动作选择的局部类比，不意味着各状态可以独立解决。

**两个开关要分清**：ε 控制**收集哪些数据**；$1/N$（或 α）控制**怎样吸收** return。

样本平均把历次 return 等权平均。但训练 policy 在不断变化，旧数据来自旧行为，所以这种历史平均并不是新 policy 的精确评估——常数学习率能让最近的经验影响更大（W8-2 比较了两者）。
`,
    math: R`
**MC control 的 GPI 结构**

| GPI 步骤 | MC control 中的做法 |
|---|---|
| Evaluation | 用一条 episode 的 return 做 MC 更新（不必评估到收敛） |
| Improvement | 下一条 episode 对新的 Q 做 ε-greedy |

**ε-greedy 在状态 s 的动作概率**：令 $B(s)$ 为当前 $Q(s,\cdot)$ 最大的动作集合（可能有并列），则 $\pi(a\mid s)=\frac{\epsilon}{|A|}+(1-\epsilon)\,\frac{\mathbb 1\{a\in B(s)\}}{|B(s)|}$——利用分支的 $1-\epsilon$ 在并列的动作之间平分，概率加起来正好是 1。最大值唯一时就是“贪心动作 $1-\epsilon+\epsilon/|A|$，其他 $\epsilon/|A|$”。

**收敛的直觉条件（了解即可）**：要谈最终趋于最优，需要长期的充分探索（每个相关的状态—动作对都被访问无数次），同时让行为最终趋于贪心（例如 ε 逐渐减小）。“训练很多次”本身不够，ε 也不能很快降到 0。

**MC control 的局限（课件 slide 29）**：policy（动作选择）只在**整条 episode 结束后**才改变。
`,
    formulas: [{
      title: 'MC control：用 ε-greedy 生成数据，用 return 更新 Q',
      latex: R`\htmlClass{fx-beh}{A_t\sim\epsilon\text{-greedy}(Q(S_t,\cdot))}\quad\Rightarrow\quad \htmlClass{fx-q}{Q(S_t,A_t)}\leftarrow Q(S_t,A_t)+\htmlClass{fx-lr}{\tfrac{1}{N(S_t,A_t)}}\big[\htmlClass{fx-g}{G_t}-Q(S_t,A_t)\big]`,
      parts: [
        { key: 'beh', label: 'Improvement：ε-greedy 行为', color: 'orange', text: '对当前 Q 贪心，同时以 ε 的概率随机探索。Q 变了，行为就变了——这就是 policy improvement。' },
        { key: 'q', label: 'current estimate', color: 'blue', text: '动作价值估计；只有这条 episode 里访问过的 $(s,a)$ 会被更新。' },
        { key: 'g', label: 'target：实际 return', color: 'green', text: '要等 episode 结束才算得出来。' },
        { key: 'lr', label: '步长 1/N', color: 'purple', text: '样本平均。也可以用常数 α。' }
      ]
    }],
    example: R`
**课件例子（MC control，ε=0.1，γ=0.9，Q、N 初始为 0）**：第 1 条 episode 中所有 Q 都是 0，ε-greedy 在并列中随机选，轨迹很长、到处乱走；episode 结束后，倒序把 return 写进访问过的格子（例如靠近终点的 $Q(s_{10},\text{Right})=1$、$Q(s_9,\text{Right})=0.9$……）。第 2 条 episode 开始，行为在这些格子上就会偏向这些动作。经过 5 条 episode，贪心动作已经在多个格子上指向终点。

**局限：s10 的“循环”（slide 29）**。课件为说明问题构造了一张 Q 表，其中 $s_{10}$ 的四个估计是 Up 0.86、Right 0.8527、Left 0.7375、Down 0.6319——Up 恰好最大（这不是任何 policy 的精确 Q 值，只是训练途中可能出现的一张估计表）。在当前 episode 中：

1. 智能体在 $s_{10}$，按 ε-greedy（ε 很小）选 **Up**；
2. Up 有 0.8 的概率撞上边界、**留在 $s_{10}$**；于是又回到第 1 步……

MC 在 episode 结束前不会更新任何 Q，所以“选 Up → 撞墙”会一直重复。**能打破循环的只有概率**：偶尔滑到 $s_{11}$ 或 $s_9$，或者偶尔探索到别的动作。换成 TD 就不一样了：它每走一步就更新，撞一次墙 $Q(s_{10},\text{Up})$ 就会下降，可能在 episode 中途就改选 Right。
`,
    viz: { id: 'mccontrol', guide: R`
**怎么用**：

1. “训练 MC control”：点“1 条 episode”几次，看 Q 三角形只在**整条 episode 结束后**才变化，贪心箭头逐渐指向终点；再点“200 条”，观察“当前贪心 policy 的真实价值”上升（默认 ε=0.1 时停在约 0.52，还没到最优的 0.5452；ε 调到 0.5 能学到 0.5452，原因见第 2 条）。（这个数是网站后台用已知模型精确评估“每格选 Q 最大的动作”这个 policy 得到的，只用来给你看学得怎样，学习算法本身拿不到它。）
2. 改 ε：ε=0 时：一开始 Q 全为 0，四个动作并列，按并列均分概率，等于随机游走，前几条 episode 能正常结束；一旦 Q 不再全为 0，贪心就可能陷入循环（例如 $s_5$↑、$s_8$← 来回），episode 走满 200 步都不结束；MC 拿不到完整 return，读数会显示“未用于更新”——这正是下面 $s_{10}$ 循环问题的极端版。ε 很大时，学到的贪心 policy 通常没问题（真实价值接近 0.5452），但训练中的 $G_0$ 曲线明显更低、后期 episode 更长，因为行为里随机动作太多。
3. 切到“局限：s10 循环”，一步步走：Q 表一个数都不变，智能体反复选 Up 撞墙，直到某次滑出去。` },
    compare: R`
| | Policy Iteration | MC Control |
|---|---|---|
| 评估 | 精确解方程（需要模型） | MC prediction（需要完整 episode） |
| 改进 | 贪心 argmax | ε-greedy 等 bandit 策略 |
| 何时改进 | 评估完成后 | 每条 episode 之后 |
| 需要模型 | 是 | 否 |

| | MC prediction | MC control |
|---|---|---|
| policy | 固定 | 随 Q 改变（ε-greedy） |
| 问的问题 | 这个 policy 多好 | 最好的 policy 是什么 |
`,
    pitfalls: [
      { wrong: '每次更新后把 policy 设成纯贪心就行。', right: '纯贪心会让某个碰巧成功的动作被永远选择，没试过的动作没有数据。所以要保留探索（ε-greedy 等）。' },
      { wrong: 'MC control 中，Q 的样本平均就是当前 policy 的精确价值。', right: '旧的 return 来自旧的行为。policy 一直在变，历史平均只是近似评估。' },
      { wrong: 'MC control 可以在 episode 中途改变 policy。', right: '课件的局限正在于此：只在 episode 结束后才更新 Q、改变行为，所以会在 s10 这样的循环里卡住。' },
      { wrong: 'ε 和 1/N 都是“学习率”。', right: 'ε 决定采集什么数据（探索），1/N 或 α 决定怎样吸收数据（更新步长）。' }
    ],
    quiz: [
      { kind: '算法比较', q: 'MC control 中，“policy improvement”这一步对应什么？', options: ['解 Bellman 方程', '对当前 Q 使用 bandit 探索策略（如 ε-greedy）', '计算 return', '对 V 做 max'], answer: 1, explain: '课件：Policy Evaluation = MC prediction；Policy Improvement = multi-armed bandits。' },
      { kind: '概念判断', q: '为什么不知道模型时不能直接用 PI 的改进公式 $\\arg\\max_a\\sum p[r+\\gamma V]$？', options: ['因为 γ 未知', '因为需要 $p$ 和 $r$', '因为 V 不存在', '因为动作太多'], answer: 1, explain: '改进公式要用转移概率和奖励。用 Q 可以绕开，但还需要探索。' },
      { kind: '概念判断', q: '课件中 MC control 在 $s_{10}$ 陷入“选 Up → 撞墙 → 又选 Up”的原因是？', options: ['ε 太大', 'episode 没结束，Q 不会更新，行为也不会变', 'Up 是最优动作', '奖励为负'], answer: 1, explain: 'MC 只在 episode 结束后更新；循环中没有任何信息被用来修正 Q(s10,Up)。' },
      { kind: 'Q 值更新', q: 'MC control 中某 $(s,a)$ 已有 $N=3$、$Q=0.6$；新 episode 中它的 return 是 0.2。更新后 Q 是多少？', answer: 0.5, tol: 0.001, explain: '$N\\leftarrow4$，$Q\\leftarrow0.6+\\frac14(0.2-0.6)=0.5$。' }
    ],
    source: 'W8-1 slides 15–29（能否不用模型做 PI 的 quiz、MC control 概览与算法、5 条 episode 示例、MC prediction 与 control 的局限、s10 例子）。'
  },
  /* ------------------------------------------------------------------ c17 */
  {
    id: 'c17', part: 'p4', title: 'TD Prediction', en: 'Temporal-difference learning',
    summary: '不等 episode 结束：走一步，用“真实奖励 + 对下一状态的**估计**”作为 target，立即更新。这就是 **bootstrapping**。',
    goals: ['写出 TD target、TD error、TD 更新', '区分 TD 的 bootstrapping 与 MC 的实际 return', '复现课件三条 episode 的 TD 数值', '正确处理终止状态'],
    prereq: '第 7、15 章',
    figure: [fig('15_temporal_difference.jpg', '原课程教学图：一步之后立刻形成 target。')],
    what: R`
**Temporal Difference（TD）prediction**：给定 policy $\pi$，估计 $q_\pi(s,a)$（课件版本）：

1. 初始化 $Q(s,a)\leftarrow0$。
2. 对每条 episode，直到 $S_t$ 是终止状态：
   - 按 $\pi$ 选 $A_t$，观察 $R_{t+1}$ 和 $S_{t+1}$；
   - **Bootstrapping 更新**：
$$Q(S_t,A_t)\leftarrow Q(S_t,A_t)+\alpha\big[R_{t+1}+\gamma V(S_{t+1})-Q(S_t,A_t)\big]$$

本例的 policy 是确定性的，所以 $V(S_{t+1})$ 就是下一状态按 policy 选的动作的价值：$V(S_{t+1})=Q(S_{t+1},\pi(S_{t+1}))$。若 policy 是随机的，则 $V(S_{t+1})=\sum_a\pi(a\mid S_{t+1})Q(S_{t+1},a)$，或采样下一动作 $A_{t+1}$ 用 $Q(S_{t+1},A_{t+1})$（这就是后面要学的 SARSA）。

**状态价值版本 TD(0)**：只看 1 步真实奖励，剩下的用估计补上（所以也叫 one-step TD）。名字里的 0 来自后面 TD(λ) 中 λ=0 的情形，不是“0 步”：

$$V(S_t)\leftarrow V(S_t)+\alpha\big[R_{t+1}+\gamma V(S_{t+1})-V(S_t)\big]$$
`,
    why: R`
MC 必须等 episode 结束；如果 episode 很长、甚至不结束（例如在某个格子里反复撞墙），MC 就迟迟不能学习。

TD 来自 Bellman 方程的“一步奖励 + 后续价值”：走完一步后，这一步已经确定，剩下的未来还没发生，就**暂时用当前估计代替**。它：

- 不需要模型（与 DP 不同）：只用这一次采到的后继，而不是对所有后继求期望；
- 不需要等终止（与 MC 不同）：每一步都能更新。
`,
    intuition: R`
天气预报的比喻：周一预测“周五下雨的概率 70%”。MC 要等到周五看结果才修正周一的预测；TD 在周二看到新的预报（50%）时就修正周一的预测——用“明天的预测”去修正“今天的预测”。

**终点边界**：如果下一状态是真正的终止状态，就没有剩余未来，target 只剩 $R_{t+1}$。所以进入 $+1$ 的那一步把前一个状态的估计拉向 1，而不是 $1+\gamma$。

**信息传播得慢**：TD 早更新，不等于终点的信息会在一次正向经历中传到所有过去的状态。一条奖励为 $(0,0,1)$ 的轨迹，初始价值全为 0：前两步的 target 仍是 0，只有最后一步把终点前的状态抬高；再次经过更早的状态时，新估计才继续向前传播（课件 Episode 2 中 $s_6$ 才从 $s_{10}$ 那里得到 0.009）。MC 则在 episode 结束后一次性把完整 return 传给所有访问过的状态。
`,
    math: R`
**三个量（所有 TD 方法通用）**

$$Y_t=R_{t+1}+\gamma V(S_{t+1})\quad(\text{TD target})$$
$$\delta_t=Y_t-V(S_t)\quad(\text{TD error})$$
$$V(S_t)\leftarrow V(S_t)+\alpha\,\delta_t\quad(\text{update})$$

终止时 $Y_t=R_{t+1}$（或等价地令终止状态价值为 0）。仅仅人为暂停一次运行，并不意味着到了终止状态。

**它仍是“estimate + α(target − estimate)”**：与 bandit（target = 奖励）、MC（target = $G_t$）相同，只是 target 换成了一步 bootstrap。

**课件 TD 例子的设置**：policy 1（与 MC 例子相同），$\gamma=0.9$，$\alpha=0.1$，$Q$ 初始为 0；更新规则 $Y\leftarrow R+\gamma Q'$，$Q\leftarrow Q+\alpha(Y-Q)$，终止时 $Q'=0$。
`,
    formulas: [TD_FORMULA],
    example: R`
**手算一次**：$V(S_t)=0.2$，这次奖励 0，下一状态估计 0.8，$\gamma=0.9$，$\alpha=0.1$。

target $=0+0.9\times0.8=0.72$；TD error $=0.72-0.2=0.52$；新估计 $=0.2+0.1\times0.52=0.252$。一次样本并不让它直接变成 0.72，只是向这个有噪声的 target 移动一部分。

**课件 TD prediction 三条 episode（α=0.1，学 Q）**

| Episode | 发生了什么 | 被改变的 Q |
|---|---|---|
| 1：$s_1\to s_5\to s_8\to s_9\to s_{10}\to s_{11}$ | 前四步 target 都是 $0+0.9\times0=0$ | 只有 $Q(s_{10},\text{R})=0+0.1(1-0)=0.1$ |
| 2：$s_1$ 右滑到 $s_2\to s_3\to s_6\to s_{10}\to s_{11}$ | 在 $s_6$：target $=0+0.9\times Q(s_{10},\text{R})=0.09$ | $Q(s_6,\text{U})=0.009$；$Q(s_{10},\text{R})=0.1+0.1(1-0.1)=0.19$ |
| 3：…$s_{10}$ 下滑到 $s_6$，$s_6$ 右滑进 $s_7$（−1） | 在 $s_9$：target $=0.9\times0.19=0.171$；在 $s_{10}$：target $=0.9\times Q(s_6,\text{U})=0.0081$；在 $s_6$：target $=-1$ | $Q(s_9,\text{R})=0.0171$；$Q(s_{10},\text{R})=0.19+0.1(0.0081-0.19)=0.1718$；$Q(s_6,\text{U})=0.009+0.1(-1-0.009)=-0.0919$ |

**为什么 Episode 1 只改了一个格子**：前四步的 target 是 $0+0.9\times Q(S',\pi(S'))$，而这些 $Q(S',\cdot)$ 此时还都是初始值 0——不是那些动作没价值，而是 TD 只读**下一步**的估计，而估计还是空的。只有最后一步进入终止状态，target 才是真实奖励 1。在这个例子里（Q 从 0 开始、每条 episode 沿一条不重复的路线走），终点的奖励每条 episode 只往回多影响一格：Episode 2 中 $s_6$ 才从 $Q(s_{10},\text{R})=0.1$ 得到 0.009。这不是通则——如果同一条 episode 里重复经过某些状态，新信息在一条 episode 内也可能传得更远。

对比 MC：Episode 3 后 MC 的 $Q(s_{10},\text{R})=0.3667$（平均了三个 return），TD 只是 0.1718（每次只移动 α=0.1 的比例，并且依赖下一状态的估计）。
`,
    viz: { id: 'td', guide: R`
**怎么用**：一步步点“走一步”。每一步三张卡片显示 **① TD target → ② TD error → ③ 更新**，下面的数轴画出“旧估计 → target”的距离（红）和实际移动的 α 部分（青）。数轴上：蓝点 = 旧估计，绿点 = target，青点 = 新估计（配色和上面动画不同：动画里 target 是粉色）。

1. 核对上表三条 episode 的数值（$Q(s_{10},\text{R})$：0.1 → 0.19 → 0.1718；$Q(s_6,\text{U})$：0.009 → −0.0919）。
2. 每一步下方还给出同一步 MC 的 target（完整 return），比较两者何时一致、何时相反。
3. 把 α 调到 1：估计直接被 target 替换，波动变大。切到“学 V(s)”看状态价值版本。` },
    compare: R`
| | DP（Policy Evaluation） | MC | TD |
|---|---|---|---|
| 需要模型 | 是 | 否 | 否 |
| target | $\sum p[r+\gamma V]$（期望） | $G_t$（实际 return） | $R+\gamma V(S')$（一步样本 + 估计） |
| bootstrapping | 是（backup 用的是上一轮的估计 $V_k(s')$） | 否 | 是 |
| 采样 | 否 | 是（整条） | 是（一步） |
| 何时更新 | 任何时候 | episode 结束 | 每一步 |

“MC sampled returns / TD bootstrapping”说的是**目标怎样构造**；TD 同样使用真实采样的奖励和转移，不是没有样本。
`,
    pitfalls: [
      { wrong: 'TD target 中的 $V(S_{t+1})$ 是真实价值。', right: '它是**当前估计**。用估计修正估计正是 bootstrapping，也是 TD 偏差的来源。' },
      { wrong: '进入终点的那一步，target 是 $1+\\gamma V(\\text{终点})$，终点价值也是 1。', right: '终止状态没有未来：target 就是 $R_{t+1}=1$。' },
      { wrong: 'TD 一次 episode 就能把终点奖励传回起点。', right: 'TD 每次更新只看下一步的估计。在课件这种 Q 从 0 开始、路线不重复的例子里，终点奖励每条 episode 只往回多影响一格（Episode 1 只更新了 $Q(s_{10},\\text{R})$），要多条 episode 才能传到起点；如果同一条 episode 里重复经过某些状态，可能传得更远。' },
      { wrong: 'TD 需要转移模型，因为它用到了下一状态。', right: '下一状态是**实际观察到的**，不是从模型中枚举的。TD 是 model-free 的。' }
    ],
    quiz: [
      { kind: '公式计算', q: '$V(S_t)=0.5$，$R_{t+1}=0$，$V(S_{t+1})=0.8$，$\\gamma=0.9$，$\\alpha=0.5$。更新后 $V(S_t)$？', answer: 0.61, tol: 0.001, explain: 'target 0.72，error 0.22，$0.5+0.5\\times0.22=0.61$。' },
      { kind: '公式计算', q: '$Q(s_6,\\text{Up})=0.009$，这一步进入 $s_7$ 得到 $-1$（终止），$\\alpha=0.1$。更新后？', answer: -0.0919, tol: 0.0005, explain: 'target $=-1$（终止，无 bootstrap），$0.009+0.1(-1-0.009)=-0.0919$，与课件 Episode 3 相同。' },
      { kind: '轨迹推导', q: 'TD（Q 初始全为 0，$\\alpha=0.1$，$\\gamma=0.9$）。一条 episode 按固定 policy 走 $s_1\\to s_5\\to s_8\\to s_9\\to s_{10}\\to s_{11}$，5 步的奖励是 $(0,0,0,0,+1)$，每走一步就更新一次。这条 episode 结束后有几个 Q 值不为 0？', options: ['5 个', '1 个', '0 个', '2 个'], answer: 1, explain: '前四步的 target 都是 $0+0.9\\times0=0$，只有进入 $s_{11}$ 的那一步 target 为 1：$Q(s_{10},\\text{R})=0.1$。' },
      { kind: '算法比较', q: '下列哪种方法**同时**采样且 bootstrap？', options: ['DP', 'MC', 'TD', '穷举搜索'], answer: 2, explain: 'DP bootstrap 但不采样；MC 采样但不 bootstrap；TD 两者都有。' },
      { kind: '概念判断', q: 'TD error 为负说明？', options: ['这一步的结果加估计的未来，比原先预想的差', '学习率太大', '到达了终点', 'policy 是最优的'], answer: 0, explain: '$\\delta=Y-V(S_t)<0$：target 低于预期，估计下调。' }
    ],
    source: 'W8-1 slides 31–36（TD prediction 算法、流程图、Gridworld 例子：α=0.1、三条 episode）；W8-2 slide 25（n-step 公式取 n=1）。'
  },
  /* ------------------------------------------------------------------ c18 */
  {
    id: 'c18', part: 'p4', title: 'TD Control 与 MC vs TD', en: 'TD control, bias and variance',
    summary: 'TD control = TD prediction + ε-greedy 改进。因为每一步都更新，policy 能在 episode **中途**改变。MC 与 TD 的取舍可以用 **bias–variance** 理解。',
    goals: ['写出 TD control 并说明它为何能跳出 s10 循环', '定义 bias、variance、MSE', '解释 MC（无偏、高方差）与 TD（有偏、低方差）的来源', '知道如何公平比较 control 算法（评价 J(π)）'],
    prereq: '第 16、17 章',
    figure: [fig('15b_mc_vs_td.jpg', '原课程教学图：MC 与 TD 的 target、更新时机与 bias–variance。')],
    what: R`
**TD Control** = Policy Evaluation（TD prediction，bootstrapping）+ Policy Improvement（multi-armed bandits）。

**用 ε-greedy 训练的 TD control**（W8-1 slide 40）：

1. 初始化 $Q(s,a)\leftarrow0$。
2. 对每条 episode，直到 $S_t$ 是终止状态：
   - 按 **ε-greedy** 选 $A_t$，观察 $R_{t+1}$、$S_{t+1}$；
   - $Q(S_t,A_t)\leftarrow Q(S_t,A_t)+\alpha\big[R_{t+1}+\gamma V(S_{t+1})-Q(S_t,A_t)\big]$。

“$V(S_{t+1})$ 取哪个动作的价值”有两种答案，就是下一部分的 **SARSA**（实际选的下一动作）和 **Q-learning**（最大的）。

**Bias 与 variance**（W8-2）：估计量 $\hat\theta$ 的

- **Bias**：$\mathrm{Bias}(\hat\theta)=\mathbb E[\hat\theta]-\theta$（期望离真值多远）；
- **Variance**：$\mathrm{Var}(\hat\theta)=\mathbb E[(\hat\theta-\mathbb E[\hat\theta])^2]$（围绕自己期望的波动）；
- **MSE**：$\mathrm{MSE}(\hat\theta)=\mathrm{Bias}(\hat\theta)^2+\mathrm{Var}(\hat\theta)$。一般想让 MSE 最小；降低偏差常常会增大方差，反之亦然。

放到 RL 里：$\theta$ = 真值 $v_\pi(s)$；$\hat\theta$ = 某个方法给出的数，可以是**一个 target**（$G_t$ 或 $R_{t+1}+\gamma V(S_{t+1})$），也可以是**训练一段时间后的 $V(s)$**。随机性来自“重新跑一次，打滑和轨迹都会不同”，$\mathbb E[\hat\theta]$ 就是同一方法独立重复无数次后的平均。下面“直觉”讲的是 target 的偏差和方差，右侧实验的图讲的是重复训练很多次后的 $V(s_1)$。
`,
    why: R`
**TD 解决了 MC control 的循环问题吗？**（课件 slide 32、41）回到 $s_{10}$，用同一张构造的 Q 表（Up 0.86、Right 0.8527）：选 Up 后撞墙留在 $s_{10}$，取 $\alpha=0.2$：

$$\Delta=0+\gamma Q(s_{10},\text{Up})-Q(s_{10},\text{Up})=0.9\times0.86-0.86=-0.086$$
$$Q(s_{10},\text{Up})\leftarrow0.86+0.2\times(-0.086)=0.8428$$

- 仅有 TD **prediction**（policy 固定）时：价值变了，但动作选择还按给定 policy——“还没有”解决。
- TD **control**（对当前 Q 选动作）：0.8428 已经低于 $Q(s_{10},\text{Right})=0.8527$，贪心动作立刻变成 Right——下一次在 $s_{10}$ 按贪心选就会选 Right（保留 ε 探索时，是“更倾向”Right）。TD 发现价值变化，并在 episode 中途就改变 policy。（这里 bootstrap 用的是 $Q(s_{10},\text{Up})$：Up 是 $s_{10}$ 当前 Q 最大的动作，所以这正是 Q-learning 的 max target；SARSA 只有在实际抽到的下一动作也是 Up 时 target 才相同——若探索抽到 Right，target 是 $0.9\times0.8527=0.767$，更新结果是 0.8415，不是 0.8428。）

**怎样比较 control 算法？**（W8-2）问题是：模型未知，要尽快学到最优 policy。比较的是：学到好 policy 需要多少次交互（样本效率），以及学到的 policy 的质量 $J(\pi)=\mathbb E_{s_0}\mathbb E_\pi[G]$（外层 $\mathbb E_{s_0}$ 是对起点求平均；本课 Gridworld 固定从 $s_1$ 出发，这一层就退化了）。模型已知时可以直接算 $J(\pi)$；未知时要在环境中采样估计。

**课堂 quiz：能不能直接用学到的 $Q(s,a)$ 评价 policy？** 不能直接这么做。学到的 Q 是训练过程中的估计（可能有偏、可能对应带探索的行为 policy），应当固定学到的 policy，在环境中重新评估它的期望 return。
`,
    intuition: R`
**同一段经验，为何 MC 与 TD 更新方向不同**：$V(S_t)=0.2$，一步后 TD target 是 0.72，但这条 episode 后来意外掉进陷阱，完整 return 是 $-0.9$。同样 α=0.1：TD 当时改成 0.252，MC 在结束后改成 $0.2+0.1(-0.9-0.2)=0.09$。两者都没算错，只是用的证据不同——TD 当时还不知道之后的失误。

**方差从哪里来**：MC 的 target $G_t$ 包含整条轨迹上每一次动作随机性、环境滑移和奖励变化，所以波动大；TD 的 target 只显式采样一步，后面用（平均意义上的）估计代替，波动小。

**偏差从哪里来**：$\mathbb E[G_t\mid S_t=s]=v_\pi(s)$，所以 MC 的 target 无偏。TD 的 target 用 $V(S_{t+1})$，如果它估错了，误差就进入 target：给定当前表 $V$，这个偏差是 $\gamma\,\mathbb E[V(S_{t+1})-v_\pi(S_{t+1})\mid S_t=s]$。推导：Bellman 期望方程 $v_\pi(s)=\mathbb E[R_{t+1}+\gamma v_\pi(S_{t+1})\mid S_t=s]$；用 $\mathbb E[R_{t+1}+\gamma V(S_{t+1})\mid S_t=s]$ 减去它，两边 $R_{t+1}$ 的期望相同、相减抵消，只剩 $\gamma(V-v_\pi)$ 这一项。MC 的 $G_t$ 里没有 $V$，所以差是 0。价值估准以后偏差就消失——不是“用了 TD 就永远有偏差”。
`,
    math: R`
$$\mathrm{MSE}(\hat\theta)=\underbrace{\big(\mathbb E[\hat\theta]-\theta\big)^2}_{\text{Bias}^2}+\underbrace{\mathbb E\big[(\hat\theta-\mathbb E[\hat\theta])^2\big]}_{\text{Variance}}$$

| | MC | TD |
|---|---|---|
| target | $G_t$ | $R_{t+1}+\gamma V(S_{t+1})$ |
| target 的偏差 | 无偏（匹配该 policy 的完整采样回报） | 有偏（来自后续估计误差） |
| target 的方差 | 高（整条轨迹的随机性） | 低（只有一步的随机性） |
| 何时可用 | episode 结束后 | 每一步 |

只看某个 target 是否无偏，不足以判断有限样本下谁学得更好：任务长度、随机性、已有估计的质量都会影响结果。

**课件的实验（W8-2）**：Gridworld，8,000 训练步，每 100 步 checkpoint，50 个随机种子，γ=0.9，学习率为样本平均。比较 MC control 与 TD control 在 ε-greedy、ε-decreasing、UCB、softmax 四种训练 policy 下的样本效率：

- 一些观察：MC + ε-greedy 在 8k 步内进步慢，跑到 20k 步更好；**ε-decreasing 在 online 设置下效果更好**；
- MC vs TD 前两名（MC·UCB、MC·ε-greedy(0.5)、TD·UCB、TD·ε-greedy(0.7)）：TD control 更快接近最优值 0.5452。
- Bias/variance 图（固定最优 policy，起点 (0,0)，真值 0.5452，1000 次独立运行，相同轨迹、α=0.1，初始 V=0）：TD 早期偏差更大、之后方差远小于 first-visit MC。

这些数字是实验设置，不是算法规定；比较学习曲线前先确认评价对象、预算和随机种子。
`,
    formulas: [TD_FORMULA, {
      title: 'MSE = Bias² + Variance',
      latex: R`\htmlClass{fx-mse}{\mathrm{MSE}(\hat\theta)}=\htmlClass{fx-b}{\mathrm{Bias}(\hat\theta)^2}+\htmlClass{fx-v}{\mathrm{Var}(\hat\theta)}`,
      parts: [
        { key: 'mse', label: '均方误差', color: 'purple', text: '$\\mathbb E[(\\hat\\theta-\\theta)^2]$：估计离真值的平均平方距离。' },
        { key: 'b', label: 'Bias²', color: 'red', text: '$(\\mathbb E[\\hat\\theta]-\\theta)^2$：系统性偏离。TD 的来源：bootstrap 用了尚不准确的估计。' },
        { key: 'v', label: 'Variance', color: 'orange', text: '估计在不同运行之间的分散。MC 的来源：完整 return 包含整条轨迹的随机性。' }
      ]
    }],
    example: R`
**s10 循环，TD 一步就跳出**（课件 slide 41，α=0.2）：

| 量 | 值 |
|---|---|
| 旧 $Q(s_{10},\text{Up})$ | 0.86 |
| 观察 | 选 Up，撞墙留在 $s_{10}$，$R=0$ |
| TD error | $0+0.9\times0.86-0.86=-0.086$ |
| 新 $Q(s_{10},\text{Up})$ | $0.86-0.2\times0.086=0.8428$ |
| $Q(s_{10},\text{Right})$ | 0.8527 > 0.8428 ⇒ 贪心动作变为 Right（ε-greedy 下是更倾向 Right） |

**用数字体会 bias 与 variance**：右侧实验固定最优 policy，从 $s_1$ 出发（真值 0.5452），对比 first-visit MC 与 TD(0)（α=0.1，初始 0，相同轨迹）。典型结果：前几十条 episode，TD 的平均估计明显偏低（信息要从终点一步步传回 $s_1$）；这段时间 TD 的方差接近 0，只是因为每次运行的估计都还停在 0，不代表学得好。默认 150 条内 MC 的 MSE 基本更低；把“每次 episode 数”调到 300–400，才能看到 TD 的方差降到 MC 的约 1/4。
`,
    viz: { id: 'biasvar', guide: R`
**怎么用**：

1. “Bias / Variance 实验”：三张图分别是平均学到的 $V(s_1)$、Bias²、Variance。这里两种方法都用常数 α（不是 1/N）。MC 的 target 无偏，它的偏差只来自 V=0 的初始化：$s_1$ 被更新 $k$ 次后，初始值还剩 $(1-\alpha)^k$ 的权重，很快衰减，但方差一直较高；TD 的偏差还来自尚未准确的后继估计，所以早期偏差更大、后期方差小。调大 α，两者的方差都会上升。
2. “TD 跳出 s10 循环”：一步步走，看 Q(s10,Up) 第一次撞墙后就从 0.86 降到 0.8428，贪心动作随即变成 Right。与第 16 章 MC 的同一场景对比。` },
    compare: R`
| | MC control | TD control |
|---|---|---|
| 评估 | MC prediction | TD prediction（bootstrapping） |
| 改进 | bandit 策略 | bandit 策略 |
| 何时改变行为 | episode 结束后 | 每一步之后 |
| target（常见倾向，不是定理） | 无偏、方差通常较高 | 有偏、方差通常较低 |
| 课件 Gridworld 结果 | 较慢 | 更快接近最优 |

“无偏 / 有偏、高方差 / 低方差”说的是 target 的常见倾向，不是在每个问题里都成立的不等式：例如转移完全确定时，MC 的 target 方差可以是 0。交互里的 Bias / Variance 图统计的是“重复训练很多次后学到的 V”的偏差和方差，不是单个 target 的分布。
`,
    pitfalls: [
      { wrong: 'MC 无偏，所以一定比 TD 学得好。', right: '有限样本下看 MSE = Bias² + Variance。MC 方差大，TD 方差小；课件实验中 TD control 更快。' },
      { wrong: 'TD 的偏差永远存在。', right: '偏差来自 $V(S_{t+1})$ 的估计误差，估计变准后偏差就消失。' },
      { wrong: '可以直接用训练中学到的 Q 值作为 policy 的成绩。', right: '应固定学到的 policy，在环境中重新评估其期望 return $J(\\pi)$。' },
      { wrong: 'TD prediction 就能解决 s10 的循环。', right: '只做 prediction（policy 固定）时价值变了但动作不变；必须是 TD **control**（对当前 Q 做 ε-greedy）才会立刻改选 Right。' }
    ],
    quiz: [
      { kind: 'Q 值更新', q: '$Q(s_{10},\\text{Up})=0.86$，选 Up 撞墙留在 $s_{10}$（R=0），下一状态的价值也用 $Q(s_{10},\\text{Up})$，$\\gamma=0.9$，$\\alpha=0.2$。更新后？', answer: 0.8428, tol: 0.0005, explain: '$\\Delta=0.9\\times0.86-0.86=-0.086$；$0.86-0.0172=0.8428$。' },
      { kind: '公式计算', q: '某估计量的期望是 0.5，真值 0.55，方差 0.0005。MSE 是多少？', answer: 0.003, tol: 0.0001, explain: 'Bias² $=0.05^2=0.0025$，加方差 0.0005，得 0.003。' },
      { kind: '算法比较', q: '为什么 MC 的 target 方差通常比 TD 大？', options: ['MC 用了更大的学习率', 'MC 的 target 包含整条轨迹的随机性', 'MC 需要模型', 'MC 用了 max'], answer: 1, explain: '$G_t$ 受之后每一步的动作和环境随机性影响；TD 只采样一步。' },
      { kind: '算法比较', q: '$V(S_t)=0.2$；一步后 TD target 为 0.72；这条 episode 最终 return 为 −0.9；α=0.1。MC 更新后的值是？', answer: 0.09, tol: 0.001, explain: '$0.2+0.1(-0.9-0.2)=0.09$；TD 当时则更新为 0.252。' },
      { kind: '概念判断', q: '课件实验中，哪种训练 policy 被指出“在 online 设置下效果更好”？', options: ['ε-greedy', 'ε-decreasing', 'softmax', '纯贪心'], answer: 1, explain: 'W8-2 slide 10：Decaying works better under online setting。' }
    ],
    source: 'W8-1 slides 38–41（TD control 概览、算法、s10 循环的 TD 解决）；W8-2 slides 5–22（control 的评价与 quiz、实验设置、MC/TD × 四种训练 policy 的曲线、bias/variance 定义与实验图）。'
  }
  ]);
})(window);
