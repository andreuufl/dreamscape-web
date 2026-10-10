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
