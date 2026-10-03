/* =====================================================================
   DREAMSCAPE EVENTS — efectos 2026 (dreamscape-fx.js)
   Intro, barra de progreso, servicios en abanico 3D, apariciones,
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
    var excluir = 'header, footer, nav, form, #mobile-menu, #inicio, .ds-marquee, [data-scroll-fade], [data-scroll-zoom], [data-scrub], [data-curtain], .tilt-card, [data-svc], .reveal-words, [hidden], dialog, details:not([open])';
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
  /* ---------- 8. Servicios en abanico 3D (portada) ---------- */
  safe(function () {
    var root = document.querySelector('[data-svc]');
    if (!root) return;
    var stage = root.querySelector('[data-svc-stage]');
    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-svc-card]'));
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-svc-tab]'));
    var n = cards.length;
    if (n < 2) return;
    var actual = 0, timer = null, enVista = false, encima = false;
    var TIEMPO = 7000;
    var tilt = { x: 0, y: 0 };
    root.style.setProperty('--ds-svc-time', TIEMPO + 'ms');
    root.classList.add('is-ready');

    function offset(i) {
      var d = i - actual;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    }
    function pintar(arrastre) {
      var w = cards[0].offsetWidth;
      var movil = window.innerWidth < 768;
      var sep = w * (movil ? 0.86 : 0.64);
      cards.forEach(function (c, i) {
        var d = offset(i) + (arrastre || 0);
        var a = Math.abs(d);
        var t = 'translateX(' + (d * sep) + 'px) translateZ(' + (-a * (movil ? 180 : 280)) + 'px) rotateY(' + (-d * (movil ? 24 : 34)) + 'deg) scale(' + (1 - Math.min(a, 1.5) * 0.06) + ')';
        if (i === actual && !arrastre) t += ' rotateX(' + tilt.y + 'deg) rotateY(' + tilt.x + 'deg)';
        c.style.transform = t;
        c.style.zIndex = String(30 - Math.round(a * 10));
        c.style.opacity = a > 1.6 ? '0' : '1';
        c.style.filter = 'brightness(' + Math.max(1 - a * 0.42, 0.35) + ') saturate(' + Math.max(1 - a * 0.3, 0.6) + ')';
        c.classList.toggle('is-active', i === actual);
        c.setAttribute('aria-hidden', i === actual ? 'false' : 'true');
        c.querySelectorAll('a').forEach(function (l) { l.tabIndex = i === actual ? 0 : -1; });
      });
      tabs.forEach(function (t, i) { t.setAttribute('aria-selected', i === actual ? 'true' : 'false'); });
    }
    function programar() {
      clearTimeout(timer);
      if (reduce || !enVista || encima || document.hidden) { root.classList.add('is-paused'); return; }
      root.classList.remove('is-paused');
      timer = setTimeout(function () { ir(actual + 1); }, TIEMPO);
    }
    function ir(i) {
      actual = (i + n) % n;
      tilt.x = tilt.y = 0;
      /* Reinicia la barra de tiempo de la pestaña activa */
      tabs.forEach(function (t) { var b = t.querySelector('b'); if (b) { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; } });
      pintar(0);
      programar();
    }

    tabs.forEach(function (t, i) { t.addEventListener('click', function () { ir(i); }); });
    var prev = root.querySelector('[data-svc-prev]');
    var next = root.querySelector('[data-svc-next]');
    if (prev) prev.addEventListener('click', function () { ir(actual - 1); });
    if (next) next.addEventListener('click', function () { ir(actual + 1); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual + 1); }
    });

    /* Tocar una tarjeta lateral la trae al frente */
    var arrastrado = false;
    cards.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (arrastrado) { e.preventDefault(); arrastrado = false; return; }
        if (i !== actual) { e.preventDefault(); ir(i); }
      });
    });

    /* Deslizar con el dedo o arrastrar con el ratón */
    var x0 = null, y0 = 0, dx = 0, horizontal = null;
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; dx = 0; horizontal = null; arrastrado = false; });
    window.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      if (horizontal === null && (Math.abs(dx) > 8 || Math.abs(e.clientY - y0) > 8)) horizontal = Math.abs(dx) > Math.abs(e.clientY - y0);
      if (!horizontal) return;
      arrastrado = true;
      root.classList.add('is-dragging');
      pintar(dx / (cards[0].offsetWidth * 0.8));
    }, { passive: true });
    function soltar() {
      if (x0 === null) return;
      root.classList.remove('is-dragging');
      if (horizontal && dx < -50) ir(actual + 1);
      else if (horizontal && dx > 50) ir(actual - 1);
      else pintar(0);
      x0 = null;
    }
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);

    /* Inclinación 3D y luz que siguen al ratón (solo ordenador) */
    if (finePointer && !reduce) {
      stage.addEventListener('pointermove', function (e) {
        if (x0 !== null) return;
        var c = cards[actual];
        var r = c.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        if (px < 0 || px > 1 || py < 0 || py > 1) return;
        tilt.x = (px - 0.5) * 8; tilt.y = -(py - 0.5) * 6;
        c.style.setProperty('--gx', (px * 100) + '%');
        c.style.setProperty('--gy', (py * 100) + '%');
        var m = c.querySelector('[data-svc-media]');
        if (m) m.style.transform = 'translate(' + (-(px - 0.5) * 22) + 'px,' + (-(py - 0.5) * 16) + 'px) scale(1.02)';
        pintar(0);
      });
      stage.addEventListener('pointerleave', function () {
        tilt.x = tilt.y = 0;
        var m = cards[actual].querySelector('[data-svc-media]');
        if (m) m.style.transform = '';
        pintar(0);
      });
    }

    /* Autoavance: solo con la sección a la vista y sin el ratón encima */
    root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { encima = true; programar(); } });
    root.addEventListener('pointerleave', function () { encima = false; programar(); });
    root.addEventListener('focusin', function () { encima = true; programar(); });
    root.addEventListener('focusout', function () { encima = false; programar(); });
    document.addEventListener('visibilitychange', programar);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { enVista = en[0].isIntersecting; programar(); }, { threshold: 0.35 }).observe(root);
    }
    window.addEventListener('resize', function () { pintar(0); });
    pintar(0);
  });
})();
