// Mame Survivor — AI bots that act like real players + live leaderboard data.
// Bots roam the same arena, auto-fire at meme-coin enemies (and at dogs in PvP),
// earn kills, can die & respawn. All client-side — no server needed.

// realistic human-ish usernames (mix EN + VN)
const BOT_NAMES = [
  'Alex','Daniel','Sophie','Minh Tuan','Jake','Emma','Carlos','Linh','Hiro','Olivia',
  'Kevin','Maya','Lucas','Trang','Ryan','Anna','David','Yuki','Chloe','Sang',
  'Marco','Nina','Liam','Mia','Hoang','Ethan','Grace','Tom','Bao','Julia'
];
const BOT_SKINS = ['player','mame'];
const BOT_COLORS = ['#ff6b6b','#4dd2ff','#9b7bff','#5ed36b','#ffb02e','#ff7ad9','#7af0c0'];

let bots = [];
let gameMode = localStorage.getItem('mame_mode') || 'coop';   // 'coop' | 'pvp'

function makeBots(count){
  bots = [];
  const names = [...BOT_NAMES].sort(()=>Math.random()-0.5).slice(0, count);
  for(let i=0;i<count;i++){
    const ang = (i/count)*Math.PI*2;
    bots.push({
      name:names[i], skin:BOT_SKINS[i%BOT_SKINS.length], color:BOT_COLORS[i%BOT_COLORS.length],
      x:player.x+Math.cos(ang)*rand(300,520), y:player.y+Math.sin(ang)*rand(300,520),
      vx:0, vy:0, size:52, speed:rand(2.4,3.1),
      hp:100, maxHp:100, alive:true, respawn:0, iframe:0,
      fireCd:(i*4)%30, fireRate:Math.round(rand(26,40)), damage:rand(8,12), bulletSpeed:7,
      aim:0, kills:0, skill:rand(0.85,1.15),   // skill multiplier -> some bots score faster
    });
  }
}

// nearest meme-coin enemy to a point
function nearestEnemyTo(x,y,maxR){
  let best=null, bd=(maxR||9e9)**2;
  for(const e of enemies){ const d=dist2(e.x,e.y,x,y); if(d<bd){ bd=d; best=e; } }
  return best;
}
// nearest rival dog (player + other bots) for PvP
function nearestDogTo(self){
  let best=null, bd=520*520;
  const list=[player,...bots];
  for(const o of list){ if(o===self||o.alive===false||(o===player&&player.hp<=0))continue;
    const d=dist2(o.x,o.y,self.x,self.y); if(d<bd){ bd=d; best=o; } }
  return best;
}

function updateBots(){
  for(const b of bots){
    if(!b.alive){ if(--b.respawn<=0){ // respawn near the action, keep score
        const ang=Math.random()*7; b.x=player.x+Math.cos(ang)*560; b.y=player.y+Math.sin(ang)*560;
        b.hp=b.maxHp; b.alive=true; b.iframe=40; } continue; }
    if(b.iframe>0)b.iframe--;
    b.damage += 0.0006*b.skill;            // slowly grow so kills keep coming (leaderboard climbs)

    // pick movement target: kite enemies, keep near the swarm
    const e = nearestEnemyTo(b.x,b.y);
    let mx=0,my=0;
    if(e){ const dx=e.x-b.x, dy=e.y-b.y, d=Math.hypot(dx,dy)||1;
      if(d<150){ mx=-dx/d; my=-dy/d; }           // too close -> back off
      else if(d>240){ mx=dx/d; my=dy/d; }        // far -> approach
      else { mx=-dy/d; my=dx/d; }                // mid -> strafe
    } else { mx=Math.cos(frame*0.02+b.x); my=Math.sin(frame*0.02+b.y); }
    // separation from other dogs
    for(const o of bots){ if(o===b||!o.alive)continue; const dx=b.x-o.x,dy=b.y-o.y,d2=dx*dx+dy*dy;
      if(d2<90*90 && d2>0){ const d=Math.sqrt(d2); mx+=dx/d*0.6; my+=dy/d*0.6; } }
    const m=Math.hypot(mx,my)||1; b.x+=mx/m*b.speed; b.y+=my/m*b.speed;

    // aim + fire
    let target = e;
    if(gameMode==='pvp'){ const dog=nearestDogTo(b); if(dog && (!e || dist2(dog.x,dog.y,b.x,b.y)<dist2(e.x,e.y,b.x,b.y)*0.8)) target=dog; }
    if(target){ b.aim=Math.atan2(target.y-b.y, target.x-b.x);
      if(--b.fireCd<=0){ b.fireCd=b.fireRate;
        bullets.push({ x:b.x,y:b.y, vx:Math.cos(b.aim)*b.bulletSpeed, vy:Math.sin(b.aim)*b.bulletSpeed,
          dmg:b.damage, pierce:0, size:6, life:80, hits:[], from:b });
      }
    }
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
    if(X<-90||X>VW+90||Y<-90||Y>VH+90) continue;
    drawDogSprite(b.skin,b.x,b.y,b.size,b.iframe>0&&Math.floor(b.iframe/3)%2);
    drawGun(X,Y+6,b.aim,false);
    // name tag
    ctx.textAlign='center'; ctx.font='bold 12px Trebuchet MS';
    ctx.fillStyle=b.color; ctx.strokeStyle='#000'; ctx.lineWidth=3;
    ctx.strokeText(b.name,X,Y-b.size*0.62); ctx.fillText(b.name,X,Y-b.size*0.62);
    // hp bar
    const w=b.size,h=4,by=Y-b.size*0.52;
    ctx.fillStyle='#000a'; ctx.fillRect(X-w/2,by,w,h);
    ctx.fillStyle='#5ed36b'; ctx.fillRect(X-w/2,by,w*clamp(b.hp/b.maxHp,0,1),h);
  }
}

// leaderboard: player + bots sorted by kills (desc)
function leaderboard(){
  const rows=[{name:'YOU',kills:player.kills,you:true,color:'#ffd45e',dead:player.hp<=0}];
  for(const b of bots) rows.push({name:b.name,kills:b.kills,color:b.color,dead:!b.alive});
  rows.sort((a,b)=>b.kills-a.kills);
  return rows;
}
