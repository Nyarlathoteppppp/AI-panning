/* Week 11-1: Monte Carlo Tree Search on a (generative) grid MDP, Expectimax, and the AlphaGo-family formulas.
 * Tree layout: a decision node holds one state; each action edge keeps N(s,a), Q(s,a) and a map of
 * outcome children (one child per sampled next state), so a stochastic action can lead to several nodes. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};

  /** UCB score Q + c·sqrt(ln N(s) / N(s,a)); an untried action scores +Infinity (W11 p.12). */
  function ucb(q, n, nParent, c) {
    if (n === 0) return Infinity;
    return q + c * Math.sqrt(Math.log(nParent) / n);
  }
  /** PUCT score Q + c·P·sqrt(Σ_u N(s,u)) / (1 + N(s,b)) (W11 p.33). */
  function puct(q, n, prior, nSum, c) { return q + c * prior * Math.sqrt(nSum) / (1 + n); }
  /** Search policy from root visit counts: N^(1/τ) / Σ N^(1/τ) (W11 p.34). */
  function visitPolicy(counts, tau) {
    const m = Math.max(...counts);
    if (m === 0) return counts.map(() => 1 / counts.length);
    // divide by the max first so large counts with small τ do not overflow
    const w = counts.map(n => Math.pow(n / m, 1 / tau));
    const z = w.reduce((a, b) => a + b, 0);
    return w.map(x => x / z);
  }
  /** AlphaGo leaf evaluation V = (1−λ)·v_θ(s_L) + λ·z_rollout (W11 p.31). */
  function alphaGoLeaf(v, z, lambda) { return (1 - lambda) * v + lambda * z; }
  /** AlphaGo Zero loss for one position: (z−v)² − Σ π log p + β‖θ‖² (W11 p.34). */
  function alphaZeroLoss(z, v, pi, p, beta, thetaSq) {
    const ce = pi.reduce((t, x, i) => t - (x > 0 ? x * Math.log(p[i]) : 0), 0);
    return { value: (z - v) * (z - v), policy: ce, reg: (beta || 0) * (thetaSq || 0), total: (z - v) * (z - v) + ce + (beta || 0) * (thetaSq || 0) };
  }
  /** Incremental mean used in backpropagation: Q ← Q + (R − Q)/(N + 1), then N ← N + 1 (W11 p.14). */
  function incMean(q, n, R) { return { q: q + (R - q) / (n + 1), n: n + 1 }; }

  let NEXT_ID = 1;
  function makeNode(mdp, state, depth) {
    const edges = {};
    mdp.actions.forEach(a => { edges[a] = { a, N: 0, Q: 0, kids: new Map() }; });
    return { id: NEXT_ID++, state, N: 0, depth: depth || 0, terminal: mdp.isTerminal(state), edges };
  }
  function createTree(mdp, state) { return { root: makeNode(mdp, state, 0), iterations: 0 }; }
  const untried = (mdp, node) => mdp.actions.filter(a => node.edges[a].N === 0 && node.edges[a].kids.size === 0);

  /**
   * One MCTS iteration (selection, expansion, simulation, backpropagation). Returns a trace for display.
   * opts: { c (√2), gamma (mdp.gamma), horizon (60), rng, rollout: 'random' }
   */
  function iterate(mdp, tree, opts) {
    const c = opts.c == null ? Math.SQRT2 : opts.c, gamma = opts.gamma == null ? mdp.gamma : opts.gamma;
    const H = opts.horizon == null ? 60 : opts.horizon, rng = opts.rng;
    const trace = { selection: [], expansion: null, rollout: [], G: 0, backups: [] };
    const path = []; // {node, a, reward, child}
    let node = tree.root;
    // ---- selection (+ expansion when we fall off the tree)
    while (!node.terminal) {
      const fresh = untried(mdp, node);
      if (fresh.length) {
        const a = fresh[Math.floor(rng() * fresh.length)];
        const o = mdp.step(node.state, a, rng);
        const child = makeNode(mdp, o.next, node.depth + 1);
        node.edges[a].kids.set(o.next, child);
        path.push({ node, a, reward: o.reward, child });
        trace.expansion = { from: node.state, depth: node.depth, a, next: o.next, reward: o.reward, kind: o.kind, untried: fresh, newNode: child.id };
        node = child;
        break;
      }
      const scores = {};
      mdp.actions.forEach(x => { const e = node.edges[x]; scores[x] = { q: e.Q, n: e.N, ucb: ucb(e.Q, e.N, node.N, c) }; });
      let a = mdp.actions[0];
      mdp.actions.forEach(x => { if (scores[x].ucb > scores[a].ucb) a = x; });
      const o = mdp.step(node.state, a, rng);
      const edge = node.edges[a];
      let child = edge.kids.get(o.next), isNew = false;
      if (!child) { child = makeNode(mdp, o.next, node.depth + 1); edge.kids.set(o.next, child); isNew = true; }
      trace.selection.push({ state: node.state, nodeN: node.N, scores, a, next: o.next, reward: o.reward, kind: o.kind, newChild: isNew });
      path.push({ node, a, reward: o.reward, child });
      node = child;
      if (isNew) { trace.expansion = { from: path[path.length - 1].node.state, depth: path[path.length - 1].node.depth, a, next: o.next, reward: o.reward, kind: o.kind, untried: [], newNode: child.id, viaSample: true }; break; }
    }
    // ---- simulation (rollout with a uniformly random default policy)
    let G = 0, disc = 1, s = node.state;
    if (!node.terminal) {
      for (let k = 0; k < H; k++) {
        const a = mdp.actions[Math.floor(rng() * mdp.actions.length)];
        const o = mdp.step(s, a, rng);
        trace.rollout.push({ s, a, next: o.next, reward: o.reward });
        G += disc * o.reward; disc *= gamma; s = o.next;
        if (o.done) break;
      }
    }
    trace.G = G; trace.leaf = node.state; trace.leafTerminal = node.terminal;
    // ---- backpropagation: R accumulates the rewards on the way up, Q is an incremental mean
    node.N += 1;
    let R = G;
    for (let i = path.length - 1; i >= 0; i--) {
      const { node: nd, a, reward } = path[i], e = nd.edges[a];
      R = reward + gamma * R;
      const qOld = e.Q, nOld = e.N, m = incMean(e.Q, e.N, R);
      e.Q = m.q; e.N = m.n; nd.N += 1;
      trace.backups.push({ state: nd.state, depth: nd.depth, nodeId: nd.id, a, reward, R, qOld, nOld, qNew: e.Q, nNew: e.N });
    }
    tree.iterations += 1;
    return trace;
  }
  function search(mdp, tree, n, opts) { let last = null; for (let i = 0; i < n; i++) last = iterate(mdp, tree, opts); return last; }

  /** Root action: largest Q (W11 p.15) or most visits (AlphaGo, W11 p.31). Only tried actions count. */
  function bestAction(mdp, node, by) {
    const tried = mdp.actions.filter(a => node.edges[a].N > 0);
    if (!tried.length) return null;
    const key = by === 'visits' ? (a => node.edges[a].N) : (a => node.edges[a].Q);
    return tried.reduce((b, a) => key(a) > key(b) ? a : b, tried[0]);
  }
  /** Sum of root visit counts Σ_a N(s0,a). */
  const rootVisits = (mdp, node) => mdp.actions.reduce((t, a) => t + node.edges[a].N, 0);
  /** Move the root after acting: keep the matching subtree (reuse) or start a fresh tree. */
  function advance(mdp, tree, a, next, reuse) {
    const kid = tree.root.edges[a].kids.get(next);
    if (reuse && kid) { relevel(kid, 0); return { root: kid, iterations: 0, reused: true, carried: rootVisits(mdp, kid) }; }
    return { root: makeNode(mdp, next, 0), iterations: 0, reused: false, carried: 0 };
  }
  function relevel(node, d) { node.depth = d; Object.values(node.edges).forEach(e => e.kids.forEach(k => relevel(k, d + 1))); }
  /** Walk every node (pre-order). */
  function walk(node, fn) { fn(node); Object.values(node.edges).forEach(e => e.kids.forEach(k => walk(k, fn))); }
  /** Per-state statistics for the slide-style grid: root edges for the root state, otherwise
   * the visit-weighted merge of every node of that state in the tree. */
  function stateStats(mdp, tree) {
    const acc = {};
    walk(tree.root, nd => {
      if (nd.terminal || nd === tree.root) return;
      const t = acc[nd.state] = acc[nd.state] || {};
      mdp.actions.forEach(a => { const e = nd.edges[a]; if (!e.N) return; const x = t[a] = t[a] || { N: 0, sum: 0 }; x.N += e.N; x.sum += e.Q * e.N; });
    });
    const out = {};
    Object.keys(acc).forEach(s => { out[s] = {}; Object.entries(acc[s]).forEach(([a, x]) => { out[s][a] = { N: x.N, Q: x.sum / x.N }; }); });
    const r = {}; mdp.actions.forEach(a => { const e = tree.root.edges[a]; if (e.N) r[a] = { N: e.N, Q: e.Q }; });
    out[tree.root.state] = r;
    return out;
  }
  function countNodes(node) { let n = 0; walk(node, () => { n++; }); return n; }

  /**
   * Depth-limited Expectimax with the known model: decision nodes take max, chance nodes take the
   * probability-weighted average of r + γ·V(child). Leaves at depth 0 are valued 0 (W11 p.24–25).
   * Returns { V, Q:{a:q}, detail:{a:[{prob,next,reward,v,inner}]} }.
   */
  function expectimax(mdp, s, depth, gamma) {
    const g = gamma == null ? mdp.gamma : gamma, memo = new Map();
    function V(st, d) {
      if (d === 0 || mdp.isTerminal(st)) return 0;
      const key = st + '|' + d;
      if (memo.has(key)) return memo.get(key);
      const v = Math.max(...mdp.actions.map(a => Q(st, a, d)));
      memo.set(key, v); return v;
    }
    function Q(st, a, d) { return mdp.outcomes(st, a).reduce((t, o) => t + o.prob * (o.reward + g * V(o.next, d - 1)), 0); }
    const Qs = {}, detail = {};
    mdp.actions.forEach(a => {
      Qs[a] = mdp.isTerminal(s) || depth === 0 ? 0 : Q(s, a, depth);
      detail[a] = mdp.outcomes(s, a).map(o => { const v = V(o.next, depth - 1); return { prob: o.prob, next: o.next, reward: o.reward, from: o.from, v, inner: o.reward + g * v }; });
    });
    return { V: depth === 0 || mdp.isTerminal(s) ? 0 : Math.max(...Object.values(Qs)), Q: Qs, detail };
  }
  /** Number of leaves of a full Expectimax tree of the given depth (branching = actions × outcomes). */
  function expectimaxLeaves(mdp, s, depth) {
    if (depth === 0 || mdp.isTerminal(s)) return 1;
    return mdp.actions.reduce((t, a) => t + mdp.outcomes(s, a).reduce((u, o) => u + expectimaxLeaves(mdp, o.next, depth - 1), 0), 0);
  }

  RL.mcts = { ucb, puct, visitPolicy, alphaGoLeaf, alphaZeroLoss, incMean, createTree, iterate, search, bestAction, rootVisits,
    advance, walk, stateStats, countNodes, expectimax, expectimaxLeaves };
  if (typeof module !== 'undefined') module.exports = RL.mcts;
})(typeof window === 'undefined' ? globalThis : window);
