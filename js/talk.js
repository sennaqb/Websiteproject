"use strict";
// Negotiation engine. Understanding (rules or AI) produces intents; this engine decides what happens.
// The game owns every number: hidden walk-away price, patience, add-on odds. Language is just the skin.
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
let T=null,rec=null;
const esc=s=>String(s).replace(/[&<>]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[m]));
const W={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function wordsToNum(t){
  let total=0,cur=0,found=false;
  for(const w of t.replace(/-/g," ").split(/\s+/)){
    if(w in W){cur+=W[w];found=true}
    else if(w=="hundred"){cur=(cur||1)*100;found=true}
    else if(w=="thousand"||w=="grand"){total+=(cur||1)*1000;cur=0;found=true}
    else if(w=="a"||w=="and"){}
    else if(found){if(total+cur>=500)break;total=0;cur=0;found=false}
  }
  return total+cur;
}
function parseMoney(t){
  t=t.toLowerCase().replace(/,/g,"");
  let m=t.match(/(\d+(?:\.\d+)?)\s*(k|thousand|grand)\b/);if(m)return Math.round(m[1]*1000);
  m=t.match(/(\d{3,6})(?:\.\d+)?/);if(m)return +m[1];
  const n=wordsToNum(t);return n>=500?n:0;
}

// ---------- open / close ----------
function openTalk(uid,opts={}){
  const u=S.cust.find(x=>x.id==uid),c=S.inv.find(x=>x.id==u.car);if(!c)return;
  const ty=TYPES[u.type];
  T={uid,car:c,lines:[],pat:Math.max(1,Math.round(ty.pat*(opts.patFrac||1))),maxPat:ty.pat,rapport:0,used:{},rounds:0,
     hands:!!SR&&!opts.noMic&&!opts.inWorld,listening:false,over:false,counter:0,lastAsk:0,agreed:0,addons:[],asked:{},declines:0,err:"",summary:"",
     stated:!!opts.intro,buf:[],busy:false,financed:false,interim:"",mute:false,sold:null,lastSaid:"",inWorld:!!opts.inWorld,typing:false,ptt:false,pttBuf:""};
  T.buf.push(opts.intro?`${opts.intro} ${ty.intro}`:`Hi, I'm ${u.name}. ${ty.intro} I'm looking at that ${label(c)}. What's your price?`);
  flush();
}
function closeTalk(){
  if(window.speechSynthesis)try{speechSynthesis.cancel()}catch(e){}
  try{rec&&rec.abort()}catch(e){}
  T=null;$("talk").innerHTML="";$("subs").innerHTML="";$("subs").className="";
  if(window.G3&&G3.talkClosed)G3.talkClosed();
}

// ---------- the customer talks ----------
function say(text){T.buf.push(text)}
function flush(){
  if(!T)return;
  const text=T.buf.join(" ").trim();T.buf=[];
  if(!text){renderTalk();return}
  const uid=T.uid;
  if(window.AI&&AI.on()&&AI.voiceOn()){
    T.busy=true;renderTalk();
    const u=S.cust.find(x=>x.id==uid);
    AI.voice({u,T,text,said:T.lastSaid}).then(v=>{if(!T||T.uid!==uid)return;T.busy=false;show(v||text)})
      .catch(()=>{if(!T||T.uid!==uid)return;T.busy=false;show(text)});
  }else show(text);
}
function show(text){
  if(T.over&&T.inWorld&&!T.closing){const uid=T.uid;T.closing=setTimeout(()=>{if(T&&T.uid===uid)closeTalk()},6000)}
  T.lines.push({who:"c",text});renderTalk();speak(text);if(window.G3&&G3.speaking)G3.speaking(Math.min(6,1+text.length/14),mood(text))}
// Pick the customer's eyebrows from the engine's state, with the line itself as a tiebreaker.
function mood(text){
  if(T.gunned)return"shocked";
  if(T.sold)return"happy";
  if(/I'm out|look elsewhere|stretching the truth|being sold|No way|really\?/i.test(text))return"angry";
  if(/way out of my range|steep|a lot for this/i.test(text))return"shocked";
  if(/Sorry,|what price are you|You already/i.test(text))return"confused";
  if(T.agreed||/closer|Almost|now we're talking|not far off|I like|plus|sharp|could work|Great/i.test(text))return"happy";
  if(T.pat<=1||/rough|elsewhere/i.test(text))return"worried";
  return"neutral";
}
function speak(text){
  if(T.mute||!window.speechSynthesis)return;
  try{
    speechSynthesis.cancel();
    const cu=S.cust.find(x=>x.id==T.uid),ut=new SpeechSynthesisUtterance(text);
    const all=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
    const good=all.filter(v=>/natural|online|neural|google|premium|enhanced/i.test(v.name)),vs=good.length>=2?good:all;
    if(vs.length)ut.voice=vs[(cu.id*7+cu.name.length)%vs.length];
    ut.pitch=.92+(cu.id%4)*.06;ut.rate=1.04;
    ut.onend=()=>{if(T&&T.hands&&!T.over&&!T.busy)listen()};
    speechSynthesis.speak(ut);
  }catch(e){}
}

// ---------- the player talks ----------
function listen(){
  if(!SR||!T||T.listening||T.over||T.busy)return;
  try{if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}
  rec=new SR();rec.lang="en-US";rec.interimResults=true;rec.continuous=false;
  rec.onstart=()=>{if(T){T.listening=true;T.err="";renderTalk()}};
  rec.onresult=e=>{
    let fin="",tmp="";
    for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)fin+=r[0].transcript;else tmp+=r[0].transcript}
    if(!T)return;
    if(fin){T.interim="";handleSay(fin)}else{T.interim=tmp;renderTalk()}
  };
  rec.onerror=e=>{if(!T)return;T.err=e.error=="not-allowed"?"Mic blocked. Allow mic access, or type below.":e.error=="no-speech"?"Didn't hear anything.":"Didn't catch that. Try again.";if(e.error=="not-allowed")T.hands=false};
  rec.onend=()=>{if(T){T.listening=false;renderTalk()}};
  try{rec.start()}catch(e){}
}
function sendTyped(){const el=$("tin"),v=el&&el.value.trim();if(v){el.value="";handleSay(v)}}

function handleSay(s){
  if(!T||T.over||T.busy)return;
  T.lines.push({who:"p",text:s});T.err="";T.lastSaid=s;
  if(window.G3&&G3.on()&&!T.inWorld)G3.elapse(7);
  const uid=T.uid;
  if(window.AI&&AI.on()){
    T.busy=true;renderTalk();
    AI.classify({T,u:S.cust.find(x=>x.id==uid),said:s}).then(ints=>{
      if(!T||T.uid!==uid)return;T.busy=false;runAll(ints&&ints.length?ints:[rulesParse(s)]);
    }).catch(()=>{if(!T||T.uid!==uid)return;T.busy=false;runAll([rulesParse(s)])});
    return;
  }
  runAll([rulesParse(s)]);
}
function runAll(ints){
  const u=S.cust.find(x=>x.id==T.uid);
  T.buf=[];
  for(const I of ints){if(!T||T.over)break;runIntent(u,I)}
  if(T)flush();
}

// Miguel's last resort: three times a career he can skip the haggling entirely.
function gunDeal(){
  if(!T||T.over||T.busy)return;
  if(!(S.guns>0)){T.err="You're out of guaranteed deals. Back to haggling.";renderTalk();return}
  const u=S.cust.find(x=>x.id==T.uid);if(!u)return;
  S.guns--;T.gunned=true;T.addons=[];
  T.lines.push({who:"p",text:"I have a gun."});T.lastSaid="I have a gun.";T.err="";
  if(window.G3&&G3.gun)G3.gun();
  T.buf=[];T.agreed=T.car.price;
  say(pick(["Whoa whoa whoa! Okay! Full price! Where do I sign?!","Okay! Okay! I'll take it! Sticker price! It's a great car!","Jesus! Fine! Full asking! No extras, I swear I don't need extras!","Alright, alright! Deal! Best deal I ever made!"]));
  finalize(u);
  T.summary=`🔫 <b>Deal at gunpoint</b> (${S.guns} left)<br>`+T.summary;
  flush();
}

// Built-in understanding of what the manager said.
function rulesParse(s){
  const t=s.toLowerCase();
  if(/nice day|thanks for (coming|stopping|your time)|take care|good luck|wish you|no hard feelings|not going to work|can't make that work|shake your hand|appreciate you coming/.test(t))return{type:"release"};
  for(const k in ADDONS)if(ADDONS[k].re.test(t))return{type:"addon",which:k};
  const price=parseMoney(t);
  if(T.agreed){
    if(price)return{type:"offer",price};
    if(/\b(done|that's all|that is all|finalize|sign|paperwork|close|deal|sold|shake|agreed|ok|okay|yes|sure|fine)\b/.test(t))return{type:"finalize"};
    return{type:"unclear"};
  }
  if(/looking for|tell me about|what do you need|what brings|family|commute|kids|nice to meet|welcome|congrat|how are you|how's it going/.test(t))return{type:"rapport"};
  if(/low mile|few miles|low-mile/.test(t))return{type:"pitch_miles"};
  if(/(great|excellent|good|clean) (shape|condition)|reconditioned|serviced|inspected|new tires|detailed|spotless/.test(t))return{type:"pitch_cond"};
  if(/another buyer|someone else|other customer|last one|going fast|popular|in demand|other offers/.test(t))return{type:"urgency"};
  if(/\bmiles?\b|mileage/.test(t))return{type:"ask",topic:"miles"};
  if(/year|model/.test(t))return{type:"ask",topic:"year"};
  if(/condition|shape|accident/.test(t))return{type:"ask",topic:"condition"};
  if(/\b(middle|halfway|split)\b/.test(t))return{type:"middle"};
  if(price)return{type:"offer",price};
  if(/\b(deal|sold|take it|shake|yes|yeah|sure|okay|ok|fine|agreed)\b/.test(t))return{type:"accept"};
  if(/\b(no|nope|can't|cannot|final|firm|not)\b/.test(t))return{type:"refuse"};
  if(/\b(hi|hello|hey|morning|afternoon)\b/.test(t))return{type:"greet"};
  return{type:"unclear"};
}

function runIntent(u,I){
  const c=T.car,f=u.type==="researcher"?.5:1;
  if(I.type==="release")return release(u);
  if(I.type==="addon")return I.which==="finance"?finance(u):pitch(u,I.which);
  if(I.type==="finalize"){if(T.agreed)return finalize(u);return say("Let's settle on the price first.")}
  if(T.agreed){
    if(I.type==="offer")return say(`We agreed on ${$f(T.agreed)}. Let's do the paperwork.`);
    if(I.type==="accept")return finalize(u);
    return say("So are we all set? Anything else, or shall we sign?");
  }
  switch(I.type){
    case"rapport":
      if(T.rapport<3&&bump(u,.015*f,"r"+T.rapport)){T.rapport++;return say(RAPPORT[u.type][T.rapport%2])}
      return say("Thanks, but let's talk numbers.");
    case"pitch_miles":
      if(c.miles<70000){bump(u,.02*f,"miles");return say("Those are low miles. That's a plus.")}
      if(tire(u,1,"You're stretching the truth. I'm out."))return;
      return say("That's not low miles to me.");
    case"pitch_cond":
      if(c.cond>=85){bump(u,.025*f,"cond");return say("It does look sharp. I like that.")}
      bump(u,-.02,"cond");
      if(tire(u,1,"I don't like being sold. I'm out."))return;
      return say("I'm not seeing that. Looks rough to me.");
    case"urgency":
      if(T.used.urg)return say("You already said that.");
      T.used.urg=1;
      if(u.type==="researcher")return say(`Nice try. It's been on your lot ${c.days} days.`);
      bump(u,URGENCY[u.type]||0);
      if(u.type!=="fan"&&tire(u,1,"If it's that popular, sell it to them. I'm out."))return;
      return say("Hmm. Then I shouldn't wait around.");
    case"ask":
      if(I.topic==="miles")return say(`It says ${c.miles.toLocaleString()} miles. ${c.miles>120000?"That's a lot, honestly.":"That's pretty reasonable."}`);
      if(I.topic==="year")return say(`It's a ${label(c)}, right? ${c.year<2005?"Kind of old.":"Newer than I expected."}`);
      return say(c.cond>=85?"Looks great to me. Clean inside and out.":c.cond>=60?"Looks okay, some wear.":"Honestly it looks rough. I'd want a discount.");
    case"middle":
      return offerPrice(u,Math.round(((T.counter||u.offer)+(T.lastAsk||c.price))/100)*50);
    case"offer":
      if(!(I.price>=100))return say("Sorry, what price are you asking?");
      return offerPrice(u,Math.round(I.price));
    case"accept":
      if(T.counter)return agree(u,T.counter);
      return say("Great! What price are you thinking?");
    case"refuse":
      if(tire(u,1,"We're too far apart. I'll look elsewhere."))return;
      return say(`${pick(["My offer stands at","I'm still at","Look, I'm at"])} ${$f(T.counter||u.offer)}.`);
    case"greet":return say("Hi there! So, what's your price on this one?");
    case"chat":return say(I.reply||"Sorry, what price are you asking?");
    default:return say("Sorry, what price are you asking?");
  }
}

// ---------- the rules ----------
// raise (or lower) the customer's walk-away price; key makes it one-time
function bump(u,pct,key){
  if(key){if(T.used[key])return false;T.used[key]=1}
  const cap=Math.min(u.budget*1.1,marketValue(T.car)*1.8);
  u.reserve=Math.round(Math.min(cap,u.reserve*(1+pct))/50)*50;
  u.offer=Math.min(u.offer,u.reserve);
  return true;
}
// drain patience; true if the customer walked
function tire(u,n,msg){T.pat-=n;if(T.pat<=0){walk(u,msg);return true}return false}
function offerPrice(u,price){
  T.lastAsk=price;
  if(price<=u.reserve)return agree(u,price);
  const hopeless=u.reserve<=T.car.cost*1.05;
  if(price>u.reserve*1.3&&!hopeless)return walk(u,"That's way out of my range. I'm out.");
  T.rounds++;
  if(tire(u,1,"We're too far apart. I'll look elsewhere."))return;
  const step=Math.min(1,T.rounds/Math.max(2,T.maxPat-1));
  T.counter=Math.max(T.counter,Math.round((u.offer+(u.reserve-u.offer)*step)/50)*50);
  const far=price>u.reserve*1.1;
  say(`${pick(far?["That's steep.","Come on, really?","No way.","That's a lot for this thing."]:["Getting closer.","Hmm. Almost.","We're not far off.","Okay, now we're talking."])} ${pick(["I can do","Best I can do is","I'd go","How about"])} ${$f(T.counter)}.`);
}
function agree(u,p){
  T.agreed=p;
  say(`${pick(["Alright,","Okay,","Fine,","You know what,"])} ${$f(p)} works for me. ${pick(["Anything else before we do the paperwork?","What's next?","Let's get this done."])}`);
}
function finance(u){
  if(T.agreed)return pitch(u,"finance");
  if(T.used.fin)return say("You already mentioned payments.");
  T.used.fin=1;
  if(["budget","rusher","fan","haggler"].includes(u.type)){bump(u,.1);T.financed=true;return say("Monthly payments? Okay, that could work for me.")}
  return say("I'm paying straight up. Payments don't matter to me.");
}
function pitch(u,k){
  const a=ADDONS[k],c=T.car;
  if(!T.agreed)return say("Let's settle on the car price first.");
  if(k==="finance"&&T.financed)return say("We're already financing it.");
  if(T.asked[k])return say(T.addons.includes(k)?"I already took that one.":"I already said no to that.");
  if(T.declines>=2)return say("That's enough extras. Just the car, please.");
  T.asked[k]=1;
  let p=TYPES[u.type].addon+T.rapport*.1+(k==="warranty"&&(c.cond<60||c.miles>100000)?.2:0)+(k==="gap"&&T.agreed>3500?.15:0)+(k==="finance"&&["budget","rusher"].includes(u.type)?.25:0);
  p=Math.max(.1,Math.min(.9,p));
  if(Math.random()<p){T.addons.push(k);if(k==="finance")T.financed=true;return say(`Sure, I'll take the ${a.n}${a.price?` for ${$f(a.price)}`:""}.`)}
  T.declines++;
  say(T.declines>=2?"No thanks. That's enough extras. Just the car.":"I'll pass on that.");
}
function finalize(u){
  const i=S.inv.findIndex(c=>c.id==u.car);if(i<0)return;
  const c=S.inv[i],p=T.agreed;
  if(T.financed&&!T.addons.includes("finance"))T.addons.push("finance");
  const ad=T.addons.map(k=>ADDONS[k]);
  const front=p-c.cost,back=ad.reduce((s,a)=>s+a.price-a.cost,0);
  const room=Math.max(1,u.reserve-u.offer),pct=Math.max(0,Math.min(100,Math.round(100*(p-u.offer)/room)));
  T.over=true;T.sold=p;u.gross=front+back;finishSale(u,c,i,p,ad);
  const grade=pct>=95?"🏆 Maxed it":pct>=80?"👍 Strong deal":pct>=50?"Okay deal":"💸 Money left on the table";
  T.summary=`<b>${grade}</b><br>Price ${$f(p)} · front gross ${$f(front)} · back-end ${$f(back)} · <b>total ${$f(front+back)}</b><br>Their limit was ${$f(u.reserve)}. You captured ${pct}% of the room and left ${$f(Math.max(0,u.reserve-p))}.`;
  say("Thanks! Pleasure doing business.");
  if(window.Sfx)Sfx.cash();
}
function release(u){
  if(T.agreed)return finalize(u);
  const c=T.car,hopeless=u.reserve<=c.cost*1.05;
  u.polite=true;u.hopeless=hopeless;T.over=true;u.done=true;u.msg="Walked away.";
  T.summary=hopeless?`<b>👍 Good call.</b> They topped out around ${$f(u.reserve)} on a car you paid ${$f(c.cost)} for. No more time wasted.`
    :`<b>🤝 Sent on their way.</b> That one was winnable: their limit was ${$f(u.reserve)}, so you could have grossed ${$f(u.reserve-c.cost)}.`;
  say(pick(["Alright, thanks anyway. Have a good one.","No problem. Appreciate your time.","Sure, thanks. Maybe I'll come back."]));
}
function walk(u,msg){
  T.over=true;u.done=true;u.msg="Walked away.";S.rep=Math.max(0,S.rep-.5);
  T.summary=`No deal. You lost about ${$f(Math.max(0,u.reserve-T.car.cost))} of potential gross. Their limit was ${$f(u.reserve)}.`;
  say(msg);
}

// ---------- panel ----------
function renderTalk(){
  if(!T)return;
  if(T.inWorld)return renderSubs();
  const u=S.cust.find(x=>x.id==T.uid),c=T.car,old=($("tin")||{}).value||"";
  const back=T.addons.reduce((s,k)=>s+ADDONS[k].price-ADDONS[k].cost,0)+(T.financed&&!T.addons.includes("finance")?ADDONS.finance.price:0);
  const pat="●".repeat(Math.max(0,T.pat))+"○".repeat(Math.max(0,T.maxPat-T.pat));
  const best=T.counter||(T.stated?u.offer:0);
  const ai=window.AI&&AI.on();
  $("talk").innerHTML=`<div class=modal><div class="card talk"><h3>🗣️ ${esc(u.name)} · ${esc(label(c))}</h3>
  <div class=dim>Your cost ${$f(c.cost)} · ask ${$f(c.price)} · patience ${pat} · rapport ${"♥".repeat(T.rapport)||"–"}${ai?" · <span class=good>AI customer</span>":""}</div>
  ${best&&!T.agreed?`<div class=dim>Their best so far: ${$f(best)} ${best<c.cost?"<span class=bad>(under your cost)</span>":""}</div>`:""}
  ${window.G3&&G3.waiting&&G3.waiting()?`<div class=bad>${esc(G3.waiting())}</div>`:""}
  ${T.agreed?`<div class=good>Agreed ${$f(T.agreed)} · front ${$f(T.agreed-c.cost)} · back-end ${$f(back)}</div>`:""}
  <div class=tlog id=tlog>${T.lines.map(l=>`<div class="${l.who}"><b>${l.who=="c"?esc(u.name):"You"}:</b> ${esc(l.text)}</div>`).join("")}${T.interim?`<div class=p><i>${esc(T.interim)}…</i></div>`:""}${T.busy?`<div class=c><i>${esc(u.name)} is thinking…</i></div>`:""}</div>
  ${T.err?`<div class=bad>${esc(T.err)}</div>`:""}
  ${T.summary?`<div class=card style="margin-bottom:8px">${T.summary}</div>`:""}
  ${T.over?`<button class=go onclick="closeTalk()">Done</button>`:`
  ${SR?`<button class=go onclick="listen()" ${T.listening||T.busy?"disabled":""}>${T.listening?"🎙️ Listening…":"🎤 Speak"}</button> <label class=dim><input type=checkbox ${T.hands?"checked":""} onchange="T.hands=this.checked"> Hands-free</label> `:`<span class=dim>Voice input needs Chrome or Edge on a normal page. Type below. </span>`}
  <label class=dim><input type=checkbox ${T.mute?"checked":""} onchange="T.mute=this.checked;if(T.mute&&window.speechSynthesis)speechSynthesis.cancel()"> Mute customer</label>
  <div style="margin-top:8px"><input id=tin type=text autocomplete=off placeholder="Type what you'd say…" onkeydown="if(event.key=='Enter')sendTyped()"> <button class=b onclick="sendTyped()" ${T.busy?"disabled":""}>Send</button></div>
  ${T.agreed?`<button class=b onclick="handleSay('warranty')">Warranty ${$f(ADDONS.warranty.price)}</button><button class=b onclick="handleSay('gap')">GAP ${$f(ADDONS.gap.price)}</button><button class=b onclick="handleSay('accessories')">Accessories ${$f(ADDONS.acc.price)}</button><button class=b onclick="handleSay('financing')">Financing</button><button class=b onclick="handleSay('finalize')">Finalize ▸</button>`
    :`<button class=b onclick="handleSay('meet in the middle')">Meet in the middle</button><button class=b onclick="handleSay('we can do financing, low monthly payments')">Financing</button><button class=b onclick="handleSay('thanks for coming, have a nice day')">🤝 Have a nice day</button>`}
  <button class=b onclick="closeTalk()">Step away</button>`}
  </div></div>`;
  const lg=$("tlog");if(lg)lg.scrollTop=lg.scrollHeight;
  const ti=$("tin");if(ti){ti.value=old;if(!T.listening&&!("ontouchstart" in window))ti.focus()}
}

// ---------- first-person conversation: subtitles, push-to-talk, typing fallback ----------
function renderSubs(){
  const u=S.cust.find(x=>x.id==T.uid),c=T.car,box=$("subs"),old=($("tin")||{}).value||"";
  const rev=T.lines.slice().reverse(),lastC=rev.find(l=>l.who==="c"),lastP=rev.find(l=>l.who==="p");
  const best=T.counter||(T.stated?u.offer:0);
  const pat="●".repeat(Math.max(0,T.pat))+"○".repeat(Math.max(0,T.maxPat-T.pat));
  const back=T.addons.reduce((s,k)=>s+ADDONS[k].price-ADDONS[k].cost,0)+(T.financed&&!T.addons.includes("finance")?ADDONS.finance.price:0);
  const status=T.ptt||T.listening?"🎙️ Listening…":T.busy?`${esc(u.name)} is thinking…`:"";
  box.className="on";
  box.innerHTML=`<div class=subhead><b>${esc(u.name)}</b> · ${esc(label(c))} · cost ${$f(c.cost)} · ask ${$f(c.price)} · patience ${pat} · rapport ${"♥".repeat(T.rapport)||"–"}${best&&!T.agreed?` · their best ${$f(best)}${best<c.cost?" <span class=bad>(under cost)</span>":""}`:""}${T.agreed?` · <span class=good>agreed ${$f(T.agreed)} · back-end ${$f(back)}</span>`:""}${window.AI&&AI.on()?` · <span class=good>${AI.who()}</span>`:""}</div>
  ${lastC?`<div class="sub c"><b>${esc(u.name)}:</b> ${esc(lastC.text)}</div>`:""}
  ${T.interim?`<div class="sub p"><b>You:</b> <i>${esc(T.interim)}…</i></div>`:lastP?`<div class="sub p dimmed"><b>You:</b> ${esc(lastP.text)}</div>`:""}
  ${status?`<div class=substatus>${status}</div>`:""}${T.err?`<div class="substatus bad">${esc(T.err)}</div>`:""}
  ${T.summary?`<div class=subsum>${T.summary}</div>`:""}
  ${T.typing?`<div><input id=tin type=text autocomplete=off placeholder="Say something… Enter to send, Esc to cancel" onkeydown="event.stopPropagation();if(event.key==='Enter')typeSend();else if(event.key==='Escape')typeStop()"></div>`:""}
  ${T.over?"":`<div class=subkeys>${SR?"<b>Hold V</b> to talk · ":""}<b>T</b> type · ${T.agreed?"<b>1</b> warranty · <b>2</b> GAP · <b>3</b> accessories · <b>4</b> financing · <b>F</b> sign":"<b>4</b> offer financing"} · walk away to leave${S.guns>0?` · <b>G</b> "I have a gun" (${S.guns} left)`:""}${SR?` · <b>H</b> hands-free ${T.hands?"on":"off"}`:""}</div>`}`;
  if(T.typing){const ti=$("tin");if(ti){ti.value=old;if(document.activeElement!==ti)ti.focus()}}
}
// hold V: listen until the key comes up, then send everything that was said
function pttStart(){
  if(!SR||!T||T.over||T.busy||T.ptt)return;
  try{if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}
  try{rec&&rec.abort()}catch(e){}
  T.ptt=true;T.pttBuf="";T.interim="";T.err="";
  const uid=T.uid;
  rec=new SR();rec.lang="en-US";rec.interimResults=true;rec.continuous=true;
  rec.onresult=e=>{
    if(!T||T.uid!==uid)return;let tmp="";
    for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)T.pttBuf+=r[0].transcript+" ";else tmp+=r[0].transcript}
    T.interim=(T.pttBuf+tmp).trim();renderTalk();
  };
  rec.onerror=e=>{if(!T||T.uid!==uid)return;T.err=e.error==="not-allowed"||e.error==="service-not-allowed"?"Mic blocked. Allow the microphone in your browser, or press T to type.":e.error==="no-speech"?"Didn't hear anything. Hold V while you talk.":"";renderTalk()};
  rec.onend=()=>{
    if(!T||T.uid!==uid)return;T.ptt=false;
    const s=(T.pttBuf||T.interim||"").trim();T.interim="";T.pttBuf="";
    if(s)handleSay(s);else renderTalk();
  };
  try{rec.start()}catch(e){T.ptt=false}
  renderTalk();
}
function pttStop(){if(T&&T.ptt&&rec){try{rec.stop()}catch(e){}}}
function typeStart(){if(!T||T.over)return;T.typing=true;renderTalk()}
function typeStop(){if(!T)return;T.typing=false;renderTalk()}
function typeSend(){const el=$("tin"),v=el&&el.value.trim();T.typing=false;if(v)handleSay(v);else renderTalk()}
