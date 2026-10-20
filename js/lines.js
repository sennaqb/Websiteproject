"use strict";
// What customers say. The negotiation engine (talk.js) decides WHAT happens; this file decides how it sounds.
// line(u,kind,vars) picks a personality line most of the time, a general one otherwise, and avoids repeats
// within a conversation. Placeholders: {n} their counter, {p} agreed price, {a} an add-on, {car} the car.
(function(){
const ANY={
  intro:["Okay, I've been looking at this one for twenty minutes. Talk to me.","I parked across the street so nobody would see me here.","My cousin said you guys are the cheapest in town. Also the sketchiest.","Before we start: is that smell coming from the car or from you?","I'm just here because the bus doesn't come for another hour.","I saw your billboard. Your face is very... large on it."],
  far:["That's steep.","Come on, really?","No way.","That's a lot for this thing.","Are you out of your mind?","For THIS? With that dent?","I could buy a horse for that. A good horse.","My heart rate just went up.","Did you add a zero by accident?","Ha. No.","Sir, this is a used car lot, not a museum.","That number made my eye twitch."],
  close:["Getting closer.","Hmm. Almost.","We're not far off.","Okay, now we're talking.","Now THAT is a number I can respect. Almost.","I can feel it. We're close.","Okay, my palms are sweating. We're close.","You're warming me up, Miguel."],
  counter:["I can do {n}.","Best I can do is {n}.","I'd go {n}.","How about {n}?","{n}. Final-ish offer.","I've got {n} and a dream.","{n}, and I won't tell anyone you caved.","Let's say {n} and we both walk away happy."],
  refuse:["My offer stands at {n}.","I'm still at {n}.","Look, I'm at {n}.","{n}. I'm not moving, I'm a rock.","Still {n}. I can wait all day. I can't, actually, but I'll pretend.","{n}. Take it or I start crying. Not in a good way."],
  agree:["Alright, {p} works for me. What's next?","Okay, {p}. Let's get this done.","Fine, {p}. You drive a hard bargain, poster man.","You know what? {p}. Deal. Before I change my mind.","{p}. Shake on it. Firm handshake. Firmer. Okay, too firm.","Deal at {p}! I'm gonna tell everyone I robbed you."],
  walk:["We're too far apart. I'll look elsewhere.","Nope. I'm out. Good luck with your posters.","I'm leaving. The tube man had better manners.","That's it. I'm going to the lot across the street. They have a bouncy castle.","I'm out. I'm telling my group chat about this.","Goodbye forever. Or until next Tuesday."],
  rapport:["Ha, you're alright, Miguel.","Okay, I like you. Don't let it go to your head.","You know, you're more charming than your posters.","That's nice of you. Nobody asks me that.","Alright, alright, you got me smiling."],
  numbers:["Thanks, but let's talk numbers.","Sweet, but I didn't come here to make friends. Numbers.","Love the chit-chat. Now. The price.","I appreciate it, but my parking meter is running."],
  unclear:["Sorry, what price are you asking?","I didn't catch that. Say a number. A real one.","What? Are you okay? Price, please.","Was that English? Give me a number.","Miguel. Buddy. A number."],
  greet:["Hi there! So, what's your price on this one?","Hey. Let's skip the small talk. Price?","Hello! Your face is everywhere. Anyway, what's the price?"],
  thanks:["Thanks! Pleasure doing business.","Woo! I own a car! Kind of! Thanks, Miguel!","Thanks, man. If it breaks down, I know where your posters live.","Pleasure. I'm gonna name it after you. Just kidding. Or am I."],
  release:["Alright, thanks anyway. Have a good one.","No problem. Appreciate your time.","Sure, thanks. Maybe I'll come back.","Okay. This was weird. Bye, Miguel."],
  addonYes:["Sure, I'll take the {a}.","The {a}? Yeah, why not, I'm feeling rich.","Fine, throw in the {a}. Treat yo self.","Okay, the {a}. My accountant is going to scream."],
  addonNo:["I'll pass on that.","No thanks. I'm not made of money.","Nice try. No.","Hard pass. Next.","Absolutely not. Do I look like I have money?"],
  enough:["No thanks. That's enough extras. Just the car.","Stop. No more extras. I'm begging you.","If you say the word 'package' one more time, I'm leaving."],
  milesYes:["Those are low miles. That's a plus.","Low miles? Okay, okay. I see you."],
  milesNo:["That's not low miles to me.","Low? That odometer has seen things."],
  condYes:["It does look sharp. I like that.","Yeah, it cleans up nice. Like me."],
  sizzleYes:["Oh, {f}? Okay, that's nice.","{f}, huh? Alright, I see the value.","Ooh. {f}. Keep talking.","Okay, {f} is a plus. I'll give you that.","{f}? Didn't notice that. Nice."],
  sizzleHot:["{f}?! That's exactly my thing.","Wait, it has {f}? Now you've got my attention.","{f}. Okay. Okay okay okay. I want it.","You had me at {f}."],
  sizzleLie:["Uh, this car doesn't have {f}. I'm looking right at it.","{f}? Where? Show me. ...Yeah, that's what I thought.","Miguel. There is no {f}. Don't lie to me.","Nice try. No {f} on this thing."],
  sizzleAgain:["Yeah, you mentioned the {f}.","Right, the {f}. What else you got?","I heard you about the {f}. Next."],
  justify:["{p}? Why's it worth that? Sell me on it.","Whoa, {p}. What makes this thing worth {p}?","{p} for this? Convince me. What's special about it?","Okay, {p}. Why? What am I getting for that?"],
  cold:["Whoa. Slow down. I just got here. You don't even know what I need.","Numbers already? Buy me a coffee first, Miguel.","Easy, tiger. Ask me something about me first.","Do you say 'hi' to people, or do you just throw prices at them?"],
  hotYes:["That's... exactly what I needed to hear.","Okay. Now you're speaking my language.","You get it. You actually get it.","See, THAT'S why I came here."],
  hotNo:["Eh. I don't really care about that.","Cool, but that's not really my thing.","Mm, not a big deal for me."],
  needsAgain:["I told you, man. {need}","Like I said: {need}"],
  condNo:["I'm not seeing that. Looks rough to me.","Sharp? There's a raccoon living in the trunk."]
};
const BY={
  conspiracy:{
    intro:["Before we talk, I need you to put your phone in the microwave.","I know this car has a tracker. Everything has a tracker. Even you, Miguel.","I scanned the lot for drones on the way in. Two. I counted two."],
    far:["That price is exactly what THEY want me to pay.","Interesting number. Very interesting. Who told you to say that?","That's a government number, Miguel."],
    close:["Okay. That number doesn't feel bugged.","Closer. I'm checking it against my notes. In my hat."],
    agree:["{p}. But I'm paying in cash and you never saw me.","Fine, {p}. If anyone asks, I was never here."],
    walk:["I KNEW this was a setup. I'm out. Don't follow me.","They got to you, Miguel. I'm leaving through the back."],
    rapport:["You seem trustworthy. Which is exactly what a plant would seem.","Okay. You can know my first name. Not my real one."],
    unclear:["Was that a code word? Say it again, slower.","Is your mic on? Who's listening?"],
    thanks:["Pleasure. Remember: we never met.","Thanks. I'll be removing the radio. You know why."],
    refuse:["{n}. And I'm writing down that you refused.","Still {n}. They can't make me go higher. Nobody can."]},
  karen:{
    intro:["I've been standing here for four minutes and nobody offered me water.","First of all, I'd like to speak to whoever is in charge of the posters.","I have a coupon. It's from a different dealership. You'll honor it."],
    far:["Excuse me? I'd like to speak to your manager about that number.","Absolutely not. I'm writing this down.","That is UNACCEPTABLE. Where is Bob?"],
    close:["Better. But I'm still leaving a review.","Fine. That's almost reasonable. Almost."],
    agree:["{p}. And I want a free air freshener. The good one.","Fine, {p}. I'm still mentioning your attitude in my review."],
    walk:["I'm calling corporate. Do you even HAVE corporate?","This is the worst service I've had since the DMV. Goodbye."],
    rapport:["Hm. You're polite. I'll note that in the review.","Well. At least SOMEONE here has manners."],
    unclear:["Speak up. I'm not going to ask twice.","Do you talk to all your customers like that?"],
    thanks:["Thank you. You'll get three stars. Maybe three and a half.","Fine. I'll let Bob know you were adequate."],
    refuse:["{n}. And that's very generous of me.","{n}. I've been very patient with you."]},
  pokemon:{
    intro:["Before we start: how do you feel about trading cards as currency?","I've got a binder in the car. Well, the bus. You'll want to see it."],
    far:["That's like four Charizards. FOUR.","Okay, that's a whole booster box. No."],
    close:["Okay, that's like one rare holo away. We're close.","Almost. I'd throw in a Pikachu for that."],
    agree:["{p}! Can I pay part of it in shinies? No? Fine. {p}.","{p}. Gotta catch 'em all, starting with this car."],
    walk:["You don't respect the cards. I'm out.","My binder and I are leaving."],
    rapport:["You like Pokémon? Wait, you didn't say that. But you might.","You have strong Psychic-type energy, Miguel."],
    unclear:["Was that a Pokémon? Say it again.","I didn't catch that. Say it like you're catching something."],
    thanks:["Thanks! I'm naming the car Snorlax. Because it's slow.","Pleasure doing business. Here's a common card. For you."],
    refuse:["{n}. Plus a first-edition card. Okay, not first edition.","Still {n}. My cards are worth more than your offer."]},
  grandma:{
    intro:["Sweetheart, I've bought eleven cars in my life. You'll be my twelfth victim.","I brought hard candy. You don't get one unless you behave.","My grandson said to be nice to you. My grandson is wrong a lot."],
    far:["Oh honey, no. I'll smack you with my purse.","In my day that bought you a house AND a mule.","That number is giving me heart palpitations. Lower it."],
    close:["Now you're being a good boy. A little lower.","Almost, dear. Grandma's almost happy."],
    agree:["{p}. And you'll carry my groceries to the car, dear.","Fine, {p}. You remind me of my late husband. He also overcharged."],
    walk:["I've outlived three car salesmen. I'll outlive you. Goodbye.","I'm going home to watch my programs. Hmph."],
    rapport:["Aren't you sweet. Still not paying sticker.","You've got a nice face. Too many posters of it, though."],
    unclear:["Speak up, sonny, I'm 84.","What? Use your words, dear."],
    thanks:["Thank you, dear. Here's a hard candy. You earned it.","Lovely. I'll tell the girls at bingo about you."],
    refuse:["{n}, dear. Grandma doesn't negotiate twice.","Still {n}. I have nowhere to be until bingo."]},
  mom:{
    intro:["Hi. My mom's here too. She's gonna ask about the airbags.","Mom says I'm not allowed to buy anything without her."],
    far:["Mom just shook her head. That's a no.","My mom says that's highway robbery. She's not wrong."],
    close:["Mom nodded! She nodded! Almost there.","Mom says closer, but she wants to see the trunk."],
    agree:["Mom says {p} is okay! I'm a grown-up now!","{p}. Mom, can you sign? Mom? MOM."],
    walk:["Mom says we're leaving. Sorry, Miguel.","My mom is already in the car. I have to go."],
    rapport:["My mom thinks you're nice. That's a big deal.","Mom says you seem like a good boy."],
    unclear:["Mom didn't understand that either.","Can you say that again? Mom was talking."],
    thanks:["Thanks! Mom, I bought a car! Mom's crying.","Thank you! Mom wants a picture with you."],
    refuse:["Mom says {n} and not a penny more.","{n}. Mom's orders."]},
  influencer:{
    intro:["What's up, stream! We're at the WORST car lot in town. Say hi, Miguel!","Hold on, let me get the lighting right. Okay. Go."],
    far:["Chat is saying that's a scam. Chat is never wrong.","Chat is spamming L's, Miguel."],
    close:["Chat says we're close! Somebody just donated five bucks.","Ooh, chat's hyped. We're almost there."],
    agree:["{p}! Chat, we did it! Smash that like button!","{p}. This is going in the thumbnail. Your face. Shocked."],
    walk:["I'm out. Chat, this guy just lost eleven customers.","Ending the stream. This was not content."],
    rapport:["Chat likes you! Two people said 'based'.","You're kind of a natural on camera, Miguel."],
    unclear:["Wait, chat couldn't hear that. Say it again for the stream.","Can you repeat that with more energy?"],
    thanks:["Thanks, Miguel! Follow me for more car content!","Pleasure! You're going viral. Probably. Eleven views."],
    refuse:["{n}. Chat agrees. Chat always agrees with me.","{n}, and that's for the stream, bro."]},
  crypto:{
    intro:["Before we start, do you accept Dogecoin? Asking for a portfolio.","I'm only here because my coins dipped. Temporarily. They'll moon."],
    far:["That's a rug pull, bro.","That number is not bullish, Miguel.","Bro. BRO. That's like a whole Bitcoin. In 2012."],
    close:["Okay, that's a buy signal. Almost.","We're close. I can feel the green candles."],
    agree:["{p}. Diamond hands. Let's go.","{p}. To the moon. Slowly. It's a used car."],
    walk:["I'm out. Have fun staying poor. Ha. Ha.","This deal is a bear market. I'm leaving."],
    rapport:["You've got founder energy, Miguel. Ever thought about an NFT?","You get it. You're early. Most people aren't early."],
    unclear:["Was that a whitepaper? Explain like I'm five.","Say it again, my AirPods were on a podcast."],
    thanks:["Pleasure, bro. I'll pay you back in coins when they moon.","Thanks! This car is my new long-term hold."],
    refuse:["{n}. I'm HODLing that number.","Still {n}. Number go down, not up."]},
  dumped:{
    intro:["Hey. Sorry. I just got dumped. I need a car she's never seen.","My ex kept the Corolla. And the friends. And Netflix."],
    far:["That's what she said about me. Too much.","Great. Another thing I can't afford. Like love."],
    close:["Okay. That's closer than she ever let me get.","Almost. Like our relationship. Almost."],
    agree:["{p}. Finally something's going right.","{p}. This car will never leave me. Right? RIGHT?"],
    walk:["Everyone leaves. Now it's me leaving. Bye.","I'm gonna go sit in the parking lot and listen to sad songs."],
    rapport:["Thanks. Nobody's asked me how I am in weeks.","You're a good listener, Miguel. Better than she was."],
    unclear:["Sorry, I zoned out. I was thinking about her.","What? Sorry. Bad week."],
    thanks:["Thank you. I'm gonna drive past her house. Just once.","Thanks, man. You're the only stable thing in my life right now."],
    refuse:["{n}. It's all I have left. That and a cat. Her cat.","{n}. My lawyer took the rest."]},
  prepper:{
    intro:["How many cans of beans fit in the trunk? Be precise.","When the grid goes down, will this thing still start? Yes or no."],
    far:["When society collapses, money won't matter. Until then, no.","For that price it better run on rainwater."],
    close:["Okay. That's a fair apocalypse price.","Almost. Throw in a jerry can."],
    agree:["{p}. I'll add the armor plating myself.","{p}. Good. My bunker has a parking spot."],
    walk:["I'm leaving. You'll remember this when the zombies come.","Fine. I'll get a horse. Horses don't need gas."],
    rapport:["You've got survival instincts, Miguel. I can tell.","When it all goes down, you can stay in my bunker. Third bunk."],
    unclear:["Speak clearly. In a crisis, there's no time to repeat.","What? Was that a code?"],
    thanks:["Thanks. See you on the other side.","Pleasure. I'll radio you when it starts."],
    refuse:["{n}. Plus forty cans of beans. Final.","Still {n}. I'm rationing my money."]},
  mj:{
    intro:["HEE-HEE! I'm bad, I'm bad, you know it. Also I need a car. SHAMONE!","SHAMONE! The way you make me feel... is like I need a sedan. HOO!","OW! Who's bad? Me. I'm bad. With money. HEE-HEE!"],
    far:["That price is a THRILLER, Miguel! And not in a good way! OW!","HOO! BEAT IT! Just BEAT IT! That number, I mean. SHAMONE!","SHAMONE, Miguel! That price is a smooth criminal! HEE-HEE!"],
    close:["Ooh, we're getting closer. Like the man in the mirror. HEE-HEE!","HEE-HEE! Almost. Don't stop 'til you get enough! OW!"],
    agree:["{p}! HEE-HEE! I'm starting with the man in the mirror, and he's buying a car! SHAMONE!","{p}! OW! This is it! HEE-HEE!"],
    walk:["Just BEAT IT! I'm beating it! Moonwalking out of here! HEE-HEE!","You are not alone, Miguel. But I'm leaving. HOO! SHAMONE!"],
    rapport:["You're smooth, Miguel. A SMOOTH CRIMINAL! HEE-HEE!","HEE-HEE! You've got that rock-with-you energy! OW!"],
    unclear:["SHAMONE? Say that again! HEE-HEE!","Annie, are you okay? Are you okay, Annie? I didn't catch that."],
    thanks:["HEE-HEE! Thank you, Miguel! This is IT! SHAMONE!","OW! I'm off the wall! And on the road! HEE-HEE!"],
    refuse:["{n}! I'm BAD! I'm bad, you know it! SHAMONE!","{n}. Billie Jean is not my lover, and that's my final offer! HEE-HEE!"],
    sizzleYes:["{f}?! HEE-HEE! That's BAD! Bad means good! SHAMONE!"],
    cold:["HOO! Slow down, Miguel! You gotta rock with me first! HEE-HEE!"]},
  elvis:{
    intro:["Well, uh-huh-huh. Evening, little mama. I mean, sir. I'm looking for a Cadillac. This'll do.","Thank you, thank you very much for having me. Now, what kind of hunk-a-hunk of burning steel is this?"],
    far:["That price is all shook up, baby. Uh-huh.","Whoa now. Don't be cruel, Miguel. Don't be cruel.","That number's got me feeling like a hound dog. Cryin' all the time."],
    close:["Now you're talkin', baby. Uh-huh-huh.","We're gettin' close. I can't help falling in love with this deal."],
    agree:["{p}. Thank you. Thank you very much.","{p}, baby. It's now or never. Uh-huh-huh."],
    walk:["Elvis has left the building.","Return to sender, baby. Address unknown. Thank you very much."],
    rapport:["You ain't nothin' but a hound dog, Miguel. That's a compliment.","Well, bless my soul. You're all right, baby."],
    unclear:["Say what now, baby? Uh-huh?","Little less conversation, little more clarity, please."],
    thanks:["Thank you. Thank you very much. Elvis is leaving the building in a used car.","Uh-huh-huh. Viva Las Vegas, baby."],
    refuse:["{n}, baby. Thank you very much.","{n}. Love me tender, love me true, but that's all I'm givin' you."],
    cold:["Whoa, baby. A little less conversation about price, a little more action of the friendly kind."]},
  arnold:{
    intro:["I need your clothes, your boots, and your car. Just the car, actually.","Hello. I am here for a vehicle. Come with me if you want to sell."],
    far:["That price is a total recall. Recall it.","Get to the chopper! That number is a disaster!","You call that a price? THAT'S a price? It's not a price. It's a tumor."],
    close:["Good. We are close. Like a T-800 to its target.","Closer. Pump it up, Miguel."],
    agree:["{p}. Hasta la vista, baby.","{p}. Deal. I am a customer now."],
    walk:["I'll be back. ...No, I will not.","Hasta la vista, baby. Forever."],
    rapport:["You are not a girlie man, Miguel. I respect that.","Good. You have a strong handshake. Like a terminator."],
    unclear:["What? Speak clearly. I am Austrian.","Say it again. My English, it is perfect, but you mumble."],
    thanks:["Thank you. I'll be back. For the oil change.","Hasta la vista, Miguel."],
    refuse:["{n}. It's not a tumor. It's my offer.","{n}. Do it. DO IT NOW."],
    cold:["Stop. You are a salesman, not a terminator. Talk to me first."]},
  hungry:{
    intro:["Before we start, is that a hot dog cart across the street?","I haven't eaten in like forty minutes. Let's make this quick."],
    far:["For that price I could eat at the buffet every day for a year.","That's a lot of tacos, Miguel. A LOT of tacos."],
    close:["Okay, closer. Is there food in the showroom?","Almost. My stomach just growled in agreement."],
    agree:["{p}! Let's celebrate. You're buying lunch.","{p}. Does it come with a free pizza? No? Still deal."],
    walk:["I'm going to get a burrito and think about my choices.","Too much. I'm leaving. The hot dog cart understands me."],
    rapport:["You like food? We're gonna be friends, Miguel.","You seem like a guy who knows a good wing spot."],
    unclear:["Sorry, I was thinking about nachos. Say again?","Huh? I'm low on blood sugar."],
    thanks:["Thanks! First stop: drive-thru.","Pleasure! I'm naming the car Big Mac."],
    refuse:["{n}. And that's my lunch money too.","Still {n}. A man's gotta eat."]},
  flirt:{
    intro:["Well, hello. You must be the famous Miguel. You're taller than your posters.","Hi, handsome. I hear you're the man who makes deals happen."],
    far:["Oh, Miguel. You don't really want to charge ME that, do you?","That's cute. Now give me the real number, sweetheart."],
    close:["Mm, now you're being sweet.","Closer. I like a man who listens."],
    agree:["{p}. You're a doll, Miguel.","{p}. I knew you'd come around, handsome."],
    walk:["Shame. I thought you were a gentleman. Bye, Miguel.","You just lost the best customer you'll ever have. Ciao."],
    rapport:["Aren't you charming.","Oh, stop. No, go on."],
    unclear:["Say that again, slower. I like your voice.","Hm? You lost me, handsome."],
    thanks:["Thank you, Miguel. Call me if the warranty breaks.","Pleasure doing business. Don't blush."],
    refuse:["{n}, darling. That's my number.","Still {n}. Don't make me pout."]},
  normal:{
    intro:["Hi. Is it normal that the tube man was staring at me?","Okay, just so I know: why are there so many posters of you?"],
    far:["Yikes. No thanks.","Is that real? That can't be real."],
    close:["Okay, that's getting reasonable.","Alright, we're getting somewhere."],
    agree:["Okay, {p}. That's fair.","{p}. Deal. Can I leave now? This place is a lot."],
    walk:["Nope. This is all too weird. Bye.","I'm gonna go. The posters are watching me."],
    rapport:["Okay, you're nicer than I expected.","Thanks, that's actually nice."],
    unclear:["Sorry, what?","I'm not sure what you mean."],
    thanks:["Thanks! That was... an experience.","Thanks. I'll tell my friends. Maybe."],
    refuse:["I'm at {n}. Sorry.","Still {n}."]}
};
function fill(s,v){return s.replace(/\{(\w+)\}/g,(m,k)=>v&&v[k]!=null?v[k]:m)}
// Pick a line nobody has said yet in this conversation; personality lines win most of the time.
window.line=function(u,kind,vars){
  const own=((BY[u&&u.persona]||{})[kind])||[],gen=ANY[kind]||[];
  const said=typeof T!=="undefined"&&T?(T.said||(T.said=new Set())):null;   // T: the open conversation (talk.js)
  const fresh=a=>a.filter(s=>!said||!said.has(s));
  let pool=own.length&&Math.random()<.7?fresh(own):[];
  if(!pool.length)pool=fresh(gen);
  if(!pool.length)pool=fresh(own);
  if(!pool.length)pool=own.concat(gen);
  if(!pool.length)return "";
  const s=pool[Math.random()*pool.length|0];if(said)said.add(s);
  const out=fill(s,vars);return out.charAt(0).toUpperCase()+out.slice(1);
};
})();
