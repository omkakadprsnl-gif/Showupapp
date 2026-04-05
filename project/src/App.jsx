import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════════
   SHOWUP MVP — Supabase · INR · UPI Manual · Nunito / Duolingo
   ═══════════════════════════════════════════════════════════════ */

const supabase = createClient(
  "https://eybytpgtrnjpreazzjws.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Ynl0cGd0cm5qcHJlYXp6andzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTEyMzEsImV4cCI6MjA4OTkyNzIzMX0.zwKOB6C4fHkMG0YngR_dkrwqXzwXHH10-HbsiByY4oY"
);

const C = {
  bg:"#131F24",surf:"#1A2B32",card:"#1F3640",raised:"#243D49",
  border:"#2C4A56",ink:"#FFFFFF",sub:"#8BA4AF",faint:"#5A7A87",muted:"#3A5563",
  green:"#7C3AED",greenD:"#6D28D9",greenDD:"#5B21B6",greenL:"rgba(124,58,237,.15)",greenLL:"rgba(124,58,237,.08)",
  gold:"#FFC800",goldD:"#E6B400",goldL:"rgba(255,200,0,.15)",
  red:"#FF4B4B",redD:"#E63E3E",redL:"rgba(255,75,75,.15)",
  orange:"#FF9600",orangeD:"#E08000",orangeL:"rgba(255,150,0,.15)",
  blue:"#1CB0F6",blueD:"#1899D6",blueL:"rgba(28,176,246,.15)",
  purple:"#CE82FF",purpleD:"#A855D4",purpleL:"rgba(206,130,255,.15)",
};
const CUR="\u20B9";
const CHARITIES=[
  {id:1,name:"Nanhi Kali",desc:"Girl child education",icon:"\uD83D\uDCDA"},
  {id:2,name:"CRY India",desc:"Children's rights",icon:"\uD83E\uDDD2"},
  {id:3,name:"Teach For India",desc:"Educational equity",icon:"\uD83C\uDF93"},
  {id:4,name:"GiveIndia",desc:"Verified giving",icon:"\uD83E\uDD1D"},
  {id:5,name:"HelpAge India",desc:"Senior citizens",icon:"\uD83D\uDC74"},
  {id:6,name:"WWF India",desc:"Wildlife conservation",icon:"\uD83D\uDC3E"},
];
const UPI_ID="9607810111@ybl";
const VAPID_PUBLIC_KEY="BLS41_PAmNGtf9hdQ-3nVR4zPPtv5TTvIDPqVgkpjeLJnqkzE8KChHf2S-pR4L8KSNiSZ3zvGe_uAT9FLhySFXo";

async function registerPush(userId){
  try{
    if(!("serviceWorker" in navigator)||!("PushManager" in window)) return;
    const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/"});
    await navigator.serviceWorker.ready;
    const perm=await Notification.requestPermission();
    if(perm!=="granted") return;
    const sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:VAPID_PUBLIC_KEY
    });
    await supabase.from("push_subscriptions").upsert({
      user_id:userId,
      subscription:sub.toJSON()
    },{onConflict:"user_id",ignoreDuplicates:true});
  }catch(e){console.warn("Push:",e.message);}
}

/* ── Bubble pop sound + haptic ───────────────────────────── */

/* ── Image compression — reduces upload size by ~80% ── */
async function compressImage(file, maxWidthPx=1080, qualityVal=0.72){
  return new Promise(resolve=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      const ratio=Math.min(1, maxWidthPx/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(img.width*ratio);
      canvas.height=Math.round(img.height*ratio);
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob=>resolve(blob||file),
        file.type==='image/png'?'image/png':'image/jpeg',
        file.type==='image/png'?0.9:qualityVal
      );
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
    img.src=url;
  });
}


/* ── Rate limiting: prevent double-taps and spam submissions ── */
const _lastSubmit={};
function rateLimit(key, minMs=3000){
  const now=Date.now();
  if(_lastSubmit[key]&&now-_lastSubmit[key]<minMs) return false;
  _lastSubmit[key]=now;
  return true;
}
function idempotencyKey(userId, type, id){
  // Same user + type + id + day = same key. Prevents duplicate submissions.
  const day=new Date().toISOString().split('T')[0];
  return `${userId}_${type}_${id}_${day}`;
}

/* ── Bell chime: pleasing two-tone ding for UTR submit + check-in ── */
function bellChime(){
  if(navigator.vibrate) navigator.vibrate([20,50,15]);
  try{
    var a=new(window.AudioContext||window.webkitAudioContext)();
    var now=a.currentTime;
    // Two bell tones for a nice chime
    [[523,0],[659,0.12]].forEach(function(pair){
      var freq=pair[0], delay=pair[1];
      var o=a.createOscillator();
      var g=a.createGain();
      o.connect(g);g.connect(a.destination);
      o.type='sine';
      o.frequency.value=freq;
      g.gain.setValueAtTime(0,now+delay);
      g.gain.linearRampToValueAtTime(0.35,now+delay+0.01);
      g.gain.exponentialRampToValueAtTime(0.001,now+delay+0.6);
      o.start(now+delay);
      o.stop(now+delay+0.6);
    });
    setTimeout(function(){a.close();},1000);
  }catch(e){}
}


const HABITS=[
  {n:"Morning Run",     i:"🏃", verify:"photo"},
  {n:"Gym Workout",     i:"💪", verify:"photo"},
  {n:"Read Daily",      i:"📖", verify:"photo"},
  {n:"Meditate",        i:"🧘", verify:"video"},
  {n:"Yoga",            i:"🤸", verify:"video"},
  {n:"Wake Up Early",   i:"⏰", verify:"tap", wakeCustom:true},
  {n:"Study Daily",     i:"📚", verify:"photo"},
  {n:"Eat Healthy",     i:"🥗", verify:"photo"},
  {n:"Limit Screentime",i:"📱", verify:"screenshot"},
];
/* Screenshot window: 9 PM – 11:59 PM */
const SS_HOUR_START=21;
/* Wake-up window: 4:00 AM – 6:30 AM */
const WAKE_HOUR_START=4;
const WAKE_HOUR_END=9; // fallback max — actual end = challenge wake_hour + 1

/* ── Server time ─────────────────────────────────────────────
   ALL time-based logic uses this. Never new Date() for validation.
   Fetches current IST time from Supabase's clock (server-controlled).
   Falls back to device only if network fails.
   ───────────────────────────────────────────────────────────── */
let _serverTimeOffset=0; // ms offset: serverTime = Date.now() + _serverTimeOffset
async function syncServerTime(){
  try{
    const t0=Date.now();
    const {data}=await supabase.rpc("get_server_time"); // returns ISO string
    const t1=Date.now();
    if(data){
      const serverMs=new Date(data).getTime();
      const deviceMs=Math.round((t0+t1)/2);
      _serverTimeOffset=serverMs-deviceMs;
    }
  }catch(e){/* silent — falls back to device */}
}
function serverNow(){return new Date(Date.now()+_serverTimeOffset);}
// Always read IST hour — device timezone is irrelevant
function serverHour(){
  const d=serverNow();
  const istStr=d.toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hour12:false});
  // istStr format: "HH:MM"
  const parts=istStr.split(":");
  return parseInt(parts[0],10)+(parseInt(parts[1],10)/60);
}
// Get IST date string YYYY-MM-DD from a Date object
function toISTDateStr(d){
  return d.toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}); // en-CA gives YYYY-MM-DD
}
function istMidnight(d){
  // Returns a Date representing midnight IST for the given Date
  const s=toISTDateStr(d);
  // Parse as IST midnight by appending +05:30
  return new Date(s+"T00:00:00+05:30");
}
function serverDaysSince(isoDate){
  const startMid=istMidnight(new Date(isoDate));
  const todayMid=istMidnight(serverNow());
  return Math.floor((todayMid-startMid)/(864e5));
}
function Styles(){return <style>{`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body,#root{font-family:'Nunito',sans-serif}
input,button,textarea{font-family:'Nunito',sans-serif;outline:none}
input::placeholder{color:${C.faint}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes pop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}
@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes gritPop{0%{transform:scale(.8);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
@keyframes waterDrop{0%{transform:translateY(-120px) scaleX(0.7);opacity:0}40%{opacity:1}100%{transform:translateY(0) scaleX(1);opacity:1}}
@keyframes fireOut{0%{transform:scale(1);filter:brightness(1)}60%{transform:scale(1.2);filter:brightness(1.3)}100%{transform:scale(0);filter:brightness(0);opacity:0}}
@keyframes smokeUp{0%{transform:translateY(0) scale(0.5);opacity:0.8}100%{transform:translateY(-60px) scale(1.5);opacity:0}}
@keyframes overlayIn{from{opacity:0}to{opacity:1}}
.fadeUp{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
.pop{animation:pop .35s cubic-bezier(.34,1.56,.64,1) both}
.bounce{animation:bounce 2s ease infinite}
.gritPop{animation:gritPop .5s cubic-bezier(.34,1.56,.64,1) both .1s}
.waterDrop{animation:waterDrop .7s cubic-bezier(.34,1.56,.64,1) both}
.fireOut{animation:fireOut .6s ease-out both}
.smokeUp{animation:smokeUp 1s ease-out both .5s}
.overlayIn{animation:overlayIn .3s ease both}
.btn{transition:transform .08s;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}
.btn:active{transform:translateY(2px)!important}
.hs{scrollbar-width:none}.hs::-webkit-scrollbar{display:none}
`}</style>;}

/* ── Shared UI ─────────────────────────────────────────── */
const Screen=({children,s={}})=><div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",overflowX:"hidden",background:C.bg,...s}} className="hs">{children}</div>;
const StatusBar=()=>null; // OS handles real status bar on device
const TopBar=({title,onBack,right})=><div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 20px 4px",flexShrink:0}}>{onBack&&<button onClick={onBack} className="btn" style={{width:42,height:42,borderRadius:14,background:C.card,border:`2px solid ${C.border}`,borderBottom:`4px solid ${C.border}`,color:C.sub,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2190"}</button>}<div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink,flex:1}}>{title}</div>{right}</div>;
const Btn3D=({children,onClick,color=C.green,darkColor,textColor="#fff",disabled,full,s={}})=>{
  const dc=darkColor||(color===C.green?C.greenDD:color===C.red?C.redD:color===C.blue?C.blueD:color===C.gold?C.goldD:color===C.orange?C.orangeD:color===C.purple?C.purpleD:C.border);
  return <button onClick={!disabled?onClick:undefined} className="btn" style={{fontFamily:"Nunito",fontWeight:800,fontSize:16,border:"none",borderRadius:16,padding:"14px 24px",background:color,color:textColor,borderBottom:`4px solid ${dc}`,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.4:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:full?"100%":undefined,...s}}>{children}</button>;
};
const BtnOutline=({children,onClick,full})=><button onClick={onClick} className="btn" style={{fontFamily:"Nunito",fontWeight:800,fontSize:15,background:C.card,border:`2px solid ${C.border}`,borderBottom:`4px solid ${C.border}`,borderRadius:16,padding:"13px 20px",color:C.blue,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:full?"100%":undefined}}>{children}</button>;
const Bar=({pct,c=C.green,h=14})=><div style={{height:h,background:C.raised,borderRadius:99,overflow:"hidden",border:`2px solid ${C.border}`}}><div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:c,borderRadius:99,transition:"width .8s"}}/></div>;
const Chip=({children,c=C.green,sz=12})=><span style={{background:`${c}22`,color:c,fontFamily:"Nunito",fontSize:sz,fontWeight:800,padding:"4px 12px",borderRadius:99,whiteSpace:"nowrap",border:`2px solid ${c}33`}}>{children}</span>;
const Card=({children,style={},onClick})=><div onClick={onClick} style={{background:C.card,borderRadius:18,padding:16,border:`2px solid ${C.border}`,borderBottom:`4px solid ${C.border}`,...style}} className={onClick?"btn":""}>{children}</div>;
const Input=({value,onChange,placeholder,type="text",icon})=><div style={{background:C.surf,border:`2px solid ${C.border}`,borderBottom:`4px solid ${C.border}`,borderRadius:16,padding:"13px 16px",display:"flex",alignItems:"center",gap:10}}>{icon&&<span style={{fontSize:18}}>{icon}</span>}<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} type={type} style={{flex:1,border:"none",background:"none",fontFamily:"Nunito",fontWeight:700,fontSize:15,color:C.ink}}/></div>;
const Mascot=({size=48,mood="happy"})=><div style={{width:size,height:size,borderRadius:size*.3,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",border:`3px solid ${C.greenD}`,borderBottom:`5px solid ${C.greenD}`,position:"relative"}}><span style={{fontSize:size*.5,lineHeight:1}}>{"\u2663"}</span>{mood==="fire"&&<span style={{position:"absolute",top:-8,right:-6,fontSize:size*.35}}>{"\uD83D\uDD25"}</span>}</div>;
const Loading=()=><div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:C.bg}}><div style={{textAlign:"center"}}><Mascot size={56}/><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:16,color:C.sub,marginTop:12}}>Loading...</div></div></div>;
const SummaryRow=({label,value,c=C.ink,icon})=><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.sub,display:"flex",alignItems:"center",gap:6}}>{icon&&<span>{icon}</span>}{label}</span><span style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:c}}>{value}</span></div>;

const BottomNav=({active,go})=>{
  const items=[{id:"home",l:"Home",e:"\uD83C\uDFE0"},{id:"habits",l:"Habits",e:"\uD83C\uDFAF"},{id:"wall",l:"Wall",e:"\uD83C\uDF0D"},{id:"leaderboard",l:"Rank",e:"\uD83C\uDFC6"},{id:"profile",l:"You",e:"\uD83D\uDC64"}];
  return <div style={{background:C.surf,borderTop:`2px solid ${C.border}`,padding:"6px 0 28px",display:"flex",flexShrink:0}}>{items.map(it=>{const on=active===it.id;return <button key={it.id} onClick={()=>go(it.id)} className="btn" style={{flex:1,background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 0"}}><div style={{width:44,height:36,borderRadius:12,background:on?C.blueL:"transparent",border:on?`2px solid ${C.blue}44`:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{it.e}</div><span style={{fontFamily:"Nunito",fontWeight:800,fontSize:10,color:on?C.blue:C.faint}}>{it.l}</span></button>;})}</div>;
};

/* ══════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════ */
function Auth({onAuth}){
  const [mode,setMode]=useState("login"); // "login" | "signup" | "forgot"
  const [identifier,setIdentifier]=useState(""); // email or username for login
  const [email,setEmail]=useState("");           // email only for signup
  const [pass,setPass]=useState("");
  const [name,setName]=useState("");
  const [refInput,setRefInput]=useState("");

  const [err,setErr]=useState("");
  const [info,setInfo]=useState(""); // success messages
  const [loading,setLoading]=useState(false);

  const switchMode=(m)=>{setMode(m);setErr("");setInfo("");};

  // Resolve identifier → email (handles username or email input)
  const resolveEmail=async(id)=>{
    const v=id.trim();
    if(v.includes("@")) return v; // already an email
    // Look up by name field in profiles
    const {data}=await supabase.from("profiles").select("id").eq("name",v).limit(1);
    if(data&&data[0]){
      // Get email from auth via the user id — we can't read auth.users directly,
      // so we store email in profiles at signup
      const {data:p}=await supabase.from("profiles").select("email").eq("name",v).limit(1);
      if(p&&p[0]?.email) return p[0].email;
    }
    // Fallback: treat as email anyway (will fail with Supabase's error)
    return v;
  };

  const handleLogin=async()=>{
    if(!identifier.trim()||!pass){setErr("Enter your username/email and password.");return;}
    setErr("");setLoading(true);
    try{
      const resolvedEmail=await resolveEmail(identifier);
      const {error}=await supabase.auth.signInWithPassword({email:resolvedEmail,password:pass});
      if(error){
        // Give a friendlier message
        if(error.message.includes("Invalid login")) throw new Error("Wrong username/email or password.");
        throw error;
      }
      onAuth();
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  const handleSignup=async()=>{
    if(!name.trim()||!email.trim()||!pass){setErr("Fill in all required fields.");return;}
    if(!email.includes("@")){setErr("Enter a valid email address.");return;}
    if(pass.length<6){setErr("Password must be at least 6 characters.");return;}
    setErr("");setLoading(true);
    try{
      // Check username is not already taken
      const {data:existing}=await supabase.from("profiles").select("id").eq("name",name.trim()).limit(1);
      if(existing&&existing.length>0){
        setErr("Username \""+name.trim()+"\" is already taken. Please choose a different name.");
        setLoading(false);return;
      }
      const {data,error}=await supabase.auth.signUp({email,password:pass,options:{data:{name}}});
      if(error) throw error;
      if(data.user){
        // Referral code — from input field or URL
        const refCode=(refInput.trim()||new URLSearchParams(window.location.search).get("ref")||"").toUpperCase();
        let referredBy=null;
        if(refCode){
          const {data:referrer}=await supabase.from("profiles").select("id").eq("referral_code",refCode).maybeSingle();
          if(referrer){
            referredBy=referrer.id;
            // Insert into referrals table
            await supabase.from("referrals").insert({referrer_id:referrer.id,referred_id:data.user.id}).catch(()=>{});
          }
        }
        await supabase.from("profiles").update({name,email,referred_by:referredBy}).eq("id",data.user.id);
      }
      onAuth();
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  const handleForgot=async()=>{
    if(!identifier.trim()){setErr("Enter your email address.");return;}
    if(!identifier.includes("@")){setErr("Enter a valid email address (not username) for reset.");return;}
    setErr("");setLoading(true);
    try{
      const {error}=await supabase.auth.resetPasswordForEmail(identifier.trim(),{
        redirectTo: window.location.origin + window.location.pathname,
      });
      if(error) throw error;
      setInfo("Reset link sent! Check your email.");
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  return <div style={{flex:1,background:C.bg,display:"flex",flexDirection:"column"}}><Styles/><StatusBar/>
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"28px 24px",gap:18}}>

      {/* Logo */}
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Mascot size={44}/>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.green}}>Showup</div>
      </div>

      {/* ── LOGIN ── */}
      {mode==="login"&&<>
        <div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.ink,lineHeight:1.2}}>Welcome back!</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,marginTop:6}}>Log in with your username or email</div>
        </div>
        <Input value={identifier} onChange={setIdentifier} placeholder="Username or email" icon="👤"/>
        <div>
          <Input value={pass} onChange={setPass} placeholder="Password" type="password" icon="🔒"/>
          <div style={{textAlign:"right",marginTop:6}}>
            <span onClick={()=>switchMode("forgot")} style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.blue,cursor:"pointer"}}>
              Forgot password?
            </span>
          </div>
        </div>
        {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
        <Btn3D onClick={handleLogin} disabled={loading||!identifier||!pass} full>
          {loading?"LOGGING IN...":"LOG IN"}
        </Btn3D>
        <div style={{textAlign:"center"}}>
          <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.sub}}>
            New here? <span onClick={()=>switchMode("signup")} style={{color:C.blue,cursor:"pointer",fontWeight:800}}>SIGN UP</span>
          </span>
        </div>
      </>}

      {/* ── SIGN UP ── */}
      {mode==="signup"&&<>
        <div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.ink,lineHeight:1.2}}>Create your account</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,marginTop:6}}>Sign up to start your streak</div>
        </div>
        <Input value={name} onChange={setName} placeholder="Your name (used as username)" icon="👤"/>
        <Input value={email} onChange={setEmail} placeholder="Email address" type="email" icon="📧"/>
        <Input value={pass} onChange={setPass} placeholder="Password (min 6 chars)" type="password" icon="🔒"/>
        <Input value={refInput} onChange={setRefInput} placeholder="Referral code (optional)" icon="🎟️"/>

        {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
        <Btn3D onClick={handleSignup} disabled={loading||!name||!email||!pass} full>
          {loading?"CREATING ACCOUNT...":"SIGN UP"}
        </Btn3D>
        <div style={{textAlign:"center"}}>
          <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.sub}}>
            Already have an account? <span onClick={()=>switchMode("login")} style={{color:C.blue,cursor:"pointer",fontWeight:800}}>LOG IN</span>
          </span>
        </div>
      </>}

      {/* ── FORGOT PASSWORD ── */}
      {mode==="forgot"&&<>
        <div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.ink,lineHeight:1.2}}>Reset password</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,marginTop:6}}>We'll send a reset link to your email</div>
        </div>
        <Input value={identifier} onChange={setIdentifier} placeholder="Your email address" type="email" icon="📧"/>
        {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
        {info&&<div style={{background:C.greenL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.green}}>✅ {info}</div>}
        <Btn3D onClick={handleForgot} disabled={loading||!identifier} full>
          {loading?"SENDING...":"SEND RESET LINK"}
        </Btn3D>
        <div style={{textAlign:"center"}}>
          <span onClick={()=>switchMode("login")} style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.blue,cursor:"pointer"}}>
            ← Back to login
          </span>
        </div>
      </>}

    </div>
  </div>;
}

