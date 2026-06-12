// Mame Survivor — main loop, two separate modes:
//   CAMPAIGN = solo, stage-select map, per-stage boss, unlock next (no bots/leaderboard)
//   ARENA    = slither-style, dogs shoot each other, eat XP orbs to grow, leaderboard (no stages/boss)
const ST = { MENU:0, STAGESELECT:1, PLAY:2, LEVELUP:3, OVER:4, WIN:5, CLEAR:6, STORY:7, TRANS:8 };
let gs = ST.MENU, time=0, frame=0, spawnTimer=0;
let best = +(localStorage.getItem('mamesurvivor_best')||0);
let maxUnlocked = +(localStorage.getItem('mame_unlocked')||1);
let selectedChar = 0, paused = false;
let DT = 1, lastTs = 0;                 // delta-time: 1.0 == 60fps (keeps speed constant on any FPS)
const BOT_COUNT = 7;

// ---- campaign maps & stages ----
const MAPS = [
  { name:'DEEP SPACE',  bg:'#0c0c18', grid:'#ffffff12' },
  { name:'MARS COLONY', bg:'#1a0d0a', grid:'#ff7a3c26' },
  { name:'TOXIC SWAMP', bg:'#0a1a10', grid:'#5ed36b26' },
  { name:'NEO-TOKYO',   bg:'#0a0e22', grid:'#4dd2ff26' },
  { name:'VOID NEBULA', bg:'#160a1f', grid:'#b06bff26' },
];
const ARENA_THEME = { name:'ARENA', bg:'#0a0f1e', grid:'#4dd2ff18' };
const TOTAL_STAGES = 50;
let stage=1, stageKills=0, bossPhase=0, warnTimer=0, curBoss=null;
let lastStage=1;
let banner={text:'',sub:'',life:0};
function showBanner(t,s){ banner={text:t,sub:s||'',life:140}; }
function curMap(){ return gameMode==='arena' ? ARENA_THEME : MAPS[actOf(stage)]; }   // one world per 10-stage act
function stageQuota(s){ return 12 + Math.floor(s*1.5); }

const $ = id => document.getElementById(id);
const fmt = s => { const m=Math.floor(s/60); return m+':'+String(s%60).padStart(2,'0'); };
function hideOverlays(){ ['menu','stageSelect','over','levelup','win','clear','story','trans'].forEach(k=>$(k).style.display='none'); }
function startAudio(){ if(ensureAC()&&AC.state==='suspended')AC.resume(); playMusic(); }

function resetPlayerCommon(){
  Object.assign(player,{ x:0,y:0,kills:0,iframe:0,aim:0,muzzle:0,firing:false,fireCd:0 });
  enemies.length=bullets.length=gems.length=particles.length=floaters.length=0;
  cam.x=cam.y=cam.shake=0; time=0; spawnTimer=0; paused=false;
}

// ---------- CAMPAIGN ----------
function startStage(n){
  resetPlayerCommon(); bots.length=0;
  Object.assign(player,{ speed:3.5,size:56,hp:100,maxHp:100,xp:0,level:1,xpNext:5,
    fireRate:32,damage:10,bullets:1,bulletSpeed:7,pierce:0,bulletSize:7,range:540,pickup:95,regen:0 });
  player.name='YOU'; const ch=CHARACTERS[selectedChar]; player.skin=ch.key; ch.apply(player);
  gameMode='campaign'; stage=n; lastStage=n; stageKills=0; bossPhase=0; warnTimer=0; curBoss=null;
  location.hash='campaign-'+n;
  if((n-1)%10===0) showStory(actOf(n));   // act intro cutscene at the start of each world
  else beginPlay();
}
function beginPlay(){
  clearInterval(typeTimer); typing=false;
  showBanner('STAGE '+stage, curMap().name);
  gs=ST.PLAY; hideOverlays(); startAudio();    // startAudio restores full music volume
}
let storyLines=[], storyIdx=0, typeTimer=null, typing=false, fullLine='', typeEl=null;
let transLines=[], transIdx=0, transNextStage=2;
// shared typewriter
function typeInto(el, text, blip){
  typeEl=el; fullLine=text; clearInterval(typeTimer); typing=true; let i=0; el.textContent='';
  typeTimer=setInterval(()=>{ i++; el.textContent=fullLine.slice(0,i);
    if(i%2===0 && fullLine[i-1]!==' ') beep(blip,0.03,'square',0.035);
    if(i>=fullLine.length){ clearInterval(typeTimer); typing=false; } }, 18);
}
function completeType(){ clearInterval(typeTimer); typing=false; if(typeEl) typeEl.textContent=fullLine; }
const blipFor = who => who==='boss'?170 : who==='mame'?500 : 320;

