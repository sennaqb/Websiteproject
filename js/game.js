"use strict";
// First-person 3D lot. You are the manager: prep in your office, open the lot, then save the deals your salespeople can't close.
(function(){
const SHIFT_SECONDS=480, OPEN_MIN=540, CLOSE_MIN=1080, LANE_Z=0;
const G={phase:"title",on:false,t:0,anim:0,yaw:Math.PI,pitch:0,px:0,pz:-17,keys:{},vx:0,vz:0,bob:0,bobAmt:0,sprint:false,fov:72,shake:0,flash:0,box:0,pops:[],cashShown:0,cust:[],sales:[],cars:{},drives:[],minis:0,miniBots:[],stats:null,feed:[],talk:null,ended:false,acc:0,drag:false,lastSky:-1,boardKey:""};
let W,canvas,last=0;
const P=(x,z)=>({x,z});

// ---------- overlays ----------
const el=id=>document.getElementById(id);
function overlayOpen(){return (!!T&&!T.inWorld)||el("pc").style.display==="flex"||el("pause").style.display==="flex"||el("title").style.display==="flex"}
function showPause(html){
  if(document.pointerLockElement)document.exitPointerLock();
  el("pausetxt").innerHTML=html;el("pause").style.display="flex";
}
function hidePause(){el("pause").style.display="none"}
function lockMouse(){if(canvas&&canvas.requestPointerLock){try{const r=canvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{G.drag=true})}catch(e){G.drag=true}}}
function toast(m,col){say3(m,col)}
function say3(msg,col){G.feed.unshift({t:G.anim,msg,col:col||"#fff"});G.feed=G.feed.slice(0,6)}

// ---------- title ----------
function showTitle(){
  G.phase="title";if(W)W.setTime(.9);document.body.classList.remove("playing");
  const ai=window.AI;
  const aiRow=ai.mode==="rules"
    ?`<div class=dim>AI customers: paste a <b>Gemini</b> key (free at aistudio.google.com/apikey) or an <b>Anthropic</b> key to have AI play the customers. It's stored only in this browser.<br><input id=apikey type=password placeholder="AQ.… / AIza… or sk-ant-…" style="width:70%"> <button class=b onclick="Game.saveKey()">Save key</button></div>`
    :`<div><label><input type=checkbox id=aiToggle ${ai.on()?"checked":""} onchange="Game.toggleAI(this.checked)"> <b>${esc(ai.mode==="key"?ai.who():"Claude")} plays the customers</b> <span class=dim>(${esc(ai.status())})</span></label>${ai.mode==="key"?` <button class=b onclick="Game.clearKey()">Remove key</button>`:""}</div>`;
  el("title").innerHTML=`<div class=titlebox>
    <div class=kicker>Used cars. All sales final.</div>
    <h1>Bargain Bob's Auto Mart</h1>
    <p>You're Miguel: manager of the worst lot in town, and employee of the month every month. His trucks keep the lot full of junk. Your salespeople cave on price, stall, or lose the customer. Some deals close themselves. Some are a waste of your time. The rest need you.</p>
    <div class=btnrow>${hasSave()?`<button class=go onclick="Game.start(false)">Continue</button>`:""}<button class="${hasSave()?"b":"go"}" onclick="Game.start(true)">New game</button></div>
    <div class=aibox>${aiRow}<div class=dim id=ainote>${esc(ai.note||"")}</div>
      <div class=dim style="margin-top:6px">${!window.claude&&navigator.mediaDevices?"🎙️ Voice is ready: walk up to a customer and hold <b>V</b> to talk. <button class=b onclick=\"Game.micTest()\">Test mic</button> <span id=micres></span>":"🎙️ This page can't use your microphone, so you'll type (press <b>T</b>). For voice, play the hosted version in Chrome or Edge."}</div></div>
      <div class=dim style="margin-top:6px"><label><input type=checkbox ${window.Voices&&Voices.on?"checked":""} onchange="Voices.setOn(this.checked)"> 🗣️ <b>Natural voices</b></label> <span id=vstat>${window.Voices?esc(Voices.status()):""}</span> <button class=b id=vretry style="display:none" onclick="Voices.retry()">Retry</button></div>
    <div class=keys><b>WASD</b> move · <b>Shift</b> sprint · <b>Mouse</b> look (click and drag if it won't lock) · <b>←/→</b> turn · <b>E</b> use / take over · <b>Q</b> send Mini Miguel to a T.O. (2 a day) · <b>L</b> Tiffany walks the lot (2 a day) · <b>C</b> see yourself · <b>M</b> mute · <b>Esc</b> pause</div>
  </div>`;
  el("title").style.display="flex";
}
// Listen for a few seconds on the title screen and report what was heard, or why nothing was.
function micTest(){
  const out=el("micres");if(!out)return;
  if(micMode==="whisper"||!SR)return micTestWhisper(out);
  const r=new SR();r.lang="en-US";r.interimResults=true;r.continuous=true;let heard="";
  out.textContent="Listening… say something like “I can do five thousand”.";
  r.onresult=e=>{heard="";for(let i=0;i<e.results.length;i++)heard+=e.results[i][0].transcript;out.textContent="Heard: “"+heard.trim()+"”"};
  r.onerror=e=>{
    if(["network","service-not-allowed","language-not-supported"].includes(e.error)){useWhisper();heard="-";out.textContent="Your browser's speech service isn't reachable, so the game will use its own. Testing that now…";setTimeout(()=>micTestWhisper(out),600);return}
    out.textContent=MIC_ERR[e.error]||("Mic error: "+e.error)};
  r.onend=()=>{if(!heard&&/Listening/.test(out.textContent))out.textContent="Didn't hear anything. Check the browser has mic access and the right microphone is selected (Windows sound settings)."};
  try{r.start();setTimeout(()=>{try{r.stop()}catch(e){}},4500)}catch(e){out.textContent="Couldn't start the mic: "+e.message}
}
// Same test with the in-page Whisper recognizer: record 4 seconds, then transcribe.
async function micTestWhisper(out){
  const dl=setInterval(()=>{if(!Whisper.ready&&/Downloading|Working/.test(out.textContent))out.textContent=`Downloading the speech model (first time only): ${Math.round(Whisper.progress*100)}%…`},400);
  Whisper.load().catch(()=>{});
  try{await Whisper.start()}catch(e){clearInterval(dl);const m=(e.name||"")+" "+(e.message||"");out.textContent=/NotAllowed|denied|Permission/i.test(m)?MIC_ERR["not-allowed"]:/NotFound|device/i.test(m)?MIC_ERR["audio-capture"]:"Couldn't open the mic: "+m;return}
  out.textContent="Listening for 4 seconds… say something like “I can do five thousand”.";
  await new Promise(r=>setTimeout(r,4000));
  out.textContent=Whisper.ready?"Working out what you said…":"Downloading the speech model (first time only)…";
  try{const s=await Whisper.stop();out.textContent=s?"Heard: “"+s+"” ✔ Voice works. In a deal, hold V to talk.":"Didn't hear anything. Check Brave has mic access for this site and the right microphone is selected."}
  catch(e){out.textContent="The speech model couldn't load ("+(e.message||e)+"). Try turning Brave Shields off for this site."}
  clearInterval(dl);
}
async function toggleAI(on){
  const ok=await AI.setEnabled(on);showTitle();
  if(!ok&&on)el("ainote").textContent=AI.note;
}
async function saveKey(){const k=el("apikey").value.trim();AI.setKey(k);if(k){el("ainote").textContent="Checking your key…";await AI.setEnabled(true)}showTitle()}
function clearKey(){AI.setKey("");showTitle()}

// ---------- world population ----------
function carList(){return S.inv}
function syncCars(){
  const ids={};S.inv.forEach(c=>ids[c.id]=1);
  for(const id in G.cars)if(!ids[id]){W.scene.remove(G.cars[id].mesh);delete G.cars[id]}
  const used=new Set(Object.values(G.cars).map(o=>o.slot));
  S.inv.forEach(c=>{
    if(!G.cars[c.id]){
      let s=0;while(used.has(s))s++;used.add(s);
      const m=W.buildCar(c),p=W.slotPos(s);m.position.set(p.x,0,p.z);m.rotation.y=p.rot;W.scene.add(m);
      G.cars[c.id]={mesh:m,slot:s};
    }else W.updateTag(G.cars[c.id].mesh,c.price);
  });
}
const carSlot=id=>G.cars[id]?G.cars[id].slot:-1;
// What each salesperson says when they hand a deal to Miguel, and how they sound ([pitch, rate]).
const CREW_LINES={
  Frenchy:["Miguel, look at this sky. How is anybody supposed to sell a car under this sky.","This one's all yours, boss. I'm gonna go stare at the clouds and think about my life.","The sky's so bleak today, man. I couldn't close a car door, let alone this one."],
  Andres:["LADIES AND GENTLEMEN, THE GREATEST CLOSER IN THE HISTORY OF CARS. MIGUEEEEL!","Boss, you're a legend. You're a god. Go get 'em. I'll be right here. Being short.","This is it, Miguel. This is your Super Bowl. I told my mom about you."],
  Sam:["Intel: they like cars. That's all I got. Good luck.","Heads up, boss. I think they're a Scorpio. Use that.","They said they're looking for a car. Verified it myself. You're welcome."],
  Riccardo:["Miguel, my friend, I have softened them like butter. Now you spread.","Bellissimo. They're ready. Or they're about to leave. One of the two."],
  Mario:["It's-a you, Miguel! Sorry. I always wanted to say that.","I've got nothing, boss. I tried my best. My best is not good."],
  Juanny:["¡Jefe! ¡No entiendo nada de lo que dice este señor! ¡Ayúdame, por favor!","Le dije que el carro es muy bonito. Creo que se enojó. Te toca a ti, Miguel.","Miguel, este cliente habla muy rápido. Yo solo sonreí y dije que sí a todo."]
};
const CREW_KVOICE={Frenchy:"bm_lewis",Andres:"am_puck",Sam:"am_michael",Riccardo:"bm_george",Mario:"am_adam"};
const CREW_VOICES={Frenchy:[.75,.86],Andres:[1.45,1.25],Sam:[.95,1],Riccardo:[1,1.05],Mario:[1.2,1.12],Juanny:[1.3,1.3]};
// The posters get harder to ignore as the days go by.
function posterGag(){
  const d=S.day;
  if(d<=2)return pick(["You the manager?","Hey, you're the guy from all those posters!","Miguel, right? Your face is on every wall in there."]);
  if(d<=6)return pick(["Bro, there's like forty of you in there.","Why is your face on the dumpster, man?","I counted. You're on thirty-six posters. Thirty-six."]);
  return pick(["Is this a cult? Are you the leader? Blink if you need help.","My kid has nightmares about your posters now. Thanks.","Do you print those yourself? Be honest."]);
}
// How specific salespeople look, whatever desk they sit at.
const CREW_LOOKS={
  Frenchy:{height:1.09,hat:"beret",hatColor:0x111111,top:"stripes",shirt:0xf2f2f2,shirt2:0x1a2a6a,mustache:true,hairStyle:"short",glasses:false,beard:false},
  Andres:{hairStyle:"bald",beard:false,glasses:false,height:.86,build:"fat"},
  Sam:{hairStyle:"short",goatee:true,beard:false,glasses:false,height:.98,build:"muscle"},
  Juanny:{hairStyle:"slick",mustache:true,beard:false,glasses:false,skin:1,height:.96},
  Riccardo:{hairStyle:"slick",chain:true,tie:null,top:"shirt",beard:false,stubble:true,glasses:false},
  Mario:{hat:"cap",hatColor:0xc01010,mustache:true,beard:false,glasses:false,build:"fat",height:.94}};
function spawnCrew(){
  G.sales.forEach(s=>W.scene.remove(s.mesh));G.sales=[];
  S.crew.forEach((d,i)=>{
    if(offToday(d))return;   // approved day off: their desk sits empty
    const home=P(W.desks[i],-18.6);
    const look=Object.assign({hairStyle:["short","short","curly","bald"][i%4],glasses:i===2,beard:i===3,height:[1,.97,1.04,.99][i%4],top:"shirt"},CREW_LOOKS[d.name]);
    const m=W.person(Object.assign({shirt:d.shirt,pants:0x2a2a35,skin:d.skin,hair:0x2a1a10,cap:0x333333,tie:0x202020,badge:true},look));m.userData.tagged=true;
    m.position.set(home.x,0,home.z);m.rotation.y=Math.PI;
    const mv=motive(d),tag=W.sprite(d.name+(mv>0?" 🔥":mv<0?" 😒":""),"#fff",mv>0?"rgba(20,90,30,.7)":mv<0?"rgba(90,30,20,.7)":"rgba(0,0,0,.55)");tag.position.y=2.15;m.add(tag);
    W.scene.add(m);
    G.sales.push({def:d,mesh:m,tag,path:[],speed:2.1,state:"idle",cust:null,home,ph:i,deals:0,gross:0});
  });
}
function clearCustomers(){G.cust.forEach(c=>{if(c.mesh)W.scene.remove(c.mesh)});G.cust=[]}
function setPlayerStart(){G.px=0;G.pz=-17;G.yaw=Math.PI;G.pitch=0}
function enterPrep(){
  clearCustomers();spawnCrew();syncCars();
  for(const id in G.cars){const o=G.cars[id],q=W.slotPos(o.slot);o.mesh.position.set(q.x,0,q.z);o.mesh.rotation.y=q.rot;o.mesh.visible=true}   // test-drive cars back in their spots
  G.phase="prep";G.t=0;G.ended=false;G.talk=null;
  W.setTime(0);G.lastSky=0;W.setOpen(false);setPlayerStart();G.feed=[];
  S.phase="prep";boardUpdate(true);G.cashShown=S.cash;
  titleCard("DAY "+S.day,S.event.name);
  if(G.dale){W.scene.remove(G.dale.mesh);G.dale=null}if(G.lawyer){W.scene.remove(G.lawyer.cl.mesh);W.scene.remove(G.lawyer.lw.mesh);G.lawyer=null}
  G.rain=null;W.setRain&&W.setRain(0);G.lotWalk=null;
  G.whToday=0;G.whLost=0;G.whPend=0;G.usedPC=false;G.tut=S.day===1&&!tutDone()?{i:0,t:0,said:-1}:null;
}

// ---------- start / shift ----------
function start(newGame){
  if(!W)return;
  Sfx.init();
  if(newGame||!load())fresh();
  el("title").style.display="none";document.body.classList.add("playing");
  enterPrep();Sfx.ambient(true);
  lockMouse();
  if(S.review)say3(S.review,"#ffd24a");
}
function startShift(){
  if(G.phase!=="prep")return;
  G.minis=2;G.walks=2;G.evAt=null;G.flirts=0;G.covered=false;G.coffeeT=0;G.coffee=false;
  if(S.tiff&&S.tiff.aff>=8){G.coffee=true;G.coffeeT=60;setTimeout(()=>say3("☕ Tiffany left you a coffee. You walk faster for a minute, and your next T.O. starts with more patience.","#ffd6a0"),3000)}
  if(S.tiff&&S.tiff.aff>=18&&G.recep){G.recep.mesh.userData.wave=2.5;setTimeout(()=>say3("💘 Tiffany waved at you first this morning.","#ff9ad0"),1500)}
  G.offAsk=null;G.offAt=S.day>1&&G.sales.length>1&&Math.random()<.4?rnd(60,300):null;(G.miniBots||[]).forEach(b=>W.scene.remove(b.mesh));G.miniBots=[];
  TALK_LOG.length=0;G.ownerSeen=Math.random()>.4;(G.drives||[]).forEach(d=>W.scene.remove(d.m));G.drives=[];G.wiggleAt=rnd(120,400);if(G.owner){W.scene.remove(G.owner.mesh);G.owner=null}
  if(!S.inv.length)restock();
  openDay();
  G.phase="open";G.t=0;G.ended=false;
  G.stats={p0:S.profit,front0:S.front,back0:S.back,sp:0,spGross:0,mgr:0,mgrGross:0,lost:0,comm:0,cave:0,timeouts:0,released:0,wasted:0};
  G.sales.forEach(s=>{s.deals=0;s.gross=0;s.drift=driftTime(s)*rnd(.9,1.6)});
  const n=S.cust.length;
  G.cust=S.cust.map((u,i)=>({u,mesh:null,path:[],speed:1.5,state:"wait",arrive:(i+.3)*(SHIFT_SECONDS*.8/n)+Math.random()*6,pat:0,patMax:45,sp:null,ph:Math.random()*6}));
  W.setOpen(true);Sfx.chime();
  const ev=S.event;say3(`${ev.name}: ${ev.desc}`,"#ffd24a");titleCard("DOORS OPEN","Bob is watching the numbers");
  boardUpdate(true);
}

// ---------- NPC helpers ----------
function standX(slot,side){return W.slotPos(slot).x+side*.65}
// Customers appear just inside the gate and leave through it.
const GATE_IN=25.5,GATE_OUT=27.6;
const inShowroom=z=>z<-12;
// From the showroom out to the lot lane (via the front door).
const showroomExit=x=>[P(x,-17.6),P(0,-13.5),P(.55,-11)];
// Walking lanes: z=0 between the front two rows, z=13 in front of the back row; x=0 is the center aisle.
const laneZ=z=>z>11?13:LANE_Z;
const toLane=(x,z)=>inShowroom(z)?showroomExit(x):Math.abs(z-laneZ(z))>1.5?[P(x,laneZ(z))]:[];
// Keep right in the center aisle: heading toward the showroom walk at x=-.55, heading to the gate at x=+.55.
const IN=-.55,OUT=.55;
const toAisle=(x,z,ax)=>toLane(x,z).concat([P(ax,inShowroom(z)?LANE_Z:laneZ(z))]);
const toSlot=(slot,side,ax)=>{const p=W.slotPos(slot),sx=standX(slot,side);return [P(ax,p.lane),P(sx,p.lane),P(sx,p.stand)]};
const toShowroom=(x,z)=>inShowroom(z)?[]:toAisle(x,z,IN).concat([P(IN,-11),P(0,-13.5)]);
function routeIn(slot,side){return [P(IN,24)].concat(toSlot(slot,side,IN))}
function routeOut(x,z){return toAisle(x,z,OUT).concat([P(OUT,24),P(0,GATE_OUT)])}
function routeToCar(x,z,slot,side){const zz=W.slotPos(slot).lane,ax=inShowroom(z)||zz>z?OUT:IN;return toAisle(x,z,ax).concat(toSlot(slot,side,ax))}
// The guest chair a customer takes at a salesperson's desk (the outside one, clear of the sofa).
function guestSeat(dx){return P(dx>6?dx+.58:dx-.58,-19.1)}
function routeToDesk(c){const p=c.mesh.position,s=guestSeat(c.sp.home.x);return toShowroom(p.x,p.z).concat([P(s.x,-17.6),s])}
function routeSalesToDesk(sp){const p=sp.mesh.position,x=sp.home.x;return toShowroom(p.x,p.z).concat([P(x+1.25,-17.8),P(x+1.25,-21.15),P(x+.1,-20.95)])}
function routeSalesOut(slot,side){return [P(0,-13.5),P(.55,-11)].concat(toSlot(slot,side,.55))}
function routeSalesHome(x,z,home){
  if(z<-20.4)return [P(home.x+1.25,-21.15),P(home.x+1.25,-18.6),P(home.x,home.z)];   // getting up from behind the desk
  const pts=toShowroom(x,z);pts.push(P(home.x,-16),P(home.x,home.z));return pts}
function stepNpc(n,dt,talk){
  let moving=false;
  if(n.path.length){
    const p=n.path[0],m=n.mesh,dx=p.x-m.position.x,dz=p.z-m.position.z,d=Math.hypot(dx,dz),st=n.speed*dt;
    // Arrive when close; and if someone keeps blocking the spot (people push each other apart), move on after 3 s.
    n.blocked=d<(n.lastD===undefined?1e9:n.lastD)-.01?0:(n.blocked||0)+dt;n.lastD=d;
    // corners can be cut; the last spot is exact
    if(d<=Math.max(st,n.path.length>1?.5:.15)||n.blocked>3){if(!n.path[1]){m.position.x=p.x;m.position.z=p.z}n.path.shift();n.blocked=0;n.lastD=undefined}
    else{m.position.x+=dx/d*st;m.position.z+=dz/d*st;m.rotation.y=Math.atan2(dx,dz)+(m.userData.moonwalk?Math.PI:0);moving=true}
  }
  W.animatePerson(n.mesh,moving,G.anim+(n.ph||0),n.armsUp,talk&&!moving);
  return !n.path.length;
}
const carOf=c=>S.inv.find(x=>x.id==c.u.car);
// What each personality looks like. Every customer also gets a random skin tone, height and eye color.
const COLORS=[0x4a6a8a,0x6a4a4a,0x4a7a5a,0x8a8a4a,0x7a4a8a,0xaaaaaa,0x3a3a3a,0xc06a2a,0x2a7a8a,0xd0c0a0];
const HAIRS=[0x1a1a1a,0x3a2210,0x5a3a1a,0x8a5a2a,0xd8b878,0x777777];
const LOOKS={
  conspiracy:()=>({top:"hoodie",shirt:pick([0x3a3a3a,0x4a5a3a,0x5a4a3a]),hat:"tinfoil",stubble:true,hairStyle:"messy",build:pick(["slim","avg"])}),
  karen:()=>({sex:"f",top:"cardigan",shirt:pick([0xe8d8c0,0xb8c8e0,0xe0b8c8]),shirt2:0xf2f2f2,hairStyle:"bob",hair:pick([0xe8d090,0xd8b878,0xb08850]),glasses:Math.random()<.5?"sun":false,lipstick:"#b04050",pants:0xd8d0c0,earrings:true}),
  pokemon:()=>({top:"tee",print:"ball",shirt:pick([0x3a7a80,0x5a5a9a,0xd0c050]),glasses:"square",hairStyle:"messy",build:"slim",bowtie:Math.random()<.5?0xc00000:null,freckles:Math.random()<.5,bottom:"shorts",socks:true,pants:0x8a7a5a}),
  grandma:()=>({sex:"f",top:"cardigan",shirt:pick([0x8a9ab8,0xb88aa0,0x9ab88a]),shirt2:0x5a5a6a,hairStyle:"bun",hair:0xc8c8c8,glasses:"round",age:true,bottom:"skirt",pants:0x4a4a52,height:.9,lipstick:"rgba(170,80,90,.8)"}),
  mom:()=>({top:"hoodie",shirt:pick([0x8a2a2a,0x2a4a8a,0x2a6a4a]),hat:"cap",hatColor:pick([0x2a2a2a,0x1a3a6a]),hairStyle:"short",build:pick(["slim","avg"]),freckles:Math.random()<.3}),
  influencer:()=>Math.random()<.6?{sex:"f",top:"jacket",shirt:0xf0d0e0,shirt2:0xd080a8,hairStyle:"ponytail",hair:pick([0xe8c070,0x2a1a10,0x8a2a6a]),glasses:"sun",lipstick:"#e0507a",makeup:"#c080d0",bottom:"skirt",pants:0x222222,earrings:true}
                                 :{top:"hoodie",shirt:0xf0f0f0,hairStyle:"slick",glasses:"sun",chain:true,build:"slim"},
  crypto:()=>({top:"hoodie",shirt:pick([0x111111,0x2a2a3a]),hairStyle:"slick",hair:pick([0x2a1a10,0xd8b878]),glasses:"sun",chain:true,build:pick(["slim","muscle"])}),
  dumped:()=>({sex:Math.random()<.4?"f":"m",top:pick(["hoodie","tee"]),shirt:pick([0x6a6a6a,0x5a6a7a]),hairStyle:"messy",stubble:true,pants:0x5a5a5a}),
  prepper:()=>({top:"camo",shirt:0x4a5a32,hat:"boonie",hatColor:0x5a5a3a,beard:true,build:"muscle",pants:0x4a4a3a}),
  mj:()=>({top:"thriller",shirt:0xc01818,hat:"fedora",hatColor:0x111111,hairStyle:"mjcurls",hair:0x111111,glove:true,socks:true,build:"slim",pants:0x111111,moonwalk:true,skin:pick([1,2]),shoe:0x080808}),
  elvis:()=>({top:"jacket",shirt:0xf6f2ea,shirt2:0xd8b040,hairStyle:"slick",hair:0x0a0a0a,glasses:"sun",chain:true,pants:0xf6f2ea,shoe:0xf6f2ea,mustache:false,build:pick(["avg","fat"]),skin:0,height:1.02}),
  arnold:()=>({build:"muscle",top:"jacket",shirt:0x1a1a1a,shirt2:0x0a0a0a,glasses:"sun",hairStyle:"buzz",hair:0x4a3a2a,height:1.07,skin:0,pants:0x1a1a1a}),
  walken:()=>({top:"suit",shirt:0x2a2a2e,shirt2:0x1a1a1e,tie:0x5a1a1a,hairStyle:"slick",hair:0x6a6a6a,skin:0,age:true,build:"slim",height:1.04}),
  borat:()=>({top:"suit",shirt:0x7a7a80,shirt2:0x5a5a60,tie:0x2a2a4a,hairStyle:"curly",hair:0x1a1410,mustache:true,skin:0,height:1.06}),
  mrt:()=>({build:"muscle",top:"tee",shirt:0x2a5a2a,hairStyle:"mohawk",hair:0x111111,beard:true,chain:true,skin:3,earrings:true}),
  sparrow:()=>({top:"jacket",shirt:0xe8e0c8,shirt2:0x3a2a1a,hat:"beanie",hatColor:0x8a1a1a,hairStyle:"long",hair:0x1a1410,goatee:true,makeup:"#111",skin:1}),
  mime:()=>({top:"stripes",shirt:0xf4f4f4,shirt2:0x111111,hat:"beret",hatColor:0x111111,skinColor:0xf6f4f0,lipstick:"#111",makeup:"#222",hairStyle:"bald",pants:0x111111,build:"slim"}),
  hungry:()=>({build:"fat",top:pick(["flannel","hawaii","tee"]),shirt:pick([0xa01818,0x2a5a8a,0x3a7a3a]),shirt2:pick([0x222222,0xf0e040]),hat:Math.random()<.5?"cap":null,hatColor:0x333333,beard:Math.random()<.5,suspenders:Math.random()<.3,hairStyle:pick(["short","balding","buzz"])}),
  flirt:()=>({sex:"f",top:"dress",shirt:pick([0xc01020,0x101010,0x7a1a8a]),hairStyle:"long",hair:pick([0x2a1a10,0x8a2a10,0xe8c070]),lipstick:"#c0182a",makeup:"#6a3a7a",earrings:true,build:"slim",shoe:0x1a0a0a}),
  normal:()=>{const f=Math.random()<.5;return f?{sex:"f",top:pick(["tee","jacket","cardigan","polo"]),shirt:pick(COLORS),shirt2:pick(COLORS),hairStyle:pick(["long","ponytail","bob","bun","curly"]),hair:pick(HAIRS),bottom:pick(["pants","skirt"]),pants:pick([0x30343c,0x2a3a5a,0x4a3a2a]),lipstick:Math.random()<.5?"#b0405a":null,glasses:Math.random()<.2}
    :{top:pick(["tee","polo","flannel","jacket","stripes"]),shirt:pick(COLORS),shirt2:pick(COLORS),hairStyle:pick(["short","short","buzz","bald","curly","afro","slick"]),hair:pick(HAIRS),build:pick(["avg","avg","slim","fat","muscle"]),beard:Math.random()<.2,mustache:Math.random()<.15,glasses:Math.random()<.2,hat:Math.random()<.2?"cap":null,hatColor:pick(COLORS)}}
};
function makeCustomerMesh(u){
  const look=Object.assign({skin:ri(0,3),height:.93+Math.random()*.13,pants:pick([0x30343c,0x4a3a2a,0x20262e,0x44506a])},(LOOKS[u&&u.persona]||LOOKS.normal)());
  if(look.height&&look.sex==="f")look.height*=.95;
  if(u)u.sex=look.sex||"m";
  return W.person(look);
}
function spawn(c){
  c.mesh=makeCustomerMesh(c.u);c.mesh.position.set(rnd(-1.5,1.5),0,GATE_IN);W.scene.add(c.mesh);
  const slot=c.u.car?carSlot(c.u.car):-1;c.slot=slot;
  if(slot>=0&&!c.u.done){c.path=routeIn(slot,-1);c.state="enter"}
  else{c.path=[P(IN,9),P(OUT,9),P(OUT,GATE_OUT)];c.state="pass"}
  Sfx.chime();
}
function addBar(c){
  const bg=new THREE.Sprite(new THREE.SpriteMaterial({color:0x000000,depthTest:false,transparent:true,opacity:.7})),fg=new THREE.Sprite(new THREE.SpriteMaterial({color:0x40d060,depthTest:false,transparent:true}));
  [bg,fg].forEach(s=>{s.center.set(0,.5);s.renderOrder=11});bg.scale.set(1.1,.14,1);fg.scale.set(1.06,.1,1);
  bg.position.set(-.55,2.35,0);fg.position.set(-.53,2.35,0);c.mesh.add(bg);c.mesh.add(fg);c.bar={bg,fg};
}
function removeBar(c){if(c.bar){c.mesh.remove(c.bar.bg);c.mesh.remove(c.bar.fg);c.bar=null}if(c.ring){c.mesh.remove(c.ring);c.ring=null}}
function addRing(c){const r=new THREE.Mesh(new THREE.RingGeometry(.55,.75,28),new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.06;c.mesh.add(r);c.ring=r}
function finishLeave(c,happy){
  c.mesh.userData.sit=false;if(c.sp)c.sp.mesh.userData.sit=false;
  c.state="leave";c.path=routeOut(c.mesh.position.x,c.mesh.position.z);c.speed=happy?1.6:2.2;
  if(c.to){c.mesh.remove(c.to);c.to=null}removeBar(c);
  if(c.sp){const s=c.sp;s.state="back";s.armsUp=false;s.path=routeSalesHome(s.mesh.position.x,s.mesh.position.z,s.home);s.cust=null;c.sp=null}
}

// easy: would pay near asking. hopeless: their limit is at or under your cost. medium: everything else.
function tier(c){
  const car=carOf(c),u=c.u;if(!car||u.reserve===undefined)return"medium";
  if(u.reserve>=car.price*.97)return"easy";
  if(u.reserve<=car.cost*1.05)return"hopeless";
  return"medium";
}
function customerWalks(c,msg,rep){
  const t=tier(c);c.u.done=true;c.u.msg="Walked away.";
  if(t==="hopeless"){G.stats.wasted++;say3(`${c.u.name} drifted off. No loss, they were never buying.`,"#bbb")}
  else{G.stats.lost++;S.rep=Math.max(0,S.rep-rep);say3(msg,"#f88");Sfx.lose()}
  finishLeave(c,false);
}
function stall(c){
  const sp=c.sp;c.state="stuck";c.pat=c.patMax;sp.armsUp=true;sp.state="stuck";
  c.to=W.sprite("T.O.!","#fff","#c01818",1.1,.32);c.to.position.y=2.65;c.mesh.add(c.to);addBar(c);
  say3(`${sp.def.name} needs a T.O. on the ${label(carOf(c))}!`,"#ff7070");Sfx.alert();G.shake=.1;addRing(c);
}
function commission(sp,front){
  const com=Math.max(50,Math.round(front*.25/10)*10);
  S.cash-=com;S.profit-=com;S.front-=com;G.stats.comm+=com;return com;
}
function spSale(c,price,why){
  const car=carOf(c);if(!car)return finishLeave(c,false);
  claimCar(c);
  const i=S.inv.indexOf(car),front=price-car.cost,sp=c.sp;
  finishSale(c.u,car,i,price,[]);
  const com=commission(sp,front);
  G.stats.sp++;G.stats.spGross+=front-com;if(why==="cave")G.stats.cave++;
  const rec=G.sales.find(s=>s===sp);if(rec){rec.deals++;rec.gross+=front-com}
  say3(`${sp.def.name} ${why==="cave"?"caved and sold":"sold"} the ${label(car)} for ${$f(price)}: ${front<0?"lost ":""}${$f(Math.abs(front))} gross`,front>=300?"#9f9":front>=0?"#fd8":"#f88");
  popup(`${sp.def.name} ${front-com<0?"-":"+"}${$f(Math.abs(front-com))}`,c.mesh.position,front-com>=300?"#8dffa8":front-com>=0?"#ffe08a":"#ff8a8a");
  Sfx.cash();syncCars();startDelivery(c);
}
// A sold car leaves the lot under its new owner, so take its mesh out of the lot's bookkeeping now.
function claimCar(c){const o=G.cars[c.u.car];if(o){c.carMesh=o.mesh;c.carSlot=o.slot;delete G.cars[c.u.car]}}
// After a sale: customer and salesperson walk to the car, the customer gets in and drives off.
function startDelivery(c){
  if(c.to){c.mesh.remove(c.to);c.to=null}removeBar(c);c.mesh.userData.sit=false;
  if(!c.carMesh)return finishLeave(c,true);
  const p=c.mesh.position;c.state="delivery";c.speed=1.7;c.path=routeToCar(p.x,p.z,c.carSlot,-1);
  const sp=c.sp;if(sp){sp.mesh.userData.sit=false;sp.armsUp=false;sp.state="delivery";sp.speed=1.9;const q=sp.mesh.position;sp.path=(q.z<-20.4?[P(sp.home.x+1.25,-21.15),P(sp.home.x+1.25,-18.2)]:[]).concat(routeToCar(sp.home.x+1.25,-18.2,c.carSlot,1))}
}
function driveOff(c){
  const m=c.carMesh;c.carMesh=null;if(!m)return;
  const p=m.position,L=laneZ(p.z),pts=[P(p.x,L),P(0,L),P(0,GATE_OUT),P(0,36),P(80,36)];
  G.drives.push({m,pts,speed:0});Sfx.click();
}
function stepDrives(dt){
  for(let i=G.drives.length-1;i>=0;i--){
    const d=G.drives[i],m=d.m,p=d.pts[0];
    if(!p){W.scene.remove(m);G.drives.splice(i,1);continue}
    d.speed=Math.min(7,d.speed+dt*3);
    const dx=p.x-m.position.x,dz=p.z-m.position.z,dist=Math.hypot(dx,dz),st=d.speed*dt;
    if(dist<=st){m.position.x=p.x;m.position.z=p.z;d.pts.shift()}else{m.position.x+=dx/dist*st;m.position.z+=dz/dist*st}
    if(dist>.05){let a=Math.atan2(dx,dz)-m.rotation.y;a=Math.atan2(Math.sin(a),Math.cos(a));m.rotation.y+=a*Math.min(1,dt*6)}
  }
}
// ---------- test drives ----------
// Midway through a desk deal the salesperson may take the customer for a lap of the lot in their car.
// One thing happens on the way (smooth ride, bumper falls off, donuts, Mr. Wiggle, a joyride out the gate),
// and it nudges how likely the deal is to close. Then they park and go back to the desk.
const TD_EVENTS=[["smooth",3],["bumper",2],["donuts",2],["wiggle",1],["joyride",2]];
function startTestDrive(c){
  const o=G.cars[c.u.car],sp=c.sp;if(!o||!sp||G.drives.some(d=>d.m===o.mesh))return false;
  c.mesh.userData.sit=false;sp.mesh.userData.sit=false;sp.armsUp=false;
  const p=c.mesh.position;c.state="td_walk";c.speed=1.6;c.path=routeToCar(p.x,p.z,o.slot,-1);
  sp.state="td";sp.speed=1.9;const q=sp.mesh.position;
  sp.path=(q.z<-20.4?[P(sp.home.x+1.25,-21.15),P(sp.home.x+1.25,-18.2)]:[]).concat(routeToCar(sp.home.x+1.25,-18.2,o.slot,1));
  if(Math.random()<.5)crewSay(sp,pick(["Let's take her for a spin.","Wanna feel it? Let's go for a drive.","Keys! Let's go, let's go.","Test drive. Buckle up. Seriously, buckle up."]));
  return true;
}
function beginDrive(c){
  const o=G.cars[c.u.car];if(!o){c.tdDone=true;c.state="todesk";c.path=routeToDesk(c);c.sp.state="todesk";c.sp.path=routeSalesToDesk(c.sp);return}
  const m=o.mesh,p=m.position,L=laneZ(p.z),side=p.x>=0?1:-1,X=22*side;
  let ev=TD_EVENTS.reduce((a,e)=>a.concat(Array(e[1]).fill(e[0])),[]);ev=pick(ev);
  // a lap: out to the lane, down to the fence, along the front by the gate, back around
  const pts=[P(p.x,L),P(X,L),P(X,23),P(-X,23),P(-X,L),P(p.x,L),P(p.x,p.z)];
  if(ev==="joyride")pts.splice(3,0,P(0,23),P(0,GATE_OUT+14),P(0,23));
  c.td={m,pts,speed:0,ev,leg:0,home:{x:p.x,z:p.z,rot:m.rotation.y},spin:0,fired:false};
  c.mesh.visible=false;c.sp.mesh.visible=false;c.state="td_drive";Sfx.click();
  say3(`🚗 ${c.sp.def.name} took ${c.u.name} on a test drive.`,"#9cf");
}
function tdEvent(c){
  const d=c.td,u=c.u,n=c.sp.def.name,m=d.m,near=Math.hypot(G.px-m.position.x,G.pz-m.position.z)<16;d.fired=true;
  if(d.ev==="smooth"){c.tdBonus=.2;popup("😍",m.position,"#8dffa8");say3(`${u.name} loves how it drives. ${n} is already picking out a pen for the paperwork.`,"#8dffa8")}
  if(d.ev==="bumper"){c.tdBonus=-.12;if(W.dropBumper(m))popup("💥",m.position,"#ff8a8a");say3(`The bumper fell off mid test drive. ${n}: "That's a feature. It's... modular."`,"#fd8");if(near)G.shake=.2}
  if(d.ev==="donuts"){c.tdBonus=.1;d.spin=1.6;popup("🌀",m.position,"#ffe08a");say3(`${u.name} is doing donuts in the lot. ${n} is screaming. ${u.name} is having the time of their life.`,"#ffe08a")}
  if(d.ev==="wiggle"){c.tdBonus=.05;W.launchTube(m.position.x+rnd(-6,6),m.position.z-rnd(4,8),()=>{});popup("🎈",m.position,"#ffe08a");say3(`${u.name} clipped Mr. Wiggle. He's airborne. Again.`,"#fd8");if(near)G.shake=.25}
  if(d.ev==="joyride"){c.tdBonus=Math.random()<.5?.12:-.15;popup("💨",m.position,"#ff8a8a");say3(`${u.name} floored it out the gate with ${n} in the passenger seat. They'll be back. Probably.`,"#fd8")}
}
function stepTestDrive(c,dt){
  const d=c.td;if(!d)return;const m=d.m;
  if(!G.cars[c.u.car]||G.drives.some(x=>x.m===m)){   // someone else bought this car mid-drive: hop out where they are
    c.td=null;c.tdDone=true;c.mesh.visible=c.sp.mesh.visible=true;c.mesh.position.x+=1;c.sp.mesh.position.x-=1;
    say3(`${c.u.name}'s test drive car just got sold out from under them. ${c.sp.def.name}: "Happens."`,"#fd8");
    c.state="todesk";c.speed=1.5;c.path=routeToDesk(c);c.sp.state="todesk";c.sp.speed=1.8;c.sp.path=routeSalesToDesk(c.sp);return}
  if(d.spin>0){d.spin-=dt;m.rotation.y+=dt*9;c.mesh.position.copy(m.position);c.sp.mesh.position.copy(m.position);return}
  if(d.wait>0){d.wait-=dt;if(d.wait<=0){m.visible=true;say3(`${c.u.name} and ${c.sp.def.name} are back. ${c.tdBonus>0?"Both grinning.":"Neither will talk about it."}`,"#9cf")}return}
  const p=d.pts[0];
  if(!p){   // parked: back where it was, and back inside to talk numbers
    m.position.set(d.home.x,0,d.home.z);m.rotation.y=d.home.rot;c.td=null;c.tdDone=true;
    const sp=c.sp,st=W.slotPos(G.cars[c.u.car]?G.cars[c.u.car].slot:0);
    c.mesh.position.set(d.home.x-1,0,st.stand);sp.mesh.position.set(d.home.x+1,0,st.stand);c.mesh.visible=sp.mesh.visible=true;
    c.mesh.userData.mood=c.tdBonus>0?"happy":"worried";
    c.state="todesk";c.speed=1.5;c.path=routeToDesk(c);sp.state="todesk";sp.speed=1.8;sp.path=routeSalesToDesk(sp);return}
  const fast=d.ev==="joyride"&&d.leg>=3&&d.leg<=4;
  d.speed=Math.min(fast?12:6.5,d.speed+dt*(fast?6:3));
  if(d.pts.length<=1)d.speed=Math.min(d.speed,2.5);   // ease into the parking spot
  const dx=p.x-m.position.x,dz=p.z-m.position.z,dist=Math.hypot(dx,dz),st=d.speed*dt;
  if(dist<=st){m.position.x=p.x;m.position.z=p.z;d.pts.shift();d.leg++;
    if(!d.fired&&d.leg===(d.ev==="joyride"?4:3))tdEvent(c);
    if(d.ev==="joyride"&&d.leg===4){m.visible=false;d.wait=rnd(6,9)}}
  else{m.position.x+=dx/dist*st;m.position.z+=dz/dist*st}
  if(dist>.05&&d.pts.length>1){let a=Math.atan2(dx,dz)-m.rotation.y;a=Math.atan2(Math.sin(a),Math.cos(a));m.rotation.y+=a*Math.min(1,dt*6)}
  if(!d.fired&&d.ev==="wiggle"&&Math.hypot(m.position.x-23,m.position.z-23)<6)tdEvent(c);
  c.mesh.position.copy(m.position);c.sp.mesh.position.copy(m.position);   // they're in the car
}
function resolveWork(c){
  const sp=c.sp,u=c.u,mv=motive(sp.def),d=Object.assign({},sp.def,{skill:Math.max(.05,Math.min(.95,sp.def.skill+mv*.2)),cave:Math.max(0,Math.min(.9,sp.def.cave-mv*.1))}),t=tier(c),car=carOf(c),r=Math.random()-(c.tdBonus||0);   // a good test drive helps, a disaster hurts
  if(d.quirk==="spanish"){stall(c);return}   // Juanny: nobody understands a word, so it always comes to Miguel
  if(t==="easy"){
    if(r<.85){spSale(c,Math.min(Math.round(u.reserve/50)*50,Math.round(car.price*rnd(.94,1)/50)*50),"easy");return}
  }else if(t==="medium"){
    if(r<d.skill){spSale(c,Math.round((u.offer+(u.reserve-u.offer)*.6)/50)*50,"skill");return}
    if(r<d.skill+d.cave*.5){spSale(c,Math.max(100,u.offer),"cave");return}
  }else if(r<d.cave*.6){spSale(c,Math.max(100,u.offer),"cave");return}
  if(Math.random()<.8)stall(c);
  else customerWalks(c,`${d.name} lost ${u.name}. They walked.`,.5);
}

// ---------- simulation ----------
function sim(dt){
  if(G.phase!=="open"||G.ended)return;
  G.t+=dt;if(G.t>=SHIFT_SECONDS&&G.talk)G.t=SHIFT_SECONDS;
  // a few customers at a time, not a crowd
  // only as many customers as the crew can greet, plus one, so nobody stands around ignored
  const onLot=G.cust.filter(c=>c.mesh&&!["gone","wait","delivery","leave","pass"].includes(c.state)).length;
  G.cust.forEach(c=>{if(c.state==="wait"&&G.t>=c.arrive){if(onLot>=Math.max(2,G.sales.length+1))c.arrive=G.t+3+Math.random()*4;else spawn(c)}});
  stepBob(dt);stepWiggle();stepDrives(dt);stepMinis(dt);stepEvents(dt);stepDayOff();
  G.cust.forEach(c=>{
    if(!c.mesh||c.state==="gone"||c.state==="talk")return;
    const arrived=stepNpc(c,dt,["working","stuck","greet"].includes(c.state));
    if(c.to)c.to.position.y=2.65+Math.sin(G.anim*6)*.06;
    if(["browse","greet","todesk","working","stuck","mini"].includes(c.state)){
      const car=carOf(c);
      if(!car||c.u.done){say3(`${c.u.name} left. The car's gone.`,"#bbb");finishLeave(c,false);return}
    }
    switch(c.state){
      case"enter":if(arrived){c.state="browse";c.timer=0;{const sp=W.slotPos(c.slot);c.mesh.rotation.y=sp.z>sp.stand?0:Math.PI}
        const cm=G.cars[c.u.car];if(cm&&Math.random()<.12&&W.dropBumper(cm.mesh)){c.mesh.userData.mood="shocked";say3(`The front bumper just fell off in front of ${c.u.name}.`,"#fd8");Sfx.click()}}break;
      case"pass":case"leave":if(arrived){c.state="gone";W.scene.remove(c.mesh)}break;
      case"browse":{
        c.timer+=dt;
        const s=G.sales.find(s=>s.state==="idle");
        if(s&&!c.sp){c.sp=s;s.cust=c;s.state="go";s.speed=2.4;s.path=routeSalesOut(c.slot,1)}
        if(c.sp&&c.sp.state==="go"&&!c.sp.path.length){c.state="greet";c.sp.state="greet";c.greet=rnd(4,6)}
        if(c.timer>(G.rain?28:40)&&!c.sp)customerWalks(c,`${c.u.name} left. Nobody helped them.`,.5);
        break}
      case"greet":   // a quick hello at the car, then inside to the desk
        c.greet-=dt;if(c.greet<=0){c.state="todesk";c.speed=1.5;c.path=routeToDesk(c);c.sp.state="todesk";c.sp.speed=1.8;c.sp.path=routeSalesToDesk(c.sp)}break;
      case"todesk":
        if(arrived&&!c.sp.path.length){
          c.mesh.userData.sit=true;c.mesh.rotation.y=Math.PI;c.sp.mesh.userData.sit=true;c.sp.mesh.rotation.y=0;
          c.state="working";c.sp.state="work";c.work=c.tdDone?rnd(5,8):rnd(10,16);c.work0=c.work;
        }break;
      case"working":c.work-=dt;
        if(!c.tdDone&&!c.tdNo&&c.work<c.work0*.55){if(Math.random()<.36&&startTestDrive(c))break;c.tdNo=true}
        if(c.work<=0)resolveWork(c);break;
      case"td_walk":
        if(arrived&&c.sp&&!c.sp.path.length)beginDrive(c);break;
      case"td_drive":stepTestDrive(c,dt);break;
      case"delivery":
        if(arrived){driveOff(c);c.state="gone";W.scene.remove(c.mesh);
          const sp=c.sp;if(sp){sp.state="back";sp.cust=null;c.sp=null;const q=sp.mesh.position;sp.path=routeSalesHome(q.x,q.z,sp.home)}}
        break;
      case"stuck":{
        c.pat-=dt*(c.sp&&c.sp.def.quirk==="pushy"?1.4:1)*(G.rain?1.25:1);
        if(c.ring){const k=1+Math.sin(G.anim*8)*.14;c.ring.scale.set(k,k,k)}
        if(c.bar){const f=Math.max(0,c.pat/c.patMax);c.bar.fg.scale.x=1.06*f;c.bar.fg.material.color.set(f>.5?0x40d060:f>.25?0xe0c030:0xe03030)}
        if(c.pat<=0){
          G.stats.timeouts++;
          if(tier(c)!=="hopeless"&&Math.random()<.5)spSale(c,Math.max(100,c.u.offer),"cave");
          else customerWalks(c,`${c.u.name} got tired of waiting and walked.`,1);
        }
        break}
    }
  });
  G.sales.forEach(s=>{
    const arrived=stepNpc(s,dt,s.state==="work");
    if(s.state==="back"&&arrived){s.state="idle";s.mesh.rotation.y=Math.PI}
    if((s.state==="work"||s.state==="stuck"||s.state==="greet")&&s.cust&&s.cust.mesh){const c=s.cust;s.mesh.rotation.y=Math.atan2(c.mesh.position.x-s.mesh.position.x,c.mesh.position.z-s.mesh.position.z)}
    if(s.state==="work")s.armsUp=false;
    stepFlirt(s,dt,arrived);
  });
  separate();
  if(G.t>=SHIFT_SECONDS&&!G.talk)endShift();
}
// People step around each other instead of walking through. Seated and talking people don't get pushed.
const R_PERSON=.32;
function agents(){
  const a=[];
  // a customer and their own salesperson walk together, so they don't shove each other
  G.cust.forEach(c=>{if(c.mesh&&c.state!=="gone"&&c.state!=="wait")a.push({m:c.mesh,fixed:c.state==="talk"||!!c.mesh.userData.sit,pair:c.sp&&c.sp.mesh})});
  G.sales.forEach(s=>a.push({m:s.mesh,fixed:!!s.mesh.userData.sit||s.state==="idle"}));
  if(G.owner)a.push({m:G.owner.mesh,fixed:false});
  return a;
}
function separate(){
  const a=agents(),D=R_PERSON*2;
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
    const p=a[i].m.position,q=a[j].m.position,dx=p.x-q.x,dz=p.z-q.z,d=Math.hypot(dx,dz);
    if(d>=D||(a[i].fixed&&a[j].fixed)||a[i].pair===a[j].m||a[j].pair===a[i].m)continue;
    const nx=d>1e-4?dx/d:1,nz=d>1e-4?dz/d:0,o=D-d,wi=a[i].fixed?0:a[j].fixed?1:.5,wj=1-wi;
    // push apart, plus a sideways slide so two people meeting head-on step around each other
    const tx=-nz*.6,tz=nx*.6;
    p.x+=(nx+tx)*o*wi;p.z+=(nz+tz)*o*wi;q.x-=(nx+tx)*o*wj;q.z-=(nz+tz)*o*wj;
  }
  // and nobody stands inside Miguel
  a.forEach(o=>{if(o.fixed)return;const p=o.m.position,dx=p.x-G.px,dz=p.z-G.pz,d=Math.hypot(dx,dz),D2=R_PERSON+.35;if(d<D2&&d>1e-4){p.x+=dx/d*(D2-d);p.z+=dz/d*(D2-d)}});
}
function idleCrew(dt){
  G.sales.forEach(s=>stepNpc(s,dt,false));
}
function movePlayer(dt){
  const k=G.keys;G.sprint=!!(k.ShiftLeft||k.ShiftRight);const spd=(G.sprint?5.4:3.1)*(G.coffeeT>0?1.25:1);if(G.coffeeT>0)G.coffeeT-=dt;
  if(k.ArrowLeft)G.yaw+=1.9*dt;if(k.ArrowRight)G.yaw-=1.9*dt;
  let fx=0,fz=0;
  if(k.KeyW||k.ArrowUp){fx-=Math.sin(G.yaw);fz-=Math.cos(G.yaw)}
  if(k.KeyS||k.ArrowDown){fx+=Math.sin(G.yaw);fz+=Math.cos(G.yaw)}
  if(k.KeyA){fx-=Math.cos(G.yaw);fz+=Math.sin(G.yaw)}
  if(k.KeyD){fx+=Math.cos(G.yaw);fz-=Math.sin(G.yaw)}
  const l=Math.hypot(fx,fz),tx=l?fx/l*spd:0,tz=l?fz/l*spd:0,a=Math.min(1,dt*(l?9:12));
  G.vx+=(tx-G.vx)*a;G.vz+=(tz-G.vz)*a;
  const sp=Math.hypot(G.vx,G.vz);
  if(sp>.05){
    const ox=G.px,oz=G.pz;move(G.vx*dt,G.vz*dt);
    if(Math.abs(G.px-ox)<1e-4&&Math.abs(G.pz-oz)<1e-4){G.vx*=.5;G.vz*=.5}
    const prev=Math.floor(G.bob/Math.PI);G.bob+=dt*sp*2.6;if(Math.floor(G.bob/Math.PI)!==prev)Sfx.step();
  }
  G.bobAmt+=((sp>.3?Math.min(1,sp/3):0)-G.bobAmt)*Math.min(1,dt*8);
}
function move(dx,dz){
  const r=.35,b=W.bound;
  for(const ax of [0,1]){
    let nx=G.px+(ax===0?dx:0),nz=G.pz+(ax===1?dz:0);
    nx=Math.max(b.x0,Math.min(b.x1,nx));nz=Math.max(b.z0,Math.min(b.z1,nz));
    let hit=false;
    for(const o of W.colliders)if(nx>o.x0-r&&nx<o.x1+r&&nz>o.z0-r&&nz<o.z1+r){hit=true;break}
    if(!hit&&G.phase==="open")for(const o of agents()){const p=o.m.position;if(Math.hypot(nx-p.x,nz-p.z)<r+R_PERSON&&Math.hypot(G.px-p.x,G.pz-p.z)>=Math.hypot(nx-p.x,nz-p.z)){hit=true;break}}
    if(!hit)for(const id in G.cars){const p=G.cars[id].mesh.position;if(Math.abs(nx-p.x)<.95+r&&Math.abs(nz-p.z)<2.3+r){hit=true;break}}
    if(!hit){G.px=nx;G.pz=nz}
  }
}
function step(dt){G.anim+=dt;if(!overlayOpen())movePlayer(dt);if(G.phase==="open")sim(dt);else if(G.phase==="prep")idleCrew(dt);if(G.phase!=="title"){stepRecep(dt);stepTut(dt)}W.update(dt,G.anim)}
function elapse(sec){if(G.phase!=="open"||G.ended)return;for(let i=0;i<Math.round(sec/.25);i++)sim(.25)}
function waiting(){
  const w=G.cust.filter(c=>c.state==="stuck");
  return w.length?"⏱ Waiting on you: "+w.map(c=>`${c.sp?c.sp.def.name+" / ":""}${c.u.name} ${Math.ceil(c.pat)}s`).join(", "):"";
}

// ---------- interaction ----------
function pairNear(){
  let best=null,bd=3.4;
  G.cust.forEach(c=>{
    if(!c.mesh||!["working","stuck"].includes(c.state))return;
    const d=Math.hypot(c.mesh.position.x-G.px,c.mesh.position.z-G.pz);
    if(d<bd){bd=d;best=c}
  });
  return best;
}
// ---------- Tiffany, the receptionist (a VRoid model) ----------
// Drop your own VRoid Studio export at models/receptionist.vrm; until then she's the three-vrm sample girl.
// Outfit rotation: each look is its own VRoid export in models/ (.vrm, or .b64.txt for the artifact copy).
// Most days she's in the blouse and skirt. On random days (about 1 in 3, never day 1) her outfit is
// "in the laundry" and she shows up in the bikini. Picked from the day number, so it stays the same on reload.
const RECEP_LOOKS=[{file:"receptionist"},
  {file:"receptionist-beach",event:"Laundry Day",swim:{texture:"models/tiffany-beach-skin.png"},lines:[
    "Don't. My work clothes are in the laundry. This was the only clean thing I own. It's fine. Everything's fine.",
    "Laundromat ate my blouse. Bob said 'dress code is whatever sells cars'. So. Here we are.",
    "My outfit's in the dryer. The dryer is in my car. My car is in the shop. Don't ask.",
    "Laundry day. Frenchy has asked me four times if I'm 'going to ze beach'. I'm going to HR. I'm HR.",
    "Yes, it's a bikini. Yes, my clothes are in the wash. No, Mario, I don't need your jacket. It smells like meatballs.",
    "The washer flooded my apartment, so this is what I've got. Bob's calling it 'Summer Savings Event'. It's November."]}];
const laundryDay=d=>{if(d<2)return false;let h=Math.imul(d^0x5bd1e995,374761393);h=Math.imul(h^h>>>13,1274126177);h^=h>>>16;return (h>>>0)/4294967296<.3};
const recepLook=()=>RECEP_LOOKS[laundryDay(S?S.day:1)?1:0];
const lookFiles=l=>[`models/${l.file}.vrm`,`models/${l.file}.b64.txt`];
const RECEP_NAME="Tiffany",RECEP_MODELS=["models/receptionist.vrm","models/receptionist.b64.txt","https://cdn.jsdelivr.net/gh/pixiv/three-vrm@dev/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm"];
const RECEP_HI=["Welcome to Bargain Bob's! Someone will be right with you. Probably.","Hiii! Help yourself to a mint. Nobody else has, since 2009.","Welcome in! Please don't touch the Kia, it's load-bearing.","Hi! The coffee's free. The bathroom is a hundred dollars.",
  "Welcome to Bargain Bob's, where every car has a story, and most of them are crimes.","Oh my gosh, a customer! Okay, act natural, everybody.","Hi there! Sign in here. Pen's on a chain. We've lost eleven pens.","Welcome! If you hear crying, that's just the manager. Totally normal."];
const RECEP_JOKES=["Bob asked me to answer the phone 'Bargain Bob's, how can I lower your expectations?' So I do.","A guy called asking if we take trades. I said we take anything. He's bringing a boat. And a goat.",
  "I put 'Do not lean on the Corolla' on a sign and someone leaned on the sign and the sign broke the Corolla.","Juanny told me something really sweet today. I think. It was in Spanish. Might have been a sandwich order.",
  "Frenchy keeps calling me 'mon petit croissant'. HR is me. I'm HR. I said it's fine.","The phone rang four times today. Three were Bob's mom.","Sam's goatee has its own Instagram. It has more followers than the dealership."];
// Her outfits (generated on the sample body): one per day, in rotation.
const RECEP_OUTFITS=[{name:"office",top:0xffffff,shade:0xc9ccd8,skirt:0x1d2747,shoes:0x111111,flare:.06,length:.06,line:"White blouse, navy skirt. Bob says it's 'the dealership look'. Bob wears cargo shorts."},
  {name:"red",top:0xc8203c,shade:0x7a1024,skirt:0xb81630,shoes:0x111111,flare:.08,length:.07,line:"Red dress day! Studies say red sells cars. I made that study up. It works anyway."},
  {name:"plaid",top:0x26262e,shade:0x121216,skirt:"plaid",shoes:0x2a1a12,line:"Plaid Wednesday. Don't tell Frenchy it's Wednesday, he gets weird."},
  {name:"pink",top:0xff9ccc,shade:0xc8689a,skirt:0xf2efe8,shoes:0xf2efe8,flare:.06,length:.06,line:"Pink top, white skirt. Mario said I look like a strawberry milkshake. I'm choosing to take that as a compliment."},
  {name:"black",top:0x18181c,shade:0x0c0c0e,skirt:0x18181c,shoes:0x111111,flare:.06,length:.07,line:"All black. Not for a funeral. Yet. Depends how the numbers look today."}];
const recepOutfit=()=>RECEP_OUTFITS[((S?S.day:1)-1)%RECEP_OUTFITS.length];
function makeRecep(){
  const g=new THREE.Group();g.userData={isVRM:true,brows:[],hipY:.8,sex:"f",mood:"neutral",moodScale:.45,keep:true};
  const day=S?S.day:1;const lk=recepLook();VRMKit.attach(g,lookFiles(lk).concat(RECEP_MODELS),{outfit:recepOutfit(),dressIf:"VRM1_Constraint",adult:{lips:0xc0283c},swim:lk.swim,swimSkip:lk.file});
  g.position.set(W.reception.x,0,W.reception.z);g.rotation.y=Math.PI;W.scene.add(g);
  G.recep={mesh:g,cool:0,said:{},day};
}
function recepSay(text,force){
  const r=G.recep;if(!r||(!force&&(r.cool>0||G.talk)))return false;
  const p=r.mesh.position;if(!force&&Math.hypot(G.px-p.x,G.pz-p.z)>14)return false;
  r.cool=9;r.mesh.userData.talkLeft=Math.min(6,1+text.length*.055);
  speakLine(text,77,1.14,1.03,true,"en","af_heart");say3(`💁 ${RECEP_NAME}: ${text}`,"#ffc8e8");return true;
}
function recepPick(list){const r=G.recep;let t=pick(list);for(let i=0;i<4&&r.said[t];i++)t=pick(list);r.said={};r.said[t]=1;return t}
function stepRecep(dt){
  if(G.recep&&S&&G.recep.day!==S.day&&G.phase==="prep"){W.scene.remove(G.recep.mesh);G.recep=null}   // new day, maybe a new outfit
  if(!G.recep){if(window.VRMKit&&W&&W.reception)makeRecep();return}
  const r=G.recep,m=r.mesh,u=m.userData,p=m.position;r.cool-=dt;u.wave=(u.wave||0)-dt;if(u.mood==="neutral"||u.mood==="happy")u.mood=u.wave>0?"happy":"neutral";u.talkLeft=(u.talkLeft||0)-dt;
  // she watches you when you're close, otherwise eyes front
  const d=Math.hypot(G.px-p.x,G.pz-p.z);let want=0;
  if(d<7&&!G.lotWalk){want=Math.atan2(G.px-p.x,G.pz-p.z)-m.rotation.y;want=Math.atan2(Math.sin(want),Math.cos(want));want=Math.max(-1,Math.min(1,want))}
  u.headYaw=(u.headYaw||0)+(want-(u.headYaw||0))*Math.min(1,dt*4);
  // customers coming through the door get a wave and a hello
  if(G.phase==="open")G.cust.forEach(c=>{if(c.mesh&&!c.hiRecep&&c.mesh.position.z<-13.6&&c.state==="todesk"){c.hiRecep=true;u.wave=2.4;recepSay(recepPick(RECEP_HI))}});
  W.animatePerson(m,!!(G.lotWalk&&G.lotWalk.path.length),G.anim,false,u.talkLeft>0);
}
// ---------- day-one tutorial, run by Tiffany ----------
// One small goal chip at a time; she talks you through it. K skips. Runs once per browser.
const tutDone=()=>{try{return localStorage.getItem("bobsTut")==="1"}catch(e){return false}};
function tutEnd(){G.tut=null;try{localStorage.setItem("bobsTut","1")}catch(e){}}
const nearDesk=()=>W.reception&&Math.hypot(G.px-W.reception.x,G.pz-(W.reception.z-1.2))<2.4;
const TUT=[
  {say:"Hi Miguel! I'm Tiffany, the receptionist. Bob said to show you the ropes. Come over to my desk, by the front door.",goal:"Walk to Tiffany's desk (WASD to walk, mouse to look)",done:()=>nearDesk()},
  {say:"Hi! Okay. Your office is the glass box in the back. The computer in there is where you buy cars, set prices and check the books.",goal:"Use the computer in your office (E)",done:()=>G.usedPC&&!overlayOpen()},
  {say:"When the lot looks good, flip the switch by the front door. Then customers come in. God help us.",goal:"Open the lot: the switch by the door (E)",done:()=>G.phase==="open"},
  {say:"The crew greets customers and takes them to a desk. Most deals close themselves. When one gets stuck, a red T.O. chip pops up. That means you.",goal:"Wait for a 🚨 T.O., walk over and press E",done:()=>!!G.talk},
  {goal:null,done:()=>!G.talk},
  {say:"Nice! Two tricks. Q sends Mini Miguel to do a T.O. for you, twice a day. And G is... the gun. Three per career. Don't tell HR. I'm HR.",goal:"Next time someone's stuck, try Q (optional)",done:t=>G.minis<2||t>40},
  {say:"Last thing. Hold V to talk to customers, or T to type. C to see yourself. X if you need to cry. That's it. Go sell some cars!",goal:null,done:t=>t>9}];
function tutSay(text){if(G.recep){G.recep.cool=0;G.recep.mesh.userData.wave=1.5;recepSay(text,true)}else{say3(`💁 ${RECEP_NAME}: ${text}`,"#ffc8e8");speakLine(text,77,1.14,1.03,true,"en","af_heart")}}
function stepTut(dt){
  const t=G.tut;if(!t)return;
  if(S.day!==1||G.ended){tutEnd();return}
  t.t+=dt;const st=TUT[t.i];
  if(t.said!==t.i&&t.t>1.2&&(G.recep&&G.recep.mesh.userData.vrm||t.t>6)){t.said=t.i;if(st.say&&!G.talk)tutSay(st.say)}
  if(t.said===t.i&&st.done(t.t)){t.i++;t.t=0;if(t.i>=TUT.length)tutEnd()}
}
const tutGoal=()=>G.tut&&G.tut.said===G.tut.i&&TUT[G.tut.i].goal;
// ---------- random events during the day ----------
// Every minute or two something happens on the lot: Dale the homeless guy pesters customers, a past customer
// comes back with a lawyer, or it starts raining. Tiffany's lot walk (L, twice a day) lives here too.
const DALE_LINES=["Hey. Hey buddy. You got a dollar? I'll tell you which car has the raccoon.","Don't buy the Buick. I lived in the Buick. It's got a leak.","Spare some change? I accept cash, Venmo, and car keys.","I used to sell cars here. Then Miguel happened.","Psst. The salesman's lying. I don't know about what. But he's lying."];
const LAWYER_LINES=[c=>`My client purchased a "reliable" car from this establishment. It is now, legally speaking, a planter.`,c=>`My client was promised "like new." The car is, and I quote my mechanic, "older than the concept of new."`,c=>`My client found a raccoon in the glovebox. The raccoon has also retained counsel.`,c=>`Mr. Wiggle assaulted my client. We have photographs. They're blurry, but he is clearly flailing.`];
function stepEvents(dt){
  if(G.evAt==null)G.evAt=rnd(60,100);
  if(G.t>=G.evAt&&!G.talk){G.evAt=G.t+rnd(70,120);
    const opts=[];if(!G.dale)opts.push("dale");if(!G.lawyer&&G.t<SHIFT_SECONDS-90)opts.push("lawyer");if(!G.rain)opts.push("rain");
    const e=pick(opts);if(e==="dale")startDale();if(e==="lawyer")startLawyer();if(e==="rain")startRain()}
  stepDale(dt);stepLawyer(dt);stepRain(dt);stepLotWalk(dt);
}
// Dale: wanders up to customers and asks for change; they get less patient and less willing. E: give him $5 to go away.
function startDale(){
  const m=W.person({top:"jacket",shirt:0x4a4030,shirt2:0x3a3328,pants:0x3a3a30,hat:"beanie",hatColor:0x5a2a2a,beard:true,hairStyle:"messy",hair:0x6a6a60,skin:ri(0,3),build:"slim",height:.97});
  m.position.set(rnd(-1,1),0,GATE_IN);W.scene.add(m);
  G.dale={mesh:m,path:[],speed:1.2,state:"seek",bothered:0,t:0,ph:0};say3("🥫 Dale wandered onto the lot. He's looking for customers. Not to buy.","#fd8");
}
function stepDale(dt){
  const d=G.dale;if(!d)return;d.t+=dt;const arrived=stepNpc(d,dt,d.state==="pester");
  if(d.state==="seek"){const c=pick(G.cust.filter(c=>c.mesh&&c.mesh.visible&&["browse","greet","working","stuck"].includes(c.state)&&c!==d.last));
    if(!c||d.bothered>=2||d.t>80){daleLeave(false);return}
    const p=c.mesh.position,q=d.mesh.position,inside=inShowroom(p.z),from=inShowroom(q.z)?[P(q.x,-17.6)]:toShowroom(q.x,q.z);d.tgt=c;
    d.path=inside?from.concat([P(p.x+.9,-17.6),P(p.x+.9,p.z+.6)]):(inShowroom(q.z)?[P(q.x,-17.6),P(0,-13.5),P(IN,-11)]:[]).concat(toAisle(inShowroom(q.z)?IN:q.x,inShowroom(q.z)?-11:q.z,IN),[P(p.x+.9,p.z+.6)]);d.state="go"}
  else if(d.state==="go"){if(!d.tgt.mesh||d.tgt.state==="gone"){d.state="seek";return}if(arrived){d.state="pester";d.wait=9;d.bothered++;d.last=d.tgt;
      const c=d.tgt,l=pick(DALE_LINES),near=Math.hypot(G.px-d.mesh.position.x,G.pz-d.mesh.position.z)<15;
      say3(`🥫 Dale to ${c.u.name}: "${l}"`,"#d8c8a0");if(near)speakLine(l,31,.7,.92,false,"en","am_echo");d.mesh.userData.talkLeft=4;
      c.mesh.userData.mood="worried";if(c.state==="stuck")c.pat=Math.max(3,c.pat-10);else c.u.reserve=Math.round(c.u.reserve*.97/50)*50}}
  else if(d.state==="pester"){d.wait-=dt;const c=d.tgt;if(c&&c.mesh)d.mesh.rotation.y=Math.atan2(c.mesh.position.x-d.mesh.position.x,c.mesh.position.z-d.mesh.position.z);if(d.wait<=0)d.state="seek"}
  else if(d.state==="leave"&&arrived){W.scene.remove(d.mesh);G.dale=null}
}
function daleLeave(paid){const d=G.dale;if(!d||d.state==="leave")return;d.state="leave";d.speed=1.5;const q=d.mesh.position;
  d.path=(inShowroom(q.z)?[P(q.x,-17.6),P(0,-13.5),P(OUT,-11)].concat(toAisle(OUT,-11,OUT)):toAisle(q.x,q.z,OUT)).concat([P(OUT,24),P(0,GATE_OUT)]);
  if(paid){S.cash-=5;const l=pick(["Bless you, Miguel. Don't buy the Buick.","Five bucks! I'm gonna buy a Buick.","You're a good man. Your posters don't do you justice."]);say3(`🥫 Dale: "${l}"`,"#d8c8a0");speakLine(l,31,.7,.92,false,"en","am_echo")}
  else say3("🥫 Dale wandered off.","#bbb")}
// The lawsuit: a past customer and their lawyer wait by your office. E: settle or fight. Ignore them and the court decides.
function startLawyer(){
  const done=S.cust.filter(u=>u.done&&/^Bought/.test(u.msg||"")),name=done.length?pick(done).name:pick(NAMES),amt=Math.round(rnd(300,900)/50)*50;
  const cl=W.person({top:"hoodie",shirt:pick([0x4a6a8a,0x6a4a4a,0x4a7a5a]),skin:ri(0,3),hairStyle:pick(["short","bob","curly"]),build:pick(["avg","fat"])});
  const lw=W.person({top:"suit",shirt:0x22252c,shirt2:0xf2f2f2,tie:0x7a1020,pants:0x22252c,hairStyle:"slick",hair:0x1a1a1a,glasses:true,skin:ri(0,3),height:1.02});
  cl.position.set(-.8,0,GATE_IN);lw.position.set(.8,0,GATE_IN);W.scene.add(cl);W.scene.add(lw);
  const to=[P(0,-13.5),P(-3.5,-17),P(-5.2,-21.6)];
  G.lawyer={name,amt,cl:{mesh:cl,path:toAisle(-.8,GATE_IN,IN).concat([P(IN,-11)],to),speed:1.4},lw:{mesh:lw,path:toAisle(.8,GATE_IN,IN).concat([P(IN,-11.5)],to.map(p=>P(p.x+.9,p.z))),speed:1.4},state:"in",t:0};
  say3(`⚖️ ${name} is back. With a lawyer. They're heading for your office.`,"#ffb070");Sfx.alert&&Sfx.alert();
}
function stepLawyer(dt){
  const L=G.lawyer;if(!L)return;L.t+=dt;const a=stepNpc(L.cl,dt,L.state==="wait"),b=stepNpc(L.lw,dt,L.state==="wait");
  if(L.state==="in"&&a&&b){L.state="wait";L.wait=55;const l=pick(LAWYER_LINES)(L);say3(`⚖️ ${L.name}'s lawyer: "${l}"`,"#ffb070");
    if(Math.hypot(G.px-L.lw.mesh.position.x,G.pz-L.lw.mesh.position.z)<16)speakLine(l,55,.85,1.05,false,"en","bm_george");L.lw.mesh.userData.talkLeft=5}
  if(L.state==="wait"){L.wait-=dt;[L.cl,L.lw].forEach(n=>n.mesh.rotation.y=Math.atan2(G.px-n.mesh.position.x,G.pz-n.mesh.position.z));
    if(L.wait<=0){const pay=Math.round(L.amt*1.5/50)*50;S.cash-=pay;say3(`⚖️ You ignored ${L.name}'s lawyer. The court ruled against you: ${$f(pay)}.`,"#f66");Sfx.lose();lawyerLeave()}}
  if(L.state==="out"&&a&&b){W.scene.remove(L.cl.mesh);W.scene.remove(L.lw.mesh);G.lawyer=null}
}
function lawyerLeave(){const L=G.lawyer;if(!L)return;L.state="out";[L.cl,L.lw].forEach((n,i)=>{const q=n.mesh.position;n.speed=1.6;n.path=[P(q.x,-17),P(i?.8:-.8,-13.5)].concat(toAisle(i?.8:-.8,-11,OUT),[P(OUT,24),P(0,GATE_OUT)])})}
function lawyerTalk(){
  const L=G.lawyer;if(!L||L.state!=="wait")return;
  showPause(`<h2>⚖️ ${esc(L.name)} v. Bargain Bob's</h2><p>Their lawyer wants <b>${$f(L.amt)}</b> to make this go away.</p><p class=dim>Fight it and it's a coin flip: they walk away with nothing, or you pay double.</p>
    <button class=go onclick="Game.lawyer('settle')">Settle: pay ${$f(L.amt)}</button><button class=b onclick="Game.lawyer('fight')">Fight it</button><button class=b onclick="Game.lawyer('stall')">Stall</button>`);
}
function lawyer(choice){
  const L=G.lawyer;resume();if(!L)return;
  if(choice==="stall"){L.wait=Math.max(L.wait,20);say3(`⚖️ You told them you'd "be right with them". The clock's ticking.`,"#ffb070");return}
  if(choice==="settle"){S.cash-=L.amt;say3(`⚖️ Settled with ${L.name} for ${$f(L.amt)}. Their lawyer smirked the whole time.`,"#ffb070");Sfx.lose()}
  else if(Math.random()<.5){say3(`⚖️ You fought it and WON. The lawyer is calling you a "loose cannon" in the parking lot.`,"#8dffa8");Sfx.win&&Sfx.win()}
  else{const pay=L.amt*2;S.cash-=pay;say3(`⚖️ You fought it and lost. ${$f(pay)}. Tiffany is pretending she didn't see.`,"#f66");Sfx.lose()}
  lawyerLeave();
}
// Rain: grey sky, streaks of rain; customers have less patience while it lasts.
function startRain(){G.rain={t:0,dur:rnd(60,95),a:0};say3("🌧️ It's starting to rain. Customers are getting impatient.","#9cf");
  if(G.recep&&Math.random()<.7)setTimeout(()=>recepSay(pick(["Great. Rain. Bob's going to say the cars are 'getting a free wash'.","It's raining. Juanny is outside dancing in it. Nobody knows why.","Rain! Perfect. Sam's goatee is going to frizz."]),true),2500)}
function stepRain(dt){const r=G.rain;if(!r)return;r.t+=dt;const tgt=r.t<r.dur?1:0;r.a+=(tgt-r.a)*Math.min(1,dt*.4);W.setRain(r.a);if(r.t>r.dur&&r.a<.03){W.setRain(0);G.rain=null;say3("🌤️ The rain stopped.","#9cf")}}
// Tiffany walks the lot (L, twice a day): male customers she passes warm up, female customers cool off.
function sendTiffany(){
  if(G.phase!=="open"||G.talk)return;if(!G.recep||!G.recep.mesh.userData.vrm)return say3("Tiffany isn't at her desk yet.","#fd8");
  if(G.lotWalk)return say3("Tiffany's already out on the lot.","#fd8");if(!(G.walks>0))return say3("Tiffany already walked the lot twice today. Her feet hurt.","#fd8");
  G.walks--;const p=G.recep.mesh.position;
  G.lotWalk={path:[P(-5.9,-14.5),P(-5.9,-16.2),P(0,-15.8),P(0,-12.5),P(0,0),P(-17,0),P(-17,13),P(17,13),P(17,0),P(0,0),P(0,-12.5),P(0,-15.8),P(-5.9,-16.2),P(-5.9,-14.5),P(p.x,p.z)],seen:new Set(),home:{x:p.x,z:p.z}};
  say3(`💁 Tiffany is walking the lot (${G.walks} left today). Watch the men stand up straighter.`,"#ffc8e8");
  recepSay(pick(["Fine. I'll go be 'customer engagement'. Again.","Walking the lot. If Frenchy follows me, he's fired.","Okay, I'm going out there. Somebody watch the phone. Not Mario."]),true);
}
function stepLotWalk(dt){
  const w=G.lotWalk;if(!w||!G.recep)return;const m=G.recep.mesh,u=m.userData,p=w.path[0];
  if(!p){m.position.set(w.home.x,0,w.home.z);m.rotation.y=Math.PI;G.lotWalk=null;u.headYaw=0;return}
  const dx=p.x-m.position.x,dz=p.z-m.position.z,d=Math.hypot(dx,dz),st=1.35*dt;
  if(d<=st){m.position.x=p.x;m.position.z=p.z;w.path.shift()}else{m.position.x+=dx/d*st;m.position.z+=dz/d*st;m.rotation.y=Math.atan2(dx,dz)}
  G.cust.forEach(c=>{if(!c.mesh||w.seen.has(c)||["gone","wait","talk","td_drive"].includes(c.state))return;
    if(Math.hypot(c.mesh.position.x-m.position.x,c.mesh.position.z-m.position.z)>4.5)return;w.seen.add(c);u.wave=1.4;
    if(c.u.sex==="f"){c.u.reserve=Math.round(c.u.reserve*.96/50)*50;c.mesh.userData.mood="angry";if(c.state==="stuck")c.pat=Math.max(3,c.pat-6);popup("🙄",c.mesh.position,"#ff8a8a")}
    else{c.u.reserve=Math.round(Math.min(c.u.budget,c.u.reserve*1.05)/50)*50;c.mesh.userData.mood="happy";if(c.state==="stuck")c.pat=Math.min(c.patMax,c.pat+12);popup("😍",c.mesh.position,"#ff7ab8")}});
}
// ---------- days off ----------
// Now and then a salesperson asks for tomorrow off. Approve: they're gone tomorrow (you're a man down) and come back
// fully motivated the day after (closes more, caves less). Deny, or ignore them: they sulk for two days.
const OFF_ASKS={Frenchy:"Boss, tomorrow is ze Brie Festival. It's very important to my people. And to me. Mostly me.",
  Sam:"Hey, uh, can I get tomorrow off? It's my goatee's birthday. Five years. We're doing a whole thing.",
  Andres:"Can I have tomorrow? My kid's graduating. From preschool. I'm not crying, you're crying.",
  Riccardo:"I need tomorrow off. Court date. Totally unrelated to the car thing. Different car thing.",
  Mario:"My mom's got her colonoscopy tomorrow. I'm driving. She says I'm also holding her hand. Can I go?",
  Juanny:"Jefe... ¿mañana libre? Es el cumpleaños de mi abuela. Cumple cien años. Hay mariachis."};
const motive=d=>{const m=S.mot&&S.mot[d.name];if(!m)return 0;if(m.boost===S.day)return 1;if(m.sulk>=S.day)return -1;return 0};
const offToday=d=>!!(S.mot&&S.mot[d.name]&&S.mot[d.name].off===S.day);
function stepDayOff(){
  if(G.offAsk&&(G.t>G.offAsk.until||G.t>=SHIFT_SECONDS-1)){const n=G.offAsk.name;answerDayOff(false);say3(`${n} took your silence as a no. They're sulking.`,"#f66")}
  if(G.offAt==null||G.t<G.offAt||G.talk||G.offAsk)return;
  const sp=pick(G.sales.filter(s=>s.state==="idle"||s.state==="work"));
  if(!sp||G.t>SHIFT_SECONDS-70){G.offAt=G.t<SHIFT_SECONDS-70?G.t+15:null;return}   // everyone busy: ask a bit later
  G.offAt=null;
  G.offAsk={name:sp.def.name,sp,until:G.t+60};crewSay(sp,OFF_ASKS[sp.def.name]||"Can I get tomorrow off, boss?");Sfx.phone&&Sfx.phone();
}
function answerDayOff(yes){
  const a=G.offAsk;if(!a)return;G.offAsk=null;S.mot=S.mot||{};const m=S.mot[a.name]=S.mot[a.name]||{};
  if(yes){m.off=S.day+1;m.boost=S.day+2;crewSay(a.sp,pick(["You're the best, boss! I'll come back on FIRE.","Thank you! I owe you one. Two. Okay, one.","¡Gracias, jefe! ¡Gracias!"]));say3(`✅ ${a.name} gets tomorrow off. You'll be a man down, but they'll come back fired up.`,"#8dffa8")}
  else{m.sulk=S.day+2;crewSay(a.sp,pick(["Fine. FINE. I'll be here. Physically.","Cool. Cool cool cool. I'll just sell cars with my broken heart.","Okay. I'm telling my mom you said no."]));say3(`❌ You denied ${a.name}'s day off. Expect two days of sulking.`,"#f66")}
  save();
}
// ---------- secret: flirting with Tiffany ----------
// Chat with her (E) on three different days and F unlocks at her desk. Pick one of three lines (3 a day); she rates it.
// A hidden affection meter (0-20) unlocks perks: budget tips (4), morning coffee (8), she covers for you with Bob (13),
// she waves at you first (18), and at 20 a vending-machine date after hours. Wholesaling and the gun cost you points.
const TF=()=>S.tiff||(S.tiff={days:[],aff:0,unlocked:false,dated:false});
const FL_LINES=[["Are you a 2004 Corolla? Because you're reliable and I'd never trade you in.",3],["I'd give you zero percent APR. For life.",3],
  ["If you were a car, you'd be the one we never put on sale.",3],["You make this dump of a dealership look like a showroom.",3],["Is your name Carfax? Because I want to know your whole history.",3],
  ["Do you have a warranty? Because I'm falling for you.",1],["Are you the check engine light? Because I can't stop thinking about you.",1],
  ["Is this seat taken? Not the chair. Like, emotionally.",1],["Do you like test drives? Asking for a friend. The friend is me.",1],["You must be a trade-in, because I'd give you way more than you're worth. Wait.",1],
  ["I've got a V8 under this tie.",-2],["You up? I mean, you're standing. Never mind.",-2],["My mom thinks you're nice. She's in the car right now.",-2],
  ["Want to see my commission check? I laminated it.",-2],["I'm the manager, so technically I'm your boss. Is that... hot?",-3]];
const FL_REPLY={good:["Smooth, Miguel. Did Frenchy write that for you?","Okay... that one was actually good. Don't let it go to your head.","Fine. You get one point. One.","Zero percent APR? You'd lose money on me."],
  meh:["That's so cheesy it should come with crackers.","I'm going to pretend I didn't hear that. But I heard it.","Cute. In a sad, golden-retriever way."],
  bad:["Miguel. No.","That's the worst line I've heard since Mario's meatball.","I'm HR. I'm writing this down. I'm also laughing at you.","Please never say that again. Not to me. Not to anyone."]};
const FL_LEVELS=[[4,"💘 Tiffany likes you. She'll slip you customers' budgets when you chat (E)."],[8,"💘 Tiffany's sweet on you. She'll leave you a coffee every morning."],
  [13,"💘 Tiffany's got your back. Next time Bob catches you slipping, she'll cover for you."],[18,"💘 Tiffany's head over heels. She waves at you first now."],[20,"💘 Tiffany's all in. Stick around after closing tonight."]];
function tiffAff(d,quiet){const t=TF(),was=t.aff;t.aff=Math.max(0,Math.min(20,t.aff+d));
  FL_LEVELS.forEach(([lv,msg])=>{if(was<lv&&t.aff>=lv){setTimeout(()=>say3(msg,"#ff9ad0"),2600);if(lv===20&&!t.dated)G.datePending=true}});
  if(!quiet&&t.aff!==was)popup(t.aff>was?"💗":"💔",G.recep?G.recep.mesh.position:{x:G.px,z:G.pz},t.aff>was?"#ff7ab8":"#9aa")}
// Hold F at her desk and say your line (a quick tap types it instead). Gemini rates it when it's on; otherwise the
// built-in judge below does: car puns and real compliments land, creepy or "I'm your boss" lines bomb.
function rateFlirt(t){
  t=t.toLowerCase();let sc=0;const known=FL_LINES.find(l=>t.replace(/[^a-z ]/g,"").includes(l[0].toLowerCase().replace(/[^a-z ]/g,"").slice(0,24)));if(known)return known[1];
  if(/\b(car|engine|drive|driving|tank|apr|financ|warranty|carfax|test drive|horsepower|v ?8|turbo|mileage|miles|trade|lease|showroom|wheel|brakes?|gas|fuel|horn|park|sticker|dealer|lot|ignition|transmission|gear)\b/.test(t))sc+=2;
  if(/\b(beautiful|gorgeous|pretty|cute|smile|eyes|smart|funny|amazing|stunning|lovely|glasses|laugh|nice|best|brilliant|sweet|kind)\b/.test(t))sc+=2;
  if(/\b(dinner|lunch|coffee|date|drink|go out|movie|tacos|dance)\b/.test(t))sc+=1;
  if(/\b(heart|forever|love|falling|crush|swoon|dream|stars?)\b/.test(t))sc+=1;
  if(/\b(sexy|hot body|body|boobs?|ass|butt|legs|bikini|naked|kiss me|bed|touch|thicc|hot)\b/.test(t))sc-=4;
  if(/\b(boss|fired|raise|promotion|my office|work for me|i'?m the manager|hr)\b/.test(t))sc-=4;
  if(/\bmy (mom|mother|wife)\b/.test(t))sc-=2;
  if(t.split(/\s+/).length<4)sc-=1;
  return Math.max(-3,Math.min(3,sc));
}
let flirtRec=null;
function flirtStart(at){
  const t=TF();if(!t.unlocked||!G.recep||G.lotWalk||G.talk||flirtRec)return;
  if((G.flirts||0)>=3)return recepSay(pick(["Three's my limit, Miguel. Go sell a car.","You're cute, but you have customers.","Save some charm for the buyers."]),true);
  hush();flirtRec={t0:at||performance.now(),text:""};say3("🎙️ Say it to her… (let go of F when you're done)","#ff9ad0");
  try{
    if(micMode==="whisper"&&window.Whisper){flirtRec.mode="w";Whisper.load().catch(()=>{});Whisper.start().catch(()=>{flirtRec=null;flirtType()})}
    else if(SR){const r=new SR();r.lang="en-US";r.continuous=true;r.interimResults=true;r.onresult=e=>{let s="";for(const x of e.results)s+=x[0].transcript+" ";if(flirtRec)flirtRec.text=s.trim()};r.onerror=()=>{};r.start();flirtRec.mode="b";flirtRec.r=r}
    else{flirtRec=null;flirtType()}
  }catch(e){flirtRec=null;flirtType()}
}
function flirtStop(at){
  const f=flirtRec;if(!f)return;flirtRec=null;
  if((at||performance.now())-f.t0<350){if(f.mode==="w")Whisper.cancel();else if(f.r)try{f.r.abort()}catch(e){}return flirtType()}   // a tap: type it instead
  if(f.mode==="w")Whisper.stop().then(judgeFlirt).catch(()=>judgeFlirt(""));
  else{try{f.r.stop()}catch(e){}setTimeout(()=>judgeFlirt(f.text),700)}
}
function flirtType(){
  showPause(`<h2>💘 Say something to Tiffany</h2><input id=flirtin type=text style="width:100%;font-size:18px" placeholder="Your best line…" onkeydown="if(event.key==='Enter')Game.flirtSend()">
    <div style="margin-top:10px"><button class=go onclick="Game.flirtSend()">Say it</button><button class=b onclick="Game.flirtSend(true)">Never mind</button></div>`);
  setTimeout(()=>{const i=el("flirtin");if(i)i.focus()},50);
}
function flirtSend(cancel){const i=el("flirtin"),v=i&&i.value.trim();resume();if(!cancel&&v)judgeFlirt(v)}
function judgeFlirt(said){
  said=String(said||"").trim();if(!G.recep)return;
  if(!said)return recepSay(pick(["Did you say something? You just kind of breathed at me.","Speak up, Miguel. I don't do mime. That's the other guy."]),true);
  G.flirts=(G.flirts||0)+1;say3(`You: "${said}"`,"#cfe3ff");
  const sp=G.sales.find(s=>s.state==="idle"&&Math.hypot(s.mesh.position.x-G.px,s.mesh.position.z-G.pz)<14);
  if(sp){setTimeout(()=>crewSay(sp,pick(["Hey! The boss is hitting on Tiffany!","Oh, so it's like THAT, Miguel?","I saw that. Everybody saw that.","Not cool, boss. I was gonna ask her to lunch."])),3600);G.sales.forEach(s=>{if(s.state==="idle")s.drift=Math.min(s.drift||99,rnd(4,12))})}
  if(G.owner&&!G.owner.leaving){recepSay("Uh. Bob's right there.",true);setTimeout(()=>{say3("Bob heard that. He's not mad. He's just disappointed. And a little impressed.","#ffd24a");speakLine("Miguel. My office. Actually, I don't have an office. Your office.",77,.62,.9,false,"en","am_onyx")},2500);return}
  const answer=(score,reply)=>{if(!G.recep)return;const u=G.recep.mesh.userData,k=score>=3?"good":score>0?"meh":"bad";
    u.mood=k==="good"?"happy":k==="meh"?"neutral":"angry";u.moodScale=k==="good"?.8:.45;u.wave=k==="good"?1:0;setTimeout(()=>{u.mood="neutral";u.moodScale=.45},4500);
    recepSay(reply||pick(FL_REPLY[k]),true);tiffAff(score>=3?3:score>0?1:score>=-1?-1:-2)};
  const own=rateFlirt(said);
  if(window.AI&&AI.on()&&AI.flirt)AI.flirt(said).then(r=>answer(r.score,r.reply)).catch(()=>answer(own));else setTimeout(()=>answer(own),900);
}
function tiffTip(){
  if(TF().aff<4)return null;const c=pick(G.cust.filter(c=>c.mesh&&["browse","greet","working","stuck"].includes(c.state)));
  return c?`Psst. ${c.u.name} told me their budget's about ${$f(Math.round(c.u.budget*.95/100)*100)}. You didn't hear it from me.`:null;
}
// ---------- the crew gets distracted by Tiffany ----------
// An idle salesperson drifts over to the reception desk to flirt. While they're there they don't greet anyone,
// so customers on the lot go unhelped. Walk over and press E to send them back. Some are worse than others.
const FLIRT_RATE={Frenchy:.55,Riccardo:.7,Mario:.8,Juanny:.85,Sam:1,Andres:1.15};
const FLIRT={Frenchy:[["Tiffany, mon chéri. Your eyes are like two headlights on a 2004 Peugeot.","Frenchy, they don't sell those in America."],["In France, we would call you 'magnifique'. Here I call you 'the reason I come to work'.","You come to work for the free coffee, Frenchy."]],
  Sam:[["So, uh... you a goatee person?","I'm a 'people who sell cars' person, Sam."],["I sold a car last week. Well. I almost sold a car.","Wow. Almost. Be still my heart."]],
  Andres:[["I'm not short. I'm fuel efficient.","Okay, Andres."],["Want to see me reach the top shelf? I'm gonna need a chair.","Please don't stand on my chair again."]],
  Riccardo:[["Tiffany. You want to see my commission check? I laminated it.","It's for forty-one dollars, Riccardo."],["My cousin says I look like a young Al Pacino.","Your cousin needs glasses."]],
  Mario:[["You know, my mom says I'm a catch.","Your mom calls here every day, Mario. She says you left the stove on."],["I brought you a meatball. Just one. It's a big one.","...Thank you, Mario. I think."]],
  Juanny:[["Tiffany, eres más bonita que un Camry con cero millas.","Gracias? I think? Is that a car thing?"],["¿Quieres ir a comer tacos después del trabajo?","I don't know what you said but I heard tacos, and yes."]]};
// Laundry days (she's in the bikini): the crew turns it up. Three tries each, and they hang around longer.
const FLIRT_BIKINI={Frenchy:[["Tiffany. Ze laundry gods have smiled on me today.","They're about to frown on you, Frenchy."],["In France, zis is called 'business casual'.","In America it's called 'my washer broke'."],["Shall I hold ze sunscreen? For safety?","There's no sun. We're indoors. Go sell a car."]],
  Sam:[["So, uh, I washed my car today too. We have that in common.","We have nothing in common, Sam."],["Nice, uh... weather. In here. Today.","We're indoors, Sam."],["I could give you a ride to the laundromat. In a car I haven't sold.","I'll take the bus."]],
  Andres:[["From down here, you look like a giant golden goddess.","From up here, you look like you have a customer waiting."],["I'm on the lifeguard list at my apartment pool.","The pool's been drained since 2019, Andres."],["Want me to stand guard? I'm small, but I'm loud.","You're both. Go."]],
  Riccardo:[["Tiffany. I'm not saying it's fate that your laundry broke. But it's fate.","It's a broken washer, Riccardo."],["You know, I own a boat. Well. A raft. It's a pool float.","Is it a flamingo?","It's a flamingo."],["I'd buy a car from you right now. Full sticker.","You work here, Riccardo."]],
  Mario:[["Mamma mia. I'm calling my mother to tell her about this.","Please do not call your mother about this."],["I brought you a towel. And a meatball. Beach essentials.","...Leave the towel. Take the meatball."],["You know I'm single, right?","Everyone knows, Mario. Your mom put it on the sign."]],
  Juanny:[["¡Ay, Tiffany! ¡Hoy es día de playa!","I don't know what that means but no."],["¿Necesitas una toalla? ¿Un café? ¿Un esposo?","I caught 'café'. Yes. Black."],["Mi corazón está en la lavandería también.","Okay, sweetie. Go back to your desk."]]};
const BACK={Frenchy:"I was only asking about ze... stapler.",Sam:"I was just checking the sign-in sheet, boss.",Andres:"She asked me to reach something. Okay, she didn't.",Riccardo:"Networking, boss. It's called networking.",Mario:"I'm going, I'm going.",Juanny:"Sí, jefe, sí, sí."};
const driftTime=s=>rnd(35,70)*(FLIRT_RATE[s.def.name]||1)*(recepLook().event?.5:1);   // Beach Day: twice as bad
function crewSay(s,text){const n=s.def.name,v=CREW_VOICES[n]||[1,1];say3(`${n}: ${text}`,"#cde");
  speakLine(text,n.length*13+s.def.id,v[0],v[1],true,s.def.quirk==="spanish"?"es":"en",CREW_KVOICE[n]||"am_eric");s.mesh.userData.talkLeft=2.5}
function stepFlirt(s,dt,arrived){
  if(!G.recep||G.ended)return;
  if(s.state==="idle"){s.drift=(s.drift===undefined?driftTime(s):s.drift)-dt;
    if(s.drift<=0&&!G.lotWalk&&!G.sales.some(o=>o.state==="flirt"&&o.flirt>40)){   // one at a time hangs around for long
      const spot=[-8.2,-7.5,-6.8].find(x=>!G.sales.some(o=>o.state==="flirt"&&o.spot===x));
      if(spot===undefined||G.sales.filter(o=>o.state==="flirt").length>=2){s.drift=rnd(15,30);return}   // never more than two at her desk
      s.state="flirt";s.spot=spot;s.flirt=0;s.said=0;s.lineAt=ri(0,5);s.speed=1.6;s.path=[P(s.mesh.position.x,-16.4),P(spot,-15.85)];
      say3(`😍 ${s.def.name} wandered over to ${RECEP_NAME}'s desk instead of working.`,"#ffb6e1");
      if(G.tut&&!G.tutFlirt&&!G.talk){G.tutFlirt=true;setTimeout(()=>tutSay(`Ugh. ${s.def.name}'s hanging around my desk again. While they're here, nobody's helping customers. Walk over and press E to send them back. Please.`),3500)}}
    return}
  if(s.state!=="flirt")return;
  s.flirt+=dt;if(!arrived)return;
  s.mesh.rotation.y=Math.atan2(G.recep.mesh.position.x-s.mesh.position.x,G.recep.mesh.position.z-s.mesh.position.z);
  const d=Math.hypot(G.px-s.mesh.position.x,G.pz-s.mesh.position.z),bik=laundryDay(S.day),lines=(bik&&FLIRT_BIKINI[s.def.name])||FLIRT[s.def.name]||[["So... you come here often?","I work here."]];
  if(s.said<(bik?3:2)&&s.flirt>(s.said?(bik?11:14):2)&&!G.talk&&d<14){const L=lines[(s.said+(s.lineAt||0))%lines.length];s.said++;   // start somewhere different each visit
    if(s.said===1||bik)popup(bik?"😍🔥":"😍",s.mesh.position,"#ff7ab8");crewSay(s,L[0]);G.recep.cool=0;G.recep.mesh.userData.mood="neutral";recepSay(L[1],true);
    if(L[2])setTimeout(()=>{if(s.state==="flirt")crewSay(s,L[2])},4500);   // some bits get a last word
    setTimeout(()=>{if(G.recep)G.recep.mesh.userData.mood="happy"},4000)}
  if(s.flirt>(bik?100:75)){sendBack(s,false)}   // she finally shoos them off herself
}
function sendBack(s,byMiguel){
  s.state="back";s.speed=2.1;s.path=routeSalesHome(s.mesh.position.x,s.mesh.position.z,s.home);s.drift=driftTime(s)*(byMiguel?1.3:.8);s.spot=null;
  if(byMiguel)crewSay(s,BACK[s.def.name]||"Going, boss.");
  else say3(`${RECEP_NAME} sent ${s.def.name} back to his desk. Somebody has to.`,"#ffb6e1");
}
function recepChat(){
  const S0=S,list=[],stuck=G.cust.filter(c=>c.state==="stuck"),tf=TF();
  if(!tf.days.includes(S.day)){tf.days.push(S.day);if(!tf.unlocked&&tf.days.length>=3){tf.unlocked=true;setTimeout(()=>say3("💘 Tiffany smiled at you a little longer than usual. (Psst: hold F at her desk and say something nice.)","#ff9ad0"),5000)}}
  const tip=G.phase==="open"&&Math.random()<.6&&tiffTip();if(tip&&G.recep.toldOutfit){G.recep.mesh.userData.wave=1;return recepSay(tip,true)}
  if(G.phase!=="open")list.push("Lot's not open yet. Buy some cars on the computer, then hit the switch by the door. I believe in you. Kind of.");
  if(stuck.length)list.push(`${stuck.length} ${stuck.length>1?"people are":"person is"} waiting on you, sweetie. ${stuck[0].u.name} is chewing on the pen chain.`);
  if(G.owner)list.push("Bob's here. He asked me if the coffee's free. It's his coffee. He paid for it. I didn't correct him.");
  if(G.phase==="open"&&G.minis>0)list.push(`You've got ${G.minis} Mini Miguel${G.minis>1?"s":""} left today. He keeps asking me out. He's eleven inches tall.`);
  if(G.phase==="open"&&G.minis===0)list.push("Mini Miguel's on his break. He's sitting in the cup holder of the Civic, sulking.");
  try{const wk=weekOf(S0.day),got=S0.profit-S0.weekStart,q=quota(wk);list.push(got>=q?"You hit quota! Bob said 'good job' and then immediately said 'don't get used to it.'":`You need ${$f(q-got)} more this week for quota. No pressure. Except from Bob. And the bank.`)}catch(e){}
  if(!G.recep.toldOutfit){G.recep.toldOutfit=true;G.recep.mesh.userData.wave=1.2;const v=G.recep.mesh.userData.vrm,stock=v&&String(v.src).includes("VRM1_Constraint");
    const lk=recepLook();if(lk.lines&&v&&(lk.swim||String(v.src).includes(lk.file)))return recepSay(pick(lk.lines),true);
    return recepSay(stock?recepOutfit().line:pick(["Like the blouse? Bob said I look like I work at a real dealership. Nicest thing anyone's ever said about this place.","New glasses. I can finally read the fine print on our contracts. I wish I couldn't.","The skirt's for the customers. The glasses are so Frenchy thinks I'm busy.","Pencil skirt, glasses, coffee. I'm the only professional thing on this lot."]),true)}
  list.push(recepPick(RECEP_JOKES));
  G.recep.mesh.userData.wave=1.2;recepSay(pick(list.slice(0,2).concat(list.slice(-1))),true);
}
function nearest(){
  if(!G.talk&&G.dale&&G.dale.state!=="leave"&&Math.hypot(G.px-G.dale.mesh.position.x,G.pz-G.dale.mesh.position.z)<2.2)return{label:"[E] Give Dale $5 to go away",act:()=>daleLeave(true)};
  if(!G.talk&&G.lawyer&&G.lawyer.state==="wait"&&Math.hypot(G.px-G.lawyer.lw.mesh.position.x,G.pz-G.lawyer.lw.mesh.position.z)<2.6)return{label:`[E] Deal with ${G.lawyer.name}'s lawyer`,act:lawyerTalk};
  if(!G.talk){const f=G.sales.find(s=>s.state==="flirt"&&Math.hypot(G.px-s.mesh.position.x,G.pz-s.mesh.position.z)<2.2);
    if(f)return{label:`[E] Back to your desk, ${f.def.name}!`,act:()=>sendBack(f,true)}}
  if(G.recep&&!G.talk){const p=G.recep.mesh.position;if(Math.hypot(G.px-p.x,G.pz-(p.z-.9))<1.8)return{label:`[E] Talk to ${RECEP_NAME}`+(TF().unlocked?" · hold [F] to flirt":""),act:recepChat}}
  if(G.phase==="prep"){
    if(Math.hypot(G.px-W.pc.x,G.pz-W.pc.z)<1.7)return{label:"[E] Use the computer: prices, crew, upgrades, books",act:()=>{G.usedPC=true;PC.open()}};
    if(Math.hypot(G.px-W.sw.x,G.pz-W.sw.z)<1.7)return{label:S.inv.length?"[E] Open the lot":"[E] Open the lot (buy cars first)",act:startShift};
  }
  if(G.phase==="open"&&!G.talk){
    const c=pairNear();
    if(c)return{label:`[E] Take over: ${c.u.name} (${c.sp?c.sp.def.name:"unassisted"})`,act:()=>takeover(c)};
  }
  return null;
}
function takeover(c){
  const car=carOf(c);if(!car||G.talk)return;
  G.talk={c,prev:c.state,wasStuck:c.state==="stuck"};G.keys={};G.vx=G.vz=0;
  let frac=c.state==="stuck"?Math.max(.4,c.pat/c.patMax):1;if(G.coffee){G.coffee=false;frac=Math.min(1,frac+.25)}
  c.state="talk";if(c.to){c.mesh.remove(c.to);c.to=null}removeBar(c);
  const sp=c.sp,u=c.u;
  let crew=null;
  if(sp){sp.armsUp=false;if(!sp.mesh.userData.sit)sp.mesh.position.x+=1.1;   // the salesperson steps aside (or stays seated), with a word
    const n=sp.def.name,v=CREW_VOICES[n]||[1,1];crew={name:n,text:pick(CREW_LINES[n]||["All yours, boss."])};
    speakLine(crew.text,n.length*13+sp.def.id,v[0],v[1],false,sp.def.quirk==="spanish"?"es":"en",CREW_KVOICE[n]||"am_eric")}
  // Openers are small talk, not numbers: the customer warms up (or doesn't) depending on how Miguel plays it.
  const car2=label(car);
  openTalk(u.id,{patFrac:frac,inWorld:true,crew,intro:sp&&sp.def.quirk==="spanish"?`${pick(["Your guy only speaks Spanish. I think he offered me a car? Or a sandwich?","Dude, I took French in school. I have no idea what that man said for twenty minutes.","He kept smiling and saying 'sí'. Did I already buy something?"])} ${posterGag()}`
    :sp?`${pick(["Hey, you must be the manager.","Oh, the boss is here.","Hi. Are you the guy in charge?"])} ${posterGag()} ${sp.def.name} and I have been going back and forth on this ${car2}.`
    :`${pick(["Hi there.","Hey.","Oh, hello."])} ${Math.random()<.6?posterGag()+" ":""}I'm just looking at this ${car2}.`});
}
// called by talk.js when the panel closes
function talkClosed(){
  const t=G.talk;if(!t)return;G.talk=null;
  const c=t.c,u=c.u,over=u.done;
  if(over&&/^Bought/.test(u.msg)){
    G.stats.mgr++;G.stats.mgrGross+=u.gross||0;
    claimCar(c);
    say3(`You closed ${u.name}${t.wasStuck?" (saved the deal)":""}.`,"#9f9");popup("+"+$f(u.gross||0),c.mesh.position,"#ffd24a",true);G.shake=.18;
    bobJudges(u);
    syncCars();startDelivery(c);
  }else if(over&&u.polite){
    if(u.hopeless){G.stats.released++;say3(`You sent ${u.name} home with a handshake. Time saved.`,"#9cf")}
    else{G.stats.lost++;say3(`You let ${u.name} go. That one was winnable.`,"#fd8")}
    finishLeave(c,true);
  }else if(over){
    if(tier(c)==="hopeless"){G.stats.wasted++;say3(`${u.name} walked. No loss.`,"#bbb")}else{G.stats.lost++;say3(`${u.name} walked on you.`,"#f88");Sfx.lose()}
    finishLeave(c,false);
  }else{
    c.state="stuck";c.pat=Math.max(8,(c.pat||c.patMax)*.6);if(c.sp)c.sp.armsUp=true;
    if(!c.to){c.to=W.sprite("T.O.!","#fff","#c01818",1.1,.32);c.to.position.y=2.65;c.mesh.add(c.to)}addBar(c);
  }
  if(G.t>=SHIFT_SECONDS){endShift();return}
  resume();
}
function resume(){hidePause();if(document.pointerLockElement!==canvas)lockMouse();last=performance.now()}
function pcClosed(){
  syncCars();boardUpdate(true);save();resume();
  if(G.whPend)setTimeout(recepRoast,600);
}
// ---------- Tiffany roasts you for dumping cars at wholesale ----------
function wholesaled(c,p){G.whPend=(G.whPend||0)+1;G.whToday=(G.whToday||0)+1;G.whLost=(G.whLost||0)+Math.max(0,(c.price||p)-p)}
function recepRoast(){
  const n=G.whPend,tot=G.whToday,lost=G.whLost||0,empty=!S.inv.length;G.whPend=0;if(!n)return;
  const L=empty?[`You wholesaled the ENTIRE lot. Miguel. What are the salesmen supposed to sell? Air? Frenchy is trying to sell the vending machine.`,
      `The lot is empty. Completely empty. Bob just drove by and asked if we got robbed. I said "kind of."`,
      `Congratulations, you're the first manager to turn a car dealership into a parking lot. ${$f(lost)} left on the table. I did the math. Out loud. To Bob.`]
    :tot>=3?[`That's ${tot} cars to the auction today. We're a dealership, Miguel, not a donation center.`,
      `${tot} wholesales? At this point just hand the auction guy your wallet and your car keys.`,
      `Another wholesale? Juanny asked me what "wholesale" means. I said "it's what Miguel does instead of his job."`,
      `You've thrown away about ${$f(lost)} in retail today. Sam could've sold those. Okay, maybe not Sam. But someone.`]
    :[`Did you just wholesale a car? Bob's gonna hear about this. From me.`,
      `Wholesale? Really? I could've sold that one, and I'm the receptionist.`,
      `Oh, we're wholesaling now? Cool, cool. I'll update my résumé.`];
  if(G.recep){G.recep.cool=0;G.recep.mesh.userData.mood="angry";setTimeout(()=>{if(G.recep)G.recep.mesh.userData.mood="neutral"},6000)}
  tutSay(pick(L));if(G.recep)G.recep.mesh.userData.wave=0;tiffAff(-1,true);   // no waving while she roasts you
}

// ---------- Mini Miguel ----------
// Twice a day Miguel can send a pint-sized version of himself to take a T.O. He closes about 60% of the time.
function sendMini(){
  if(G.phase!=="open"||G.talk||G.ended)return;
  if(!(G.minis>0))return say3("Mini Miguel is done for today.","#fd8");
  const taken=new Set(G.miniBots.map(b=>b.c));
  const c=G.cust.filter(c=>c.state==="stuck"&&!taken.has(c)).sort((a,b)=>a.pat-b.pat)[0];
  if(!c)return say3("No T.O. for Mini Miguel right now.","#bbb");
  G.minis--;if(Math.random()<.25)setTimeout(()=>say3("Mini Miguel stopped at Tiffany's desk on the way. She let him down gently. Again.","#ff9ad0"),1800);
  const m=W.person({shirt:0xa9b8d8,pants:0x2b2f3a,skinColor:0xd6a483,hair:0x2a1c14,hairStyle:"short",tie:0x24345e,badge:true,face:W.miguelFaceTex(),bigHead:1.6,height:.55});
  m.position.set(-6.5,0,-22.7);W.scene.add(m);
  const p=c.mesh.position;
  G.miniBots.push({mesh:m,c,path:[P(-6.5,-21.6),P(-6.5,-17.4),P(p.x+.45,-17.4),P(p.x+.45,p.z+.6)],speed:2.8,state:"go",t:0,ph:0});
  c.state="mini";if(c.to){c.mesh.remove(c.to);c.to=null}removeBar(c);
  say3(`Mini Miguel is on his way to ${c.u.name}!`,"#9cf");Sfx.click();
}
function stepMinis(dt){
  for(let i=G.miniBots.length-1;i>=0;i--){
    const b=G.miniBots[i],c=b.c,arrived=stepNpc(b,dt,b.state==="work");
    if(b.state==="go"&&arrived){b.state="work";b.t=3.5;b.mesh.rotation.y=Math.atan2(c.mesh.position.x-b.mesh.position.x,c.mesh.position.z-b.mesh.position.z)}
    else if(b.state==="work"){b.t-=dt;b.mesh.userData.talkLeft=b.t;c.mesh.userData.talkLeft=b.t%1.6>.8?1:0;
      if(b.t<=0){miniResolve(c);b.state="home";const q=b.mesh.position;b.path=[P(q.x,-17.4),P(-6.5,-17.4),P(-6.5,-22.7)]}}
    else if(b.state==="home"&&arrived){W.scene.remove(b.mesh);G.miniBots.splice(i,1)}
  }
}
function miniResolve(c){
  const car=carOf(c),u=c.u;
  if(!car||u.done){finishLeave(c,false);return}
  if(tier(c)!=="hopeless"&&Math.random()<.6){
    const price=Math.min(u.reserve,Math.round((u.offer+(u.reserve-u.offer)*.7)/50)*50);
    claimCar(c);finishSale(u,car,S.inv.indexOf(car),price,[]);
    G.stats.mgr++;G.stats.mgrGross+=price-car.cost;c.mesh.userData.mood="happy";
    say3(`Mini Miguel closed ${u.name} for ${$f(price)}!`,"#9f9");popup("Mini Miguel +"+$f(price-car.cost),c.mesh.position,"#ffd24a",true);Sfx.cash();syncCars();startDelivery(c);
  }else{c.mesh.userData.mood="angry";customerWalks(c,`${u.name} walked out on Mini Miguel.`,.5)}
}

// ---------- Bob, the owner ----------
// Once a shift he may pull up and walk the lot. Sell under cost in front of him: strike. Use the gun: he's proud.
function stepBob(dt){
  if(!G.owner){
    if(!G.ownerSeen&&G.t>35&&G.t<SHIFT_SECONDS-60&&Math.random()<dt/180){
      const m=W.person({build:"fat",top:"hawaii",shirt:0xd84a2a,shirt2:0xffe0a0,pants:0x34363c,skin:0,hair:0x9a9a9a,hat:"cap",hatColor:0xb01010,beard:true,height:1.08,glasses:"sun",chain:true,age:true});
      const tag=W.sprite("BOB (owner)","#fff","rgba(150,0,0,.75)");tag.position.y=2.25;m.add(tag);
      m.position.set(0,0,GATE_IN);W.scene.add(m);
      G.owner={mesh:m,path:[P(0,13),P(0,LANE_Z)],speed:1.3,ph:0,until:G.t+75};G.ownerSeen=true;
      say3("Bob just pulled up. Don't give anything away while he's watching.","#f99");
      if(!G.talk)speakLine(pick(["Miguel! Why is your face on my dumpster?","Miguel! Numbers! I want numbers!","Don't mind me. I'm just watching. Always watching."]),77,.62,.9,false,"en","am_onyx");
    }
    return;
  }
  const b=G.owner;
  if(stepNpc(b,dt,false)){
    if(G.t>b.until){if(b.leaving){W.scene.remove(b.mesh);G.owner=null;say3("Bob left. You can breathe.","#9cf");return}b.leaving=true;b.path=[P(b.mesh.position.x,LANE_Z),P(0,LANE_Z),P(0,24),P(0,GATE_OUT)];b.speed=1.6}
    else b.path=[P(rnd(-12,12),LANE_Z+rnd(-2,2))];
  }
}
function bobJudges(u){
  if(!G.owner||G.owner.leaving)return;
  if(u.gunned){S.cash+=500;say3("Bob saw the gun thing. He's... proud? He slipped you a $500 'bonus'.","#ffd24a");speakLine("That's my boy!",77,.62,.9,false,"en","am_onyx");return}
  if(u.front<0&&S.tiff&&S.tiff.aff>=13&&!G.covered){G.covered=true;say3("Bob saw you sell under cost... and Tiffany told him the computer glitched. No strike. You owe her.","#ff9ad0");return}
  if(u.front<0){S.strikes++;say3(`Bob saw you sell under cost. That's a strike (${S.strikes} of 2).`,"#f66");speakLine("Under cost? In front of me? Strike, Miguel.",77,.62,.9,false,"en","am_onyx");Sfx.lose()}
}
// Mr. Wiggle the tube man breaks loose now and then and lands on a customer.
function stepWiggle(){
  if(G.t<G.wiggleAt)return;
  G.wiggleAt=G.t+rnd(420,700);   // about once a shift, so it stays funny
  const c=pick(G.cust.filter(c=>c.mesh&&["browse","working","stuck"].includes(c.state)));if(!c)return;
  const pos=c.mesh.position;
  W.launchTube(pos.x,pos.z,()=>{
    c.mesh.userData.mood="shocked";c.armsUp=true;setTimeout(()=>{if(c.state!=="stuck")c.armsUp=false},2500);
    say3(`Mr. Wiggle broke loose and flattened ${c.u.name}.`,"#fd8");Sfx.click();
    if(Math.hypot(G.px-pos.x,G.pz-pos.z)<14)G.shake=.25;
  });
}
// ---------- tonight's reviews ----------
const STARS=n=>"★".repeat(n)+"☆".repeat(5-n);
function cannedReview(e){
  const t=e.out;
  if(/gunpoint/.test(t))return {stars:pick([1,5]),text:pick(["Manager pulled a gun on me. Paid full sticker. Honestly the most efficient car purchase of my life.","He said 'I have a gun' and I believed him. Car runs fine. I don't sleep anymore."])};
  if(e.cried)return {stars:4,text:"The manager cried. I cried. The tube man cried. We all cried. Decent car."};
  if(e.wife)return {stars:3,text:"My wife talked to the manager on the phone and now he's coming to Thanksgiving. I didn't invite him."};
  if(/bought/.test(t))return {stars:pick([4,5]),text:pick([`Got a ${e.car} from Miguel. His face is on the dumpster. Would get stared at again.`,`Miguel sold me a ${e.car}. It started on the first try. Shocked.`])};
  if(/politely/.test(t))return {stars:3,text:"Manager sent me home very politely. Weird. Posters everywhere. Three stars."};
  return {stars:1,text:pick(["One star. The tube man was nicer than the manager.","Walked out. The man's face is on every wall. I felt watched."])};
}
function showReviews(){
  const box=el("reviews");if(!box)return;
  let es=TALK_LOG.slice(-4);
  if(!es.length){const u=pick(S.cust.filter(u=>u.done)||[])||S.cust[0];if(u)es=[{name:u.name,tag:persona(u).tag,who:persona(u).who,car:"car",out:/^Bought/.test(u.msg)?"bought":"walked out",price:0,said:""}]}
  const draw=rs=>{if(!el("reviews"))return;el("reviews").innerHTML=es.map((e,i)=>{const r=rs[i]||cannedReview(e);return `<div class=rev><span class=st>${STARS(r.stars)}</span> <b>${esc(e.name)}</b> <span class=dim>(${esc(e.tag)})</span><br>${esc(r.text)}</div>`}).join("")||"<div class=dim>No reviews today.</div>"};
  if(window.AI&&AI.on())AI.reviews(es).then(draw,()=>draw([]));else draw([]);
}

// ---------- end of shift ----------
function endShift(){
  if(G.ended)return;G.ended=true;
  const st=G.stats,front=S.front-st.front0,back=S.back-st.back0,gross=S.profit-st.p0;
  G.cust.forEach(c=>{if(["working","stuck","browse","enter"].includes(c.state)){if(tier(c)==="hopeless")st.wasted++;else st.lost++}});
  W.setTime(1);
  const rows=G.sales.map(s=>`<tr><td>${esc(s.def.name)}</td><td>${s.deals}</td><td>${$f(s.gross)}</td></tr>`).join("");
  const deals=st.sp+st.mgr;
  showPause(`<h2>Close of business</h2>
   <p>Deals: <b>${deals}</b> (you ${st.mgr}, crew ${st.sp}${st.cave?`, ${st.cave} caved`:""}) · winnable deals lost: <b>${st.lost}</b></p>
   <p>Time-wasters sent home politely: <b>${st.released}</b> · drifted off on their own: ${st.wasted}</p>
   <table class=sum><tr><th>Crew</th><th>Deals</th><th>Net gross</th></tr>${rows}<tr><td>You</td><td>${st.mgr}</td><td>${$f(st.mgrGross)}</td></tr></table>
   <p>Front gross <b>${$f(front)}</b> · back-end <b>${$f(back)}</b> · commissions paid <b>${$f(st.comm)}</b></p>
   <p style="font-size:20px">Net gross today: <b class="${gross>=0?"good":"bad"}">${$f(gross)}</b></p>
   <h3>Tonight's online reviews</h3><div class=reviews id=reviews><div class=dim>Loading reviews…</div></div>
   <button class=go onclick="Game.finish()">Count the money ▸</button>`);
  if(gross>0)Sfx.cash();
  showReviews();
}
function finish(){
  const r=closeDay();
  if(r.end)return endGame(r);
  const bits=[`Wages ${$f(r.wages)}`,`lot and overhead ${$f(r.fees-r.wages)}`];
  if(r.rent)bits.push(`rent ${$f(r.rent)}`);
  let date="";if(G.datePending&&S.tiff&&!S.tiff.dated){G.datePending=false;S.tiff.dated=true;save();
    date=`<div class=card style="text-align:left;margin:10px 0;border-color:#ff7ab8"><b>💘 After closing…</b><p>The lot's dark. Tiffany fed the vending machine four quarters and it gave you both a bag of Funyuns and a warm Fresca. You split them on the showroom sofa while Mr. Wiggle flailed outside like he was cheering you on.</p><p>"This is the worst date I've ever been on," she says. "Same time tomorrow?"</p><p class=dim>Frenchy saw the whole thing through the window. He's devastated.</p></div>`}
  showPause(`<h2>Next morning</h2>${date}<p>Expenses: ${bits.join(" · ")}.</p>${r.review?`<p><b>${esc(r.review)}</b></p>`:""}
   <p>Bank <b>${$f(S.cash)}</b> of ${$f(GOAL)}</p><p class=dim>Today: ${esc(S.event.name)}. ${esc(S.event.desc)}</p>
   <button class=go onclick="Game.nextDay()">Start day ${S.day} ▸</button>`);
}
function nextDay(){enterPrep();resume()}
function endGame(r){
  const msg={win:["🏆 You made it","You got the bank past "+$f(GOAL)+". Bob is giving you a real office and a nicer chair. Maybe."],
    fired:["📉 Fired","Two weeks under quota. Bob took the keys and put his cousin in your chair."],
    broke:["💸 Bankrupt","You owe the bank more than Bob will ever forgive. Even the tube man got repossessed."]}[r.end];
  if(r.end==="win")Sfx.win();else Sfx.lose();
  showPause(`<h2>${msg[0]}</h2><p>${msg[1]}</p><p class=dim>${S.day-1} days · ${S.sold} cars sold</p><button class=go onclick="Game.start(true)">New game</button>`);
}

// ---------- HUD ----------
function boardUpdate(force){
  const rows=[];
  if(G.phase==="open"&&G.stats){
    G.sales.forEach(s=>rows.push(`${s.def.name.padEnd(8)} ${String(s.deals).padStart(2)} sold  ${$f(s.gross)}`));
    rows.push(`${"YOU".padEnd(8)} ${String(G.stats.mgr).padStart(2)} sold`);
  }else{
    G.sales.forEach(s=>rows.push(`${s.def.name.padEnd(8)} skill ${Math.round(s.def.skill*100)}  caves ${Math.round(s.def.cave*100)}%`));
  }
  const wk=weekOf(S.day),got=S.profit-S.weekStart;
  const foot=`Wk ${wk} quota ${$f(quota(wk))}  ·  you're at ${$f(got)}  ·  strikes ${S.strikes}/2`;
  const key=rows.join("|")+foot+S.day;
  if(!force&&key===G.boardKey)return;G.boardKey=key;
  W.setBoard(`DAY ${S.day}  ${S.event.name.toUpperCase()}`,rows.slice(0,6),foot);
}
function tip(){
  if(G.tut){const g=tutGoal();return g?`📋 ${g}   ·   K to skip the tutorial`:""}
  if(S.day>2)return G.phase==="prep"?`Today: ${S.event.name}. ${S.event.desc}`:"";
  if(G.phase==="prep"){
    return "Bob's trucks already stocked the lot. Walk to the OPEN switch by the front door and press E. The computer in your office handles prices, crew and upgrades.";
  }
  if(G.phase==="open"){
    if(G.cust.some(c=>c.state==="stuck"))return "A red T.O.! means a customer is about to walk. Run over and press E.";
    return "Your salespeople are working. Watch the minimap: a blinking red square means trouble.";
  }
  return "";
}
function hud(){
  G.cashShown+=(S.cash-G.cashShown)*.3;if(Math.abs(S.cash-G.cashShown)<2)G.cashShown=S.cash;
  const open=G.phase==="open";
  let clock="Prep · 8:30 AM";
  if(open){const min=OPEN_MIN+Math.min(1,G.t/SHIFT_SECONDS)*(CLOSE_MIN-OPEN_MIN),h=Math.floor(min/60),m=Math.floor(min%60);clock=`${h>12?h-12:h}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`}
  const gross=open&&G.stats?S.profit-G.stats.p0:0,wk=weekOf(S.day);
  el("hudTop").innerHTML=`<b>Day ${S.day}</b> · ${clock} · Bank <b>${$f(G.cashShown)}</b>${open?` · Gross today <b class="${gross>=0?"good":"bad"}">${$f(gross)}</b>`:""} · Wk ${wk} quota ${$f(Math.max(0,S.profit-S.weekStart))}/${$f(quota(wk))}${Sfx.muted?" · 🔇":""}`;
  const stuck=G.cust.filter(c=>c.state==="stuck");
  // small chips across the top: who needs a T.O., how long they'll wait, how far away
  el("alerts").innerHTML=G.talk?"":stuck.slice(0,3).map(c=>{const d=Math.round(Math.hypot(c.mesh.position.x-G.px,c.mesh.position.z-G.pz));return `<div class=al>🚨 T.O. ${c.sp?esc(c.sp.def.name)+" · ":""}${esc(c.u.name)} · ${Math.ceil(c.pat)}s · ${d}m</div>`}).join("")+G.sales.filter(s=>s.state==="flirt").map(s=>`<div class="al flirt">😍 ${esc(s.def.name)} is at reception</div>`).join("")
    +(G.lawyer&&G.lawyer.state==="wait"?`<div class=al>⚖️ ${esc(G.lawyer.name)}'s lawyer at your office · ${Math.ceil(G.lawyer.wait)}s</div>`:"")
    +(G.dale&&G.dale.state!=="leave"?`<div class="al mini">🥫 Dale is bugging customers</div>`:"")
    +(G.lotWalk?`<div class="al flirt">💁 Tiffany is walking the lot</div>`:"")
    +(G.offAsk?`<div class="al mini">🙋 ${esc(G.offAsk.name)} wants tomorrow off · <b>Y</b> approve · <b>N</b> deny</div>`:"")
    +(stuck.length>3?`<div class=al>+${stuck.length-3} more</div>`:"")
    +(stuck.length&&G.minis>0?`<div class="al mini">Q: send Mini Miguel (${G.minis} left)</div>`:"")
    +G.miniBots.map(b=>`<div class="al mini">🧒 Mini Miguel → ${esc(b.c.u.name)}</div>`).join("");
  el("feed").innerHTML=G.feed.filter(f=>G.anim-f.t<14).map(f=>`<div style="color:${f.col}">${esc(f.msg)}</div>`).join("");
  const n=nearest(),free=document.pointerLockElement!==canvas&&!overlayOpen()&&!G.mouseDown;
  el("prompt").textContent=n?n.label:free&&!G.talk?"Click to look around":"";
  const tp=tip();el("tip").textContent=tp;el("tip").style.display=tp?"block":"none";
  boardUpdate(false);
  // minimap
  const mc=el("mini"),g=mc.getContext("2d"),Wd=mc.width,X=x=>(x+30)/60*Wd,Z=z=>(z+30)/60*Wd;
  g.fillStyle="#222";g.fillRect(0,0,Wd,Wd);g.fillStyle="#555";g.fillRect(X(-10),Z(-27),X(10)-X(-10),Z(-14)-Z(-27));
  g.fillStyle="#6a6";for(const id in G.cars){const p=G.cars[id].mesh.position;g.fillRect(X(p.x)-2,Z(p.z)-4,4,8)}
  g.fillStyle="#ffd24a";[W.pc,W.sw].forEach(p=>{if(G.phase==="prep")g.fillRect(X(p.x)-3,Z(p.z)-3,6,6)});
  G.sales.forEach(s=>{g.fillStyle=s.state==="flirt"?"#ff7ab8":"#4af";g.fillRect(X(s.mesh.position.x)-2,Z(s.mesh.position.z)-2,5,5)});
  G.cust.forEach(c=>{if(!c.mesh||c.state==="gone")return;const hot=c.state==="stuck";g.fillStyle=hot?(Math.floor(G.anim*3)%2?"#f33":"#fff"):"#fd4";g.fillRect(X(c.mesh.position.x)-2,Z(c.mesh.position.z)-2,hot?7:4,hot?7:4)});
  g.save();g.translate(X(G.px),Z(G.pz));g.rotate(-G.yaw);g.fillStyle="#fff";g.beginPath();g.moveTo(0,-7);g.lineTo(4,5);g.lineTo(-4,5);g.fill();g.restore();
}

// ---------- loop ----------
function popup(text,pos,col,big){
  const s=W.sprite(text,col,"rgba(0,0,0,.45)",big?2.2:1.7,big?.55:.42);
  s.position.set(pos.x,2.2,pos.z);W.scene.add(s);G.pops.push({s,life:2.6});
}
function titleCard(big,small){
  const c=el("card");if(!c)return;
  c.innerHTML=`<div class=big>${esc(big)}</div><div class=small>${esc(small||"")}</div>`;
  c.classList.remove("show");void c.offsetWidth;c.classList.add("show");
  // the fade-out is a CSS animation, which reduced-motion settings skip, so always clear it on a timer
  clearTimeout(titleCard.t);titleCard.t=setTimeout(()=>{c.classList.remove("show");c.innerHTML=""},2400);
}
// camera effects, popups and the close-up during a negotiation
function fx(dt){
  G.shake=Math.max(0,G.shake-dt);G.flash=Math.max(0,G.flash-dt*1.6);
  G.box+=(0-G.box)*Math.min(1,dt*5);
  for(let i=G.pops.length-1;i>=0;i--){const p=G.pops[i];p.life-=dt;p.s.position.y+=dt*.7;p.s.material.opacity=Math.min(1,p.life/.8);if(p.life<=0){W.scene.remove(p.s);G.pops.splice(i,1)}}
  G.sales.forEach(s=>{if(s.tag)s.tag.visible=!G.talk});
  if(G.talk&&G.talk.c.mesh){
    const m=G.talk.c.mesh,cx=m.position.x,cz=m.position.z;
    if(T&&!T.over&&Math.hypot(G.px-cx,G.pz-cz)>5.5){say3(`You walked away from ${G.talk.c.u.name}.`,"#bbb");closeTalk();return}
    m.rotation.y=Math.atan2(G.px-cx,G.pz-cz);
    m.userData.talkLeft=(m.userData.talkLeft||0)-dt;m.userData.handsUp=(m.userData.handsUp||0)-dt;
    W.animatePerson(m,false,G.anim,m.userData.handsUp>0,m.userData.talkLeft>0);
  }
}
function draw(){
  const cam=W.cam;cam.rotation.order="YXZ";
  if(G.phase==="title"){
    const a=G.anim*.07;cam.position.set(Math.sin(a)*7,2.6+Math.sin(a*1.7)*.3,24+Math.cos(a)*1.5);cam.lookAt(Math.sin(a*.6)*3,1.4,-10);
    W.post.box=.07;
    if(G.miguel){G.miguel.visible=true;G.miguel.position.set(1.2,0,21);G.miguel.rotation.y=.12;W.animatePerson(G.miguel,false,G.anim,true,false)}
  }else{
    const sh=G.shake*.07,r=()=>(Math.random()-.5)*sh;
    const third=!!(G.third&&!G.talk);
    if(third)cam.position.set(G.px+Math.sin(G.yaw)*2.4+r(),2.25+r(),G.pz+Math.cos(G.yaw)*2.4+r());
    else cam.position.set(G.px+r(),1.68+Math.sin(G.bob)*.045*G.bobAmt+r(),G.pz+r());
    cam.rotation.set(third?G.pitch*.6-.2:G.pitch,G.yaw,third?0:Math.sin(G.bob*.5)*.006*G.bobAmt);
    if(G.miguel){G.miguel.visible=third;if(third){G.miguel.position.set(G.px,0,G.pz);G.miguel.rotation.y=G.yaw+Math.PI;W.animatePerson(G.miguel,G.bobAmt>.3,G.bob/8,false,false)}}
    W.post.box=G.box;
  }
  const want=G.phase==="title"?60:G.talk?62:(G.sprint&&G.bobAmt>.5?79:72);G.fov+=(want-G.fov)*.08;
  if(Math.abs(cam.fov-G.fov)>.01){cam.fov=G.fov;cam.updateProjectionMatrix()}
  // the gun: raise, hold, lower
  G.gunT=Math.max(0,(G.gunEnd||0)-performance.now())/1000;
  if(W.gun){const e=3.2-G.gunT,up=G.gunT<=0?0:Math.min(1,e*5,G.gunT/.4);W.gun.visible=up>0;W.gun.position.y=-.5+.3*up;W.gun.rotation.x=up*.05}
  W.post.flash=G.flash;
  W.render();
}
function loop(){
  requestAnimationFrame(loop);
  const now=performance.now();let dt=Math.min(.05,(now-last)/1000);last=now;
  if(G.phase==="title"){G.anim+=dt;W.update(dt,G.anim);draw();return}
  const paused=overlayOpen();
  if(!paused)step(dt);else{G.anim+=dt;W.update(dt,G.anim)}
  fx(dt);
  if(G.phase==="open"&&G.t-G.lastSky>.4){G.lastSky=G.t;W.setTime(Math.min(1,G.t/SHIFT_SECONDS))}
  G.acc+=dt;if(G.acc>.15){G.acc=0;hud()}
  draw();
}

// ---------- input ----------
addEventListener("keydown",e=>{
  if(!G.on)return;
  if(e.target&&e.target.tagName==="INPUT")return;
  if(T&&T.inWorld){
    if((e.code==="KeyV"||e.code==="Space")){e.preventDefault();if(!e.repeat)pttStart(e.timeStamp);return}
    if(e.code==="KeyT"){e.preventDefault();typeStart();return}
    if(e.code==="KeyH"&&SR){T.hands=!T.hands;if(T.hands)listen();renderTalk();return}
    if(e.code==="KeyG"&&!T.over){gunDeal();return}
    if(e.code==="KeyX"&&!T.over){cryDeal();return}
    const q={Digit1:"warranty",Digit2:"gap",Digit3:"accessories",Digit4:"financing",KeyF:"finalize"}[e.code];
    if(q&&!T.over){handleSay(q);return}
  }
  if(e.code==="KeyM"&&!T){Sfx.mute(!Sfx.muted);return}
  if(e.code==="Escape"){
    if(el("pc").style.display==="flex"){PC.close();return}
    if(!overlayOpen()&&(G.phase==="prep"||G.phase==="open"))showPause(`<h2>Paused</h2><button class=go onclick="Game.resume()">Resume</button> <button class=b onclick="Game.quit()">Quit to title</button>`);
    return;
  }
  if(overlayOpen())return;
  G.keys[e.code]=true;
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))e.preventDefault();
  if(e.code==="KeyC"&&!T){G.third=!G.third;return}
  if(e.code==="KeyQ"){sendMini();return}
  if(e.code==="KeyL"){sendTiffany();return}
  if(e.code==="KeyF"&&!e.repeat&&G.recep&&TF().unlocked&&Math.hypot(G.px-G.recep.mesh.position.x,G.pz-(G.recep.mesh.position.z-.9))<1.8){flirtStart(e.timeStamp);return}
  if((e.code==="KeyY"||e.code==="KeyN")&&G.offAsk){answerDayOff(e.code==="KeyY");return}
  if(e.code==="KeyK"&&G.tut){tutEnd();say3("Tutorial skipped. Tiffany's at her desk if you need her (E).","#9cf");return}
  if(e.code==="KeyE"){const n=nearest();if(n){Sfx.click();n.act()}}
});
addEventListener("keyup",e=>{G.keys[e.code]=false;if(e.code==="KeyF")flirtStop(e.timeStamp);if((e.code==="KeyV"||e.code==="Space")&&T&&T.inWorld)pttStop(e.timeStamp)});
addEventListener("mousemove",e=>{
  if(!G.on||overlayOpen())return;
  if(document.pointerLockElement===canvas||e.buttons){G.yaw-=e.movementX*.0022;G.pitch=Math.max(-1.3,Math.min(1.3,G.pitch-e.movementY*.0022))}
});
document.addEventListener("pointerlockchange",()=>{
  if(!G.on||overlayOpen())return;
  // losing the mouse mid-conversation (e.g. the browser's mic prompt) shouldn't pause the deal
  if(document.pointerLockElement!==canvas&&(G.phase==="prep"||G.phase==="open")&&!G.talk)showPause(`<h2>Paused</h2><button class=go onclick="Game.resume()">Resume</button> <button class=b onclick="Game.quit()">Quit to title</button>`);
});
document.addEventListener("pointerlockerror",()=>{G.drag=true});
// The mouse can get released (Esc, the browser's mic prompt, a popup). Clicking the game grabs it again;
// until then, holding a mouse button and dragging still turns the camera.
addEventListener("mousedown",e=>{G.mouseDown=true;if(e.target===canvas&&G.on&&(G.phase==="prep"||G.phase==="open")&&!overlayOpen()&&document.pointerLockElement!==canvas)lockMouse()});
addEventListener("mouseup",()=>{G.mouseDown=false});
document.addEventListener("pointerlockchange",()=>{if(document.pointerLockElement===canvas)G.drag=false});
addEventListener("resize",()=>{if(W)W.resize()});
function quit(){hidePause();save();Sfx.ambient(false);showTitle()}

// ---------- boot ----------
function boot(){
  canvas=el("gl");
  try{W=World.create(canvas)}catch(e){
    el("title").innerHTML=`<div class=titlebox><h1>Bargain Bob's Auto Mart</h1><p>This game needs WebGL, and your browser couldn't start it. Try Chrome, Edge or Firefox with hardware acceleration on.</p></div>`;
    el("title").style.display="flex";return false;
  }
  // Miguel himself: his photo for a face, and a head to match his ego
  G.miguel=W.person({shirt:0xa9b8d8,pants:0x2b2f3a,skinColor:0xd6a483,hair:0x2a1c14,hairStyle:"short",tie:0x24345e,badge:true,face:W.miguelFaceTex(),bigHead:1.35});
  W.scene.add(G.miguel);
  W.resize();G.on=true;last=performance.now();
  AI.init().then(()=>{if(G.phase==="title")showTitle()});
  // natural voices: start the one-time download now; keep the title screen's status line current
  if(window.Voices){Voices.onSlow=()=>say3("Natural voices are too slow on this computer, so the game switched to standard voices.","#fd8");
    if(Voices.on)Voices.load();setInterval(()=>{const v=el("vstat");if(v)v.textContent=Voices.status();const r=el("vretry");if(r)r.style.display=Voices.on&&(Voices.failed||Voices.slow)?"":"none"},700)}
  showTitle();loop();return true;
}

window.Game={boot,micTest,wholesaled,lawyer,flirtSend,start,resume,finish,nextDay,quit,toggleAI,saveKey,clearKey,toast,pcClosed,syncCars,state:G};
function cry(){G.shake=.4;if(G.talk&&G.talk.c.mesh)G.talk.c.mesh.userData.talkLeft=0}
function gun(){
  G.gunEnd=performance.now()+3200;G.shake=.25;Sfx.click();if(S.tiff)tiffAff(-1,true);
  if(G.talk&&G.talk.c.mesh)G.talk.c.mesh.userData.handsUp=4;
}
window.G3={gun,cry,makeCustomerMesh,ev:{startDale,startLawyer,startRain,sendTiffany,daleLeave,lawyerTalk,lawyer,answerDayOff,motive,offToday},speaking:(s,mood)=>{if(G.talk&&G.talk.c.mesh){const u=G.talk.c.mesh.userData;u.talkLeft=s;if(mood)u.mood=mood}},fx,popup,on:()=>G.phase==="open"&&!G.ended,elapse,waiting,talkClosed,step,sim,draw,hud,takeover,endShift,startShift,state:G,world:()=>W,tier,syncCars,enterPrep};
})();
