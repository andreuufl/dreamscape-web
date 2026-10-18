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

  /* cursor discreto (solo ratón) */
  if (fine && !reduce) {
    var ring = d.createElement('div'); ring.className = 'cursor-ring'; ring.setAttribute('aria-hidden', 'true'); d.body.appendChild(ring);
    var x = 0, y = 0, tx = 0, ty = 0, run = false;
    function loop() { x += (tx - x) * .22; y += (ty - y) * .22; ring.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; if (Math.abs(tx - x) > .1 || Math.abs(ty - y) > .1) w.requestAnimationFrame(loop); else run = false; }
    d.addEventListener('pointermove', function (e) { if (e.pointerType !== 'mouse') return; tx = e.clientX; ty = e.clientY; ring.classList.add('is-on'); if (!run) { run = true; w.requestAnimationFrame(loop); } }, { passive: true });
    d.addEventListener('pointerover', function (e) { var t = e.target.closest && e.target.closest('a, button, summary, [role="button"], input, textarea, select, label'); ring.classList.toggle('is-link', !!t); });
    d.documentElement.addEventListener('mouseleave', function () { ring.classList.remove('is-on'); });
  }
})();
