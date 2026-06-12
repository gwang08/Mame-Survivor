// Mame Survivor — main loop, collisions, state machine, HUD, UI glue
const ST = { MENU:0, PLAY:1, LEVELUP:2, OVER:3 };
let gs = ST.MENU, time=0, frame=0, spawnTimer=0, bossTimer=0;
let best = +(localStorage.getItem('mamesurvivor_best')||0);
let selectedChar = 0;
let paused = false;
const BOT_COUNT = 7;

const $ = id => document.getElementById(id);
const fmt = s => { const m=Math.floor(s/60); return m+':'+String(s%60).padStart(2,'0'); };
function hideOverlays(){ ['menu','over','levelup'].forEach(k=>$(k).style.display='none'); }

function startGame(){
  Object.assign(player,{ x:0,y:0,speed:3,size:56,hp:100,maxHp:100,xp:0,level:1,xpNext:5,
    fireCd:0,fireRate:32,damage:10,bullets:1,bulletSpeed:7,pierce:0,bulletSize:7,range:540,
    pickup:95,kills:0,iframe:0,regen:0,aim:0,muzzle:0 });
  player.name='YOU';
  const ch = CHARACTERS[selectedChar]; player.skin = ch.key; ch.apply(player);  // skin + perk
  enemies.length=bullets.length=gems.length=particles.length=floaters.length=0;
  makeBots(BOT_COUNT);                                   // AI "players" join the arena
  cam.x=cam.y=cam.shake=0; time=0; frame=0; spawnTimer=0; bossTimer=0; paused=false;
  gs=ST.PLAY; hideOverlays();
  if(ensureAC() && AC.state==='suspended') AC.resume();
  playMusic();
}

function levelUp(){
  player.level++; player.xp-=player.xpNext; player.xpNext=Math.round(player.xpNext*1.45+3);
  beep(1320,0.18,'sine',0.06);
  const cards=$('cards'); cards.innerHTML='';
  rollUpgrades().forEach(u=>{
    const b=document.createElement('button'); b.className='card';
    b.innerHTML=`<div class="ic">${u.icon}</div><div class="nm">${u.name}</div><div class="ds">${u.desc}</div>`;
    b.onclick=()=>{ u.apply(player); beep(1500,0.08,'square',0.04);
      if(player.xp>=player.xpNext){ levelUp(); } else { $('levelup').style.display='none'; gs=ST.PLAY; } };
    cards.appendChild(b);
  });
  $('levelup').style.display='flex'; gs=ST.LEVELUP;
}

function gameOver(){
  gs=ST.OVER; addShake(18); const survived=Math.floor(time);
  if(survived>best){ best=survived; localStorage.setItem('mamesurvivor_best',best); }
  $('finalTime').textContent=fmt(survived);
  $('finalLv').textContent='Lv '+player.level+'  •  💀 '+player.kills;
  $('bestTime').textContent='Best: '+fmt(best);
  $('over').style.display='flex';
}

