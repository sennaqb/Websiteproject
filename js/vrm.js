// VRoid characters: loads .vrm models (from VRoid Studio) with three-vrm, animates them procedurally
// (walk, sit, gesture, hands up), drives expressions (moods, blinking, lip sync) and spring-bone physics
// (hair, skirts, accessories). Loaded as an ES module; "three" maps to the game's THREE via js/three-shim.js.
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import {VRMLoaderPlugin,VRMUtils} from "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.4.5/lib/three-vrm.module.js";

const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
const files={},live=new Set();
const K={ready:true,models:[]};

// Fetch a model file once; every character made from it is parsed from the cached bytes.
function bytes(url){return files[url]||(files[url]=/\.b64\.txt$/.test(url)?packed(url):fetch(url).then(r=>{if(!r.ok)throw new Error(url+" "+r.status);return r.arrayBuffer()}))}
// A .vrm packed as gzipped base64 text (the artifact host only serves web file types): fetch, decode, gunzip.
async function packed(url){const r=await fetch(url);if(!r.ok)throw new Error(url+" "+r.status);const s=atob((await r.text()).trim()),n=s.length,a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=s.charCodeAt(i);
  return new Response(new Blob([a]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()}
// url may be a list: the first file that loads wins (your own export first, the sample as a fallback).
async function make(url){
  if(Array.isArray(url)){let err;for(const x of url){try{const v=await make(x);v.src=x;return v}catch(e){err=e}}throw err}
  const buf=await bytes(url);
  const gltf=await new Promise((res,rej)=>loader.parse(buf.slice(0),"",res,rej));
  const vrm=gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);VRMUtils.combineSkeletons?VRMUtils.combineSkeletons(gltf.scene):0;
  VRMUtils.rotateVRM0(vrm);   // old VRM 0.x files face the other way
  vrm.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;
    // white cloth blows out under the showroom lights; take clothes down a notch so folds and seams show
    const mt=Array.isArray(o.material)?o.material[0]:o.material;if(mt&&/CLOTH/.test(mt.name||"")&&mt.color)mt.color.multiplyScalar(.82)}});
  return vrm;
}
const N=(vrm,b)=>vrm.humanoid.getNormalizedBoneNode(b);

