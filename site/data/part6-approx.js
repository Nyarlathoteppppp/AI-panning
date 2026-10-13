/* Part 6 · W9 Value-function approximation. */
(function (root) {
  'use strict';
  const R = String.raw;
  const fig = (src, caption) => ({ src, caption });
  root.RL.content.add([
  /* ------------------------------------------------------------------ c23 */
  {
    id: 'c23', part: 'p6', title: '为什么需要函数近似', en: 'Why value-function approximation?',
    summary: '表格为每个 $(s,a)$ 存一个独立的数，状态一多就既存不下、也学不完；连续状态更无法列表。改用带参数的函数 $\\hat Q(s,a;\\mathbf w)$，**一次更新能改变许多状态的预测**。',
    goals: ['复现课件的表格规模推导（36、4392、2¹⁰×1098、≈10⁹）', '写出 $\\hat V(s;\\mathbf w)$、$\\hat Q(s,a;\\mathbf w)$ 与函数近似下的 Q-learning 更新', '区分“学习目标（target）”和“价值的表示方式”'],
    prereq: '第 21、22 章',
    figure: [fig('21_function_approximation.jpg', '原课程教学图：表格逐格记忆 vs 共享参数的泛化。')],
    what: R`
**价值函数近似（Value-function approximation）**：用一个带参数的函数代替独立的表格条目，

$$\hat V(s;\mathbf w)\approx v_\pi(s),\qquad \hat Q(s,a;\mathbf w)\approx q_\pi(s,a)$$

- 从采样经验中学习参数 $\mathbf w$；
- **一次参数更新可以改变许多状态的预测**；
- 本周聚焦用 $\hat Q$ 做 control，目标是逼近 $q_*$；贪心 policy 用 $\arg\max_a\hat Q(s,a;\mathbf w)$。

两种近似 Q 函数的方式：

- **线性模型**：选特征（features），学它们的权重；
- **神经网络**：连中间表示也一起学（概念，不考）。
`,
    why: R`
**课件的规模推导（W9 slides 6–11）**

| 场景 | 非终止状态 | Q-table 条目 |
|---|---|---|
| 4×3 Gridworld | 9 | 36 |
| 40×30（10×10 的墙，2 个终点） | 1098 | 4×1098 = 4392 |
| 40×30 + 10 键控制器（可同时按下） | 1098 | $2^{10}\times1098$ |
| 1000×1000 + 10 键控制器 | $10^6$ | $2^{10}\times10^6\approx1.024\times10^9$ |
| 连续状态 $x\in[0,40],y\in[0,30]$ | 无穷 | 无穷 |

- 即使状态有限，表也可能大到存不下、学不完；
- **更重要的是：学每个条目都需要在那个 $(s,a)$ 上的经验**；
- 连续位置无法精确列进有限的表。

问题因此变成：**能否用少得多的参数，让经验在状态之间共享？**

（10 个按键可以同时按下，每个按或不按，所以动作数是 $2^{10}=1024$，不是 10。）
`,
    intuition: R`
两个格子位置略有不同，但离目标和陷阱的关系很相似。表格必须分别采样才能学到两个数；如果把它们的相似性编码进一个函数，一处经验就可能改善两处预测。这叫 **泛化（generalisation）**。

但共享不保证有利：两个状态看起来相近，却位于墙的两侧、通往终点的路径完全不同，错误的共享会把一处的好经验推广到另一处危险的地方。改善当前样本的同时让别的样本变差，叫 **干扰（interference）**。

:::key 表示与学习是两个独立的设计选择
“用什么当学习目标”（MC 的 $G_t$、SARSA 的 $R+\gamma Q(S',A')$、Q-learning 的 $R+\gamma\max Q$）与“用什么表示价值”（表格 / 线性 / 神经网络）互相独立。换成函数近似**不会**改变 on/off-policy，也**不会**自动解决探索问题。
:::

**表格是线性模型的特例**：给每个 $(s,a)$ 一个独有的 one-hot 特征，权重就是整张表摊平后的数字——每次更新只碰一个权重，完全没有共享。不同的 $(s,a)$ 使用**重叠的**非零特征时，才开始真正共享。
`,
    math: R`
**回顾**：通用更新 $\text{estimate}\leftarrow\text{estimate}+\alpha(\text{target}-\text{estimate})$；对一条采样的 $(S_t,A_t,R_{t+1},S_{t+1})$：

| 方法 | target $Y_t$ |
|---|---|
| Monte Carlo | $G_t$ |
| SARSA | $R_{t+1}+\gamma Q(S_{t+1},A_{t+1})$ |
| Q-learning | $R_{t+1}+\gamma\max_bQ(S_{t+1},b)$ |

SARSA 和 Q-learning 在终止转移时 target 都是 $R_{t+1}$。

**函数近似下的 Q-learning（W9 slide 13）**：target 不变，

$$Y_t=R_{t+1}+\gamma\max_b\hat Q(S_{t+1},b;\mathbf w)$$

更新变成在平方误差上的一步梯度。先说清记号：$\nabla_{\mathbf w}F=\big(\partial F/\partial w_1,\dots,\partial F/\partial w_d\big)^\top$ 是一个向量，第 $i$ 个分量表示“只改 $w_i$、其他权重不动时，$F$ 变化多快”。例如 $F=0.8w_1+0.3w_2$，梯度就是 $(0.8,0.3)^\top$。更新式对每个权重各做一次加法：

$$\mathbf w\leftarrow\mathbf w+\alpha\big(Y_t-\hat Q(S_t,A_t;\mathbf w)\big)\nabla_{\mathbf w}\hat Q(S_t,A_t;\mathbf w)$$

这是对损失 $L(\mathbf w)=\big(Y_t-\hat Q(S_t,A_t;\mathbf w)\big)^2$ 的**随机梯度下降**（SGD）一步（求导多出的系数 2 被吸收进 α）。
`,
    formulas: [{
      title: '函数近似下的 Q-learning 更新',
      latex: R`\htmlClass{fx-w}{\mathbf w}\leftarrow\htmlClass{fx-w}{\mathbf w}+\htmlClass{fx-lr}{\alpha}\big(\htmlClass{fx-tgt}{Y_t}-\htmlClass{fx-pred}{\hat Q(S_t,A_t;\mathbf w)}\big)\htmlClass{fx-grad}{\nabla_{\mathbf w}\hat Q(S_t,A_t;\mathbf w)}`,
      parts: [
        { key: 'w', label: '参数 w（被更新的对象）', color: 'purple', text: '不再是某一个表格格子，而是所有状态共享的一组参数。' },
        { key: 'lr', label: 'learning rate α', color: 'gray', text: '步长。' },
        { key: 'tgt', label: 'TD target Y_t', color: 'green', text: '与表格版完全相同：$R_{t+1}+\\gamma\\max_b\\hat Q(S_{t+1},b;\\mathbf w)$。更新时把它当作常数（不对它求导）。' },
        { key: 'pred', label: 'current estimate（预测）', color: 'blue', text: '模型当前对 $(S_t,A_t)$ 的预测。target − prediction 就是 TD error。' },
        { key: 'grad', label: '梯度 ∇w Q̂', color: 'orange', text: '每个参数对当前预测的局部敏感度：把“输出层面的误差”转换成“参数层面的移动方向”。线性模型中它就是特征向量 $\\mathbf x(s,a)$。' }
      ]
    }],
    example: R`
**同一条理想轨迹，两种表示学到什么**（W9 slides 19–29）：轨迹 $s_1\uparrow s_5\uparrow s_8\rightarrow s_9\rightarrow s_{10}\rightarrow s_{11}(+1)$，α=0.1。

- **Tabular Q-learning**：前 4 次更新 target 都是 0（下一状态的 Q 还都是初始值 0，不是那些动作没价值）；第 5 次 $Q(s_{10},\text{Right})=0.1$。一条 episode 后只有 1 个格子非零，其他 8 个状态的贪心动作仍是平局。
- **线性近似（Method 1，下一章）**：最后一次更新把 $\mathbf w$ 从 $(0,0)$ 改成 $(0.02,0.04)$，于是**所有非终止状态**的 $\hat V$ 都变了（$s_{10}$ 为 0.02，$s_6$ 为 0.016……；终止状态仍为 0），大多数状态因此有了明确的贪心动作（个别状态仍可能平局，例如 $s_1$ 的 Left 与 Down 都是 0.04572）。

一次经验，影响范围完全不同——这就是共享参数。
`,
    viz: { id: 'tablesize', guide: R`
**怎么用**：点四个预设复现课件表格；拖动“同时按键数”，看动作数怎样按 $2^k$ 爆炸。下方表格比较参数数量：线性近似只需要几个参数。` },
    compare: R`
| | Tabular | 线性近似 | 神经网络近似 |
|---|---|---|---|
| 学的是什么 | 每个 $(s,a)$ 一个数 | 固定特征上的权重 | 权重 **和** 中间特征 |
| 一个样本改变什么 | 一个条目 | 共享这些特征的所有预测 | 共享网络参数的所有预测 |
| 表示能力 | 完全（但不泛化） | 受特征限制 | 更强 |
| 风险 | 学不完 | 特征设计不当 → 学不会 | 训练不稳定、泛化误差 |

（W9 总结：更多的泛化意味着更少的独立学习，也意味着干扰；更好的表示仍需要数据、探索和稳定的优化。）
`,
    pitfalls: [
      { wrong: '状态太多时，用表格只是“内存不够”的问题。', right: '更关键的是每个条目都需要自己的经验；状态数一大，大多数条目永远学不到。' },
      { wrong: '10 个按键就是 10 个动作。', right: '按键可以同时按下，每个按或不按：$2^{10}=1024$ 个动作。' },
      { wrong: '换成函数近似后，Q-learning 的 target 也变了。', right: 'target 的形式不变，变的是表示方式与参数的更新方式。' },
      { wrong: '泛化总是好事。', right: '错误的共享会带来干扰：改善一个状态的预测，可能让另一个状态变差。' }
    ],
    quiz: [
      { kind: '公式计算', q: '40×30 网格中有 10×10 的墙和 2 个终止格。非终止状态有多少个？', answer: 1098, tol: 0, explain: '$1200-100-2=1098$。' },
      { kind: '公式计算', q: '40×30 网格中有 10×10 的墙和 2 个终止格，每个非终止状态有 4 个动作。Q-table 有多少条目？', answer: 4392, tol: 0, explain: '$4\\times1098=4392$。' },
      { kind: '概念判断', q: '函数近似最核心的好处是？', options: ['不需要奖励', '一次参数更新可以影响许多状态的预测（泛化）', '不再需要探索', '自动变成 on-policy'], answer: 1, explain: '参数共享使经验在状态之间传播。' },
      { kind: '概念判断', q: '课件为什么说“函数近似下的 Q-learning 更新是 SGD 的一步”？', options: ['因为它对 $L(\\mathbf w)=(Y_t-\\hat Q)^2$ 沿负梯度移动', '因为它用了 max', '因为它用 ε-greedy', '因为它需要模型'], answer: 0, explain: '把 $Y_t$ 视为常数，$-\\nabla L\\propto(Y_t-\\hat Q)\\nabla\\hat Q$。' }
    ],
    source: 'W9 slides 3–13（回顾 target 表、规模推导、连续 Gridworld、quiz、近似定义、函数近似下的 Q-learning 与 SGD）。'
  },
  /* ------------------------------------------------------------------ c24 */
  {
    id: 'c24', part: 'p6', title: '线性近似、特征与梯度更新', en: 'Linear features, shared updates, feature engineering',
    summary: '线性模型 $\\hat Q(s,a;\\mathbf w)=\\mathbf w^\\top\\mathbf x(s,a)$：特征描述状态，权重说明什么重要。梯度就是特征向量，所以一次更新沿着特征把误差分给所有权重。课件 Method 1/2/3 展示了**特征设计决定了能学到什么**。',
    goals: ['算出 $\\mathbf w^\\top\\mathbf x$ 与一次梯度更新（0.74 → 0.74438）', '复现课件 Method 1 的更新 $\\mathbf w=(0.02,0.04)$、$\\hat Q(s_{10},\\text{Right})\\approx0.8032$', '说明 Method 1、2 失败的原因和 bias 特征的作用', '写出“按动作分块”的线性 Q'],
    prereq: '第 23 章',
    figure: [fig('22_features_and_weights.jpg', '原课程教学图：features 描述状态，weights 说明什么重要。'), fig('23_linear_q_approximation.jpg', '原课程教学图：0.74 的点积计算。'), fig('24_gradient_update.jpg', '原课程教学图：误差沿梯度方向调整权重。'), fig('22b_feature_engineering.jpg', '原课程教学图：特征设计决定表示能力的上限。')],
    what: R`
**线性模型**：为每个状态—动作对选一个特征向量 $\mathbf x(s,a)\in\mathbb R^d$，学一个权重向量 $\mathbf w\in\mathbb R^d$：

$$\hat Q(s,a;\mathbf w)=\mathbf w^\top\mathbf x(s,a)=\sum_{i=1}^dw_i\,x_i(s,a)$$

**课件列出的三种构造（W9 slide 15；这是课件采用的做法，不是数学上唯一的可能）**

1. **已知 $p$ 和 $r$**：只需近似 $\hat V(s)$，再用模型算 $\hat Q(s,a;\mathbf w)=\sum_{s'}p(s'\mid s,a)\big(r(s,a,s')+\gamma\hat V(s';\mathbf w)\big)$。
2. **$p$ 已知、$r$ 未知**：所有动作只能共用一组权重；特征函数要考虑输入 $(s,a)$ 的结果。
3. **$p$ 未知**：每个动作一组权重 $\mathbf w=(\mathbf w_{a_1}^\top,\dots,\mathbf w_{a_n}^\top)^\top$，特征 $\mathbf x(s,a)=(\mathbb 1\{a=a_1\}\mathbf x(s),\dots,\mathbb 1\{a=a_n\}\mathbf x(s))^\top$，于是
$$\hat Q(s,a;\mathbf w)=\mathbf w^\top\mathbf x(s,a)=\mathbf w_a^\top\mathbf x(s)$$
例：两个动作 L、R，状态特征 $\mathbf x(s)=(0.8,0.3)$。则 $\mathbf x(s,L)=(0.8,0.3,0,0)$，$\mathbf x(s,R)=(0,0,0.8,0.3)$。梯度就是特征向量，所以选 R 更新时只改后两个（R 的）权重，L 的那一块不动。
`,
    why: R`
线性模型是最简单的“共享参数”：几个权重决定所有状态的预测。它也把函数近似最重要的问题暴露得最清楚——**模型能表示什么，完全取决于你选的特征**。

为什么需要按动作分块：如果所有动作用同一个 $\mathbf x(s)$ 和同一组权重，同一状态下四个动作的输出必然相同，无论怎么训练都选不出动作。分块后，每个动作有自己的一套评分规则，同时同一动作在不同状态之间共享参数。
`,
    intuition: R`
- **特征**回答“这个情境有哪些可以用来判断的属性”（离目标多远、离陷阱多远……）；
- **权重**回答“这些属性该怎样组合成长期价值”。

解释输出要看每一项 $w_ix_i$，不能单看特征大小，也不能把负权重理解成“输入必须为负”。

**“线性”指对参数 $\mathbf w$ 线性**。特征本身可以是坐标平方、区间指示、“是否在顶行”等非线性变换；没有加入的交互关系不会因为训练更久而自动出现。

**Bias feature**（偏置特征）：恒等于 1 的特征，它的权重学一个整体的平移量（像 $y=mx+b$ 的截距 $b$）。没有它时，所有普通特征都为 0 的状态只能预测 0。注意：bias 的**特征**固定为 1，它的**权重**是学出来的。

**梯度就是特征向量**：$\partial\hat Q/\partial w_i=x_i$。所以更新 $\Delta\mathbf w=\alpha\delta\,\mathbf x$；对另一个特征为 $\mathbf z$ 的输入，预测变化 $\Delta\hat Q(\mathbf z)=\alpha\delta\,\mathbf x^\top\mathbf z$——共享激活越多，一起变化越多；正交的输入不受影响；某个 $x_i=0$ 时，那个权重这次完全不更新。
`,
    math: R`
**从平方误差推出更新**：暂时把 target 当常数，$L(\mathbf w)=\frac12\big(Y-\hat Q(s,a;\mathbf w)\big)^2$，链式法则得 $\nabla_{\mathbf w}L=-(Y-\hat Q)\nabla_{\mathbf w}\hat Q$。梯度下降 $\mathbf w\leftarrow\mathbf w-\alpha\nabla L$：

$$\mathbf w\leftarrow\mathbf w+\alpha\big[Y-\hat Q(s,a;\mathbf w)\big]\nabla_{\mathbf w}\hat Q=\mathbf w+\alpha\,\delta\,\mathbf x(s,a)$$

加号是因为 error 定义为 target − prediction：正误差要沿“让预测变大”的方向走。

**Semi-gradient**：Q-learning 的 $Y=R+\gamma\max_b\hat Q(S',b;\mathbf w)$ 本身也含参数，但更新只对当前预测求导、把 $Y$ 当常数（W10 slide 30：“Treat $Y_t$ as fixed during the weight update”）。

**课件 Gridworld 的三种特征（已知模型，只近似 $\hat V(s)$）**

| | 特征 $\mathbf x(s)$ | 问题 |
|---|---|---|
| Method 1 | $\big(d_{\text{Manhattan}}(s,s_{11})/5,\ d_{\text{Manhattan}}(s,s_7)/5\big)$，其中 $d_{\text{Manhattan}}((x,y),(x',y'))=|x-x'|+|y-y'|$（只看坐标差，不绕墙）；4×3 网格里最远的坐标距离是 $3+2=5$，所以除以 5 | 正、负终点挨得太近，“靠近 +1”几乎总是“靠近 −1”；多对状态特征完全相同 |
| Method 2 | $\big(y/2,\ \mathbb 1\{y=2\}\,x/3\big)$，$s=(x,y)$ | 先往上、再往右；底行四个状态特征全为 0 |
| Method 3 | $\big(1,\ y/2,\ \mathbb 1\{y=2\}\,x/3\big)$ | 加 bias：底行可以非零，但底行四个状态仍共享同一个值 |
`,
    formulas: [{
      title: '线性预测与梯度更新',
      latex: R`\htmlClass{fx-pred}{\hat Q(s,a;\mathbf w)}=\htmlClass{fx-w}{\mathbf w}^\top\htmlClass{fx-x}{\mathbf x(s,a)},\qquad \htmlClass{fx-w}{\mathbf w}\leftarrow\htmlClass{fx-w}{\mathbf w}+\htmlClass{fx-lr}{\alpha}\,\htmlClass{fx-err}{\big[Y-\hat Q(s,a;\mathbf w)\big]}\,\htmlClass{fx-x}{\mathbf x(s,a)}`,
      parts: [
        { key: 'x', label: '特征 x（描述状态，也是梯度）', color: 'blue', text: '输入的数值描述。在线性模型里 $\\nabla_{\\mathbf w}\\hat Q=\\mathbf x$：哪个特征越大，它的权重这次改得越多；为 0 的特征对应的权重不动。' },
        { key: 'w', label: '权重 w（学到的重要性）', color: 'purple', text: '所有状态共享的参数。' },
        { key: 'pred', label: '预测 Q̂', color: 'teal', text: '点积：$\\sum_iw_ix_i$。它是模型当前的长期价值估计，不是这次的奖励。' },
        { key: 'err', label: 'TD error', color: 'red', text: 'target − prediction。' },
        { key: 'lr', label: 'α', color: 'gray', text: '步长：缩放移动幅度，但弥补不了缺失的特征或错误的目标。' }
      ]
    }],
    example: R`
**例 1：点积与一次梯度更新（原课程数值）**

$\mathbf x=(0.8,0.3)$，$\mathbf w=(1.0,-0.2)$：$\hat Q=1.0\times0.8+(-0.2)\times0.3=0.74$。

target $Y=0.8$，误差 $\delta=0.06$，$\alpha=0.1$：

$$\Delta\mathbf w=0.1\times0.06\times(0.8,0.3)=(0.0048,0.0018),\qquad \mathbf w'=(1.0048,-0.1982)$$

新预测 $1.0048\times0.8-0.1982\times0.3=0.74438$：向 0.8 靠近，但没有一步到位。

${'```'}python
# 原课程代码单元：对线性 Q-hat = w^T x，gradient 就是 x
x = [0.8, 0.3]
w = [1.0, -0.2]
alpha, target = 0.1, 0.8
prediction = sum(w_i * x_i for w_i, x_i in zip(w, x))          # 0.74
error = target - prediction                                     # 0.06
w_new = [w_i + alpha * error * x_i for w_i, x_i in zip(w, x)]  # [1.0048, -0.1982]
prediction_new = sum(w_i * x_i for w_i, x_i in zip(w_new, x))  # 0.74438
${'```'}

**例 2：课件 Method 1 的共享更新（W9 slide 28）**

观察 $s_{10}\xrightarrow{\text{Right},+1}s_{11}$（终止）。注意这个算例学的是**状态价值** $\hat V(s;\mathbf w)=\mathbf w^\top\mathbf x(s)$（课件这里假设转移模型已知），采样目标是 $Y^V=r+\gamma\hat V(s')$，进入终止状态时后续价值为 0，所以 $Y^V=1$；动作价值稍后再用已知模型从 $\hat V$ 展开一步算出，并不是把前面的 $\hat Q$ 更新式原样代入。$\mathbf x(s_{10})=(1/5,2/5)$，$\alpha=0.1$，$\mathbf w=(0,0)$：

$$\delta=1-\hat V(s_{10};\mathbf w)=1-0=1,\qquad \mathbf w^+=(0,0)+0.1\times1\times(1/5,2/5)=(0.02,0.04)$$
$$\hat V^+(s_{10})=0.02\cdot\tfrac15+0.04\cdot\tfrac25=0.0200,\qquad \hat V^+(s_6)=0.02\cdot\tfrac25+0.04\cdot\tfrac15=0.0160$$

动作价值用已知的转移模型算。$s_{10}$ 选 Right：0.8 按意图进入终止格 $s_{11}$，得 1，后续价值为 0；0.1 向左打滑（向北）撞边界留在 $s_{10}$；0.1 向右打滑（向南）到 $s_6$；后两条奖励为 0：
$$\hat Q^+(s_{10},\text{Right})=0.8\times1+0.1\times0.9\times0.0200+0.1\times0.9\times0.0160\approx0.8032$$

**例 3：为什么 Method 1 学得很差（slide 30）**：$s_4=(3,0)$ 与 $s_6=(2,1)$ 的特征都是 $(0.4,0.2)$，$s_2=(1,0)$ 与 $s_5=(0,1)$ 都是 $(0.8,0.6)$——模型无法区分它们，但 $s_6$ 靠近 $-1$ 的风险与 $s_4$ 完全不同。课件解释：负奖励离正奖励太近，学习中早期的一次负奖励会让智能体停止探索。

**例 4：Method 2 的零特征（slides 31–35）**：底行 $s_1..s_4$ 的特征都是 $(0,0)$，所以无论权重是多少，$\hat V(s_1;\mathbf w)=w_1\cdot0+w_2\cdot0=0$，而 $v_*(s_1)\approx0.5452$。**再多训练也无法修复**——这是函数形式的硬限制，不是学习率或训练时间的问题。Method 3 加上 bias：$\hat V(s_1)=w_0$（例如 $w_0=0.5$ 就预测 0.5），但底行四个状态仍共享 $(1,0,0)$，还需要能区分它们的特征。

:::note 课件中的两处笔误
- slide 30 写的“$s_4=(1,1)$、$s_6=(2,1)$”和“$s_2=(0,2)$、$s_5=(1,2)$”与本题网格的坐标不符（$(1,1)$ 是墙；按网格 $s_4=(3,0)$、$s_6=(2,1)$、$s_2=(1,0)$、$s_5=(0,1)$）。这一页要说明的是：按 Method 1 的定义，$s_4$ 与 $s_6$ 的特征都是 $(0.4,0.2)$，$s_2$ 与 $s_5$ 的特征都是 $(0.8,0.6)$——两组状态各自无法区分。
- slide 32 正文用 $(2/5,2/5)$ 算出 $\hat Q(s_{10},\text{Right})=0.032$，与 Method 2 的定义不符；同页的图按 $\boldsymbol\varphi(s_{10})=(1,2/3)$ 算出 $\mathbf w=(0.1,1/15)$、$\hat V(s_{10})=0.1444$。按定义 $s_{10}=(2,2)$：$y/2=1$，$x/3=2/3$，所以图中的 0.1444 才是一致的结果。
:::
`,
    viz: { id: 'linear', guide: R`
**怎么用**：

1. 选 Method 1，点“执行课件的一次更新”：核对 $\mathbf w=(0.02,0.04)$、$\hat V(s_{10})=0.02$、$\hat V(s_6)=0.016$、$\hat Q(s_{10},\text{Right})\approx0.8032$；下方表格显示**所有**状态的预测一起变了。
2. 看“特征完全相同的状态”：Method 1 有 $\{s_2,s_5\}$、$\{s_4,s_6\}$ 等；Method 2 的底行全部相同。
3. 点“用 200 条 episode 训练”：比较三种特征最后的 $\hat V$ 与 $V^*$。Method 2 的底行永远是 0。（这个训练让 agent 按**固定的最优 policy** 走，只用线性 TD(0) 学状态价值，目的是看“特征能不能表示出正确的价值”；它不是让近似 Q-learning 自己探索、改进 policy，所以不会复现正文说的“早期负奖励导致停止探索”。）` },
    compare: R`
| | Tabular（one-hot 特征） | 手工特征的线性模型 |
|---|---|---|
| 参数数 | $|S|\times|A|$ | 特征数（× 动作数） |
| 一次更新影响 | 一个条目 | 所有共享非零特征的状态 |
| 能否表示任意价值 | 能 | 不一定（取决于特征） |
| 失败原因的排查 | 数据不够 | 先查表示（特征是否能区分）→ 再查数据覆盖 → 再查更新过程 |

**特征设计的两难**：**只用**每个状态一个独立的 one-hot 特征，会恢复表格的表达能力，但也失去了跨状态的共享；好的特征在“压缩”和“保留决策需要的差异”之间取舍。课件总结：线性近似用固定特征上的线性权重，通常难以刻画复杂关系；非平凡问题的选择是“非线性特征 + 线性近似”或“非线性函数近似器（如神经网络）”。
`,
    pitfalls: [
      { wrong: '负权重说明这个特征是坏的。', right: '要看 $w_ix_i$：负权重乘以“靠近陷阱”这类特征，正好把危险状态的预测压低。' },
      { wrong: '训练足够久，任何特征都能学到 $v_*$。', right: '若两个价值不同的状态特征相同，或某状态特征全为 0（无 bias），任何权重都拟合不了。这是表示问题，不是训练问题。' },
      { wrong: 'Bias 特征的权重固定为 1。', right: '固定为 1 的是 bias **特征**，它的权重是学出来的。' },
      { wrong: '所有动作共用 $\\mathbf x(s)$ 和一组权重，也能比较动作。', right: '那样同一状态的所有动作预测相同。要么按动作分块权重，要么已知模型时用 $\\hat V$ 展开一步。' },
      { wrong: '梯度更新会把预测一步拉到 target。', right: '只移动 $\\alpha\\delta\\,\\mathbf x^\\top\\mathbf x$；例 1 中从 0.74 到 0.74438。' }
    ],
    quiz: [
      { kind: '公式计算', q: '$\\mathbf x=(0.8,0.3)$，$\\mathbf w=(1.0,-0.5)$。$\\hat Q$？', answer: 0.65, tol: 0.001, explain: '$0.8-0.15=0.65$。' },
      { kind: 'Q 值更新', q: '$\\mathbf x=(0.8,0.3)$，$\\mathbf w=(1.0,-0.2)$，$Y=0.8$，$\\alpha=0.1$。更新后的 $w_1$？', answer: 1.0048, tol: 0.00005, explain: '$\\delta=0.06$，$\\Delta w_1=0.1\\times0.06\\times0.8=0.0048$。' },
      { kind: '公式计算', q: 'Method 1：$\\mathbf w=(0.02,0.04)$。$s_6$ 的特征是 $(2/5,1/5)$，$\\hat V(s_6)$？', answer: 0.016, tol: 0.0001, explain: '$0.02\\times0.4+0.04\\times0.2=0.016$。' },
      { kind: '概念判断', q: 'Method 2 下 $\\hat V(s_1)$ 恒为 0 的原因是？', options: ['学习率太小', '训练不够久', '$\\mathbf x(s_1)=(0,0)$，任何权重的点积都是 0', 'γ 太小'], answer: 2, explain: '零特征强制零预测；需要 bias 等额外特征。' },
      { kind: '概念判断', q: '模型未知时，课件给出的线性 Q 构造是？', options: ['所有动作共享一组权重', '每个动作一组权重：$\\hat Q(s,a)=\\mathbf w_a^\\top\\mathbf x(s)$', '只近似 $\\hat V$', '用 softmax'], answer: 1, explain: 'W9 slide 15 的第三种情况。' }
    ],
    source: 'W9 slides 15–37（线性模型与三种情况、Method 1 特征、一条 episode 的 tabular 与近似 Q-learning、Method 1 更新与 0.8032、Method 1/2/3 的样本效率与问题、零特征与 bias）；原课程 0.74 / 0.74438 算例。'
  },
  /* ------------------------------------------------------------------ c25 */
  {
    id: 'c25', part: 'p6', title: '神经网络 Q 与 DQN（概念）', en: 'Neural Q-functions & DQN — not examinable',
    summary: '线性模型依赖手工特征。神经网络连**中间表示**也一起学：输入状态，一次输出所有动作的 Q 值。Deep Q-learning 保留 Q-learning 的 target。课件标注**不考**，只需概念。',
    goals: ['说出线性近似与神经网络近似“供给什么、学什么”的区别', '描述 state → network → Q(s,a₁..aₙ) → action 的流程', '知道 DQN 是 deep Q-learning 的一个例子；（延伸）replay buffer 与 target network 的作用', '把整门 value-based RL 串成一条流程'],
    prereq: '第 21、24 章',
    figure: [fig('25_neural_q_and_dqn.jpg', '原课程教学图：状态 → 网络 → 每个动作一个 Q 值。'), fig('26_full_rl_pipeline.jpg', '原课程教学图：完整的 RL 学习循环。')],
    what: R`
:::warn 课件范围
W9 slides 40–42 标注 **Not examinable**：概念介绍，网络计算和训练细节不考。
:::

| 方法 | 我们提供什么 | 学到什么 |
|---|---|---|
| 线性近似 | 固定的特征 | 这些特征上的权重 |
| 神经网络近似 | 状态输入 | 中间特征 **和** 权重 |

- 神经网络能学到输入的有用非线性组合；**深度**网络用多个隐藏层学习表示。
- 我们仍然要选择提供哪些状态信息。

**Gridworld 的神经 Q 函数**（slide 41）：输入坐标 $(x,y)$ → 隐藏层 1 → 隐藏层 2 → 四个输出 $q_U,q_D,q_L,q_R$。

- 一个状态产生 Up、Down、Left、Right 四个 Q 值估计；
- 每个输出估计该动作的期望折扣回报；
- 贪心 policy 选最大的估计，**探索仍然重要**。

**Deep Q-learning**（slide 42）：用深度神经网络估计 $Q(s,a)$；奖励、折扣因子和 Q-learning target 的角色不变；共享网络参数让经验影响许多状态和动作；学到的特征有助于处理复杂输入（如图像）。**DQN**（Deep Q-Network）是 deep Q-learning 的一个著名例子。
`,
    why: R`
线性模型的局限不只是参数少，而是**中间表示要事先设计**——Method 1/2/3 的教训就是特征设计很难。神经网络让“哪些输入特征有用”也从数据中学出来，适合图像这类难以手工设计出充分有效特征的输入（例如 Atari 游戏画面）。

但课件强调：**更有表达力的模型仍然需要有用的经验**。输入信息、探索和数据覆盖仍然重要；泛化能帮忙，也可能在别的状态上制造误差。
`,
    intuition: R`
- 四个输出**不是概率**，不需要加起来等于 1；它们是四个长期回报的估计。贪心 policy 取最大输出，探索 policy 仍可用 ε-greedy。
- 换成网络没有把 action value 变成 policy probability（直接学概率是 W10 的 policy-based 方法）。
- 一次更新通过共享的隐藏表示影响许多状态：泛化更强，误差也可能传得更远。

:::ext 延伸：DQN 的两个稳定训练技巧（课件未讲，不考）
- **Experience replay buffer**：把经验 $(s,a,r,s')$ 存起来，训练时随机抽一小批。好处：打破连续经验之间的相关性；同一条经验可以被重复利用。
- **Target network**：计算 target $r+\gamma\max_{a'}Q_{\theta^-}(s',a')$ 时用一份**暂时冻结**的旧参数 $\theta^-$，每隔若干步才同步成最新参数。好处：target 不会随着每一步更新一起移动，减少“追着自己的尾巴跑”的不稳定。

它们都是稳定训练的辅助机制，并不改变 Q-learning target 的含义，也不代表“网络够大就不需要探索”。
:::
`,
    math: R`
**Q-learning target 不变**（只是 $\hat Q$ 由网络给出）：

$$Y_t=R_{t+1}+\gamma\max_b\hat Q(S_{t+1},b;\boldsymbol\theta),\qquad \boldsymbol\theta\leftarrow\boldsymbol\theta+\alpha\big(Y_t-\hat Q(S_t,A_t;\boldsymbol\theta)\big)\nabla_{\boldsymbol\theta}\hat Q(S_t,A_t;\boldsymbol\theta)$$

梯度通过反向传播计算（不考）。

**（延伸）使用 target network 时**：$Y_t=R_{t+1}+\gamma\max_b\hat Q(S_{t+1},b;\boldsymbol\theta^-)$，$\boldsymbol\theta^-$ 每 $C$ 步复制一次 $\boldsymbol\theta$。

**W9 总结：表示、目标与更新**

| | 学的是什么 | 一个样本改变什么 |
|---|---|---|
| 表格 | 每个 $(s,a)$ 一个数 | 一个条目 |
| 线性 | 固定特征上的权重 | 共享活跃特征的预测 |
| 神经网络 | 权重与中间特征 | 共享网络参数的预测 |

- target 的选择（MC、SARSA、Q-learning）与表示方式分开考虑；
- 更多泛化意味着更少的独立学习，也意味着干扰；
- 更好的表示仍然需要数据、探索与稳定的优化。
`,
    formulas: [{
      title: 'Deep Q-learning：同一个 target，参数换成网络',
      latex: R`\htmlClass{fx-tgt}{Y_t=R_{t+1}+\gamma\max_b\hat Q(S_{t+1},b;\htmlClass{fx-tn}{\boldsymbol\theta^-})}\qquad \htmlClass{fx-out}{\hat Q(s,\cdot;\boldsymbol\theta)=\big(q_U,q_D,q_L,q_R\big)}`,
      parts: [
        { key: 'out', label: '一个状态 → 所有动作的 Q', color: 'blue', text: '网络输入一个状态，一次输出每个动作的估计；贪心动作是最大的那个。' },
        { key: 'tgt', label: 'Q-learning target', color: 'green', text: '与表格、线性版本完全相同的含义：一步奖励 + 折扣后的下一状态最大估计。' },
        { key: 'tn', label: '（延伸）target network θ⁻', color: 'purple', text: '课件未讲：用暂时冻结的旧参数计算 target，提高稳定性。若不用 target network，这里就是当前参数 θ。' }
      ]
    }],
    example: R`
**把整门 value-based RL 串成一条流程**（原课程总结图）：

1. 观察状态 $s$ → 2. 按行为 policy（ε-greedy）选动作 $a$ → 3. 环境返回 $r$、$s'$、是否终止 → 4. **构造 target**（MC：等到结束用 $G_t$；TD：$r+\gamma V(s')$；SARSA：$r+\gamma Q(s',a')$；Q-learning：$r+\gamma\max Q(s',\cdot)$；终止时不 bootstrap）→ 5. **算误差** target − prediction → 6. **更新表示**（表格改一格；线性用特征分配到权重；网络用反向传播）→ 7. 行为 policy 随新的估计改变 → 回到 1。

**同一条经验贯穿所有方法**：在 $s$ 选 East，$r=0$ 到 $s'$；当前 $Q(s,\text{East})=0.5$；$s'$ 的最大动作值 0.8，探索实际选出的动作值 0.4；$\gamma=0.9$，$\alpha=0.1$。

| 方法 | target | 更新 |
|---|---|---|
| Q-learning（表格） | 0.72 | $Q\to0.522$ |
| SARSA（表格） | 0.36 | $Q\to0.486$ |
| MC | 这一步还没有完整 return | 等 episode 结束 |
| 线性 / 网络 | 0.72 或 0.36 不变 | 把误差通过梯度分给参数 |

已知完整模型时，PI 和 VI 也在这张图里：它们用模型对所有后继求期望，代替一次环境采样。model-based/model-free、on/off-policy、表格/近似，回答的是三个不同的问题。
`,
    viz: { id: 'dqn', guide: R`
**怎么用**（概念演示，不考）：

1. 点格子看前向计算：输入 $(x/3,y/2)$，经过两个隐藏层，输出四个 Q 值；最大的那个就是贪心动作。
2. 训练 3000 步，看“所有 Q 与 q* 的 RMSE”下降（RMSE = 所有非终止 (s,a) 上“预测 − 最优值”平方的平均再开根号，越小说明网络的 Q 越接近最优 Q；它不是这一轮拿到的奖励），格子里的 Q 越来越接近 VI 算出的 $q_*$。
3. 关掉 replay buffer 或 target network 再训练，比较稳定性（小问题上差别可能不大，这正说明它们是为复杂问题准备的工程技巧）。紫色标出本步从 buffer 中抽中的经验。` },
    compare: R`
| | Tabular Q-learning | Linear Q-learning | Deep Q-learning / DQN |
|---|---|---|---|
| 表示 | 表 | $\mathbf w^\top\mathbf x$ | 神经网络 |
| 特征 | one-hot（不共享） | 手工设计 | 自动学习 |
| target | $r+\gamma\max Q$ | 同左 | 同左（可配 target network） |
| 考试范围 | 是 | 是 | 概念，不考 |
`,
    pitfalls: [
      { wrong: '网络的四个输出是动作概率。', right: '是四个长期回报估计，不需要和为 1。' },
      { wrong: '用了神经网络就不需要探索。', right: '课件明确：探索与数据覆盖仍然重要。' },
      { wrong: 'replay buffer 和 target network 是课件内容。', right: '课件只说 DQN 是 deep Q-learning 的例子；这两个机制是延伸知识，不考。' },
      { wrong: 'Deep Q-learning 的 target 与 Q-learning 不同。', right: '奖励、折扣与 Q-learning target 的角色完全相同；变的是 Q 的表示和梯度的计算路径。' }
    ],
    quiz: [
      { kind: '算法比较', q: '线性近似与神经网络近似的区别是？', options: ['前者学权重，后者连中间特征也学', '后者不需要权重', '前者不需要特征', '没有区别'], answer: 0, explain: 'W9 slide 40 的表格。' },
      { kind: '概念判断', q: 'Gridworld 的神经 Q 函数输入一个状态，输出什么？', options: ['一个 V 值', '每个动作一个 Q 值', '下一状态', '动作概率分布'], answer: 1, explain: '四个输出 $q_U,q_D,q_L,q_R$，每个估计该动作的期望折扣回报。' },
      { kind: '概念判断', q: '（延伸）target network 的主要作用是？', options: ['存储经验', '用暂时冻结的参数计算 target，让 target 不随每步更新而移动', '替代 ε-greedy', '计算 return'], answer: 1, explain: '提高训练稳定性。存储经验的是 replay buffer。' },
      { kind: '概念判断', q: '课件对 W9 的神经网络部分的考试要求是？', options: ['要求手算反向传播', 'Not examinable，概念介绍', '要求写出 DQN 代码', '要求推导收敛'], answer: 1, explain: 'slides 40–42 标注 Not examinable。' }
    ],
    source: 'W9 slides 38–44（为何仍需要近似 Q-learning、深度学习学特征、Gridworld 的神经 Q 函数、Deep Q-learning 与 DQN、总结）；replay buffer / target network 为延伸内容。'
  }
  ]);
})(window);
