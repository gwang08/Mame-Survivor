// Mame Survivor — audio: MP3 background music (file) + gunshot SFX + volume controls
// Music = <audio id="bgm"> element (assets/nhacnen.mp3). SFX = WebAudio (core.js beep + gunshot).
// Volumes persist in localStorage; `muted`, `sfxVol`, `musicVol` live in core.js.

const bgm = document.getElementById('bgm');
if (bgm) bgm.volume = muted ? 0 : musicVol;

// start music (call on first user gesture / game start). Safe to call repeatedly.
function playMusic(){
  if(!bgm) return;
  bgm.volume = muted ? 0 : musicVol;
  if(bgm.paused){ const p = bgm.play(); if(p&&p.catch) p.catch(()=>{}); }   // ignore autoplay block
}
function setMusicVol(v){
  musicVol = Math.max(0, Math.min(1, v));
  localStorage.setItem('mame_musicvol', musicVol);
  if(bgm) bgm.volume = muted ? 0 : musicVol;
}
function setSfxVol(v){
  sfxVol = Math.max(0, Math.min(1, v));
  localStorage.setItem('mame_sfxvol', sfxVol);
  beep(880,0.05,'square',0.05);   // little preview blip
}
function toggleMute(){
  muted = !muted;
  if(bgm) bgm.volume = muted ? 0 : musicVol;
  return muted;
}

// ---- gunshot: noise "bang" + low thump (scaled by sfxVol) ----
function gunshot(){
  if(muted || sfxVol<=0 || !ensureAC()) return;
  const t = AC.currentTime, dur = 0.12, V = sfxVol;
  const buf = AC.createBuffer(1, Math.floor(AC.sampleRate*dur), AC.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 2);
  const src = AC.createBufferSource(); src.buffer = buf;
  const bp = AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=0.7;
  const ng = AC.createGain(); ng.gain.setValueAtTime(0.16*V,t); ng.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  src.connect(bp); bp.connect(ng); ng.connect(AC.destination); src.start(t);
  const o = AC.createOscillator(), og = AC.createGain(); o.type='triangle';
  o.frequency.setValueAtTime(240,t); o.frequency.exponentialRampToValueAtTime(60,t+0.1);
  og.gain.setValueAtTime(0.12*V,t); og.gain.exponentialRampToValueAtTime(0.0008,t+0.12);
  o.connect(og); og.connect(AC.destination); o.start(t); o.stop(t+0.13);
}

// start music on the very first user interaction (browser autoplay policy)
['pointerdown','keydown','touchstart'].forEach(ev=>
  window.addEventListener(ev, ()=>{ if(ensureAC()&&AC.state==='suspended')AC.resume(); playMusic(); }, {once:true, passive:true}));
