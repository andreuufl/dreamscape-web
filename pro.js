/* DREAMSCAPE EVENTS — interacción del sitio (2026) */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  /* Si este archivo no llega a cargarse, la clase no-js se queda y todo el contenido se ve sin animación */
  root.classList.remove('no-js');

  /* ---------- Cabecera: sólida al hacer scroll, se oculta al bajar ---------- */
  var hdr = d.querySelector('.hdr');
  var mcta = d.querySelector('.mcta');
  var lastY = 0, ticking = false;
  function onScroll() {
    var y = w.scrollY || 0;
    if (hdr) {
      hdr.classList.toggle('is-solid', y > 40 || !hdr.hasAttribute('data-transparent'));
      if (!d.body.classList.contains('menu-open')) hdr.classList.toggle('is-hidden', y > 480 && y > lastY + 4);
      if (y < lastY - 4) hdr.classList.remove('is-hidden');
    }
    if (mcta) mcta.classList.toggle('is-on', y > w.innerHeight * 0.7);
    lastY = y; ticking = false;
  }
  w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var burger = d.querySelector('.burger');
  if (burger) {
    burger.addEventListener('click', function () {
      var open = d.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (hdr) { hdr.classList.remove('is-hidden'); hdr.classList.add('is-solid'); }
    });
    d.querySelectorAll('.mnav a').forEach(function (a) {
      a.addEventListener('click', function () { d.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); });
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.body.classList.contains('menu-open')) burger.click(); });
  }

  /* ---------- Aparición de secciones ---------- */
  var rvs = d.querySelectorAll('.rv, .light');
  if ('IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rvs.forEach(function (el) { io.observe(el); });
  } else { rvs.forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- Vídeos: solo se reproducen cuando se ven ---------- */
  var vids = d.querySelectorAll('video[data-auto]');
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Ahorro de datos o conexión muy lenta: los vídeos no se reproducen solos (se ve el póster) */
  var cn = navigator.connection || {};
  if (cn.saveData || /(^|-)2g$/.test(cn.effectiveType || '')) reduce = true;
  if ('IntersectionObserver' in w && !reduce) {
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && v.offsetParent !== null) {
          if (v.dataset.src && !v.src) { v.src = v.dataset.src; }
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else { v.pause(); }
      });
    }, { threshold: 0.2 });
    vids.forEach(function (v) { vo.observe(v); });
  }

  /* ---------- Filtros de proyectos ---------- */
  var filters = d.querySelectorAll('.filters button');
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-f');
      filters.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      d.querySelectorAll('.pj[data-cat]').forEach(function (pj) {
        pj.hidden = !(f === 'all' || pj.getAttribute('data-cat').indexOf(f) !== -1);
      });
    });
  });

  /* ---------- Formulario de contacto: rellenar desde el simulador ---------- */
  try {
    var m = sessionStorage.getItem('ds-sim-msg'), box = d.getElementById('mensaje');
    if (m && box) { box.value = m; sessionStorage.removeItem('ds-sim-msg'); }
  } catch (e) {}

  /* ---------- Cookies, Analytics y asistente (solo con consentimiento) ---------- */
  var GA = 'G-PNDXKYXT9K', KEY = 'dreamscape_cookies_accepted';
  function getC() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setC(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function loadGA() {
    if (w.gaLoaded) return; w.gaLoaded = true;
    var s = d.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA; d.head.appendChild(s);
    w.dataLayer = w.dataLayer || []; w.gtag = function () { w.dataLayer.push(arguments); };
    w.gtag('js', new Date()); w.gtag('config', GA, { anonymize_ip: true });
  }
  var chatWanted = false;
  function loadChat(openAfter) {
    if (w.chatbaseLoaded) { if (openAfter && w.chatbase) try { w.chatbase('open'); } catch (e) {} return; }
    w.chatbaseLoaded = true;
    if (!w.chatbase || w.chatbase('getState') !== 'initialized') {
      w.chatbase = function () { (w.chatbase.q = w.chatbase.q || []).push(arguments); };
      w.chatbase = new Proxy(w.chatbase, { get: function (t, p) { if (p === 'q') return t.q; return function () { return t.apply(null, [p].concat([].slice.call(arguments))); }; } });
    }
    var s = d.createElement('script'); s.src = 'https://www.chatbase.co/embed.min.js'; s.id = 'fs1m6mhrbVMf-Fm4ju8VF'; s.domain = 'www.chatbase.co';
    s.onload = function () { var fab = d.querySelector('.fab--chat'); if (fab) fab.remove(); if (openAfter) setTimeout(function () { try { w.chatbase('open'); } catch (e) {} }, 600); };
    d.body.appendChild(s);
  }
  var banner = d.querySelector('.cookie');
  function showBanner() { if (banner) banner.classList.add('is-on'); }
  function hideBanner() { if (banner) banner.classList.remove('is-on'); }
  var c = getC();
  if (!c) showBanner(); else if (c === 'all') loadGA();
  d.querySelectorAll('[data-cookie="all"]').forEach(function (b) { b.addEventListener('click', function () { setC('all'); loadGA(); hideBanner(); if (chatWanted) loadChat(true); }); });
  d.querySelectorAll('[data-cookie="essential"]').forEach(function (b) { b.addEventListener('click', function () { setC('essential'); hideBanner(); }); });
  d.querySelectorAll('[data-cookie="settings"]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); showBanner(); }); });
  d.querySelectorAll('.fab--chat').forEach(function (b) {
    b.addEventListener('click', function () {
      if (getC() === 'all') loadChat(true);
      else { chatWanted = true; showBanner(); var t = d.querySelector('.cookie [data-chat-note]'); if (t) t.hidden = false; }
    });
  });

  /* ---------- Medición de clics a WhatsApp ---------- */
  d.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
    a.addEventListener('click', function () { if (typeof w.gtag === 'function') w.gtag('event', 'click_whatsapp', { link_location: a.getAttribute('data-loc') || 'web' }); });
  });

  var yr = d.querySelectorAll('[data-year]'); yr.forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

