import React from "react";
import "./styles.css";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COLORS = ["red","blue","green","yellow"];
const THEME = {
  red:    { bg:"#d62828", glow:"#ff6b6b", dark:"#7d0000", text:"#fff" },
  blue:   { bg:"#1d7bc7", glow:"#4facfe", dark:"#0a4080", text:"#fff" },
  green:  { bg:"#2d9e5f", glow:"#43e97b", dark:"#1a5c38", text:"#fff" },
  yellow: { bg:"#f4b942", glow:"#ffe566", dark:"#9a6f00", text:"#1a1a1a" },
  wild:   { bg:"#16213e", glow:"#c77dff", dark:"#0d0d1a", text:"#fff" },
};
const AI_PROFILES = [
  { id:0, name:"Blaze", avatar:"🔥", personality:"aggressive", color:"#e63946" },
  { id:1, name:"Chill", avatar:"❄️", personality:"passive",    color:"#4facfe" },
  { id:2, name:"Trix",  avatar:"🎭", personality:"trickster",  color:"#f4b942" },
];
const QUIPS = {
  aggressive: ["GOTCHA! 😈","Draw 2, sucker!","No mercy!","Too easy 😤","You're done!"],
  passive:    ["Your turn…","Hmm, okay.","Fine.","Steady…","Calm 😌"],
  trickster:  ["Surprise! 🎭","Didn't see that?","Wild card!","Chaos! 🌀","Bwahahaha!"],
};
const CARD_LABELS = { Skip:"⊘", Reverse:"↺", Draw2:"+2", Wild:"★", WildDraw4:"★4" };