// ---- pre-fight dialogue ----
function showStory(act){
  const a=STORY.acts[act], boss=BOSS_ROSTER[act];
  $('vnTitle').textContent=a.title;
  $('vnMame').src=ver(CHARACTERS[selectedChar].file);
  $('vnBoss').src=ver('assets/'+boss.img+'.png');
  storyLines=a.dialogue; storyIdx=0;
  hideOverlays(); $('story').style.display='flex'; gs=ST.STORY; startAudio();
  if(bgm && !muted) bgm.volume = musicVol*0.4;   // duck music during dialogue
  renderStoryLine();
}
function renderStoryLine(){
  const L=storyLines[storyIdx]; if(!L){ beginPlay(); return; }
  const who=L.who, mame=$('vnMame'), bss=$('vnBoss');
  $('vnName').className='vn-name'+(who==='boss'?' boss':who==='narrator'?' narrator':'');
  $('vnName').textContent = who==='boss' ? BOSS_ROSTER[actOf(stage)].name : who==='narrator' ? '— STORY —' : 'MAME';
  mame.classList.toggle('act', who==='mame'); mame.classList.toggle('dim', who!=='mame');
  bss.classList.toggle('act', who==='boss');  bss.classList.toggle('dim', who!=='boss');
  $('vnHint').textContent = (storyIdx>=storyLines.length-1) ? '▶ TAP TO START' : '▶ tap to continue';
  typeInto($('vnText'), L.text, blipFor(who));
}
function storyAdvance(){
  if(gs!==ST.STORY) return;
  if(typing){ completeType(); return; }
  storyIdx++; if(storyIdx>=storyLines.length) beginPlay(); else renderStoryLine();
}

// ---- post-fight transition cutscene (boss flees on a ship to the moon, MAME chases) ----
function showTransition(nextStage){
  transNextStage=nextStage;
  const act=actOf(stage), boss=BOSS_ROSTER[act];
  $('transTitle').textContent='STAGE '+stage+' CLEARED';
  $('transBoss').src=ver('assets/'+boss.img+'.png');
  $('transMame').src=ver(CHARACTERS[selectedChar].file);
  transLines=STORY.acts[act].outro||[]; transIdx=0;
  hideOverlays(); $('trans').style.display='flex'; gs=ST.TRANS;
  const fg=$('transFly'), mm=$('transMame');      // restart the fly animation
  fg.classList.remove('go'); mm.classList.remove('go'); void fg.offsetWidth; fg.classList.add('go'); mm.classList.add('go');
  if(bgm && !muted) bgm.volume = musicVol*0.4;
  beep(880,0.25,'sine',0.05);
  renderTransLine();
}
function renderTransLine(){
  const L=transLines[transIdx]; if(!L) return;
  $('transName').className='vn-name'+(L.who==='boss'?' boss':'');
  $('transName').textContent = L.who==='boss' ? BOSS_ROSTER[actOf(stage)].name : 'MAME';
  typeInto($('transText'), L.text, blipFor(L.who));
}
function transAdvance(){
  if(gs!==ST.TRANS) return;
  if(typing){ completeType(); return; }
  transIdx++; if(transIdx<transLines.length) renderTransLine();   // else wait for NEXT button
}
function proceedNext(){ clearInterval(typeTimer); typing=false; startStage(transNextStage); }

function stageClear(){
  maxUnlocked=Math.max(maxUnlocked, stage+1); localStorage.setItem('mame_unlocked',maxUnlocked);
  if(stage>=TOTAL_STAGES){ win(); return; }
  showTransition(stage+1);
}
function stageClearOLD(){
  gs=ST.CLEAR; $('clearStage').textContent='STAGE '+stage+' CLEAR!';
  $('clear').style.display='flex'; beep(1400,0.25,'sine',0.07);
}

// ---------- ARENA ----------
function startArena(){
  resetPlayerCommon();
  Object.assign(player,{ speed:3.7, baseSize:56, baseHp:120, baseDmg:11, grow:0,
    fireRate:26, bullets:1, bulletSpeed:7.5, pierce:0, bulletSize:7, range:560, regen:0.2 });
  player.name='YOU'; player.skin=CHARACTERS[selectedChar].key;
  applyGrow(player,0); player.hp=player.maxHp;
  gameMode='arena'; makeBots(BOT_COUNT);
  gs=ST.PLAY; hideOverlays(); location.hash='arena'; startAudio();
}

