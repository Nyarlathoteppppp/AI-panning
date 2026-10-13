/* Exercise the rendered labs, including parameter changes and terminal samples. */
(() => {
  const button = document.createElement('button'); button.textContent = 'Check lab numbers';
  document.querySelector('#extra').before(button);
  button.onclick = () => {
    const errors = [], passed = []; let host;
    const check = (v, msg) => { if (!v) throw new Error(msg); };
    const click = text => {
      const b = [...host.querySelectorAll('button')].find(b => b.textContent === text);
      check(b, 'Missing button: ' + text); b.click();
    };
    const slide = (i, value) => {
      const input = host.querySelectorAll('input[type=range]')[i];
      input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const run = (id, test) => {
      host = RL.dom.h('div', { style: { width: '800px', maxWidth: '100%' } });
      document.querySelector('#gallery').prepend(host); let dispose;
      try { dispose = RL.viz.get(id).mount(host); test(); check(!host.querySelector('.katex-error'), 'KaTeX error'); passed.push(id); }
      catch(e) { errors.push(id + ': ' + e.message); }
      finally { if (typeof dispose === 'function') dispose(); host.remove(); }
    };
    run('valueiter', () => {
      click('直到 max|Δ| < ε');
      check(host.textContent.includes('是（< ε）'), 'Default threshold not reached');
      slide(0, -6);
      check(!host.textContent.includes('是（< ε）'), 'Threshold change leaves stale convergence status');
      click('直到 max|Δ| < ε');
      check(host.textContent.includes('是（< ε）'), 'Tighter threshold not reached');
    });
    run('nstep', () => {
      // Independent finite-episode arithmetic: rewards 0,0,0,0,1 and nonterminal V=.5.
      click('V 全为 0.5');
      for (let t = 0; t < 5; t++) for (const lambda of [0, .5, 1]) for (let n = 1; n <= 6; n++) {
        slide(0, t); slide(1, n); slide(2, lambda);
        const rem = 5-t, rows = [...host.querySelectorAll('tbody tr')];
        let total = 0, weight = 0;
        rows.forEach((row, i) => {
          const cells = row.querySelectorAll('td'), k = i+1;
          const expected = k < rem ? .5 * .9 ** k : .9 ** (rem-1);
          const w = k < rem ? (1-lambda)*lambda**i : lambda**i;
          check(Math.abs(Number(cells[3].textContent)-expected) <= .000051, `return t=${t}, n=${k}`);
          check(Math.abs(Number(cells[4].textContent)-w) <= .000051, `weight t=${t}, lambda=${lambda}`);
          total += expected*w; weight += w;
        });
        check(rows.length === rem && Math.abs(weight-1)<1e-12, 'Incomplete lambda weights');
        const formulas = [...host.querySelectorAll('annotation')].map(x=>x.textContent);
        check(formulas[1].endsWith(total.toFixed(4)), 'Lambda return display');
        const gn = n < rem ? .5 * .9 ** n : .9 ** (rem-1);
        check(formulas[0].endsWith(gn.toFixed(4)), 'Selected n-step return display');
      }
    });
    run('linear', () => {
      click('执行课件的一次更新');
      check(host.textContent.includes('(0.0200, 0.0400)'), 'Method 1 weights');
      check([...host.querySelectorAll('annotation')].some(x=>x.textContent.endsWith('0.8032')), 'Method 1 Q backup');
      click('Method 2'); click('执行课件的一次更新');
      const row = [...host.querySelectorAll('tbody tr')].find(r=>r.querySelector('td').textContent === 's10');
      check(row.querySelectorAll('td')[2].textContent === '0.1444', 'Method 2 prediction');
      click('用 200 条 episode 训练');
      check(!/\b(NaN|Infinity)\b/.test(host.textContent), 'Non-finite linear training');
    });
    run('dqn', () => {
      const geometry = () => {
        const svg = host.querySelector('svg.chart'), box = svg.getBoundingClientRect();
        for (const text of svg.querySelectorAll('text')) {
          const b = text.getBoundingClientRect();
          check(b.left >= box.left-1 && b.right <= box.right+1, 'Network label clipped: '+text.textContent+' '+JSON.stringify({left:b.left,right:b.right,boxLeft:box.left,boxRight:box.right,viewBox:svg.getAttribute("viewBox")}));
        }
        for (const text of svg.querySelectorAll('.nn-text')) {
          const right = text.getAttribute('text-anchor') === 'start';
          check(getComputedStyle(text).textAnchor === (right ? 'start' : 'end'), 'CSS overrides label anchor');
        }
      };
      geometry();
      // Replay off exposes every actual terminal transition rather than random buffer samples.
      const toggle = host.querySelector('input[type=checkbox]'); toggle.click();
      let terminal = false, nonterminal = false;
      for (let i=0; i<250 && !(terminal && nonterminal); i++) {
        click('训练 1 步');
        const f = host.querySelector('annotation').textContent;
        if (f.includes('terminal')) {
          terminal = true; check(/^Y = r = -?1/.test(f) && !f.includes('max'), 'Terminal target bootstraps');
        } else { nonterminal = true; check(f.includes('max'), 'Nonterminal target missing bootstrap'); }
      }
      check(terminal && nonterminal, 'Did not exercise both target branches');
      click('训练 3000 步'); geometry();
      check(!/\b(NaN|Infinity)\b/.test(host.textContent), 'Non-finite training output');
    });
    document.querySelector('#extra').textContent = `${errors.length ? 'FAIL' : 'PASS'} numeric labs: ${passed.join(', ')}\n${errors.join('\n')}`;
  };
})();
