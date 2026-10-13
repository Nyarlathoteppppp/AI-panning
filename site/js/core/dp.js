/* Dynamic programming (model-based) computations from Week 6.
 * Value tables are plain objects keyed by state id. Terminal states keep value 0. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};

  function zeros(mdp) { const V = {}; mdp.states.forEach(s => { V[s] = 0; }); return V; }

  /** Q(s,a) = Σ_{s'} p(s'|s,a) [ r(s,a,s') + γ V(s') ], with every branch kept for display. */
  function backupDetail(mdp, V, s, a, gamma) {
    const g = gamma == null ? mdp.gamma : gamma;
    const terms = mdp.branches(s, a).map(b => {
      const vNext = mdp.isTerminal(b.next) ? 0 : V[b.next];
      const inner = b.reward + g * vNext;
      return Object.assign({}, b, { vNext, inner, contribution: b.prob * inner });
    });
    return { s, a, gamma: g, terms, q: terms.reduce((t, x) => t + x.contribution, 0) };
  }
  function qValue(mdp, V, s, a, gamma) { return backupDetail(mdp, V, s, a, gamma).q; }
  function qTable(mdp, V, gamma) {
    const Q = {};
    mdp.states.forEach(s => { Q[s] = {}; mdp.actions.forEach(a => { Q[s][a] = mdp.isTerminal(s) ? 0 : qValue(mdp, V, s, a, gamma); }); });
    return Q;
  }
  /** Greedy actions with a numerical tolerance for ties. */
  function argmaxActions(qs, tol) {
    const t = tol == null ? 1e-9 : tol, entries = Object.entries(qs);
    const best = Math.max(...entries.map(e => e[1]));
    return entries.filter(e => e[1] >= best - t).map(e => e[0]);
  }

  /** One synchronous Bellman optimality sweep: V_t(s) = max_a Q_t(s,a), Q_t uses V_{t-1}. */
  function valueIterationSweep(mdp, V, gamma) {
    const Q = qTable(mdp, V, gamma), next = {};
    let delta = 0;
    mdp.states.forEach(s => {
      next[s] = mdp.isTerminal(s) ? 0 : Math.max(...mdp.actions.map(a => Q[s][a]));
      delta = Math.max(delta, Math.abs(next[s] - V[s]));
    });
    return { V: next, Q, delta };
  }

  /** Expected value of a (possibly stochastic) policy given as {s: {a: prob}}. */
  function policyProbs(mdp, policy, s) {
    const p = policy[s];
    if (typeof p === 'string') { const o = {}; mdp.actions.forEach(a => { o[a] = a === p ? 1 : 0; }); return o; }
    return p;
  }
  /** One sweep of iterative policy evaluation (Bellman expectation equation). */
  function policyEvaluationSweep(mdp, V, policy, gamma) {
    const next = {};
    let delta = 0;
    mdp.states.forEach(s => {
      if (mdp.isTerminal(s)) { next[s] = 0; return; }
      const probs = policyProbs(mdp, policy, s);
      next[s] = mdp.actions.reduce((t, a) => t + (probs[a] || 0) * qValue(mdp, V, s, a, gamma), 0);
      delta = Math.max(delta, Math.abs(next[s] - V[s]));
    });
    return { V: next, delta };
  }

  /** Exact policy evaluation: solve (I - γ P_π) v = r_π with Gaussian elimination. */
  function policyEvaluationExact(mdp, policy, gamma) {
    const g = gamma == null ? mdp.gamma : gamma;
    const S = mdp.nonTerminal, idx = {}; S.forEach((s, i) => { idx[s] = i; });
    const n = S.length, A = S.map(() => new Array(n + 1).fill(0));
    S.forEach((s, i) => {
      A[i][i] += 1;
      const probs = policyProbs(mdp, policy, s);
      mdp.actions.forEach(a => {
        const pa = probs[a] || 0;
        if (!pa) return;
        mdp.branches(s, a).forEach(b => {
          A[i][n] += pa * b.prob * b.reward;
          if (!mdp.isTerminal(b.next)) A[i][idx[b.next]] -= g * pa * b.prob;
        });
      });
    });
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k];
      }
    }
    const V = zeros(mdp);
    S.forEach((s, i) => { V[s] = A[i][n] / A[i][i]; });
    return V;
  }

  /** Greedy improvement. Keeps the old action on ties so PI terminates. */
  function improvePolicy(mdp, V, oldPolicy, gamma) {
    const Q = qTable(mdp, V, gamma), policy = {}, changed = [];
    mdp.nonTerminal.forEach(s => {
      const best = argmaxActions(Q[s], 1e-10);
      const old = oldPolicy && oldPolicy[s];
      policy[s] = best.includes(old) ? old : best[0];
      if (old && policy[s] !== old) changed.push(s);
    });
    return { policy, Q, changed, stable: changed.length === 0 };
  }

  function greedyPolicy(mdp, V, gamma) { return improvePolicy(mdp, V, null, gamma).policy; }

  RL.dp = { zeros, backupDetail, qValue, qTable, argmaxActions, valueIterationSweep, policyEvaluationSweep,
    policyEvaluationExact, improvePolicy, greedyPolicy, policyProbs };
  if (typeof module !== 'undefined') module.exports = RL.dp;
})(typeof window === 'undefined' ? globalThis : window);
