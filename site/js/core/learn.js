/* Model-free learning rules from Weeks 7-10, written as small pure functions so the
 * visualisers and the tests share exactly the same arithmetic. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};

  /* ---------- returns ---------- */
  /** G_t = R_{t+1} + γ R_{t+2} + ... for every t of an episode's reward list [R_1..R_T]. */
  function returnsBackward(rewards, gamma) {
    const G = new Array(rewards.length); let g = 0;
    for (let t = rewards.length - 1; t >= 0; t--) { g = rewards[t] + gamma * g; G[t] = g; }
    return G;
  }
  function discountedReturn(rewards, gamma) { return rewards.reduce((t, r, k) => t + Math.pow(gamma, k) * r, 0); }
  /** n-step return G_t^{(n)}; values[k] is the current estimate for the state reached after k steps. */
  function nStepReturn(rewards, gamma, n, bootstrapValue) {
    const T = rewards.length, m = Math.min(n, T);
    let g = 0;
    for (let k = 0; k < m; k++) g += Math.pow(gamma, k) * rewards[k];
    if (n < T) g += Math.pow(gamma, n) * bootstrapValue;
    return g;
  }
  /** Episodic λ-return weights for horizon T-t: (1-λ)λ^{n-1} for n<T-t, λ^{T-t-1} for the full return. */
  function lambdaWeights(lambda, remaining) {
    const w = [];
    for (let n = 1; n < remaining; n++) w.push((1 - lambda) * Math.pow(lambda, n - 1));
    w.push(Math.pow(lambda, remaining - 1));
    return w;
  }

  /* ---------- bandits (Week 7) ---------- */
  function argmaxRandom(values, u) {
    const best = Math.max(...values), ties = values.map((v, i) => [v, i]).filter(p => p[0] === best).map(p => p[1]);
    return ties[Math.min(ties.length - 1, Math.floor(u * ties.length))];
  }
  function softmax(values, tau) {
    const t = tau == null ? 1 : tau, top = Math.max(...values);
    const e = values.map(v => Math.exp((v - top) / t)), z = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / z);
  }
  /** Action probabilities of ε-greedy; ties for the best share the greedy mass. */
  function epsilonGreedyProbs(values, epsilon) {
    const k = values.length, best = Math.max(...values), ties = values.filter(v => v === best).length;
    return values.map(v => epsilon / k + (v === best ? (1 - epsilon) / ties : 0));
  }
  /**
   * Choose a bandit arm. state = {Q: [...], N: [...], t: plays so far (0-based)}.
   * Returns {arm, explored, probs?}.
   */
  function banditChoose(strategy, params, state, rng) {
    const k = state.Q.length, t = state.t;
    switch (strategy) {
      case 'epsilon-first': {
        if (t < params.epsilon * params.horizon) return { arm: Math.floor(rng() * k), explored: true };
        return { arm: argmaxRandom(state.Q, rng()), explored: false };
      }
      case 'epsilon-decreasing': {
        const eps = params.epsilon0 * Math.pow(params.alpha, t);
        if (rng() < eps) return { arm: Math.floor(rng() * k), explored: true, epsilon: eps };
        return { arm: argmaxRandom(state.Q, rng()), explored: false, epsilon: eps };
      }
      case 'ucb': {
        const untried = state.N.findIndex(n => n === 0);
        if (untried >= 0) return { arm: untried, explored: true, scores: null };
        const scores = state.Q.map((q, a) => q + params.c * Math.sqrt(Math.log(t + 1) / state.N[a]));
        const arm = argmaxRandom(scores, rng());
        return { arm, explored: arm !== argmaxRandom(state.Q, 0), scores };
      }
      case 'softmax': {
        const probs = softmax(state.Q, params.tau);
        const arm = RL.mdp.sampleIndex(probs, rng());
        return { arm, explored: arm !== argmaxRandom(state.Q, 0), probs };
      }
      default: { // epsilon-greedy
        if (rng() < params.epsilon) return { arm: Math.floor(rng() * k), explored: true };
        return { arm: argmaxRandom(state.Q, rng()), explored: false };
      }
    }
  }
  /** Incremental sample average: Q ← Q + (1/N)(R − Q). Mutates and returns the state. */
  function banditUpdate(state, arm, reward) {
    state.N[arm] += 1;
    const before = state.Q[arm];
    state.Q[arm] = before + (reward - before) / state.N[arm];
    state.t += 1;
    return { before, after: state.Q[arm], n: state.N[arm] };
  }
  function gaussian(rng) { // Box-Muller
    const u = Math.max(rng(), 1e-12), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- Monte Carlo prediction (Week 7, slide 25) ---------- */
  /**
   * Every-visit MC with sample-average step 1/N, processed backwards t = T-1..0.
   * episode: [{s, a, r}] where r is R_{t+1}. table: {key: {Q, N}}; keyOf(step) builds the key.
   * Returns the log of each update in processing order.
   */
  function mcUpdate(episode, table, gamma, keyOf) {
    const log = []; let G = 0;
    for (let t = episode.length - 1; t >= 0; t--) {
      const e = episode[t], key = keyOf(e);
      const cell = table[key] || (table[key] = { Q: 0, N: 0 });
      G = e.r + gamma * G;
      const before = cell.Q;
      cell.N += 1;
      cell.Q = before + (G - before) / cell.N;
      log.push({ t, key, G, before, after: cell.Q, N: cell.N, step: e });
    }
    return log;
  }

  /* ---------- TD-style updates (Week 8) ---------- */
  /** estimate ← estimate + α (target − estimate); returns every intermediate quantity. */
  function tdUpdate(estimate, target, alpha) {
    const error = target - estimate;
    return { estimate, target, error, alpha, after: estimate + alpha * error };
  }
  function sarsaTarget(r, gamma, qNext, done) { return done ? r : r + gamma * qNext; }
  function qLearningTarget(r, gamma, qNextRow, done) { return done ? r : r + gamma * Math.max(...qNextRow); }

  /* ---------- linear function approximation (Week 9) ---------- */
  function dot(w, x) { return w.reduce((t, wi, i) => t + wi * x[i], 0); }
  /** Semi-gradient step for a linear model: w ← w + α (Y − ŵ·x) x. */
  function linearUpdate(w, x, target, alpha) {
    const prediction = dot(w, x), error = target - prediction;
    const next = w.map((wi, i) => wi + alpha * error * x[i]);
    return { prediction, error, next, gradient: x.slice(), after: dot(next, x) };
  }

  /* ---------- policy gradient (Week 10) ---------- */
  /** Tabular REINFORCE step at one time t: h(S_t,b) += α γ^t G_t (1{b=A_t} − π(b|S_t)). */
  function reinforceTabular(h, action, G, alpha, gamma, t) {
    const pi = softmax(h, 1), grad = pi.map((p, b) => (b === action ? 1 : 0) - p);
    const scale = alpha * Math.pow(gamma, t) * G, delta = grad.map(g => scale * g);
    const next = h.map((v, b) => v + delta[b]);
    return { pi, grad, scale, delta, next, after: softmax(next, 1) };
  }
  /**
   * REINFORCE with a (learned) baseline, one-step episodes (W10-2 slides 25-31).
   * δ = G − b_old; h(s,j) += αδ[1{j=a} − π_old(j|s)]; b += βδ (beta = 0 keeps b fixed).
   */
  function reinforceBaseline(h, action, G, b, alpha, beta) {
    const step = reinforceTabular(h, action, G - b, alpha, 1, 0);
    return Object.assign(step, { advantage: G - b, b, bNext: b + (beta || 0) * (G - b) });
  }
  /**
   * One tabular TD actor-critic transition (W10-2 slide 38, continuing-task convention: no γ^t on the actor).
   * hRow: preferences of S_t; δ = r + γV(S_{t+1}) − V(S_t) with V(terminal) = 0; both updates use the old values.
   */
  function tdActorCritic(hRow, action, r, vS, vNext, terminal, alpha, beta, gamma) {
    const boot = terminal ? 0 : vNext, target = r + gamma * boot, delta = target - vS;
    const actor = reinforceTabular(hRow, action, delta, alpha, 1, 0);
    return { boot, target, delta, actor, vAfter: vS + beta * delta };
  }
  /** Linear softmax policy: ∇θ log π(a|s) = f(s,a) − Σ_b π(b|s) f(s,b). features: array over actions of vectors. */
  function linearPolicyGradient(theta, features, action) {
    const prefs = features.map(f => dot(theta, f)), pi = softmax(prefs, 1);
    const mean = theta.map((_, i) => features.reduce((t, f, b) => t + pi[b] * f[i], 0));
    return { prefs, pi, mean, grad: features[action].map((v, i) => v - mean[i]) };
  }

  RL.learn = { returnsBackward, discountedReturn, nStepReturn, lambdaWeights, argmaxRandom, softmax,
    epsilonGreedyProbs, banditChoose, banditUpdate, gaussian, mcUpdate, tdUpdate, sarsaTarget, qLearningTarget,
    dot, linearUpdate, reinforceTabular, reinforceBaseline, tdActorCritic, linearPolicyGradient };
  if (typeof module !== 'undefined') module.exports = RL.learn;
})(typeof window === 'undefined' ? globalThis : window);
