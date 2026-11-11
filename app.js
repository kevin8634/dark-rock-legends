(() => {
'use strict';
const T = window.TRACKS, CH = window.CHAPTERS, PEAKS = window.PEAKS || {};
const chOf = id => CH.find(c => c.id === id);
const $ = id => document.getElementById(id);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const audio = $('audio'), ost = $('ost'), stage = $('stage');
const bgs = [$('bgA'), $('bgB')]; let bgOn = 0;
const fxC = $('fx'), fx = fxC.getContext('2d');
const ringC = $('rings'), rg = ringC.getContext('2d');
const waveC = $('wave'), wv = waveC.getContext('2d');
const bellEl = $('bell'), bellGold = bellEl.querySelector('.b-gold');

// ---------- 存档：钟印 ----------
const KEY = 'drl_seals_v1';
let seals = new Set();
try { seals = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) {}
const saveSeals = () => { try { localStorage.setItem(KEY, JSON.stringify([...seals])); } catch (e) {} };

// ---------- 状态 ----------
let idx = -1, shuffle = false, loopOne = false, heard = 0, lastT = 0, collectedThis = false;

// ---------- 航线 ----------
const route = $('route');
const TYPE = { scene: '场景', camp: '营地', boss: '首领' };
CH.forEach(c => {
  const h = document.createElement('div');
  h.className = 'r-ch'; h.innerHTML = `${c.zh}<small>${c.en}</small>`;
  route.appendChild(h);
  T.forEach((t, i) => {
    if (t.ch !== c.id) return;
    const b = document.createElement('button');
    b.className = 'r-tr'; b.dataset.i = i;
    b.innerHTML = `<i></i><span>${t.zh}</span><span class="ty ${t.type}">${TYPE[t.type]}</span><a class="dl" href="music/${t.id}.mp3" download title="下载">⇩</a>`;
    b.addEventListener('click', e => { if (e.target.classList.contains('dl')) return; select(i, true); });
    route.appendChild(b);
  });
});
const trBtns = [...route.querySelectorAll('.r-tr')];
function paintRoute() {
  trBtns.forEach(b => {
    const i = +b.dataset.i;
    b.classList.toggle('on', i === idx);
    b.classList.toggle('got', seals.has(T[i].id));
  });
  $('sealCount').textContent = seals.size;
  const a = trBtns.find(b => +b.dataset.i === idx);
  if (a) {
    if (route.scrollWidth > route.clientWidth + 4) route.scrollTo({ left: a.offsetLeft - route.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    else route.scrollTo({ top: a.offsetTop - route.clientHeight / 2, behavior: 'smooth' });
  }
}

// ---------- 曲目列表（下载区） ----------
const tl = $('tracklist');
tl.innerHTML = T.map((t, i) => `<a href="music/${t.id}.mp3" download>${String(i + 1).padStart(2, '0')}  ${t.zh} · <i>${t.en}</i></a>`).join('');
$('dlOst').addEventListener('click', e => { e.preventDefault(); tl.hidden = !tl.hidden; });

// ---------- 选择曲目 ----------
function select(i, play) {
  idx = (i + T.length) % T.length;
  const t = T[idx], c = chOf(t.ch);
  // 背景交叉淡入
  const next = bgs[1 - bgOn];
  next.style.backgroundImage = `url(img/${t.img}.webp)`;
  const img = new Image(); img.src = `img/${t.img}.webp`;
  img.onload = () => { next.classList.add('on'); bgs[bgOn].classList.remove('on'); bgOn = 1 - bgOn; };
  ost.classList.remove('boss', 'camp', 'scene'); ost.classList.add(t.type);
  $('nowCh').textContent = `${c.zh} · ${TYPE[t.type]}`;
  $('nowZh').textContent = t.zh; $('nowEn').textContent = t.en;
  $('bossName').textContent = t.type === 'boss' ? `☠ ${t.boss} · ${t.bossEn}` : '';
  setFx(t.fx);
  showLore(true);
  audio.src = `music/${t.id}.mp3`;
  heard = 0; lastT = 0; collectedThis = seals.has(t.id);
  paintRoute(); drawWave(0);
  if (play) doPlay();
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `${t.zh} ${t.en}`, artist: '暗岩传说 Dark Rock Legends', album: c.zh,
      artwork: [{ src: `img/${t.img}.webp`, sizes: '1920x1080', type: 'image/webp' }]
    });
  }
}

function showLore(anim) {
  const lore = $('lore');
  if (idx < 0) return;
  const t = T[idx], got = seals.has(t.id);
  $('lorePlace').textContent = `${t.place} · ${t.placeEn}`;
  $('loreText').textContent = got ? t.note : '这一页还被潮水浸着，听完这首曲子才能看清。';
  $('loreEn').textContent = got ? t.noteEn : 'This page is still soaked by the tide. Finish the track to read it.';
  lore.classList.toggle('locked', !got);
  $('loreState').innerHTML = got ? `已获得钟印 <b>${seals.size}/21</b>` : `聆听进度 <b id="heardPct">${pct()}%</b> · 听完 80% 获得钟印`;
  if (anim) { lore.classList.remove('reveal'); void lore.offsetWidth; lore.classList.add('reveal'); }
}
const pct = () => audio.duration ? Math.min(100, Math.round(heard / audio.duration / .8 * 100)) : 0;

// ---------- 音频图 ----------
let actx, analyser, freq;
function ensureAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  try {
    const src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = .78;
    src.connect(analyser); analyser.connect(actx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  } catch (e) { analyser = null; }
}
function doPlay() { ensureAudio(); audio.play().catch(() => {}); }
function toggle() { if (idx < 0) return select(0, true); audio.paused ? doPlay() : audio.pause(); }
function nextTrack(dir = 1) {
  if (shuffle && T.length > 1) { let j; do { j = Math.floor(Math.random() * T.length); } while (j === idx); return select(j, true); }
  select(idx + dir, true);
}

audio.addEventListener('play', () => { $('btnPlay').textContent = '❚❚'; });
audio.addEventListener('pause', () => { $('btnPlay').textContent = '▶'; });
audio.addEventListener('loadedmetadata', () => { $('tDur').textContent = fmt(audio.duration); });
audio.addEventListener('timeupdate', () => {
  const ct = audio.currentTime, d = ct - lastT; lastT = ct;
  if (d > 0 && d < 1.5 && !audio.paused) heard += d;
  $('tCur').textContent = fmt(ct);
  if (!collectedThis && audio.duration && heard >= audio.duration * .8) collect();
  const hp = $('heardPct'); if (hp) hp.textContent = pct() + '%';
});
audio.addEventListener('ended', () => {
  const t = T[idx];
  if (t && t.type === 'boss') toast(`已击败 · ${t.boss}`, 'DEFEATED', true);
  if (loopOne) { audio.currentTime = 0; doPlay(); } else setTimeout(() => nextTrack(1), t && t.type === 'boss' ? 2200 : 400);
});
const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';

function collect() {
  collectedThis = true;
  const t = T[idx]; if (seals.has(t.id)) return;
  seals.add(t.id); saveSeals(); paintRoute(); showLore(true);
  const s = $('seals'); s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse');
  toast(`获得钟印 ${seals.size}/21`, `Seal of “${t.en}”`);
  burst(1.4);
  if (seals.size === T.length) setTimeout(awaken, 2500);
}

// ---------- 控件 ----------
$('btnPlay').onclick = toggle;
$('btnNext').onclick = () => nextTrack(1);
$('btnPrev').onclick = () => (audio.currentTime > 4 ? (audio.currentTime = 0) : nextTrack(-1));
$('btnShuffle').onclick = e => { shuffle = !shuffle; e.currentTarget.classList.toggle('act', shuffle); toast(shuffle ? '随机播放' : '顺序播放'); };
$('btnLoop').onclick = e => { loopOne = !loopOne; e.currentTarget.classList.toggle('act', loopOne); e.currentTarget.textContent = loopOne ? '①' : '⟳'; toast(loopOne ? '单曲循环' : '列表循环'); };
$('vol').oninput = e => { audio.volume = +e.target.value; };
audio.volume = .8;
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.code === 'Space' && inView) { e.preventDefault(); toggle(); }
  else if (e.code === 'ArrowRight' && audio.duration) audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  else if (e.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 10);
  else if (e.key === 'n' || e.key === 'N') nextTrack(1);
  else if (e.key === 'p' || e.key === 'P') nextTrack(-1);
});
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', doPlay);
  navigator.mediaSession.setActionHandler('pause', () => audio.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack(1));
  navigator.mediaSession.setActionHandler('previoustrack', () => nextTrack(-1));
}