// ─── PWA DETECTION ────────────────────────────────────────────────────────────
function isRunningAsPWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// ─── DECK ─────────────────────────────────────────────────────────────────────
function buildDeck() {
  let id = 0, cards = [];
  COLORS.forEach(c => {
    ["0","1","1","2","2","3","3","4","4","5","5","6","6","7","7","8","8","9","9"]
      .forEach(v => cards.push({ id:id++, color:c, type:"number", value:v }));
    ["Skip","Reverse","Draw2"].forEach(t => {
      cards.push({ id:id++, color:c, type:t, value:t==="Draw2"?"+2":t[0] });
      cards.push({ id:id++, color:c, type:t, value:t==="Draw2"?"+2":t[0] });
    });
  });
  for(let i=0;i<4;i++) {
    cards.push({ id:id++, color:"wild", type:"Wild",     value:"W" });
    cards.push({ id:id++, color:"wild", type:"WildDraw4", value:"W4" });
  }
  return shuffle(cards);
}
function shuffle(arr) {
  let a=[...arr];
  for(let i=a.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function dealGame(numAI) {
  let deck = buildDeck();
  const player = deck.splice(0,7);
  const aiHands = {};
  for(let i=0;i<numAI;i++) aiHands["ai"+i] = deck.splice(0,7);
  let top;
  do { top = deck.splice(0,1)[0]; } while(top.color==="wild");
  return { player, aiHands, deck, top };
}
function canPlay(card, top, color) {
  return card.color==="wild" || card.color===color ||
    (card.type===top.type && card.type!=="number") ||
    (card.type==="number" && top.type==="number" && card.value===top.value);
}
function aiPick(hand, top, color, personality) {
  const playable = hand.filter(c => canPlay(c, top, color));
  if(!playable.length) return null;
  if(personality==="aggressive") {
    const power = playable.filter(c=>["Draw2","WildDraw4","Skip"].includes(c.type));
    if(power.length) return power[Math.floor(Math.random()*power.length)];
  }
  if(personality==="trickster") return playable[Math.floor(Math.random()*playable.length)];
  const nums = playable.filter(c=>c.type==="number");
  return nums.length ? nums[Math.floor(Math.random()*nums.length)] : playable[0];
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function loadStats() {
  try { const s=JSON.parse(localStorage.getItem("crStats")||"{}"); return {wins:s.wins||0,losses:s.losses||0,streak:s.streak||0}; }
  catch { return {wins:0,losses:0,streak:0}; }
}
function saveStats(s) { try { localStorage.setItem("crStats",JSON.stringify(s)); } catch {} }

// ─── CARD COMPONENT ───────────────────────────────────────────────────────────
function Card({ card, faceDown=false, small=false, selected=false, playable=false, onClick, rotate=0, overrideW, overrideH }) {
  const th = faceDown ? THEME.wild : (THEME[card?.color] || THEME.wild);
  const W = overrideW ?? (small ? 38 : 66);
  const H = overrideH ?? (small ? 54 : 94);
  const R = Math.max(4, Math.round(W * 0.15));
  const label = faceDown ? "?" : (CARD_LABELS[card?.type] || card?.value);
  const isSmallCard = W < 50;
  const fs = isSmallCard ? Math.max(6, Math.round(W*0.14)) : 12;
  const fsb = isSmallCard ? Math.max(10, Math.round(W*0.28)) : 24;
  let transform = rotate ? "rotate("+rotate+"deg)" : "";
  if(selected) transform += " translateY(-18px) scale(1.1)";
  else if(playable) transform += " translateY(-5px)";
  return (
    <div onClick={onClick} style={{
      width:W,height:H,borderRadius:R,flexShrink:0,userSelect:"none",
      background: faceDown
        ? "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#1a1a3e 100%)"
        : "linear-gradient(145deg,"+th.bg+","+th.dark,
      border: selected?"3px solid #fff":playable?"2px solid "+th.glow:"2px solid rgba(255,255,255,0.13)",
      boxShadow: selected
        ? "0 0 28px "+th.glow+",0 10px 30px rgba(0,0,0,0.7)"
        : playable ? "0 0 14px "+th.glow+"70,0 4px 16px rgba(0,0,0,0.5)"
        : "0 4px 14px rgba(0,0,0,0.5)",
      cursor:onClick?"pointer":"default",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      position:"relative",overflow:"hidden",
      transform,transition:"all 0.2s cubic-bezier(.34,1.56,.64,1)",
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"45%",
        background:"linear-gradient(to bottom,rgba(255,255,255,0.18),transparent)",
        borderRadius:R+"px "+R+"px 0 0",pointerEvents:"none"}}/>
      {!faceDown&&<div style={{position:"absolute",width:"75%",height:"83%",
        border:"2px solid rgba(255,255,255,0.2)",borderRadius:"50%",transform:"rotate(-25deg)"}}/>}
      {!faceDown&&<>
        <span style={{position:"absolute",top:3,left:4,fontSize:fs,fontWeight:900,
          color:th.text,fontFamily:"'Orbitron',monospace",lineHeight:1,
          textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>{label}</span>
        <span style={{position:"absolute",bottom:3,right:4,fontSize:fs,fontWeight:900,
          color:th.text,fontFamily:"'Orbitron',monospace",lineHeight:1,
          transform:"rotate(180deg)",textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>{label}</span>
      </>}
      <span style={{fontSize:faceDown?fsb*1.3:fsb,fontWeight:900,zIndex:1,
        color:faceDown?"#c77dff":th.text,
        textShadow:"0 0 20px "+(faceDown?"#c77dff":th.glow),
        fontFamily:"'Orbitron',monospace"}}>{faceDown?"?":label}</span>
    </div>
  );
}

// ─── COLOR PICKER ─────────────────────────────────────────────────────────────
function ColorPicker({ onPick }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",
      backdropFilter:"blur(12px)",display:"flex",alignItems:"center",
      justifyContent:"center",zIndex:300}}>
      <div style={{background:"#12112a",borderRadius:24,padding:36,
        border:"2px solid rgba(199,125,255,0.5)",
        boxShadow:"0 0 60px rgba(199,125,255,0.3)",textAlign:"center"}}>
        <p style={{color:"#c77dff",fontSize:18,fontWeight:700,
          fontFamily:"'Orbitron',monospace",margin:"0 0 24px",letterSpacing:3}}>
          PICK A COLOR
        </p>
        <div style={{display:"flex",gap:14}}>
          {COLORS.map(c=>(
            <div key={c} onClick={()=>onPick(c)} style={{
              width:60,height:60,borderRadius:14,cursor:"pointer",
              background:"linear-gradient(135deg,"+THEME[c].bg+","+THEME[c].dark+")",
              boxShadow:"0 0 20px "+THEME[c].glow+"60",
              border:"2px solid rgba(255,255,255,0.2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:26,transition:"transform 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.18)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {c==="red"?"🔴":c==="blue"?"🔵":c==="green"?"🟢":"🟡"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── AI PANEL ─────────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:2,marginLeft:4}}>
      {[0,1,2].map(i=>(
        <span key={i} style={{
          width:4,height:4,borderRadius:"50%",
          background:"#c77dff",display:"inline-block",
          animation:"thinkingDot 1.2s ease-in-out "+(i*0.2)+"s infinite",
        }}/>
      ))}
    </span>
  );
}

function AiPanel({ info, cards, isActive, quip, layout }) {
  if(!info) return null;
  const count = cards.length;
  const isH = layout==="top";
  const isL = layout==="left";
  return (
    <div style={{
      display:"flex",flexDirection:"column",alignItems:"center",gap:5,position:"relative",
      transition:"opacity 0.4s, transform 0.3s",
      opacity: isActive ? 1 : 0.42,
      transform: isActive ? "scale(1.0)" : "scale(0.94)",
      filter: isActive ? "none" : "grayscale(40%)",
    }}>
      {quip&&(
        <div style={{
          position:"absolute",zIndex:100,
          background:"rgba(20,18,50,0.97)",
          border:"1px solid rgba(199,125,255,0.5)",
          borderRadius:12,padding:"6px 13px",
          color:"#fff",fontSize:10,fontFamily:"'Orbitron',monospace",
          whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.7)",
          animation: isH ? "quipTop 1.8s ease-out forwards" : "quipSide 1.8s ease-out forwards",
          top:isH?"-36px":"auto",
          left:isH?"50%":isL?"108%":"auto",
          right:!isH&&!isL?"108%":"auto",
          transform:isH?"translateX(-50%)":"none",
          pointerEvents:"none",
        }}>{quip}</div>
      )}
      <div style={{
        display:"flex",alignItems:"center",gap:6,
        background:isActive?"rgba(199,125,255,0.22)":"rgba(255,255,255,0.04)",
        borderRadius:9,padding:"4px 10px",
        border:isActive?"1px solid rgba(199,125,255,0.8)":"1px solid rgba(255,255,255,0.08)",
        boxShadow:isActive?"0 0 18px rgba(199,125,255,0.6), 0 0 40px rgba(199,125,255,0.2)":"none",
        animation:isActive?"aiTurnGlow 1.4s ease-in-out infinite":"none",
        transition:"all 0.35s",
      }}>
        <span style={{
          fontSize:14,display:"inline-block",
          animation: isActive
            ? "aiActivePop 0.6s ease-in-out infinite"
            : info.personality==="aggressive"
            ? "blazeTell 1.4s ease-in-out infinite"
            : info.personality==="passive"
            ? "chillTell 2.8s ease-in-out infinite"
            : "trixTell 1.1s ease-in-out infinite",
        }}>{info.avatar}</span>
        <span style={{
          fontSize:8,letterSpacing:1,fontFamily:"'Orbitron',monospace",
          whiteSpace:"nowrap",display:"flex",alignItems:"center",
          color:isActive?"#e0aaff":"rgba(255,255,255,0.3)",
          fontWeight:isActive?900:400,
          transition:"color 0.3s",
        }}>
          {info.name} · {count}
          {isActive&&<ThinkingDots/>}
        </span>
        {count===1&&<span style={{fontSize:9}}>🚨</span>}
      </div>
      <div style={{
        display:"flex",flexDirection:isH?"row":"column",
        gap:isH?(count>9?2:4):(count>9?2:3),
        flexWrap:"nowrap",
        maxWidth:isH?"58vw":"none",
        maxHeight:!isH?"52vh":"none",
        overflow:"hidden",alignItems:"center",justifyContent:"center",
      }}>
        {cards.slice(0,isH?14:10).map(c=>(
          <Card key={c.id} card={c} faceDown small rotate={!isH?90:0}/>
        ))}
        {count>(isH?14:10)&&(
          <div style={{fontSize:8,color:"rgba(255,255,255,0.3)",
            fontFamily:"'Orbitron',monospace",letterSpacing:1}}>
            +{count-(isH?14:10)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GAME SCREEN ──────────────────────────────────────────────────────────────
function GameScreen({ numAI,aiPlayers,onGameOver,
  playerHand,setPlayerHand,aiHandsState,setAiHandsState,
  deckState,setDeckState,topState,setTopState,
  currentColor,setCurrentColor,currentTurn,setCurrentTurn,
  direction,setDirection }) {

  const [selected,setSelected]=useState(null);
  const [showColorPicker,setShowColorPicker]=useState(false);
  const [pendingWild,setPendingWild]=useState(null);
  const [quipText,setQuipText]=useState(null);
  const [quipOwner,setQuipOwner]=useState(null);
  const [flyCard,setFlyCard]=useState(null);
  const [drawBounce,setDrawBounce]=useState(false);
  const [turnKey,setTurnKey]=useState(0);
  const [dealPhase,setDealPhase]=useState(true);
  const [slamRipple,setSlamRipple]=useState(false);
  const [drawPanic,setDrawPanic]=useState(false);
  const [colorBurst,setColorBurst]=useState(null); // color string when wild picked
  const [handMagnetX,setHandMagnetX]=useState(0); // mouse x for magnetic hover
  const [isPortrait,setIsPortrait]=useState(()=>
    typeof window!=="undefined"&&window.matchMedia("(orientation:portrait)").matches
  );
  const [windowWidth,setWindowWidth]=useState(()=>
    typeof window!=="undefined"?window.innerWidth:400
  );
  const aiLock=useRef(false);

  // ── Deal animation: show staggered entry for 1.4s then clear ─────────────
  useEffect(()=>{
    setDealPhase(true);
    const t=setTimeout(()=>setDealPhase(false),1600);
    return()=>clearTimeout(t);
  },[]);

  // ── Magnetic hand: track mouse X across lower panel ──────────────────────
  useEffect(()=>{
    const h=e=>setHandMagnetX(e.clientX/window.innerWidth);
    window.addEventListener("mousemove",h,{passive:true});
    return()=>window.removeEventListener("mousemove",h);
  },[]);

  // ── Landscape lock (game only) ──────────────────────────────────────────────
  // ── Portrait detection for responsive layout ──────────────────────────────
  useEffect(()=>{
    const mql=window.matchMedia("(orientation:portrait)");
    const handler=e=>setIsPortrait(e.matches);
    mql.addEventListener("change",handler);
    setIsPortrait(mql.matches);
    const handleResize=()=>setWindowWidth(window.innerWidth);
    window.addEventListener("resize",handleResize,{passive:true});
    return()=>{
      mql.removeEventListener("change",handler);
      window.removeEventListener("resize",handleResize);
    };
  },[]);
  const playable=playerHand.filter(c=>canPlay(c,topState,currentColor));

  const turnOrder=useCallback(()=>["player",...Array.from({length:numAI},(_,i)=>"ai"+i)],[numAI]);

  const nextTurn=useCallback((from,skip=false)=>{
    const order=turnOrder();
    const idx=order.indexOf(from);
    const step=skip?(direction>0?2:order.length-2):(direction>0?1:order.length-1);
    const next=order[(idx+step)%order.length];
    setCurrentTurn(next);
    // Always bump turnKey so the AI effect re-fires even if currentTurn value
    // doesn't change (e.g. AI skips back to itself in a 2-player game)
    setTurnKey(k=>k+1);
  },[turnOrder,direction,setCurrentTurn]);

  useEffect(()=>{
    if(currentTurn==="player"||aiLock.current) return;
    aiLock.current=true;
    const turn=currentTurn;
    const idx=parseInt(turn[2]);
    const ai=aiPlayers[idx];
    if(!ai){aiLock.current=false;return;}
    const hand=aiHandsState[turn];
    if(!hand){aiLock.current=false;return;}
    const delay=800+Math.random()*600;
    setTimeout(()=>{
      const pick=aiPick(hand,topState,currentColor,ai.personality);
      if(pick){
        const newHand=hand.filter(c=>c.id!==pick.id);
        setAiHandsState(h=>({...h,[turn]:newHand}));
        setFlyCard(pick);
        setTimeout(()=>setFlyCard(null),400);
        if(newHand.length===0){
          setTopState(pick);setCurrentColor(pick.color==="wild"?currentColor:pick.color);
          setTimeout(()=>onGameOver(turn),300);
          aiLock.current=false;return;
        }
        const q=QUIPS[ai.personality];
        setQuipText(q[Math.floor(Math.random()*q.length)]);
        setQuipOwner(idx);
        setTimeout(()=>{setQuipText(null);setQuipOwner(null);},1900);
        let newColor=pick.color==="wild"?currentColor:pick.color;
        if(pick.color==="wild"){
          const freq={};
          newHand.forEach(c=>{if(c.color!=="wild")freq[c.color]=(freq[c.color]||0)+1;});
          const best=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
          newColor=best?best[0]:"red";
        }
        const order=turnOrder();
        const nxtIdx=(order.indexOf(turn)+(direction>0?1:order.length-1))%order.length;
        const nxt=order[nxtIdx];
        if(pick.type==="WildDraw4"){
          setDeckState(d=>{const nd=[...d];const drawn=[];for(let i=0;i<4;i++){if(nd.length)drawn.push(nd.pop());}
            if(nxt==="player"){setPlayerHand(p=>[...p,...drawn]);setDrawPanic(true);setTimeout(()=>setDrawPanic(false),700);}
            else setAiHandsState(h=>({...h,[nxt]:[...(h[nxt]||[]),...drawn]}));
            return nd;});
          setTopState(pick);setCurrentColor(newColor);nextTurn(turn,true);
        }else if(pick.type==="Draw2"){
          setDeckState(d=>{const nd=[...d];const drawn=[];for(let i=0;i<2;i++){if(nd.length)drawn.push(nd.pop());}
            if(nxt==="player"){setPlayerHand(p=>[...p,...drawn]);setDrawPanic(true);setTimeout(()=>setDrawPanic(false),700);}
            else setAiHandsState(h=>({...h,[nxt]:[...(h[nxt]||[]),...drawn]}));
            return nd;});
          setTopState(pick);setCurrentColor(newColor);nextTurn(turn,true);
        }else if(pick.type==="Skip"){
          setTopState(pick);setCurrentColor(newColor);nextTurn(turn,true);
        }else if(pick.type==="Reverse"){
          setDirection(d=>d*-1);setTopState(pick);setCurrentColor(newColor);nextTurn(turn);
        }else{
          setTopState(pick);setCurrentColor(newColor);nextTurn(turn);
        }
      }else{
        setDeckState(d=>{const nd=[...d];const drawn=nd.pop();
          if(drawn)setAiHandsState(h=>({...h,[turn]:[...(h[turn]||[]),drawn]}));
          return nd;});
        nextTurn(turn);
      }
      aiLock.current=false;
    },delay);
  },[currentTurn,turnKey]);

  function selectCard(c){
    if(currentTurn!=="player"||!canPlay(c,topState,currentColor)) return;
    setSelected(s=>s?.id===c.id?null:c);
  }
  function playCard(){
    if(!selected||currentTurn!=="player") return;
    const newHand=playerHand.filter(c=>c.id!==selected.id);
    setPlayerHand(newHand);
    setFlyCard(selected);setTimeout(()=>setFlyCard(null),400);
    // slam ripple
    setSlamRipple(true);setTimeout(()=>setSlamRipple(false),500);
    if(newHand.length===0){
      setTopState(selected);setCurrentColor(selected.color==="wild"?currentColor:selected.color);
      setTimeout(()=>onGameOver("player"),300);setSelected(null);return;
    }
    if(selected.color==="wild"){setPendingWild(selected);setShowColorPicker(true);setSelected(null);return;}
    applyCardEffect(selected,selected.color);setSelected(null);
  }
  function applyCardEffect(card,newColor){
    setTopState(card);setCurrentColor(newColor);
    const order=turnOrder();
    const nxtIdx=(order.indexOf("player")+(direction>0?1:order.length-1))%order.length;
    const nxt=order[nxtIdx];
    if(card.type==="Draw2"){
      setDeckState(d=>{const nd=[...d];const drawn=[];for(let i=0;i<2;i++){if(nd.length)drawn.push(nd.pop());}
        if(nxt==="player")setPlayerHand(p=>[...p,...drawn]);
        else setAiHandsState(h=>({...h,[nxt]:[...(h[nxt]||[]),...drawn]}));
        return nd;});
      nextTurn("player",true);
    }else if(card.type==="Skip"){nextTurn("player",true);
    }else if(card.type==="Reverse"){setDirection(d=>d*-1);nextTurn("player");
    }else{nextTurn("player");}
  }
  function pickColor(c){
    setShowColorPicker(false);if(!pendingWild) return;
    // color explosion burst
    setColorBurst(c);setTimeout(()=>setColorBurst(null),800);
    const card=pendingWild;setPendingWild(null);
    setTopState(card);setCurrentColor(c);
    const order=turnOrder();
    const nxtIdx=(order.indexOf("player")+(direction>0?1:order.length-1))%order.length;
    const nxt=order[nxtIdx];
    if(card.type==="WildDraw4"){
      setDeckState(d=>{const nd=[...d];const drawn=[];for(let i=0;i<4;i++){if(nd.length)drawn.push(nd.pop());}
        if(nxt==="player")setPlayerHand(p=>[...p,...drawn]);
        else setAiHandsState(h=>({...h,[nxt]:[...(h[nxt]||[]),...drawn]}));
        return nd;});
      nextTurn("player",true);
    }else{nextTurn("player");}
  }
  function drawCard(){
    if(currentTurn!=="player"||playable.length>0) return;
    setDeckState(d=>{const nd=[...d];const card=nd.pop();
      if(card){setDrawBounce(true);setTimeout(()=>setDrawBounce(false),500);setPlayerHand(h=>[...h,card]);}
      return nd;});
    nextTurn("player");
  }

  const isMyTurn=currentTurn==="player";
  const colorGlow=THEME[currentColor]?.glow||"#c77dff";
  // In portrait: all AI panels stack at top. In landscape: use left/top/right.
  const panels=isPortrait?[
    {key:"ai0",info:aiPlayers[0],cards:aiHandsState.ai0||[],layout:"top",  isActive:currentTurn==="ai0",quip:quipOwner===0?quipText:null},
    {key:"ai1",info:aiPlayers[1],cards:aiHandsState.ai1||[],layout:"top",  isActive:currentTurn==="ai1",quip:quipOwner===1?quipText:null},
    {key:"ai2",info:aiPlayers[2],cards:aiHandsState.ai2||[],layout:"top",  isActive:currentTurn==="ai2",quip:quipOwner===2?quipText:null},
  ].slice(0,numAI):[
    {key:"ai0",info:aiPlayers[0],cards:aiHandsState.ai0||[],layout:"left", isActive:currentTurn==="ai0",quip:quipOwner===0?quipText:null},
    {key:"ai1",info:aiPlayers[1],cards:aiHandsState.ai1||[],layout:"top",  isActive:currentTurn==="ai1",quip:quipOwner===1?quipText:null},
    {key:"ai2",info:aiPlayers[2],cards:aiHandsState.ai2||[],layout:"right",isActive:currentTurn==="ai2",quip:quipOwner===2?quipText:null},
  ].slice(0,numAI);
  const topPanels=panels.filter(p=>p.layout==="top");
  const topPanel=topPanels[0]||null;
  const leftPanel=isPortrait?null:panels.find(p=>p.layout==="left");
  const rightPanel=isPortrait?null:panels.find(p=>p.layout==="right");

  return (
    <div style={{width:"100vw",height:"100vh",height:"100dvh",
      background:"linear-gradient(160deg,#07071a 0%,#0f0c29 40%,#131030 100%)",
      display:"flex",flexDirection:"column",fontFamily:"'Orbitron',monospace",
      overflow:"hidden",position:"relative"}}>

      {/* AI panels at top — in portrait shows all AIs stacked, in landscape shows only the "top" one */}
      {topPanels.length>0&&(
        <div style={{display:"flex",flexDirection:isPortrait?"row":"column",
          justifyContent:"center",flexWrap:"wrap",padding:"6px 4px 2px",
          background:"rgba(0,0,0,0.2)",gap:isPortrait?8:0}}>
          {topPanels.map(p=><AiPanel key={p.key} {...p}/>)}
        </div>
      )}

      <div style={{flex:1,display:"flex",alignItems:"stretch",minHeight:0}}>
        {leftPanel&&(
          <div style={{width:isPortrait?0:70,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,0.15)"}}>
            <AiPanel {...leftPanel}/>
          </div>
        )}

        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:isPortrait?6:10,position:"relative"}}>
          <div style={{fontSize:isPortrait?8:9,letterSpacing:3,textTransform:"uppercase",fontWeight:700,
            color:isMyTurn?"#43e97b":"rgba(199,125,255,0.7)"}}>
            {isMyTurn ? "⚡ YOUR TURN" : (aiPlayers[parseInt(currentTurn[2])]?.name || "AI") + " thinking..."}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:isPortrait?10:16}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{width:isPortrait?16:22,height:isPortrait?16:22,borderRadius:"50%",
                background:THEME[currentColor]?.bg||"#888",
                boxShadow:"0 0 18px "+colorGlow,border:"2px solid rgba(255,255,255,0.3)"}}/>
              <div style={{fontSize:isPortrait?6:7,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>
                {currentColor.toUpperCase()}
              </div>
            </div>
            <div style={{position:"relative"}}>
              <div style={{width:isPortrait?54:70,height:isPortrait?76:98,borderRadius:isPortrait?8:11,
                background:"rgba(255,255,255,0.04)",
                border:"2px solid "+colorGlow,
                animation:"pulseGlow 2s ease-in-out infinite",
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Card card={topState} overrideW={isPortrait?50:66} overrideH={isPortrait?70:94}/>
              </div>
              {/* slam ripple */}
              {slamRipple&&(
                <div style={{position:"absolute",inset:0,borderRadius:11,
                  border:"3px solid "+colorGlow,
                  animation:"slamRipple 0.5s ease-out forwards",
                  pointerEvents:"none",zIndex:10}}/>
              )}
              {/* color burst particles */}
              {colorBurst&&[...Array(10)].map((_,i)=>{
                const angle=(i/10)*360, dist=60+Math.random()*40;
                const bx=(Math.cos(angle*Math.PI/180)*dist)+"px";
                const by=(Math.sin(angle*Math.PI/180)*dist)+"px";
                return(
                  <div key={i} style={{
                    position:"absolute",top:"50%",left:"50%",
                    width:10,height:10,borderRadius:"50%",
                    background:THEME[colorBurst]?.glow||"#fff",
                    "--bx":bx,"--by":by,
                    animation:"colorBurstPart 0.7s ease-out "+(i*30)+"ms forwards",
                    pointerEvents:"none",zIndex:20,
                  }}/>
                );
              })}
              {flyCard&&(
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
                  justifyContent:"center",animation:"flyCard 0.4s ease-out forwards",pointerEvents:"none"}}>
                  <Card card={flyCard}/>
                </div>
              )}
            </div>
            <div onClick={drawCard} style={{
              width:isPortrait?54:70,height:isPortrait?76:98,borderRadius:isPortrait?8:11,
              background:"linear-gradient(135deg,#0f0c29,#302b63)",
              border:isMyTurn&&playable.length===0?"2px solid #43e97b":"2px solid rgba(255,255,255,0.15)",
              boxShadow:isMyTurn&&playable.length===0?"0 0 20px #43e97b88":"0 4px 16px rgba(0,0,0,0.6)",
              cursor:isMyTurn&&playable.length===0?"pointer":"default",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
              animation:drawBounce?"drawB 0.4s ease":"none",
              transition:"border 0.2s,box-shadow 0.2s",
            }}>
              <span style={{fontSize:isPortrait?16:22}}>🂠</span>
              <span style={{fontSize:isPortrait?7:9,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>{deckState.length}</span>
              {isMyTurn&&playable.length===0&&<span style={{fontSize:isPortrait?6:7,color:"#43e97b",letterSpacing:1}}>DRAW</span>}
            </div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span>{direction>0?"↻":"↺"}</span>
              <span style={{fontSize:7,letterSpacing:1,color:"rgba(255,255,255,0.2)"}}>DIR</span>
            </div>
          </div>
          {selected&&isMyTurn&&(
            <button onClick={playCard} style={{
              padding:"8px 30px",borderRadius:100,border:"none",
              background:"linear-gradient(90deg,#43e97b,#4facfe)",
              color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:900,
              fontSize:11,cursor:"pointer",letterSpacing:2,
              boxShadow:"0 0 24px rgba(67,233,123,0.5)"}}>
              ▶ PLAY CARD
            </button>
          )}
        </div>

        {rightPanel&&(
          <div style={{width:isPortrait?0:70,display:"flex",alignItems:"center",justifyContent:"center",
            background:"rgba(0,0,0,0.15)"}}>
            <AiPanel {...rightPanel}/>
          </div>
        )}
      </div>

      <div style={{
        background:isMyTurn?"linear-gradient(0deg,rgba(67,233,123,0.08),transparent)"
          :"linear-gradient(0deg,rgba(255,255,255,0.03),transparent)",
        borderTop:isMyTurn?"1px solid rgba(67,233,123,0.3)":"1px solid rgba(255,255,255,0.08)",
        padding:"8px 4px 14px",transition:"all 0.3s",
        animation:drawPanic?"drawPanicShake 0.7s ease-out":"none",
      }}>
        {playerHand.length===1&&(
          <div style={{textAlign:"center",fontSize:11,fontWeight:900,color:"#ff6b6b",
            letterSpacing:4,marginBottom:4,animation:"unoFlash 0.5s ease 3"}}>🚨 UNO!</div>
        )}
        <div style={{
          display:"flex",
          gap:Math.max(1, Math.min(5, Math.floor(40/Math.max(playerHand.length,1)))),
          padding:"4px 8px",
          justifyContent:"center",
          alignItems:"flex-end",
          flexWrap:"nowrap",
          width:"100%",
          boxSizing:"border-box",
          overflow:"hidden",
        }}>
          {playerHand.map((c,i)=>{
            // dynamic card scale: shrink to fit all cards in view
            const vw = windowWidth;
            const isMobile = vw < 480;
            // base card width depends on mobile or not
            const baseW = isMobile ? 44 : 66;
            const baseH = isMobile ? 62 : 94;
            // how many cards fit at full size (with min gap of 2px)
            const availW = vw - 16;
            const minGap = 2;
            const maxCards = playerHand.length;
            // scale factor so all cards fit: (scale*baseW + minGap) * n <= availW
            const scaleFit = Math.min(1, (availW - minGap*(maxCards-1)) / (baseW*maxCards));
            const cardW = Math.max(isMobile?28:38, Math.floor(baseW*scaleFit));
            const cardH = Math.floor(baseH*scaleFit);
            const isSmall = cardW < (isMobile?44:66);
            // magnetic lean: cards lean toward cursor position across the hand
            const cardFrac=playerHand.length>1?i/(playerHand.length-1):0.5;
            const diff=handMagnetX-cardFrac;
            const lean=dealPhase?0:Math.max(-12,Math.min(12,diff*22));
            return(
              <div key={c.id} style={{
                transform:dealPhase?undefined:"rotate("+lean+"deg)",
                transition:"transform 0.15s ease",
                "--dr":(-8+(i%5)*4)+"deg",
                animation:dealPhase?"dealIn 0.5s cubic-bezier(.34,1.4,.64,1) "+(i*70)+"ms both":"none",
                flexShrink:0,
              }}>
                <Card card={c}
                  onClick={()=>selectCard(c)}
                  selected={selected?.id===c.id}
                  playable={isMyTurn&&canPlay(c,topState,currentColor)&&selected?.id!==c.id}
                  small={isSmall}
                  overrideW={cardW} overrideH={cardH}/>
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",fontSize:8,color:"rgba(255,255,255,0.2)",
          letterSpacing:2,marginTop:4}}>
          YOU · {playerHand.length} CARDS {isMyTurn && playable.length > 0 ? "· " + playable.length + " PLAYABLE" : ""}
        </div>
      </div>
      {showColorPicker&&<ColorPicker onPick={pickColor}/>}

      {/* Portrait mode is now fully supported — no overlay needed */}
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen({ onDone }) {
  const [pct,setPct]=useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setPct(p=>{
      if(p>=100){clearInterval(t);setTimeout(onDone,280);return 100;}
      return p+3;
    }),40);
    return()=>clearInterval(t);
  },[onDone]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:999,
      background:"linear-gradient(135deg,#07071a,#0f0c29,#07071a)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",fontFamily:"'Orbitron',monospace"}}>
      <div style={{fontSize:68,marginBottom:14,
        filter:"drop-shadow(0 0 30px rgba(199,125,255,0.5))",
        animation:"splashPulse 1.2s ease-in-out infinite"}}>🃏</div>
      <h1 style={{fontSize:32,fontWeight:900,margin:"0 0 32px",
        background:"linear-gradient(90deg,#ff6b6b,#c77dff,#4facfe)",
        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:5}}>
        CARD RUSH
      </h1>
      <div style={{width:220,height:6,borderRadius:100,background:"rgba(255,255,255,0.1)",overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:100,width:pct+"%",
          background:"linear-gradient(90deg,#c77dff,#4facfe)",
          transition:"width 0.05s linear",boxShadow:"0 0 12px rgba(199,125,255,0.6)"}}/>
      </div>
      <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,letterSpacing:3,marginTop:16}}>
        {pct<30?"SHUFFLING DECK…":pct<60?"DEALING CARDS…":pct<90?"WAKING AIs…":"READY!"}
      </p>
    </div>
  );
}

// ─── INFO MODAL ───────────────────────────────────────────────────────────────
function InfoModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:500,
      background:"rgba(0,0,0,0.82)",backdropFilter:"blur(14px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:20,fontFamily:"'Orbitron',monospace",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%",maxWidth:380,
        background:"linear-gradient(145deg,#0e0c24,#13112e)",
        border:"1.5px solid rgba(199,125,255,0.35)",
        borderRadius:26,overflow:"hidden",
        boxShadow:"0 0 80px rgba(199,125,255,0.2),0 24px 60px rgba(0,0,0,0.8)",
        animation:"modalSlideUp 0.35s cubic-bezier(.34,1.4,.64,1)",
      }}>
        {/* header */}
        <div style={{
          background:"linear-gradient(90deg,rgba(199,125,255,0.12),rgba(79,172,254,0.08))",
          borderBottom:"1px solid rgba(255,255,255,0.07)",
          padding:"22px 22px 18px",
          display:"flex",alignItems:"center",gap:14,position:"relative",
        }}>
          <div style={{
            width:52,height:52,borderRadius:14,flexShrink:0,
            background:"linear-gradient(135deg,#1a1040,#0d0d1a)",
            border:"2px solid rgba(199,125,255,0.3)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,
            boxShadow:"0 0 20px rgba(199,125,255,0.3)",
          }}>🃏</div>
          <div>
            <div style={{
              fontSize:20,fontWeight:900,letterSpacing:3,
              background:"linear-gradient(90deg,#ff6b6b,#c77dff)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
            }}>CARD RUSH</div>
            <div style={{
              marginTop:4,display:"inline-block",
              background:"rgba(199,125,255,0.15)",
              border:"1px solid rgba(199,125,255,0.35)",
              borderRadius:100,padding:"2px 10px",
              fontSize:9,color:"rgba(199,125,255,0.9)",letterSpacing:2,
            }}>VERSION 1.0.0</div>
          </div>
          {/* close */}
          <button onClick={onClose} style={{
            position:"absolute",top:16,right:16,
            width:30,height:30,borderRadius:"50%",border:"none",
            background:"rgba(255,255,255,0.08)",cursor:"pointer",
            color:"rgba(255,255,255,0.5)",fontSize:14,
            display:"flex",alignItems:"center",justifyContent:"center",
            transition:"background 0.15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.08)"}>✕</button>
        </div>

        <div style={{padding:"18px 22px 22px",display:"flex",flexDirection:"column",gap:18}}>

          {/* developer section */}
          <div>
            <div style={{fontSize:9,letterSpacing:3,color:"rgba(199,125,255,0.6)",
              marginBottom:10,borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:6}}>
              DEVELOPER
            </div>
            {[
              ["CREATED BY", "Saikot Islam Abir", "#c77dff"],
              ["BUILD",      "2025 · Web PWA",    "rgba(255,255,255,0.7)"],
              ["PLATFORM",   "React · Vite",       "rgba(255,255,255,0.7)"],
            ].map(([label,val,color])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"5px 0"}}>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:2}}>{label}</span>
                <span style={{fontSize:11,fontWeight:700,color,letterSpacing:1}}>{val}</span>
              </div>
            ))}
          </div>

          {/* about section */}
          <div>
            <div style={{fontSize:9,letterSpacing:3,color:"rgba(199,125,255,0.6)",
              marginBottom:10,borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:6}}>
              ABOUT THE GAME
            </div>
            {[
              "Fast-paced UNO-style card game",
              "Up to 3 AI opponents",
              "3 AI personalities (Aggressive, Chill, Trickster)",
              "Wild, Skip, Reverse & Draw cards",
              "Installable as a PWA · Works offline",
              "Win/loss streak tracking",
            ].map(item=>(
              <div key={item} style={{display:"flex",gap:8,alignItems:"flex-start",
                padding:"4px 0"}}>
                <span style={{color:"#c77dff",fontSize:10,flexShrink:0,marginTop:1}}>›</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.5)",lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>

          {/* version info */}
          <div>
            <div style={{fontSize:9,letterSpacing:3,color:"rgba(199,125,255,0.6)",
              marginBottom:10,borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:6}}>
              VERSION INFO
            </div>
            {[
              ["VERSION", "1.0.0 Stable", "#43e97b"],
              ["ENGINE",  "React 19",     "rgba(255,255,255,0.7)"],
              ["LICENSE", "Personal Use", "rgba(255,255,255,0.7)"],
            ].map(([label,val,color])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"5px 0"}}>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:2}}>{label}</span>
                <span style={{fontSize:11,fontWeight:700,color,letterSpacing:1}}>{val}</span>
              </div>
            ))}
          </div>

          {/* footer */}
          <div style={{textAlign:"center",paddingTop:4,
            borderTop:"1px solid rgba(255,255,255,0.06)"}}>
            <p style={{fontSize:8,color:"rgba(255,255,255,0.2)",letterSpacing:2,margin:0}}>
              © 2025 SAIKOT ISLAM ABIR · ALL RIGHTS RESERVED
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME SCREEN (in-app) ────────────────────────────────────────────────────
function HomeScreen({ stats, numAI, setNumAI, onPlay }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div style={{
      minHeight:"100vh",minHeight:"100dvh",
      background:"linear-gradient(145deg,#07071a 0%,#110e2d 50%,#07071a 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",fontFamily:"'Orbitron',monospace",
      padding:24,position:"relative",overflow:"hidden",
    }}>

      {/* ⓘ info button — top left corner */}
      <button onClick={()=>setShowInfo(true)} style={{
        position:"absolute",top:16,left:16,zIndex:10,
        width:34,height:34,borderRadius:"50%",
        border:"1.5px solid rgba(199,125,255,0.45)",
        background:"rgba(199,125,255,0.1)",
        color:"#c77dff",fontSize:15,fontWeight:900,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
        fontFamily:"Georgia,serif",letterSpacing:0,
        boxShadow:"0 0 14px rgba(199,125,255,0.2)",
        transition:"background 0.2s,border-color 0.2s",
        animation:"iBtnPulse 2.5s ease-out 1.5s 2",
      }}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(199,125,255,0.22)";e.currentTarget.style.borderColor="#c77dff"}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(199,125,255,0.1)";e.currentTarget.style.borderColor="rgba(199,125,255,0.45)"}}>
        i
      </button>

      {showInfo && <InfoModal onClose={()=>setShowInfo(false)}/>}

      {[...Array(8)].map((_,i)=>(
        <div key={i} style={{
          position:"absolute",width:52,height:74,borderRadius:9,
          background:"linear-gradient(135deg,"+Object.values(THEME)[i%4].bg+","+Object.values(THEME)[i%4].dark+")",
          opacity:0.08,"--r":(-25+i*12)+"deg",
          left:(5+i*12)+"%",top:(5+Math.sin(i)*40)+"%",
          animation:"floatCard "+(3+i*0.4)+"s ease-in-out infinite",
          border:"2px solid rgba(255,255,255,0.1)",pointerEvents:"none",
        }}/>
      ))}

      <div style={{textAlign:"center",marginBottom:36,position:"relative",zIndex:1}}>
        <div style={{fontSize:60,marginBottom:8,filter:"drop-shadow(0 0 28px rgba(199,125,255,0.6))"}}>🃏</div>
        <h1 style={{
          fontSize:"clamp(36px,9vw,68px)",fontWeight:900,margin:0,letterSpacing:5,
          background:"linear-gradient(90deg,#ff6b6b,#c77dff,#4facfe,#43e97b,#ff6b6b)",
          backgroundSize:"300% 100%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 4s linear infinite",
        }}>CARD RUSH</h1>
        <p style={{color:"rgba(255,255,255,0.35)",fontSize:10,letterSpacing:4,marginTop:8}}>
          FAST-PACED · BEAT THE AI
        </p>
      </div>

      {/* stats row */}
      <div style={{display:"flex",gap:12,marginBottom:28,position:"relative",zIndex:1}}>
        {[["🏆","WINS",stats.wins],["💀","LOSSES",stats.losses],["🔥","STREAK",stats.streak]].map(([icon,label,val])=>(
          <div key={label} style={{background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,
            padding:"10px 18px",textAlign:"center"}}>
            <div style={{fontSize:20}}>{icon}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#c77dff",fontFamily:"'Orbitron',monospace"}}>{val}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.35)",letterSpacing:2}}>{label}</div>
          </div>
        ))}
      </div>

      {/* AI selector */}
      <div style={{marginBottom:28,textAlign:"center",position:"relative",zIndex:1}}>
        <p style={{color:"rgba(255,255,255,0.4)",fontSize:10,letterSpacing:3,marginBottom:12}}>OPPONENTS</p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {[1,2,3].map(n=>(
            <button key={n} onClick={()=>setNumAI(n)} style={{
              padding:"10px 22px",borderRadius:12,border:"2px solid",
              borderColor:numAI===n?"#c77dff":"rgba(255,255,255,0.15)",
              background:numAI===n?"rgba(199,125,255,0.2)":"transparent",
              color:numAI===n?"#c77dff":"rgba(255,255,255,0.45)",
              fontFamily:"'Orbitron',monospace",fontWeight:700,fontSize:12,
              cursor:"pointer",transition:"all 0.2s",
            }}>{n} {n===1?"AI":"AIs"}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:14,justifyContent:"center"}}>
          {AI_PROFILES.slice(0,numAI).map(a=>(
            <div key={a.id} style={{background:"rgba(255,255,255,0.04)",borderRadius:10,
              padding:"6px 12px",border:"1px solid rgba(255,255,255,0.1)",
              display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:14}}>{a.avatar}</span>
              <span style={{fontSize:8,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onPlay} style={{
        padding:"17px 56px",borderRadius:100,border:"none",
        background:"linear-gradient(90deg,#c77dff,#4facfe)",
        color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:900,
        fontSize:16,cursor:"pointer",letterSpacing:3,
        boxShadow:"0 0 44px rgba(199,125,255,0.5),0 8px 32px rgba(0,0,0,0.5)",
        transition:"transform 0.15s,box-shadow 0.15s",position:"relative",zIndex:1,
      }}
      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.05)";e.currentTarget.style.boxShadow="0 0 64px rgba(199,125,255,0.7)"}}
      onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 0 44px rgba(199,125,255,0.5),0 8px 32px rgba(0,0,0,0.5)"}}>
        ▶ PLAY NOW
      </button>
      <p style={{color:"rgba(255,255,255,0.18)",fontSize:9,marginTop:22,letterSpacing:2,zIndex:1}}>
        UNO-STYLE · WORKS OFFLINE
      </p>
    </div>
  );
}

// ─── END SCREEN ───────────────────────────────────────────────────────────────
function EndScreen({ winner, aiPlayers, stats, onPlayAgain, onHome }) {
  const win=winner==="player";
  const aiIdx=winner?.startsWith("ai")?parseInt(winner[2]):-1;
  const winnerName=win?"YOU WIN!":(aiPlayers[aiIdx]?.name||"AI")+" WINS";

  // Generate fountain cards (win) or wilting cards (lose) — 14 cards total
  const CARD_COLORS=["red","blue","green","yellow"];
  const cinematicCards=[...Array(14)].map((_,i)=>({
    id:i,
    color:CARD_COLORS[i%4],
    delay:i*60,
    // win: fan-out angle + upward arc; lose: droop down with gravity
    angle:win ? (i/13)*360 : -20+(i/13)*40,
    dist:win ? 110+Math.random()*80 : 0,
    xOff:win ? 0 : -80+(i/13)*160,
    yOff:win ? 0 : 80+i*18,
    rot:win ? -30+(i%7)*12 : -15+(i%5)*8,
  }));

  return (
    <div style={{minHeight:"100vh",minHeight:"100dvh",
      background:"linear-gradient(145deg,#07071a,#0f0c29,#07071a)",
      display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",fontFamily:"'Orbitron',monospace",padding:24,
      position:"relative",overflow:"hidden"}}>

      {/* ── Cinematic cards ── */}
      {cinematicCards.map(c=>{
        const th=THEME[c.color];
        if(win){
          const rad=c.angle*(Math.PI/180);
          const fx=(Math.cos(rad)*c.dist)+"px";
          const fy=(-Math.abs(Math.sin(rad)*c.dist)-60)+"px";
          return(
            <div key={c.id} style={{
              position:"absolute",top:"38%",left:"50%",
              width:44,height:62,borderRadius:8,flexShrink:0,
              background:"linear-gradient(145deg,"+th.bg+","+th.dark,
              border:"2px solid "+th.glow,
              boxShadow:"0 0 14px "+th.glow+"80",
              "--fx":fx,"--fy":fy,"--fr":c.rot+"deg",
              animation:"fountainCard 1.1s cubic-bezier(.22,.61,.36,1) "+c.delay+"ms both",
              pointerEvents:"none",zIndex:0,
            }}/>
          );
        } else {
          return(
            <div key={c.id} style={{
              position:"absolute",top:"32%",left:"50%",
              width:44,height:62,borderRadius:8,flexShrink:0,
              background:"linear-gradient(145deg,"+th.bg+","+th.dark,
              border:"2px solid rgba(255,255,255,0.1)",
              opacity:0.7,
              "--wx":c.xOff+"px","--wy":c.yOff+"px","--wr":c.rot+"deg",
              animation:"wiltCard 1.4s cubic-bezier(.55,.06,.68,.19) "+c.delay+"ms both",
              pointerEvents:"none",zIndex:0,
            }}/>
          );
        }
      })}

      {/* ── Main content ── */}
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",
        alignItems:"center",gap:0}}>
        <div style={{fontSize:76,marginBottom:16,
          animation:win?"trophyBounce 0.7s cubic-bezier(.34,1.56,.64,1) 0.2s both"
                       :"skullDroop 0.8s ease-out 0.1s both"}}>
          {win?"🏆":"💀"}
        </div>
        <h2 style={{
          fontSize:"clamp(32px,8vw,60px)",fontWeight:900,margin:"0 0 8px",
          background:win?"linear-gradient(90deg,#f9e04b,#ff6b6b,#c77dff)":"linear-gradient(90deg,#555,#999,#555)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3,
          animation:win?"endTitleWin 0.65s cubic-bezier(.34,1.4,.64,1) 0.55s both"
                       :"endTitleLose 0.55s ease-out 0.45s both",
        }}>{winnerName}</h2>
        <p style={{color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:36,letterSpacing:3,
          animation:"statsSlideIn 0.5s ease-out 0.85s both"}}>
          {win?"ROUND COMPLETE 🎉":"BETTER LUCK NEXT TIME 😤"}
        </p>
        <div style={{display:"flex",gap:12,marginBottom:36,
          animation:"statsSlideIn 0.5s ease-out 1.0s both"}}>
          {[["🏆","WINS",stats.wins],["💀","LOSSES",stats.losses],["🔥","STREAK",stats.streak]].map(([icon,label,val])=>(
            <div key={label} style={{background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",borderRadius:16,padding:"12px 20px",textAlign:"center"}}>
              <div style={{fontSize:22}}>{icon}</div>
              <div style={{fontSize:20,fontWeight:700,color:"#c77dff"}}>{val}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",letterSpacing:2}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:12,animation:"statsSlideIn 0.5s ease-out 1.15s both"}}>
          <button onClick={onPlayAgain} style={{padding:"15px 36px",borderRadius:100,border:"none",
            background:"linear-gradient(90deg,#c77dff,#4facfe)",color:"#fff",
            fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:13,
            cursor:"pointer",letterSpacing:2,boxShadow:"0 0 32px rgba(199,125,255,0.4)"}}>
            ▶ PLAY AGAIN
          </button>
          <button onClick={onHome} style={{padding:"15px 36px",borderRadius:100,
            border:"2px solid rgba(255,255,255,0.2)",background:"transparent",
            color:"rgba(255,255,255,0.55)",fontFamily:"'Orbitron',monospace",
            fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:2}}>
            🏠 HOME
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LANDING PAGE (website-only) ──────────────────────────────────────────────
function LandingPage({ onPlayInBrowser, installPrompt, onInstall, isInstalled }) {
  const [installState, setInstallState] = useState("idle"); // idle | installing | done
  const [showIOSHint, setShowIOSHint] = useState(false);
  const onIOS = isIOS() && isSafari();
  const features = [
    { icon:"🎮", title:"AI OPPONENTS", desc:"3 unique AI personalities — aggressive, passive, trickster" },
    { icon:"⚡", title:"FAST ROUNDS",  desc:"Quick matches you can finish in under 5 minutes" },
    { icon:"📴", title:"OFFLINE PLAY", desc:"Works with no internet once installed as an app" },
    { icon:"🏆", title:"TRACK STATS",  desc:"Wins, losses, and streaks saved across sessions" },
  ];

  async function handleInstall() {
    // iOS: show manual instructions
    if(onIOS) { setShowIOSHint(true); return; }
    if(!installPrompt) return;
    setInstallState("installing");
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if(outcome==="accepted") {
        setInstallState("done");
        onInstall();
      } else {
        setInstallState("idle");
      }
    } catch(e) {
      setInstallState("idle");
    }
  }

  // Decide what the install button says/does
  const canInstall = !!installPrompt || onIOS;

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#05040f 0%,#0d0b22 40%,#130f2e 100%)",
      fontFamily:"'Orbitron',monospace",
      overflowX:"hidden",
      position:"relative",
    }}>

      {/* ── animated bg cards ── */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:0}}>
        {[
          {c:"red",  r:"-8deg", l:"8%",  t:"12%",  anim:"heroFloat",  dur:"4.2s"},
          {c:"blue", r:"6deg",  l:"78%", t:"8%",   anim:"heroFloat2", dur:"3.8s"},
          {c:"green",r:"-15deg",l:"5%",  t:"62%",  anim:"heroFloat3", dur:"5s"},
          {c:"yellow",r:"12deg",l:"82%", t:"58%",  anim:"heroFloat",  dur:"4.6s"},
          {c:"wild", r:"-5deg", l:"50%", t:"80%",  anim:"heroFloat2", dur:"3.5s"},
          {c:"red",  r:"20deg", l:"38%", t:"-2%",  anim:"heroFloat3", dur:"5.2s"},
        ].map((item,i)=>(
          <div key={i} style={{
            position:"absolute",width:60,height:86,borderRadius:10,
            background:"linear-gradient(145deg,"+THEME[item.c].bg+","+THEME[item.c].dark+")",
            border:"2px solid rgba(255,255,255,0.15)",
            boxShadow:"0 0 30px "+THEME[item.c].glow+"40",
            left:item.l,top:item.t,
            animation:item.anim+" "+item.dur+" ease-in-out infinite",
            opacity:0.18,
          }}/>
        ))}
        {/* radial glow */}
        <div style={{position:"absolute",top:"20%",left:"50%",
          width:"70vw",height:"70vw",borderRadius:"50%",
          background:"radial-gradient(circle,rgba(199,125,255,0.07) 0%,transparent 70%)",
          transform:"translateX(-50%)"}}/>
      </div>

      {/* ── HERO ── */}
      <section style={{
        position:"relative",zIndex:1,
        display:"flex",flexDirection:"column",alignItems:"center",
        textAlign:"center",padding:"80px 24px 60px",
        animation:"fadeUp 0.8s ease-out",
      }}>
        {/* logo badge */}
        <div style={{
          background:"rgba(199,125,255,0.1)",
          border:"1px solid rgba(199,125,255,0.3)",
          borderRadius:100,padding:"6px 20px",marginBottom:32,
          fontSize:10,letterSpacing:4,color:"rgba(199,125,255,0.8)",
        }}>🃏 THE CARD GAME</div>

        <h1 style={{
          fontSize:"clamp(56px,14vw,110px)",fontWeight:900,margin:0,
          lineHeight:0.9,letterSpacing:4,
          background:"linear-gradient(90deg,#ff6b6b,#c77dff,#4facfe,#43e97b,#ff6b6b)",
          backgroundSize:"300% 100%",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
          animation:"shimmer 5s linear infinite",
        }}>CARD<br/>RUSH</h1>

        <p style={{
          color:"rgba(255,255,255,0.5)",fontSize:"clamp(13px,3vw,17px)",
          letterSpacing:2,margin:"24px 0 0",maxWidth:480,lineHeight:1.8,
        }}>
          Fast-paced UNO-style card game.<br/>
          Beat 3 AI opponents. Climb the streak. Install and play offline.
        </p>

        {/* CTA buttons */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,marginTop:44,width:"100%",maxWidth:360}}>

          {/* INSTALL button — always visible, adapts to browser capability */}
          {isInstalled ? (
            <div style={{width:"100%",padding:"19px 0",borderRadius:100,
              background:"rgba(67,233,123,0.1)",border:"2px solid rgba(67,233,123,0.5)",
              color:"#43e97b",textAlign:"center",fontSize:13,letterSpacing:3,fontWeight:700,
              display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              ✅ APP INSTALLED — OPEN FROM HOME SCREEN
            </div>
          ) : (
            <button className="land-btn" onClick={handleInstall} disabled={!canInstall && installState!=="done"} style={{
              width:"100%",padding:"19px 0",borderRadius:100,border:"none",
              background: installState==="done"
                ? "linear-gradient(90deg,#43e97b,#2d9e5f)"
                : !canInstall
                ? "linear-gradient(90deg,#555,#333)"
                : "linear-gradient(90deg,#c77dff,#4facfe)",
              color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:900,
              fontSize:14,cursor:(!canInstall&&installState!=="done")?"not-allowed":installState==="installing"?"wait":"pointer",
              letterSpacing:2,
              boxShadow: installState==="done"
                ? "0 0 44px rgba(67,233,123,0.6),0 8px 32px rgba(0,0,0,0.5)"
                : canInstall ? "0 0 44px rgba(199,125,255,0.55),0 8px 32px rgba(0,0,0,0.5)"
                : "none",
              transition:"transform 0.15s,box-shadow 0.15s",
              display:"flex",alignItems:"center",justifyContent:"center",gap:10,
              opacity: !canInstall ? 0.5 : 1,
            }}>
              {installState==="installing" && (
                <span style={{width:16,height:16,borderRadius:"50%",
                  border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",
                  animation:"spin 0.7s linear infinite",display:"inline-block"}}/>
              )}
              {installState==="done" ? "✅ INSTALLED — OPEN FROM HOME SCREEN"
                : installState==="installing" ? "INSTALLING…"
                : onIOS ? "📱 ADD TO HOME SCREEN (iOS)"
                : canInstall ? "⬇  INSTALL APP — PLAY OFFLINE"
                : "⬇  INSTALL APP — PLAY OFFLINE"}
            </button>
          )}

          {/* Play in browser */}
          <button className="land-btn" onClick={onPlayInBrowser} style={{
            width:"100%",padding:"16px 0",borderRadius:100,
            border:"2px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.04)",
            color:"rgba(255,255,255,0.7)",fontFamily:"'Orbitron',monospace",
            fontWeight:700,fontSize:13,cursor:"pointer",letterSpacing:3,
            transition:"transform 0.15s",
          }}>
            PLAY IN BROWSER
          </button>
        </div>

        {/* scroll hint */}
        <div style={{marginTop:56,color:"rgba(255,255,255,0.2)",fontSize:9,letterSpacing:3}}>
          SCROLL TO LEARN MORE ↓
        </div>
      </section>

      {/* ── MOCK GAME PREVIEW ── */}
      <section style={{
        position:"relative",zIndex:1,
        display:"flex",justifyContent:"center",
        padding:"0 24px 60px",
        animation:"fadeUp 1s ease-out 0.2s both",
      }}>
        <div style={{
          width:"100%",maxWidth:380,borderRadius:24,overflow:"hidden",
          border:"2px solid rgba(255,255,255,0.1)",
          boxShadow:"0 0 80px rgba(199,125,255,0.15),0 24px 60px rgba(0,0,0,0.8)",
          background:"linear-gradient(145deg,#0f0c29,#07071a)",
        }}>
          {/* mock top bar */}
          <div style={{background:"rgba(0,0,0,0.4)",padding:"12px 16px",
            display:"flex",justifyContent:"space-between",alignItems:"center",
            borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{display:"flex",gap:6}}>
              {["🔥 Blaze · 5","❄️ Chill · 7"].map(t=>(
                <span key={t} style={{background:"rgba(255,255,255,0.06)",borderRadius:8,
                  padding:"3px 8px",fontSize:8,color:"rgba(255,255,255,0.5)",letterSpacing:1}}>{t}</span>
              ))}
            </div>
            <span style={{fontSize:8,color:"rgba(67,233,123,0.8)",letterSpacing:2}}>⚡ YOUR TURN</span>
          </div>
          {/* mock board */}
          <div style={{padding:20,display:"flex",justifyContent:"center",gap:14,alignItems:"center"}}>
            {/* discard */}
            <div style={{width:66,height:94,borderRadius:10,
              background:"linear-gradient(145deg,#d62828,#7d0000)",
              border:"2px solid #ff6b6b",boxShadow:"0 0 28px #ff6b6b55",
              display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <div style={{position:"absolute",width:"75%",height:"83%",
                border:"2px solid rgba(255,255,255,0.2)",borderRadius:"50%",transform:"rotate(-25deg)"}}/>
              <span style={{fontSize:24,fontWeight:900,color:"#fff",
                fontFamily:"'Orbitron',monospace",zIndex:1}}>7</span>
            </div>
            {/* draw */}
            <div style={{width:66,height:94,borderRadius:10,
              background:"linear-gradient(135deg,#0f0c29,#302b63)",
              border:"2px solid rgba(255,255,255,0.15)",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
              <span style={{fontSize:22}}>🂠</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>62</span>
            </div>
          </div>
          {/* mock hand */}
          <div style={{background:"rgba(67,233,123,0.06)",borderTop:"1px solid rgba(67,233,123,0.25)",
            padding:"12px 12px 16px",display:"flex",justifyContent:"center",gap:4}}>
            {[
              {color:"red",value:"7"},{color:"blue",value:"+2"},{color:"red",value:"Skip"},
              {color:"wild",value:"W"},{color:"green",value:"3"},{color:"yellow",value:"9"},
            ].map((c,i)=>(
              <div key={i} style={{
                width:38,height:54,borderRadius:6,flexShrink:0,
                background:"linear-gradient(145deg,"+THEME[c.color].bg+","+THEME[c.color].dark+")",
                border: i===0?"3px solid #fff":i===1||i===2?"2px solid "+THEME[c.color].glow:"2px solid rgba(255,255,255,0.13)",
                boxShadow: i===0?"0 0 16px "+THEME[c.color].glow+",0 8px 20px rgba(0,0,0,0.6)":"0 4px 10px rgba(0,0,0,0.5)",
                display:"flex",alignItems:"center",justifyContent:"center",
                transform:i===0?"translateY(-12px) scale(1.08)":i===1||i===2?"translateY(-4px)":"none",
                transition:"all 0.2s",
              }}>
                <span style={{fontSize:12,fontWeight:900,color:THEME[c.color].text,
                  fontFamily:"'Orbitron',monospace"}}>
                  {CARD_LABELS[c.value]||c.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{
        position:"relative",zIndex:1,
        padding:"0 24px 60px",
        animation:"fadeUp 1s ease-out 0.4s both",
      }}>
        <h2 style={{textAlign:"center",fontSize:"clamp(18px,5vw,28px)",fontWeight:900,
          color:"rgba(255,255,255,0.85)",letterSpacing:4,marginBottom:32}}>
          WHY PLAY?
        </h2>
        <div style={{
          display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
          gap:16,maxWidth:700,margin:"0 auto",
        }}>
          {features.map((f,i)=>(
            <div key={i} className="feature-card" style={{
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:18,padding:"22px 20px",
              transition:"transform 0.2s,border-color 0.2s",
            }}>
              <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
              <div style={{fontSize:11,fontWeight:700,color:"#c77dff",
                letterSpacing:3,marginBottom:8}}>{f.title}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.7}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{
        position:"relative",zIndex:1,
        textAlign:"center",padding:"20px 24px 60px",
        animation:"fadeUp 1s ease-out 0.6s both",
      }}>
        <div style={{
          background:"linear-gradient(135deg,rgba(199,125,255,0.08),rgba(79,172,254,0.08))",
          border:"1px solid rgba(199,125,255,0.2)",
          borderRadius:28,padding:"40px 32px",maxWidth:480,margin:"0 auto",
        }}>
          <div style={{fontSize:40,marginBottom:12}}>🃏</div>
          <h3 style={{fontSize:20,fontWeight:900,color:"#fff",letterSpacing:4,margin:"0 0 8px"}}>
            READY TO RUSH?
          </h3>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:12,marginBottom:28,letterSpacing:1}}>
            Install for the best experience — plays like a real app, works offline.
          </p>
          {(installPrompt || onIOS) && !isInstalled ? (
            <button className="land-btn" onClick={handleInstall} style={{
              padding:"16px 44px",borderRadius:100,border:"none",
              background:"linear-gradient(90deg,#c77dff,#4facfe)",
              color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:900,
              fontSize:14,cursor:"pointer",letterSpacing:3,
              boxShadow:"0 0 40px rgba(199,125,255,0.5)",
              transition:"transform 0.15s",display:"inline-flex",alignItems:"center",gap:10,
            }}>
              {onIOS ? "📱 ADD TO HOME SCREEN" : "⬇ INSTALL FREE APP"}
            </button>
          ) : (
            <button className="land-btn" onClick={onPlayInBrowser} style={{
              padding:"16px 44px",borderRadius:100,border:"none",
              background:"linear-gradient(90deg,#c77dff,#4facfe)",
              color:"#fff",fontFamily:"'Orbitron',monospace",fontWeight:900,
              fontSize:14,cursor:"pointer",letterSpacing:3,
              boxShadow:"0 0 40px rgba(199,125,255,0.5)",
              transition:"transform 0.15s",
            }}>▶ PLAY NOW</button>
          )}
        </div>
      </section>

      {/* ── iOS INSTALL MODAL ── */}
      {showIOSHint && (
        <div onClick={()=>setShowIOSHint(false)} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
          backdropFilter:"blur(12px)",zIndex:999,
          display:"flex",alignItems:"flex-end",justifyContent:"center",padding:24,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"#12112a",borderRadius:24,padding:"32px 28px",
            border:"2px solid rgba(199,125,255,0.4)",
            boxShadow:"0 0 60px rgba(199,125,255,0.3)",
            maxWidth:380,width:"100%",
          }}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:16}}>📱</div>
            <h3 style={{color:"#c77dff",fontSize:16,fontWeight:900,letterSpacing:3,
              textAlign:"center",marginBottom:20,fontFamily:"'Orbitron',monospace"}}>
              ADD TO HOME SCREEN
            </h3>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[
                ["1️⃣","Tap the Share button","at the bottom of Safari"],
                ["2️⃣","Scroll and tap","Add to Home Screen"],
                ["3️⃣","Tap Add","in the top-right corner"],
              ].map(([num,title,sub],i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,
                  background:"rgba(255,255,255,0.04)",borderRadius:14,padding:"12px 16px"}}>
                  <span style={{fontSize:22}}>{num}</span>
                  <div>
                    <div style={{color:"#fff",fontSize:13,fontWeight:700,letterSpacing:1}}>{title}</div>
                    <div style={{color:"rgba(255,255,255,0.4)",fontSize:11}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowIOSHint(false)} style={{
              marginTop:24,width:"100%",padding:"14px 0",borderRadius:100,
              border:"1px solid rgba(199,125,255,0.4)",background:"rgba(199,125,255,0.1)",
              color:"#c77dff",fontFamily:"'Orbitron',monospace",fontWeight:700,
              fontSize:12,cursor:"pointer",letterSpacing:3,
            }}>GOT IT</button>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{
        position:"relative",zIndex:1,
        textAlign:"center",padding:"20px",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        color:"rgba(255,255,255,0.2)",fontSize:9,letterSpacing:2,
      }}>
        CARD RUSH · UNO-STYLE · FREE FOREVER
      </footer>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function CardRush() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Determine initial screen:
  // • PWA (standalone) → skip landing, go straight to loader then home
  // • Website (browser) → show landing first
  const isPWA = isRunningAsPWA();
  const [screen, setScreen] = useState(isPWA ? "loading" : "landing");

  const [numAI, setNumAI] = useState(1);
  const [stats, setStats] = useState(loadStats);
  const [winner, setWinner] = useState(null);

  // game state
  const [playerHand, setPlayerHand]       = useState([]);
  const [aiHandsState, setAiHandsState]   = useState({});
  const [deckState, setDeckState]         = useState([]);
  const [topState, setTopState]           = useState(null);
  const [currentColor, setCurrentColor]   = useState("red");
  const [currentTurn, setCurrentTurn]     = useState("player");
  const [direction, setDirection]         = useState(1);

  useEffect(()=>{
    // Register service worker for offline/PWA
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }

    // Pick up any prompt that fired before React mounted
    if(window.__pwaInstallPrompt) {
      setInstallPrompt(window.__pwaInstallPrompt);
    }

    // Capture beforeinstallprompt for the install button
    const handler = e => { e.preventDefault(); setInstallPrompt(e); window.__pwaInstallPrompt = e; };
    window.addEventListener("beforeinstallprompt", handler);
    // Detect if already installed via PWA
    window.addEventListener("appinstalled", ()=>{ setIsInstalled(true); setInstallPrompt(null); });
    // Also detect display-mode changes (e.g. after install)
    const mql = window.matchMedia("(display-mode: standalone)");
    const mqlHandler = e => { if(e.matches) setIsInstalled(true); };
    mql.addEventListener("change", mqlHandler);
    if(mql.matches) setIsInstalled(true);
    return ()=>{
      window.removeEventListener("beforeinstallprompt", handler);
      mql.removeEventListener("change", mqlHandler);
    };
  },[]);

  const aiPlayers = AI_PROFILES.slice(0,numAI);

  const loadingDestRef = useRef("home");

  const startGame = useCallback(()=>{
    const dealt = dealGame(numAI);
    setPlayerHand(dealt.player);
    const h={};
    for(let i=0;i<numAI;i++) h["ai"+i]=dealt.aiHands["ai"+i];
    setAiHandsState(h);
    setDeckState(dealt.deck);
    setTopState(dealt.top);
    setCurrentColor(dealt.top.color);
    setCurrentTurn("player");
    setDirection(1);
    loadingDestRef.current = "game";
    setScreen("loading");
  },[numAI]);

  function handleDoneLoading() {
    setScreen(loadingDestRef.current);
    loadingDestRef.current = "home";
  }

  function handlePlay() { startGame(); }

  function handleGameOver(w) {
    setWinner(w);
    const win=w==="player";
    setStats(s=>{ const ns={wins:s.wins+(win?1:0),losses:s.losses+(win?0:1),streak:win?s.streak+1:0}; saveStats(ns); return ns; });
    setScreen("end");
  }

  // Landing: website only, shows before any game starts
  if(screen==="landing") return (
    <LandingPage
      onPlayInBrowser={()=>setScreen("loading")}
      installPrompt={installPrompt}
      onInstall={()=>setIsInstalled(true)}
      isInstalled={isInstalled}
    />
  );

  // Loader: shown before home screen (both website and PWA paths)
  if(screen==="loading") return <LoadingScreen onDone={handleDoneLoading}/>;

  // Home: in-app only
  if(screen==="home") return (
    <HomeScreen stats={stats} numAI={numAI} setNumAI={setNumAI} onPlay={handlePlay}/>
  );

  // Game
  if(screen==="game" && topState) return (
    <GameScreen
      numAI={numAI} aiPlayers={aiPlayers} onGameOver={handleGameOver}
      playerHand={playerHand} setPlayerHand={setPlayerHand}
      aiHandsState={aiHandsState} setAiHandsState={setAiHandsState}
      deckState={deckState} setDeckState={setDeckState}
      topState={topState} setTopState={setTopState}
      currentColor={currentColor} setCurrentColor={setCurrentColor}
      currentTurn={currentTurn} setCurrentTurn={setCurrentTurn}
      direction={direction} setDirection={setDirection}
    />
  );

  // End
  if(screen==="end") return (
    <EndScreen
      winner={winner} aiPlayers={aiPlayers} stats={stats}
      onPlayAgain={startGame} onHome={()=>setScreen("home")}
    />
  );

  return null;
}
