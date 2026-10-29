"use strict";
// Synthesized sound: lot ambience, showroom radio, rain, door chime, T.O. alert, cash register, footsteps. No asset files.
(function(){
let ctx=null,master=null,amb=null,lastStep=0;
const A={muted:false};
try{A.muted=localStorage.getItem("bobsMute")==="1"}catch(e){}

function ac(){
  if(!ctx){
    try{ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=A.muted?0:.55;master.connect(ctx.destination)}
    catch(e){return null}
  }
  if(ctx.state==="suspended")ctx.resume();
  return ctx;
}
function tone(f,d,type,vol,delay,slide){
  const c=ac();if(!c||A.muted)return;
  const t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();
  o.type=type||"sine";o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol||.2,t+.01);g.gain.exponentialRampToValueAtTime(.0008,t+d);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.05);
}
function noise(d,vol,freq,delay){
  const c=ac();if(!c||A.muted)return;
  const t=c.currentTime+(delay||0),n=Math.floor(c.sampleRate*d),buf=c.createBuffer(1,n,c.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
  const s=c.createBufferSource();s.buffer=buf;
  const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=freq||800;
  const g=c.createGain();g.gain.setValueAtTime(vol||.1,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);
  s.connect(f);f.connect(g);g.connect(master);s.start(t);
}
A.init=ac;
A.chime=()=>{tone(784,.5,"sine",.18);tone(1046,.7,"sine",.16,.22)};          // customer walks in
A.alert=()=>{tone(880,.12,"square",.1);tone(660,.2,"square",.1,.14)};          // T.O.!
A.cash=()=>{tone(1568,.1,"triangle",.2);tone(2093,.4,"triangle",.2,.09);noise(.08,.1,6000,.02)};
A.lose=()=>{tone(300,.35,"sawtooth",.1,0,-120);tone(220,.5,"sawtooth",.1,.3,-90)};
A.win=()=>{[523,659,784,1046].forEach((f,i)=>tone(f,.35,"triangle",.2,i*.14))};
A.click=()=>tone(520,.05,"square",.06);
A.step=()=>{const n=performance.now();if(n-lastStep<180)return;lastStep=n;noise(.07,.07,420)};
A.phone=()=>{for(let i=0;i<4;i++){tone(1400,.08,"square",.05,i*.18);tone(1700,.08,"square",.05,i*.18+.09)}};
// Outdoor ambience: no constant hum, just the odd bird and a car going by now and then.
// Ducked (silent) during conversations so the mic and the voices stay clear.
let ducked=false;
function bird(){const b=2600+Math.random()*1400,n=2+(Math.random()*3|0);for(let i=0;i<n;i++)tone(b+(i%2)*300,.09,"sine",.035,i*.13,600)}
function carBy(){
  const c=ac();if(!c||A.muted)return;
  const t=c.currentTime,d=2.2,n=Math.floor(c.sampleRate*d),buf=c.createBuffer(1,n,c.sampleRate),data=buf.getChannelData(0);
  for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
  const s=c.createBufferSource();s.buffer=buf;const f=c.createBiquadFilter();f.type="bandpass";f.frequency.value=500;f.Q.value=.7;
  const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+d*.5);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f);f.connect(g);g.connect(master);s.start(t);
}
A.ambient=on=>{
  if(!on){if(amb){clearInterval(amb);amb=null}return}
  if(amb||!ac())return;
  amb=setInterval(()=>{if(ducked||A.muted||document.hidden)return;const r=Math.random();if(r<.22)bird();else if(r<.3)carBy()},1000);
};
// Showroom radio: a soft lounge loop (electric piano chords + walking bass) that only plays indoors,
// and a rain bed that follows the weather (muffled under the roof). Both go quiet during conversations.
const PROG=[[[62,65,69,72],38],[[60,64,67,71],43],[[57,60,64,67],45],[[59,62,65,69],43]];   /* Dm9 Cmaj7 Am7 Bm7b5-ish, bass notes */
const mtof=m=>440*Math.pow(2,(m-69)/12);let radio=null,radioG=null,bar=0,rIn=false,rainSrc=null,rainG=null,rainF=null;
function ep(f,t,d,v){const c=ctx,o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain();o.type="sine";o2.type="triangle";
  o.frequency.value=f;o2.frequency.value=f*2.003;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0005,t+d);
  o.connect(g);o2.connect(g);g.connect(radioG);o.start(t);o2.start(t);o.stop(t+d+.05);o2.stop(t+d+.05)}
function playBar(){const c=ac();if(!c)return;const t=c.currentTime+.05,b=60/84,[ch,bs]=PROG[bar%4];bar++;
  [0,1.5,2.5].forEach((beat,i)=>ch.forEach((m,j)=>ep(mtof(m),t+beat*b+j*.012,i?b*1.1:b*1.6,i?.022:.03)));
  [0,1,2,3].forEach(k=>ep(mtof(bs-12+[0,7,12,10][k]),t+k*b,b*.9,.05));
  if(Math.random()<.5){const sc=[74,76,77,79,81];for(let k=0;k<3;k++)ep(mtof(sc[Math.random()*5|0]),t+(2+k*.5)*b,b*.5,.02)}}
A.loops=function(indoor,rainAmt,talking){const c=ctx;if(!c||c.state!=="running")return;
  if(!radioG){radioG=c.createGain();radioG.gain.value=0;radioG.connect(master)}
  rIn=indoor;const rv=A.muted||document.hidden?0:indoor?(talking?.08:.5):0;radioG.gain.setTargetAtTime(rv,c.currentTime,.6);
  if(rv>0&&!radio){playBar();radio=setInterval(()=>{if(rIn)playBar()},4*60/84*1000)}
  if(rv===0&&radio){clearInterval(radio);radio=null}
  if(rainAmt>.03&&!rainSrc){const n=c.sampleRate*2,buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
    rainSrc=c.createBufferSource();rainSrc.buffer=buf;rainSrc.loop=true;rainF=c.createBiquadFilter();rainF.type="lowpass";rainG=c.createGain();rainG.gain.value=0;
    rainSrc.connect(rainF);rainF.connect(rainG);rainG.connect(master);rainSrc.start()}
  if(rainSrc){rainF.frequency.setTargetAtTime(indoor?500:2400,c.currentTime,.3);rainG.gain.setTargetAtTime(A.muted?0:rainAmt*(indoor?.05:.11)*(talking?.4:1),c.currentTime,.5);
    if(rainAmt<=.03){rainSrc.stop(c.currentTime+2);rainSrc=null}}};
A.duck=on=>{ducked=on};
A.mute=m=>{
  A.muted=m;try{localStorage.setItem("bobsMute",m?"1":"0")}catch(e){}
  if(master)master.gain.value=m?0:.55;
};
window.Sfx=A;
})();
