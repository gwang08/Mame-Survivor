// Doge Survivor — audio: gunshot SFX + looping chiptune background music
// Uses the shared WebAudio context `AC` and `muted` flag from core.js.

// ---- gunshot: noise "bang" + low thump ----
function gunshot(){
  if(muted || !ensureAC()) return;
  const t = AC.currentTime, dur = 0.12;
  // white-noise burst through a band-pass = punchy crack
  const buf = AC.createBuffer(1, Math.floor(AC.sampleRate*dur), AC.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/d.length, 2);
  const src = AC.createBufferSource(); src.buffer = buf;
  const bp = AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1400; bp.Q.value=0.7;
  const ng = AC.createGain(); ng.gain.setValueAtTime(0.16,t); ng.gain.exponentialRampToValueAtTime(0.001,t+dur);
  src.connect(bp); bp.connect(ng); ng.connect(AC.destination); src.start(t);
  // low triangle thump for body
  const o = AC.createOscillator(), og = AC.createGain(); o.type='triangle';
  o.frequency.setValueAtTime(240,t); o.frequency.exponentialRampToValueAtTime(60,t+0.1);
  og.gain.setValueAtTime(0.12,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.12);
  o.connect(og); og.connect(AC.destination); o.start(t); o.stop(t+0.13);
}

// ---- background music: 16-step loop, bass + pentatonic arp ----
let musicTimer=null, musicGain=null, mStep=0;
const ARP  = [220, 261.63, 293.66, 329.63, 392.00, 440];          // A minor pentatonic
const BASS = [110, 110, 146.83, 164.81];                          // A2 A2 D3 E3 (one per bar)

function mTone(freq, dur, type, vol, t){
  const o=AC.createOscillator(), g=AC.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+dur+0.02);
}
function startMusic(){
  if(musicTimer || !ensureAC()) return;
  musicGain = AC.createGain(); musicGain.gain.value = muted?0:0.6; musicGain.connect(AC.destination);
  mStep = 0;
  musicTimer = setInterval(()=>{
    const t = AC.currentTime + 0.02;
    if(mStep % 4 === 0) mTone(BASS[(mStep/4) % BASS.length], 0.42, 'sawtooth', 0.10, t); // bass each bar
    mTone(ARP[mStep % ARP.length], 0.16, 'square', 0.045, t);                            // arp each step
    if(mStep % 8 === 4) mTone(ARP[(mStep+2) % ARP.length]*2, 0.10, 'triangle', 0.03, t); // sparkle
    mStep++;
  }, 175);
}
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer=null; } }

// ---- mute toggle (returns new state) ----
function toggleMute(){
  muted = !muted;
  if(musicGain) musicGain.gain.value = muted ? 0 : 0.6;
  return muted;
}
