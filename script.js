// copy email
const copyBtn=document.getElementById('copyBtn');
copyBtn.addEventListener('click',async()=>{
  const email=document.getElementById('emailLink').textContent.trim();
  try{await navigator.clipboard.writeText(email);copyBtn.textContent='Copied ✓';}
  catch(e){copyBtn.textContent='Ctrl+C';}
  setTimeout(()=>copyBtn.textContent='Copy',1800);
});

// staggered scroll reveal
const io=new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const siblings=[...e.target.parentElement.querySelectorAll('.reveal:not(.in)')];
      const idx=siblings.indexOf(e.target);
      e.target.style.transitionDelay=Math.max(0,idx)*70+'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
},{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// theme toggle — <head> bootstrap script already set data-theme before paint
const themeBtn=document.getElementById('themeBtn');
function applyTheme(t,fade){
  if(fade){
    document.documentElement.classList.add('theme-fade');
    setTimeout(()=>document.documentElement.classList.remove('theme-fade'),400);
  }
  document.documentElement.dataset.theme=t;
  themeBtn.setAttribute('aria-label',t==='dark'?'Switch to light mode':'Switch to dark mode');
  document.querySelector('meta[name="theme-color"]').setAttribute('content',t==='dark'?'#14110e':'#fff9f4');
  // palette vars live in the canvas section below; they self-initialize on load,
  // so only re-read them on a user toggle (fade=true) when the script is fully loaded
  if(fade)refreshNetPalette();
}
function toggleTheme(){
  const t=document.documentElement.dataset.theme==='dark'?'light':'dark';
  localStorage.setItem('theme',t);
  applyTheme(t,true);
}
themeBtn.addEventListener('click',toggleTheme);
applyTheme(document.documentElement.dataset.theme,false);


// custom cursor — single implementation, transform-only writes (desktop, motion-safe)
if(!reduced && matchMedia('(pointer:fine)').matches){
  const dot=document.querySelector('.cur-dot');
  const ring=document.querySelector('.cur-ring');
  document.body.classList.add('cursor-on');
  dot.style.opacity='0';ring.style.opacity='0';
  let mx=-100,my=-100,rx=-100,ry=-100,seen=false;
  addEventListener('mousemove',e=>{
    mx=e.clientX;my=e.clientY;
    if(!seen){seen=true;rx=mx;ry=my;dot.style.opacity='1';ring.style.opacity='1';}
    dot.style.transform=`translate3d(${mx}px,${my}px,0)`;
  },{passive:true});
  (function follow(){
    rx+=(mx-rx)*.3; ry+=(my-ry)*.3;
    ring.style.transform=`translate3d(${rx}px,${ry}px,0)`;
    requestAnimationFrame(follow);
  })();
  const hoverSel='a,button,.project,.card,.copy-btn';
  addEventListener('mouseover',e=>{if(e.target.closest(hoverSel))document.body.classList.add('cur-hover');},{passive:true});
  addEventListener('mouseout',e=>{if(e.target.closest(hoverSel))document.body.classList.remove('cur-hover');},{passive:true});
  addEventListener('mousedown',()=>document.body.classList.add('cur-down'));
  addEventListener('mouseup',()=>document.body.classList.remove('cur-down'));
  document.addEventListener('mouseleave',()=>{dot.style.opacity='0';ring.style.opacity='0';});
  document.addEventListener('mouseenter',()=>{dot.style.opacity='1';ring.style.opacity='1';});
}
// scroll progress bar + header shadow
const bar=document.getElementById('progress');
const siteHeader=document.querySelector('header.site');
window.addEventListener('scroll',()=>{
  const h=document.documentElement;
  bar.style.width=(h.scrollTop/(h.scrollHeight-h.clientHeight))*100+'%';
  siteHeader.classList.toggle('scrolled',h.scrollTop>8);
},{passive:true});

// mobile menu
const menuBtn=document.getElementById('menuBtn');
const mobileMenu=document.getElementById('mobileMenu');
menuBtn.addEventListener('click',()=>{
  const open=mobileMenu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded',open);
  menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
});
mobileMenu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  mobileMenu.classList.remove('open');
  menuBtn.setAttribute('aria-expanded','false');
}));
// close the panel if the viewport grows past the mobile breakpoint
matchMedia('(min-width:761px)').addEventListener('change',e=>{
  if(e.matches){
    mobileMenu.classList.remove('open');
    menuBtn.setAttribute('aria-expanded','false');
    menuBtn.setAttribute('aria-label','Open menu');
  }
});