/* ══════════════════════════════════════════════════════════
   HOME  #18 today status  #19 progress  #21 opponent
   ══════════════════════════════════════════════════════════ */
function Home({go,profile,challenges,userId}){
  // Re-evaluate time every minute so wake-up lock updates without reload
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),60000);return ()=>clearInterval(t);},[]);
  const [dismissed,setDismissed]=useState(new Set()); // challenge IDs user dismissed

  // Only active challenges shown on home
  const allCandidates=challenges.filter(c=>c.challenge?.status==="active");
  // paymentStatuses: {cid: 'pending'|'approved'|'rejected'|'none'}
  // 'none' = no payment submitted yet → don't show on home
  const [paymentStatuses,setPaymentStatuses]=useState({});
  const [psLoaded,setPsLoaded]=useState(false);
  const [todayCI,setTodayCI]=useState({});
  const [opponents,setOpponents]=useState({});

  const [notifCount,setNotifCount]=useState(0);
  useEffect(()=>{
    supabase.from("notifications").select("*",{count:"exact",head:true}).eq("user_id",userId).eq("read",false)
      .then(({count})=>setNotifCount(count||0));
  },[userId]);
  const active=!psLoaded?[]:allCandidates.filter(cu=>{
    if(dismissed.has(cu.challenge?.id)) return false;
    if(cu.challenge?.status==="waiting"){
      const ps=paymentStatuses[cu.challenge.id]||"none";
      // Only show waiting challenge if payment has been submitted
      return ps==="pending"||ps==="rejected";
    }
    return true;
  });

  useEffect(()=>{
    if(!allCandidates.length){setPsLoaded(true);return;}
    (async()=>{
      // ── Payment statuses — batch all waiting challenges at once ──
      const waitingChallenges=allCandidates.filter(c=>c.challenge?.status==="waiting");
      if(waitingChallenges.length){
        const results=await Promise.all(
          waitingChallenges.map(cu=>
            supabase.from("payments").select("status")
              .eq("challenge_id",cu.challenge.id).eq("user_id",userId)
              .order("created_at",{ascending:false}).limit(1)
          )
        );
        const newStatuses={};
        waitingChallenges.forEach((cu,i)=>{
          newStatuses[cu.challenge.id]=results[i].data?.[0]?.status||"none";
        });
        setPaymentStatuses(newStatuses);
      }
      setPsLoaded(true);

      // ── Today check-in status — batch all active challenges ──
      const activeChs=allCandidates.filter(c=>c.challenge?.status==="active"&&c.challenge?.start_date);
      if(activeChs.length){
        const ciResults=await Promise.all(
          activeChs.map(cu=>{
            const ch=cu.challenge;
            const dayNum=Math.floor((istMidnight(serverNow())-istMidnight(new Date(ch.start_date)))/(864e5))+1;
            return supabase.from("checkins").select("status")
              .eq("challenge_id",ch.id).eq("user_id",userId)
              .eq("day_number",dayNum).neq("status","rejected").limit(1);
          })
        );
        const newCI={};
        activeChs.forEach((cu,i)=>{
          newCI[cu.challenge.id]=ciResults[i].data?.[0]?.status||null;
        });
        setTodayCI(newCI);
      }

      // ── Opponent data — batch all 1v1 active ──
      const v1Chs=allCandidates.filter(c=>c.challenge?.mode==="1v1"&&c.challenge?.status==="active");
      if(v1Chs.length){
        const oppResults=await Promise.all(
          v1Chs.map(cu=>
            supabase.from("challenge_users").select("*,profile:profiles(name)")
              .eq("challenge_id",cu.challenge.id).neq("user_id",userId).single()
          )
        );
        const newOpps={};
        v1Chs.forEach((cu,i)=>{
          const opp=oppResults[i].data;
          if(opp) newOpps[cu.challenge.id]={
            name:opp.profile?.name||"Opponent",
            completed_days:opp.completed_days||0,
            missed_days:opp.missed_days||0,
            remaining_amount:opp.remaining_amount,
            earnings:opp.earnings||0,
          };
        });
        setOpponents(newOpps);
      }
    })();
  },[challenges,userId]);

  return <Screen><StatusBar/>
    <div style={{padding:"14px 20px 0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}><Mascot size={40} mood="happy"/><div><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:20,color:C.ink}}>Hey {profile?.name?.split(" ")[0]||"there"}!</div><div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>{active.filter(c=>c.challenge?.status==="active").length} active challenge{active.filter(c=>c.challenge?.status==="active").length!==1?"s":""}</div></div></div>
      <button onClick={()=>go("notifications")} className="btn" style={{width:42,height:42,borderRadius:14,background:C.card,border:`2px solid ${C.border}`,borderBottom:`3px solid ${C.border}`,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
        🔔
        {notifCount>0&&<div style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:99,background:C.red,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Nunito",fontWeight:900,fontSize:9,color:"#fff"}}>{notifCount>9?"9+":notifCount}</div>}
      </button>
    </div>

    {profile?.current_streak>0&&<div style={{margin:"14px 20px 0",background:`linear-gradient(135deg,${C.gold}18,${C.orange}12)`,borderRadius:18,padding:"14px 18px",border:`2px solid ${C.gold}30`,display:"flex",alignItems:"center",gap:14}}>
      <div style={{fontSize:32}} className="bounce">{"\uD83D\uDD25"}</div>
      <div style={{flex:1}}><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:20,color:C.gold}}>{profile.current_streak} day streak!</div></div>
      {(profile.grit||0)>0&&<div style={{background:C.purpleL,borderRadius:12,padding:"6px 12px",border:`2px solid ${C.purple}30`,textAlign:"center"}}><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:18,color:C.purple}}>{profile.grit}</div><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:9,color:C.purple}}>GRIT</div></div>}
    </div>}

    <div style={{padding:"16px 20px 0",fontFamily:"Nunito",fontWeight:900,fontSize:18,color:C.ink}}>Your Challenges</div>
    <div style={{padding:"10px 20px",display:"flex",flexDirection:"column",gap:10}}>
      {active.length===0&&<Card><div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:40,marginBottom:8}}>{"\uD83C\uDF31"}</div><div style={{fontFamily:"Nunito",fontWeight:700,fontSize:15,color:C.sub}}>No active challenges yet</div></div></Card>}

      {active.map((cu)=>{
        const ch=cu.challenge;if(!ch)return null;
        const pct=ch.days>0?(cu.completed_days/ch.days)*100:0;
        const dailyStake=Math.round(ch.stake/ch.days);
        const remaining=cu.remaining_amount!=null?cu.remaining_amount:ch.stake;
        const ciStatus=todayCI[ch.id];
        const opp=opponents[ch.id];
        const currentDay=cu.completed_days+1;
        const daysLeft=ch.days-cu.completed_days;
        // Solo: 10% of each missed day's penalty goes to their chosen charity
        const charityDonated=ch.mode==="solo"&&cu.missed_days>0
          ?Math.round(cu.missed_days*dailyStake*0.10):0;

        return <Card key={cu.id}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
            <div><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:15,color:C.ink}}>{ch.habit_icon} {ch.habit_name}</div><div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub,marginTop:2}}>{ch.mode==="1v1"?"⚡ 1v1":"🌱 Solo"} · {CUR}{ch.stake}</div></div>
            <div style={{alignItems:"flex-end",display:"flex",flexDirection:"column",gap:3}}>
              <Chip c={ch.status==="active"?C.green:C.gold} sz={11}>
                {ch.status==="active"?`${daysLeft}d left`:ch.status}
              </Chip>
              {ch.status==="active"&&<div style={{fontFamily:"Nunito",fontWeight:700,fontSize:10,color:C.faint,textAlign:"right"}}>Day {currentDay} of {ch.days}</div>}
            </div>
          </div>

          {ch.status==="active"&&<>
            <Bar pct={pct}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4,marginBottom:2}}>
              <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:10,color:C.faint}}>{cu.completed_days} done</span>
              <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:10,color:C.faint}}>{Math.round(pct)}%</span>
            </div>

            {/* Stats row */}
            <div style={{display:"flex",gap:6,marginTop:6}}>
              <div style={{flex:1,background:C.raised,borderRadius:10,padding:"8px 6px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:14,color:C.green}}>{CUR}{remaining.toLocaleString()}</div>
                <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:9,color:C.faint,marginTop:2}}>REMAINING</div>
              </div>
              <div style={{flex:1,background:C.raised,borderRadius:10,padding:"8px 6px",border:`1px solid ${cu.missed_days>0?C.red:C.border}`,textAlign:"center"}}>
                <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:14,color:cu.missed_days>0?C.red:C.sub}}>{cu.missed_days}</div>
                <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:9,color:C.faint,marginTop:2}}>MISSED</div>
              </div>
              <div style={{flex:1,background:C.raised,borderRadius:10,padding:"8px 6px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:14,color:C.red}}>{CUR}{dailyStake}</div>
                <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:9,color:C.faint,marginTop:2}}>PER MISS</div>
              </div>
            </div>

            {/* Charity donation banner — solo only, only if any misses */}
            {charityDonated>0&&<div style={{marginTop:6,background:`${C.red}12`,borderRadius:10,padding:"9px 14px",border:`1.5px solid ${C.red}30`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>❤️</span>
                <div>
                  <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.ink}}>Donated to {ch.charity_name||"charity"}</div>
                  <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:10,color:C.sub}}>10% of your misses goes to them</div>
                </div>
              </div>
              <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:15,color:C.red}}>{CUR}{charityDonated}</div>
            </div>}

            {/* Consecutive miss warning */}
            {cu.consecutive_misses>0&&<div style={{marginTop:6,background:C.redL,borderRadius:10,padding:"8px 12px",border:`1px solid ${C.red}30`,display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:14}}>{"\uD83D\uDEA8"}</span>
              <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.red}}>{cu.consecutive_misses} miss in a row — forfeit at {Math.ceil(ch.days/3)}</span>
            </div>}

            {/* #21 Opponent progress (1v1) */}
            {ch.mode==="1v1"&&opp&&<div style={{marginTop:6,background:C.orangeL,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.orange}30`}}>
              <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:10,color:C.orange,letterSpacing:1,marginBottom:6}}>OPPONENT: {opp.name.toUpperCase()}</div>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>✅ {opp.completed_days} done</span>
                <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>❌ {opp.missed_days} missed</span>
                {opp.remaining_amount!=null&&<span style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>{CUR}{opp.remaining_amount} left</span>}
              </div>
              {cu.earnings>0&&<div style={{marginTop:4,fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.green}}>+{CUR}{cu.earnings} earned from their misses</div>}
            </div>}

            {/* #18 Today deadline — varies by habit type */}
            {(()=>{
              const isWakeCard=ch.habit_name==="Wake Up Early";
              const isSSCard=ch.verification_type==="screenshot";
              const windowText=isWakeCard?"⏰ Check-in: 4:00 AM – chosen time + 1 hr":isSSCard?"📱 Upload: 9:00 PM – 11:59 PM":"\u23F0 Submit before 11:59 PM";
              const windowColor=isWakeCard?C.blue:isSSCard?C.purple:C.sub;
              return <div style={{marginTop:6,background:C.surf,borderRadius:10,padding:"8px 12px",border:`1px solid ${isWakeCard?C.blue+"30":C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:windowColor}}>{windowText}</span>
                {ciStatus==="approved"&&<Chip c={C.green} sz={10}>DONE ✓</Chip>}
                {ciStatus==="pending"&&<Chip c={C.gold} sz={10}>REVIEWING</Chip>}
              </div>;
            })()}

            {/* Action */}
            {(()=>{
              if(ciStatus==="approved") return <div style={{marginTop:10,background:C.greenL,borderRadius:14,padding:"12px",textAlign:"center",border:`2px solid ${C.green}40`}}><span style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.green}}>DONE TODAY ✅</span></div>;
              if(ciStatus==="pending") return <div style={{marginTop:10,background:C.goldL,borderRadius:14,padding:"12px",textAlign:"center",border:`2px solid ${C.gold}40`}}><span style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.gold}}>⏳ PENDING REVIEW</span></div>;

              const isWake=ch.habit_name==="Wake Up Early";
              const isSS=ch.verification_type==="screenshot"||ch.habit_name==="Limit Screentime";
              const h=serverHour();
              const wakeOpen=h>=WAKE_HOUR_START&&h<=WAKE_HOUR_END;
              const ssOpen=h>=SS_HOUR_START;

              if(isWake&&!wakeOpen) return <div style={{marginTop:10,background:C.raised,borderRadius:14,padding:"12px 16px",border:`2px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:13,color:C.faint}}>⏰ CHECK-IN LOCKED</div>
                <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.faint,marginTop:3}}>Opens 4:00 AM · Window depends on chosen time</div>
              </div>;

              if(isSS&&!ssOpen) return <div style={{marginTop:10,background:C.raised,borderRadius:14,padding:"12px 16px",border:`2px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:13,color:C.faint}}>📱 CHECK-IN LOCKED</div>
                <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.faint,marginTop:3}}>Opens 9:00 PM · Closes 11:59 PM</div>
              </div>;

              return <Btn3D onClick={()=>go("checkin:"+ch.id)} full s={{marginTop:10,padding:"12px",fontSize:14,borderRadius:14}}>CHECK IN NOW</Btn3D>;
            })()}
          </>}

          {ch.status==="waiting"&&(()=>{
            const ps=paymentStatuses[ch.id];
            return <div style={{marginTop:8}}>
              {ch.mode==="1v1"&&ch.invite_code&&<div style={{background:C.blueL,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub}}>INVITE CODE</div><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:20,color:C.blue,letterSpacing:3}}>{ch.invite_code}</div></div>
                <button onClick={()=>navigator.clipboard?.writeText(ch.invite_code)} className="btn" style={{background:C.blue,border:"none",borderRadius:10,padding:"8px 14px",fontFamily:"Nunito",fontWeight:800,fontSize:12,color:"#fff"}}>COPY</button>
              </div>}
              {ps==="rejected"
                ?<div>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>Payment rejected. Please pay again.</div>
                    <button onClick={()=>setDismissed(prev=>new Set([...prev,ch.id]))} className="btn" style={{background:C.raised,border:`1px solid ${C.border}`,borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:C.faint,fontSize:14,flexShrink:0,marginLeft:8}}>✕</button>
                  </div>
                  <Btn3D onClick={()=>go("payment:"+ch.id+":"+ch.stake)} color={C.red} darkColor={C.redD} full s={{padding:"12px",fontSize:14,borderRadius:14}}>RETRY PAYMENT</Btn3D>
                </div>
                :<div style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.gold}}>⏳ Waiting for payment approval...</div>
              }
            </div>;
          })()}
        </Card>;
      })}
    </div>

    <div style={{padding:"12px 20px"}}><Btn3D onClick={()=>go("newhabit")} color={C.blue} darkColor={C.blueD} full>✚ START NEW CHALLENGE</Btn3D></div>
    <div style={{padding:"0 20px 8px"}}><BtnOutline onClick={()=>go("join")} full>🔗 JOIN 1v1 WITH CODE</BtnOutline></div>
    <div style={{height:16}}/>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   NEW HABIT  #5 start date  #22 routes to summary
   ══════════════════════════════════════════════════════════ */
