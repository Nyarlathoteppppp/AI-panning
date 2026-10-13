/* Quiz engine.
 * question = { kind, q, type: 'single'|'multi'|'numeric', options?, answer, tol?, explain, why?: [per-option text] }
 * Results are stored per chapter so progress survives reloads. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};
  const { h, store } = RL.dom;
  const render = s => RL.md.render(s || '');
  const inline = s => RL.md.renderInline(s || '');

  function results(chapterId) { return store.get('quiz:' + chapterId, {}); }
  function saveResult(chapterId, i, correct) {
    const r = results(chapterId); r[i] = { correct, at: Date.now() }; store.set('quiz:' + chapterId, r);
    root.dispatchEvent(new CustomEvent('rl:progress'));
  }


  /* ---------- context figure: questions that name Gridworld states get a small map ---------- */
  const GRID_RULES = '4 列 × 3 行，坐标 (x, y) 原点在左下角；灰格 (1,1) 是墙。状态从左下角 s1 开始，按行从左到右、从下往上编号，跳过墙。<b>进入</b> s11 得 +1，<b>进入</b> s7 得 −1（两者终止，之后不再有奖励，价值为 0），其余每步奖励 0。' +
    '选一个方向后：0.8 按所选方向移动，0.1 向所选方向的左边滑，0.1 向右边滑（例：选 Up 时左滑 = 向西、右滑 = 向东；选 Right 时左滑 = 向北、右滑 = 向南）；撞墙或出界留在原地。γ = 0.9。';
  const ALIASED_RULES = '上排五格 w1、g1、w2、g2、w3；w1、w3 下方是骷髅（−1），w2 下方是钱袋（+1）。两个灰格 g1、g2 看起来一样，policy 在它们上面必须相同。动作是确定性的，Up 或撞到边界原地不动。γ = 0.9。';
  function questionText(q) { return [q.q].concat(q.options || []).join(' '); }
  function contextFigure(question) {
    if (question.ctx === false || !RL.gridView) return null;
    const text = questionText(question);
    const aliased = question.ctx === 'aliased' || /Aliased|灰格|\bg[12]\b|\bw[123]\b/.test(text);
    if (aliased && RL.vizUtil && RL.vizUtil.aliasedSVG) {
      const fig = h('div.quiz-ctx-fig');
      fig.appendChild(RL.vizUtil.aliasedSVG({ w1: {}, grey: {}, w2: {}, w3: {} }));
      return h('div.quiz-ctx', fig, h('div.quiz-ctx-text', h('b', 'Aliased Gridworld'), h('p', { html: ALIASED_RULES })));
    }
    const robot = question.ctx === 'robot' || (question.ctx == null && /机器人|robot/i.test(text));
    if (robot && RL.vizUtil && RL.vizUtil.robotSVG) {
      const R = question.rewards || { A: 101, B: 99 }, fig = h('div.quiz-ctx-fig');
      fig.appendChild(RL.vizUtil.robotSVG({ h: question.h || [0, 0], last: null }, R));
      return h('div.quiz-ctx', fig, h('div.quiz-ctx-text', h('b', '机器人例子'), h('p', { html: '只有一个决策状态 s<sub>0</sub>：动作 A 确定地到 s<sub>t1</sub>，奖励 ' + R.A + '；动作 B 确定地到 s<sub>t2</sub>，奖励 ' + R.B + '。到达后立即终止，所以每条 episode 只有一步，G<sub>0</sub> 就是这一步的奖励。policy 是两个偏好 h(s<sub>0</sub>,A)、h(s<sub>0</sub>,B) 的 softmax（图中 h 为题目的初始值）。' })));
    }
    const ids = new Set();
    for (const m of text.matchAll(/s_\{?(\d{1,2})\}?/g)) { const n = +m[1]; if (n >= 1 && n <= 11) ids.add(n); }
    if (!ids.size && question.ctx !== 'grid') return null;
    const g = RL.mdp.courseGrid(), fig = h('div.quiz-ctx-fig'), hl = {};
    ids.forEach(n => { hl[n] = 'blue'; });
    RL.gridView.create(fig, g, { bigIds: true, initial: { highlight: hl } });
    return h('div.quiz-ctx', fig, h('div.quiz-ctx-text', h('b', '题目用到的 Gridworld'), ids.size ? h('span.muted', '（蓝框：题目提到的 ' + [...ids].sort((a, b) => a - b).map(n => 's' + n).join('、') + '）') : null, h('p', { html: GRID_RULES })));
  }

  function card(question, i, chapterId, onDone) {
    const type = question.type || (Array.isArray(question.answer) ? 'multi' : typeof question.answer === 'number' && !question.options ? 'numeric' : 'single');
    const name = 'q-' + chapterId + '-' + i;
    const feedback = h('div.quiz-feedback', { 'aria-live': 'polite' });
    let inputs = [], numeric = null;
    let body;
    if (type === 'numeric') {
      numeric = h('input.quiz-number', { type: 'text', inputmode: 'decimal', placeholder: '输入数值，如 0.72', 'aria-label': '答案' });
      body = h('div.quiz-numeric', numeric, question.unit ? h('span', question.unit) : null);
    } else {
      body = h('div.quiz-options', question.options.map((opt, k) => {
        const input = h('input', { type: type === 'multi' ? 'checkbox' : 'radio', name, value: k });
        inputs.push(input);
        return h('label.quiz-option', input, h('span.quiz-letter', String.fromCharCode(65 + k)), h('span.quiz-text', { html: inline(opt) }));
      }));
    }
    function check() {
      let correct;
      if (type === 'numeric') {
        const v = parseFloat(String(numeric.value).replace('−', '-'));
        if (Number.isNaN(v)) { feedback.innerHTML = '<p class="warn-text">请先输入一个数值。</p>'; return; }
        correct = Math.abs(v - question.answer) <= (question.tol == null ? 0.005 : question.tol);
      } else {
        const chosen = inputs.filter(x => x.checked).map(x => +x.value);
        if (!chosen.length) { feedback.innerHTML = '<p class="warn-text">请先选择一个选项。</p>'; return; }
        const ans = [].concat(question.answer).sort();
        correct = chosen.length === ans.length && chosen.sort().every((v, k) => v === ans[k]);
        inputs.forEach((x, k) => {
          const label = x.closest('.quiz-option');
          label.classList.toggle('is-answer', ans.includes(k));
          label.classList.toggle('is-wrong', x.checked && !ans.includes(k));
        });
      }
      const per = (question.why && type !== 'numeric')
        ? '<ul class="quiz-why">' + question.options.map((o, k) => question.why[k] ? '<li><b>' + String.fromCharCode(65 + k) + '</b>：' + inline(question.why[k]) + '</li>' : '').join('') + '</ul>' : '';
      const ansText = type === 'numeric' ? '<p>参考答案：<b>' + question.answer + '</b></p>' : '';
      feedback.className = 'quiz-feedback ' + (correct ? 'ok' : 'bad');
      feedback.innerHTML = '<p class="quiz-verdict">' + (correct ? '✓ 正确' : '✗ 还不对') + '</p>' + ansText + render(question.explain) + per;
      saveResult(chapterId, i, correct);
      onDone && onDone();
    }
    function reset() {
      inputs.forEach(x => { x.checked = false; x.closest('.quiz-option').classList.remove('is-answer', 'is-wrong'); });
      if (numeric) numeric.value = '';
      feedback.className = 'quiz-feedback'; feedback.innerHTML = '';
    }
    const prev = results(chapterId)[i];
    return h('div.quiz-card',
      h('div.quiz-head', h('span.quiz-kind', question.kind || '概念判断'), h('span.quiz-num', 'Q' + (i + 1)),
        prev ? h('span.quiz-prev' + (prev.correct ? '.ok' : '.bad'), prev.correct ? '上次答对' : '上次答错') : null),
      contextFigure(question),
      h('div.quiz-q', { html: render(question.q) }),
      body,
      h('div.quiz-actions', h('button.btn.primary', { type: 'button', onclick: check }, '提交并看解释'), h('button.btn.ghost', { type: 'button', onclick: reset }, '重做')),
      feedback);
  }

  function mount(questions, chapterId, indices) {
    const idx = k => (indices ? indices[k] : k);
    const summary = h('div.quiz-summary');
    function refresh() {
      const r = results(chapterId), mine = questions.map((_, k) => r[idx(k)]).filter(Boolean);
      summary.textContent = '已作答 ' + mine.length + ' / ' + questions.length + '，答对 ' + mine.filter(x => x.correct).length;
    }
    const node = h('div.quiz', summary, questions.map((q, k) => card(q, idx(k), chapterId, refresh)));
    refresh();
    return node;
  }

  RL.quiz = { mount, results, GRID_RULES };
})(window);
