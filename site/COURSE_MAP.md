# COURSE_MAP — COMP90054 AI Planning for Autonomy（Weeks 1–11）

本文件是网站的设计依据。所有章节、公式、例子都以 `reference/` 中的课件文本与 W6 讲课 transcript 为准；课件里只有图片的页（VI/PI 数值表、MC/TD 轨迹、特征表、Aliased Gridworld）已逐页渲染核对。

**目标**：完全不打开 PPT，只靠网站也能理解并复习 W1–W11。W1–W5 经典规划写得比 RL 部分紧凑（期末复习用），W6–W11 强化学习写得最详细。因此网站要把课件里所有图片中的数字、所有算法步骤、所有例子都用文字和交互重新讲清楚，而不是“见课件第 X 页”。

**参考材料**（`reference/`）

| 文件 | 内容 | 页数 |
|---|---|---|
| `w6_week06_L1_delivery.txt` + `w6_L1_transcript.txt` | W6-1 MDP 建模 | 34 页（含动画重复页） |
| `w6_week06_L2_pre-handout.txt` + `w6_L2_transcript.txt` | W6-2 Bellman、VI、PI | 41 页 |
| `w7_pre-handout.txt`、`w7_post-handout.txt` | W7 RL 入门、Bandit、MC Prediction | 35 页 |
| `w8_week08_L1_post-handout.txt` | W8-1 MC Control、TD Prediction/Control | 43 页 |
| `w8_pre-handout.txt` | W8-2 MC vs TD、bias/variance、n-step、TD(λ)、SARSA、Q-learning | 41 页 |
| `w9_pre-handout (1).txt` | W9-1 价值函数近似、线性、神经网络（不考） | 44 页 |
| `w10.txt` | W10-1 Policy-based、REINFORCE、Policy Gradient | 32 页 |
| `w10_L2.txt`（`w10/week10_L2_pre-handout.pdf`） | W10-2 Actor-Critic：REINFORCE 的局限（机器人例子）、baseline、Q AC / A2C / TD / n-step / TD(λ) AC | 39 页（页脚 44） |
| `w11_L1_pre-handout.txt`（`w11/week11_L1_pre-handout.pdf`） | W11-1 MCTS：在线决策、四步、tree policy、Gridworld 6 次决策、Expectimax、AlphaGo 家族 | 35 页（页脚 41）；p.10–21、24、27 的图已逐页渲染核对 |

> 页码约定：本文写“p.N”指课件页脚的 N/总页数。

---

## 0. W1–W5 经典规划（P1–P11，复习用）

参考材料：`w1_pre-handout.txt`（W1-1 AI 与 rational agent）、`w1_2.txt`（W1-2 模型、STRIPS、PDDL、复杂度）、`w2_pre-handout.txt`、`w3_pre-handout.txt`、`w4_pre-handout.txt`、`w5_pre-handout.txt`、`pollev_premid.txt`（课堂测验与官方答案）、`mid_Final1.txt`（往年题）。课件里留空的性质表与数值表（BrFS/DFS/IDS 性质、A*/GBFS 性质、HC/EHC 表、W4 三个松弛的性质、W5 的 Bellman-Ford 表与 best supporter）由网站按定义补全，W5 的数值由 `js/core/planning.js` 计算并与课件 p.32 给出的部分值核对（`tests/core.test.js`）。

| 章 | 标题 | 课件 | 交互 | 必须记住 |
|---|---|---|---|---|
| P1 | 规划是什么：模型与求解器 | W1-1、W1-2 p.2–20 | classify | 三种控制方法；经典模型六要素；classical / conformant / MDP / POMDP |
| P2 | STRIPS、PDDL 与复杂度 | W1-2 p.21–48 | stripsplay（Sussman） | $\langle F,O,I,G\rangle$；$s'=(s\setminus Del)\cup Add$；domain vs problem；closed world；PlanEx/PlanLen PSPACE-complete |
| P3 | 搜索基础与盲目搜索 | W2 p.2–21 | searchtrace（W2 树） | open/closed、生成/展开；BrFS/DFS/IDS/UCS 性质；111,110 vs 123,450 |
| P4 | 宽度搜索 | W2 p.23–34 | iwtrace（3×3 网格） | novelty；IW(k) 剪 $w>k$、$O(n^k)$；SIW 串行化目标 |
| P5 | 启发式函数及其性质 | W3 p.9–13 | hprops | safe / goal-aware / admissible / consistent 及推出关系 |
| P6 | GBFS、A*、加权 A* | W3 p.15–23 | searchtrace（W3 A* 例子） | 排序依据；A* 最优条件；W = 0/1/∞；h = 0 时退化 |
| P7 | 局部搜索、BFWS、模拟器 | W3 p.25–48 | searchtrace（局部最小值） | HC 不完备；EHC 的 improve；BFWS(⟨w,h⟩)；IW(1) 在 Atari |
| P8 | 松弛 | W4 | puzzle8 | $(P',r,h'^*)$；native / 可构造 / 可计算；Manhattan、错位数、goal counting |
| P9 | 删除松弛与 h+ | W5 p.4–20 | stripsplay（Australia，松弛） | $a^+$；dominance；$h^+$ admissible、NP-complete；Australia 20 vs 10 |
| P10 | h_max 与 h_add | W5 p.22–29 | hmaxadd | 递归定义；Bellman-Ford 表；5.5 / 13；Logistics h_add 7；过度计数 |
| P11 | h_FF 与 helpful actions | W5 p.31–46 | rplan | best supporter；提取；(A)(B)(C)；h_FF 5；helpful actions；HSP/FF/LAMA/BFWS |

容易错的地方（网站里都有专门的误区卡）：BrFS 只在代价统一时最优；IW 剪的是 novelty **大于** k；consistent 还要 goal-aware 才推出 admissible；GBFS 用什么启发式都不最优；HC 会走到更差的后继；删除松弛下不能穿墙；最优松弛计划不会重复动作；h_add 的“更 informed”来自过度计数；h_FF 理论性质和 h_add 相同。

---

## 1. 每一讲教授了什么

