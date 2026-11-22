/* Projekt 1 – 3D-Übungsansicht (Test)
   Eigener kleiner Linien-Renderer auf Canvas 2D: Körperumriss, Skelett und Muskeln
   als Linien, Vorwärtskinematik + 2-Knochen-IK für die Arme. Keine externen Bibliotheken. */
(function(){
"use strict";
/* ---------- Vektoren ---------- */
const V=(x,y,z)=>[x,y,z];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const nrm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l]};
const lerp=(a,b,t)=>a+(b-a)*t;
const lerpV=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

/* ---------- Maße (m) ---------- */
const UA=0.30,FA=0.27,THIGH=0.43,SHIN=0.42,FOOT=0.17,SH_U=0.49,SH_R=0.19,HIP_R=0.09,HIP_U=-0.04;

/* Körper-Frame: Ursprung Hüftmitte O, Achsen R (rechts), U (Kopf), F (Brust vorn) */
function frame(O,U,F){const R=nrm(cross(U,F));return {O,U,F,R,P:(r,u,f)=>add(add(add(O,mul(R,r)),mul(U,u)),mul(F,f))}}

/* 2-Knochen-IK */
function ik(S,T,a,b,pole){
  let d=sub(T,S),dl=len(d);const max=(a+b)*0.999;if(dl>max){T=add(S,mul(d,max/dl));d=sub(T,S);dl=max}
  const dir=mul(d,1/dl),cosA=clamp((a*a+dl*dl-b*b)/(2*a*dl),-1,1),sinA=Math.sqrt(1-cosA*cosA);
  const perp=nrm(sub(pole,mul(dir,dot(pole,dir))));
  return {E:add(S,add(mul(dir,a*cosA),mul(perp,a*sinA))),W:T};
}

/* Wirbelsäule: [u,f,Region] */
const SPINE=[];
for(let i=0;i<5;i++)SPINE.push([0.04+i*0.045,-0.055+0.02*Math.sin(Math.PI*(i+.5)/5),"L"]);
for(let i=0;i<12;i++)SPINE.push([0.255+i*0.025,-0.06-0.025*Math.sin(Math.PI*(i+.5)/12),"T"]);
for(let i=0;i<7;i++)SPINE.push([0.55+i*0.015,-0.045+0.012*Math.sin(Math.PI*(i+.5)/7),"C"]);
const RIB_R=[0.055,0.08,0.10,0.115,0.125,0.13,0.13,0.128,0.125,0.12,0.115,0.11];
const RIB_F=[0.05,0.065,0.08,0.09,0.10,0.105,0.105,0.10,0.095,0.09,0.085,0.08];

