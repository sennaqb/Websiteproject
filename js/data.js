"use strict";
// Core data, economy and state for Bargain Bob's Auto Mart.
const GOAL=55000, SAVE="bargainBobsV2";
const $=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[ri(0,a.length-1)];
const $f=n=>(n<0?"-$":"$")+Math.abs(Math.round(n)).toLocaleString();

const MODELS=[
  // make, model, body, base new price
  ["Buick","LeSabre","sedan",19000],["Ford","Taurus","sedan",21000],["Chevy","Cavalier","sedan",15000],
  ["Pontiac","Grand Am","sedan",19000],["Dodge","Neon","sedan",15000],["Saturn","Ion","sedan",16000],
  ["Nissan","Sentra","sedan",17000],["Mercury","Grand Marquis","sedan",25000],
  ["Ford","Ranger","truck",20000],["Chevy","S-10","truck",18000],["Dodge","Dakota","truck",22000],
  ["Ford","Explorer","suv",32000],["Jeep","Cherokee","suv",25000],["Chevy","Blazer","suv",27000],
  ["Ford","Mustang","coupe",24000],["Chrysler","Sebring","coupe",22000]
];
const NOTES=["check engine light is on","smells like cigarettes","mismatched tires","new battery","one owner, allegedly","AC blows hot","drinks a quart of oil a week","radio only gets one station","tape deck still works","pulls a little to the left","title says salvage","dent the size of a fist"];
const NAMES=["Alex","Sam","Jordan","Pat","Chris","Dana","Lee","Morgan","Taylor","Casey","Robin","Jamie","Terry","Kim","Drew","Rene"];
const NEEDS=["to get to work","for my daughter's first car","for my landscaping business","to haul stuff on weekends","for deliveries","for the commute","because mine just died"];
const BODIES=["any","sedan","suv","truck","coupe"];

// mult: share of market value they will pay at most. pat: rounds before they walk. addon: base chance to buy back-end products.
const TYPES={
  haggler:{mult:1.15,pat:5,addon:.5,intro:"I've shopped around, and I won't pay sticker.",who:"a hard bargainer who hates sticker prices"},
  researcher:{mult:1.1,pat:4,addon:.3,intro:"I've already checked the market value on this.",who:"a blunt person who researched values online"},
  fan:{mult:1.45,pat:5,addon:.7,intro:"I've always wanted one of these!",who:"enthusiastic and already in love with the car"},
  budget:{mult:1.2,pat:4,addon:.25,intro:"I have a hard budget, so let's keep it simple.",who:"nervous about money, on a tight budget"},
  tirekicker:{mult:.72,pat:6,addon:.05,intro:"Just looking, honestly. My buddy's selling one for like eight hundred bucks.",who:"a casual looker who isn't really buying"},
  rusher:{mult:1.32,pat:3,addon:.55,intro:"I'm in a hurry, so give me your best price.",who:"impatient and in a hurry"}
};
const ADDONS={
  warranty:{n:"extended warranty",price:700,cost:250,re:/warrant|protection plan|service contract/},
  gap:{n:"GAP coverage",price:300,cost:80,re:/\bgap\b/},
  acc:{n:"accessories package",price:400,cost:150,re:/accessor|floor mats|tint|bed liner/},
  finance:{n:"financing",price:300,cost:0,re:/financ|monthly payment|payment plan|per month|a month/}
};
const RAPPORT={
  haggler:["Ha, nice try, but I know the tricks. Still, I appreciate it.","Alright, you seem straight with me. I'm listening."],
  researcher:["I've done my homework, but thanks.","Fine. Let's keep it factual."],
  fan:["I've wanted one of these since I was a kid!","This would be perfect for me. Really."],
  budget:["Thanks. I just need something reliable in budget.","Appreciate that. My number is tight."],
  rusher:["Sure, sure, but I'm short on time.","Thanks! Let's move this along."],
  tirekicker:["Yeah, nice place. Just looking though.","Uh huh. Cool."]
};
const URGENCY={haggler:.02,researcher:0,fan:.04,budget:.01,rusher:.05,tirekicker:0};
const EVENTS=[
  {id:"normal",name:"Regular day",desc:"Nothing special. Same cracked asphalt as always.",cust:1,bud:1,w:4},
  {id:"slow",name:"Slow Monday",desc:"Traffic is dead.",cust:.6,bud:1,w:1},
  {id:"rain",name:"Rainy day",desc:"Fewer people out, but the ones who come mean it.",cust:.7,bud:1.1,bias:["rusher","budget"],w:1},
  {id:"refund",name:"Tax refund week",desc:"Buyers have cash in their pockets.",cust:1.2,bud:1.5,w:1},
  {id:"monthend",name:"Month-end rush",desc:"Everyone needs a car yesterday.",cust:1.3,bud:1,bias:["rusher","rusher"],w:1},
  {id:"kickers",name:"Tire-kicker Tuesday",desc:"Lots of lookers. Not many buyers.",cust:1.3,bud:.8,bias:["tirekicker","tirekicker","tirekicker"],w:1}
];
const CREW0=[
  {name:"Dale",skill:.2,cave:.5,shirt:0x8a7a3a,skin:0,quirk:""},
  {name:"Tony",skill:.45,cave:.2,shirt:0x8a2a2a,skin:1,quirk:"pushy"},
  {name:"Brenda",skill:.3,cave:.3,shirt:0x2f6d8a,skin:2,quirk:""}
];
const CAND_NAMES=["Mike","Sheila","Rex","Luis","Gina","Hank","Tamika","Vic","Priya","Ron","Donna","Ace","Marcus","Lupe"];
const SHIRTS=[0x8a7a3a,0x8a2a2a,0x2f6d8a,0x5a3a7a,0x2f6a4a,0x7a5a2a,0x4a4a4a];
const MAX_CREW=4;

