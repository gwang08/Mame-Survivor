// Mame Survivor — entities: player, enemy meme-coins, bullets, xp gems + spawning/drawing
const imgs = {};
function loadImg(key, src){ const i=new Image(); i.src=ver(src); imgs[key]=i; }
loadImg('player','assets/doge-sprite.png');
loadImg('mame','assets/doge-mame.png');
loadImg('boss','assets/enemy-boss-doge.png');
loadImg('gun','assets/gun.png');
// stage boss roster — 3-stage campaign: Pump.fun's enforcers, then the boss himself
const BOSS_ROSTER = [
  {img:'boss-chillguy', name:'CHILLGUY',       ring:'#c9a06a'},
  {img:'boss-penguin',  name:'PENGUIN',        ring:'#6fd0e6'},
  {img:'boss-asteroid', name:'ASTEROID SHIBA', ring:'#ff8a3c'},
];
BOSS_ROSTER.forEach(b=>loadImg(b.img,'assets/'+b.img+'.png'));
['wif','bonk','peanut','popcat','sahur'].forEach(k=>loadImg(k,'assets/coins/'+k+'.png'));

// ---- playable characters (distinct sprite + a starting perk) ----
const CHARACTERS = [
  {key:'player', file:'assets/doge-sprite.png', name:'MAME', perk:'🐕 The Last Shiba', glow:'#ffd45e',
   apply:p=>{}},
];

// ---- player ----
const player = {
  x:0, y:0, speed:3.0, size:56, skin:'player',
  hp:100, maxHp:100, xp:0, level:1, xpNext:5,
  fireCd:0, fireRate:32, damage:10, bullets:1, bulletSpeed:7, pierce:0, bulletSize:7, range:540,
  pickup:95, kills:0, iframe:0, regen:0, aim:0, muzzle:0,
};

const bullets = [], enemies = [], gems = [];

// ---- enemy meme-coin archetypes (full-body sprites with baked-in weapons) ----
const COIN_TYPES = [
  {img:'wif',    name:'WIF',             ring:'#ff9ad1', hp:16, speed:1.9, dmg:7,  size:80, xp:1},
  {img:'peanut', name:'PEANUT',          ring:'#d08a48', hp:22, speed:1.7, dmg:8,  size:80, xp:1},
  {img:'popcat', name:'POPCAT',          ring:'#f0d8b0', hp:34, speed:1.5, dmg:9,  size:86, xp:2},
  {img:'bonk',   name:'BONK',            ring:'#ffb028', hp:58, speed:1.4, dmg:12, size:90, xp:4},
  {img:'sahur',  name:'TUNG TUNG SAHUR', ring:'#b8884a', hp:92, speed:1.2, dmg:14, size:98, xp:5},
];

function spawnEnemy(t, x, y, boss=false){
  enemies.push({ ...t, x, y, maxHp:t.hp, hp:t.hp, hit:0, boss });
}

function spawnWave(elapsed){
  if(enemies.length > 150) return;      // cap keeps FPS high (O(n^2) separation)
  const radius = Math.max(VW,VH)*0.62 + 80, ang = Math.random()*7;
  const x = player.x + Math.cos(ang)*radius, y = player.y + Math.sin(ang)*radius;
  const hard = elapsed/60; // minutes survived
  // tougher coins appear more often over time
  let pool = COIN_TYPES.slice(0, Math.min(COIN_TYPES.length, 2 + Math.floor(hard*2)+1));
  const t = pool[Math.floor(Math.random()*pool.length)];
  spawnEnemy({...t, hp: Math.round(t.hp*(1+hard*0.55))}, x, y);
}

function spawnBoss(){
  const radius = Math.max(VW,VH)*0.62+80, ang=Math.random()*7;
  spawnEnemy({img:'boss',ring:'#ff3030',hp:1400,speed:0.95,dmg:26,size:128,xp:60,weapon:'⚔️'},
             player.x+Math.cos(ang)*radius, player.y+Math.sin(ang)*radius, true);
}
// big stage boss — bigger / tankier / harder each stage, cycling the roster
function spawnStageBoss(stage){
  const r = BOSS_ROSTER[actOf(stage)];   // boss themed to the act/world
  const hp = Math.round(700 + stage*150);
  const size = Math.min(150 + stage*5, 300);
  const dmg = Math.min(26 + stage*2, 80);
  const ang=Math.random()*7, radius=Math.max(VW,VH)*0.6+150;
  const e = { img:r.img, name:r.name, ring:r.ring, hp, maxHp:hp, hit:0, boss:true, stageBoss:true,
    speed:0.80, dmg, size, xp:200,
    x:player.x+Math.cos(ang)*radius, y:player.y+Math.sin(ang)*radius };
  enemies.push(e);
  return e;
}

