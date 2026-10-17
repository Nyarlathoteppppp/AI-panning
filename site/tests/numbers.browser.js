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
    run('td', () => {
      click('走完这条 episode');
      const numberLine = host.querySelector('svg.chart');
      check(numberLine.textContent.includes('新估计 0.1000'), 'Updated estimate hidden near old estimate');
      // The actual terminal update: Q=0, reward=1, alpha=.1.
      check(numberLine.textContent.includes('target 1.0000'), 'Terminal TD target');
      for (const args of [[0,1,.1], [-1,-.9,-.99], [1,-1,0], [0,0,0], [0,1,1]]) {
        const svg = RL.vizUtil.numberLine(...args,-1,1); host.append(svg);
        const box = svg.getBoundingClientRect(), labels = [...svg.querySelectorAll('.label')];
        check(labels.length === 3, 'Missing estimate label');
        for (const label of labels) {
          const b = label.getBoundingClientRect();
          check(b.left >= box.left-1 && b.right <= box.right+1 && b.bottom <= box.bottom+1, 'Number-line label clipped');
        }
        check(new Set(labels.map(l=>l.getAttribute('y'))).size===3, 'Overlapping numeric labels');
        svg.remove();
      }
      // Undo must reproduce the earlier numerical state, even after changing alpha.
      click('上一步'); const before = [...host.querySelectorAll('annotation')].map(n=>n.textContent).join('|');
      slide(0,.5); click('走一步'); click('上一步');
      check([...host.querySelectorAll('annotation')].map(n=>n.textContent).join('|') === before, 'TD undo loses previous alpha');
    });
    run('mc', () => {
      click('处理完这条 episode');
      const snapshot = () => [...host.querySelectorAll('table')].map(t=>t.textContent).join('|');
      const first = snapshot();
      click('处理一步（从最后一步往前）'); click('← 上一步');
      check(snapshot() === first, 'MC undo changes return or counts');
      click('处理完这条 episode'); click('处理完这条 episode');
      const row = [...host.querySelectorAll('tbody tr')].find(r=>r.querySelector('td')?.textContent === 's1, Up');
      check(row && row.querySelectorAll('td')[1].textContent === '3', 'MC visit count');
      check(row.querySelectorAll('td')[2].textContent === '0.2406', 'MC three-episode mean');
    });
    run('reinforce', () => {
      const values = () => [...host.querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>Number(c.textContent.replace('−','-'))));
      for (const G of [-2,0,2]) {
        slide(0,G);
        const rows = values();
        check(Math.abs(rows.reduce((sum,r)=>sum+r[4],0))<.0002, 'Policy preference updates do not sum to zero');
        check(Math.abs(rows[1][4]-.1*G*2/3)<.000051, 'Selected-action gradient magnitude');
      }
      click('应用这次更新（h ← 新 h）');
      const probs = values().map(r=>r[2]);
      const expected = Math.exp(.2)/(2+Math.exp(.2));
      check(Math.abs(probs[1]-expected)<.000051, 'Softmax after update');
    });
    run('bandit', () => {
      const toggle = host.querySelector('input[type=checkbox]'); toggle.click();
      click('走 10 步');
      const bounds = () => {
        for (const svg of host.querySelectorAll('svg.chart')) {
          for (const line of svg.querySelectorAll('line')) {
            for (const name of ['x1','x2']) check(+line.getAttribute(name) <= 380, 'Future drift marker outside chart');
          }
          for (const curve of svg.querySelectorAll('polyline')) for (const p of curve.getAttribute('points').split(' ')) {
            const [x,y] = p.split(',').map(Number);
            check(x >= 34 && x <= 372 && y >= 7.99 && y <= 148.01, 'Reward curve outside plot');
          }
        }
      };
      bounds(); click('跑完 500 步'); bounds();
      click('对比五种策略'); bounds();
      check(host.textContent.includes('120 次独立运行'), 'Missing comparison');
      toggle.click();
      check(!host.textContent.includes('120 次独立运行'), 'Stale comparison after drift changes');
      // Exercise early, noisy rewards under several reproducible reset seeds.
      for (let i=0; i<20; i++) { click('重置'); click('走 10 步'); bounds(); }
    });
    run('policyeval', () => {
      click('做 1 轮'); click('做 1 轮');
      click('显示精确解（线性方程）');
      check(host.textContent.includes('格子当前显示：精确解'), 'Exact view not identified');
      check([...host.querySelectorAll('button')].some(b=>b.textContent==='返回迭代值 V_k' && b.getAttribute('aria-pressed')==='true'), 'Toggle state missing');
      click('做 1 轮');
      check(host.textContent.includes('格子当前显示：第 3 轮迭代值'), 'Sweep still shows exact solution');
      click('直到收敛');
      for (let i=0;i<12;i++) click('做 1 轮');
      const chart = host.querySelector('svg.chart');
      for (const curve of chart.querySelectorAll('polyline')) for (const point of curve.getAttribute('points').split(' ')) {
        const y = Number(point.split(',')[1]); check(Number.isFinite(y) && y>=7.99 && y<=130.01, 'Converged residual leaves chart');
      }
      // Known residuals must occupy the positions implied by displayed decade ticks.
      const testChart = RL.vizUtil.lineChart([{values:[.8,.08,0],color:'blue'}],{log:true});
      const points = testChart.querySelector('polyline').getAttribute('points').split(' ').map(p=>Number(p.split(',')[1]));
      check(Math.abs(points[0]-(8-Math.log10(.8)/8*122))<1e-9, 'Log tick and coordinate disagree');
      check(Math.abs(points[1]-points[0]-122/8)<1e-9 && points[2]===130, 'Log decade spacing or zero floor');
      check([...testChart.querySelectorAll('text')].some(t=>t.textContent==='≤1e-8'), 'Clamped zero not disclosed');
    });
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
