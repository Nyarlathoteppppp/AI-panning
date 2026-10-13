'use strict';
/* Content integrity check for the course site (drafted by a Pi delegate, reviewed). Run: node tests/site.check.js */
const fs = require('fs');
const path = require('path');

const siteRoot = path.join(__dirname, '..');
const problems = [];
let eqCount = 0;
const report = msg => problems.push(msg);

// 1. Fake browser global and load the data scripts
global.window = global;
global.RL = global.RL || {};
const katex = require(path.join(siteRoot, 'vendor/katex/dist/katex.js'));
require(path.join(siteRoot, 'data/content.js'));
fs.readdirSync(path.join(siteRoot, 'data')).filter(f => /^part.*\.js$/.test(f)).sort()
  .forEach(f => require(path.join(siteRoot, 'data', f)));
require(path.join(siteRoot, 'data/glossary.js'));
require(path.join(siteRoot, 'data/formulas.js'));
require(path.join(siteRoot, 'data/enrich.js'));
require(path.join(siteRoot, 'data/subgoals.js'));
require(path.join(siteRoot, 'data/stories.js'));
require(path.join(siteRoot, 'data/scenes.js'));

const content = global.RL.content || {};
const chapters = content.chapters || [];
const validParts = new Set((content.parts || []).map(p => p.id));

// Registered visualiser ids (the viz files need a DOM, so read them as text)
const vizDir = path.join(siteRoot, 'js/viz');
const vizIds = new Set();
for (const file of fs.readdirSync(vizDir).filter(f => f.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(vizDir, file), 'utf8');
  for (const m of text.matchAll(/RL\.viz\.register\('([\w-]+)'/g)) vizIds.add(m[1]);
}

function renderLatex(tex, displayMode, loc) {
  if (!tex || !tex.trim()) return;
  eqCount++;
  try { katex.renderToString(tex.trim(), { throwOnError: true, strict: 'ignore', displayMode: !!displayMode, trust: () => true }); }
  catch (err) { report(`[KaTeX] ${loc.ch || '-'} ${loc.field}: ${err.message}\n    TeX: ${tex}`); }
}
function parseMarkdownMath(text, loc) {
  if (typeof text !== 'string') return;
  const clean = text.replace(/```[\s\S]*?```/g, '');
  const rest = clean.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => { renderLatex(tex, true, loc); return ''; });
  for (const m of rest.matchAll(/\$([^$\n]+?)\$/g)) renderLatex(m[1], false, loc);
}

