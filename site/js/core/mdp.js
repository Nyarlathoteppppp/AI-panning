/* Grid MDPs used throughout the course.
 * State numbering follows the lecture slides: s1 is the bottom-left start cell,
 * numbering runs left-to-right, bottom-to-top, and skips walls.
 * Coordinates are (x, y) with (0, 0) at the bottom-left corner. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};

  const ACTIONS = ['N', 'E', 'S', 'W'];
  const ACTION_NAMES = { N: 'North / Up', E: 'East / Right', S: 'South / Down', W: 'West / Left' };
  const ARROWS = { N: '↑', E: '→', S: '↓', W: '←' };
  const DELTA = { N: [0, 1], E: [1, 0], S: [0, -1], W: [-1, 0] };
  // Slipping "left" or "right" is relative to the intended direction.
  const LEFT_OF = { N: 'W', E: 'N', S: 'E', W: 'S' };
  const RIGHT_OF = { N: 'E', E: 'S', S: 'W', W: 'N' };

  /**
   * Build a grid MDP.
   * cfg: { width, height, walls: [[x,y]], terminals: {"x,y": reward}, start: [x,y],
   *        success: 0.8, gamma: 0.9, stepReward: 0, names: optional }
   * Rewards are paid on ENTERING a terminal cell (r(s,a,s')), as in the slides.
   */
  function createGrid(cfg) {
    const width = cfg.width, height = cfg.height;
    const success = cfg.success == null ? 0.8 : cfg.success;
    const wallSet = new Set((cfg.walls || []).map(([x, y]) => x + ',' + y));
    const terminalReward = cfg.terminals || {};
    const stepReward = cfg.stepReward || 0;
    const states = [], coordOf = {}, idAt = {};
    let n = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (wallSet.has(x + ',' + y)) continue;
      n += 1;
      states.push(n); coordOf[n] = [x, y]; idAt[x + ',' + y] = n;
    }
    const terminal = new Set(states.filter(s => (coordOf[s].join(',') in terminalReward)));
    const start = cfg.start ? idAt[cfg.start.join(',')] : states[0];

    function moveFrom(s, dir) {
      const [x, y] = coordOf[s], [dx, dy] = DELTA[dir];
      const key = (x + dx) + ',' + (y + dy);
      return idAt[key] || s; // boundary or wall: stay in place
    }
    function rewardFor(s, next) {
      if (!terminal.has(s) && terminal.has(next)) return terminalReward[coordOf[next].join(',')] + stepReward;
      return stepReward;
    }
    /** The three movement attempts for (s, a), before merging equal successors. */
    function branches(s, a) {
      if (terminal.has(s)) return [];
      const slip = (1 - success) / 2;
      const list = [
        { kind: 'intended', dir: a, prob: success },
        { kind: 'slip left', dir: LEFT_OF[a], prob: slip },
        { kind: 'slip right', dir: RIGHT_OF[a], prob: slip }
      ].filter(b => b.prob > 0);
      return list.map(b => {
        const next = moveFrom(s, b.dir);
        return Object.assign(b, { next, reward: rewardFor(s, next), blocked: next === s });
      });
    }
    /** Joint dynamics p(s', r | s, a): branches with the same (s', r) are merged. */
    function outcomes(s, a) {
      const merged = new Map();
      for (const b of branches(s, a)) {
        const key = b.next + '|' + b.reward;
        const m = merged.get(key) || { next: b.next, reward: b.reward, prob: 0, from: [] };
        m.prob += b.prob; m.from.push(b.kind); merged.set(key, m);
      }
      return [...merged.values()];
    }
    function prob(s, a, next) { return outcomes(s, a).filter(o => o.next === next).reduce((t, o) => t + o.prob, 0); }
    /** Generative access: sample one (s', r). */
    function step(s, a, rng) {
      const bs = branches(s, a), u = rng();
      let acc = 0;
      for (const b of bs) { acc += b.prob; if (u < acc) return { next: b.next, reward: b.reward, kind: b.kind, done: terminal.has(b.next) }; }
      const b = bs[bs.length - 1];
      return { next: b.next, reward: b.reward, kind: b.kind, done: terminal.has(b.next) };
    }
    return {
      width, height, states, terminal, start, coordOf, idAt, wallSet, success,
      gamma: cfg.gamma == null ? 0.9 : cfg.gamma, actions: ACTIONS.slice(),
      nonTerminal: states.filter(s => !terminal.has(s)),
      isTerminal: s => terminal.has(s), terminalReward: s => terminalReward[coordOf[s].join(',')] || 0, branches, outcomes, prob, step, rewardFor, moveFrom,
      label: s => (cfg.names && cfg.names[s]) || ('s' + s)
    };
  }

  /** The 4x3 Gridworld from Week 6 (used in Weeks 6-10). */
  function courseGrid(opts) {
    return createGrid(Object.assign({
      width: 4, height: 3, walls: [[1, 1]],
      terminals: { '3,2': 1, '3,1': -1 }, start: [0, 0], success: 0.8, gamma: 0.9
    }, opts || {}));
  }

  /** Seeded pseudo-random generator so experiments are reproducible. */
  function rng(seed) {
    let t = (seed == null ? 20260 : seed) >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sampleIndex(probs, u) {
    let acc = 0;
    for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (u < acc) return i; }
    return probs.length - 1;
  }

  RL.mdp = { ACTIONS, ACTION_NAMES, ARROWS, LEFT_OF, RIGHT_OF, createGrid, courseGrid, rng, sampleIndex };
  if (typeof module !== 'undefined') module.exports = RL.mdp;
})(typeof window === 'undefined' ? globalThis : window);
