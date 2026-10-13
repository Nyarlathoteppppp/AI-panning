# COMP90054 AI Planning for Autonomy 交互课程（Weeks 1–11）

目标：**不打开原始 PPT，只靠这个网站也能学懂并复习 W1–W11 的全部内容。** W1–W5 经典规划写得紧凑（期末复习用），W6–W11 强化学习写得最详细。

## 打开方式

直接双击 `index.html`（Chrome / Safari / Edge / Firefox 均可）。网站完全离线运行：没有后端、没有数据库、不需要联网，也不需要启动任何服务；KaTeX 与 markdown-it 已放在 `vendor/`。整个 `site/` 文件夹要一起拷贝。

## 内容

- W1–W5 经典规划 11 章（编号 P1–P11）：规划模型 → STRIPS / PDDL / 复杂度 → 盲目搜索 → novelty 与 IW → 启发式性质 → GBFS / A* / 加权 A* → 局部搜索、BFWS 与模拟器 → 松弛 → 删除松弛与 h+ → h_max / h_add → h_FF 与 helpful actions。课件留空的性质表、Bellman-Ford 表都已补全，每章带课堂测验原题。
- W6–W11 强化学习 38 章（编号 1–38），顺序与课件一致：W6-1 MDP 建模 → W6-2 Bellman 与 DP → W7 RL 入门、Bandit、MC → W8-1 MC Control、TD → W8-2 n-step、SARSA、Q-learning → W9 函数近似 → W10-1 Policy-based → W10-2 Actor-Critic → W11-1 MCTS（在线规划、四步、UCT、Expectimax、AlphaGo 家族）。设计依据见 [COURSE_MAP.md](COURSE_MAP.md)。
- 每章 10 个环节：它是什么 → 为什么需要它 → 直觉 → 数学定义 → 公式逐项解释（KaTeX 逐步高亮） → 数值例子 → 可交互可视化 → 与相近概念比较 → 常见误区 → Quiz（每题带解释）。
- 课件中只有图片的数值页（VI 第 1–10 轮、PI 的 π₀→π₁、MC 三条 episode、TD 三条 episode、W9 特征与更新、Aliased Gridworld）都能在交互中逐步复现。
- 整合了原图文课程（`../RL_visual_course.html`）的 33 张教学图、讲解要点和代码单元。
- 重要术语写成“English（中文）”（考试用英文）：`js/ui/terms.js` 在渲染时自动处理，每章第一次出现时标注；术语表也是英文在前。
- 过程型章节的数值例子开头有“做这类题的步骤”（`data/subgoals.js`）；多数章节的“直觉”末尾有一段算法背景小故事（`data/stories.js`，课件未讲、不考）。
- **3Blue1Brown 风格动画**（在“③ 直觉”里，文字之后）：深色画布、固定的符号配色（$V$ 蓝、$Q$ 青、$r$ 黄、$\gamma$ 绿、$G$ 金、$\alpha$ 紫、$\delta$ 红、target 粉），每段先抛出一个问题，顶部的流程条标出现在在哪一步，公式随画面一块块搭起来；可前进 / 后退 / 自动播放（关键帧会多停一会儿）/ 拖参数。引擎 `js/ui/scene.js`，场景在 `js/scenes/`（rl-core、rl-advanced、planning），章节对应关系在 `data/scenes.js`。
- **Manim 视频**：`../manim/` 里用 Manim Community 渲染（`manim/README.md`），成片放在 `assets/video/`。写作流程参考 `manim/vendor/` 里的两个技能包：adithya-s-k/manim_skill（先写 scenes.md 分镜，再按 ManimCE 规范实现）和 AmitSubhash/3brown1blue（教学检查清单、制作质量规则）。
- MC、TD、Q-learning / SARSA、MCTS 单步解剖这几个逐步实验可以“上一步”后退（用同一随机种子重放，结果与前进时一致）。
- 首页有“第一次来先看这里”和贯穿全课的 Gridworld 速查卡。
- 附录：术语表、公式速查表、按题型抽题的综合复习测验。
- 学习功能：左侧目录与全文搜索、章节掌握进度、每章笔记（保存在本浏览器）、导出 Markdown 学习记录、浅色/深色主题、字号切换、Alt+←/→ 切换章节。

## 目录结构

```
index.html            页面骨架
css/                  base（主题 token）· layout · components · viz
js/core/              纯算法：planning（W1–W5 搜索与启发式）、mdp、dp、learn、examples、mcts（浏览器与 Node 共用）
js/ui/                dom 工具、markdown+KaTeX、公式逐项解释、quiz、scene（3B1B 风格动画引擎）、app（路由/目录/进度）
js/scenes/            3B1B 风格动画：rl-core（回报、Bellman、TD、MC vs TD）、rl-advanced（UCB、线性近似、policy gradient、MCTS）、rl-extra（增量平均、SARSA vs Q-learning、baseline）、planning（A*、IW、爬山法、删除松弛、h_add、h_FF）
js/viz/               41 个可视化，按周分文件（w1-5-planning、w6-model、w6-dp、w7-bandit、w7-mc、w8-td、w8-control、w9-approx、w10-policy、w10-actorcritic、w11-mcts）
data/                 content（注册表）· part0-planning（P1–P11）· part1…part9（38 章正文）· glossary · formulas · enrich（原课程整合）
assets/figures/       原课程教学图
assets/video/         Manim 渲染的短视频
reference/            课件文本提取与 W6 讲课 transcript（作为内容依据，学习时不需要打开）
tests/                core.test.js（用课件数值校验算法）· site.check.js（内容完整性与全部公式的 KaTeX 解析）
vendor/               KaTeX 0.16.22、markdown-it 14.1.0（MIT）
```

## 校验

```bash
node tests/core.test.js
```

```bash
node tests/site.check.js
```

`core.test.js` 用课件上的数字校验 W1–W5（Australia 的 h_max 5.5 / h_add 13 / h+ 10 / h* 20，Logistics 的 h_add 表、best supporter 与 h_FF 5，W3 的 A* 例子，b=10、d=5 时 BrFS/IDS 的 111,110 / 123,450，IW 网格）和 RL 部分（s₁₀ 的 0.8/0.872、VI 第 5/10 轮、V^π₀、V^π₁=V*、MC 的 0.2406、TD 的 0.1718、W9 的 0.8032/0.1444、REINFORCE 梯度、W10-2 机器人例子 E1/E2/E100/E101 与 learned baseline 9.9/18.81/98.99737 等）校验算法，也校验 W11 数字（课件决策 1 根节点的 UCB ≈0.3819/0.3784/0.3845/0.3794；子树复用导致的根访问次数和 204/253/260/255/338；s10 深度 1/2 的 Expectimax = 0.8/0.872）；`site.check.js` 检查全部 49 章的结构、可视化注册、图片路径与约 5800 个公式。

## 范围说明

- DQN 与神经网络近似按课件标注为 Not examinable，只讲概念；experience replay 与 target network 课件未讲，作为延伸标注。
- Cliffworld 演示中的奖励数值课件未完整给出，交互里标明了所用的演示参数。
- 课件自身的几处笔误（W9 slide 17、30、32、34；W7 slide 32）在对应章节中注明并给出与定义一致的数值。
