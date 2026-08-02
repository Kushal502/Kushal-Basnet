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

// brand click — always return to the very top of the page.
// The bare #top anchor lands on <main>, which starts below the header,
// and repeat clicks on an already-current hash do nothing at all.
document.querySelector('.brand').addEventListener('click',e=>{
  e.preventDefault();
  history.replaceState(null,'','#top');
  window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});
});

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

  // Deliberately not the old 'music' key. An earlier build could show the button as
  // playing while silent, so anyone who clicked it to "start" the music actually stored
  // 'off' — a preference they never meant to set, which then survived every reload.
  // Moving the key retires those bad values; the toggle behaves normally from here.
  const KEY='music.v2', CHORD=8;               // seconds per chord
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

  let ctx,master,rev,delay,timer,step=0,next=0,playing=false,armed=false,starting=false;
  // Every oscillator we've scheduled, with the time it ends. schedule() runs up to a chord
  // ahead of the clock, so stopping has to be able to cut the ones still in the future —
  // otherwise they're waiting to fire the next time the music is switched on.
  let voices=[];
  const track=(o,end)=>voices.push({o,end});

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
    const wet=ctx.createGain();wet.gain.value=.32;
    rev.connect(wet);wet.connect(master);

    delay=ctx.createDelay(1);delay.delayTime.value=.42;
    const fb=ctx.createGain();fb.gain.value=.34;
    const tone=ctx.createBiquadFilter();tone.type='lowpass';tone.frequency.value=1800;
    delay.connect(tone);tone.connect(fb);fb.connect(delay);
    delay.connect(master);delay.connect(rev);
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
    track(o,t+CHORD+1.8);track(o2,t+CHORD+1.8);
  }

  function bass(t,n){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=mid(n);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.13,t+1.4);
    g.gain.linearRampToValueAtTime(0,t+CHORD+1);
    o.connect(g);g.connect(master);
    o.start(t);o.stop(t+CHORD+1.2);
    track(o,t+CHORD+1.2);
  }

  function pluck(t,n){
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='sine';o.frequency.value=mid(n);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(.085,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+2.2);
    o.connect(g);g.connect(master);g.connect(delay);g.connect(rev);
    o.start(t);o.stop(t+2.3);
    track(o,t+2.3);
  }

  function schedule(){
    if(voices.length)voices=voices.filter(v=>v.end>ctx.currentTime);   // notes that have finished can't be cut
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
    if(playing||starting)return;   // several armed events can land before the await below resolves
    starting=true;
    try{
      if(!ctx)build();
      try{await ctx.resume();}catch(e){return;}
      // A wheel or scroll isn't a "user activation", so the context can come back still
      // suspended. Bail quietly and stay armed for a real click/tap/keypress rather than
      // lighting the button up over silence.
      if(ctx.state!=='running')return;
      playing=true;
      // Always restart the scheduler right here, never "wherever it got to". stop() suspends the
      // context, which freezes ctx.currentTime, so next — already up to a chord and a half ahead —
      // stays in the future and the old `if(next<ctx.currentTime)` guard never fired. The result
      // was up to ~9.5s of dead silence after pressing play, with the button lit the whole time.
      next=ctx.currentTime+.15;
      const t=ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value,t);
      master.gain.linearRampToValueAtTime(.26,t+3.5);
      schedule();
      clearInterval(timer);
      timer=setInterval(schedule,300);
      paint();
    }finally{starting=false;}
  }

  function stop(){
    if(!playing)return;
    playing=false;
    clearInterval(timer);timer=null;
    const t=ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value,t);
    master.gain.linearRampToValueAtTime(0,t+1.2);
    // Cut everything still queued, just after the fade lands. Left alone these notes survive the
    // suspend and play into the next session on top of the fresh chord.
    const cut=t+1.3;
    voices.forEach(v=>{try{v.o.stop(cut);}catch(e){}});
    voices=[];
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
  // Only some of these actually grant a "user activation": pointerdown/click/keydown do,
  // touchend does on iOS where touchstart never has, and wheel/scroll never do. The ones
  // that can't will fail harmlessly against the ctx.state check and leave us armed.
  const EVS=['pointerdown','click','keydown','touchend','wheel','scroll'];
  function disarm(){if(!armed)return;armed=false;EVS.forEach(e=>removeEventListener(e,go));}
  function go(e){
    if(e&&e.target&&e.target.closest&&e.target.closest('#musicBtn'))return; // let the button speak for itself
    start().then(()=>{if(playing)disarm();});                               // only give up the arming once sound is actually running
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