/* ---------- Carruseles horizontales (móvil): barra de progreso ---------- */
(function () {
  var d = document;
  d.querySelectorAll('[data-hs]').forEach(function (el) {
    var bar = d.createElement('div'); bar.className = 'hs-bar'; bar.setAttribute('aria-hidden', 'true');
    var th = d.createElement('i'); bar.appendChild(th); el.parentNode.insertBefore(bar, el.nextSibling);
    function upd() {
      var max = el.scrollWidth - el.clientWidth;
      if (max <= 2) { bar.style.display = 'none'; return; }
      bar.style.display = '';
      var vis = el.clientWidth / el.scrollWidth, p = el.scrollLeft / max;
      th.style.width = (vis * 100) + '%';
      th.style.transform = 'translateX(' + (p * (1 / vis - 1) * 100) + '%)';
    }
    el.addEventListener('scroll', function () { requestAnimationFrame(upd); }, { passive: true });
    window.addEventListener('resize', upd); upd();
  });
})();

/* Tarjetas de la galería de inicio -> ficha en Proyectos */
document.addEventListener('click', function (e) {
  var t = e.target.closest && e.target.closest('[data-href]');
  if (t) { window.location.href = t.getAttribute('data-href'); }
});

/* =====================================================================
   MEJORAS DE EXPERIENCIA (2026-10): haz de luz, galería, progreso,
   WhatsApp contextual, línea de tiempo y contadores
   ===================================================================== */