// ---------- outfits ----------
// For a stock VRoid body (materials named Tops_/Bottoms_): recolor the top and give her a short pleated skirt.
// The skirt is a skinned mesh: the waist follows the hips, the hem follows the thighs, so it moves when she walks.
const toonRamp=(()=>{let t;return()=>t||(t=(()=>{const d=new Uint8Array([90,170,255]);const x=new THREE.DataTexture(d,3,1,THREE.RedFormat);x.minFilter=x.magFilter=THREE.NearestFilter;x.needsUpdate=true;return x})())})();
function plaid(a,b,c){const cv=document.createElement("canvas");cv.width=cv.height=128;const g=cv.getContext("2d");
  g.fillStyle=a;g.fillRect(0,0,128,128);g.globalAlpha=.55;g.fillStyle=b;[0,64].forEach(o=>{g.fillRect(o+8,0,22,128);g.fillRect(0,o+8,128,22)});
  g.globalAlpha=.8;g.fillStyle=c;[0,64].forEach(o=>{g.fillRect(o+44,0,3,128);g.fillRect(0,o+44,128,3)});
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,1.2);return t}
function dress(vrm,o){
  let bottoms=null;
  const tint=(mt,c,sh)=>{mt.color.set(c);if(mt.shadeColorFactor)mt.shadeColorFactor.set(sh!=null?sh:c)};
  vrm.scene.traverse(m=>{if(!m.isMesh||!m.material)return;const mt=Array.isArray(m.material)?m.material[0]:m.material,n=mt.name||"";   // [main, outline]
    if(/Tops_/.test(n)&&o.top!=null)tint(mt,o.top,o.shade);
    if(/Bottoms_/.test(n)&&m.isSkinnedMesh)bottoms=m;
    if(/Shoes_/.test(n)&&o.shoes!=null)tint(mt,o.shoes)});
  if(!bottoms||!o.skirt)return;
  vrm.scene.updateMatrixWorld(true);
  const toScene=new THREE.Matrix4().copy(vrm.scene.matrixWorld).invert();
  const box=bottoms.geometry.boundingBox||(bottoms.geometry.computeBoundingBox(),bottoms.geometry.boundingBox);
  const bb=box.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(toScene,bottoms.matrixWorld));
  const R=b=>vrm.humanoid.getRawBoneNode(b),hips=R("hips"),lL=R("leftUpperLeg"),rL=R("rightUpperLeg");
  const lp=new THREE.Vector3().setFromMatrixPosition(lL.matrixWorld).applyMatrix4(toScene);
  const cx=(bb.min.x+bb.max.x)/2,cz=(bb.min.z+bb.max.z)/2,rx=(bb.max.x-bb.min.x)/2*1.04,rz=(bb.max.z-bb.min.z)/2*1.1;
  const top=bb.max.y-.005,hem=bb.min.y-(o.length||.025),side=Math.sign(lp.x-cx)||1,SEG=64,ROWS=7;
  const pos=[],uv=[],si=[],sw=[],idx=[];
  for(let r=0;r<=ROWS;r++){const f=r/ROWS,y=top+(hem-top)*f,flare=(o.flare||.3)<.15?1.13-.05*f+f*o.flare:1+f*(o.flare||.3);   // pencil skirts sit over the blouse (tucked-in look)
    for(let k=0;k<=SEG;k++){const a=k/SEG*Math.PI*2,pl=1+f*.05*Math.min(1,(o.flare||.3)/.3)*Math.abs(Math.sin(a*12));   // knife pleats deepen toward the hem
      const x=cx+Math.sin(a)*rx*flare*pl,z=cz+Math.cos(a)*rz*flare*pl;pos.push(x,y,z);uv.push(k/SEG,1-f);
      const leg=.75*Math.pow(f,1.4),sL=THREE.MathUtils.smoothstep((x-cx)/rx*side,-.7,.7);
      si.push(0,1,2,0);sw.push(1-leg,leg*sL,leg*(1-sL),0)}}
  for(let r=0;r<ROWS;r++)for(let k=0;k<SEG;k++){const a=r*(SEG+1)+k,b=a+SEG+1;idx.push(a,b,a+1,a+1,b,b+1)}
  const geo=new THREE.BufferGeometry();geo.setIndex(idx);geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
  geo.setAttribute("skinIndex",new THREE.Uint16BufferAttribute(si,4));geo.setAttribute("skinWeight",new THREE.Float32BufferAttribute(sw,4));geo.computeVertexNormals();
  const mat=new THREE.MeshToonMaterial({color:o.skirt==="plaid"?0xffffff:o.skirt,map:o.skirt==="plaid"?plaid(...(o.plaid||["#7a1020","#1a1a22","#e8c040"])):null,gradientMap:toonRamp(),side:THREE.DoubleSide});
  const sk=new THREE.SkinnedMesh(geo,mat);sk.name="Skirt";sk.castShadow=true;sk.frustumCulled=false;
  vrm.scene.add(sk);sk.updateMatrixWorld(true);sk.bind(new THREE.Skeleton([hips,lL,rL]),sk.matrixWorld);
  // the shorts underneath take the skirt's colour so nothing peeks out
  tint(Array.isArray(bottoms.material)?bottoms.material[0]:bottoms.material,o.skirt==="plaid"?0x1a1a22:o.skirt,o.skirt==="plaid"?0x101014:null);
}

