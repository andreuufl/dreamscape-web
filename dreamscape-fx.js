/* =====================================================================
   DREAMSCAPE EVENTS — efectos 2026 (dreamscape-fx.js)
   Intro, cursor, barra de progreso, apariciones al hacer scroll,
   brillo dorado en tarjetas y transición entre páginas.
   Sin dependencias. Todo respeta "reducir movimiento" y, si algo falla,
   la página se ve completa igualmente.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine) and (min-width: 1024px)').matches;

  function safe(fn) { try { fn(); } catch (e) { /* nunca romper la página */ } }

  /* ---------- 1. Intro de marca (solo portada, una vez por sesión) ---------- */
  safe(function () {
    var intro = document.querySelector('[data-ds-intro]');
    if (!intro) return;
    var visto = false;
    try { visto = sessionStorage.getItem('ds-intro') === '1'; sessionStorage.setItem('ds-intro', '1'); } catch (e) {}
    if (visto || reduce) { intro.remove(); doc.classList.remove('ds-intro-pending'); return; }
    var cerrar = function () {
      doc.classList.remove('ds-intro-pending');
      intro.classList.add('is-out');
      setTimeout(function () { intro.remove(); }, 1200);
    };
    setTimeout(cerrar, 1500);
  });

  /* ---------- 2. Última palabra del titular en dorado ---------- */
  safe(function () {
    var t = document.getElementById('hero-title');
    if (!t) return;
    var bloques = t.querySelectorAll('span[style*="nowrap"]');
    if (bloques.length) { bloques[bloques.length - 1].classList.add('ds-gold-word'); return; }
    /* Sin animación de letras: envolvemos la última palabra */
    var html = t.innerHTML.trim();
    var i = html.lastIndexOf(' ');
    if (i > -1) t.innerHTML = html.slice(0, i + 1) + '<span class="ds-gold-word">' + html.slice(i + 1) + '</span>';
  });

  /* ---------- 3. Barra de progreso de lectura ---------- */
  safe(function () {
    var bar = document.createElement('div');
    bar.className = 'ds-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var pendiente = false;
    var pintar = function () {
      var h = doc.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(window.scrollY / h, 1) : 0) + ')';
      pendiente = false;
    };
    window.addEventListener('scroll', function () {
      if (!pendiente) { pendiente = true; requestAnimationFrame(pintar); }
    }, { passive: true });
    pintar();
  });

  /* ---------- 4. Cursor personalizado (solo ordenador con ratón) ---------- */
  safe(function () {
    if (!finePointer || reduce) return;
    var ring = document.createElement('div');
    var dot = document.createElement('div');
    ring.className = 'ds-cursor is-hidden';
    dot.className = 'ds-cursor-dot is-hidden';
    ring.innerHTML = '<span>Ver</span>';
    ring.setAttribute('aria-hidden', 'true');
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
    document.body.appendChild(dot);
    doc.classList.add('ds-has-cursor');

    var x = -100, y = -100, rx = -100, ry = -100;
    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      ring.classList.remove('is-hidden'); dot.classList.remove('is-hidden');
      dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }, { passive: true });
    document.addEventListener('pointerleave', function () {
      ring.classList.add('is-hidden'); dot.classList.add('is-hidden');
    });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();

    var enlace = 'a, button, [role="button"], label, summary, select, input[type="range"]';
    var media = 'video, #porfolio figure, #porfolio [data-video], #porfolio .group';
    document.addEventListener('pointerover', function (e) {
      var t = e.target;
      if (!t.closest) return;
      var esMedia = !!t.closest(media);
      ring.classList.toggle('is-media', esMedia);
      ring.classList.toggle('is-link', !esMedia && !!t.closest(enlace));
    });
    /* Dentro de iframes (chat, captcha) el cursor nativo vuelve solo */
  });

  /* ---------- 5. Tarjetas con borde y brillo dorado que sigue al ratón ---------- */
  safe(function () {
    var candidatas = document.querySelectorAll(
      'main .rounded-2xl, main .rounded-3xl, section .rounded-2xl, section .rounded-3xl, article.rounded-xl, section .rounded-xl.border'
    );
    var excluir = 'header, footer, nav, form, #mobile-menu, button, a.rounded-full, #inicio, .ds-marquee, [data-curtain], .tilt-card, #porfolio';
    candidatas.forEach(function (el) {
      if (el.closest(excluir)) return;
      if (el.matches('img, video, picture, svg, input, select, textarea')) return;
      var r = el.getBoundingClientRect();
      if (r.width < 180 || r.height < 120) return;
      var cs = getComputedStyle(el);
      /* solo tarjetas "de verdad": con fondo o con borde */
      if (cs.backgroundColor === 'rgba(0, 0, 0, 0)' && parseFloat(cs.borderTopWidth) === 0) return;
      el.classList.add('ds-glow');
      if (cs.position === 'static') el.style.position = 'relative';
      if (!finePointer) return;
      el.addEventListener('pointermove', function (e) {
        var b = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - b.left) + 'px');
        el.style.setProperty('--my', (e.clientY - b.top) + 'px');
      });
    });
  });

  /* ---------- 6. Apariciones al hacer scroll ---------- */
  safe(function () {
    if (reduce || !('IntersectionObserver' in window)) return;
    var excluir = 'header, footer, nav, form, #mobile-menu, #inicio, .ds-marquee, [data-scroll-fade], [data-scroll-zoom], [data-scrub], [data-curtain], .tilt-card, .reveal-words, [hidden], dialog, details:not([open])';
    var sel = 'main h1, main h2, main h3, main p, main ul, main ol, main figure, main blockquote, main table, ' +
              'section h2, section h3, section > div > p, .ds-glow, article h2, article h3, article p, article ul, article img';
    var lista = [];
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.closest(excluir)) return;
      if (el.closest('.ds-reveal') && el.closest('.ds-reveal') !== el) return;
      if (el.offsetParent === null) return; /* oculto ahora: no lo tocamos */
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) return; /* ya visible al cargar: sin animación */
      el.classList.add('ds-reveal');
      lista.push(el);
    });
    /* Escalonado entre hermanos */
    lista.forEach(function (el) {
      var p = el.parentElement, n = 0;
      if (!p) return;
      for (var c = p.firstElementChild; c && c !== el; c = c.nextElementSibling) if (c.classList.contains('ds-reveal')) n++;
      if (n) el.style.setProperty('--d', Math.min(n * 0.08, 0.4) + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    lista.forEach(function (el) { io.observe(el); });
    /* Red de seguridad: si algo no se ha mostrado en 6 s, se muestra */
    setTimeout(function () { lista.forEach(function (el) { el.classList.add('is-in'); }); }, 6000);
  });

  /* ---------- 7. Transición entre páginas (si el navegador no tiene View Transitions) ---------- */
  safe(function () {
    if (reduce) return;
    var soportaVT = 'onpagereveal' in window; /* Chrome/Edge 126+, Safari 18.2+ */
    if (soportaVT) return;
    var cortina = document.createElement('div');
    cortina.className = 'ds-curtain';
    cortina.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cortina);
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; /* anclas de la misma página */
      if (!/\.html?$|\/$/.test(url.pathname)) return; /* PDFs y otros archivos: normal */
      e.preventDefault();
      cortina.classList.add('is-on');
      setTimeout(function () { location.href = url.href; }, 480);
    });
    window.addEventListener('pageshow', function () { cortina.classList.remove('is-on'); });
  });
})();