// ---------- 波形 / 首领血条 ----------
function sizeCanvas(c) {
  const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
}
function drawWave(p) {
  const W = waveC.width, H = waveC.height; wv.clearRect(0, 0, W, H);
  const t = T[idx]; if (!t) return;
  const pk = PEAKS[t.id] || [], n = pk.length || 1, bw = W / n;
  const boss = t.type === 'boss';
  if (boss) { // 血条底
    const hp = 1 - p;
    wv.fillStyle = '#1a0605'; wv.fillRect(0, H * .3, W, H * .4);
    const g = wv.createLinearGradient(0, 0, W * hp, 0); g.addColorStop(0, '#7a0d0a'); g.addColorStop(1, '#e2463b');
    wv.fillStyle = g; wv.fillRect(0, H * .3, W * hp, H * .4);
    wv.strokeStyle = '#ffb3a855'; wv.strokeRect(.5, H * .3, W - 1, H * .4);
  }
  for (let i = 0; i < n; i++) {
    const a = pk[i] || .05, h = Math.max(2, a * H * (boss ? .9 : .92));
    const x = i * bw, played = i / n < p;
    if (boss) wv.fillStyle = played ? 'rgba(255,255,255,.08)' : 'rgba(255,190,170,.35)';
    else wv.fillStyle = played ? '#f0b35a' : 'rgba(63,224,200,.32)';
    wv.fillRect(x + bw * .2, (H - h) / 2, bw * .6, h);
  }
  // 火星
  const x = p * W; const g2 = wv.createRadialGradient(x, H / 2, 0, x, H / 2, 10);
  g2.addColorStop(0, boss ? '#fff' : '#fff2c4'); g2.addColorStop(1, 'transparent');
  wv.fillStyle = g2; wv.fillRect(x - 10, 0, 20, H);
}
let seeking = false;
const seekTo = e => { if (!audio.duration) return; const r = waveC.getBoundingClientRect(); audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audio.duration; };
waveC.addEventListener('pointerdown', e => { if (idx < 0) return; seeking = true; waveC.setPointerCapture(e.pointerId); seekTo(e); });
waveC.addEventListener('pointermove', e => seeking && seekTo(e));
waveC.addEventListener('pointerup', () => { seeking = false; });

