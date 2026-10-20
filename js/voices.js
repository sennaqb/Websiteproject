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
  K.loading=import(LIB).then(async mod=>{
    const files={},prog=p=>{if(p.status==="progress"&&p.total){files[p.file]=[p.loaded,p.total];let a=0,b=0;for(const k in files){a+=files[k][0];b+=files[k][1]}K.progress=a/b}};
    let tts=null;
    // WebGPU is much faster, but only if the browser can actually get a GPU adapter
    let gpu=null;try{gpu=navigator.gpu&&await navigator.gpu.requestAdapter()}catch(e){}
    if(gpu)try{tts=await mod.KokoroTTS.from_pretrained(MODEL,{dtype:"fp32",device:"webgpu",progress_callback:prog})}catch(e){tts=null}
    if(!tts)tts=await mod.KokoroTTS.from_pretrained(MODEL,{dtype:"q8",device:"wasm",progress_callback:prog});
    K.tts=tts;K.ready=true;K.progress=1;return tts;
  }).catch(e=>{K.failed=true;K.loading=null;throw e});
  K.loading.catch(()=>{});
  return K.loading;
};
K.setOn=function(on){K.on=on;try{localStorage.setItem("bobsVoices",on?"1":"0")}catch(e){}if(on)K.load();else K.stop()};
K.usable=()=>K.on&&K.ready&&!K.failed&&!K.slow;
K.status=()=>!K.on?"off":K.failed?"couldn't load":K.slow?"too slow on this computer, using standard voices":K.ready?"ready":K.loading?`downloading ${Math.round(K.progress*100)}% (first time only)`:"waiting";

function ctx(){if(!K.ac)K.ac=new (window.AudioContext||window.webkitAudioContext)();if(K.ac.state==="suspended")K.ac.resume();return K.ac}
K.stop=function(){K.seq++;K.chain=Promise.resolve();if(K.src){try{K.src.stop()}catch(e){}K.src=null}};
// Speak text in a Kokoro voice. Returns a handle whose onend fires when the line finishes.
K.say=function(text,voice,speed,queue){
  const h={onend:null};
  if(!queue)K.stop();
  const my=K.seq;
  // split into sentences so the first one starts playing while the rest are generated
  const parts=String(text).replace(/\*[^*]*\*/g,"").match(/[^.!?]+[.!?]*/g)||[];
  // time each line: if this computer generates speech much slower than real time, fall back to standard voices
  const gens=parts.map(p=>p.trim()).filter(Boolean).map(p=>async()=>{const t0=performance.now(),a=await K.tts.generate(p,{voice,speed:speed||1}),gen=(performance.now()-t0)/1000,dur=a.audio.length/a.sampling_rate;
    if(gen>dur*2.2&&gen>2.5){K.slowHits=(K.slowHits||0)+1;if(K.slowHits>=2&&!K.slow){K.slow=true;if(K.onSlow)K.onSlow()}}return a});
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
