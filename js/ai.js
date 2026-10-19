"use strict";
// Optional AI customers. Claude only understands the player and voices the customer.
// The negotiation engine (talk.js) still owns every number, so a clever sentence can't break the game.
(function(){
const MODEL="claude-haiku-5-5", KEY="bobsApiKey", FLAG="bobsAI";
// Gemini models to try in order; a model this key can't use (404) falls through to the next.
const GEMINI=["gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-flash-lite-latest","gemini-2.5-flash-lite"];
let gemIdx=0,gemAuth=0;
// Gemini customers are unhinged: loosest filters for swearing and roasts, still no slurs or sexual content.
const GEM_SAFETY=[["HARASSMENT","BLOCK_NONE"],["DANGEROUS_CONTENT","BLOCK_NONE"],["HATE_SPEECH","BLOCK_ONLY_HIGH"],["SEXUALLY_EXPLICIT","BLOCK_ONLY_HIGH"]]
  .map(([c,t])=>({category:"HARM_CATEGORY_"+c,threshold:t}));
const UNHINGED=`Style: you are an unhinged, foul-mouthed South Park style character. Swear freely, roast the manager (Miguel, whose face is on every poster in the building), go on absurd tangents, overshare weird personal details, be dramatic and petty. Stay in character no matter what. No slurs, nothing sexual.`;
const unhinged=()=>AI.mode==="key"&&AI.provider()==="gemini";
// Ways to send a Google key; if one is refused as invalid, try the next before giving up.
const GEM_AUTH=[
  (u,k)=>[u,{"x-goog-api-key":k}],
  (u,k)=>[u+"?key="+encodeURIComponent(k),{}],
  (u,k)=>[u,{"authorization":"Bearer "+k}]
];
const AI={mode:"rules",enabled:false,fails:0,note:"",sample:null};
const store={
  get(k){try{return localStorage.getItem(k)}catch(e){return null}},
  set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
};
AI.on=()=>AI.enabled&&AI.mode!=="rules"&&AI.fails<3;
AI.voiceOn=()=>AI.on();
AI.hasKey=()=>!!store.get(KEY);
// The pasted key decides the provider: Anthropic keys start with sk-ant-; anything else is Google's
// (older Google keys start with AIza, the newer auth keys with AQ.).
AI.provider=()=>/^sk-ant-/.test(store.get(KEY)||"")?"claude":"gemini";
AI.who=()=>AI.mode==="key"&&AI.provider()==="gemini"?"Gemini":"Claude";
AI.status=()=>AI.mode==="rules"?"Built-in customers":AI.on()?(AI.mode==="sample"?"Claude customers (built in)":AI.who()+" customers (your API key)"):"Built-in customers";

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
  k=(k||"").replace(/\s+/g,"").replace(/^["']+|["']+$/g,"");store.set(KEY,k||null);
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
    AI.note=AI.mode==="key"?keyProblem(e):"Claude access was declined or isn't available.";
    return false;
  }
};

// Turn an API failure into something the player can act on.
function keyProblem(e){
  const k=store.get(KEY)||"",tag=` [sent to ${AI.provider()==="gemini"?"Google":"Anthropic"} · key starts "${k.slice(0,5)}…", ${k.length} characters · reply: ${String((e&&e.message)||"none").slice(0,160)}]`;
  return problem(e)+tag;
}
function problem(e){
  const st=e&&e.status,m=String((e&&e.message)||"");
  if(e&&e.name==="AbortError")return "Anthropic didn't answer in time. Check your connection and try again.";
  if(AI.provider()==="gemini")return geminiProblem(st,m);
  if(!st)return "Couldn't reach Anthropic from this page. Play from the GitHub Pages link, not a saved file or the claude.ai page.";
  if(st===401)return "Anthropic says the key is invalid. Copy it again from console.anthropic.com (it starts with sk-ant-) and paste only the key.";
  if(st===403)return "This key isn't allowed to use the API. Check its workspace permissions in the Anthropic console. ("+m+")";
  if(/credit|billing|balance/i.test(m))return "Your Anthropic account has no API credit. Add some under Settings → Billing in the console, then try again.";
  if(st===404)return "Anthropic couldn't find the model this game uses for your account. ("+m+")";
  if(st===429)return "Rate limited by Anthropic. Wait a minute and try again.";
  if(st===529||st>=500)return "Anthropic is overloaded right now. Try again in a minute.";
  return "Anthropic rejected the request: "+m;
}

function geminiProblem(st,m){
  if(!st)return "Couldn't reach Google from this page. Play from the GitHub Pages link.";
  if(/API key not valid|API_KEY_INVALID/i.test(m))return "Google says the key is invalid. Copy it again from aistudio.google.com/apikey (it starts with AQ. or AIza) and paste only the key. A brand-new key can take a minute to start working.";
  if(/expired|blocked|disabled/i.test(m))return "Google says this key is blocked or expired. Create a new one at aistudio.google.com/apikey. ("+m+")";
  if(st===403)return "This key isn't allowed to use the Gemini API. Make sure the Generative Language API is enabled for its project. ("+m+")";
  if(st===404)return "None of the Gemini models this game uses are available to your key. ("+m+")";
  if(st===429)return "Gemini's free limit is used up for now. Wait a minute (or until tomorrow for the daily limit) and try again.";
  if(st>=500)return "Gemini is overloaded right now. Try again in a minute.";
  return "Google rejected the request: "+m;
}
async function callGemini(prompt,signal){
  let first=null;
  for(;;){
    const [url,auth]=GEM_AUTH[gemAuth](`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI[gemIdx]}:generateContent`,store.get(KEY)||"");
    const r=await fetch(url,{
      method:"POST",signal,
      headers:Object.assign({"content-type":"application/json"},auth),
      body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],safetySettings:GEM_SAFETY,generationConfig:{maxOutputTokens:1024,temperature:1.1}})
    });
    if(r.status===404&&gemIdx<GEMINI.length-1){gemIdx++;continue}
    if(!r.ok){
      let m="";try{const e=await r.json();m=(e&&e.error&&e.error.message)||""}catch(e){}
      const err=new Error(m||"api "+r.status);err.status=r.status;
      if([400,401,403].includes(r.status)&&/key|credential|authenticat/i.test(m)){
        if(!first)first=err;
        if(gemAuth<GEM_AUTH.length-1){gemAuth++;continue}
        gemAuth=0;throw first;   // every way failed: report Google's answer to the plain key header
      }
      throw err;
    }
    const j=await r.json(),c=j.candidates&&j.candidates[0];
    return ((c&&c.content&&c.content.parts)||[]).filter(p=>!p.thought&&p.text).map(p=>p.text).join("");
  }
}

