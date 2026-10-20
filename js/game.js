"use strict";
// First-person 3D lot. You are the manager: prep in your office, open the lot, then save the deals your salespeople can't close.
(function(){
const SHIFT_SECONDS=480, OPEN_MIN=540, CLOSE_MIN=1080, LANE_Z=0;
const G={phase:"title",on:false,t:0,anim:0,yaw:Math.PI,pitch:0,px:0,pz:-17,keys:{},vx:0,vz:0,bob:0,bobAmt:0,sprint:false,fov:72,shake:0,flash:0,box:0,pops:[],cashShown:0,cust:[],sales:[],cars:{},drives:[],stats:null,feed:[],talk:null,ended:false,acc:0,drag:false,lastSky:-1,boardKey:""};
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
    <div class=keys><b>WASD</b> move · <b>Shift</b> sprint · <b>Mouse</b> look (click and drag if it won't lock) · <b>←/→</b> turn · <b>E</b> use / take over · <b>C</b> see yourself · <b>M</b> mute · <b>Esc</b> pause</div>
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
const CREW_VOICES={Frenchy:[.75,.86],Andres:[1.45,1.25],Sam:[.95,1],Riccardo:[1,1.05],Mario:[1.2,1.12],Juanny:[1.3,1.3]};
// The posters get harder to ignore as the days go by.
function posterGag(){
  const d=S.day;
  if(d<=2)return pick(["You the manager?","Hey, you're the guy from all those posters!","Miguel, right? Your face is on every wall in there."]);
  if(d<=6)return pick(["Bro, there's like forty of you in there.","Why is your face on the dumpster, man?","I counted. You're on thirty-six posters. Thirty-six."]);
  return pick(["Is this a cult? Are you the leader? Blink if you need help.","My kid has nightmares about your posters now. Thanks.","Do you print those yourself? Be honest."]);
}
// How specific salespeople look, whatever desk they sit at.
const CREW_LOOKS={Frenchy:{height:1.09},Andres:{hairStyle:"bald",beard:false,glasses:false,height:.86},Sam:{hairStyle:"short",goatee:true,beard:false,glasses:false,height:.98}};
function spawnCrew(){
  G.sales.forEach(s=>W.scene.remove(s.mesh));G.sales=[];
  S.crew.forEach((d,i)=>{
    const home=P(W.desks[i],-18.6);
    const look=Object.assign({hairStyle:["short","cap","short","bald"][i%4],glasses:i===2,beard:i===3,height:[1,.97,1.04,.99][i%4]},CREW_LOOKS[d.name]);
    const m=W.person(Object.assign({shirt:d.shirt,pants:0x2a2a35,skin:d.skin,hair:0x2a1a10,cap:0x333333,tie:0x202020,badge:true},look));m.userData.tagged=true;
    m.position.set(home.x,0,home.z);m.rotation.y=Math.PI;
    const tag=W.sprite(d.name,"#fff","rgba(0,0,0,.55)");tag.position.y=2.15;m.add(tag);
    W.scene.add(m);
    G.sales.push({def:d,mesh:m,tag,path:[],speed:2.1,state:"idle",cust:null,home,ph:i,deals:0,gross:0});
  });
}
function clearCustomers(){G.cust.forEach(c=>{if(c.mesh)W.scene.remove(c.mesh)});G.cust=[]}
function setPlayerStart(){G.px=0;G.pz=-17;G.yaw=Math.PI;G.pitch=0}
function enterPrep(){
  clearCustomers();spawnCrew();syncCars();G.phase="prep";G.t=0;G.ended=false;G.talk=null;
  W.setTime(0);G.lastSky=0;W.setOpen(false);setPlayerStart();G.feed=[];
  S.phase="prep";boardUpdate(true);G.cashShown=S.cash;
  titleCard("DAY "+S.day,S.event.name);
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
  TALK_LOG.length=0;G.ownerSeen=false;(G.drives||[]).forEach(d=>W.scene.remove(d.m));G.drives=[];G.wiggleAt=rnd(50,90);if(G.owner){W.scene.remove(G.owner.mesh);G.owner=null}
  if(!S.inv.length)restock();
  openDay();
  G.phase="open";G.t=0;G.ended=false;
  G.stats={p0:S.profit,front0:S.front,back0:S.back,sp:0,spGross:0,mgr:0,mgrGross:0,lost:0,comm:0,cave:0,timeouts:0,released:0,wasted:0};
  G.sales.forEach(s=>{s.deals=0;s.gross=0});
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
    else{m.position.x+=dx/d*st;m.position.z+=dz/d*st;m.rotation.y=Math.atan2(dx,dz);moving=true}
  }
  W.animatePerson(n.mesh,moving,G.anim+(n.ph||0),n.armsUp,talk&&!moving);
  return !n.path.length;
}
const carOf=c=>S.inv.find(x=>x.id==c.u.car);
function makeCustomerMesh(){
  return W.person({shirt:pick([0x4a6a8a,0x6a4a4a,0x4a7a5a,0x8a8a4a,0x7a4a8a,0xaaaaaa,0x3a3a3a]),pants:pick([0x30343c,0x4a3a2a,0x20262e,0x44506a]),
    skin:ri(0,3),hair:pick([0x1a1a1a,0x5a3a1a,0xb0a080,0x777777]),hairStyle:pick(["short","short","long","cap","bald"]),cap:pick([0x2a4a7a,0x7a2a2a,0x2a5a3a]),wide:Math.random()<.25,beard:Math.random()<.2,glasses:Math.random()<.25,height:.93+Math.random()*.13});
}
function spawn(c){
  c.mesh=makeCustomerMesh();c.mesh.position.set(rnd(-1.5,1.5),0,GATE_IN);W.scene.add(c.mesh);
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
  say3(`${sp.def.name} needs a T.O. on the ${label(carOf(c))}!`,"#ff7070");Sfx.alert();G.flash=1;G.shake=.25;addRing(c);
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
function resolveWork(c){
  const sp=c.sp,u=c.u,d=sp.def,t=tier(c),car=carOf(c),r=Math.random();
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
  stepBob(dt);stepWiggle();stepDrives(dt);
  G.cust.forEach(c=>{
    if(!c.mesh||c.state==="gone"||c.state==="talk")return;
    const arrived=stepNpc(c,dt,["working","stuck","greet"].includes(c.state));
    if(c.to)c.to.position.y=2.65+Math.sin(G.anim*6)*.06;
    if(["browse","greet","todesk","working","stuck"].includes(c.state)){
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
        if(c.timer>40&&!c.sp)customerWalks(c,`${c.u.name} left. Nobody helped them.`,.5);
        break}
      case"greet":   // a quick hello at the car, then inside to the desk
        c.greet-=dt;if(c.greet<=0){c.state="todesk";c.speed=1.5;c.path=routeToDesk(c);c.sp.state="todesk";c.sp.speed=1.8;c.sp.path=routeSalesToDesk(c.sp)}break;
      case"todesk":
        if(arrived&&!c.sp.path.length){
          c.mesh.userData.sit=true;c.mesh.rotation.y=Math.PI;c.sp.mesh.userData.sit=true;c.sp.mesh.rotation.y=0;
          c.state="working";c.sp.state="work";c.work=rnd(10,16);
        }break;
      case"working":c.work-=dt;if(c.work<=0)resolveWork(c);break;
      case"delivery":
        if(arrived){driveOff(c);c.state="gone";W.scene.remove(c.mesh);
          const sp=c.sp;if(sp){sp.state="back";sp.cust=null;c.sp=null;const q=sp.mesh.position;sp.path=routeSalesHome(q.x,q.z,sp.home)}}
        break;
      case"stuck":{
        c.pat-=dt*(c.sp&&c.sp.def.quirk==="pushy"?1.4:1);
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
  const k=G.keys;G.sprint=!!(k.ShiftLeft||k.ShiftRight);const spd=G.sprint?5.4:3.1;
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
function step(dt){G.anim+=dt;if(!overlayOpen())movePlayer(dt);if(G.phase==="open")sim(dt);else if(G.phase==="prep")idleCrew(dt);W.update(dt,G.anim)}
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
function nearest(){
  if(G.phase==="prep"){
    if(Math.hypot(G.px-W.pc.x,G.pz-W.pc.z)<1.7)return{label:"[E] Use the computer: prices, crew, upgrades, books",act:()=>PC.open()};
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
  const frac=c.state==="stuck"?Math.max(.4,c.pat/c.patMax):1;
  c.state="talk";if(c.to){c.mesh.remove(c.to);c.to=null}removeBar(c);
  const sp=c.sp,u=c.u;
  let crew=null;
  if(sp){sp.armsUp=false;if(!sp.mesh.userData.sit)sp.mesh.position.x+=1.1;   // the salesperson steps aside (or stays seated), with a word
    const n=sp.def.name,v=CREW_VOICES[n]||[1,1];crew={name:n,text:pick(CREW_LINES[n]||["All yours, boss."])};
    speakLine(crew.text,n.length*13+sp.def.id,v[0],v[1],false,sp.def.quirk==="spanish"?"es":"en")}
  openTalk(u.id,{patFrac:frac,inWorld:true,crew,intro:sp&&sp.def.quirk==="spanish"?`${pick(["Your guy only speaks Spanish. I think he offered me a car? Or a sandwich?","Dude, I took French in school. I have no idea what that man said for twenty minutes.","He kept smiling and saying 'sí'. Did I already buy something?"])} I'm at ${$f(u.offer)}. ${posterGag()} I need something ${u.need}.`:sp?`${sp.def.name} has me at ${$f(car.price)}, and I'm at ${$f(u.offer)}. ${posterGag()} I need something ${u.need}. Can you do any better?`:`${Math.random()<.5?posterGag()+" ":""}I need something ${u.need}. What's your best price?`});
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
}

// ---------- Bob, the owner ----------
// Once a shift he may pull up and walk the lot. Sell under cost in front of him: strike. Use the gun: he's proud.
function stepBob(dt){
  if(!G.owner){
    if(!G.ownerSeen&&G.t>35&&G.t<SHIFT_SECONDS-60&&Math.random()<dt/70){
      const m=W.person({shirt:0xd84a2a,pants:0x34363c,skin:0,hair:0x9a9a9a,hairStyle:"cap",cap:0xb01010,beard:true,wide:true,height:1.08,glasses:true});
      const tag=W.sprite("BOB (owner)","#fff","rgba(150,0,0,.75)");tag.position.y=2.25;m.add(tag);
      m.position.set(0,0,GATE_IN);W.scene.add(m);
      G.owner={mesh:m,path:[P(0,13),P(0,LANE_Z)],speed:1.3,ph:0,until:G.t+75};G.ownerSeen=true;
      say3("Bob just pulled up. Don't give anything away while he's watching.","#f99");
      if(!G.talk)speakLine(pick(["Miguel! Why is your face on my dumpster?","Miguel! Numbers! I want numbers!","Don't mind me. I'm just watching. Always watching."]),77,.62,.9);
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
  if(u.gunned){S.cash+=500;say3("Bob saw the gun thing. He's... proud? He slipped you a $500 'bonus'.","#ffd24a");speakLine("That's my boy!",77,.62,.9);return}
  if(u.front<0){S.strikes++;say3(`Bob saw you sell under cost. That's a strike (${S.strikes} of 2).`,"#f66");speakLine("Under cost? In front of me? Strike, Miguel.",77,.62,.9);Sfx.lose()}
}
// Mr. Wiggle the tube man breaks loose now and then and lands on a customer.
function stepWiggle(){
  if(G.t<G.wiggleAt)return;
  G.wiggleAt=G.t+rnd(70,120);
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
  showPause(`<h2>Next morning</h2><p>Expenses: ${bits.join(" · ")}.</p>${r.review?`<p><b>${esc(r.review)}</b></p>`:""}
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
  el("alerts").innerHTML=stuck.map(c=>{const d=Math.round(Math.hypot(c.mesh.position.x-G.px,c.mesh.position.z-G.pz));return `<div class=al>T.O.! ${c.sp?esc(c.sp.def.name):""} · ${esc(c.u.name)} · ${esc(label(carOf(c)||{year:"",make:"",model:""}))} · ${Math.ceil(c.pat)}s · ${d}m</div>`}).join("");
  el("feed").innerHTML=G.feed.filter(f=>G.anim-f.t<14).map(f=>`<div style="color:${f.col}">${esc(f.msg)}</div>`).join("");
  const n=nearest();el("prompt").textContent=n?n.label:"";
  const tp=tip();el("tip").textContent=tp;el("tip").style.display=tp?"block":"none";
  boardUpdate(false);
  // minimap
  const mc=el("mini"),g=mc.getContext("2d"),Wd=mc.width,X=x=>(x+30)/60*Wd,Z=z=>(z+30)/60*Wd;
  g.fillStyle="#222";g.fillRect(0,0,Wd,Wd);g.fillStyle="#555";g.fillRect(X(-10),Z(-27),X(10)-X(-10),Z(-14)-Z(-27));
  g.fillStyle="#6a6";for(const id in G.cars){const p=G.cars[id].mesh.position;g.fillRect(X(p.x)-2,Z(p.z)-4,4,8)}
  g.fillStyle="#ffd24a";[W.pc,W.sw].forEach(p=>{if(G.phase==="prep")g.fillRect(X(p.x)-3,Z(p.z)-3,6,6)});
  G.sales.forEach(s=>{g.fillStyle="#4af";g.fillRect(X(s.mesh.position.x)-2,Z(s.mesh.position.z)-2,5,5)});
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
  if(e.code==="KeyE"){const n=nearest();if(n){Sfx.click();n.act()}}
});
addEventListener("keyup",e=>{G.keys[e.code]=false;if((e.code==="KeyV"||e.code==="Space")&&T&&T.inWorld)pttStop(e.timeStamp)});
addEventListener("mousemove",e=>{
  if(!G.on||overlayOpen())return;
  if(document.pointerLockElement===canvas||(G.drag&&e.buttons)){G.yaw-=e.movementX*.0022;G.pitch=Math.max(-1.3,Math.min(1.3,G.pitch-e.movementY*.0022))}
});
document.addEventListener("pointerlockchange",()=>{
  if(!G.on||overlayOpen())return;
  // losing the mouse mid-conversation (e.g. the browser's mic prompt) shouldn't pause the deal
  if(document.pointerLockElement!==canvas&&(G.phase==="prep"||G.phase==="open")&&!G.talk)showPause(`<h2>Paused</h2><button class=go onclick="Game.resume()">Resume</button> <button class=b onclick="Game.quit()">Quit to title</button>`);
});
document.addEventListener("pointerlockerror",()=>{G.drag=true});
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
  showTitle();loop();return true;
}

window.Game={boot,micTest,start,resume,finish,nextDay,quit,toggleAI,saveKey,clearKey,toast,pcClosed,syncCars,state:G};
function cry(){G.shake=.4;if(G.talk&&G.talk.c.mesh)G.talk.c.mesh.userData.talkLeft=0}
function gun(){
  G.gunEnd=performance.now()+3200;G.shake=.25;Sfx.click();
  if(G.talk&&G.talk.c.mesh)G.talk.c.mesh.userData.handsUp=4;
}
window.G3={gun,cry,speaking:(s,mood)=>{if(G.talk&&G.talk.c.mesh){const u=G.talk.c.mesh.userData;u.talkLeft=s;if(mood)u.mood=mood}},fx,popup,on:()=>G.phase==="open"&&!G.ended,elapse,waiting,talkClosed,step,sim,draw,hud,takeover,endShift,startShift,state:G,world:()=>W,tier,syncCars,enterPrep};
})();