let S;
const wageOf=c=>Math.round(30+c.skill*100);
const quota=wk=>10000+2500*(wk-1);
const weekOf=d=>Math.ceil(d/7);

function logMsg(m){S.log.unshift("Day "+S.day+": "+m);S.log=S.log.slice(0,60)}
function toast(m){logMsg(m);if(window.PC&&PC.flash)PC.flash(m)}
function save(){try{if(S.phase!=="open")localStorage.setItem(SAVE,JSON.stringify(S))}catch(e){}}
function hasSave(){try{return !!localStorage.getItem(SAVE)}catch(e){return false}}
function load(){
  try{
    const s=localStorage.getItem(SAVE);
    if(s){const o=JSON.parse(s);if(o&&o.v===2){S=o;S.phase="prep";S.cust=[];restock();return true}}
  }catch(e){}
  return false;
}
function fresh(){
  S={v:2,day:1,cash:1500,rep:10,cap:6,ad:0,mech:0,front:0,back:0,nextId:1,inv:[],cust:[],log:[],phase:"prep",sold:0,profit:0,
     crew:CREW0.map((c,i)=>Object.assign({id:i+1},c)),crewId:4,cands:[],strikes:0,weekStart:0,event:EVENTS[0],review:"",seen:{}};
  restock();genCands();
  logMsg("Bob left you the keys. His trucks keep the lot full. Open the doors and save the deals your salespeople can't close. Get the bank to "+$f(GOAL)+".");
}

