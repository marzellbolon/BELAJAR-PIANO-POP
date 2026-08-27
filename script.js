/* ============ STATE ============ */
let bpm = 100;
let beatsPerMeasure = 4;
let isPlaying = false;
let currentBeat = 0;
let audioCtx = null;
let schedulerTimer = null;
let nextNoteTime = 0;
const scheduleAheadTime = 0.15;
const lookahead = 25; // ms

/* ============ TABS ============ */
function switchTab(tab){
  document.getElementById('panelMetronome').classList.toggle('hidden', tab!=='metronome');
  document.getElementById('panelNotes').classList.toggle('hidden', tab!=='notes');
  document.getElementById('tabBtnMetronome').classList.toggle('active', tab==='metronome');
  document.getElementById('tabBtnNotes').classList.toggle('active', tab==='notes');
}

/* ============ BPM CONTROLS ============ */
function setBpm(val){
  bpm = Math.max(40, Math.min(208, parseInt(val)));
  document.getElementById('bpmVal').textContent = bpm;
  document.getElementById('bpmSlider').value = bpm;
  updateTempoWord();
}
function changeBpm(delta){
  setBpm(bpm + delta);
}
function updateTempoWord(){
  const el = document.getElementById('tempoWord');
  let word = 'Moderato';
  if(bpm < 60) word = 'Largo (pelan banget)';
  else if(bpm < 80) word = 'Adagio (santai)';
  else if(bpm < 110) word = 'Moderato (sedang)';
  else if(bpm < 140) word = 'Allegro (cepat)';
  else word = 'Presto (super cepat)';
  el.textContent = word;
}
updateTempoWord();

/* ============ BEAT DOTS ============ */
function updateBeatDots(){
  beatsPerMeasure = parseInt(document.getElementById('timeSig').value);
  const wrap = document.getElementById('beatDots');
  wrap.innerHTML = '';
  for(let i=0;i<beatsPerMeasure;i++){
    const d = document.createElement('div');
    d.className = 'beat-dot';
    d.id = 'dot'+i;
    wrap.appendChild(d);
  }
}
updateBeatDots();

/* ============ AUDIO ============ */
function ensureAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === 'suspended') audioCtx.resume();
}
function clickSound(time, accented){
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = accented ? 1200 : 800;
  gain.gain.setValueAtTime(0.001, time);
  gain.gain.exponentialRampToValueAtTime(accented ? 0.55 : 0.35, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.09);
}

/* ============ SCHEDULER (metronome) ============ */
function scheduler(){
  while(nextNoteTime < audioCtx.currentTime + scheduleAheadTime){
    const beatIndex = currentBeat % beatsPerMeasure;
    const accented = beatIndex === 0;
    clickSound(nextNoteTime, accented);
    const delayMs = (nextNoteTime - audioCtx.currentTime) * 1000;
    scheduleVisualBeat(beatIndex, accented, Math.max(0,delayMs));
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat;
    currentBeat++;
  }
  schedulerTimer = setTimeout(scheduler, lookahead);
}

function scheduleVisualBeat(beatIndex, accented, delayMs){
  setTimeout(()=>{
    highlightDot(beatIndex, accented);
    animateBallV();
  }, delayMs);
}

function highlightDot(beatIndex, accented){
  document.querySelectorAll('.beat-dot').forEach(d=>{
    d.classList.remove('on','accent-on');
  });
  const dot = document.getElementById('dot'+beatIndex);
  if(dot){
    dot.classList.add('on');
    if(accented) dot.classList.add('accent-on');
  }
}

/* ============ BALL "V" ANIMATION ============ */
function animateBallV(){
  const stage = document.querySelector('.stage');
  const ball = document.getElementById('ball');
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const topY = 24;
  const bottomY = h - 34;
  const leftX = w*0.28;
  const centerX = w*0.5;
  const rightX = w*0.72;
  const secondsPerBeat = 60.0 / bpm;
  const durationMs = Math.max(120, secondsPerBeat * 1000 * 0.96);

  ball.getAnimations().forEach(a=>a.cancel());
  ball.animate([
    { left: leftX+'px', top: topY+'px', offset: 0 },
    { left: centerX+'px', top: bottomY+'px', offset: 0.5 },
    { left: rightX+'px', top: topY+'px', offset: 1 }
  ], {
    duration: durationMs,
    easing: 'ease-in-out',
    fill: 'forwards'
  });
}

/* ============ PLAY / STOP ============ */
function toggleMetronome(){
  ensureAudio();
  const btn = document.getElementById('playBtn');
  if(!isPlaying){
    isPlaying = true;
    currentBeat = 0;
    nextNoteTime = audioCtx.currentTime + 0.05;
    scheduler();
    btn.textContent = '■ Berhenti';
    btn.classList.add('playing');
  } else {
    isPlaying = false;
    clearTimeout(schedulerTimer);
    btn.textContent = '▶ Mulai';
    btn.classList.remove('playing');
    document.querySelectorAll('.beat-dot').forEach(d=>d.classList.remove('on','accent-on'));
  }
}