function update(){
  frame++;
  if(cam.shake>0) cam.shake*=0.9;
  if(gs!==ST.PLAY || paused){ updateParticles(); updateFloaters(); return; }
  time+=1/60;

  const v=moveVec();
  player.x+=v.x*player.speed; player.y+=v.y*player.speed;
  cam.x=lerp(cam.x,player.x,0.12); cam.y=lerp(cam.y,player.y,0.12);

  if(player.regen>0 && frame%6===0) player.hp=Math.min(player.maxHp,player.hp+player.regen/10);
  if(player.iframe>0) player.iframe--;
  if(player.muzzle>0) player.muzzle--;
  const tgt=nearestEnemy(); if(tgt) player.aim=Math.atan2(tgt.y-player.y, tgt.x-player.x);
  if(player.fireCd>0) player.fireCd--; else { fire(); player.fireCd=player.fireRate; }

  updateBots();   // AI players move, fire, score

  // spawning
  if(--spawnTimer<=0){ const n=1+Math.floor(time/35); for(let i=0;i<n;i++) spawnWave(time);
    spawnTimer=Math.max(8, 40 - time*0.35); }
  if(++bossTimer > 60*45){ spawnBoss(); bossTimer=0; floatText(player.x,player.y-80,'⚠ BOSS!','#ff5050'); }

  // bullets
  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; b.x+=b.vx; b.y+=b.vy; if(--b.life<=0) bullets.splice(i,1); }

  // list of living dogs (player + bots) — enemies chase the nearest one
  const dogs = [player, ...bots.filter(d=>d.alive)];
  // enemies
  for(let ei=enemies.length-1;ei>=0;ei--){
    const e=enemies[ei];
    let tg=player, td=dist2(player.x,player.y,e.x,e.y);
    for(const d of dogs){ const dd=dist2(d.x,d.y,e.x,e.y); if(dd<td){ td=dd; tg=d; } }
    const ang=Math.atan2(tg.y-e.y,tg.x-e.x);
    e.x+=Math.cos(ang)*e.speed; e.y+=Math.sin(ang)*e.speed;
    if(e.hit>0)e.hit--;
    for(let oi=ei-1;oi>=0;oi--){ const o=enemies[oi]; const rr=(e.size+o.size)*0.35;
      if(dist2(e.x,e.y,o.x,o.y)<rr*rr){ const a=Math.atan2(e.y-o.y,e.x-o.x); e.x+=Math.cos(a)*0.6; e.y+=Math.sin(a)*0.6; } }
    // bullet collisions (any dog's bullets)
    for(let bi=bullets.length-1;bi>=0;bi--){
      const b=bullets[bi]; if(b.hits.includes(e)) continue;
      const rr=e.size*0.5+b.size;
      if(dist2(e.x,e.y,b.x,b.y)<rr*rr){
        e.hp-=b.dmg; e.hit=4; b.hits.push(e); e.lastHitBy=b.from||player;
        burst(b.x,b.y,e.ring,5,3,3,16); floatText(e.x,e.y-e.size*0.5,Math.round(b.dmg),'#fff');
        if(b.pierce-- <=0){ bullets.splice(bi,1); }
        if(e.hp<=0) break;
      }
    }
    if(e.hp<=0){
      burst(e.x,e.y,e.ring,e.boss?44:12,e.boss?7:5,e.boss?7:5,30); addShake(e.boss?14:1.4);
      const n=e.boss?22:1; for(let k=0;k<n;k++) gems.push({x:e.x+rand(-22,22),y:e.y+rand(-22,22),v:e.xp/n,big:e.xp>=4});
      const killer=e.lastHitBy||player; if(killer && killer.kills!=null) killer.kills++;   // credit the shooter
      enemies.splice(ei,1); continue;
    }
    // contact damage to any nearby dog
    for(const d of dogs){
      if(d.iframe>0) continue;
      const rr=e.size*0.5+d.size*0.38;
      if(dist2(e.x,e.y,d.x,d.y)<rr*rr){
        d.hp-=e.dmg; d.iframe=45;
        if(d===player){ addShake(8); beep(180,0.2,'sawtooth',0.06); burst(player.x,player.y,'#ff4040',10,4,4,20);
          if(player.hp<=0){ player.hp=0; gameOver(); } }
        else if(d.hp<=0){ d.alive=false; d.respawn=300; burst(d.x,d.y,'#ff4040',12,4,4,20); }
      }
    }
  }

  // PvP: a dog's bullets can hit rival dogs
  if(gameMode==='pvp'){
    for(let bi=bullets.length-1;bi>=0;bi--){
      const b=bullets[bi]; let hitSomething=false;
      for(const d of [player,...bots]){
        if(d===b.from || b.hits.includes(d)) continue;
        if(d===player ? player.hp<=0 : !d.alive) continue;
        const rr=d.size*0.42+b.size;
        if(dist2(b.x,b.y,d.x,d.y)<rr*rr){
          d.hp-=b.dmg; b.hits.push(d); burst(b.x,b.y,'#ff5a5a',6,3,3,16);
          if(d!==player) d.iframe=Math.max(d.iframe,3);
          if(d.hp<=0){
            if(d===player){ player.hp=0; gameOver(); }
            else { d.alive=false; d.respawn=300; }
            const k=b.from; if(k && k.kills!=null) k.kills++;
          }
          hitSomething=true; break;
        }
      }
      if(hitSomething) bullets.splice(bi,1);
    }
  }

  // gems: magnet + pickup
  for(let gi=gems.length-1;gi>=0;gi--){
    const g=gems[gi], d2=dist2(g.x,g.y,player.x,player.y);
    if(d2<player.pickup*player.pickup){ const a=Math.atan2(player.y-g.y,player.x-g.x);
      const pull=4+(player.pickup*player.pickup-d2)/2600; g.x+=Math.cos(a)*pull; g.y+=Math.sin(a)*pull; }
    if(d2<28*28){ player.xp+=g.v; gems.splice(gi,1); beep(1200,0.04,'sine',0.02);
      if(player.xp>=player.xpNext) levelUp(); }
  }

  updateParticles(); updateFloaters();
}

