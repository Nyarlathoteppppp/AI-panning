'use strict';
/* Every number checked here appears on a lecture slide (page refs in comments). Run: node tests/core.test.js */
const assert = require('node:assert/strict');
require('../js/core/mdp.js'); require('../js/core/dp.js'); require('../js/core/learn.js'); require('../js/core/examples.js'); require('../js/core/mcts.js'); require('../js/core/planning.js');
const { mdp, dp, learn, examples, mcts, plan } = globalThis.RL;
const near = (a, b, eps = 5e-5, msg = '') => assert.ok(Math.abs(a - b) < eps, `${msg} ${a} != ${b}`);
const g = mdp.courseGrid();
let passed = 0; const ok = name => { passed++; console.log('  ✓', name); };

// Week 6 L1 slides 13-15: 11 states, slip 0.8/0.1/0.1, blocked moves stay put.
assert.equal(g.states.length, 11); assert.deepEqual([...g.terminal].sort((a, b) => a - b), [7, 11]);
for (const s of g.nonTerminal) for (const a of g.actions) near(g.branches(s, a).reduce((t, b) => t + b.prob, 0), 1);
const top = g.outcomes(8, 'N'); // top-left cell, North: p(s,0|s,N)=0.9, p(sE,0|s,N)=0.1 (slide 22)
near(top.find(o => o.next === 8).prob, 0.9); near(top.find(o => o.next === 9).prob, 0.1);
ok('Gridworld dynamics and joint-probability merge (W6 L1 p.22-23)');

// Week 6 L2 slides 17-18: one and two Bellman backups at s10.
let V = dp.zeros(g);
const q1 = Object.fromEntries(g.actions.map(a => [a, dp.qValue(g, V, 10, a)]));
near(q1.N, 0.1); near(q1.E, 0.8); near(q1.S, 0.1); near(q1.W, 0);
let r = dp.valueIterationSweep(g, V); V = r.V; near(V[10], 0.8);
r = dp.valueIterationSweep(g, V);
near(r.Q[10].N, 0.676); near(r.Q[10].E, 0.872); near(r.Q[10].S, 0.1); near(r.Q[10].W, 0.072);
V = r.V; near(V[10], 0.872); near(V[9], 0.576); near(V[6], 0.476);
ok('Bellman backups Q1/Q2 at s10 (W6 L2 p.17-18) and V2 (p.22)');

// Iterations 5 and 10 tables (slides 25 and 30), rounded to 3 dp on the slides.
V = dp.zeros(g); const hist = [V];
for (let t = 1; t <= 11; t++) { V = dp.valueIterationSweep(g, V).V; hist.push(V); }
[[1, .237], [2, .34], [3, .478], [4, .209], [5, .46], [6, .628], [8, .65], [9, .816], [10, .939]].forEach(([s, v]) => near(hist[5][s], v, 6e-4, 'V5 s' + s));
[[1, .537], [2, .463], [3, .526], [4, .305], [5, .626], [6, .635], [8, .716], [9, .827], [10, .942]].forEach(([s, v]) => near(hist[10][s], v, 6e-4, 'V10 s' + s));
ok('Value iteration tables at iterations 5 and 10 (W6 L2 p.25, p.30)');

// Policy iteration (slides 34-38).
const v0 = dp.policyEvaluationExact(g, examples.PI0);
[[8, .0730], [9, .1542], [10, .4067], [5, .0277], [6, .2119], [1, .0131], [2, -.0559], [3, -.1872], [4, -.5263]].forEach(([s, v]) => near(v0[s], v, 6e-5, 'Vpi0 s' + s));
const i1 = dp.improvePolicy(g, v0, examples.PI0);
assert.deepEqual(i1.policy, { 1: 'N', 2: 'W', 3: 'N', 4: 'W', 5: 'N', 6: 'N', 8: 'E', 9: 'E', 10: 'E' });
const v1 = dp.policyEvaluationExact(g, i1.policy);
[[8, .7166], [9, .8271], [10, .9420], [5, .6292], [6, .6354], [1, .5452], [2, .4787], [3, .5283], [4, .3081]].forEach(([s, v]) => near(v1[s], v, 6e-5, 'Vpi1 s' + s));
assert.ok(dp.improvePolicy(g, v1, i1.policy).stable);
// Iterative evaluation converges to the exact linear-equation solution.
let ve = dp.zeros(g); for (let k = 0; k < 400; k++) ve = dp.policyEvaluationSweep(g, ve, examples.PI0).V;
g.states.forEach(s => near(ve[s], v0[s], 1e-8));
ok('Policy iteration π0 → π1 → stable, V^π0 and V^π1 (W6 L2 p.35-38); iterative = exact evaluation');

