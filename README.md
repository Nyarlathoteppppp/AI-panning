# COMP90054 AI Planning for Autonomy · 交互复习课程

墨尔本大学 COMP90054（AI Planning for Autonomy）Weeks 1–11 的离线交互课程，用来不打开课件也能学懂、复习。中文讲解，关键术语写成 English（中文）。

**打开方式**：下载后直接双击 [`site/index.html`](site/index.html)。完全离线，没有后端，不需要联网（KaTeX、markdown-it 已放在 `site/vendor/`）。整个 `site/` 文件夹要一起拷贝。

## 内容

- **W1–W5 经典规划**（P1–P11，期末复习用）：规划模型、STRIPS / PDDL、盲目搜索、IW、启发式性质、GBFS / A*、局部搜索与 BFWS、松弛、删除松弛与 h+、h_max / h_add、h_FF。
- **W6–W11 强化学习与 MCTS**（第 1–38 章）：MDP、Bellman 与动态规划、Bandit、MC、TD、SARSA / Q-learning、函数近似、Policy Gradient、Actor-Critic、MCTS 与 AlphaGo 家族。
- 每章 10 个环节：是什么 → 为什么 → 直觉 → 数学定义 → 公式逐项解释 → 数值例子 → 交互实验 → 对比 → 常见误区 → 测验。
- **3Blue1Brown 风格动画**（在“③ 直觉”里）：每段先抛一个问题，顶部流程条标出走到哪一步，公式随画面一块块搭起来；可前进、后退、自动播放、拖参数。
- **Manim 视频**：价值迭代、GPI、梯度下降、三种搜索的前沿对比（`site/assets/video/`，源码在 `manim/scenes/`）。
- 附录：术语表、公式速查表、综合复习测验；进度和笔记保存在本地浏览器，可导出 Markdown。

## 目录

```
site/            网页本体（index.html、css、js、data、assets、vendor）
  js/core/       课程算法（MDP、DP、TD、MCTS、规划搜索与启发式），浏览器与 Node 共用
  js/ui/         界面与 3B1B 风格动画引擎（scene.js）
  js/scenes/     动画场景      js/viz/  交互实验      data/  各章正文
  tests/         node tests/core.test.js（用课件数字校验算法）· node tests/site.check.js（内容完整性与全部公式）
manim/scenes/    Manim 视频源码（*.py）与分镜（*.scenes.md），共用样式 style.py
```

详细说明见 [`site/README.md`](site/README.md)，课程地图见 [`site/COURSE_MAP.md`](site/COURSE_MAP.md)。

## 说明

个人学习用的复习材料，内容依据课程讲义整理并核对；不代表课程官方。课件原文与其他课程资料不包含在本仓库中。