// ---------- 敲钟 ----------
let clicks = [];
bellEl.addEventListener('click', () => {
  ensureAudio(); strike(); burst(1);
  const now = performance.now(); clicks = clicks.filter(t => now - t < 3000); clicks.push(now);
  if (clicks.length >= 7) { clicks = []; mirrorEgg(); }
});
function strike() {
  if (!actx) return;
  const base = idx >= 0 ? chOf(T[idx].ch).bell : 196, t0 = actx.currentTime;
  const out = actx.createGain(); out.gain.value = .22; out.connect(actx.destination);
  [[1, 1, 3.2], [2.0, .5, 2.4], [2.76, .35, 1.8], [5.4, .18, 1.0], [8.93, .1, .6], [.5, .4, 3.8]].forEach(([m, a, d]) => {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = base * m;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(a, t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + d + .05);
  });
}
function mirrorEgg() {
  stage.classList.add('mirror');
  toast('镜中的你，先敲响了钟', 'Your reflection rang it first');
  setTimeout(() => stage.classList.remove('mirror'), 5000);
}

// ---------- 提示 ----------
let toastTimer;
function toast(a, b, defeat) {
  const el = $('toast'); el.innerHTML = a + (b ? `<small>${b}</small>` : '');
  el.classList.toggle('defeat', !!defeat); el.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), defeat ? 2600 : 2000);
}

// ---------- 苏醒 ----------
function awaken() { const a = $('awaken'); a.hidden = false; }
$('awClose').onclick = () => { $('awaken').hidden = true; };

