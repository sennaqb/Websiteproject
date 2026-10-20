"use strict";
// The computer on your desk. Everything that used to be a menu lives here, in the world.
(function(){
const TABS=["Lot","Crew","Upgrades","Books"];
let tab="Lot",flashMsg="";
const el=id=>document.getElementById(id);
const isOpen=()=>el("pc").style.display==="flex";
const bar=(v,max)=>{const p=Math.max(0,Math.min(100,v/(max||100)*100)),col=p>=65?"var(--good)":p>=40?"var(--acc)":"var(--bad)";return `<div class=bar><i style="width:${p}%;background:${col}"></i></div>`};
const ACTS={repair,wholesale,upgrade,hire,fire,train};

function open(){
  if(document.pointerLockElement)document.exitPointerLock();
  flashMsg="";el("pc").style.display="flex";render();
}
function close(){el("pc").style.display="none";if(window.Game)Game.pcClosed()}
function flash(m){flashMsg=m;if(isOpen())render()}
function act(name,...args){flashMsg="";if(window.Sfx)Sfx.click();ACTS[name](...args);render()}
function setTab(t){tab=t;render()}
function price(id,v){setPrice(id,v);render()}

function render(){
  if(!isOpen())return;
  const wk=weekOf(S.day);
  let h=`<div class=pchead><div><b>BOB'S AUTO MART</b> · office terminal</div><div>Day ${S.day} · Bank <b>${$f(S.cash)}</b> of ${$f(GOAL)}</div></div>
  <div class=pctabs>${TABS.map(t=>`<button class="tab ${t===tab?"on":""}" onclick="PC.setTab('${t}')">${t}</button>`).join("")}<span style="flex:1"></span><button class=b onclick="PC.close()">Close (Esc)</button></div>
  ${flashMsg?`<div class=flash>${esc(flashMsg)}</div>`:""}<div class=pcbody>`;
  if(tab==="Lot"){
    h+=`<p class=dim>Bob's trucks keep these ${S.cap} spaces full every morning. The cars are his: you keep what's left after his cost. Set your asks, or fix a car up if you think it's worth it. Cars cost $6/day to keep on the lot.</p><div class=grid>`;
    h+=S.inv.map(c=>{const mv=marketValue(c),rc=repairCost(c);return `<div class=card><h3>${esc(label(c))}</h3><div class=dim>${c.body} · ${c.miles.toLocaleString()} mi · ${c.days}d on lot</div>
      <div class=row><span>Condition ${c.cond}% (${condLabel(c.cond)})</span></div>${bar(c.cond)}<div class=dim>Notes: ${esc(c.note)}</div>
      <div class=row><span>Bob's cost ${$f(c.cost)}</span><span>Worth ${$f(mv)}</span></div>
      <div>Ask: <input type=number step=100 value=${c.price} onchange="PC.price(${c.id},this.value)"></div>
      <div class=dim>Gross if sold at ask: <span class="${c.price-c.cost>=0?"good":"bad"}">${$f(c.price-c.cost)}</span></div>
      ${c.cond<100?`<button class=b onclick="PC.act('repair',${c.id})">Recondition ${$f(rc)}</button>`:""}
      <button class=b onclick="PC.act('wholesale',${c.id})">Wholesale ${$f(mv*.8)}</button></div>`}).join("")||"<p class=dim>The lot is empty. Bob's truck comes in the morning.</p>";
    h+="</div>";
  }
  if(tab==="Crew"){
    h+=`<p class=dim>Desks: ${S.crew.length}/${MAX_CREW}. Salespeople take 25% of front gross (minimum $50) plus a daily wage. Higher <b>close</b> means they land more deals alone. <b>Caves</b> is how often they give the car away.</p><div class=grid>`;
    h+=S.crew.map(c=>`<div class=card><h3>${esc(c.name)}</h3><div class=dim>${c.quirk==="pushy"?"Pushy: customers lose patience 40% faster":c.quirk==="spanish"?"Only speaks Spanish. Nobody understands him. Every deal comes to you.":"No bad habits you know of"}</div>
      <div class=row><span>Closes</span><span>${Math.round(c.skill*100)}</span></div>${bar(c.skill*100,65)}
      <div class=row><span>Caves</span><span>${Math.round(c.cave*100)}%</span></div>${bar(100-c.cave*100)}
      <div class=dim>Wage ${$f(wageOf(c))}/day</div>
      <button class=b onclick="PC.act('train',${c.id})" ${c.trained===S.day?"disabled":""}>Train $300</button><button class=b onclick="PC.act('fire',${c.id})">Fire $150</button></div>`).join("");
    h+=`</div><h2>Candidates</h2><div class=grid>`;
    h+=S.cands.map(c=>`<div class=card><h3>${esc(c.name)}</h3><div class=dim>${c.quirk==="pushy"?"Pushy":c.quirk==="spanish"?"Only speaks Spanish":"Seems fine"}</div>
      <div class=row><span>Closes</span><span>${Math.round(c.skill*100)}</span></div>${bar(c.skill*100,65)}
      <div class=row><span>Caves</span><span>${Math.round(c.cave*100)}%</span></div>${bar(100-c.cave*100)}
      <div class=dim>Wage ${$f(wageOf(c))}/day</div><button class=b onclick="PC.act('hire',${c.id})" ${S.crew.length>=MAX_CREW?"disabled":""}>Hire</button></div>`).join("")||"<p class=dim>Nobody applied today.</p>";
    h+="</div>";
  }
  if(tab==="Upgrades"){
    h+=`<div class=grid>`;
    h+=UPG.map(u=>{const lv=u.k==="cap"?(S.cap-12)/3:S[u.k],maxed=u.k==="cap"?S.cap>=u.max:S[u.k]>=u.max;
      return `<div class=card><h3>${u.n}</h3><div class=dim>${u.desc}</div><p>Level ${lv}</p>${maxed?"<b>Maxed</b>":`<button class=b onclick="PC.act('upgrade','${u.k}')">Buy ${$f(u.cost())}</button>`}</div>`}).join("");
    h+="</div>";
  }
  if(tab==="Books"){
    const got=S.profit-S.weekStart,q=quota(wk),pct=Math.min(100,netWorth()/GOAL*100);
    const wages=S.crew.reduce((s,c)=>s+wageOf(c),0);
    h+=`<div class=grid>
     <div class=card><h3>Your bank</h3><div style="font-size:22px">${$f(netWorth())}</div><div class=dim>Goal ${$f(GOAL)}</div>${bar(pct)}</div>
     <div class=card><h3>Bob's quota, week ${wk}</h3><div style="font-size:22px">${$f(Math.max(0,got))} <span class=dim>of ${$f(q)}</span></div>${bar(got,q)}<div class=dim>Strikes ${S.strikes}/2. Review is on day ${wk*7}.</div></div>
     <div class=card><h3>Daily costs</h3><div class=dim>Crew wages ${$f(wages)}<br>Overhead ${$f(40+S.inv.length*6+S.ad*30)}<br>Weekly rent ${$f(250+S.cap*20)}</div></div>
     <div class=card><h3>Today</h3><b>${esc(S.event.name)}</b><div class=dim>${esc(S.event.desc)}</div></div></div>
     <h2>Recent</h2><div class=logbox>${S.log.slice(0,14).map(l=>`<div>${esc(l)}</div>`).join("")}</div>`;
  }
  h+="</div>";
  el("pc").innerHTML=`<div class=pcbox>${h}</div>`;
}
window.PC={open,close,flash,act,setTab,price,render,isOpen};
})();
