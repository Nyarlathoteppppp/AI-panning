/* Desktop search/planning regressions: real controls, rendered tables and SVGs. */
(() => {
  const trigger = document.createElement('button'); trigger.textContent = 'Check search labs';
  document.querySelector('#extra').before(trigger);
  trigger.onclick = () => {
    let host, cases = 0; const passed=[], errors=[];
    const check=(yes,msg)=>{if(!yes)throw Error(msg);};
    const num=s=>Number(s.replace('−','-'));
    const buttons=()=>[...host.querySelectorAll('button')];
    const click=(label)=>{const b=buttons().find(b=>b.textContent===label);check(b,'Missing '+label);b.click();cases++;};
    const slide=(i,v)=>{const x=host.querySelectorAll('input[type=range]')[i];x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}));};
    const rows=(i=0)=>[...host.querySelectorAll('table')[i].querySelectorAll('tbody tr')].map(r=>[...r.querySelectorAll('td')].map(c=>c.textContent));
    const health=()=>{
      check(!host.querySelector('.katex-error'),'Formula error');
      check(!host.textContent.includes('undefined')&&!host.textContent.includes('NaN'),'Invalid displayed number');
      for(const el of host.querySelectorAll('svg *'))for(const a of el.attributes)check(!/NaN|Infinity/.test(a.value),'Invalid SVG geometry');
    };
    const run=(id,fn)=>{host=RL.dom.h('div',{style:{width:'900px'}});document.querySelector('#gallery').prepend(host);let dispose;
      try{dispose=RL.viz.get(id).mount(host,{});fn();health();passed.push(id);}catch(e){errors.push(id+': '+e.message);}finally{if(typeof dispose==='function')dispose();host.remove();}};
    run('searchtrace',()=>{
      const graphs=[...host.querySelectorAll('[role=radiogroup]')][0];
      const names=[...graphs.querySelectorAll('button')].map(b=>b.textContent);
      for(const graph of names)for(const algo of ['BrFS','DFS','Uniform cost','IDS','GBFS','A*','加权 A*','Hill-climbing','Enforced HC']){
        click(graph);click(algo);click('走到底');health();
        const svg=host.querySelector('svg');
        for(const edge of svg.querySelectorAll('[marker-end]'))check(svg.querySelector(edge.getAttribute('marker-end').slice(4,-1)),'Missing directed arrow marker');
        const end=host.textContent;click('← 上一步');click('下一步 →');check(host.textContent===end,'Backward/forward changes final result');
      }
    });
    run('hmaxadd',()=>{
      for(const problem of ['Australia','Logistics'])for(const mode of ['h_max（取最大）','h_add（求和）'])for(const goal of ['t(A), p(D)','t(D), p(D)']){
        click(problem);click(mode);click(goal);click('直接填完');health();
        const r=rows(1)[0].map(num);check(r[0]<=r[1]&&r[1]<=r[4]&&r[2]>=r[1]&&r[3]>=r[1],'Heuristic inequalities');
        if(problem==='Australia')check(r[0]===5.5&&r[1]===10&&r[3]===13&&r[4]===20,'Australia costs');
        click('重置');check(host.querySelectorAll('table').length===1,'Final table persists after reset');
      }
    });
    run('rplan',()=>{for(const p of ['Australia','Logistics'])for(const mode of ['h_add','h_max'])for(const goal of ['t(A), p(D)','t(D), p(D)']){click(p);click(mode);click(goal);click('做完');health();check(host.textContent.includes('RPlan ='),'Missing relaxed plan');click('重置');check(!host.textContent.includes('RPlan ='),'Stale relaxed plan');}});
    run('iwtrace',()=>{for(const map of ['3×3 空地','3×3，中间是墙'])for(const k of ['IW(1)','IW(2)']){click(map);click(k);click('做完');health();if(k==='IW(2)')check(host.textContent.includes('找到目标'),'IW(2) fails reachable grid');}});
    run('ucb',()=>{for(let d=1;d<=6;d++){click('决策 '+d);for(const c of [0,.5,3]){slide(0,c);for(const tau of [.01,2]){slide(2,tau);const r=rows(),N=r.reduce((s,x)=>s+num(x[2]),0);r.forEach(x=>check(Math.abs(num(x[4])-(num(x[1])+c*Math.sqrt(Math.log(N)/num(x[2]))))<.00011,'UCB arithmetic'));for(const column of [6,7])check(Math.abs(r.reduce((s,x)=>s+num(x[column]),0)-1)<.0021,'Action probabilities do not sum to one');health();}}}});
    run('puct',()=>{for(const rule of ['PUCT（带 prior）','UCT（无 prior）'])for(const prior of ['偏向较差的 a₁','偏向最好的 a₂','均匀']){click(rule);click(prior);click('模拟 200 次');const r=rows(),N=r.reduce((s,x)=>s+num(x[3]),0);check(N===200,'Visit total');r.forEach(x=>{const n=num(x[3]),q=num(x[4]),p=num(x[2]);if(!n)return;const expect=q+(rule.startsWith('PUCT')?1.5*p*Math.sqrt(N)/(1+n):1.5*Math.sqrt(Math.log(N)/n));check(Math.abs(num(x[5])-expect)<.025,'Selection score');});health();}});
    run('mctsstep',()=>{
      click('完成本次迭代');const snap=()=>[...host.querySelectorAll('svg,table,dl')].map(x=>x.textContent).join('|');const first=snap();
      click('← 上一阶段');click('下一阶段');check(snap()===first,'Phase restoration');
      slide(0,.2);slide(1,5);click('完成本次迭代');click('← 上一阶段');click('← 上一阶段');click('← 上一阶段');check(snap()===first,'Replay changed historical parameters');
      click('再跑 200 次');const dd=[...host.querySelectorAll('dd')].map(x=>x.textContent);check(dd[0]==='201'&&dd[1]==='201','Root counts disagree with iteration count');health();
    });
    run('mctsgrid',()=>{
      for(const mode of ['复用子树（课件）','丢弃旧树']) {
        click('Reset');click(mode);slide(2,1.41);slide(1,60);click('运行 MCTS');
        const caption=host.querySelector('svg').textContent;
        slide(2,3);slide(1,1);click('最多访问');
        check(host.querySelector('svg').textContent===caption,'Search caption uses future parameters with old statistics');
        click('执行动作（会打滑）');click('运行 MCTS');
        const d=host.querySelector('dd').textContent,ns=Number(d.match(/^\d+/)[0]);
        if(mode==='丢弃旧树')check(ns===200,'Discarded tree retains old visits');
        else {const m=d.match(/= (\d+).*\+ (\d+)/);if(m)check(ns===Number(m[1])+Number(m[2]),'Carried plus new visit mismatch');}
        health();
      }
    });
    run('hprops',()=>{
      const names=[...host.querySelector('[role=radiogroup]').querySelectorAll('button')].map(b=>b.textContent);
      for(const name of names){click(name);const input=host.querySelector('input[type=number]');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));health();check(rows(1)[0][2].includes('不满足'),'Infinite heuristic at solvable start marked safe');input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));health();}
    });
    run('stripsplay',()=>{
      for(const relaxed of [false,true]){
        click(relaxed?'删除松弛（忽略 Del）':'真实 STRIPS');
        const pr=RL.vizUtil.PLAN_PROBLEMS.blocks.p;let state=new Set(pr.init),cost=0;
        const solution=RL.plan.optimalCost(pr,relaxed).plan;
        for(const name of solution){const a=pr.actions.find(a=>a.name===name);click(name);if(!relaxed)a.del.forEach(f=>state.delete(f));a.add.forEach(f=>state.add(f));cost+=a.cost||1;
          check([...host.querySelectorAll('span.pill')].map(n=>n.textContent).sort().join('|')===[...state].sort().join('|'),'STRIPS add/delete state mismatch');
          check(host.querySelectorAll('dd')[1].textContent===String(cost),'Action cost mismatch');health();}
        check(host.textContent.includes('目标全部满足'),'Plan did not achieve goals');
      }
    });
    run('puzzle8',()=>{
      const verify=()=>{const tiles=buttons().filter(b=>/^\d$/.test(b.textContent)),vals=rows().map(r=>parseInt(r[3],10));check(vals[0]<=vals[1]&&vals[1]<=vals[2],'Heuristic bound');health();return tiles;};
      verify();for(const tile of ['2','1','4','7','8']){click(tile);verify();}
      check(rows().every(r=>parseInt(r[3],10)===0),'Solved board has nonzero distance');
      click('恢复示例状态');check(rows()[0][3]==='5','Reset misplaced count');
    });
    run('selfplay',()=>{
      for(const counts of [[48,266,9,15],[300,300,0,0],[0,1,0,0]])for(const tau of [.05,1,3]){
        counts.forEach((n,i)=>slide(i,n));slide(4,tau);const r=rows();const m=Math.max(...counts),w=counts.map(n=>(n/m)**(1/tau)),z=w.reduce((a,b)=>a+b,0);
        r.forEach((x,i)=>check(Math.abs(num(x[3])-w[i]/z)<.000051,'Visit policy arithmetic'));click('让 p_θ 等于 π_t');health();
      }
      [0,1,2,3].forEach(i=>slide(i,0));check(!host.querySelector('table')&&host.textContent.includes('没有定义'),'Zero visits produce fake target');
    });
    document.querySelector('#extra').textContent=(errors.length?'FAIL':'PASS')+': '+cases+' control actions; '+passed.join(', ')+'\n'+errors.join('\n');
  };
})();