// scrollspy — highlight the section in view
const spyLinks=document.querySelectorAll('.nav-links a[data-spy]');
const spyObs=new IntersectionObserver(es=>{
  es.forEach(e=>{
    if(e.isIntersecting){
      spyLinks.forEach(l=>l.classList.toggle('active',l.dataset.spy===e.target.id));
    }
  });
},{rootMargin:'-30% 0px -60% 0px'});
['projects','skills','journey','contact'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)spyObs.observe(el);
});

/* ============================================================
   LIVE NETWORK SESSIONS — hero only.
   The topology discovers a route, performs a visible TCP
   handshake (SYN / SYN·ACK / ACK), streams data, confirms.
   ============================================================ */
const hero=document.querySelector('.hero');
const canvas=document.getElementById('net');
const ctx=canvas.getContext('2d');
let W,H,nodes=[],links=[],pulses=[],ambient=[];
let ACCENT='234,88,12';
let SLATE='187,140,96';
let PAPER='255,249,244';
function refreshNetPalette(){
  const cs=getComputedStyle(document.documentElement);
  const toRGB=name=>{
    const m=/^#([0-9a-f]{6})$/i.exec(cs.getPropertyValue(name).trim());
    return m?`${parseInt(m[1].slice(0,2),16)},${parseInt(m[1].slice(2,4),16)},${parseInt(m[1].slice(4,6),16)}`:null;
  };
  ACCENT=toRGB('--accent')||ACCENT;
  SLATE=toRGB('--slate')||SLATE;
  PAPER=toRGB('--paper')||PAPER;
}
refreshNetPalette();
const INK='26,23,18';

const portraitEl=document.querySelector('.hero-portrait');
let portraitIdx=-1, portraitR=0, floatY=0;

function buildTopology(){
  W=canvas.width=hero.clientWidth;
  H=canvas.height=hero.clientHeight;
  nodes=[];links=[];pulses=[];ambient=[];session=null;
  // scale node count with hero AREA and spread edge-to-edge with min-distance sampling
  const count=Math.max(18,Math.min(42,Math.floor(W*H/34000)));
  const minD=Math.sqrt(W*H/count)*0.62;
  for(let i=0;i<count;i++){
    let px,py,ok=false;
    for(let a=0;a<24&&!ok;a++){
      px=(0.03+Math.random()*0.94)*W;
      py=(0.05+Math.random()*0.90)*H;
      ok=nodes.every(m=>Math.hypot(px-m.x,py-m.y)>minD);
    }
    nodes.push({
      x:px,y:py,
      ox:0,oy:0,phase:Math.random()*Math.PI*2,
      r:2.2+Math.random()*1.8,glow:0,
      neighbors:[]
    });
  }
  nodes.forEach((n,i)=>{
    const dists=nodes.map((m,j)=>({j,d:i===j?Infinity:Math.hypot(n.x-m.x,n.y-m.y)}))
      .sort((a,b)=>a.d-b.d).slice(0,3);
    dists.forEach(({j})=>{
      const key=i<j?`${i}-${j}`:`${j}-${i}`;
      if(!links.some(l=>l.key===key)){
        links.push({key,a:i,b:j,lit:0});
        n.neighbors.push(j);nodes[j].neighbors.push(i);
      }
    });
  });
  // ---- register the portrait as a node in the topology ----
  if(portraitEl){
    portraitEl.style.transform='';
    const hr=hero.getBoundingClientRect();
    const pr=portraitEl.getBoundingClientRect();
    const cx=pr.left-hr.left+pr.width/2;
    const cy=pr.top-hr.top+pr.width*(190/340); // circle center in the svg
    portraitR=pr.width*(150/340);
    portraitIdx=nodes.length;
    const pn={x:cx,y:cy,ox:0,oy:0,phase:0,r:0,glow:0,neighbors:[],isPortrait:true};
    nodes.push(pn);
    // connect the portrait to its 3 nearest routers
    const near=nodes.slice(0,portraitIdx)
      .map((m,j)=>({j,d:Math.hypot(pn.x-m.x,pn.y-m.y)}))
      .sort((a,b)=>a.d-b.d).slice(0,3);
    near.forEach(({j})=>{
      links.push({key:`${j}-${portraitIdx}`,a:j,b:portraitIdx,lit:0});
      pn.neighbors.push(j);nodes[j].neighbors.push(portraitIdx);
    });
  }
}

