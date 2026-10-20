"use strict";
// Builds the 3D world: sky, lot, showroom, props, cars and people.
(function(){
const SLOT_DX=3.2, COL_ORDER=[4,5,3,6,2,7,1,8,0,9], AISLE=.6;
// Three rows of ten. z: the row, stand: where a buyer stands to look, lane: the walking/driving lane in front, rot: car heading.
const ROWS=[{z:-8,stand:-4.6,lane:0,rot:0},{z:8,stand:4.6,lane:0,rot:Math.PI},{z:18,stand:13.4,lane:13,rot:Math.PI}];
const colX=c=>(c-4.5)*SLOT_DX+(c>=5?AISLE:-AISLE);   // a wider center aisle so cars can drive out to the gate
const SKIN=[0xf1c9a5,0xd9a273,0x9c6b43,0x6b4426];
const PAINT=[0x7a2020,0x20406a,0x555a52,0xa8a89a,0x2f5a3a,0x6a5a20,0x3a2a4a,0x8a8a8a,0x1d1d1d,0xa04a20,0x9a9a30,0x3a6a7a];
const slotPos=i=>{const row=i<20?i%2:2,col=COL_ORDER[(i<20?Math.floor(i/2):i-20)%10],R=ROWS[row];return {x:colX(col),z:R.z,row,stand:R.stand,lane:R.lane,rot:R.rot}};
const standZ=i=>slotPos(i).stand;

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
// Shrink the font until the text fits inside the canvas with a margin, so no sign is ever cut off.
function fitFont(g,text,font,maxW){let px=+(font.match(/(\d+)px/)||[0,20])[1];do{g.font=font.replace(/\d+px/,px+"px")}while(g.measureText(text).width>maxW&&--px>6);return px}
function textTex(text,fg,bg,w,h,font){return tex(w,h,g=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;fitFont(g,text,font,w*.9);g.textAlign="center";g.textBaseline="middle";g.fillText(text,w/2,h/2)})}
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
// Merge geometries ({geo, matrix}) into one non-indexed BufferGeometry.
function mergeGeos(list){
  const geos=list.map(({geo,matrix})=>{const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(matrix);return g});
  const merged=new THREE.BufferGeometry();
  ["position","normal","uv"].forEach(k=>{
    const n=geos.reduce((a,g)=>a+g.attributes[k].array.length,0),arr=new Float32Array(n);let o=0;
    geos.forEach(g=>{arr.set(g.attributes[k].array,o);o+=g.attributes[k].array.length});
    merged.setAttribute(k,new THREE.BufferAttribute(arr,k==="uv"?2:3));
  });
  geos.forEach(g=>g.dispose());merged.computeBoundingSphere();return merged;
}
// Merge a group's direct child meshes per material (in the group's space), except the ones in keep.
function mergeChildren(group,keep){
  const by=new Map();
  group.children.slice().forEach(m=>{
    if(!m.isMesh||(keep&&keep.includes(m)))return;
    m.updateMatrix();const e=by.get(m.material)||{list:[],shadow:false};e.list.push({geo:m.geometry,matrix:m.matrix});e.shadow=e.shadow||m.castShadow;by.set(m.material,e);group.remove(m);
  });
  by.forEach((e,mat)=>{const m=new THREE.Mesh(mergeGeos(e.list),mat);m.castShadow=e.shadow;group.add(m)});
}

// Miguel's photo cut out as a face decal.
let faceTexCache=null;
function miguelFaceTex(){
  if(faceTexCache)return faceTexCache;
  const w=256,h=320,c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d"),t=new THREE.CanvasTexture(c);
  const draw=img=>{
    g.clearRect(0,0,w,h);g.fillStyle="#c99b7a";g.fillRect(0,0,w,h);
    if(img){g.save();g.beginPath();g.ellipse(w/2,h/2,w/2-4,h/2-4,0,0,7);g.clip();g.drawImage(img,128,92,210,285,0,0,w,h);g.restore();
      const r=g.createRadialGradient(w/2,h/2,w*.36,w/2,h/2,w*.62);r.addColorStop(0,"rgba(201,155,122,0)");r.addColorStop(1,"rgba(201,155,122,1)");g.fillStyle=r;g.fillRect(0,0,w,h)}
    t.needsUpdate=true;
  };
  const im=new Image();im.onload=()=>draw(im);draw(null);if(window.MIGUEL_IMG)im.src=window.MIGUEL_IMG;
  t.anisotropy=4;return faceTexCache=t;
}

// ---------- people ----------
// Cloth patterns painted on canvas, cached by name+colors.
const patCache={};
function clothTex(kind,c1,c2){
  const key=kind+c1+"_"+c2;if(patCache[key])return patCache[key];
  const hex=c=>"#"+new THREE.Color(c).getHexString();
  const t=tex(256,256,(g,w,h)=>{
    g.fillStyle=hex(c1);g.fillRect(0,0,w,h);
    if(kind==="plaid"){g.globalAlpha=.45;g.fillStyle=hex(c2);for(let i=0;i<w;i+=48){g.fillRect(i,0,18,h);g.fillRect(0,i,w,18)}g.globalAlpha=.25;g.fillStyle="#000";for(let i=24;i<w;i+=48){g.fillRect(i,0,4,h);g.fillRect(0,i,w,4)}}
    if(kind==="stripes"){g.fillStyle=hex(c2);for(let y=0;y<h;y+=32)g.fillRect(0,y,w,13)}
    if(kind==="camo"){const cs=["#4a5a32","#6b6a3e","#2f3a22","#7d7458"];for(let i=0;i<70;i++){g.fillStyle=cs[i%4];g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,14+Math.random()*30,8+Math.random()*18,Math.random()*3,0,7);g.fill()}}
    if(kind==="hawaii"){for(let i=0;i<26;i++){const x=Math.random()*w,y=Math.random()*h;g.fillStyle=hex(c2);for(let k=0;k<5;k++){g.beginPath();g.ellipse(x+Math.cos(k*1.26)*9,y+Math.sin(k*1.26)*9,7,4,k*1.26,0,7);g.fill()}g.fillStyle="#ffe14a";g.beginPath();g.arc(x,y,4,0,7);g.fill()}}
    if(kind==="ball"){g.save();g.translate(w*.5,h*.42);g.fillStyle="#d22";g.beginPath();g.arc(0,0,30,Math.PI,0);g.fill();g.fillStyle="#fff";g.beginPath();g.arc(0,0,30,0,Math.PI);g.fill();g.strokeStyle="#111";g.lineWidth=5;g.beginPath();g.arc(0,0,30,0,7);g.moveTo(-30,0);g.lineTo(30,0);g.stroke();g.fillStyle="#fff";g.beginPath();g.arc(0,0,9,0,7);g.fill();g.stroke();g.restore()}
    if(kind==="thriller"){g.fillStyle="#111";[.38,.56].forEach(x=>{g.beginPath();g.moveTo(w*x,h*.15);g.lineTo(w*(x+.06),h*.15);g.lineTo(w*.5,h*.62);g.closePath();g.fill()});g.fillRect(w*.495,h*.3,w*.01,h*.7)}
    if(kind==="hoodie"){g.fillStyle="rgba(0,0,0,.18)";g.fillRect(w*.4,h*.62,w*.2,h*.16);g.fillStyle="#ddd";g.fillRect(w*.485,h*.12,3,h*.2);g.fillRect(w*.512,h*.12,3,h*.2)}
    for(let i=0;i<500;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.05})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}
  });
  t.wrapS=THREE.RepeatWrapping;t.offset.x=.5;   // canvas middle = the front of a lathe-built torso
  t.colorSpace=THREE.SRGBColorSpace;             // painted colors are sRGB, so they match the flat-colored sleeves
  return patCache[key]=t;
}
// A painted face, wrapped around the whole head (equirectangular). The front of the head is u=.25.
function faceTex(f){
  const w=512,h=256;
  const t=tex(w,h,(g)=>{
    const hex=c=>"#"+new THREE.Color(c).getHexString(),sk=new THREE.Color(f.skin);
    g.fillStyle=hex(f.skin);g.fillRect(0,0,w,h);
    const cx=128,ey=116,ex=29,shade=sk.clone().multiplyScalar(.82),blushC=f.sex==="f"?"rgba(225,90,110,.28)":"rgba(200,90,80,.12)";
    // soft shading: darker toward the back and under the jaw
    let gr=g.createLinearGradient(0,150,0,256);gr.addColorStop(0,"rgba(0,0,0,0)");gr.addColorStop(1,"rgba(0,0,0,.18)");g.fillStyle=gr;g.fillRect(0,150,w,106);
    // stubble / beard shadow
    if(f.stubble){g.fillStyle="rgba(40,30,25,.22)";g.beginPath();g.ellipse(cx,178,50,30,0,0,7);g.fill();g.beginPath();g.ellipse(cx,152,24,7,0,0,7);g.fill()}
    // cheeks
    [-1,1].forEach(s=>{const r=g.createRadialGradient(cx+s*40,148,2,cx+s*40,148,20);r.addColorStop(0,blushC);r.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=r;g.fillRect(cx+s*40-22,126,44,44)});
    // nose shadow and nostrils
    g.fillStyle=`rgba(${shade.r*255|0},${shade.g*255|0},${shade.b*255|0},.7)`;g.beginPath();g.ellipse(cx,138,8,12,0,0,7);g.fill();
    g.fillStyle="rgba(60,30,25,.55)";[-1,1].forEach(s=>{g.beginPath();g.ellipse(cx+s*5,146,2.4,1.6,0,0,7);g.fill()});
    // eyes
    [-1,1].forEach(s=>{
      const x=cx+s*ex;
      if(f.makeup){g.fillStyle=f.makeup;g.globalAlpha=.55;g.beginPath();g.ellipse(x,ey-5,15,9,0,Math.PI,0);g.fill();g.globalAlpha=1}
      g.fillStyle="#fbfaf6";g.beginPath();g.ellipse(x,ey,12,8.5,0,0,7);g.fill();
      g.fillStyle=hex(f.eye);g.beginPath();g.arc(x+s*.5,ey+.5,5.6,0,7);g.fill();
      g.fillStyle="#120c08";g.beginPath();g.arc(x+s*.5,ey+.5,2.8,0,7);g.fill();
      g.fillStyle="#fff";g.beginPath();g.arc(x+s*.5-2,ey-1.8,1.6,0,7);g.fill();
      g.strokeStyle="#2a1810";g.lineWidth=f.sex==="f"?3:2;g.beginPath();g.ellipse(x,ey,12.5,9,0,Math.PI*1.05,Math.PI*1.95);g.stroke();
      if(f.sex==="f"){g.lineWidth=1.6;for(let k=0;k<4;k++){const a=Math.PI*(1.15+k*.22),px=x+Math.cos(a)*12.5,py=ey+Math.sin(a)*9;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a)*4+s*1.2,py+Math.sin(a)*4);g.stroke()}}
      g.strokeStyle="rgba(0,0,0,.18)";g.lineWidth=1.4;g.beginPath();g.ellipse(x,ey+2,11,7,0,.15*Math.PI,.85*Math.PI);g.stroke();
      if(f.age){g.strokeStyle="rgba(70,40,30,.3)";g.lineWidth=1;for(let k=0;k<3;k++){g.beginPath();g.moveTo(x+s*14,ey-3+k*4);g.lineTo(x+s*20,ey-5+k*5);g.stroke()}}
    });
    if(f.age){g.strokeStyle="rgba(70,40,30,.25)";g.lineWidth=1.2;[-1,1].forEach(s=>{g.beginPath();g.moveTo(cx+s*13,148);g.quadraticCurveTo(cx+s*19,160,cx+s*15,168);g.stroke()});for(let k=0;k<2;k++){g.beginPath();g.moveTo(cx-20,92+k*6);g.lineTo(cx+20,92+k*6);g.stroke()}}
    if(f.freckles){g.fillStyle="rgba(140,70,40,.45)";for(let i=0;i<26;i++)g.fillRect(cx-36+Math.random()*72,132+Math.random()*14,2,2)}
    // mouth sits just below the hinge line (y~151); lips for lipstick
    g.fillStyle=f.lips||"rgba(120,50,45,.75)";g.beginPath();g.ellipse(cx,159,15,f.lips?4.5:2.6,0,0,7);g.fill();
    g.strokeStyle="rgba(60,20,20,.6)";g.lineWidth=1.3;g.beginPath();g.moveTo(cx-15,158);g.quadraticCurveTo(cx,161,cx+15,158);g.stroke();
    if(f.mole){g.fillStyle="#3a2018";g.beginPath();g.arc(cx+22,152,1.8,0,7);g.fill()}
  });
  t.colorSpace=THREE.SRGBColorSpace;return t;
}
// The lower and upper halves of the head share one painted face, so give every vertex its global latitude.
function headUV(geo){
  const p=geo.attributes.position,uv=geo.attributes.uv;
  for(let i=0;i<p.count;i++){const y=p.getY(i)/.11;uv.setY(i,1-Math.acos(Math.max(-1,Math.min(1,y)))/Math.PI)}
  uv.needsUpdate=true;return geo;
}
// Build a person. o (all optional): sex m|f, build slim|avg|fat|muscle, height, skin (0-3) or skinColor, eye,
// hair color + hairStyle short|buzz|bald|balding|long|ponytail|bun|bob|curly|afro|slick|messy|mjcurls,
// hat cap|fedora|tinfoil|beanie|boonie|beret (+hatColor; legacy hairStyle "cap"), top tee|shirt|suit|hoodie|dress|jacket|flannel|cardigan|polo|camo|stripes|hawaii|thriller,
// shirt (top color), shirt2 (accent), pants (bottom color), bottom pants|skirt|shorts, tie, bowtie, badge, glasses round|square|sun (true = round),
// beard, goatee, mustache, stubble, lipstick, makeup, age, freckles, chain, glove (one white glove), socks (white), suspenders, face (photo texture), bigHead.
function person(o){
  o=o||{};
  const sex=o.sex||"m",build=o.build||(o.wide?"fat":"avg");
  const B={slim:{w:.86,belly:0,arm:.85},avg:{w:1,belly:0,arm:1},fat:{w:1.28,belly:1,arm:1.2},muscle:{w:1.18,belly:0,arm:1.3}}[build]||{w:1,belly:0,arm:1};
  const g=new THREE.Group(),u={},skinC=o.skinColor||SKIN[(o.skin||0)%4],topC=o.shirt||0x555555,pantsC=o.pants||0x2a2a35,hairC=o.hair==null?0x2a1a10:o.hair;
  const top=o.top||(o.tie?"shirt":"tee"),pattern={flannel:"plaid",camo:"camo",stripes:"stripes",hawaii:"hawaii",thriller:"thriller",hoodie:"hoodie",tee:o.print||null}[top];
  const skin=SM(skinC,{roughness:.55}),shirt=pattern?SM(0xffffff,{map:clothTex(pattern,topC,o.shirt2||0xffffff),roughness:.85}):SM(topC,{roughness:top==="thriller"?.35:.85}),
        sleeve=SM(top==="thriller"?topC:topC,{roughness:.85}),pants=SM(pantsC,{roughness:.9}),hair=SM(hairC,{roughness:.9}),
        shoe=SM(o.shoe||0x1a1714,{roughness:.35}),dark=SM(0x161210,{roughness:.5}),white=SM(0xf4f1ea,{roughness:.4});
  const add=(par,geo,mat,x,y,z,sc,sh)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(sc)m.scale.set(sc[0],sc[1],sc[2]);m.castShadow=sh!==false;par.add(m);return m};
  const cap=(r,l)=>new THREE.CapsuleGeometry(r,l,6,14),sph=(r,a,b)=>new THREE.SphereGeometry(r,a||18,b||14);
  const W=B.w*(sex==="f"?.92:1),dress=top==="dress",skirt=dress||o.bottom==="skirt",shorts=o.bottom==="shorts";
  const legMat=skirt||shorts?skin:pants;
  // legs: hip -> knee -> shoe
  const leg=x=>{
    const hip=new THREE.Group();hip.position.set(x,.93,0);g.add(hip);
    add(hip,cap(.085*Math.min(W,1.2),.3),shorts?pants:legMat,0,-.2,0);
    if(shorts)add(hip,cap(.07,.14),skin,0,-.33,0);
    const knee=new THREE.Group();knee.position.y=-.42;hip.add(knee);
    add(knee,cap(sex==="f"&&skirt?.058:.068,.3),legMat,0,-.2,0);
    if(o.socks)add(knee,new THREE.CylinderGeometry(.06,.06,.08,12),white,0,-.4,0,null,false);
    add(knee,rbox(.11,sex==="f"?.24:.27,.08,.04),shoe,0,-.45,.045,null).rotation.x=-Math.PI/2;
    if(sex==="f"&&skirt)add(knee,new THREE.CylinderGeometry(.012,.01,.07,6),shoe,0,-.45,-.06,null,false);   // heels
    hip.userData.knee=knee;return hip;
  };
  u.legL=leg(-.1*W);u.legR=leg(.1*W);
  // torso: a lathe profile per body type, flattened front to back
  const prof=sex==="f"?[[.15,0],[.16,.05],[.13,.2],[.135,.3],[.17,.4],[.175,.47],[.16,.53],[.13,.58],[.06,.61],[0,.615]]
                      :[[.15,0],[.168,.06],[.16,.18],[.172,.3],[.2,.42],[.205,.48],[.19,.53],[.14,.58],[.06,.61],[0,.615]];
  const pts=prof.map(([r,y])=>new THREE.Vector2(r,y));
  add(g,new THREE.LatheGeometry(pts,28),dress?shirt:shirt,0,.9,0,[W,1,build==="fat"?.78:.64]);
  if(B.belly)add(g,sph(.2),shirt,0,1.07,.07,[1.05*W,1,.95]);                                      // the gut
  if(build==="muscle")add(g,sph(.16),shirt,0,1.33,.04,[1.3,.6,.6]);                             // pecs
  if(sex==="f")[-1,1].forEach(s=>add(g,sph(.05),shirt,s*.06,1.33,.06,[1.1,.9,.75]));
  add(g,sph(.16),skirt&&!dress?pants:dress?shirt:pants,0,.93,0,[(sex==="f"?1.2:1.12)*W,.55,.72]);
  if(skirt){const sk=[[.17,0],[.2,-.12],[.25,-.38],[.26,-.42]].map(([r,y])=>new THREE.Vector2(r,y));add(g,new THREE.LatheGeometry(sk,28),dress?shirt:pants,0,.98,0,[W,1,.8])}
  if(!dress)add(g,new THREE.CylinderGeometry(.163,.163,.04,24),dark,0,.95,0,[W*(B.belly?1.12:1.04),1,B.belly?.82:.66],false);   // belt
  if(o.suspenders)[-1,1].forEach(s=>add(g,BX(.025,.55,.012),SM(o.shirt2||0xa02020),s*.09,1.22,.15*(B.belly?1.35:1),null,false));
  // clothing details
  const fz=(.128+(B.belly?.05:0)+(sex==="f"?.012:0));
  if(top==="suit"||top==="jacket"||top==="cardigan"){const jm=SM(o.shirt2||0x22252c,{roughness:.8});
    [-1,1].forEach(s=>{const l=add(g,BX(.075,.3,.012),jm,s*.068,1.32,fz+.006,null,false);l.rotation.z=s*.32});
    add(g,BX(.05,.2,.01),white,0,1.36,fz,null,false)}
  if(top==="shirt"||top==="polo"||top==="suit")[-1,1].forEach(s=>add(g,BX(.05,.03,.012),top==="suit"?white:shirt,s*.03,1.48,.05,null,false).rotation.z=s*.5);
  if(o.tie){const tie=SM(o.tie,{roughness:.5});add(g,new THREE.ConeGeometry(.032,.3,4),tie,0,1.25,fz,[1,1,.3],false);add(g,sph(.022,8,6),tie,0,1.405,fz-.01,[1,.8,.6],false)}
  if(o.bowtie){const bt=SM(o.bowtie,{roughness:.5});[-1,1].forEach(s=>add(g,new THREE.ConeGeometry(.03,.05,4),bt,s*.025,1.46,.1,null,false).rotation.z=s*Math.PI/2)}
  if(o.chain)add(g,new THREE.TorusGeometry(.07,.006,6,20,Math.PI),SM(0xd8b040,{metalness:1,roughness:.25}),0,1.45,.07,[1,1.2,1],false).rotation.set(Math.PI*.55,0,Math.PI);
  if(top==="hoodie")add(g,new THREE.TorusGeometry(.085,.035,8,16,Math.PI*1.2),shirt,0,1.5,-.06,null).rotation.set(-.3,0,Math.PI*.9);
  add(g,new THREE.TorusGeometry(.06,.016,8,18),shirt,0,1.5,0,null,false).rotation.x=Math.PI/2;
  if(o.badge)add(g,BX(.07,.04,.01),white,.1,1.36,fz,null,false);
  [-1,1].forEach(s=>add(g,sph(.062),sleeve,s*.19*W,1.43,0,[1,.85,.9]));
  // arms: shoulder -> elbow -> hand
  const shortSleeve=["tee","polo","hawaii","dress"].includes(top),ar=B.arm*(sex==="f"?.85:1);
  const arm=s=>{
    const sh=new THREE.Group();sh.position.set(s*.215*W,1.43,0);sh.rotation.z=s*(B.belly?.16:.07);g.add(sh);
    add(sh,cap(.053*ar,.2),shortSleeve?sleeve:sleeve,0,-.14,0);
    const fa=new THREE.Group();fa.position.y=-.29;sh.add(fa);
    add(fa,cap(.046*ar,.18),shortSleeve?skin:sleeve,0,-.12,0);
    add(fa,sph(.045),o.glove&&s>0?white:skin,0,-.28,.005,[.75,1.15,.55]);
    sh.userData.fa=fa;return sh;
  };
  u.armL=arm(-1);u.armR=arm(1);
  add(g,new THREE.CylinderGeometry(.048*(B.belly?1.25:1),.055*(B.belly?1.3:1),.12,16),skin,0,1.53,0);
  if(B.belly)add(g,sph(.07),skin,0,1.52,.03,[1.3,.7,1]);   // double chin
  // head
  const hd=new THREE.Group();hd.position.y=1.665;g.add(hd);u.head=hd;
  hd.scale.setScalar(o.bigHead||1);
  const HS=[.94*(B.belly?1.06:1),1.12,1.02],style=o.hairStyle==="cap"?"short":(o.hairStyle||"short"),hat=o.hat||(o.hairStyle==="cap"?"cap":null);
  // Faces split at the mouth so the top of the head can flap open when they talk (South Park Canadian style).
  const CUT=-.035,cutT=Math.acos(CUT/1.12/.11),hinge=!o.face;
  const tp=hinge?new THREE.Group():hd;if(hinge){tp.position.set(0,CUT,-.1);hd.add(tp);u.top=tp}
  const T=(geo,mat,x,y,z,sc,sh)=>hinge?add(tp,geo,mat,x,y-CUT,z+.1,sc,sh):add(hd,geo,mat,x,y,z,sc,sh);
  const fm=o.face?null:SM(0xffffff,{map:faceTex({skin:skinC,sex,eye:o.eye||pick([0x5a3a20,0x3a2a18,0x3a6a8a,0x4a7a4a]),stubble:o.stubble||o.beard||o.goatee||o.mustache,
     lips:o.lipstick,makeup:o.makeup,age:o.age,freckles:o.freckles,mole:o.mole}),roughness:.55});
  if(hinge){
    T(headUV(new THREE.SphereGeometry(.11,32,16,0,Math.PI*2,0,cutT)),fm,0,0,0,HS);
    add(hd,headUV(new THREE.SphereGeometry(.11,32,10,0,Math.PI*2,cutT,Math.PI-cutT)),fm,0,0,0,HS);
    const inside=SM(0x2a0808,{roughness:1,side:THREE.DoubleSide}),cr=.11*Math.sin(cutT);
    add(hd,new THREE.CircleGeometry(cr,24),inside,0,CUT+.001,0,[HS[0],HS[2],1],false).rotation.x=-Math.PI/2;
    T(new THREE.CircleGeometry(cr,24),inside,0,CUT-.001,0,[HS[0],HS[2],1],false).rotation.x=Math.PI/2;
    const teeth=SM(0xf2efe2,{roughness:.4});
    T(BX(.07,.012,.012),teeth,0,CUT-.007,.09,null,false);add(hd,BX(.06,.01,.012),teeth,0,CUT+.006,.088,null,false);
  }else add(hd,sph(.11,24,18),skin,0,0,0,HS);
  u.brows=[];const browM=SM(style==="bald"||hairC>0x909090?0x3a3028:hairC,{roughness:1});
  [-1,1].forEach(s=>T(sph(.026,10,8),skin,s*.103,0,-.005,[.45,1,.75],false));
  if(o.face){
    const pm=new THREE.MeshStandardMaterial({map:o.face,roughness:.6});
    add(hd,new THREE.SphereGeometry(.1115,24,18,Math.PI/2-.95,1.9,.28,1.95),pm,0,-.004,.002,HS,false);
  }else{
    [-1,1].forEach(s=>{const b=T(rbox(sex==="f"?.04:.045,sex==="f"?.006:.009,.008,.003),browM,s*.04,.049,.101,null,false);b.userData={s,y:b.position.y};u.brows.push(b)});
    T(sph(.012,12,10),skin,0,-.014,.106,[.8,1.15,1],false);   // nose
  }
  u.mouth=null;
  // hair: a cap over the top, sides and back, leaving the face open
  const hs=[.97,1.13,1.05],F=Math.PI/2;   // F: the front of the head (phi)
  const shell=(t0,t1,open)=>new THREE.SphereGeometry(.118,28,14,open?F+open:0,open?Math.PI*2-2*open:Math.PI*2,t0,t1-t0);
  const curls=(r,n,y0,y1,back)=>{for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;if(back&&Math.sin(a)>.3)continue;const y=y0+Math.random()*(y1-y0),rr=r*Math.sqrt(Math.max(.2,1-(y/.13)**2));T(sph(.03+Math.random()*.015,8,6),hair,Math.cos(a)*rr,y,Math.sin(a)*rr*1.05,null,false)}};
  if(style!=="bald"&&style!=="buzz"&&!(hat==="tinfoil"))T(shell(0,style==="balding"?.0001:.9),hair,0,.004,-.006,hs);
  if(style==="buzz")T(shell(0,1.1),SM(hairC,{roughness:1,transparent:true,opacity:.55}),0,.002,-.004,[.955,1.125,1.035],false);
  if(["short","slick","messy","long","ponytail","bun","bob","curly","mjcurls","balding"].includes(style))T(shell(.2,1.55,.75),hair,0,.004,-.006,hs);
  if(style==="slick")T(sph(.1,16,10),hair,0,.07,-.02,[1,.45,1.1],false);
  if(style==="messy")for(let i=0;i<9;i++){const a=i*.7;T(new THREE.ConeGeometry(.02,.06,6),hair,Math.cos(a)*.06,.11,Math.sin(a)*.06-.01,null,false).rotation.set(Math.sin(a)*.6,0,Math.cos(a)*.6)}
  if(style==="long"||style==="mjcurls")add(hd,rbox(.24,.3,.06,.05),hair,0,-.12,-.085);
  if(style==="bob")add(hd,new THREE.SphereGeometry(.125,28,10,F+.75,Math.PI*2-1.5,1.4,.7),hair,0,0,-.004,hs);
  if(style==="ponytail")add(hd,cap(.03,.18),hair,0,-.06,-.135).rotation.x=.35;
  if(style==="bun")T(sph(.055),hair,0,.1,-.08,null);
  if(style==="curly"||style==="mjcurls")curls(.115,style==="mjcurls"?46:30,-.02,.11,true);
  if(style==="afro"){T(sph(.17,20,16),hair,0,.05,-.03,[1,.95,1]);curls(.17,30,-.03,.15,true)}
  if(style==="mohawk")for(let i=0;i<6;i++)T(new THREE.ConeGeometry(.018,.08,6),hair,0,.1+Math.sin(i/5*Math.PI)*.02,.07-i*.035,null,false);
  // hats
  const hm=SM(o.hatColor||o.cap||0x2a4a7a,{roughness:.7});
  if(hat==="cap"){T(new THREE.SphereGeometry(.124,24,10,0,Math.PI*2,0,Math.PI*.42),hm,0,.012,-.004,[.98,1.1,1.05]);T(new THREE.CylinderGeometry(.09,.1,.012,16,1,false,-Math.PI/2,Math.PI),hm,0,.062,.07,null,false)}
  if(hat==="fedora"){T(new THREE.CylinderGeometry(.095,.11,.1,24),hm,0,.12,-.005);T(new THREE.CylinderGeometry(.19,.19,.01,28),hm,0,.075,-.005,[1,1,1.05]);T(new THREE.CylinderGeometry(.111,.111,.022,24),SM(o.hatBand||0xf0f0f0),0,.085,-.005,null,false)}
  if(hat==="tinfoil"){const tf=SM(0xd8dce0,{metalness:1,roughness:.3,flatShading:true});T(new THREE.ConeGeometry(.13,.2,7),tf,0,.15,-.01);T(new THREE.CylinderGeometry(.13,.12,.05,7),tf,0,.055,-.01)}
  if(hat==="beanie"){T(new THREE.SphereGeometry(.126,24,12,0,Math.PI*2,0,Math.PI*.46),hm,0,.02,-.004,[.98,1.12,1.05]);T(sph(.03),hm,0,.16,-.01)}
  if(hat==="boonie"){T(new THREE.CylinderGeometry(.11,.12,.08,20),hm,0,.1,-.005);T(new THREE.CylinderGeometry(.17,.17,.01,24),hm,0,.065,-.005)}
  if(hat==="beret"){T(sph(.13,20,10),hm,.02,.09,-.01,[1.05,.32,1.05]);T(new THREE.CylinderGeometry(.006,.006,.02,6),hm,.02,.13,-.01,null,false)}
  // facial hair
  // a beard wraps the jaw and chin, leaving the mouth area visible
  if(o.beard){add(hd,new THREE.SphereGeometry(.114,24,10,Math.PI*.12,Math.PI*.76,Math.PI*.63,Math.PI*.33),hair,0,0,.004,[.97,1.14,1.07],false);T(rbox(.08,.018,.016,.008),hair,0,-.03,.103,null,false)}
  if(o.goatee)add(hd,sph(.03,12,8),hair,0,-.088,.082,[1,1.25,.6],false);
  if(o.goatee||o.mustache)T(rbox(.075,.016,.016,.008),hair,0,-.03,.103,null,false);
  // glasses
  if(o.glasses){const sun=o.glasses==="sun",gm=SM(sun?0x111111:0x3a3a40,{roughness:.2,metalness:.4});
    if(sun)[-1,1].forEach(s=>T(rbox(.05,.03,.008,.01),SM(0x0a0a0a,{roughness:.05,metalness:.6}),s*.04,.019,.114,null,false));
    else [-1,1].forEach(s=>T(o.glasses==="square"?new THREE.TorusGeometry(.025,.0045,6,4):new THREE.TorusGeometry(.024,.004,8,18),gm,s*.04,.02,.112,null,false).rotation.z=o.glasses==="square"?Math.PI/4:0);
    T(BX(.03,.005,.005),gm,0,.022,.114,null,false)}
  if(o.earrings)[-1,1].forEach(s=>add(hd,sph(.01,8,6),SM(0xe8c040,{metalness:1,roughness:.2}),s*.105,-.035,-.005,null,false));
  // fewer draw calls: merge each rigid part
  mergeChildren(g,[]);[u.legL,u.legR,u.legL.userData.knee,u.legR.userData.knee,u.armL,u.armR,u.armL.userData.fa,u.armR.userData.fa].forEach(p=>mergeChildren(p));
  mergeChildren(hd,u.brows);if(u.top)mergeChildren(u.top,u.brows);
  if(o.height)g.scale.setScalar(o.height);
  u.hipY=.93*(o.height||1);u.sex=sex;u.moonwalk=!!o.moonwalk;
  g.userData=u;return g;
}
const BROWS={neutral:[0,0],happy:[.2,.016],angry:[-.75,-.008],worried:[.6,.006],shocked:[.15,.03],confused:[-.45,-.006,.3,.024]};
function animatePerson(g,moving,t,armsUp,talk){
  if(g.userData.isVRM){if(window.VRMKit)VRMKit.animate(g,moving,t,armsUp,talk);return}
  const u=g.userData,s=moving?Math.sin(t*9)*.6:0;
  if(u.sit&&!moving){   // seated: thighs forward, shins down, hips on the seat
    g.position.y=.6-u.hipY;
    [u.legL,u.legR].forEach((l,i)=>{l.rotation.x=-1.45;l.rotation.z=(i?-1:1)*.06;l.userData.knee.rotation.x=1.45});
  }else{g.position.y=0;u.legL.rotation.z=u.legR.rotation.z=0}
  if(!(u.sit&&!moving)){u.legL.rotation.x=s;u.legR.rotation.x=-s;
  // the knee bends while that leg swings forward (sin falling), straight while it pushes back
  u.legL.userData.knee.rotation.x=moving?Math.max(0,-Math.cos(t*9))*.9:0;u.legR.userData.knee.rotation.x=moving?Math.max(0,Math.cos(t*9))*.9:0;}
  if(armsUp){
    u.armL.rotation.x=-2.7+Math.sin(t*10)*.25;u.armR.rotation.x=-2.7+Math.sin(t*10+1)*.25;
    u.armL.userData.fa.rotation.x=-.3;u.armR.userData.fa.rotation.x=-.3;
  }else if(talk){
    u.armL.rotation.x=-.5+Math.sin(t*3)*.3;u.armR.rotation.x=-.7+Math.sin(t*3.7+1)*.35;
    u.armL.userData.fa.rotation.x=-.9;u.armR.userData.fa.rotation.x=-1.1;
  }else{
    u.armL.rotation.x=moving?-s*.7:Math.sin(t*1.5)*.04;u.armR.rotation.x=moving?s*.7:-Math.sin(t*1.5)*.04;
    u.armL.userData.fa.rotation.x=moving?-.35:-.15;u.armR.userData.fa.rotation.x=moving?-.35:-.15;
  }
  // talking: when the game says so (a line being spoken), or taking turns in a conversation we watch from afar
  const tk=u.talkLeft>0||(talk&&!u.talkLeft&&Math.sin(t*1.6)>.1);
  const flap=tk&&u.top;
  if(u.top)u.top.rotation.x=flap?-Math.abs(Math.sin(t*11))*.6:0;
  u.head.rotation.x=tk&&!flap?Math.sin(t*5)*.06:0;
  if(u.mouth)u.mouth.scale.y=tk&&!flap?.3+Math.abs(Math.sin(t*15))*.9:.3;
  // South Park eyebrows: [tilt of the inner end (+ up), lift] per mood; the confused one is lopsided
  const B=BROWS[u.mood]||BROWS.neutral;
  u.brows.forEach(b=>{const k=b.userData,i=k.s<0?0:1,tilt=B[2]&&i?B[2]:B[0],lift=B[3]!=null&&i?B[3]:B[1];
    b.rotation.z+=((-k.s)*tilt-b.rotation.z)*.2;b.position.y+=(k.y+lift-b.position.y)*.2});
}