async function call(prompt,timeout){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout||5000);
  try{
    if(AI.mode==="sample"){
      const r=await AI.sample(prompt,{modelTier:"quick",cache:false,signal:ctl.signal});
      return (r&&r.text)||"";
    }
    if(AI.provider()==="gemini")return await callGemini(prompt,ctl.signal);
    const r=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",signal:ctl.signal,
      headers:{"content-type":"application/json","x-api-key":store.get(KEY)||"","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:MODEL,max_tokens:400,thinking:{type:"disabled"},messages:[{role:"user",content:prompt}]})
    });
    if(!r.ok){let m="";try{const e=await r.json();m=(e&&e.error&&e.error.message)||""}catch(e){}const err=new Error(m||"api "+r.status);err.status=r.status;throw err}
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
For a chat reply, the customer's personality: ${persona(u).who}.${unhinged()?" Voice: "+UNHINGED:""}
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
        const r=String(I.reply||"").trim().slice(0,unhinged()?280:200);
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
  const pe=persona(u);
  const prompt=`You are ${u.name}, ${ty.who}. Personality: ${pe.who}. You are at a run-down used car lot, talking to the manager, Miguel, about a ${label(c)} (${c.miles} miles, ${c.note}). You came in ${u.need}. It is day ${S.day}; Miguel's face is on ${S.day*12} employee-of-the-month posters around the lot.${T.wife?" Your wife is on the phone and you are relaying what she says.":""}
Rewrite your reply below as natural spoken dialogue, one or two short sentences, in your own voice.${unhinged()?"\n"+UNHINGED:""}
Rules: keep every dollar amount exactly as written. Keep the meaning and the decision exactly the same. Never reveal a maximum price. No quotation marks, no stage directions.
The manager just said: ${JSON.stringify(said||"")}
Your reply: ${JSON.stringify(text)}
Rewritten reply:`;
  return guard(call(prompt,4000).then(out=>{
    out=String(out||"").trim().replace(/^["'\s]+|["'\s]+$/g,"").replace(/\s*\n+\s*/g," ");
    if(!out||out.length>(unhinged()?320:240))return null;
    const nums=(text.match(/\d[\d,]{2,}/g)||[]).map(n=>n.replace(/,/g,""));
    const have=(out.match(/\d[\d,]{2,}/g)||[]).map(n=>n.replace(/,/g,""));
    if(nums.some(n=>!have.includes(n))||have.some(n=>!nums.includes(n)))return null;
    return out;
  }));
};

// End-of-day online reviews of Miguel, one per conversation. Returns [{stars,text}] or throws.
AI.reviews=function(entries){
  const prompt=`Write funny one-to-two sentence online reviews of a run-down used car lot called Bargain Bob's Auto Mart, written by customers about the manager, Miguel (his face is on every employee-of-the-month poster, even the dumpster). One review per customer below, in that customer's personality, based on what happened. Stars 1 to 5 to match how it went.${unhinged()?" "+UNHINGED:""}
${entries.map((e,i)=>`${i}. ${e.name}, ${e.who}. Car: ${e.car}. Outcome: ${e.out}${e.price?" for $"+e.price:""}.${e.cried?" Miguel cried during the deal.":""}${e.wife?" The customer's wife talked to Miguel on the phone.":""} Last lines: ${e.said}`).join("\n")}
Reply with JSON only: {"reviews":[{"i":0,"stars":1,"text":"..."}]}`;
  return call(prompt,9000).then(text=>{
    const a=text.indexOf("{"),b=text.lastIndexOf("}");if(a<0||b<a)throw new Error("no json");
    const o=JSON.parse(text.slice(a,b+1)),out=[];
    (o.reviews||[]).forEach(r=>{const i=r.i|0,st=Math.max(1,Math.min(5,Math.round(+r.stars||3))),t=String(r.text||"").trim().slice(0,260);if(entries[i]&&t)out[i]={stars:st,text:t}});
    return out;
  });
};

window.AI=AI;
})();
