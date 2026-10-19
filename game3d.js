"use strict";
// First-person 3D shift. You are the manager; salespeople stall, you walk over and close.
// Uses globals from index.html: S, TYPES, label, marketValue, finishSale, openTalk, logMsg, $f, matchCustomers, closeDay, render, rnd, pick
(function(){
const SHIFT_SECONDS=270, OPEN_MIN=540, CLOSE_MIN=1080, LANE_Z=0, ROW_Z=8, STAND_Z=4.6, SLOT_DX=3.2;
const SALES=[
  {name:"Dale",shirt:0x8a7a3a,cave:.5,skill:.08},
  {name:"Tony",shirt:0x8a2a2a,cave:.2,skill:.25},
  {name:"Brenda",shirt:0x2f6d8a,cave:.3,skill:.18}
];
const SKIN=[0xf1c9a5,0xd9a273,0x9c6b43,0x6b4426];
const COL=[0x7a2020,0x20406a,0x555a52,0xb0b0a0,0x2f5a3a,0x6a5a20,0x3a2a4a,0x8a8a8a,0x1a1a1a,0xa04a20];
const G={on:false,t:0,locked:false,drag:false,yaw:Math.PI,pitch:0,keys:{},cust:[],sales:[],cars:{},stats:null,feed:[],talk:null,ended:false,acc:0,toast:0};
let R,scene,cam,canvas,colliders=[],flick=[],tube=[],balloons=[],bound={x0:-27,x1:27,z0:-26.5,z1:26};
const $$=id=>document.getElementById(id);
const M=(c,o)=>new THREE.MeshLambertMaterial(Object.assign({color:c,flatShading:true},o||{}));
const box=(w,h,d,mat,x,y,z,parent)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);(parent||scene).add(m);return m};
const solid=(x0,x1,z0,z1)=>colliders.push({x0,x1,z0,z1});