// Week 7 slides 27-32: Monte Carlo prediction over three episodes.
const table = {}; const key = e => e.s + e.a;
const log1 = learn.mcUpdate(examples.MC_EPISODES[0].steps, table, 0.9, key);
assert.deepEqual(log1.map(l => +l.G.toFixed(4)), [1, 0.9, 0.81, 0.729, 0.6561]);
learn.mcUpdate(examples.MC_EPISODES[1].steps, table, 0.9, key);
near(table['1N'].Q, 0.6561); assert.equal(table['1N'].N, 2); near(table['10E'].Q, 1); assert.equal(table['10E'].N, 2);
learn.mcUpdate(examples.MC_EPISODES[2].steps, table, 0.9, key);
near(table['6N'].Q, -0.05); near(table['10E'].Q, 0.3667); near(table['9E'].Q, 0.045); near(table['8E'].Q, 0.0405);
near(table['5N'].Q, 0.0365, 6e-5); near(table['1N'].Q, 0.2406); assert.equal(table['1N'].N, 3);
ok('MC prediction episodes 1-3 incl. Q(s1,Up)=0.2406 (W7 p.27-32)');

// Week 8 slides 33-36: TD prediction of q_π with α=0.1, target R + γ Q(S', π(S')).
const Q = {}; const get = (s, a) => Q[s + a] || 0;
function tdEpisode(steps) {
  for (const e of steps) {
    const done = g.isTerminal(e.next);
    const target = done ? e.r : e.r + 0.9 * get(e.next, examples.POLICY1[e.next]);
    Q[e.s + e.a] = learn.tdUpdate(get(e.s, e.a), target, 0.1).after;
  }
}
tdEpisode(examples.MC_EPISODES[0].steps); near(get(10, 'E'), 0.1); near(get(9, 'E'), 0);
tdEpisode(examples.MC_EPISODES[1].steps); near(get(10, 'E'), 0.19); near(get(6, 'N'), 0.009);
tdEpisode(examples.MC_EPISODES[2].steps); near(get(9, 'E'), 0.0171); near(get(10, 'E'), 0.1718); near(get(6, 'N'), -0.0919);
ok('TD prediction episodes 1-3 (W8 L1 p.34-36)');

// Week 8 slide 32/41: TD step in the s10 Up loop, α=0.2.
const loop = learn.tdUpdate(0.86, 0 + 0.9 * 0.86, 0.2); near(loop.error, -0.086); near(loop.after, 0.8428);
ok('TD escape from the s10-Up loop: Δ=−0.086, Q=0.8428 (W8 L1 p.32)');

// Week 9 slide 24: tabular Q-learning first update; slide 28: method-1 shared weight update.
near(learn.tdUpdate(0, learn.qLearningTarget(1, 0.9, [0, 0, 0, 0], true), 0.1).after, 0.1);
const x10 = examples.FEATURES.method1.fn(g.coordOf[10]); near(x10[0], 0.2); near(x10[1], 0.4);
const lin = learn.linearUpdate([0, 0], x10, 1, 0.1); near(lin.next[0], 0.02); near(lin.next[1], 0.04); near(lin.after, 0.02);
near(learn.dot(lin.next, examples.FEATURES.method1.fn(g.coordOf[6])), 0.016);
const V10 = learn.dot(lin.next, x10), V6 = learn.dot(lin.next, examples.FEATURES.method1.fn(g.coordOf[6]));
near(0.8 * 1 + 0.1 * 0.9 * V10 + 0.1 * 0.9 * V6, 0.8032);
// Method 2 figure (slide 32): φ(s10)=(1,2/3), w → (0.1, 1/15), V̂(s10)=0.1444. Bottom row has all-zero features.
const m2 = learn.linearUpdate([0, 0], examples.FEATURES.method2.fn(g.coordOf[10]), 1, 0.1);
near(m2.next[0], 0.1); near(m2.next[1], 1 / 15); near(m2.after, 0.1444);
[1, 2, 3, 4].forEach(s => assert.deepEqual(examples.FEATURES.method2.fn(g.coordOf[s]), [0, 0]));
assert.deepEqual(examples.FEATURES.method1.fn(g.coordOf[4]), examples.FEATURES.method1.fn(g.coordOf[6]));
ok('Linear approximation: method 1 (0.02,0.04), V̂(s6)=0.016, Q̂=0.8032; method 2 0.1444; aliasing (W9 p.28-35)');