function NewHabit({go,userId,refresh,withdrawableBalance=0}){
  const [step,setStep]=useState(0);const [mode,setMode]=useState(null);const [habit,setHabit]=useState("");
  const [days,setDays]=useState(21);const [cDays,setCDays]=useState("");const [uCD,setUCD]=useState(false);
  const [stake,setStake]=useState(500);const [cStake,setCStake]=useState("");const [uCS,setUCS]=useState(false);
  const [charity,setCharity]=useState(null);const [startPref,setStartPref]=useState("today");
  const [screentimeHours,setScreentimeHours]=useState(2);
  const [wakeHour,setWakeHour]=useState(6); // default 6 AM
  const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const [inviteCode,setInviteCode]=useState("");const [createdId,setCreatedId]=useState("");const [createdStake,setCreatedStake]=useState(0);
  const [restDays,setRestDays]=useState([]); // chosen rest days e.g. ["Sat","Sun"]

  const ed=uCD&&cDays?parseInt(cDays):days;
  const es=uCS&&cStake?parseFloat(cStake):stake;
  const ml=Math.ceil(ed/3);
  const habitObj=HABITS.find(h=>h.n===habit);
  const verifyType=habitObj?.verify||"photo";
  const isScreentime=habit==="Limit Screentime";
  const isWakeUp=habit==="Wake Up Early";
  // Wake-up ALWAYS starts tomorrow — no choice given to user (#4)
  const effectiveStartPref="tomorrow"; // All challenges start next day

  // Solo: 0=mode 1=habit 2=days 3=stake 4=charity 5=restdays 6=confirm (wakeup skips confirm)
  // 1v1:  0=mode 1=habit 2=days 3=stake 4=restdays 5=confirm
  const restDayStep=mode==="solo"?5:4;
  const confirmStep=mode==="solo"?(isWakeUp?5:6):(isWakeUp?4:5);
  const ts=confirmStep+1;
  const next=()=>setStep(s=>s+1);
  const prev=()=>{if(step===0)go("home");else setStep(s=>s-1);};

  const createChallenge=async()=>{
    setLoading(true);setErr("");
    try{
      // Block duplicate solo challenges (only 1v1 can have multiples of same habit)
      if(mode==="solo"){
        const {data:existing}=await supabase
          .from("challenge_users")
          .select("id,challenge:challenges(habit_name,status,mode)")
          .eq("user_id",userId);
        const dup=(existing||[]).find(cu=>
          cu.challenge?.habit_name===habit&&
          cu.challenge?.status==="active"&&
          cu.challenge?.mode==="solo"
        );
        if(dup){setErr(`You already have an active solo "${habit}" challenge. Finish it before starting another.`);setLoading(false);return;}
      }
      const selCharity=CHARITIES.find(c=>c.id===charity);
      const {data,error}=await supabase.from("challenges").insert({
        mode:mode==="solo"?"solo":"1v1",
        habit_name:habit,
        habit_icon:habitObj?.i||"🎯",
        days:ed,stake:es,
        charity_id:mode==="solo"?charity:null,
        charity_name:mode==="solo"&&selCharity?selCharity.name:null,
        start_preference:effectiveStartPref,
        verification_type:verifyType,
        screentime_limit_hours:isScreentime?screentimeHours:null,
        wake_hour:isWakeUp?wakeHour:null,
        rest_days:restDays.length>0?restDays:null,
        created_by:userId,
      }).select().single();
      if(error) throw error;
      // For 1v1 only: add user to challenge_users immediately (opponent joins separately)
      // For solo: challenge_users added after payment by verify-razorpay-payment
      if(mode==="1v1"){
        await supabase.from("challenge_users").insert({challenge_id:data.id,user_id:userId});
        setCreatedId(data.id);setInviteCode(data.invite_code||"");setCreatedStake(es);setStep(99);
      } else {
        // Store challenge id temporarily, add to challenge_users only after payment
        go("payment:"+data.id+":"+es+":pending_cu");
      }
      refresh();
    } catch(e){setErr(e.message);}
    setLoading(false);
  };

  // Verify type label
  const verifyLabel=verifyType==="tap"?"Tap to confirm":verifyType==="video"?"Short video":verifyType==="screenshot"?"Screentime screenshot":"Selfie photo";
  const verifyIcon=verifyType==="tap"?"👆":verifyType==="video"?"🎥":verifyType==="screenshot"?"📱":"📸";

  return <Screen><Styles/><StatusBar/><TopBar title="New Challenge" onBack={prev}/>
    <div style={{padding:"8px 20px 0"}}><Bar pct={((step+1)/ts)*100} c={C.green} h={10}/></div>
    <div style={{flex:1,padding:"16px 20px",display:"flex",flexDirection:"column"}}>
      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red,marginBottom:8}}>{err}</div>}

      {/* Step 0 — Mode */}
      {step===0&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>Pick your mode 🎮</div>
        {[{id:"solo",t:"🎯 Solo",d:"Challenge yourself. Lose = 10% to charity.",c:C.green},{id:"1v1",t:"⚔️ 1v1 Friend",d:"Both stake. Miss = opponent earns.",c:C.orange}].map(m=><button key={m.id} onClick={()=>{setMode(m.id);next();}} className="btn" style={{background:C.card,border:`2px solid ${C.border}`,borderBottom:`4px solid ${C.border}`,borderRadius:18,padding:18,textAlign:"left"}}><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:18,color:m.c}}>{m.t}</div><div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:C.sub,marginTop:4}}>{m.d}</div></button>)}
      </div>}

      {/* Step 1 — Habit */}
      {step===1&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>What habit? 💪</div>
        <Input value={habit} onChange={setHabit} placeholder="Type your habit..." icon="✍️"/>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {HABITS.map((h,i)=><button key={i} onClick={()=>setHabit(h.n)} className="btn" style={{background:habit===h.n?C.greenL:C.card,border:`2px solid ${habit===h.n?C.green:C.border}`,borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14}}>{h.i}</span>
            <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:habit===h.n?C.green:C.sub}}>{h.n}</span>
          </button>)}
        </div>
        {/* Verify type badge */}
        {habit&&<div style={{background:C.raised,borderRadius:12,padding:"10px 14px",border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>{verifyIcon}</span>
          <div><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.ink}}>Proof: {verifyLabel}</div>
          {verifyType==="screenshot"&&<div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:2}}>Upload window: 9:00 PM – 11:59 PM</div>}
          {verifyType==="video"&&<div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:2}}>Min 10 seconds of recording</div>}
          </div>
        </div>}
        {/* Screentime hours config */}
        {isScreentime&&<div style={{background:C.blueL,borderRadius:14,padding:"14px 16px",border:`2px solid ${C.blue}30`}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.blue,marginBottom:10}}>📱 Set your daily screentime limit</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[0.5,1,1.5,2,3,4].map(h=><button key={h} onClick={()=>setScreentimeHours(h)} className="btn" style={{background:screentimeHours===h?C.blue:C.raised,border:`2px solid ${screentimeHours===h?C.blue:C.border}`,borderRadius:10,padding:"8px 16px",fontFamily:"Nunito",fontWeight:800,fontSize:13,color:screentimeHours===h?"#fff":C.sub}}>
              {h}h
            </button>)}
          </div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:8}}>You must stay under {screentimeHours}h. Prove it with a screenshot every night.</div>
        </div>}
        <div style={{marginTop:"auto"}}><Btn3D onClick={next} disabled={!habit.trim()} full>CONTINUE</Btn3D></div>
      </div>}

      {/* Step 2 — Days */}
      {step===2&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>How many days? 📅</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[7,14,21,30,60,90].map(d=><button key={d} onClick={()=>{setDays(d);setUCD(false);}} className="btn" style={{flex:"1 1 calc(33% - 6px)",background:!uCD&&days===d?C.greenL:C.card,border:`2px solid ${!uCD&&days===d?C.green:C.border}`,borderBottom:`4px solid ${!uCD&&days===d?C.greenD:C.border}`,borderRadius:14,padding:"14px 0",textAlign:"center"}}><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:20,color:!uCD&&days===d?C.green:C.ink}}>{d}</div><div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.sub}}>days</div></button>)}</div>
        <Input value={cDays} onChange={v=>{setCDays(v.replace(/\D/g,""));setUCD(true);}} placeholder="Custom days" icon="📅"/>
        <Card style={{background:C.redL,border:`2px solid ${C.red}30`}}><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:18}}>💀</span><span style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>Miss {ml} in a row = forfeit all remaining stake!</span></div></Card>
        <div style={{marginTop:"auto"}}><Btn3D onClick={next} full>CONTINUE</Btn3D></div>
      </div>}

      {/* Step 3 — Stake */}
      {step===3&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        {withdrawableBalance>0&&<div style={{background:`${C.green}12`,border:`2px solid ${C.green}30`,borderRadius:12,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.green}}>💰 Your withdrawable balance</div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:16,color:C.green}}>{CUR}{withdrawableBalance}</div>
        </div>}
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>Set your stake 💰</div>
        <Card style={{textAlign:"center",padding:20,border:`2px solid ${C.green}40`}}>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:44,color:C.ink}}>{CUR}{uCS?(cStake||"—"):stake.toLocaleString()}</div>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red,marginTop:4}}>lose {CUR}{Math.round(es/ed)} per missed day</div>
        </Card>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[100,200,500,1000,2000,5000].map(s=>{const overBudget=withdrawableBalance>0&&s>withdrawableBalance;return <button key={s} onClick={()=>{if(overBudget)return;setStake(s);setUCS(false);}} className="btn" style={{flex:"1 1 calc(33% - 6px)",background:overBudget?C.raised:!uCS&&stake===s?C.greenL:C.card,border:`2px solid ${overBudget?C.faint:!uCS&&stake===s?C.green:C.border}`,borderBottom:`4px solid ${overBudget?C.faint:!uCS&&stake===s?C.greenD:C.border}`,borderRadius:14,padding:"10px 0",textAlign:"center",position:"relative",opacity:overBudget?0.35:1}}><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:15,color:overBudget?C.faint:!uCS&&stake===s?C.green:C.ink}}>{CUR}{s.toLocaleString()}</div>{s===500&&!overBudget&&<div style={{position:"absolute",top:-8,right:-4,background:C.gold,borderRadius:8,padding:"2px 8px",fontFamily:"Nunito",fontWeight:900,fontSize:9,color:"#000"}}>⭐ TOP</div>}</button>;})}</div>
        <Input value={cStake} onChange={v=>{setCStake(v.replace(/\D/g,""));setUCS(true);}} placeholder="Custom amount" icon="💰"/>
        <div style={{marginTop:"auto"}}><Btn3D onClick={next} disabled={es<=0} full>CONTINUE</Btn3D></div>
      </div>}

      {/* Step 4 Solo — Charity */}
      {step===4&&mode==="solo"&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>Pick a charity ❤️</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub}}>10% of any money you lose goes here</div>
        {CHARITIES.map(ch=><button key={ch.id} onClick={()=>setCharity(ch.id)} className="btn" style={{background:charity===ch.id?C.greenLL:C.card,border:`2px solid ${charity===ch.id?C.green:C.border}`,borderBottom:`4px solid ${charity===ch.id?C.greenD:C.border}`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,textAlign:"left"}}><span style={{fontSize:24}}>{ch.icon}</span><div style={{flex:1}}><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:charity===ch.id?C.green:C.ink}}>{ch.name}</div><div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub}}>{ch.desc}</div></div>{charity===ch.id&&<span style={{color:C.green}}>✅</span>}</button>)}
        <div style={{marginTop:"auto"}}><Btn3D onClick={next} disabled={!charity} full>CONTINUE</Btn3D></div>
      </div>}

      {/* Rest days step */}
      {step===restDayStep&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>Pick rest days 😴</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub}}>Choose up to 2 rest days per week — no check-in needed, no money lost.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>{
            const sel=restDays.includes(d);
            const disabled=!sel&&restDays.length>=2;
            return <button key={d} onClick={()=>{if(disabled)return;setRestDays(prev=>sel?prev.filter(x=>x!==d):[...prev,d]);}} className="btn" style={{flex:"1 1 calc(25% - 8px)",background:sel?C.blue:C.card,border:`2px solid ${sel?C.blue:C.border}`,borderBottom:`4px solid ${sel?C.blueD:C.border}`,borderRadius:14,padding:"14px 0",textAlign:"center",opacity:disabled?0.4:1}}>
              <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:15,color:sel?"#fff":C.ink}}>{d}</div>
              {sel&&<div style={{fontFamily:"Nunito",fontWeight:700,fontSize:9,color:"#fff",marginTop:2}}>REST</div>}
            </button>;
          })}
        </div>
        {restDays.length>0&&<Card style={{background:C.blueL,border:`2px solid ${C.blue}30`}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.blue}}>Rest days: {restDays.join(", ")} — no check-in needed, streak preserved ✅</div>
        </Card>}
        <Card style={{background:C.surf}}>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>💡 Streak only counts days you complete tasks — rest days are skipped. Your challenge will be extended by rest days automatically.</div>
        </Card>
        <div style={{marginTop:"auto",display:"flex",gap:8}}>
          <BtnOutline onClick={()=>{setRestDays([]);next();}}>Skip</BtnOutline>
          <Btn3D onClick={next} full>CONTINUE</Btn3D>
        </div>
      </div>}

      {/* Confirm step — all modes (wake-up uses this too) */}
      {step===confirmStep&&!isWakeUp&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>Ready? 🚀</div>
        <Card style={{background:C.greenL,border:`2px solid ${C.green}40`}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.green,marginBottom:8}}>Challenge starts tomorrow</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <SummaryRow label="Habit" value={`${habitObj?.i||""} ${habit}`}/>
            <SummaryRow label="Days" value={`${ed} days`}/>
            <SummaryRow label="Stake" value={`${CUR}${es}`} c={C.green}/>
            <SummaryRow label="Daily loss" value={`${CUR}${Math.round(es/ed)} per miss`} c={C.red}/>
            <SummaryRow label="Forfeit if" value={`${ml} consecutive misses`} c={C.orange}/>
            {restDays.length>0&&<SummaryRow label="Rest days" value={restDays.join(", ")} c={C.blue}/>}
          </div>
        </Card>
        <div style={{marginTop:"auto"}}><Btn3D onClick={createChallenge} disabled={loading} full>{loading?"CREATING...":"CONFIRM & CONTINUE"}</Btn3D></div>
      </div>}
      {step===confirmStep&&isWakeUp&&<div className="fadeUp" style={{flex:1,display:"flex",flexDirection:"column",gap:16,alignItems:"center",justifyContent:"center"}}>
        <div style={{fontSize:72}} className="float">⏰</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink,textAlign:"center"}}>Wake Up Early</div>
        <Card style={{width:"100%"}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.ink,marginBottom:12}}>What time do you want to wake up?</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[4,5,6,7,8,9].map(h=><button key={h} onClick={()=>setWakeHour(h)} className="btn" style={{
              background:wakeHour===h?C.green:C.raised,
              border:`2px solid ${wakeHour===h?C.green:C.border}`,
              borderRadius:10,padding:"8px 14px",
              fontFamily:"Nunito",fontWeight:800,fontSize:13,
              color:wakeHour===h?"#fff":C.ink
            }}>{h}:00 AM</button>)}
          </div>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub,marginTop:10}}>
            ✅ Check-in window: <b style={{color:C.green}}>4:00 AM – {wakeHour+1}:00 AM</b>
          </div>
        </Card>
        <Card style={{width:"100%",background:C.blueL,border:`2px solid ${C.blue}30`}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.blue,marginBottom:4}}>Day 1 starts tomorrow</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub}}>You get a 1-hour buffer after your chosen time. Miss the window = miss the day.</div>
        </Card>
        <Card style={{width:"100%",background:C.redL,border:`2px solid ${C.red}30`}}>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.red}}>⚠️ System validates your check-in time. No exceptions.</div>
        </Card>
        <div style={{marginTop:"auto",width:"100%"}}><Btn3D onClick={createChallenge} disabled={loading} full>{loading?"CREATING...":"CONFIRM & CONTINUE"}</Btn3D></div>
      </div>}

      {/* 1v1 invite code */}
      {step===99&&<div className="pop" style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
        <div style={{fontSize:56}}>⚔️</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink}}>Challenge Created!</div>
        <Card style={{textAlign:"center",padding:20,width:"100%",background:`${C.blue}12`,border:`2px solid ${C.blue}40`}}>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>INVITE CODE</div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:36,color:C.blue,letterSpacing:6,marginTop:4}}>{inviteCode}</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint,marginTop:8}}>Share this with your opponent</div>
        </Card>
        <Btn3D onClick={()=>navigator.clipboard?.writeText(inviteCode)} color={C.blue} darkColor={C.blueD} full>COPY CODE</Btn3D>
        <Btn3D onClick={()=>go("summary:"+createdId+":"+createdStake+":"+effectiveStartPref)} full>VIEW SUMMARY & PAY</Btn3D>
      </div>}
    </div>
  </Screen>;
}
/* ══════════════════════════════════════════════════════════
   CHALLENGE SUMMARY — #22
   ══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   CHALLENGE SUMMARY — #22
   ══════════════════════════════════════════════════════════ */
