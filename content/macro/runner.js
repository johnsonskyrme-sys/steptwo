import {getCssPath} from '../../lib/css-path.js';

function sleep(ms){return new Promise(r => setTimeout(r,ms));}
async function queryVisible(selectors,timeout=3000){
  const end=Date.now()+timeout;
  while(Date.now()<end){
    for(const sel of selectors){
      const el=document.querySelector(sel);
      if(el && el.offsetParent) {return el;}
    }
    await sleep(100);
  }
  throw new Error('Element not found');
}

function waitDomStable(timeout=4000){
  return new Promise((res,rej) => {
    let lastMut = Date.now();
    const obs=new MutationObserver(() => lastMut=Date.now());
    obs.observe(document.body,{childList:true,subtree:true});
    const chk=() => {
      if(Date.now()-lastMut>500){obs.disconnect();res();} else if(Date.now()>start+timeout){obs.disconnect();rej(new Error('domStable timeout'));} else {setTimeout(chk,100);}
    };
    const start=Date.now(); chk();
  });
}
function waitUrlChange(timeout=10000,startUrl=location.href){
  return new Promise((res,rej) => {
    const end=Date.now()+timeout;
    const tick=() => {
      if(location.href!==startUrl) {return res();}
      if(Date.now()>end) {return rej(new Error('urlChange timeout'));}
      setTimeout(tick,200);
    };tick();
  });
}
export async function runMacro(steps){
  for(const step of steps){
    const deadline=Date.now()+10000;
    const guard=async(p) => {
      const res=await Promise.race([p,new Promise((_,rej) => setTimeout(() => rej(new Error('step timeout')),10000))]);
      return res;
    };
    switch(step.type){
      case 'delay': await sleep(step.ms); break;
      case 'click':{
        const el=await guard(queryVisible(step.selector));
        el.dispatchEvent(new MouseEvent('click',{bubbles:true,button:step.button||0}));
        break;}
      case 'scroll':{ window.scrollBy({top:step.deltaY||0,behavior:'smooth'}); await sleep(400); break;}
      case 'input':{
        const el=await guard(queryVisible(step.selector));
        el.focus(); el.value=step.value;
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        break;}
      case 'waitUntil':{
        if(step.selector) {await guard(queryVisible(step.selector,step.timeout||8000));} else if(step.condition==='domStable') {await guard(waitDomStable(step.timeout));} else if(step.condition==='urlChange') {await guard(waitUrlChange(step.timeout));}
        break;}
      default: console.warn('Unknown step',step);
    }
  }
}