// ---- rendering ----
function drawGrid(){
  const gap=64; ctx.strokeStyle='#ffffff09'; ctx.lineWidth=1;
  const ox=((VW/2-cam.x)%gap+gap)%gap, oy=((VH/2-cam.y)%gap+gap)%gap;
  ctx.beginPath();
  for(let x=ox;x<VW;x+=gap){ ctx.moveTo(x,0); ctx.lineTo(x,VH); }
  for(let y=oy;y<VH;y+=gap){ ctx.moveTo(0,y); ctx.lineTo(VW,y); }
  ctx.stroke();
}
function draw(){
  const o=camOffset();
  ctx.setTransform(1,0,0,1,o.x,o.y);
  ctx.fillStyle='#0c0c18'; ctx.fillRect(-o.x-2,-o.y-2,VW+4,VH+4);
  drawGrid();
  for(const g of gems) drawGem(g);
  for(const e of enemies) drawEnemy(e);
  for(const b of bullets) drawBullet(b);
  if(gs!==ST.MENU) drawBots();
  drawPlayer();
  drawParticles(); drawFloaters();
  ctx.setTransform(1,0,0,1,0,0);
  if(gs===ST.PLAY||gs===ST.LEVELUP){ drawHUD(); drawLeaderboard(); }
  if(gs===ST.PLAY && joy.active) drawJoystick();
}
function drawLeaderboard(){
  const rows=leaderboard().slice(0,8), x=VW-186, w=176, rh=22, y0=100;
  ctx.save();
  ctx.fillStyle='rgba(12,11,26,.62)'; ctx.fillRect(x,y0,w,rh*rows.length+30);
  ctx.fillStyle='#ffd45e'; ctx.font='bold 13px Trebuchet MS'; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('🏆 LIVE LEADERBOARD', x+10, y0+15);
  rows.forEach((r,i)=>{
    const yy=y0+30+i*rh;
    if(r.you){ ctx.fillStyle='rgba(255,212,94,.14)'; ctx.fillRect(x,yy-rh/2,w,rh); }
    ctx.font=(r.you?'bold ':'')+'12px Trebuchet MS';
    ctx.fillStyle=r.you?'#ffd45e':(r.dead?'#888':r.color);
    ctx.textAlign='left';  ctx.fillText((i+1)+'. '+r.name+(r.dead?' 💀':''), x+10, yy);
    ctx.textAlign='right'; ctx.fillText(r.kills, x+w-10, yy);
  });
  ctx.restore();
}
function drawHUD(){
  ctx.fillStyle='#ffffff14'; ctx.fillRect(0,0,VW,8);
  ctx.fillStyle='#36d6ff'; ctx.fillRect(0,0,VW*clamp(player.xp/player.xpNext,0,1),8);
  const hw=Math.min(240,VW*0.5),hh=16,hx=14,hy=18;
  ctx.fillStyle='#000a'; ctx.fillRect(hx,hy,hw,hh);
  ctx.fillStyle='#ff3b5b'; ctx.fillRect(hx,hy,hw*clamp(player.hp/player.maxHp,0,1),hh);
  ctx.strokeStyle='#fff6'; ctx.strokeRect(hx,hy,hw,hh);
  ctx.fillStyle='#fff'; ctx.font='bold 12px Trebuchet MS'; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText(Math.ceil(player.hp)+' / '+player.maxHp, hx+8, hy+hh/2+1);
  ctx.textBaseline='alphabetic'; ctx.font='bold 16px Trebuchet MS'; ctx.fillText('LV '+player.level, hx, hy+hh+18);
  ctx.textAlign='center'; ctx.font='bold 30px Trebuchet MS'; ctx.fillStyle='#fff'; ctx.fillText(fmt(Math.floor(time)), VW/2, 42);
  ctx.textAlign='right'; ctx.font='bold 16px Trebuchet MS'; ctx.fillText('💀 '+player.kills, VW-14, 30);
}
function drawJoystick(){
  ctx.globalAlpha=0.3; ctx.strokeStyle='#fff'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(joy.ox,joy.oy,60,0,7); ctx.stroke();
  ctx.fillStyle='#ffd45e'; ctx.beginPath(); ctx.arc(joy.ox+joy.dx*60,joy.oy+joy.dy*60,24,0,7); ctx.fill();
  ctx.globalAlpha=1;
}

