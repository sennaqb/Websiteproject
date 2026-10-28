"use strict";
// Achievements: kept across save files (like Steam's), with a toast when one unlocks and a list on the title screen.
(function(){
const LIST=[
  ["first_sale","🚗","Welcome to the Car Business","Sell your first car."],
  ["sold_25","🏁","Moving Metal","The lot sells 25 cars."],
  ["sold_100","💯","Lot Lizard","The lot sells 100 cars."],
  ["quota","📈","Bob Is Pleased","Hit Bob's weekly number."],
  ["week4","🗓️","Lifer","Make it to week 4 without getting fired."],
  ["win","👑","Bargain Bob Who?","Win the game."],
  ["gun","🔫","Highly Persuasive","Close a deal at gunpoint."],
  ["cry","😭","Waterworks","Cry in front of customers 10 times."],
  ["wh","🔥","Fire Sale","Get roasted by Tiffany for wholesaling."],
  ["give","🎁","Ooga Booga","A salesman gives a car away to a head-turner."],
  ["flirt","💬","HR Nightmare","Your crew wanders over to Tiffany's desk 50 times."],
  ["kids","🧸","Free Daycare","Hand a customer's kids off to Tiffany."],
  ["laundry","👙","Laundry Day","Show up on a laundry day."],
  ["date","💘","Same Time Tomorrow","Finish the date with Tiffany."],
  ["lawyer","⚖️","Loose Cannon","Fight the lawsuit and win."],
  ["dale","🥫","Don't Buy the Buick","Give Dale five bucks."],
  ["inspect","📋","Teacher's Pet","Get an A on Bob's surprise inspection."]];
let D={u:{},n:{}};
try{D=Object.assign(D,JSON.parse(localStorage.getItem("bobsAch")||"{}"))}catch(e){}
const save=()=>{try{localStorage.setItem("bobsAch",JSON.stringify(D))}catch(e){}};

const css=document.createElement("style");css.textContent=`
#achtoast{position:fixed;top:14px;right:14px;z-index:40;display:flex;gap:10px;align-items:center;min-width:250px;max-width:340px;padding:10px 14px;border-radius:6px;
  background:linear-gradient(135deg,#1b2838,#2a475e);color:#fff;font:13px system-ui;box-shadow:0 6px 24px #000a;border-left:4px solid #66c0f4;
  transform:translateX(130%);transition:transform .45s cubic-bezier(.2,.9,.3,1.2);pointer-events:none}
#achtoast.on{transform:none}
#achtoast .i{font-size:30px}#achtoast .k{font-size:11px;color:#66c0f4;text-transform:uppercase;letter-spacing:.06em}#achtoast b{display:block;font-size:14px}
#achbox{position:fixed;inset:0;z-index:35;display:none;align-items:center;justify-content:center;background:#000c;padding:16px}
#achbox .w{background:#141a22;color:#fff;border-radius:10px;max-width:560px;width:100%;max-height:86vh;overflow:auto;padding:18px 20px;font:14px system-ui}
#achbox .a{display:flex;gap:12px;align-items:center;padding:7px 4px;border-bottom:1px solid #ffffff12}
#achbox .a .i{font-size:26px;width:34px;text-align:center}#achbox .a.lock{opacity:.38}#achbox .a.lock .i{filter:grayscale(1)}
#achbox .a small{display:block;color:#aab}`;
document.head.appendChild(css);
const toast=document.createElement("div");toast.id="achtoast";
const box=document.createElement("div");box.id="achbox";box.onclick=e=>{if(e.target===box)box.style.display="none"};
addEventListener("DOMContentLoaded",()=>{document.body.appendChild(toast);document.body.appendChild(box)});
let queue=[],busy=false;
function show(){if(busy||!queue.length)return;busy=true;const a=queue.shift();
  toast.innerHTML=`<div class=i>${a[1]}</div><div><div class=k>Achievement unlocked</div><b>${a[2]}</b>${a[3]}</div>`;
  toast.classList.add("on");if(window.Sfx&&Sfx.chime)Sfx.chime();
  setTimeout(()=>{toast.classList.remove("on");setTimeout(()=>{busy=false;show()},500)},4200)}

window.ach=function(id){if(D.u[id])return;const a=LIST.find(x=>x[0]===id);if(!a)return;D.u[id]=Date.now();save();queue.push(a);show()};
function count(k,n,id){D.n[k]=(D.n[k]||0)+1;save();if(D.n[k]>=n)ach(id)}
// fed by tally() in data.js
window.achTally=function(k){
  if(k==="sold"){ach("first_sale");count("sold",25,"sold_25");if(D.n.sold>=100)ach("sold_100")}
  else if(k==="cry")count("cry",10,"cry");
  else if(k==="flirt")count("flirt",50,"flirt");
  else if(k==="gun"||k==="give"||k==="kids")ach(k)};
window.achCount=()=>`${Object.keys(D.u).filter(k=>LIST.some(a=>a[0]===k)).length}/${LIST.length}`;
window.achShow=function(){
  box.innerHTML=`<div class=w><h2 style="margin:0 0 4px">🏆 Achievements <span style="color:#66c0f4">${achCount()}</span></h2><div style="color:#889;margin-bottom:8px">Kept across every save file.</div>`+
    LIST.map(a=>{const u=D.u[a[0]];return `<div class="a ${u?"":"lock"}"><div class=i>${a[1]}</div><div><b>${a[2]}</b><small>${a[3]}${u?` · unlocked ${new Date(u).toLocaleDateString()}`:""}</small></div></div>`}).join("")+
    `<div style="text-align:right;margin-top:12px"><button class=b onclick="document.getElementById('achbox').style.display='none'">Close</button></div></div>`;
  box.style.display="flex"};
})();
