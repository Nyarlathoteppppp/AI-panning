/* Step-by-step formula explainer.
 * spec = { title, latex, parts: [{key, label, color, text}], steps?: [{keys, text}] }
 * In `latex`, wrap each part with \htmlClass{fx-KEY}{...}. Parts may nest (e.g. a TD target
 * contains the reward and the bootstrap estimate). */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};
  const { h, texHTML } = RL.dom;

  function mount(spec) {
    const formula = h('div.fx-formula', { html: texHTML(spec.latex, true) });
    const steps = spec.steps || spec.parts.map(p => ({ keys: [p.key], text: p.text, label: p.label }));
    const partByKey = Object.fromEntries(spec.parts.map(p => [p.key, p]));
    const explain = h('div.fx-explain', { 'aria-live': 'polite' });
    const counter = h('span.fx-counter');
    let index = -1;

    function highlight(keys) {
      formula.querySelectorAll('.fx-hl').forEach(n => { n.classList.remove('fx-hl'); n.style.removeProperty('--fx'); });
      chips.forEach(c => c.classList.toggle('active', keys.includes(c.dataset.key)));
      keys.forEach(k => {
        const color = 'var(--c-' + (partByKey[k] ? partByKey[k].color : 'blue') + ')';
        formula.querySelectorAll('.fx-' + k).forEach(n => { n.classList.add('fx-hl'); n.style.setProperty('--fx', color); });
      });
    }
    function show(i) {
      index = i;
      if (i < 0) {
        highlight([]);
        explain.innerHTML = '<p class="muted">点击“下一步”逐项展开，或直接点击下面任一部分。</p>';
        counter.textContent = '0 / ' + steps.length;
        return;
      }
      const st = steps[i];
      highlight(st.keys);
      const names = st.keys.map(k => partByKey[k]).filter(Boolean)
        .map(p => '<span class="fx-tag" style="--fx: var(--c-' + p.color + ')">' + RL.md.renderInline(p.label) + '</span>').join(' ');
      explain.innerHTML = '<div class="fx-step-head">' + names + '</div>' + RL.md.render(st.text || '');
      counter.textContent = (i + 1) + ' / ' + steps.length;
    }
    const chips = spec.parts.map(p => h('button.fx-chip', {
      type: 'button', dataset: { key: p.key }, style: { '--fx': 'var(--c-' + p.color + ')' },
      onclick: () => { const i = steps.findIndex(st => st.keys.length === 1 && st.keys[0] === p.key); if (i >= 0) show(i); else { index = -1; highlight([p.key]); explain.innerHTML = RL.md.render(p.text || ''); } }
    }, h('span', { html: RL.md.renderInline(p.label) })));

    const node = h('div.fx',
      spec.title ? h('div.fx-title', { html: RL.md.renderInline(spec.title) }) : null,
      formula,
      h('div.fx-controls',
        h('button.btn', { type: 'button', onclick: () => show(Math.max(-1, index - 1)) }, '← 上一步'),
        h('button.btn.primary', { type: 'button', onclick: () => show(index + 1 >= steps.length ? -1 : index + 1) }, '下一步 →'),
        counter,
        h('button.btn.ghost', { type: 'button', onclick: () => show(-1) }, '复位')),
      h('div.fx-chips', chips),
      explain);
    show(-1);
    return node;
  }

  RL.formula = { mount };
})(window);
