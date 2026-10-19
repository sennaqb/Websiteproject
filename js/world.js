"use strict";
// Builds the 3D world: sky, lot, showroom, props, cars and people.
(function(){
const SLOT_DX=3.2, ROW_Z=8, STAND_Z=4.6, COL_ORDER=[4,5,3,6,2,7,1,8,0,9];
const SKIN=[0xf1c9a5,0xd9a273,0x9c6b43,0x6b4426];
const PAINT=[0x7a2020,0x20406a,0x555a52,0xa8a89a,0x2f5a3a,0x6a5a20,0x3a2a4a,0x8a8a8a,0x1d1d1d,0xa04a20,0x9a9a30,0x3a6a7a];
const slotPos=i=>{const row=i%2,col=COL_ORDER[Math.floor(i/2)%10];return {x:(col-4.5)*SLOT_DX,z:row?ROW_Z:-ROW_Z,row}};
const standZ=i=>slotPos(i).row?STAND_Z:-STAND_Z;

const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9,metalness:.02,flatShading:true},o||{}));
const B=(c,o)=>new THREE.MeshBasicMaterial(Object.assign({color:c},o||{}));

// ---------- textures ----------
function tex(w,h,draw,rep){
  const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");draw(g,w,h);
  const t=new THREE.CanvasTexture(c);t.anisotropy=4;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}
  t.userData={c,g};return t;
}
const asphaltTex=()=>tex(512,512,(g,w,h)=>{
  g.fillStyle="#3a3a3c";g.fillRect(0,0,w,h);
  for(let i=0;i<6000;i++){const v=38+Math.random()*34|0;g.fillStyle=`rgb(${v},${v},${v+2})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}
  g.strokeStyle="#1b1b1c";g.lineWidth=2;
  for(let i=0;i<16;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<9;k++){x+=Math.random()*44-22;y+=Math.random()*44-10;g.lineTo(x,y)}g.stroke()}
  for(let i=0;i<7;i++){g.fillStyle="rgba(10,8,5,.35)";g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,16+Math.random()*22,9+Math.random()*12,0,0,7);g.fill()}
  for(let i=0;i<4;i++){g.fillStyle="rgba(70,75,80,.35)";g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*24,10+Math.random()*10,0,0,7);g.fill()}
},[9,9]);
const floorTex=()=>tex(128,128,(g,w,h)=>{g.fillStyle="#8d8a7a";g.fillRect(0,0,w,h);g.fillStyle="#7c796a";g.fillRect(0,0,w/2,h/2);g.fillRect(w/2,h/2,w/2,h/2);for(let i=0;i<350;i++){g.fillStyle="rgba(60,50,30,.12)";g.fillRect(Math.random()*w,Math.random()*h,3,3)}},[8,5]);
const ceilTex=()=>tex(128,128,(g,w,h)=>{g.fillStyle="#cfcab8";g.fillRect(0,0,w,h);g.strokeStyle="#9a957f";g.lineWidth=3;g.strokeRect(0,0,w,h);for(let i=0;i<60;i++){g.fillStyle="rgba(80,70,40,.12)";g.fillRect(Math.random()*w,Math.random()*h,4,4)}},[10,6]);
const fenceTex=()=>tex(64,64,(g,w,h)=>{g.clearRect(0,0,w,h);g.strokeStyle="rgba(175,175,180,.85)";g.lineWidth=2;for(let i=-64;i<128;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i+64,0);g.lineTo(i,64);g.stroke()}},[40,3]);
const roadTex=()=>tex(256,128,(g,w,h)=>{g.fillStyle="#2c2c2e";g.fillRect(0,0,w,h);g.fillStyle="#c8b24a";for(let x=0;x<w;x+=48)g.fillRect(x,h/2-2,28,4)},[10,1]);
const windowsTex=()=>tex(128,256,(g,w,h)=>{g.fillStyle="#2a2f3a";g.fillRect(0,0,w,h);for(let y=8;y<h;y+=18)for(let x=8;x<w;x+=18){g.fillStyle=Math.random()<.3?"#f2d98a":"#1a1e27";g.fillRect(x,y,9,10)}});
function textTex(text,fg,bg,w,h,font){return tex(w,h,g=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font=font;g.textAlign="center";g.textBaseline="middle";g.fillText(text,w/2,h/2)})}
function sprite(text,fg,bg,sx,sy){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:textTex(text,fg,bg,256,64,"bold 34px sans-serif"),depthTest:false,transparent:true}));
  s.scale.set(sx||1.4,sy||.35,1);s.renderOrder=10;return s;
}
const mix=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
const COMP_FS=`uniform sampler2D tS,tB;uniform float time,bloom,vig,grain,flash,box,sat,warm;uniform vec2 res;varying vec2 vUv;
float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=vUv,d=uv-.5;float r2=dot(d,d),ca=.006*r2;
  vec3 c=vec3(texture2D(tS,uv+d*ca).r,texture2D(tS,uv).g,texture2D(tS,uv-d*ca).b);
  c+=texture2D(tB,uv).rgb*bloom;
  float l=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(l),c,sat);
  c*=mix(vec3(1.),vec3(1.05,1.,.93),warm);
  c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.22);
  c*=1.-vig*smoothstep(.12,.7,r2*1.8);
  c=mix(c,vec3(.6,.03,.02),flash*.55*smoothstep(.05,.5,r2*2.2));
  c+=(hs(uv*res+fract(time)*100.)-.5)*grain;
  c=mix(c,vec3(0.),step(.5-box,abs(uv.y-.5)));
  gl_FragColor=vec4(max(c,0.),1.);
  #include <colorspace_fragment>
}`;

// ---------- people ----------
function person(o){
  o=o||{};
  const g=new THREE.Group(),u={},skin=SKIN[(o.skin||0)%4],shirt=o.shirt||0x555555,pants=o.pants||0x2a2a35,hair=o.hair==null?0x2a1a10:o.hair;
  const px=(w,h,d,c,x,y,z,par)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.position.set(x,y,z);m.castShadow=true;(par||g).add(m);return m};
  const leg=x=>{const p=new THREE.Group();p.position.set(x,.88,0);px(.21,.84,.23,pants,0,-.42,0,p);px(.23,.1,.32,0x15151a,0,-.86,.04,p);g.add(p);return p};
  u.legL=leg(-.12);u.legR=leg(.12);
  const wid=o.wide?.66:.56;
  px(wid,.2,.3,pants,0,.9,0);                       // hips
  px(wid,.62,.3,shirt,0,1.25,0);                     // torso
  const arm=x=>{const p=new THREE.Group();p.position.set(x,1.52,0);px(.15,.34,.17,shirt,0,-.16,0,p);
    const fa=new THREE.Group();fa.position.set(0,-.34,0);px(.13,.3,.15,shirt,0,-.14,0,fa);px(.12,.12,.12,skin,0,-.32,0,fa);p.add(fa);p.userData.fa=fa;g.add(p);return p};
  u.armL=arm(-.4);u.armR=arm(.4);
  px(.09,.1,.09,skin,0,1.6,0);                       // neck
  const head=new THREE.Mesh(new THREE.SphereGeometry(.17,10,8),M(skin));head.position.y=1.76;head.castShadow=true;g.add(head);u.head=head;
  const eye=x=>px(.03,.03,.02,0x111111,x,1.78,.16);eye(-.06);eye(.06);
  u.mouth=px(.09,.025,.02,0x3a1a14,0,1.69,.165);px(.07,.018,.02,hair,-.06,1.825,.16);px(.07,.018,.02,hair,.06,1.825,.16);
  const style=o.hairStyle||"short";
  if(style==="short"||style==="cap"){const hr=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8,0,Math.PI*2,0,Math.PI/2),M(hair));hr.position.y=1.77;g.add(hr)}
  if(style==="long"){const hr=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8,0,Math.PI*2,0,Math.PI/2),M(hair));hr.position.y=1.77;g.add(hr);px(.3,.34,.1,hair,0,1.62,-.12)}
  if(style==="cap"){const cp=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.07,10),M(o.cap||0x2a4a7a));cp.position.y=1.88;g.add(cp);px(.2,.02,.16,o.cap||0x2a4a7a,0,1.86,.2)}
  if(o.tie)px(.07,.4,.03,o.tie,0,1.27,.16);
  if(o.beard)px(.2,.1,.1,hair,0,1.68,.1);
  if(o.badge)px(.1,.06,.02,0xffffff,.14,1.42,.16);
  g.userData=u;return g;
}
function animatePerson(g,moving,t,armsUp,talk){
  const u=g.userData,s=moving?Math.sin(t*9)*.7:0;
  u.legL.rotation.x=s;u.legR.rotation.x=-s;
  if(armsUp){
    u.armL.rotation.x=-2.7+Math.sin(t*10)*.25;u.armR.rotation.x=-2.7+Math.sin(t*10+1)*.25;
    u.armL.userData.fa.rotation.x=0;u.armR.userData.fa.rotation.x=0;
  }else if(talk){
    u.armL.rotation.x=-.5+Math.sin(t*3)*.3;u.armR.rotation.x=-.7+Math.sin(t*3.7+1)*.35;
    u.armL.userData.fa.rotation.x=-.9;u.armR.userData.fa.rotation.x=-1.1;
  }else{
    u.armL.rotation.x=moving?-s*.7:Math.sin(t*1.5)*.04;u.armR.rotation.x=moving?s*.7:-Math.sin(t*1.5)*.04;
    u.armL.userData.fa.rotation.x=moving?-.3:-.1;u.armR.userData.fa.rotation.x=moving?-.3:-.1;
  }
  if(u.mouth){const tk=u.talkLeft>0;u.mouth.scale.y=tk?1+Math.abs(Math.sin(t*15))*2.4:1;u.head.rotation.x=tk?Math.sin(t*5)*.06:0}
}

// ---------- cars ----------
const SPEC={
  sedan:{L:4.5,W:1.8,belt:.98,hood:.9,trunk:.92,nose:.74,tail:.8,cs:1.05,ce:1.35,rs:.65,fs:.75,top:1.45},
  coupe:{L:4.3,W:1.8,belt:.95,hood:.86,trunk:.9,nose:.7,tail:.78,cs:.95,ce:1.25,rs:.6,fs:.7,top:1.4},
  suv:{L:4.5,W:1.9,belt:1.05,hood:.98,trunk:1.05,nose:.85,tail:.9,cs:.45,ce:1.25,rs:.12,fs:.6,top:1.68},
  truck:{L:5.2,W:1.9,belt:1.0,hood:.95,trunk:.78,nose:.8,tail:.78,cs:1.9,ce:1.3,rs:.12,fs:.55,top:1.6,step:true}
};
function ext(shape,w,bev){
  const g=new THREE.ExtrudeGeometry(shape,{depth:w,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:1,curveSegments:6,steps:1});
  g.translate(0,0,-w/2);g.rotateY(-Math.PI/2);return g;
}
function lowerShape(o){
  const s=new THREE.Shape(),y0=.28,h=o.L/2,r=.43,wf=h-.95,wr=-h+.95;
  s.moveTo(-h,y0);s.lineTo(-h,o.tail);s.lineTo(-h+.18,o.trunk);
  if(o.step)s.lineTo(-h+o.cs,o.trunk);
  s.lineTo(-h+o.cs,o.belt);s.lineTo(h-o.ce,o.belt);s.lineTo(h-.2,o.hood);s.lineTo(h,o.nose);s.lineTo(h,y0);
  [wf,wr].forEach(cx=>{s.lineTo(cx+r,y0);for(let a=0;a<=Math.PI+.01;a+=Math.PI/8)s.lineTo(cx+r*Math.cos(a),y0+r*Math.sin(a))});
  s.lineTo(-h,y0);return s;
}
function cabinShape(o){
  const h=o.L/2,s=new THREE.Shape(),x0=-h+o.cs,x1=h-o.ce;
  s.moveTo(x0,o.belt-.02);s.lineTo(x0+o.rs,o.top);s.lineTo(x1-o.fs,o.top);s.lineTo(x1,o.belt-.02);s.lineTo(x0,o.belt-.02);return s;
}
function priceCanvas(price){
  const c=document.createElement("canvas");c.width=128;c.height=80;const g=c.getContext("2d");
  g.fillStyle="#f4f1e0";g.fillRect(0,0,128,80);g.strokeStyle="#c33";g.fillStyle="#c33";g.lineWidth=3;
  g.font="bold 34px 'Comic Sans MS',cursive,sans-serif";g.textAlign="center";
  g.save();g.translate(64,38);g.rotate(-.08);g.fillText("$"+Math.round(price).toLocaleString(),0,0);g.restore();
  g.font="bold 20px sans-serif";g.fillText("AS-IS",64,68);g.beginPath();g.moveTo(14,48);g.lineTo(114,44);g.stroke();
  return c;
}
function buildCar(c){
  const o=SPEC[c.body],g=new THREE.Group(),h=o.L/2;
  const col=PAINT[(c.id*7+c.year)%PAINT.length],paint=M(col,{roughness:.55,metalness:.25});
  const glass=M(0x16222d,{roughness:.2,metalness:.4});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m};
  const bx=(w,hh,d,mat,x,y,z)=>add(new THREE.BoxGeometry(w,hh,d),mat,x,y,z);
  add(ext(lowerShape(o),o.W-.1,.05),paint,0,0,0);
  add(ext(cabinShape(o),o.W-.28,.04),glass,0,0,0);
  const rx0=-h+o.cs+o.rs,rx1=h-o.ce-o.fs;
  bx(o.W-.3,.06,rx1-rx0+.1,paint,0,o.top+.03,(rx0+rx1)/2);                       // roof
  const mid=(-h+o.cs+h-o.ce)/2;
  [-1,1].forEach(sx=>bx(.06,o.top-o.belt,.09,paint,sx*(o.W/2-.16),(o.top+o.belt)/2,mid));   // B pillar
  // wheels
  const flat=c.cond<30?Math.floor(Math.random()*4):-1;let wi=0;
  [[1,h-.95],[-1,h-.95],[1,-h+.95],[-1,-h+.95]].forEach(([sx,z])=>{
    const dead=wi++===flat,r=dead?.28:.34;
    const wh=add(new THREE.CylinderGeometry(r,r,.26,12),M(0x111111),sx*(o.W/2-.04),dead?.28:.34,z);wh.rotation.z=Math.PI/2;
    if(!(c.cond<45&&wi%3===0))add(new THREE.CylinderGeometry(.19,.19,.28,10),M(0xa8a8a8,{metalness:.6,roughness:.35}),sx*(o.W/2-.03),dead?.28:.34,z).rotation.z=Math.PI/2;
  });
  // lights, grille, bumpers, plate
  [-1,1].forEach(sx=>{
    bx(.34,.14,.06,B(0xfff2c0),sx*(o.W/2-.28),o.nose-.12,h+.02);
    bx(.3,.12,.06,B(c.cond<40&&sx>0?0x401010:0xc02020),sx*(o.W/2-.26),o.tail-.1,-h-.02);
  });
  bx(o.W*.45,.14,.05,M(0x222222),0,o.nose-.17,h+.03);
  bx(o.W-.05,.13,.14,M(0x555a5e),0,.42,h+.02);bx(o.W-.05,.13,.14,M(0x555a5e),0,.42,-h-.02);
  bx(.5,.12,.02,M(0xe8e8e0),0,.52,-h-.1);
  // mirrors
  [-1,1].forEach(sx=>bx(.08,.12,.14,paint,sx*(o.W/2+.03),o.belt+.12,h-o.ce-.1));
  // truck bed walls
  if(c.body==="truck"){
    const bl=o.cs-.1;
    [-1,1].forEach(sx=>bx(.07,.34,bl,paint,sx*(o.W/2-.06),o.trunk+.17,-h+bl/2+.04));
    bx(o.W-.1,.34,.07,paint,0,o.trunk+.17,-h+.06);bx(o.W-.1,.34,.07,paint,0,o.trunk+.17,-h+bl);
  }
  // wear and tear
  const rn=Math.max(0,Math.round((70-c.cond)/14));
  for(let i=0;i<rn;i++){
    const sx=i%2?1:-1;
    const p=bx(.03,.2+Math.random()*.15,.4+Math.random()*.5,M(0x8a4a1a),sx*(o.W/2-.02),.5+Math.random()*.25,(Math.random()-.5)*(o.L-1.6));
    p.castShadow=false;
  }
  if(c.cond<60||(c.id%3===0)){ // mismatched door panel
    const dc=PAINT[(c.id*3+5)%PAINT.length];
    bx(.035,.5,1.0,M(dc),(c.id%2?1:-1)*(o.W/2-.01),.68,mid-.1).castShadow=false;
  }
  if(c.cond<40)bx(.5,.07,.5,M(0x1a1a1a),0,o.hood+.04,h-1.0); // burnt hood patch
  // windshield price paper (scrawled with a grease pencil)
  const x1=h-o.ce,fx=o.fs,dy=o.top-o.belt,len=Math.hypot(fx,dy);
  const t=new THREE.CanvasTexture(priceCanvas(c.price));
  const pm=new THREE.Mesh(new THREE.PlaneGeometry(.62,.38),new THREE.MeshBasicMaterial({map:t}));
  pm.position.set(.35,(o.belt+o.top)/2+.04*(fx/len),x1-fx/2+.04*(dy/len));
  pm.rotation.x=-Math.asin(fx/len);g.add(pm);
  g.userData={tagTex:t,tagCanvas:t.image,price:c.price,len:o.L};
  g.traverse(m=>{if(m.isMesh)m.receiveShadow=false});
  return g;
}
function updateTag(g,price){
  if(g.userData.price===price)return;
  const t=g.userData.tagTex,c=priceCanvas(price);
  t.image=c;t.needsUpdate=true;g.userData.price=price;
}

// ---------- world ----------
// ---------- office furniture ----------
const SM=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.7,metalness:0},o||{}));
const woodTex=()=>tex(256,256,(g,w,h)=>{
  g.fillStyle="#9a7650";g.fillRect(0,0,w,h);
  for(let i=0;i<90;i++){const y=Math.random()*h,a=.05+Math.random()*.12;g.strokeStyle=`rgba(${Math.random()<.5?"70,45,22":"190,150,105"},${a})`;g.lineWidth=1+Math.random()*2;
    g.beginPath();g.moveTo(0,y);for(let x=0;x<=w;x+=16)g.lineTo(x,y+Math.sin(x*.03+i)*3);g.stroke()}
  for(let i=0;i<3;i++){g.strokeStyle="rgba(60,38,18,.25)";g.lineWidth=1.5;g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,26,5,0,0,7);g.stroke()}
},[2,1]);
const screenTex=()=>tex(256,160,(g,w,h)=>{
  g.fillStyle="#e8ecf2";g.fillRect(0,0,w,h);g.fillStyle="#1f4f8a";g.fillRect(0,0,w,16);
  g.fillStyle="#fff";g.font="bold 10px sans-serif";g.fillText("DEALERTRAK 98",6,12);
  g.strokeStyle="#c3cad4";for(let y=28;y<h;y+=12){g.beginPath();g.moveTo(6,y);g.lineTo(w-6,y);g.stroke()}
  g.fillStyle="#445";g.font="9px monospace";for(let y=36;y<h;y+=12)g.fillText(Math.random()<.5?"FOLLOW UP  "+(100+Math.random()*900|0):"APPT  4:"+(10+Math.random()*49|0)+"PM",8,y);
});
const keysTex=()=>tex(128,40,(g,w,h)=>{g.fillStyle="#1c1c1e";g.fillRect(0,0,w,h);g.fillStyle="#3a3a3e";for(let r=0;r<4;r++)for(let k=0;k<14;k++)g.fillRect(3+k*8.9,3+r*9,7,7)});
// Rounded slab, w x h x d, centered.
function rbox(w,h,d,r){
  const s=new THREE.Shape(),x=w/2-r,y=h/2-r;
  s.moveTo(-x,-h/2);s.lineTo(x,-h/2);s.absarc(x,-y,r,-Math.PI/2,0);s.lineTo(w/2,y);s.absarc(x,y,r,0,Math.PI/2);
  s.lineTo(-x,h/2);s.absarc(-x,y,r,Math.PI/2,Math.PI);s.lineTo(-w/2,-y);s.absarc(-x,-y,r,Math.PI,Math.PI*1.5);
  const b=Math.min(.012,d/4),g=new THREE.ExtrudeGeometry(s,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:5});
  g.translate(0,0,-(d-2*b)/2);g.computeVertexNormals();return g;
}
const FM={};
function furnMats(){
  if(FM.wood)return FM;
  Object.assign(FM,{wood:SM(0xffffff,{map:woodTex(),roughness:.55}),lam:SM(0x5c534a,{roughness:.8}),edge:SM(0x3a2e24),
    metal:SM(0x9aa0a6,{metalness:.8,roughness:.35}),black:SM(0x1b1c1f,{roughness:.6}),plastic:SM(0x2a2b2f,{roughness:.45}),
    fabric:SM(0x2c3442,{roughness:1}),vinyl:SM(0x6e2a2a,{roughness:.5}),paper:SM(0xf2efe6,{roughness:1}),folder:SM(0xd8b86a,{roughness:1}),
    chrome:SM(0xd0d4d8,{metalness:1,roughness:.2}),screen:new THREE.MeshBasicMaterial({map:screenTex()}),keys:SM(0xffffff,{map:keysTex(),roughness:.6})});
  return FM;
}
function part(g,geo,mat,x,y,z,o){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(o&&o.ry)m.rotation.y=o.ry;if(o&&o.rx)m.rotation.x=o.rx;m.castShadow=!(o&&o.noShadow);m.receiveShadow=true;g.add(m);return m}
const BX=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
// Desk: the seated side is local -z, the visitor side +z. Top at y .76.
function makeDesk(w,d,o){
  const F=furnMats(),g=new THREE.Group(),H=.76;o=o||{};
  part(g,BX(w,.04,d),F.wood,0,H-.02,0);
  part(g,BX(w+.006,.012,d+.006),F.edge,0,H-.046,0,{noShadow:true});
  const pw=.44,px=-w/2+pw/2+.03;
  part(g,BX(pw,H-.06,d-.08),F.lam,px,(H-.06)/2+.01,0);
  for(let i=0;i<3;i++){const y=.14+i*.21;
    part(g,BX(pw-.04,.18,.02),F.lam,px,y,-d/2+.03,{noShadow:true});
    part(g,BX(.14,.015,.025),F.chrome,px,y+.04,-d/2+.01,{noShadow:true});}
  part(g,BX(.035,H-.06,d-.08),F.lam,w/2-.05,(H-.06)/2+.01,0);
  part(g,BX(w-pw-.12,.42,.02),F.lam,(pw+.02)/2,.5,d/2-.08);
  const mug=SM([0xb03030,0x2a5a9a,0xe0d8c0,0x2a6a3a][o.seed%4|0]);
  if(o.monitor!==false){
    part(g,BX(.24,.012,.17),F.plastic,.12,H+.006,.12);
    part(g,BX(.05,.24,.03),F.plastic,.12,H+.13,.17);
    const mon=new THREE.Group();mon.position.set(.12,H+.32,.14);mon.rotation.y=Math.PI;mon.rotation.x=-.06;g.add(mon);
    part(mon,rbox(.58,.36,.035,.015),F.black,0,0,0);
    part(mon,new THREE.PlaneGeometry(.54,.31),F.screen,0,.008,.019,{noShadow:true});
    part(g,BX(.44,.022,.14),F.keys,.1,H+.011,-.18,{noShadow:true});
    part(g,new THREE.CapsuleGeometry(.022,.04,4,8),F.plastic,.42,H+.015,-.2,{rx:Math.PI/2,noShadow:true});
  }
  // phone
  part(g,BX(.17,.05,.2),F.plastic,-.52,H+.025,-.04,{ry:.3});
  part(g,new THREE.CapsuleGeometry(.025,.15,4,8),F.plastic,-.55,H+.065,-.05,{ry:.3,rx:Math.PI/2,noShadow:true}).rotation.z=Math.PI/2+.3;
  // paperwork
  for(let i=0;i<4;i++)part(g,BX(.22,.004,.3),i%3?F.paper:F.folder,-.15+(o.seed%3)*.05,H+.003+i*.005,.05,{ry:(i-1.5)*.08,noShadow:true});
  part(g,new THREE.CylinderGeometry(.04,.036,.1,14),mug,w/2-.25,H+.05,.12);
  part(g,new THREE.CylinderGeometry(.035,.035,.11,10,1,true),F.black,w/2-.3,H+.055,-.25,{noShadow:true});
  for(let i=0;i<3;i++)part(g,new THREE.CylinderGeometry(.004,.004,.16,4),[F.chrome,mug,F.black][i],w/2-.3+(i-1)*.012,H+.09,-.25,{noShadow:true}).rotation.z=(i-1)*.15;
  return g;
}
// Swivel chair: the sitter faces local +z.
function makeOfficeChair(){
  const F=furnMats(),g=new THREE.Group();
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5,arm=new THREE.Group();arm.rotation.y=a;g.add(arm);
    part(arm,BX(.05,.035,.3),F.plastic,0,.085,.15,{noShadow:true});
    part(arm,new THREE.SphereGeometry(.03,8,6),F.black,0,.03,.29,{noShadow:true});}
  part(g,new THREE.CylinderGeometry(.045,.045,.06,12),F.plastic,0,.1,0);
  part(g,new THREE.CylinderGeometry(.024,.024,.3,10),F.chrome,0,.27,0);
  part(g,BX(.22,.04,.22),F.plastic,0,.42,0);
  part(g,rbox(.5,.48,.08,.08),F.fabric,0,.48,.02,{rx:-Math.PI/2});
  part(g,BX(.06,.32,.03),F.plastic,0,.6,-.25,{rx:-.1});
  part(g,rbox(.46,.5,.07,.1),F.fabric,0,.92,-.27,{rx:-.12});
  [-1,1].forEach(s=>{part(g,BX(.03,.2,.04),F.plastic,s*.26,.6,0);part(g,rbox(.07,.26,.03,.025),F.plastic,s*.26,.71,.02,{rx:-Math.PI/2})});
  return g;
}
// Waiting-room style guest chair: chrome frame, vinyl cushions. Sitter faces local +z.
function makeGuestChair(){
  const F=furnMats(),g=new THREE.Group();
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>part(g,new THREE.CylinderGeometry(.013,.013,.44,8),F.chrome,sx*.2,.22,sz*.19,{noShadow:true}));
  [-1,1].forEach(s=>part(g,new THREE.CylinderGeometry(.013,.013,.4,8),F.chrome,s*.2,.45,0,{rx:Math.PI/2,noShadow:true}));
  [-1,1].forEach(s=>part(g,new THREE.CylinderGeometry(.012,.012,.38,8),F.chrome,s*.2,.62,-.2,{rx:-.1,noShadow:true}));
  part(g,rbox(.48,.44,.07,.05),F.vinyl,0,.48,0,{rx:-Math.PI/2});
  part(g,rbox(.46,.3,.05,.05),F.vinyl,0,.74,-.22,{rx:-.1});
  return g;
}

// Merge a static group into one mesh per material, so detailed props cost a handful of draw calls.
function bakeStatic(group){
  group.updateMatrixWorld(true);
  const by=new Map();
  group.traverse(m=>{if(!m.isMesh)return;
    let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);
    const e=by.get(m.material)||{geos:[],shadow:false};e.geos.push(g);e.shadow=e.shadow||m.castShadow;by.set(m.material,e)});
  const out=[];
  by.forEach((e,mat)=>{
    const merged=new THREE.BufferGeometry();
    ["position","normal","uv"].forEach(k=>{
      const n=e.geos.reduce((a,g)=>a+g.attributes[k].array.length,0),arr=new Float32Array(n);let o=0;
      e.geos.forEach(g=>{arr.set(g.attributes[k].array,o);o+=g.attributes[k].array.length;g.dispose()});
      merged.setAttribute(k,new THREE.BufferAttribute(arr,k==="uv"?2:3));
    });
    merged.computeBoundingSphere();
    const m=new THREE.Mesh(merged,mat);m.castShadow=e.shadow;m.receiveShadow=true;m.matrixAutoUpdate=false;out.push(m);
  });
  return out;
}

function create(canvas){
  const R=new THREE.WebGLRenderer({canvas,antialias:true});
  R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(72,1,.05,260);
  scene.fog=new THREE.Fog(0xaab4bc,28,120);
  const W={R,scene,cam,colliders:[],flick:[],tube:[],balloons:[],slotPos,standZ,buildCar,updateTag,person,animatePerson,sprite,
           desks:[-6,-2,2,6],pc:{x:-7.5,z:-23.2},sw:{x:2.3,z:-15.2},bound:{x0:-27,x1:27,z0:-26.5,z1:26}};
  const solid=(x0,x1,z0,z1)=>W.colliders.push({x0,x1,z0,z1});
  const box=(w,h,d,mat,x,y,z,o)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=!(o&&o.noShadow);m.receiveShadow=true;scene.add(m);return m};

  // sky + lights
  const skyGeo=new THREE.SphereGeometry(150,24,14),cols=new Float32Array(skyGeo.attributes.position.count*3);
  skyGeo.setAttribute("color",new THREE.BufferAttribute(cols,3));
  const sky=new THREE.Mesh(skyGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false}));scene.add(sky);
  const hemi=new THREE.HemisphereLight(0xdfe6ee,0x4a4a44,1.7);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff0d0,1.4);sun.position.set(-24,38,14);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36,near:5,far:120});sun.shadow.bias=-.0006;
  scene.add(sun);scene.add(sun.target);
  const lamps=[],glows=[];
  const KEYS=[[0,0x8fa3b5,0xc9d0d4,.95],[.5,0x9db8d0,0xdde3e6,1],[.8,0x8a8fa8,0xe0b27a,.7],[1,0x3e3e6c,0xd9744a,.4]];
  W.setTime=function(p){
    p=Math.max(0,Math.min(1,p));let a=KEYS[0],b=KEYS[1];
    for(let i=0;i<KEYS.length-1;i++)if(p>=KEYS[i][0]&&p<=KEYS[i+1][0]){a=KEYS[i];b=KEYS[i+1]}
    const k=(p-a[0])/Math.max(.001,b[0]-a[0]),top=mix(a[1],b[1],k),hor=mix(a[2],b[2],k),pow=a[3]+(b[3]-a[3])*k;
    const pos=skyGeo.attributes.position,arr=skyGeo.attributes.color.array;
    for(let i=0;i<pos.count;i++){const t=Math.max(0,pos.getY(i)/150),c=hor.clone().lerp(top,Math.pow(t,.6));arr[i*3]=c.r;arr[i*3+1]=c.g;arr[i*3+2]=c.b}
    skyGeo.attributes.color.needsUpdate=true;
    scene.fog.color.copy(hor);scene.background=hor;
    hemi.intensity=1.7*pow;sun.intensity=1.4*pow;sun.color.set(mix(0xfff6e0,0xff9a50,Math.max(0,(p-.55)/.45)));
    sun.position.set(-24+p*30,38-p*18,14);
    const dusk=Math.max(0,Math.min(1,(p-.55)/.4));
    glows.forEach(f=>f(dusk));
  };

  // ground, road, scenery
  const dirt=new THREE.Mesh(new THREE.PlaneGeometry(400,400),M(0x5b5a4a));dirt.rotation.x=-Math.PI/2;dirt.position.y=-.03;dirt.receiveShadow=true;scene.add(dirt);
  const lot=new THREE.Mesh(new THREE.PlaneGeometry(56,55),new THREE.MeshStandardMaterial({map:asphaltTex(),roughness:1}));
  lot.rotation.x=-Math.PI/2;lot.receiveShadow=true;scene.add(lot);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(400,12),new THREE.MeshStandardMaterial({map:roadTex(),roughness:1}));
  road.rotation.x=-Math.PI/2;road.position.set(0,.01,36);scene.add(road);
  for(let i=0;i<22;i++){ // distant skyline
    const a=Math.random()*Math.PI*2,r=85+Math.random()*50,hgt=8+Math.random()*28,wd=6+Math.random()*10;
    const wm=windowsTex();wm.wrapS=wm.wrapT=THREE.RepeatWrapping;wm.repeat.set(wd/12,hgt/14);
    const b=new THREE.Mesh(new THREE.BoxGeometry(wd,hgt,wd),new THREE.MeshBasicMaterial({map:wm,color:0x8a8f9a}));
    b.position.set(Math.cos(a)*r,hgt/2,Math.sin(a)*r);scene.add(b);
  }
  // slot paint
  const lm=B(0xcfcf9f);
  for(let r=0;r<2;r++)for(let c=0;c<=10;c++){const m=new THREE.Mesh(new THREE.PlaneGeometry(.08,4.6),lm);m.rotation.x=-Math.PI/2;m.position.set((c-5)*SLOT_DX,.02,r?ROW_Z:-ROW_Z);scene.add(m)}
  // fence with a gate opening
  const fm=new THREE.MeshBasicMaterial({map:fenceTex(),transparent:true,side:THREE.DoubleSide,depthWrite:false}),postM=M(0x666a70);
  const fence=(cx,cz,len,rot)=>{
    const f=new THREE.Mesh(new THREE.PlaneGeometry(len,2.4),fm);f.position.set(cx,1.2,cz);if(rot)f.rotation.y=Math.PI/2;scene.add(f);
    for(let k=0;k<=len;k+=7){box(.12,2.5,.12,postM,rot?cx:cx-len/2+k,1.25,rot?cz-len/2+k:cz,{noShadow:true})}
  };
  fence(-15.5,27.5,25,0);fence(15.5,27.5,25,0);fence(0,-27.5,56,0);fence(-28,0,55,1);fence(28,0,55,1);
  box(.4,3.2,.4,postM,-3,1.6,27.5);box(.4,3.2,.4,postM,3,1.6,27.5);

  // ---------- showroom ----------
  const X0=-10,X1=10,Z0=-27,Z1=-14,H=3.2,wall=M(0x9a8f78),dark=M(0x6a6256);
  const glassM=new THREE.MeshStandardMaterial({color:0x9ccbe0,transparent:true,opacity:.3,roughness:.1});
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(X1-X0,Z1-Z0),new THREE.MeshStandardMaterial({map:floorTex(),roughness:.8}));
  fl.rotation.x=-Math.PI/2;fl.position.set(0,.03,(Z0+Z1)/2);fl.receiveShadow=true;scene.add(fl);
  const ce=new THREE.Mesh(new THREE.PlaneGeometry(X1-X0,Z1-Z0),new THREE.MeshStandardMaterial({map:ceilTex(),roughness:1}));
  ce.rotation.x=Math.PI/2;ce.position.set(0,H-.02,(Z0+Z1)/2);scene.add(ce);
  box(X1-X0+.6,.3,Z1-Z0+.6,dark,0,H+.15,(Z0+Z1)/2);
  box(X1-X0,H,.3,wall,0,H/2,Z0);box(.3,H,Z1-Z0,wall,X0,H/2,(Z0+Z1)/2);box(.3,H,Z1-Z0,wall,X1,H/2,(Z0+Z1)/2);
  [[-5.8,8.4],[5.8,8.4]].forEach(([cx,w])=>{box(w,1,.3,wall,cx,.5,Z1);box(w,.7,.3,wall,cx,H-.35,Z1);box(w,1.5,.1,glassM,cx,1.75,Z1,{noShadow:true})});
  box(3.2,.7,.3,wall,0,H-.35,Z1);
  // blinds in the windows
  [-5.8,5.8].forEach(cx=>{for(let i=0;i<6;i++)box(7.6,.04,.04,M(0xd8d2b8),cx,1.1+i*.22,Z1+.08,{noShadow:true})});
  solid(X0-.2,X0+.2,Z0,Z1);solid(X1-.2,X1+.2,Z0,Z1);solid(X0,X1,Z0-.2,Z0+.2);solid(X0,-1.6,Z1-.2,Z1+.2);solid(1.6,X1,Z1-.2,Z1+.2);
  // fluorescent lights (one dying)
  for(let i=0;i<4;i++){const l=box(2.4,.05,.6,B(0xffffe0),-6+i*4,H-.06,-19.5,{noShadow:true});if(i===2)W.flick.push(l)}
  const inLight=new THREE.PointLight(0xfff4d6,12,22,1.6);inLight.position.set(0,2.8,-20);scene.add(inLight);
  // sales desks
  const furn=new THREE.Group();
  W.desks.forEach((x,i)=>{
    const d=makeDesk(1.9,.9,{seed:i});d.position.set(x,0,-20);furn.add(d);
    const ch=makeOfficeChair();ch.position.set(x+.1,0,-20.95);ch.rotation.y=(i%2?.25:-.2);furn.add(ch);
    [-.58,.58].forEach((dx,k)=>{const gc=makeGuestChair();gc.position.set(x+dx,0,-19.1);gc.rotation.y=Math.PI+(k?-.12:.12);furn.add(gc)});
    solid(x-.95,x+.95,-21.3,-19.55);
  });
  // manager's office: glass walls, desk, glowing computer
  box(4.6,3,.05,glassM,-7.7,1.5,-22.4,{noShadow:true});box(.05,3,4.6,glassM,-5.4,1.5,-24.7,{noShadow:true});
  solid(-10,-7.1,-22.55,-22.25);solid(-5.9,-5.25,-22.55,-22.25);solid(-5.55,-5.25,-27,-22.4);
  const md=makeDesk(3,1.1,{seed:3,monitor:false});md.position.set(-7.5,0,-25);md.rotation.y=Math.PI;furn.add(md);solid(-9.1,-5.9,-25.7,-24.3);
  { const F=furnMats();
    box(.84,.52,.05,F.black,-7.5,1.2,-25.32);box(.06,.3,.04,F.plastic,-7.5,.9,-25.4);box(.3,.015,.2,F.plastic,-7.5,.767,-25.4);
    box(.44,.022,.14,F.keys,-7.5,.771,-24.85,{noShadow:true});
    const mc=makeOfficeChair();mc.position.set(-6.5,0,-23.9);mc.rotation.y=Math.PI+.7;furn.add(mc);
    bakeStatic(furn).forEach(m=>scene.add(m)); }
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.7,.4),new THREE.MeshBasicMaterial({map:textTex("PRICES  ·  CREW  ·  BOOKS","#6fff9a","#06140c",256,128,"bold 15px monospace")}));
  screen.position.set(-7.5,1.2,-25.26);scene.add(screen);W.pcScreen=screen;
  const pcLight=new THREE.PointLight(0x66ff99,1.2,5);pcLight.position.set(-7.5,1.3,-24.4);scene.add(pcLight);
  box(.6,.15,.03,B(0xffffff),-8.55,.835,-24.55,{noShadow:true}).material=new THREE.MeshBasicMaterial({map:textTex("MANAGER","#222","#e8e0c0",128,32,"bold 18px sans-serif")});
  box(.7,.7,.7,M(0x5a5a5a),-9.4,.35,-26.4);solid(-9.75,-9.05,-26.75,-26.05); // filing cabinet
  // water cooler, plants, sofa
  box(.5,1.1,.5,M(0x88aacc),8,.55,-25);solid(7.7,8.3,-25.3,-24.7);
  [[9.2,-15],[-9.2,-15],[9.2,-26]].forEach(([x,z])=>{box(.4,.4,.4,M(0x6a3a22),x,.2,z);const lf=new THREE.Mesh(new THREE.SphereGeometry(.45,7,6),M(0x2e5a2a));lf.position.set(x,.8,z);lf.castShadow=true;scene.add(lf)});
  box(2.2,.5,.9,M(0x6a2a2a),6.4,.25,-16.2);box(2.2,.5,.2,M(0x6a2a2a),6.4,.6,-16.6);solid(5.3,7.5,-16.7,-15.7);
  // sales board (live stats), posters
  const boardTex=textTex("","#222","#f0f0e8",512,256,"20px sans-serif");
  const board=new THREE.Mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshBasicMaterial({map:boardTex}));board.position.set(3,1.9,Z0+.2);scene.add(board);
  box(4.2,2.2,.05,M(0xaaaaaa),3,1.9,Z0+.15);
  W.setBoard=function(title,rows,foot){
    const g=boardTex.userData.g;g.fillStyle="#f0f0e8";g.fillRect(0,0,512,256);
    g.fillStyle="#b01010";g.font="bold 28px sans-serif";g.textAlign="left";g.fillText(title,16,36);
    g.fillStyle="#223";g.font="22px monospace";rows.forEach((r,i)=>g.fillText(r,16,76+i*30));
    g.fillStyle="#555";g.font="italic 18px sans-serif";g.fillText(foot||"",16,240);
    boardTex.needsUpdate=true;
  };
  box(2.4,1.2,.05,B(0xffffff),-2,1.9,Z0+.2,{noShadow:true}).material=new THREE.MeshBasicMaterial({map:textTex("WE FINANCE EVERYBODY!!","#ffdd00","#b01010",512,256,"bold 46px sans-serif")});
  // OPEN sign + switch
  const openTex=textTex("CLOSED","#ff4040","#120505",256,96,"bold 54px sans-serif");
  const openSign=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.52),new THREE.MeshBasicMaterial({map:openTex}));openSign.position.set(0,2.75,Z1-.3);openSign.rotation.y=Math.PI;scene.add(openSign);
  W.setOpen=function(open){
    const g=openTex.userData.g;g.fillStyle="#120505";g.fillRect(0,0,256,96);g.fillStyle=open?"#40ff70":"#ff4040";g.font="bold 54px sans-serif";g.textAlign="center";g.textBaseline="middle";g.fillText(open?"OPEN":"CLOSED",128,48);openTex.needsUpdate=true;
  };
  box(.18,.3,.06,M(0x333333),W.sw.x,1.3,Z1+.18);
  // floor markers for the two spots you walk up to
  const ringM=new THREE.MeshBasicMaterial({color:0xffd24a,transparent:true,opacity:.55,side:THREE.DoubleSide});
  W.rings=[W.pc,W.sw].map(p=>{const r=new THREE.Mesh(new THREE.RingGeometry(.55,.7,24),ringM);r.rotation.x=-Math.PI/2;r.position.set(p.x,.06,p.z);scene.add(r);return r});

  // ---------- Miguel: employee of the month, every month ----------
  W.miguelImg=new Image();if(window.MIGUEL_IMG)W.miguelImg.src=window.MIGUEL_IMG;
  const posterTex=(title,sub)=>{
    const w=256,h=360,c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d"),t=new THREE.CanvasTexture(c);t.anisotropy=4;
    const fit=(txt,max,size)=>{let fs=size;do{g.font=`bold ${fs}px Impact,'Arial Black',sans-serif`}while(g.measureText(txt).width>max&&--fs>9)};
    const draw=img=>{
      g.fillStyle="#b8902a";g.fillRect(0,0,w,h);g.fillStyle="#f3ead2";g.fillRect(9,9,w-18,h-18);
      g.fillStyle="#13254a";g.fillRect(9,9,w-18,50);g.fillStyle="#ffd24a";g.textAlign="center";g.textBaseline="middle";fit(title,w-36,24);g.fillText(title,w/2,35);
      const ps=w-56;g.fillStyle="#999";g.fillRect(28,70,ps,ps);
      if(img)g.drawImage(img,77,60,320,320,28,70,ps,ps);
      g.strokeStyle="#b8902a";g.lineWidth=5;g.strokeRect(28,70,ps,ps);
      g.fillStyle="#13254a";fit("MIGUEL",w-40,34);g.fillText("MIGUEL",w/2,70+ps+30);
      g.fillStyle="#8a6410";fit(sub,w-40,18);g.fillText(sub,w/2,70+ps+60);
      g.save();g.translate(w-40,84);g.rotate(.3);g.fillStyle="#ffcc22";g.beginPath();
      for(let i=0;i<10;i++){const r=i%2?9:20,a=i*Math.PI/5-Math.PI/2;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
      g.closePath();g.fill();g.strokeStyle="#8a6410";g.lineWidth=2;g.stroke();g.restore();
      t.needsUpdate=true;
    };
    const im=W.miguelImg,ok=()=>im.complete&&im.naturalWidth;
    draw(ok()?im:null);if(!ok())im.addEventListener("load",()=>draw(im));
    return t;
  };
  const poster=(title,sub,x,y,z,ry,s)=>{
    s=s||1;const m=new THREE.Mesh(new THREE.PlaneGeometry(.8*s,1.12*s),new THREE.MeshBasicMaterial({map:posterTex(title,sub)}));
    m.position.set(x,y,z);m.rotation.set(0,ry,(Math.random()-.5)*.14);scene.add(m);return m;
  };
  ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"]
    .forEach((mo,i)=>poster("EMPLOYEE OF THE MONTH",mo,X1-.17,i<6?2.5:1.32,-25.4+(i%6)*1.75,-Math.PI/2));
  poster("EMPLOYEE OF THE YEAR","VOTED BY: MIGUEL",-7.5,2.15,Z0+.17,0,1.35);
  poster("ASK FOR MIGUEL!","HE'S THE MANAGER",-4.6,1.75,Z1+.2,0);
  poster("ASK FOR MIGUEL!","HE'S THE MANAGER",4.6,1.75,Z1+.2,0);
  poster("EMPLOYEE OF THE CENTURY","NO OTHER NOMINEES",-8,1.45,27.33,Math.PI,1.2);
  poster("EMPLOYEE OF THE MONTH","EVEN THIS ONE",-22,.8,-19.27,0,.75);

  // ---------- outside ----------
  // pole sign
  box(.3,7,.3,M(0x555555),-8,3.5,22);
  const signTex=tex(512,256,(g,w,h)=>{
    g.fillStyle="#1a1a6a";g.fillRect(0,0,w,h);g.strokeStyle="#ffcc00";g.lineWidth=8;g.strokeRect(8,8,w-16,h-16);
    g.fillStyle="#ffcc00";g.font="bold 54px sans-serif";g.textAlign="center";g.fillText("BARGAIN BOB'S",w/2,90);
    g.fillStyle="#ff4040";g.font="bold 46px sans-serif";g.fillText("AUTO MART",w/2,150);
    g.fillStyle="#fff";g.font="bold 28px sans-serif";g.fillText("NO CREDIT? NO PROBLEM!",w/2,212);
  });
  const sign=box(5,2.5,.25,new THREE.MeshBasicMaterial({map:signTex}),-8,7.6,22);W.flick.push(sign);
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(9,1.3),new THREE.MeshBasicMaterial({map:textTex("EVERYTHING MUST GO","#ffffff","#c01818",512,96,"bold 54px sans-serif")}));
  banner.position.set(0,4.15,Z1+.45);scene.add(banner);
  const noRef=new THREE.Mesh(new THREE.PlaneGeometry(2,.8),new THREE.MeshBasicMaterial({map:textTex("ALL SALES FINAL","#111","#f2e04a",256,96,"bold 32px sans-serif"),side:THREE.DoubleSide}));
  noRef.position.set(6,1.6,27.4);scene.add(noRef);
  // bunting
  const bc=[0xff3030,0xffdd30,0x30a0ff,0x30d060,0xffffff];
  for(let k=0;k<30;k++){
    const t=k/29,g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([-.25,0,0,.25,0,0,0,-.5,0],3));
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:bc[k%5],side:THREE.DoubleSide}));m.position.set(-26+t*52,4-Math.sin(t*Math.PI)*.8,.2);scene.add(m);
  }
  box(.15,4.2,.15,M(0x555555),-26,2.1,0,{noShadow:true});box(.15,4.2,.15,M(0x555555),26,2.1,0,{noShadow:true});
  // tube man
  const tm=new THREE.Group();tm.position.set(14,0,16);scene.add(tm);let par=tm;
  for(let i=0;i<6;i++){const seg=new THREE.Group();seg.position.y=i?.9:0;par.add(seg);const cy=new THREE.Mesh(new THREE.CylinderGeometry(.32,.36,.9,8),M(i%2?0xff2020:0xffee20));cy.position.y=.45;cy.castShadow=true;seg.add(cy);W.tube.push(seg);par=seg}
  // balloons
  [[-18,-8],[18,-8],[-18,8],[18,8],[-21,-5],[21,5],[-4.5,25.5],[4.5,25.5],[-21,10],[21,-10]].forEach(([bx,bz],i)=>{
    const b=new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),M(bc[i%5],{roughness:.3}));
    b.position.set(bx,3.2,bz);b.userData.b=[bx,3.2,bz,i];scene.add(b);W.balloons.push(b);
    const ln=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,3.2,3),B(0xdddddd));ln.position.set(bx,1.6,bz);scene.add(ln);
  });
  // clutter
  for(let i=0;i<8;i++){const t=new THREE.Mesh(new THREE.TorusGeometry(.35,.14,6,10),M(0x161616));t.rotation.x=Math.PI/2;t.position.set(22+(i%3)*.5,.15+Math.floor(i/3)*.28,-20+(i%2)*.3);t.castShadow=true;scene.add(t)}
  box(2.6,1.4,1.4,M(0x2f5a3a),-22,.7,-20);solid(-23.4,-20.6,-20.8,-19.2);
  [[-24,-24],[-20.5,-24.5]].forEach(([x,z])=>{box(.7,1,.7,M(0x555a60),x,.5,z)});
  for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(.4+Math.random()*.5,14),new THREE.MeshStandardMaterial({color:0x2a3038,roughness:.15,metalness:.2,transparent:true,opacity:.45,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(-20+Math.random()*40,.025,-4+Math.random()*8);scene.add(p)}
  // flag
  box(.1,6,.1,M(0x888888),20,3,20,{noShadow:true});
  const flagGeo=new THREE.PlaneGeometry(2,1.2,10,4),flag=new THREE.Mesh(flagGeo,new THREE.MeshBasicMaterial({map:tex(64,40,(g,w,h)=>{g.fillStyle="#b22234";g.fillRect(0,0,w,h);g.fillStyle="#fff";for(let y=4;y<h;y+=10)g.fillRect(0,y,w,4);g.fillStyle="#3c3b6e";g.fillRect(0,0,26,22)}),side:THREE.DoubleSide}));
  flag.position.set(21,5.2,20);scene.add(flag);W.flag=flag;
  // lamp poles with warm glow at dusk
  [[-25,-22],[25,-22],[-25,22],[25,22]].forEach(([x,z],i)=>{
    box(.18,6,.18,M(0x444444),x,3,z,{noShadow:true});
    const head=box(.9,.2,.5,B(0x555555),x,6.1,z,{noShadow:true});
    if(i%2===0){const pl=new THREE.PointLight(0xffc27a,0,30,1.5);pl.position.set(x,5.8,z);scene.add(pl);lamps.push(pl);glows.push(d=>{pl.intensity=d*22;head.material.color.set(mix(0x555555,0xfff0b0,d))})}
    else glows.push(d=>head.material.color.set(mix(0x555555,0xfff0b0,d)));
  });

  // ---------- post-processing: bloom, grade, vignette, grain, letterbox ----------
  const post={on:true,flash:0,box:0};W.post=post;
  try{
    const gl2=R.capabilities.isWebGL2;
    post.main=new THREE.WebGLRenderTarget(4,4,{samples:gl2?4:0});
    post.a=new THREE.WebGLRenderTarget(4,4,{depthBuffer:false});post.b=new THREE.WebGLRenderTarget(4,4,{depthBuffer:false});
    const vs="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}";
    const sm=(fs,u)=>new THREE.ShaderMaterial({uniforms:u,vertexShader:vs,fragmentShader:fs,depthTest:false,depthWrite:false});
    post.bright=sm("uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));gl_FragColor=vec4(c*smoothstep(th,th+.2,l),1.);}",{t:{value:null},th:{value:.8}});
    post.blur=sm("uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 s=texture2D(t,vUv).rgb*.227;s+=texture2D(t,vUv+dir*1.384).rgb*.316;s+=texture2D(t,vUv-dir*1.384).rgb*.316;s+=texture2D(t,vUv+dir*3.23).rgb*.0703;s+=texture2D(t,vUv-dir*3.23).rgb*.0703;gl_FragColor=vec4(s,1.);}",{t:{value:null},dir:{value:new THREE.Vector2()}});
    post.comp=sm(COMP_FS,{tS:{value:null},tB:{value:null},time:{value:0},bloom:{value:.7},vig:{value:.55},grain:{value:.035},flash:{value:0},box:{value:0},sat:{value:1.08},warm:{value:1},res:{value:new THREE.Vector2(1,1)}});
    post.scene=new THREE.Scene();post.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    post.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),post.comp);post.quad.frustumCulled=false;post.scene.add(post.quad);
  }catch(e){post.on=false}
  W.render=function(){
    if(!post.on){R.setRenderTarget(null);R.render(scene,cam);return}
    try{
      const q=post.quad;
      R.setRenderTarget(post.main);R.render(scene,cam);
      q.material=post.bright;post.bright.uniforms.t.value=post.main.texture;R.setRenderTarget(post.a);R.render(post.scene,post.cam);
      q.material=post.blur;post.blur.uniforms.t.value=post.a.texture;post.blur.uniforms.dir.value.set(1.8/post.a.width,0);R.setRenderTarget(post.b);R.render(post.scene,post.cam);
      post.blur.uniforms.t.value=post.b.texture;post.blur.uniforms.dir.value.set(0,1.8/post.a.height);R.setRenderTarget(post.a);R.render(post.scene,post.cam);
      q.material=post.comp;const u=post.comp.uniforms;u.tS.value=post.main.texture;u.tB.value=post.a.texture;u.time.value=performance.now()/1000%100;u.flash.value=post.flash;u.box.value=post.box;
      R.setRenderTarget(null);R.render(post.scene,post.cam);
    }catch(e){post.on=false;R.setRenderTarget(null);R.render(scene,cam)}
  };

  W.update=function(dt,t){
    W.flick.forEach((m,i)=>{const v=Math.random()<.035?.25:1;m.material.color.setScalar(v)});
    W.tube.forEach((s,i)=>{s.rotation.z=Math.sin(t*3+i*.7)*.28;s.rotation.x=Math.cos(t*2.3+i)*.2});
    W.balloons.forEach(b=>{const u=b.userData.b;b.position.y=u[1]+Math.sin(t*1.5+u[3])*.15;b.position.x=u[0]+Math.sin(t*.9+u[3])*.2});
    const p=W.flag.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin(x*2.2-t*5)*.12*(x+1))}p.needsUpdate=true;
    W.rings.forEach((r,i)=>{r.material.opacity=.35+Math.sin(t*3)*.2;r.scale.setScalar(1+Math.sin(t*3)*.08)});
  };
  W.resize=function(){
    const w=window.innerWidth,h=window.innerHeight;R.setSize(w,h,false);canvas.style.width=w+"px";canvas.style.height=h+"px";cam.aspect=w/h;cam.updateProjectionMatrix();
    if(post.on){const pr=R.getPixelRatio(),pw=Math.floor(w*pr),ph=Math.floor(h*pr);post.main.setSize(pw,ph);post.a.setSize(pw>>1,ph>>1);post.b.setSize(pw>>1,ph>>1);post.comp.uniforms.res.value.set(pw,ph)}
  };
  W.setTime(0);W.setOpen(false);W.setBoard("BARGAIN BOB'S",["Open the lot to start."],"");
  return W;
}
window.World={create,buildCar,person,SPEC};
})();