function ChallengeSummary({go,challengeId,amount,startPref}){
  const [ch,setCh]=useState(null);
  useEffect(()=>{supabase.from("challenges").select("*").eq("id",challengeId).single().then(({data})=>setCh(data));},[challengeId]);
  if(!ch) return <Screen><Styles/><Loading/></Screen>;

  const daily=Math.round(ch.stake/ch.days);
  const forfeitAt=Math.ceil(ch.days/3);
  const startLabel=startPref==="tomorrow"?"Tomorrow (after approval)":"Today (after approval)";

  return <Screen><Styles/><StatusBar/><TopBar title="Challenge Summary" onBack={()=>go("home")}/>
    <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>

      <Card style={{textAlign:"center",padding:"20px 16px",background:`linear-gradient(135deg,${C.green}10,${C.blue}06)`}}>
        <div style={{fontSize:48,marginBottom:8}}>{ch.habit_icon}</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:20,color:C.ink}}>{ch.habit_name}</div>
        <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10}}>
          <Chip c={ch.mode==="1v1"?C.orange:C.green}>{ch.mode==="1v1"?"⚔️ 1v1":"🌱 Solo"}</Chip>
          <Chip c={C.blue}>{ch.days} days</Chip>
        </div>
      </Card>

      <Card>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:11,color:C.faint,letterSpacing:1.5,marginBottom:4}}>CHALLENGE DETAILS</div>
        <SummaryRow label="Stake" value={`${CUR}${parseFloat(amount).toLocaleString()}`} c={C.green} icon="💰"/>
        <SummaryRow label="Daily penalty (per miss)" value={`${CUR}${daily}`} c={C.red} icon="📉"/>
        <SummaryRow label="Forfeit trigger" value={`${forfeitAt} misses in a row`} c={C.orange} icon="💀"/>
        <SummaryRow label="Proof type" value={{tap:"Tap confirm",video:"Video recording",screenshot:"Screentime screenshot",photo:"Selfie photo"}[ch.verification_type||"photo"]} icon={{tap:"👆",video:"🎥",screenshot:"📱",photo:"📸"}[ch.verification_type||"photo"]}/>
        <SummaryRow label="Starts" value={startLabel} c={C.blue} icon="📅"/>
        {ch.charity_name&&<SummaryRow label="Charity (10% of losses)" value={ch.charity_name} c={C.purple} icon="❤️"/>}
        {ch.mode==="1v1"&&<SummaryRow label="1v1: per miss" value="50% to opponent" c={C.orange} icon="⚡"/>}
      </Card>

      <Card style={{background:C.redL,border:`2px solid ${C.red}30`}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:18}}>⚠️</span>

        </div>
      </Card>

      <Btn3D onClick={()=>go("payment:"+challengeId+":"+amount)} full s={{padding:"16px",fontSize:16}}>💳 PAY {CUR}{parseFloat(amount).toLocaleString()} NOW</Btn3D>
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   JOIN 1v1
   ══════════════════════════════════════════════════════════ */
function Join({go,userId,refresh}){
  const [code,setCode]=useState("");const [loading,setLoading]=useState(false);const [err,setErr]=useState("");
  const join=async()=>{
    setLoading(true);setErr("");
    try{
      const {data:ch,error}=await supabase.from("challenges").select("*").eq("invite_code",code.toUpperCase()).eq("status","waiting").single();
      if(error) throw new Error("Invalid or expired code");
      if(ch.created_by===userId) throw new Error("Cannot join your own challenge");
      const {count}=await supabase.from("challenge_users").select("*",{count:"exact",head:true}).eq("challenge_id",ch.id);
      if(count>=2) throw new Error("Challenge is full");
      await supabase.from("challenge_users").insert({challenge_id:ch.id,user_id:userId});
      refresh();
      go("summary:"+ch.id+":"+ch.stake+":"+(ch.start_preference||"today"));
    } catch(e){setErr(e.message);}
    setLoading(false);
  };
  return <Screen><Styles/><StatusBar/><TopBar title="Join 1v1" onBack={()=>go("home")}/>
    <div style={{padding:20,flex:1,display:"flex",flexDirection:"column",gap:18}}>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.ink}}>Enter invite code 🔗</div>
      <Input value={code} onChange={v=>setCode(v.toUpperCase())} placeholder="SHW-XXXX" icon="🔗"/>
      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
      <Btn3D onClick={join} disabled={code.length<4||loading} full>{loading?"JOINING...":"JOIN CHALLENGE"}</Btn3D>
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   PAYMENT — UTR required, can't leave without submitting
   ══════════════════════════════════════════════════════════ */
function Payment({go,challengeId,amount,userId,refresh}){
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState("");
  const [withdrawable,setWithdrawable]=useState(0);
  const [useBalance,setUseBalance]=useState(false);

  useEffect(()=>{
    // Fetch user withdrawable balance
    supabase.from("challenge_users")
      .select("remaining_amount,forfeited,challenge:challenges(status)")
      .eq("user_id",userId)
      .then(({data})=>{
        const bal=Math.round((data||[])
          .filter(cu=>cu.challenge?.status==="finished"&&!cu.forfeited)
          .reduce((s,cu)=>s+parseFloat(cu.remaining_amount||0),0));
        setWithdrawable(bal);
        if(bal>=amt) setUseBalance(true); // auto-select if enough
      });
  },[userId]);

  const amt=Math.round(parseFloat(amount));
  const fee=Math.round(amt*0.02); // 2% gateway fee (deducted on completion)
  const youPay=amt; // user pays exact stake
  const youGet=amt-fee; // on completion gets back stake minus 2% gateway fee

  const handleBack=()=>{
    if(window.confirm("Leave payment? Your challenge won't start until you pay.")) go("home");
  };

  const loadRazorpay=()=>new Promise(resolve=>{
    if(window.Razorpay){resolve(true);return;}
    const s=document.createElement("script");
    s.src="https://checkout.razorpay.com/v1/checkout.js";
    s.onload=()=>resolve(true);
    s.onerror=()=>resolve(false);
    document.body.appendChild(s);
  });

  const payWithBalance=async()=>{
    setLoading(true);setErr("");
    try{
      // Deduct from finished challenges' remaining_amount
      // Insert payment record as approved, add user to challenge
      const {error:payErr}=await supabase.from("payments").insert({
        user_id:userId,challenge_id:challengeId,
        amount:amt,utr_reference:"balance_payment_"+Date.now(),status:"approved"
      });
      if(payErr) throw payErr;
      // Add to challenge_users
      await supabase.from("challenge_users").insert({challenge_id:challengeId,user_id:userId});
      // Mark challenge active
      await supabase.rpc("approve_payment",{p_payment_id:(await supabase.from("payments").select("id").eq("challenge_id",challengeId).eq("user_id",userId).single()).data?.id});
      // Deduct from withdrawable (reduce remaining_amount on oldest finished challenge)
      let remaining=amt;
      const {data:finCus}=await supabase.from("challenge_users")
        .select("id,remaining_amount,challenge:challenges(status)")
        .eq("user_id",userId).order("created_at",{ascending:true});
      for(const cu of (finCus||[])){
        if(remaining<=0) break;
        if(cu.challenge?.status!=="finished") continue;
        const deduct=Math.min(parseFloat(cu.remaining_amount||0),remaining);
        if(deduct>0){
          await supabase.from("challenge_users").update({remaining_amount:parseFloat(cu.remaining_amount)-deduct}).eq("id",cu.id);
          remaining-=deduct;
        }
      }
      setDone(true);refresh();
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  const openRazorpay=async()=>{
    if(!rateLimit(`payment_${challengeId}`, 8000)){setErr("Please wait before retrying.");return;}
    setLoading(true);setErr("");
    try{
      // Load Razorpay SDK
      const loaded=await loadRazorpay();
      if(!loaded) throw new Error("Could not load payment gateway. Check your internet connection.");

      // Create order via Supabase Edge Function
      const {data:session}=await supabase.auth.getSession();
      const token=session?.session?.access_token;
      const res=await fetch(`https://eybytpgtrnjpreazzjws.supabase.co/functions/v1/create-razorpay-order`,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body:JSON.stringify({challenge_id:challengeId,amount:youPay})
      });
      const order=await res.json();
      if(!res.ok||order.error) throw new Error(order.error||"Failed to create payment order");

      // Open Razorpay checkout
      const options={
        key:"rzp_test_SXb366AVUbxDBL",
        amount:order.amount, // in paise
        currency:"INR",
        name:"Showup",
        description:"Challenge Stake — "+amount+" + 2% gateway fee",
        order_id:order.id,
        prefill:{},
        theme:{color:C.green},
        modal:{backdropclose:false},
        handler:async(response)=>{
          // Payment successful — verify and record
          // Idempotency: check if already processed
          const {data:existing}=await supabase.from("payments")
            .select("id,status").eq("utr_reference",response.razorpay_payment_id).maybeSingle();
          if(existing){setDone(true);refresh();return;} // already processed
          setLoading(true);
          try{
            const vRes=await fetch(`https://eybytpgtrnjpreazzjws.supabase.co/functions/v1/verify-razorpay-payment`,{
              method:"POST",
              headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
              body:JSON.stringify({
                razorpay_order_id:response.razorpay_order_id,
                razorpay_payment_id:response.razorpay_payment_id,
                razorpay_signature:response.razorpay_signature,
                challenge_id:challengeId,
                amount:amt,
              })
            });
            const vData=await vRes.json();
            if(!vRes.ok||vData.error) throw new Error(vData.error||"Payment verification failed");
            // Now add user to challenge_users (challenge officially starts after payment)
            await supabase.from("challenge_users").insert({challenge_id:challengeId,user_id:userId}).then(()=>{});
            setDone(true);refresh();
          }catch(e){setErr(e.message);}
          setLoading(false);
        }
      };
      const rz=new window.Razorpay(options);
      rz.on("payment.failed",function(r){
        setErr("Payment failed: "+r.error.description);
        setLoading(false);
      });
      rz.open();
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  if(done) return <Screen><Styles/><StatusBar/>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:16}}>
      <div style={{fontSize:56}}>✅</div>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink}}>Payment Successful!</div>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,textAlign:"center"}}>Your challenge is now active. Good luck!</div>
      <Btn3D onClick={()=>go("home")} full>GO TO HOME</Btn3D>
    </div>
  </Screen>;

  return <Screen><Styles/><StatusBar/><TopBar title="Pay Stake" onBack={handleBack}/>
    <div style={{padding:20,flex:1,display:"flex",flexDirection:"column",gap:14}}>

      {/* Amount breakdown */}
      <Card style={{textAlign:"center",padding:20,background:`${C.green}10`,border:`2px solid ${C.green}40`}}>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.sub}}>YOUR STAKE</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:42,color:C.green,marginTop:4}}>{CUR}{amt.toLocaleString()}</div>
        <div style={{height:1,background:C.border,margin:"12px 0"}}/>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.sub}}>Stake</span>
          <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.ink}}>{CUR}{amt}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.ink}}>You pay now</span>
          <span style={{fontFamily:"Nunito",fontWeight:900,fontSize:16,color:C.green}}>{CUR}{youPay}</span>
        </div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:8}}>
          Complete all days → get {CUR}{youGet} back · 2% payment gateway fee is non-refundable (see Terms)
        </div>
      </Card>

      <Card style={{background:C.blueL,border:`2px solid ${C.blue}30`}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>🔒</span>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>Secure payment via Razorpay. Pay with any UPI app, card, or netbanking. No details stored.</div>
        </div>
      </Card>

      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}

      <div style={{marginTop:"auto",display:"flex",flexDirection:"column",gap:10}}>
        {withdrawable>=amt&&<Card style={{background:`${C.green}12`,border:`2px solid ${C.green}30`,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.green}}>💰 Use Withdrawable Balance</div>
            <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:14,color:C.green}}>{CUR}{withdrawable} available</div>
          </div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginBottom:10}}>You have enough to cover this stake. No gateway fee!</div>
          <Btn3D onClick={payWithBalance} disabled={loading} full s={{fontSize:14}}>✅ USE BALANCE · {CUR}{amt}</Btn3D>
        </Card>}
        {withdrawable>=amt&&<div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:1,background:C.border}}/><span style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.faint}}>OR PAY NEW MONEY</span><div style={{flex:1,height:1,background:C.border}}/></div>}
        <Btn3D onClick={openRazorpay} disabled={loading} full s={{padding:"16px",fontSize:16}}>
          {loading?"OPENING PAYMENT...":"💳 PAY "+CUR+youPay+" NOW"}
        </Btn3D>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.faint,textAlign:"center"}}>
          Powered by Razorpay · 100% secure
        </div>
      </div>
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   CHECKIN GATE — fetches challenge fresh, blocks wake-up outside window
   ══════════════════════════════════════════════════════════ */
function CheckInGate({go,challengeId,userId,refresh,profile,challenges}){
  const [ready,setReady]=useState(false);
  const [blockInfo,setBlockInfo]=useState(null); // {icon,title,window,time}

  useEffect(()=>{(async()=>{
    await syncServerTime();
    const h=serverHour();
    const t=serverNow().toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata"});

    const {data}=await supabase.from("challenges").select("habit_name,verification_type").eq("id",challengeId).single();
    const name=data?.habit_name||"";
    const vtype=data?.verification_type||"photo";

    if(name==="Wake Up Early"){
      if(h>=WAKE_HOUR_START&&h<=WAKE_HOUR_END){
        setReady("yes");
      } else {
        setBlockInfo({icon:"⏰",title:"Wake-up Check-in Locked",window:"4:00 AM – 6:30 AM",time:t});
        setReady("no");
      }
    } else if(vtype==="screenshot"||name==="Limit Screentime"){
      if(h>=SS_HOUR_START){
        setReady("yes");
      } else {
        setBlockInfo({icon:"📱",title:"Screentime Check-in Locked",window:"9:00 PM – 11:59 PM",time:t});
        setReady("no");
      }
    } else {
      setReady("yes");
    }
  })();},[challengeId]);

  if(ready===false) return <Screen><Styles/><Loading/></Screen>;

  if(ready==="no"&&blockInfo) return <Screen><Styles/>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
      <div style={{fontSize:72}}>{blockInfo.icon}</div>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink,textAlign:"center"}}>{blockInfo.title}</div>
      <div style={{background:C.card,borderRadius:18,padding:20,border:`2px solid ${C.red}40`,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:16,color:C.red,marginBottom:8}}>Outside allowed window</div>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.sub}}>Check-in only allowed between</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.blue,margin:"10px 0"}}>{blockInfo.window}</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint}}>Server time (IST): {blockInfo.time}</div>
      </div>
      <Btn3D onClick={()=>go("home")} color={C.blue} darkColor={C.blueD} full>BACK TO HOME</Btn3D>
    </div>
  </Screen>;

  return <CheckIn go={go} challengeId={challengeId} userId={userId} refresh={refresh} profile={profile} challenges={challenges}/>;
}

/* ══════════════════════════════════════════════════════════
   CHECK-IN — tap / photo / video / screenshot + start-lock
   ══════════════════════════════════════════════════════════ */