function win(){
  gs=ST.WIN; addShake(22); const survived=Math.floor(time);
  if(survived>best){ best=survived; localStorage.setItem('mamesurvivor_best',best); }
  $('winTime').textContent=fmt(survived);
  $('winKills').textContent='💀 '+player.kills+' kills';
  $('winStory').textContent=STORY.ending;
  $('win').style.display='flex';
}
function gameOver(){
  gs=ST.OVER; addShake(18); const survived=Math.floor(time);
  if(survived>best){ best=survived; localStorage.setItem('mamesurvivor_best',best); }
  $('finalTime').textContent=fmt(survived);
  $('finalLv').textContent = gameMode==='arena' ? ('🪙 size '+Math.round(player.grow)) : ('STAGE '+stage+'  •  💀 '+player.kills);
  $('bestTime').textContent='Best: '+fmt(best);
  $('over').style.display='flex';
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

// ---------- update ----------
function update(){
  frame++; if(cam.shake>0) cam.shake*=0.9;
  if(gs!==ST.PLAY || paused){ updateParticles(); updateFloaters(); return; }
  time+=DT/60;
  if(banner.life>0) banner.life-=DT;

  const v=moveVec(), camf=Math.min(1,0.12*DT);
  player.x+=v.x*player.speed*DT; player.y+=v.y*player.speed*DT;
  cam.x=lerp(cam.x,player.x,camf); cam.y=lerp(cam.y,player.y,camf);
  if(player.regen>0 && frame%6===0) player.hp=Math.min(player.maxHp,player.hp+player.regen/10);
  if(player.iframe>0) player.iframe-=DT;
  if(player.muzzle>0) player.muzzle-=DT;

  // aim + fire toward mode-specific target (campaign prioritises the boss when in range)
  let target;
  if(gameMode==='arena') target=nearestRival(player);
  else target=(curBoss && dist2(curBoss.x,curBoss.y,player.x,player.y)<player.range*player.range) ? curBoss : nearestEnemy();
  if(target){ player.aim=Math.atan2(target.y-player.y,target.x-player.x); player.firing=true; } else player.firing=false;
  if(player.fireCd>0) player.fireCd-=DT; else { fire(); player.fireCd=player.fireRate; }

  for(let i=bullets.length-1;i>=0;i--){ const b=bullets[i]; b.x+=b.vx*DT; b.y+=b.vy*DT; b.life-=DT; if(b.life<=0) bullets.splice(i,1); }

  if(gameMode==='arena') updateArena(); else updateCampaign();
  updateParticles(); updateFloaters();
}

function updateCampaign(){
  // minion spawning only while clearing (stop the flood once the boss is in)
  if(bossPhase===0){
    if((spawnTimer-=DT)<=0){
      for(let i=0;i<3+Math.floor(stage/3);i++) spawnWave(time + stage*8);   // denser swarm while clearing
      spawnTimer = Math.max(6, 22 - stage*0.5);
    }
  }
  if(bossPhase===0 && stageKills>=stageQuota(stage)){
    bossPhase=1; warnTimer=150; banner.life=0;   // drawWarning handles the on-screen notice (no duplicate banner)
    beep(160,0.5,'sawtooth',0.07);
  }
  if(bossPhase===1 && (warnTimer-=DT)<=0){
    enemies.length=0;                       // clear the swarm so the boss fight is 1-on-1
    bossPhase=2; curBoss=spawnStageBoss(stage); addShake(22);
    showBanner('BOSS', curBoss.name+'!'); beep(120,0.6,'sawtooth',0.08);
  }
  if(bossPhase===2 && curBoss && frame%420===0 && enemies.length<18){
    for(let i=0;i<2;i++){ const a=Math.random()*7;
      spawnEnemy(COIN_TYPES[Math.floor(Math.random()*3)], curBoss.x+Math.cos(a)*110, curBoss.y+Math.sin(a)*110); }
  }
  // enemies (vs player only)
  for(let ei=enemies.length-1;ei>=0;ei--){
    const e=enemies[ei];
    const ang=Math.atan2(player.y-e.y,player.x-e.x);
    e.x+=Math.cos(ang)*e.speed*DT; e.y+=Math.sin(ang)*e.speed*DT;
    if(e.hit>0)e.hit-=DT;
    for(let oi=ei-1;oi>=0;oi--){ const o=enemies[oi]; const rr=(e.size+o.size)*0.35;
      if(dist2(e.x,e.y,o.x,o.y)<rr*rr){ const a=Math.atan2(e.y-o.y,e.x-o.x); e.x+=Math.cos(a)*0.6*DT; e.y+=Math.sin(a)*0.6*DT; } }
    for(let bi=bullets.length-1;bi>=0;bi--){
      const b=bullets[bi]; if(b.hits.includes(e)) continue;
      const rr=e.size*0.5+b.size;
      if(dist2(e.x,e.y,b.x,b.y)<rr*rr){
        e.hp-=b.dmg; e.hit=4; b.hits.push(e);
        burst(b.x,b.y,e.ring,5,3,3,16); floatText(e.x,e.y-e.size*0.5,Math.round(b.dmg),'#fff');
        if(b.pierce-- <=0){ bullets.splice(bi,1); }
        if(e.hp<=0) break;
      }
    }
    if(e.hp<=0){
      burst(e.x,e.y,e.ring,e.stageBoss?90:(e.boss?44:12),e.boss?7:5,e.boss?7:5,e.stageBoss?60:30);
      addShake(e.stageBoss?26:(e.boss?14:1.4));
      const n=e.boss?22:1; for(let k=0;k<n;k++) gems.push({x:e.x+rand(-22,22),y:e.y+rand(-22,22),v:e.xp/n,big:e.xp>=4});
      player.kills++; enemies.splice(ei,1);
      if(e.stageBoss){ curBoss=null; stageClear(); return; }
      if(bossPhase===0) stageKills++;
      continue;
    }
    if(player.iframe<=0){
      const rr=e.size*0.5+player.size*0.38;
      if(dist2(e.x,e.y,player.x,player.y)<rr*rr){
        player.hp-=e.dmg; player.iframe=45; addShake(8); beep(180,0.2,'sawtooth',0.06);
        burst(player.x,player.y,'#ff4040',10,4,4,20);
        if(player.hp<=0){ player.hp=0; gameOver(); return; }
      }
    }
  }
  // XP gems -> level up
  for(let gi=gems.length-1;gi>=0;gi--){
    const g=gems[gi], d2=dist2(g.x,g.y,player.x,player.y);
    if(d2<player.pickup*player.pickup){ const a=Math.atan2(player.y-g.y,player.x-g.x);
      const pull=(4+(player.pickup*player.pickup-d2)/2600)*DT; g.x+=Math.cos(a)*pull; g.y+=Math.sin(a)*pull; }
    if(d2<28*28){ player.xp+=g.v; gems.splice(gi,1); beep(1200,0.04,'sine',0.02);
      if(player.xp>=player.xpNext) levelUp(); }
  }
}

function updateArena(){
  // spawn floating food orbs around the player
  if(gems.length<90 && frame%14===0){
    const a=Math.random()*7, r=rand(180,560);
    gems.push({ x:player.x+Math.cos(a)*r, y:player.y+Math.sin(a)*r, v:rand(1,3), big:false });
  }
  updateBots();
  const dogs=[player,...bots];
  // bullets hit rival dogs
  for(let bi=bullets.length-1;bi>=0;bi--){
    const b=bullets[bi]; let hit=false;
    for(const d of dogs){
      if(d===b.from || b.hits.includes(d)) continue;
      if(d===player ? player.hp<=0 : !d.alive) continue;
      const rr=d.size*0.42+b.size;
      if(dist2(b.x,b.y,d.x,d.y)<rr*rr){
        d.hp-=b.dmg; b.hits.push(d); burst(b.x,b.y,'#ff5a5a',6,3,3,16);
        if(d!==player) d.iframe=Math.max(d.iframe,3);
        if(d.hp<=0){
          // drop XP orbs (mass) for others to eat, slither-style
          const drop=Math.round(8+(d.grow||0)*0.6);
          for(let k=0;k<Math.min(20,drop);k++) gems.push({x:d.x+rand(-30,30),y:d.y+rand(-30,30),v:drop/Math.min(20,drop),big:true});
          burst(d.x,d.y,'#ffd45e',20,5,5,30); addShake(4);
          if(d===player){ player.hp=0; gameOver(); }
          else { d.alive=false; d.respawn=240; }
          if(b.from && b.from.kills!=null) b.from.kills++;
        }
        hit=true; break;
      }
    }
    if(hit) bullets.splice(bi,1);
  }
  // every dog eats nearby orbs -> grows
  for(let gi=gems.length-1;gi>=0;gi--){
    const g=gems[gi]; let eaten=false;
    for(const d of dogs){
      if(d===player ? player.hp<=0 : !d.alive) continue;
      const pr=d.size*0.55+18;
      if(dist2(g.x,g.y,d.x,d.y)<pr*pr){
        // gentle magnet toward player only (visual)
        applyGrow(d,g.v); if(d===player) beep(1200,0.03,'sine',0.02);
        eaten=true; break;
      }
    }
    if(eaten) gems.splice(gi,1);
  }
}

// ---------- rendering ----------
function drawGrid(){
  const gap=64; ctx.strokeStyle=curMap().grid; ctx.lineWidth=1;
  const ox=((VW/2-cam.x)%gap+gap)%gap, oy=((VH/2-cam.y)%gap+gap)%gap;
  ctx.beginPath();
  for(let x=ox;x<VW;x+=gap){ ctx.moveTo(x,0); ctx.lineTo(x,VH); }
  for(let y=oy;y<VH;y+=gap){ ctx.moveTo(0,y); ctx.lineTo(VW,y); }
  ctx.stroke();
}
function draw(){
  const o=camOffset();
  ctx.setTransform(1,0,0,1,o.x,o.y);
  ctx.fillStyle=curMap().bg; ctx.fillRect(-o.x-2,-o.y-2,VW+4,VH+4);
  drawGrid();
  for(const g of gems) drawGem(g);
  for(const e of enemies) drawEnemy(e);
  for(const b of bullets) drawBullet(b);
  if(gameMode==='arena' && gs!==ST.MENU) drawBots();
  if(gs===ST.PLAY||gs===ST.LEVELUP||gs===ST.OVER||gs===ST.CLEAR||gs===ST.WIN) drawPlayer();
  drawParticles(); drawFloaters();
  ctx.setTransform(1,0,0,1,0,0);
  if(gs===ST.PLAY||gs===ST.LEVELUP){
    drawHUD(); drawBanner();
    if(gameMode==='arena'){ drawLeaderboard(); drawMinimap(); }
    else { drawBossBar(); drawWarning(); drawMinimap(); }
  }
  if(gs===ST.PLAY && joy.active) drawJoystick();
  $('homeBtn').style.display = (gs===ST.PLAY||gs===ST.LEVELUP) ? 'flex' : 'none';
}
function drawBanner(){
  if(banner.life<=0) return;
  const a=Math.min(1,banner.life/40);
  ctx.save(); ctx.globalAlpha=a; ctx.textAlign='center';
  ctx.fillStyle='#ffd45e'; ctx.font='bold 44px Trebuchet MS'; ctx.shadowColor='#000'; ctx.shadowBlur=10;
  ctx.fillText(banner.text, VW/2, VH*0.3);
  if(banner.sub){ ctx.fillStyle='#fff'; ctx.font='bold 20px Trebuchet MS'; ctx.fillText(banner.sub, VW/2, VH*0.3+34); }
  ctx.restore();
}
function drawWarning(){
  if(bossPhase!==1) return;
  const pulse=0.4+0.4*Math.sin(frame*0.3);
  ctx.save(); ctx.globalAlpha=pulse; ctx.fillStyle='#ff2030'; ctx.fillRect(0,0,VW,VH);
  const fs=Math.min(60, Math.round(VW*0.13));
  ctx.globalAlpha=1; ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='bold '+fs+'px Trebuchet MS';
  ctx.shadowColor='#000'; ctx.shadowBlur=14; ctx.fillText('⚠ WARNING ⚠', VW/2, VH/2-10);
  const bn=BOSS_ROSTER[actOf(stage)].name+' INCOMING';
  ctx.font='bold '+Math.round(fs*0.42)+'px Trebuchet MS'; ctx.fillText(bn, VW/2, VH/2+fs*0.5);
  ctx.restore();
}
function drawBossBar(){
  if(!curBoss) return;
  const w=Math.min(560,VW*0.7), h=20, x=(VW-w)/2, y=VH-46;
  ctx.save();
  ctx.fillStyle='#000a'; ctx.fillRect(x-3,y-3,w+6,h+6);
  ctx.fillStyle='#3a0d12'; ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#ff3b3b'; ctx.fillRect(x,y,w*clamp(curBoss.hp/curBoss.maxHp,0,1),h);
  ctx.strokeStyle='#fff8'; ctx.strokeRect(x,y,w,h);
  ctx.fillStyle='#fff'; ctx.font='bold 14px Trebuchet MS'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('🚀 '+curBoss.name+' — STAGE '+stage+' BOSS', VW/2, y+h/2+1);
  ctx.restore();
}
function drawLeaderboard(){
  const w=Math.round(Math.max(140, Math.min(188, VW*0.34)));
  const rh=Math.max(18, Math.round(w/7.8));
  const fs=Math.max(11, Math.round(w/14.5));
  const maxRows=Math.max(4, Math.min(8, Math.floor((VH*0.5)/rh)));
  const rows=leaderboard().slice(0,maxRows);
  const x=VW-w-8, y0=96;   // below the top-right settings/mute buttons
  ctx.save();
  ctx.fillStyle='rgba(12,11,26,.7)'; ctx.fillRect(x,y0,w,rh*rows.length+rh+6);
  ctx.fillStyle='#ffd45e'; ctx.font='bold '+(fs+1)+'px Trebuchet MS'; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('🏆 LEADERBOARD', x+8, y0+rh*0.6);
  rows.forEach((r,i)=>{ const yy=y0+rh+6+i*rh;
    if(r.you){ ctx.fillStyle='rgba(255,212,94,.16)'; ctx.fillRect(x,yy-rh/2,w,rh); }
    ctx.font=(r.you?'bold ':'')+fs+'px Trebuchet MS';
    ctx.fillStyle=r.you?'#ffd45e':(r.dead?'#888':r.color);
    ctx.textAlign='left'; ctx.fillText((i+1)+'. '+r.name, x+8, yy);
    ctx.textAlign='right'; ctx.fillText(r.score, x+w-8, yy);
  });
  ctx.restore();
}
function drawHUD(){
  ctx.fillStyle='#ffffff14'; ctx.fillRect(0,0,VW,8);
  if(gameMode!=='arena'){ ctx.fillStyle='#36d6ff'; ctx.fillRect(0,0,VW*clamp(player.xp/player.xpNext,0,1),8); }
  const hw=Math.min(220,VW*0.44),hh=16,hx=62,hy=12;   // shifted right to clear the Home button
  ctx.fillStyle='#000a'; ctx.fillRect(hx,hy,hw,hh);
  ctx.fillStyle='#ff3b5b'; ctx.fillRect(hx,hy,hw*clamp(player.hp/player.maxHp,0,1),hh);
  ctx.strokeStyle='#fff6'; ctx.strokeRect(hx,hy,hw,hh);
  ctx.fillStyle='#fff'; ctx.font='bold 12px Trebuchet MS'; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText(Math.ceil(player.hp)+' / '+player.maxHp, hx+8, hy+hh/2+1);
  ctx.textBaseline='alphabetic'; ctx.font='bold 16px Trebuchet MS';
  ctx.fillText(gameMode==='arena'?('🪙 SIZE '+Math.round(player.grow)):('LV '+player.level), hx, hy+hh+18);
  ctx.textAlign='center'; ctx.font='bold 30px Trebuchet MS'; ctx.fillStyle='#fff'; ctx.fillText(fmt(Math.floor(time)), VW/2, 42);
  ctx.font='bold 14px Trebuchet MS'; ctx.fillStyle='#ffd45e';
  if(gameMode==='arena'){
    const rank=leaderboard().findIndex(r=>r.you)+1;
    ctx.fillText('ARENA · RANK '+rank+'/'+(bots.length+1), VW/2, 62);
  } else {
    ctx.fillText('STAGE '+stage+'/'+TOTAL_STAGES+(bossPhase===0?'  ·  '+Math.min(stageKills,stageQuota(stage))+'/'+stageQuota(stage)+' 👾':bossPhase===1?'  ·  ⚠':'  ·  🔥 BOSS'), VW/2, 62);
  }
  ctx.textAlign='right'; ctx.font='bold 16px Trebuchet MS'; ctx.fillStyle='#fff'; ctx.fillText('💀 '+player.kills, VW-14, 30);
}
function drawMinimap(){
  const R=Math.round(Math.max(46, Math.min(74, Math.min(VW,VH)*0.13)));
  const cx=(gameMode==='arena')?VW-R-12:R+12, cy=VH-R-12, range=1500;   // campaign radar bottom-left (clears boss bar)
  ctx.save();
  ctx.beginPath(); ctx.arc(cx,cy,R,0,7);
  ctx.fillStyle='rgba(8,10,22,.72)'; ctx.fill();
  ctx.lineWidth=2; ctx.strokeStyle='#4dd2ff88'; ctx.stroke();
  const plot=(wx,wy,color,sz)=>{ let dx=(wx-player.x)/range*R, dy=(wy-player.y)/range*R;
    const m=Math.hypot(dx,dy); if(m>R-5){ dx=dx/m*(R-5); dy=dy/m*(R-5); }
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(cx+dx,cy+dy,sz,0,7); ctx.fill(); };
  if(gameMode==='arena'){
    for(const b of bots) if(b.alive) plot(b.x,b.y,b.color,3.2);
  } else {
    for(const e of enemies){ if(e.stageBoss) continue; plot(e.x,e.y,'#ff6b6b',2); }   // swarm
    if(curBoss){ plot(curBoss.x,curBoss.y,'#ffd45e',7);                                  // BOSS marker
      const p=(Math.sin(frame*0.2)*0.5+0.5); ctx.globalAlpha=p; plot(curBoss.x,curBoss.y,'#fff',4); ctx.globalAlpha=1; }
  }
  ctx.fillStyle='#36d6ff'; ctx.beginPath(); ctx.arc(cx,cy,4.5,0,7); ctx.fill();   // YOU
  ctx.fillStyle='#cbd2ff'; ctx.font='bold 10px Trebuchet MS'; ctx.textAlign='center';
  ctx.fillText('RADAR', cx, cy-R-5);
  ctx.restore();
}
function drawJoystick(){
  ctx.globalAlpha=0.3; ctx.strokeStyle='#fff'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(joy.ox,joy.oy,60,0,7); ctx.stroke();
  ctx.fillStyle='#ffd45e'; ctx.beginPath(); ctx.arc(joy.ox+joy.dx*60,joy.oy+joy.dy*60,24,0,7); ctx.fill();
  ctx.globalAlpha=1;
}

// ---------- menus / boot ----------
function renderCharSelect(){
  const box=$('charSelect'); box.innerHTML='';
  CHARACTERS.forEach((c,i)=>{
    const el=document.createElement('button'); el.className='char'+(i===selectedChar?' sel':'');
    el.style.setProperty('--cg', c.glow);
    el.innerHTML=`<img src="${ver(c.file)}" alt="${c.name}"><div class="cn">${c.name}</div><div class="cp">${c.perk}</div>`;
    el.onclick=()=>{ selectedChar=i; renderCharSelect(); beep(1000,0.05,'square',0.03); };
    box.appendChild(el);
  });
}
const MAP_DECOR=['assets/boss-bnb.png','assets/boss-pepe.png','assets/boss-doge.png','assets/boss-wojak.png','assets/boss-astronaut.png',
  'assets/doge-sprite.png','assets/doge-mame.png'];
const LOCK_SVG='<svg viewBox="0 0 24 24" width="28" height="28" fill="#eef"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#eef" stroke-width="2"/></svg>';
function buildStageSelect(){
  const map=$('stageMap');
  const W=Math.min(VW*0.96, 600), gapY=140, padTop=132, padBot=120;   // padTop clears the sticky header
  const H=padTop+(TOTAL_STAGES-1)*gapY+padBot;
  map.style.width=W+'px'; map.style.height=H+'px';
  const cx=W/2, amp=W*0.28;
  const pos=n=>({x:cx+Math.sin(n*0.62)*amp, y:padTop+(n-1)*gapY});
  // starfield
  let st=''; for(let i=0;i<Math.floor(H/8);i++) st+=`<circle cx="${(Math.random()*W).toFixed(0)}" cy="${(Math.random()*H).toFixed(0)}" r="${(Math.random()*1.6+0.3).toFixed(1)}" fill="#fff" opacity="${(0.15+Math.random()*0.55).toFixed(2)}"/>`;
  // vector planets (light + shadow sphere + optional ring), scattered off the trail
  const planet=(x,y,r,c1,c2,ring)=>{ let s=`<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">`;
    if(ring) s+=`<ellipse rx="${(r*1.8).toFixed(0)}" ry="${(r*0.55).toFixed(0)}" fill="none" stroke="${ring}" stroke-width="4" opacity=".55" transform="rotate(-22)"/>`;
    s+=`<circle r="${r.toFixed(0)}" fill="${c2}"/><circle cx="${(-r*0.32).toFixed(0)}" cy="${(-r*0.32).toFixed(0)}" r="${(r*0.72).toFixed(0)}" fill="${c1}" opacity=".55"/>`;
    s+=`<circle cx="${(-r*0.4).toFixed(0)}" cy="${(-r*0.42).toFixed(0)}" r="${(r*0.18).toFixed(0)}" fill="#fff" opacity=".5"/></g>`; return s; };
  const PAL=[['#9fd8ff','#1f5a9e','#7fd0ff'],['#ffcaa0','#b8551f',0],['#d8b0ff','#5a2f9e','#c9a0ff'],['#a0ffc8','#2f9e5a',0],['#ffe08a','#b8860b','#ffd45e'],['#ff9fc0','#9e2f5a',0]];
  let pl='';
  for(let i=0;i<9;i++){ const c=PAL[i%PAL.length], r=rand(16,44), p=pos(i*5+3);
    const sideX = (i%2? rand(W*0.62,W-30) : rand(30,W*0.34));   // keep off the central trail
    pl+=planet(sideX, clamp(p.y+rand(-40,40),50,H-50), r, c[0], c[1], c[2]); }
  let pts=''; for(let n=1;n<=TOTAL_STAGES;n++){ const p=pos(n); pts+=p.x.toFixed(0)+','+p.y.toFixed(0)+' '; }
  let h='<svg width="'+W+'" height="'+H+'" style="position:absolute;left:0;top:0;pointer-events:none;z-index:0">'+st+pl
    +'<polyline points="'+pts+'" fill="none" stroke="#ffffff55" stroke-width="3" stroke-dasharray="2 13" stroke-linecap="round"/></svg>';
  // boss mascots drifting in space — big & clearly visible, cycling all of them
  let di=0;
  for(let n=4;n<=TOTAL_STAGES;n+=3){ const p=pos(n), side=(Math.sin(n*0.62)>0)?-1:1, img=MAP_DECOR[di++ % MAP_DECOR.length];
    const sz=84+(di%3)*16;   // 84-116px
    h+='<div class="decor" style="left:'+clamp(cx+side*amp*1.45,sz/2+8,W-sz/2-8).toFixed(0)+'px;top:'+p.y.toFixed(0)+'px;width:'+sz+'px;height:'+sz+'px"><img src="'+ver(img)+'"></div>'; }
  // sector labels every 10 stages
  for(let r=0;r<TOTAL_STAGES;r+=10){ const p=pos(r+1);
    h+='<div class="banner-ribbon" style="left:'+cx+'px;top:'+(p.y-50).toFixed(0)+'px">★ SECTOR '+(Math.floor(r/10)+1)+' · '+MAPS[Math.floor(r/10)%MAPS.length].name+' ★</div>'; }
  for(let n=1;n<=TOTAL_STAGES;n++){ const p=pos(n), locked=n>maxUnlocked, cur=n===maxUnlocked, region=actOf(n), stars=n<maxUnlocked?'★★★':'';
    h+='<button class="snode s'+region+(locked?' locked':'')+(cur?' cur':'')+'" style="left:'+p.x.toFixed(0)+'px;top:'+p.y.toFixed(0)+'px" '+(locked?'disabled':'data-n="'+n+'"')+'>'
      +(locked?'<span class="lk">'+LOCK_SVG+'</span>':'<span class="num">'+n+'</span>'+(stars?'<span class="stars">'+stars+'</span>':''))+'</button>';
  }
  map.innerHTML=h;
  map.querySelectorAll('.snode[data-n]').forEach(b=> b.onclick=()=>{ beep(1000,0.05,'square',0.04); startStage(+b.dataset.n); });
  const cp=pos(Math.max(1,maxUnlocked)); $('stageSelect').scrollTop=Math.max(0, cp.y - VH*0.4);
}
function enterCampaign(){ gameMode='campaign'; buildStageSelect(); hideOverlays(); $('stageSelect').style.display='block';
  gs=ST.STAGESELECT; location.hash='campaign'; startAudio(); }
function backToMenu(){ hideOverlays(); $('menu').style.display='flex'; gs=ST.MENU; location.hash=''; }

renderCharSelect();
$('startBtn').onclick=()=>{ gameMode==='arena' ? startArena() : enterCampaign(); };
$('retryBtn').onclick=()=>{ gameMode==='arena' ? startArena() : startStage(lastStage); };
$('winRetry').onclick=()=>{ startStage(1); };
$('story').onclick=()=>{ storyAdvance(); };
$('vnSkip').onclick=(e)=>{ e.stopPropagation(); beginPlay(); };
$('trans').onclick=()=>{ transAdvance(); };
$('transNext').onclick=(e)=>{ e.stopPropagation(); proceedNext(); };
$('transSkip').onclick=(e)=>{ e.stopPropagation(); proceedNext(); };
window.addEventListener('keydown', e=>{
  if(gs===ST.STORY){
    if(e.code==='Space'){ e.preventDefault(); beginPlay(); }
    else if(e.code==='Enter'||e.code==='ArrowRight'){ e.preventDefault(); storyAdvance(); }
  } else if(gs===ST.TRANS){
    if(e.code==='Space'){ e.preventDefault(); proceedNext(); }
    else if(e.code==='Enter'||e.code==='ArrowRight'){ e.preventDefault(); transAdvance(); }
  }
});
$('winHome').onclick=()=>{ backToMenu(); };
$('overHome').onclick=()=>{ backToMenu(); };
$('homeBtn').onclick=()=>{ backToMenu(); };
$('clearNext').onclick=()=>{ startStage(Math.min(TOTAL_STAGES,stage+1)); };
$('clearMap').onclick =()=>{ enterCampaign(); };
$('stageBack').onclick=()=>{ backToMenu(); };
const GEAR_SVG='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5l1.6 2 2.5-.6.6 2.5 2.5.8-.8 2.4 1.6 2.1-1.6 2.1.8 2.4-2.5.8-.6 2.5-2.5-.6L12 21.5l-1.6-2-2.5.6-.6-2.5-2.5-.8.8-2.4L3 12l1.6-2.1-.8-2.4 2.5-.8.6-2.5 2.5.6z"/></svg>';
const spk=on=> on
 ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="2"/></svg>'
 : '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M3 9v6h4l5 4V5L7 9H3z"/><line x1="16" y1="9.5" x2="22" y2="14.5" stroke="#fff" stroke-width="2"/><line x1="22" y1="9.5" x2="16" y2="14.5" stroke="#fff" stroke-width="2"/></svg>';
$('settingsBtn').innerHTML=GEAR_SVG; $('muteBtn').innerHTML=spk(!muted);
$('muteBtn').onclick=()=>{ const m=toggleMute(); $('muteBtn').innerHTML=spk(!m); };
$('menuBest').textContent='Best: '+fmt(best);

// mode select (Campaign / Arena) — image cards
document.querySelectorAll('#modeSelect .mode').forEach(btn=>{
  btn.classList.toggle('sel', btn.dataset.mode===gameMode);
  btn.onclick=()=>{ gameMode=btn.dataset.mode; localStorage.setItem('mame_mode',gameMode);
    document.querySelectorAll('#modeSelect .mode').forEach(x=>x.classList.toggle('sel',x.dataset.mode===gameMode));
    beep(1000,0.05,'square',0.03); };
});

// settings + volume (doubles as pause)
const musicSlider=$('musicSlider'), sfxSlider=$('sfxSlider');
musicSlider.value=Math.round(musicVol*100); $('musicVal').textContent=musicSlider.value;
sfxSlider.value=Math.round(sfxVol*100);     $('sfxVal').textContent=sfxSlider.value;
musicSlider.oninput=()=>{ setMusicVol(musicSlider.value/100); $('musicVal').textContent=musicSlider.value; };
sfxSlider.oninput  =()=>{ setSfxVol(sfxSlider.value/100);     $('sfxVal').textContent=sfxSlider.value; };
$('settingsBtn').onclick=()=>{ if(gs===ST.PLAY) paused=true; $('settings').style.display='flex'; };
$('closeSettings').onclick=()=>{ $('settings').style.display='none'; if(gs===ST.PLAY) paused=false; };

(function loop(ts){ if(lastTs) DT=Math.max(0.3, Math.min(3.5, (ts-lastTs)/16.667)); lastTs=ts;
  update(); draw(); requestAnimationFrame(loop); })();