function bfsPath(src,dst){
  const prev=Array(nodes.length).fill(-1), q=[src], seen=new Set([src]);
  while(q.length){
    const c=q.shift();
    if(c===dst)break;
    for(const nb of nodes[c].neighbors){
      if(!seen.has(nb)){seen.add(nb);prev[nb]=c;q.push(nb);}
    }
  }
  if(prev[dst]===-1&&src!==dst)return null;
  const path=[dst];let c=dst;
  while(c!==src){c=prev[c];if(c===-1)return null;path.unshift(c);}
  return path;
}
function linkOf(a,b){const key=a<b?`${a}-${b}`:`${b}-${a}`;return links.find(l=>l.key===key);}
function pos(i){const n=nodes[i];return[n.x+n.ox,n.y+n.oy];}

/* ---- session state machine ---- */
let session=null,nextSessionAt=1200;
function startSession(time){
  const toPortrait=portraitIdx>=0&&Math.random()<.55;
  for(let tries=0;tries<14;tries++){
    const src=Math.floor(Math.random()*(portraitIdx>=0?portraitIdx:nodes.length));
    const dst=toPortrait?portraitIdx:Math.floor(Math.random()*(portraitIdx>=0?portraitIdx:nodes.length));
    if(src===dst)continue;
    const path=bfsPath(src,dst);
    if(path&&path.length>=4&&path.length<=7){
      session={path,stage:'discover',t:0,started:time,
        segs:path.length-1,label:null,pkt:null,burst:[]};
      return;
    }
  }
  nextSessionAt=time+800;
}
function sessionPacket(label,dir){ // dir 1 = src→dst, -1 = dst→src
  return {label,dir,seg:dir===1?0:session.segs-1,t:0,speed:.045};
}

function zoneDim(x){ // fade factor over the text column (left ~55% on wide screens)
  if(W<821)return 1;
  if(x>W*0.58)return 1;
  return 0.45+0.55*Math.max(0,(x-W*0.2))/(W*0.38);
}
function drawLabel(x,y,text,alpha){
  alpha*=zoneDim(x);
  ctx.font='500 10px "JetBrains Mono",monospace';
  const w=ctx.measureText(text).width+12;
  ctx.fillStyle=`rgba(${PAPER},${alpha*.95})`;
  ctx.strokeStyle=`rgba(${ACCENT},${alpha*.7})`;
  ctx.lineWidth=1;
  const bx=x-w/2,by=y-24;
  ctx.beginPath();ctx.roundRect(bx,by,w,16,8);ctx.fill();ctx.stroke();
  ctx.fillStyle=`rgba(${ACCENT},${alpha})`;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,x,by+8.5);
}

