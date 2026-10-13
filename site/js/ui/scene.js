/* 3Blue1Brown-style step animations ("scenes").
 *
 * A scene is a dark SVG canvas plus a list of keyframes. Every keyframe is a plain object of
 * animatable properties, keyed "objectName.attr". The player tweens between neighbouring
 * keyframes with Manim's `smooth` easing, so "下一步" animates forward, "上一步" animates back,
 * and any frame can be reached instantly. A formula strip and a caption under the canvas change
 * with the frame; symbols keep one colour everywhere (see SYM).
 *
 * RL.scene.register(id, {
 *   title, intro,                       // shown in the header
 *   w, h,                               // viewBox size (default 720 × 340)
 *   params: [{ key, label, min, max, step, value, format }],   // optional sliders, rebuild on change
 *   colors: { key: hex },               // permanent colour of \htmlClass{fx-key}{...} parts in frame.tex
 *   stages: ['…', '…'] or params => [...], // process strip above the canvas; frame.stage = index (inherits)
 *   build(st, params) → frames          // st = stage (see makeStage); frames[0] is the starting picture
 * })
 * frame = { set: { 'obj.attr': value }, cap: markdown, tex: latex (inherits), hl: [keys],
 *           dur: ms, timing: { obj or 'obj.attr': [start, end] } (fractions of the tween), pulse: [obj],
 *           fn: { 'obj.attr': q => value } (custom path while playing forward; q = eased progress 0..1) }
 *
 * Special attributes: op (opacity), text, num (number shown with obj digits/prefix/suffix), tex
 * (KaTeX label), draw (0..1 stroke reveal), tx/ty/sc/rot (transform), color (text/tex colour).
 * Numbers, #rrggbb colours and same-shaped path strings (d, points) are interpolated. */
