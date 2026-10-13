/* Which 3B1B-style animations (js/scenes/*.js) and Manim clips (assets/video/) appear in each
 * chapter. They are shown in section ③ (直觉), after the prose: picture first, formulas later. */
(function (root) {
  'use strict';
  root.RL.content.scenes = {
    a04: [{ id: 'iw-novelty' }],
    a06: [{ id: 'astar-queue' }],
    a07: [{ id: 'hill-landscape' }],
    a09: [{ id: 'delete-relax' }],
    a10: [{ id: 'hadd-propagation' }],
    a11: [{ id: 'hff-extract' }],
    c05: [{ id: 'return-backward' }],
    c07: [{ id: 'bellman-backup' }],
    c13: [{ id: 'incremental-mean' }],
    c14: [{ id: 'ucb-bonus' }],
    c17: [{ id: 'td-pull' }],
    c18: [{ id: 'mc-vs-td' }],
    c22: [{ id: 'sarsa-vs-q' }],
    c24: [{ id: 'linear-update' }],
    c27: [{ id: 'softmax-pg' }],
    c29: [{ id: 'softmax-saturate' }],
    c30: [{ id: 'baseline-shrink' }],
    c33: [{ id: 'mcts-steps' }]
  };
  root.RL.content.videos = {
    c10: [{ src: 'assets/video/value-iteration.mp4', poster: 'assets/video/value-iteration.jpg', title: '价值是怎么从终点流回起点的？',
      caption: '课件的 4×3 Gridworld（0.8 / 0.1 / 0.1，$\\gamma=0.9$）。先看第 2 轮在 $s_{10}$ 做的一次 Bellman 备份：四个动作值 0.676、0.872、0.1、0.072，取最大的 E；再看每一轮同步更新，价值从 $+1$ 那格一圈圈往外扩散；第 12 轮读出贪心策略。' }],
    c11: [{ src: 'assets/video/gpi.mp4', poster: 'assets/video/gpi.jpg', title: '评估和改进，为什么来回走就能到最优？',
      caption: '横轴是策略 $\\pi$，纵轴是价值 $V$。蓝线 $V=v_\\pi$：评估做完，价值和策略一致；橙线 $\\pi=\\text{greedy}(V)$：改进做完，策略对价值贪心。评估时 $\\pi$ 不动、竖着走到蓝线，改进时 $V$ 不动、横着走到橙线，台阶越走越小，停在交点 $(V^*,\\pi^*)$。Value iteration 只评估一小步就改进，也收敛到同一点。课件 Gridworld 里 $\\pi_1$ 就已经最优。' }],
    c24: [{ src: 'assets/video/gradient-descent.mp4', poster: 'assets/video/gradient-descent.jpg', title: '权重该往哪个方向改？',
      caption: '误差 $J(\\mathbf w)$ 是一只碗，梯度 $\\nabla J$ 指向上坡，沿反方向走一小步：$\\mathbf w\\leftarrow\\mathbf w-\\alpha\\nabla J$。俯视时步子垂直于等高线；$\\alpha$ 小走得稳，$\\alpha$ 太大在窄谷里来回跳。对一个样本 $J=\\tfrac12\\delta^2$、$\\delta=y-\\mathbf w^\\top\\mathbf x$，所以 $\\nabla J=-\\delta\\,\\mathbf x$，代进去就是 MC / TD 用的 $\\mathbf w\\leftarrow\\mathbf w+\\alpha\\,\\delta\\,\\mathbf x$，只是 target $y$ 不同。' }],
    a06: [{ src: 'assets/video/frontier-race.mp4', poster: 'assets/video/frontier-race.jpg', title: '同一张地图，三种搜索谁更聪明？',
      caption: '带 U 形陷阱的格子地图，每走一步代价 1，$h$ = Manhattan 距离。三种算法同步、每步展开一个格子：蓝 = 已展开（closed），橙 = 在 open 里。看 GBFS 怎样被 $h$ 引进陷阱、A* 怎样靠 $g$ 及时回头。结果：UCS 展开 71 格、代价 13；GBFS 34 格、代价 17（不最优）；A* 38 格、代价 13（最优，且比 UCS 少展开很多）。' }]
  };
})(window);
