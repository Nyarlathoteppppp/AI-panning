/* Bilingual key terms: the exam is in English, so important terms are shown as “English（中文）”.
 * Applied to markdown source (math and code already protected) by RL.md.render:
 *   - “中文（English）” for a listed term is flipped to “English（中文）” everywhere;
 *   - inside a chapter (between begin() and end()), the first occurrence of a listed term that appears
 *     only in Chinese becomes “English（中文）”, and the first English-only occurrence gets “（中文）” appended.
 * Entries: [English, 中文, optional chapter filter]. Longer phrases are matched before the words they contain. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};
  const MCTS = /^c3[2-8]$/;
  const PLAN = /^a(0\d|1[01])$/;
  const LIST = [
    ['Markov Decision Process', '马尔可夫决策过程'], ['Markov property', '马尔可夫性质'],
    ['non-terminal state', '非终止状态'], ['state space', '状态空间'], ['action space', '动作空间'], ['next state', '下一状态'], ['state', '状态'], ['action', '动作'], ['reward', '奖励'], ['transition probability', '转移概率'],
    ['terminal state', '终止状态'], ['absorbing state', '吸收态'], ['trajectory', '轨迹'], ['episode', '回合'],
    ['discount factor', '折扣因子'], ['discounted return', '折扣回报'], ['expected return', '期望回报'], ['return', '回报'], ['discount', '折扣'],
    ['expectation', '期望'], ['deterministic', '确定性'], ['stochastic', '随机性'],
    ['policy', '策略'],
    ['state value function', '状态价值函数'], ['action value function', '动作价值函数'], ['value function', '价值函数'],
    ['state value', '状态价值'], ['action value', '动作价值'], ['optimal value', '最优价值'], ['value', '价值'],
    ['dynamic programming', '动态规划'], ['policy evaluation', '策略评估'], ['policy improvement', '策略改进'],
    ['policy iteration', '策略迭代'], ['value iteration', '价值迭代'], ['greedy', '贪心'], ['synchronous update', '同步更新'],
    ['system of linear equations', '线性方程组'],
    ['reinforcement learning', '强化学习'], ['model-based', '基于模型'], ['model-free', '无模型'],
    ['exploration', '探索'], ['exploitation', '利用'], ['multi-armed bandit', '多臂老虎机'],
    ['incremental average', '增量平均'], ['sample average', '样本平均'], ['learning rate', '学习率'], ['step size', '步长'],
    ['prediction', '预测'], ['on-policy', '同策略'], ['off-policy', '异策略'], ['behavior policy', '行为策略'], ['target policy', '目标策略'],
    ['bootstrapping', '自举'], ['bootstrap', '自举'], ['bias', '偏差'], ['variance', '方差'],
    ['temporal difference', '时序差分'], ['TD error', 'TD 误差'], ['TD target', 'TD 目标'], ['eligibility trace', '资格迹'],
    ['Monte Carlo', '蒙特卡洛'], ['first-visit', '首次访问'], ['every-visit', '每次访问'], ['temperature', '温度'],
    ['function approximation', '函数近似'], ['bias feature', '偏置特征'], ['feature', '特征'], ['weight', '权重', /^c2[3-5]$/],
    ['stochastic gradient descent', '随机梯度下降'], ['gradient descent', '梯度下降'], ['gradient ascent', '梯度上升'],
    ['semi-gradient', '半梯度'], ['gradient', '梯度'], ['generalisation', '泛化'], ['interference', '干扰'],
    ['neural network', '神经网络'], ['replay buffer', '经验回放缓冲区'], ['target network', '目标网络'],
    ['policy gradient', '策略梯度'], ['action preference', '动作偏好'], ['preference', '偏好'], ['score function', '得分函数'],
    ['baseline', '基线'], ['advantage', '优势'], ['actor', '行动者'], ['critic', '评论者'], ['saturation', '饱和'],
    ['Monte Carlo Tree Search', '蒙特卡洛树搜索'], ['search tree', '搜索树'], ['root node', '根节点'], ['leaf node', '叶节点'],
    ['child node', '子节点'], ['parent node', '父节点'], ['tree policy', '树策略'], ['rollout policy', '推演策略'], ['rollout', '推演'],
    ['selection', '选择', MCTS], ['expansion', '扩展', MCTS], ['simulation', '模拟', MCTS], ['backpropagation', '回传', MCTS],
    ['backpropagation', '反向传播'], ['simulator', '模拟器'], ['generative model', '生成式模型'], ['declarative model', '声明式模型'],
    ['online planning', '在线规划'], ['online', '在线'], ['offline', '离线'], ['anytime algorithm', '任意时间算法'], ['anytime', '任意时间'], ['subtree reuse', '子树复用'],
    ['decision node', '决策节点'], ['chance node', '机会节点'], ['prior', '先验'], ['value network', '价值网络'],
    ['policy network', '策略网络'], ['self-play', '自我对弈'], ['zero-sum', '零和'], ['perfect information', '完全信息'],
    ['latent state', '内部状态'],
    // W1–W5 classical planning (only inside chapters a01–a11)
    ['rational agent', '理性智能体', PLAN], ['control problem', '控制问题', PLAN], ['conformant planning', '一致性规划', PLAN], ['belief state', '信念状态', PLAN],
    ['closed-world assumption', '封闭世界假设', PLAN], ['precondition', '前提', PLAN], ['satisficing planning', '满足式规划', PLAN],
    ['optimal planning', '最优规划', PLAN], ['blind search', '盲目搜索', PLAN], ['heuristic search', '启发式搜索', PLAN], ['search node', '搜索节点', PLAN],
    ['open list', '开放列表', PLAN], ['closed list', '关闭列表', PLAN], ['completeness', '完备性', PLAN], ['optimality', '最优性', PLAN],
    ['branching factor', '分支因子', PLAN], ['breadth-first search', '广度优先搜索', PLAN], ['depth-first search', '深度优先搜索', PLAN],
    ['iterative deepening', '迭代加深', PLAN], ['uniform-cost search', '一致代价搜索', PLAN], ['progression', '前向搜索', PLAN], ['regression', '回归搜索', PLAN],
    ['novelty', '新颖度', PLAN], ['width', '宽度', PLAN], ['perfect heuristic', '完美启发式', PLAN], ['heuristic function', '启发式函数', PLAN],
    ['heuristic', '启发式', PLAN], ['goal-aware', '目标感知', PLAN], ['admissible', '可采纳', PLAN], ['consistent', '一致', PLAN], ['safe', '安全', PLAN],
    ['informedness', '信息量', PLAN], ['greedy best-first search', '贪心最佳优先搜索', PLAN], ['bounded suboptimal', '有界次优', PLAN],
    ['enforced hill-climbing', '强制爬山法', PLAN], ['hill-climbing', '爬山法', PLAN], ['local minimum', '局部最小值', PLAN], ['local minima', '局部极小值', PLAN],
    ['dead end', '死路', PLAN], ['delete relaxation', '删除松弛', PLAN], ['relaxed plan', '松弛计划', PLAN], ['relaxation', '松弛', PLAN], ['native', '原生', PLAN],
    ['efficiently constructible', '可高效构造', PLAN], ['efficiently computable', '可高效计算', PLAN], ['goal counting', '目标计数', PLAN],
    ['dominance', '支配', PLAN], ['best supporter', '最佳支持者', PLAN], ['support graph', '支持图', PLAN], ['well-founded', '良基', PLAN],
    ['helpful actions', '有益动作', PLAN], ['positive interactions', '正向交互', PLAN]
  ];
  // Chinese forms that are too common as ordinary words to annotate automatically (still flipped when written “中文（English）”).
  const NO_AUTO_ZH = new Set(['策略', '利用', '预测', '随机性', '确定性', '回合', '推演', '前提', '宽度', '启发式', '一致', '安全', '松弛', '原生', '支配']);
  // English forms never auto-annotated (none at the moment).
  const NO_AUTO_EN = new Set(['bias']);

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const items = LIST.map(([en, zh, ch]) => ({ en, zh, ch, key: en.toLowerCase() }));
  const enPat = en => esc(en).replace(/\\ /g, '\\s+').replace(/ /g, '\\s+');
  // One alternation, longest first; group per item so we know which matched.
  const alts = [];
  items.forEach((it, i) => { alts.push({ i, kind: 'zh', src: esc(it.zh), len: it.zh.length * 2 }); alts.push({ i, kind: 'en', src: '(?<![A-Za-z\\-][*_]{0,3})(?<![A-Za-z] )' + enPat(it.en) + '(?![*_]{0,3}[A-Za-z\\-])(?! [A-Za-z])', len: it.en.length }); });
  alts.sort((a, b) => b.len - a.len);
  const big = new RegExp(alts.map(a => '(' + a.src + ')').join('|'), 'gi');

  let ctx = null;
  function begin(chapterId) { ctx = { ch: chapterId, seen: new Set() }; }
  function end() { ctx = null; }

  /** The emphasis run right after a match, but only if it closes an emphasis opened earlier in the same paragraph. */
  function closingEmph(text, start, stop) {
    const run = (text.slice(stop).match(/^\*+/) || [''])[0];
    if (!run) return '';
    const para = text.slice(Math.max(0, text.lastIndexOf('\n\n', start)), start);
    return (para.split(run).length - 1) % 2 === 1 ? run : '';
  }
  function applyText(text) {
    let out = '', last = 0, m;
    big.lastIndex = 0;
    while ((m = big.exec(text))) {
      const gi = m.findIndex((x, k) => k > 0 && x !== undefined) - 1, a = alts[gi]; let it = items[a.i];
      const start = m.index, stop = start + m[0].length, after = text.slice(stop, stop + 60), before = text.slice(Math.max(0, start - 40), start);
      if (it.ch && !(ctx && it.ch.test(ctx.ch))) {
        // a chapter-restricted entry did not apply: fall back to an unrestricted entry with the same English (e.g. backpropagation → 反向传播)
        const alt = a.kind === 'en' ? items.find(x => x.key === it.key && !x.ch) : null;
        if (!alt) continue;
        it = alt;
      }
      const insideParen = (() => { const b = text.slice(Math.max(0, start - 80), start); return b.lastIndexOf('（') > b.lastIndexOf('）'); })();
      let rep = null, skip = 0;
      if (a.kind === 'zh') {
        const flip = after.match(new RegExp('^[（(]\\s*(' + enPat(it.en) + 's?)\\s*[）)]', 'i'));
        if (flip) { rep = flip[1] + '（' + it.zh + '）'; skip = flip[0].length; if (ctx) ctx.seen.add(it.key); }
        else if (new RegExp(enPat(it.en) + '\\S{0,3}\\s*（?$', 'i').test(before)) { if (ctx) ctx.seen.add(it.key); }
        else if (/[A-Za-z0-9）)]\s*（[^（）]*$/.test(before)) { if (ctx) ctx.seen.add(it.key); } // already a gloss inside “English（…）”
        else if (/^[*_]*\s*[（(]/.test(after)) { /* already followed by its own bracketed note: leave this occurrence, annotate a later one */ }
        else if (ctx && !ctx.seen.has(it.key) && !NO_AUTO_ZH.has(it.zh) && !insideParen) {
          const emph = closingEmph(text, start, stop); // put the gloss after a closing ** so the bold still closes before CJK text
          rep = (start > 0 && /[\u4e00-\u9fff]/.test(text[start - 1]) ? ' ' : '') + it.en + emph + '（' + it.zh + '）'; skip = emph.length; ctx.seen.add(it.key); // no space after ** so bold markers keep working
        }
      } else if (ctx) {
        const rest = after.replace(/^[*_]+/, ''); // look past markdown emphasis such as **term**（…）
        if (rest.startsWith('（') || rest.startsWith('(')) { if (rest.startsWith('（' + it.zh)) ctx.seen.add(it.key); }
        else if (rest.replace(/^\s+/, '').startsWith(it.zh)) ctx.seen.add(it.key); // “Deterministic 确定性”: Chinese already follows
        else if (!ctx.seen.has(it.key) && !NO_AUTO_EN.has(it.key) && !insideParen) { const emph = closingEmph(text, start, stop); rep = m[0] + emph + '（' + it.zh + '）'; skip = emph.length; ctx.seen.add(it.key); }
        else ctx.seen.add(it.key);
      }
      if (rep !== null) { out += text.slice(last, start) + rep; last = stop + skip; big.lastIndex = stop + skip; }
    }
    return out + text.slice(last);
  }
  /** Transform a markdown chunk, leaving HTML tags, inline code and link targets untouched. Math / callout placeholders (@@M0@@, @@C0@@) stay inside the text so bracket context is not lost; no term matches them. */
  function apply(src) {
    return src.split(/(<[^>]+>|`[^`]*`|\]\([^)]*\))/g).map((part, i) => (i % 2 ? part : applyText(part))).join('');
  }
  RL.terms = { begin, end, apply, LIST };
})(window);