// ---------- cars ----------
function marketValue(c,cond=c.cond){
  const age=2026-c.year;
  let v=c.base*Math.pow(0.88,Math.min(age,14));
  v*=Math.max(.45,1-c.miles/260000);
  v*=0.7+0.3*(cond/100);
  return Math.max(600,Math.round(v/50)*50);
}
function makeCar(){
  const [make,model,body,base]=pick(MODELS);
  const year=ri(1996,2012),cond=ri(20,80);
  const c={id:S.nextId++,make,model,body,base,year,miles:Math.min(290000,Math.round((2026-year)*ri(7000,13000)/100)*100),cond,seen:false,cost:0,price:0,days:0,note:pick(NOTES)};
  c.estCond=Math.max(10,Math.min(100,cond+ri(-18,18)));
  return c;
}
// Bob's trucks keep the lot full. The cars are on consignment: you never pay for them, you keep what's left after Bob's cost.
function restock(){
  while(S.inv.length<S.cap){
    const c=makeCar();
    c.cost=Math.round(marketValue(c)*rnd(.6,.92)/50)*50;c.price=askFor(c);c.seen=true;S.inv.push(c);
  }
}
const askFor=c=>Math.round(marketValue(c)*1.3/50)*50;
const label=c=>`${c.year} ${c.make} ${c.model}`;
const condLabel=n=>n>=85?"Excellent":n>=65?"Good":n>=45?"Fair":"Rough";
const repairCost=c=>Math.round((100-c.cond)*(c.base/6000)*(1-0.1*S.mech)/10)*10;

function repair(id){
  const c=S.inv.find(c=>c.id==id);if(!c)return;
  const cost=repairCost(c);
  if(S.cash<cost)return toast("Not enough cash.");
  S.cash-=cost;c.cost+=cost;c.cond=100;c.price=askFor(c);
  logMsg(`Reconditioned ${label(c)} for ${$f(cost)}.`);save();
}
function setPrice(id,v){const c=S.inv.find(c=>c.id==id);if(!c)return;c.price=Math.max(500,Math.round(+v)||c.price);save()}
function wholesale(id){
  const i=S.inv.findIndex(c=>c.id==id),c=S.inv[i];if(!c)return;
  const p=Math.round(marketValue(c)*.8/50)*50;
  S.cash+=p-c.cost;S.profit+=p-c.cost;S.inv.splice(i,1);
  logMsg(`Wholesaled ${label(c)} for ${$f(p)} (${$f(p-c.cost)} profit).`);save();
}
const UPG=[
  {k:"cap",n:"Bigger lot (+2 spaces)",cost:()=>1500+S.cap*300,max:20,desc:"Hold more cars."},
  {k:"ad",n:"Advertising",cost:()=>600*(S.ad+1),max:5,desc:"More customers each day (costs $30/day per level)."},
  {k:"mech",n:"In-house mechanic",cost:()=>1200*(S.mech+1),max:5,desc:"Repairs 10% cheaper per level."}
];
function upgrade(k){
  const u=UPG.find(u=>u.k==k),c=u.cost();
  if(S.cash<c)return toast("Not enough cash.");
  S.cash-=c;S[k]+=k=="cap"?2:1;if(k=="cap")restock();logMsg("Bought upgrade: "+u.n);save();
}

// ---------- crew ----------
function genCands(){
  S.cands=[];
  const names=CAND_NAMES.slice().sort(()=>Math.random()-.5);
  for(let i=0;i<3;i++){
    S.cands.push({id:S.crewId++,name:names[i],skill:+rnd(.1,.5).toFixed(2),cave:+rnd(.1,.55).toFixed(2),shirt:pick(SHIRTS),skin:ri(0,3),quirk:Math.random()<.25?"pushy":""});
  }
}
function hire(id){
  const i=S.cands.findIndex(c=>c.id==id),c=S.cands[i];if(!c)return;
  if(S.crew.length>=MAX_CREW)return toast("You only have four desks.");
  S.crew.push(c);S.cands.splice(i,1);logMsg(`Hired ${c.name}. Wage ${$f(wageOf(c))}/day.`);save();
}
function fire(id){
  const i=S.crew.findIndex(c=>c.id==id),c=S.crew[i];if(!c)return;
  if(S.crew.length<=1)return toast("You can't run a lot with nobody.");
  if(S.cash<150)return toast("Severance is $150 and you don't have it.");
  S.cash-=150;S.crew.splice(i,1);logMsg(`Fired ${c.name}. $150 severance.`);save();
}
function train(id){
  const c=S.crew.find(c=>c.id==id);if(!c)return;
  if(c.trained===S.day)return toast(c.name+" already trained today.");
  if(S.cash<300)return toast("Training costs $300.");
  S.cash-=300;c.trained=S.day;c.skill=+Math.min(.65,c.skill+.05).toFixed(2);c.cave=+Math.max(.05,c.cave-.04).toFixed(2);
  logMsg(`Trained ${c.name}.`);save();
}