function CheckIn({go,challengeId,userId,refresh}){
  const [challenge,setChallenge]=useState(null);
  const [dayNum,setDayNum]=useState(1);
  const [notStarted,setNotStarted]=useState(false);
  const [file,setFile]=useState(null);const [preview,setPreview]=useState("");
  const [recording,setRecording]=useState(false);
  const [videoBlob,setVideoBlob]=useState(null);const [videoPreview,setVideoPreview]=useState("");
  const [elapsed,setElapsed]=useState(0);
  const streamRef=useRef(null);const recorderRef=useRef(null);
  const chunksRef=useRef([]);const timerRef=useRef(null);const liveRef=useRef(null);
  const [loading,setLoading]=useState(false);const [done,setDone]=useState(false);const [err,setErr]=useState("");

  useEffect(()=>{
    (async()=>{
      const {data}=await supabase.from("challenges").select("*").eq("id",challengeId).single();
      if(data){
        setChallenge(data);
        if(data.start_date){
          const startIST=istMidnight(new Date(data.start_date));
          const nowIST=istMidnight(serverNow());
          if(nowIST<startIST) setNotStarted(true);
          else setDayNum(Math.floor((istMidnight(serverNow())-startIST)/(864e5))+1);
        }
      }
    })();
    return ()=>{streamRef.current?.getTracks().forEach(t=>t.stop());clearInterval(timerRef.current);};
  },[challengeId]);

  const vt=challenge?.verification_type||"photo";
  // Re-evaluate every second for wake-up window accuracy
  const [tick,setTick]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),1000);return ()=>clearInterval(t);},[]);

  const inSSWindow=()=>serverHour()>=SS_HOUR_START;
  const inWakeWindow=()=>{
    const h=serverHour();
    const wakeEnd=(challenge?.wake_hour||6)+1; // chosen time + 1 hour buffer
    return h>=WAKE_HOUR_START&&h<=wakeEnd;
  };
  const isWakeHabit=challenge?.habit_name==="Wake Up Early";

  const startRec=async()=>{
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      streamRef.current=s;
      if(liveRef.current){liveRef.current.srcObject=s;liveRef.current.play();}
      chunksRef.current=[];
      const mr=new MediaRecorder(s);
      mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
      mr.onstop=()=>{
        const blob=new Blob(chunksRef.current,{type:"video/webm"});
        setVideoBlob(blob);setVideoPreview(URL.createObjectURL(blob));
        s.getTracks().forEach(t=>t.stop());
      };
      mr.start(100);recorderRef.current=mr;
      setRecording(true);setElapsed(0);
      timerRef.current=setInterval(()=>setElapsed(e=>{
        if(e+1>=60){// auto-stop at 60s
          recorderRef.current?.stop();clearInterval(timerRef.current);setRecording(false);
        }
        return e+1;
      }),1000);
    }catch(e){setErr("Camera access denied. Allow camera in browser settings.");}
  };
  const stopRec=()=>{recorderRef.current?.stop();clearInterval(timerRef.current);setRecording(false);};
  const pickFile=(capture)=>{
    const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
    if(capture)inp.capture="user";
    inp.onchange=e=>{const f=e.target.files[0];if(f){setFile(f);setPreview(URL.createObjectURL(f));}};
    inp.click();
  };

  const submit=async()=>{
    // Rate limit — prevent double submissions
    if(!rateLimit(`checkin_${challengeId}`, 5000)){setErr("Please wait before submitting again.");return;}
    // Always re-sync server time before validating — don't trust stale offset
    await syncServerTime();
    const h=serverHour();
    const habitName=challenge?.habit_name||"";
    const verifyT=challenge?.verification_type||"photo";

    // Wake-up: strictly 4:00 AM – 6:30 AM, enforced here regardless of button state
    if(habitName==="Wake Up Early"){
      if(h<WAKE_HOUR_START||h>WAKE_HOUR_END){
        setErr(`❌ Wake-up window is 4:00 AM – 6:30 AM only. Server time now: ${serverNow().toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata"})}. Come back in the morning.`);
        return;
      }
    }
    if(vt==="photo"&&!file){setErr("Take a selfie first.");return;}
    if(vt==="video"&&!videoBlob){setErr("Record a video first.");return;}
    if(vt==="screenshot"&&!file){setErr("Upload a screenshot first.");return;}
    if(vt==="screenshot"&&h<SS_HOUR_START){setErr("Screenshots only accepted 9 PM – 11:59 PM.");return;}
    setLoading(true);setErr("");
    try{
      let mediaUrl=null;
      if((vt==="photo"||vt==="screenshot")&&file){
        const compressed=await compressImage(file);
        const fname=`${userId}/${challengeId}_day${dayNum}_${Date.now()}.jpg`;
        const {error:upE}=await supabase.storage.from("checkins").upload(fname,compressed,{contentType:"image/jpeg"});
        if(upE)throw upE;
        const {data:ud}=supabase.storage.from("checkins").getPublicUrl(fname);
        mediaUrl=ud.publicUrl;
      } else if(vt==="video"&&videoBlob){
        // #11 Video size cap: 50MB max
        if(videoBlob.size>50*1024*1024){setErr("Video too large. Keep it under 50MB (shorter recording).");setLoading(false);return;}
        const fname=`${userId}/${challengeId}_day${dayNum}_${Date.now()}.webm`;
        const {error:upE}=await supabase.storage.from("checkins").upload(fname,videoBlob,{contentType:"video/webm"});
        if(upE)throw upE;
        const {data:ud}=supabase.storage.from("checkins").getPublicUrl(fname);
        mediaUrl=ud.publicUrl;
      }
      const {error}=await supabase.from("checkins").insert({challenge_id:challengeId,user_id:userId,day_number:dayNum,photo_url:mediaUrl});
      if(error){
        if(error.message.includes("duplicate")||error.message.includes("unique")) throw new Error("Already submitted for Day "+dayNum+". One check-in per day.");
        throw error;
      }
      // Check if challenge is now complete
      const {data:freshCu}=await supabase.from("challenge_users")
        .select("completed_days,challenge:challenges(days,status)")
        .eq("challenge_id",challengeId).eq("user_id",userId).single();
      const isComplete=freshCu&&freshCu.completed_days>=freshCu.challenge?.days;
      if(isComplete&&freshCu.challenge?.status==="active"){
        await supabase.rpc("end_challenge",{p_challenge_id:challengeId});
        setCompletedChallenge({...freshCu,challenge_id:challengeId});
        setChallengeComplete(true);
      }
      setDone(true);refresh();
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  if(challenge&&notStarted){
    const startD=new Date(challenge.start_date);
    return <Screen><Styles/><StatusBar/><TopBar title="Check In" onBack={()=>go("home")}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:16}}>
        <div style={{fontSize:72}}>🌅</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink}}>Not started yet</div>
        <Card style={{textAlign:"center",padding:20,background:C.blueL,border:`2px solid ${C.blue}30`,width:"100%"}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.blue,marginBottom:4}}>Day 1 starts on</div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:20,color:C.ink}}>{startD.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub,marginTop:6}}>Today is NOT a miss. Come back tomorrow!</div>
        </Card>
        <Btn3D onClick={()=>go("home")} full>BACK TO HOME</Btn3D>
      </div>
    </Screen>;
  }

  // Challenge complete popup
  if(done&&challengeComplete){
    const allChs=challenges||[];
    const withdrawable=Math.round(allChs.filter(cu=>cu.challenge?.status==="finished"&&!cu.forfeited).reduce((s,cu)=>s+parseFloat(cu.remaining_amount||0),0));
    const stake=challenge?.stake||0;
    const fee=Math.round(stake*0.02);
    const youGet=stake-fee;
    const completeBg="linear-gradient(180deg,"+C.greenL+" 0%,"+C.bg+" 60%)";
    return <Screen><Styles/><StatusBar/>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:14,background:completeBg}}>
        <div style={{fontSize:72}}>🏆</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:28,color:C.green,textAlign:"center"}}>Challenge Complete!</div>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.sub,textAlign:"center"}}>You completed all {challenge?.days} days of {challenge?.habit_icon} {challenge?.habit_name}!</div>
        <Card style={{width:"100%",background:`${C.green}12`,border:`2px solid ${C.green}40`,textAlign:"center",padding:20}}>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>YOUR WINNINGS</div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:40,color:C.green,marginTop:4}}>{CUR}{youGet}</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.faint,marginTop:4}}>After 2% gateway fee · Ready to withdraw</div>
        </Card>
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
          <Btn3D onClick={()=>go("newhabit")} full s={{fontSize:15,padding:"16px"}}>🚀 START ANOTHER CHALLENGE</Btn3D>
          <BtnOutline onClick={()=>go("profile")} full>💸 Withdraw {CUR}{withdrawable+youGet}</BtnOutline>
          <button onClick={()=>go("home")} className="btn" style={{background:"none",border:"none",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.faint,padding:"8px"}}>Back to Home</button>
        </div>
      </div>
    </Screen>;
  }

  if(done) return <Screen><Styles/><StatusBar/>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,gap:16}}>
      <div style={{fontSize:72}} className="bounce">🎉</div>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.ink}}>Day {dayNum} submitted!</div>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,textAlign:"center"}}>Pending admin verification</div>
      <div style={{background:C.purpleL,borderRadius:18,padding:"16px 28px",border:`2px solid ${C.purple}40`,textAlign:"center"}} className="gritPop">
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:24,color:C.purple}}>+1 GRIT ⚡</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub,marginTop:4}}>Awarded after verification</div>
      </div>
      <Btn3D onClick={()=>go("home")} full>BACK TO HOME</Btn3D>
    </div>
  </Screen>;

  if(!challenge) return <Screen><Styles/><Loading/></Screen>;
  const HabitCard=()=><Card style={{textAlign:"center",padding:12,flexShrink:0}}>
    <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:15,color:C.ink}}>{challenge.habit_icon} {challenge.habit_name}</div>
    <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub,marginTop:2}}>Day {dayNum}/{challenge.days}</div>
  </Card>;

  if(vt==="tap") return <Screen><Styles/><StatusBar/><TopBar title="Check In" onBack={()=>go("home")}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:20,gap:14}}>
      <HabitCard/>
      {isWakeHabit&&<div style={{background:inWakeWindow()?C.greenL:C.redL,borderRadius:14,padding:"12px 16px",border:`2px solid ${inWakeWindow()?C.green:C.red}30`}}>
        <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:inWakeWindow()?C.green:C.red}}>
          {inWakeWindow()?"✅ Window open — check in now!":"⏰ Check-in window: 4:00 AM – 6:30 AM only"}
        </div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:3}}>
          {inWakeWindow()?`Server time: ${serverNow().toLocaleTimeString("en-IN",{timeZone:"Asia/Kolkata"})} — go!`:"Outside the window = auto miss. No exceptions."}
        </div>
      </div>}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
        <div style={{fontSize:80}} className="float">{challenge.habit_icon}</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink,textAlign:"center"}}>Did you do it today?</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,textAlign:"center"}}>
          {isWakeHabit?"Tap below to confirm you woke up on time":"Tap below to confirm you completed your habit"}
        </div>
      </div>
      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
      <Btn3D onClick={()=>{bellChime();submit();}} disabled={loading||(isWakeHabit&&!inWakeWindow())} full s={{padding:"18px",fontSize:18,borderRadius:18}}>
        {loading?"SUBMITTING...":isWakeHabit&&!inWakeWindow()?"⏰ WINDOW CLOSED":"✅ YES, I DID IT!"}
      </Btn3D>
    </div>
  </Screen>;

  if(vt==="video") return <Screen><Styles/><StatusBar/><TopBar title="Check In" onBack={()=>{streamRef.current?.getTracks().forEach(t=>t.stop());go("home");}}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:20,gap:14}}>
      <HabitCard/>
      <div style={{flex:1,background:C.card,borderRadius:20,border:`3px dashed ${videoBlob?C.green:recording?C.red:C.border}`,overflow:"hidden",minHeight:220,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        {recording&&<video ref={liveRef} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:17,position:"absolute",top:0,left:0}} muted playsInline/>}
        {videoPreview&&!recording&&<video src={videoPreview} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:17,position:"absolute",top:0,left:0}} controls/>}
        {!recording&&!videoPreview&&<div style={{textAlign:"center"}}><div style={{fontSize:52,marginBottom:8}} className="bounce">🎥</div><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:16,color:C.ink}}>Record yourself!</div><div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:4}}>Min 10 seconds</div></div>}
        {recording&&<div style={{position:"absolute",top:12,right:12,background:"rgba(255,75,75,.9)",borderRadius:99,padding:"4px 14px",fontFamily:"Nunito",fontWeight:900,fontSize:13,color:"#fff",zIndex:2}}>● REC {elapsed}s</div>}
        {videoBlob&&!recording&&<div style={{position:"absolute",bottom:10,left:0,right:0,textAlign:"center",zIndex:2}}><span style={{background:"rgba(88,204,2,.9)",borderRadius:99,padding:"4px 14px",fontFamily:"Nunito",fontWeight:800,fontSize:12,color:"#fff"}}>✓ {elapsed}s recorded</span></div>}
      </div>
      <div style={{display:"flex",gap:8}}>
        {!recording&&!videoBlob&&<Btn3D onClick={startRec} color={C.red} full>🎥 START RECORDING</Btn3D>}
        {recording&&<Btn3D onClick={stopRec} color={C.orange} darkColor={C.orangeD} full>⏹ STOP ({elapsed}s)</Btn3D>}
        {videoBlob&&!recording&&<Btn3D onClick={()=>{setVideoBlob(null);setVideoPreview("");setElapsed(0);}} color={C.muted} full>Retake</Btn3D>}
      </div>
      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
      <Btn3D onClick={()=>{bellChime();submit();}} disabled={!videoBlob||elapsed<10||loading} full>{loading?"SUBMITTING...":"SUBMIT CHECK-IN"}</Btn3D>
    </div>
  </Screen>;

  if(vt==="screenshot"){
    const inW=inSSWindow();
    return <Screen><Styles/><StatusBar/><TopBar title="Check In" onBack={()=>go("home")}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:20,gap:12}}>
        <HabitCard/>
        <Card style={{background:inW?C.greenL:C.goldL,border:`2px solid ${inW?C.green:C.gold}30`}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:inW?C.green:C.gold,marginBottom:4}}>{inW?"✅ Upload window open now":"⏰ Upload window: 9 PM – 11:59 PM only"}</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub}}>Settings → Screen Time (iOS) or Digital Wellbeing (Android)</div>
          {challenge.screentime_limit_hours&&<div style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.green,marginTop:4}}>Your limit: under {challenge.screentime_limit_hours}h/day</div>}
        </Card>
        <div style={{flex:1,background:C.card,borderRadius:20,border:`3px dashed ${preview?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",minHeight:180,overflow:"hidden"}}>
          {!preview?<div style={{textAlign:"center"}}>
            <div style={{fontSize:44,marginBottom:8}} className="bounce">📱</div>
            <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:15,color:C.ink}}>Upload your screenshot</div>
            <div style={{marginTop:12}}><Btn3D onClick={()=>pickFile(false)} color={C.blue} darkColor={C.blueD} disabled={!inW}>SELECT SCREENSHOT</Btn3D></div>
            {!inW&&<div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.red,marginTop:8}}>Not available until 9 PM</div>}
          </div>:<div style={{textAlign:"center",padding:10}}><img src={preview} style={{maxWidth:"100%",maxHeight:200,borderRadius:12,objectFit:"contain"}}/><button onClick={()=>{setFile(null);setPreview("");}} className="btn" style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.blue,background:"none",border:"none",display:"block",margin:"8px auto 0"}}>Change</button></div>}
        </div>
        {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
        <Btn3D onClick={()=>{bellChime();submit();}} disabled={!file||loading||!inW} full>{loading?"SUBMITTING...":"SUBMIT CHECK-IN"}</Btn3D>
      </div>
    </Screen>;
  }

  return <Screen><Styles/><StatusBar/><TopBar title="Check In" onBack={()=>go("home")}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:20,gap:14}}>
      <HabitCard/>
      <div style={{flex:1,background:C.card,borderRadius:20,border:`3px dashed ${preview?C.green:C.border}`,display:"flex",alignItems:"center",justifyContent:"center",minHeight:240,overflow:"hidden"}}>
        {!preview?<div style={{textAlign:"center"}}><div style={{fontSize:56,marginBottom:12}} className="bounce">📸</div><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:17,color:C.ink}}>Take a selfie!</div><div style={{marginTop:16}}><Btn3D onClick={()=>pickFile(true)}>OPEN CAMERA</Btn3D></div></div>
        :<div style={{textAlign:"center"}}><img src={preview} style={{width:200,height:200,borderRadius:20,objectFit:"cover"}}/><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:16,color:C.green,marginTop:8}}>✅ Photo ready</div><button onClick={()=>pickFile(true)} className="btn" style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.blue,background:"none",border:"none",marginTop:8}}>Retake</button></div>}
      </div>
      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
      <Btn3D onClick={()=>{bellChime();submit();}} disabled={!file||loading} full>{loading?"SUBMITTING...":"SUBMIT CHECK-IN"}</Btn3D>
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   WALL
   ══════════════════════════════════════════════════════════ */
function Wall({userId}){
  const [feed,setFeed]=useState([]);
  const [likes,setLikes]=useState({});
  const [myLikes,setMyLikes]=useState(new Set());
  const [commentCounts,setCommentCounts]=useState({});
  const [expanded,setExpanded]=useState(null);
  const [comments,setComments]=useState({});
  const [drafts,setDrafts]=useState({});
  const [sending,setSending]=useState(null);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState(1);
  const [hasMore,setHasMore]=useState(false);
  const PAGE_SIZE=10;

  const MILESTONES=[3,7,14,21,30,60,90];
  const milestoneLabel=(d)=>d>=30?`${d} days 🔥`:d>=14?`${d} days 💪`:d>=7?`${d} days ⚡`:`${d} days ✅`;
  const milestoneColor=(d)=>d>=30?C.gold:d>=14?C.orange:d>=7?C.blue:C.green;

  const load=async(pg=1)=>{
    const {data:raw}=await supabase.rpc("get_wall_feed",{p_limit:PAGE_SIZE*pg+1});
    const valid=(raw||[]).filter(x=>((x.completed_days||0)+(x.missed_days||0))>0).map(x=>({
      id:x.id,user_id:x.user_id,challenge_id:x.challenge_id,
      completed_days:x.completed_days,missed_days:x.missed_days||0,
      consecutive_misses:x.consecutive_misses||0,remaining_amount:x.remaining_amount,
      earnings:x.earnings||0,forfeited:x.forfeited,
      profile:{name:x.profile_name,avatar_url:x.profile_avatar},
      challenge:{habit_name:x.habit_name,habit_icon:x.habit_icon,mode:x.mode,
        stake:x.stake,days:x.days,charity_name:x.charity_name,status:x.challenge_status},
    }));
    setHasMore(valid.length>PAGE_SIZE*pg);
    const shown=valid.slice(0,PAGE_SIZE*pg);
    setFeed(shown);

    // Likes
    const {data:likesData}=await supabase.from("wall_likes").select("cu_id,user_id");
    const counts={};const mySet=new Set();
    (likesData||[]).forEach(l=>{
      counts[l.cu_id]=(counts[l.cu_id]||0)+1;
      if(l.user_id===userId) mySet.add(l.cu_id);
    });
    setLikes(counts);setMyLikes(mySet);

    // Comment counts
    if(valid.length){
      const {data:cc}=await supabase.rpc("get_wall_comment_counts",{p_cu_ids:valid.map(x=>x.id)});
      setCommentCounts(cc||{});
    }
    setLoading(false);
  };

  useEffect(()=>{load(page);},[page]);
  // Auto-refresh every 10 minutes
  useEffect(()=>{
    const t=setInterval(()=>{setPage(1);load(1);},10*60*1000);
    return ()=>clearInterval(t);
  },[]);

  const toggleLike=async(cuId)=>{
    const already=myLikes.has(cuId);
    setMyLikes(prev=>{const n=new Set(prev);already?n.delete(cuId):n.add(cuId);return n;});
    setLikes(prev=>({...prev,[cuId]:(prev[cuId]||0)+(already?-1:1)}));
    if(already) await supabase.from("wall_likes").delete().eq("cu_id",cuId).eq("user_id",userId);
    else await supabase.from("wall_likes").insert({cu_id:cuId,user_id:userId});
  };

  const toggleComments=async(cuId)=>{
    if(expanded===cuId){setExpanded(null);return;}
    setExpanded(cuId);
    if(!comments[cuId]){
      const {data}=await supabase.rpc("get_wall_comments",{p_cu_id:cuId});
      setComments(prev=>({...prev,[cuId]:data||[]}));
    }
  };

  const [myProfile,setMyProfile]=useState(null);
  useEffect(()=>{
    supabase.from("profiles").select("name,avatar_url").eq("id",userId).single()
      .then(({data})=>setMyProfile(data));
  },[userId]);

  const sendComment=async(cuId)=>{
    const text=(drafts[cuId]||"").trim();
    if(!text) return;
    setSending(cuId);
    const {data:row,error}=await supabase.from("wall_comments")
      .insert({cu_id:cuId,user_id:userId,body:text})
      .select().single();
    if(error){
      alert("Could not post comment: "+error.message);
    } else if(row){
      const newComment={...row,author_name:myProfile?.name||"You",author_avatar:myProfile?.avatar_url||null};
      setComments(prev=>({...prev,[cuId]:[...(prev[cuId]||[]),newComment]}));
      setCommentCounts(prev=>({...prev,[cuId]:(parseInt(prev[cuId])||0)+1}));
      setDrafts(prev=>({...prev,[cuId]:""}));
    }
    setSending(null);
  };

  const deleteComment=(cuId,commentId)=>async()=>{
    await supabase.from("wall_comments").delete().eq("id",commentId);
    setComments(prev=>({...prev,[cuId]:(prev[cuId]||[]).filter(c=>c.id!==commentId)}));
    setCommentCounts(prev=>({...prev,[cuId]:Math.max((prev[cuId]||1)-1,0)}));
  };

  const items=feed.map(cu=>{
    const d=cu.completed_days;const total=cu.challenge?.days||1;
    const pct=Math.round((d/total)*100);
    const hasMisses=cu.missed_days>0;
    return {...cu,_milestone:MILESTONES.includes(d),_pct:pct,_hasMisses:hasMisses};
  });

  const Avatar=({url,name,size=36})=><div style={{width:size,height:size,borderRadius:99,background:C.raised,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Nunito",fontWeight:900,fontSize:size*0.38,color:C.sub,border:`2px solid ${C.border}`,overflow:"hidden",flexShrink:0}}>
    {url?<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{name?.[0]||"?"}</span>}
  </div>;

  return <Screen><StatusBar/><TopBar title="🌍 The Wall"/>
    <div style={{padding:"8px 20px 4px",fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint}}>Newest first · Progress, milestones &amp; misses · 💬 comment</div>
    <div style={{padding:"6px 20px 20px",display:"flex",flexDirection:"column",gap:10}}>
      {loading&&page===1&&<div style={{textAlign:"center",padding:40,fontFamily:"Nunito",fontWeight:700,color:C.sub}}>Loading...</div>}
    {!loading&&items.length===0&&<Card>
        <div style={{textAlign:"center",padding:"24px 0"}}>
          <div style={{fontSize:36,marginBottom:8}}>🌱</div>
          <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.sub}}>No progress to show yet</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint,marginTop:4}}>Complete your first day to appear here!</div>
        </div>
      </Card>}

      {items.map(cu=>{
        const ch=cu.challenge;if(!ch)return null;
        const isMine=cu.user_id===userId;
        const liked=myLikes.has(cu.id);
        const likeCount=likes[cu.id]||0;
        const commentCount=commentCounts[cu.id]||0;
        const isExpanded=expanded===cu.id;
        const mc=milestoneColor(cu.completed_days);
        const cardComments=comments[cu.id]||[];

        return <div key={cu.id} style={{
          background:cu._milestone?`linear-gradient(135deg,${mc}15,${C.card})`:C.card,
          borderRadius:18,padding:16,
          border:`2px solid ${cu._milestone?mc+"40":C.border}`,
          borderBottom:`4px solid ${cu._milestone?mc+"60":C.border}`,
        }}>
          {/* Milestone badge */}
          {cu._milestone&&<div style={{display:"inline-flex",alignItems:"center",gap:6,background:`${mc}22`,border:`1px solid ${mc}44`,borderRadius:99,padding:"3px 12px",marginBottom:10}}>
            <span style={{fontSize:14}}>🏆</span>
            <span style={{fontFamily:"Nunito",fontWeight:900,fontSize:12,color:mc}}>{milestoneLabel(cu.completed_days)} MILESTONE</span>
          </div>}

          {/* Header — avatar + name */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <Avatar url={cu.profile?.avatar_url} name={cu.profile?.name} size={42}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:15,color:C.ink}}>
                {cu.profile?.name||"User"}{isMine&&<span style={{fontSize:10,color:C.faint}}> (you)</span>}
              </div>
              <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub,marginTop:2,lineHeight:1.3}}>
                {cu.missed_days>0&&cu.completed_days===0
                  ? <span style={{color:C.red}}>missed day {cu.missed_days}/{ch.days} of <b>"{ch.habit_name}"</b> 😔</span>
                  : cu.forfeited
                    ? <span style={{color:C.red}}>forfeited <b>"{ch.habit_name}"</b> after {cu.completed_days} days 💀</span>
                    : <span>completed day <b style={{color:mc}}>{cu.completed_days}/{ch.days}</b> of their goal <b>"{ch.habit_name}"</b> {cu.completed_days===ch.days?"🎉":"💪"}</span>
                }
              </div>
            </div>
            <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:12,color:C.faint}}>{ch.mode==="1v1"?"⚡":"🌱"}</div>
          </div>

          {/* Progress bar */}
          <div style={{height:6,background:C.raised,borderRadius:99,overflow:"hidden",border:`1px solid ${C.border}`,marginBottom:8}}>
            <div style={{width:`${cu._pct}%`,height:"100%",background:cu.forfeited?C.red:mc,borderRadius:99}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:10,color:C.faint}}>{CUR}{ch.stake} staked · {cu._pct}% done</span>
            {cu.missed_days>0&&<span style={{fontFamily:"Nunito",fontWeight:700,fontSize:10,color:C.red}}>❌ {cu.missed_days} missed</span>}
          </div>

          {/* Action row — like + comment */}
          <div style={{display:"flex",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
            <button onClick={()=>!isMine&&toggleLike(cu.id)} className={isMine?"":"btn"} style={{display:"flex",alignItems:"center",gap:5,background:liked?`${C.red}18`:"transparent",border:`1.5px solid ${liked?C.red:C.border}`,borderRadius:99,padding:"5px 12px",cursor:isMine?"default":"pointer",opacity:isMine?0.5:1,flex:1,justifyContent:"center"}}>
              <span style={{fontSize:14}}>{liked?"❤️":"🤍"}</span>
              <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:liked?C.red:C.sub}}>{likeCount>0?likeCount:"Like"}</span>
            </button>
            <button onClick={()=>toggleComments(cu.id)} className="btn" style={{display:"flex",alignItems:"center",gap:5,background:isExpanded?`${C.blue}18`:"transparent",border:`1.5px solid ${isExpanded?C.blue:C.border}`,borderRadius:99,padding:"5px 12px",flex:1,justifyContent:"center"}}>
              <span style={{fontSize:14}}>💬</span>
              <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:isExpanded?C.blue:C.sub}}>{commentCount>0?commentCount:"Comment"}</span>
            </button>
          </div>

          {/* Comments section — inline, expands on tap */}
          {isExpanded&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:10}}>
            {/* Existing comments */}
            {cardComments.length===0&&<div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint,textAlign:"center",padding:"8px 0"}}>No comments yet. Be the first! 👋</div>}
            {cardComments.map(c=><div key={c.id} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <Avatar url={c.author_avatar} name={c.author_name} size={28}/>
              <div style={{flex:1,background:C.raised,borderRadius:12,padding:"8px 12px",border:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.ink}}>{c.author_name}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontFamily:"Nunito",fontWeight:600,fontSize:10,color:C.faint}}>{new Date(c.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</span>
                    <button onClick={()=>setDrafts(prev=>({...prev,[cu.id]:`@${c.author_name} `}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:C.blue,padding:0,fontFamily:"Nunito",fontWeight:700}}>Reply</button>
                    {c.user_id===userId&&<button onClick={deleteComment(cu.id,c.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:C.faint,padding:0,marginLeft:4}}>✕</button>}
                  </div>
                </div>
                <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:C.sub,lineHeight:1.4}}>{c.body}</div>
              </div>
            </div>)}

            {/* Input row */}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <Avatar url={myProfile?.avatar_url} name={myProfile?.name} size={28}/>
              <div style={{flex:1,background:C.surf,border:`2px solid ${C.border}`,borderRadius:14,padding:"8px 12px",display:"flex",alignItems:"flex-end",gap:8}}>
                <textarea
                  value={drafts[cu.id]||""}
                  onChange={e=>setDrafts(prev=>({...prev,[cu.id]:e.target.value}))}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendComment(cu.id);}}}
                  placeholder="Say something encouraging..."
                  maxLength={280}
                  rows={1}
                  style={{flex:1,border:"none",background:"none",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.ink,resize:"none",outline:"none",lineHeight:1.4}}
                />
                <button onClick={()=>sendComment(cu.id)} disabled={sending===cu.id||!(drafts[cu.id]||"").trim()} className="btn" style={{background:C.green,border:"none",borderRadius:10,padding:"6px 12px",fontFamily:"Nunito",fontWeight:900,fontSize:12,color:"#fff",whiteSpace:"nowrap"}}>
                  {sending===cu.id?"...":"Send"}
                </button>
              </div>
            </div>
          </div>}
        </div>;
      })}
      {hasMore&&<div style={{textAlign:"center",padding:"10px 0 20px"}}>
        <button onClick={()=>setPage(p=>p+1)} className="btn" style={{background:C.raised,border:`2px solid ${C.border}`,borderRadius:12,padding:"12px 28px",fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.sub}}>
          {loading?"Loading...":"Load More"}
        </button>
      </div>}
      {!hasMore&&feed.length>0&&<div style={{textAlign:"center",padding:"8px 0 20px",fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint}}>You're all caught up 🎉</div>}
    </div>
  </Screen>;
}


function Leaderboard(){
  const [users,setUsers]=useState([]);
  const [tab,setTab]=useState("weekly");
  const [daysLeft,setDaysLeft]=useState(0);

  useEffect(()=>{
    // Days until next Monday reset
    const now=serverNow();
    const day=now.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",weekday:"short"});
    const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const idx=days.indexOf(day);
    const d=idx===-1?7:(7-idx)%7||7;
    setDaysLeft(d);
  },[]);

  useEffect(()=>{(async()=>{
    const col=tab==="weekly"?"weekly_grit":"grit";
    const {data}=await supabase.from("profiles").select("id,name,avatar_url,grit,weekly_grit,longest_streak,current_streak,total_completed").order(col,{ascending:false}).limit(20);
    setUsers(data||[]);
  })();},[tab]);

  const AvatarSmall=({url,name})=><div style={{width:40,height:40,borderRadius:99,background:C.card,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Nunito",fontWeight:800,fontSize:16,color:C.sub,border:`2px solid ${C.border}`,overflow:"hidden",flexShrink:0}}>
    {url?<img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{name?.[0]||"?"}</span>}
  </div>;

  return <Screen><StatusBar/><TopBar title="🏆 Leaderboard"/>
    {/* Tabs */}
    <div style={{display:"flex",margin:"10px 20px 0",background:C.surf,borderRadius:14,padding:3,border:`2px solid ${C.border}`}}>
      {[{id:"weekly",l:"This Week"},  {id:"alltime",l:"All Time"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:tab===t.id?C.card:"transparent",border:tab===t.id?`2px solid ${C.border}`:"2px solid transparent",borderRadius:11,padding:"9px 0",fontFamily:"Nunito",fontWeight:800,fontSize:12,color:tab===t.id?C.ink:C.faint,cursor:"pointer",textTransform:"uppercase"}}>{t.l}</button>)}
    </div>
    {tab==="weekly"&&<div style={{padding:"8px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.faint}}>Ranked by Weekly Grit ⚡</div>
      <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:11,color:C.blue}}>Resets in {daysLeft}d 🔄</div>
    </div>}
    {tab==="alltime"&&<div style={{padding:"8px 20px 0",fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.faint}}>All-time Grit ⚡</div>}
    <div style={{padding:"4px 20px 12px",display:"flex",flexDirection:"column",gap:2}}>
      {users.length===0&&<Card><div style={{textAlign:"center",padding:20,fontFamily:"Nunito",fontWeight:700,color:C.sub}}>No users yet</div></Card>}
      {users.map((u,i)=>{
        const score=tab==="weekly"?u.weekly_grit:u.grit;
        if(!score&&score!==0) return null;
        return <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`2px solid ${C.border}`}}>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:16,color:i<3?C.gold:C.faint,width:30,textAlign:"center"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</div>
          <AvatarSmall url={u.avatar_url} name={u.name}/>
          <div style={{flex:1}}>
            <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.ink}}>{u.name}</div>
            <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub}}>🔥 {u.current_streak||0}d streak · best {u.longest_streak||0}d · {u.total_completed||0} done</div>
          </div>
          <div style={{background:C.purpleL,borderRadius:12,padding:"6px 12px",border:`2px solid ${C.purple}30`,textAlign:"center",minWidth:52}}>
            <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:18,color:C.purple}}>{score||0}</div>
            <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:9,color:C.purple}}>GRIT</div>
          </div>
        </div>;
      })}
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   PROFILE  #25 grit stat
   ══════════════════════════════════════════════════════════ */
function Profile({go,profile,onLogout,onRefresh,challenges}){
  const [uploading,setUploading]=useState(false);
  const [avatarUrl,setAvatarUrl]=useState(profile?.avatar_url||null);
  const [allChallenges,setAllChallenges]=useState(challenges||[]);
  const [donationLoaded,setDonationLoaded]=useState(false);
  const [showWithdraw,setShowWithdraw]=useState(false);
  const [withdrawUpi,setWithdrawUpi]=useState("");
  const [withdrawLoading,setWithdrawLoading]=useState(false);
  const [withdrawDone,setWithdrawDone]=useState(false);
  const [withdrawErr,setWithdrawErr]=useState("");

  useEffect(()=>{
    if(!profile?.id) return;
    supabase.from("challenge_users")
      .select("*,challenge:challenges(*)")
      .eq("user_id",profile.id)
      .then(({data})=>{
        if(data) setAllChallenges(data.filter(x=>x.challenge));
        setDonationLoaded(true);
      });
  },[profile?.id]);

  if(!profile) return <Loading/>;

  // Withdrawable = remaining_amount from FINISHED challenges only
  let withdrawable=0;
  allChallenges.forEach(cu=>{
    const ch=cu.challenge;
    if(!ch||ch.status!=="finished"||cu.forfeited) return;
    withdrawable+=parseFloat(cu.remaining_amount||0);
  });
  withdrawable=Math.round(withdrawable);

  const charityBreakdown=[];
  let totalDonated=0;
  allChallenges.forEach(cu=>{
    const ch=cu.challenge;
    if(!ch||ch.mode!=="solo"||!cu.missed_days||cu.missed_days===0) return;
    const daily=Math.round(ch.stake/ch.days);
    const donated=Math.round(cu.missed_days*daily*0.10);
    if(donated>0){
      totalDonated+=donated;
      const existing=charityBreakdown.find(x=>x.name===ch.charity_name);
      if(existing) existing.amount+=donated;
      else charityBreakdown.push({name:ch.charity_name||"Charity",amount:donated});
    }
  });

  const uploadAvatar=async(e)=>{
    const file=e.target.files?.[0];
    if(!file) return;
    if(file.size>5*1024*1024){alert("Image too large. Max 5MB.");return;}
    setUploading(true);
    try{
      const compressed=await compressImage(file,400,0.85);
      const path=`${profile.id}/avatar.jpg`;
      const {error:upErr}=await supabase.storage.from("avatars").upload(path,compressed,{upsert:true,contentType:"image/jpeg"});
      if(upErr) throw upErr;
      const {data:{publicUrl}}=supabase.storage.from("avatars").getPublicUrl(`${profile.id}/avatar.jpg`);
      const url=publicUrl+"?t="+Date.now();
      await supabase.from("profiles").update({avatar_url:url}).eq("id",profile.id);
      setAvatarUrl(url);
      onRefresh&&onRefresh();
    }catch(e){alert("Upload failed: "+e.message);}
    setUploading(false);
  };

  const submitWithdraw=async()=>{
    if(!withdrawUpi.trim()||!withdrawUpi.includes("@")){setWithdrawErr("Enter a valid UPI ID (e.g. name@upi)");return;}
    if(withdrawable<=0){setWithdrawErr("No withdrawable balance.");return;}
    setWithdrawLoading(true);setWithdrawErr("");
    try{
      const {error}=await supabase.from("refund_requests").insert({
        user_id:profile.id,
        user_name:profile.name,
        upi_id:withdrawUpi.trim(),
        amount:withdrawable,
      });
      if(error) throw error;
      setWithdrawDone(true);
    }catch(e){setWithdrawErr(e.message);}
    setWithdrawLoading(false);
  };

  return <Screen><StatusBar/>
    <div style={{padding:20,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <label style={{position:"relative",cursor:"pointer"}}>
        <input type="file" accept="image/*" onChange={uploadAvatar} style={{display:"none"}}/>
        <div style={{width:80,height:80,borderRadius:99,background:C.greenL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontFamily:"Nunito",fontWeight:900,color:C.green,border:`3px solid ${C.green}50`,overflow:"hidden",position:"relative"}}>
          {avatarUrl
            ?<img src={avatarUrl} alt="avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            :<span>{profile.name?.[0]||"?"}</span>
          }
          {uploading&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}><Loading/></div>}
        </div>
        <div style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:99,background:C.green,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>📷</div>
      </label>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink,marginTop:8}}>{profile.name}</div>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.faint}}>Tap photo to change</div>
    </div>
    <div style={{display:"flex",gap:6,padding:"0 20px",marginBottom:10}}>
      {[{l:"Done",v:profile.total_completed||0,c:C.green},{l:"Failed",v:profile.total_failed||0,c:C.red},{l:"Streak 🔥",v:profile.current_streak||0,c:C.gold},{l:"Best 🔥",v:profile.longest_streak||0,c:C.orange},{l:"Grit ⚡",v:profile.grit||0,c:C.purple}].map((s,i)=><Card key={i} style={{flex:1,textAlign:"center",padding:"12px 4px"}}><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:18,color:s.c}}>{s.v}</div><div style={{fontFamily:"Nunito",fontWeight:700,fontSize:9,color:C.sub,marginTop:2}}>{s.l}</div></Card>)}
    </div>

    {/* Withdrawable Balance */}
    <div style={{margin:"0 20px 12px",background:withdrawable>0?`${C.green}12`:C.surf,borderRadius:16,padding:"14px 16px",border:`2px solid ${withdrawable>0?C.green+"40":C.border}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:14,color:C.ink}}>💰 Withdrawable Balance</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub,marginTop:2}}>From completed challenges only</div>
        </div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:withdrawable>0?C.green:C.faint}}>{CUR}{withdrawable}</div>
      </div>
      {withdrawable>0&&!showWithdraw&&!withdrawDone&&<div style={{display:"flex",gap:8,marginTop:12}}>
        <Btn3D onClick={()=>setShowWithdraw(true)} full s={{fontSize:13}}>💸 WITHDRAW</Btn3D>
        <Btn3D onClick={()=>go("newhabit:"+withdrawable)} color={C.blue} darkColor={C.blueD} full s={{fontSize:13}}>🚀 NEW CHALLENGE</Btn3D>
      </div>}
      {withdrawable===0&&<Btn3D onClick={()=>go("newhabit")} color={C.blue} darkColor={C.blueD} full s={{marginTop:12,fontSize:13}}>🚀 START A CHALLENGE</Btn3D>}
      {withdrawDone&&<div style={{marginTop:10,background:`${C.green}20`,borderRadius:10,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.green}}>✅ Withdrawal request submitted! We'll send the money to your UPI within 24 hours.</div>}
      {showWithdraw&&!withdrawDone&&<div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>Enter UPI ID to receive {CUR}{withdrawable}</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.orange}}>⚠️ 2% payment gateway fee will be deducted. You'll receive {CUR}{Math.round(withdrawable*0.98)}.</div>
        <Input value={withdrawUpi} onChange={setWithdrawUpi} placeholder="yourname@upi" icon="💳"/>
        {withdrawErr&&<div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.red}}>{withdrawErr}</div>}
        <div style={{display:"flex",gap:8}}>
          <BtnOutline onClick={()=>{setShowWithdraw(false);setWithdrawErr("");}}>Cancel</BtnOutline>
          <Btn3D onClick={submitWithdraw} disabled={withdrawLoading||!withdrawUpi.trim()} full>{withdrawLoading?"SUBMITTING...":"CONFIRM WITHDRAW"}</Btn3D>
        </div>
      </div>}
      {withdrawable===0&&<div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint,marginTop:6}}>Complete a challenge to unlock withdrawals</div>}
    </div>

    {/* Charity donation total */}
    {!donationLoaded&&<div style={{margin:"0 20px 16px",background:`${C.red}08`,borderRadius:16,padding:"14px 16px",border:`2px solid ${C.red}20`}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:20}}>❤️</span>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint}}>Loading donation history...</div>
      </div>
    </div>}
    {donationLoaded&&totalDonated===0&&<div style={{margin:"0 20px 16px",background:`${C.red}08`,borderRadius:16,padding:"14px 16px",border:`2px solid ${C.red}20`}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:20}}>❤️</span>
        <div>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.faint}}>₹0 donated so far</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.faint}}>10% of any missed day goes to your chosen charity</div>
        </div>
      </div>
    </div>}
    {donationLoaded&&totalDonated>0&&<div style={{margin:"0 20px 16px",background:`${C.red}12`,borderRadius:16,padding:"14px 16px",border:`2px solid ${C.red}30`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:charityBreakdown.length>1?10:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>❤️</span>
          <div>
            <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:14,color:C.ink}}>Total Donated via Losses</div>
            <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:11,color:C.sub}}>10% of missed days goes to charity</div>
          </div>
        </div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.red}}>{CUR}{totalDonated}</div>
      </div>
      {charityBreakdown.length>0&&<div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8,borderTop:`1px solid ${C.red}20`,paddingTop:8}}>
        {charityBreakdown.map((b,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub}}>{b.name}</span>
          <span style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.red}}>{CUR}{b.amount}</span>
        </div>)}
      </div>}
    </div>}
    <div style={{padding:"0 20px",display:"flex",flexDirection:"column",gap:6}}>
      {[
        {l:"Invite a Friend 🎁",i:"🔗",a:()=>go("invite")},
        {l:"How It Works",i:"❓",a:()=>go("howitworks")},
        {l:"Terms & Fees",i:"📜",a:()=>go("terms")},
        {l:"Contact Support",i:"📩",a:()=>window.open("mailto:contact.showup.app@gmail.com?subject=Showup Support","_blank")},
        {l:"Report a Bug",i:"🐛",a:()=>go("bugreport")},
      ].map((item,i)=><button key={i} onClick={item.a} className="btn" style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",background:C.card,border:`2px solid ${C.border}`,borderBottom:`3px solid ${C.border}`,borderRadius:14,width:"100%"}}><span style={{fontSize:18}}>{item.i}</span><span style={{fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.ink,flex:1,textAlign:"left"}}>{item.l}</span><span style={{fontSize:14,color:C.faint}}>›</span></button>)}
      <button onClick={onLogout} className="btn" style={{display:"flex",alignItems:"center",padding:"14px 16px",background:C.redL,border:`2px solid ${C.red}30`,borderRadius:14,width:"100%",marginTop:6}}><span style={{fontFamily:"Nunito",fontWeight:800,fontSize:14,color:C.red,flex:1,textAlign:"left"}}>🚪 Log Out</span></button>
    </div>
  </Screen>;
}


/* ══════════════════════════════════════════════════════════
   INVITE A FRIEND
   ══════════════════════════════════════════════════════════ */
function InviteFriend({go, profile}){
  const [copied, setCopied] = useState(false);
  const code = profile?.referral_code || "";

  const copyCode = () => {
    navigator.clipboard?.writeText(code).then(()=>{
      setCopied(true);
      setTimeout(()=>setCopied(false), 2500);
    });
  };

  return <Screen><Styles/><StatusBar/><TopBar title="Refer a Friend" onBack={()=>go("profile")}/>
    <div style={{padding:"24px 20px",display:"flex",flexDirection:"column",gap:16}}>
      <div style={{textAlign:"center",paddingTop:8}}>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink}}>Your Referral Code</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:C.sub,marginTop:6}}>Give this code to a friend. When they sign up with it, you both get credited.</div>
      </div>

      <div style={{background:C.card,border:`2px solid ${C.border}`,borderRadius:18,padding:"24px 20px",textAlign:"center"}}>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:C.faint,letterSpacing:"2px",textTransform:"uppercase",marginBottom:10}}>Your Code</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:36,color:C.green,letterSpacing:6}}>{code||"—"}</div>
      </div>

      <Btn3D onClick={copyCode} full s={{fontSize:15,padding:"16px"}}>
        {copied?"✅ Copied!":"Copy Code"}
      </Btn3D>
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   BUG REPORT
   ══════════════════════════════════════════════════════════ */