// Week 8-2: n-step and λ-return weights sum to one.
near(learn.lambdaWeights(0.5, 5).reduce((a, b) => a + b, 0), 1, 1e-12);
near(learn.nStepReturn([0, 0, 1], 0.9, 1, 0.8), 0.72); near(learn.nStepReturn([0, 0, 1], 0.9, 3, 99), 0.81);
ok('n-step return and episodic λ weights (W8-2 p.25-29)');

// Week 10 slide 16 & 27: REINFORCE preference update equals finite-difference gradient of log softmax.
const h = [0.2, -0.4, 0.7], step = learn.reinforceTabular(h, 1, 1, 0.1, 0.9, 0), eps = 1e-6;
for (let b = 0; b < 3; b++) {
  const hp = h.slice(), hm = h.slice(); hp[b] += eps; hm[b] -= eps;
  near((Math.log(learn.softmax(hp)[1]) - Math.log(learn.softmax(hm)[1])) / (2 * eps), step.grad[b], 1e-7);
}
near(step.delta.reduce((a, b) => a + b, 0), 0, 1e-12);
const lp = learn.linearPolicyGradient([0.5, -1], [[1, 0], [0, 1], [1, 1]], 2);
near(lp.grad[0], 1 - (lp.pi[0] + lp.pi[2])); near(lp.grad[1], 1 - (lp.pi[1] + lp.pi[2]));
ok('REINFORCE: ∂log π/∂h = 1{b=a} − π(b|s); linear policy gradient f − Σπf (W10 p.16, p.27)');

// Bandit incremental mean equals the batch average.
const st = { Q: [0, 0], N: [0, 0], t: 0 }; [3, 5, 10].forEach(x => learn.banditUpdate(st, 0, x)); near(st.Q[0], 6);
near(learn.epsilonGreedyProbs([1, 0, 0, 0], 0.1)[0], 0.925);
ok('Bandit incremental average and ε-greedy probabilities (W7 p.15-17, W8 p.4)');

// Week 10-2 slides 8-32: robot example (one-step episodes, A → 101, B → 99, α = β = 0.1).
const pA = hv => learn.softmax(hv)[0];
let hv = [0, 0];
hv = learn.reinforceTabular(hv, 1, 99, 0.1, 1, 0).next; near(hv[0], -4.95); near(hv[1], 4.95); near(pA(hv), 0.0000501722, 1e-10);
const e2 = learn.reinforceTabular(hv, 1, 99, 0.1, 1, 0).next; near(e2[0], -4.950495, 3e-6);
for (let k = 1; k < 100; k++) hv = learn.reinforceTabular(hv, 1, 99, 0.1, 1, 0).next;
near(hv[0], -4.9969, 1e-4);
hv = learn.reinforceTabular(hv, 0, 101, 0.1, 1, 0).next; near(hv[0], 5.102614, 1e-6); near(pA(hv), 0.99996, 1e-5);
const pm = learn.reinforceTabular([0, 0], 1, -1, 0.1, 1, 0); near(pm.next[0], 0.05); near(pm.after[0], 0.525, 1e-3);
let hb = [0, 0], b = 0;
let u = learn.reinforceBaseline(hb, 1, 99, b, 0.1, 0.1); near(u.advantage, 99); near(u.bNext, 9.9); hb = u.next; b = u.bNext;
u = learn.reinforceBaseline(hb, 1, 99, b, 0.1, 0.1); near(u.advantage, 89.1); near(u.next[0], -4.950447034, 1e-9); near(u.bNext, 18.81); near(u.after[0], 0.0000501273, 1e-10);
hb = u.next; b = u.bNext;
for (let k = 2; k < 100; k++) { u = learn.reinforceBaseline(hb, 1, 99, b, 0.1, 0.1); hb = u.next; b = u.bNext; }
near(hb[0], -4.954451384, 1e-9); near(b, 98.997370, 1e-6); near(pA(hb), 0.0000497275, 1e-10);
// Slide 37: accurate critic at the initial policy → V = 100, advantages ±1. Slide 38: terminal bootstrap is 0.
const V0 = 0.5 * 101 + 0.5 * 99; near(V0, 100); near(101 - V0, 1); near(99 - V0, -1);
const ac = learn.tdActorCritic([0, 0, 0, 0], 1, 1, 0, 0.3, true, 0.2, 0.1, 0.9); near(ac.delta, 1); near(ac.vAfter, 0.1); near(ac.actor.delta[1], 0.15); near(ac.actor.delta[0], -0.05);
const ac2 = learn.tdActorCritic([0, 0, 0, 0], 1, 0, 0.2, 0.5, false, 0.2, 0.1, 0.9); near(ac2.delta, 0.25); near(ac2.actor.delta[1], 0.0375);
ok('Actor-critic: robot E1/E2/E100/E101, ±1 rewards, learned baseline 9.9/18.81/98.99737, A2C ±1, TD δ (W10-2 p.8-38)');

