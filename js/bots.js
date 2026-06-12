// Mame Survivor — ARENA bots (slither-style): AI "players" that shoot each other,
// eat XP orbs to grow bigger, and appear on the live leaderboard. Used only in ARENA mode.

const BOT_NAMES = [
  'Alex','Daniel','Sophie','Minh Tuan','Jake','Emma','Carlos','Linh','Hiro','Olivia',
  'Kevin','Maya','Lucas','Trang','Ryan','Anna','David','Yuki','Chloe','Sang',
  'Marco','Nina','Liam','Mia','Hoang','Ethan','Grace','Tom','Bao','Julia'
];
const BOT_SKINS = ['player','mame'];
const BOT_COLORS = ['#ff6b6b','#4dd2ff','#9b7bff','#5ed36b','#ffb02e','#ff7ad9','#7af0c0'];

let bots = [];
let gameMode = localStorage.getItem('mame_mode') || 'campaign';   // 'campaign' | 'arena'

// size grows with accumulated "mass" (grow), like snake.io
function dogSize(d){ return d.baseSize + Math.min(d.grow*0.35, 64); }
function applyGrow(d, amount){
  d.grow += amount;
  d.size = dogSize(d);
  d.maxHp = Math.round(d.baseHp + d.grow*1.5);
  d.hp = Math.min(d.maxHp, d.hp + amount*1.2);
  d.damage = d.baseDmg + d.grow*0.25;
}

function makeBots(count){
  bots = [];
  const names = [...BOT_NAMES].sort(()=>Math.random()-0.5).slice(0, count);
  for(let i=0;i<count;i++){
    const ang=(i/count)*Math.PI*2;
    const b={ name:names[i], skin:BOT_SKINS[i%BOT_SKINS.length], color:BOT_COLORS[i%BOT_COLORS.length],
      x:player.x+Math.cos(ang)*rand(300,560), y:player.y+Math.sin(ang)*rand(300,560),
      baseSize:50, size:50, baseHp:80, baseDmg:9, grow:rand(0,12), speed:rand(2.5,3.2),
      hp:90, maxHp:90, alive:true, respawn:0, iframe:0,
      fireCd:(i*4)%30, fireRate:Math.round(rand(26,40)), damage:9, bulletSpeed:7, aim:0, kills:0 };
    applyGrow(b,0); b.hp=b.maxHp; bots.push(b);
  }
}

function nearestGemTo(x,y){ let best=null,bd=420*420;
  for(const g of gems){ const d=dist2(g.x,g.y,x,y); if(d<bd){bd=d;best=g;} } return best; }
function nearestRival(self){ let best=null,bd=560*560; const list=[player,...bots];
  for(const o of list){ if(o===self||(o===player?player.hp<=0:!o.alive))continue;
    const d=dist2(o.x,o.y,self.x,self.y); if(d<bd){bd=d;best=o;} } return best; }

function updateBots(){
  for(const b of bots){
    if(!b.alive){ if(--b.respawn<=0){ const a=Math.random()*7; b.x=player.x+Math.cos(a)*620; b.y=player.y+Math.sin(a)*620;
        b.grow=rand(0,8); applyGrow(b,0); b.hp=b.maxHp; b.alive=true; b.iframe=40; } continue; }
    if(b.iframe>0)b.iframe--;
    const rival=nearestRival(b), gem=nearestGemTo(b.x,b.y);
    let mx=0,my=0;
    if(rival){ const dx=rival.x-b.x, dy=rival.y-b.y, d=Math.hypot(dx,dy)||1;
      if(d<170){ mx=-dx/d; my=-dy/d; }                 // too close -> kite
      else if(gem){ const gx=gem.x-b.x,gy=gem.y-b.y,gd=Math.hypot(gx,gy)||1; mx=gx/gd; my=gy/gd; }  // grab food
      else { mx=dx/d*0.6; my=dy/d*0.6; }
      b.aim=Math.atan2(dy,dx);
      if(--b.fireCd<=0){ b.fireCd=b.fireRate;
        bullets.push({ x:b.x,y:b.y, vx:Math.cos(b.aim)*b.bulletSpeed, vy:Math.sin(b.aim)*b.bulletSpeed,
          dmg:b.damage, pierce:0, size:6, life:80, hits:[], from:b }); }
    } else if(gem){ const gx=gem.x-b.x,gy=gem.y-b.y,gd=Math.hypot(gx,gy)||1; mx=gx/gd; my=gy/gd; }
    else { mx=Math.cos(frame*0.02+b.x); my=Math.sin(frame*0.02+b.y); }
    for(const o of bots){ if(o===b||!o.alive)continue; const dx=b.x-o.x,dy=b.y-o.y,d2=dx*dx+dy*dy;
      if(d2<90*90&&d2>0){ const d=Math.sqrt(d2); mx+=dx/d*0.5; my+=dy/d*0.5; } }
    const m=Math.hypot(mx,my)||1; b.x+=mx/m*b.speed; b.y+=my/m*b.speed;
  }
}

function drawDogSprite(skin,x,y,size,blink){
  const X=sx(x),Y=sy(y);
  ctx.save(); if(blink)ctx.globalAlpha=0.4; ctx.shadowColor='#ffd45e'; ctx.shadowBlur=14;
  if(!drawImgCentered(skin,X,Y,size)){ ctx.fillStyle='#444'; ctx.beginPath(); ctx.arc(X,Y,size/2,0,7); ctx.fill(); }
  ctx.restore();
}
function drawBots(){
  for(const b of bots){
    if(!b.alive)continue;
    const X=sx(b.x),Y=sy(b.y);
    if(X<-120||X>VW+120||Y<-120||Y>VH+120) continue;
    drawDogSprite(b.skin,b.x,b.y,b.size,b.iframe>0&&Math.floor(b.iframe/3)%2);
    drawGun(X,Y+6,b.aim,false);
    ctx.textAlign='center'; ctx.font='bold 12px Trebuchet MS';
    ctx.fillStyle=b.color; ctx.strokeStyle='#000'; ctx.lineWidth=3;
    ctx.strokeText(b.name,X,Y-b.size*0.62); ctx.fillText(b.name,X,Y-b.size*0.62);
    const w=b.size,h=4,by=Y-b.size*0.52;
    ctx.fillStyle='#000a'; ctx.fillRect(X-w/2,by,w,h);
    ctx.fillStyle='#5ed36b'; ctx.fillRect(X-w/2,by,w*clamp(b.hp/b.maxHp,0,1),h);
  }
}

// leaderboard ranks by mass (grow) — bigger = higher, slither-style
function leaderboard(){
  const rows=[{name:'YOU',score:Math.round(player.grow||0),you:true,color:'#ffd45e',dead:player.hp<=0}];
  for(const b of bots) rows.push({name:b.name,score:Math.round(b.grow),color:b.color,dead:!b.alive});
  rows.sort((a,b)=>b.score-a.score);
  return rows;
}
