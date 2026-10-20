"use strict";
// Touch controls for phones and tablets (iPhone has no keyboard, mouse or pointer lock).
// Left thumb: a joystick that walks. Right side of the screen: drag to look. Buttons send the same
// keys the desktop uses, so every game feature works unchanged. Only switches on for touch screens.
(function(){
const TOUCH=matchMedia("(pointer:coarse)").matches||("ontouchstart" in window&&navigator.maxTouchPoints>0);
if(!TOUCH)return;
document.body.classList.add("touch");
const G=()=>window.G3&&G3.state;
const key=(code,down)=>window.dispatchEvent(new KeyboardEvent(down?"keydown":"keyup",{code,bubbles:true}));
const tap=code=>{key(code,true);setTimeout(()=>key(code,false),60)};

// ---------- styles ----------
const css=document.createElement("style");css.textContent=`
body.touch,body.touch canvas{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#tc{position:fixed;inset:0;z-index:8;pointer-events:none;display:none}
body.touch.playing #tc{display:block}
#tc .stick{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));width:130px;height:130px;border-radius:50%;background:#ffffff14;border:2px solid #ffffff33;pointer-events:auto}
#tc .knob{position:absolute;left:40px;top:40px;width:50px;height:50px;border-radius:50%;background:#ffffff55;border:2px solid #fff8}
#tc .btns{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(4,50px);gap:6px;pointer-events:auto}
#tc .b{width:50px;height:50px;border-radius:50%;background:#000a;border:2px solid #ffffff40;color:#fff;font:700 13px system-ui;display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1.05;text-align:center}
#tc .b span{font-size:18px}
#tc .b.on{background:#ffb81c;color:#111}
#tc .b.hide{visibility:hidden}
#tc .top{position:absolute;top:56px;left:max(10px,env(safe-area-inset-left));display:flex;flex-direction:column;gap:6px;pointer-events:auto}
#tc .top .b{width:40px;height:40px}#tc .top .b span{font-size:15px}
#tc .yn{position:absolute;top:96px;left:50%;transform:translateX(-50%);display:none;gap:10px;pointer-events:auto}
#tc .yn .b{width:auto;padding:0 16px;border-radius:12px;height:44px}
#rotate{position:fixed;inset:0;z-index:20;display:none;align-items:center;justify-content:center;background:#0e1217;color:#fff;font:600 20px system-ui;text-align:center;padding:30px}
@media (orientation:portrait){body.touch.playing #rotate{display:flex}}
body.touch #cross{display:none}
body.touch #deal{top:56px;right:auto;left:max(58px,env(safe-area-inset-left));width:220px;font-size:11px;transform:scale(.85);transform-origin:top left}
body.touch #mini{width:84px;height:84px}
body.touch #hudTop{font-size:12px;padding:4px 10px;max-width:70vw}
body.touch #title{overflow-y:auto;align-items:flex-start;touch-action:pan-y}
body.touch #title .titlebox{padding:14px 0 30px}
body.touch .titlebox h1{font-size:30px;margin:4px 0 8px}
body.touch .titlebox .keys{display:none}
body.touch #tip{display:none!important}
body.touch #feed{bottom:160px;max-width:46vw;font-size:13px}
body.touch #subs{bottom:150px;width:min(640px,60vw)}
body.touch #subs .sub{font-size:clamp(16px,2.6vw,24px)}
body.touch #subs .subkeys{display:none}
body.touch #prompt{bottom:auto;top:40%;font-size:15px}
`;document.head.appendChild(css);

// ---------- layout ----------
const tc=document.createElement("div");tc.id="tc";
tc.innerHTML=`<div class=stick><div class=knob></div></div>
  <div class=top><div class=b data-tap="Escape"><span>⏸</span></div><div class=b data-tap="KeyC"><span>👀</span></div><div class=b data-tap="KeyM"><span>🔇</span></div></div>
  <div class=yn><div class="b" data-tap="KeyY">✅ Approve</div><div class="b" data-tap="KeyN">❌ Deny</div></div>
  <div class=btns>
    <div class=b data-hold="ShiftLeft"><span>🏃</span>run</div><div class=b data-tap="KeyQ"><span>🧒</span>mini</div><div class=b data-tap="KeyE"><span>✋</span>use</div>
    <div class=b data-hold="KeyF" data-only="flirt"><span>💘</span>flirt</div><div class=b data-tap="KeyL"><span>💁</span>lot</div><div class=b data-tap="KeyT"><span>⌨️</span>type</div>
    <div class=b data-hold="KeyV" data-only="talk"><span>🎙️</span>talk</div><div class=b data-tap="KeyG" data-only="talk"><span>🔫</span>gun</div><div class=b data-tap="KeyX" data-only="talk"><span>😭</span>cry</div>
    <div class=b data-tap="Digit4" data-only="talk"><span>💵</span>finance</div><div class=b data-act="leave" data-only="talk"><span>🚶</span>leave</div><div class=b data-tap="KeyK" data-only="tut"><span>⏭</span>skip</div>
  </div>`;
document.body.appendChild(tc);
const rot=document.createElement("div");rot.id="rotate";rot.innerHTML="📱↻<br>Turn your phone sideways to play";document.body.appendChild(rot);
const hint=setInterval(()=>{const t=document.querySelector('#title .titlebox');if(!t)return;if(t.querySelector('.thint'))return;const d=document.createElement('div');d.className='dim thint';d.style.marginTop='8px';d.innerHTML='📱 Phone controls: left thumb walks (push all the way to run), drag the right side to look. Hold 🎙️ to talk, ✋ to use.';t.appendChild(d)},800);

// buttons: tap = quick press, hold = key down while the finger is on it (talk, flirt, run)
tc.querySelectorAll(".b").forEach(b=>{
  b.addEventListener("touchstart",e=>{e.preventDefault();e.stopPropagation();b.classList.add("on");
    if(b.dataset.hold)key(b.dataset.hold,true);else if(b.dataset.tap)tap(b.dataset.tap);
    else if(b.dataset.act==="leave"&&typeof T!=="undefined"&&T&&typeof closeTalk==="function")closeTalk()},{passive:false});
  const up=e=>{e.preventDefault();b.classList.remove("on");if(b.dataset.hold)key(b.dataset.hold,false)};
  b.addEventListener("touchend",up,{passive:false});b.addEventListener("touchcancel",up,{passive:false});
});

// ---------- joystick ----------
const stick=tc.querySelector(".stick"),knob=tc.querySelector(".knob");let sid=null,sx=0,sy=0;
function setMove(dx,dy){const g=G();if(!g)return;const k=g.keys,d=Math.hypot(dx,dy),t=.35;
  k.KeyW=dy<-t*d&&d>12;k.KeyS=dy>t*d&&d>12;k.KeyA=dx<-t*d&&d>12;k.KeyD=dx>t*d&&d>12;k.ShiftLeft=k.ShiftLeft||false;
  if(d>52)k.ShiftRight=true;else k.ShiftRight=false}   // push the stick all the way to sprint
stick.addEventListener("touchstart",e=>{e.preventDefault();const t=e.changedTouches[0],r=stick.getBoundingClientRect();sid=t.identifier;sx=r.left+r.width/2;sy=r.top+r.height/2},{passive:false});
stick.addEventListener("touchmove",e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===sid){let dx=t.clientX-sx,dy=t.clientY-sy;const d=Math.hypot(dx,dy),m=Math.min(d,55);if(d>0){dx=dx/d*m;dy=dy/d*m}
  knob.style.transform=`translate(${dx}px,${dy}px)`;setMove(dx,dy)}},{passive:false});
