/* =====================================================================
   DREAMSCAPE EVENTS — capa "show" (ds-show.js) · 2026-10
   Luces de escenario sobre la web: truss con cabezas móviles, haces
   volumétricos con humo, láser, chispas frías, flash de golpe, revelado
   tipo pantalla LED, cañón de seguimiento en titulares, láser entre
   secciones y vúmetro en el pie.
   Sin dependencias. Se apaga con "reducir movimiento" y, si algo falla,
   la web se ve exactamente igual que sin este archivo.
   ===================================================================== */
(function () {
  'use strict';
  var D = document, W = window, root = D.documentElement;
  if (!W.requestAnimationFrame || !W.IntersectionObserver) return;

  if (D.querySelector('.reel')) root.classList.add('ds-home');
  if (W.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var small = W.matchMedia('(max-width: 760px)').matches;
  var fine = W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var DPR = Math.min(W.devicePixelRatio || 1, small ? 1.5 : 1.75);
  root.classList.add('ds-show');

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(dt, rate) { return 1 - Math.exp(-dt * rate); }
  function hdrH() { var v = parseFloat(getComputedStyle(root).getPropertyValue('--hdr')); return isNaN(v) ? 72 : v; }
  function safe(fn) { try { fn(); } catch (e) { /* nunca romper la página */ } }

  /* ---------- Bucle único de animación (se para fuera de pantalla) ---------- */
  var actors = [], raf = 0, last = 0;
  function loop(now) {
    raf = 0;
    var dt = clamp((now - last) / 1000, 0, 0.05), t = now / 1000, live = false;
    last = now;
    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      if (a.dead || (!a.on && !a.busy)) continue;
      live = true;
      try { a.busy = a.draw(t, dt) === true; } catch (e) { a.dead = true; if (a.kill) safe(a.kill); }
    }
    if (live && !D.hidden) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !D.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  D.addEventListener('visibilitychange', kick);
  function actor(draw, watchEl) {
    var a = { on: false, busy: false, dead: false, draw: draw };
    actors.push(a);
    if (watchEl) {
      new IntersectionObserver(function (es) {
        a.on = es[es.length - 1].isIntersecting;
        if (a.on) kick();
      }, { rootMargin: '100px 0px' }).observe(watchEl);
    }
    return a;
  }

  function canvasIn(host, cls, before) {
    var c = D.createElement('canvas');
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    host.insertBefore(c, before || host.firstChild);
    var x = c.getContext('2d');
    if (!x) { c.remove(); return null; }
    var o = { c: c, x: x, w: 1, h: 1 };
    o.fit = function () {
      var r = c.getBoundingClientRect();
      o.w = Math.max(1, r.width); o.h = Math.max(1, r.height);
      c.width = Math.round(o.w * DPR); c.height = Math.round(o.h * DPR);
      x.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    o.fit();
    return o;
  }
  function onResize(el, fn) {
    var lw = 0, lh = 0;
    var cb = function () {
      var r = el.getBoundingClientRect();
      if (Math.abs(r.width - lw) < 2 && Math.abs(r.height - lh) < 60) return; // ignora la barra de Safari
      lw = r.width; lh = r.height; safe(fn);
    };
    if (W.ResizeObserver) new ResizeObserver(cb).observe(el); else W.addEventListener('resize', cb);
  }

  /* ---------- Textura de humo (ruido suave, se genera una vez) ---------- */
  var hazeTex = null;
  function haze() {
    if (hazeTex) return hazeTex;
    var w = 160, h = 112, c = D.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    var oct = [[5, .55], [10, .3], [20, .15]].map(function (o) {
      var g = []; for (var i = 0; i < o[0] * o[0]; i++) g.push(Math.random());
      return { n: o[0], a: o[1], g: g };
    });
    for (var y = 0; y < h; y++) for (var px = 0; px < w; px++) {
      var v = 0;
      for (var k = 0; k < oct.length; k++) {
        var O = oct[k], n = O.n, fx = px / w * n, fy = y / h * n, ix = Math.floor(fx), iy = Math.floor(fy);
        var tx = fx - ix, ty = fy - iy, g = O.g;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a = g[(iy % n) * n + ix % n], b = g[(iy % n) * n + (ix + 1) % n];
        var c2 = g[((iy + 1) % n) * n + ix % n], d2 = g[((iy + 1) % n) * n + (ix + 1) % n];
        v += O.a * lerp(lerp(a, b, tx), lerp(c2, d2, tx), ty);
      }
      var p = (y * w + px) * 4;
      d[p] = d[p + 1] = d[p + 2] = 255;
      d[p + 3] = Math.round(255 * clamp(0.2 + v * 1.05, 0, 1));
    }
    x.putImageData(img, 0, 0);
    return (hazeTex = c);
  }

  /* ---------- Escenas de luces (se van encadenando) ---------- */
  var SCENES = [
    { fx: 'fan',   cols: ['255,222,160', '255,242,218'] },
    { fx: 'cross', cols: ['230,238,255', '255,232,196'] },
    { fx: 'wave',  cols: ['255,170,84',  '255,212,140'], laser: 1 },
    { fx: 'hit',   cols: ['255,246,230', '255,222,160'], sparks: 1, flash: 1 },
    { fx: 'chase', cols: ['255,212,140', '255,236,200'] },
    { fx: 'bally', cols: ['160,190,255', '255,226,170'], laser: 1 },
    { fx: 'cross', cols: ['255,120,150', '255,180,100'] },
    { fx: 'hit',   cols: ['255,230,186', '255,248,236'], laser: 1, sparks: 1, flash: 1 }
  ];
  function rgb(s) { return s.split(',').map(Number); }

  /* ---------- Escenario: truss + cabezas móviles + láser + chispas ---------- */
  function stage(host, o) {
    var cv = canvasIn(host, 'ds-rig', o.before ? host.querySelector(o.before) : null);
    if (!cv) return;
    host.classList.add('ds-rigged');
    var buf = D.createElement('canvas'), bx = buf.getContext('2d');
    var trussC = D.createElement('canvas'), tx = trussC.getContext('2d');
    var hzC = D.createElement('canvas'), hzPat = null;
    var n = small ? o.nSmall : o.n, fx = [], i;
    for (i = 0; i < n; i++) fx.push({ x: 0, y: 0, a: 0, i: 0, z: .06, c: rgb(SCENES[0].cols[i % 2]) });
    var sIx = o.start || 0, scene = SCENES[sIx], sT = 0;
    var flash = 0, laser = 0, sparkT = o.intro ? 2.8 : 0, sparks = [];
    var aim = null, ptr = null, hazeOff = 0, born = -1, ty = 0;
    var aimEl = host.querySelector(o.aim || 'h1, h2');

    function layout() {
      cv.fit();
      var w = cv.w;
      buf.width = cv.c.width; buf.height = cv.c.height;
      bx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ty = o.trussY();
      var m = Math.max(28, w * (small ? .1 : .07));
      for (var k = 0; k < n; k++) {
        fx[k].x = n === 1 ? w / 2 : m + (w - 2 * m) * k / (n - 1);
        fx[k].y = ty + 34;
      }
      // humo a escala del escenario
      hzC.width = Math.round(w * 1.3 * DPR); hzC.height = cv.c.height;
      var hx = hzC.getContext('2d');
      hx.imageSmoothingEnabled = true;
      hx.drawImage(haze(), 0, 0, hzC.width, hzC.height);
      hzPat = bx.createPattern(hzC, 'repeat');
      // truss (se dibuja una vez)
      trussC.width = Math.round(w * DPR); trussC.height = Math.round(48 * DPR);
      tx.setTransform(DPR, 0, 0, DPR, 0, 0);
      tx.clearRect(0, 0, w, 48);
      var y0 = 6, y1 = 20, g = tx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(201,166,107,0)'); g.addColorStop(.06, 'rgba(201,166,107,.6)');
      g.addColorStop(.94, 'rgba(201,166,107,.6)'); g.addColorStop(1, 'rgba(201,166,107,0)');
      tx.strokeStyle = g; tx.lineCap = 'round';
      tx.lineWidth = 1.8;
      tx.beginPath(); tx.moveTo(0, y0); tx.lineTo(w, y0); tx.moveTo(0, y1); tx.lineTo(w, y1); tx.stroke();
      tx.lineWidth = .8;
      tx.beginPath();
      for (var x = 0; x < w; x += 14) { tx.moveTo(x, y0); tx.lineTo(x + 7, y1); tx.lineTo(x + 14, y0); }
      tx.stroke();
      tx.strokeStyle = 'rgba(255,240,210,.22)'; tx.lineWidth = .6;
      tx.beginPath(); tx.moveTo(0, y0 - 1); tx.lineTo(w, y0 - 1); tx.stroke();
      for (k = 0; k < n; k++) { // abrazaderas + horquillas
        var fxk = fx[k].x;
        tx.fillStyle = '#1a1a1d'; tx.strokeStyle = 'rgba(201,166,107,.7)'; tx.lineWidth = 1;
        tx.fillRect(fxk - 4, y1 - 1, 8, 6); tx.strokeRect(fxk - 4, y1 - 1, 8, 6);
        tx.beginPath(); tx.moveTo(fxk - 11, y1 + 6); tx.lineTo(fxk - 11, y1 + 16); tx.moveTo(fxk + 11, y1 + 6); tx.lineTo(fxk + 11, y1 + 16);
        tx.moveTo(fxk - 11, y1 + 6); tx.lineTo(fxk + 11, y1 + 6); tx.stroke();
      }
    }
    layout();
    onResize(host, layout);

    if (fine) {
      host.addEventListener('pointermove', function (e) {
        var r = cv.c.getBoundingClientRect();
        ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
      }, { passive: true });
      host.addEventListener('pointerleave', function () { ptr = null; });
    }

    function nextScene() {
      sIx = (sIx + 1) % SCENES.length; scene = SCENES[sIx]; sT = 0;
      if (scene.fx === 'hit' && aimEl) {
        var r = aimEl.getBoundingClientRect(), hr = cv.c.getBoundingClientRect();
        aim = { x: r.left - hr.left + Math.min(r.width, cv.w * .8) * .5, y: r.top - hr.top + r.height * .5 };
        if (scene.flash) {
          flash = 1;
          aimEl.classList.remove('ds-hit'); void aimEl.offsetWidth; aimEl.classList.add('ds-hit');
        }
        if (scene.sparks) sparkT = 2;
      }
    }

    function targets(t) {
      var k, f, mid = (n - 1) / 2;
      for (k = 0; k < n; k++) {
        f = fx[k];
        var u = n === 1 ? 0 : (k - mid) / mid, ta = 0, ti = 1, tz = small ? .075 : .06;
        switch (scene.fx) {
          case 'fan': ta = u * (.5 + .1 * Math.sin(t * .7)); break;
          case 'cross': ta = (u < 0 ? 1 : -1) * (.3 + .12 * Math.sin(t * .9 + k)) * (u === 0 ? 0 : 1); break;
          case 'wave': ta = .42 * Math.sin(t * 1.25 + k * .75); ti = .55 + .45 * Math.sin(t * 2.1 + k); tz = .085; break;
          case 'hit':
            if (aim) ta = Math.atan2(aim.x - f.x, Math.max(40, aim.y - f.y));
            tz = .034; break;
          case 'chase':
            ta = .12 * Math.sin(t * .6 + k);
            var p = (t * 5) % n, dd = Math.abs(k - p); dd = Math.min(dd, n - dd);
            ti = Math.max(.1, 1 - dd * .55); break;
          case 'bally': ta = .55 * Math.sin(t * 1.6 + k * 1.3); tz = .05; break;
        }
        if (ptr && scene.fx !== 'hit') ta = lerp(ta, Math.atan2(ptr.x - f.x, Math.max(40, ptr.y - f.y)), .28);
        f.ta = ta; f.ti = ti; f.tz = tz;
      }
    }

    function beam(c, x, y, a, z, L, col, alpha) {
      var ex = x + Math.sin(a) * L, ey = y + Math.cos(a) * L;
      var g = c.createLinearGradient(x, y, ex, ey);
      g.addColorStop(0, 'rgba(' + col + ',' + alpha + ')');
      g.addColorStop(.45, 'rgba(' + col + ',' + alpha * .38 + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 2, y); c.lineTo(x + 2, y);
      c.lineTo(x + Math.sin(a - z) * L, y + Math.cos(a - z) * L);
      c.lineTo(x + Math.sin(a + z) * L, y + Math.cos(a + z) * L);
      c.closePath(); c.fill();
    }

    function draw(t, dt) {
      if (born < 0) born = t;
      var w = cv.w, h = cv.h, x = cv.x, k, f;
      var live = clamp((t - born) / 1.6, 0, 1) * o.k;
      sT += dt;
      if (sT > (scene.fx === 'hit' ? 3.4 : 4.4)) nextScene();
      targets(t);

      for (k = 0; k < n; k++) {
        f = fx[k];
        f.a += (f.ta - f.a) * ease(dt, 3.4);
        f.i += (f.ti - f.i) * ease(dt, 7);
        f.z += (f.tz - f.z) * ease(dt, 4);
        var tc = rgb(scene.cols[k % 2]);
        for (var j = 0; j < 3; j++) f.c[j] += (tc[j] - f.c[j]) * ease(dt, 2.6);
      }

      /* haces en un búfer, recortados por el humo */
      bx.globalCompositeOperation = 'source-over';
      bx.clearRect(0, 0, w, h);
      bx.globalCompositeOperation = 'lighter';
      var L = h * 1.15;
      for (k = 0; k < n; k++) {
        f = fx[k];
        var I = f.i * live; if (I < .01) continue;
        var col = (f.c[0] | 0) + ',' + (f.c[1] | 0) + ',' + (f.c[2] | 0);
        beam(bx, f.x, f.y, f.a, f.z * 2.1, L, col, .1 * I);
        beam(bx, f.x, f.y, f.a, f.z, L, col, .3 * I);
        beam(bx, f.x, f.y, f.a, f.z * .3, L * .85, '255,252,244', .26 * I);
      }
      if (hzPat) {
        hazeOff = (hazeOff + dt * 22) % (w * 1.3);
        bx.save();
        bx.globalCompositeOperation = 'destination-in';
        bx.setTransform(1, 0, 0, 1, 0, 0);
        bx.translate(-hazeOff * DPR, 0);
        bx.fillStyle = hzPat;
        bx.fillRect(hazeOff * DPR, 0, buf.width, buf.height);
        bx.restore();
      }

      x.globalCompositeOperation = 'source-over';
      x.clearRect(0, 0, w, h);
      x.globalCompositeOperation = 'lighter';
      x.drawImage(buf, 0, 0, w, h);

      /* charcos de luz en el suelo */
      for (k = 0; k < n; k++) {
        f = fx[k];
        if (Math.abs(f.a) > 1.1) continue;
        var px = f.x + Math.tan(f.a) * (h - f.y), I2 = f.i * live;
        if (px < -80 || px > w + 80 || I2 < .05) continue;
        var rr = Math.max(40, (h - f.y) * Math.tan(f.z) * 1.4);
        var pg = x.createRadialGradient(px, h - 6, 0, px, h - 6, rr);
        pg.addColorStop(0, 'rgba(' + (f.c[0] | 0) + ',' + (f.c[1] | 0) + ',' + (f.c[2] | 0) + ',' + .16 * I2 + ')');
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = pg;
        x.beginPath(); x.ellipse(px, h - 6, rr, rr * .28, 0, 0, Math.PI * 2); x.fill();
      }

      /* láser */
      laser += ((scene.laser ? 1 : 0) - laser) * ease(dt, 2.2);
      if (laser > .02 && o.lasers) {
        var ox = w / 2, oy = ty + 26, base = .38 * Math.sin(t * 1.05), ln = small ? 7 : 11, LL = Math.hypot(w, h);
        for (k = 0; k < ln; k++) {
          var la = base + (k / (ln - 1) - .5) * (1.15 + .25 * Math.sin(t * .8));
          var lx = ox + Math.sin(la) * LL, ly = oy + Math.cos(la) * LL;
          x.strokeStyle = 'rgba(255,206,120,' + .07 * laser * live + ')'; x.lineWidth = 6;
          x.beginPath(); x.moveTo(ox, oy); x.lineTo(lx, ly); x.stroke();
          x.strokeStyle = 'rgba(255,226,170,' + .55 * laser * live + ')'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(ox, oy); x.lineTo(lx, ly); x.stroke();
        }
        var lg = x.createRadialGradient(ox, oy, 0, ox, oy, 26);
        lg.addColorStop(0, 'rgba(255,240,210,' + .9 * laser + ')'); lg.addColorStop(1, 'rgba(255,240,210,0)');
        x.fillStyle = lg; x.beginPath(); x.arc(ox, oy, 26, 0, Math.PI * 2); x.fill();
      }

      /* chispas frías */
      if (sparkT > 0 && o.sparks) {
        sparkT -= dt;
        var em = o.sparks(w, h), rate = (small ? 70 : 140) * dt;
        for (var e = 0; e < em.length; e++) {
          for (var q = 0; q < rate; q++) {
            if (sparks.length > (small ? 260 : 520)) break;
            var v0 = Math.sqrt(2 * 980 * h * rand(.26, .44));
            sparks.push({ x: em[e].x + rand(-4, 4), y: em[e].y, vx: rand(-55, 55), vy: -v0, l: rand(.8, 1.3), m: 0 });
          }
          var bg = x.createRadialGradient(em[e].x, em[e].y, 0, em[e].x, em[e].y, 60);
          bg.addColorStop(0, 'rgba(255,236,200,.5)'); bg.addColorStop(1, 'rgba(255,236,200,0)');
          x.fillStyle = bg; x.beginPath(); x.arc(em[e].x, em[e].y, 60, 0, Math.PI * 2); x.fill();
        }
      }
      if (sparks.length) {
        x.lineCap = 'round';
        for (k = sparks.length - 1; k >= 0; k--) {
          var s = sparks[k];
          s.m += dt;
          if (s.m > s.l) { sparks.splice(k, 1); continue; }
          var ox2 = s.x, oy2 = s.y;
          s.vy += 980 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
          var life = 1 - s.m / s.l;
          x.strokeStyle = 'rgba(255,' + (200 + 50 * life | 0) + ',' + (140 + 90 * life | 0) + ',' + life + ')';
          x.lineWidth = 1.3;
          x.beginPath(); x.moveTo(ox2 - (s.x - ox2) * 1.6, oy2 - (s.y - oy2) * 1.6); x.lineTo(s.x, s.y); x.stroke();
        }
      }

      /* truss y cabezas móviles */
      x.globalCompositeOperation = 'source-over';
      x.globalAlpha = live / o.k;
      x.drawImage(trussC, 0, ty, w, 48);
      for (k = 0; k < n; k++) {
        f = fx[k];
        var hy = ty + 30, cc = (f.c[0] | 0) + ',' + (f.c[1] | 0) + ',' + (f.c[2] | 0);
        x.save();
        x.translate(f.x, hy);
        x.rotate(-f.a);
        x.fillStyle = '#121214'; x.strokeStyle = 'rgba(201,166,107,.75)'; x.lineWidth = 1;
        x.beginPath(); x.rect(-7, -8, 14, 13); x.fill(); x.stroke();
        x.fillStyle = 'rgba(' + cc + ',' + (.35 + .65 * f.i * live) + ')';
        x.beginPath(); x.ellipse(0, 5, 5, 2, 0, 0, Math.PI * 2); x.fill();
        x.restore();
      }
      x.globalAlpha = 1;
      x.globalCompositeOperation = 'lighter';
      for (k = 0; k < n; k++) {
        f = fx[k];
        var I3 = f.i * live, lx2 = f.x + Math.sin(f.a) * 5, ly2 = ty + 30 + Math.cos(f.a) * 5;
        var gg = x.createRadialGradient(lx2, ly2, 0, lx2, ly2, 26);
        gg.addColorStop(0, 'rgba(255,248,234,' + .9 * I3 + ')');
        gg.addColorStop(.3, 'rgba(' + (f.c[0] | 0) + ',' + (f.c[1] | 0) + ',' + (f.c[2] | 0) + ',' + .35 * I3 + ')');
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = gg; x.beginPath(); x.arc(lx2, ly2, 26, 0, Math.PI * 2); x.fill();
      }

      /* golpe de luz */
      if (flash > 0) {
        x.globalCompositeOperation = 'lighter';
        x.fillStyle = 'rgba(255,246,228,' + .2 * flash * flash + ')';
        x.fillRect(0, 0, w, h);
        flash = Math.max(0, flash - dt * 2.4);
      }
      x.globalCompositeOperation = 'source-over';
      return false;
    }
    actor(draw, host);
  }

  /* ---------- Montaje de escenarios ---------- */
  safe(function () {
    var reel = D.querySelector('.reel');
    if (reel) stage(reel, {
      n: 8, nSmall: 5, k: 1, lasers: true, intro: true, aim: '.display', before: '.reel-top',
      trussY: function () { return hdrH() + (small ? 40 : 46); },
      sparks: function (w, h) { return small ? [{ x: w * .94, y: h }] : [{ x: w * .035, y: h }, { x: w * .965, y: h }]; }
    });
  });
  safe(function () {
    D.querySelectorAll('.phero').forEach(function (ph) {
      stage(ph, {
        n: 6, nSmall: 4, k: ph.classList.contains('phero--img') ? .9 : .75, lasers: true, intro: true, aim: 'h1',
        before: '.wrap', start: 2,
        trussY: function () { return hdrH() + 6; },
        sparks: function (w, h) { return small ? [] : [{ x: w * .04, y: h }, { x: w * .96, y: h }]; }
      });
    });
  });
  safe(function () {
    D.querySelectorAll('.band').forEach(function (b) {
      stage(b, {
        n: 6, nSmall: 4, k: .9, lasers: false, intro: false, aim: 'h2', before: '.wrap', start: 3,
        trussY: function () { return 16; },
        sparks: function (w, h) { return [{ x: w * (small ? .08 : .05), y: h }, { x: w * (small ? .92 : .95), y: h }]; }
      });
    });
  });

  /* ---------- Cañón de seguimiento en los titulares de sección ---------- */
  safe(function () {
    var hs = D.querySelectorAll('main .sec h2');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('ds-lit');
      });
    }, { threshold: .6 });
    hs.forEach(function (h) {
      if (h.closest('.sec--paper, .band, .reel, .phero')) return;
      var s = D.createElement('span');
      s.className = 'ds-spot'; s.setAttribute('aria-hidden', 'true');
      h.classList.add('ds-spot-h');
      h.insertBefore(s, h.firstChild);
      io.observe(h);
    });
  });

  /* ---------- Láser que recorre el borde de cada sección ---------- */
  safe(function () {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('on');
      });
    }, { threshold: 1, rootMargin: '0px 0px -12% 0px' });
    D.querySelectorAll('main > section.sec, main > .band').forEach(function (sec, ix) {
      if (ix === 0 && !sec.previousElementSibling) return;
      var l = D.createElement('i');
      l.className = 'ds-laser'; l.setAttribute('aria-hidden', 'true');
      l.appendChild(D.createElement('b'));
      sec.insertBefore(l, sec.firstChild);
      io.observe(l);
    });
  });

  /* ---------- Fotos y vídeos que se encienden como una pantalla LED ---------- */
  safe(function () {
    var sel = '.gal .g, .dc, .type, .pj-media, .split-media, .post-media, .esp-map';
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        safe(function () { ledReveal(e.target); });
      });
    }, { threshold: .18 });
    D.querySelectorAll(sel).forEach(function (el) { if (el.querySelector('img, video')) io.observe(el); });
  });
  function ledReveal(el) {
    var m = el.querySelector('img, video');
    var host = m.parentElement && m.parentElement.tagName === 'PICTURE' ? m.parentElement.parentElement : m.parentElement;
    if (!host) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var cv = canvasIn(host, 'ds-led');
    if (!cv) return;
    var w = cv.w, h = cv.h, cs = small ? 12 : 16, cols = Math.ceil(w / cs), rows = Math.ceil(h / cs), cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      cells.push(c / cols * .42 + r / rows * .14 + Math.random() * .34);
    }
    var t0 = -1, x = cv.x;
    function paint(t) {
      if (t0 < 0) t0 = t;
      var tau = t - t0, done = true;
      x.clearRect(0, 0, w, h);
      for (var r2 = 0, i = 0; r2 < rows; r2++) for (var c2 = 0; c2 < cols; c2++, i++) {
        var d = cells[i], X = c2 * cs, Y = r2 * cs;
        if (tau < d) { x.fillStyle = '#0a0a0b'; x.fillRect(X, Y, cs, cs); done = false; }
        else if (tau < d + .16) {
          var k = 1 - (tau - d) / .16;
          x.fillStyle = 'rgba(255,226,170,' + .85 * k + ')'; x.fillRect(X + 1, Y + 1, cs - 2, cs - 2); done = false;
        }
      }
      var gl = 1 - tau / 1.2;
      if (gl > 0) {
        x.strokeStyle = 'rgba(10,10,11,' + .55 * gl + ')'; x.lineWidth = 1;
        x.beginPath();
        for (var gx = cs; gx < w; gx += cs) { x.moveTo(gx + .5, 0); x.lineTo(gx + .5, h); }
        for (var gy = cs; gy < h; gy += cs) { x.moveTo(0, gy + .5); x.lineTo(w, gy + .5); }
        x.stroke(); done = false;
      }
      if (done) { cv.c.remove(); return; }
      requestAnimationFrame(function (n2) { paint(n2 / 1000); });
    }
    paint(performance.now() / 1000);
    setTimeout(function () { if (cv.c.parentNode) cv.c.remove(); }, 2500);
  }

  /* ---------- Ráfaga de chispas al pulsar los botones dorados ---------- */
  safe(function () {
    var layer = null, parts = [], a = null;
    function ensure() {
      if (layer) return;
      layer = canvasIn(D.body, 'ds-burst', null);
      if (!layer) return;
      W.addEventListener('resize', function () { safe(layer.fit); });
      a = actor(function (t, dt) {
        var x = layer.x;
        x.clearRect(0, 0, layer.w, layer.h);
        x.globalCompositeOperation = 'lighter'; x.lineCap = 'round';
        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.m += dt;
          if (p.m > p.l) { parts.splice(i, 1); continue; }
          var ox = p.x, oy = p.y;
          p.vy += 900 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt;
          var life = 1 - p.m / p.l;
          x.strokeStyle = 'rgba(255,' + (205 + 45 * life | 0) + ',' + (150 + 80 * life | 0) + ',' + life + ')';
          x.lineWidth = 1.6;
          x.beginPath(); x.moveTo(ox - (p.x - ox) * 1.4, oy - (p.y - oy) * 1.4); x.lineTo(p.x, p.y); x.stroke();
        }
        x.globalCompositeOperation = 'source-over';
        return parts.length > 0;
      }, null);
    }
    D.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.btn--gold, [data-ds-sparks]');
      if (!b) return;
      ensure();
      if (!layer) return;
      for (var i = 0; i < (small ? 28 : 44); i++) {
        var ang = rand(-Math.PI, 0), sp = rand(180, 520);
        parts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, l: rand(.45, .9), m: 0 });
      }
      a.busy = true; kick();
    }, { passive: true });
  });

  /* ---------- Vúmetro en el pie ---------- */
  safe(function () {
    var ftr = D.querySelector('.ftr');
    if (!ftr) return;
    var eq = D.createElement('div');
    eq.className = 'ds-eq'; eq.setAttribute('aria-hidden', 'true');
    var nb = small ? 28 : 72, html = '';
    for (var i = 0; i < nb; i++) {
      var mid = 1 - Math.abs(i / (nb - 1) - .5) * 1.1;
      html += '<i style="--d:' + rand(.32, .85).toFixed(2) + 's;--l:-' + rand(0, 1.5).toFixed(2) + 's;--h:' + clamp(rand(.25, 1) * mid + .1, .15, 1).toFixed(2) + '"></i>';
    }
    eq.innerHTML = html;
    ftr.insertBefore(eq, ftr.firstChild);
    new IntersectionObserver(function (es) { eq.classList.toggle('on', es[0].isIntersecting); }).observe(eq);
  });
})();
