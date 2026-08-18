const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'floox-search-results.html');
let html = fs.readFileSync(file, 'utf8');

// Remove previous planner repair blocks so this build step is deterministic.
html = html.replace(/<style id="flooxPlannerTheme">[\s\S]*?<\/style>\s*/g, '');
html = html.replace(/<script id="flooxPlannerMount">[\s\S]*?<\/script>\s*/g, '');
html = html.replace(/\\n<style>\\n\/\* FLOOX PLANNER POLISH \*\/[\s\S]*?<\/style>\\n<\/style>/g, '');

const css = `<style id="flooxPlannerTheme">
/* Floox planner: same dark glass language as the discovery page */
.floox-planner{
  width:min(1100px,100%);
  margin:42px auto 0;
  padding:28px 30px 30px;
  position:relative;
  text-align:left;
  border:1px solid rgba(255,255,255,.11);
  border-radius:24px;
  background:
    radial-gradient(circle at 8% 0%,rgba(255,92,0,.10),transparent 34%),
    radial-gradient(circle at 92% 100%,rgba(255,45,120,.08),transparent 38%),
    rgba(255,255,255,.028);
  box-shadow:0 20px 55px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.035);
  overflow:hidden;
}
.floox-planner:before{
  content:"";position:absolute;left:0;right:0;top:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--o),var(--p),transparent);
}
.floox-planner > h2,.floox-planner > h3,.floox-planner h2,.floox-planner h3{
  color:#fff;font-family:'Clash Display',sans-serif;font-weight:700;letter-spacing:-.9px;
}
.floox-planner h2{font-size:clamp(1.55rem,2.4vw,2rem);line-height:1.08;margin:0}
.floox-planner p{margin:7px 0 20px;color:var(--muted);font-size:.82rem;line-height:1.55}
.floox-planner .fxm-form{
  display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;
  align-items:end;margin:0;padding:0;
}
.floox-planner .floox-filter-field{grid-column:span 3;min-width:0}
.floox-planner .floox-filter-field.full{grid-column:span 9}
.floox-planner .floox-filter-label{
  display:flex;align-items:center;gap:7px;margin:0 0 7px;
  color:rgba(255,255,255,.48);font-size:.62rem;font-weight:900;
  letter-spacing:.09em;text-transform:uppercase;
}
.floox-planner .floox-filter-icon{
  width:22px;height:22px;display:grid;place-items:center;flex:0 0 22px;
  border:1px solid rgba(255,255,255,.10);border-radius:7px;
  background:linear-gradient(135deg,rgba(255,92,0,.16),rgba(255,45,120,.12));
  color:#ff9a62;font-size:.72rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
}
.floox-planner .fxm-input{
  width:100%;height:48px;box-sizing:border-box;padding:0 14px;
  border:1px solid rgba(255,255,255,.12)!important;border-radius:13px!important;
  outline:0;background:rgba(255,255,255,.055)!important;color:#fff!important;
  font-family:'Cabinet Grotesk',sans-serif;font-size:.78rem;font-weight:600;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.025);
  transition:border-color .2s,background .2s,box-shadow .2s,transform .2s;
}
.floox-planner .fxm-input::placeholder{color:rgba(255,255,255,.38)}
.floox-planner .fxm-input:focus{
  border-color:rgba(255,92,0,.62)!important;background:rgba(255,255,255,.075)!important;
  box-shadow:0 0 0 3px rgba(255,92,0,.09),inset 0 1px 0 rgba(255,255,255,.03);
}
.floox-planner .fxm-input[type=number]{appearance:textfield}
.floox-planner .fxm-input[type=number]::-webkit-inner-spin-button{opacity:.45}
.floox-planner .fxm-match-submit{
  grid-column:span 3;min-height:48px;border:0;border-radius:13px;
  padding:0 18px;background:linear-gradient(135deg,var(--o),var(--p));color:#fff;
  font-family:'Cabinet Grotesk',sans-serif;font-size:.76rem;font-weight:900;
  white-space:nowrap;box-shadow:0 8px 24px rgba(255,92,0,.22);
  transition:transform .2s,box-shadow .2s,filter .2s;
}
.floox-planner .fxm-match-submit:hover{transform:translateY(-2px);filter:saturate(1.08);box-shadow:0 12px 30px rgba(255,92,0,.30)}
.floox-planner .fxm-match-submit:active{transform:translateY(0)}
.floox-planner .fxm-note{border:1px solid rgba(255,255,255,.09)!important;background:rgba(255,255,255,.035)!important;color:var(--muted)!important;border-radius:13px!important}
.floox-planner #fxmMatches{margin-top:16px!important}
@media(max-width:1000px){
  .floox-planner{margin-left:0;margin-right:0}
  .floox-planner .floox-filter-field,.floox-planner .floox-filter-field.full{grid-column:span 6}
  .floox-planner .fxm-match-submit{grid-column:span 6}
}
@media(max-width:700px){
  .floox-planner{margin-top:32px;padding:22px 18px}
  .floox-planner .fxm-form{grid-template-columns:1fr}
  .floox-planner .floox-filter-field,.floox-planner .floox-filter-field.full,.floox-planner .fxm-match-submit{grid-column:1/-1}
}
</style>`;
html = html.replace('</head>', `${css}\n</head>`);

