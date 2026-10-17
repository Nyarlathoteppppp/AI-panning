/* Subgoal labels for worked examples: the generic steps for this kind of exam calculation.
 * Shown at the top of section ⑥ so the learner remembers the procedure, not just the numbers. */
(function (root) {
  'use strict';
  const R = String.raw;
  root.RL.content.subgoals = {
    a02: [R`检查前提：$Pre(a)\subseteq s$ 吗？有一个不在就不能执行`, R`删掉 $Del(a)$ 里的事实`, R`加上 $Add(a)$ 里的事实（同时出现在 Del 和 Add 的，执行后为真）`, R`检查目标：$G\subseteq s'$ 吗？`],
    a03: [R`确定 open 的取法：BrFS 先进先出，DFS 后进先出，uniform cost 取 $g$ 最小`, R`弹出一个节点；它的状态已在 closed 里就丢掉，跳回这一步`, R`放进 closed，做目标测试（展开时测试）`, R`按题目给的顺序生成后继，记录 $g$ 和父节点，放进 open`],
    a04: [R`列出新状态里为真的原子`, R`有没有一个原子是搜索中第一次为真？有 → $w=1$`, R`否则看原子对：有没有一对是第一次同时为真？有 → $w=2$，依此类推`, R`$w>k$ 就剪掉；否则保留，并记下它带来的新组合`],
    a05: [R`从目标倒着算每个状态的 $h^*$（无解为 $\infty$）`, R`逐个状态检查：$h=\infty$ 处 $h^*$ 也是 $\infty$（safe）、目标处 $h=0$（goal-aware）、$h\le h^*$（admissible）`, R`逐条边检查 $h(s)\le c(a)+h(s')$（consistent）`],
    a06: [R`生成节点时记下 $g$、$h$，算优先值：GBFS 用 $h$，A* 用 $g+h$，加权 A* 用 $g+W h$`, R`弹出优先值最小的（并列按题目规则）`, R`查重：已在 closed 就丢掉；A* 中若这次 $g$ 更小则重新打开`, R`展开时做目标测试；不是目标就生成后继放进 open`],
    a07: [R`记下当前状态的 $h_0$`, R`从当前状态做 BrFS（带重复检测），按生成顺序检查每个状态`, R`第一个 $h<h_0$ 的状态：跳过去，回到第 1 步；它是目标就结束`, R`BrFS 搜完都没找到：EHC 失败`],
    a08: [R`写出原问题动作的前提（例如“相邻”“目标格为空”）`, R`去掉哪些前提，得到简化问题 $P'$ 和变换 $r$`, R`算简化问题的最优解代价 $h'^*$，它就是启发式`, R`判断三个性质：native？$r$ 多项式？$h'^*$ 多项式？`],
    a09: [R`把每个动作的 Del 清空`, R`从当前状态出发，选前提已满足、能加入新事实的动作，状态只增不减`, R`直到 $G\subseteq s$；最优松弛计划代价就是 $h^+$`, R`同一个动作不必执行两次`],
    a10: [R`第 0 轮：当前状态里的事实记 0，其余记 $\infty$`, R`每一轮、每个事实：在所有能加出它的动作里取 $\min\ c(a)+C(pre_a)$，$C$ 用上一轮的表，$h_{max}$ 取前提的最大值，$h_{add}$ 取和`, R`表不再变化就停`, R`合并目标：$h_{max}$ 取各目标的最大值，$h_{add}$ 取和`],
    a11: [R`先算 $h_{add}$（或 $h_{max}$）表，给每个事实记下最佳支持者 bs`, R`Open $=G\setminus s$`, R`取出一个子目标 $g$，把 bs($g$) 放进 RPlan；它的前提中不在 $s$、也还没处理过的放进 Open`, R`Open 空了：$h_{FF}$ = RPlan 中动作代价之和；RPlan 中在 $s$ 可执行的就是 helpful actions`],
    c05: [R`列出这条 episode 每一步的奖励 $R_1,R_2,\dots,R_T$`, R`第 $k$ 个奖励乘 $\gamma^{k-1}$（第 1 个奖励不打折）`, R`全部相加得 $G_0$；要每个时刻的 $G_t$ 时，从最后一步往前算 $G_t=R_{t+1}+\gamma G_{t+1}$，$G_T=0$`],
    c07: [R`列出 $(s,a)$ 的三个移动尝试：按意图 0.8、向左打滑 0.1、向右打滑 0.1（撞墙或出界留在原地）`, R`每个结果算 $r+\gamma V(s')$（终止状态 $V=0$）`, R`乘概率后相加，得 $Q(s,a)$`, R`expectation 方程按 policy 加权；optimality 方程对动作取 max`],
    c08: [R`固定 policy $\pi$：每个非终止状态只看 $\pi(s)$ 这一个动作`, R`写出 $V(s)=\sum_{s'}p(s'\mid s,\pi(s))\,[r+\gamma V(s')]$`, R`迭代法：每一轮都用**上一轮的旧表**同步更新所有状态；或者直接解这组线性方程`, R`最大变化小于 $\varepsilon$ 时停止`],
    c09: [R`Policy evaluation：算出当前 policy 的 $V^\pi$`, R`每个状态用 $V^\pi$ 算四个动作的 $Q(s,a)$`, R`取 argmax 得到新 policy（并列时保留旧动作）`, R`policy 没有变化就停止；否则回到第 1 步`],
    c10: [R`用旧表 $V_{t-1}$ 给每个状态算四个 $Q_t(s,a)$（所有状态同步，都用旧表）`, R`$V_t(s)=\max_aQ_t(s,a)$`, R`算 $\max_s|V_t(s)-V_{t-1}(s)|$，小于 $\varepsilon$ 或达到 $T_{\max}$ 就停`, R`用最后的 $Q$ 取 argmax，得到 policy`],
    c13: [R`选一个臂 $a$，得到奖励 $r$`, R`计数加一：$N(a)\leftarrow N(a)+1$`, R`用新的计数更新：$Q(a)\leftarrow Q(a)+\frac{1}{N(a)}\big(r-Q(a)\big)$`],
    c15: [R`按 policy 走完整条 episode，记下每一步的 $(S_t,A_t,R_{t+1})$`, R`从最后一步往前算 return：$G_T=0$，$G_t=R_{t+1}+\gamma G_{t+1}$`, R`倒序处理每个时刻：先把 $N(S_t,A_t)$ 加一，**马上**用这个 $G_t$ 和刚加过的 $N$ 更新 $Q(S_t,A_t)\leftarrow Q+\frac1N(G_t-Q)$（不要先把整条 episode 的 $N$ 全加完再更新）`],
    c16: [R`用当前 $Q$ 的 ε-greedy 跑完一条 episode`, R`按 MC prediction 从后往前算 $G_t$、更新 $N$ 和 $Q$`, R`下一条 episode 的 ε-greedy 自动用更新后的 $Q$（这就是 policy improvement）`],
    c17: [R`执行一步，得到 $(S,A,R,S')$`, R`写出 TD target：$R+\gamma\,Q(S',\pi(S'))$；$S'$ 是终止状态时 target 只有 $R$`, R`TD error：$\delta=\text{target}-Q(S,A)$`, R`$Q(S,A)\leftarrow Q(S,A)+\alpha\,\delta$，立即生效，下一步就用新值`],
    c20: [R`在 $S$ 执行 $A$，得到 $R$ 和 $S'$`, R`若 $S'$ 是终止状态：target $=R$，更新后这条 episode 结束（不再抽 $A'$）`, R`否则先用 ε-greedy 在 $S'$ 抽出下一个动作 $A'$，target $=R+\gamma\,Q(S',A')$`, R`$Q(S,A)\leftarrow Q(S,A)+\alpha\,(\text{target}-Q(S,A))$`, R`$S\leftarrow S'$，$A\leftarrow A'$：下一步必须执行这个 $A'$`],
    c21: [R`在 $S$ 用 ε-greedy 选 $A$，执行得到 $R$ 和 $S'$`, R`target $=R+\gamma\max_bQ(S',b)$；$S'$ 是终止状态时 target $=R$`, R`$Q(S,A)\leftarrow Q(S,A)+\alpha\,(\text{target}-Q(S,A))$`, R`$S'$ 终止则这条 episode 结束；否则在 $S'$ 重新用 ε-greedy 选动作（target 里的 max 动作不一定被执行）`],
    c24: [R`写出特征向量：学 $\hat V$ 用 $\mathbf x(s)$；学 $\hat Q$ 且按动作分块时，用把 $\mathbf x(s)$ 放进动作 $a$ 那一块、其余块为 0 的 $\mathbf x(s,a)$`, R`预测 $\hat y=\mathbf w^\top\mathbf x$`, R`误差 $\delta=\text{target}-\hat y$`, R`每个权重各自更新：$w_i\leftarrow w_i+\alpha\,\delta\,x_i$（特征为 0 的权重不动，所以分块时只有动作 $a$ 那一块被更新）`, R`检查：共享这些权重的其他状态，预测也一起变了`],
    c27: [R`跑完整条 episode，从后往前算每个时刻的 $G_t$`, R`对每个时刻 $t$：算当前的 $\pi(\cdot\mid S_t)$（softmax）`, R`score：被选动作 $1-\pi$，其他动作 $-\pi$`, R`$h(S_t,b)\leftarrow h(S_t,b)+\alpha\,\gamma^t G_t\times\text{score}_b$（所有动作同时用旧概率更新）`],
    c29: [R`当前偏好 $h$ → softmax 概率 $\pi$`, R`选了动作 $a$，这一步就终止，$G_0=r$`, R`score：$a$ 为 $1-\pi(a)$，另一个为 $-\pi$`, R`$\Delta h=\alpha\,G_0\times\text{score}$，再算新的 $\pi$`],
    c30: [R`算 $\delta=G_t-b(S_t)$（用更新前的 $b$）`, R`actor：$h\leftarrow h+\alpha\,\delta\times\text{score}$`, R`baseline：$b\leftarrow b+\beta\,\delta$`],
    c31: [R`执行一步，得到 $(s,a,r,s')$`, R`TD error：$\delta=r+\gamma V(s')-V(s)$（$s'$ 终止时 $V(s')=0$）`, R`actor：$h(s,b)\leftarrow h(s,b)+\alpha\,\delta\,(\mathbb 1\{b=a\}-\pi(b\mid s))$`, R`critic：$V(s)\leftarrow V(s)+\beta\,\delta$`],
    c33: [R`Selection：从根用 UCB 往下选，直到某个节点还有未试的动作，或采样到树里没有的后继，或走到树里已有的终止节点`, R`Expansion：为新结果建一个节点（走到已有终止节点时没有新节点，直接令 $G=0$ 去回传）`, R`Simulation：从新节点 rollout 到终止或 horizon，算 $G$（新节点是终止状态时 $G=0$）`, R`Backpropagation：从下往上，每条边先算 $R\leftarrow r+\gamma R$，再 $Q\leftarrow Q+\frac{R-Q}{N+1}$、$N\leftarrow N+1$`],
    c34: [R`取这个节点的访问次数 $N(s)$，算 $\ln N(s)$（新树的根有 $N(s)=\sum_aN(s,a)$；树里其他节点被创建时还多算了 1 次，通常 $N(s)=1+\sum_aN(s,a)$）`, R`每个动作的 bonus $=c\sqrt{\ln N(s)/N(s,a)}$（$N(s,a)=0$ 记作 $+\infty$）`, R`UCB $=Q+\text{bonus}$，搜索时选最大的`, R`搜索结束后，按 $Q$ 最大（或访问次数最多）选要执行的动作`],
    c36: [R`decision node：列出所有动作`, R`每个动作的 chance node：列出所有结果和概率`, R`每个结果算 $r+\gamma V_{d-1}(s')$（$s'$ 是终止状态或深度已用完时，$V_{d-1}(s')$ 取 0；$r$ 照算，例如进 $s_{11}$ 仍得 +1）`, R`按概率加权求和得 $Q_d(s,a)$`, R`$V_d(s)=\max_aQ_d(s,a)$`],
    c37: [R`算 $\sum_uN(s,u)$ 和它的平方根`, R`每个动作的加分 $=c_{\text{puct}}\,P(s,b)\,\sqrt{\sum_uN}/(1+N(s,b))$`, R`加上 $Q(s,b)$，选最大`],
    c38: [R`取根节点各动作的访问次数 $N(s_t,a)$`, R`每个算 $N^{1/\tau}$`, R`归一化得 $\pi_t$`, R`训练损失：$(z_t-v_\theta)^2-\sum_a\pi_t\log p_\theta+\beta\lVert\theta\rVert^2$，逐项代入`]
  };
})(window);
