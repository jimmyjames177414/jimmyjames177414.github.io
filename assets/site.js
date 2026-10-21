// Effects only. Every word on the page is already in the HTML, so search engines and
// no-JS visitors get the full content; this file just animates it.
(() => {
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Theme toggle
  $('.theme').addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  // Toast
  const toast = $('.toast');
  let toastTimer;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  };

  // Copy email
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(b.dataset.copy); say('Email copied'); if (!calm) confetti(40, e.clientX); }
    catch (err) { location.href = 'mailto:' + b.dataset.copy; }
  }));

  // Scroll progress bar
  const bar = $('.progress');
  const onScroll = () => {
    const max = document.body.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Project filters
  $$('.filters button').forEach((btn) => btn.addEventListener('click', () => {
    $$('.filters button').forEach((b) => b.classList.toggle('on', b === btn));
    const f = btn.dataset.filter;
    $$('.card').forEach((c) => c.classList.toggle('hide', f !== 'all' && c.dataset.cat !== f));
  }));

  // Live repo details from the GitHub API (decoration; the page is complete without it)
  const langColor = { Python: '#3572A5', TypeScript: '#3178c6', JavaScript: '#f1e05a', 'C#': '#178600', HTML: '#e34c26' };
  const ago = (iso) => {
    const d = Math.round((Date.now() - new Date(iso)) / 864e5);
    return d < 1 ? 'updated today' : d < 31 ? `updated ${d}d ago` : `updated ${Math.round(d / 30)}mo ago`;
  };
  fetch('https://api.github.com/users/jimmyjames177414/repos?per_page=100')
    .then((r) => (r.ok ? r.json() : []))
    .then((repos) => {
      const byName = Object.fromEntries(repos.map((r) => [r.name, r]));
      $$('.card[data-repo]').forEach((card) => {
        const r = byName[card.dataset.repo];
        if (!r) return;
        const meta = $('.meta', card);
        if (r.language) {
          const l = document.createElement('span');
          l.className = 'lang';
          l.style.setProperty('--c', langColor[r.language] || '#888');
          l.textContent = r.language;
          meta.append(l);
        }
        if (r.stargazers_count) meta.append(Object.assign(document.createElement('span'), { textContent: `★ ${r.stargazers_count}` }));
        meta.append(Object.assign(document.createElement('span'), { textContent: ago(r.pushed_at) }));
      });
    })
    .catch(() => {});

  if (calm) return; // Everything below is motion.
  window.__fx = true;

  // Reveal on scroll, plus one-shot triggers for counters and the terminal
  const once = new Map();
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    const fn = once.get(en.target);
    if (fn) { once.delete(en.target); fn(); }
    io.unobserve(en.target);
  }), { threshold: 0.15 });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });

  // Count-up stats
  $$('[data-count]').forEach((el) => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || '';
    el.textContent = '0' + suffix;
    once.set(el.closest('.reveal'), () => {
      const t0 = performance.now(), dur = 1400;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * e) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });

  // Rotating tagline, typed and deleted
  const lines = ['Watching agents work.', 'Measuring what context is worth.', 'Making evaluation honest.', 'Keeping agents accountable.'];
  const rot = $('#rotate');
  let li = 0, ci = lines[0].length, deleting = true;
  const tick = () => {
    const word = lines[li];
    ci += deleting ? -1 : 1;
    rot.textContent = word.slice(0, ci);
    let wait = deleting ? 28 : 55;
    if (!deleting && ci === word.length) { deleting = true; wait = 2200; }
    else if (deleting && ci === 0) { deleting = false; li = (li + 1) % lines.length; wait = 350; }
    setTimeout(tick, wait);
  };
  setTimeout(tick, 2600);

  // Terminal: retype the lines that are already in the HTML
  const term = $('#term');
  const termLines = $$('.l', term).map((el) => ({ html: el.innerHTML, out: el.classList.contains('o') }));
  term.innerHTML = '';
  once.set(term.closest('.reveal'), async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const { html, out } of termLines) {
      const span = document.createElement('span');
      span.className = 'l' + (out ? ' o' : '');
      term.append(span, '\n');
      if (out) { span.innerHTML = html; await sleep(180); continue; }
      const text = html.replace(/<[^>]+>/g, '').replace(/^\$ /, '');
      span.innerHTML = '<span class="p">$</span> ';
      for (const ch of text) { span.append(ch); await sleep(45 + Math.random() * 50); }
      await sleep(260);
    }
  });

  // 3D tilt and card spotlight
  if (finePointer) {
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 8}deg) rotateY(${(x - 0.5) * 8}deg) translateY(-3px)`;
        el.style.setProperty('--mx', `${x * 100}%`);
        el.style.setProperty('--my', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    const glow = $('.cursor-glow');
    addEventListener('pointermove', (e) => {
      glow.style.opacity = 1;
      glow.style.left = e.clientX + 'px';
      glow.style.top = e.clientY + 'px';
    }, { passive: true });
  }

  // Constellation background
  const cv = $('#stars'), cx = cv.getContext('2d');
  let W, H, pts = [], mouse = { x: -1e4, y: -1e4 }, running = true;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const resize = () => {
    W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr;
    const n = Math.min(110, Math.round((innerWidth * innerHeight) / 14000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr }));
  };
  resize();
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; }, { passive: true });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(draw); });
  const link = 130 * dpr;
  function draw() {
    if (!running) return;
    const light = root.dataset.theme === 'light';
    cx.clearRect(0, 0, W, H);
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      const dx = mouse.x - p.x, dy = mouse.y - p.y, d = Math.hypot(dx, dy);
      if (d < 180 * dpr) { p.x += dx * 0.004; p.y += dy * 0.004; }
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) {
          cx.strokeStyle = light ? `rgba(91,61,245,${0.25 * (1 - d / link)})` : `rgba(140,170,255,${0.22 * (1 - d / link)})`;
          cx.lineWidth = dpr;
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
        }
      }
    }
    cx.fillStyle = light ? 'rgba(13,16,32,.45)' : 'rgba(220,230,255,.75)';
    for (const p of pts) { cx.beginPath(); cx.arc(p.x, p.y, 1.4 * dpr, 0, 7); cx.fill(); }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Confetti (email copy, and the Konami code)
  function confetti(n = 120, originX) {
    const colors = ['#7c5cff', '#00d4ff', '#ff4fd8', '#2ee59d', '#febc2e'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = (originX != null ? originX + (Math.random() - 0.5) * 300 : Math.random() * innerWidth) + 'px';
      c.style.background = colors[i % colors.length];
      c.style.setProperty('--dx', (Math.random() - 0.5) * 300 + 'px');
      c.style.setProperty('--r', Math.random() * 900 + 'deg');
      c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      c.style.animationDelay = Math.random() * 0.3 + 's';
      document.body.append(c);
      c.addEventListener('animationend', () => c.remove());
    }
  }
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let k = 0;
  addEventListener('keydown', (e) => {
    k = e.key === code[k] ? k + 1 : e.key === code[0] ? 1 : 0;
    if (k === code.length) { k = 0; confetti(); say('You found it. Now email me.'); }
  });
})();
