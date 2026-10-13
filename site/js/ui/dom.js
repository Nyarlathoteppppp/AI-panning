/* Small DOM helpers shared by the UI and every visualiser. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};

  /** h('div.card#id', {onclick, style, ...attrs}, children...) */
  function h(spec, attrs, ...children) {
    const m = spec.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i) || [];
    const node = document.createElement(m[1] || 'div');
    (m[2] || '').replace(/([.#])([\w-]+)/g, (_, kind, name) => {
      if (kind === '.') node.classList.add(name); else node.id = name;
    });
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else node.setAttribute(k, v === true ? '' : v);
    }
    append(node, children);
    return node;
  }
  function append(node, children) {
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...children) {
    const node = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    }
    children.flat(Infinity).forEach(c => c != null && node.appendChild(c instanceof Node ? c : document.createTextNode(String(c))));
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  /** Element.append that also flattens arrays (used via node.put(...)). */
  if (!Element.prototype.put) Element.prototype.put = function (...children) { return append(this, children); };

  /** Number formatting used everywhere: fixed decimals, unicode minus, no "-0". */
  function fmt(x, d) {
    if (x == null || Number.isNaN(x)) return '—';
    const digits = d == null ? 3 : d;
    let str = Number(x).toFixed(digits);
    if (/^-0\.?0*$/.test(str)) str = str.slice(1);
    return str.replace('-', '−');
  }

  /** Labelled range slider. onInput receives the numeric value. */
  function slider(label, { min, max, step, value, format, onInput }) {
    const out = h('output.slider-value', format ? format(value) : String(value));
    const input = h('input', { type: 'range', min, max, step, value, 'aria-label': label });
    input.addEventListener('input', () => { const v = parseFloat(input.value); out.textContent = format ? format(v) : String(v); onInput && onInput(v); });
    const wrap = h('label.slider', h('span.slider-label', label), input, out);
    wrap.set = v => { input.value = v; out.textContent = format ? format(v) : String(v); };
    wrap.input = input;
    return wrap;
  }
  /** Segmented control. options: [{value, label}] */
  function segmented(options, value, onChange, label) {
    const group = h('div.segmented', { role: 'radiogroup', 'aria-label': label || '' });
    const buttons = options.map(o => h('button', { type: 'button', role: 'radio', 'aria-checked': String(o.value === value), onclick: () => select(o.value, true) }, o.label));
    function select(v, fire) {
      options.forEach((o, i) => buttons[i].setAttribute('aria-checked', String(o.value === v)));
      if (fire) onChange(v);
    }
    append(group, buttons);
    group.select = v => select(v, false);
    return group;
  }
  function button(label, onClick, cls) { return h('button' + (cls ? '.' + cls.trim().split(/\s+/).join('.') : ''), { type: 'button', onclick: onClick }, label); }

  /** Render a TeX string into a node (inline by default). */
  function tex(src, display) {
    const span = h(display ? 'div.math-display' : 'span.math-inline');
    try { root.katex.render(src, span, { displayMode: !!display, throwOnError: false, strict: 'ignore', trust: c => c.command === '\\htmlClass' }); }
    catch (e) { span.textContent = src; }
    return span;
  }
  function texHTML(src, display) {
    try { return root.katex.renderToString(src, { displayMode: !!display, throwOnError: false, strict: 'ignore', trust: c => c.command === '\\htmlClass' }); }
    catch (e) { return src; }
  }

  /** Safe localStorage wrapper. */
  const store = {
    get(key, fallback) { try { const v = root.localStorage.getItem('rl90054:' + key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(key, value) { try { root.localStorage.setItem('rl90054:' + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } }
  };

  RL.dom = { h, s, append, clear, fmt, slider, segmented, button, tex, texHTML, store };
})(window);