function stepSession(dt,time){
  if(!session){if(time>nextSessionAt)startSession(time);return;}
  const s=session;
  const P=s.path;
  if(s.stage==='discover'){
    // light the route segment by segment
    s.t+=dt*0.004;
    const lit=Math.min(s.segs,s.t);
    for(let i=0;i<s.segs;i++){
      const l=linkOf(P[i],P[i+1]);
      if(l)l.lit=Math.max(l.lit,Math.min(1,lit-i));
    }
    nodes[P[0]].glow=Math.min(1,nodes[P[0]].glow+dt*.004);
    if(lit>=s.segs){s.stage='syn';s.pkt=sessionPacket('SYN',1);}
  }
  else if(['syn','synack','ack'].includes(s.stage)){
    const p=s.pkt;p.t+=p.speed;
    if(p.t>=1){
      p.seg+=p.dir;p.t=0;
      const done=p.dir===1? p.seg>=s.segs : p.seg<0;
      if(done){
        const endNode=p.dir===1?P[s.segs]:P[0];
        nodes[endNode].glow=1;
        if(s.stage==='syn'){s.stage='synack';s.pkt=sessionPacket('SYN·ACK',-1);}
        else if(s.stage==='synack'){s.stage='ack';s.pkt=sessionPacket('ACK',1);}
        else{s.stage='data';s.pkt=null;
          for(let i=0;i<9;i++)s.burst.push({seg:0,t:-i*.14,speed:.05});
        }
      }
    }
  }
  else if(s.stage==='data'){
    let alive=false;
    for(const b of s.burst){
      b.t+=b.speed;
      if(b.t>=1&&b.seg<s.segs-1){b.seg++;b.t=0;}
      if(!(b.seg>=s.segs-1&&b.t>=1))alive=true;
    }
    if(!alive){
      s.stage='done';s.t=0;
      const endIdx=P[s.segs];
      let [x,y]=pos(endIdx);
      let label='✓ established';
      if(endIdx===portraitIdx){
        const [px,py]=pos(P[s.segs-1]);
        const dx=px-x,dy=py-y,d=Math.hypot(dx,dy)||1;
        x+=dx/d*portraitR; y+=dy/d*portraitR;
        label='✓ delivered';
        portraitEl.classList.remove('hit');void portraitEl.offsetWidth;
        portraitEl.classList.add('hit');
      }
      pulses.push({x,y,r:4,alpha:.55,label,la:1});
    }
  }
  else if(s.stage==='done'){
    s.t+=dt*.002;
    for(let i=0;i<s.segs;i++){const l=linkOf(P[i],P[i+1]);if(l)l.lit=Math.max(0,l.lit-dt*.0015);}
    if(s.t>1.4){session=null;nextSessionAt=time+1600+Math.random()*1200;}
  }
}

