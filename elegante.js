/* Dreamscape Events — pulido: barra de progreso, cursor, parallax suave y revelado de fotos. */
(function () {
  'use strict';
  var d = document, w = window;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia && w.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* barra de progreso de lectura */
  var bar = d.createElement('div'); bar.className = 'scrollbar-line'; bar.setAttribute('aria-hidden', 'true'); d.body.appendChild(bar);
  var ticking = false, panos = [].slice.call(d.querySelectorAll('.pano img[data-pano]'));
  function frame() {
    ticking = false;
    var h = d.documentElement.scrollHeight - w.innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, Math.max(0, w.scrollY / h)) : 0) + ')';
    if (reduce) return;
    panos.forEach(function (im) {
      var r = im.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > w.innerHeight) return;
      var p = (r.top + r.height / 2 - w.innerHeight / 2) / w.innerHeight; /* -1..1 */
      im.style.transform = 'translate3d(0,' + (p * -7).toFixed(2) + '%,0)';
    });
  }
  function onScroll() { if (!ticking) { ticking = true; w.requestAnimationFrame(frame); } }
  w.addEventListener('scroll', onScroll, { passive: true }); w.addEventListener('resize', onScroll); frame();

  /* revelado suave de las fotos de galería */
  if (!reduce && 'IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: .12 });
    d.querySelectorAll('.gal .g img, .reelrow-l img').forEach(function (im) { im.classList.add('rv-img'); io.observe(im); });
  }


  /* gracias: plazo de respuesta (horario laborable, hora de Madrid) */
  (function () {
    var el = document.querySelector('[data-reply-by]');
    if (!el) return;
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short', hour: 'numeric', hour12: false });
      var p = {}; f.formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      var h = parseInt(p.hour, 10) % 24; if (isNaN(h)) return;
      var wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday);
      var hh = Math.min(19, Math.max(10, h));
      var day = 'mañana';
      if (wd === 4) day = 'el lunes';
      else if (wd === 5) day = 'el lunes';
      else if (wd === 6) day = 'el lunes';
      if (wd === 5 || wd === 6) hh = 12;
      el.textContent = 'Normalmente te respondemos ' + day + ' antes de las ' + hh + ':00 (hora de España)';
      el.hidden = false;
    } catch (e) { /* sin plazo exacto: el texto general sigue valiendo */ }
  })();

})();