// ---------- cars ----------
// Side profiles per body style (meters). L length, W width, belt beltline, hood/trunk heights, nose/tail heights,
// cs/ce where the cabin starts/ends from the back/front, rs/fs rear/front glass run, top roof height.
const SPEC={
  sedan:{L:4.6,W:1.8,belt:.98,hood:.92,trunk:.94,nose:.72,tail:.82,cs:1.05,ce:1.4,rs:.6,fs:.78,top:1.44},
  coupe:{L:4.4,W:1.8,belt:.95,hood:.88,trunk:.92,nose:.68,tail:.8,cs:.95,ce:1.3,rs:.7,fs:.78,top:1.36},
  suv:{L:4.6,W:1.9,belt:1.08,hood:1.0,trunk:1.08,nose:.86,tail:.92,cs:.42,ce:1.28,rs:.16,fs:.62,top:1.74},
  truck:{L:5.3,W:1.9,belt:1.04,hood:1.0,trunk:.84,nose:.84,tail:.84,cs:1.95,ce:1.32,rs:.1,fs:.56,top:1.66,step:true}
};
function ext(shape,w,bev,segs){
  const g=new THREE.ExtrudeGeometry(shape,{depth:w,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:segs||4,curveSegments:16,steps:1});
  g.translate(0,0,-w/2);g.rotateY(-Math.PI/2);return g;   // shape x -> car z (front is +z), extrusion -> car x
}
// The body below the windows, with rounded nose and tail and cut-outs for the wheels.
function lowerShape(o){
  const s=new THREE.Shape(),y0=.3,h=o.L/2,r=.44,wf=h-.98,wr=-h+.98;
  s.moveTo(-h+.15,y0);
  s.quadraticCurveTo(-h,y0,-h,y0+.15);s.lineTo(-h,o.tail-.06);s.quadraticCurveTo(-h,o.tail,-h+.08,o.tail+.04);
  s.quadraticCurveTo(-h+.14,o.trunk,-h+.32,o.trunk);
  if(o.step)s.lineTo(-h+o.cs-.05,o.trunk);
  s.lineTo(-h+o.cs-.1,o.belt-.02);
  s.lineTo(h-o.ce+.05,o.belt-.02);
  s.quadraticCurveTo(h-o.ce+.4,o.hood+.02,h-.55,o.hood);
  s.quadraticCurveTo(h-.08,o.hood-.02,h,o.nose);s.lineTo(h,y0+.15);s.quadraticCurveTo(h,y0,h-.15,y0);
  [wf,wr].forEach(cx=>{s.lineTo(cx+r+.04,y0);s.absarc(cx,y0,r+.04,0,Math.PI,false)});
  s.lineTo(-h+.15,y0);return s;
}
function cabinShape(o){
  const h=o.L/2,s=new THREE.Shape(),x0=-h+o.cs,x1=h-o.ce;
  s.moveTo(x0-.04,o.belt-.04);s.quadraticCurveTo(x0+o.rs*.5,o.top-.02,x0+o.rs+.08,o.top);
  s.lineTo(x1-o.fs-.06,o.top);s.quadraticCurveTo(x1-o.fs*.35,o.top-.03,x1+.04,o.belt-.04);s.lineTo(x0-.04,o.belt-.04);return s;
}
// Side window outline: the cabin shrunk inward, split by the B pillar.
function sideWindows(o){
  const h=o.L/2,x0=-h+o.cs,x1=h-o.ce,b=o.belt+.05,t=o.top-.07,mid=(x0+o.rs+x1-o.fs)/2,out=[];
  const w=(a,c,d,e)=>{const s=new THREE.Shape();s.moveTo(a,b);s.lineTo(c,t);s.lineTo(d,t);s.lineTo(e,b);s.lineTo(a,b);out.push(s)};
  w(x0+.14,x0+o.rs+.12,mid-.06,mid-.06);w(mid+.06,mid+.06,x1-o.fs-.04,x1-.16);return out;
}
function priceCanvas(price){
  const c=document.createElement("canvas");c.width=128;c.height=80;const g=c.getContext("2d");
  g.fillStyle="#f4f1e0";g.fillRect(0,0,128,80);g.strokeStyle="#c33";g.fillStyle="#c33";g.lineWidth=3;
  g.font="bold 34px 'Comic Sans MS',cursive,sans-serif";g.textAlign="center";
  g.save();g.translate(64,38);g.rotate(-.08);g.fillText("$"+Math.round(price).toLocaleString(),0,0);g.restore();
  g.font="bold 20px sans-serif";g.fillText("AS-IS",64,68);g.beginPath();g.moveTo(14,48);g.lineTo(114,44);g.stroke();
  return c;
}
// Shared car materials. The environment map is a little sky so paint, glass and chrome have something to reflect.
const CM={};
function carMats(){
  if(CM.chrome)return CM;
  const env=CM.env=W0.carEnv;
  Object.assign(CM,{
    chrome:new THREE.MeshStandardMaterial({color:0xe8ecf0,metalness:1,roughness:.12,envMap:env}),
    steel:new THREE.MeshStandardMaterial({color:0x9aa0a6,metalness:.8,roughness:.4,envMap:env}),
    rubber:new THREE.MeshStandardMaterial({color:0x151515,roughness:.92}),
    plastic:new THREE.MeshStandardMaterial({color:0x1d1e20,roughness:.6}),
    glass:new THREE.MeshPhysicalMaterial({color:0x18242e,metalness:.1,roughness:.04,envMap:env,envMapIntensity:1.4,clearcoat:1}),
    well:new THREE.MeshBasicMaterial({color:0x060606,side:THREE.DoubleSide}),
    head:new THREE.MeshStandardMaterial({color:0xf8f4e0,emissive:0x8a8670,roughness:.1,metalness:.2,envMap:env}),
    tail:new THREE.MeshStandardMaterial({color:0xc01818,emissive:0x500808,roughness:.15,envMap:env}),
    tailDead:new THREE.MeshStandardMaterial({color:0x401010,roughness:.4}),
    amber:new THREE.MeshStandardMaterial({color:0xffa030,emissive:0x5a3000,roughness:.2}),
    plate:new THREE.MeshStandardMaterial({color:0xece8d8,roughness:.6}),
    rust:new THREE.MeshStandardMaterial({color:0x4a2a16,roughness:1,transparent:true,opacity:.8,polygonOffset:true,polygonOffsetFactor:-2}),
    shadow:new THREE.MeshBasicMaterial({map:tex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,4,32,32,32);r.addColorStop(0,"rgba(0,0,0,.6)");r.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=r;g.fillRect(0,0,w,h)}),transparent:true,depthWrite:false})
  });
  return CM;
}
let W0={};   // set in create(): holds the car environment map
function wheel(g,M2,x,y,z,r,c,side,chromeRims){
  const w=new THREE.Group();w.position.set(x,y,z);g.add(w);
  const tire=new THREE.Mesh(new THREE.TorusGeometry(r-.075,.085,12,28),M2.rubber);tire.rotation.y=Math.PI/2;tire.scale.z=1.35;w.add(tire);
  const face=new THREE.Mesh(new THREE.CylinderGeometry(r-.08,r-.08,.2,28),M2.rubber);face.rotation.z=Math.PI/2;w.add(face);
  const rimM=chromeRims?M2.chrome:c.cond<45?M2.plastic:M2.steel,rr=chromeRims?r-.07:r-.12;
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(rr,rr,.03,24),rimM);disc.rotation.z=Math.PI/2;disc.position.x=side*.105;w.add(disc);
  const n=chromeRims?6:5;
  for(let i=0;i<n;i++){const sp=new THREE.Mesh(new THREE.BoxGeometry(.02,rr*1.7,.045),chromeRims?M2.chrome:M2.steel);sp.rotation.x=i*Math.PI/n;sp.position.x=side*.118;w.add(sp)}
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.04,16),chromeRims?M2.chrome:M2.steel);hub.rotation.z=Math.PI/2;hub.position.x=side*.125;w.add(hub);
  w.traverse(m=>{if(m.isMesh)m.castShadow=true});
  return w;
}
function buildCar(c){
  const o=SPEC[c.body],g=new THREE.Group(),h=o.L/2,F=h+.07,SW=o.W/2,M2=carMats(),feats=c.feats||[];
  const col=PAINT[(c.id*7+c.year)%PAINT.length],wear=Math.max(0,(70-c.cond)/70);
  const paint=new THREE.MeshPhysicalMaterial({color:col,metalness:.45,roughness:.3+wear*.4,clearcoat:1-wear,clearcoatRoughness:.08+wear*.4,envMap:M2.env,envMapIntensity:1.1-wear*.6});
  const add=(geo,mat,x,y,z,sh)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=sh!==false;g.add(m);return m};
  const rb=(w,hh,d,r,mat,x,y,z,sh)=>add(rbox(w,hh,d,r),mat,x,y,z,sh);
  // body and cabin
  add(ext(lowerShape(o),o.W-.14,.07,5),paint,0,0,0);
  add(ext(cabinShape(o),o.W-.34,.05,4),paint,0,0,0);
  // glass: side windows just outside the cabin, windshield and rear window on the slopes
  const cw=(o.W-.34)/2+.05+.004;
  sideWindows(o).forEach(s=>{[-1,1].forEach(sx=>{const m=add(new THREE.ShapeGeometry(s),M2.glass,sx*cw,0,0,false);m.rotation.y=sx>0?Math.PI/2:-Math.PI/2})});
  const x1=h-o.ce,x0=-h+o.cs,dy=o.top-o.belt;
  const glassSlope=(run,zc,front)=>{const len=Math.hypot(run,dy),m=add(new THREE.PlaneGeometry(o.W-.48,len*.86),M2.glass,0,(o.belt+o.top)/2+.01,zc,false);
    m.rotation.order="YXZ";m.rotation.y=front?0:Math.PI;m.rotation.x=-Math.atan2(run,dy);m.position.z+=front?.045:-.045;return m};
  glassSlope(o.fs,x1-o.fs/2+.02,true);glassSlope(o.rs,x0+o.rs/2-.02,false);
  // wheel wells and wheels
  const flat=c.cond<30?(c.id%4):-1;
  [[1,h-.98],[-1,h-.98],[1,-h+.98],[-1,-h+.98]].forEach(([sx,z],i)=>{
    const well=add(new THREE.CylinderGeometry(.47,.47,o.W-.2,20,1,true,0,Math.PI),M2.well,0,.3,z,false);well.rotation.z=Math.PI/2;well.rotation.x=Math.PI;
    const dead=i===flat,r=.36;
    wheel(g,M2,sx*(o.W/2-.13),dead?.3:r,z,r,c,sx,feats.includes("rims")).scale.y=dead?.82:1;
  });
  // front: lights, grille, bumper; back: tail lights, bumper, plate
  [-1,1].forEach(sx=>{
    rb(.36,.13,.06,.03,M2.head,sx*(SW-.32),o.nose-.1,F,false);
    rb(.1,.06,.05,.02,M2.amber,sx*(SW-.1),o.nose-.14,F-.01,false);
    rb(.3,.14,.06,.03,c.cond<40&&sx>0?M2.tailDead:M2.tail,sx*(SW-.26),o.tail-.08,-F,false);
  });
  rb(o.W*.42,.15,.05,.03,M2.plastic,0,o.nose-.12,F+.005,false);
  for(let i=0;i<3;i++)rb(o.W*.4,.012,.02,.006,M2.chrome,0,o.nose-.17+i*.05,F+.03,false);
  const oldChrome=c.year<2003;
  g.userData.bumper=rb(o.W-.1,.16,.18,.07,oldChrome?M2.chrome:M2.plastic,0,.42,F);
  rb(o.W-.1,.16,.18,.07,oldChrome?M2.chrome:M2.plastic,0,.42,-F);
  rb(.5,.12,.015,.01,M2.plate,0,.58,-F-.01,false);rb(.42,.1,.015,.01,M2.plate,0,.45,F+.1,false);
  // doors: seams and handles; mirrors
  const mid=(x0+o.rs+x1-o.fs)/2,doors=c.body==="coupe"||c.body==="truck"?[x1-.05,mid]:[x1-.05,mid,x0+.2];
  [-1,1].forEach(sx=>{
    doors.forEach(z=>add(new THREE.BoxGeometry(.004,o.belt-.42,.012),M2.plastic,sx*(SW+.002),(o.belt+.4)/2,z,false));
    [mid+.35,mid-.4].slice(0,doors.length-1).forEach(z=>rb(.02,.03,.14,.01,M2.chrome,sx*(SW+.012),o.belt-.12,z,false));
    const mr=rb(.06,.11,.17,.03,paint,sx*(SW+.05),o.belt+.08,x1-.15);
    rb(.004,.08,.13,.01,M2.glass,sx*(SW+.082),o.belt+.08,x1-.15,false);
    if(c.cond>55)rb(.006,.03,o.L-1.2,.01,M2.chrome,sx*(SW+.004),.62,0,false);   // trim strip on the nicer cars
  });
  // roof: sunroof glass, roof rails on SUVs
  const rx0=x0+o.rs+.1,rx1=x1-o.fs-.1;
  if(feats.includes("sunroof"))rb(o.W*.4,.012,Math.min(.75,rx1-rx0-.1),.02,M2.glass,0,o.top+.05,(rx0+rx1)/2,false);
  if(c.body==="suv")[-1,1].forEach(sx=>rb(.04,.04,rx1-rx0,.015,M2.steel,sx*(o.W/2-.28),o.top+.07,(rx0+rx1)/2,false));
  if(feats.includes("tow"))rb(.08,.08,.22,.02,M2.steel,0,.36,-F-.1,false);
  // truck bed
  if(c.body==="truck"){
    const bl=o.cs-.15,bz=-h+bl/2+.08;
    [-1,1].forEach(sx=>rb(.07,.38,bl,.03,paint,sx*(o.W/2-.1),o.trunk+.15,bz));
    rb(o.W-.16,.38,.07,.03,paint,0,o.trunk+.15,-h+.12);rb(o.W-.16,.38,.07,.03,paint,0,o.trunk+.15,-h+bl+.04);
    add(new THREE.BoxGeometry(o.W-.3,.02,bl-.1),M2.plastic,0,o.trunk-.02,bz,false);
  }
  // wear and tear: rust patches, a mismatched door, a burnt hood
  const rn=Math.max(0,Math.round((70-c.cond)/14));
  for(let i=0;i<rn;i++){const sx=i%2?1:-1,m=add(new THREE.CircleGeometry(.06+Math.random()*.08,7),M2.rust,sx*(SW+.003),.45+Math.random()*.3,(Math.random()-.5)*(o.L-1.8),false);m.rotation.y=sx*Math.PI/2;m.scale.x=1.6}
  if(c.cond<60||c.id%3===0){const dm=new THREE.MeshPhysicalMaterial({color:PAINT[(c.id*3+5)%PAINT.length],roughness:.6,metalness:.2,polygonOffset:true,polygonOffsetFactor:-2});
    const sx=c.id%2?1:-1,m=add(new THREE.PlaneGeometry(.95,o.belt-.5),dm,sx*(SW+.004),(o.belt+.42)/2,mid+.4,false);m.rotation.y=sx*Math.PI/2}
  if(c.cond<40){const m=add(new THREE.CircleGeometry(.35,16),new THREE.MeshStandardMaterial({color:0x141414,roughness:1,polygonOffset:true,polygonOffsetFactor:-2}),0,o.hood+.075,h-1.0,false);m.rotation.x=-Math.PI/2;m.scale.y=.7}
  // soft contact shadow
  const sh=add(new THREE.PlaneGeometry(o.W+.6,o.L+.5),M2.shadow,0,.015,0,false);sh.rotation.x=-Math.PI/2;sh.renderOrder=-1;
  // windshield price paper (scrawled with a grease pencil)
  const fx=o.fs,len=Math.hypot(fx,dy),t=new THREE.CanvasTexture(priceCanvas(c.price));
  const pm=new THREE.Mesh(new THREE.PlaneGeometry(.62,.38),new THREE.MeshBasicMaterial({map:t}));
  pm.position.set(.35,(o.belt+o.top)/2+.07*(fx/len),x1-fx/2+.09*(dy/len));pm.rotation.x=-Math.atan2(fx,dy);g.add(pm);
  // fewer draw calls: merge everything static per material (the bumper can fall off, the tag gets rewritten)
  g.updateMatrixWorld(true);
  g.children.filter(m=>m.isGroup).forEach(w=>{w.updateMatrix();w.children.slice().forEach(m=>{m.applyMatrix4(w.matrix);g.add(m)});g.remove(w)});
  const bumper=g.userData.bumper;
  mergeChildren(g,[bumper,pm,sh]);
  g.traverse(m=>{if(m.isMesh)m.receiveShadow=false});
  g.userData={tagTex:t,tagCanvas:t.image,price:c.price,len:o.L,bumper};
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
// Reception counter: the front faces the showroom (-z), the receptionist stands behind it (+z side).
function makeReception(){
  const F=furnMats(),g=new THREE.Group(),front=SM(0x2e3440,{roughness:.5});
  part(g,rbox(2.2,1.02,.5,.04),front,0,.51,0);
  part(g,rbox(2.36,.05,.64,.02),F.wood,0,1.045,0);
  part(g,rbox(2.24,.04,.08,.02),F.chrome,0,.06,-.24,{noShadow:true});
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.26),new THREE.MeshBasicMaterial({map:textTex("RECEPTION","#ffd24a","#2e3440",512,96,"bold 64px sans-serif")}));
  sign.position.set(0,.74,-.253);sign.rotation.y=Math.PI;g.add(sign);
  // monitor facing her, a bell for impatient customers, a dish of mints nobody touches
  part(g,new THREE.BoxGeometry(.52,.32,.03),F.black,.45,1.3,.08);part(g,new THREE.BoxGeometry(.05,.18,.04),F.plastic,.45,1.15,.1);
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(.48,.28),F.screen);scr.position.set(.45,1.3,.097);g.add(scr);
  part(g,new THREE.BoxGeometry(.4,.02,.13),F.keys,.45,1.08,.2,{noShadow:true});
  part(g,new THREE.SphereGeometry(.05,12,8,0,Math.PI*2,0,Math.PI/2),F.chrome,-.6,1.07,-.15);
  part(g,new THREE.CylinderGeometry(.08,.05,.04,14),SM(0xbfd8e8,{roughness:.1,transparent:true,opacity:.6}),-.25,1.09,-.18);
  return g;
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
// Three-seat vinyl sofa with rolled arms and a throw pillow. Sitters face local +z.
function makeSofa(){
  const F=furnMats(),g=new THREE.Group(),vin=SM(0x7a2e2a,{roughness:.45}),pil=SM(0xd8b35a,{roughness:.9});
  part(g,rbox(2.0,.78,.22,.06),vin,0,.24,0,{rx:-Math.PI/2});                     // base
  for(let i=-1;i<=1;i++)part(g,rbox(.62,.66,.14,.07),vin,i*.64,.41,.06,{rx:-Math.PI/2});   // seat cushions
  for(let i=-1;i<=1;i++)part(g,rbox(.62,.5,.16,.08),vin,i*.64,.72,-.3,{rx:-.18});         // back cushions
  part(g,rbox(2.0,.62,.14,.06),vin,0,.62,-.4);                                    // back frame
  [-1,1].forEach(s=>{part(g,rbox(.16,.42,.82,.07),vin,s*1.06,.36,-.02);
    part(g,new THREE.CylinderGeometry(.1,.1,.84,16),vin,s*1.06,.58,-.02,{rx:Math.PI/2})});           // rolled arms
  [[-.95,.32],[.95,.32],[-.95,-.36],[.95,-.36]].forEach(([x,z])=>part(g,new THREE.CylinderGeometry(.025,.02,.12,8),F.black,x,.06,z,{noShadow:true}));
  part(g,rbox(.36,.34,.12,.08),pil,-.62,.68,-.16,{rx:-.3}).rotation.z=.2;
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
  group.traverse(m=>{if(!m.isMesh)return;const e=by.get(m.material)||{list:[],shadow:false};e.list.push({geo:m.geometry,matrix:m.matrixWorld});e.shadow=e.shadow||m.castShadow;by.set(m.material,e)});
  const out=[];
  by.forEach((e,mat)=>{const m=new THREE.Mesh(mergeGeos(e.list),mat);m.castShadow=e.shadow;m.receiveShadow=true;m.matrixAutoUpdate=false;out.push(m)});
  return out;
}