(function (root) {
  'use strict';
  const RL = root.RL = root.RL || {};
  const { h, s, clear, fmt, slider, texHTML } = RL.dom;

  const PAL = {
    bg: '#14161b', panel: '#1b1e25', grid: '#2c313b', line: '#4a505c', text: '#ece9e1', dim: '#8e939c',
    blue: '#58C4DD', teal: '#5CD0B3', green: '#83C167', yellow: '#F4D345', gold: '#F0AC5F',
    red: '#FC6255', maroon: '#C55F73', purple: '#9A72AC', pink: '#D147BD', orange: '#FF862F', grey: '#888888', white: '#ECECEC'
  };
  /** One colour per symbol across every scene (and every Manim video). */
  const SYM = {
    V: PAL.blue, Q: PAL.teal, r: PAL.yellow, gamma: PAL.green, G: PAL.gold, alpha: PAL.purple,
    delta: PAL.red, target: PAL.pink, pi: PAL.orange, w: PAL.purple,
    g: PAL.blue, h: PAL.gold, f: PAL.green, open: PAL.orange, closed: PAL.blue
  };

  const defs = {};
  function register(id, def) { defs[id] = def; }

  /* ---------------------------------------------------------------- interpolation */
  const sigmoid = x => 1 / (1 + Math.exp(-x));
  const smooth = t => (sigmoid(10 * (t - 0.5)) - sigmoid(-5)) / (sigmoid(5) - sigmoid(-5)); // Manim's rate function
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  function mixHex(a, b, t) {
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return '#' + pa.map((x, i) => Math.round(x + (pb[i] - x) * t).toString(16).padStart(2, '0')).join('');
  }
  const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
  function lerp(a, b, t, attr) {
    if (a === undefined || a === b) return b;
    if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
    if (isHex(a) && isHex(b)) return mixHex(a, b, t);
    if (typeof a === 'string' && typeof b === 'string' && (attr === 'd' || attr === 'points')) {
      const na = a.match(NUM), nb = b.match(NUM);
      if (na && nb && na.length === nb.length && a.replace(NUM, '#') === b.replace(NUM, '#')) {
        let i = 0;
        return b.replace(NUM, () => { const x = +na[i] + (+nb[i] - +na[i]) * t; i++; return x.toFixed(2); });
      }
    }
    return t < 0.5 ? a : b;
  }

  /* ---------------------------------------------------------------- stage */
  function apply(el, attr, v) {
    switch (attr) {
      case 'op': el.style.opacity = v; el.style.visibility = v <= 0.002 ? 'hidden' : ''; break;
      case 'text': el.textContent = v; break;
      case 'num': {
        el.__num = v;
        let t = fmt(v, el.__digits);
        if (el.__trim && t.includes('.')) t = t.replace(/\.?0+$/, '');
        el.textContent = (el.__pre || '') + t + (el.__suf || '');
        break;
      }
      case 'tex': if (el.__tex !== v) { el.__tex = v; el.__box.innerHTML = texHTML(v, false); } break;
      case 'color': if (el.__box) el.__box.style.color = v; else el.setAttribute('fill', v); break;
      case 'draw': el.__draw = v; el.setAttribute('pathLength', '1'); el.style.strokeDasharray = '1 1'; el.style.strokeDashoffset = String(1 - v); break;
      case 'tx': case 'ty': case 'sc': case 'rot': {
        const t = el.__t = el.__t || { tx: 0, ty: 0, sc: 1, rot: 0 };
        t[attr] = v;
        el.setAttribute('transform', 'translate(' + t.tx + ' ' + t.ty + ') rotate(' + t.rot + ') scale(' + t.sc + ')');
        break;
      }
      default: if (v == null) el.removeAttribute(attr); else el.setAttribute(attr, v);
    }
  }
  /** Current value of an attribute as the engine would write it (used to fill in keys missing from base). */
  function readAttr(el, attr) {
    switch (attr) {
      case 'op': return el.style.opacity === '' ? 1 : +el.style.opacity;
      case 'text': return el.textContent;
      case 'num': return el.__num != null ? el.__num : 0;
      case 'tex': return el.__tex;
      case 'color': return el.__box ? (el.__box.style.color || PAL.text) : (el.getAttribute('fill') || PAL.text);
      case 'draw': return el.__draw != null ? el.__draw : 1;
      case 'tx': case 'ty': case 'rot': return el.__t ? el.__t[attr] : 0;
      case 'sc': return el.__t ? el.__t.sc : 1;
      default: {
        const v = el.getAttribute(attr);
        if (v == null) return null;
        return v.trim() !== '' && !isNaN(+v) ? +v : v;
      }
    }
  }
  function makeStage(svg, W, H) {
    const objs = {}, base = {};
    function put(name, el, attrs, parent) {
      if (objs[name]) throw new Error('scene object defined twice: ' + name);
      (parent ? (typeof parent === 'string' ? objs[parent] : parent) : svg).appendChild(el);
      objs[name] = el;
      for (const [k, v] of Object.entries(attrs || {})) { base[name + '.' + k] = v; apply(el, k, v); }
      return el;
    }
    const st = {
      W, H, svg, objs, base, PAL, SYM,
      /** Any SVG element. attrs may use the special attributes listed at the top. */
      add(name, tag, attrs, parent) { return put(name, s(tag), attrs, parent); },
      group(name, attrs, parent) { return put(name, s('g'), attrs, parent); },
      /** Plain SVG text. o: { size, color, anchor, weight, op, parent } */
      text(name, x, y, str, o) {
        o = o || {};
        const el = s('text', { 'font-size': o.size || 16, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'middle', 'font-weight': o.weight || 400, class: 'sc-text' });
        return put(name, el, Object.assign({ x, y, text: str, fill: o.color || PAL.text }, o.op != null ? { op: o.op } : {}, o.set || {}), o.parent);
      },
      /** Animated number. o: { digits, trim (drop trailing zeros), prefix, suffix, size, color, anchor, weight } */
      num(name, x, y, value, o) {
        o = o || {};
        const el = s('text', { 'font-size': o.size || 16, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'middle', 'font-weight': o.weight || 500, class: 'sc-text sc-num' });
        el.__digits = o.digits == null ? 2 : o.digits; el.__pre = o.prefix || ''; el.__suf = o.suffix || ''; el.__trim = !!o.trim;
        return put(name, el, Object.assign({ x, y, num: value, fill: o.color || PAL.text }, o.op != null ? { op: o.op } : {}), o.parent);
      },
      /** KaTeX label centred on (x, y). o: { w, h, size, color, op, parent } */
      tex(name, x, y, latex, o) {
        o = o || {};
        const w = o.w || 160, hh = o.h || 40;
        const fo = s('foreignObject', { width: w, height: hh, class: 'sc-fo' });
        const box = document.createElement('div');
        box.className = 'sc-tex';
        box.style.fontSize = (o.size || 18) + 'px';
        box.style.height = hh + 'px';
        fo.appendChild(box); fo.__box = box;
        return put(name, fo, Object.assign({ x: x - w / 2, y: y - hh / 2, tex: latex, color: o.color || PAL.text }, o.op != null ? { op: o.op } : {}), o.parent);
      }
    };
    return st;
  }

  /* ---------------------------------------------------------------- helpers for scene authors */
  const util = {
    /** Arrow as one path with a fixed shape, so it can be tweened with set({'a.d': util.arrow(...)}). */
    arrow(x1, y1, x2, y2, head) {
      const hl = head == null ? 9 : head, a = Math.atan2(y2 - y1, x2 - x1), sp = 0.45;
      const p = (ang) => (x2 - hl * Math.cos(a - ang)).toFixed(2) + ' ' + (y2 - hl * Math.sin(a - ang)).toFixed(2);
      return 'M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' L ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' M ' + p(sp) + ' L ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' L ' + p(-sp);
    },
    /** Quadratic curve arrow bending by `bend` pixels (same tweenable shape as arrow). */
    curve(x1, y1, x2, y2, bend, head) {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const cx = mx - (y2 - y1) / len * bend, cy = my + (x2 - x1) / len * bend;
      const hl = head == null ? 9 : head, a = Math.atan2(y2 - cy, x2 - cx), sp = 0.45;
      const p = (ang) => (x2 - hl * Math.cos(a - ang)).toFixed(2) + ' ' + (y2 - hl * Math.sin(a - ang)).toFixed(2);
      return 'M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' Q ' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ' ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' M ' + p(sp) + ' L ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' L ' + p(-sp);
    },
    /** Merge several partial frames' `set` objects. */
    merge(...objs) { return Object.assign({}, ...objs); },
    /** {prefix+i+'.'+attr: f(i)} for i in 0..n-1 */
    each(n, f) { const out = {}; for (let i = 0; i < n; i++) Object.assign(out, f(i)); return out; },
    fmt
  };

  /* ---------------------------------------------------------------- player */
  const reduceMotion = () => { try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  function mount(id, props) {
    const def = defs[id];
    if (!def) return h('div.scene.scene-missing', '缺少动画：' + id);
    const W = def.w || 720, H = def.h || 340;
    const params = {};
    (def.params || []).forEach(p => { params[p.key] = (props && props[p.key] != null) ? props[p.key] : p.value; });
    Object.assign(params, props || {});

    const svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'sc-svg', role: 'img', 'aria-label': def.title || id });
    const stageLabels = () => (typeof def.stages === 'function' ? def.stages(params) : def.stages) || [];
    const stageBar = def.stages ? h('ol.sc-stages') : null;
    const renderStages = () => { if (stageBar) clear(stageBar).put(stageLabels().map((t, k) => h('li', { html: RL.md.renderInline(t), dataset: { k } }))); };
    const formula = h('div.sc-formula');
    const caption = h('div.sc-caption', { 'aria-live': 'polite' });
    const counter = h('span.sc-counter');
    const dots = h('div.sc-dots');
    const intro = def.intro ? h('div.sc-intro') : null;
    const playBtn = h('button.sc-btn', { type: 'button', onclick: () => (timer ? stop() : play()) }, '▶ 自动播放');
    let st, frames, states, index = 0, raf = 0, timer = 0, lastTex = null, tweening = false, finishTween = null, pulseGen = 0, pulsing = [];

    function build() {
      cancel();
      clear(svg);
      svg.appendChild(s('rect', { x: 0, y: 0, width: W, height: H, fill: PAL.bg }));
      st = makeStage(svg, W, H);
      frames = def.build(st, params) || [];
      if (typeof def.stages === 'function') renderStages();
      // every key any frame touches must have a frame-0 value, or stepping back cannot restore it:
      // read it from the freshly built DOM (still in its initial state at this point)
      frames.forEach(f => Object.keys(f.set || {}).forEach(k => {
        if (k in st.base) return;
        const i = k.lastIndexOf('.'), el = st.objs[k.slice(0, i)];
        if (el) st.base[k] = readAttr(el, k.slice(i + 1));
      }));
      if (!frames.length) frames = [{}];
      let cur = Object.assign({}, st.base);
      let tex = null, stage = -1;
      states = frames.map(f => {
        cur = Object.assign({}, cur, f.set || {});
        if (f.tex !== undefined) tex = f.tex;
        if (f.stage !== undefined) stage = f.stage;
        f.__tex = tex; f.__stage = stage;
        return cur;
      });
      clear(dots).put(frames.map((_, i) => h('button.sc-dot', { type: 'button', 'aria-label': '第 ' + (i + 1) + ' 步', onclick: () => { stop(); show(i, true); } })));
    }
    function applyState(state, keys) {
      (keys || Object.keys(state)).forEach(k => {
        const i = k.lastIndexOf('.'), el = st.objs[k.slice(0, i)];
        if (el) apply(el, k.slice(i + 1), state[k]);
      });
    }
    function cancel() { if (raf) cancelAnimationFrame(raf); raf = 0; if (finishTween) { const f = finishTween; finishTween = null; f(); } tweening = false; }
    function tween(from, to, dur, timing, fns, done) {
      cancel();
      const keys = Object.keys(to).filter(k => from[k] !== to[k] || (fns && fns[k]));
      const finish = cancelled => { applyState(to, keys); tweening = false; raf = 0; if (!cancelled && done) done(); };
      if (!dur || reduceMotion() || !keys.length) { finish(); return; }
      const windows = keys.map(k => { const name = k.slice(0, k.lastIndexOf('.')); return (timing && (timing[k] || timing[name])) || [0, 1]; });
      const t0 = performance.now();
      tweening = true;
      finishTween = () => { if (raf) cancelAnimationFrame(raf); finish(true); };
      const step = now => {
        if (!svg.isConnected) { raf = 0; tweening = false; finishTween = null; return; }
        const p = Math.min(1, (now - t0) / dur);
        keys.forEach((k, j) => {
          const [a, b] = windows[j];
          const q = Math.max(0, Math.min(1, (p - a) / Math.max(1e-6, b - a)));
          const i = k.lastIndexOf('.'), el = st.objs[k.slice(0, i)];
          const e = smooth(q);
          if (el) apply(el, k.slice(i + 1), fns && fns[k] ? fns[k](e) : lerp(from[k], to[k], e, k.slice(i + 1)));
        });
        if (p < 1) raf = requestAnimationFrame(step);
        else { finishTween = null; finish(); }
      };
      raf = requestAnimationFrame(step);
    }
    function renderText(i) {
      const f = frames[i];
      if (f.__tex !== lastTex) {
        lastTex = f.__tex;
        formula.innerHTML = f.__tex ? texHTML(f.__tex, true) : '';
        formula.style.display = f.__tex ? '' : 'none';
      }
      Object.entries(def.colors || {}).forEach(([k, c]) => formula.querySelectorAll('.fx-' + k).forEach(n => { n.style.color = c; }));
      formula.querySelectorAll('.sc-hl').forEach(n => { n.classList.remove('sc-hl'); n.style.removeProperty('--hl'); });
      (f.hl || []).forEach(k => formula.querySelectorAll('.fx-' + k).forEach(n => { n.classList.add('sc-hl'); n.style.setProperty('--hl', (def.colors || {})[k] || PAL.yellow); }));
      caption.innerHTML = f.cap ? RL.md.render(f.cap) : '';
      caption.classList.toggle('sc-aha', !!f.aha);
      if (stageBar) [...stageBar.children].forEach((li, k) => { li.classList.toggle('active', k === f.__stage); li.classList.toggle('done', k < f.__stage); });
      counter.textContent = (i + 1) + ' / ' + frames.length;
      [...dots.children].forEach((d, j) => { d.classList.toggle('done', j < i); d.classList.toggle('active', j === i); });
    }
    function pulse(i) {
      (frames[i].pulse || []).forEach(name => {
        const el = st.objs[name]; if (!el) return;
        if (el.__t || el.getAttribute('transform')) {
          // a CSS transform would replace the SVG transform attribute, so scale these in JS
          if (reduceMotion()) return;
          const t0 = performance.now(), base = el.__t ? el.__t.sc : 1, gen = pulseGen;
          if (!el.__t) el.__t = { tx: 0, ty: 0, sc: 1, rot: 0 };
          pulsing.push({ el, base });
          const step = now => {
            if (gen !== pulseGen) return;
            const p = Math.min(1, (now - t0) / 550);
            apply(el, 'sc', base * (1 + 0.22 * Math.sin(Math.PI * p)));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        } else {
          el.classList.remove('sc-pulse'); void el.getBoundingClientRect(); el.classList.add('sc-pulse');
        }
      });
    }
    function stopPulses() { pulseGen++; pulsing.forEach(({ el, base }) => apply(el, 'sc', base)); pulsing = []; }
    function show(i, animate, back) {
      stopPulses();
      if (back === undefined) back = i < index;
      i = Math.max(0, Math.min(frames.length - 1, i));
      const from = states[index], to = states[i], f = frames[back ? index : i];
      const dur = animate ? (back ? 0.45 : 1) * (f.dur || 900) * (Math.abs(i - index) === 1 ? 1 : 0.6) : 0;
      const adjacent = Math.abs(i - index) === 1 && !back;
      const timing = adjacent ? frames[i].timing : null, fns = adjacent ? frames[i].fn : null;
      index = i;
      renderText(i);
      tween(from, to, dur, timing, fns, () => { if (!back) pulse(i); });
    }
    function next() { if (index < frames.length - 1) show(index + 1, true); }
    function prev() { if (index > 0) show(index - 1, true, true); }
    function play() {
      if (index >= frames.length - 1) show(0, false);
      playBtn.textContent = '❚❚ 暂停';
      const loop = () => {
        if (!node.isConnected || index >= frames.length - 1) { stop(); return; }
        next();
        const f = frames[index];
        timer = setTimeout(loop, (f.dur || 900) + (f.hold != null ? f.hold : 1500 + Math.min(2500, (f.cap || '').length * 25)) + (f.aha ? 2000 : 0));
      };
      timer = setTimeout(loop, 300);
    }
    function stop() { if (timer) clearTimeout(timer); timer = 0; playBtn.textContent = '▶ 自动播放'; }

    const sliders = (def.params || []).map(p => slider(p.label, {
      min: p.min, max: p.max, step: p.step, value: params[p.key], format: p.format,
      onInput: v => { cancel(); params[p.key] = v; const keep = index; stop(); build(); index = Math.min(keep, frames.length - 1); applyState(states[index]); lastTex = null; renderText(index); }
    }));

    const node = h('div.scene', { tabindex: 0, onkeydown: e => {
      if (e.target.closest('input, button')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); prev(); }
      else if (e.key === ' ') { e.preventDefault(); timer ? stop() : play(); }
      else if (e.key === 'Escape' && node.classList.contains('sc-full')) toggleFull(node);
    } },
      h('div.sc-head', h('span.sc-badge', '动画'), h('b.sc-title', def.title || id), counter),
      intro,
      stageBar,
      h('div.sc-stage', svg),
      formula,
      caption,
      h('div.sc-controls',
        h('button.sc-btn', { type: 'button', onclick: () => { stop(); prev(); } }, '← 上一步'),
        h('button.sc-btn.primary', { type: 'button', onclick: () => { stop(); next(); } }, '下一步 →'),
        playBtn,
        h('button.sc-btn.ghost', { type: 'button', onclick: () => { stop(); show(0, false); } }, '↺ 重来'),
        h('button.sc-btn.ghost', { type: 'button', title: '全屏（手机横过来看更清楚）', onclick: () => toggleFull(node) }, '⛶ 全屏'),
        dots),
      sliders.length ? h('div.sc-params', sliders) : null);

    renderStages();
    build();
    applyState(states[0]);
    // intro and first caption are rendered after the chapter finished rendering, so they do not
    // take the chapter's "first occurrence" of a bilingual term away from the prose
    setTimeout(() => { if (intro) intro.innerHTML = RL.md.render(def.intro); renderText(0); }, 0);
    node.__scene = { next, prev, show: i => show(i, false), get index() { return index; }, get frames() { return frames; }, objs: () => st.objs };
    return node;
  }

  /** Native fullscreen where available, otherwise a fixed full-viewport overlay (iOS Safari). */
  function toggleFull(node) {
    const doc = document;
    if (doc.fullscreenElement === node) { doc.exitFullscreen(); return; }
    if (node.classList.contains('sc-full')) { node.classList.remove('sc-full'); doc.body.classList.remove('sc-noscroll'); return; }
    const fallback = () => { node.classList.add('sc-full'); doc.body.classList.add('sc-noscroll'); };
    if (node.requestFullscreen) node.requestFullscreen().catch(fallback); else fallback();
  }

  /** Manim-rendered clip in the same dark frame. v = { src, title, caption, poster } */
  function video(v) {
    return h('figure.scene.sc-video',
      h('div.sc-head', h('span.sc-badge', '视频'), h('b.sc-title', v.title || '')),
      h('video', { src: v.src, controls: true, playsinline: true, preload: 'metadata', poster: v.poster || null }),
      v.caption ? h('figcaption.sc-caption', { html: RL.md.render(v.caption) }) : null);
  }

  /** Mount every registered scene off-screen, step through all frames, and report problems. */
  function selfTest() {
    const out = [];
    const host = h('div', { style: { position: 'absolute', left: '-9999px', top: '0', width: '760px' } });
    document.body.appendChild(host);
    Object.keys(defs).forEach(id => {
      try {
        const node = mount(id); host.appendChild(node);
        const sc = node.__scene, objs = sc.objs();
        const missing = new Set();
        let errs = 0;
        sc.frames.forEach((f, i) => {
          Object.keys(f.set || {}).forEach(k => { if (!objs[k.slice(0, k.lastIndexOf('.'))]) missing.add(k); });
          sc.show(i);
          errs += node.querySelectorAll('.katex-error').length;
        });
        out.push({ id, frames: sc.frames.length, missing: [...missing], katexErrors: errs });
      } catch (e) { out.push({ id, error: String(e && e.stack || e) }); }
    });
    host.remove();
    return out;
  }

  /** Attach a process strip to a registered scene: stages = labels, map[i] = stage of frame i. */
  function setStages(id, stages, map) {
    const d = defs[id]; if (!d) return;
    const build = d.build;
    d.stages = stages;
    d.build = function (st, p) { const fr = build.call(this, st, p); map.forEach((k, i) => { if (fr[i] && fr[i].stage === undefined) fr[i].stage = k; }); return fr; };
  }

  /** Mark the frames that carry the key insight: autoplay pauses longer there and the caption is highlighted. */
  function setAha(id, list) {
    const d = defs[id]; if (!d) return;
    const build = d.build;
    d.build = function (st, p) { const fr = build.call(this, st, p); list.forEach(i => { const k = i < 0 ? fr.length + i : i; if (fr[k]) fr[k].aha = true; }); return fr; };
  }

  RL.scene = { register, mount, video, selfTest, setStages, setAha, defs, PAL, SYM, util };
})(window);
