// Mame Survivor — core engine: canvas, input, camera, particles, audio, helpers
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let VW = 0, VH = 0;
const VER = '20';                      // bump on deploy to bust browser cache of assets
const ver = u => u + (u.includes('?')?'&':'?') + 'v=' + VER;
function resize(){ VW = cv.width = window.innerWidth; VH = cv.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// ---- math helpers ----
const rand   = (a,b)=> a + Math.random()*(b-a);
const clamp  = (v,a,b)=> v<a?a:v>b?b:v;
const lerp   = (a,b,t)=> a+(b-a)*t;
const dist2  = (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; };

// ---- camera (follows player, supports screen shake) ----
const cam = { x:0, y:0, shake:0 };
function addShake(v){ cam.shake = Math.min(26, cam.shake + v); }
function camOffset(){ return cam.shake>0.2 ? { x:(Math.random()-0.5)*cam.shake, y:(Math.random()-0.5)*cam.shake } : {x:0,y:0}; }
const sx = x => x - cam.x + VW/2;   // world -> screen X
const sy = y => y - cam.y + VH/2;   // world -> screen Y

// ---- audio (tiny WebAudio SFX) ----
let AC, muted=false;
let sfxVol  = parseFloat(localStorage.getItem('mame_sfxvol')  ?? '0.8');   // 0..1
let musicVol= parseFloat(localStorage.getItem('mame_musicvol') ?? '0.5');  // 0..1
function ensureAC(){ try{ AC = AC || new (window.AudioContext||window.webkitAudioContext)(); return AC; }catch(e){ return null; } }
function beep(freq, dur, type='square', vol=0.05){
  if(muted || sfxVol<=0) return;
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=vol*sfxVol;
    o.connect(g); g.connect(AC.destination); o.start();
    o.frequency.exponentialRampToValueAtTime(freq*0.6, AC.currentTime+dur);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+dur);
    o.stop(AC.currentTime+dur);
  }catch(e){}
}

// ---- keyboard input ----
const keys = {};
window.addEventListener('keydown', e=>{ keys[e.key.toLowerCase()]=true;
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

// ---- floating joystick (touch) ----
const joy = { active:false, ox:0, oy:0, dx:0, dy:0 };
cv.addEventListener('touchstart', e=>{ const t=e.touches[0]; joy.active=true; joy.ox=t.clientX; joy.oy=t.clientY; joy.dx=0; joy.dy=0; e.preventDefault(); }, {passive:false});
cv.addEventListener('touchmove',  e=>{ if(!joy.active)return; const t=e.touches[0]; joy.dx=clamp((t.clientX-joy.ox)/60,-1,1); joy.dy=clamp((t.clientY-joy.oy)/60,-1,1); e.preventDefault(); }, {passive:false});
cv.addEventListener('touchend',   e=>{ joy.active=false; joy.dx=0; joy.dy=0; }, {passive:false});

function moveVec(){
  let x=0,y=0;
  if(keys['w']||keys['arrowup'])y-=1;
  if(keys['s']||keys['arrowdown'])y+=1;
  if(keys['a']||keys['arrowleft'])x-=1;
  if(keys['d']||keys['arrowright'])x+=1;
  if(joy.active){ x=joy.dx; y=joy.dy; }
  const m=Math.hypot(x,y); if(m>1){ x/=m; y/=m; }
  return {x,y};
}

// ---- particles ----
const particles = [];
function burst(x,y,color,n,spd=4,sz=4,life=28){
  for(let i=0;i<n;i++){ const a=Math.random()*7, s=rand(spd*0.3,spd);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,max:life,color,size:rand(sz*0.5,sz)}); }
}
function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){ const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vx*=0.92; p.vy*=0.92; p.life--; if(p.life<=0)particles.splice(i,1); }
}
function drawParticles(){
  for(const p of particles){ ctx.globalAlpha=p.life/p.max; ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(sx(p.x),sy(p.y),p.size*(p.life/p.max),0,7); ctx.fill(); }
  ctx.globalAlpha=1;
}

// ---- floating damage numbers ----
const floaters = [];
function floatText(x,y,txt,color){ floaters.push({x,y,txt,color,life:36,max:36}); }
function updateFloaters(){ for(let i=floaters.length-1;i>=0;i--){ const f=floaters[i]; f.y-=0.8; f.life--; if(f.life<=0)floaters.splice(i,1); } }
function drawFloaters(){ ctx.textAlign='center';
  for(const f of floaters){ ctx.globalAlpha=f.life/f.max; ctx.fillStyle=f.color; ctx.font='bold 16px Trebuchet MS'; ctx.fillText(f.txt,sx(f.x),sy(f.y)); }
  ctx.globalAlpha=1;
}
