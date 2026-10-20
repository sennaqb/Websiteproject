"use strict";
// Natural voices: Kokoro (an 82M-parameter text-to-speech model) running inside the browser via kokoro-js.
// Downloads once (~90 MB, cached by the browser). Until it's ready, or if it fails, the game uses the
// browser's built-in voices. One line plays at a time; a new line cuts the old one unless queued.
(function(){
const LIB="https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js",MODEL="onnx-community/Kokoro-82M-v1.0-ONNX";
const K={ready:false,failed:false,loading:null,progress:0,on:true,seq:0,src:null,chain:Promise.resolve()};
try{K.on=localStorage.getItem("bobsVoices")!=="0"}catch(e){}

// Voices by kind. Pick with a seed so the same character always sounds the same.
K.VOICES={
  m:["am_michael","am_adam","am_eric","am_liam","am_echo","am_puck","bm_george","bm_lewis","bm_daniel","am_onyx"],
  f:["af_heart","af_bella","af_nicole","af_sarah","af_jessica","af_sky","bf_emma","bf_isabella","bf_alice","af_nova"]
};
K.load=function(){
  if(K.loading||!K.on)return K.loading;
  K.err=null;
  K.loading=import(LIB).then(async mod=>{
    // some hosts don't send a file size, so count megabytes too: "downloading 0%" forever looked like a hang
    const files={},prog=p=>{if(p.status==="progress"){files[p.file]=[p.loaded||0,p.total||0];let a=0,b=0;for(const k in files){a+=files[k][0];b+=files[k][1]}K.mb=a/1048576;K.progress=b?a/b:0}};
    let tts=null;
    // WebGPU is much faster, but only if the browser can actually get a GPU adapter
    let gpu=null;try{gpu=navigator.gpu&&await navigator.gpu.requestAdapter()}catch(e){}
    if(gpu)try{tts=await mod.KokoroTTS.from_pretrained(MODEL,{dtype:"fp32",device:"webgpu",progress_callback:prog})}catch(e){console.warn("Kokoro WebGPU failed, trying WASM",e);tts=null}
    if(!tts)tts=await mod.KokoroTTS.from_pretrained(MODEL,{dtype:"q8",device:"wasm",progress_callback:prog});
    K.tts=tts;K.ready=true;K.progress=1;return tts;
  }).catch(e=>{K.failed=true;K.loading=null;K.err=String(e&&e.message||e).slice(0,140);console.warn("Natural voices failed to load",e);throw e});
  K.loading.catch(()=>{});
  return K.loading;
};
// Try again from scratch (after a failed download, or to give a slow computer another shot).
K.retry=function(){K.failed=K.slow=false;K.slowHits=0;K.warm=false;K.loading=null;K.on=true;try{localStorage.setItem("bobsVoices","1")}catch(e){}return K.load()};
K.setOn=function(on){K.on=on;try{localStorage.setItem("bobsVoices",on?"1":"0")}catch(e){}if(on)K.load();else K.stop()};
K.usable=()=>K.on&&K.ready&&!K.failed&&!K.slow;
K.status=()=>!K.on?"off":K.failed?`couldn't load (${K.err||"unknown error"})`:K.slow?"too slow on this computer, using standard voices":K.ready?"ready":
  K.loading?(K.progress?`downloading ${Math.round(K.progress*100)}%`:`downloading ${Math.round(K.mb||0)} MB of ~90`)+" (first time only)":"waiting";

function ctx(){if(!K.ac)K.ac=new (window.AudioContext||window.webkitAudioContext)();if(K.ac.state==="suspended")K.ac.resume();return K.ac}
K.stop=function(){K.seq++;K.chain=Promise.resolve();if(K.src){try{K.src.stop()}catch(e){}K.src=null}};
// Speak text in a Kokoro voice. Returns a handle whose onend fires when the line finishes.
K.say=function(text,voice,speed,queue){
  const h={onend:null};
  if(!queue)K.stop();
  const my=K.seq;
  // split into sentences so the first one starts playing while the rest are generated
  // and the first piece is kept short (cut at a comma or after a few words) so the customer starts talking right away
  const parts=[];(String(text).replace(/\*[^*]*\*/g,"").match(/[^.!?]+[.!?]*/g)||[]).forEach(p=>{
    p=p.trim();const lim=parts.length?90:38;
    while(p.length>lim+10){let cut=p.lastIndexOf(",",lim);
      if(cut<4){const m=p.slice(8,lim+20).search(/ (and|but|so|if|because|or|then) /);cut=m>=0?m+8:p.indexOf(" ",Math.min(lim,p.length-1))}
      if(cut<0)break;parts.push(p.slice(0,cut+1));p=p.slice(cut+1).trim();if(parts.length===1)break}
    if(p)parts.push(p)});
  // time each line: if this computer generates speech much slower than real time, fall back to standard voices
  const gens=parts.map(p=>p.trim()).filter(Boolean).map(p=>async()=>{const t0=performance.now(),a=await K.tts.generate(p,{voice,speed:speed||1}),gen=(performance.now()-t0)/1000,dur=a.audio.length/a.sampling_rate;
    if(!K.warm){K.warm=true}else if(gen>dur*2.2&&gen>2.5){K.slowHits=(K.slowHits||0)+1;if(K.slowHits>=2&&!K.slow){K.slow=true;if(K.onSlow)K.onSlow()}}return a});
  let pending=gens.map(g=>null);
  K.chain=K.chain.then(async()=>{
    for(let i=0;i<gens.length;i++){
      if(my!==K.seq)return;
      const a=await (pending[i]||gens[i]());
      if(i+1<gens.length&&!pending[i+1])pending[i+1]=gens[i+1]();   // generate the next sentence while this one plays
      if(my!==K.seq)return;
      await play(a,my);
    }
    if(my===K.seq&&h.onend)h.onend();
  }).catch(()=>{});
  return h;
};
function play(a,my){
  return new Promise(res=>{
    const ac=ctx(),buf=ac.createBuffer(1,a.audio.length,a.sampling_rate);buf.copyToChannel(a.audio,0);
    const s=ac.createBufferSource();s.buffer=buf;s.connect(ac.destination);s.onended=()=>{if(K.src===s)K.src=null;res()};
    if(my!==K.seq)return res();
    K.src=s;s.start();
  });
}
window.Voices=K;
})();
