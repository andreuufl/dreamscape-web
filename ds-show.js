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

  /* ---------- Escenas de luces según el tipo de evento ---------- */
  var MOODS = {
    show: [
      { fx: 'fan',   cols: ['255,222,160', '255,242,218'] },
      { fx: 'cross', cols: ['230,238,255', '255,232,196'] },
      { fx: 'wave',  cols: ['255,170,84',  '255,212,140'], laser: 1 },
      { fx: 'hit',   cols: ['255,246,230', '255,222,160'], sparks: 1, flash: 1 },
      { fx: 'chase', cols: ['255,212,140', '255,236,200'] },
      { fx: 'bally', cols: ['160,190,255', '255,226,170'], laser: 1 },
      { fx: 'cross', cols: ['255,120,150', '255,180,100'] },
      { fx: 'hit',   cols: ['255,230,186', '255,248,236'], laser: 1, sparks: 1, flash: 1 }
    ],
    /* Bodas: cálido, velas, ámbar y rosado suave; sin láser */
    boda: [
      { fx: 'fan',   cols: ['255,206,140', '255,232,196'], speed: .7 },
      { fx: 'wave',  cols: ['255,176,110', '255,214,170'], speed: .6 },
      { fx: 'cross', cols: ['255,170,150', '255,222,180'], speed: .7 },
      { fx: 'hit',   cols: ['255,236,206', '255,214,160'], sparks: 1, flash: .6 },
      { fx: 'chase', cols: ['255,196,120', '255,226,180'], speed: .6 }
    ],
    /* Empresa: blanco frío, dorado y sobrio; movimientos lentos */
    empresa: [
      { fx: 'fan',   cols: ['236,242,255', '255,240,214'], speed: .55 },
      { fx: 'cross', cols: ['210,226,255', '236,242,255'], speed: .55 },
      { fx: 'hit',   cols: ['255,250,240', '230,238,255'], flash: .45 },
      { fx: 'wave',  cols: ['255,226,170', '236,242,255'], speed: .5, laser: 1 }
    ]
  };
  var MOOD = (function () {
    var p = location.pathname.replace(/^\/|\.html$/g, '');
    if (/boda|wedding|ceremonia/.test(p)) return 'boda';
    if (/corporativ|congreso|empresa|gala|presentacion|traduccion|streaming|sonorizacion/.test(p)) return 'empresa';
    return 'show';
  })();
  var SCENES = MOODS[MOOD];
  root.setAttribute('data-ds-mood', MOOD);

  /* ---------- Scroll: posición y velocidad (las luces lo siguen) ---------- */
  var SCR = { y: W.scrollY || 0, v: 0, t: performance.now() };
  W.addEventListener('scroll', function () {
    var now = performance.now(), y = W.scrollY || 0, dt = Math.max(8, now - SCR.t);
    SCR.v = SCR.v * .6 + ((y - SCR.y) / dt * 1000) * .4;
    SCR.y = y; SCR.t = now;
  }, { passive: true });

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
    var sIx = (o.start || 0) % SCENES.length, scene = SCENES[sIx], sT = 0, lt = 0;
    var SHOW = null, scrollP = .5, bokeh = [], api = {};
    var SHOWCOLS = ['255,244,226', '255,96,150', '120,168,255', '255,176,70'];
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
          flash = scene.flash;
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
        if (SHOW) {
          var b = SHOW.beat;
          if (b < 0) { ta = u * .1; ti = (k === Math.round(mid)) ? clamp(1 + b / 2.5, 0, 1) * .8 : 0; tz = .03; }
          else {
            var bi = Math.floor(b), ph = b - bi, pat = Math.floor(bi / 2) % 4;
            if (pat === 0) ta = u * .62;
            else if (pat === 1) ta = u === 0 ? 0 : (u < 0 ? 1 : -1) * .34;
            else if (pat === 2) ta = .5 * Math.sin(b * Math.PI * .5 + k * .9);
            else ta = aim ? Math.atan2(aim.x - f.x, Math.max(40, aim.y - f.y)) : 0;
            ti = (bi % 2 === 0) === (k % 2 === 0) ? 1 : .3;
            ti *= .5 + .5 * Math.exp(-ph * 3.5);
            tz = .05;
          }
        } else {
          /* las luces acompañan el scroll: inercia + barrido mientras la sección pasa */
          ta += clamp(SCR.v / 2600, -.5, .5) + (scrollP - .5) * .7 * (u >= 0 ? 1 : .6);
        }
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
      var hr = host.getBoundingClientRect(), vh = W.innerHeight || 800;
      scrollP = clamp((vh - hr.top) / (vh + hr.height), 0, 1);
      if (host.classList.contains('reel')) scrollP = .5 + clamp(-hr.top / hr.height, 0, 1) * .5;
      SCR.v *= Math.exp(-dt * 3);
      if (SHOW) showTick();
      else {
        sT += dt;
        if (sT > (scene.fx === 'hit' ? 3.4 : 4.4)) nextScene();
      }
      lt += dt * (scene.speed || 1);
      targets(SHOW ? t : lt);
      var rate = SHOW ? 11 : 3.4;

      for (k = 0; k < n; k++) {
        f = fx[k];
        f.a += (f.ta - f.a) * ease(dt, rate);
        f.i += (f.ti - f.i) * ease(dt, SHOW ? 18 : 7);
        f.z += (f.tz - f.z) * ease(dt, 4);
        var tc = rgb(SHOW && SHOW.beat >= 0 ? SHOWCOLS[Math.floor(SHOW.beat / 4) % 4] : scene.cols[k % 2]);
        for (var j = 0; j < 3; j++) f.c[j] += (tc[j] - f.c[j]) * ease(dt, SHOW ? 8 : 2.6);
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
      laser += ((SHOW ? (SHOW.beat >= 0 ? 1 : 0) : (scene.laser ? 1 : 0)) - laser) * ease(dt, SHOW ? 8 : 2.2);
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
      /* bokeh de velas (solo bodas) */
      if (MOOD === 'boda') {
        if (bokeh.length < (small ? 14 : 26) && Math.random() < dt * 6) bokeh.push({ x: rand(0, w), y: h + 20, r: rand(6, small ? 16 : 26), v: rand(14, 34), s: rand(0, 6), m: 0, l: rand(6, 11) });
        x.globalCompositeOperation = 'lighter';
        for (k = bokeh.length - 1; k >= 0; k--) {
          var bk = bokeh[k]; bk.m += dt; bk.y -= bk.v * dt; bk.x += Math.sin(t * .6 + bk.s) * 6 * dt;
          if (bk.m > bk.l) { bokeh.splice(k, 1); continue; }
          var ba = Math.sin(bk.m / bk.l * Math.PI) * .22 * live;
          var bgk = x.createRadialGradient(bk.x, bk.y, 0, bk.x, bk.y, bk.r);
          bgk.addColorStop(0, 'rgba(255,214,150,' + ba + ')'); bgk.addColorStop(.7, 'rgba(255,190,110,' + ba * .5 + ')'); bgk.addColorStop(1, 'rgba(255,190,110,0)');
          x.fillStyle = bgk; x.beginPath(); x.arc(bk.x, bk.y, bk.r, 0, Math.PI * 2); x.fill();
        }
      }
      x.globalCompositeOperation = 'source-over';
      return false;
    }

    function showTick() {
      SHOW.beat = SHOW.clock();
      var b = SHOW.beat, bi = Math.floor(b);
      host.classList.toggle('ds-blackout', b < 0);
      if (bi !== SHOW.last && b >= 0) {
        SHOW.last = bi;
        if (bi === 0 || bi % 4 === 0) {
          flash = bi === 0 ? 1.2 : .55;
          if (aimEl) { aimEl.classList.remove('ds-hit'); void aimEl.offsetWidth; aimEl.classList.add('ds-hit'); }
        }
        if (bi === 0 || bi === 8) sparkT = 1.6;
        if (aimEl && !aim) {
          var r = aimEl.getBoundingClientRect(), hr2 = cv.c.getBoundingClientRect();
          aim = { x: r.left - hr2.left + Math.min(r.width, cv.w * .8) * .5, y: r.top - hr2.top + r.height * .5 };
        }
      }
      if (b >= SHOW.len) {
        flash = 1; sparkT = 2.2;
        var done = SHOW.done; SHOW = null; sT = 0;
        host.classList.remove('ds-blackout');
        if (done) done();
      }
    }
    api.show = function (clock, len, done) {
      if (aimEl) {
        var r = aimEl.getBoundingClientRect(), hr2 = cv.c.getBoundingClientRect();
        aim = { x: r.left - hr2.left + Math.min(r.width, cv.w * .8) * .5, y: r.top - hr2.top + r.height * .5 };
      }
      SHOW = { clock: clock, len: len, last: -99, beat: -9, done: done };
      kick();
    };
    api.stop = function () { if (SHOW) { SHOW.len = -100; } };
    actor(draw, host);
    return api;
  }

  /* ---------- Montaje de escenarios ---------- */
  var REEL = null;
  safe(function () {
    var reel = D.querySelector('.reel');
    if (reel) REEL = stage(reel, {
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

  /* ---------- Botón "Dale al show": apagón, subida, golpe y 8 compases de luces con música ---------- */
  safe(function () {
    var reel = D.querySelector('.reel'), meta = reel && reel.querySelector('.reel-meta');
    if (!REEL || !meta) return;
    var en = (root.lang || '').indexOf('en') === 0;
    var btn = D.createElement('button');
    btn.type = 'button'; btn.className = 'ds-showbtn';
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<span class="ds-showbtn-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="ds-showbtn-t">' + (en ? 'Hit the show' : 'Dale al show') + '</span><span class="ds-showbtn-s">' + (en ? 'with sound' : 'con sonido') + '</span>';
    meta.appendChild(btn);

    var BPM = 124, SPB = 60 / BPM, RISER = 2.4, BEATS = 32;
    var ac = null, master = null, running = false, t0 = 0, perf0 = 0, nodes = [];

    function audio() {
      if (ac) return ac;
      var AC = W.AudioContext || W.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master = ac.createGain(); master.gain.value = .55;
      master.connect(comp); comp.connect(ac.destination);
      return ac;
    }
    var noiseBuf = null;
    function noise() {
      if (noiseBuf) return noiseBuf;
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return noiseBuf;
    }
    function track(n) { nodes.push(n); return n; }
    function env(g, at, peak, dec) {
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + .005);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dec);
    }
    function kickAt(at, big) {
      var o = track(ac.createOscillator()), g = ac.createGain();
      o.frequency.setValueAtTime(big ? 170 : 150, at);
      o.frequency.exponentialRampToValueAtTime(42, at + .14);
      env(g, at, big ? 1 : .85, big ? .7 : .38);
      o.connect(g); g.connect(master); o.start(at); o.stop(at + .8);
    }
    function hatAt(at, v) {
      var s2 = track(ac.createBufferSource()), f = ac.createBiquadFilter(), g = ac.createGain();
      s2.buffer = noise(); f.type = 'highpass'; f.frequency.value = 7500;
      env(g, at, v || .12, .06);
      s2.connect(f); f.connect(g); g.connect(master); s2.start(at, Math.random()); s2.stop(at + .1);
    }
    function clapAt(at) {
      var s2 = track(ac.createBufferSource()), f = ac.createBiquadFilter(), g = ac.createGain();
      s2.buffer = noise(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = .8;
      env(g, at, .32, .18);
      s2.connect(f); f.connect(g); g.connect(master); s2.start(at, Math.random()); s2.stop(at + .25);
    }
    function synthAt(at, freqs, dur, vol, cut, type) {
      var f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(cut, at); f.frequency.exponentialRampToValueAtTime(cut * .35, at + dur);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(vol, at + .02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      f.connect(g); g.connect(master);
      freqs.forEach(function (fr, ix) {
        var o = track(ac.createOscillator());
        o.type = type || 'sawtooth'; o.frequency.value = fr; o.detune.value = ix % 2 ? 7 : -7;
        o.connect(f); o.start(at); o.stop(at + dur + .05);
      });
    }
    function schedule(start) {
      // subida: ruido filtrado que abre + tono que sube
      var rs = track(ac.createBufferSource()), rf = ac.createBiquadFilter(), rg = ac.createGain();
      rs.buffer = noise(); rs.loop = true; rf.type = 'bandpass'; rf.Q.value = 3;
      rf.frequency.setValueAtTime(300, start); rf.frequency.exponentialRampToValueAtTime(7000, start + RISER);
      rg.gain.setValueAtTime(0.0001, start); rg.gain.exponentialRampToValueAtTime(.35, start + RISER - .05); rg.gain.linearRampToValueAtTime(0, start + RISER);
      rs.connect(rf); rf.connect(rg); rg.connect(master); rs.start(start); rs.stop(start + RISER + .05);
      var ro = track(ac.createOscillator()), rog = ac.createGain();
      ro.type = 'sawtooth'; ro.frequency.setValueAtTime(110, start); ro.frequency.exponentialRampToValueAtTime(880, start + RISER);
      rog.gain.setValueAtTime(0.0001, start); rog.gain.exponentialRampToValueAtTime(.07, start + RISER - .05); rog.gain.linearRampToValueAtTime(0, start + RISER);
      ro.connect(rog); rog.connect(master); ro.start(start); ro.stop(start + RISER + .05);
      // golpe + 8 compases a 124 BPM (La m · Fa · Do · Sol)
      var drop = start + RISER, CH = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
      var BASS = [55, 43.65, 65.41, 49];
      synthAt(drop, CH[0].concat([110]), 2.4, .22, 3200);
      for (var b = 0; b < BEATS; b++) {
        var at = drop + b * SPB, bar = Math.floor(b / 4) % 4;
        kickAt(at, b === 0);
        hatAt(at + SPB / 2, .14);
        if (b % 2 === 1) clapAt(at);
        if (b % 4 === 0) synthAt(at, CH[bar], SPB * 4 - .05, .085, 2400);
        synthAt(at + SPB / 2, [BASS[bar]], SPB * .45, .16, 600, 'square');
      }
      var end = drop + BEATS * SPB;
      kickAt(end, true);
      synthAt(end, CH[0].concat([110, 440]), 3, .2, 3600);
    }
    function clock() {
      if (ac && ac.state === 'running') return (ac.currentTime - t0) / SPB - RISER / SPB;
      return ((performance.now() - perf0) / 1000) / SPB - RISER / SPB;
    }
    function stopAll() {
      running = false;
      btn.classList.remove('is-on'); btn.setAttribute('aria-pressed', 'false');
      root.classList.remove('ds-showtime');
      if (ac && master) {
        var now = ac.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.0001, now + .25);
        var old = nodes; nodes = [];
        setTimeout(function () { old.forEach(function (n) { try { n.stop(); } catch (e) {} }); if (master) master.gain.value = .55; }, 300);
      }
    }
    btn.addEventListener('click', function () {
      if (running) { REEL.stop(); stopAll(); return; }
      running = true;
      btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true');
      root.classList.add('ds-showtime');
      var a = audio();
      perf0 = performance.now();
      if (a) {
        if (a.state === 'suspended') a.resume();
        if (master) master.gain.value = .55;
        t0 = a.currentTime + .05;
        safe(function () { schedule(t0); });
      }
      REEL.show(clock, BEATS, function () {
        setTimeout(function () { if (running) stopAll(); }, 2500);
        running = false;
        btn.classList.remove('is-on'); btn.setAttribute('aria-pressed', 'false');
        root.classList.remove('ds-showtime');
      });
      if (typeof W.gtag === 'function') W.gtag('event', 'dale_al_show');
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
      if (h.closest('.sec--paper, .band, .reel, .phero, .sim-sum, .te')) return;
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

  /* ---------- Pantalla LED de proyectos ---------- */
  safe(function () {
    D.querySelectorAll('[data-ledwall]').forEach(function (wall) { safe(function () { ledWall(wall); }); });
  });
  function ledWall(wall) {
    var items = wall.getAttribute('data-ledwall').split(';').map(function (s2) {
      var p = s2.split('|'); return { src: p[0].trim(), cap: (p[1] || '').trim(), img: null, ok: false };
    }).filter(function (it) { return it.src; });
    if (items.length < 2) return;
    var cv = canvasIn(wall, 'ds-ledwall-cv', null);
    if (!cv) return;
    wall.classList.add('is-live');
    var cap = D.createElement('div');
    cap.className = 'ledwall-cap'; cap.setAttribute('aria-live', 'polite');
    wall.appendChild(cap);
    var pix = D.createElement('canvas'), px = pix.getContext('2d');
    var dots = null, panels = [], cols = 1, turn = 0, next = 2.2, scan = 0;
    function load(it) {
      if (it.img) return;
      it.img = new Image(); it.img.decoding = 'async';
      it.img.onload = function () { it.ok = true; };
      it.img.src = it.src;
    }
    function layout() {
      cv.fit();
      var w = cv.w, h = cv.h;
      cols = w > 900 ? 3 : w > 560 ? 2 : 1;
      var old = panels; panels = [];
      for (var i = 0; i < cols; i++) {
        var ix = old[i] ? old[i].ix : i % items.length;
        panels.push({ ix: ix, prev: -1, t: 9, x: Math.round(i * w / cols), w: Math.round((i + 1) * w / cols) - Math.round(i * w / cols) });
        load(items[ix]);
      }
      // rejilla de píxeles LED + juntas de módulos (se dibuja una vez)
      dots = D.createElement('canvas');
      dots.width = cv.c.width; dots.height = cv.c.height;
      var d = dots.getContext('2d'), pitch = 3 * DPR, cab = Math.round(64 * DPR);
      d.fillStyle = 'rgba(0,0,0,.2)';
      for (var y = 0; y < dots.height; y += pitch) d.fillRect(0, y, dots.width, Math.max(1, pitch * .34));
      for (var xx = 0; xx < dots.width; xx += pitch) d.fillRect(xx, 0, Math.max(1, pitch * .34), dots.height);
      d.fillStyle = 'rgba(0,0,0,.32)';
      for (y = cab; y < dots.height; y += cab) d.fillRect(0, y, dots.width, Math.max(1, DPR));
      for (xx = cab; xx < dots.width; xx += cab) d.fillRect(xx, 0, Math.max(1, DPR), dots.height);
      for (i = 1; i < cols; i++) { d.fillStyle = '#050506'; d.fillRect(panels[i].x * DPR - 2 * DPR, 0, 4 * DPR, dots.height); }
      setCap(panels[0].ix);
    }
    function setCap(ix) {
      var it = items[ix];
      cap.innerHTML = '<span class="mono">' + ((root.lang || '').indexOf('en') === 0 ? 'On screen' : 'En pantalla') + '</span> ' + it.cap.replace(/</g, '&lt;');
    }
    function cover(c, img, x, y, w, h) {
      var ir = img.naturalWidth / img.naturalHeight, r = w / h, sw, sh, sx, sy;
      if (ir > r) { sh = img.naturalHeight; sw = sh * r; sx = (img.naturalWidth - sw) / 2; sy = 0; }
      else { sw = img.naturalWidth; sh = sw / r; sx = 0; sy = (img.naturalHeight - sh) * .38; }
      c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    }
    function pixelated(c, img, x, y, w, h, block) {
      if (block <= 1.5) { cover(c, img, x, y, w, h); return; }
      var pw = Math.max(1, Math.round(w / block)), ph = Math.max(1, Math.round(h / block));
      pix.width = pw; pix.height = ph;
      px.imageSmoothingEnabled = true;
      cover(px, img, 0, 0, pw, ph);
      c.imageSmoothingEnabled = false;
      c.drawImage(pix, 0, 0, pw, ph, x, y, w, h);
      c.imageSmoothingEnabled = true;
    }
    layout();
    onResize(wall, layout);
    wall.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var href = wall.getAttribute('data-href');
      if (href) location.href = href;
    });
    var born = -1;
    actor(function (t, dt) {
      if (born < 0) born = t;
      var x = cv.x, w = cv.w, h = cv.h, i, p;
      next -= dt;
      if (next <= 0) {
        p = panels[turn % panels.length]; turn++;
        var ni = p.ix;
        for (var tries = 0; tries < items.length; tries++) {
          ni = (ni + cols) % items.length;
          var used = panels.some(function (q) { return q !== p && q.ix === ni; });
          if (!used) break;
        }
        load(items[ni]);
        if (items[ni].ok) { p.prev = p.ix; p.ix = ni; p.t = 0; setCap(ni); load(items[(ni + cols) % items.length]); }
        next = cols === 1 ? 3.2 : 2.1;
      }
      x.fillStyle = '#050506'; x.fillRect(0, 0, w, h);
      for (i = 0; i < panels.length; i++) {
        p = panels[i]; p.t += dt;
        var it = items[p.ix], pv = p.prev >= 0 ? items[p.prev] : null, T = .9;
        if (p.t < T && pv && pv.ok) {
          var k = p.t / T;
          if (k < .5) pixelated(x, pv.img, p.x, 0, p.w, h, 1 + Math.pow(k * 2, 2) * 46);
          else if (it.ok) pixelated(x, it.img, p.x, 0, p.w, h, 1 + Math.pow((1 - k) * 2, 2) * 46);
          var fl = 1 - Math.abs(k - .5) * 2;
          x.fillStyle = 'rgba(255,226,170,' + .18 * fl + ')'; x.fillRect(p.x, 0, p.w, h);
        } else if (it.ok) cover(x, it.img, p.x, 0, p.w, h);
        else { x.fillStyle = '#0d0d0f'; x.fillRect(p.x, 0, p.w, h); }
      }
      // brillo del panel y barrido de refresco
      scan = (scan + dt * .35) % 1.4;
      var sy = (scan - .2) * h, sg = x.createLinearGradient(0, sy - 60, 0, sy + 60);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,248,232,.07)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = sg; x.fillRect(0, sy - 60, w, 120);
      if (dots) x.drawImage(dots, 0, 0, w, h);
      var on = clamp((t - born) / 1.2, 0, 1);
      if (on < 1) { x.fillStyle = 'rgba(5,5,6,' + (1 - on) + ')'; x.fillRect(0, 0, w, h); }
      return false;
    }, wall);
  }

  /* ---------- Mapa de España iluminado ---------- */
  safe(function () {
    var map = D.querySelector('.esp-map svg.map');
    if (!map) return;
    var NS = 'http://www.w3.org/2000/svg';
    var base = map.querySelector('.m-base');
    if (!base) return;
    var bx0 = +base.getAttribute('cx'), by0 = +base.getAttribute('cy');
    var arcs = Array.prototype.slice.call(map.querySelectorAll('.m-arc'));
    var cities = Array.prototype.slice.call(map.querySelectorAll('.m-dot, .m-hab'));
    var defs = map.querySelector('defs') || map.insertBefore(D.createElementNS(NS, 'defs'), map.firstChild);
    defs.insertAdjacentHTML('beforeend',
      '<filter id="dsglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<radialGradient id="dsbeacon"><stop offset="0" stop-color="#fff4dc" stop-opacity=".9"/><stop offset=".35" stop-color="#e8cd97" stop-opacity=".35"/><stop offset="1" stop-color="#c9a66b" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="dscone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffeccb" stop-opacity=".42"/><stop offset="1" stop-color="#ffeccb" stop-opacity="0"/></linearGradient>');
    map.classList.add('ds-map');
    // haz giratorio desde la base (como un faro)
    var cone = D.createElementNS(NS, 'path');
    cone.setAttribute('class', 'm-cone'); cone.setAttribute('fill', 'url(#dscone)');
    cone.setAttribute('d', 'M' + bx0 + ' ' + by0 + ' L' + (bx0 + 760) + ' ' + (by0 - 70) + ' L' + (bx0 + 760) + ' ' + (by0 + 70) + ' Z');
    var landG = map.querySelector('.m-arcs');
    var clip = D.createElementNS(NS, 'clipPath');
    clip.setAttribute('id', 'dsland');
    Array.prototype.forEach.call(map.querySelectorAll('.m-land'), function (l) { var c2 = D.createElementNS(NS, 'path'); c2.setAttribute('d', l.getAttribute('d')); clip.appendChild(c2); });
    defs.appendChild(clip);
    var coneG = D.createElementNS(NS, 'g');
    coneG.setAttribute('clip-path', 'url(#dsland)');
    coneG.appendChild(cone);
    map.insertBefore(coneG, landG);
    var layer = D.createElementNS(NS, 'g');
    layer.setAttribute('class', 'm-fx'); layer.setAttribute('filter', 'url(#dsglow)');
    map.appendChild(layer);
    var halos = cities.map(function (c) {
      var hh = D.createElementNS(NS, 'circle');
      hh.setAttribute('cx', c.getAttribute('cx')); hh.setAttribute('cy', c.getAttribute('cy'));
      hh.setAttribute('r', '0'); hh.setAttribute('fill', 'url(#dsbeacon)');
      layer.appendChild(hh);
      return { el: hh, c: c, x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), v: 0 };
    });
    // etiqueta al pasar / tocar
    var tip = D.createElementNS(NS, 'text');
    tip.setAttribute('class', 'm-tip'); map.appendChild(tip);
    cities.forEach(function (c) {
      var name = (c.querySelector('title') || {}).textContent || '';
      c.style.cursor = 'pointer';
      var show = function () {
        tip.textContent = name.toUpperCase();
        tip.setAttribute('x', +c.getAttribute('cx') + 8); tip.setAttribute('y', +c.getAttribute('cy') - 8);
        tip.classList.add('on');
        halos.forEach(function (h2) { if (h2.c === c) h2.v = 1.4; });
      };
      c.addEventListener('pointerenter', show); c.addEventListener('click', show);
      c.addEventListener('pointerleave', function () { tip.classList.remove('on'); });
    });
    var comets = [];
    for (var i = 0; i < (small ? 5 : 9); i++) {
      var cm = D.createElementNS(NS, 'circle');
      cm.setAttribute('r', '2.6'); cm.setAttribute('class', 'm-comet');
      var tail = D.createElementNS(NS, 'path');
      tail.setAttribute('class', 'm-tail');
      layer.appendChild(tail); layer.appendChild(cm);
      comets.push({ el: cm, tail: tail, arc: null, len: 0, p: 1 + Math.random(), sp: 0, wait: Math.random() * 2.5, trail: [] });
    }
    var started = false, ang = -2.6;
    var host = map.closest('.esp-map');
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) started = true; }, { threshold: .3 }).observe(host);
    actor(function (t, dt) {
      if (!started) return false;
      // faro
      ang += dt * .55;
      var deg = ang * 180 / Math.PI;
      cone.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ' ' + bx0 + ' ' + by0 + ')');
      halos.forEach(function (h2) {
        var a = Math.atan2(h2.y - by0, h2.x - bx0), dA = Math.atan2(Math.sin(a - ang), Math.cos(a - ang));
        if (Math.abs(dA) < .09) h2.v = Math.max(h2.v, 1);
        h2.v = Math.max(0, h2.v - dt * .9);
        h2.el.setAttribute('r', (h2.v * 16).toFixed(1));
        h2.c.style.opacity = h2.v > .05 ? 1 : '';
      });
      // cometas Barcelona → ciudades
      comets.forEach(function (c) {
        if (c.wait > 0) { c.wait -= dt; return; }
        if (!c.arc || c.p >= 1) {
          if (c.arc) { var dest = halos[arcs.indexOf(c.arc)] ; if (dest) dest.v = 1.5; c.wait = rand(.2, 1.4); c.arc = null; c.el.setAttribute('opacity', '0'); c.tail.setAttribute('d', ''); return; }
          c.arc = arcs[(Math.random() * arcs.length) | 0];
          c.len = c.arc.getTotalLength(); c.p = 0; c.sp = 260 / Math.max(80, c.len) * rand(.7, 1.1); c.trail = [];
        }
        c.p = Math.min(1, c.p + dt * c.sp);
        var e = c.p < .5 ? 2 * c.p * c.p : 1 - Math.pow(-2 * c.p + 2, 2) / 2;
        var pt = c.arc.getPointAtLength(e * c.len);
        c.el.setAttribute('cx', pt.x.toFixed(1)); c.el.setAttribute('cy', pt.y.toFixed(1)); c.el.setAttribute('opacity', '1');
        c.trail.push(pt.x.toFixed(1) + ' ' + pt.y.toFixed(1)); if (c.trail.length > 10) c.trail.shift();
        c.tail.setAttribute('d', 'M' + c.trail.join(' L'));
      });
      return false;
    }, host);
  });

  /* ---------- Contadores: dígitos que se encienden ---------- */
  safe(function () {
    var facts = D.querySelectorAll('.fact');
    if (!facts.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.classList.add('ds-count-on');
        var n = e.target.querySelector('[data-count]');
        setTimeout(function () { e.target.classList.add('ds-count-hit'); }, n ? 1400 : 300);
      });
    }, { threshold: .5 });
    facts.forEach(function (f, i) {
      f.style.setProperty('--fi', i);
      var bar = D.createElement('i'); bar.className = 'ds-fact-bar'; bar.setAttribute('aria-hidden', 'true');
      f.appendChild(bar);
      io.observe(f);
    });
  });
})();
