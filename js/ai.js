"use strict";
// Optional AI customers. Claude only understands the player and voices the customer.
// The negotiation engine (talk.js) still owns every number, so a clever sentence can't break the game.
(function(){
const MODEL="claude-haiku-5-5", KEY="bobsApiKey", FLAG="bobsAI";
const AI={mode:"rules",enabled:false,fails:0,note:"",sample:null};
const store={
  get(k){try{return localStorage.getItem(k)}catch(e){return null}},
  set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
};
AI.on=()=>AI.enabled&&AI.mode!=="rules"&&AI.fails<3;
AI.voiceOn=()=>AI.on();
AI.hasKey=()=>!!store.get(KEY);
AI.status=()=>AI.mode==="rules"?"Built-in customers":AI.on()?(AI.mode==="sample"?"Claude customers (built in)":"Claude customers (your API key)"):"Built-in customers";

// Work out what is available. Called once at boot.
AI.init=async function(){
  AI.mode="rules";
  try{
    if(window.claude&&window.claude.use){
      const sm=await Promise.race([window.claude.use("sample"),new Promise(r=>setTimeout(()=>r(null),2500))]);
      if(sm){AI.sample=sm;AI.mode="sample"}
    }
  }catch(e){}
  if(AI.mode==="rules"&&AI.hasKey())AI.mode="key";
  AI.enabled=store.get(FLAG)==="1"&&AI.mode!=="rules";
  return AI.mode;
};
AI.setKey=function(k){
  k=(k||"").trim();store.set(KEY,k||null);
  if(k&&AI.mode==="rules")AI.mode="key";
  if(!k&&AI.mode==="key"){AI.mode="rules";AI.enabled=false;store.set(FLAG,"0")}
};
// Turn AI customers on or off. Turning on makes one tiny call so any consent prompt appears now, not mid-deal.
AI.setEnabled=async function(on){
  AI.fails=0;AI.note="";
  if(!on){AI.enabled=false;store.set(FLAG,"0");return true}
  if(AI.mode==="rules"){AI.note="No AI available here. Paste an API key to use your own.";return false}
  try{
    await call("Reply with the single word OK.",6000);
    AI.enabled=true;store.set(FLAG,"1");return true;
  }catch(e){
    AI.enabled=false;store.set(FLAG,"0");
    AI.note=AI.mode==="key"?"That key didn't work. Check it and try again.":"Claude access was declined or isn't available.";
    return false;
  }
};

async function call(prompt,timeout){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout||5000);
  try{
    if(AI.mode==="sample"){
      const r=await AI.sample(prompt,{modelTier:"quick",cache:false,signal:ctl.signal});
      return (r&&r.text)||"";
    }
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",signal:ctl.signal,
      headers:{"content-type":"application/json","x-api-key":store.get(KEY)||"","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:MODEL,max_tokens:400,thinking:{type:"disabled"},messages:[{role:"user",content:prompt}]})
    });
    if(!r.ok)throw new Error("api "+r.status);
    const j=await r.json();
    return (j.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
  }finally{clearTimeout(timer)}
}
function guard(p){
  return p.then(v=>{AI.fails=0;return v},e=>{
    AI.fails++;
    if(AI.fails>=3){AI.note="Claude stopped answering. Using the built-in customers.";if(window.Game&&Game.toast)Game.toast(AI.note)}
    throw e;
  });
}

const INTENTS=`{"type":"offer","price":N}  the manager names a price they would sell for (N in dollars, "twenty five hundred" is 2500)
{"type":"middle"}  proposes splitting the difference
{"type":"accept"}  accepts the customer's number or says deal
{"type":"refuse"}  says no or holds firm
{"type":"rapport"}  friendly talk, or asks about the customer's needs, job or family
{"type":"pitch_miles"}  claims the car has low mileage
{"type":"pitch_cond"}  claims the car is clean, in great shape, serviced
{"type":"urgency"}  says other buyers want it or it's going fast
{"type":"ask","topic":"miles"|"year"|"condition"}  asks the customer something about the car
{"type":"addon","which":"warranty"|"gap"|"acc"|"finance"}  offers a warranty, GAP, accessories, or financing and monthly payments
{"type":"finalize"}  wants to do paperwork or sign
{"type":"release"}  politely ends the conversation and sends the customer on their way
{"type":"greet"}  hello
{"type":"chat","reply":"..."}  anything else. reply is the customer's short in-character answer with no prices and no agreement to buy
{"type":"unclear"}`;
const OK=new Set(["offer","middle","accept","refuse","rapport","pitch_miles","pitch_cond","urgency","ask","addon","finalize","release","greet","chat","unclear"]);

AI.classify=function({T,u,said}){
  const c=T.car;
  const prompt=`You parse speech for a car-lot negotiation game. A used-car manager just spoke to a customer. Classify what the MANAGER said into 1 to 3 intents, in the order said.
Car: ${label(c)}, ${c.miles} miles, condition ${c.cond}%. The manager's asking price is $${c.price}. Customer's latest counter: ${T.counter?"$"+T.counter:"none yet"}. Price already agreed: ${T.agreed?"$"+T.agreed:"no"}.
Intent objects:
${INTENTS}
Manager said: ${JSON.stringify(said)}
Reply with JSON only, like {"intents":[...]}.`;
  return guard(call(prompt,5000).then(text=>{
    const a=text.indexOf("{"),b=text.lastIndexOf("}");
    if(a<0||b<a)throw new Error("no json");
    const o=JSON.parse(text.slice(a,b+1));
    const out=[];
    for(const I of (o.intents||[]).slice(0,3)){
      if(!I||!OK.has(I.type))continue;
      if(I.type==="offer"){const p=Math.round(+I.price);if(!(p>=100&&p<=99999))continue;out.push({type:"offer",price:p})}
      else if(I.type==="ask"){if(["miles","year","condition"].includes(I.topic))out.push({type:"ask",topic:I.topic})}
      else if(I.type==="addon"){if(["warranty","gap","acc","finance"].includes(I.which))out.push({type:"addon",which:I.which})}
      else if(I.type==="chat"){
        const r=String(I.reply||"").trim().slice(0,200);
        if(r&&!/\$|\d{3,}|\bdeal\b|i'll take it/i.test(r))out.push({type:"chat",reply:r})
        else out.push({type:"unclear"});
      }
      else out.push({type:I.type});
    }
    return out;
  }));
};

AI.voice=function({u,T,text,said}){
  const ty=TYPES[u.type],c=T.car;
  const prompt=`You are ${u.name}, ${ty.who}. You are at a run-down used car lot, talking to the manager about a ${label(c)} (${c.miles} miles, ${c.note}). You came in ${u.need}.
Rewrite your reply below as natural spoken dialogue, one or two short sentences, in your own voice.
Rules: keep every dollar amount exactly as written. Keep the meaning and the decision exactly the same. Never reveal a maximum price. No quotation marks, no stage directions.
The manager just said: ${JSON.stringify(said||"")}
Your reply: ${JSON.stringify(text)}
Rewritten reply:`;
  return guard(call(prompt,4000).then(out=>{
    out=String(out||"").trim().replace(/^["'\s]+|["'\s]+$/g,"").replace(/\s*\n+\s*/g," ");
    if(!out||out.length>240)return null;
    const nums=(text.match(/\d[\d,]{2,}/g)||[]).map(n=>n.replace(/,/g,""));
    const have=(out.match(/\d[\d,]{2,}/g)||[]).map(n=>n.replace(/,/g,""));
    if(nums.some(n=>!have.includes(n))||have.some(n=>!nums.includes(n)))return null;
    return out;
  }));
};

window.AI=AI;
})();