// ---------- the day ----------
function openDay(){
  S.phase="open";S.cust=[];
  const ev=S.event||EVENTS[0];
  const n=Math.max(4,Math.round((ri(7,11)+S.ad*2+Math.floor(S.rep/15))*ev.cust));
  const pool=["haggler","haggler","researcher","fan","budget","rusher","rusher","tirekicker","tirekicker"].concat(ev.bias||[]);
  for(let i=0;i<n;i++){
    S.cust.push({id:i,name:pick(NAMES),body:pick(["any","any","any","sedan","suv","truck","coupe"]),
      budget:Math.round(rnd(1500,9000)*ev.bud/100)*100,type:pick(pool),need:pick(NEEDS),done:false,msg:""});
  }
  matchCustomers();
}
function matchCustomers(){
  S.cust.forEach(u=>{
    if(u.done)return;
    const opts=S.inv.filter(c=>(u.body=="any"||c.body==u.body)&&c.price<=u.budget*1.1);
    if(!opts.length){u.car=null;u.done=true;u.msg="Nothing on the lot fits.";return}
    opts.sort((a,b)=>a.price/marketValue(a)-b.price/marketValue(b));
    u.car=opts[0].id;
    const mv=marketValue(opts[0]);
    if(opts[0].price>mv*1.8){u.done=true;u.car=null;u.msg=`Laughed at the price of ${label(opts[0])}.`;return}
    if(u.reserve===undefined||u.carFor!==u.car){
      u.carFor=u.car;
      u.reserve=Math.round(Math.min(u.budget*1.05,mv*TYPES[u.type].mult*(1+S.rep/600)*rnd(.97,1.03))/50)*50;
      u.offer=Math.round(u.reserve*.7/50)*50;
    }
  });
}
function finishSale(u,c,i,p,ad=[]){
  const back=ad.reduce((s,a)=>s+a.price-a.cost,0);
  S.cash+=p-c.cost+back;S.sold++;S.front+=p-c.cost;S.back+=back;S.profit+=p-c.cost+back;S.rep+=1;S.inv.splice(i,1);
  u.done=true;u.msg=`Bought for ${$f(p)}!`;
  logMsg(`Sold ${label(c)} to ${u.name} for ${$f(p)}: front ${$f(p-c.cost)}${back?`, back-end ${$f(back)}`:""}.`);
  matchCustomers();
}
const netWorth=()=>S.cash; // the bank is your take. The cars belong to Bob.

// Ends the day. Returns what the owner and the bank have to say.
function closeDay(){
  const wages=S.crew.reduce((s,c)=>s+wageOf(c),0);
  const fees=S.inv.length*6+40+S.ad*30+wages;
  S.inv.forEach(c=>c.days++);
  const weekEnd=S.day%7===0,rent=weekEnd?250+S.cap*20:0;
  S.cash-=fees+rent;
  let review="";
  if(weekEnd){
    const wk=weekOf(S.day),got=S.profit-S.weekStart,q=quota(wk);
    if(got>=q){S.strikes=0;review=`Week ${wk}: you grossed ${$f(got)} against Bob's ${$f(q)}. Bob is pleased.`}
    else{S.strikes++;review=`Week ${wk}: you grossed ${$f(got)}. Bob wanted ${$f(q)}. Strike ${S.strikes} of 2.`}
    S.weekStart=S.profit;
  }
  S.day++;S.phase="prep";S.cust=[];restock();genCands();
  const pool=[];EVENTS.forEach(e=>{for(let i=0;i<e.w;i++)pool.push(e)});S.event=pick(pool);
  S.review=review;
  let end=null;
  if(S.strikes>=2)end="fired";
  else if(netWorth()>=GOAL)end="win";
  else if(S.cash<-1500)end="broke";
  save();
  return {fees,rent,wages,review,end,weekEnd};
}