// Put a VRoid character inside a game person group (returned at once; the model pops in when loaded).
K.attach=function(g,url,o){
  const u=g.userData;u.vrmLoading=true;u.hipY=.8;u.brows=u.brows||[];
  make(url).then(vrm=>{
    if(!g.parent&&!g.userData.keep){}   // still attach: the group may be added to the scene later
    g.add(vrm.scene);u.vrm=vrm;u.vrmLoading=false;live.add(g);
    const hips=N(vrm,"hips");vrm.scene.updateMatrixWorld(true);const hp=new THREE.Vector3();hips.getWorldPosition(hp);
    u.hipY=hp.y-g.position.y;u.blinkAt=Math.random()*3;
    // VRoid bust bones: if the export has no spring bones on them, they get a soft procedural sway instead
    const sprung=new Set();try{(vrm.springBoneManager?vrm.springBoneManager.joints:[]).forEach(j=>sprung.add(j.bone))}catch(e){}
    u.bust=[];vrm.scene.traverse(o=>{if(o.isBone&&/bust1$/i.test(o.name)&&!sprung.has(o))u.bust.push({b:o,q:o.quaternion.clone()})});
    u.sway={x:0,v:0,drive:0};
    const stock=!o||!o.dressIf||String(vrm.src||url).includes(o.dressIf);
    if(o&&o.outfit&&stock)try{dress(vrm,o.outfit)}catch(e){console.warn("outfit",e)}
    if(o&&o.adult&&stock)try{adult(vrm,g,o.adult)}catch(e){console.warn("adult",e)}
  }).catch(e=>{u.vrmLoading=false;u.vrmFailed=String(e);console.warn("VRM load failed",e)});
};
// Grown-up proportions for a stock VRoid body: smaller head, longer neck and legs, taller overall,
// calmer eyes and lipstick. (The default VRoid look reads young; Tiffany is a grown woman.)
function adult(vrm,g,o){
  const R=b=>vrm.humanoid.getRawBoneNode(b),foot=R("leftFoot");vrm.scene.updateMatrixWorld(true);
  const y0=new THREE.Vector3().setFromMatrixPosition(foot.matrixWorld).y;
  const head=R("head");if(head)head.scale.setScalar(o.head||.86);
  const neck=R("neck");if(neck)neck.scale.set(1,o.neck||1.25,1);
  const leg=o.leg||1.1;["Left","Right"].forEach(sd=>{const a=R(`${sd.toLowerCase()}UpperLeg`),b=R(`${sd.toLowerCase()}LowerLeg`),f=R(`${sd.toLowerCase()}Foot`);
    if(a)a.scale.set(1,leg,1);if(b)b.scale.set(1,leg,1);if(f)f.scale.set(1,1/(leg*leg),1)});
  vrm.scene.updateMatrixWorld(true);vrm.scene.position.y+=y0-new THREE.Vector3().setFromMatrixPosition(foot.matrixWorld).y;   // feet back on the floor
  g.scale.setScalar(o.scale||1.07);
  g.userData.relax=o.relax!=null?o.relax:.3;
  vrm.scene.traverse(m=>{if(!m.isMesh||!m.material)return;const mt=Array.isArray(m.material)?m.material[0]:m.material,n=mt.name||"";
    if(/FaceMouth/.test(n)&&o.lips){mt.color.set(o.lips);if(mt.shadeColorFactor)mt.shadeColorFactor.set(o.lips)}
    if(/FaceEyeline|FaceEyelash/.test(n)){mt.color.set(0x2a1418);if(mt.shadeColorFactor)mt.shadeColorFactor.set(0x1a0a0e)}});
}
// Walk, sit, wave, talk: the same signals the blocky people use (see animatePerson in world.js).
const MOODEXP={happy:["happy",.8],angry:["angry",.9],worried:["sad",.7],shocked:["surprised",.9],confused:["sad",.35],neutral:null};
K.animate=function(g,moving,t,armsUp,talk){
  const u=g.userData,vrm=u.vrm;if(!vrm)return;
  const v0=vrm.meta&&vrm.meta.metaVersion==="0"?-1:1;   // VRM 0.x models are turned around, so x/z bends flip
  const s=moving?Math.sin(t*9)*.55:0,set=(b,x,y,z)=>{const n=N(vrm,b);if(n)n.rotation.set((x||0)*v0,y||0,(z||0)*v0)};
  if(u.sit&&!moving){
    g.position.y=.52-u.hipY+.06;
    set("leftUpperLeg",-1.45,0,.05);set("rightUpperLeg",-1.45,0,-.05);set("leftLowerLeg",1.45);set("rightLowerLeg",1.45);
  }else{
    g.position.y=0;
    set("leftUpperLeg",-s);set("rightUpperLeg",s);
    set("leftLowerLeg",moving?Math.max(0,Math.cos(t*9))*.9:0);set("rightLowerLeg",moving?Math.max(0,-Math.cos(t*9))*.9:0);
  }
  // arms come down from the T-pose; swing when walking, gesture when talking, up when cheering
  const sw=moving?s*.6:Math.sin(t*1.5)*.03;
  if(u.wave>0&&!moving){set("leftUpperArm",sw,0,-1.25);set("leftLowerArm",0,-.15,0);
    set("rightUpperArm",0,0,-.35);set("rightLowerArm",0,0,-1.1+Math.sin(t*9)*.35)}
  else if(armsUp){set("leftUpperArm",0,0,1.1+Math.sin(t*10)*.2);set("rightUpperArm",0,0,-1.1-Math.sin(t*10+1)*.2);set("leftLowerArm",0,0,.3);set("rightLowerArm",0,0,-.3)}
  else if(talk&&!moving){set("leftUpperArm",.25+Math.sin(t*3)*.15,0,-1.1);set("rightUpperArm",.35+Math.sin(t*3.7+1)*.2,0,1.1);set("leftLowerArm",0,-1.1+Math.sin(t*3)*.2,0);set("rightLowerArm",0,1.2+Math.sin(t*3.4)*.2,0)}
  else{set("leftUpperArm",sw,0,-1.25);set("rightUpperArm",-sw,0,1.25);set("leftLowerArm",0,-.15,0);set("rightLowerArm",0,.15,0)}
  set("spine",moving?.04:0,0,moving?0:Math.sin(t*.9)*.025);set("head",0,u.headYaw||0,0);
  if(u.sway)u.sway.drive=moving?Math.sin(t*18)*.09:(talk||u.wave>0)?Math.sin(t*6)*.025:0;
  // face: mood, blinking, lip sync while a line is being spoken
  const em=vrm.expressionManager;if(!em)return;
  ["happy","angry","sad","surprised","relaxed"].forEach(k=>em.setValue(k,0));
  const me=MOODEXP[u.mood];if(me)em.setValue(me[0],me[1]*(u.moodScale||1));else if(u.relax)em.setValue("relaxed",u.relax);
  const speaking=u.talkLeft>0||(talk&&!u.talkLeft&&Math.sin(t*1.6)>.1);
  em.setValue("aa",speaking?Math.abs(Math.sin(t*14))*.8:0);em.setValue("oh",speaking?Math.max(0,Math.sin(t*9))*.3:0);
  const bl=(t+(u.blinkAt||0))%3.6;em.setValue("blink",bl<.12?1:0);
};
// Spring bones (hair, skirts, ribbons) and expressions need a per-frame update.
const E=new THREE.Euler(),Q=new THREE.Quaternion();
K.update=function(dt){dt=Math.min(dt,.05);live.forEach(g=>{if(!g.parent){live.delete(g);return}const u=g.userData,v=u.vrm;if(!v)return;
  if(u.bust&&u.bust.length){const w=u.sway;w.v+=((w.drive-w.x)*160-w.v*9)*dt;w.x+=w.v*dt;   // damped spring chasing the step rhythm
    u.bust.forEach(k=>{k.b.quaternion.copy(k.q).multiply(Q.setFromEuler(E.set(w.x,0,0)))})}
  v.update(dt)})};
window.VRMKit=K;
window.dispatchEvent(new Event("vrmkit-ready"));
