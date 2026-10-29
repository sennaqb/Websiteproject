"use strict";
// Backup speech-to-text: Whisper running inside the browser (transformers.js). Used when the browser's own
// recognizer is missing or can't reach its server (Brave, Opera, Firefox, VPNs, blocked networks).
// The model (~40 MB) downloads once and the browser caches it. Audio never leaves the computer.
(function(){
const LIB="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js",MODEL="Xenova/whisper-tiny.en";
const Wh={ready:false,loading:null,rec:null,progress:0};

Wh.load=function(){
  if(Wh.loading)return Wh.loading;
  Wh.loading=import(LIB).then(async T=>{
    T.env.allowLocalModels=false;
    const files={};
    const pipe=await T.pipeline("automatic-speech-recognition",MODEL,{progress_callback:p=>{
      if(p.status==="progress"&&p.total){files[p.file]=[p.loaded,p.total];let a=0,b=0;for(const k in files){a+=files[k][0];b+=files[k][1]}Wh.progress=a/b}
    }});
    Wh.pipe=pipe;Wh.ready=true;Wh.progress=1;return pipe;
  });
  Wh.loading.catch(()=>{Wh.loading=null});
  return Wh.loading;
};

// Start recording the mic. MediaRecorder runs off the main thread, so the 3D rendering can't drop audio.
Wh.start=async function(){
  if(Wh.rec)return;
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1}});
  const mr=new MediaRecorder(stream),chunks=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  mr.start(250);
  Wh.rec={stream,mr,chunks,t0:performance.now()};
};
Wh.cancel=function(){const r=Wh.rec;Wh.rec=null;if(r){try{r.mr.stop()}catch(e){}r.stream.getTracks().forEach(t=>t.stop())}};

// Stop recording and return the text that was said ("" for silence).
Wh.stop=async function(){
  const r=Wh.rec;if(!r)return "";Wh.rec=null;
  await new Promise(res=>{r.mr.onstop=res;try{r.mr.stop()}catch(e){res()}});
  r.stream.getTracks().forEach(t=>t.stop());
  if(performance.now()-r.t0<350||!r.chunks.length)return "";
  const buf=await new Blob(r.chunks,{type:r.mr.mimeType}).arrayBuffer();
  const ctx=new (window.AudioContext||window.webkitAudioContext)({sampleRate:16000});
  let audio;try{audio=(await ctx.decodeAudioData(buf)).getChannelData(0)}finally{try{ctx.close()}catch(e){}}
  let sum=0;for(let i=0;i<audio.length;i+=4)sum+=audio[i]*audio[i];
  if(!audio.length||Math.sqrt(sum/(audio.length/4))<.004)return "";   // silence; Whisper would invent a "Thank you."
  return Wh.transcribe(audio);
};
Wh.transcribe=async function(audio){
  const pipe=await Wh.load(),res=await pipe(audio);
  return String((res&&res.text)||"").replace(/\[[^\]]*\]|\([^)]*\)/g,"")
    .replace(/\b(\w+)(?:[,.]?\s+\1\b){2,}/gi,"$1")      // Whisper sometimes loops ("no, no, no, no…")
    .trim().slice(0,240);
};
window.Whisper=Wh;
})();