function BugReport({go,userId,profile}){
  const [type,setType]=useState("bug");
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState("");

  const submit=async()=>{
    if(!title.trim()){setErr("Give it a short title.");return;}
    if(!desc.trim()){setErr("Describe the issue.");return;}
    setLoading(true);setErr("");
    try{
      const {error}=await supabase.from("bug_reports").insert({
        user_id:userId,
        user_name:profile?.name||"Unknown",
        type,
        title:title.trim(),
        description:desc.trim(),
        app_version:"1.0",
        status:"open",
      });
      if(error) throw error;
      setDone(true);
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  if(done) return <Screen><Styles/><StatusBar/><TopBar title="Report Sent" onBack={()=>go("profile")}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
      <div style={{fontSize:64}}>🙏</div>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink,textAlign:"center"}}>Thanks for reporting!</div>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,textAlign:"center"}}>We'll look into it. If it's urgent, email us at contact.showup.app@gmail.com</div>
      <Btn3D onClick={()=>go("profile")} full>BACK</Btn3D>
    </div>
  </Screen>;

  const types=[{v:"bug",l:"🐛 Bug",d:"Something is broken"},{v:"ui",l:"🎨 UI Issue",d:"Looks wrong"},{v:"payment",l:"💰 Payment Issue",d:"Money problem"},{v:"other",l:"💬 Other",d:"General feedback"}];

  return <Screen><Styles/><StatusBar/><TopBar title="Report a Bug" onBack={()=>go("profile")}/>
    <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.sub}}>Help us fix issues faster by describing what happened.</div>

      {/* Type selector */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {types.map(t=><button key={t.v} onClick={()=>setType(t.v)} className="btn" style={{flex:"1 1 calc(50% - 4px)",background:type===t.v?C.blueL:C.card,border:`2px solid ${type===t.v?C.blue:C.border}`,borderRadius:12,padding:"10px 8px",textAlign:"left"}}>
          <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:type===t.v?C.blue:C.ink}}>{t.l}</div>
          <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:10,color:C.faint,marginTop:2}}>{t.d}</div>
        </button>)}
      </div>

      <div>
        <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.sub,marginBottom:6,letterSpacing:1}}>TITLE</div>
        <Input value={title} onChange={setTitle} placeholder="Short description e.g. 'Check-in button not working'" icon="✏️"/>
      </div>

      <div>
        <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:12,color:C.sub,marginBottom:6,letterSpacing:1}}>DETAILS</div>
        <div style={{background:C.surf,border:`2px solid ${C.border}`,borderBottom:`4px solid ${C.border}`,borderRadius:16,padding:"13px 16px"}}>
          <textarea
            value={desc}
            onChange={e=>setDesc(e.target.value)}
            placeholder="What happened? What did you expect? Which screen were you on?"
            style={{width:"100%",minHeight:100,border:"none",background:"none",fontFamily:"Nunito",fontWeight:700,fontSize:14,color:C.ink,resize:"none",outline:"none"}}
          />
        </div>
      </div>

      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}

      <Btn3D onClick={submit} disabled={loading||!title||!desc} full s={{marginTop:4}}>
        {loading?"SUBMITTING...":"🐛 SUBMIT REPORT"}
      </Btn3D>

      <div style={{textAlign:"center"}}>
        <span style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint}}>Or email us: </span>
        <span onClick={()=>window.open("mailto:contact.showup.app@gmail.com","_blank")} style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.blue,cursor:"pointer"}}>contact.showup.app@gmail.com</span>
      </div>
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   SIMPLE SCREENS
   ══════════════════════════════════════════════════════════ */