(function () {
  'use strict';
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = w.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- 1. Haz de luz en la portada ---------- */
  var reel = d.querySelector('.reel');
  if (reel && !reduce) {
    var beam = d.createElement('div'); beam.className = 'beam'; beam.setAttribute('aria-hidden', 'true');
    reel.insertBefore(beam, reel.querySelector('.reel-top') || null);
    var tx = .5, ty = .45, cx = .5, cy = .45, last = 0, visible = true, running = false;
    function loop(t) {
      if (!visible) { running = false; return; }
      if (t - last > 2800) { /* sin interacción: el foco barre la sala solo */
        tx = .5 + Math.sin(t / 3400) * .32; ty = .42 + Math.cos(t / 4300) * .16;
      }
      cx += (tx - cx) * .07; cy += (ty - cy) * .07;
      beam.style.setProperty('--bx', (cx * 100).toFixed(2) + '%');
      beam.style.setProperty('--by', (cy * 100).toFixed(2) + '%');
      raf(loop);
    }
    function start() { if (!running) { running = true; raf(loop); } }
    function move(e) {
      var r = reel.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; last = performance.now();
    }
    reel.addEventListener('pointermove', move, { passive: true });
    reel.addEventListener('pointerdown', move, { passive: true });
    if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(reel);
    }
    start();
  }

  /* ---------- 4. Galería a pantalla completa (Proyectos) ---------- */
  var medias = [].slice.call(d.querySelectorAll('.pj .pj-media, .gal .g'));
  function mTitle(m) { var h = m.querySelector('figcaption b') || (m.closest('.pj') && m.closest('.pj').querySelector('h3')); return h ? h.textContent : ''; }
  if (medias.length) {
    var lb = d.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Galería de proyectos');
    lb.innerHTML = '<button class="lb-x" type="button" aria-label="Cerrar">×</button>' +
      '<button class="lb-n lb-prev" type="button" aria-label="Anterior">‹</button>' +
      '<button class="lb-n lb-next" type="button" aria-label="Siguiente">›</button>' +
      '<div class="lb-stage"></div><p class="lb-cap"></p>';
    d.body.appendChild(lb);
    var stage = lb.querySelector('.lb-stage'), cap = lb.querySelector('.lb-cap'), idx = 0, opener = null;
    function items() { return medias.filter(function (m) { var pj = m.closest('.pj'); return !(pj && pj.hidden); }); }
    function show(i) {
      var list = items(); if (!list.length) return;
      idx = (i + list.length) % list.length;
      var m = list[idx], v = m.querySelector('video'), im = m.querySelector('img'), el;
      stage.innerHTML = '';
      if (v) {
        el = d.createElement('video'); el.src = v.currentSrc || v.src || v.getAttribute('data-src') || '';
        el.poster = v.getAttribute('poster') || ''; el.controls = true; el.playsInline = true; el.loop = true; el.autoplay = true;
        el.setAttribute('playsinline', '');
      } else if (im) { el = d.createElement('img'); el.src = im.currentSrc || im.src; el.alt = im.alt || ''; }
      if (el) stage.appendChild(el);
      cap.textContent = mTitle(m) + '  ·  ' + (idx + 1) + ' / ' + list.length;
    }
    function open(m) {
      var list = items(); var i = list.indexOf(m); if (i < 0) return;
      opener = d.activeElement; lb.hidden = false; d.body.classList.add('lb-on'); show(i);
      lb.querySelector('.lb-x').focus();
    }
    function close() {
      lb.hidden = true; d.body.classList.remove('lb-on'); stage.innerHTML = '';
      if (opener && opener.focus) try { opener.focus(); } catch (e) {}
    }
    medias.forEach(function (m) {
      m.classList.add('is-zoom'); m.setAttribute('tabindex', '0'); m.setAttribute('role', 'button');
      m.setAttribute('aria-label', 'Ampliar: ' + (mTitle(m) || 'proyecto'));
      if (m.hasAttribute('data-href')) m.removeAttribute('data-href');
      m.addEventListener('click', function () { open(m); });
      m.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(m); } });
    });
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.lb-x') || e.target === lb || e.target === stage) close();
      else if (e.target.closest('.lb-prev')) show(idx - 1);
      else if (e.target.closest('.lb-next')) show(idx + 1);
    });
    d.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    });
    var sx = 0, sy = 0;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(idx + (dx < 0 ? 1 : -1));
      else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) close();
    }, { passive: true });
  }

  /* ---------- 6. Barra de progreso de lectura (artículos) ---------- */
  var prose = d.querySelector('.prose');
  if (prose) {
    var pb = d.createElement('div'); pb.className = 'readbar'; pb.setAttribute('aria-hidden', 'true');
    pb.innerHTML = '<i></i>'; d.body.appendChild(pb);
    var bar = pb.firstChild, tk = false;
    function prog() {
      var r = prose.getBoundingClientRect(), total = r.height - w.innerHeight * .6;
      var p = total > 0 ? Math.min(1, Math.max(0, (-r.top + w.innerHeight * .2) / total)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')'; tk = false;
    }
    w.addEventListener('scroll', function () { if (!tk) { tk = true; raf(prog); } }, { passive: true });
    w.addEventListener('resize', prog); prog();
  }

  /* ---------- 7. WhatsApp contextual según la página ---------- */
  (function () {
    var p = location.pathname.replace(/\/+$/, '') || '/', h1 = d.querySelector('h1'), t = '';
    var title = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '';
    if (d.documentElement.lang === 'en') t = /destination|wedding/.test(p) ? 'Hello Dreamscape Events, I would like a quote for a destination wedding in Spain.' : 'Hello Dreamscape Events, I would like a quote for an event in Spain.';
    else if (/boda|celebracion|destination/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto de sonido e iluminación para una boda o celebración.';
    else if (/congreso|feria|traduccion|streaming/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto técnico para un congreso o feria.';
    else if (/corporativ|empresa|gala|presentacion/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto técnico para un evento de empresa.';
    else if (/pantallas-led/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto de pantallas LED para un evento.';
    else if (/servicio-barcelona|barcelona/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto para un evento en Barcelona.';
    else if (/servicio-madrid/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto para un evento en Madrid.';
    else if (/servicio-valencia/.test(p)) t = 'Hola Dreamscape Events, quiero pedir presupuesto para un evento en Valencia.';
    else if (/proyectos/.test(p)) t = 'Hola Dreamscape Events, he visto vuestros proyectos y quiero pedir presupuesto para un evento.';
    else if (d.querySelector('.prose') && title) t = 'Hola Dreamscape Events, he leído «' + title.slice(0, 90) + '» y quiero consultaros sobre mi evento.';
    if (!t) return;
    d.querySelectorAll('a[href^="https://wa.me/"]').forEach(function (a) {
      var m = a.href.match(/[?&]text=([^&]*)/);
      if (m && /quiero%20pedir%20presupuesto/.test(m[1])) a.href = a.href.replace(m[0], m[0].charAt(0) + 'text=' + encodeURIComponent(t));
    });
  })();

  /* ---------- 8. Línea de tiempo "Cómo trabajamos" ---------- */
  var how = d.querySelector('.how');
  if (how) {
    var steps = [].slice.call(how.querySelectorAll('li')), htk = false;
    function hp() {
      var r = how.getBoundingClientRect(), vh = w.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * .72 - r.top) / r.height));
      how.style.setProperty('--p', p.toFixed(4));
      steps.forEach(function (s) { var sr = s.getBoundingClientRect(); s.classList.toggle('on', reduce || sr.top < vh * .72); });
      htk = false;
    }
    w.addEventListener('scroll', function () { if (!htk) { htk = true; raf(hp); } }, { passive: true });
    w.addEventListener('resize', hp); hp();
  }

  /* ---------- 3. Contadores animados ---------- */
  var counters = d.querySelectorAll('[data-count]');
  if (counters.length) {
    function run(el) {
      var to = parseFloat(el.getAttribute('data-count')), t0 = null, dur = 1400;
      if (reduce || !(to > 0)) { el.textContent = to; return; }
      function step(t) {
        if (t0 === null) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e); if (k < 1) raf(step);
      }
      raf(step);
    }
    if ('IntersectionObserver' in w) {
      var co = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { run(e.target); co.unobserve(e.target); } });
      }, { threshold: .6 });
      counters.forEach(function (c) { co.observe(c); });
    } else counters.forEach(function (c) { c.textContent = c.getAttribute('data-count'); });
  }
})();