### W6-1 Markov Decision Processes（MDP 建模）
- 经典规划模型 ⟨S, s0, S_G, A, f, c⟩ 与 7 条假设（有限离散、完全可观测、确定性、静态、目标集合、隐式时间、单一决策者）。
- 动作的不同“非确定”类型：deterministic / multi-agent / nondeterministic（无概率，FOND）/ probabilistic（MDP）/ partial observability / unknown probabilities / POMDP。
- Markov chain → Markov reward process → MDP。课程研究的 classical MDP：有限、完全可观测、已知转移和奖励、单智能体、离散步、discounted return。
- Gridworld（4×3，墙在 (1,1)，s1 起点左下，s11=+1，s7=−1；0.8/0.1/0.1 滑动；撞墙原地不动）。
- 五元组 M=⟨S, A, p, r, γ⟩；Gridworld 的具体建模（γ=0.9）。
- Markov property：Pr(S_{t+1},R_{t+1} | H_t, A_t) = Pr(S_{t+1},R_{t+1} | S_t, A_t)；大写=随机变量，小写=取值；history H_t。
- 固定 plan ⟨N,N,E,E,E⟩ 在随机环境下失效 → 解是 policy（确定 / 随机）。
- 经典规划可写成 MDP（目标→正奖励；cost→负奖励或用 γ<1 鼓励短路径）。
- 三种表示：joint p(s',r|s,a)（Sutton & Barto）、separate P_a(s'|s)+r(s,a,s')（本课主用）、矩阵 P^a, R^a（Silver）。declarative vs generative access。
- Policy：stationary Markov deterministic π(s) / stochastic π(a|s)；policy 随机性 ≠ 环境随机性；time-dependent、history-dependent policy。
- 轨迹分布、单条轨迹的 discounted return G_t、value v_π(s)=E_π[G_t|S_t=s]、最优 policy；“Reward is immediate; return is realised; value is expected.”
- 定理：有限折扣 MDP 存在最优的 stationary deterministic Markov policy（不唯一）。
- MDP 的四个维度（空间、horizon、episodic/continuing、dynamics）与扩展（POMDP、robust、constrained、stochastic game、semi-MDP）——transcript 明确：扩展只需知道名字，不考细节。

### W6-2 Model-based Approaches（Bellman、VI、PI）
- 用 return 比较轨迹，用期望 return J_π=E_π[G_0] 比较 policy；episodic / continuing 两种 return 写法；p_π(τ)。
- 目标 π* = argmax_π J_π；为什么 MDP 常不给初始状态（给了只能得到“局部最优”policy，transcript 举例）。
- Gridworld 的 episodic vs continuing 建模（吸收态），奖励写成 r(s,a,s′)——“进入时奖励”避免在吸收态反复拿奖励（transcript 重点）。
- 直觉三步：V(s6) vs V(s10) → V=R+V(S′)；V(s9) vs V(s10) → 需要 γ；动作 A/B → 需要 Q。
- Bellman 方程：V(s)=max_a Q(s,a)；Q(s,a)=Σ p(s′|s,a)[r+γV(s′)]。符号约定：大写 V,Q=近似/迭代中的估计；小写 v,q=定义值；π 上标/下标；* 最优；G_t 实际回报。
- 终止状态价值为 0（课堂 quiz）。
- s10 的两次 backup：Q1=(0.1, 0.8, 0.1, 0)，V1=0.8；Q2=(0.676, 0.872, 0.1, 0.072)，V2=0.872。
- Value Iteration 算法、收敛判据 max|V_t−V_{t−1}|<ε 与预算 T_max，输出 V* 与 π*=argmax Q*；V0=0 非必须；第 0–10 次迭代表（第 5 次后大部分策略不变，第 10 次后某个底行格子改向）。
- Policy Iteration：exact policy evaluation（解 |S| 个线性方程）+ greedy improvement，直到 π_{k+1}=π_k；π0→π1→收敛的完整数值例子。
- GPI：VI 与 PI 都是 evaluation/improvement 的交替；PI 精确评估，VI 近似评估。

### W7 Introduction to RL（Bandit、MC Prediction）
- 回顾：v_π(s)=Σ_a π(a|s) q_π(s,a)；q_π(s,a)=Σ p[r+γv_π]（Bellman expectation）。
- 模型已知：planning/DP/（MCTS 在 W11）；模型未知：model-based RL（不讲）/ model-free RL。假设：仍满足经典 MDP 假设，S、A 已知。
- RL 定义：agent 与环境交互，目标学 π*；例子（Atari、机器人、交通灯、围棋、LLM 微调）。
- 关键维度：Offline vs Online（计算与执行是否交错）、Prediction vs Control、Exploration vs Exploitation（online 与 offline 下含义不同）。其他维度的路线图：MC vs bootstrapping、bias vs variance、on/off-policy、value-based、policy-based、actor-critic。
- Multi-armed bandit：单状态 MDP，k 个臂，未知奖励分布；平均奖励估计 Q_t(a)；horizon、是否折扣；online。
- 策略：ε-first、ε-greedy、ε-decreasing（ε_t=ε0·α^t）、UCB（Q+c√(ln t/N(a))）、Softmax（温度 τ）；对比曲线（UCB 最好，softmax τ=1 最差）；奖励漂移后各策略的表现。
- 从 bandit 到 MDP：每个状态当成一个 bandit，臂的“回报”是 G_t。
- MC Prediction 算法（倒序 t=T−1..0，G_t←R_{t+1}+γG_{t+1}，N 计数，步长 1/N）。三条 episode 的完整数值（含 Episode 3 掉进 −1 后 Q(s1,Up)=0.2406）。两个 policy 各跑 100 episode 的比较。

### W8-1 Model-free Prediction（MC Control、TD）
- 回顾 bandit 增量更新 Q_{t+1}=Q_t+(1/N)(r−Q_t)。“Monte Carlo” 名称来源。
- 不知道模型时能否用 PI 改进 policy（课堂 quiz）→ evaluation 用 MC prediction，improvement 用 bandit 策略（ε-greedy 等）= MC Control；MC Control 5 条 episode 示例（ε=0.1）。
- MC 局限：只能整条 episode 结束才更新；s10 选 Up 撞墙原地不动的“死循环”例子。
- TD Prediction：Q(S_t,A_t)←Q+α[R_{t+1}+γV(S_{t+1})−Q]，其中按给定 policy 取 V(S′)=Q(S′,π(S′))；α=0.1、三条 episode 的数值；s10 Up 循环中 TD 立即把 0.86 降为 0.8428（α=0.2）。
- TD Control = TD prediction + bandit 式改进（ε-greedy），可在 episode 中途改变行为。

### W8-2 Tabular model-free RL
- 控制问题的评价：J(π)=E_{s0}E_π[G]；能否直接用学到的 Q 评价 policy（课堂 quiz：不能）；实验设置（8000 步、每 100 步 checkpoint、50 seeds）。
- MC 与 TD control 在 ε-greedy / ε-decreasing / UCB / softmax 下的学习曲线；MC vs TD 前两名对比。
- Bias、Variance、MSE=Bias²+Var；MC（无偏、高方差）vs TD（有偏、低方差）实验图。
- n-step return G^{(n)}_t 与更新；1/2/3/6-step 示例；TD(λ)：λ-return 权重（episodic 与 continuing 两版）、forward view vs backward view（eligibility trace，只需概念）。
- Tabular model-free RL 的共同点：学 Q 表，从 Q 导出 policy。变体：first-visit vs every-visit MC；常数 vs 衰减学习率；on-policy vs off-policy。
- SARSA 伪代码（on-policy，终止时 target=R）；Q-learning 伪代码（off-policy，max）；Cliffworld 中 SARSA 学到远离悬崖的路线、Q-learning 学到贴着悬崖的路线；on-policy 更稳但可能次优，off-policy 能收敛到最优但可能不稳。
- 局限：大/连续状态空间、连续动作空间 → 下周函数近似。

### W9-1 Value-function approximation
- 回顾 MC/SARSA/Q-learning 的 target 表；通用更新 estimate←estimate+α(target−estimate)。
- 表格规模：4×3（36 项）、40×30（4×1098）、10 键控制器（2^10×1098）、1000×1000（≈1.024×10^9）、连续（无穷）。
- V̂(s;w)、Q̂(s,a;w)；一次更新影响多个状态；线性 vs 神经网络。
- 函数近似下的 Q-learning：Y_t 同前；w←w+α(Y−Q̂)∇_wQ̂；对应损失 (Y−Q̂)² 的 SGD。
- 线性：Q̂=wᵀx(s,a)；三种情况：已知 p,r 只近似 V；p 已知 r 未知；p 未知时按动作分块权重 w=(w_{a1},…)。
- Gridworld 例子：Method 1（到 s11、s7 的归一化 Manhattan 距离）、一次 episode 的 tabular Q-learning 与近似 Q-learning；Method 1 更新 w=(0.02,0.04)，V̂(s10)=0.02，V̂(s6)=0.016，Q̂(s10,Right)≈0.8032；Method 1 学习效果差（s4 与 s6、s2 与 s5 特征相同）；Method 2（y/2, 1{y=2}x/3）底行特征全 0；Method 3 加 bias。Feature engineering 难。
- 神经网络近似、Deep Q-learning、DQN —— **课件标注 Not examinable，仅概念**。

### W10-1 Policy-based approaches
- 回顾 DP / model-free / 近似；value-based 的局限：大或连续动作空间、argmax 需要比较所有动作、可能“没有最好的确定性动作”。
- 例子：石头剪刀布（多智能体，均匀随机是 Nash 均衡）；Aliased Gridworld（两个灰格看起来一样，确定性 policy 必有一个卡住，随机 0.5/0.5 最优）。
- Tabular policy-based：动作偏好 h(s,a)（不是价值）、softmax policy、tabular REINFORCE（同时更新该状态所有动作的偏好）。
- Aliased Gridworld 实验：REINFORCE vs Q-learning vs softmax Q-learning（softmax 套在 Q 上 ≠ 学 policy）。
- Policy approximation：h(s,a;θ)=θᵀf(s,a)；REINFORCE θ←θ+αγ^tG_t∇log π；Policy Gradient Theorem；tabular 是 one-hot 特征的特例；∇log π = f(s,a)−Σ_bπ(b|s)f(s,b)。
- 学习目标对比表（value：最小化平方误差；policy：最大化 J）；“value learning 拟合 target，policy learning 没有 target”。神经网络 policy 不在本课范围。

### W10-2 Actor-Critic Methods
- 回顾 value-based vs policy-based；两张 sample-efficiency 图：确定性 Aliased Gridworld 中 REINFORCE（≈0.77）胜 Q-learning（≈0.54）；打滑 Gridworld 中 Q-learning 几千次转移接近最优，REINFORCE 约 3 万次才追上（最优值 0.545 = V*(s1)）。
- 机器人例子（s0 → A:101 / B:99，一步终止，α=0.1）：E1 选 B → h=(−4.95,4.95)、π(A)≈0.00005；E2 → ±4.950495；E100 → ±4.9969；E101 强制 A → ±5.102614、π(A)≈0.99996；强制交替时偏好在 ±8 摆动。结论：REINFORCE 只用 G_t，慢、不稳、方差大；学习率大易发散、小则慢。
- 奖励改为 +1/−1：E1 → h=(0.05,−0.05)、π(A)≈0.525；课件一次运行 100 条中 A 86 次、h=±1.86、π(A)=0.9765。引出“系统地把回报转成相对值 → 学出来”。
- REINFORCE with baseline：用 G_t−b(s_t)；b 给定仍是 policy-based，b 学习（tabular V(s)、近似 V_w(s)，MC 更新）。learned baseline 机器人：E1 同 REINFORCE、b=9.9；E2 δ=89.1、h=±4.950447034、b=18.81；E100 h=±4.954451384、b=99(1−0.9^100)≈98.997370；baseline 不能立刻撤销饱和；“一次采样运行，不是一般结论”。
- Actor（policy：h 或 π_θ）与 critic（V/Q 或 V_w/Q_w）；从 learned baseline 到 bootstrapped critic 的对比表；Q actor–critic（SARSA critic，信号 Q_w）、A2C（V=Σπ Q，A=Q−V；机器人 V=100、A=±1）、TD actor–critic（E[δ|s,a]=A^π）、n-step（n=1 即 TD AC）、TD(λ)（两条迹，episode 间重置）；方法对比表；总结：policy 更新 = 学习率 × 评价信号 × score gradient；不稳定时问：更新尺度、探索是否充足、critic 是否够准。
- 记号：g_t=∇log π；课件用 continuing 写法，episodic 起点计时版本要给 actor 乘 γ^t。

### W11-1 Monte Carlo Tree Search（MCTS）
- 回顾 model-free RL 五类方法（tabular / approximation 的 value-based、policy-based、actor-critic）；离线（先算出 plan / policy 再执行：经典规划、DP、RL 训练）vs 在线（观察当前状态 → 选动作 → 执行 → 再观察；online planning 用模型预测、执行第一步；online RL 边执行边更新）。
- 为什么要在线：问题太“复杂”（状态/动作空间大、horizon 长、多智能体、不完全信息、随机转移）或决策时间有限（lifelong MAPF：2000 个 agent、1 秒）。在线 = 按时给出决策；高效 = 复用之前的计算。
- Model-based（declarative：经典规划 ⟨S,s0,SG,A,T,c⟩、MDP ⟨S,A,p,r,γ⟩；generative：simulator 输入 (s,a) 返回 (s′,r)）vs model-free（只能与环境交互）；方案好坏依赖模型质量。
- MCTS 核心：用模拟经验估计动作价值，并围绕当前状态建搜索树来集中计算；结合 MC 估计、树搜索、在线规划；需要模型或 simulator；四步 selection / expansion / simulation / backpropagation；anytime。
- Tree policy π_tree：ε-greedy、softmax、UCB（c=√2 时为 UCB1，MCTS 称 UCT）；rollout policy π_sim（随机或简单启发式），直到终止或预算；backprop 用增量平均 Q←Q+[R−Q]/(N+1)，N←N+1，直到根。
- High-level：在已有树中找到当前状态（或新建根）→ 迭代四步直到预算 → 按根的子节点价值选动作（图：选最大 Q）→ 执行 → 复用所选子树。
- Gridworld 例子（γ=0.9，c=√2，每次决策 200 次迭代，rollout horizon 60）：6 次决策 Up（滑回 (0,0)）→ Up → Up → Right → Right → Right；各图根节点 Q/N 全部记录；问题“为什么 ΣN(s0,a)≠200”（答：子树复用）。
- 变体：Expectimax tree（采样多个结果 / 用模型精确求期望）、simulation-free（用价值函数代替 rollout）、选动作按最高价值或最多访问；双人零和（对手用 −Q）、POMCP、ISMCTS、Progressive Widening。Expectimax：decision node 取 max、chance node 取期望；backprop Q(s,a)=Σ P(s′,r|s,a)(r+γ max Q(s′,a′))，V(s)=max Q。
- AlphaGo 家族：围棋（19×19，361+pass，3^361≈1.7×10^172）；里程碑表；学习能改进 policy（prior P(s,a)）、value（v(s) 替代 rollout）、model（学转移）。AlphaGo：p_σ（人类棋谱）+ 快速 rollout policy、p_ρ（自我对弈 RL）、v_θ；V_leaf=(1−λ)v_θ+λz；按最大访问次数落子。AlphaGo Zero：随机初始化、自我对弈、共享网络 (p_θ,v_θ)=f_θ(s)、无 rollout，100–0 胜 AlphaGo Lee。PUCT；自我对弈 π_t∝N^{1/τ}，损失 (z−v)²−Σπ log p+β‖θ‖²。AlphaZero：国际象棋/将棋/围棋，z∈{−1,0,+1}。MuZero：h_θ、g_θ、f_θ 学到的潜在模型；训练目标；比较表；总结。

---

## 2. 完整知识依赖图

```
经典规划假设 ──► 不确定性类型 ──► MDP ⟨S,A,p,r,γ⟩ ──► Gridworld 建模
                                       │
             ┌─────────────────────────┼───────────────────────┐
             ▼                         ▼                       ▼
     Markov property            三种表示 / 两种访问        Policy (det./stoch.)
             │                 (declarative/generative)        │
             └───────────► Trajectory ◄────────────────────────┘
                               │
                               ▼
                 Return G_t (γ, episodic/continuing)
                               │
                               ▼
              Value v_π = E[G]  ──►  Q 值 q_π(s,a)  ──► 最优 policy / 存在定理
                               │
                               ▼
         Bellman 方程 ── expectation (v_π=Σπq_π) / optimality (V=max Q)
                 │                         │
                 ▼                         ▼
        Policy Evaluation          Value Iteration
                 │                         │
                 ▼                         │
        Policy Improvement ──► Policy Iteration ──► GPI ◄──┘
                               │
               (模型未知) ─────┘
                               ▼
   RL 维度：offline/online · prediction/control · exploration/exploitation
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       Multi-armed Bandit             MC Prediction（每个状态≈一个 bandit）
     (增量平均 + 5 种策略)                     │
                │                             ▼
                └──────────► MC Control (MC prediction + bandit 式改进)
                                              │ 局限：要等 episode 结束
                                              ▼
                                     TD Prediction (bootstrapping)
                                              │
                                              ▼
                                TD Control ─► MC vs TD：bias/variance
                                              │
                                              ▼
                                 n-step TD ─► TD(λ)
                                              │
                          ┌───────────────────┴─────────────┐
                          ▼                                 ▼
                SARSA (on-policy)                 Q-learning (off-policy)
                          └──────────► Cliffworld 对比 ◄────┘
                                              │ 局限：表格规模
                                              ▼
              函数近似 V̂/Q̂(·;w) ─► 线性特征与 SGD 更新 ─► 特征设计
                                              │
                                              ▼
                             神经网络 Q / DQN（概念，不考）
                                              │
          value-based 的局限（连续动作、无最好确定性动作）
                                              ▼
       Softmax 偏好 h(s,a) ─► Tabular REINFORCE ─► Policy Gradient Theorem
                                              ▼
                       线性 policy 近似 ─► value vs policy 学习目标
                                              ▼
        REINFORCE 的方差 / 饱和（机器人例子）─► baseline（G_t − b(s)）
                                              ▼
   critic（V / Q，借用 TD、n-step、TD(λ)）─► Q AC · A2C · TD AC · n-step AC · TD(λ) AC
                                              │ 跳出 RL：离线 vs 在线决策
                                              ▼
   在线规划 + generative model ─► MCTS 四步（UCB/UCT、rollout、增量平均）─► 子树复用
                                              ▼
   变体：Expectimax（= 有限深度 Bellman optimality）· simulation-free · 双人
                                              ▼
   学习 + 搜索：AlphaGo（prior、v_θ+rollout）→ AlphaGo Zero（PUCT、自我对弈）→ AlphaZero → MuZero（学模型）
```

---

## 3. 网站章节规划（严格按课件顺序）

课件顺序是 **MDP（W6）在前、Bandit（W7）在后**，与常见教材“Bandit→MDP”不同，网站遵从课件。Bandit 在课件中被定位为“只有一个状态的 MDP”，所以放在 MDP 之后讲反而更连贯。

| # | Part | 章节 | 课件来源 |
|---|---|---|---|
| 1 | W6-1 MDP | 从经典规划到 MDP | W6-1 p.5–11 |
| 2 | | MDP 五元组与 Gridworld | W6-1 p.12–15, 19, 21–25 |
| 3 | | Markov 性质、轨迹与 history | W6-1 p.16, 28 |
| 4 | | Policy：从 plan 到 policy | W6-1 p.17, 27 |
| 5 | | Return 与折扣因子 γ | W6-1 p.29；W6-2 p.4 |
| 6 | | Value：期望回报与最优 policy | W6-1 p.29–30；W6-2 p.4, 6 |
| 7 | W6-2 DP | Bellman 方程（expectation 与 optimality） | W6-2 p.7–11, 15–18；W7 p.3 |
| 8 | | Policy Evaluation | W6-2 p.33–35 |
| 9 | | Policy Improvement 与 Policy Iteration | W6-2 p.33–38 |
| 10 | | Value Iteration | W6-2 p.17–31 |
| 11 | | GPI：VI 与 PI 的统一视角 | W6-2 p.40 |
| 12 | W7 RL | 模型未知：什么是强化学习 | W7 p.3–12 |
| 13 | | Multi-armed Bandit 与增量平均 | W7 p.14–15；W8-1 p.4 |
| 14 | | Bandit 探索策略 | W7 p.16–22 |
| 15 | | Monte Carlo Prediction | W7 p.24–34；W8-1 p.7–15 |
| 16 | W8-1 | Monte Carlo Control 与其局限 | W8-1 p.17–29 |
| 17 | | TD Prediction | W8-1 p.31–36 |
| 18 | | TD Control 与 MC vs TD（bias/variance） | W8-1 p.38–41；W8-2 p.5–22 |
| 19 | W8-2 | n-step TD 与 TD(λ) | W8-2 p.24–31 |
| 20 | | SARSA（on-policy） | W8-2 p.33–36 |
| 21 | | Q-learning（off-policy） | W8-2 p.37；W9 p.20–25 |
| 22 | | SARSA vs Q-learning 与 on/off-policy | W8-2 p.34, 38–39；W9 p.4 |
| 23 | W9 | 为什么需要函数近似 | W9 p.3–12 |
| 24 | | 线性近似、特征与梯度更新 | W9 p.13–37 |
| 25 | | 神经网络 Q 与 DQN（概念，不考） | W9 p.38–44 |
| 26 | W10 | 为什么要直接学 policy | W10 p.6–13 |
| 27 | | Tabular REINFORCE | W10 p.15–22 |
| 28 | | Policy Gradient 与线性 policy 近似 | W10 p.23–32 |
| 29 | W10-2 | Policy-based 方法的局限：机器人例子 | W10-2 p.3–23 |
| 30 | | REINFORCE with baseline | W10-2 p.25–32 |
| 31 | | Actor-Critic 方法 | W10-2 p.34–44 |
| 32 | W11-1 MCTS | 在线决策与模型 | W11 p.3–7 |
| 33 | | MCTS 的四个步骤 | W11 p.9–11、13–15 |
| 34 | | Tree policy：ε-greedy、softmax、UCB/UCT | W11 p.12、16 |
| 35 | | Gridworld 例子：6 次决策与子树复用 | W11 p.15–21 |
| 36 | | MCTS 变体与 Expectimax | W11 p.23–25 |
| 37 | | AlphaGo 与 AlphaGo Zero：学习如何改进搜索 | W11 p.27–33 |
| 38 | | 自我对弈、AlphaZero、MuZero 与总结 | W11 p.34–39、41 |
| 附 | | 术语表 · 公式速查 · 综合复习测验 | 全部 |

每章统一 10 段：① 它是什么 ② 为什么需要它 ③ 直觉 ④ 数学定义 ⑤ 公式逐项解释（KaTeX 逐步高亮）⑥ 数值例子（用课件原数） ⑦ 可交互可视化 ⑧ 与相近概念比较 ⑨ 常见误区 ⑩ Quiz（带逐项解释）。

---

## 4. 每章的交互 demo

| 章 | Demo | 交互要点（服务于哪个理解点） |
|---|---|---|
| 1 | 假设开关 → 模型分类器 | 关掉“确定性”/“完全可观测”等假设，看问题变成 FOND / MDP / POMDP，配课件的 7 个生活例子分类 |
| 2 | **MDP visualizer** | 点格子+选动作 → 三条移动尝试、合并后的 p(s′,r\|s,a)、P_a 矩阵行、奖励；“生成式访问”模式只给采样，统计频率逼近 0.8/0.1/0.1 |
| 3 | 轨迹记录器 | 逐步执行，记录 S_t,A_t,R_{t+1}；显示 history H_t 增长，但预测下一步只需 S_t,A_t |
| 4 | Plan vs Policy 对比 | 固定 plan ⟨N,N,E,E,E⟩ 与 policy 各跑 1000 次的到达率；可点格子编辑 policy |
| 5 | **Return calculator** | 编辑奖励序列、拖动 γ，逐项显示 γ^k R_{t+k+1} 条形与累加；切换 episodic/continuing |
| 6 | 回报分布 → 价值 | 同一 policy 采样多条轨迹，显示 return 直方图与均值收敛到精确 v_π(s)（来自线性方程） |
| 7 | **Bellman backup visualizer** | 点状态、选动作，逐步代入 p、r、γ、V(s′)；expectation / optimality 两种模式；可复现 s10 的 0.8 与 0.872 |
| 8 | **Policy Evaluation simulator** | 课件 π0，逐 sweep 显示 V_k(s)、Δ；“精确求解”按钮给出 0.0131… 并比较 |
| 9 | Policy Iteration stepper | evaluate → improve → 比较箭头变化（课件 π0→π1→稳定） |
| 10 | **Value Iteration simulator** | 逐迭代显示 V、四方向 Q、贪心箭头、max\|ΔV\|；可逐个状态展开 optimality backup |
| 11 | VI vs PI 收敛对比 | 同一起点比较迭代次数、policy 首次稳定的时刻 |
| 12 | 已知模型 vs 只能采样 | 隐藏 p，靠交互采样估计转移概率，体会 model-free 缺少什么 |
| 13 | Bandit 手动拉杆 | 手动选择臂，逐次显示增量平均公式代入 |
| 14 | **Multi-armed Bandit simulator** | 5 种策略、ε/c/τ/α 滑块、累计奖励、最优臂比例、多次平均、drift 开关 |
| 15 | **Monte Carlo simulator** | 回放课件三条 episode（或随机生成），倒序计算 G_t、N、Q 更新；V/Q 切换 |
| 16 | MC Control + 死循环演示 | ε-greedy 的 MC control 多 episode 训练；s10 Up 撞墙循环中 MC 不更新 |
| 17 | **TD Learning simulator** | 课件三条 episode：TD target、TD error、更新前后数值联动；V/Q 两种视角 |
| 18 | MC vs TD bias/variance 实验 | 多次独立运行估计 V(s1)（真值 0.5452），画均值、方差、MSE 曲线 |
| 19 | n-step / λ-return 计算器 | n 滑块、λ 滑块；显示每个 n-step return、权重条形与 λ-return |
| 20–21 | **Q-learning GridWorld** | Next Step / Next Episode / Run Multiple / Reset；当前 state、action、reward、next state、Q-table、更新过程；可切换 SARSA |
| 22 | **SARSA vs Q-learning** | 同一 transition 并列 target：r+γQ(s′,a′) vs r+γmax Q(s′,a)；Cliffworld 训练两者的路线差异 |
| 23 | 表格规模计算器 | 网格大小、按键数 → Q 表条目数（复现 36 / 4392 / 2^10×1098 / ≈10^9） |
| 24 | 线性近似实验室 | 选 Method 1/2/3 特征，点格子看 x(s)；执行课件 s10→s11 更新，观察所有状态的 V̂ 同时改变；展示特征重合与全零特征 |
| 25 | **DQN conceptual visualizer** | state → 网络 → Q(s,a1..a4) → action；replay buffer 采样；target network 同步（标注超出课件） |
| 26 | Aliased Gridworld | 调 π(Right\|grey)，精确计算各起点的期望回报与到达率；确定性 vs 随机 |
| 27 | REINFORCE 偏好更新 | 选动作、设 G_t、α、γ、t，逐项显示 1{b=a}−π、Δh、新概率；Aliased Gridworld 上训练 |
| 28 | 线性 policy 梯度 | 调 θ 和特征 f(s,a)，显示 π、Σπf、∇log π；tabular=one-hot 特例 |
| 29–30 | 机器人例子 | 奖励 101/99 或 +1/−1；无 / learned / 给定 b=100 的 baseline；强制选 A/B、按 policy 采样、强制交替；逐项表格复现 E1/E2/E101 与 learned baseline E1/E2，偏好曲线 |
| 31 | Actor-Critic | ① 机器人上三种 actor 信号（Q、A=Q−V、TD δ）；② 课程 Gridworld 上 tabular TD actor–critic 的 Next Step / Next Episode / Run 100（δ、critic、actor 三步）；③ REINFORCE / +baseline / TD AC 学习曲线（真实 v^π(s1)） |
| 32 | MDP visualizer（generative 模式） | 同一 (s,a)：declarative 直接列出 p(s′,r\|s,a)；generative 只能调用 simulator 采样，频率逼近 0.8/0.1/0.1 |
| 33 | **MCTS 单步解剖** | 课程 Gridworld、任选根；按“selection → expansion → simulation → backpropagation”逐阶段推进，显示每层 UCB 计算、新节点、rollout 轨迹与折扣回报、逐层 R←r+γR 与增量平均；搜索树视图 |
| 34 | UCB / UCT 计算器 | 预设课件决策 1/6 的根节点 Q、N；调 c 看分数；“再给某动作一次访问”看 bonus 下降；ε-greedy / softmax 概率对照 |
| 35 | **MCTS Gridworld（复现 6 张决策图）** | 每次决策 200 次迭代、horizon 60；四三角 Q/N 图；执行（含打滑）；子树复用开关与 ΣN(s0,a) |
| 36 | Expectimax | 选状态与深度；decision/chance 两层展开、逐项期望；深度 d 的结果与 VI 第 d 轮相同；与同预算 MCTS 样本均值对比 |
| 37 | PUCT vs UCT | 三个动作的 prior P 与（隐藏的）真实价值；逐次模拟看 N 的分配；prior 错时搜索能否纠正 |
| 38 | 自我对弈目标 | 根访问次数 → π_t（温度 τ）；z、v、π、p 代入损失三项 |

---

## 5. 必须保留的公式和定义

**MDP 与价值**
- M=⟨S,A,p,r,γ⟩，0≤γ<1；p(s′\|s,a)，r(s,a,s′)
- p(s′,r\|s,a)=Pr(S_{t+1}=s′,R_{t+1}=r\|S_t=s,A_t=a)，Σ_{s′}Σ_r p=1，P_a(s′\|s)=Σ_r p(s′,r\|s,a)
- P^a_{ij}=P_a(s_j\|s_i)，R^a_{ij}=r(s_i,a,s_j)，Σ_j P^a_{ij}=1
- Markov：Pr(S_{t+1},R_{t+1}\|H_t,A_t)=Pr(S_{t+1},R_{t+1}\|S_t,A_t)，H_t=(S_0,A_0,R_1,…,R_t,S_t)
- π(s)=a；π(a\|s)=Pr{A_t=a\|S_t=s}；A_t~π(·\|S_t)，(S_{t+1},R_{t+1})~p(·,·\|S_t,A_t)
- G_t=Σ_k γ^k R_{t+k+1}；episodic G_t=R_{t+1}+…+γ^{T−t−1}R_T
- p_π(τ)=p(s_0)Π π(a_t\|s_t)p(s_{t+1}\|s_t,a_t)；J_π=E_π[G_0]；π*=argmax J_π
- v_π(s)=E_π[G_t\|S_t=s]；q_π(s,a)=E_π[G_t\|S_t=s,A_t=a]；v*(s)=max_π v_π(s)

**Bellman 与 DP**
- v_π(s)=Σ_a π(a\|s)q_π(s,a)；q_π(s,a)=Σ_{s′}p(s′\|s,a)[r(s,a,s′)+γv_π(s′)]
- V(s)=max_a Q(s,a)；Q(s,a)=E[R_{t+1}+γV(S_{t+1})\|S_t=s,A_t=a]=Σ p[r+γV]
- VI：Q_t(s,a)=Σ P[r+γV_{t−1}(s′)]，V_t(s)=max_a Q_t(s,a)，停止 max_s\|V_t−V_{t−1}\|<ε 或 t<T_max，π*(s)=argmax Q*
- PI：V^{π_k}(s)=Σ p(s′\|s,π_k(s))[r+γV^{π_k}(s′)]（解线性方程），π_{k+1}(s)=argmax_a Q^{π_k}(s,a)，直到 π_{k+1}=π_k
- 终止状态 V=0、Q=0

**Bandit 与 MC/TD**
- Q_t(a)=(R_1+…+R_{N_t(a)})/N_t(a)；Q_{t+1}=Q_t+(1/N)(r−Q_t)
- ε-decreasing ε_t=ε_0·α^t；UCB a_t=argmax[Q_t(a)+c√(ln t/N(a))]；Softmax P(a)=e^{Q/τ}/Σe^{Q/τ}
- MC：N←N+1，G_t←R_{t+1}+γG_{t+1}，Q←Q+(1/N)(G_t−Q)
- TD：Q(S_t,A_t)←Q+α[R_{t+1}+γV(S_{t+1})−Q]
- Bias=E[θ̂]−θ，Var=E[(θ̂−E θ̂)²]，MSE=Bias²+Var
- G^{(n)}_t=R_{t+1}+…+γ^{n−1}R_{t+n}+γ^nV(S_{t+n})；V←V+α[G^{(n)}−V]
- λ-return（episodic）G^λ_t=(1−λ)Σ_{n=1}^{T−t−1}λ^{n−1}G^{(n)}_t+λ^{T−t−1}G_t；continuing (1−λ)Σλ^{n−1}G^{(n)}
- SARSA：Q(S,A)←Q+α[R+γQ(S′,A′)−Q]；终止时 target=R
- Q-learning：Q(S,A)←Q+α[R+γmax_a Q(S′,a)−Q]；终止时 target=R

**近似与 policy gradient**
- V̂(s;w)≈v_π，Q̂(s,a;w)≈q_π；Y_t=R+γmax_b Q̂(S′,b;w)；w←w+α(Y−Q̂)∇_wQ̂；L(w)=(Y−Q̂)²
- Q̂(s,a;w)=wᵀx(s,a)=Σw_i x_i；已知模型：Q̂=Σp(r+γV̂)；按动作分块 x(s,a)=(1{a=a_1}x(s),…)，Q̂=w_aᵀx(s)
- π(a\|s)=e^{h(s,a)}/Σ_b e^{h(s,b)}；tabular REINFORCE：G_t=Σ_{k=t+1}^T γ^{k−t−1}R_k，h(S_t,b)←h+αγ^tG_t[1{b=A_t}−π(b\|S_t)]
- h(s,a;θ)=θᵀf(s,a)；θ←θ+αγ^tG_t∇_θ log π_θ(A_t\|S_t)
- Policy Gradient Theorem：∇_θJ(θ)=E_{π_θ}[q^{π_θ}(s,a)∇_θ log π_θ(a\|s)]
- ∂log π(a\|s)/∂h(s,b)=1{b=a}−π(b\|s)；∇_θ log π_θ(a\|s)=f(s,a)−Σ_bπ_θ(b\|s)f(s,b)
- 学习目标：min ½[Y−Q]²（value）vs max J(π_θ)（policy）

**MCTS 与 AlphaGo 家族（W11）**
- ε-greedy π_tree：1−ε+ε/n（贪心）、ε/n（其他）；softmax e^{Q/τ}/Σe^{Q/τ}
- UCB：argmax_a [Q(s,a)+c√(ln N(s)/N(s,a))]，UCB1：c=√2（UCT）
- Rollout：直到终止或预算，累加折扣奖励；Backprop：Q←Q+[R−Q]/(N+1)，N←N+1
- Expectimax：Q(s,a)=Σ_{s′,r}P(s′,r\|s,a)(r+γ max_{a′}Q(s′,a′))，V(s)=max_a Q(s,a)
- AlphaGo：V_leaf=(1−λ)v_θ(s_L)+λz_rollout；AlphaGo Zero：(p_θ,v_θ)=f_θ(s)
- PUCT：argmax_b [Q(s,b)+c_puct P(s,b)√(Σ_u N(s,u))/(1+N(s,b))]
- 自我对弈：π_t(a\|s_t)=N^{1/τ}/Σ_b N^{1/τ}；L(θ)=(z−v)²−Σπ log p+β‖θ‖²
- MuZero：x_0=h_θ(o_{≤t})，(x_{k+1},r̂_{k+1})=g_θ(x_k,a_k)，(p_k,v_k)=f_θ(x_k)

**必须保留的定义句**
- “Reward is immediate; return is realised; value is expected.”
- Prediction：给定 π 估计 v_π/q_π；Control：找 π*。
- On-policy：学 training policy 自己的价值；Off-policy：学另一个 policy 的价值。
- Action preference 越大越常被选，但不代表奖励。

---

## 6. 课件中容易理解困难的地方

1. **大写/小写、V 与 v、Q 与 q 的含义**：大写 V,Q 是算法中的估计，小写是定义值；S_t 是随机变量，s 是具体状态。课件只在一页列出。
2. **联合概率 p(s′,r\|s,a) 与 P_a(s′\|s) 的关系**：左上角向 North 时三种移动尝试合并成两种结果（0.9 / 0.1）。
3. **reward 写成 r(s,a,s′)（进入时给）而非“在格子里给”**：continuing 建模中，否则吸收态会无限拿奖励。
4. **policy 的随机性与环境随机性**是两种不同的随机。
5. **return 与 value**：一条幸运轨迹不能证明 policy 好。
6. **VI 图的读法**：左图是 V_{t−1}，右图 Q_t 每格四个三角形（上=N、右=E、下=S、左=W），黄色是最大值；“迭代 t”用的是上一轮 V。
7. **VI 中 V 的含义**：中间的 V_t 不是任何 policy 的真实价值；策略可能早于数值收敛（第 5 次之后多数箭头不变）。
8. **PI 的 exact evaluation**：是解线性方程，不是迭代；网站的迭代演示需说明两者关系。
9. **MC 的倒序计算与 N 计数**：Q 是平均，第三条 episode 后 Q(s1,Up)=(0.6561×2−0.5905)/3=0.2406。
10. **TD prediction 中 V(S_{t+1}) 指什么**：学 q_π 时 V(S′)=Q(S′,π(S′))；SARSA/Q-learning 才进一步区分 A′ 与 max。
11. **online/offline（计算与执行）≠ on/off-policy（学的是谁的价值）**。
12. **exploration 在 online 与 offline 下的不同含义**（W7 p.11）。
13. **bias/variance**：TD 的“有偏”来自用估计值做 target。
14. **λ-return 的终止项权重 λ^{T−t−1}**，权重和为 1。
15. **Q-learning 是 off-policy 的原因**：行为用 ε-greedy，target 用 greedy max。
16. **Cliffworld 中“更好”的含义**：Q-learning 学到的是最优（贪心）路线，但训练时 ε 探索会掉崖；SARSA 学到考虑探索的安全路线。
17. **函数近似的权重如何“共享”**：一次更新改变所有状态的预测，且可能变坏。
18. **课件自身不一致**（需在网站中显式说明）：
    - W9 p.17 文字写“正终点 s10”，实为 s11（公式和数值都按 s11）。
    - W9 p.30 “s4=(1,1), s6=(2,1)” 的数对不是坐标；要表达的是 Method 1 下 s4 与 s6 特征相同（都为 (0.4,0.2)），s2 与 s5 相同（都为 (0.8,0.6)）。
    - W9 p.32 文字用 (2/5,2/5) 算出 0.032，与 Method 2 定义不符；同页图按 φ(s10)=(1,2/3) 得到 w=(0.1,1/15)、V̂(s10)=0.1444。网站采用与定义一致的 0.1444，并注明差异。
    - W9 p.34 “s2=(0,1)” 同样不是坐标；底行四个状态特征都为 (0,0)。
    - W7 p.32 “Q(s1,up)=0.0.2406” 为排版错误，值为 0.2406。
19. **softmax Q-learning vs REINFORCE**：两者都输出随机动作，但前者的概率由价值决定，Aliased Gridworld 中两个灰格 Q 相同却需要不同的“理想”动作。
20. **γ^t 在 REINFORCE 中的来源**（discounted episodic 目标从 t=0 起算）。
21. **W10-2 的 γ^t 约定**：actor–critic 公式按 continuing 写法省略 γ^t（slide 35 说明），与 W10-1 REINFORCE 算法带 γ^t 不同。
22. **W10-2 E2 数值**：slide 12 的 −4.950495 用了四舍五入的 0.00005；未取整为 −4.950497。E100 显示的 p=0.00005 实为 0.0000457。
23. **REINFORCE with baseline 算不算 actor-critic**：课件 slide 34 将其列为例子，同时 slide 35 强调其 MC baseline 不 bootstrap；Sutton & Barto 只把会 bootstrap 的评价器称为 critic。网站按课件归类并注明差异。
24. **b_100 = 99(1−0.9^100) 中的 0.9 是 1−β**，不是 γ；baseline 趋于当前（几乎全选 B 的）policy 的平均回报 99，而非 100。

25. **W11 p.13 的 rollout 记号 “r←R+γ×r”**：照字面按时间顺序算会把折扣倒过来（0,0,1 得 1 而非 0.81）。网站写成前向累加 $G\leftarrow G+\gamma^k r_k$（或走完后从后往前 $G\leftarrow r+\gamma G$），并说明 horizon 60 是 rollout 的最大步数。
26. **W11 p.14 的 R 是什么**：课件只写 Q←Q+[R−Q]/(N+1)。每往上一层，R 要先变成 $r+\gamma R$（下面的回报乘 γ，再加上这条边的奖励），否则不同深度的 Q 不是同一个量；网站明确写出（课件未展开，标注为补充）。
27. **W11 p.10 “Typically, the tree is fully expanded …”**：意思是“沿途节点的动作都已试过，就继续往下选；遇到还有未试动作的节点（或采样到新结果）就停下扩展”。
28. **W11 p.17 的问题 “为什么 ΣN(s0,a)≠200”**：决策 2–6 的根是上一棵树里被复用的子树，带着原来的访问次数（204、253、260、255、338 = 200 + 旧次数）。图中灰色数字是旧树留下、未被复用的统计。
29. **Expectimax = 有限深度的 Bellman optimality backup**：从 s10 展开深度 1、2 正好得到 W6 的 0.8 和 0.872。
30. **UCB 的 N(s,a)=0**：分母为 0，按惯例视为 +∞，所以每个动作先各试一次。
31. **AlphaGo 的 λ**：课件只给公式，原论文取 0.5（课件未给，网站标注）。

---

## 7. 需要增加额外解释的地方

- 每张只有图的数值页：网站用表格/交互完整复现（VI 第 0–10 次、PI 两轮、MC 三条 episode、TD 三条 episode、W9 特征表与更新、Aliased Gridworld）。
- s10 两次 backup 的每一项乘法展开（0.8×(0+0.9×0.8)+…）。
- Policy evaluation 的线性方程组：以 π0 写出 s10、s6 两个方程，说明为什么是 |S| 个未知数、|S| 个方程。
- 迭代式 policy evaluation（课件没展开，但 transcript 提到“有许多评估方法”）：作为求解线性方程的另一种方法，用来解释 VI“只做一次 evaluation sweep”。
- 增量平均公式与“目标−估计”通用更新式的统一（W9 p.3）。
- UCB 中 ln t / N(a) 的直觉；softmax 温度 τ 的两个极限。
- MC control 的 s10 循环为什么“只能靠概率跳出”。
- 用课件 Gridworld 构造的 TD/MC bias-variance 实验，帮助理解 W8-2 p.22 的图。
- SARSA 与 Q-learning 在同一 transition 上的数值对比（课件只给伪代码）。
- 函数近似中“semi-gradient”：Y_t 视为常数（W10 p.30 明确写出）。
- 课件 W9 只说 DQN 是 deep Q-learning 的例子；**replay buffer 与 target network 不在课件中**，网站作为“延伸阅读（不考）”讲解，并明确标注。
- Policy gradient 的 ∂log softmax 推导（课件只给结果）。
- MCTS：用课件决策 1 的根节点数字算 UCB，四个动作的分数几乎相等（≈0.38），说明 UCB 把访问分配到“分数持平”；Gridworld 6 张图用文字和交互复现；backprop 中 R 的逐层折扣。
- Expectimax 与 W6 value iteration 的联系；树的规模（深度 2 已有 100 个叶子，深度 3 有 1018 个）。
- PUCT 中 prior 的作用（一个三动作小例子），以及自我对弈中温度 τ 的两个极限。

---

## 8. 可以省略或只简述的内容

- 课程管理信息（MST 安排、lockdown browser 等 transcript 开头内容）。
- PollEv 页面本身（保留其问题，转成网站 quiz）。
- MDP 扩展家族（POMDP、robust、constrained、stochastic game、semi-MDP）：只列名称与一句话，transcript 明确不考细节。
- 矩阵记号的字体差异（transcript：不会考）、PPDDL。
- W8-2 每种训练策略的单独学习曲线（p.8–18）：合并为一段结论说明。
- Eligibility trace 的实现细节：只讲 forward/backward view 的概念。
- 神经网络计算细节、DQN 训练细节（课件标注不考）；PPO、神经网络 policy（W10 标注不覆盖）。Actor-Critic 已在 W10-2 讲授，完整收录（第 29–31 章）。
- 外部链接（HuggingFace、Gymnasium 教程）只在附录保留。
- 40×30 与连续 Gridworld 的实验图：只保留规模推导与结论。
- W11 AlphaGo 家族的网络结构、训练规模与论文细节：只讲课件给出的角色划分（prior / value / model）、公式与比较表；POMCP、ISMCTS、Progressive Widening 只列名称与一句话；延伸阅读列表保留在附录。

---

## 实现约定

- 纯 HTML/CSS/Vanilla JS + SVG/Canvas + KaTeX（本地 vendor），无后端、无数据库、无框架；双击 `index.html` 即可（不用 ES module/fetch，以兼容 `file://`）。
- 目录：`index.html`、`css/`、`js/core`（纯算法，可在 Node 测试）、`js/viz`（每个可视化一个模块）、`js/ui`（渲染、quiz、公式展开、目录）、`data/`（章节内容、术语、公式、quiz）、`reference/`（课件文本）、`tests/`。
- 所有课件数值在 `tests/core.test.js` 中复现校验。