// ---------- 粒子 ----------
const FX = {
  mist:   { n: 26, col: [180, 230, 222], size: [80, 220], vy: [-.05, .05], vx: [.08, .25], a: .06, blur: true },
  embers: { n: 70, col: [255, 160, 70], size: [1, 3], vy: [-.9, -.3], vx: [-.2, .2], a: .9, glow: true },
  rain:   { n: 140, col: [170, 210, 220], size: [1, 1.6], vy: [9, 14], vx: [-1.6, -1], a: .35, streak: true },
  snow:   { n: 90, col: [210, 240, 255], size: [1, 2.6], vy: [.3, 1], vx: [-.3, .3], a: .7 },
  abyss:  { n: 60, col: [90, 255, 210], size: [1, 2.4], vy: [-.4, -.1], vx: [-.15, .15], a: .8, glow: true, flicker: true },
  tide:   { n: 55, col: [255, 210, 130], size: [1, 2.2], vy: [-.15, .15], vx: [-.25, .25], a: .7, glow: true, flicker: true }
};
let cfg = FX.mist, parts = [];
const rnd = (a, b) => a + Math.random() * (b - a);
function spawn(p, init) {
  const W = fxC.width, H = fxC.height;
  p.x = rnd(0, W); p.y = init ? rnd(0, H) : (cfg.vy[0] < 0 ? H + 20 : (cfg.vy[1] > 2 ? -20 : rnd(0, H)));
  p.s = rnd(cfg.size[0], cfg.size[1]) * (cfg.blur ? 1 : Math.min(2, devicePixelRatio || 1));
  p.vx = rnd(cfg.vx[0], cfg.vx[1]); p.vy = rnd(cfg.vy[0], cfg.vy[1]); p.ph = Math.random() * 6.28; p.z = rnd(.4, 1);
  return p;
}
function setFx(name) {
  cfg = FX[name] || FX.mist;
  const n = Math.round(cfg.n * (RM ? .25 : 1) * (innerWidth < 720 ? .6 : 1));
  parts = Array.from({ length: n }, () => spawn({}, true));
}
function burst(k) { energyKick = Math.max(energyKick, k); rings.push({ r: 0, a: .9 * k, w: 2 + k * 2 }); }

// ---------- 主循环 ----------
let energy = 0, bass = 0, energyKick = 0, rings = [], prevBass = 0;
let mx = 0, my = 0, px = 0, py = 0, inView = false, t0 = performance.now();
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
addEventListener('deviceorientation', e => { if (e.gamma == null) return; mx = Math.max(-.5, Math.min(.5, e.gamma / 60)); my = Math.max(-.5, Math.min(.5, (e.beta - 45) / 60)); });

function resize() { sizeCanvas(fxC); sizeCanvas(ringC); sizeCanvas(waveC); setFx(idx >= 0 ? T[idx].fx : 'mist'); drawWave(audio.duration ? audio.currentTime / audio.duration : 0); }
addEventListener('resize', resize);

