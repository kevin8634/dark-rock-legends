(()=>{
const $=s=>document.querySelector(s), body=document.body, KEY='dr_novel_ch1';
const st=JSON.parse(localStorage.getItem(KEY)||'{}');
if(st.y>200) $('#resume').hidden=false;
if(st.fs) document.documentElement.style.setProperty('--fs',st.fs+'px');
const save=()=>localStorage.setItem(KEY,JSON.stringify(st));

// 敲碎火漆
let ctxA;
function crack(){
  try{ctxA=ctxA||new (window.AudioContext||window.webkitAudioContext)();const t=ctxA.currentTime;
    const b=ctxA.createBuffer(1,ctxA.sampleRate*.25,ctxA.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,4);
    const n=ctxA.createBufferSource(),f=ctxA.createBiquadFilter(),g=ctxA.createGain();
    n.buffer=b;f.type='bandpass';f.frequency.value=1800;g.gain.value=.5;n.connect(f).connect(g).connect(ctxA.destination);n.start(t);
    const o=ctxA.createOscillator(),og=ctxA.createGain();o.frequency.value=220;o.type='sine';og.gain.setValueAtTime(.18,t+.15);og.gain.exponentialRampToValueAtTime(.0001,t+2.5);
    o.connect(og).connect(ctxA.destination);o.start(t+.15);o.stop(t+2.6);}catch(e){}
}
function open(){
  if(body.classList.contains('opened'))return;
  crack(); body.classList.add('broken');
  setTimeout(()=>{body.classList.add('opened');body.classList.remove('sealed');
    if(st.y>200) setTimeout(()=>scrollTo({top:st.y,behavior:'smooth'}),1500);},650);
}
$('#seal').addEventListener('click',open);
addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&body.classList.contains('sealed')){e.preventDefault();open();}});

// 墨迹浮现
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{rootMargin:'0px 0px -12% 0px'});
document.querySelectorAll('.text p').forEach(p=>io.observe(p));

// 丝带进度 + 书签
const paper=$('#paper'), rib=$('#ribbon'); let tm;
addEventListener('scroll',()=>{
  const r=paper.getBoundingClientRect(), tot=r.height-innerHeight*.6, pr=Math.min(1,Math.max(0,-r.top/tot));
  rib.style.height=(pr*100)+'%';
  clearTimeout(tm); tm=setTimeout(()=>{st.y=scrollY;save();},400);
},{passive:true});

// 字号
const fsSet=d=>{const cur=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs'))||19;
  st.fs=Math.min(26,Math.max(15,cur+d));document.documentElement.style.setProperty('--fs',st.fs+'px');save();};
$('#fsUp').onclick=()=>fsSet(1); $('#fsDown').onclick=()=>fsSet(-1);

// 配乐
const aud=$('#aud'), bgm=$('#bgm'); aud.volume=.35;
bgm.onclick=()=>{ if(aud.paused){aud.play().catch(()=>{});bgm.setAttribute('aria-pressed','true');} else {aud.pause();bgm.setAttribute('aria-pressed','false');} };

// 图鉴卡
const card=$('#card'); let act;
function show(el){const g=GLOSS[el.dataset.k]; if(!g)return; act&&act.classList.remove('act'); act=el; el.classList.add('act');
  card.querySelector('b').textContent=el.dataset.k+' · '+g.t; card.querySelector('span').textContent=g.d; card.hidden=false;
  const r=el.getBoundingClientRect(), w=card.offsetWidth, h=card.offsetHeight;
  let x=Math.min(innerWidth-w-10,Math.max(10,r.left+r.width/2-w/2)), y=r.top-h-10; if(y<60)y=r.bottom+10;
  card.style.left=x+'px'; card.style.top=y+'px';}
function hide(){card.hidden=true; act&&act.classList.remove('act'); act=null;}
document.querySelectorAll('.term').forEach(t=>{
  t.addEventListener('mouseenter',()=>matchMedia('(hover:hover)').matches&&show(t));
  t.addEventListener('mouseleave',()=>matchMedia('(hover:hover)').matches&&hide());
  t.addEventListener('click',e=>{e.stopPropagation(); act===t?hide():show(t);});
});
addEventListener('click',hide); addEventListener('scroll',()=>act&&hide(),{passive:true});

// 手机目录
const toc=$('#toc'); $('#tocBtn').onclick=e=>{e.stopPropagation();toc.classList.toggle('show');};
toc.addEventListener('click',e=>e.stopPropagation()); addEventListener('click',()=>toc.classList.remove('show'));
})();