const stickEnd=e=>{for(const t of e.changedTouches)if(t.identifier===sid){sid=null;knob.style.transform="";setMove(0,0)}};
stick.addEventListener("touchend",stickEnd);stick.addEventListener("touchcancel",stickEnd);

// ---------- look: drag anywhere that isn't a control ----------
let lid=null,lx=0,ly=0;
addEventListener("touchstart",e=>{const g=G();if(!g||!g.on||lid!==null)return;const t=e.changedTouches[0];if(t.target.closest&&t.target.closest("#tc .b,#tc .stick,#title,#pc,#pause,input,button,#subs"))return;lid=t.identifier;lx=t.clientX;ly=t.clientY},{passive:true});
addEventListener("touchmove",e=>{const g=G();if(!g)return;for(const t of e.changedTouches)if(t.identifier===lid){g.yaw-=(t.clientX-lx)*.0055;g.pitch=Math.max(-1.3,Math.min(1.3,g.pitch-(t.clientY-ly)*.0055));lx=t.clientX;ly=t.clientY}},{passive:true});
const lookEnd=e=>{for(const t of e.changedTouches)if(t.identifier===lid)lid=null};
addEventListener("touchend",lookEnd);addEventListener("touchcancel",lookEnd);

// ---------- show the buttons that make sense right now ----------
setInterval(()=>{const g=G();if(!g)return;const talk=!!(typeof T!=="undefined"&&T&&T.inWorld),tiff=typeof S!=="undefined"&&S&&S.tiff&&S.tiff.unlocked;
  tc.querySelectorAll(".b[data-only]").forEach(b=>{const o=b.dataset.only;b.classList.toggle("hide",o==="talk"?!talk:o==="flirt"?(!tiff||talk):o==="tut"?!g.tut:false)});
  tc.querySelectorAll('.btns .b:not([data-only])').forEach(b=>b.classList.toggle("hide",talk&&b.dataset.tap!=="KeyT"));
  tc.querySelector(".yn").style.display=g.offAsk&&!talk?"flex":"none";
},250);

// phones: skip the glow pass and keep the pixel count down so it stays smooth
const perf=setInterval(()=>{const W=window.G3&&G3.world&&G3.world();if(!W||!W.R)return;clearInterval(perf);if(W.post)W.post.on=false;W.R.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));W.resize&&W.resize()},500);
})();