// ---- auto weapon ----
function nearestEnemy(){
  let best=null, bd=player.range*player.range;
  for(const e of enemies){ const d=dist2(e.x,e.y,player.x,player.y); if(d<bd){ bd=d; best=e; } }
  return best;
}
function fire(){
  if(!player.firing) return;              // only when there's a target (set by game loop)
  const base = player.aim, spread=0.17;
  for(let i=0;i<player.bullets;i++){
    const a = base + (i-(player.bullets-1)/2)*spread;
    bullets.push({ x:player.x, y:player.y, vx:Math.cos(a)*player.bulletSpeed, vy:Math.sin(a)*player.bulletSpeed,
                   dmg:player.damage, pierce:player.pierce, size:player.bulletSize, life:80, hits:[], from:player });
  }
  player.muzzle = 5;             // flash frames
  gunshot();
}

// ---- drawing ----
function drawImgCentered(key, X, Y, size){
  const i=imgs[key]; if(!i||!i.complete||!i.width) return false;
  const ar=i.width/i.height, h=size, w=size*ar;
  ctx.drawImage(i, X-w/2, Y-h/2, w, h); return true;
}
function drawPlayer(){
  const X=sx(player.x), Y=sy(player.y);
  const blink = player.iframe>0 && Math.floor(player.iframe/3)%2;
  // dog body
  ctx.save();
  if(blink) ctx.globalAlpha=0.4;
  ctx.shadowColor='#ffd45e'; ctx.shadowBlur=22;
  if(!drawImgCentered(player.skin,X,Y,player.size)){
    ctx.fillStyle='#222'; ctx.beginPath(); ctx.arc(X,Y,player.size/2,0,7); ctx.fill();
  }
  ctx.restore();
  // gun aiming toward nearest enemy
  drawGun(X, Y+6, player.aim, blink);
}

function drawGun(X, Y, aim, blink){
  const g=imgs.gun; if(!g||!g.complete) return;
  const gw=54, scale=gw/g.width, gripX=95, gripY=100; // pivot near grip in source px
  const left = Math.cos(aim)<0;                        // aiming left -> flip vertically
  ctx.save();
  if(blink) ctx.globalAlpha=0.5;
  ctx.translate(X, Y); ctx.rotate(aim); if(left) ctx.scale(1,-1);
  ctx.shadowColor='#36d6ff'; ctx.shadowBlur=8;
  ctx.drawImage(g, -gripX*scale, -gripY*scale, g.width*scale, g.height*scale);
  // muzzle flash at barrel tip
  if(player.muzzle>0){
    const mx=(g.width-18)*scale - gripX*scale, my=(98)*scale - gripY*scale;
    ctx.fillStyle='#fff6a0'; ctx.shadowColor='#ffd45e'; ctx.shadowBlur=20;
    ctx.beginPath(); ctx.arc(mx, my, 6+player.muzzle*1.6, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function drawEnemy(e){
  const X=sx(e.x), Y=sy(e.y);
  if(X<-80||X>VW+80||Y<-80||Y>VH+80) return; // cull off-screen
  ctx.save();
  ctx.shadowColor=e.ring; ctx.shadowBlur=e.boss?30:0;   // glow only on bosses (perf)
  if(e.hit>0){ ctx.filter='brightness(2.2)'; }
  drawImgCentered(e.img, X, Y, e.size);
  ctx.restore();
  // weapon (knife / hammer / axe) on the side facing the player, with a little swing
  if(e.weapon){
    const left = player.x < e.x;                              // player on enemy's left?
    const swing = Math.sin(frame*0.18 + e.x*0.05) * 0.35;     // small upright wobble
    const wx = X + (left?-1:1)*e.size*0.55, wy = Y + e.size*0.12;
    ctx.save(); ctx.translate(wx, wy);
    if(left) ctx.scale(-1,1);                                 // mirror to face the player (stays upright)
    ctx.rotate(swing);
    ctx.shadowColor='#000'; ctx.shadowBlur=6;
    ctx.font=(e.boss?78:Math.round(e.size*1.05))+'px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(e.weapon, 0, 0); ctx.restore();
  }
  if(e.boss || e.hp<e.maxHp){
    const w=e.size, h=e.boss?6:4, by=Y-e.size*0.62-h-2;
    ctx.fillStyle='#000a'; ctx.fillRect(X-w/2,by,w,h);
    ctx.fillStyle=e.boss?'#ff3b3b':'#5ed36b'; ctx.fillRect(X-w/2,by,w*clamp(e.hp/e.maxHp,0,1),h);
  }
  // monster name above the head
  if(e.name){
    const ny = Y - e.size*0.62 - (e.boss?11:7);
    ctx.save();
    ctx.font = 'bold '+(e.boss?14:10)+'px Trebuchet MS';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.strokeText(e.name, X, ny);
    ctx.fillStyle=e.ring||'#fff'; ctx.fillText(e.name, X, ny);
    ctx.restore();
  }
}
function drawBullet(b){
  ctx.fillStyle='#ffe27a';
  ctx.beginPath(); ctx.arc(sx(b.x),sy(b.y),b.size,0,7); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx(b.x),sy(b.y),b.size*0.45,0,7); ctx.fill();
}
function drawGem(g){
  const X=sx(g.x), Y=sy(g.y), s=g.big?7:5;
  ctx.fillStyle='#36d6ff';
  ctx.beginPath(); ctx.moveTo(X,Y-s); ctx.lineTo(X+s,Y); ctx.lineTo(X,Y+s); ctx.lineTo(X-s,Y); ctx.closePath(); ctx.fill();
}