// Week 11-1 p.12, 14, 16: UCB with c = √2 on the decision-1 root (N(s) = 200; Up −0.0250/64, Left −0.0730/52,
// Right −0.1580/36, Down −0.0905/48). After 200 iterations the four UCB scores are almost equal (≈0.38).
const D1 = { N: [-0.0250, 64], W: [-0.0730, 52], E: [-0.1580, 36], S: [-0.0905, 48] };
const u1 = Object.fromEntries(Object.entries(D1).map(([a, [q, n]]) => [a, mcts.ucb(q, n, 200, Math.SQRT2)]));
near(u1.N, 0.3819, 1e-4); near(u1.W, 0.3784, 1e-4); near(u1.E, 0.3845, 1e-4); near(u1.S, 0.3794, 1e-4);
assert.equal(Object.values(D1).reduce((t, x) => t + x[1], 0), 200);
assert.equal(mcts.ucb(0, 0, 10, 1), Infinity);
// Root sums on decisions 2-6 exceed 200 because the matching subtree is reused (p.17-21).
[[62, 50, 42, 50, 204], [83, 57, 57, 56, 253], [68, 53, 75, 64, 260], [30, 23, 172, 30, 255], [48, 15, 266, 9, 338]]
  .forEach(r => assert.equal(r[0] + r[1] + r[2] + r[3], r[4]));
// Backpropagation is an incremental mean (p.14).
let m = { q: 0, n: 0 }; [1, 0, 0.5, -1].forEach(R => { m = mcts.incMean(m.q, m.n, R); }); near(m.q, 0.125); assert.equal(m.n, 4);
// Expectimax with the known model = depth-limited Bellman optimality (p.24-25): depth 1/2 at s10 reproduce W6 0.8 / 0.872.
near(mcts.expectimax(g, 10, 1).V, 0.8); const em2 = mcts.expectimax(g, 10, 2).Q; near(em2.E, 0.872); near(em2.N, 0.676); near(em2.W, 0.072);
let Vv = dp.zeros(g); for (let k = 0; k < 5; k++) Vv = dp.valueIterationSweep(g, Vv).V; near(mcts.expectimax(g, 1, 5).V, Vv[1], 1e-12);
assert.equal(mcts.expectimaxLeaves(g, 1, 2), 100);
// A seeded MCTS run: a fresh tree has Σ N(s0,a) = iterations; after acting, the reused subtree carries its counts.
let tr = mcts.createTree(g, 1); const rr = mdp.rng(7), mo = { rng: rr, horizon: 60 };
mcts.search(g, tr, 200, mo); assert.equal(mcts.rootVisits(g, tr.root), 200); assert.equal(mcts.countNodes(tr.root), 201);
const a1 = mcts.bestAction(g, tr.root); const o1 = g.step(1, a1, rr); const tr2 = mcts.advance(g, tr, a1, o1.next, true);
const carried = tr2.carried; mcts.search(g, tr2, 200, mo); assert.equal(mcts.rootVisits(g, tr2.root), 200 + carried); assert.ok(carried > 0);
// PUCT, visit-count policy with temperature, AlphaGo leaf mix, AlphaGo Zero loss (p.31-34).
near(mcts.puct(0.5, 3, 0.2, 16, 1), 0.5 + 0.2 * 4 / 4);
const vp = mcts.visitPolicy([30, 10, 0], 1); near(vp[0], 0.75); near(mcts.visitPolicy([30, 10, 0], 0.5)[0], 0.9);
near(mcts.alphaGoLeaf(0.2, 1, 0.5), 0.6);
const lz = mcts.alphaZeroLoss(1, 0.6, [0.75, 0.25, 0], [0.5, 0.5, 0], 0, 0); near(lz.value, 0.16); near(lz.policy, Math.log(2), 1e-12);
ok('MCTS: UCB on the decision-1 root, subtree reuse sums, incremental mean, Expectimax = VI depth (W11 p.12-25, 31-34)');