const js = `<script id="flooxPlannerMount">
(function(){
  function findPlanner(){
    const heading=[...document.querySelectorAll('h1,h2,h3,h4')].find(el=>
      (el.textContent||'').replace(/\\s+/g,' ').trim().startsWith('Plan the event, then find the talent')
    );
    if(!heading) return null;
    const form=document.querySelector('#fxmMatch') || [...document.querySelectorAll('form')].find(f=>
      f.querySelector('[name="eventType"]') && f.querySelector('[name="city"]') && f.querySelector('[name="genre"]')
    );
    if(!form) return null;
    let node=heading.parentElement;
    while(node && node !== document.body){
      if(node.contains(form)) return {heading,form,box:node};
      node=node.parentElement;
    }
    return null;
  }
  function decoratePlanner(){
    const found=findPlanner();
    if(!found) return false;
    const {heading,form,box}=found;
    box.classList.add('floox-planner');
    if(!form.dataset.flooxDecorated){
      const meta={
        eventType:['Event type','✦','Wedding, corporate, college…'],
        city:['Event city','⌖','Where is the event?'],
        genre:['Genre / vibe','♫','Bollywood, acoustic, Sufi…'],
        budget:['Budget','₹','Entertainment budget'],
        q:['Experience / requirements','✧','Describe what you are looking for']
      };
      [...form.querySelectorAll('.fxm-input')].forEach(input=>{
        const cfg=meta[input.name];
        if(!cfg || input.parentElement.classList.contains('floox-filter-field')) return;
        const wrap=document.createElement('div');
        wrap.className='floox-filter-field'+(input.name==='q'?' full':'');
        const label=document.createElement('label');
        label.className='floox-filter-label';
        label.innerHTML='<span class="floox-filter-icon">'+cfg[1]+'</span>'+cfg[0];
        input.parentNode.insertBefore(wrap,input);
        wrap.appendChild(label);wrap.appendChild(input);
        input.placeholder=cfg[2];
      });
      const submit=form.querySelector('button');
      if(submit){submit.classList.add('fxm-match-submit');submit.textContent='Find my best matches →'}
      form.dataset.flooxDecorated='1';
    }
    return true;
  }
  function start(){
    if(decoratePlanner()) return;
    const observer=new MutationObserver(function(){if(decoratePlanner()) observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),20000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
</script>`;
html = html.replace('</body>', `${js}\n</body>`);

fs.writeFileSync(file, html, 'utf8');
console.log('Floox planner filters themed and decorated.');