/* ---------- Posen ---------- */
function posePush(t){ // t: 0 oben, 1 unten
  const thTop=0.335,thBot=0.06,th=lerp(thTop,thBot,t);
  const U=V(0,Math.sin(th),Math.cos(th)),F=V(0,-Math.cos(th),Math.sin(th));
  const O=add(mul(F,-0.16),mul(U,0.89));
  const fr=frame(O,U,F);
  // Handposition fest: unter den Schultern in der oberen Position
  const Ut=V(0,Math.sin(thTop),Math.cos(thTop)),Ft=V(0,-Math.cos(thTop),Math.sin(thTop));
  const shTopZ=add(add(mul(Ft,-0.16),mul(Ut,0.89)),add(mul(Ut,SH_U),mul(Ft,-0.01)))[2];
  const arms={};
  for(const s of[-1,1]){
    const S=fr.P(s*SH_R,SH_U,-0.01),T=V(s*0.25,0.04,shTopZ+0.02);
    const pole=nrm(add(add(mul(fr.R,s*0.55),mul(U,-0.75)),mul(F,-0.35)));
    const r=ik(S,T,UA,FA,pole);arms[s]={S,E:r.E,W:r.W,H:add(r.W,V(0,-0.03,0.09)),Hs:V(s,0,0)};
  }
  const act={pect:0.35+0.65*t,delt:0.3+0.6*t,tri:0.3+0.7*t,abs:0.65,quad:0.35,lat:0.1,bic:0.1,trap:0.15};
  return {fr,arms,legs:{h:0,k:0},head:{f:0.03,u:0},act,elev:0,cam:V(0,0.22,0.8),scene:"floor"};
}
function posePull(t){ // t: 0 unten (toter Hang), 1 oben
  const Y=2.25,al=0.13*t,U=V(0,Math.cos(al),-Math.sin(al)),F=V(0,Math.sin(al),Math.cos(al));
  const elev=0.035*(1-t);
  const shBot=V(0,Y-0.03-0.541,0.0),shTop=V(0,Y-0.12,-0.075),SC=lerpV(shBot,shTop,t);
  const O=add(sub(SC,mul(U,SH_U+elev)),mul(F,0.01));
  const fr=frame(O,U,F);const arms={};
  for(const s of[-1,1]){
    const S=fr.P(s*SH_R,SH_U+elev,-0.01),T=V(s*0.34,Y-0.03,0);
    const pole=nrm(add(add(mul(fr.R,s),mul(U,-0.6)),mul(F,0.15)));
    const r=ik(S,T,UA,FA,pole);arms[s]={S,E:r.E,W:r.W,H:add(r.W,V(0,0.06,-0.02)),Hs:V(s,0,0)};
  }
  const act={pect:0.15,delt:0.15,tri:0.15,abs:0.45,quad:0.1,lat:0.3+0.7*t,bic:0.3+0.7*t,trap:0.25+0.65*t};
  return {fr,arms,legs:{h:0.18,k:0.55},head:{f:0.03,u:0.0,up:0.25*t},act,elev,cam:V(0,1.6,0),scene:"bar",bar:Y};
}
const EX={
  push:{name:"Liegestütze",pose:posePush,timing:[[0,0,0.4],[0,1,2.0],[1,1,0.3],[1,0,1.0]],
    cues:["Körper bildet eine gerade Linie von Kopf bis Ferse.","Lendenwirbelsäule neutral: Bauch und Po fest, die Hüfte hängt nicht durch.","Ellbogen zeigen etwa 45° vom Körper weg nach hinten.","Runter bis die Brust eine Faust über dem Boden ist, dann ganz hoch."],
    labels:["lws","bws","pect","tri","abs","scap"]},
  pull:{name:"Klimmzüge",pose:posePull,timing:[[0,0,0.6],[0,1,1.2],[1,1,0.4],[1,0,2.0]],
    cues:["Start aus dem toten Hang, Arme gestreckt.","Zuerst die Schulterblätter nach unten ziehen, dann die Arme beugen.","Hoch, bis das Kinn über der Stange ist.","Lendenwirbelsäule neutral, kein Schwung aus Beinen oder Hüfte."],
    labels:["lws","bws","lat","bic","trap","scap"]}
};
function phaseAt(ex,time){
  const tm=EX[ex].timing,total=tm.reduce((s,x)=>s+x[2],0);let t=time%total;
  for(const [a,b,d] of tm){if(t<=d)return lerp(a,b,ease(t/d));t-=d}
  return tm[tm.length-1][1];
}

