// VRoid characters: loads .vrm models (from VRoid Studio) with three-vrm, animates them procedurally
// (walk, sit, gesture, hands up), drives expressions (moods, blinking, lip sync) and spring-bone physics
// (hair, skirts, accessories). Loaded as an ES module; "three" maps to the game's THREE via js/three-shim.js.
import {GLTFLoader} from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";
import {VRMLoaderPlugin,VRMUtils} from "https://cdn.jsdelivr.net/npm/@pixiv/three-vrm@3.4.5/lib/three-vrm.module.js";

const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
const files={},live=new Set();
const K={ready:true,models:[]};

// Fetch a model file once; every character made from it is parsed from the cached bytes.
function bytes(url){return files[url]||(files[url]=fetch(url).then(r=>{if(!r.ok)throw new Error(url+" "+r.status);return r.arrayBuffer()}))}
// url may be a list: the first file that loads wins (your own export first, the sample as a fallback).
async function make(url){
  if(Array.isArray(url)){let err;for(const x of url){try{return await make(x)}catch(e){err=e}}throw err}
  const buf=await bytes(url);
  const gltf=await new Promise((res,rej)=>loader.parse(buf.slice(0),"",res,rej));
  const vrm=gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);VRMUtils.combineSkeletons?VRMUtils.combineSkeletons(gltf.scene):0;
  VRMUtils.rotateVRM0(vrm);   // old VRM 0.x files face the other way
  vrm.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false}});
  return vrm;
}
const N=(vrm,b)=>vrm.humanoid.getNormalizedBoneNode(b);

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
  }).catch(e=>{u.vrmLoading=false;u.vrmFailed=String(e);console.warn("VRM load failed",e)});
};
// Walk, sit, wave, talk: the same signals the blocky people use (see animatePerson in world.js).
const MOODEXP={happy:["happy",.8],angry:["angry",.9],worried:["sad",.7],shocked:["surprised",.9],confused:["sad",.35],neutral:null};
K.animate=function(g,moving,t,armsUp,talk){
  const u=g.userData,vrm=u.vrm;if(!vrm)return;
  const s=moving?Math.sin(t*9)*.55:0,set=(b,x,y,z)=>{const n=N(vrm,b);if(n)n.rotation.set(x||0,y||0,z||0)};
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
  const me=MOODEXP[u.mood];if(me)em.setValue(me[0],me[1]);
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
