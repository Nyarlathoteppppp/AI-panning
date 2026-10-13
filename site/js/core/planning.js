/* Weeks 1–5 (classical planning): graph search with traces, heuristic properties, STRIPS delete-relaxation
 * heuristics (h_max, h_add, h_FF, exact h+ and h*), and width-based search (novelty, IW(k)).
 * Conventions follow the lecture pseudo-code: duplicates are detected when a node is popped
 * (closed list), the goal test happens when a node is expanded, and A* / weighted A* re-open a
 * state if it is reached again with a smaller g. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};

  /* ------------------------------------------------------------ graphs */
  /** graph: { nodes: { id: { h } }, edges: [[u, v, cost]], start, goals: [ids], undirected? } */
  function succ(graph, u) {
    const out = [];
    graph.edges.forEach(([a, b, c]) => {
      if (a === u) out.push({ to: b, cost: c == null ? 1 : c });
      else if (graph.undirected && b === u) out.push({ to: a, cost: c == null ? 1 : c });
    });
    return out.sort((x, y) => (x.to < y.to ? -1 : x.to > y.to ? 1 : 0)); // alphabetical generation order
  }
  const hOf = (graph, s) => (graph.nodes[s] && graph.nodes[s].h != null ? graph.nodes[s].h : 0);
  const isGoal = (graph, s) => graph.goals.includes(s);

  /**
   * Best-first family (BrFS, DFS, UCS, GBFS, A*, WA*). opts: { tie: 'fifo' | 'alpha', w: weight for WA*, limit }.
   * Returns { trace: [{ pop, g, f, skipped, reopened, generated, open, closed }], expanded: [ids], path, cost, found }.
   */
  function bestFirst(graph, algo, opts) {
    opts = opts || {};
    const W = opts.w == null ? 2 : opts.w, tie = opts.tie || 'fifo';
    const prio = (g, h) => ({ bfs: 0, dfs: 0, ucs: g, gbfs: h, astar: g + h, wastar: g + W * h }[algo]);
    let counter = 0;
    const open = [], closed = new Set(), bestG = {}, trace = [], expanded = [];
    const push = (node) => { node.seq = counter++; open.push(node); };
    const pick = () => {
      // BrFS: first in (FIFO); DFS: last in (LIFO); others: smallest priority, ties by insertion order or name
      if (algo === 'bfs') return open.shift();
      if (algo === 'dfs') return open.pop();
      let bi = 0;
      for (let i = 1; i < open.length; i++) {
        const a = open[i], b = open[bi];
        if (a.p < b.p - 1e-12) bi = i;
        else if (Math.abs(a.p - b.p) <= 1e-12) {
          if (algo === 'astar' && opts.tieH && a.h !== b.h) { if (a.h < b.h) bi = i; continue; }
          if (tie === 'alpha' ? a.s < b.s || (a.s === b.s && a.seq < b.seq) : a.seq < b.seq) bi = i;
        }
      }
      return open.splice(bi, 1)[0];
    };
    const snap = () => open.map(n => ({ s: n.s, g: n.g, h: n.h, p: n.p }));
    const h0 = hOf(graph, graph.start);
    if (h0 !== Infinity) push({ s: graph.start, g: 0, h: h0, p: prio(0, h0), parent: null });
    const limit = opts.limit || 500;
    while (open.length && trace.length < limit) {
      const n = pick();
      const reopen = (algo === 'astar' || algo === 'wastar') && closed.has(n.s) && n.g < bestG[n.s];
      if (closed.has(n.s) && !reopen) { trace.push({ pop: n.s, g: n.g, f: n.p, skipped: true, open: snap(), closed: [...closed] }); continue; }
      closed.add(n.s); bestG[n.s] = n.g; expanded.push(n.s);
      if (isGoal(graph, n.s)) {
        const path = []; for (let x = n; x; x = x.parent) path.unshift(x.s);
        trace.push({ pop: n.s, g: n.g, f: n.p, goal: true, reopened: reopen, open: snap(), closed: [...closed] });
        return { trace, expanded, path, cost: n.g, found: true };
      }
      let kids = succ(graph, n.s);
      if (algo === 'dfs') kids = kids.slice().reverse(); // so that the alphabetically first child is popped first
      const generated = [];
      kids.forEach(k => {
        const h = hOf(graph, k.to);
        if (h === Infinity) return;
        const g = n.g + k.cost;
        push({ s: k.to, g, h, p: prio(g, h), parent: n });
        generated.push(k.to);
      });
      trace.push({ pop: n.s, g: n.g, f: n.p, reopened: reopen, generated, open: snap(), closed: [...closed] });
    }
    return { trace, expanded, path: null, cost: Infinity, found: false };
  }

  /** Iterative deepening: depth-limited DFS (tree search with a cycle check on the current path) for L = 0, 1, 2, … */
  function iterativeDeepening(graph, maxL) {
    const rounds = [];
    for (let L = 0; L <= (maxL == null ? 10 : maxL); L++) {
      const order = []; let found = null;
      const dls = (s, depth, path, g) => {
        order.push(s);
        if (isGoal(graph, s)) { found = { path: path.concat(s), cost: g }; return true; }
        if (depth === L) return false;
        for (const k of succ(graph, s)) {
          if (path.includes(k.to) || k.to === s) continue;
          if (dls(k.to, depth + 1, path.concat(s), g + k.cost)) return true;
        }
        return false;
      };
      dls(graph.start, 0, [], 0);
      rounds.push({ L, order, found });
      if (found) return { rounds, path: found.path, cost: found.cost, found: true };
    }
    return { rounds, path: null, found: false };
  }

  /** Hill-climbing: move to a successor with minimal h (ties alphabetical); stops at a goal or after `limit` steps. */
  function hillClimbing(graph, limit) {
    let s = graph.start, g = 0; const path = [s], trace = [];
    for (let i = 0; i < (limit || 20); i++) {
      if (isGoal(graph, s)) return { path, cost: g, found: true, trace };
      const kids = succ(graph, s);
      if (!kids.length) { trace.push({ at: s, stuck: true }); return { path, found: false, trace, reason: '没有后继' }; }
      let best = kids[0];
      kids.forEach(k => { if (hOf(graph, k.to) < hOf(graph, best.to)) best = k; });
      trace.push({ at: s, options: kids.map(k => ({ s: k.to, h: hOf(graph, k.to) })), to: best.to });
      g += best.cost; s = best.to; path.push(s);
    }
    return { path, found: isGoal(graph, s), cost: g, trace, reason: isGoal(graph, s) ? null : '达到步数上限（可能在局部最小值附近来回）' };
  }

  /** Enforced hill-climbing: repeatedly breadth-first search for a state with strictly smaller h. */
  function enforcedHillClimbing(graph) {
    let cur = { s: graph.start, g: 0, path: [graph.start] }; const phases = [];
    let guard = 0;
    while (!isGoal(graph, cur.s) && guard++ < 50) {
      const h0 = hOf(graph, cur.s), queue = [cur], closed = new Set(), order = []; let better = null;
      while (queue.length) {
        const n = queue.shift();
        if (closed.has(n.s)) continue;
        closed.add(n.s); order.push(n.s);
        if (hOf(graph, n.s) < h0) { better = n; break; }
        succ(graph, n.s).forEach(k => queue.push({ s: k.to, g: n.g + k.cost, path: n.path.concat(k.to) }));
      }
      phases.push({ from: cur.s, h0, order, to: better && better.s });
      if (!better) return { phases, found: false, path: cur.path };
      cur = better;
    }
    return { phases, found: isGoal(graph, cur.s), path: cur.path, cost: cur.g };
  }

  /** Perfect heuristic h*(s): cheapest cost from s to any goal (Dijkstra on the reversed graph). */
  function hStar(graph) {
    const dist = {}; Object.keys(graph.nodes).forEach(s => { dist[s] = Infinity; });
    const pq = graph.goals.map(gl => [0, gl]); graph.goals.forEach(gl => { dist[gl] = 0; });
    const pred = s => {
      const out = [];
      graph.edges.forEach(([a, b, c]) => { const cost = c == null ? 1 : c; if (b === s) out.push([a, cost]); if (graph.undirected && a === s) out.push([b, cost]); });
      return out;
    };
    while (pq.length) {
      pq.sort((x, y) => x[0] - y[0]);
      const [d, s] = pq.shift();
      if (d > dist[s]) continue;
      pred(s).forEach(([p, c]) => { if (d + c < dist[p]) { dist[p] = d + c; pq.push([d + c, p]); } });
    }
    return dist;
  }
  /** Check safe / goal-aware / admissible / consistent; returns flags plus the violating states / edges. */
  function heuristicProperties(graph) {
    const hs = hStar(graph), states = Object.keys(graph.nodes), viol = { safe: [], goalAware: [], admissible: [], consistent: [] };
    states.forEach(s => {
      const h = hOf(graph, s);
      if (h === Infinity && hs[s] !== Infinity) viol.safe.push(s);
      if (isGoal(graph, s) && h !== 0) viol.goalAware.push(s);
      if (h > hs[s] + 1e-12) viol.admissible.push(s);
    });
    graph.edges.forEach(([a, b, c]) => {
      const cost = c == null ? 1 : c, check = (u, v) => { if (hOf(graph, u) > cost + hOf(graph, v) + 1e-12) viol.consistent.push(u + '→' + v); };
      check(a, b); if (graph.undirected) check(b, a);
    });
    return { hStar: hs, safe: !viol.safe.length, goalAware: !viol.goalAware.length, admissible: !viol.admissible.length, consistent: !viol.consistent.length, viol };
  }

  /* ------------------------------------------------------------ STRIPS */
  /** problem: { facts: [...], actions: [{ name, pre: [], add: [], del: [], cost }], init: [], goal: [] } */
  const cost = a => (a.cost == null ? 1 : a.cost);
  const holds = (set, facts) => facts.every(f => set.has(f));
  const key = set => [...set].sort().join(',');

  /**
   * Bellman-Ford tables for h_max / h_add (lecture W5 p.25): T_0(g) = 0 if g ∈ s else ∞;
   * T_{i+1}(g) = min(T_i(g), min_{a: g ∈ add_a} c(a) + C_i(pre_a)), with C_i = sum (add) or max (max) over the set.
   */
  function bellmanFord(problem, state, mode) {
    const comb = mode === 'max' ? (vals => (vals.length ? Math.max(...vals) : 0)) : (vals => vals.reduce((t, v) => t + v, 0));
    const s = new Set(state || problem.init);
    let T = {}; problem.facts.forEach(f => { T[f] = s.has(f) ? 0 : Infinity; });
    const tables = [Object.assign({}, T)];
    for (let it = 0; it < 100; it++) {
      const next = {};
      problem.facts.forEach(f => {
        let v = T[f];
        problem.actions.forEach(a => { if (a.add.includes(f)) v = Math.min(v, cost(a) + comb(a.pre.map(p => T[p]))); });
        next[f] = v;
      });
      tables.push(next);
      if (problem.facts.every(f => next[f] === T[f])) break;
      T = next;
    }
    const final = tables[tables.length - 1];
    return { tables, values: final, h: comb(problem.goal.map(g => final[g])) };
  }
  /** Best supporter of each fact: argmin over achievers of c(a) + C(pre_a) (first in action order on ties). */
  function bestSupporters(problem, values, mode, state) {
    const comb = mode === 'max' ? (vals => (vals.length ? Math.max(...vals) : 0)) : (vals => vals.reduce((t, v) => t + v, 0));
    const s = new Set(state || problem.init), bs = {};
    problem.facts.forEach(f => {
      if (s.has(f) || values[f] === Infinity) return;
      let best = null, bv = Infinity;
      problem.actions.forEach(a => { if (a.add.includes(f)) { const v = cost(a) + comb(a.pre.map(p => values[p])); if (v < bv - 1e-12) { bv = v; best = a; } } });
      if (best) bs[f] = best.name;
    });
    return bs;
  }
  /** Relaxed plan extraction (W5 p.33): Open := G \ s; repeatedly close a sub-goal and add its best supporter. */
  function relaxedPlan(problem, bs, state) {
    const s = new Set(state || problem.init), byName = {}; problem.actions.forEach(a => { byName[a.name] = a; });
    const open = problem.goal.filter(g => !s.has(g)), closed = new Set(), plan = [], steps = [];
    while (open.length) {
      const g = open.shift(); closed.add(g);
      const a = byName[bs[g]];
      if (!a) return { plan, steps, h: Infinity };
      const added = [];
      if (!plan.includes(a.name)) plan.push(a.name);
      a.pre.forEach(p => { if (!s.has(p) && !closed.has(p) && !open.includes(p)) { open.push(p); added.push(p); } });
      steps.push({ goal: g, action: a.name, newOpen: added, open: open.slice() });
    }
    return { plan, steps, h: plan.reduce((t, n) => t + cost(byName[n]), 0) };
  }
  function hFF(problem, mode, state) {
    const bf = bellmanFord(problem, state, mode);
    if (bf.h === Infinity) return { h: Infinity, plan: [], bf };
    const bs = bestSupporters(problem, bf.values, mode, state), rp = relaxedPlan(problem, bs, state);
    return Object.assign({ bs, bf }, rp);
  }
  /** Uniform-cost search over the real (relaxed = false) or delete-relaxed (relaxed = true) state space. */
  function optimalCost(problem, relaxed, state) {
    const start = new Set(state || problem.init), best = new Map([[key(start), 0]]), pq = [[0, start, []]];
    while (pq.length) {
      pq.sort((x, y) => x[0] - y[0]);
      const [g, s, plan] = pq.shift();
      if (g > best.get(key(s))) continue;
      if (holds(s, problem.goal)) return { cost: g, plan };
      problem.actions.forEach(a => {
        if (!holds(s, a.pre)) return;
        const n = new Set(s);
        if (!relaxed) a.del.forEach(f => n.delete(f));
        a.add.forEach(f => n.add(f));
        if (relaxed && n.size === s.size) return; // in the relaxation an action that adds nothing new is useless
        const k = key(n), ng = g + cost(a);
        if (!best.has(k) || ng < best.get(k)) { best.set(k, ng); pq.push([ng, n, plan.concat(a.name)]); }
      });
    }
    return { cost: Infinity, plan: null };
  }
  const goalCount = (problem, state) => problem.goal.filter(g => !new Set(state || problem.init).has(g)).length;

  /* ------------------------------------------------------------ width-based search */
  /** Novelty of a state (set of atoms) w.r.t. the tuples seen so far, for tuple sizes up to kMax. */
  function noveltyOf(atoms, seen, kMax) {
    const sorted = [...atoms].sort();
    for (let k = 1; k <= kMax; k++) {
      const tuples = combos(sorted, k);
      if (tuples.some(t => !seen.has(t.join('&')))) return k;
    }
    return kMax + 1;
  }
  function combos(arr, k) {
    const out = [];
    const rec = (start, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); } };
    rec(0, []); return out;
  }
  function markSeen(atoms, seen, kMax) { const sorted = [...atoms].sort(); for (let k = 1; k <= kMax; k++) combos(sorted, k).forEach(t => seen.add(t.join('&'))); }
  /**
   * IW(k): breadth-first search that prunes generated states with novelty > k.
   * space: { start: atoms[], succ(atoms) -> [{ action, atoms }], isGoal(atoms), label(atoms) }.
   */
  function iw(space, k) {
    const seen = new Set(), trace = [];
    markSeen(space.start, seen, k);
    const queue = [{ atoms: space.start, path: [] }], visited = new Set([key(new Set(space.start))]);
    while (queue.length) {
      const n = queue.shift();
      if (space.isGoal(n.atoms)) return { found: true, path: n.path, trace };
      space.succ(n.atoms).forEach(c => {
        const kk = key(new Set(c.atoms));
        if (visited.has(kk)) { trace.push({ from: space.label(n.atoms), to: space.label(c.atoms), action: c.action, novelty: null, pruned: true, duplicate: true }); return; }
        const nov = noveltyOf(c.atoms, seen, k);
        const pruned = nov > k;
        trace.push({ from: space.label(n.atoms), to: space.label(c.atoms), action: c.action, novelty: nov, pruned });
        if (!pruned) { markSeen(c.atoms, seen, k); visited.add(kk); queue.push({ atoms: c.atoms, path: n.path.concat(c.action) }); }
      });
    }
    return { found: false, trace };
  }
  /** Toy factored grid (W2 quiz): state = { row(r), col(c) }, 4-neighbour moves, optional blocked cells. */
  function gridSpace(rows, cols, start, goal, blocked) {
    const bad = new Set((blocked || []).map(([r, c]) => r + ',' + c));
    const atoms = (r, c) => ['row' + r, 'col' + c];
    const parse = a => [+a.find(x => x.startsWith('row')).slice(3), +a.find(x => x.startsWith('col')).slice(3)];
    return {
      start: atoms(start[0], start[1]),
      isGoal: a => { const [r, c] = parse(a); return r === goal[0] && c === goal[1]; },
      label: a => { const [r, c] = parse(a); return '(' + r + ',' + c + ')'; },
      succ: a => {
        const [r, c] = parse(a), out = [];
        [['上', -1, 0], ['下', 1, 0], ['左', 0, -1], ['右', 0, 1]].forEach(([n, dr, dc]) => {
          const R = r + dr, C = c + dc;
          if (R >= 0 && R < rows && C >= 0 && C < cols && !bad.has(R + ',' + C)) out.push({ action: n, atoms: atoms(R, C) });
        });
        return out;
      }
    };
  }

  /* ------------------------------------------------------------ examples from the lectures */
  const drive = (x, y, c) => [{ name: 'drive(' + x + ',' + y + ')', pre: ['at(' + x + ')'], add: ['at(' + y + ')', 'v(' + y + ')'], del: ['at(' + x + ')'], cost: c },
    { name: 'drive(' + y + ',' + x + ')', pre: ['at(' + y + ')'], add: ['at(' + x + ')', 'v(' + x + ')'], del: ['at(' + y + ')'], cost: c }];
  const CITIES = ['Sy', 'Ad', 'Br', 'Pe', 'Da'];
  /** “TSP” in Australia (W4 p.9, W5 p.14, 26–27). */
  const AUSTRALIA = {
    facts: CITIES.map(c => 'at(' + c + ')').concat(CITIES.map(c => 'v(' + c + ')')),
    actions: [].concat(drive('Sy', 'Br', 1), drive('Sy', 'Ad', 1.5), drive('Ad', 'Pe', 3.5), drive('Ad', 'Da', 4)),
    init: ['at(Sy)', 'v(Sy)'],
    goal: ['at(Sy)'].concat(CITIES.map(c => 'v(' + c + ')'))
  };
  /** “Logistics” (W5 p.28–34): truck on the line A–B–C–D, package at C; dr / lo / ul all cost 1. */
  function logistics(goal) {
    const L = ['A', 'B', 'C', 'D'], acts = [];
    for (let i = 0; i < 3; i++) {
      acts.push({ name: 'dr(' + L[i] + ',' + L[i + 1] + ')', pre: ['t(' + L[i] + ')'], add: ['t(' + L[i + 1] + ')'], del: ['t(' + L[i] + ')'], cost: 1 });
      acts.push({ name: 'dr(' + L[i + 1] + ',' + L[i] + ')', pre: ['t(' + L[i + 1] + ')'], add: ['t(' + L[i] + ')'], del: ['t(' + L[i + 1] + ')'], cost: 1 });
    }
    L.forEach(x => {
      acts.push({ name: 'lo(' + x + ')', pre: ['t(' + x + ')', 'p(' + x + ')'], add: ['p(T)'], del: ['p(' + x + ')'], cost: 1 });
      acts.push({ name: 'ul(' + x + ')', pre: ['t(' + x + ')', 'p(T)'], add: ['p(' + x + ')'], del: ['p(T)'], cost: 1 });
    });
    return { facts: ['t(A)', 't(B)', 't(C)', 't(D)', 'p(T)', 'p(A)', 'p(B)', 'p(C)', 'p(D)'], actions: acts, init: ['t(A)', 'p(C)'], goal: goal || ['t(A)', 'p(D)'] };
  }
  /** The A* example drawn on W3 p.18 (solid edges cost 1; h as printed next to each node, e.g. “1+2” = g 1, h 2). */
  const ASTAR_EXAMPLE = {
    nodes: { I: { h: 3 }, a: { h: 2 }, b: { h: 3 }, c: { h: 6 }, d: { h: 7 }, e: { h: 5 }, f: { h: 2 }, k: { h: 1 }, m: { h: 8 }, j: { h: 5 }, G: { h: 0 } },
    edges: [['I', 'a', 1], ['I', 'b', 1], ['a', 'c', 1], ['a', 'd', 1], ['b', 'e', 1], ['b', 'f', 1], ['f', 'j', 1], ['f', 'k', 1], ['k', 'G', 1], ['k', 'm', 1],
      ['c', 'G', 6], ['d', 'G', 7], ['e', 'G', 5], ['j', 'G', 5], ['m', 'G', 8]], // dashed lines on the slide = remaining cost, drawn here as real edges
    start: 'I', goals: ['G']
  };

  RL.plan = { succ, bestFirst, iterativeDeepening, hillClimbing, enforcedHillClimbing, hStar, heuristicProperties,
    bellmanFord, bestSupporters, relaxedPlan, hFF, optimalCost, goalCount, noveltyOf, iw, gridSpace,
    AUSTRALIA, logistics, ASTAR_EXAMPLE };
  if (typeof module !== 'undefined') module.exports = RL.plan;
})(typeof window === 'undefined' ? globalThis : window);
