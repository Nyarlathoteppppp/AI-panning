# Value Iteration (W6-2)

## Overview
- **Topic**: Synchronous value iteration in the course 4x3 Gridworld.
- **Hook**: “价值是怎么从终点流回起点的？”
- **Target audience**: Master's students revising for an exam after one lecture viewing.
- **Key insight**: One cell update is a max over action expected returns; repeated backups pass value outward one cell per sweep.
- **Length**: About 47 seconds.

## Narrative arc
Use a progressive reveal: start with terminal rewards, perform one explicit Bellman backup, then compress the repeated sweeps into visible diffusion and read the greedy policy. The persistent strip (① 初始 ② 一次备份 ③ 价值扩散 ④ 读出策略) keeps the procedure visible while the matching coloured maths stays in the formula band.

## Beats

### 1. Hook and initial grid (~7 s)
- **Visual**: Hook, then enlarged 4x3 grid with wall and glowing ±1 terminal cells.
- **Maths**: `V₀(s)=0`; terminal-entry reward `r=+1 / −1` in R_COL/NEG_COL.
- **Caption**: “先把两个终点奖励放进网格”.

### 2. First synchronous backup (~7 s)
- **Visual**: Only s10 lights and shows 0.800; process strip highlights ②.
- **Maths**: `V₁(s10)=0.8×(+1)=0.800`, using V₀, in V_COL/R_COL.
- **Caption**: “第1轮：只有 s10 能一步碰到 +1”.

### 3. One Bellman backup (~12 s)
- **Visual**: Grid beside a large action-value panel. The grid still shows V1 (only s10 = 0.800). Four bars for s10 (N .676, E .872, S .100, W .072); E is highlighted and flies to s10, which ticks to 0.872.
- **Maths**: Build `Q(s,a)=Σ p(r+γV(s′))`, then `V₂(s10)=maxₐ Q(s10,a)=.872`, with Q_COL, R_COL, GAMMA_COL, V_COL, OPEN_COL.
- **Caption**: “每根柱子，是一个动作的期望回报” → “取最大值：E，价值才会更新”.

### 4. Synchronous V2 + value diffusion (~13 s)
- **Visual**: Panel leaves; a sweep counter appears on the right (“同步扫描轮数”, big orange `k = 2`, 12-slot progress bar). The rest of sweep 2 lands at once: s9 .576 and s6 .476 appear with orange ripples (all cells are now V2). Then every sweep k = 3…12 plays at ~0.6 s; k ticks and one more slot fills. A cell's number appears only when value first reaches it, with a ripple: k=3 {s8 .415, s3 .343}, k=4 {s5, s2, s4}, k=5 {s1}; from k=6 nothing new, values only converge. Strip highlights ③.
- **Maths**: `V_{k+1}(s) ← maxₐ Σp[r+γV_k(s′)]` stays in the band; the k on screen is the k in the formula.
- **Caption**: “同一轮里，所有格子一起用 V1 更新” → “看 k：每多一轮，价值往外多走一格” → (k=6) “不再有新格子，数值只是继续收敛”.
- **Checks**: script asserts V3 (s8 .415, s3 .343, …) and the reached-cell rings per sweep.

### 5. Read policy and takeaway (~12 s)
- **Visual**: Small corner arrows leave the dimmed values legible; strip highlights ④. Formula is assembled in a clear formula band above the caption.
- **Maths**: Full coloured update `V_{k+1}(s) ← maxₐ Σp[r+γV_k(s′)]` (one MathTex), assembled from the visual value, max, probabilities, reward, discount, and next value. Counter dims to 35 %.
- **Caption**: “每一轮，价值往外多传一格”.

## Layout regions
- **Process strip**: y≈3.55, persistent, four compact rounded boxes.
- **Main visual**: y≈0.0; grid x≈−3.6 and backup panel x≈3.7 (later the k counter at x≈3.75). Grid cells are about 1.5 units high, filling ~60% of frame height.
- **Formula band**: y≈2.2, above the bottom caption and below the process strip.
- **Caption zone**: y≈−3.55.

## Colour and continuity
V_COL is value/next-value, Q_COL is action value/probability, R_COL is reward, GAMMA_COL is discount, OPEN_COL is max/policy, and NEG_COL is the negative terminal. Keep the grid and panel on screen together during the aha beat; remove every panel label before diffusion.