/* ---------- 2. Antes / después: arrastra para comparar ---------- */
document.querySelectorAll('.ba').forEach(function (ba) {
  var r = ba.querySelector('input[type=range]');
  if (!r) return;
  function set() { ba.style.setProperty('--pos', r.value + '%'); }
  r.addEventListener('input', set); set();
});

/* =====================================================================
   Blog: índice del artículo y artículos relacionados · Llamada directa
   ===================================================================== */
(function () {
  'use strict';
  var d = document;

  /* ---------- 6a. Índice "En este artículo" ---------- */
  var prose = d.querySelector('.prose');
  if (prose) {
    var hs = [].slice.call(prose.querySelectorAll('h2'));
    if (hs.length >= 3) {
      var used = {};
      var items = hs.map(function (h) {
        var base = (h.textContent || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'seccion';
        var id = h.id || base, n = 2; while (used[id] || (d.getElementById(id) && d.getElementById(id) !== h)) id = base + '-' + (n++);
        used[id] = 1; h.id = id; h.style.scrollMarginTop = '96px';
        return '<li><a href="#' + id + '">' + h.textContent.replace(/</g, '&lt;') + '</a></li>';
      });
      var toc = d.createElement('nav'); toc.className = 'toc'; toc.setAttribute('aria-label', 'En este artículo');
      toc.innerHTML = '<span class="mono">En este artículo</span><ol>' + items.join('') + '</ol>';
      prose.insertBefore(toc, prose.firstElementChild && prose.firstElementChild.tagName === 'P' ? prose.firstElementChild.nextSibling : prose.firstChild);
    }

    /* ---------- 6b. "Te puede interesar" ---------- */
    if (window.fetch && window.DOMParser) {
      fetch('/blog.html', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var here = location.pathname.replace(/\/+$/, '');
        var cards = [].slice.call(doc.querySelectorAll('.posts a.post')).filter(function (a) {
          return a.getAttribute('href').replace(/\/+$/, '') !== here;
        });
        if (cards.length < 2) return;
        /* los 3 siguientes en la lista, empezando por la posición del artículo actual (distinto en cada artículo) */
        var all = [].slice.call(doc.querySelectorAll('.posts a.post'));
        var idx = all.findIndex(function (a) { return a.getAttribute('href').replace(/\/+$/, '') === here; });
        var pick = [];
        for (var k = 1; pick.length < 3 && k <= all.length; k++) {
          var c = all[((idx < 0 ? -1 : idx) + k + all.length) % all.length];
          if (c.getAttribute('href').replace(/\/+$/, '') !== here && pick.indexOf(c) < 0) pick.push(c);
        }
        var sec = d.createElement('section'); sec.className = 'related sec sec--tight'; sec.setAttribute('aria-labelledby', 'rel-t');
        var wrap = d.createElement('div'); wrap.className = 'wrap';
        wrap.innerHTML = '<span class="eyebrow">Sigue leyendo</span><h2 id="rel-t" class="h1" style="margin-bottom:28px">Te puede interesar</h2><div class="posts"></div>';
        var box = wrap.querySelector('.posts');
        pick.forEach(function (c) {
          var n = d.importNode(c, true); n.classList.add('in'); n.classList.remove('rv'); box.appendChild(n);
        });
        sec.appendChild(wrap);
        var main = d.getElementById('main'); if (main) main.appendChild(sec);
      }).catch(function () {});
    }
  }

  /* ---------- 7. Llamada directa y plazo de respuesta ---------- */
  var mcta = d.querySelector('.mcta');
  if (mcta && !mcta.querySelector('[href^="tel:"]')) {
    var call = d.createElement('a'); call.className = 'btn mcta-call'; call.href = 'tel:+34613089894'; call.setAttribute('aria-label', 'Llamar al 613 08 98 94'); call.textContent = 'Llamar';
    mcta.insertBefore(call, mcta.children[1] || null);
  }
  ['presupuesto-rapido', 'dreamscape-form'].forEach(function (id) {
    var f = d.getElementById(id); if (!f) return;
    var p = d.createElement('p'); p.className = 'sla';
    p.innerHTML = 'Respondemos normalmente en menos de 24 h. ¿Prefieres hablar ya? <a href="tel:+34613089894">Llama al 613 08 98 94</a>.';
    f.parentNode.insertBefore(p, f.nextSibling);
  });
})();