// ---------- textures ----------
function tex(w,h,draw,rep){
  const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c);if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}
  return t;
}
function asphalt(){return tex(512,512,(g,w,h)=>{
  g.fillStyle="#3a3a3c";g.fillRect(0,0,w,h);
  for(let i=0;i<5000;i++){const v=40+Math.random()*30|0;g.fillStyle=`rgb(${v},${v},${v+2})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}
  g.strokeStyle="#1e1e1f";g.lineWidth=2;
  for(let i=0;i<14;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<8;k++){x+=Math.random()*40-20;y+=Math.random()*40-10;g.lineTo(x,y)}g.stroke()}
  for(let i=0;i<6;i++){g.fillStyle="rgba(10,8,5,.35)";g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,18+Math.random()*20,10+Math.random()*12,0,0,7);g.fill()}
},[10,10])}
function floorTex(){return tex(128,128,(g,w,h)=>{g.fillStyle="#8d8a7a";g.fillRect(0,0,w,h);g.fillStyle="#7a7768";g.fillRect(0,0,w/2,h/2);g.fillRect(w/2,h/2,w/2,h/2);for(let i=0;i<300;i++){g.fillStyle="rgba(60,50,30,.12)";g.fillRect(Math.random()*w,Math.random()*h,3,3)}},[8,6])}
function fenceTex(){return tex(64,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle="rgba(170,170,175,.8)";g.lineWidth=2;for(let i=-64;i<128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i+64,0);g.lineTo(i,64);g.stroke()}},[40,3])}
function labelTex(text,fg,bg,w,h,font){return tex(w,h,(g)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font=font;g.textAlign="center";g.textBaseline="middle";g.fillText(text,w/2,h/2)})}
function sprite(text,fg,bg,sx,sy){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTex(text,fg,bg,256,64,"bold 34px sans-serif"),depthTest:false,transparent:true}));
  s.scale.set(sx||1.4,sy||.35,1);s.renderOrder=10;return s;
}

// ---------- world ----------
const COL_ORDER=[4,5,3,6,2,7,1,8,0,9]; // fill from the middle out
function slotPos(i){const row=i%2,col=COL_ORDER[Math.floor(i/2)%10];return {x:(col-4.5)*SLOT_DX,z:row?ROW_Z:-ROW_Z,row}}
function standZ(i){return slotPos(i).row?STAND_Z:-STAND_Z}
function buildWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x8f9aa5);scene.fog=new THREE.Fog(0x8f9aa5,25,80);
  scene.add(new THREE.HemisphereLight(0xdfe6ee,0x4a4a44,.95));
  const sun=new THREE.DirectionalLight(0xfff0d0,.55);sun.position.set(-20,40,10);scene.add(sun);
  // ground
  const gr=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshLambertMaterial({map:asphalt()}));
  gr.rotation.x=-Math.PI/2;scene.add(gr);
  // painted lines for slots
  const lm=new THREE.MeshBasicMaterial({color:0xcfcf9f});
  for(let r=0;r<2;r++)for(let c=0;c<=10;c++){const x=(c-5)*SLOT_DX;const z=r?ROW_Z:-ROW_Z;const m=new THREE.Mesh(new THREE.PlaneGeometry(.08,4.6),lm);m.rotation.x=-Math.PI/2;m.position.set(x,.02,z);scene.add(m)}
  // fence
  const fm=new THREE.MeshBasicMaterial({map:fenceTex(),transparent:true,side:THREE.DoubleSide,depthWrite:false});
  const post=M(0x666a70);
  [[0,27.5,56,0],[0,-27.5,56,0],[-28,0,55,1],[28,0,55,1]].forEach(([x,z,len,rot])=>{
    const f=new THREE.Mesh(new THREE.PlaneGeometry(len,2.4),fm);f.position.set(x,1.2,z);if(rot)f.rotation.y=Math.PI/2;scene.add(f);
    for(let k=0;k<=len;k+=7){const px=rot?x:x-len/2+k,pz=rot?z-len/2+k:z;box(.12,2.5,.12,post,px,1.25,pz)}
  });
  // gate gap is just a missing section visually: sign + pillars
  box(.4,3,.4,post,-3,1.5,27.5);box(.4,3,.4,post,3,1.5,27.5);
  buildShowroom();buildSign();buildProps();
}
function buildShowroom(){
  const wall=M(0x9a8f78),dark=M(0x6a6256),glass=new THREE.MeshLambertMaterial({color:0x9ccbe0,transparent:true,opacity:.35});
  const X0=-10,X1=10,Z0=-27,Z1=-14,H=3.2;
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(X1-X0,Z1-Z0),new THREE.MeshLambertMaterial({map:floorTex()}));fl.rotation.x=-Math.PI/2;fl.position.set(0,.03,(Z0+Z1)/2);scene.add(fl);
  box(X1-X0,.3,Z1-Z0,dark,0,H+.15,(Z0+Z1)/2);// roof
  box(X1-X0,H,.3,wall,0,H/2,Z0);box(.3,H,Z1-Z0,wall,X0,H/2,(Z0+Z1)/2);box(.3,H,Z1-Z0,wall,X1,H/2,(Z0+Z1)/2);
  // front wall with door gap and glass
  [[-5.8,8.4],[5.8,8.4]].forEach(([cx,w])=>{box(w,1,.3,wall,cx,.5,Z1);box(w,.7,.3,wall,cx,H-.35,Z1);box(w,1.5,.12,glass,cx,1.75,Z1)});
  box(3.2,.7,.3,wall,0,H-.35,Z1);
  solid(X0-.2,X0+.2,Z0,Z1);solid(X1-.2,X1+.2,Z0,Z1);solid(X0,X1,Z0-.2,Z0+.2);solid(X0,-1.6,Z1-.2,Z1+.2);solid(1.6,X1,Z1-.2,Z1+.2);
  // ceiling lights (one flickers)
  for(let i=0;i<4;i++){const l=box(2.4,.05,.6,new THREE.MeshBasicMaterial({color:0xffffe0}),-6+i*4,H-.02,-20.5);if(i==2)flick.push(l)}
  // sales desks
  const desk=M(0x7a5a3a);
  [-6,0,6].forEach((x,i)=>{
    box(2,.8,1,desk,x,.4,-20);box(.5,.4,.05,M(0x222222),x,1.0,-20.2);box(.5,.4,.5,M(0x333b4a),x,.25,-18.9);
    solid(x-1,x+1,-20.5,-19.5);
  });
  // manager office
  box(3.2,.85,1.2,M(0x5a4030),-7.5,.42,-25);box(.5,.4,.05,M(0x222222),-7.5,1.05,-25.3);solid(-9.1,-5.9,-25.6,-24.4);
  box(.9,.25,.03,M(0xffffff),-7.5,1.3,-24.4).material=new THREE.MeshBasicMaterial({map:labelTex("MANAGER","#222","#e8e0c0",128,32,"bold 18px sans-serif")});
  box(.5,1.1,.5,M(0x88aacc),8,.55,-25);solid(7.7,8.3,-25.3,-24.7);// water cooler
  const poster=box(2.2,1.2,.05,new THREE.MeshBasicMaterial({map:labelTex("WE FINANCE EVERYBODY!!","#ffdd00","#b01010",512,128,"bold 44px sans-serif")}),3,1.9,Z0+.2);
}
function buildSign(){
  box(.3,7,.3,M(0x555555),-8,3.5,22);
  const mat=new THREE.MeshBasicMaterial({map:tex(512,256,(g,w,h)=>{
    g.fillStyle="#1a1a6a";g.fillRect(0,0,w,h);g.strokeStyle="#ffcc00";g.lineWidth=8;g.strokeRect(8,8,w-16,h-16);
    g.fillStyle="#ffcc00";g.font="bold 54px sans-serif";g.textAlign="center";g.fillText("BARGAIN BOB'S",w/2,90);
    g.fillStyle="#ff4040";g.font="bold 46px sans-serif";g.fillText("AUTO MART",w/2,150);
    g.fillStyle="#ffffff";g.font="bold 28px sans-serif";g.fillText("NO CREDIT? NO PROBLEM!",w/2,212);
  })});
  const s=box(5,2.5,.25,mat,-8,7.6,22);flick.push(s);
}
function buildProps(){
  // bunting
  const cols=[0xff3030,0xffdd30,0x30a0ff,0x30d060,0xffffff];
  for(let k=0;k<30;k++){
    const t=k/29,x=-26+t*52,y=4.6-Math.sin(t*Math.PI)*.9*-1-1.2;
    const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([-.25,0,0,.25,0,0,0,-.5,0],3));g.computeVertexNormals();
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:cols[k%5],side:THREE.DoubleSide}));
    m.position.set(x,4+Math.sin(t*Math.PI)*-.8,0.2);scene.add(m);
  }
  box(.15,4.2,.15,M(0x555555),-26,2.1,0);box(.15,4.2,.15,M(0x555555),26,2.1,0);
  // tube man
  const tm=new THREE.Group();tm.position.set(14,0,16);scene.add(tm);let parent=tm;
  for(let i=0;i<6;i++){const seg=new THREE.Group();seg.position.y=i?.9:0;parent.add(seg);const cy=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,.9,8),M(i%2?0xff2020:0xffee20));cy.position.y=.45;seg.add(cy);tube.push(seg);parent=seg}
  // balloons
  for(let i=0;i<10;i++){
    const bx=-24+i*5,bz=i%2?-3.5:3.5,col=cols[i%5];
    const b=new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),new THREE.MeshLambertMaterial({color:col}));b.position.set(bx,3.2,bz);scene.add(b);b.userData.b=[bx,3.2,bz,i];balloons.push(b);
    const ln=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,3.2,3),new THREE.MeshBasicMaterial({color:0xdddddd}));ln.position.set(bx,1.6,bz);scene.add(ln);
  }
  // junk: tire piles, dumpster
  for(let i=0;i<8;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.35,.14,6,10),M(0x161616));t.rotation.x=Math.PI/2;t.position.set(22+(i%3)*.5,.15+Math.floor(i/3)*.28,-20+(i%2)*.3);scene.add(t)}
  box(2.6,1.4,1.4,M(0x2f5a3a),-22,.7,-20);solid(-23.4,-20.6,-20.8,-19.2);
  box(1.4,.2,.8,M(0x888888),-18,.1,-10);
}

// ---------- characters ----------
function person(shirt,pants,skin,hair,tie){
  const g=new THREE.Group(),u={};
  const leg=(x)=>{const p=new THREE.Group();p.position.set(x,.85,0);const m=new THREE.Mesh(new THREE.BoxGeometry(.2,.85,.22),M(pants));m.position.y=-.42;p.add(m);g.add(p);return p};
  u.legL=leg(-.12);u.legR=leg(.12);
  box(.55,.7,.28,M(shirt),0,1.2,0,g);
  const arm=(x)=>{const p=new THREE.Group();p.position.set(x,1.5,0);const m=new THREE.Mesh(new THREE.BoxGeometry(.14,.65,.16),M(shirt));m.position.y=-.3;p.add(m);const h=new THREE.Mesh(new THREE.BoxGeometry(.13,.13,.13),M(skin));h.position.y=-.66;p.add(h);g.add(p);return p};
  u.armL=arm(-.36);u.armR=arm(.36);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.16,8,6),M(skin));head.position.y=1.72;g.add(head);
  const hr=new THREE.Mesh(new THREE.SphereGeometry(.17,8,6,0,Math.PI*2,0,Math.PI/2),M(hair));hr.position.y=1.74;g.add(hr);
  if(tie)box(.08,.4,.03,M(tie),0,1.25,.15,g);
  g.userData=u;scene.add(g);return g;
}
function animatePerson(g,moving,t,armsUp){
  const u=g.userData,s=moving?Math.sin(t*9)*.7:0;
  u.legL.rotation.x=s;u.legR.rotation.x=-s;
  u.armL.rotation.x=armsUp?-2.6+Math.sin(t*10)*.3:-s*.7;u.armR.rotation.x=armsUp?-2.6+Math.sin(t*10+1)*.3:s*.7;
  if(!moving&&!armsUp){u.armL.rotation.x=Math.sin(t*1.5)*.05;u.armR.rotation.x=-Math.sin(t*1.5)*.05}
}
function stepNpc(n,dt){
  let moving=false;
  if(n.path.length){
    const p=n.path[0],m=n.mesh,dx=p.x-m.position.x,dz=p.z-m.position.z,d=Math.hypot(dx,dz),st=n.speed*dt;
    if(d<=st){m.position.x=p.x;m.position.z=p.z;n.path.shift()}
    else{m.position.x+=dx/d*st;m.position.z+=dz/d*st;m.rotation.y=Math.atan2(dx,dz);moving=true}
  }
  animatePerson(n.mesh,moving,G.t+(n.ph||0),n.armsUp);
  return !n.path.length;
}

// ---------- cars ----------
function carColor(c){return COL[(c.id*7+c.year)%COL.length]}
function buildCar(c){
  const g=new THREE.Group(),col=carColor(c),body=M(col),dark=M(0x1b2530),tire=M(0x111111);
  const D={sedan:[1.8,.7,4.4],coupe:[1.8,.62,4.2],suv:[1.9,.95,4.4],truck:[1.9,.85,5.0]}[c.body];
  const [w,h,l]=D;
  box(w,h*.7,l,body,0,.35+h*.35,0,g);
  const cab=c.body=="truck"?[1.7,.7,1.6,0,.35+h*.7+.35,.9]:c.body=="suv"?[1.75,.75,3,0,.35+h*.7+.37,-.2]:[1.65,.6,c.body=="coupe"?1.9:2.3,0,.35+h*.7+.3,-.2];
  box(cab[0],cab[1],cab[2],body,cab[3],cab[4],cab[5],g);
  box(cab[0]+.04,cab[1]*.6,cab[2]*.8,dark,cab[3],cab[4]+.03,cab[5],g);
  if(c.body=="truck"){box(w,.35,1.8,body,0,.35+h*.7+.17,-1.5,g)}
  [[-1,1],[1,1],[-1,-1],[1,-1]].forEach(([sx,sz])=>{const wh=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.25,10),tire);wh.rotation.z=Math.PI/2;wh.position.set(sx*(w/2),.34,sz*(l/2-.8));g.add(wh)});
  box(w-.2,.12,.1,M(0x444444),0,.4,l/2+.02,g);box(w-.2,.12,.1,M(0x444444),0,.4,-l/2-.02,g);
  if(c.cond<65){const rn=Math.round((70-c.cond)/12);for(let i=0;i<rn;i++){box(.5+Math.random()*.4,.25,.05,M(0x8a4a1a),(Math.random()-.5)*(w-.3)*0+ (i%2?w/2+.01:-w/2-.01),.45+Math.random()*.3,(Math.random()-.5)*l*.7,g).scale.x=.1}
    box(.7,.05,.9,M(0x7a3a14),.3,.35+h*.7+.02,l/4,g)}
  if(c.cond<40)box(.3,.3,.3,M(0x222222),w/2-.1,.35,l/2,g);
  const tag=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.4),new THREE.MeshBasicMaterial({map:labelTex("$"+Math.round(c.price).toLocaleString(),"#111","#ffee33",256,96,"bold 54px sans-serif")}));
  tag.position.set(0,1.28,l/2-1.0);tag.rotation.x=-.5;g.add(tag);
  g.userData.tag=tag;g.userData.price=c.price;
  return g;
}
function syncCars(){
  const ids={};S.inv.forEach(c=>ids[c.id]=1);
  for(const id in G.cars)if(!ids[id]){scene.remove(G.cars[id].mesh);delete G.cars[id]}
  const used=new Set(Object.values(G.cars).map(o=>o.slot));
  S.inv.forEach(c=>{
    if(G.cars[c.id])return;
    let s=0;while(used.has(s))s++;used.add(s);
    const m=buildCar(c),p=slotPos(s);m.position.set(p.x,0,p.z);m.rotation.y=p.row?Math.PI:0;scene.add(m);
    G.cars[c.id]={mesh:m,slot:s};
  });
}
function carSlot(c){return G.cars[c]?G.cars[c].slot:-1}

// ---------- routes ----------
const P=(x,z)=>({x,z});
function standX(slot,side){return slotPos(slot).x+side*.65}
function routeIn(slot,side){const x=standX(slot,side);return [P(0,24),P(0,12),P(0,LANE_Z),P(x,LANE_Z),P(x,standZ(slot))]}
function routeOut(x,z){const pts=[];if(Math.abs(z)>2)pts.push(P(x,LANE_Z));pts.push(P(0,LANE_Z),P(0,12),P(0,28));return pts}
function routeSalesOut(slot,side){const x=standX(slot,side);return [P(0,-13.5),P(0,-11),P(0,LANE_Z),P(x,LANE_Z),P(x,standZ(slot))]}
function routeSalesHome(x,z,home){const pts=[];if(Math.abs(z)>2)pts.push(P(x,LANE_Z));pts.push(P(0,LANE_Z),P(0,-11),P(0,-13.5),P(home.x,-16),P(home.x,home.z));return pts}

// ---------- shift setup ----------
function start(){
  if(!window.THREE)return false;
  canvas=$$("gl");
  try{R=new THREE.WebGLRenderer({canvas,antialias:true});}catch(e){return false}
  R.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  colliders=[];flick=[];tube=[];balloons=[];G.cars={};G.cust=[];G.sales=[];G.feed=[];
  buildWorld();
  cam=new THREE.PerspectiveCamera(72,1,.05,120);
  G.px=0;G.pz=-17;G.yaw=Math.PI;G.pitch=0;G.t=0;G.ended=false;G.talk=null;G.acc=0;
  G.stats={p0:S.profit,front0:S.front,back0:S.back,sp:0,spGross:0,mgr:0,mgrGross:0,lost:0,comm:0,cave:0,timeouts:0};
  SALES.forEach((d,i)=>{
    const home=P(-6+i*6,-18.6),m=person(d.shirt,0x2a2a35,SKIN[i%4],0x2a1a10,0x202020);m.position.set(home.x,0,home.z);m.rotation.y=0;
    const tag=sprite(d.name,"#fff","rgba(0,0,0,.55)");tag.position.y=2.15;m.add(tag);
    G.sales.push({def:d,mesh:m,path:[],speed:2.1,state:"idle",cust:null,home,ph:i});
  });
  // customers arrive spread over ~80% of the shift
  const n=S.cust.length;
  S.cust.forEach((u,i)=>{G.cust.push({u,mesh:null,path:[],speed:1.5,state:"wait",arrive:(i+.3)*(SHIFT_SECONDS*.8/n)+Math.random()*6,pat:0,patMax:45,sp:null,ph:Math.random()*6})});
  syncCars();
  G.on=true;resize();
  document.body.classList.add("in3d");
  $$("pause").style.display="flex";$$("pausetxt").innerHTML=intro();
  G.last=performance.now();loop();
  return true;
}
function intro(){return `<h2>Shift starts</h2><p>You're the <b>manager</b>. Your salespeople are ${SALES.map(s=>s.name).join(", ")}. They cave on price or stall.</p>
<p>When a pair shows <b style="color:#ff5050">T.O.!</b>, run over and press <b>E</b> to take over the deal, then talk (mic) or type.</p>
<p class=dim>WASD move · Shift sprint · mouse look · E take over · Esc pause</p><button class=go onclick="G3.resume()">Click to start</button>`}

// ---------- simulation ----------
function say3(msg,col){G.feed.unshift({t:G.t,msg,col:col||"#fff"});G.feed=G.feed.slice(0,6)}
function nearestIdleSales(c){return G.sales.find(s=>s.state=="idle")}
function carOf(c){return S.inv.find(x=>x.id==c.u.car)}
function spawn(c){
  c.mesh=person(pick([0x4a6a8a,0x6a4a4a,0x4a7a5a,0x8a8a4a,0x7a4a8a,0xaaaaaa]),pick([0x30343c,0x4a3a2a,0x20262e]),pick(SKIN),pick([0x1a1a1a,0x5a3a1a,0xb0a080]),0);
  const tm=c.mesh;tm.position.set(0,0,26);
  const slot=c.u.car?carSlot(c.u.car):-1;
  c.slot=slot;c.side=-1;
  if(slot>=0&&!c.u.done){c.path=routeIn(slot,-1);c.state="enter"}
  else{c.path=[P(0,24),P(0,9),P(0,9),P(0,28)];c.state="pass"}
}
function finishLeave(c,happy){
  c.state="leave";c.path=routeOut(c.mesh.position.x,c.mesh.position.z);c.speed=happy?1.6:2.2;
  if(c.to){c.mesh.remove(c.to);c.to=null}
  if(c.sp){const s=c.sp;s.state="back";s.armsUp=false;s.path=routeSalesHome(s.mesh.position.x,s.mesh.position.z,s.home);s.cust=null;c.sp=null}
}
function commission(sp,front){
  const com=Math.max(50,Math.round(front*.25/10)*10);
  S.cash-=com;S.profit-=com;S.front-=com;G.stats.comm+=com;return com;
}
function spSale(c,price,why){
  const car=carOf(c);if(!car){return finishLeave(c,false)}
  const i=S.inv.indexOf(car),front=price-car.cost,sp=c.sp;
  finishSale(c.u,car,i,price,[]);
  const com=commission(sp,front);
  G.stats.sp++;G.stats.spGross+=front-com;if(why=="cave")G.stats.cave++;
  say3(`${sp.def.name} ${why=="cave"?"caved and sold":"sold"} the ${label(car)} for ${$f(price)} — ${front<0?"lost ":""}${$f(Math.abs(front))} gross`,front>=300?"#9f9":front>=0?"#fd8":"#f88");
  syncCars();finishLeave(c,true);
}
function resolveWork(c){
  const sp=c.sp,u=c.u,d=sp.def,r=Math.random();
  if(r<d.cave){spSale(c,Math.max(100,u.offer),"cave");return}
  if(r<d.cave+d.skill){spSale(c,Math.round((u.offer+(u.reserve-u.offer)*.6)/50)*50,"skill");return}
  if(Math.random()<.85){
    c.state="stuck";c.pat=c.patMax;sp.armsUp=true;sp.state="stuck";
    c.to=sprite("T.O.!","#fff","#c01818",1.1,.32);c.to.position.y=2.6;c.mesh.add(c.to);
    say3(`${sp.def.name} needs a T.O. on the ${label(carOf(c))}!`,"#ff7070");
  }else{
    say3(`${sp.def.name} blew it. ${u.name} walked.`,"#f88");G.stats.lost++;S.rep=Math.max(0,S.rep-.5);u.done=true;u.msg="Walked away.";finishLeave(c,false);
  }
}
function step(dt){
  if(!G.on||G.ended)return;
  G.t+=dt;
  // player
  const sp=(G.keys.ShiftLeft||G.keys.ShiftRight)?5.2:3.0;
  let fx=0,fz=0;
  if(G.keys.KeyW||G.keys.ArrowUp){fx-=Math.sin(G.yaw);fz-=Math.cos(G.yaw)}
  if(G.keys.KeyS||G.keys.ArrowDown){fx+=Math.sin(G.yaw);fz+=Math.cos(G.yaw)}
  if(G.keys.KeyA||G.keys.ArrowLeft){fx-=Math.cos(G.yaw);fz+=Math.sin(G.yaw)}
  if(G.keys.KeyD||G.keys.ArrowRight){fx+=Math.cos(G.yaw);fz-=Math.sin(G.yaw)}
  const fl=Math.hypot(fx,fz);if(fl>0){move(fx/fl*sp*dt,fz/fl*sp*dt)}
  // ambience
  flick.forEach((m,i)=>{const v=Math.random()<.04?.2:1;if(m.material.color)m.material.color.setScalar(v*(i?1:1))});
  tube.forEach((s,i)=>{s.rotation.z=Math.sin(G.t*3+i*.7)*.28;s.rotation.x=Math.cos(G.t*2.3+i)*.2});
  balloons.forEach(b=>{const u=b.userData.b;b.position.y=u[1]+Math.sin(G.t*1.5+u[3])*.15;b.position.x=u[0]+Math.sin(G.t*.9+u[3])*.2});
  // spawn
  G.cust.forEach(c=>{if(c.state=="wait"&&G.t>=c.arrive)spawn(c)});
  // customers
  G.cust.forEach(c=>{
    if(!c.mesh||c.state=="gone"||c.state=="talk")return;
    const arrived=stepNpc(c,dt);
    if(c.to){c.to.position.y=2.6+Math.sin(G.t*6)*.06}
    if(["browse","working","stuck"].includes(c.state)){
      const car=carOf(c);
      if(!car||c.u.done){ // car sold to someone else
        say3(`${c.u.name} left — the car's gone.`,"#bbb");finishLeave(c,false);return;
      }
    }
    switch(c.state){
      case"enter":if(arrived){c.state="browse";c.timer=0;c.mesh.rotation.y=slotPos(c.slot).row?0:Math.PI}break;
      case"pass":if(arrived){c.state="gone";scene.remove(c.mesh)}break;
      case"browse":{
        c.timer+=dt;
        const s=nearestIdleSales(c);
        if(s&&!c.sp){c.sp=s;s.cust=c;s.state="go";s.speed=2.4;s.path=routeSalesOut(c.slot,1)}
        if(c.sp&&c.sp.state=="go"&&!c.sp.path.length){c.state="working";c.sp.state="work";c.work=rnd(12,20);}
        if(c.timer>25&&!c.sp){say3(`${c.u.name} left — nobody helped them.`,"#f88");G.stats.lost++;c.u.done=true;c.u.msg="Walked away.";finishLeave(c,false)}
        break}
      case"working":
        c.work-=dt;
        if(c.work<=0)resolveWork(c);
        break;
      case"stuck":
        c.pat-=dt;
        if(c.pat<=0){
          G.stats.timeouts++;
          if(Math.random()<.5)spSale(c,Math.max(100,c.u.offer),"cave");
          else{say3(`${c.u.name} got tired of waiting and left.`,"#f88");G.stats.lost++;S.rep=Math.max(0,S.rep-1);c.u.done=true;c.u.msg="Walked away.";finishLeave(c,false)}
        }
        break;
      case"leave":if(arrived){c.state="gone";scene.remove(c.mesh)}break;
    }
  });
  // salespeople
  G.sales.forEach(s=>{
    const arrived=stepNpc(s,dt);
    if(s.state=="back"&&arrived){s.state="idle";s.mesh.rotation.y=0}
    if(s.state=="work"||s.state=="stuck"){/* face customer */const c=s.cust;if(c&&c.mesh){s.mesh.rotation.y=Math.atan2(c.mesh.position.x-s.mesh.position.x,c.mesh.position.z-s.mesh.position.z)}}
    if(s.state=="work")s.armsUp=false;
  });
  if(G.t>=SHIFT_SECONDS)endShift();
}
function move(dx,dz){
  const r=.35;
  for(const ax of [0,1]){
    let nx=G.px+(ax==0?dx:0),nz=G.pz+(ax==1?dz:0);
    nx=Math.max(bound.x0,Math.min(bound.x1,nx));nz=Math.max(bound.z0,Math.min(bound.z1,nz));
    let hit=false;
    for(const b of colliders)if(nx>b.x0-r&&nx<b.x1+r&&nz>b.z0-r&&nz<b.z1+r){hit=true;break}
    if(!hit)for(const id in G.cars){const p=G.cars[id].mesh.position;if(Math.abs(nx-p.x)<.95+r&&Math.abs(nz-p.z)<2.3+r){hit=true;break}}
    if(!hit){G.px=nx;G.pz=nz}
  }
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
function takeover(c){
  const car=carOf(c);if(!car||G.talk)return;
  G.talk={c,prev:c.state,wasStuck:c.state=="stuck"};
  const frac=c.state=="stuck"?Math.max(.4,c.pat/c.patMax):1;
  c.state="talk";if(c.to)c.mesh.remove(c.to),c.to=null;
  if(document.pointerLockElement)document.exitPointerLock();
  const sp=c.sp;
  openTalk(c.u.id,{patFrac:frac,intro:`${sp?sp.def.name+" has me at "+$f(car.price)+", and I'm at "+$f(c.u.offer)+". You the manager? Can you do any better?":"What's your best price?"}`});
}
// called by index.html closeTalk()
function talkClosed(){
  const t=G.talk;if(!t)return;G.talk=null;
  const c=t.c,u=c.u,over=u.done;
  if(over&&/^Bought/.test(u.msg)){
    G.stats.mgr++;
    say3(`You closed ${u.name}${t.wasStuck?" (saved the deal)":""}.`,"#9f9");
    syncCars();finishLeave(c,true);
  }else if(over){G.stats.lost++;say3(`${u.name} walked on you.`,"#f88");finishLeave(c,false)}
  else{c.state="stuck";c.pat=Math.max(8,(c.pat||c.patMax)*.6);if(c.sp){c.sp.armsUp=true}
    if(!c.to){c.to=sprite("T.O.!","#fff","#c01818",1.1,.32);c.to.position.y=2.6;c.mesh.add(c.to)}}
  $$("pause").style.display="flex";$$("pausetxt").innerHTML=`<h2>Paused</h2><p>Back on the lot.</p><button class=go onclick="G3.resume()">Resume</button>`;
}
function resume(){
  $$("pause").style.display="none";
  if(canvas.requestPointerLock){try{canvas.requestPointerLock()}catch(e){}}
  G.last=performance.now();
}

// ---------- end of shift ----------
function endShift(){
  if(G.ended)return;G.ended=true;
  if(document.pointerLockElement)document.exitPointerLock();
  const st=G.stats,front=S.front-st.front0,back=S.back-st.back0,gross=S.profit-st.p0;
  G.cust.forEach(c=>{if(["working","stuck","browse","enter","talk"].includes(c.state))st.lost++});
  const deals=st.sp+st.mgr;
  $$("pause").style.display="flex";
  $$("pausetxt").innerHTML=`<h2>Close of business</h2>
   <p>Deals: <b>${deals}</b> (you ${st.mgr}, salespeople ${st.sp}${st.cave?`, ${st.cave} caved`:""}) · lost: <b>${st.lost}</b></p>
   <p>Front gross <b>${$f(front)}</b> · back-end <b>${$f(back)}</b> · commissions paid <b>${$f(st.comm)}</b></p>
   <p style="font-size:20px">Net gross today: <b class="${gross>=0?"good":"bad"}">${$f(gross)}</b></p>
   <button class=go onclick="G3.finish()">Count the money ▸</button>`;
}
function finish(){
  G.on=false;G.ended=true;
  document.body.classList.remove("in3d");$$("pause").style.display="none";
  try{R.dispose()}catch(e){}
  closeDay();
}

// ---------- loop / draw / hud ----------
function resize(){if(!R)return;const w=innerWidth,h=innerHeight;R.setSize(w,h,false);canvas.style.width=w+"px";canvas.style.height=h+"px";cam.aspect=w/h;cam.updateProjectionMatrix()}
function draw(){
  cam.position.set(G.px,1.7,G.pz);cam.rotation.order="YXZ";cam.rotation.y=G.yaw;cam.rotation.x=G.pitch;
  R.render(scene,cam);
}
function hud(){
  const min=OPEN_MIN+Math.min(1,G.t/SHIFT_SECONDS)*(CLOSE_MIN-OPEN_MIN),h=Math.floor(min/60),m=Math.floor(min%60);
  const st=G.stats,gross=S.profit-st.p0;
  $$("hudTop").innerHTML=`<b>${(h>12?h-12:h)}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}</b> · Gross today <b class="${gross>=0?"good":"bad"}">${$f(gross)}</b> · Deals ${st.sp+st.mgr} · Cash ${$f(S.cash)}`;
  const stuck=G.cust.filter(c=>c.state=="stuck");
  $$("alerts").innerHTML=stuck.map(c=>{const d=Math.round(Math.hypot(c.mesh.position.x-G.px,c.mesh.position.z-G.pz));return `<div class=al>T.O.! ${c.sp?c.sp.def.name:""} · ${c.u.name} · ${label(carOf(c)||{year:"",make:"",model:""})} · ${Math.ceil(c.pat)}s · ${d}m</div>`}).join("");
  $$("feed").innerHTML=G.feed.filter(f=>G.t-f.t<12).map(f=>`<div style="color:${f.col}">${f.msg}</div>`).join("");
  const n=pairNear();
  $$("prompt").textContent=n&&!G.talk?`[E] Take over — ${n.u.name} (${n.sp?n.sp.def.name:"unassisted"})`:"";
  // minimap
  const mc=$$("mini"),g=mc.getContext("2d"),W=mc.width,X=x=>(x+30)/60*W,Z=z=>(z+30)/60*W;
  g.fillStyle="#222";g.fillRect(0,0,W,W);g.fillStyle="#555";g.fillRect(X(-10),Z(-27),X(10)-X(-10),Z(-14)-Z(-27));
  g.fillStyle="#6a6";for(const id in G.cars){const p=G.cars[id].mesh.position;g.fillRect(X(p.x)-2,Z(p.z)-4,4,8)}
  G.sales.forEach(s=>{g.fillStyle="#4af";g.fillRect(X(s.mesh.position.x)-2,Z(s.mesh.position.z)-2,5,5)});
  G.cust.forEach(c=>{if(!c.mesh||c.state=="gone")return;g.fillStyle=c.state=="stuck"?(Math.floor(G.t*3)%2?"#f33":"#fff"):"#fd4";g.fillRect(X(c.mesh.position.x)-2,Z(c.mesh.position.z)-2,c.state=="stuck"?7:4,c.state=="stuck"?7:4)});
  g.save();g.translate(X(G.px),Z(G.pz));g.rotate(-G.yaw);g.fillStyle="#fff";g.beginPath();g.moveTo(0,-7);g.lineTo(4,5);g.lineTo(-4,5);g.fill();g.restore();
}
function loop(){
  if(!G.on)return;
  requestAnimationFrame(loop);
  const now=performance.now();let dt=Math.min(.05,(now-G.last)/1000);G.last=now;
  const paused=$$("pause").style.display=="flex"||T;
  if(!paused)step(dt);
  G.acc+=dt;if(G.acc>.15){G.acc=0;hud()}
  draw();
}

// ---------- input ----------
addEventListener("keydown",e=>{
  if(!G.on||T)return;
  G.keys[e.code]=true;
  if(e.code=="KeyE"&&$$("pause").style.display!="flex"){const c=pairNear();if(c)takeover(c)}
});
addEventListener("keyup",e=>{G.keys[e.code]=false});
addEventListener("mousemove",e=>{
  if(!G.on||T)return;
  if(document.pointerLockElement===canvas||(G.drag&&e.buttons)){G.yaw-=e.movementX*.0022;G.pitch=Math.max(-1.3,Math.min(1.3,G.pitch-e.movementY*.0022))}
});
document.addEventListener("pointerlockchange",()=>{
  if(!G.on||G.ended||T||G.talk)return;
  if(document.pointerLockElement!==canvas){$$("pause").style.display="flex";$$("pausetxt").innerHTML=`<h2>Paused</h2><button class=go onclick="G3.resume()">Resume</button>`}
});
document.addEventListener("pointerlockerror",()=>{G.drag=true});
addEventListener("resize",resize);

window.G3={start,step,draw,hud,takeover,talkClosed,resume,finish,endShift,state:G,syncCars,carSlot};
})();