// ---- boot ----
function renderCharSelect(){
  const box=$('charSelect'); box.innerHTML='';
  CHARACTERS.forEach((c,i)=>{
    const el=document.createElement('button');
    el.className='char'+(i===selectedChar?' sel':'');
    el.style.setProperty('--cg', c.glow);
    el.innerHTML=`<img src="${c.file}" alt="${c.name}"><div class="cn">${c.name}</div><div class="cp">${c.perk}</div>`;
    el.onclick=()=>{ selectedChar=i; renderCharSelect(); beep(1000,0.05,'square',0.03); };
    box.appendChild(el);
  });
}
renderCharSelect();
$('startBtn').onclick=startGame;
$('retryBtn').onclick=startGame;
$('muteBtn').onclick=()=>{ $('muteBtn').textContent = toggleMute() ? '🔇' : '🔊'; };
$('menuBest').textContent='Best: '+fmt(best);

// mode toggle (Co-op / PvP)
document.querySelectorAll('#modeSelect .mode').forEach(btn=>{
  btn.classList.toggle('sel', btn.dataset.mode===gameMode);
  btn.onclick=()=>{ gameMode=btn.dataset.mode; localStorage.setItem('mame_mode',gameMode);
    document.querySelectorAll('#modeSelect .mode').forEach(x=>x.classList.toggle('sel',x.dataset.mode===gameMode));
    beep(1000,0.05,'square',0.03); };
});

// settings + volume sliders (doubles as in-game pause)
const musicSlider=$('musicSlider'), sfxSlider=$('sfxSlider');
musicSlider.value=Math.round(musicVol*100); $('musicVal').textContent=musicSlider.value;
sfxSlider.value=Math.round(sfxVol*100);     $('sfxVal').textContent=sfxSlider.value;
musicSlider.oninput=()=>{ setMusicVol(musicSlider.value/100); $('musicVal').textContent=musicSlider.value; };
sfxSlider.oninput  =()=>{ setSfxVol(sfxSlider.value/100);     $('sfxVal').textContent=sfxSlider.value; };
$('settingsBtn').onclick=()=>{ if(gs===ST.PLAY) paused=true; $('settings').style.display='flex'; };
$('closeSettings').onclick=()=>{ $('settings').style.display='none'; if(gs===ST.PLAY) paused=false; };

(function loop(){ update(); draw(); requestAnimationFrame(loop); })();