function frame(now) {
  requestAnimationFrame(frame);
  if (!inView) return;
  const time = (now - t0) / 1000;
  // 音频能量
  if (analyser && !audio.paused) {
    analyser.getByteFrequencyData(freq);
    let b = 0, e = 0; for (let i = 0; i < 8; i++) b += freq[i]; for (let i = 0; i < 64; i++) e += freq[i];
    bass = b / 8 / 255; energy = e / 64 / 255;
  } else { bass *= .95; energy *= .95; }
  energyKick *= .92;
  const beat = bass - prevBass > .06 && bass > .55; prevBass = bass;
  if (beat && !RM) rings.push({ r: 0, a: .55, w: 1.5 });

  // 2.5D 视差 + 缓推
  px += (mx - px) * .05; py += (my - py) * .05;
  const kb = 1.06 + Math.sin(time * .05) * .02 + (RM ? 0 : bass * .015);
  bgs.forEach(b => { b.style.transform = `translate3d(${-px * 36}px,${-py * 24}px,0) scale(${kb})`; });
  fxC.style.transform = `translate3d(${-px * 70}px,${-py * 46}px,0)`;

  // 古钟
  const sh = RM ? 0 : (bass * 2.2 + energyKick * 3);
  bellEl.style.transform = `translate(${Math.sin(time * 37) * sh}px,${Math.cos(time * 29) * sh * .6}px) scale(${1 + bass * .04 + energyKick * .03})`;
  bellGold.style.opacity = (.3 + energy * 1.2 + energyKick * .5).toFixed(3);

  // 粒子
  const W = fxC.width, H = fxC.height; fx.clearRect(0, 0, W, H);
  const sp = 1 + energy * 1.5 + energyKick;
  const [cr, cg, cb] = cfg.col;
  for (const p of parts) {
    p.x += p.vx * sp * p.z + Math.sin(time + p.ph) * .15; p.y += p.vy * sp * p.z;
    if (p.y < -40 || p.y > H + 40 || p.x < -260 || p.x > W + 260) spawn(p);
    let a = cfg.a * p.z; if (cfg.flicker) a *= .5 + .5 * Math.sin(time * 3 + p.ph);
    if (cfg.blur) {
      const g = fx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      fx.fillStyle = g; fx.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
    } else if (cfg.streak) {
      fx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`; fx.lineWidth = p.s;
      fx.beginPath(); fx.moveTo(p.x, p.y); fx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); fx.stroke();
    } else {
      if (cfg.glow) { fx.shadowBlur = 8; fx.shadowColor = `rgb(${cr},${cg},${cb})`; }
      fx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      fx.beginPath(); fx.arc(p.x, p.y, p.s, 0, 6.283); fx.fill();
      fx.shadowBlur = 0;
    }
  }

  // 声波环
  const RW = ringC.width, RH = ringC.height, cx = RW / 2, cy = RH / 2;
  rg.clearRect(0, 0, RW, RH);
  const base = Math.min(RW, RH) * .26;
  // 常驻频谱环
  if (analyser && freq) {
    rg.beginPath();
    for (let i = 0; i <= 96; i++) {
      const v = freq[(i % 96) + 2] / 255, ang = i / 96 * Math.PI * 2 - Math.PI / 2;
      const r = base * 1.12 + v * base * .35;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      i ? rg.lineTo(x, y) : rg.moveTo(x, y);
    }
    rg.strokeStyle = T[idx] && T[idx].type === 'boss' ? 'rgba(255,90,70,.45)' : 'rgba(63,224,200,.45)'; rg.lineWidth = 1.5; rg.stroke();
  }
  rg.beginPath(); rg.arc(cx, cy, base * 1.1, 0, 6.283); rg.strokeStyle = 'rgba(240,179,90,.18)'; rg.lineWidth = 1; rg.stroke();
  rings = rings.filter(r => r.a > .01);
  for (const r of rings) {
    r.r += 3.2 * (devicePixelRatio || 1); r.a *= .965;
    rg.beginPath(); rg.arc(cx, cy, base + r.r, 0, 6.283);
    rg.strokeStyle = `rgba(63,224,200,${r.a})`; rg.lineWidth = r.w; rg.stroke();
  }

  if (idx >= 0 && audio.duration && !seeking) drawWave(audio.currentTime / audio.duration);
  else if (seeking && audio.duration) drawWave(audio.currentTime / audio.duration);
}

new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { threshold: .05 }).observe(ost);

// ---------- 启动 ----------
bgs[0].style.backgroundImage = 'url(img/title.webp)'; bgs[0].classList.add('on');
resize(); paintRoute();
$('lorePlace').textContent = '航线起点 · The Voyage Begins';
$('loreText').textContent = '钟停的那一天，我开始记录。沿着左边的航线听下去，每听完一首，这本笔记就多一页。';
$('loreEn').textContent = 'The day the bell stopped, I began to write. Follow the route; each track you finish adds a page.';
$('loreState').innerHTML = `已获得钟印 <b>${seals.size}/21</b>`;
requestAnimationFrame(frame);
// 调试：?seal=all 一次点亮全部（预览用）
if (/[?&]seal=all/.test(location.search)) { T.forEach(t => seals.add(t.id)); saveSeals(); paintRoute(); }
if (/[?&]awaken/.test(location.search)) setTimeout(awaken, 300);
if (/[?&]t=(\d+)/.test(location.search)) select(+RegExp.$1, false);
})();
