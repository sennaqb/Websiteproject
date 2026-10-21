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
  if(window.Sfx&&Sfx.duck)Sfx.duck(true);
  const u=S.cust.find(x=>x.id==uid),c=S.inv.find(x=>x.id==u.car);if(!c)return;
  const ty=TYPES[u.type];giveFeats(c);
  T={uid,car:c,lines:[],pat:Math.max(1,Math.round(ty.pat*(opts.patFrac||1))),maxPat:ty.pat,rapport:0,used:{},rounds:0,
     hands:!!SR&&!opts.noMic&&!opts.inWorld,listening:false,over:false,counter:0,lastAsk:0,agreed:0,addons:[],asked:{},declines:0,err:"",summary:"",
     stated:!!opts.intro,buf:[],busy:false,financed:false,interim:"",mute:false,sold:null,lastSaid:"",inWorld:!!opts.inWorld,typing:false,ptt:false,pttBuf:"",
     warm:0,value:0,pitched:{},lies:0,justified:false,knowNeed:false,hotHit:false,coldDone:false,cried:false,wife:false,wifeDone:false,forceMood:null,crew:opts.crew?Object.assign({until:performance.now()+8000},opts.crew):null,queueNext:!!opts.crew};
  T.buf.push(opts.intro?`${opts.intro} ${ty.intro} ${line(u,"intro")}`:`Hi, I'm ${u.name}. ${line(u,"intro")} ${ty.intro} I'm looking at that ${label(c)}. ${pick(["What's the story with it?","Is it any good?","Tell me about it."])}`);
  flush();
}
// Every conversation Miguel had today, for the end-of-day reviews.
const TALK_LOG=[];
function logTalk(){
  const u=S.cust.find(x=>x.id==T.uid);if(!u)return;
  const out=T.gunned?"bought at gunpoint":T.sold?"bought":u.polite?"was sent home politely":T.over?"walked out angry":"left mid-deal";
  TALK_LOG.push({name:u.name,tag:persona(u).tag,who:persona(u).who,car:label(T.car),out,price:T.sold||0,cried:T.cried,wife:T.wifeDone,
    said:T.lines.slice(-4).map(l=>(l.who==="p"?"Miguel: ":u.name+": ")+l.text).join(" / ").slice(0,400)});
}
function closeTalk(){
  if(T)try{logTalk()}catch(e){}
  hush();if(window.Sfx&&Sfx.duck)Sfx.duck(false);if(window.Whisper)Whisper.cancel();
  try{rec&&rec.abort()}catch(e){}
  T=null;$("talk").innerHTML="";$("subs").innerHTML="";$("subs").className="";$("deal").innerHTML="";$("deal").className="";document.body.classList.remove("talking");
  if(window.G3&&G3.talkClosed)G3.talkClosed();
}