/* ============ NOTE VALUES ============ */
const noteDefs = [
  { id:'whole', name:'Not Penuh', beats:4, desc:'4 ketuk' },
  { id:'half', name:'Not 1/2', beats:2, desc:'2 ketuk' },
  { id:'quarter', name:'Not 1/4', beats:1, desc:'1 ketuk' },
  { id:'eighth', name:'Not 1/8', beats:0.5, desc:'½ ketuk' },
  { id:'sixteenth', name:'Not 1/16', beats:0.25, desc:'¼ ketuk' },
];

function noteSVG(id){
  // Simple friendly note glyphs drawn by hand (not relying on music unicode fonts)
  const stemColor = '#1B4B43';
  const headFillOpen = '#fff';
  const headFillSolid = '#FF6B5B';
  switch(id){
    case 'whole':
      return `<svg viewBox="0 0 80 80"><ellipse cx="40" cy="46" rx="20" ry="13" fill="${headFillOpen}" stroke="${stemColor}" stroke-width="5"/></svg>`;
    case 'half':
      return `<svg viewBox="0 0 80 80"><ellipse cx="32" cy="54" rx="15" ry="10" fill="${headFillOpen}" stroke="${stemColor}" stroke-width="5" transform="rotate(-18 32 54)"/><rect x="44" y="10" width="5" height="46" fill="${stemColor}"/></svg>`;
    case 'quarter':
      return `<svg viewBox="0 0 80 80"><ellipse cx="32" cy="54" rx="15" ry="10" fill="${headFillSolid}" stroke="${stemColor}" stroke-width="5" transform="rotate(-18 32 54)"/><rect x="44" y="10" width="5" height="46" fill="${stemColor}"/></svg>`;
    case 'eighth':
      return `<svg viewBox="0 0 80 80"><ellipse cx="32" cy="54" rx="15" ry="10" fill="${headFillSolid}" stroke="${stemColor}" stroke-width="5" transform="rotate(-18 32 54)"/><rect x="44" y="10" width="5" height="46" fill="${stemColor}"/><path d="M49 10 Q68 18 60 34" stroke="${stemColor}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
    case 'sixteenth':
      return `<svg viewBox="0 0 80 80"><ellipse cx="32" cy="54" rx="15" ry="10" fill="${headFillSolid}" stroke="${stemColor}" stroke-width="5" transform="rotate(-18 32 54)"/><rect x="44" y="10" width="5" height="46" fill="${stemColor}"/><path d="M49 10 Q68 16 60 30" stroke="${stemColor}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M49 22 Q68 28 60 42" stroke="${stemColor}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
  }
}

function buildNoteGrid(){
  const grid = document.getElementById('noteGrid');
  grid.innerHTML = '';
  noteDefs.forEach(n=>{
    const card = document.createElement('div');
    card.className = 'note-card';
    card.id = 'card-'+n.id;
    card.innerHTML = `
      ${noteSVG(n.id)}
      <h3>${n.name}</h3>
      <div class="dur">${n.desc}</div>
      <button class="listen-btn" id="listen-${n.id}">🔊 Dengarkan</button>
    `;
    card.addEventListener('click', (e)=>{
      document.querySelectorAll('.note-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
    });
    grid.appendChild(card);
    document.getElementById('listen-'+n.id).addEventListener('click', (e)=>{
      e.stopPropagation();
      playNoteDemo(n.beats, n.id);
    });
  });
}
buildNoteGrid();

let notePlaying = false;
function playNoteDemo(beatsPerNote, id){
  if(notePlaying) return;
  ensureAudio();
  notePlaying = true;
  const totalBeats = 4;
  const count = Math.round(totalBeats / beatsPerNote);
  const secondsPerBeat = 60.0/bpm;
  const noteDurSec = secondsPerBeat * beatsPerNote;
  const btn = document.getElementById('listen-'+id);
  btn.classList.add('playing');
  const startTime = audioCtx.currentTime + 0.05;
  for(let i=0;i<count;i++){
    clickSound(startTime + i*noteDurSec, i===0);
  }
  const card = document.getElementById('card-'+id);
  let i = 0;
  const pulseInterval = setInterval(()=>{
    card.style.transform = 'scale(1.06)';
    setTimeout(()=>{ card.style.transform = 'scale(1)'; }, Math.min(140, noteDurSec*400));
    i++;
    if(i>=count){
      clearInterval(pulseInterval);
    }
  }, noteDurSec*1000);
  setTimeout(()=>{
    notePlaying = false;
    btn.classList.remove('playing');
  }, count*noteDurSec*1000 + 100);
}