function Notifications({go,userId}){
  const [notifs,setNotifs]=useState([]);
  useEffect(()=>{(async()=>{
    const {data}=await supabase.from("notifications").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(30);
    setNotifs(data||[]);
    // Mark all as read
    await supabase.from("notifications").update({read:true}).eq("user_id",userId).eq("read",false);
  })();},[userId]);

  const iconFor=(type)=>({
    miss:"❌",forfeit:"💀",challenge_start:"🚀",challenge_end:"🏁",
    payout_ready:"💸",admin_message:"📣",opponent_missed:"⚡",opponent_forfeited:"🏆",like:"❤️",weekly_rank:"👑"
  }[type]||"🔔");

  return <Screen><Styles/><StatusBar/><TopBar title="Notifications" onBack={()=>go("home")}/>
    <div style={{padding:"12px 20px",display:"flex",flexDirection:"column",gap:8}}>
      {notifs.length===0&&<Card><div style={{textAlign:"center",padding:20,fontFamily:"Nunito",fontWeight:700,color:C.sub}}>No notifications yet</div></Card>}
      {notifs.map(n=>{
        const isAdmin=n.type==="admin_message";
        return <Card key={n.id} style={isAdmin?{background:`${C.purple}10`,border:`2px solid ${C.purple}30`}:{}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{iconFor(n.type)}</span>
            <div style={{flex:1}}>
              <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:isAdmin?C.purple:C.ink}}>{n.title}</div>
              {n.body&&<div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub,marginTop:3}}>{n.body}</div>}
              <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:10,color:C.faint,marginTop:4}}>{new Date(n.created_at).toLocaleString()}</div>
            </div>
          </div>
        </Card>;
      })}
    </div>
  </Screen>;
}

function HabitsScreen({go,challenges}){
  const [tab,setTab]=useState("active");
  const grouped={active:challenges.filter(c=>c.challenge?.status==="active"),completed:challenges.filter(c=>c.challenge?.status==="finished"&&!c.forfeited),failed:challenges.filter(c=>c.forfeited)};
  return <Screen><StatusBar/><TopBar title="Your Habits" right={<Btn3D onClick={()=>go("newhabit")} s={{padding:"8px 14px",fontSize:13,borderRadius:12}}>+ NEW</Btn3D>}/>
    <div style={{display:"flex",margin:"14px 20px 0",background:C.surf,borderRadius:14,padding:3,border:`2px solid ${C.border}`}}>{["active","completed","failed"].map(t=><button key={t} onClick={()=>setTab(t)} style={{flex:1,background:tab===t?C.card:"transparent",border:tab===t?`2px solid ${C.border}`:"2px solid transparent",borderRadius:11,padding:"9px 0",fontFamily:"Nunito",fontWeight:800,fontSize:12,color:tab===t?C.ink:C.faint,cursor:"pointer",textTransform:"uppercase"}}>{t}</button>)}</div>
    <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10}}>
      {(grouped[tab]||[]).length===0&&<Card><div style={{textAlign:"center",padding:20,fontFamily:"Nunito",fontWeight:700,color:C.sub}}>None yet</div></Card>}
      {(grouped[tab]||[]).map(cu=>{const ch=cu.challenge;if(!ch)return null;return <Card key={cu.id}><div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:15,color:C.ink,flex:1}}>{ch.habit_icon} {ch.habit_name}<div style={{fontFamily:"Nunito",fontWeight:700,fontSize:12,color:C.sub,marginTop:2}}>{ch.mode} · {CUR}{ch.stake} · {ch.days}d</div></div><Chip c={ch.status==="active"?C.green:ch.status==="finished"?C.blue:C.gold}>{ch.status}</Chip></div></Card>;})}
    </div>
  </Screen>;
}