// ---------- the customer talks ----------
function say(text){T.buf.push(text)}
function flush(){
  if(!T)return;
  const text=T.buf.join(" ").trim();T.buf=[];
  if(!text){renderTalk();return}
  const uid=T.uid;
  if(!(window.AI&&AI.on())&&!T.over&&Math.random()<(persona(S.cust.find(x=>x.id==uid)).imp?.65:.3)){
    const said=T.said||(T.said=new Set()),fresh=persona(S.cust.find(x=>x.id==uid)).quips.filter(q=>!said.has(q));
    if(fresh.length){const q=pick(fresh);said.add(q);return show(text+" "+q)}}
  if(window.AI&&AI.on()&&AI.voiceOn()){
    T.busy=true;renderTalk();
    const u=S.cust.find(x=>x.id==uid);
    AI.voice({u,T,text,said:T.lastSaid}).then(v=>{if(!T||T.uid!==uid)return;T.busy=false;show(v||text)})
      .catch(()=>{if(!T||T.uid!==uid)return;T.busy=false;show(text)});
  }else show(text);
}
// The mime turns every line into a silent gesture (keeping any price as a sign held up).
function mimeify(text,m){
  const $=(text.match(/\$[\d,]+/g)||[]).pop();
  if(/I'm out|look elsewhere|leaving|Bye|out\./i.test(text))return "*pretends to walk against a strong wind, all the way out the door*";
  if(T.sold)return "*silently shakes your hand, then mimes driving away happily*";
  if($)return pick([`*silently holds up a sign: ${$}*`,`*mimes counting invisible money: ${$}*`,`*draws ${$} in the air with one finger*`]);
  const G={happy:["*gives a silent, enthusiastic thumbs up*","*mimes a big heart with both hands*","*does a tiny silent happy dance*"],
    angry:["*shakes a tiny invisible fist*","*mimes slamming an invisible door*","*crosses arms and stomps one foot, silently*"],
    worried:["*mimes being trapped inside an invisible box*","*bites invisible fingernails*"],
    confused:["*shrugs dramatically and taps an invisible watch*","*scratches head, then points at the price tag*"],
    shocked:["*mimes a jaw dropping to the floor*","*clutches chest and staggers backward*"],
    neutral:["*mimes looking at the car through an invisible window*","*pretends to lean on an invisible wall*","*mimes pulling an invisible rope toward you*","*mimes opening an invisible umbrella*","*pretends to honk an invisible horn*","*waves hello with exaggerated slowness*"]}[m]||[];
  const said=T.said||(T.said=new Set()),pool=G.length?G:[],fresh=pool.filter(x=>!said.has(x)),v=pick(fresh.length?fresh:pool.length?pool:["*stares at you in silence*"]);said.add(v);return v;
}
function show(text){
  {const cu=S.cust.find(x=>x.id==T.uid);if(cu&&persona(cu).silent){T.forceMood=T.forceMood||mood(text);text=mimeify(text,T.forceMood);T.silentLine=true}else T.silentLine=false}
  if(T.over&&T.inWorld&&!T.closing){const uid=T.uid;T.closing=setTimeout(()=>{if(T&&T.uid===uid)closeTalk()},6000)}
  T.mood=mood(text);T.lines.push({who:"c",text});renderTalk();speak(text);if(window.G3&&G3.speaking)G3.speaking(Math.min(6,1+text.length/14),T.mood)}
// Pick the customer's eyebrows from the engine's state, with the line itself as a tiebreaker.
function mood(text){
  if(T.forceMood){const m=T.forceMood;T.forceMood=null;return m}
  if(T.gunned)return"shocked";
  if(T.sold)return"happy";
  if(/I'm out|look elsewhere|stretching the truth|being sold|No way|really\?/i.test(text))return"angry";
  if(/way out of my range|steep|a lot for this/i.test(text))return"shocked";
  if(/Sorry,|what price are you|You already/i.test(text))return"confused";
  if(T.agreed||/closer|Almost|now we're talking|not far off|I like|plus|sharp|could work|Great/i.test(text))return"happy";
  if(T.pat<=1||/rough|elsewhere/i.test(text))return"worried";
  return"neutral";
}
// Say a line out loud. seed picks the voice; pitch and rate give each character their own sound.
// One speaker at a time: a new line cuts off the old one unless queue is set. Chrome's "Google" voices
// stream from the network and can keep talking after cancel(), so they're avoided when others exist.
let speakTimer=0,speakSeq=0,speakPend=[];
function voicePool(lang){
  const re=new RegExp("^"+(lang||"en"),"i"),all=speechSynthesis.getVoices().filter(v=>re.test(v.lang)),local=all.filter(v=>!/google/i.test(v.name));
  const base=local.length?local:all,nice=base.filter(v=>/natural|neural|premium|enhanced/i.test(v.name));
  return nice.length>=2?nice:base;
}
// Natural (Kokoro) voice per personality; others get one picked by seed and sex.
const KVOICE={grandma:"bf_isabella",mj:"af_sky",elvis:"am_onyx",arnold:"am_fenrir",hungry:"am_onyx",flirt:"af_bella",karen:"af_nicole",walken:"bm_lewis",
  borat:"am_puck",mrt:"am_fenrir",sparrow:"bm_fable",prepper:"am_fenrir",crypto:"am_puck",conspiracy:"am_echo",influencer:"af_nova",pokemon:"am_liam"};
function kvoiceFor(u){const k=KVOICE[u&&u.persona];if(k)return k;const list=Voices.VOICES[u&&u.sex==="f"?"f":"m"];return list[((u&&u.id)||0)*7%list.length]}
function speakLine(text,seed,pitch,rate,queue,lang,kv){
  if(window.Voices&&Voices.usable()&&lang!=="es"&&kv){try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}return Voices.say(text,kv,Math.max(.8,Math.min(1.2,rate||1)),queue)}
  if(!window.speechSynthesis)return null;
  try{
    const ut=new SpeechSynthesisUtterance(text);
    const vs=voicePool(lang);if(vs.length)ut.voice=vs[Math.abs(seed|0)%vs.length];if(lang)ut.lang=lang==="es"?"es-MX":"en-US";
    ut.pitch=Math.max(.1,Math.min(2,pitch));ut.rate=Math.max(.5,Math.min(2,rate));
    if(queue){if(speakPend.length)speakPend.push(ut);else speechSynthesis.speak(ut);return ut}
    const my=++speakSeq;clearTimeout(speakTimer);speechSynthesis.cancel();speakPend=[ut];
    // Never start a voice while another is still audible: cancel, then wait until the browser reports silence
    // (some voices keep going for a moment after cancel()). Give up waiting after 1.5 s.
    const t0=performance.now();
    const go=()=>{if(my!==speakSeq)return;
      if((speechSynthesis.speaking||speechSynthesis.pending)&&performance.now()-t0<1500){speechSynthesis.cancel();speakTimer=setTimeout(go,60);return}
      const q=speakPend;speakPend=[];q.forEach(u=>speechSynthesis.speak(u))};
    speakTimer=setTimeout(go,80);
    return ut;
  }catch(e){return null}
}
function hush(){if(window.Voices)Voices.stop();clearTimeout(speakTimer);speakSeq++;speakPend=[];try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}}
function speak(text){
  if(T.mute||T.silentLine||!window.speechSynthesis)return;
  try{
    const cu=S.cust.find(x=>x.id==T.uid),pv=persona(cu).voice,q=T.queueNext;T.queueNext=false;
    const fem=cu.sex==="f"&&pv[0]<1.2?1.28:1;   // women's voices up, unless the personality already set one
    const ut=speakLine(text,cu.id*7+cu.name.length,pv[0]*fem*(.94+(cu.id%4)*.04),pv[1]*1.04,q,"en",kvoiceFor(cu));if(!ut)return;
    ut.onend=()=>{if(T&&T.hands&&!T.over&&!T.busy)listen()};
  }catch(e){}
}

// ---------- the player talks ----------
function listen(){
  if(!SR||!T||T.listening||T.over||T.busy)return;
  hush();
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
  S.guns--;T.gunned=true;T.addons=[];T.wife=false;
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
  if(!T.agreed&&!price){
    if(/test ?drive|take (it|her|this) (out|for a (spin|drive|ride))|go for a (spin|ride|drive)|drive it|get behind the wheel|grab the keys/.test(t))return{type:"testdrive"};
    if(/trade[- ]?in|trading (in|it)|your trade|trade (it|your|that)|what are you driving now|current car/.test(t))return{type:"trade"};
    if(/carfax|history report|owners?|one owner|service records|clean title|salvage|title/.test(t))return{type:"history"};
    if(/budget|how much (do|are|were|can) you|what (number|price) (works|were you|are you|do you|can you)|what would it take|where do you need to be|what can you (afford|do)|price range|ballpark/.test(t))return{type:"budget"};
  }
  if(T.agreed){
    if(price)return{type:"offer",price};
    if(/\b(done|that's all|that is all|finalize|sign|paperwork|close|deal|sold|shake|agreed|ok|okay|yes|sure|fine)\b/.test(t))return{type:"finalize"};
    return{type:"unclear"};
  }
  const feats=Object.keys(FEATS).filter(k=>FEATS[k].re.test(t));
  if(feats.length)return{type:"sizzle",which:feats};
  if(/what (are you|do you|you) (looking for|need|want)|what's important|what matters|what brings you|tell me about (yourself|you)|what do you use|what will you use|how will you use|what are you driving|your current car|what happened to your|priorit|what are you after|what kind of car/.test(t))return{type:"needs"};
  for(const k in HOT)if(HOT[k].re.test(t))return{type:"hot",which:k};
  if(/looking for|tell me about|what do you need|what brings|family|commute|kids|nice to meet|welcome|congrat|how are you|how's it going|how you doing|how's your|your day|weather|sunny|hot today|cold today|what do you do|for work|your job|where are you from|where you from|love your|like your|nice (shirt|hat|shoes|jacket|glasses)|you look|weekend|hobby|sports|football|basketball|baseball|soccer|hockey|fishing|golf|game last night|your team|your eyes|pets?|dog|cat|wife|husband|girlfriend|boyfriend|thank you for coming|appreciate you|good to see/.test(t))return{type:"rapport"};
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
  return{type:/\?\s*$|^(what|why|how|who|where|when|do|does|did|is|are|can|could|would|will|have|has)\b/.test(t)?"question":"unclear",text:s};
}
// When the customer doesn't follow, they at least react to what Miguel actually said (instead of "say a number").
const STOP=new Set("a an the i i'm im you you're your yours me my mine we our us it it's its is are was were be been am do does did to of in on at for with and or but so if then that this these those there here what why how who where when which can could would will should have has had just really very like okay ok um uh well yeah yes no not get got go going gonna wanna kinda about from up out as by man dude bro buddy sir maam ma'am".split(" "));
function topicOf(s){
  const words=String(s).replace(/[^\w' -]/g," ").split(/\s+/).filter(Boolean);let best=[],cur=[];
  for(const w of words){if(!STOP.has(w.toLowerCase())&&w.length>2){cur.push(w);if(cur.length>best.length)best=cur.slice()}else cur=[]}
  return best.slice(0,4).join(" ").toLowerCase();
}
function echo(u,I){
  const x=topicOf(I.text),car=T.car?T.car.model:"car";
  if(!x||Math.random()<.25)return line(u,"unclear");
  const cap=t=>t.replace(/^("?)(\w)/,(m,q,c)=>q+c.toUpperCase());
  return cap(pick(I.type==="question"?[`${x}? Good question. No idea. You're the car guy, you tell me.`,`Why are you asking me about ${x}? Is this a survey?`,`${x}... honestly I'd rather talk about the price of this ${car}.`,`Ask me about ${x} after you take a grand off.`]
    :[`"${x}"? Okay... not sure what that has to do with this ${car}.`,`Huh. ${x}. Cool. So, the price?`,`I'll be honest, you lost me at "${x}".`,`${x}? Is that a sales trick? My brother-in-law warned me about tricks.`,`Right, right, ${x}. My cousin says that too. Anyway. The ${car}?`]));
}

function runIntent(u,I){
  const c=T.car,f=u.type==="researcher"?.5:1;
  if(T.wife)return wifeTalk(u,I);
  if(I.type==="release")return release(u);
  if(I.type==="addon")return I.which==="finance"?finance(u):pitch(u,I.which);
  if(I.type==="finalize"){if(T.agreed)return finalize(u);return say("Let's settle on the price first.")}
  if(T.agreed){
    if(I.type==="offer")return say(`We agreed on ${$f(T.agreed)}. Let's do the paperwork.`);
    if(I.type==="accept")return finalize(u);
    return say(pick(["So are we all set? Anything else, or shall we sign?","Are we signing or what? My parking meter's running.","Is there more? Please say no."]));
  }
  if((I.type==="offer"||I.type==="middle")&&!T.warm&&!T.coldDone){   // a price before any warm-up: they push back once
    T.coldDone=true;T.event="cold";bump(u,-.03);T.forceMood="angry";return say(line(u,"cold"))}
  switch(I.type){
    case"sizzle":{   // selling the car's features: real ones build value, fake ones are lies
      T.warm++;giveFeats(c);
      const has=I.which.filter(k=>c.feats.includes(k)),fake=I.which.filter(k=>FEATS[k]&&!c.feats.includes(k)),fresh=has.filter(k=>!T.pitched[k]);
      if(fake.length){
        T.lies++;T.event="lie";bump(u,-.03);T.forceMood="angry";const f=FEATS[fake[0]].n;
        if(T.lies>=2&&tire(u,2,line(u,"sizzleLie",{f})+" Twice now. I'm out."))return;
        return say(line(u,"sizzleLie",{f}));
      }
      if(!fresh.length)return say(line(u,"sizzleAgain",{f:FEATS[has[0]].n}));
      let hit=false;T.event="good";
      fresh.forEach(k=>{T.pitched[k]=1;const h=FEATS[k].hot===u.hot;if(h)hit=true;T.value+=h?2:1;bump(u,h?.045:.022,null,1.35)});
      T.forceMood="happy";
      return say(line(u,hit?"sizzleHot":"sizzleYes",{f:fresh.map(k=>FEATS[k].n).join(" and ")}));
    }
    case"needs":{
      const h=HOT[u.hot]||HOT.deal;
      if(T.knowNeed)return say(line(u,"needsAgain",{need:pick(h.need)}));
      T.knowNeed=true;T.warm++;T.event="good";bump(u,.01,"needs");T.forceMood="happy";
      return say(`${pick(["Ah, finally, somebody asks.","Okay, real talk.","Glad you asked."])} ${pick(h.need)}`);
    }
    case"hot":{
      T.warm++;
      if(I.which!==u.hot)return say(line(u,"hotNo"));
      if(T.hotHit)return say(pick(["Yeah, you said. I like it.","Right, right. That's the good stuff."]));
      T.hotHit=true;T.event="good";bump(u,.06);T.rapport=Math.min(3,T.rapport+1);T.forceMood="happy";
      return say(line(u,"hotYes"));
    }
    case"rapport":T.warm++;
      if(T.rapport<3&&bump(u,.015*f,"r"+T.rapport)){T.rapport++;T.event="good";return say(Math.random()<.4?RAPPORT[u.type][T.rapport%2]:line(u,"rapport"))}
      return say(line(u,"numbers"));
    case"pitch_miles":
      if(c.miles<70000){bump(u,.02*f,"miles");return say(line(u,"milesYes"))}
      if(tire(u,1,"You're stretching the truth. I'm out."))return;
      return say(line(u,"milesNo"));
    case"pitch_cond":
      if(c.cond>=85){bump(u,.025*f,"cond");return say(line(u,"condYes"))}
      bump(u,-.02,"cond");
      if(tire(u,1,"I don't like being sold. I'm out."))return;
      return say(line(u,"condNo"));
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
      if(!(I.price>=100))return say(line(u,"unclear"));
      return offerPrice(u,Math.round(I.price));
    case"accept":
      if(T.counter)return agree(u,T.counter);
      return say("Great! What price are you thinking?");
    case"refuse":
      if(tire(u,1,line(u,"walk")))return;
      return say(line(u,"refuse",{n:$f(T.counter||u.offer)}));
    case"greet":T.warm=Math.max(T.warm,0);return say(line(u,"greet"));
    case"chat":return say(I.reply||line(u,"unclear"));
    case"testdrive":T.warm++;bump(u,.01*f,"td");return say(pick([`A test drive? Sure. Does it... start?`,`Yeah, let's drive it. If the ${c.model} makes it around the block I'm halfway sold.`,`Can I drive it? I promise I only hit one mailbox last time.`,`Ooh, yes. Do I get to honk?`]));
    case"trade":return say(pick([`My trade? It's a ${pick(["2003 Buick LeSabre","Ford Focus with no reverse","minivan that smells like soup","PT Cruiser. Don't laugh","Kia with three hubcaps"])}. It runs. Mostly. What'll you give me?`,`I'd trade in my current car but I think it's legally a planter now.`,`Trade-in? I took the bus here. Does a bus pass count?`]));
    case"history":return say(c.miles<70000?pick([`One owner, low miles? Okay, show me the Carfax.`,`Clean history? Then why's it on THIS lot?`]):pick([`${Math.round(c.miles/1000)}K miles. How many owners is that, like twelve?`,`Has it been in an accident? Don't lie, I'll know. I won't know. But I'll feel it.`]));
    case"budget":{const b=Math.round(u.budget*.85/500)*500;T.warm++;return say(pick([`Honestly? I was hoping to stay around ${$f(b)}.`,`My wife said ${$f(b)}. My wife says a lot of things.`,`Like... ${$f(b)}? Is that crazy? Don't answer that.`]))}
    case"question":case"unclear":return say(echo(u,I));
    default:return say(line(u,"unclear"));
  }
}

// ---------- the rules ----------
// raise (or lower) the customer's walk-away price; key makes it one-time
// stretch: how far past their budget a raise can go (selling real features stretches it further)
function bump(u,pct,key,stretch){
  if(key){if(T.used[key])return false;T.used[key]=1}
  const cap=Math.min(u.budget*(stretch||1.1),marketValue(T.car)*1.8);
  u.reserve=Math.round(Math.max(Math.min(cap,u.reserve*(1+pct)),pct<0?0:u.reserve)/50)*50;
  u.offer=Math.min(u.offer,u.reserve);
  return true;
}
// drain patience; true if the customer walked
function tire(u,n,msg){T.pat-=n;if(T.pat<=0){walk(u,msg);return true}return false}
function offerPrice(u,price){
  T.lastAsk=price;
  if(price<=u.reserve)return agree(u,price);
  // a big number with no value built: they want to hear why it's worth it (once)
  if(!T.value&&!T.justified&&price>u.reserve*1.08){T.justified=true;T.event="justify";T.forceMood="confused";return say(line(u,"justify",{p:$f(price)}))}
  const hopeless=u.reserve<=T.car.cost*1.05;
  if(price>u.reserve*1.3&&!hopeless)return walk(u,pick(["That's way out of my range.","Way, WAY too much.","Not even close."])+" "+line(u,"walk"));
  T.rounds++;
  if(tire(u,1,line(u,"walk")))return;
  const step=Math.min(1,T.rounds/Math.max(2,T.maxPat-1));
  T.counter=Math.max(T.counter,Math.round((u.offer+(u.reserve-u.offer)*step)/50)*50);
  const far=price>u.reserve*1.1;T.event=far?"far":"close";
  say(`${line(u,far?"far":"close")} ${line(u,"counter",{n:$f(T.counter)})}`);
}
function agree(u,p){
  T.agreed=p;T.event="agreed";
  if(u.married&&!T.wifeDone&&!T.gunned&&Math.random()<.5){
    const C=caller(u);
    T.wife=true;T.wifeDone=true;T.forceMood="worried";
    return say(`${pick(["Okay,","Alright,"])} ${$f(p)}. Hold on, my phone's ringing. ${pick([`Oh no. It's my ${C.who}.`,`It's my ${C.who}. ${C.She} heard I'm at a car lot.`])} ${C.She} wants to talk to you. ${pick(["Make it good.","Good luck, man.",`Be careful, ${C.she} can smell fear.`])}`);
  }
  say(line(u,"agree",{p:$f(p)}));
}
// Who calls mid-deal, by personality (a grandma's grandson, a dumped customer's ex...).
const CALLERS={grandma:["grandson","He","he","him"],mom:["dad","He","he","him"],dumped:["ex","She","she","her"],karen:["husband","He","he","him"]};
function caller(u){const c=CALLERS[u.persona]||(u.sex==="f"?["husband","He","he","him"]:["wife","She","she","her"]);return {who:c[0],She:c[1],she:c[2],her:c[3]}}
// The wife (or whoever) is on the phone: charm her or the price drops.
function wifeTalk(u,I){
  const C=caller(u);
  if(I.type==="release")return release(u);
  if(I.type==="finalize"||I.type==="accept"||I.type==="addon")return say(`${C.She}'s still on the phone, man! Talk to ${C.her} first!`);
  if(I.type==="refuse"||I.type==="offer"){T.wife=false;T.forceMood="angry";if(tire(u,1,`${C.She} hung up on you. And now I'm sleeping on the couch. I'm out.`))return;return say(`${C.She} hung up. ${C.She}'s furious. Fine, ${$f(T.agreed)}, but let's hurry before ${C.she} calls back.`)}
  T.wife=false;
  if(Math.random()<.45+.15*T.rapport+(persona(u).soft?.1:0)){T.forceMood="happy";return say(pick([`...Okay. ${C.She} says fine. But now you're coming to Thanksgiving.`,`${C.She} likes you! ${C.She} says you sound like a man with a lot of posters. We're good.`,`${C.She} says yes. ${C.She} also wants your number. That's weird. Let's sign.`]))}
  const off=Math.min(400,Math.max(100,Math.round(T.agreed*.06/50)*50));T.agreed-=off;T.forceMood="worried";
  say(`${C.She}'s not buying it. ${C.She} says knock off ${$f(off)} or I'm sleeping in this car tonight. So it's ${$f(T.agreed)}. Sorry, man.`);
}
// Miguel breaks down. Soft-hearted customers melt; hard ones smell weakness. Once per deal.
function cryDeal(){
  if(!T||T.over||T.busy||T.cried)return;
  const u=S.cust.find(x=>x.id==T.uid);if(!u)return;
  T.cried=true;T.lines.push({who:"p",text:"*Miguel breaks down sobbing*"});T.lastSaid="(Miguel starts crying)";T.err="";
  if(window.G3&&G3.cry)G3.cry();
  T.buf=[];
  if(T.wife){const C=caller(u);T.wife=false;T.forceMood="happy";say(`Hold on... ${C.she} heard you crying. ${C.She} says pay the man, he's clearly going through something. We're good.`)}
  else if(persona(u).soft||["fan","budget"].includes(u.type)){
    bump(u,.08);T.rapport=Math.min(3,T.rapport+1);T.forceMood="worried";
    say(pick(["Oh no, buddy, don't cry. Okay, okay, I can go a little higher.","Are you... are you crying? Jeez. Fine. Let's figure this out, man.","Hey, hey, it's okay. I didn't mean it. Let's work something out."]));
  }else{
    bump(u,-.04);T.forceMood="happy";
    if(tire(u,1,"Crying at a car lot? I'm out. Get some help, Miguel."))return flush();
    say(pick(["Tears don't work on me, Miguel. My offer just went down.","Are you crying? Pathetic. I smell weakness.","Wow. I'm putting this on the internet."]));
  }
  flush();
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
  if(Math.random()<p){T.addons.push(k);if(k==="finance")T.financed=true;return say(line(u,"addonYes",{a:a.n})+(a.price?` ${$f(a.price)}.`:""))}
  T.declines++;
  say(line(u,T.declines>=2?"enough":"addonNo"));
}
function finalize(u){
  const i=S.inv.findIndex(c=>c.id==u.car);if(i<0)return;
  const c=S.inv[i],p=T.agreed;
  if(T.financed&&!T.addons.includes("finance"))T.addons.push("finance");
  const ad=T.addons.map(k=>ADDONS[k]);
  const front=p-c.cost,back=ad.reduce((s,a)=>s+a.price-a.cost,0);
  const room=Math.max(1,u.reserve-u.offer),pct=Math.max(0,Math.min(100,Math.round(100*(p-u.offer)/room)));
  T.over=true;T.sold=p;u.gross=front+back;u.front=front;u.gunned=!!T.gunned;finishSale(u,c,i,p,ad);
  const grade=pct>=95?"🏆 Maxed it":pct>=80?"👍 Strong deal":pct>=50?"Okay deal":"💸 Money left on the table";
  T.summary=`<b>${grade}</b><br>Price ${$f(p)} · front gross ${$f(front)} · back-end ${$f(back)} · <b>total ${$f(front+back)}</b><br>Their limit was ${$f(u.reserve)}. You captured ${pct}% of the room and left ${$f(Math.max(0,u.reserve-p))}.`;
  say(line(u,"thanks"));
  if(window.Sfx)Sfx.cash();
}
function release(u){
  if(T.agreed)return finalize(u);
  const c=T.car,hopeless=u.reserve<=c.cost*1.05;
  u.polite=true;u.hopeless=hopeless;T.over=true;u.done=true;u.msg="Walked away.";
  T.summary=hopeless?`<b>👍 Good call.</b> They topped out around ${$f(u.reserve)} on a car you paid ${$f(c.cost)} for. No more time wasted.`
    :`<b>🤝 Sent on their way.</b> That one was winnable: their limit was ${$f(u.reserve)}, so you could have grossed ${$f(u.reserve-c.cost)}.`;
  say(line(u,"release"));
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
// What the customer is doubting right now, if anything, and what to try.
function doubt(u){
  if(T.over)return null;
  if(T.wife)return {icon:"📞",col:"purple",cls:"d-wife",title:`On the phone with their ${caller(u).who}`,why:"The deal is on hold until they're convinced.",tip:"Charm them: small talk, pitch the car, or cry."};
  if(!T.agreed&&T.pat<=1)return {icon:"⏳",col:"red",cls:"d-walk",title:"About to walk!",why:"They're out of patience.",tip:"Close now: meet them, split the difference, or let them go."};
  if(T.event==="lie")return {icon:"😠",col:"red",cls:"d-trust",title:"Doesn't trust you",why:"You claimed a feature this car doesn't have.",tip:"Only sell what's really there. Build rapport back."};
  if(T.event==="justify")return {icon:"🤔",col:"",cls:"d-price",title:"In doubt about the price",why:"They don't see why it's worth that much.",tip:"Sell the sizzle: pitch the car's features."};
  if(T.event==="cold")return {icon:"❄️",col:"blue",cls:"d-cold",title:"Put off",why:"You went straight to numbers.",tip:"Small talk first, then ask what they need."};
  if(T.event==="far")return {icon:"🤔",col:"",cls:"d-price",title:"Thinks you're too high",why:"Your number is well above what they'll pay.",tip:T.value<3?"Build more value, or come down a bit.":"Come down a little, or split the difference."};
  return null;
}
const MOODS={happy:["😄","Happy"],neutral:["😐","Neutral"],angry:["😠","Annoyed"],worried:["😟","Worried"],shocked:["😲","Shocked"],confused:["🤔","Unsure"]};
function renderDeal(u,c,best,back,dbt){
  const el=$("deal");if(!el)return;el.className="on";
  const md=MOODS[T.mood||"neutral"]||MOODS.neutral,pct=(v,m)=>Math.max(0,Math.min(100,Math.round(v/m*100)));
  const bar=(v,col)=>`<div class=bar><i style="width:${v}%;background:${col}"></i></div>`;
  const trust=Math.max(0,Math.min(5,1+T.rapport-T.lies*2)),warm=T.warm>=2?"🔥 Warmed up":T.warm===1?"🙂 Warming up":"❄️ Cold";
  const hot=HOT[u.hot]||HOT.deal,tips=[];
  if(!T.agreed){
    if(T.warm<1)tips.push("Break the ice: ask about their day.");
    else if(!T.knowNeed)tips.push("Ask what they're looking for.");
    else if((c.feats||[]).some(k=>!T.pitched[k]))tips.push("Pitch the features"+(T.hotHit?"":" (and what they care about)")+".");
    else tips.push("Name your price. Hold firm or split the difference.");
  }else tips.push("Offer add-ons (1-4), then press F to sign.");
  el.innerHTML=`<div class=dp-head><div class=dp-face>${md[0]}</div><div><div class=dp-name>${esc(u.name)}</div><div class=dp-sub>${esc(persona(u).tag)} · ${esc(label(c))}</div><div class=dp-mood>${md[1]} · ${warm}</div></div></div>
   ${dbt?`<div class="dp-doubt ${dbt.cls}">${dbt.icon} ${esc(dbt.title)}<div class=w>${esc(dbt.why)}</div><div class=w>👉 ${esc(dbt.tip)}</div></div>`:T.agreed?`<div class=dp-good>🤝 Agreed at ${$f(T.agreed)}${back?` · +${$f(back)} back-end`:""}</div>`:""}
   <div class=m><span>Patience</span>${bar(pct(T.pat,T.maxPat),T.pat<=1?"#f0524a":T.pat<=2?"#ffb81c":"#4cc569")}
     <span>Trust</span>${bar(pct(trust,5),trust<=1?"#f0524a":"#6ac8ff")}
     <span>Value built</span>${bar(pct(T.value,6),"#ffc93a")}</div>
   ${T.agreed?"":`<div class=px><span>Your ask<br><b>${$f(T.lastAsk||c.price)}</b></span><span style="text-align:right">Their offer<br><b>${best?$f(best):"–"}</b>${best&&best<c.cost?`<br><span class=bad>under cost</span>`:""}</span></div>`}
   <div class=chips>${(c.feats||[]).map(k=>`<span class="chip${T.pitched[k]?" on":""}${T.knowNeed&&FEATS[k].hot===u.hot?" hot":""}">${T.pitched[k]?"✔ ":""}${esc(FEATS[k].n)}</span>`).join("")}</div>
   <div class=tipline>${T.knowNeed?`❤️ Cares about <b>${esc(hot.n)}</b>${T.hotHit?" ✔":""}<br>`:""}👉 ${esc(tips[0])}</div>`;
}
function renderSubs(){
  const u=S.cust.find(x=>x.id==T.uid),c=T.car,box=$("subs"),old=($("tin")||{}).value||"";
  const rev=T.lines.slice().reverse(),lastC=rev.find(l=>l.who==="c"),lastP=rev.find(l=>l.who==="p");
  const best=T.counter||(T.stated?u.offer:0);
  const pat="●".repeat(Math.max(0,T.pat))+"○".repeat(Math.max(0,T.maxPat-T.pat));
  const back=T.addons.reduce((s,k)=>s+ADDONS[k].price-ADDONS[k].cost,0)+(T.financed&&!T.addons.includes("finance")?ADDONS.finance.price:0);
  const dl=window.Whisper&&micMode==="whisper"&&!Whisper.ready?` · downloading speech model (first time only) ${Math.round(Whisper.progress*100)}%`:"";
  const status=T.transcribing?(dl?"✍️ Getting ready"+dl:"✍️ Working out what you said…"):T.ptt&&T.pttLatch?"🎙️ Listening… tap <b>V</b> again to send":T.ptt||T.listening?"🎙️ Listening…"+dl:T.busy?`${esc(u.name)} is thinking…`:"";
  box.className="on";document.body.classList.add("talking");
  const dbt=doubt(u);renderDeal(u,c,best,back,dbt);
  box.innerHTML=`${dbt&&!T.over?`<div class="doubt ${dbt.col}">${dbt.icon} ${esc(dbt.title)}</div>`:""}
  ${T.crew&&performance.now()<T.crew.until?`<div class="sub s"><b>${esc(T.crew.name)}:</b> ${esc(T.crew.text)}</div>`:""}
  ${lastC?`<div class="sub c"><b>${esc(u.name)}</b> <span class=tag>(${esc(persona(u).tag)})</span><b>:</b> ${esc(lastC.text)}</div>`:""}
  ${T.interim?`<div class="sub p"><b>You:</b> <i>${esc(T.interim)}…</i></div>`:lastP?`<div class="sub p dimmed"><b>You:</b> ${esc(lastP.text)}</div>`:""}
  ${status?`<div class=substatus>${status}</div>`:""}${T.err?`<div class="substatus bad">${esc(T.err)}</div>`:""}
  ${T.summary?`<div class=subsum>${T.summary}</div>`:""}
  ${T.typing?`<div><input id=tin type=text autocomplete=off placeholder="Say something… Enter to send, Esc to cancel" onkeydown="event.stopPropagation();if(event.key==='Enter')typeSend();else if(event.key==='Escape')typeStop()"></div>`:""}
  ${T.over?"":`<div class=subkeys>${SR?"<b>Hold V</b> (or tap) to talk · ":""}<b>T</b> type · ${T.agreed?"<b>1</b> warranty · <b>2</b> GAP · <b>3</b> accessories · <b>4</b> financing · <b>F</b> sign":"<b>4</b> offer financing"} · walk away to leave${T.cried?"":" · <b>X</b> cry"}${S.guns>0?` · <b>G</b> "I have a gun" (${S.guns} left)`:""}${SR?` · <b>H</b> hands-free ${T.hands?"on":"off"}`:""}</div>`}`;
  if(T.typing){const ti=$("tin");if(ti){ti.value=old;if(document.activeElement!==ti)ti.focus()}}
}
// V to talk. Hold it while you speak, or tap it once to start and tap again to send.
// The browser's recognizer quits on its own after a pause; while V is held (or latched) we restart it.
// Plain-words reasons the browser's speech recognition failed.
const MIC_ERR={"not-allowed":"Mic blocked. Click the mic or lock icon in the address bar, allow the microphone, then try again. Or press T to type.",
  "service-not-allowed":"This browser won't do speech recognition. Use Chrome or Edge (Brave, Opera and Firefox don't support it), or press T to type.",
  "network":"Speech recognition couldn't reach Google's servers. It needs an internet connection and Chrome or Edge. Press T to type for now.",
  "audio-capture":"No microphone found. Plug one in or check Windows sound settings, or press T to type.",
  "language-not-supported":"Your browser can't recognize English speech. Press T to type."};
// Which recognizer to use: the browser's own, or Whisper running in the page (js/whisper.js).
// Brave and Firefox can't use the browser's, and any browser falls back to Whisper after a network error.
let micMode=(()=>{try{const m=localStorage.getItem("bobsMic");if(m==="whisper"||m==="browser")return m}catch(e){}return !SR||navigator.brave?"whisper":"browser"})();
function useWhisper(){micMode="whisper";try{localStorage.setItem("bobsMic","whisper")}catch(e){}if(window.Whisper)Whisper.load().catch(()=>{})}
function pttStart(at){
  if(!T||T.over||T.transcribing)return;
  if(T.busy){T.err="Hang on, they're still answering.";renderTalk();return}
  if(micMode==="whisper"&&window.Whisper)return wStart(at);
  if(!SR){T.err="This browser can't listen. Press T to type.";renderTalk();return}
  if(T.ptt){if(T.pttLatch){T.pttLatch=false;pttFinish()}return}   // second tap sends
  hush();
  try{rec&&rec.abort()}catch(e){}
  T.ptt=true;T.pttHeld=true;T.pttLatch=false;T.pttAt=at||performance.now();T.pttBuf="";T.interim="";T.err="";
  pttListen(T.uid);renderTalk();
}
function pttListen(uid){
  const r=new SR();rec=r;r.lang="en-US";r.interimResults=true;r.continuous=true;
  let tmp="";
  r.onresult=e=>{
    if(!T||T.uid!==uid)return;tmp="";
    for(let i=e.resultIndex;i<e.results.length;i++){const x=e.results[i];if(x.isFinal)T.pttBuf+=x[0].transcript+" ";else tmp+=x[0].transcript}
    T.interim=(T.pttBuf+tmp).trim();renderTalk();
  };
  r.onerror=e=>{if(!T||T.uid!==uid)return;
    if(["network","service-not-allowed","language-not-supported"].includes(e.error)&&window.Whisper){
      useWhisper();T.pttHeld=T.pttLatch=false;T.err="Your browser's speech service isn't reachable, so the game switched to its own speech recognition. Hold V and talk again."}
    else if(MIC_ERR[e.error]){T.err=MIC_ERR[e.error];T.pttHeld=T.pttLatch=false;T.micFail=true}
    renderTalk()};
  r.onend=()=>{
    if(!T||T.uid!==uid||rec!==r)return;
    if(tmp)T.pttBuf+=tmp+" ";
    if(T.ptt&&(T.pttHeld||T.pttLatch)){try{pttListen(uid)}catch(e){pttFinish()}return}   // still talking: keep listening
    pttFinish();
  };
  try{r.start()}catch(e){}
}
function pttFinish(){
  if(!T)return;const r=rec;T.ptt=false;T.pttHeld=false;
  const s=(T.pttBuf||T.interim||"").trim();T.interim="";T.pttBuf="";
  rec=null;try{r&&r.abort()}catch(e){}
  if(s)handleSay(s);else{T.err=T.err||"Didn't hear anything. Hold V (or tap it) and talk. If this keeps happening, check that your browser has mic access and the right microphone is selected.";renderTalk()}
}
// Whisper version of push-to-talk: record while V is held (or latched), then transcribe in the page.
function wStart(at){
  if(T.ptt){if(T.pttLatch){T.pttLatch=false;wFinish()}return}
  hush();T.ptt=true;T.pttHeld=true;T.pttLatch=false;T.pttAt=at||performance.now();T.err="";T.interim="";
  const uid=T.uid;
  Whisper.load().catch(()=>{});
  if(!Whisper.ready){clearInterval(wTick);wTick=setInterval(()=>{if(!T||Whisper.ready)clearInterval(wTick);if(T)renderTalk()},500)}
  Whisper.start().catch(e=>{
    if(!T||T.uid!==uid)return;T.ptt=false;const m=(e.name||"")+" "+(e.message||"");
    T.err=/NotAllowed|denied|Permission/i.test(m)?MIC_ERR["not-allowed"]:/NotFound|device/i.test(m)?MIC_ERR["audio-capture"]:"Couldn't open the mic: "+m;renderTalk()});
  renderTalk();
}
let wTick=0;
function wFinish(){
  if(!T)return;const uid=T.uid;T.ptt=false;T.pttHeld=false;T.transcribing=true;renderTalk();
  Whisper.stop().then(s=>{if(!T||T.uid!==uid)return;T.transcribing=false;
      if(s)handleSay(s);else{T.err="Didn't catch that. Hold V while you talk, a bit louder.";renderTalk()}})
    .catch(e=>{if(!T||T.uid!==uid)return;T.transcribing=false;
      T.err="The speech model couldn't load ("+(e.message||e)+"). Check your connection (and Brave Shields for this site), or press T to type.";renderTalk()});
}
function pttStop(at){
  if(micMode==="whisper"&&T&&T.ptt&&T.pttHeld){T.pttHeld=false;if((at||performance.now())-T.pttAt<350){T.pttLatch=true;renderTalk()}else wFinish();return}
  if(!T||!T.ptt||!T.pttHeld)return;
  T.pttHeld=false;
  if((at||performance.now())-T.pttAt<350){T.pttLatch=true;renderTalk();return}   // a quick tap: keep listening until the next tap
  // let the recognizer flush the last words, then send
  const r=rec;try{r&&r.stop()}catch(e){}
  setTimeout(()=>{if(T&&T.ptt&&!T.pttLatch&&rec===r)pttFinish()},1200);
}
function typeStart(){if(!T||T.over)return;T.typing=true;renderTalk()}
function typeStop(){if(!T)return;T.typing=false;renderTalk()}
function typeSend(){const el=$("tin"),v=el&&el.value.trim();T.typing=false;if(v)handleSay(v);else renderTalk()}