let last=0;
function frame(time){
  const dt=Math.min(50,time-last);last=time;
  ctx.clearRect(0,0,W,H);
  floatY=-6+6*Math.cos(time/955); // gentle 6s float
  if(portraitEl&&!reduced)portraitEl.style.transform=`translateY(${floatY}px)`;
  nodes.forEach(n=>{
    if(n.isPortrait){n.ox=0;n.oy=floatY;n.glow=Math.max(0,n.glow-dt*.0012);return;}
    n.ox=Math.sin(time/2600+n.phase)*4;
    n.oy=Math.cos(time/3100+n.phase)*4;
    n.glow=Math.max(0,n.glow-dt*.0012);
  });
  // base links + lit route
  links.forEach(l=>{
    const [ax,ay]=pos(l.a),[bx,by]=pos(l.b);
    ctx.lineWidth=1;
    ctx.strokeStyle=`rgba(${SLATE},.15)`;
    ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
    if(l.lit>0){
      ctx.lineWidth=1.6;
      ctx.strokeStyle=`rgba(${ACCENT},${.45*l.lit})`;
      ctx.setLineDash([5,5]);ctx.lineDashOffset=-time/22;
      ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  stepSession(dt,time);
  // handshake packet with label
  if(session&&session.pkt&&['syn','synack','ack'].includes(session.stage)){
    const p=session.pkt,P=session.path;
    const i=Math.max(0,Math.min(session.segs-1,p.seg));
    const a=pos(P[p.dir===1?i:i+1]),b=pos(P[p.dir===1?i+1:i]);
    const x=a[0]+(b[0]-a[0])*p.t, y=a[1]+(b[1]-a[1])*p.t;
    ctx.fillStyle=`rgba(${ACCENT},1)`;
    ctx.beginPath();ctx.arc(x,y,3.4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=`rgba(${ACCENT},.35)`;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(x,y,6.5,0,Math.PI*2);ctx.stroke();
    drawLabel(x,y,p.label,1);
  }
  // data burst
  if(session&&session.stage==='data'){
    const P=session.path;
    for(const b of session.burst){
      if(b.t<0)continue;
      const i=Math.max(0,Math.min(session.segs-1,b.seg));
      const a=pos(P[i]),c=pos(P[i+1]);
      const t=Math.min(1,b.t);
      const x=a[0]+(c[0]-a[0])*t, y=a[1]+(c[1]-a[1])*t;
      ctx.fillStyle=`rgba(${ACCENT},.85)`;
      ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();
    }
  }
  // pulses with labels
  for(let i=pulses.length-1;i>=0;i--){
    const u=pulses[i];
    u.r+=dt*.05;u.alpha-=dt*.0007;u.la-=dt*.0006;
    if(u.alpha<=0){pulses.splice(i,1);continue;}
    ctx.strokeStyle=`rgba(${ACCENT},${Math.max(0,u.alpha)})`;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.arc(u.x,u.y,u.r,0,Math.PI*2);ctx.stroke();
    if(u.la>0)drawLabel(u.x,u.y-6,u.label,Math.max(0,u.la));
  }
  // nodes
  nodes.forEach(n=>{
    if(n.isPortrait)return;
    if(n.glow>0){
      ctx.fillStyle=`rgba(${ACCENT},${.18*n.glow})`;
      ctx.beginPath();ctx.arc(n.x+n.ox,n.y+n.oy,n.r+7,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle=n.glow>.15?`rgba(${ACCENT},${.45+.5*n.glow})`:`rgba(${SLATE},.5)`;
    ctx.beginPath();ctx.arc(n.x+n.ox,n.y+n.oy,n.r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(${PAPER},1)`;
    ctx.beginPath();ctx.arc(n.x+n.ox,n.y+n.oy,n.r*.42,0,Math.PI*2);ctx.fill();
  });
  requestAnimationFrame(frame);
}

buildTopology();
window.addEventListener('resize',buildTopology);
if(!reduced){
  requestAnimationFrame(t=>{last=t;frame(t);});
}else{
  links.forEach(l=>{const a=nodes[l.a],b=nodes[l.b];
    ctx.strokeStyle=`rgba(${SLATE},.16)`;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
  nodes.forEach(n=>{ctx.fillStyle=`rgba(${SLATE},.5)`;ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fill();});
}


// ---------- 3d tilt on cards & project rows (desktop, motion-safe) ----------
if(!reduced && matchMedia('(pointer:fine)').matches){
  document.querySelectorAll('.card,.project').forEach(el=>{
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const px=(e.clientX-r.left)/r.width-.5;
      const py=(e.clientY-r.top)/r.height-.5;
      el.style.transform=`perspective(760px) rotateX(${(-py*4).toFixed(2)}deg) rotateY(${(px*5).toFixed(2)}deg) translateY(-4px)`;
    },{passive:true});
    el.addEventListener('mouseleave',()=>{el.style.transform='';});
  });
}


// ---------- cozy ambient music (Web Audio — generated live, no audio files, no requests) ----------
(()=>{
  const btn=document.getElementById('musicBtn');
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!btn||!AC)return;

  const KEY='music', CHORD=8;                  // seconds per chord
  const mid=n=>440*Math.pow(2,(n-69)/12);      // midi note -> Hz
  // Fmaj9 · Am7 · Dm9 · B♭maj7 — warm and unhurried, loops every 32s
  const PROG=[
    {bass:41,pad:[65,69,72,76,79]},
    {bass:45,pad:[69,72,76,79]},
    {bass:38,pad:[62,65,69,72,76]},
    {bass:46,pad:[58,62,65,69]}
  ];
  // F major pentatonic — diatonic to every chord above, so stray notes can't clash
  const SCALE=[72,74,77,79,81,84,86];

  let ctx,master,rev,delay,timer,step=0,next=0,playing=false,armed=false;

  function impulse(dur,decay){
    const n=Math.floor(ctx.sampleRate*dur),b=ctx.createBuffer(2,n,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);
      for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);}
    return b;
  }

  function build(){
    ctx=new AC();
    master=ctx.createGain();master.gain.value=0;
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-18;comp.ratio.value=3;
    master.connect(comp);comp.connect(ctx.destination);

    rev=ctx.createConvolver();rev.buffer=impulse(3.2,2.4);
    const wet=ctx.createGain();wet.gain.value=.5;
    rev.connect(wet);wet.connect(master);

    delay=ctx.createDelay(1);delay.delayTime.value=.42;
    const fb=ctx.createGain();fb.gain.value=.34;
    const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=1800;
    delay.connect(tone);tone.connect(fb);fb.connect(delay);
    delay.connect(master);delay.connect(rev);

    // barely-there tape hiss — the thing that makes it feel cosy rather than clinical
    const nb=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate),nd=nb.getChannelData(0);
    for(let i=0;i<nd.length;i++)nd[i]=(Math.random()*2-1)*.5;
    const ns=ctx.createBufferSource();ns.buffer=nb;ns.loop=true;
    const nf=ctx.createBiquadFilter();nf.type='bandpass';nf.frequency.value=1400;nf.Q.value=.6;
    const ng=ctx.createGain();ng.gain.value=.02;
    ns.connect(nf);nf.connect(ng);ng.connect(master);ns.start();
  }

  function pad(t,n){
    const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();
    o.type='triangle';o2.type='sine';
    o.frequency.value=mid(n);o2.frequency.value=mid(n);o2.detune.value=7;
    f.type='lowpass';f.frequency.value=760;f.Q.value=.6;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.05,t+2.6);
    g.gain.setValueAtTime(.05,t+CHORD-1.2);
    g.gain.linearRampToValueAtTime(0,t+CHORD+1.6);
    o.connect(f);o2.connect(f);f.connect(g);g.connect(master);g.connect(rev);
    o.start(t);o2.start(t);o.stop(t+CHORD+1.8);o2.stop(t+CHORD+1.8);
  }

  function bass(t,n){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=mid(n);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.13,t+1.4);
    g.gain.linearRampToValueAtTime(0,t+CHORD+1);
    o.connect(g);g.connect(master);
    o.start(t);o.stop(t+CHORD+1.2);
  }

  function pluck(t,n){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=mid(n);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.085,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+2.2);
    o.connect(g);g.connect(master);g.connect(delay);g.connect(rev);
    o.start(t);o.stop(t+2.3);
  }

  function schedule(){
    while(next<ctx.currentTime+1.5){
      const c=PROG[step%PROG.length];
      c.pad.forEach(n=>pad(next,n));
      bass(next,c.bass);
      const drops=2+Math.floor(Math.random()*3);
      for(let i=0;i<drops;i++)pluck(next+Math.random()*CHORD,SCALE[Math.floor(Math.random()*SCALE.length)]);
      next+=CHORD;step++;
    }
  }

  function paint(){
    btn.classList.toggle('playing',playing);
    btn.setAttribute('aria-pressed',playing?'true':'false');
    btn.setAttribute('aria-label',playing?'Turn ambient music off':'Turn ambient music on');
  }

  async function start(){
    if(playing)return;
    if(!ctx)build();
    try{await ctx.resume();}catch(e){return;}
    playing=true;
    if(next<ctx.currentTime)next=ctx.currentTime+.15;   // context clock froze while suspended
    const t=ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value,t);
    master.gain.linearRampToValueAtTime(.62,t+2.2);
    schedule();
    timer=setInterval(schedule,300);
    paint();
  }

  function stop(){
    if(!playing)return;
    playing=false;
    clearInterval(timer);timer=null;
    const t=ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value,t);
    master.gain.linearRampToValueAtTime(0,t+1.2);
    setTimeout(()=>{if(!playing&&ctx)ctx.suspend().catch(()=>{});},1500);
    paint();
  }

  btn.addEventListener('click',()=>{
    disarm();
    if(playing){localStorage.setItem(KEY,'off');stop();}
    else{localStorage.setItem(KEY,'on');start();}
  });

  // No browser allows audible sound before a gesture, so "on by default" means armed:
  // it fades in on whatever the visitor touches first.
  const EVS=['pointerdown','keydown','wheel','touchstart','scroll'];
  function disarm(){if(!armed)return;armed=false;EVS.forEach(e=>removeEventListener(e,go));}
  function go(e){
    if(e&&e.target&&e.target.closest&&e.target.closest('#musicBtn'))return; // let the button speak for itself
    disarm();start();
  }
  if(localStorage.getItem(KEY)!=='off'){
    armed=true;
    EVS.forEach(e=>addEventListener(e,go,{passive:true}));
  }

  // don't keep playing into a tab nobody's looking at
  document.addEventListener('visibilitychange',()=>{
    if(!ctx||!playing)return;
    document.hidden?ctx.suspend().catch(()=>{}):ctx.resume().catch(()=>{});
  });
})();



// ---------- ask-Kushal: portrait avatar (cursor parallax) + local answer engine ----------
// Runs entirely in the browser. No API, no key, no network call — so it cannot
// fail, cost anything, or be abused. It only knows what is written below.
(()=>{
  const root=document.getElementById('ask');
  if(!root)return;
  const avatar=document.getElementById('askAvatar'),panel=document.getElementById('askPanel'),
        log=document.getElementById('askLog'),form=document.getElementById('askForm'),
        input=document.getElementById('askInput'),send=document.getElementById('askSend'),
        closeBtn=document.getElementById('askClose'),chips=document.getElementById('askChips'),
        photo=root.querySelector('.ask-photo');

  const KB=[
    {k:['hello','hi','hey','morning','evening','greetings'],
     a:"Hello. Ask me about Kushal's projects, his course, or what he's working on."},
    {k:['who','about','yourself','background','introduce'],
     a:"Kushal Basnet is a second-year Computing Systems student at Ulster University's London campus, with roots in Kathmandu. He builds across the stack — web, PHP, Java and Python — and is going deep on networking and traffic analysis."},
    {k:['study','studying','university','uni','course','degree','college','ulster','school'],
     a:"He's in his second year of Computing Systems at Ulster University, London campus. Current module work includes server-side PHP and the Programming in Practice Java module."},
    {k:['project','projects','built','build','made','portfolio','showcase'],
     a:"Five so far: the WeARit e-commerce site (group coursework, and it's live), server-side PHP module work, an SSL/TLS traffic analysis in Wireshark, a High Card card game in Java, and a switch-and-router lab network on Cisco IOS. Ask about any of them."},
    {k:['wearit','ecommerce','commerce','shop','store','cart'],
     a:"WeARit is a multi-page e-commerce site he built with a four-person team for Computer Systems Development — product pages, cart flow and responsive layout, written from scratch in HTML, CSS and JavaScript. It's live: the project card above links straight to the working shop."},
    {k:['php','backend','sessions','forms'],
     a:"PHP is his current module. He's building dynamic server-side applications — handling forms, sessions and database-driven pages, and learning how the back end of the web actually fits together."},
    {k:['ssl','tls','wireshark','traffic','packet','pcap','handshake','encryption','cipher'],
     a:"He captured and analysed encrypted web traffic in Wireshark — inspecting TLS handshakes, cipher suites and certificate exchange — then presented the findings in a recorded group vodcast and slide deck."},
    {k:['java','card','game','oop','object','intellij'],
     a:"The High Card Series game is a Java application for his Programming in Practice module: object-oriented design, game logic and console interaction, built in IntelliJ."},
    {k:['network','networking','cisco','ccna','router','switch','vlan','subnet','lab'],
     a:"He designed and configured a small routed network on Cisco IOS — VLANs, interface addressing and device hardening — and verified end-to-end connectivity from the CLI. Networking and traffic analysis are where he's going deepest."},
    {k:['skill','skills','tech','stack','technologies','know','languages','language','tools'],
     a:"Web: HTML, CSS, JavaScript and PHP. Programming: Python, Java, OOP, SQL and Git. Networking and security: TCP/IP, subnetting, Cisco IOS, VLANs, Wireshark and SSL/TLS. Plus data analytics, R and databases."},
    {k:['python'],
     a:"Python is part of his programming toolkit alongside Java, used across coursework and smaller projects."},
    {k:['intern','internship','hire','hiring','job','available','opportunity','recruit','placement'],
     a:"Yes — he's open to internships. The contact section below has his email and his LinkedIn, and he answers."},
    {k:['contact','email','reach','touch','message','linkedin','github','connect'],
     a:"Scroll to the contact section at the bottom — his email is there with a copy button, plus GitHub and LinkedIn."},
    {k:['where','live','based','london','location','from','nepal','kathmandu','city'],
     a:"He's based in London, studying at Ulster University's London campus. Originally from Kathmandu, Nepal."},
    {k:['website','site','domain'],
     a:"This site is his own — hand-written HTML, CSS and JavaScript on his own domain, with the packet-routing animation in the hero drawn on a canvas."},
    {k:['thanks','thank','cheers','appreciate','great','nice','cool','awesome'],
     a:"Any time. Have a look at the projects above, or use the contact section to reach him directly."}
  ];
  const FALLBACK="I only know about Kushal's projects, course and skills — I don't have an answer for that one. The contact section below is the best way to ask him directly.";

  // Whole-word matching only — substring matching made "his" match "hi".
  // Longer keywords score higher so a specific topic beats a generic one
  // ("wearit" outranks "about" in "tell me about WeARit").
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  KB.forEach(e=>{e.rx=e.k.map(k=>({w:k.length,re:new RegExp('\\b'+esc(k)+'\\b','i')}));});
  function answerFor(q){
    let best=null,bestScore=0;
    for(const entry of KB){
      let score=0;
      for(const m of entry.rx) if(m.re.test(q)) score+=m.w;
      if(score>bestScore){bestScore=score;best=entry;}
    }
    return bestScore>0?best.a:FALLBACK;
  }

  /* depth: the disc tilts toward the cursor and the photo drifts the other way,
     which is what reads as three-dimensional rather than a flat sticker */
  if(!reduced && matchMedia('(pointer:fine)').matches){
    addEventListener('mousemove',e=>{
      const r=avatar.getBoundingClientRect();
      const dx=(e.clientX-(r.left+r.width/2))/innerWidth;
      const dy=(e.clientY-(r.top+r.height/2))/innerHeight;
      const near=Math.max(0,1-Math.hypot(dx,dy)*1.5);
      avatar.style.transform='perspective(420px) rotateY('+(dx*22).toFixed(2)+'deg) rotateX('+(-dy*22).toFixed(2)+'deg) scale('+(1+near*.04)+')';
      photo.style.transform='translate('+(-dx*9).toFixed(2)+'px,'+(-dy*9).toFixed(2)+'px)';
    },{passive:true});
  }

  let open=false,busy=false;
  function bubble(cls,text){
    const el=document.createElement('div');
    el.className='ask-msg '+cls;
    el.textContent=text||'';
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  }
  function setOpen(v){
    open=v;panel.hidden=!v;
    avatar.setAttribute('aria-expanded',v?'true':'false');
    if(v){
      if(!log.childElementCount)bubble('bot',"Hi — I'm Kushal's assistant. Ask me about his projects, his course, or what he's working on.");
      setTimeout(()=>input.focus(),80);
    }
  }
  avatar.addEventListener('click',()=>setOpen(!open));
  closeBtn.addEventListener('click',()=>setOpen(false));
  addEventListener('keydown',e=>{if(e.key==='Escape'&&open)setOpen(false);});
  chips.addEventListener('click',e=>{
    const b=e.target.closest('button');
    if(!b)return;
    input.value=b.textContent;form.requestSubmit();
  });

  function ask(question){
    if(busy)return;
    busy=true;send.disabled=true;chips.hidden=true;
    bubble('you',question);
    const text=answerFor(question);
    const el=bubble('bot','');
    el.classList.add('ask-typing');
    el.innerHTML='<span></span><span></span><span></span>';
    // brief think, then reveal — keeps the cadence of a real conversation
    setTimeout(()=>{
      el.classList.remove('ask-typing');el.textContent='';
      if(reduced){el.textContent=text;busy=false;send.disabled=false;log.scrollTop=log.scrollHeight;return;}
      let i=0;
      (function type(){
        el.textContent=text.slice(0,i+=2);
        log.scrollTop=log.scrollHeight;
        if(i<text.length)setTimeout(type,12);
        else{busy=false;send.disabled=false;}
      })();
    },420+Math.random()*320);
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();
    const q=input.value.trim();
    if(!q||busy)return;
    input.value='';ask(q);
  });
})();
