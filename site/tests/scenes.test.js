'use strict';
// Scene numbers and custom motion endpoints: no browser required.
const assert = require('node:assert/strict');
for (const name of ['mdp', 'dp', 'learn', 'examples', 'mcts', 'planning']) require('../js/core/' + name + '.js');
global.window = global;
RL.dom = { fmt: (x, d = 3) => Number(x).toFixed(d).replace('-', '−') };
require('../js/ui/scene.js');
for (const name of ['rl-core', 'rl-advanced', 'rl-extra', 'planning']) require('../js/scenes/' + name + '.js');
const katex = require('../vendor/katex/dist/katex.js');
function build(id, overrides = {}) {
  const def = RL.scene.defs[id], params = {};
  (def.params || []).forEach(p => params[p.key] = p.value);
  Object.assign(params, overrides);
  const st = { base: {}, objs: {}, W: def.w || 720, H: def.h || 340 };
  function put(name, attrs) {
    assert.ok(!st.objs[name], 'duplicate object ' + name);
    const el = { getAttribute: k => attrs[k] ?? null };
    st.objs[name] = el;
    for (const [k, v] of Object.entries(attrs)) st.base[name + '.' + k] = v;
    return el;
  }
  st.add = (n, tag, attrs) => put(n, attrs);
  st.group = (n, attrs) => put(n, attrs);
  st.text = (n, x, y, text, o = {}) => put(n, { x, y, text, fill: o.color || RL.scene.PAL.text, ...(o.op != null ? { op: o.op } : {}), ...o.set });
  st.num = (n, x, y, num, o = {}) => put(n, { x, y, num, ...(o.op != null ? { op: o.op } : {}) });
  st.tex = (n, x, y, tex, o = {}) => put(n, { x, y, tex, ...(o.op != null ? { op: o.op } : {}) });
  const frames = def.build(st, params);
  let cur = { ...st.base };
  const states = frames.map(f => (cur = { ...cur, ...f.set }));
  return { st, frames, states };
}
const problems = [];
const near = (a, b, label) => assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} != ${b}`);
let variants = 0, frameCount = 0;
for (const [id, def] of Object.entries(RL.scene.defs)) {
  const variantsToCheck = [{}];
  for (const p of def.params || []) for (const value of [p.min, p.max]) variantsToCheck.push({ [p.key]: value });
  for (const params of variantsToCheck) {
    const { st, frames, states } = build(id, params); variants++; frameCount += frames.length;
    for (let i = 0; i < frames.length; i++) {
      const fr = frames[i], at = `${id} ${JSON.stringify(params)} frame ${i}`;
      for (const k of [...Object.keys(fr.set || {}), ...Object.keys(fr.fn || {})]) {
        if (!st.objs[k.slice(0, k.lastIndexOf('.'))]) problems.push(`${at}: unknown ${k}`);
      }
      for (const [key, fn] of Object.entries(fr.fn || {})) {
        const expected = states[i][key] ?? (key.endsWith('.draw') ? 1 : undefined);
        if (typeof expected === 'number' && Math.abs(fn(1) - expected) > 1e-7) problems.push(`${at}: endpoint ${key} is ${fn(1)}, final state is ${expected}`);
        for (const t of [0, .25, .5, .75, 1]) { const v = fn(t); if (typeof v === 'number' && !Number.isFinite(v)) problems.push(`${at}: nonfinite motion ${key}`); }
      }
      for (const [key, value] of Object.entries(states[i])) {
        if (typeof value === 'number' && !Number.isFinite(value)) problems.push(`${at}: nonfinite ${key}`);
        if (key.endsWith('.tex') && value) try { katex.renderToString(value, { throwOnError: true, strict: 'ignore', trust: true }); } catch (e) { problems.push(`${at}: ${e.message}`); }
      }
      if (fr.tex) try { katex.renderToString(fr.tex, { throwOnError: true, strict: 'ignore', trust: true }); } catch (e) { problems.push(`${at}: ${e.message}`); }
    }
  }
}
const sr = build('sarsa-vs-q').states;
near(sr[3]['dnS.num'], .486, 'SARSA update'); near(sr[5]['dnQ.num'], .522, 'Q-learning update');
const uc = build('ucb-bonus').states;
assert.equal(uc[4]['nB.num'], 41); assert.ok(uc[3]['uB.num'] > uc[3]['uA.num']); assert.ok(uc[4]['uB.num'] < uc[4]['uA.num']);
const bell = build('bellman-backup').states;
near(bell[4]['rootv.num'], .872, 'optimal backup'); near(bell[5]['rootv.num'], .43, 'one uniform-policy backup');
const bn = build('baseline-shrink').states;
near(bn[2]['dn.num'], 89.1, 'E2 uses OLD baseline'); near(bn[4]['bnext.num'], 99 * (1 - .9 ** 100), 'E100 baseline');
for (const state of bn.slice(1)) near(state['dl.y2'] - state['dl.y1'], 2 * state['dn.num'], 'baseline difference length');
for (const state of bn.slice(1)) near(state['bb.y'], state['dl.y2'], 'difference ends at OLD baseline');
console.log(`${Object.keys(RL.scene.defs).length} scenes, ${variants} variants, ${frameCount} frames; ${problems.length} problems`);
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log('PASS scene math, formula rendering and motion endpoints');