// Animations referenced from data/scenes.js must be registered in js/scenes/*.js; videos must exist
const sceneIds = new Set();
for (const file of fs.readdirSync(path.join(siteRoot, 'js/scenes')).filter(f => f.endsWith('.js'))) {
  const text = fs.readFileSync(path.join(siteRoot, 'js/scenes', file), 'utf8');
  for (const m of text.matchAll(/RL\.scene\.register\('([\w-]+)'/g)) sceneIds.add(m[1]);
}
for (const [ch, list] of Object.entries((global.RL.content || {}).scenes || {})) {
  list.forEach(a => { if (!sceneIds.has(a.id)) report(`[Scenes] ${ch} references unregistered animation ${a.id}`); });
}
for (const [ch, list] of Object.entries((global.RL.content || {}).videos || {})) {
  list.forEach(v => {
    if (!fs.existsSync(path.join(siteRoot, v.src))) report(`[Videos] ${ch} video file missing: ${v.src}`);
    if (v.poster && !fs.existsSync(path.join(siteRoot, v.poster))) report(`[Videos] ${ch} poster missing: ${v.poster}`);
  });
}

// 2. Chapters
const seenIds = new Set();
const reqFields = ['id', 'part', 'title', 'summary', 'what', 'why', 'intuition', 'math', 'example', 'compare'];
for (const c of chapters) {
  const cid = c.id || '<unknown>';
  if (!c.id || seenIds.has(c.id)) report(`[Chapter] duplicate or missing id: ${cid}`);
  seenIds.add(c.id);
  for (const f of reqFields) if (typeof c[f] !== 'string' || !c[f].trim()) report(`[${cid}] missing field ${f}`);
  if (!validParts.has(c.part)) report(`[${cid}] invalid part ${c.part}`);

  if (!Array.isArray(c.formulas) || !c.formulas.length) report(`[${cid}] formulas must be a non-empty array`);
  else c.formulas.forEach((f, fi) => {
    if (!f.latex) report(`[${cid}] formula #${fi} missing latex`);
    (f.parts || []).forEach((p, pi) => {
      if (!p.key || !p.label || !p.color || !p.text) report(`[${cid}] formula #${fi} part #${pi} incomplete`);
      else if (!f.latex.includes(`\\htmlClass{fx-${p.key}}`)) report(`[${cid}] formula #${fi} latex lacks \\htmlClass{fx-${p.key}}`);
    });
  });

  if (!c.viz || !vizIds.has(c.viz.id)) report(`[${cid}] missing or unregistered viz.id ${c.viz && c.viz.id}`);
  if (!Array.isArray(c.pitfalls) || !c.pitfalls.length) report(`[${cid}] pitfalls must be non-empty`);
  if (!Array.isArray(c.quiz) || c.quiz.length < 3) report(`[${cid}] quiz needs >= 3 questions`);

  const allQuiz = [...(c.quiz || []), ...(c.moreQuiz || [])];
  allQuiz.forEach((q, qi) => {
    if (!q.q || !q.explain) report(`[${cid}] quiz #${qi} missing q/explain`);
    if (q.options) {
      const ans = [].concat(q.answer);
      if (!ans.every(i => Number.isInteger(i) && i >= 0 && i < q.options.length)) report(`[${cid}] quiz #${qi} answer index invalid`);
    } else if (typeof q.answer !== 'number' || !Number.isFinite(q.answer)) report(`[${cid}] quiz #${qi} numeric answer missing`);
  });
  for (const fig of [].concat(c.figure || [])) if (!fig.src || !fs.existsSync(path.join(siteRoot, 'assets/figures', fig.src))) report(`[${cid}] missing figure ${fig.src}`);

  // 3. KaTeX in every text field
  ['what', 'why', 'intuition', 'math', 'example', 'compare', 'formulaIntro', 'summary'].forEach(f => parseMarkdownMath(c[f], { ch: cid, field: f }));
  Object.entries(c.extra || {}).forEach(([k, v]) => parseMarkdownMath(v, { ch: cid, field: 'extra.' + k }));
  (c.goals || []).forEach(g => parseMarkdownMath(g, { ch: cid, field: 'goals' }));
  for (const p of [...(c.pitfalls || []), ...(c.morePitfalls || [])]) {
    parseMarkdownMath(p.wrong, { ch: cid, field: 'pitfalls.wrong' }); parseMarkdownMath(p.right, { ch: cid, field: 'pitfalls.right' });
  }
  for (const q of allQuiz) {
    ['q', 'explain'].forEach(k => parseMarkdownMath(q[k], { ch: cid, field: 'quiz.' + k }));
    (q.options || []).forEach(o => parseMarkdownMath(o, { ch: cid, field: 'quiz.options' }));
    (Array.isArray(q.why) ? q.why : []).forEach(w => parseMarkdownMath(w, { ch: cid, field: 'quiz.why' }));
  }
  (c.formulas || []).forEach(f => {
    renderLatex(f.latex, true, { ch: cid, field: 'formulas.latex' });
    (f.parts || []).forEach(p => parseMarkdownMath(p.text, { ch: cid, field: 'formula.part.text' }));
    (f.steps || []).forEach(s => parseMarkdownMath(s.text, { ch: cid, field: 'formula.step.text' }));
  });
  if (c.viz) parseMarkdownMath(c.viz.guide, { ch: cid, field: 'viz.guide' });
}

// 4. Chain, glossary, formula sheet
for (const item of content.chain || []) if (item.id && !seenIds.has(item.id)) report(`[chain] unknown chapter ${item.id}`);
for (const item of content.glossary || []) {
  if (item.ch && !seenIds.has(item.ch)) report(`[glossary] ${item.zh}: unknown chapter ${item.ch}`);
  if (item.sym) renderLatex(item.sym, false, { ch: item.ch, field: 'glossary.sym ' + item.zh });
  parseMarkdownMath(item.def, { ch: item.ch, field: 'glossary.def ' + item.zh });
}
for (const group of content.formulaSheet || []) for (const item of group.items || []) {
  if (item.ch && !seenIds.has(item.ch)) report(`[formulas] unknown chapter ${item.ch}`);
  renderLatex(item.tex, true, { ch: item.ch, field: 'formulaSheet ' + item.name });
  parseMarkdownMath(item.note, { ch: item.ch, field: 'formulaSheet.note ' + item.name });
}

// 4b. Worked-example subgoals and background stories
for (const [cid, steps] of Object.entries(content.subgoals || {})) {
  if (!chapters.some(c => c.id === cid)) report(`[subgoals] unknown chapter ${cid}`);
  steps.forEach(t => parseMarkdownMath(t, { ch: cid, field: 'subgoals' }));
}
for (const [cid, text] of Object.entries(content.stories || {})) {
  if (!chapters.some(c => c.id === cid)) report(`[stories] unknown chapter ${cid}`);
  parseMarkdownMath(text, { ch: cid, field: 'story' });
}

// 5. index.html local assets
const indexHtml = fs.readFileSync(path.join(siteRoot, 'index.html'), 'utf8');
for (const m of indexHtml.matchAll(/<(?:script[^>]+src|link[^>]+href)=["']([^"']+)["']/g)) {
  const ref = m[1].split('?')[0].split('#')[0];
  if (!/^https?:\/\//i.test(ref) && !fs.existsSync(path.join(siteRoot, ref))) report(`[index.html] missing asset ${ref}`);
}

// 6. Summary
console.log(`Chapters: ${chapters.length}  Equations rendered: ${eqCount}  Viz registered: ${vizIds.size}  Problems: ${problems.length}`);
if (problems.length) { problems.forEach(p => console.error('  ✗', p)); process.exitCode = 1; }
else console.log('✓ All site integrity and KaTeX checks passed.');