function create(canvas){
  const R=new THREE.WebGLRenderer({canvas,antialias:true});
  R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  R.shadowMap.enabled=true;
  // A tiny sky for cars to reflect: blue overhead, bright horizon, dark ground, and a hot sun.
  { const pm=new THREE.PMREMGenerator(R),es=new THREE.Scene(),sg=new THREE.SphereGeometry(10,32,16),cols=[],p=sg.attributes.position,c=new THREE.Color();
    for(let i=0;i<p.count;i++){const y=p.getY(i)/10;if(y>0)c.setHex(0x5a8fd8).lerp(new THREE.Color(0xe8f0f6),Math.pow(1-y,3));else c.setHex(0x55554c).lerp(new THREE.Color(0x9a9a90),Math.pow(1+y,6));cols.push(c.r,c.g,c.b)}
    sg.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
    es.add(new THREE.Mesh(sg,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide})));
    const sunM=new THREE.MeshBasicMaterial();sunM.color.setRGB(9,8.5,7);const sun=new THREE.Mesh(new THREE.SphereGeometry(.7,12,8),sunM);sun.position.set(-5,7,3);es.add(sun);
    W0.carEnv=pm.fromScene(es,.02).texture;pm.dispose(); }R.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(72,1,.05,260);
  scene.fog=new THREE.Fog(0xcfe6fb,45,190);
  const W={R,scene,cam,colliders:[],flick:[],tube:[],balloons:[],slotPos,standZ,buildCar,updateTag,person,animatePerson,sprite,miguelFaceTex,
           desks:[-8,-4.8,-1.6,1.6,4.8,8],pc:{x:-7.5,z:-23.2},sw:{x:2.3,z:-15.2},bound:{x0:-27,x1:27,z0:-26.5,z1:26}};
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
  // [time, sky top, horizon, light]: a clear blue morning into a warm sunset
  const KEYS=[[0,0x3d7fd6,0xbfdcf2,1],[.5,0x2f78e0,0xcfe6fb,1.05],[.8,0x4a74c9,0xf3d6a8,.85],[1,0x2c2f6e,0xf08a55,.5]];
  W.setTime=function(p){
    p=Math.max(0,Math.min(1,p));let a=KEYS[0],b=KEYS[1];
    for(let i=0;i<KEYS.length-1;i++)if(p>=KEYS[i][0]&&p<=KEYS[i+1][0]){a=KEYS[i];b=KEYS[i+1]}
    const k=(p-a[0])/Math.max(.001,b[0]-a[0]),rn=W.rainAmt||0,grey=new THREE.Color(0x6c7480);
    const top=mix(a[1],b[1],k).lerp(grey,rn*.75),hor=mix(a[2],b[2],k).lerp(grey,rn*.6),pow=(a[3]+(b[3]-a[3])*k)*(1-rn*.4);
    W.lastTime=p;
    const pos=skyGeo.attributes.position,arr=skyGeo.attributes.color.array;
    for(let i=0;i<pos.count;i++){const t=Math.max(0,pos.getY(i)/150),c=hor.clone().lerp(top,Math.pow(t,.6));arr[i*3]=c.r;arr[i*3+1]=c.g;arr[i*3+2]=c.b}
    skyGeo.attributes.color.needsUpdate=true;
    scene.fog.color.copy(hor);scene.background=hor;
    hemi.intensity=1.7*pow;sun.intensity=1.4*pow;sun.color.set(mix(0xfff6e0,0xff9a50,Math.max(0,(p-.55)/.45)));
    sun.position.set(-24+p*30,38-p*18,14);
    const dusk=Math.max(0,Math.min(1,(p-.55)/.4));
    glows.forEach(f=>f(dusk));
    sunDisc.position.copy(sun.position).normalize().multiplyScalar(140);sunDisc.material.color.set(mix(0xfff8e0,0xffa060,dusk));
    cloudMats.forEach(m=>m.color.set(mix(0xffffff,0xffc4a0,dusk)).lerp(new THREE.Color(0x707884),rn*.8));
  };
  // Rain: streaks that fall in a box around the camera; the sky greys out while it lasts.
  const RN=1400,rainGeo=new THREE.BufferGeometry(),rp=new Float32Array(RN*6);
  for(let i=0;i<RN;i++){const x=(Math.random()-.5)*44,y=Math.random()*16,z=(Math.random()-.5)*44;rp.set([x,y,z,x+.03,y-.55,z],i*6)}
  rainGeo.setAttribute("position",new THREE.BufferAttribute(rp,3));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xaab8c8,transparent:true,opacity:.55}));rain.visible=false;rain.frustumCulled=false;scene.add(rain);
  W.setRain=function(a){W.rainAmt=a;rain.visible=a>.05;rain.material.opacity=.55*a;if(W.lastTime!=null)W.setTime(W.lastTime)};

  // sun and clouds
  const sunDisc=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(128,128,(g,w,h)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,"rgba(255,255,240,1)");r.addColorStop(.25,"rgba(255,250,220,1)");r.addColorStop(.4,"rgba(255,230,160,.35)");r.addColorStop(1,"rgba(255,220,150,0)");g.fillStyle=r;g.fillRect(0,0,w,h)}),fog:false,depthWrite:false,transparent:true}));
  sunDisc.scale.set(26,26,1);scene.add(sunDisc);
  const cloudTex=seed=>tex(256,128,(g,w,h)=>{
    for(let i=0;i<9;i++){const r=20+Math.random()*20,x=r+8+Math.random()*(240-2*r-16),y=Math.max(r+4,Math.min(124-r,60+Math.random()*24-(i%3)*8));
      const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,"rgba(255,255,255,.95)");gr.addColorStop(.6,"rgba(255,255,255,.75)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,w,h)}
    g.globalCompositeOperation="source-atop";const sh=g.createLinearGradient(0,40,0,h);sh.addColorStop(0,"rgba(0,0,0,0)");sh.addColorStop(1,"rgba(120,140,170,.35)");g.fillStyle=sh;g.fillRect(0,0,w,h);
  });
  const cloudMats=[0,1,2].map(i=>new THREE.SpriteMaterial({map:cloudTex(i),fog:false,depthWrite:false,transparent:true}));
  const clouds=new THREE.Group();scene.add(clouds);W.clouds=clouds;
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2+Math.random()*.3,r=95+Math.random()*45,c=new THREE.Sprite(cloudMats[i%3]);
    const sc=28+Math.random()*30;c.scale.set(sc,sc*.5,1);c.position.set(Math.cos(a)*r,30+Math.random()*28,Math.sin(a)*r);clouds.add(c)}

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
  ROWS.forEach(R=>{for(let c=0;c<=10;c++)[-1,1].forEach(side=>{if((side<0&&c>5)||(side>0&&c<5))return;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(.08,4.6),lm);m.rotation.x=-Math.PI/2;m.position.set((c-5)*SLOT_DX+side*AISLE,.02,R.z);scene.add(m)})});
  // fence with a gate opening
  const fm=new THREE.MeshBasicMaterial({map:fenceTex(),transparent:true,side:THREE.DoubleSide,depthWrite:false}),postM=M(0x666a70);
  const fence=(cx,cz,len,rot)=>{
    const f=new THREE.Mesh(new THREE.PlaneGeometry(len,2.4),fm);f.position.set(cx,1.2,cz);if(rot)f.rotation.y=Math.PI/2;scene.add(f);
    for(let k=0;k<=len;k+=7){box(.12,2.5,.12,postM,rot?cx:cx-len/2+k,1.25,rot?cz-len/2+k:cz,{noShadow:true})}
  };
  fence(-15.5,27.5,25,0);fence(15.5,27.5,25,0);fence(0,-27.5,56,0);fence(-28,0,55,1);fence(28,0,55,1);
  box(.4,3.2,.4,postM,-3,1.6,27.5);box(.4,3.2,.4,postM,3,1.6,27.5);

  // Miguel's pistol, held in view; hidden until he needs it
  scene.add(cam);
  { const gm=SM(0x1d1f22,{metalness:.7,roughness:.35}),grip=SM(0x3a2a20,{roughness:.8}),g=new THREE.Group();
    const p=(geo,m,x,y,z,rx)=>{const k=new THREE.Mesh(geo,m);k.position.set(x,y,z);if(rx)k.rotation.x=rx;g.add(k);return k};
    p(BX(.034,.034,.19),gm,0,0,-.06);p(new THREE.CylinderGeometry(.008,.008,.03,10),gm,0,.004,-.165,Math.PI/2);
    p(BX(.03,.11,.045),grip,0,-.065,.01,-.25);p(new THREE.TorusGeometry(.018,.004,6,12,Math.PI),gm,0,-.022,-.03).rotation.set(0,Math.PI/2,Math.PI);
    p(BX(.006,.008,.01),gm,0,.021,-.14);
    g.position.set(.15,-.5,-.46);g.rotation.y=.04;g.scale.setScalar(.85);g.visible=false;cam.add(g);W.gun=g; }

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
    // reception, just inside the door on the left; the receptionist stands between it and the front wall
    const rc=makeReception();rc.position.set(-7.5,0,-14.95);furn.add(rc);solid(-8.7,-6.3,-15.3,-14);W.reception={x:-7.5,z:-14.45};
    bakeStatic(furn).forEach(m=>scene.add(m)); }
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(.7,.4),new THREE.MeshBasicMaterial({map:textTex("PRICES  ·  CREW  ·  BOOKS","#6fff9a","#06140c",256,128,"bold 15px monospace")}));
  screen.position.set(-7.5,1.2,-25.26);scene.add(screen);W.pcScreen=screen;
  const pcLight=new THREE.PointLight(0x66ff99,1.2,5);pcLight.position.set(-7.5,1.3,-24.4);scene.add(pcLight);
  box(.6,.15,.03,B(0xffffff),-8.55,.835,-24.55,{noShadow:true}).material=new THREE.MeshBasicMaterial({map:textTex("MANAGER","#222","#e8e0c0",128,32,"bold 18px sans-serif")});
  box(.7,.7,.7,M(0x5a5a5a),-9.4,.35,-26.4);solid(-9.75,-9.05,-26.75,-26.05); // filing cabinet
  // water cooler, plants, sofa
  box(.5,1.1,.5,M(0x88aacc),8,.55,-25);solid(7.7,8.3,-25.3,-24.7);
  [[9.2,-15],[-9.2,-15],[9.2,-26]].forEach(([x,z])=>{box(.4,.4,.4,M(0x6a3a22),x,.2,z);const lf=new THREE.Mesh(new THREE.SphereGeometry(.45,7,6),M(0x2e5a2a));lf.position.set(x,.8,z);lf.castShadow=true;scene.add(lf)});
  { const sofa=makeSofa();sofa.position.set(6.4,0,-16.2);sofa.rotation.y=Math.PI;scene.add(sofa);solid(5.3,7.5,-16.7,-15.7); }
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
  box(2.4,1.2,.05,B(0xffffff),-2,1.9,Z0+.2,{noShadow:true}).material=new THREE.MeshBasicMaterial({map:tex(512,256,(g,w,h)=>{g.fillStyle="#b01010";g.fillRect(0,0,w,h);g.strokeStyle="#ffdd00";g.lineWidth=8;g.strokeRect(10,10,w-20,h-20);
    g.fillStyle="#ffdd00";g.textAlign="center";g.textBaseline="middle";fitFont(g,"EVERYBODY!!","bold 80px sans-serif",w-60);g.fillText("WE FINANCE",w/2,h*.34);g.fillText("EVERYBODY!!",w/2,h*.68)})});
  // OPEN sign + switch
  const openTex=textTex("CLOSED","#ff4040","#120505",256,96,"bold 54px sans-serif");
  const openSign=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.52),new THREE.MeshBasicMaterial({map:openTex}));openSign.position.set(0,2.75,Z1-.3);openSign.rotation.y=Math.PI;scene.add(openSign);
  W.setOpen=function(open){
    const g=openTex.userData.g;g.fillStyle="#120505";g.fillRect(0,0,256,96);g.fillStyle=open?"#40ff70":"#ff4040";fitFont(g,open?"OPEN":"CLOSED","bold 54px sans-serif",230);g.textAlign="center";g.textBaseline="middle";g.fillText(open?"OPEN":"CLOSED",128,48);openTex.needsUpdate=true;
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
    g.textAlign="center";
    g.fillStyle="#ffcc00";fitFont(g,"BARGAIN BOB'S","bold 54px sans-serif",w-60);g.fillText("BARGAIN BOB'S",w/2,90);
    g.fillStyle="#ff4040";fitFont(g,"AUTO MART","bold 46px sans-serif",w-60);g.fillText("AUTO MART",w/2,150);
    g.fillStyle="#fff";fitFont(g,"NO CREDIT? NO PROBLEM!","bold 28px sans-serif",w-60);g.fillText("NO CREDIT? NO PROBLEM!",w/2,212);
  });
  const sign=box(5,2.5,.25,new THREE.MeshBasicMaterial({map:signTex}),-8,7.6,22);W.flick.push(sign);
  // vinyl banner: hemmed border, grommets, text sized to fit
  const bannerTex=tex(1024,148,(g,w,h)=>{
    g.fillStyle="#c01818";g.fillRect(0,0,w,h);
    g.strokeStyle="#f4f4f4";g.lineWidth=6;g.strokeRect(10,10,w-20,h-20);
    g.fillStyle="rgba(0,0,0,.12)";for(let x=0;x<w;x+=64)g.fillRect(x,0,2,h);
    [[24,24],[w-24,24],[24,h-24],[w-24,h-24],[w/2,24],[w/2,h-24]].forEach(([x,y])=>{g.fillStyle="#bbb";g.beginPath();g.arc(x,y,8,0,7);g.fill();g.fillStyle="#444";g.beginPath();g.arc(x,y,4,0,7);g.fill()});
    g.textAlign="center";g.textBaseline="middle";fitFont(g,"EVERYTHING MUST GO!","900 96px Impact,'Arial Black',sans-serif",w-110);
    g.fillStyle="rgba(0,0,0,.35)";g.fillText("EVERYTHING MUST GO!",w/2+4,h/2+6);g.fillStyle="#fff";g.fillText("EVERYTHING MUST GO!",w/2,h/2+2);
  });
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(9,1.3),new THREE.MeshBasicMaterial({map:bannerTex}));
  banner.position.set(0,4.15,Z1+.45);scene.add(banner);
  // two-sided, so it reads right from the road and from the lot
  const noRefM=new THREE.MeshBasicMaterial({map:textTex("ALL SALES FINAL","#111","#f2e04a",256,96,"bold 32px sans-serif")});
  [0,Math.PI].forEach(r=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(2,.8),noRefM);m.position.set(6,1.6,27.4+(r?-.01:.01));m.rotation.y=r;scene.add(m)});
  // bunting
  const bc=[0xff3030,0xffdd30,0x30a0ff,0x30d060,0xffffff];
  for(let k=0;k<30;k++){
    const t=k/29,g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute([-.25,0,0,.25,0,0,0,-.5,0],3));
    const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:bc[k%5],side:THREE.DoubleSide}));m.position.set(-26+t*52,4-Math.sin(t*Math.PI)*.8,.2);scene.add(m);
  }
  box(.15,4.2,.15,M(0x555555),-26,2.1,0,{noShadow:true});box(.15,4.2,.15,M(0x555555),26,2.1,0,{noShadow:true});
  // tube man: Mr. Wiggle. A fan base, a wobbly red/yellow tube, a goofy face, a crown of streamers and two
  // long floppy arms that flail on their own rhythm (see W.update).
  const tm=new THREE.Group();tm.position.set(23,0,23);scene.add(tm);W.tubeMan=tm;
  const fan=new THREE.Mesh(new THREE.CylinderGeometry(.55,.62,.45,14),M(0x2b2f36,{metalness:.4,roughness:.5}));fan.position.y=.22;fan.castShadow=true;tm.add(fan);
  const body=new THREE.Group();body.position.y=.4;body.rotation.y=Math.atan2(-23,-23);tm.add(body);   // he faces the middle of the lot
  W.wiggleArms=[];let par=body;
  for(let i=0;i<6;i++){
    const seg=new THREE.Group();seg.position.y=i?.82:0;par.add(seg);
    const cy=new THREE.Mesh(new THREE.CylinderGeometry(.34,.37,.84,12),M(i%2?0xff2a20:0xffd820,{roughness:.55}));cy.position.y=.42;cy.castShadow=true;seg.add(cy);
    if(i===3)[-1,1].forEach(sd=>{   // arms: two floppy tubes with an elbow
      const sh=new THREE.Group();sh.position.set(sd*.33,.6,0);seg.add(sh);
      const up=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,1.05,8),M(0xff2a20,{roughness:.55}));up.position.y=.5;sh.add(up);
      const el=new THREE.Group();el.position.y=1.02;sh.add(el);
      const lo=new THREE.Mesh(new THREE.CylinderGeometry(.11,.13,.95,8),M(0xffd820,{roughness:.55}));lo.position.y=.45;el.add(lo);
      const hand=new THREE.Mesh(new THREE.SphereGeometry(.15,8,6),M(0xff2a20));hand.position.y=.95;el.add(hand);
      W.wiggleArms.push({sh,el,sd,ph:Math.random()*6})});
    if(i===5){   // head: googly eyes, huge grin, streamer hair
      const hd=new THREE.Mesh(new THREE.SphereGeometry(.4,16,12),M(0xffd820,{roughness:.55}));hd.position.y=1.05;hd.scale.set(1,1.15,1);seg.add(hd);
      const face=new THREE.Mesh(new THREE.PlaneGeometry(.78,.66),new THREE.MeshBasicMaterial({map:tex(256,220,(g,w,h)=>{
        g.clearRect(0,0,w,h);
        [[78,70],[178,64]].forEach(([x,y],k)=>{g.fillStyle="#fff";g.beginPath();g.ellipse(x,y,46,52,0,0,7);g.fill();g.lineWidth=6;g.strokeStyle="#111";g.stroke();
          g.fillStyle="#111";g.beginPath();g.arc(x+(k?-12:14),y+16,18,0,7);g.fill()});
        g.strokeStyle="#111";g.lineWidth=8;g.beginPath();g.moveTo(30,18);g.lineTo(115,8);g.moveTo(140,4);g.lineTo(226,22);g.stroke();
        g.fillStyle="#5a0a0a";g.beginPath();g.moveTo(40,140);g.quadraticCurveTo(128,250,216,136);g.quadraticCurveTo(128,170,40,140);g.fill();
        g.fillStyle="#fff";g.fillRect(70,146,118,16);g.fillStyle="#ff6a8a";g.beginPath();g.ellipse(128,190,30,14,0,0,7);g.fill();
      }),transparent:true}));
      face.position.set(0,1.05,.41);seg.add(face);
      for(let k=0;k<9;k++){const a=k/9*Math.PI*2,st=new THREE.Mesh(new THREE.ConeGeometry(.06,.55,5),M(k%2?0xff2a20:0x30a0ff));
        st.position.set(Math.sin(a)*.22,1.55,Math.cos(a)*.22);st.rotation.set(Math.cos(a)*.5,0,-Math.sin(a)*.5);seg.add(st)}
    }
    W.tube.push(seg);par=seg;
  }
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
    post.comp=sm(COMP_FS,{tS:{value:null},tB:{value:null},time:{value:0},bloom:{value:.7},vig:{value:.35},grain:{value:.035},flash:{value:0},box:{value:0},sat:{value:1.15},warm:{value:1},res:{value:new THREE.Vector2(1,1)}});
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

  // Mr. Wiggle breaks loose: fly to (x,z), lie there a few seconds, then pop back up on his fan.
  let fly=null;const falling=[];
  W.launchTube=function(x,z,onLand){
    if(fly)return false;
    fly={t:0,dur:1.9,fx:tm.position.x,fz:tm.position.z,x,z,onLand,landed:false};return true;
  };
  W.dropBumper=function(car){
    const b=car&&car.userData.bumper;if(!b||b.userData.dropped)return false;
    b.userData.dropped=true;falling.push({m:b,v:0});return true;
  };
  W.update=function(dt,t){
    if(window.VRMKit)VRMKit.update(dt);
    if(fly){
      fly.t+=dt;const k=Math.min(1,fly.t/fly.dur);
      if(k<1){tm.position.set(fly.fx+(fly.x-fly.fx)*k,Math.sin(k*Math.PI)*8,fly.fz+(fly.z-fly.fz)*k);tm.rotation.x+=dt*7;tm.rotation.z+=dt*4}
      else if(!fly.landed){fly.landed=true;tm.position.set(fly.x,.4,fly.z);tm.rotation.set(Math.PI/2,Math.random()*6,0);if(fly.onLand)fly.onLand()}
      if(fly.t>fly.dur+4.5){tm.position.set(23,0,23);tm.rotation.set(0,0,0);fly=null}
    }
    for(let i=falling.length-1;i>=0;i--){const f=falling[i];f.v+=dt*9;f.m.position.y=Math.max(.07,f.m.position.y-f.v*dt);f.m.rotation.x=Math.min(.6,f.m.rotation.x+dt*3);f.m.position.z+=dt*.25;if(f.m.position.y<=.07)falling.splice(i,1)}
    clouds.rotation.y+=dt*.004;
    if(rain.visible){rain.position.set(cam.position.x,0,cam.position.z);
      const indoors=cam.position.z<-13.9&&Math.abs(cam.position.x)<10.2;rain.material.opacity=indoors?0:.55*(W.rainAmt||0);   // dry under the showroom roof
      const a=rainGeo.attributes.position.array;
      for(let i=0;i<RN;i++){let y=a[i*6+1]-dt*19;if(y<0)y+=16;a[i*6+1]=y;a[i*6+4]=y-.55}rainGeo.attributes.position.needsUpdate=true}
    W.flick.forEach((m,i)=>{const v=Math.random()<.035?.25:1;m.material.color.setScalar(v)});
    W.tube.forEach((s,i)=>{s.rotation.z=Math.sin(t*3.4+i*.7)*.3+Math.sin(t*7.1+i)*.06;s.rotation.x=Math.cos(t*2.6+i)*.22});
    (W.wiggleArms||[]).forEach(a=>{const k=t*5.2+a.ph;   // the arm-flail: big random-looking swings, floppy elbows
      a.sh.rotation.z=a.sd*(-1.2-Math.sin(k)*1.1-Math.sin(k*1.7)*.35);a.sh.rotation.x=Math.sin(k*.8+1)*.7;
      a.el.rotation.z=a.sd*Math.sin(k*1.9+.5)*1.2;a.el.rotation.x=Math.cos(k*1.3)*.5});
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
