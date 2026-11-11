(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], body=document.body, KEY='dr_novel';
let st={}; try{st=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
st.pos=st.pos||{};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
if(st.fs) document.documentElement.style.setProperty('--fs',st.fs+'px');
const AV=window.AVAIL||[1];
const hashCh=()=>{const m=location.hash.match(/ch=(\d+)/);return m?+m[1]:0};
let cur=0;

// 墨迹浮现
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{rootMargin:'0px 0px -12% 0px'});

function show(n,restore){
  if(!AV.includes(n)) n=AV[0];
  cur=n; st.last=n; save();
  $$('.chsec').forEach(s=>{s.hidden=+s.dataset.ch!==n});
  const sec=$(`.chsec[data-ch="${n}"]`);
  sec.querySelectorAll('.text p:not(.in)').forEach(p=>io.observe(p));
  $$('.toc li').forEach(li=>li.classList.toggle('cur',+li.dataset.ch===n));
  $('#gateTtl').textContent=sec.dataset.title;
  document.title=sec.dataset.title+' · 墨言笔记 · 暗岩传说';
  if(!body.classList.contains('sealed')){
    const y=restore&&st.pos[n]>200?st.pos[n]:0;
    requestAnimationFrame(()=>scrollTo({top:y,behavior:y?'smooth':'auto'}));
  }
  $('#toc').classList.remove('show');
}
const first=hashCh()||st.last||1;
show(first,false);
if((st.pos[first]||0)>200) $('#resume').hidden=false;
addEventListener('hashchange',()=>{const n=hashCh(); if(n&&n!==cur) show(n,true);});
$$('.toc li.on').forEach(li=>li.addEventListener('click',()=>{location.hash='ch='+li.dataset.ch;}));

// 敲碎火漆
let ctxA;
function crack(){
  try{ctxA=ctxA||new (window.AudioContext||window.webkitAudioContext)();const t=ctxA.currentTime;
    const b=ctxA.createBuffer(1,ctxA.sampleRate*.25,ctxA.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,4);
    const n=ctxA.createBufferSource(),f=ctxA.createBiquadFilter(),g=ctxA.createGain();
    n.buffer=b;f.type='bandpass';f.frequency.value=1800;g.gain.value=.5;n.connect(f).connect(g).connect(ctxA.destination);n.start(t);
    const o=ctxA.createOscillator(),og=ctxA.createGain();o.frequency.value=220;og.gain.setValueAtTime(.18,t+.15);og.gain.exponentialRampToValueAtTime(.0001,t+2.5);
    o.connect(og).connect(ctxA.destination);o.start(t+.15);o.stop(t+2.6);}catch(e){}
}
function open(){
  if(body.classList.contains('opened'))return;
  crack(); body.classList.add('broken');
  setTimeout(()=>{body.classList.add('opened');body.classList.remove('sealed');
    const y=st.pos[cur]||0; if(y>200) setTimeout(()=>scrollTo({top:y,behavior:'smooth'}),1500);},650);
}
$('#seal').addEventListener('click',open);
addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&body.classList.contains('sealed')){e.preventDefault();open();}});

// 丝带进度 + 书签（按章）
const paper=$('#paper'), rib=$('#ribbon'); let tm;
addEventListener('scroll',()=>{
  const r=paper.getBoundingClientRect(), tot=r.height-innerHeight*.6, pr=Math.min(1,Math.max(0,-r.top/tot));
  rib.style.height=(pr*100)+'%';
  clearTimeout(tm); tm=setTimeout(()=>{if(!body.classList.contains('sealed')){st.pos[cur]=scrollY;save();}},400);
},{passive:true});

// 字号
const fsSet=d=>{const c=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||19;
  st.fs=Math.min(26,Math.max(15,c+d));document.documentElement.style.setProperty('--fs',st.fs+'px');save();};
$('#fsUp').onclick=()=>fsSet(1); $('#fsDown').onclick=()=>fsSet(-1);

// 简易 OST 播放器
const aud=$('#aud'), mp=$('#mp'), sel=$('#mpSel'), play=$('#mpPlay'), bar=$('#mpBar'), vol=$('#mpVol');
const TR=window.TRACKS||[], CH=window.CHAPTERS||[];
CH.forEach(c=>{const g=document.createElement('optgroup');g.label=c.zh;
  TR.filter(t=>t.ch===c.id).forEach(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=t.zh;g.appendChild(o);});
  if(g.children.length)sel.appendChild(g);});
const ids=TR.map(t=>t.id);
const load=id=>{sel.value=id;aud.src='music/'+id+'.mp3';st.track=id;save();};
load(ids.includes(st.track)?st.track:'title_theme');
aud.volume=st.vol!=null?st.vol:.35; vol.value=aud.volume;
const setUI=()=>{const on=!aud.paused;mp.classList.toggle('on',on);play.textContent=on?'❚❚':'▶';play.setAttribute('aria-label',on?'暂停':'播放');};
play.onclick=()=>{aud.paused?aud.play().catch(()=>{}):aud.pause();};
aud.onplay=aud.onpause=setUI;
sel.onchange=()=>{load(sel.value);aud.play().catch(()=>{});};
const next=()=>{load(ids[(ids.indexOf(sel.value)+1)%ids.length]);aud.play().catch(()=>{});};
$('#mpNext').onclick=next; aud.onended=next;
aud.ontimeupdate=()=>{bar.style.width=(aud.duration?aud.currentTime/aud.duration*100:0)+'%';};
vol.oninput=()=>{aud.volume=+vol.value;st.vol=aud.volume;save();};
$$('.chmus').forEach(b=>b.onclick=()=>{if(ids.includes(b.dataset.track)){load(b.dataset.track);aud.play().catch(()=>{});}});

// 图鉴卡
const card=$('#card'); let act;
function pop(el){const g=GLOSS[el.dataset.k]; if(!g)return; act&&act.classList.remove('act'); act=el; el.classList.add('act');
  card.querySelector('b').textContent=el.dataset.k+' · '+g.t; card.querySelector('span').textContent=g.d; card.hidden=false;
  const r=el.getBoundingClientRect(), w=card.offsetWidth, h=card.offsetHeight;
  let x=Math.min(innerWidth-w-10,Math.max(10,r.left+r.width/2-w/2)), y=r.top-h-10; if(y<60)y=r.bottom+10;
  card.style.left=x+'px'; card.style.top=y+'px';}
function hide(){card.hidden=true; act&&act.classList.remove('act'); act=null;}
$$('.term').forEach(t=>{
  t.addEventListener('mouseenter',()=>matchMedia('(hover:hover)').matches&&pop(t));
  t.addEventListener('mouseleave',()=>matchMedia('(hover:hover)').matches&&hide());
  t.addEventListener('click',e=>{e.stopPropagation(); act===t?hide():pop(t);});
});
addEventListener('click',hide); addEventListener('scroll',()=>act&&hide(),{passive:true});

// 手机目录
const toc=$('#toc'); $('#tocBtn').onclick=e=>{e.stopPropagation();toc.classList.toggle('show');};
toc.addEventListener('click',e=>e.stopPropagation()); addEventListener('click',()=>toc.classList.remove('show'));
})();