/* ---------- Modell aufbauen (Linien) ---------- */
function build(p){
  const L={outline:[],skel:[],lws:[],muscle:[],joints:[],labels:{}};
  const {fr}=p,{P,U,F,R}=fr;
  const ring=(C,ax,A,ra,rb,n=16)=>{const B=nrm(cross(ax,A));const pts=[];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;pts.push(add(C,add(mul(A,Math.cos(a)*ra),mul(B,Math.sin(a)*rb))))}return pts};
  const perpTo=(ax,ref)=>{let a=sub(ref,mul(ax,dot(ref,ax)));if(len(a)<1e-4)a=cross(ax,V(0,0,1));return nrm(a)};
  // Glied mit Ringen + Meridianen
  const limb=(A,B,r0,r1,ref,n=5,mid=0)=>{
    const ax=nrm(sub(B,A)),pa=perpTo(ax,ref),rings=[];
    for(let i=0;i<n;i++){const t=(i+.5)/n,r=lerp(r0,r1,t)+mid*Math.sin(Math.PI*t);rings.push(ring(lerpV(A,B,t),ax,pa,r,r*0.9,12))}
    rings.forEach(rg=>L.outline.push(rg));
    for(let k=0;k<12;k+=3)L.outline.push(rings.map(rg=>rg[k]));
  };
  /* Rumpf-Umriss */
  const prof=[[-0.08,0.165,0.11],[0.0,0.17,0.115],[0.08,0.155,0.1],[0.16,0.14,0.095],[0.24,0.15,0.105],[0.32,0.165,0.118],[0.40,0.172,0.12],[0.47,0.19,0.105],[0.52,0.16,0.08]];
  const trings=prof.map(([u,rr,rf])=>{const pts=[];for(let i=0;i<=20;i++){const a=i/20*Math.PI*2;pts.push(P(Math.cos(a)*rr,u,Math.sin(a)*rf))}return pts});
  trings.forEach(r=>L.outline.push(r));for(let k=0;k<20;k+=2.5)L.outline.push(trings.map(r=>r[Math.round(k)]));
  // Hals + Kopf
  const neckA=P(0,0.53,-0.01),neckB=P(0,0.63,0.0);limb(neckA,neckB,0.05,0.045,F,2);
  const HC=add(P(0,0.74,p.head.f),mul(F,0)),hU=nrm(add(U,mul(F,-(p.head.up||0)))),hF=nrm(cross(R,hU));
  for(const k of[-0.07,-0.03,0.01,0.05,0.085]){const rr=0.09*Math.sqrt(1-Math.pow(k/0.12,2));L.outline.push(ring(add(HC,mul(hU,k)),hU,R,rr*0.9,rr*1.05,18))}
  L.outline.push(ring(HC,R,hU,0.115,0.1,22));L.outline.push(ring(HC,hF,hU,0.115,0.085,22));
  /* Arme */
  for(const s of[-1,1]){const a=p.arms[s];
    limb(a.S,a.E,0.055,0.042,F,4,0.006);limb(a.E,a.W,0.045,0.028,F,4,0.004);limb(a.W,a.H,0.03,0.025,U,2);
  }
  /* Beine */
  const legs={};
  for(const s of[-1,1]){
    const Hj=P(s*HIP_R,HIP_U,0),h=p.legs.h,k=p.legs.k;
    const d1=add(mul(U,-Math.cos(h)),mul(F,Math.sin(h))),d2=add(mul(U,-Math.cos(h-k)),mul(F,Math.sin(h-k)));
    const K=add(Hj,mul(d1,THIGH)),A=add(K,mul(d2,SHIN)),fd=nrm(add(mul(F,Math.cos(h-k)),mul(U,Math.sin(h-k))));
    const T=add(A,add(mul(fd,FOOT),mul(d2,0.05))),Heel=add(A,add(mul(fd,-0.05),mul(d2,0.06)));
    legs[s]={Hj,K,A,T,Heel};
    limb(Hj,K,0.085,0.055,F,5,0.008);limb(K,A,0.052,0.034,F,5,0.012);limb(Heel,T,0.04,0.03,d2,2);
  }
  /* ----- Skelett ----- */
  const sk=(pts,lws)=>(lws?L.lws:L.skel).push(pts);
  const vpos=SPINE.map(([u,f])=>P(0,u,f));
  SPINE.forEach(([u,f,reg],i)=>{const c=vpos[i],rr=reg==="C"?0.012:reg==="T"?0.015:0.019;
    sk(ring(c,U,R,rr,rr*0.8,10),reg==="L");sk([c,P(0,u-0.01,f-0.03)],reg==="L");
    if(reg!=="C")sk([P(-0.025,u,f-0.005),P(0.025,u,f-0.005)],reg==="L")});
  sk(vpos.slice(0,5),true);sk(vpos.slice(4),false);
  // Kreuzbein + Steißbein
  sk([vpos[0],P(0,-0.02,-0.065),P(0,-0.07,-0.075),P(0,-0.095,-0.06)]);
  sk([P(-0.04,0.02,-0.06),P(0,-0.06,-0.075),P(0.04,0.02,-0.06)]);
  // Rippen
  for(let i=0;i<12;i++){const vi=5+(11-i),[uv,fv]=SPINE[vi];const pm=i<7?Math.PI:i<10?0.88*Math.PI:0.5*Math.PI;
    for(const s of[-1,1]){const pts=[];for(let j=0;j<=14;j++){const ph=j/14*pm;pts.push(P(s*RIB_R[i]*Math.sin(ph),uv-0.065*(ph/Math.PI)-(i>6?0.015:0),fv+RIB_F[i]*(1-Math.cos(ph))))}sk(pts)}}
  sk([P(0,0.50,0.085),P(0,0.42,0.11),P(0,0.34,0.125),P(0,0.31,0.12)]);
  // Becken
  for(const s of[-1,1]){
    sk([P(s*0.03,0.04,-0.065),P(s*0.1,0.09,-0.05),P(s*0.145,0.08,0.0),P(s*0.13,0.05,0.05),P(s*0.085,0.0,0.07)]);
    sk([P(s*0.085,0.0,0.07),P(s*0.03,-0.07,0.075),P(0,-0.075,0.075)]);
    sk([P(s*0.13,0.05,0.05),P(s*0.09,-0.02,0.0),P(s*0.065,-0.095,-0.02),P(s*0.03,-0.07,0.075)]);
    sk(ring(P(s*HIP_R,HIP_U,0),R,U,0.024,0.024,10));
  }
  // Schlüsselbein + Schulterblatt + Arme
  for(const s of[-1,1]){const a=p.arms[s],e=p.elev||0;
    sk([P(s*0.02,0.50,0.08),P(s*0.09,0.515+e*0.6,0.06),P(s*0.17,0.51+e,-0.0)]);
    sk([P(s*0.06,0.47+e*0.5,-0.10),P(s*0.165,0.49+e,-0.07),P(s*0.10,0.31+e*0.5,-0.11),P(s*0.06,0.47+e*0.5,-0.10)]);
    sk([P(s*0.08,0.455+e*0.5,-0.105),P(s*0.17,0.48+e,-0.075)]);
    const ax=nrm(sub(a.E,a.S));sk(ring(a.S,ax,perpTo(ax,F),0.026,0.026,10));sk([a.S,a.E]);
    const fax=nrm(sub(a.W,a.E)),off=mul(perpTo(fax,cross(fax,sub(a.S,a.E))),0.011);
    sk([add(a.E,off),add(a.W,off)]);sk([sub(a.E,off),sub(a.W,off)]);
    const hd=nrm(sub(a.H,a.W)),side=perpTo(hd,mul(R,s));
    for(let f=-1.5;f<=1.5;f++)sk([add(a.W,mul(side,f*0.008)),add(a.H,mul(side,f*0.014))]);
    L.joints.push(a.S,a.E,a.W);
  }
  for(const s of[-1,1]){const g=legs[s];
    sk([P(s*0.05,HIP_U+0.01,0.0),g.Hj]);sk([g.Hj,g.K]);
    const ax=nrm(sub(g.A,g.K)),off=mul(perpTo(ax,R),0.012);sk([add(g.K,off),add(g.A,off)]);sk([sub(g.K,mul(off,.3)),sub(g.A,mul(off,.3))]);
    sk(ring(add(g.K,mul(F,0.035)),ax,R,0.02,0.02,10));sk([g.Heel,g.A,g.T]);sk([g.Heel,g.T]);
    L.joints.push(g.Hj,g.K,g.A);
  }
  // Schädel
  sk(ring(HC,hU,R,0.075,0.085,18));sk(ring(HC,R,hU,0.1,0.09,20));
  sk([add(HC,add(mul(hU,-0.03),mul(hF,0.07))),add(HC,add(mul(hU,-0.1),mul(hF,0.06))),add(HC,add(mul(hU,-0.115),mul(hF,0.0))),add(HC,add(mul(hU,-0.07),mul(hF,-0.05)))]);
  /* ----- Muskeln ----- */
  const fib=(A,B,bow,dir,act,n=1)=>{const pts=[];for(let i=0;i<=n*8;i++){const t=i/(n*8);pts.push(add(lerpV(A,B,t),mul(dir,bow*Math.sin(Math.PI*t))))}L.muscle.push({pts,act})};
  const A=p.act;
  for(const s of[-1,1]){const a=p.arms[s],up=nrm(sub(a.E,a.S)),ins=add(a.S,mul(up,0.08));
    const out=nrm(sub(a.E,lerpV(a.S,a.W,0.5)));
    // Brustmuskel
    for(let i=0;i<6;i++){const o=i<4?P(s*0.015,0.47-i*0.045,0.10+i*0.008):P(s*(0.03+(i-4)*0.04),0.505,0.085);fib(o,ins,0.025,F,A.pect)}
    // vorderer Deltamuskel
    for(let i=0;i<3;i++)fib(P(s*(0.11+i*0.025),0.51,0.05-i*0.015),add(a.S,mul(up,0.13)),0.03,nrm(add(F,mul(R,s))),A.delt);
    // Trizeps / Bizeps
    for(let i=0;i<3;i++){const o=add(a.S,mul(cross(up,mul(R,s)),(i-1)*0.012));fib(o,add(a.E,mul(out,0.02)),0.035+i*0.004,out,A.tri)}
    for(let i=0;i<2;i++){const o=add(a.S,mul(F,0.02+i*0.01));fib(o,lerpV(a.E,a.W,0.12),0.03,mul(out,-1),A.bic)}
    // Latissimus
    const latIns=add(a.S,add(mul(up,0.09),mul(F,0.01)));
    for(let i=0;i<7;i++){const o=i<5?P(s*0.01,0.30-i*0.06,-0.08):P(s*(0.06+(i-5)*0.04),0.07,-0.07);fib(o,latIns,0.04,nrm(add(mul(F,-1),mul(R,s*0.6))),A.lat)}
    // Trapezius (mittel/unten)
    for(let i=0;i<5;i++)fib(P(s*0.005,0.52-i*0.06,-0.085),P(s*0.15,0.49+(p.elev||0),-0.07),0.015,mul(F,-1),A.trap);
    // Quadrizeps
    const g=legs[s];for(let i=0;i<3;i++)fib(add(P(s*(0.07+i*0.025),-0.02,0.05),V(0,0,0)),add(g.K,mul(F,0.04)),0.04,nrm(add(F,mul(R,s*(i-1)*0.4))),A.quad);
  }
  for(const s of[-1,1]){for(let i=0;i<2;i++)fib(P(s*(0.02+i*0.025),-0.06,0.085),P(s*(0.03+i*0.035),0.33,0.13),0.035,F,A.abs);
    for(const u of[0.1,0.18,0.26])L.muscle.push({pts:[P(s*0.015,u,0.12),P(s*0.065,u,0.125)],act:A.abs})}
  /* Beschriftungsanker */
  const a1=p.arms[1];
  L.labels={lws:[P(0,0.13,-0.05),"Lendenwirbelsäule"],bws:[P(0,0.40,-0.085),"Brustwirbelsäule"],pect:[P(0.09,0.43,0.12),"Brustmuskel"],
    tri:[add(lerpV(a1.S,a1.E,0.55),mul(nrm(sub(a1.E,lerpV(a1.S,a1.W,.5))),0.05)),"Trizeps"],abs:[P(0,0.12,0.13),"Bauchmuskeln"],
    scap:[P(0.11,0.42,-0.11),"Schulterblatt"],lat:[P(0.13,0.22,-0.09),"Breiter Rückenmuskel"],
    bic:[add(lerpV(a1.S,a1.E,0.5),mul(nrm(sub(a1.E,lerpV(a1.S,a1.W,.5))),-0.05)),"Bizeps"],trap:[P(0.06,0.47,-0.11),"Trapezmuskel"]};
  return L;
}

