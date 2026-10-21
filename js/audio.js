"use strict";
// Synthesized sound: lot ambience, door chime, T.O. alert, cash register, footsteps. No asset files.
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
A.duck=on=>{ducked=on};
A.mute=m=>{
  A.muted=m;try{localStorage.setItem("bobsMute",m?"1":"0")}catch(e){}
  if(master)master.gain.value=m?0:.55;
};
window.Sfx=A;
})();