/* ---------- Pulido visual (oct 2026): titulares palabra a palabra y secciones que "se encienden" ---------- */
(function () {
  'use strict';
  var d = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  function split(el) {
    var n = 0;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.nodeValue.split(/(\s+)/), frag = d.createDocumentFragment();
          parts.forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(d.createTextNode(' ')); return; }
            var o = d.createElement('span'), i = d.createElement('i');
            o.className = 'w'; i.style.setProperty('--i', n++); i.textContent = t; o.appendChild(i); frag.appendChild(o);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
    el.classList.add('words');
  }
  var heads = [].slice.call(d.querySelectorAll('[data-words]'));
  if (!reduce && hasIO) {
    heads.forEach(function (h) {
      var label = h.textContent.replace(/\s+/g, ' ').trim();
      split(h); h.setAttribute('aria-label', label);
      [].forEach.call(h.querySelectorAll('.w'), function (x) { x.setAttribute('aria-hidden', 'true'); });
    });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('words-in'); io.unobserve(e.target); } });
    }, { threshold: .25 });
    [].forEach.call(d.querySelectorAll('.words'), function (h) {
      var r = h.getBoundingClientRect();
      if (r.top < innerHeight * .9 && r.bottom > 0) requestAnimationFrame(function () { requestAnimationFrame(function () { h.classList.add('words-in'); }); });
      else io.observe(h);
    });
  }

  var lits = [].slice.call(d.querySelectorAll('.lit'));
  if (hasIO && !reduce) {
    var lo = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('lit-on', e.isIntersecting); });
    }, { threshold: .18 });
    lits.forEach(function (s) { lo.observe(s); });
  } else lits.forEach(function (s) { s.classList.add('lit-on'); });
})();