/* ---------- UI + Renderer ---------- */
const css=`
.p3{position:fixed;inset:0;z-index:40;background:var(--bg);color:var(--ink);display:flex;flex-direction:column}
.p3 header{position:static;display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 10px) 16px 8px;border-bottom:1px solid var(--line)}
.p3 header b{font-size:17px;letter-spacing:-.3px}.p3 header small{color:var(--mute);font-weight:600;margin-left:8px}
.p3 .x3{border:1px solid var(--line);background:none;width:36px;height:36px;border-radius:10px;font-size:16px;color:var(--ink)}
.p3 .bar3{display:flex;gap:6px;align-items:center;padding:8px 16px 0;overflow-x:auto;scrollbar-width:none}
.p3 .stage{flex:1;position:relative;min-height:240px;touch-action:none;cursor:grab}
.p3 canvas{position:absolute;inset:0;width:100%;height:100%}
.p3 .hint{position:absolute;left:16px;bottom:10px;font-size:12px;color:var(--mute);pointer-events:none}
.p3 .tg{border:1px solid var(--line);background:none;border-radius:8px;padding:6px 10px;font-size:13px;font-weight:650;color:var(--mute);flex:none}
.p3 .tg.on{border-color:var(--hair);color:var(--ink)}
.p3 .tg.play{background:var(--acc);color:var(--on);border-color:var(--acc)}
.p3 .cues{padding:10px 16px calc(14px + env(safe-area-inset-bottom));border-top:1px solid var(--line);font-size:14px;max-height:26vh;overflow:auto}
.p3 .cues ol{margin:4px 0 0;padding-left:18px}.p3 .cues li{margin:3px 0}
.p3 .legend{display:flex;gap:12px;font-size:12px;color:var(--mute);margin-bottom:4px;flex-wrap:wrap}
.p3 .legend i{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:3px;margin-right:5px}
`;
function open3D(ex){
  if(!document.getElementById("p3css")){const st=document.createElement("style");st.id="p3css";st.textContent=css;document.head.appendChild(st)}
  const root=document.createElement("div");root.className="p3";root.setAttribute("role","dialog");root.setAttribute("aria-label","3D-Ansicht");
  root.innerHTML=`<header><div><b>3D-Ansicht</b><small>Test</small></div><button class="x3" aria-label="Schließen">✕</button></header>
  <div class="bar3"><div class="seg" style="margin:0;flex:1;min-width:200px">${Object.entries(EX).map(([k,e])=>`<button data-ex="${k}">${e.name}</button>`).join("")}</div></div>
  <div class="bar3"><button class="tg play" data-a="play">Pause</button><button class="tg" data-a="slow">Langsam</button>
   <button class="tg" data-v="side">Seite</button><button class="tg" data-v="front">Vorne</button><button class="tg" data-v="iso">Schräg</button><button class="tg" data-v="top">Oben</button></div>
  <div class="bar3"><button class="tg on" data-l="outline">Umriss</button><button class="tg on" data-l="skel">Skelett</button><button class="tg on" data-l="muscle">Muskeln</button><button class="tg on" data-l="labels">Namen</button></div>
  <div class="stage"><canvas></canvas><div class="hint">Ziehen zum Drehen, zwei Finger zum Zoomen</div></div>
  <div class="cues"><div class="legend"><span><i style="background:var(--mute)"></i>Umriss</span><span><i style="background:var(--ink)"></i>Skelett</span><span><i style="background:#E5484D"></i>Arbeitende Muskeln</span><span><i style="background:var(--kraft)"></i>Lendenwirbelsäule</span></div><b>Darauf achten</b><ol class="cl"></ol></div>`;
  document.body.appendChild(root);document.body.style.overflow="hidden";
  const cv=root.querySelector("canvas"),ctx=cv.getContext("2d"),stage=root.querySelector(".stage");
  const st={ex:EX[ex]?ex:"push",time:0,playing:true,speed:1,yaw:-1.0,pitch:0.22,dist:2.15,layers:{outline:1,skel:1,muscle:1,labels:1}};
  window.__p3st=st;
  const views={side:[-Math.PI/2,0.06],front:[0,0.12],iso:[-1.0,0.22],top:[-Math.PI/2,1.3]};
  function setEx(k){st.ex=k;st.time=0;st.dist=k==="pull"?2.7:2.15;
    root.querySelectorAll("[data-ex]").forEach(b=>b.classList.toggle("on",b.dataset.ex===k));
    root.querySelector(".cl").innerHTML=EX[k].cues.map(c=>`<li>${c}</li>`).join("")}
  setEx(st.ex);
  const colors=()=>{const cs=getComputedStyle(document.documentElement);const g=n=>cs.getPropertyValue(n).trim()||"#000";return {ink:g("--ink"),mute:g("--mute"),line:g("--line"),bg:g("--bg"),lws:g("--kraft"),mus:"#E5484D"}};
  let C=colors(),W=0,H=0,DPR=1;
  function resize(){DPR=Math.min(2,window.devicePixelRatio||1);const r=stage.getBoundingClientRect();W=r.width;H=r.height;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0)}
  resize();const ro=new ResizeObserver(resize);ro.observe(stage);
  /* Eingabe */
  const ptrs=new Map();let pinch0=null;
  stage.addEventListener("pointerdown",e=>{stage.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);stage.style.cursor="grabbing"});
  stage.addEventListener("pointermove",e=>{if(!ptrs.has(e.pointerId))return;const prev=ptrs.get(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);
    if(ptrs.size===1){st.yaw-=(e.clientX-prev[0])*0.008;st.pitch=clamp(st.pitch+(e.clientY-prev[1])*0.006,-1.2,1.35)}
    else if(ptrs.size===2){const [a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch0){st.dist=clamp(st.dist*pinch0/d,1.4,7)}pinch0=d}});
  const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch0=null;if(!ptrs.size)stage.style.cursor="grab"};
  stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
  stage.addEventListener("wheel",e=>{e.preventDefault();st.dist=clamp(st.dist*Math.exp(e.deltaY*0.001),1.4,7)},{passive:false});
  root.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.classList.contains("x3")){close();return}
    if(b.dataset.ex){setEx(b.dataset.ex);return}
    if(b.dataset.a==="play"){st.playing=!st.playing;b.textContent=st.playing?"Pause":"Abspielen";return}
    if(b.dataset.a==="slow"){st.speed=st.speed===1?0.4:1;b.classList.toggle("on",st.speed!==1);return}
    if(b.dataset.v){[st.yaw,st.pitch]=views[b.dataset.v];return}
    if(b.dataset.l){st.layers[b.dataset.l]^=1;b.classList.toggle("on",!!st.layers[b.dataset.l]);return}});
  const onKey=e=>{if(e.key==="Escape")close()};document.addEventListener("keydown",onKey);
  /* Zeichnen */
  let last=performance.now(),raf=0;
  function frameLoop(now){
    const dt=Math.min(0.05,(now-last)/1000);last=now;if(st.playing)st.time+=dt*st.speed;
    const ph=phaseAt(st.ex,st.time),pose=EX[st.ex].pose(ph),M=build(pose);
    ctx.clearRect(0,0,W,H);
    const tgt=pose.cam,cp=Math.cos(st.pitch);
    const pos=add(tgt,mul(V(cp*Math.sin(st.yaw),Math.sin(st.pitch),cp*Math.cos(st.yaw)),st.dist));
    const fw=nrm(sub(tgt,pos)),rt=nrm(cross(fw,V(0,1,0))),cu=cross(rt,fw),fpx=Math.min(W,H*0.8)*1.35;
    const proj=q=>{const d=sub(q,pos),z=dot(d,fw);if(z<0.05)return null;return [W/2+dot(d,rt)/z*fpx,H*0.5-dot(d,cu)/z*fpx,z]};
    const fog=z=>clamp(1.15-(z-(st.dist-0.6))/1.6,0.25,1);
    const poly=(pts,col,w,alpha)=>{let pr=null;ctx.strokeStyle=col;ctx.lineWidth=w;
      for(const q of pts){const s=proj(q);if(s&&pr){ctx.globalAlpha=alpha*fog((s[2]+pr[2])/2);ctx.beginPath();ctx.moveTo(pr[0],pr[1]);ctx.lineTo(s[0],s[1]);ctx.stroke()}pr=s}};
    ctx.lineCap="round";ctx.lineJoin="round";
    // Umgebung
    if(pose.scene==="floor"){for(let x=-1;x<=1.0001;x+=0.25)poly([V(x,0,-0.3),V(x,0,1.9)],C.line,1,0.9);for(let z=-0.3;z<=1.9001;z+=0.25)poly([V(-1,0,z),V(1,0,z)],C.line,1,0.9)}
    else{const Y=pose.bar;for(let x=-1;x<=1.0001;x+=0.25)poly([V(x,0,-0.9),V(x,0,0.9)],C.line,1,0.9);for(let z=-0.9;z<=0.9001;z+=0.25)poly([V(-1,0,z),V(1,0,z)],C.line,1,0.9);
      poly([V(-0.75,Y,0),V(0.75,Y,0)],C.ink,3,1);poly([V(-0.75,0,0),V(-0.75,Y,0)],C.mute,2,0.8);poly([V(0.75,0,0),V(0.75,Y,0)],C.mute,2,0.8)}
    if(st.layers.outline)for(const l of M.outline)poly(l,C.mute,0.8,0.45);
    if(st.layers.skel){for(const l of M.skel)poly(l,C.ink,1.3,0.9);for(const l of M.lws)poly(l,C.lws,1.8,1);
      for(const j of M.joints){const s=proj(j);if(s){ctx.globalAlpha=fog(s[2]);ctx.fillStyle=C.bg;ctx.strokeStyle=C.ink;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(s[0],s[1],3.2,0,7);ctx.fill();ctx.stroke()}}}
    if(st.layers.muscle)for(const m of M.muscle)poly(m.pts,C.mus,1.1+1.2*m.act,0.15+0.85*m.act);
    if(st.layers.labels){ctx.font="600 12px "+getComputedStyle(document.body).fontFamily;ctx.textBaseline="middle";
      const used=[];for(const k of EX[st.ex].labels){const [q,txt]=M.labels[k],s=proj(q);if(!s)continue;
        if(k==="lws"&&!st.layers.skel||(k==="pect"||k==="tri"||k==="bic"||k==="lat"||k==="abs"||k==="trap")&&!st.layers.muscle)continue;
        const right=s[0]<W*0.62;let lx=right?s[0]+46:s[0]-46,ly=s[1]-18;while(used.some(u=>Math.abs(u-ly)<16))ly+=16;used.push(ly);
        const col=k==="lws"?C.lws:(k==="bws"||k==="scap")?C.ink:C.mus;
        ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(s[0],s[1]);ctx.lineTo(lx,ly);ctx.stroke();
        ctx.beginPath();ctx.arc(s[0],s[1],2.5,0,7);ctx.fillStyle=col;ctx.fill();
        const tw=ctx.measureText(txt).width,tx=right?lx+4:lx-4-tw;ctx.fillStyle=C.bg;ctx.globalAlpha=0.85;ctx.fillRect(tx-3,ly-9,tw+6,18);ctx.globalAlpha=1;ctx.fillStyle=col;ctx.fillText(txt,tx,ly)}}
    ctx.globalAlpha=1;raf=requestAnimationFrame(frameLoop);
  }
  raf=requestAnimationFrame(frameLoop);
  const mq=matchMedia("(prefers-color-scheme: dark)"),onTheme=()=>{C=colors()};mq.addEventListener("change",onTheme);
  const mo=new MutationObserver(onTheme);mo.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  function close(){cancelAnimationFrame(raf);ro.disconnect();mo.disconnect();mq.removeEventListener("change",onTheme);document.removeEventListener("keydown",onKey);root.remove();document.body.style.overflow=""}
}
window.open3D=open3D;
})();
