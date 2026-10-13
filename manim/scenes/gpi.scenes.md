# GPI — value iteration and policy iteration as one picture

## Overview
- **Topic**: GPI as alternating evaluation and greedy improvement
- **Hook**: “评估和改进，为什么来回走就能到最优？”
- **Target audience**: Master's students revising for an exam after one lecture
- **Key insight / aha**: Two different consistency lines pull an estimate toward their intersection; exact PI lands on each line, while VI takes shorter evaluation hops and still converges.
- **Length**: ~48 seconds

## Narrative arc
**Mystery → Investigation → Resolution**: pose the hook, build the two consistency lines and their matching equations, then follow one point through exact PI zig-zags and shorter VI hops. Resolve at the shared fixed point, connect to the course fact π₀ → π₁, and summarize the GPI loop.

**Axes carry meaning**: x = 策略 π, y = 价值 V (small DIM Text at the arrow ends of an L-shaped axis). The blue line `V = v_π` is a graph over x (each π has one true value); the orange line `π = greedy(V)` is a graph over y (each V has one greedy policy). Hence evaluation (π fixed) is a **vertical** hop and improvement (V fixed) a **horizontal** hop. The orange line is steeper (slope 0.66 vs 0.22, same optimum (0.78125, 0.321875)), so the hops form a staircase whose V never decreases — the policy improvement theorem in one picture.

## Layout regions
- **Process strip**: top, y≈3.55; persistent ①评估 ②改进 ③来回走 ④VI与PI, active stage underlined.
- **Main plane**: x≈[-5.8,5.8], y≈[-2.0,2.1]; grid, two lines, moving point.
- **Formula region**: band below the plane (y≈−2.8), one formula at a time, swapped in the same play as the caption.
- **Fact panel**: above the plane (y≈2.5), never over the intersection.
- **Caption zone**: bottom edge, y≈−3.6; one caption at a time.

## Beats

### 1. Hook and orientation — 4 s
- **Visuals**: process strip appears; hook below it.
- **Moves**: fade hook after a thinking pause; activate ①评估.
- **Math**: none yet; preserve cognitive space for the question.
- **Caption**: none.

### 2. Plane and evaluation line — 9 s
- **Visuals**: grid + L-shaped axes labelled 策略 π / 价值 V; blue line with MathTex label `V=v_π` at its right end. Strip ① active.
- **Math**: `v_π(s) = Σ π p [r + γ v_π]` in V_COL, grown from a `v_π(s)` seed.
- **Caption**: “平面上一个点 = 一个策略 π 加一个价值 V” → “蓝线上：V 正好是这个 π 的真实价值”.

### 3. Improvement line — 5 s
- **Visuals**: strip ② lights while the orange line and MathTex label `π=\text{greedy}(V)` appear.
- **Math**: `π'(s) = argmaxₐ q_π(s,a)` in OPEN_COL.
- **Caption**: “橙线上：π 正好对 V 做贪心选择”.

### 4. PI exact staircase / aha — 14 s
- **Visuals**: start `π_0, V_0` off both lines; vertical blue hop to the blue line, horizontal orange hop to the orange line, then ever-shorter steps and a gold tail into the intersection labelled `V^*, π^*`.
- **Sync rule**: before each of the first two hops, stage + caption + formula switch in **one** play, then the hop: ① “精确评估：π 不动，V 竖直走到蓝线” (blue formula), ② “贪心改进：V 不动，π 水平走到橙线” (orange formula). Then ③ “台阶越走越小，收进两线交点” while the formula swaps with every hop. Hold 1.5 s on the intersection.

### 5. VI half steps — 10 s
- **Visuals**: same start; each hop goes half way (dashed line = the full hop) — vertical then horizontal; after 8 hops a gold staircase tail glides into the intersection (`→ V^*, π^*`). Strip ④.
- **Caption**: “VI：每步只走一半，虚线是到线的全程” → “小步也一样：竖着评估、横着改进” → “VI 走小步；重复以后也收敛”.

### 6. Course fact and summary — 10 s
- **Visuals**: fact panel above the plane (intersection stays visible): “课件例子：π₀ → π₁；π₁ 已最优”. Then clear the plane and show the colored “评估 ⇄ 改进” summary and takeaway.
- **Moves**: circumscribe the fact; remove plane before reusing its center; grow blue/orange arrows.
- **Math**: summary arrows encode evaluation V_COL and improvement OPEN_COL.
- **Caption**: “PI 在这个 Gridworld 只需一次改进”, then “评估 ⇄ 改进：这就是 GPI”.
- **Takeaway**: “VI、PI、以后的 MC / TD control 都是这张图”.
