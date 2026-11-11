// 暗岩主页 · 新增板块交互：世界观目录/折叠、图鉴、预告片切换、截图灯箱
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* 世界观 */
  const world = $('#world'), wBody = $('#wBody'), wToc = $('#wToc');
  if (world && wBody) {
    world.classList.add('folded');
    const secs = [...wBody.querySelectorAll('.w-sec')];
    secs.forEach((s, i) => {
      s.id = 'w' + i;
      const a = document.createElement('a');
      a.href = '#w' + i; a.textContent = s.querySelector('h3').textContent;
      a.addEventListener('click', e => { e.preventDefault(); world.classList.remove('folded'); s.scrollIntoView({ behavior: 'smooth' }); });
      wToc.appendChild(a);
    });
    $('#wMore').addEventListener('click', () => world.classList.remove('folded'));
    const links = [...wToc.children];
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach((a, i) => a.classList.toggle('on', secs[i] === e.target));
    }), { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach(s => io.observe(s));
  }

  /* 图鉴 */
  const grid = $('#cxGrid'), C = window.CODEX;
  const crestChar = n => {
    const name = String(n.zh).split(/[·\s]/).filter(Boolean).pop() || n.zh;
    return name.replace(/^(回响|监工|沙匪头目|沙葬法老|雪原巨人|熔铸大师|熔铸者|炎誓大祭司|熔心君王|墓穴守门人|霜语女巫|永冬之王)/, '').charAt(0) || name.charAt(0);
  };
  function card(n, kind, i) {
    const d = `style="animation-delay:${Math.min(i, 14) * 35}ms"`;
    if (kind === 'classes') {
      const img = n.img ? `<div class="cx-img" style="background-image:url('${n.img}')"></div>` : '';
      const crest = n.img ? '' : `<span class="crest">${esc(n.zh.charAt(0))}</span>`;
      return `<article class="cx-card" ${d}>${img}<div class="cx-body"><div class="cx-top">${crest}<div><div class="cx-name">${esc(n.zh)}</div><div class="cx-en">${esc(n.en)}</div></div></div><div class="cx-role">${esc(n.role)}</div><p class="cx-desc">${esc(n.desc)}</p></div></article>`;
    }
    const q = n.quote ? `<p class="cx-quote">${esc(n.quote)}</p>` : '';
    return `<article class="cx-card" ${d}><div class="cx-body"><div class="cx-top"><span class="crest${kind === 'bosses' ? ' boss' : ''}">${esc(crestChar(n))}</span><div><div class="cx-name">${esc(n.zh)}</div><div class="cx-en">${esc(n.en)}</div></div></div><div class="cx-loc">◈ ${esc(n.location)}</div><p class="cx-desc">${esc(n.desc)}</p>${q}</div></article>`;
  }
  function show(tab) {
    grid.className = 'cx-grid ' + tab;
    grid.innerHTML = C[tab].map((n, i) => card(n, tab, i)).join('');
    document.querySelectorAll('.cx-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  }
  if (grid && C) {
    document.querySelectorAll('.cx-tabs button').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
    show('classes');
  }

  /* 预告片 */
  const v = $('#mvVideo'), list = $('#mvList');
  if (v && list) {
    list.addEventListener('click', e => {
      const li = e.target.closest('li'); if (!li) return;
      list.querySelectorAll('li').forEach(x => x.classList.toggle('on', x === li));
      const src = $('#mvSrc'); src.src = li.dataset.src; src.type = li.dataset.type;
      v.poster = li.dataset.poster; v.load(); v.play().catch(() => {});
    });
    // 预告片播放时暂停 OST
    v.addEventListener('play', () => { const a = $('#audio'); if (a && !a.paused) a.pause(); });
  }

  /* 截图灯箱 */
  const lb = $('#lightbox');
  if (lb) {
    document.querySelectorAll('#shots figure').forEach(f => f.addEventListener('click', () => {
      $('#lbImg').src = f.dataset.full; $('#lbCap').textContent = f.querySelector('figcaption').textContent; lb.hidden = false;
    }));
    const close = () => { lb.hidden = true; $('#lbImg').removeAttribute('src'); };
    lb.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) close(); });
  }
})();