function HowItWorks({go}){
  const steps=[
    {n:"01",t:"Pick a habit & stake",b:"Choose a habit you want to build. Set how many days and how much money you want to put on it. The stake is what keeps you accountable — it's real money.",i:"🎯",c:C.green},
    {n:"02",t:"Choose rest days (optional)",b:"Pick up to 2 rest days per week where you won't need to check in. Your streak and money are safe on rest days.",i:"😴",c:C.blue},
    {n:"03",t:"Pay via Razorpay",b:"Secure payment via Razorpay. Pay with any UPI app, card, or netbanking. Your stake is held until the challenge ends.",i:"💳",c:C.gold},
    {n:"04",t:"Check in every day",b:"Submit proof each day — a selfie, short video, or screenshot depending on the habit. Our team reviews and approves within a few hours.",i:"📸",c:C.blue},
    {n:"05",t:"Miss a day = lose money",b:"Each miss deducts stake÷days from your balance. Solo: 10% of losses go to your chosen charity. 1v1: 50% goes to your opponent. Miss too many in a row and you forfeit everything.",i:"💸",c:C.red},
    {n:"06",t:"Complete & get it back",b:"Finish all your days and your remaining balance is refunded to your UPI ID within 24 hours. A 2% payment gateway fee is deducted on refund.",i:"🏆",c:C.gold},
  ];
  const faqs=[
    {q:"What if I forget to check in?",a:"That day counts as a miss. The money is deducted automatically. Set a daily reminder to avoid this."},
    {q:"Can I cancel mid-challenge?",a:"No. Once a challenge starts there are no cancellations or refunds. This is by design — the commitment is the point."},
    {q:"How does 1v1 work?",a:"Both players stake the same amount. Create a challenge, share the invite code with your friend. They join and pay. Whoever completes more days wins more money."},
    {q:"When do I get my money back?",a:"Within 24 hours of your challenge completing. We send it to your UPI ID manually."},
    {q:"What counts as valid proof?",a:"A real photo or video of you doing the habit. Our team reviews all submissions. Fake or recycled photos result in account ban."},
  ];
  return <Screen><Styles/><StatusBar/><TopBar title="How It Works" onBack={()=>go("profile")}/>
    <div style={{padding:"14px 20px 30px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:18,color:C.ink,marginBottom:4}}>Simple. Real money. Real accountability.</div>
      {steps.map((s,i)=><Card key={i}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:46,height:46,borderRadius:14,background:`${s.c}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:`2px solid ${s.c}30`,flexShrink:0}}>{s.i}</div>
          <div><div style={{fontFamily:"Nunito",fontWeight:900,fontSize:10,color:s.c,letterSpacing:1.5}}>STEP {s.n}</div><div style={{fontFamily:"Nunito",fontWeight:800,fontSize:15,color:C.ink}}>{s.t}</div></div>
        </div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:C.sub,marginTop:10,lineHeight:1.5}}>{s.b}</div>
      </Card>)}
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:16,color:C.ink,marginTop:8,marginBottom:2}}>FAQs</div>
      {faqs.map((f,i)=><Card key={i}>
        <div style={{fontFamily:"Nunito",fontWeight:800,fontSize:13,color:C.ink,marginBottom:6}}>❓ {f.q}</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub,lineHeight:1.5}}>{f.a}</div>
      </Card>)}
    </div>
  </Screen>;
}

function Terms({go}){
  const sections=[
    {t:"How Money Works",i:"💰",items:[
      "Your stake is collected via Razorpay at challenge start.",
      "A 2% payment gateway fee is charged on all transactions — this is non-refundable.",
      "Miss a day = lose stake÷days from your remaining balance.",
      "Complete all days = your remaining balance (minus 2% fee) is refunded to your UPI ID.",
      "Refunds are processed manually within 24 hours of challenge completion.",
    ]},
    {t:"Solo Challenges",i:"🌱",items:[
      "10% of every rupee you lose goes to your chosen charity.",
      "The remaining 90% is kept by Showup as platform revenue.",
      "Charities are selected from our pre-approved list.",
    ]},
    {t:"1v1 Challenges",i:"⚔️",items:[
      "Both players stake the same amount.",
      "Every day your opponent misses, 50% of their daily stake goes to your earnings.",
      "Showup keeps the other 50% as platform fee.",
      "Both players must pay before the challenge starts.",
    ]},
    {t:"Forfeit Rule",i:"💀",items:[
      "Miss ⌈days÷3⌉ consecutive days = full forfeit of remaining stake.",
      "Example: 21-day challenge = forfeit after 7 consecutive misses.",
      "Rest days do not count as misses.",
      "No appeal process — the rule is enforced automatically.",
    ]},
    {t:"Rest Days",i:"😴",items:[
      "You may choose up to 2 rest days per week when creating a challenge.",
      "No check-in is required on rest days.",
      "Streak is preserved on rest days.",
      "Rest days cannot be changed after the challenge starts.",
    ]},
    {t:"Prohibited",i:"🚫",items:[
      "No refunds once a challenge is active.",
      "No cancellations mid-challenge.",
      "Submitting fake check-in photos is grounds for immediate account ban.",
      "One solo challenge per habit type at a time.",
    ]},
    {t:"Platform Fees",i:"📊",items:[
      "2% payment gateway fee on all transactions (non-refundable).",
      "1% platform fee is embedded in the miss penalty split.",
      "No subscription fees. No hidden charges.",
      "All fees are disclosed before payment.",
    ]},
    {t:"Liability",i:"⚖️",items:[
      "Showup is not responsible for network failures during check-in submission.",
      "Server time (IST) is the authoritative source for all time-based decisions.",
      "Showup reserves the right to suspend accounts for abuse.",
      "By using Showup you agree to these terms in full.",
    ]},
  ];
  return <Screen><Styles/><StatusBar/><TopBar title="Terms & Conditions" onBack={()=>go("profile")}/>
    <div style={{padding:"14px 20px 30px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.faint,textAlign:"center",marginBottom:4}}>Last updated: March 2026 · Clover / Showup</div>
      {sections.map((s,i)=><Card key={i}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:20}}>{s.i}</span>
          <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:15,color:C.ink}}>{s.t}</div>
        </div>
        {s.items.map((item,j)=><div key={j} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}>
          <span style={{color:C.green,fontWeight:900,fontSize:12,marginTop:1,flexShrink:0}}>•</span>
          <span style={{fontFamily:"Nunito",fontWeight:600,fontSize:12,color:C.sub,lineHeight:1.5}}>{item}</span>
        </div>)}
      </Card>)}
    </div>
  </Screen>;
}

/* ══════════════════════════════════════════════════════════
   APP ROOT
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   RESET PASSWORD — shown when user clicks email reset link
   ══════════════════════════════════════════════════════════ */
function ResetPassword({onDone}){
  const [pass,setPass]=useState("");
  const [confirm,setConfirm]=useState("");
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");
  const [done,setDone]=useState(false);

  const submit=async()=>{
    if(pass.length<6){setErr("Password must be at least 6 characters.");return;}
    if(pass!==confirm){setErr("Passwords don't match.");return;}
    setErr("");setLoading(true);
    try{
      const {error}=await supabase.auth.updateUser({password:pass});
      if(error) throw error;
      setDone(true);
      // Clear the hash from URL
      window.history.replaceState(null,"",window.location.pathname);
      setTimeout(()=>onDone(),2000);
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  if(done) return <div style={{flex:1,background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:24}}>
    <Styles/>
    <div style={{fontSize:64}}>✅</div>
    <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:C.ink}}>Password updated!</div>
    <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub}}>Redirecting to login...</div>
  </div>;

  return <div style={{flex:1,background:C.bg,display:"flex",flexDirection:"column"}}><Styles/><StatusBar/>
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"28px 24px",gap:20,justifyContent:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <Mascot size={44}/>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.green}}>Showup</div>
      </div>
      <div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:26,color:C.ink}}>Set new password</div>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:C.sub,marginTop:6}}>Choose a strong password</div>
      </div>
      <Input value={pass} onChange={setPass} placeholder="New password (min 6 chars)" type="password" icon="🔒"/>
      <Input value={confirm} onChange={setConfirm} placeholder="Confirm new password" type="password" icon="🔒"/>
      {err&&<div style={{background:C.redL,borderRadius:12,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:13,color:C.red}}>{err}</div>}
      <Btn3D onClick={submit} disabled={loading||!pass||!confirm} full>
        {loading?"UPDATING...":"SET NEW PASSWORD"}
      </Btn3D>
    </div>
  </div>;
}


/* ══════════════════════════════════════════════════════════
   STREAK FREEZE OFFER — 3 chances to save streak
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   STREAK BROKEN POPUP
   ══════════════════════════════════════════════════════════ */
function StreakBrokenOverlay({prevStreak,onDone,userId,go,profile}){
  const [freezesLeft,setFreezesLeft]=useState(null); // null=loading
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [err,setErr]=useState("");
  const MAX_FREE=2;

  useEffect(()=>{
    supabase.from("streak_freezes")
      .select("id").eq("user_id",userId).eq("type","free")
      .then(({data})=>{
        const used=(data||[]).length;
        setFreezesLeft(Math.max(0,MAX_FREE-used));
      });
  },[userId]);

  const useFreeze=async()=>{
    setSaving(true);setErr("");
    try{
      const {error:insertErr}=await supabase.from("streak_freezes")
        .insert({user_id:userId,type:"free",streak_saved:prevStreak});
      if(insertErr) throw new Error(insertErr.message);
      const {error:updateErr}=await supabase.rpc("restore_streak",{p_user_id:userId,p_streak:prevStreak});
      if(updateErr) throw new Error(updateErr.message);
      setSaved(true);
    }catch(e){setErr(e.message);}
    setSaving(false);
  };

  const wrap={
    position:"absolute",inset:0,zIndex:99,
    background:"rgba(8,6,18,.97)",
    display:"flex",flexDirection:"column",
    alignItems:"center",justifyContent:"center",
    padding:"32px 24px",gap:20
  };

  if(freezesLeft===null) return <div style={wrap}><Styles/><Loading/></div>;

  if(saved) return <div style={wrap}><Styles/>
    <div style={{width:64,height:64,borderRadius:20,background:"rgba(124,58,237,.15)",border:"1px solid rgba(124,58,237,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🧊</div>
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:"#fff",letterSpacing:"-.3px"}}>Streak Protected</div>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:"rgba(255,255,255,.4)",marginTop:6}}>Your {prevStreak}-day streak has been restored.</div>
    </div>
    <div style={{width:"100%",background:"rgba(255,200,0,.06)",border:"1px solid rgba(255,200,0,.15)",borderRadius:16,padding:"20px 24px",textAlign:"center"}}>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:48,color:C.gold,lineHeight:1,letterSpacing:"-2px"}}>{prevStreak}</div>
      <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:13,color:"rgba(255,200,0,.6)",marginTop:4,letterSpacing:".5px",textTransform:"uppercase"}}>Day Streak · Restored</div>
    </div>
    <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:"rgba(255,255,255,.3)",textAlign:"center"}}>
      {freezesLeft-1} freeze{freezesLeft-1===1?"":" s"} remaining after this
    </div>
    <Btn3D onClick={onDone} color={C.green} darkColor={C.greenD} full s={{padding:"15px",fontSize:15,letterSpacing:".3px"}}>
      CONTINUE
    </Btn3D>
  </div>;

  return <div style={wrap}><Styles/>
    {/* Icon */}
    <div style={{width:64,height:64,borderRadius:20,background:"rgba(255,75,75,.1)",border:"1px solid rgba(255,75,75,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
      {freezesLeft>0?"🔥":"💀"}
    </div>

    {/* Title */}
    <div style={{textAlign:"center"}}>
      <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:22,color:"#fff",letterSpacing:"-.3px"}}>
        {freezesLeft>0?"Streak at Risk":"Streak Lost"}
      </div>
      <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:14,color:"rgba(255,255,255,.4)",marginTop:6}}>
        You missed a check-in today.
      </div>
    </div>

    {/* Streak number */}
    <div style={{width:"100%",background:"rgba(255,200,0,.05)",border:"1px solid rgba(255,200,0,.12)",borderRadius:16,padding:"20px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:"1px",textTransform:"uppercase"}}>Current Streak</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:42,color:C.gold,lineHeight:1,letterSpacing:"-1px",marginTop:4}}>{prevStreak}<span style={{fontSize:16,fontWeight:700,marginLeft:4}}>days</span></div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontFamily:"Nunito",fontWeight:700,fontSize:11,color:"rgba(255,255,255,.3)",letterSpacing:"1px",textTransform:"uppercase"}}>Freezes Left</div>
        <div style={{fontFamily:"Nunito",fontWeight:900,fontSize:42,color:freezesLeft>0?C.green:"rgba(255,75,75,.6)",lineHeight:1,letterSpacing:"-1px",marginTop:4}}>{freezesLeft}<span style={{fontSize:16,fontWeight:700,marginLeft:4}}>/ {MAX_FREE}</span></div>
      </div>
    </div>

    {/* Action */}
    {freezesLeft>0
      ?<div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:"rgba(255,255,255,.4)",textAlign:"center",lineHeight:1.5}}>
          Use a freeze to protect your streak. You have {freezesLeft} free {freezesLeft===1?"freeze":"freezes"} remaining.
        </div>
        {err&&<div style={{background:"rgba(255,75,75,.08)",border:"1px solid rgba(255,75,75,.2)",borderRadius:10,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:12,color:"#FF4B4B"}}>{err}</div>}
        <Btn3D onClick={useFreeze} disabled={saving} color={C.green} darkColor={C.greenD} full s={{padding:"15px",fontSize:15,letterSpacing:".3px"}}>
          {saving?"SAVING...":"USE STREAK FREEZE"}
        </Btn3D>
        <button onClick={onDone} style={{background:"none",border:"none",fontFamily:"Nunito",fontWeight:600,fontSize:13,color:"rgba(255,255,255,.25)",cursor:"pointer",padding:"8px 0",textAlign:"center"}}>
          Let the streak reset
        </button>
      </div>
      :<div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontFamily:"Nunito",fontWeight:600,fontSize:13,color:"rgba(255,255,255,.4)",textAlign:"center",lineHeight:1.5}}>
          You have used all your free freezes. Your streak will reset to zero.
        </div>
        {err&&<div style={{background:"rgba(255,75,75,.08)",border:"1px solid rgba(255,75,75,.2)",borderRadius:10,padding:"10px 14px",fontFamily:"Nunito",fontWeight:700,fontSize:12,color:"#FF4B4B"}}>{err}</div>}
        <Btn3D onClick={onDone} color={C.red} darkColor={C.redD} full s={{padding:"15px",fontSize:15,letterSpacing:".3px"}}>
          ACCEPT &amp; CONTINUE
        </Btn3D>
      </div>}
  </div>;
}


export default function App(){
  const [session,setSession]=useState(null);const [loading,setLoading]=useState(true);
  const [screen,setScreen]=useState("home");const [profile,setProfile]=useState(null);const [challenges,setChallenges]=useState([]);
  const [resetMode,setResetMode]=useState(false);
  const [streakBroken,setStreakBroken]=useState(false);
  const [weeklyRank,setWeeklyRank]=useState(null); // {rank,grit,title,body}
  const prevStreakRef=useRef(0);

  useEffect(()=>{
    syncServerTime();

    // Always register auth state listener first
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      setSession(session);
      if(event==="PASSWORD_RECOVERY"){
        // Supabase fired recovery event — show reset screen
        setResetMode(true);
        setLoading(false);
      }
      if(event==="USER_UPDATED"){
        // Password was updated — exit reset mode, sign out, go to login
        setResetMode(false);
      }
      if(event==="SIGNED_IN"&&!window.location.hash.includes("type=recovery")){
        setLoading(false);
      }
    });

    // Check for recovery token in URL hash
    const hash=window.location.hash;
    if(hash.includes("type=recovery")){
      // Supabase will auto-process the hash and fire PASSWORD_RECOVERY event above
      // Just ensure we show loading until that fires
      setLoading(true);
    } else {
      supabase.auth.getSession().then(({data:{session}})=>{
        setSession(session);setLoading(false);
      });
    }

    return ()=>subscription.unsubscribe();
  },[]);

  const loadData=async()=>{
    if(!session?.user) return;
    const uid=session.user.id;
    const [{data:p},{data:c}]=await Promise.all([
      supabase.from("profiles").select("*").eq("id",uid).single(),
      supabase.from("challenge_users").select("*,challenge:challenges(*)").eq("user_id",uid).order("created_at",{ascending:false}),
    ]);
    setProfile(p);
    // Detect streak broken — also check localStorage for cross-session persistence
    const prevStored=parseInt(localStorage.getItem("showup_prev_streak")||"0");
    const currStreak=p?.current_streak||0;
    const lostStreak=prevStreakRef.current>0?prevStreakRef.current:prevStored;
    if(lostStreak>0&&currStreak===0){
      prevStreakRef.current=lostStreak;
      setStreakBroken(true);
      localStorage.removeItem("showup_prev_streak");
    } else {
      // Streak went from 0 → positive = new streak started, reset freeze options
      if(currStreak>=1&&prevStreakRef.current===0){
        supabase.from("streak_freezes").delete().eq("user_id",p.id).then(()=>{});
      }
      if(currStreak>0) localStorage.setItem("showup_prev_streak",String(currStreak));
      prevStreakRef.current=currStreak;
    }

    // Check for unread weekly rank notification
    const {data:rankNotif}=await supabase.from("notifications")
      .select("*").eq("user_id",uid).eq("type","weekly_rank").eq("read",false)
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(rankNotif){
      const rank=rankNotif.title.includes("#1")?1:rankNotif.title.includes("2nd")?2:3;
      setWeeklyRank({rank,title:rankNotif.title,body:rankNotif.body,id:rankNotif.id});
      // Mark as read
      await supabase.from("notifications").update({read:true}).eq("id",rankNotif.id);
    }
    const filtered=(c||[]).filter(x=>x.challenge);
    setChallenges(filtered);

    // ── Auto-expire: waiting challenges older than 7 days with no payment ──
    const _now=serverNow();
    const staleWaiting=filtered.filter(x=>
      x.challenge?.status==="waiting"&&
      (_now.getTime()-new Date(x.challenge.created_at).getTime())>7*864e5
    );
    if(staleWaiting.length){
      const staleIds=staleWaiting.map(x=>x.challenge.id);
      const payChecks=await Promise.all(staleIds.map(id=>
        supabase.from("payments").select("id",{count:"exact",head:true}).eq("challenge_id",id).eq("user_id",uid)
      ));
      const toExpire=staleIds.filter((_,i)=>(payChecks[i].count||0)===0);
      if(toExpire.length){
        await supabase.from("challenges").update({status:"expired"}).in("id",toExpire);
      }
    }

    // ── Auto-miss: check elapsed days with no checkin ──
    const now=_now;
    const todayMidnight=istMidnight(now); // IST midnight, not device-local
    const activeChs=filtered.filter(x=>x.challenge?.status==="active"&&x.challenge?.start_date);

    for(const cu of activeChs){
      const ch=cu.challenge;
      const startDate=istMidnight(new Date(ch.start_date));
      if(startDate>=todayMidnight) continue; // starts today or future — skip
      const daysElapsed=Math.floor((todayMidnight-startDate)/(864e5));
      if(daysElapsed<=0) continue;

      // Fetch all existing checkins for this challenge/user in one query
      const {data:existing}=await supabase.from("checkins")
        .select("day_number")
        .eq("challenge_id",ch.id).eq("user_id",uid)
        .lte("day_number",Math.min(daysElapsed,ch.days));

      const existingDays=new Set((existing||[]).map(x=>x.day_number));

      // Process all missing days in parallel
      const missingDays=[];
      for(let d=1;d<=Math.min(daysElapsed,ch.days);d++){
        if(!existingDays.has(d)) missingDays.push(d);
      }
      if(missingDays.length){
        // Insert placeholder checkins first to prevent re-processing
        await supabase.from("checkins").insert(
          missingDays.map(d=>({challenge_id:ch.id,user_id:uid,day_number:d,status:"rejected",photo_url:null}))
        );
        // Process misses sequentially (order matters for forfeit calculation)
        for(const d of missingDays){
          await supabase.rpc("process_miss",{p_challenge_id:ch.id,p_user_id:uid});
        }
      }
    }
  };

  useEffect(()=>{if(session){loadData();registerPush(session.user.id);}},[session]);

  const go=(s)=>setScreen(s);
  const logout=async()=>{await supabase.auth.signOut();setSession(null);setProfile(null);setScreen("home");};

  if(loading) return <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:"#0A1014"}}><Styles/><Loading/></div>;

  // Password reset flow — user arrived via email link
  if(resetMode) return <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100dvh",background:"#0A1014"}}><Styles/>
    <div className="app-shell" style={{width:390,height:"100%",minHeight:560,borderRadius:44,overflow:"hidden",background:C.bg,display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.5)"}}>
      <ResetPassword onDone={()=>{setResetMode(false);supabase.auth.signOut();}}/>
    </div>
  </div>;

  const [screenName,...params]=screen.split(":");
  const mainScreens=["home","habits","wall","leaderboard","profile"];
  const isMain=mainScreens.includes(screenName);

  if(!session) return <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100dvh",background:"#0A1014"}}><Styles/><style>{`@media(max-width:430px){.app-shell{width:100vw!important;height:100dvh!important;border-radius:0!important;box-shadow:none!important}}`}</style>
    <div className="app-shell" style={{width:390,height:"100%",minHeight:700,maxHeight:844,borderRadius:44,overflow:"hidden",background:C.bg,display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.5)"}}>
      <Auth onAuth={()=>supabase.auth.getSession().then(({data:{session}})=>setSession(session))}/>
    </div></div>;

  const userId=session.user.id;

  return <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100dvh",background:"#0A1014"}}><Styles/><style>{`@media(max-width:430px){.app-shell{width:100vw!important;height:100dvh!important;border-radius:0!important;box-shadow:none!important}}`}</style>
    <div className="app-shell" style={{width:390,height:844,borderRadius:44,overflow:"hidden",background:C.bg,display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,.5)",position:"relative"}}>
      {/* Weekly rank popup */}
      {weeklyRank&&<WeeklyRankPopup rank={weeklyRank.rank} title={weeklyRank.title} body={weeklyRank.body} onDone={()=>setWeeklyRank(null)}/>}
      {/* Streak broken overlay */}
      {streakBroken&&<StreakBrokenOverlay prevStreak={prevStreakRef.current||1} onDone={()=>setStreakBroken(false)} userId={userId} go={go} profile={profile}/>}
      {isMain&&<>
        {screenName==="home"&&<Home go={go} profile={profile} challenges={challenges} userId={userId}/>}
        {screenName==="habits"&&<HabitsScreen go={go} challenges={challenges}/>}
        {screenName==="wall"&&<Wall userId={userId}/>}
        {screenName==="leaderboard"&&<Leaderboard/>}
        {screenName==="profile"&&<Profile go={go} profile={profile} onLogout={logout} onRefresh={loadData} challenges={challenges}/>}
        <BottomNav active={screenName} go={go}/>
      </>}
      {screenName==="newhabit"&&<NewHabit go={go} userId={userId} refresh={loadData} withdrawableBalance={parseFloat(params[0]||0)}/>}
      {screenName==="join"&&<Join go={go} userId={userId} refresh={loadData}/>}
      {screenName==="summary"&&<ChallengeSummary go={go} challengeId={params[0]} amount={params[1]} startPref={params[2]}/>}
      {screenName==="payment"&&<Payment go={go} challengeId={params[0]} amount={params[1]} userId={userId} refresh={loadData}/>}
      {screenName==="checkin"&&<CheckInGate go={go} challengeId={params[0]} userId={userId} refresh={loadData} profile={profile} challenges={challenges}/>}
      {screenName==="notifications"&&<Notifications go={go} userId={userId}/>}
      {screenName==="howitworks"&&<HowItWorks go={go}/>}
      {screenName==="invite"&&<InviteFriend go={go} profile={profile}/>}
      {screenName==="terms"&&<Terms go={go}/>}
      {screenName==="bugreport"&&<BugReport go={go} userId={userId} profile={profile}/>}
    </div>
  </div>;
}