// Weeks 1-5 (classical planning). W5 p.14, 26-27: "TSP" in Australia.
const AU = plan.AUSTRALIA;
near(plan.bellmanFord(AU, null, 'max').h, 5.5); near(plan.bellmanFord(AU, null, 'add').h, 13);
near(plan.optimalCost(AU, true).cost, 10); near(plan.optimalCost(AU, false).cost, 20);
near(plan.hFF(AU, 'add').h, 10);
// W5 p.28-34: Logistics. h_add values and best supporters as printed on p.32; h_FF = 5; goal {t(D), p(D)}: h_add 10, h_FF 5.
const LG = plan.logistics(), lv = plan.bellmanFord(LG, null, 'add').values;
assert.deepEqual(['t(A)', 't(B)', 't(C)', 't(D)', 'p(T)', 'p(A)', 'p(B)', 'p(C)', 'p(D)'].map(f => lv[f]), [0, 1, 2, 3, 3, 4, 5, 0, 7]);
const lff = plan.hFF(LG, 'add');
assert.deepEqual(lff.bs, { 't(B)': 'dr(A,B)', 't(C)': 'dr(B,C)', 't(D)': 'dr(C,D)', 'p(T)': 'lo(C)', 'p(A)': 'ul(A)', 'p(B)': 'ul(B)', 'p(D)': 'ul(D)' });
near(plan.bellmanFord(LG, null, 'add').h, 7); near(lff.h, 5); near(plan.optimalCost(LG, true).cost, 5); near(plan.optimalCost(LG, false).cost, 8);
const LG2 = plan.logistics(['t(D)', 'p(D)']); near(plan.bellmanFord(LG2, null, 'add').h, 10); near(plan.hFF(LG2, 'add').h, 5);
// W2 p.20: iterative deepening generates 123,450 nodes vs breadth-first 111,110 for b = 10, d = 5.
let bfsN = 0, idsN = 0; for (let k = 1; k <= 5; k++) { bfsN += 10 ** k; idsN += (5 - k + 1) * 10 ** k; } assert.equal(bfsN, 111110); assert.equal(idsN, 123450);
// W3 p.18 A* example: expansions I, a, b, f, k, then the goal via k (cost 4).
const AE = plan.bestFirst(plan.ASTAR_EXAMPLE, 'astar'); assert.deepEqual(AE.expanded, ['I', 'a', 'b', 'f', 'k', 'G']); assert.equal(AE.cost, 4);
const pr = plan.heuristicProperties(plan.ASTAR_EXAMPLE); assert.ok(pr.safe && pr.goalAware && pr.admissible && pr.consistent);
// W2 quiz: on a 3x3 grid with state {row, col}, IW(1) cannot reach (2,2) but IW(2) can (in 4 moves).
const GR = plan.gridSpace(3, 3, [0, 0], [2, 2]); assert.equal(plan.iw(GR, 1).found, false); assert.equal(plan.iw(GR, 2).path.length, 4);
ok('Planning: Australia h_max 5.5 / h_add 13 / h+ 10 / h* 20; Logistics h_add table, best supporters, h_FF 5; A* example; IW (W2-W5)');

console.log(`PASS ${passed} groups`);
