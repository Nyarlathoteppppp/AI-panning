/* Short background stories that make an algorithm easier to remember.
 * Shown at the end of section ③ (intuition). Not from the slides, not examinable. */
(function (root) {
  'use strict';
  const R = String.raw;
  root.RL.content.stories = {
    a01: R`1959 年，Allen Newell、Herbert Simon 和 Cliff Shaw 写了 General Problem Solver（GPS）：用户只描述问题，程序用“比较当前状态和目标的差别，选一个能缩小差别的操作”（means-ends analysis）去求解。“写一个程序解一大类问题”这个目标，就是这门课所说的 model-based 方法的起点。`,
    a02: R`STRIPS 是 “Stanford Research Institute Problem Solver” 的缩写，由 Richard Fikes 和 Nils Nilsson 在 1971 年提出，用来给 SRI 的移动机器人 Shakey 规划行动——Shakey 被认为是第一个能对自己的行动进行推理的移动机器人。PDDL 则是 Drew McDermott 等人在 1998 年为第一届国际规划竞赛（IPC）制定的。`,
    a03: R`Edsger Dijkstra 回忆说，他 1956 年和未婚妻在阿姆斯特丹逛街，累了坐在咖啡馆露台上，大约 20 分钟就想出了最短路算法，没有用纸笔——他认为不用纸笔反而逼着自己避免复杂。这个算法（uniform-cost search 的原型）3 年后才发表。`,
    a04: R`Novelty、IW 和 SIW 是 Nir Lipovetzky 和 Héctor Geffner 在 2012 年提出的；Lipovetzky 正是在墨尔本大学讲这门课的老师。之后的 BFWS（2017）把 novelty 和启发式结合起来，成了这一路线最强的规划器之一。`,
    a06: R`A* 是 Peter Hart、Nils Nilsson 和 Bertram Raphael 1968 年在 SRI 为机器人 Shakey 的路径规划提出的——和 STRIPS 是同一个机器人项目。之前的版本分别叫 A1、A2，Hart 证明了最优性的最终版本就加了个星号（通常解释为“最优的 A”）。加权 A* 由 Ira Pohl 在 1970 年提出。`,
    a07: R`Arcade Learning Environment（2013）把 Atari 2600 的几十个游戏做成了 AI 的标准测试平台。2015 年 Lipovetzky、Ramírez 和 Geffner 发现，几乎不用改动的 IW(1) 直接把 RAM 当原子就能在这些游戏上规划得很好——和同一时期 DeepMind 用深度强化学习打 Atari 的工作形成了有趣的对照。`,
    a08: R`15-puzzle（8-puzzle 的 4×4 版）在 1880 年前后风靡美国和欧洲。谜题作家 Sam Loyd 后来声称是自己发明的，还说曾悬赏 1000 美元求解“把 14 和 15 对调”的局面——这个局面其实无解（排列的奇偶性不对），所以不可能有人领到赏金。“Manhattan 距离”则得名于曼哈顿方格状的街道：出租车只能横平竖直地走，不能斜穿街区。`,
    a09: R`把“忽略删除”估计出的距离当启发式、再用启发式搜索做规划，因 Blai Bonet 和 Héctor Geffner 的 HSP（Heuristic Search Planner）而出名：它在 1998 年第一届国际规划竞赛中表现亮眼，用的就是 GBFS + $h_{add}$。从此“启发式搜索 + 自动生成的启发式”成了经典规划的主流。`,
    a10: R`Bellman-Ford 算法以 Richard Bellman（1958）和 Lester Ford Jr.（1956）命名，Edward Moore 在 1957 年也独立提出过它。$h_{max}$ / $h_{add}$ 的表格计算借用的就是它“反复松弛每条边，直到不再变化”的做法。Bellman 也就是提出 MDP 和动态规划的那位。`,
    a11: R`FF 是 “Fast-Forward” 的缩写，由 Jörg Hoffmann 写成，在 2000 年的国际规划竞赛中表现极为突出：它从目标倒推出一个松弛计划，并用 helpful actions 剪枝。后来的 LAMA（Silvia Richter 等）把 $h_{FF}$ 和 landmarks 放进多队列 GBFS，赢得了 2008 年和 2011 年的竞赛。`,
    c01: R`“Markov decision process”这个说法来自 Richard Bellman 1957 年的论文《A Markovian Decision Process》。他当时在美国 RAND 公司研究“一连串决策怎样安排最好”这类军方与工业问题，MDP 就是为这种“每一步都有随机后果”的决策问题搭的数学框架。`,
    c02: R`这个 4×3 Gridworld（0.8 按意图、0.1 / 0.1 向两侧打滑，右上 +1、其下 −1、中间一堵墙）是 Russell 和 Norvig 的经典教材《Artificial Intelligence: A Modern Approach》里的“4×3 world”。全世界很多 AI 课程都用这同一张小地图讲 MDP，所以你在别处看到它不要奇怪。`,
    c03: R`Andrey Markov 在 1913 年做过一个很“文科”的实验：他把普希金长诗《叶甫盖尼·奥涅金》的前 20000 个字母逐个标成元音或辅音，统计“下一个字母是元音的概率”只看前一个字母时是多少。这就是最早的 Markov 链分析之一——“下一步只取决于现在”。`,
    c07: R`“Dynamic programming（动态规划）”这个名字是 Bellman 起的。据他自传里的说法，当时主管经费的国防部长很反感“研究”“数学”这类词，于是他挑了 “dynamic”（这个词很难被用成贬义）和 “programming”（当时的意思是“制定计划、排日程”，和写程序无关）来包装自己的数学研究。所以 DP 里的 programming 指的是“规划”。`,
    c09: R`Policy iteration 由 Ronald Howard 在 1960 年的书《Dynamic Programming and Markov Processes》中系统提出。“评估 → 改进 → 再评估”这个循环后来成了几乎所有 RL control 算法的骨架（也就是第 11 章的 GPI）。`,
    c12: R`“Reinforcement（强化）”这个词来自动物学习心理学。Edward Thorndike 在 1898 年前后把猫关进“迷箱”：猫碰巧拉到机关就能出去吃到食物，之后它找到机关越来越快。他把这总结成“效果律”（Law of Effect）：带来好结果的行为会被加强。RL 就是把这条朴素的规律写成了算法。`,
    c13: R`名字来自老虎机的俗称 “one-armed bandit”（独臂强盗）：一根拉杆、专门吃你的钱。这个问题最早是 1933 年 William Thompson 为医学试验提出的（新药和旧药该给多少病人试）。统计学家 Peter Whittle 后来开玩笑说，二战时这个问题耗尽了盟军分析人员的精力，以至于有人建议把它空投到德国，当作“终极的智力破坏武器”。`,
    c14: R`UCB 的思想叫 “optimism in the face of uncertainty（面对不确定时保持乐观）”：没把握的选项先往好处想，去试了才知道。Lai 和 Robbins 在 1985 年证明了探索代价的理论下限，2002 年 Auer 等人给出了简单好用的 UCB1——也就是 W11 里 MCTS 用的那个 $c=\sqrt2$ 的公式。`,
    c15: R`1946 年，数学家 Stanislaw Ulam 生病休养时玩单人纸牌，想算“这局能赢的概率”，算不出来，就想到：不如多玩很多局，数一数赢了几次。他和 von Neumann 把这种“靠大量随机试验求数值”的方法用到了原子弹研制中的中子扩散计算上。同事 Nicholas Metropolis 用 Ulam 的叔叔常去赌钱的摩纳哥赌城 Monte Carlo 给它起了名字。`,
    c17: R`Temporal difference 由 Richard Sutton 在 1988 年的论文中正式提出，但最早的影子是 Arthur Samuel 1959 年的跳棋程序：它用“后面局面的评估”去修正“前面局面的评估”，自己跟自己下棋越下越强。Samuel 也被认为是 “machine learning（机器学习）”一词的提出者。`,
    c19: R`TD(λ) 最出名的一次亮相是 Gerald Tesauro 在 IBM 做的 TD-Gammon（1992 年）：一个神经网络只靠和自己下西洋双陆棋（backgammon）、用 TD(λ) 学习，就达到了接近世界冠军的水平。它下出的一些开局走法和人类专家的习惯不同，后来人类高手研究后也改变了这些开局的下法。`,
    c20: R`SARSA 这个名字就是它的更新要用到的五样东西：$S_t, A_t, R_{t+1}, S_{t+1}, A_{t+1}$——记住名字就记住了算法。它由 Rummery 和 Niranjan 在 1994 年提出，当时叫 “modified connectionist Q-learning”；SARSA 这个好记的名字是 Sutton 后来起的。`,
    c21: R`Q-learning 出自 Chris Watkins 1989 年在剑桥大学的博士论文《Learning from Delayed Rewards》，1992 年他和 Peter Dayan 证明了它在表格情形下会收敛到最优 Q。“Q”通常被解释为 quality：一个动作在某个状态下有多“好”。`,
    c25: R`DeepMind 在 2013 年用 DQN 直接从 Atari 游戏的屏幕像素学打游戏，2015 年在《Nature》上发表：同一个网络结构、同一套参数，学会了 49 个游戏，其中很多达到或超过人类水平。最出名的是《打砖块》（Breakout）：它自己学会先在一侧凿出一条通道，把球打到砖墙后面来回反弹。DQN 用的 experience replay 早在 1992 年就由 Long-Ji Lin 提出。`,
    c27: R`REINFORCE 是 Ronald Williams 1992 年起的名字，它本身就是一个缩写，拼出来正好是更新公式：**RE**ward **I**ncrement = **N**onnegative **F**actor × **O**ffset **R**einforcement × **C**haracteristic **E**ligibility。对应过来就是 $\Delta\theta=\alpha\times(G_t-b)\times\nabla\log\pi(a\mid s)$：非负的学习率 × 减去参照值后的回报 × score function。`,
    c28: R`Policy gradient theorem 由 Sutton、McAllester、Singh 和 Mansour 在 NIPS 1999（2000 年出版）发表。它的妙处在于：梯度里不需要对“状态分布怎么随 θ 变化”求导，所以不需要知道环境模型也能估计梯度。`,
    c30: R`回头看 REINFORCE 名字里的 “Offset Reinforcement”：offset 就是“减去一个参照值”，也就是本章的 baseline。Williams 在 1992 年提出 REINFORCE 时就已经把 baseline 写进了公式。`,
    c31: R`Actor-critic 最早出现在 Barto、Sutton 和 Anderson 1983 年的“倒立摆”（pole balancing，小车上立一根杆子不让它倒）实验里：一个模块负责选动作（当时叫 ASE），另一个模块负责评价好坏（叫 ACE，adaptive critic element）。“演员 + 评论家”的分工从那时一直沿用到今天。`,
    c32: R`在线搜索最著名的例子之一是 IBM 的 Deep Blue：1997 年它以 3.5 : 2.5 战胜国际象棋世界冠军卡斯帕罗夫。它不存“每个局面怎么走”的表，而是每一步现场搜索，每秒评估约两亿个局面。围棋的局面数大得多，这种暴力搜索行不通，这才有了 MCTS。`,
    c33: R`“Monte Carlo tree search”这个名字是法国研究者 Rémi Coulom 在 2006 年提出的，他的围棋程序 Crazy Stone 当年就拿下了计算机奥林匹克 9×9 围棋冠军。在 MCTS 出现之前，围棋程序长期只有业余水平；MCTS 让它们第一次有了明显进步，十年后才有了 AlphaGo。`,
    c34: R`UCT（Upper Confidence bounds applied to Trees）由匈牙利学者 Levente Kocsis 和 Csaba Szepesvári 在 2006 年提出，思路就是“把搜索树的每个节点都当成一个 multi-armed bandit”，直接借用了 bandit 问题里的 UCB1 公式。`,
    c36: R`有掷骰子的游戏天然就有 chance node：比如西洋双陆棋（backgammon），轮到你走之前先掷骰子，结果不由你决定，只能按概率取平均——这正是 Expectimax 的两种节点交替出现的样子。`,
    c37: R`2016 年 3 月 AlphaGo 对李世石的第 2 局，第 37 手下在五路“肩冲”，解说员一开始以为是失误。DeepMind 事后说，AlphaGo 估计人类棋手下出这一手的概率只有约万分之一，但它的搜索认为这步好——这正是“prior 低、但搜索价值推翻了它”的真实例子。第 4 局李世石的第 78 手被称为“神之一手”，那是 AlphaGo 在这次比赛中唯一输掉的一局。`,
    c38: R`AlphaGo Zero 从随机下棋开始，只靠自我对弈，三天后以 100 : 0 战胜了打败李世石的 AlphaGo Lee。AlphaZero 用同样的方法学国际象棋：按 2017 年的预印本，训练约 4 小时后估计棋力就超过了当时最强的程序之一 Stockfish 8（用了几千块 TPU），训练 9 小时后的正式 100 局对战是 28 胜 72 和 0 负。李世石在 2019 年宣布退役时说，AI 是一个“无法被打败的存在”。`
  };
})(window);
