/* Part 5 · W8-2 n-step / TD(λ), SARSA, Q-learning, on-policy vs off-policy. */
(function (root) {
  'use strict';
  const R = String.raw;
  const fig = (src, caption) => ({ src, caption });
  const QL = {
    title: 'Q-learning 更新：逐项高亮',
    latex: R`\htmlClass{fx-cur}{Q(S,A)}\leftarrow \htmlClass{fx-cur}{Q(S,A)}+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-err}{\big[\htmlClass{fx-tgt}{\htmlClass{fx-r}{R}+\gamma\,\htmlClass{fx-boot}{\max_{a}Q(S',a)}}-Q(S,A)\big]}`,
    parts: [
      { key: 'cur', label: 'current estimate', color: 'blue', text: '当前 $(S,A)$ 这一格的估计——**唯一被写入**的那一格。' },
      { key: 'lr', label: 'learning rate α', color: 'purple', text: '向 target 移动的比例。' },
      { key: 'r', label: 'reward', color: 'green', text: '执行 $A$ 后真实得到的奖励。' },
      { key: 'boot', label: 'bootstrap estimate（max）', color: 'teal', text: '读取下一状态 $S\'$ 那一整行 Q 的**最大值**——假设之后按贪心（最优）行动。这里只是读数，不会命令智能体下一步执行这个动作，也不会修改 $S\'$ 那一行。若 $S\'$ 终止，这一项为 0。' },
      { key: 'tgt', label: 'TD target', color: 'orange', text: '$Y=R+\\gamma\\max_aQ(S\',a)$：Bellman **optimality** 方程的一次采样版本。' },
      { key: 'err', label: 'TD error', color: 'red', text: '$Y-Q(S,A)$：正则上调，负则下调。' }
    ],
    steps: [
      { keys: ['cur'], text: '当前估计：要更新的是出发状态的这一格。' },
      { keys: ['lr'], text: 'learning rate α。' },
      { keys: ['r'], text: 'reward：这一步的真实奖励。' },
      { keys: ['boot'], text: 'bootstrap estimate：读取 $S\'$ 一行的最大值（终止时为 0）。' },
      { keys: ['tgt'], text: 'TD target = reward + γ × bootstrap。' },
      { keys: ['err'], text: 'TD error = target − current estimate。' },
      { keys: ['cur', 'lr', 'err'], text: '新估计 = 旧估计 + α × TD error。“读取下一行，写回上一行”。' }
    ]
  };
  const SARSA = {
    title: 'SARSA 更新：逐项高亮',
    latex: R`\htmlClass{fx-cur}{Q(S,A)}\leftarrow \htmlClass{fx-cur}{Q(S,A)}+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-err}{\big[\htmlClass{fx-tgt}{\htmlClass{fx-r}{R}+\gamma\,\htmlClass{fx-boot}{Q(S',A')}}-Q(S,A)\big]}`,
    parts: [
      { key: 'cur', label: 'current estimate', color: 'blue', text: '当前 $(S,A)$ 这一格的估计。' },
      { key: 'lr', label: 'learning rate α', color: 'purple', text: '向 target 移动的比例。' },
      { key: 'r', label: 'reward', color: 'green', text: '执行 $A$ 后真实得到的奖励 $R$。' },
      { key: 'boot', label: 'bootstrap estimate Q(S′,A′)', color: 'teal', text: '$A\'$ 是训练 policy 在 $S\'$ **实际选出**的下一动作（可能是探索动作）。下一轮真的要执行这个 $A\'$。' },
      { key: 'tgt', label: 'TD target', color: 'orange', text: '$R+\\gamma Q(S\',A\')$：对 $A\'$ 的采样取平均，相当于 $\\sum_a\\pi\'(a\\mid S\')Q(S\',a)$——Bellman **expectation** 方程的采样版本。' },
      { key: 'err', label: 'TD error', color: 'red', text: 'target − 当前估计。' }
    ]
  };
  root.RL.content.add([
  /* ------------------------------------------------------------------ c19 */
  {
    id: 'c19', part: 'p5', title: 'n-step TD 与 TD(λ)', en: 'Balancing Monte Carlo and bootstrapping',
    summary: 'MC 只用实际 return，TD 只用一步 bootstrap。**n-step TD** 先看 n 个真实奖励再 bootstrap；**TD(λ)** 把所有 n-step return 按指数衰减的权重组合起来。',
    goals: ['写出 n-step return 并说明 n=1 和 n≥剩余步数的特例', '写出 episodic 与 continuing 的 λ-return 及权重', '区分 forward view 与 backward view（概念）', '了解 tabular model-free RL 的变体：first/every-visit、学习率'],
    prereq: '第 17、18 章',
    figure: [fig('15c_n_step_td_lambda.jpg', '原课程教学图：one-step TD、n-step、MC 与 TD(λ) 的连续关系。')],
    what: R`
**n-step return**：

$$G^{(n)}_t=R_{t+1}+\gamma R_{t+2}+\dots+\gamma^{n-1}R_{t+n}+\gamma^nV(S_{t+n})$$

**n-step TD 更新**：$V(S_t)\leftarrow V(S_t)+\alpha\big[G^{(n)}_t-V(S_t)\big]$

- $n=1$：TD(0)；
- $n\ge T-t$（到终点了还不够 n 步）：只累加到 $R_T$，没有 bootstrap 项 ⇒ MC 的完整 return。

**TD(λ)**：把所有 n-step return 用指数衰减的权重组合（λ-return）。

- **Episodic**：
$$G^{(\lambda)}_t=(1-\lambda)\sum_{n=1}^{T-t-1}\lambda^{n-1}G^{(n)}_t+\lambda^{T-t-1}G_t$$
权重和：$\sum_{n=1}^{T-t-1}(1-\lambda)\lambda^{n-1}+\lambda^{T-t-1}=1$。
- **Continuing**：
$$G^{(\lambda)}_t=(1-\lambda)\sum_{n=1}^{\infty}\lambda^{n-1}G^{(n)}_t,\qquad\sum_{n\ge1}\lambda^{n-1}=\frac{1}{1-\lambda}$$

更新：$V(S_t)\leftarrow V(S_t)+\alpha\big[G^{(\lambda)}_t-V(S_t)\big]$。
`,
    why: R`
MC control：只有采样的 return，没有 bootstrap；TD control：只有 bootstrap，没有完整 return。一步可能太依赖估计（偏差），等到终点又可能太迟、方差太大。**能不能把两者结合？** n-step TD 和 TD(λ) 就是课件给出的两种组合方式。

增大 n：目标少依赖一些当前估计，多包含一些真实但随机的后续结果，也要等更久才能更新；同时后来的奖励能在一次更新中影响更早的状态。没有一个固定 n 对所有任务都最好——它提供的是控制“等多久、bootstrap 多少”的旋钮。
`,
    intuition: R`
把 n 想成“先亲眼看 n 步，再相信估计”。

- n=1：看一步就相信 $V(S_{t+1})$；
- n=3：看三步，再相信 $V(S_{t+3})$；
- n=∞：一直看到结束，什么估计都不信（MC）。

TD(λ) 不只选一个 n，而是“每个 n 都参考一点”：1 步的权重 $1-\lambda$，2 步 $(1-\lambda)\lambda$，3 步 $(1-\lambda)\lambda^2$……最后把剩下的权重全部给完整 return。λ=0 只剩 1-step（TD）；episodic 情况下 λ=1 只剩完整 return（MC）。continuing 的无穷级数形式要求 $0\le\lambda<1$（$\frac1{1-\lambda}$ 在 λ=1 时无定义），只能讨论 λ→1 的极限。

**两种实现视角（课件 slide 31 的两张图）**：

- **Forward view**：站在 $S_t$ 往未来看，定义“想让价值逼近什么”（上面的 λ-return），需要等未来发生。
- **Backward view**：用 **eligibility trace**（资格迹）$z_t$ 记录哪些最近访问的状态还应该分担当前的 TD error $\delta_t$，可以在线更新，不必回看整段轨迹。只需理解概念。
`,
    math: R`
**三个“时间旋钮”各管什么**：

| 参数 | 作用 |
|---|---|
| $\gamma$ | 任务怎样评价延迟奖励（问题定义的一部分） |
| $n$ | 观察多少步再 bootstrap（估计方法） |
| $\lambda$ | 不同观察长度怎样混合（估计方法） |
| $\alpha$ | 朝 target 移动多少（学习速度） |

修改目标偏好（γ）与修改估计方法（n、λ）是两件事；λ 先决定 target 怎样混合，α 再决定朝它移动多少，二者不要多乘或漏乘。

**Tabular model-free RL 的变体（W8-2 slide 34）**

- *MC 才有的*：first-visit MC（每条 episode 只用某状态第一次出现的 return） vs every-visit MC（每次出现都用）。
- *通用的*：学习率可以是常数 α，也可以衰减（包括样本平均 $1/N$）；on-policy vs off-policy（后面两章）。

课件对比（MC control）：样本平均学习率时不同 ε 的曲线都能稳定上升；常数 α=0.1 时 first-visit / every-visit MC 的曲线都先升后降、波动更大。
`,
    formulas: [{
      title: 'n-step return',
      latex: R`G^{(n)}_t=\htmlClass{fx-real}{R_{t+1}+\gamma R_{t+2}+\dots+\gamma^{n-1}R_{t+n}}+\htmlClass{fx-boot}{\gamma^n V(S_{t+n})}`,
      parts: [
        { key: 'real', label: 'n 个真实奖励', color: 'green', text: '已经发生的部分。第 $k$ 个奖励（$k$ 从 0 数）乘 $\\gamma^k$，最后一个是 $\\gamma^{n-1}R_{t+n}$。' },
        { key: 'boot', label: 'bootstrap：n 步之后的估计', color: 'teal', text: '在 $S_{t+n}$ 用当前估计补上剩余未来，要乘 $\\gamma^n$（它从 n 步之后开始计价）。若 n 步内已经终止，这一项不存在。' }
      ]
    }, {
      title: 'λ-return（episodic）',
      latex: R`G^{(\lambda)}_t=\htmlClass{fx-w}{(1-\lambda)\sum_{n=1}^{T-t-1}\lambda^{n-1}}\,\htmlClass{fx-gn}{G^{(n)}_t}+\htmlClass{fx-last}{\lambda^{T-t-1}G_t}`,
      parts: [
        { key: 'w', label: '指数衰减的权重', color: 'purple', text: '1 步、2 步、3 步……的权重依次是 $(1-\\lambda)$、$(1-\\lambda)\\lambda$、$(1-\\lambda)\\lambda^2$……' },
        { key: 'gn', label: '各个 n-step return', color: 'teal', text: '每一个都需要 bootstrap。' },
        { key: 'last', label: '剩余权重给完整 return', color: 'green', text: 'episode 在 $T$ 结束，剩下的权重 $\\lambda^{T-t-1}$ 全部给 MC return。这一项不能丢，否则权重和不为 1。' }
      ]
    }],
    example: R`
**二步 return**：前两步奖励都是 0，$V(S_{t+2})=0.8$，$\gamma=0.9$：$G^{(2)}=0+0.9\times0+0.9^2\times0.8=0.648$。若第二步就进入终点拿到 1，则 $G^{(2)}=0+0.9\times1=0.9$，不再加未来价值。

**λ-return 完整算一次**：还剩 3 步结束，奖励 $(0,0,1)$，$\gamma=0.9$，两个中间状态的估计都暂取 0.8，$\lambda=0.5$。

| n | $G^{(n)}$ | 权重 |
|---|---|---|
| 1 | $0+0.9\times0.8=0.72$ | $1-\lambda=0.5$ |
| 2 | $0+0+0.81\times0.8=0.648$ | $(1-\lambda)\lambda=0.25$ |
| 3（完整 return） | $0.81$ | $\lambda^2=0.25$ |

$$G^{(0.5)}_t=0.5\times0.72+0.25\times0.648+0.25\times0.81=0.7245$$

若 $V(S_t)=0.2$、$\alpha=0.1$：$0.2+0.1(0.7245-0.2)=0.25245$。

**课件 Gridworld 的 1/2/3/6-step 例子**（α=0.1，episode $s_1\to s_5\to s_8\to s_9\to s_{10}\to s_{11}$，初始 Q=0；课件把同样的 n-step target 用在动作价值上：$Q(S_t,A_t)\leftarrow Q+\alpha[G^{(n)}_t-Q]$，bootstrap 项换成 $\gamma^nQ(S_{t+n},A_{t+n})$，n 步内终止就没有这一项）：1-step 只更新最后一格（0.1）；2-step 让 $s_9$ 也得到 $0.1\times0.9=0.09$；3-step 让 $s_8$ 得到 $0.1\times0.81=0.081$；6-step 已经覆盖整条 episode（等同 MC），起点也得到更新。n 越大，一条 episode 能把终点奖励传回得越远。
`,
    viz: { id: 'nstep', guide: R`
**怎么用**：轨迹固定为课件 Episode 1。

1. 估计选“V 全为 0”，t=0，把 n 从 1 拖到 6：前 4 个 n-step return 都是 0（bootstrap 到 0），n≥5 时才看到终点的奖励。
2. 改成“V = V*”：bootstrap 用的是真实最优价值，例如 1-step return $=0+0.9\times v_*(s_5)=0.9\times0.6292\approx0.566$，接近 $v_*(s_1)=0.5452$；完整 return 0.6561 则是**这条幸运轨迹**的实际回报，不是 $s_1$ 的价值。
3. 拖 λ：看表格最后一列权重怎样从“全给 1-step”（λ=0）变到“全给完整 return”（λ=1），权重和始终为 1。` },
    compare: R`
| 方法 | target | bootstrap | 何时能更新 |
|---|---|---|---|
| TD(0) | $R_{t+1}+\gamma V(S_{t+1})$ | 1 步后 | 下一步 |
| n-step TD | $G^{(n)}_t$ | n 步后 | n 步后 |
| MC | $G_t$ | 无 | episode 结束 |
| TD(λ) forward | $G^{(\lambda)}_t$（所有 n 的加权） | 混合 | episode 结束（forward）/ 在线（backward + trace） |
`,
    pitfalls: [
      { wrong: 'n-step return 的 bootstrap 项乘 $\\gamma^{n-1}$。', right: '最后一个真实奖励 $R_{t+n}$ 乘 $\\gamma^{n-1}$；bootstrap 项 $V(S_{t+n})$ 从 n 步之后计价，乘 $\\gamma^n$。' },
      { wrong: 'episodic λ-return 只有 $(1-\\lambda)\\sum\\lambda^{n-1}G^{(n)}$ 一项。', right: 'episodic 版本还要把剩余权重 $\\lambda^{T-t-1}$ 给完整 return，否则权重和不为 1。' },
      { wrong: 'λ 和 γ 都是折扣，可以互换。', right: 'γ 是问题定义（怎样评价未来奖励）；λ 是估计方法（怎样混合不同长度的 target）。' },
      { wrong: '进入终点时 n-step return 还要加 $\\gamma^nV(\\text{终点})$。', right: 'n 步内终止就没有 bootstrap 项，只累加到 $R_T$。' }
    ],
    quiz: [
      { kind: '公式计算', q: '奖励 $R_{t+1},R_{t+2}=(0,0)$，$V(S_{t+2})=0.8$，$\\gamma=0.9$。$G^{(2)}_t$？', answer: 0.648, tol: 0.0005, explain: '$0.9^2\\times0.8=0.648$。' },
      { kind: '公式计算', q: '还剩 3 步结束，λ=0.5。完整 return 的权重是多少？', answer: 0.25, tol: 0.001, explain: '$\\lambda^{T-t-1}=0.5^2=0.25$；1-step 0.5，2-step 0.25。' },
      { kind: '公式计算', q: '$G^{(1)}=0.72$，$G^{(2)}=0.648$，$G=0.81$，还剩 3 步，λ=0.5。$G^{(\\lambda)}$？', answer: 0.7245, tol: 0.0005, explain: '$0.5\\times0.72+0.25\\times0.648+0.25\\times0.81=0.7245$。' },
      { kind: '算法比较', q: 'λ=0 的 TD(λ) 等价于？', options: ['MC', 'TD(0)', '2-step TD', 'Value Iteration'], answer: 1, explain: '所有权重都给 1-step return。λ=1 才等价于 MC。' },
      { kind: '概念判断', q: 'Backward view 的 TD(λ) 用什么来在线分配 TD error？', options: ['经验回放', 'eligibility trace', 'target network', 'UCB'], answer: 1, explain: '资格迹记录最近访问的状态应分担多少当前 TD error。' }
    ],
    source: 'W8-2 slides 24–31（n-step return、1/2/3/6-step 示例、TD(λ) 权重、episodic/continuing λ-return、forward/backward view）、33–35（tabular RL 与变体、学习率对比）。'
  },
  /* ------------------------------------------------------------------ c20 */
  {
    id: 'c20', part: 'p5', title: 'SARSA（on-policy TD control）', en: 'SARSA',
    summary: 'TD control 的第一种答案：bootstrap 时用训练 policy **实际选出**的下一动作 $A\'$。名字来自五元组 $S,A,R,S\',A\'$。',
    goals: ['默写 SARSA 伪代码，包括终止分支', '解释 $A\'$ 为什么必须先抽样、再在下一轮执行', '说明 SARSA 为何是 on-policy'],
    prereq: '第 18 章',
    figure: [fig('16_sarsa.jpg', '原课程教学图：SARSA 用 policy 实际选择的下一动作。')],
    what: R`
**SARSA：on-policy TD control**——用训练 policy $\pi'$ 采样的下一动作来 bootstrap。

**伪代码（W8-2 slide 36）**

记号提醒：本节的 $\pi'$ 只是“训练时用来选动作的 policy”（课件记号），通常是 ε-greedy；它和 policy improvement 里“改进后的贪心 policy $\pi'$”不是一回事。

${'```'}text
初始化 Q(s,a)。选 α、γ，以及基于 Q 的探索性训练 policy π'（如 ε-greedy）
对每条 episode：
    初始化 S，并采样 A ~ π'(·|S)
    重复：
        执行 A，观察奖励 R 和下一状态 S'
        如果 S' 是终止状态：
            Q(S,A) ← Q(S,A) + α [ R − Q(S,A) ]
        否则：
            采样 A' ~ π'(·|S')
            Q(S,A) ← Q(S,A) + α [ R + γ Q(S',A') − Q(S,A) ]
            A ← A'
        S ← S'
    直到 S 是终止状态
    按需要根据 Q 更新训练 policy π'
${'```'}
`,
    why: R`
TD control 的更新是 $Q(S_t,A_t)\leftarrow Q+\alpha[R+\gamma V(S_{t+1})-Q]$，但没有模型时我们存的是 Q，**下一状态的价值应该接哪个动作的 Q？** SARSA 的回答最直接：接训练 policy 在 $S'$ **实际选出**的那个动作。

为什么学 Q 而不是 V：没有模型时，只知道 $V(s')$ 也算不出每个动作会把你带到哪里，只有 Q 能直接比较当前状态的动作。
`,
    intuition: R`
SARSA 在学“**以后继续按这套带探索的 policy 行动**”的长期结果。如果 $\pi'$ 是 ε-greedy，$A'$ 有时会是较差的探索动作，SARSA 的 target 也就用那个较低的 $Q(S',A')$——这不是错误，而是把“我以后也会偶尔犯错”算了进去。所以在悬崖边上，SARSA 会学得更谨慎（第 22 章）。

**时序要对齐**：$A'$ 在更新**之前**就要选好，用它构造当前 target，下一轮**真的执行**这个 $A'$。如果算 target 时抽一次、执行时又独立抽一次，就不能说 target 用的是“实际的下一动作”了。

**终止分支**：没有下一次行动，target 直接是 $R$，不需要为了凑齐五元组构造一个假的 $A'$，也不读取终点的 Q。
`,
    math: R`
**SARSA target 的期望**：对 $A'$ 的随机性取平均，

$$\mathbb E_{A'\sim\pi'}\big[R+\gamma Q(S',A')\big]=R+\gamma\sum_a\pi'(a\mid S')\,Q(S',a)$$

这正是 Bellman **expectation** 方程（按训练 policy 加权）的采样版本。所以 SARSA 评价的 policy 就是产生数据的 policy $\pi'$——**on-policy**：学习的是训练 policy 自己的价值。

**GPI 结构**：评估＝每步 SARSA 更新；改进＝训练 policy 一直对最新的 Q 做 ε-greedy（“按需要根据 Q 更新 π'”）。注意 $\pi'$ 不是一张在 episode 开始时冻结的概率表：每次要选动作时，都用**此刻**的 Q 现算 ε-greedy 概率。SARSA 已经抽好的 $A'$ 仍要在下一步执行。
`,
    formulas: [SARSA],
    example: R`
**一次 SARSA 更新**：当前 $Q(S,A)=0.5$，执行后 $R=0$，到达 $S'$。$S'$ 的四个 Q：Up 0.3、Down 0.2、Left 0.4、Right 0.8。ε-greedy 这次**实际选了 Left**（探索）。$\gamma=0.9$，$\alpha=0.1$：

$$Y=0+0.9\times Q(S',\text{Left})=0.9\times0.4=0.36$$
$$Q(S,A)\leftarrow0.5+0.1\times(0.36-0.5)=0.486$$

下一轮从 $S'$ 出发，执行的就是这个 Left。

**在课程 Gridworld 中跑 SARSA**：右侧把算法切到 SARSA，每一步都能看到“下一动作 A′（ε-greedy 抽样）”这一列，以及它怎样进入 target。
`,
    viz: { id: 'qlearn', props: { algo: 'sarsa' }, title: 'SARSA in GridWorld：A′ 先抽样、进入 target、再执行', guide: R`
**怎么用**：

1. 点**单步执行**，看表格里的“下一动作 A′”：它被用来算 target，下一步智能体真的执行它。
2. 遇到 A′ 标着“（非贪心）”的那一步，target 用的是比 max 小的 Q——这就是 SARSA 把探索代价算进价值。（标“贪心”的一步也可能是随机分支恰好抽到了贪心动作。）
3. 点**跑 100 条 episode** 后看 Q-table 和“贪心 policy 的真实价值”（网站后台用已知模型评估“每格选 Q 最大的动作”得到的真实回报，只作对照，学习算法看不到它；训练曲线则是训练时带探索的实际回报）；与第 21 章的 Q-learning 对比。` },
    compare: R`
| | SARSA | Q-learning（下一章） |
|---|---|---|
| target 中的下一动作 | 实际采样的 $A'$ | $\max_a Q(S',a)$ |
| 对应的 Bellman 方程 | expectation（按 $\pi'$） | optimality |
| 学的是谁的价值 | 训练 policy $\pi'$（on-policy） | 贪心 policy（off-policy） |
| 需要先选 A′ 吗 | 是 | 否 |
`,
    pitfalls: [
      { wrong: '算 target 时抽一个 A′，下一轮执行时再重新抽一个。', right: '必须执行同一个 $A\'$，否则 target 与实际行为脱节，不再是 SARSA。' },
      { wrong: '到终点时也要为终止状态选一个 A′。', right: '终止时 target 就是 $R$，没有 $A\'$。' },
      { wrong: 'SARSA 的 target 用了随机动作，所以是错误的估计。', right: '它估计的正是“继续按带探索的 policy 行动”的价值，这是 on-policy 的定义。' },
      { wrong: 'SARSA 更新会改写下一状态 $S\'$ 那一格。', right: '只写当前 $(S,A)$；$Q(S\',A\')$ 只被读取。' }
    ],
    quiz: [
      { kind: 'Q 值更新', q: '$Q(S,A)=0.5$，$R=0$，$Q(S\',A\')=0.4$（A′ 是实际选出的动作），$\\gamma=0.9$，$\\alpha=0.1$。SARSA 更新后 $Q(S,A)$？', answer: 0.486, tol: 0.0005, explain: 'target 0.36，$0.5+0.1(0.36-0.5)=0.486$。' },
      { kind: 'Q 值更新', q: '$Q(S,A)=0.2$，执行后进入终止状态并得到 $R=1$，$\\alpha=0.5$。SARSA 更新后？', answer: 0.6, tol: 0.001, explain: '终止：target $=R=1$；$0.2+0.5(1-0.2)=0.6$。' },
      { kind: 'On/Off-policy', q: 'SARSA 属于？', options: ['On-policy', 'Off-policy', 'Model-based', 'Policy gradient'], answer: 0, explain: 'target 中的 $A\'$ 来自训练 policy 本身，学的是训练 policy 的价值。' },
      { kind: '概念判断', q: '“SARSA”五个字母依次代表？', options: ['S, A, R, S′, A′', 'State, Action, Return, Step, Alpha', 'S, A, R, S, A（同一时刻）', 'Sample, Average, Reward, Sum, Argmax'], answer: 0, explain: '当前状态、当前动作、奖励、下一状态、下一动作。' }
    ],
    source: 'W8-2 slide 36（SARSA 伪代码、on-policy 定义）；W8-2 slide 34（on-policy vs off-policy）；W9 slide 4（target 表）。'
  },
  /* ------------------------------------------------------------------ c21 */
  {
    id: 'c21', part: 'p5', title: 'Q-learning（off-policy TD control）', en: 'Q-learning',
    summary: '用探索性的训练 policy 行动，但 bootstrap 时用**贪心**目标 policy：$R+\\gamma\\max_aQ(S\',a)$。学到的是最优动作价值 $q_*$ 的方向。',
    goals: ['默写 Q-learning 伪代码', '逐项解释更新式中的 current estimate、learning rate、reward、bootstrap、TD target、TD error', '复现 W9 的第一次 Q-learning 更新 0.1', '理解 Q-table 的读写位置'],
    prereq: '第 20 章',
    figure: [fig('17_q_learning.jpg', '原课程教学图：Q-learning 的 target、error 与更新。'), fig('20_q_table.jpg', '原课程教学图：Q-table 中只有一个 (s,a) 格子被更新。')],
    what: R`
**Q-learning：off-policy TD control**——用训练 policy $\pi'$ 行动，用贪心的目标 policy bootstrap。

**伪代码（W8-2 slide 37）**

${'```'}text
初始化 Q(s,a)。选 α、γ，以及基于 Q 的探索性训练 policy π'
对每条 episode：
    初始化 S
    重复：
        采样 A ~ π'(·|S)
        执行 A，观察奖励 R 和下一状态 S'
        如果 S' 是终止状态：
            Q(S,A) ← Q(S,A) + α [ R − Q(S,A) ]
        否则：
            Q(S,A) ← Q(S,A) + α [ R + γ max_a Q(S',a) − Q(S,A) ]
        S ← S'
    直到 S 是终止状态
    按需要根据 Q 更新训练 policy π'
${'```'}

与 SARSA 相比：不需要先选好 $A'$；下一轮在 $S'$ 重新按 $\pi'$ 选动作。
`,
    why: R`
我们最终想要的是**最优** policy，而不是“带探索的 policy”的价值。Q-learning 直接对 Bellman **optimality** 方程做采样：

$$q_*(s,a)=\sum_{s'}p(s'\mid s,a)\big[r+\gamma\max_bq_*(s',b)\big]$$

模型未知时，用这一次实际发生的 $(R,S')$ 作为这个期望的一个样本，保留对下一动作取 max 的结构。于是可以**一边用 ε-greedy 探索收集数据，一边学贪心（最优）policy 的价值**。
`,
    intuition: R`
**“读取下一行，写回上一行”**：max 只是读取 $S'$ 那一行 Q 的最大**数值**，既不修改那一行，也不替智能体执行那个动作——下一步仍由训练 policy 选（可能探索）。

**为什么另一个 policy 的数据也能用**：在 MDP 中，给定当前 $(s,a)$，这一步的后继分布由 $p(s'\mid s,a)$ 决定，与当初为什么选这个动作无关。所以探索行为得到的 $(R,S')$ 仍然是这个 $(s,a)$ 一步结果的有效样本；区别只在“之后怎么走”——Q-learning 用 max 接上贪心的未来。

但这不意味着任何数据都够用：从没在某个关键状态尝试过的动作，不会因为“off-policy”就自动学出结果。仍需要探索覆盖相关的状态—动作对。
`,
    math: R`
**target 与 error**

$$Y=R+\gamma\max_aQ(S',a),\qquad\delta=Y-Q(S,A),\qquad Q(S,A)\leftarrow Q(S,A)+\alpha\,\delta$$

终止时 $Y=R$。

**Q-table**：每个 $(s,a)$ 一个独立数字（行＝状态，列＝动作）。课程 Gridworld 有 9 个非终止状态 × 4 个动作 = **36** 个条目。贪心动作只需扫描一行取最大。一次 transition 只改**一个**格子；但因为 target 读取下一行，信息会沿着经历一步步向前传播。

**撞墙时 $S'=S$**：读取和写入涉及同一行，应先用更新前的数值算完 target，再赋值。

**为什么 max 意味着“学贪心 policy 的价值”**：贪心 policy 在 $S'$ 把概率 1 全给 Q 最大的动作，所以 $\sum_a\pi_{\text{greedy}}(a\mid S')Q(S',a)=\max_aQ(S',a)$。target 里用哪个 policy 给下一步的 Q 加权，学到的就是哪个 policy 的价值。Q-learning 的数据来自 ε-greedy（behavior policy，行为 policy：实际产生数据的那个），被评价的却是贪心 policy（target policy，目标 policy：target 里假设的那个），两者不同，所以是 off-policy。

**收敛条件（了解）**：有限、平稳、折扣的 MDP；所有相关 $(s,a)$ 被充分访问；步长满足 $\sum_n\alpha_n=\infty$、$\sum_n\alpha_n^2<\infty$（前一条保证步长总和足够大，从任何初值都能走到目标；后一条保证步长最终足够小，噪声被平均掉。$1/N$ 两条都满足，常数 α 不满足后一条）。换成固定步长或共享参数（W9）后，不能直接照搬同样的收敛保证。
`,
    formulas: [QL],
    example: R`
**W9 课件：tabular Q-learning 学一条理想轨迹**（α=0.1，γ=0.9，Q 初始为 0）

轨迹：$s_1\xrightarrow{\uparrow}s_5\xrightarrow{\uparrow}s_8\xrightarrow{\rightarrow}s_9\xrightarrow{\rightarrow}s_{10}\xrightarrow{\rightarrow,+1}s_{11}$。

- 第 1–4 次更新：$Y=0+0.9\times\max_aQ(s',a)=0$，$\delta=0$，Q 不变（课件的表格另外记录每个 $(s,a)$ 的访问次数 $N$，只用于显示；α 固定时更新用不到它）。这是因为下一状态那一行的 Q 还都是初始值 0（还没学到），不是这些动作没价值。
- 第 5 次更新 $Q(s_{10},\text{Right})$：
$$\Delta=r(s_{10},\text{Right},s_{11})+\gamma\max_bQ(s_{11},b)-Q(s_{10},\text{Right})=1+0.9\times0-0=1$$
$$Q(s_{10},\text{Right})\leftarrow0+0.1\times1=0.1$$

一条 episode 之后，贪心 policy 只在 $s_{10}$ 指向 Right，其他 8 个状态四个动作并列（都为 0）。再跑一条同样的 episode，$Q(s_9,\text{Right})$ 才第一次变成 $0.1\times0.9\times0.1=0.009$——在这种 Q 从 0 开始、路线不重复的情况下，表格 Q-learning 的信息每条 episode 只往回多传一格（同一条 episode 里重复经过状态时可能传得更远）。对比 W9 的函数近似：同一条轨迹会让**许多状态**（所有特征非零、与被更新状态共享参数的状态）的预测一起改变（第 24 章）。

**同一 transition 的数值**：旧 $Q(S,A)=0.5$，$R=0$，$S'$ 的 Q 为 (0.3, 0.8, 0.2, 0.4)：$Y=0.9\times0.8=0.72$，$Q\leftarrow0.5+0.1(0.72-0.5)=0.522$。被改的是出发状态的那一格，不是 $S'$ 中值为 0.8 的那一格。
`,
    viz: { id: 'qlearn', props: { algo: 'qlearning' }, guide: R`
**Q-Learning GridWorld**：

- **单步执行**：执行一步，表格显示当前 state、选择的 action（贪心/非贪心）、reward、next state；下面三张卡片是 TD target → TD error → 更新，数轴显示移动的距离。
- **走完本条 episode**：一直走到这条 episode 结束。
- **跑 100 条 episode**：快速训练；Q-table 中 ★ 标出每行的贪心动作，“贪心 policy 的真实价值”应逐渐接近 0.5452。
- **重置**：清空 Q 表；**上一步**：退回一步。点格子可以只看该状态的 Q 行。

建议：先**重置**，连点**单步执行**走完第一条 episode，确认只有进入终点的那一步改变了 Q（课件的 0.1 对应 α=0.1；这里默认 α=0.5，可以先把 α 拖到 0.1）。` },
    compare: R`
| | Tabular MC | SARSA | Q-learning |
|---|---|---|---|
| target | $G_t$ | $R+\gamma Q(S',A')$ | $R+\gamma\max_aQ(S',a)$ |
| bootstrap | 否 | 是 | 是 |
| 学谁的价值 | 产生数据的 policy | 训练 policy | 贪心 policy |
| on/off | on-policy | on-policy | off-policy |
| 何时更新 | episode 结束 | 每步（需先选 A′） | 每步 |
`,
    pitfalls: [
      { wrong: 'max 意味着智能体下一步必须执行那个最大值动作。', right: 'max 只用于构造 target；下一步仍由训练 policy（例如 ε-greedy）选择。' },
      { wrong: 'Q-learning 会把 $S\'$ 中最大的那一格也更新。', right: '只写当前 $(S,A)$；$S\'$ 那一行只被读取。' },
      { wrong: 'Q-learning 是 off-policy，所以不需要探索。', right: '没访问过的 $(s,a)$ 无法凭 max 学出来；仍需要探索覆盖。' },
      { wrong: 'Q-learning 学到最优 policy，所以训练时表现一定比 SARSA 好。', right: '训练时行为仍是 ε-greedy；在悬崖例子里 Q-learning 训练中的回报反而更差（第 22 章）。' }
    ],
    quiz: [
      { kind: 'Q 值更新', q: '$Q(S,A)=0.5$，$R=0$，$S\'$ 的四个 Q 为 (0.3, 0.8, 0.2, 0.4)，$\\gamma=0.9$，$\\alpha=0.1$。Q-learning 更新后 $Q(S,A)$？', answer: 0.522, tol: 0.0005, explain: 'target $=0.9\\times0.8=0.72$；$0.5+0.1\\times0.22=0.522$。' },
      { kind: 'Q 值更新', q: 'W9 例子：$Q(s_{10},\\text{Right})=0$，执行后进入 $s_{11}$ 得 $+1$，$\\alpha=0.1$。更新后？', answer: 0.1, tol: 0.0005, explain: '$\\Delta=1+0.9\\times0-0=1$，$Q=0+0.1\\times1=0.1$。' },
      { kind: '轨迹推导', q: 'Q 初始为 0，用 Q-learning 学一条 5 步、只有最后一步奖励为 1 的 episode。结束后有几个 Q 值非零？', options: ['5', '1', '0', '4'], answer: 1, explain: '前 4 步的 target 都是 $0+0.9\\times0=0$；只有最后一步非零。' },
      { kind: 'On/Off-policy', q: 'Q-learning 的行为 policy 是 ε-greedy，target 中用 max。它属于？', options: ['On-policy', 'Off-policy'], answer: 1, explain: '行为 policy（ε-greedy）与目标 policy（贪心）不同。' },
      { ctx: 'grid', kind: '公式计算', q: '课程 4×3 Gridworld 的 Q-table 有多少个需要学习的条目？', answer: 36, tol: 0, explain: '9 个非终止状态 × 4 个动作。' }
    ],
    source: 'W8-2 slide 37（Q-learning 伪代码、off-policy 定义）；W9 slides 4、11、19–25（target 表、Q-table 规模、tabular Q-learning 例子：第 5 次更新 Q(s10,Right)=0.1）。'
  },
  /* ------------------------------------------------------------------ c22 */
  {
    id: 'c22', part: 'p5', title: 'SARSA vs Q-learning：on-policy 与 off-policy', en: 'On-policy vs off-policy, Cliffworld',
    summary: '同一条经验，两种 target：SARSA 用实际的 $Q(S\',A\')$，Q-learning 用 $\\max_aQ(S\',a)$。**On-policy** 学训练 policy 自己的价值；**off-policy** 学另一个 policy 的价值。',
    goals: ['对同一 transition 算出两种 target 和更新', '区分 behavior policy 与 target policy', '解释 Cliffworld 中两种算法学到不同路线的原因', '说出 tabular RL 的局限'],
    prereq: '第 20、21 章',
    figure: [fig('18_sarsa_vs_q_learning.jpg', '原课程教学图：同一个 B 状态，SARSA 用 0.4，Q-learning 用 0.8。'), fig('19_on_policy_vs_off_policy.jpg', '原课程教学图：behavior policy 与 target policy。')],
    what: R`
**On-policy**：学习训练 policy（behavior policy）自己的价值函数。例：**SARSA**、MC control。

**Off-policy**：学习一个与训练 policy **不同**的 policy 的价值函数。例：**Q-learning**（训练用 ε-greedy，目标是贪心 policy）。

| | SARSA | Q-learning |
|---|---|---|
| target | $R+\gamma Q(S',A')$ | $R+\gamma\max_aQ(S',a)$ |
| behavior policy | ε-greedy | ε-greedy |
| target policy | 同一个 ε-greedy | 贪心 |

**哪个更好？**（W8-2 slide 39）取决于问题：

- On-policy：可能更稳定，但可能收敛到次优 policy（次优是相对于贪心最优而言，因为它考虑了探索）；
- Off-policy：能收敛到最优 policy，但可能不太稳定。

不稳定主要来自两点：① 训练时按 ε-greedy 走，估值却假设之后都贪心，行为经常碰到估值没算进去的风险（悬崖例子里训练回报波动大）；② max 总是挑当前估计最大的那个，估计里的噪声会被系统性地挑高。
`,
    why: R`
两种算法只差 target 中的一项，但学到的东西可以完全不同。判断一个算法是不是 on-policy，关键**不是**它有没有随机动作，而是“产生数据的 policy”和“被评价/优化的 policy”是否一致：可以用随机 policy on-policy 地学，也可以用随机 policy 收集数据却 off-policy 地学贪心 policy。

**Tabular RL 的局限**（W8-2 总结）：无法处理很大的状态空间、连续状态空间、连续动作空间……→ 下一周的函数近似。
`,
    intuition: R`
**Cliffworld**（课件 slide 38）：起点在左下，终点在右下，二者之间底行是悬崖（掉下去 −5）。

- 贴着悬崖走最短：完全贪心时最好；
- 远离悬崖绕一圈：更长，但更安全。

训练时行为一直是 ε-greedy，偶尔会随机走一步。

- **SARSA** 的 target 包含“以后也会偶尔随机走一步”，悬崖边的格子价值被掉崖的可能拉低，于是学到**远离悬崖**的路线。
- **Q-learning** 的 target 假设“以后都贪心”，悬崖边的格子价值不受探索影响，于是学到**贴着悬崖**的最短路线——但训练中它真的会因为探索掉下去。

这里的“安全”来自它们评价的行为不同，**不是** SARSA 公式里自带一项风险惩罚。比较“哪个更好”之前，先说清比较的是训练期间（带探索）的累计回报，还是关闭探索后贪心 policy 的表现。
`,
    math: R`
**target 的期望形式**

$$\text{SARSA:}\quad \mathbb E[Y]=R+\gamma\sum_a\pi'(a\mid S')Q(S',a)\qquad(\text{按 behavior policy 加权})$$
$$\text{Q-learning:}\quad Y=R+\gamma\max_aQ(S',a)\qquad(\text{按贪心 target policy})$$

当 $A'$ 恰好是贪心动作时，两个 target 相同；差别只出现在行为 policy 选了非贪心动作的那些步。但即使某一步 target 相同，过去不同的 target 已让两张表不同，之后的行为和经历也会继续分化。

**不要和 offline 混淆**：off-policy 描述行为与学习目标的关系；offline/online（W7）描述计算与执行是否交错。Q-learning 完全可以边交互、边从探索数据中学习。
`,
    formulas: [SARSA, QL],
    example: R`
**同一 transition 的完整对照**（原课程数值）：当前执行了 $A$，$R=0$，到达状态 B；B 的四个 Q：Up 0.3、Down 0.2、Left 0.4、Right 0.8；ε-greedy 这次实际选了 Left；$\gamma=0.9$；旧 $Q(S,A)=0.5$；$\alpha=0.1$。

| | target | 更新后 $Q(S,A)$ |
|---|---|---|
| SARSA | $0+0.9\times0.4=0.36$ | $0.5+0.1(0.36-0.5)=0.486$（下调） |
| Q-learning | $0+0.9\times0.8=0.72$ | $0.5+0.1(0.72-0.5)=0.522$（上调） |

同一次 transition，一个下调、一个上调：SARSA 认为下一步**实际要走**的选择低于预期，Q-learning 认为下一步**仍有更好的**贪心选择。注意三个层次：0.4/0.8 是下一动作的价值，0.36/0.72 是 target，0.486/0.522 才是更新后的 Q。

${'```'}python
# 原课程代码单元：同一 next state 下的 SARSA / Q-learning target
q_B = {"Up": 0.3, "Down": 0.2, "Left": 0.4, "Right": 0.8}
selected_next_action = "Left"
r, gamma = 0.0, 0.9
sarsa_target = r + gamma * q_B[selected_next_action]   # 0.36
q_learning_target = r + gamma * max(q_B.values())      # 0.72
${'```'}
`,
    viz: { id: 'sarsaq', guide: R`
**怎么用**：

1. “同一 transition 的 target”：默认就是上面的例子。把 A′ 改成 Right，两个 target 变得相同；改 B 的 Q 值，看哪一项进入了哪个 target。
2. “Cliffworld”：训练两种算法，比较学到的贪心路线（虚线）和训练曲线。调大 ε，SARSA 的路线通常会离悬崖更远；Q-learning 学的目标始终是最优（贴着悬崖）的路线，但训练回报更差。训练次数有限时，显示的路线也可能随参数和随机性变化，不必完全一致。` },
    compare: R`
| 问题 | SARSA | Q-learning |
|---|---|---|
| 行为 policy | ε-greedy | ε-greedy |
| 目标 policy | ε-greedy（同一个） | 贪心 |
| on / off | on-policy | off-policy |
| Bellman 方程 | expectation | optimality |
| Cliffworld 路线 | 远离悬崖 | 贴着悬崖 |
| 训练中回报 | 较好 | 较差（会因探索掉崖） |
| 课件评价 | 更稳定，可能次优 | 能收敛到最优，可能不稳定 |
`,
    pitfalls: [
      { wrong: '有随机动作的算法就是 off-policy。', right: '看行为 policy 与目标 policy 是否相同。SARSA 用随机的 ε-greedy，但它学的正是这个 ε-greedy，所以是 on-policy。' },
      { wrong: 'Off-policy 就是 offline，只能用旧数据。', right: 'Q-learning 可以在线交互，同时 off-policy 地学习贪心 policy。' },
      { wrong: 'SARSA 的公式里有专门的风险惩罚。', right: '没有。它更“安全”是因为 target 评价的是带探索的行为。' },
      { wrong: '某一步两个 target 相同，说明两种算法训练全程等价。', right: '只有当 $A\'$ 恰是贪心动作且两张 Q 表此刻相同时才相同；表一旦不同，后续就会分化。' }
    ],
    quiz: [
      { kind: '算法比较', q: '$S\'$ 的 Q = (Up 0.3, Down 0.2, Left 0.4, Right 0.8)，A′ = Left，R=0，γ=0.9。SARSA 与 Q-learning 的 target 之差（Q-learning − SARSA）是？', answer: 0.36, tol: 0.001, explain: '0.72 − 0.36 = 0.36。' },
      { kind: 'On/Off-policy', q: '用 ε-greedy 行动、用 ε-greedy 采样的 $A\'$ 构造 target——这是？', options: ['On-policy', 'Off-policy'], answer: 0, explain: '行为 policy 和目标 policy 相同：SARSA。' },
      { kind: 'On/Off-policy', q: '用 ε-greedy 行动、target 用 $\\max_aQ(S\',a)$——这是？', options: ['On-policy', 'Off-policy'], answer: 1, explain: '目标 policy 是贪心的，与行为 policy 不同：Q-learning。' },
      { kind: '算法比较', q: 'Cliffworld 中，为什么 Q-learning 学到贴着悬崖的路线？', options: ['因为它的学习率更大', '因为它的 target 假设之后都贪心，不计探索掉崖的代价', '因为它不用 ε-greedy', '因为它是 MC 方法'], answer: 1, explain: 'max 评价的是贪心行为；贪心时贴着悬崖最短且不会掉下去。' },
      { kind: 'On/Off-policy', q: 'MC control（ε-greedy 生成 episode，用这些 episode 的 return 更新 Q）属于？', options: ['On-policy', 'Off-policy'], answer: 0, explain: 'return 来自 ε-greedy 行为本身，学的是这个行为 policy 的价值。' }
    ],
    source: 'W8-2 slides 34、36–39（on/off-policy 定义、SARSA 与 Q-learning 伪代码、Cliffworld 学到的 policy、哪个更好）、41（tabular RL 的局限）。'
  }
  ]);
})(window);
