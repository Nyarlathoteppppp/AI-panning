/* Real-DOM regression companion: open scenes.browser.html and click Run. */
(() => {
  const gallery = document.querySelector('#gallery'), results = document.querySelector('#results');
  const nodes = Object.keys(RL.scene.defs).map(id => {
    const node = RL.scene.mount(id); node.dataset.scene = id; gallery.append(node); return node;
  });
  const snapshot = node => JSON.stringify(Object.entries(node.__scene.objs()).map(([key, el]) => [key,
    [...el.attributes].map(a => [a.name, a.name === 'class' ? a.value.replace(/\s*sc-pulse/g, '') : a.name === 'style' ? [...el.style].sort().map(k => [k, el.style.getPropertyValue(k)]) : a.value]).filter(([k, v]) => k !== 'class' || v).sort(),
    el.textContent]));
  document.querySelector('#run').onclick = () => {
    const errors = [], clipped = new Set(); let frames = 0;
    for (const node of nodes) {
      const sc = node.__scene, id = node.dataset.scene;
      const direct = sc.frames.map((_, i) => { sc.show(i); frames++;
        const canvas = node.querySelector('.sc-svg'), box = canvas.getBoundingClientRect();
        for (const el of canvas.querySelectorAll('text, .sc-tex .katex-html')) {
          let visible = true;
          for (let p = el; p && p !== canvas; p = p.parentElement) {
            const style = getComputedStyle(p);
            if (+style.opacity < .01 || style.visibility === 'hidden') { visible = false; break; }
          }
          if (!visible) continue;
          const b = el.getBoundingClientRect();
          if (b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1)
            clipped.add(`${id} frame ${i}: ${el.textContent}`);
        }
        return snapshot(node); });
      for (let i = sc.frames.length - 1; i >= 0; i--) {
        sc.show(i);
        if (snapshot(node) !== direct[i]) errors.push(`${id}: reverse frame ${i} differs: ` + JSON.stringify(JSON.parse(snapshot(node)).filter((x,j) => JSON.stringify(x) !== JSON.stringify(JSON.parse(direct[i])[j])).slice(0,2)));
        if (node.querySelector('.katex-error')) errors.push(`${id}: formula render error at ${i}`);
      }
      // Jump through all frames from the last frame, not just to frame zero.
      for (let i = 0; i < sc.frames.length; i++) {
        sc.show(sc.frames.length - 1); sc.show(i);
        if (snapshot(node) !== direct[i]) errors.push(`${id}: seek frame ${i} differs`);
      }
      // Rebuild via real slider input while on a late frame, then restore its default.
      for (const input of node.querySelectorAll('.sc-params input')) {
        const value = input.value;
        for (const end of [input.min, input.max]) {
          input.value = end; input.dispatchEvent(new Event('input', { bubbles: true }));
          if (node.querySelector('.katex-error')) errors.push(`${id}: slider formula error`);
        }
        input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      sc.show(0);
      if (snapshot(node) !== direct[0]) errors.push(`${id}: slider rebuild did not restore default`);
      sc.show(sc.frames.length - 1);
    }
    results.textContent = `${errors.length ? 'FAIL' : 'PASS'}: ${nodes.length} scenes, ${frames} frames; reverse + arbitrary seek + KaTeX\n` + errors.join('\n') + '\nCanvas clipping: ' + clipped.size + '\n' + [...clipped].join('\n');
  };
  document.querySelector('#interrupt').onclick = async () => {
    const expected = nodes.map(n => { n.__scene.show(0); return snapshot(n); });
    for (const n of nodes) { n.__scene.next(); n.__scene.next(); n.__scene.prev(); }
    await new Promise(resolve => setTimeout(resolve, 80));
    for (const n of nodes) { n.__scene.next(); n.__scene.show(0); }
    await new Promise(resolve => setTimeout(resolve, 700));
    const failed = nodes.filter((n, i) => snapshot(n) !== expected[i]).map(n => n.dataset.scene);
    document.querySelector('#extra').textContent = failed.length ? 'FAIL interruptions: ' + failed.join(', ') : 'PASS: all 18 scenes restore after interrupted forward/back/reset';
  };
  document.querySelector('#viz').onclick = () => {
    const failures = [], seen = new Set();
    for (const chapter of RL.content.chapters) {
      const spec = chapter.viz; if (!spec || seen.has(spec.id)) continue;
      seen.add(spec.id);
      const host = RL.dom.h('div', { style: { width: '800px' } }); gallery.append(host);
      let dispose;
      try {
        dispose = RL.viz.get(spec.id).mount(host, spec.props || {});
        if (host.querySelector('.katex-error')) failures.push(spec.id + ': KaTeX error');
        for (const el of host.querySelectorAll('svg *')) for (const a of el.attributes)
          if (/\b(NaN|Infinity)\b/.test(a.value)) failures.push(spec.id + ': invalid geometry ' + a.name);
      } catch (e) { failures.push(spec.id + ': ' + e.message); }
      finally { if (typeof dispose === 'function') dispose(); host.remove(); }
    }
    document.querySelector('#extra').textContent = (failures.length ? 'FAIL' : 'PASS') + ': ' + seen.size + ' lab initial views; ' + failures.join('\n');
  };
})();
