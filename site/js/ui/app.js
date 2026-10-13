/* Application shell: routing, table of contents, progress, theme and chapter rendering.
 * Routes: #/ (home)  #/c/<id> (chapter)  #/glossary  #/formulas  #/review */
(function (root) {
  'use strict';
  const RL = root.RL;
  const { h, clear, store } = RL.dom;
  const md = s => RL.md.render(s || '');

  const SECTIONS = [
    ['what', '它是什么'], ['why', '为什么需要它'], ['intuition', '直觉'], ['math', '数学定义'],
    ['formula', '公式逐项解释'], ['example', '数值例子'], ['viz', '可交互可视化'], ['compare', '与相近概念比较'],
    ['pitfalls', '常见误区'], ['quiz', 'Quiz']
  ];
  const chapters = () => RL.content.chapters;
  const byId = id => chapters().find(c => c.id === id);
  const indexOf = id => chapters().findIndex(c => c.id === id);
  // display label: planning chapters carry their own label (P1, P2, …); RL chapters keep their original 1–38 numbering
  const numOf = id => { const c = byId(id); if (c && c.num) return c.num; return String(chapters().filter(x => !x.num).findIndex(x => x.id === id) + 1); };
  const mastered = () => new Set(store.get('mastered', []));
  let cleanupViz = null, sectionObserver = null;

  /* ---------- theme ---------- */
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
    const dark = t === 'dark';
    document.getElementById('theme-toggle').textContent = dark ? '浅色' : '深色';
    document.getElementById('theme-toggle').setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    store.set('theme', next); applyTheme(next);
    root.dispatchEvent(new CustomEvent('rl:theme'));
  }

  /* ---------- table of contents ---------- */
  function buildTOC() {
    const nav = clear(document.getElementById('toc-list'));
    const done = mastered(), visited = new Set(store.get('visited', []));
    nav.appendChild(h('a.toc-home', { href: '#/' }, '课程总览'));
    RL.content.parts.forEach(part => {
      const list = chapters().filter(c => c.part === part.id);
      const n = list.filter(c => done.has(c.id)).length;
      nav.appendChild(h('div.toc-part',
        h('div.toc-part-head', h('span.toc-week', part.week), h('span.toc-part-title', part.title), h('span.toc-part-count', n + '/' + list.length)),
        h('ol.toc-chapters', list.map(c => h('li', h('a.toc-link', { href: '#/c/' + c.id, dataset: { id: c.id } },
          h('span.toc-dot' + (done.has(c.id) ? '.done' : visited.has(c.id) ? '.seen' : ''), { 'aria-hidden': 'true' }),
          h('span.toc-num', numOf(c.id)), h('span.toc-title', c.title)))))));
    });
    nav.appendChild(h('div.toc-part', h('div.toc-part-head', h('span.toc-week', '附录'), h('span.toc-part-title', '复习工具')),
      h('ol.toc-chapters', [['#/glossary', '术语表'], ['#/formulas', '公式速查表'], ['#/review', '综合复习测验']].map(([href, t]) =>
        h('li', h('a.toc-link', { href }, h('span.toc-dot', { 'aria-hidden': 'true' }), h('span.toc-title', t)))))));
    markActiveTOC();
  }
  function markActiveTOC() {
    const hash = location.hash || '#/';
    document.querySelectorAll('#toc-list a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));
    const active = document.querySelector('#toc-list a.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- progress ---------- */
  function updateProgress() {
    const total = chapters().length, done = mastered().size;
    let answered = 0, right = 0, questions = 0;
    chapters().forEach(c => {
      questions += (c.quiz || []).length + (c.moreQuiz || []).length;
      const r = RL.quiz.results(c.id); answered += Object.keys(r).length; right += Object.values(r).filter(x => x.correct).length;
    });
    document.getElementById('progress-bar').style.width = (100 * done / total).toFixed(1) + '%';
    document.getElementById('progress-text').textContent = '已掌握 ' + done + '/' + total + ' 章 · 测验 ' + right + '/' + questions;
  }

  /* ---------- viz placement: inline in section 7 by default; optionally pinned to the right ---------- */
  const wide = root.matchMedia('(min-width: 1280px)');
  const docked = () => store.get('vizDock', 'inline') === 'side';
  function placeViz() {
    const host = document.getElementById('viz-host');
    const slot = document.getElementById('viz-inline-slot');
    const panel = document.getElementById('viz-panel');
    if (!host) return;
    const side = wide.matches && docked() && panel;
    if (side) { panel.appendChild(host); document.body.classList.add('has-viz-panel'); }
    else if (slot) { slot.appendChild(host); document.body.classList.remove('has-viz-panel'); }
    const btn = document.getElementById('viz-dock');
    if (btn) {
      btn.hidden = !wide.matches;
      btn.textContent = side ? '收起到正文 ↙' : '固定到右侧（边读边做）↗';
      btn.title = side ? '把实验放回第 7 环节，右侧留给正文' : '把实验钉在右侧，阅读其他环节时也能操作';
    }
  }
  function toggleDock() {
    const wasSide = docked();
    store.set('vizDock', wasSide ? 'inline' : 'side');
    placeViz();
    const target = document.getElementById(wasSide ? 'sec-viz' : 'viz-panel');
    if (wasSide && target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  wide.addEventListener('change', placeViz);

  function mountViz(chapter) {
    if (cleanupViz) { try { cleanupViz(); } catch (e) { /* ignore */ } cleanupViz = null; }
    const panel = clear(document.getElementById('viz-panel'));
    document.body.classList.remove('has-viz-panel');
    if (!chapter || !chapter.viz) return;
    const def = RL.viz.get(chapter.viz.id);
    const body = h('div.viz-body');
    const host = h('div#viz-host.viz-host',
      h('div.viz-head', h('div.viz-head-row', h('span.viz-kicker', '交互 · ' + (chapter.viz.kicker || '动手验证')), h('button#viz-dock.viz-dock', { type: 'button', onclick: toggleDock })), h('h3.viz-title', chapter.viz.title || (def && def.title) || '')),
      body);
    panel.appendChild(host);
    if (def) {
      try { const r = def.mount(body, chapter.viz.props || {}); cleanupViz = typeof r === 'function' ? r : null; }
      catch (e) { body.appendChild(h('p.warn-text', '可视化加载失败：' + e.message)); console.error(e); }
    } else body.appendChild(h('p.warn-text', '未找到可视化模块：' + chapter.viz.id));
    placeViz();
  }

  /* ---------- notes, search, font size, export ---------- */
  function noteBox(c) {
    const area = h('textarea.note-area', { rows: 4, placeholder: '这一章我理解了…… / 我还不确定……（自动保存在本浏览器）' });
    area.value = store.get('note:' + c.id, '');
    const status = h('span.note-status');
    let timer = null;
    area.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { store.set('note:' + c.id, area.value); status.textContent = '已保存 ' + new Date().toLocaleTimeString(); }, 400); });
    return h('section.notes', h('label', { for: 'note-' + c.id }, '用自己的话记下来'), h('p.muted', '哪里还没想通？先写下你的预测，再去交互里验证。'), Object.assign(area, { id: 'note-' + c.id }), status);
  }
  function plain(c) { return [c.title, c.en, c.summary, c.what, c.why, c.intuition, c.math, c.example, c.compare].join(' ').replace(/\$[^$]*\$/g, ' ').replace(/[#*|>`_]/g, ' '); }
  function search(q) {
    const box = document.getElementById('toc-results'), list = document.getElementById('toc-list');
    q = q.trim().toLowerCase();
    if (!q) { box.hidden = true; list.hidden = false; return; }
    const hits = [];
    chapters().forEach(c => {
      const text = plain(c), i = text.toLowerCase().indexOf(q);
      if (i >= 0 || c.title.toLowerCase().includes(q)) hits.push({ c, snippet: i >= 0 ? text.slice(Math.max(0, i - 18), i + q.length + 30).replace(/\s+/g, ' ') : c.summary });
    });
    clear(box).put(hits.length ? hits.map(x => h('a.toc-hit', { href: '#/c/' + x.c.id }, h('b', numOf(x.c.id) + '. ' + x.c.title), h('small', '…' + x.snippet + '…'))) : h('p.muted', '没有找到“' + q + '”。'));
    box.hidden = false; list.hidden = true;
  }
  const FONT_SIZES = [16.5, 18, 19.5];
  function applyFont(i) { document.documentElement.style.fontSize = (FONT_SIZES[i] / 16.5 * 100) + '%'; document.getElementById('font-toggle').textContent = i === FONT_SIZES.length - 1 ? '字号 A−' : '字号 A+'; }
  function exportNotes() {
    const done = mastered(), lines = ['# COMP90054 强化学习 · 学习记录', '', '导出时间：' + new Date().toLocaleString(), ''];
    chapters().forEach((c, i) => {
      const r = RL.quiz.results(c.id), n = (c.quiz || []).length + (c.moreQuiz || []).length, right = Object.values(r).filter(x => x.correct).length;
      lines.push('## ' + (i + 1) + '. ' + c.title, '', '- 掌握：' + (done.has(c.id) ? '✓' : '—') + '　测验：' + right + '/' + n);
      const note = store.get('note:' + c.id, ''); if (note.trim()) lines.push('', note.trim());
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'RL学习记录.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- chapter page ---------- */
  function renderPitfalls(list) {
    if (typeof list === 'string') return h('div.prose', { html: md(list) });
    return h('div.pitfalls', list.map(p => h('div.pitfall',
      h('div.pitfall-wrong', h('span.pitfall-tag', '误区'), h('span', { html: RL.md.renderInline(p.wrong) })),
      h('div.pitfall-right', h('span.pitfall-tag', '正解'), h('div', { html: md(p.right) })))));
  }
  /** 3B1B-style animations and Manim clips for this chapter (data/scenes.js). */
  function sceneList(c) {
    const vids = ((RL.content.videos || {})[c.id] || []), anims = ((RL.content.scenes || {})[c.id] || []);
    if (!RL.scene || (!vids.length && !anims.length)) return null;
    return h('div.scene-list', vids.map(v => RL.scene.video(v)), anims.map(a => RL.scene.mount(a.id, a.props)));
  }
  function section(key, title, n, content) {
    return h('section.ch-section', { id: 'sec-' + key, dataset: { key } },
      h('h2.ch-section-title', h('span.ch-section-num', String(n)), title), content);
  }
  function renderChapter(c) {
    if (RL.terms) RL.terms.begin(c.id);
    try { renderChapterBody(c); } finally { if (RL.terms) RL.terms.end(); }
  }
  function renderChapterBody(c) {
    const i = indexOf(c.id), prev = chapters()[i - 1], next = chapters()[i + 1];
    const part = RL.content.parts.find(p => p.id === c.part);
    const done = mastered();
    const visited = new Set(store.get('visited', [])); visited.add(c.id); store.set('visited', [...visited]);
    store.set('last', c.id);
    document.title = c.title + ' · AI Planning 交互课程';
    document.getElementById('crumb').innerHTML = '';
    document.getElementById('crumb').put(h('span.crumb-week', part.week), ' ', h('span', '第 ' + numOf(c.id) + ' 章 · '), h('b', c.title), h('span#crumb-sec.crumb-sec'));

    const nav = h('nav.ch-secnav', { 'aria-label': '本章十个环节' }, SECTIONS.map(([k, t], n) =>
      h('a', { href: '#sec-' + k, dataset: { key: k }, onclick: e => { e.preventDefault(); const el = document.getElementById('sec-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, h('span', String(n + 1)), t)));

    // render the summary and goals first so the first annotated term follows reading order
    const summaryHTML = RL.md.renderInline(c.summary), goalsHTML = (c.goals || []).map(g => RL.md.renderInline(g));
    const formulas = [].concat(c.formulas || []);
    const extra = c.extra || {};
    const prose = k => h('div.prose', { html: md(c[k]) + (extra[k] ? md(extra[k]) : '') });
    const figures = [].concat(c.figure || []).map(fig => h('figure.teach-fig',
      h('img', { src: 'assets/figures/' + fig.src, alt: fig.alt || c.title, loading: 'lazy', tabindex: 0,
        onclick: e => e.currentTarget.closest('figure').classList.toggle('zoom'),
        onkeydown: e => { if (e.key === 'Enter') e.currentTarget.closest('figure').classList.toggle('zoom'); } }),
      h('figcaption', { html: RL.md.renderInline(fig.caption || '') })));
    const content = {
      what: prose('what'),
      why: prose('why'),
      intuition: h('div', prose('intuition'), sceneList(c), figures, (RL.content.stories || {})[c.id] ? h('div.story', h('div.story-title', '小故事 · 帮你记住（课件未讲，不考）'), h('div', { html: md(RL.content.stories[c.id]) })) : null),
      math: prose('math'),
      formula: h('div', c.formulaIntro ? h('div.prose', { html: md(c.formulaIntro) }) : null, formulas.map(f => RL.formula.mount(f)), extra.formula ? h('div.prose', { html: md(extra.formula) }) : null),
      example: h('div', (RL.content.subgoals || {})[c.id] ? h('div.subgoals', h('div.subgoals-title', '做这类题的步骤（换个数字也照这几步做）'),
        h('ol', RL.content.subgoals[c.id].map(t => h('li', { html: RL.md.renderInline(t) })))) : null, prose('example')),
      viz: h('div', c.viz && c.viz.guide ? h('div.prose.viz-guide', { html: md(c.viz.guide) }) : null,
        h('div#viz-inline-slot'), h('p.viz-wide-hint', '实验已固定在右侧。点右侧的“收起到正文”可以放回这里。')),
      compare: prose('compare'),
      pitfalls: renderPitfalls(typeof c.pitfalls === 'string' ? c.pitfalls : (c.pitfalls || []).concat(c.morePitfalls || [])),
      quiz: RL.quiz.mount((c.quiz || []).concat(c.moreQuiz || []), c.id)
    };
    const masteredBox = h('input', { type: 'checkbox', id: 'mastered' });
    masteredBox.checked = done.has(c.id);
    masteredBox.addEventListener('change', () => {
      const set = mastered(); masteredBox.checked ? set.add(c.id) : set.delete(c.id);
      store.set('mastered', [...set]); buildTOC(); updateProgress();
    });

    const main = clear(document.getElementById('main-inner'));
    main.put(
      h('header.ch-header',
        h('div.ch-kicker', h('span.badge', part.week), h('span', part.title)),
        h('h1.ch-title', c.title, c.en ? h('span.ch-en', c.en) : null),
        h('p.ch-summary', { html: summaryHTML }),
        c.goals ? h('div.ch-goals', h('b', '学完本章你应该能：'), h('ul', goalsHTML.map(x => h('li', { html: x })))) : null,
        c.prereq ? h('p.ch-prereq', { html: '先修：' + RL.md.renderInline(c.prereq) }) : null),
      nav,
      SECTIONS.map(([k, t], n) => section(k, t, n + 1, content[k])),
      h('div.ch-footer',
        noteBox(c),
        h('label.mastered', masteredBox, ' 我能不看网站，用自己的话讲清本章'),
        c.source ? h('details.source-note', h('summary', '课件出处（复习时不必打开）'), h('div', { html: md(c.source) })) : null,
        h('nav.ch-pager',
          prev ? h('a.pager.prev', { href: '#/c/' + prev.id }, h('small', '← 上一节'), h('span', prev.title)) : h('span'),
          next ? h('a.pager.next', { href: '#/c/' + next.id }, h('small', '下一节 →'), h('span', next.title)) : h('a.pager.next', { href: '#/review' }, h('small', '下一步 →'), h('span', '综合复习测验')))));
    mountViz(c);
    observeSections();
  }

  function observeSections() {
    if (sectionObserver) sectionObserver.disconnect();
    const label = document.getElementById('crumb-sec');
    const links = [...document.querySelectorAll('.ch-secnav a')];
    sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const key = e.target.dataset.key, idx = SECTIONS.findIndex(s => s[0] === key);
        links.forEach(a => a.classList.toggle('active', a.dataset.key === key));
        if (label) label.textContent = ' · ' + (idx + 1) + ' ' + SECTIONS[idx][1];
        document.getElementById('chapter-progress').style.width = ((idx + 1) / SECTIONS.length * 100) + '%';
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    document.querySelectorAll('.ch-section').forEach(s => sectionObserver.observe(s));
  }

  /* ---------- other pages ---------- */
  function setPage(title, crumb) {
    document.title = title + ' · AI Planning 交互课程';
    const c = document.getElementById('crumb'); c.innerHTML = ''; c.put(h('b', crumb || title));
    document.getElementById('chapter-progress').style.width = '0%';
    mountViz(null);
    return clear(document.getElementById('main-inner'));
  }
  function renderHome() {
    const main = setPage('课程总览', '课程总览');
    const last = store.get('last', null), done = mastered();
    main.put(
      h('header.home-hero',
        h('p.ch-kicker', h('span.badge', 'COMP90054'), h('span', 'AI Planning for Autonomy · Weeks 1–11')),
        h('h1', 'AI Planning for Autonomy：只靠这个网站学懂、复习'),
        h('p.lead', '从经典规划（W1–W5，P1–P11）到强化学习与 MCTS（W6–W11，第 1–38 章），顺序与课件一致。每章都按“是什么 → 为什么 → 直觉 → 定义 → 公式逐项 → 数值例子 → 交互 → 比较 → 误区 → Quiz”展开，课件里的每个数值例子都能在交互中复现。'),
        h('div.home-actions',
          h('a.btn.primary', { href: '#/c/' + (last || chapters()[0].id) }, last ? '继续学习：' + byId(last).title : '从 P1（经典规划）开始'),
          h('a.btn', { href: '#/c/c01' }, '直接进入强化学习（第 1 章）'),
          h('a.btn', { href: '#/formulas' }, '公式速查'), h('a.btn', { href: '#/review' }, '综合复习测验'))),
      h('section.home-start', h('h2', '第一次来先看这里'),
        h('div.home-start-grid',
          h('div.prose', { html: md(RL.content.firstTime || '') }),
          (() => { const box = h('div.home-gridcard'); const fig = h('div.quiz-ctx-fig'); RL.gridView.create(fig, RL.mdp.courseGrid(), { bigIds: true });
            box.put(h('b', '贯穿全课的 Gridworld'), fig, h('p', { html: RL.quiz.GRID_RULES })); return box; })())),
      h('section.home-map', h('h2', '知识路线'), h('div.chain', RL.content.chain.map((x, k) => [k ? h('span.chain-arrow', '→') : null,
        x.id ? h('a.chain-node', { href: '#/c/' + x.id }, x.label) : h('span.chain-node.muted', x.label)]))),
      h('section.home-parts', RL.content.parts.map(part => h('div.part-card',
        h('div.part-card-head', h('span.badge', part.week), h('h3', part.title)),
        h('p', part.intro),
        h('ol', chapters().filter(c => c.part === part.id).map(c => h('li', h('a', { href: '#/c/' + c.id }, (done.has(c.id) ? '✓ ' : '') + c.title))))))),
      h('section.home-how', h('h2', '怎么用'), h('div.prose', { html: md(RL.content.howTo) })));
  }
  function renderGlossary() {
    const main = setPage('术语表');
    const input = h('input.search', { type: 'search', placeholder: '搜索中文、英文或符号…', 'aria-label': '搜索术语' });
    const list = h('div.glossary');
    function draw() {
      const q = input.value.trim().toLowerCase();
      clear(list);
      RL.content.glossary.filter(g => !q || (g.zh + g.en + (g.sym || '') + g.def).toLowerCase().includes(q)).forEach(g => list.appendChild(
        h('div.gl-item', h('div.gl-head', h('b', g.en), h('span.gl-en', g.zh), g.sym ? h('span.gl-sym', { html: RL.dom.texHTML(g.sym) }) : null),
          h('div.gl-def', { html: md(g.def) }), g.ch ? h('a.gl-link', { href: '#/c/' + g.ch }, '→ 第 ' + numOf(g.ch) + ' 章 ' + byId(g.ch).title) : null)));
    }
    input.addEventListener('input', draw);
    main.put(h('h1', '术语表 Glossary'), h('p.lead', '考试用英文，所以每个术语先写英文、再写中文，附符号和一句话定义，并链接到讲解它的章节。'), input, list);
    draw();
  }
  function renderFormulas() {
    const main = setPage('公式速查表');
    main.put(h('h1', '公式速查表'), h('p.lead', '按课件顺序整理。每条公式后面写清楚每个符号的含义；需要逐项展开的，点链接回到对应章节的“公式逐项解释”。'));
    RL.content.formulaSheet.forEach(group => main.put(h('section.fs-group', h('h2', group.title),
      group.items.map(it => h('div.fs-item', h('div.fs-name', it.name, it.ch ? h('a.fs-link', { href: '#/c/' + it.ch }, '第 ' + numOf(it.ch) + ' 章') : null),
        h('div.fs-tex', { html: RL.dom.texHTML(it.tex, true) }), it.note ? h('div.fs-note', { html: md(it.note) }) : null)))));
  }
  function renderReview() {
    const main = setPage('综合复习测验');
    const kinds = ['全部', '概念判断', '公式计算', '算法比较', '轨迹推导', 'Q 值更新', 'On/Off-policy'];
    let kind = '全部', week = 'all', scope = 'all';
    const holder = h('div');
    function draw() {
      const pool = [];
      chapters().forEach(c => {
        if (week !== 'all' && c.part !== week) return;
        const done = store.get('quiz:' + c.id, {});
        (c.quiz || []).concat(c.moreQuiz || []).forEach((q, i) => {
          if (kind !== '全部' && q.kind !== kind) return;
          if (scope === 'todo' && done[i]) return;
          if (scope === 'wrong' && !(done[i] && !done[i].correct)) return;
          pool.push({ q, c, i });
        });
      });
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const pick = pool.slice(0, 12);
      clear(holder).put(h('p.muted', pool.length ? '本轮从 ' + pool.length + ' 道题中随机抽取 ' + pick.length + ' 道。题目答案记入各章进度。' : (scope === 'wrong' ? '这个范围内没有上次答错的题。' : '这个范围内没有符合条件的题。')),
        pick.map(({ q, c, i }) => h('div.review-item', h('a.review-src', { href: '#/c/' + c.id }, '来自第 ' + numOf(c.id) + ' 章 · ' + c.title),
          RL.quiz.mount([q], c.id, [i]).querySelector('.quiz-card'))));
    }
    main.put(h('h1', '综合复习测验'), h('p.lead', '按周、题型抽题：概念判断、公式计算、算法比较、给定 trajectory 推导、给定 Q 值判断 update、识别 on-policy / off-policy。可以只抽没做过或上次答错的题。'),
      h('div.viz-row', h('span.muted', '范围'), RL.dom.segmented([{ value: 'all', label: '全部周' }].concat(RL.content.parts.map(p => ({ value: p.id, label: p.week }))), week, v => { week = v; draw(); }, '周')),
      h('div.viz-row', h('span.muted', '题型'), RL.dom.segmented(kinds.map(k => ({ value: k, label: k })), kind, v => { kind = v; draw(); }, '题型')),
      h('div.viz-row', h('span.muted', '筛选'), RL.dom.segmented([{ value: 'all', label: '全部题' }, { value: 'todo', label: '没做过' }, { value: 'wrong', label: '上次答错' }], scope, v => { scope = v; draw(); }, '筛选'),
        h('button.btn', { type: 'button', onclick: draw }, '换一组')), holder);
    draw();
  }

  /* ---------- router ---------- */
  function route() {
    const hash = location.hash || '#/';
    const m = hash.match(/^#\/c\/([\w-]+)/);
    if (m && byId(m[1])) renderChapter(byId(m[1]));
    else if (hash.startsWith('#/glossary')) renderGlossary();
    else if (hash.startsWith('#/formulas')) renderFormulas();
    else if (hash.startsWith('#/review')) renderReview();
    else if (hash.startsWith('#/c/')) renderHome();
    else if (hash.startsWith('#sec-')) return; // in-page anchors
    else renderHome();
    markActiveTOC(); updateProgress();
    document.body.classList.remove('toc-open');
    const scroller = document.getElementById('main');
    if (!hash.startsWith('#sec-')) { scroller.scrollTop = 0; root.scrollTo(0, 0); }
  }

  function init() {
    applyTheme(store.get('theme', null));
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    let font = store.get('font', 0); applyFont(font);
    document.getElementById('font-toggle').addEventListener('click', () => { font = (font + 1) % FONT_SIZES.length; store.set('font', font); applyFont(font); });
    document.getElementById('toc-search').addEventListener('input', e => search(e.target.value));
    document.getElementById('toc-results').addEventListener('click', e => { if (e.target.closest('a')) { document.getElementById('toc-search').value = ''; search(''); } });
    document.getElementById('export-notes').addEventListener('click', exportNotes);
    document.getElementById('toc-toggle').addEventListener('click', () => document.body.classList.toggle('toc-open'));
    document.getElementById('scrim').addEventListener('click', () => document.body.classList.remove('toc-open'));
    root.addEventListener('rl:progress', updateProgress);
    root.addEventListener('hashchange', route);
    document.addEventListener('keydown', e => {
      if (!(e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) return;
      const m = (location.hash || '').match(/^#\/c\/([\w-]+)/); if (!m) return;
      const target = chapters()[indexOf(m[1]) + (e.key === 'ArrowRight' ? 1 : -1)];
      if (target) location.hash = '#/c/' + target.id;
    });
    buildTOC(); route();
  }
  RL.app = { init, buildTOC };
  document.addEventListener('DOMContentLoaded', init);
})(window);
