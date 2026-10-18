/* =====================================================================
   DREAMSCAPE EVENTS — montaje en 3D (ds-3d.js) · 2026-10
   Dibuja en 3D (canvas 2D, sin librerías) el montaje de un evento:
   escenario, truss, sonido, cabezas móviles con haces, pantalla LED,
   mesa de control y público. Lo usan el simulador y la sección
   "Tu evento en 10 segundos" de la portada.
   ===================================================================== */
(function () {
  'use strict';
  var D = document, W = window;
  var reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EN = (D.documentElement.lang || '').indexOf('en') === 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(dt, r) { return 1 - Math.exp(-dt * r); }
  function rnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }

  /* ---------- Recomendación técnica orientativa ---------- */
  var KW = { sonido: 4.5, luz: 5, video: 6.5, rigging: 0 };
  function recommend(tipo, guests) {
    var g = guests;
    var r = { tipo: tipo, guests: g, sound: true, light: true, rigging: g >= 120 || tipo === 'concierto', led: tipo === 'congreso' || tipo === 'empresa' && g >= 80 || tipo === 'concierto' && g >= 300, stage: 1, outdoor: false };
    if (tipo === 'boda') { r.stage = g >= 250 ? 1 : 0; r.led = g >= 300; }
    if (tipo === 'concierto') r.stage = 2;
    if (tipo === 'congreso') r.stage = g >= 150 ? 2 : 1;
    if (tipo === 'empresa') r.stage = g >= 200 ? 2 : 1;
    var kw = 2 + KW.sonido + KW.luz + (r.led ? KW.video : 0);
    r.kw = kw;
    var spk = g < 120 ? (EN ? '2 full-range speakers + 1 sub' : '2 cajas full-range + 1 subgrave')
      : g < 400 ? (EN ? 'Stereo PA with 2 subs' : 'PA estéreo con 2 subgraves')
      : (EN ? 'Line array with ' + Math.min(8, 4 + Math.round(g / 400)) + ' boxes per side + subs' : 'Line array de ' + Math.min(8, 4 + Math.round(g / 400)) + ' cajas por lado + subgraves');
    var mics = tipo === 'congreso' ? (EN ? 'lectern mic + 2 headsets' : 'micro de atril + 2 diademas')
      : tipo === 'boda' ? (EN ? '2 wireless mics for speeches' : '2 micros inalámbricos para discursos')
      : tipo === 'concierto' ? (EN ? 'band mics and monitors' : 'microfonía y monitores para la banda')
      : (EN ? '2 wireless mics' : '2 micros inalámbricos');
    var heads = Math.max(4, Math.min(12, Math.round(g / 60) * 2));
    var stageTxt = r.stage === 0 ? (EN ? 'No stage — dance floor area' : 'Sin tarima, zona de pista')
      : r.stage === 1 ? (EN ? 'Low riser 20–40 cm' : 'Tarima baja de 20–40 cm')
      : (EN ? 'Stage 60 cm or higher' : 'Escenario de 60 cm o más');
    var w = Math.round(clamp(3 + g / 120, 4, 12)), d = Math.round(clamp(2.5 + g / 400, 2.5, 6) * 2) / 2;
    r.list = [
      [EN ? 'Sound' : 'Sonido', spk + ' · ' + mics],
      [EN ? 'Lighting' : 'Iluminación', heads + (EN ? ' moving heads' : ' cabezas móviles') + (tipo === 'boda' ? (EN ? ' + warm uplighting' : ' + ambiente cálido') : ' + wash')],
      [EN ? 'Stage' : 'Escenario', stageTxt + (r.stage ? ' · ' + w + '×' + d + ' m' : '')],
      [EN ? 'Structures' : 'Estructuras', r.rigging ? (EN ? 'Goalpost truss' : 'Truss en pórtico') : (EN ? 'Stands' : 'Trípodes y peanas')],
      [EN ? 'Video' : 'Vídeo', r.led ? (EN ? 'LED screen behind the stage' : 'Pantalla LED tras el escenario') : (EN ? 'Not needed' : 'No necesaria')],
      [EN ? 'Power' : 'Potencia', '~' + String(kw).replace('.', EN ? '.' : ',') + ' kW' + (kw > 9 ? (EN ? ' · three-phase' : ' · trifásica') : '')]
    ];
    return r;
  }

  /* ---------- Motor 3D mínimo ---------- */
  function Stage3D(canvas, opt) {
    opt = opt || {};
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var DPR = Math.min(W.devicePixelRatio || 1, 2);
    var Wd = 1, Hd = 1, F = 1, R = 18, offY = 0, yaw = -.5, pitch = .46, T = { x: 0, y: 1.2, z: 2 };
    var userYaw = 0, drag = null, idle = 0;
    var cfg = { tipo: 'empresa', guests: 150, sound: true, light: true, rigging: true, led: false, stage: 1, outdoor: false };
    var G = { floor: { a: 0, t: 1 }, stage: { a: 0, t: 0 }, truss: { a: 0, t: 0 }, sound: { a: 0, t: 0 }, light: { a: 0, t: 0 }, led: { a: 0, t: 0 }, crowd: { a: 0, t: 0 }, foh: { a: 0, t: 0 }, beams: { a: 0, t: 0 } };
    var geo = null, running = false, visible = true, raf = 0, last = 0, clock = 0, flash = 0;

    function fit() {
      var r = canvas.getBoundingClientRect();
      Wd = Math.max(1, r.width); Hd = Math.max(1, r.height);
      canvas.width = Math.round(Wd * DPR); canvas.height = Math.round(Hd * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      F = Math.min(Wd * 1.1, Hd * 1.75);
    }

    function build() {
      var g = cfg.guests, tipo = cfg.tipo;
      var sw = clamp(3 + g / 120, 4, 12), sd = clamp(2.5 + g / 400, 2.5, 6);
      var sh = cfg.stage === 2 ? .9 : cfg.stage === 1 ? .35 : .03;
      var aw = clamp(Math.sqrt(g) * 1.05, 7, 26), ad = clamp(Math.sqrt(g) * .95, 6, 24), az = 2.2;
      var people = [], tables = [], rand = rnd(g * 7 + tipo.length * 131);
      var maxP = 420, k;
      if (tipo === 'boda' || tipo === 'empresa') {
        var nt = Math.ceil(g / 10), cols = Math.max(2, Math.round(Math.sqrt(nt * aw / ad))), rows = Math.ceil(nt / cols);
        var gx = aw / cols, gz = ad / rows, per = Math.max(1, Math.round(10 * Math.min(1, maxP / g)));
        for (k = 0; k < nt; k++) {
          var c = k % cols, rr = Math.floor(k / cols);
          var tx = -aw / 2 + gx * (c + .5) + (rr % 2 ? gx * .18 : 0), tz = az + gz * (rr + .5);
          if (tipo === 'boda' && rr === 0 && Math.abs(tx) < sw * .35) continue; // pista de baile
          tables.push({ x: tx, z: tz, r: Math.min(.85, gx * .32, gz * .32) });
          for (var p = 0; p < per; p++) {
            var an = p / per * Math.PI * 2 + rand() * .2, rad = Math.min(.85, gx * .32, gz * .32) + .32;
            people.push({ x: tx + Math.cos(an) * rad, z: tz + Math.sin(an) * rad, y: 1.15, s: rand() });
          }
        }
      } else if (tipo === 'congreso') {
        var spacing = .85, pr = Math.max(4, Math.floor(aw / spacing)), nRows = Math.ceil(Math.min(g, maxP) / pr);
        for (k = 0; k < Math.min(g, maxP); k++) {
          var cc = k % pr, r2 = Math.floor(k / pr), x2 = -aw / 2 + spacing * (cc + .5);
          if (Math.abs(x2) < .6) continue; // pasillo
          people.push({ x: x2, z: az + .4 + r2 * (ad / Math.max(nRows, 1)), y: 1.2, s: rand() });
        }
      } else {
        var n2 = Math.min(g, maxP);
        for (k = 0; k < n2; k++) {
          var zz = az + Math.pow(rand(), 1.6) * ad, xw = aw * (.55 + .45 * (zz - az) / ad);
          people.push({ x: (rand() - .5) * xw, z: zz, y: 1.65, s: rand() });
        }
      }
      people.sort(function (a, b) { return a.s - b.s; });
      var nh = clamp(Math.round(sw / 1.6) + 1, 4, 9), heads = [];
      for (k = 0; k < nh; k++) heads.push({ x: -sw / 2 + .5 + (sw - 1) * k / (nh - 1), ph: k * .9 });
      geo = { sw: sw, sd: sd, sh: sh, aw: aw, ad: ad, az: az, people: people, tables: tables, heads: heads, th: 5.2 };
      T = { x: 0, y: 1.1, z: (az + ad - sd) * .45 };
      autofit();
    }
    /* encuadre automático: aleja la cámara hasta que todo el montaje quepa */
    function autofit() {
      if (!geo) return;
      var g = geo, keepYaw = yaw, keepU = userYaw;
      var pts = [], mh = cfg.rigging ? g.th + .3 : (cfg.light || cfg.sound) ? 3.2 : 1.8;
      [-1, 1].forEach(function (sx) {
        pts.push([sx * (g.sw / 2 + 1.6), 0, -g.sd - .4], [sx * (g.sw / 2 + 1.6), mh, -g.sd - .4]);
        pts.push([sx * (g.aw / 2 + .5), 0, g.az + g.ad + .3], [sx * (g.aw / 2 + .5), 1.8, g.az + g.ad + .3]);
      });
      R = Math.max(g.sw, g.aw) * .3 + 4; userYaw = 0; offY = 0;
      for (var i = 0; i < 60; i++) {
        var ok = true;
        [-.78, -.5, -.22].forEach(function (yv) {
          yaw = yv;
          var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
          pts.forEach(function (p) { var q = P(p[0], p[1], p[2]); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
          if (x0 < Wd * .03 || x1 > Wd * .97 || y1 - y0 > Hd * .8) ok = false;
        });
        if (ok) break;
        R *= 1.04;
      }
      yaw = -.5;
      var mn = 1e9, mx = -1e9;
      pts.forEach(function (p) { var s2 = P(p[0], p[1], p[2]); mn = Math.min(mn, s2.y); mx = Math.max(mx, s2.y); });
      offY = Hd * .52 - (mn + mx) / 2;
      yaw = keepYaw; userYaw = keepU;
    }

    function apply() {
      G.stage.t = 1;
      G.truss.t = cfg.rigging ? 1 : 0;
      G.sound.t = cfg.sound ? 1 : 0;
      G.light.t = cfg.light ? 1 : 0;
      G.beams.t = cfg.light ? 1 : 0;
      G.led.t = cfg.led ? 1 : 0;
      G.crowd.t = 1; G.foh.t = cfg.sound || cfg.light ? 1 : 0;
    }

    /* proyección: mundo (m) → pantalla */
    function P(x, y, z) {
      var dx = x - T.x, dy = y - T.y, dz = z - T.z, cy = Math.cos(yaw + userYaw), sy = Math.sin(yaw + userYaw);
      var x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var y2 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
      var dep = Math.max(.5, R - z2);
      return { x: Wd / 2 + x1 * F / dep, y: Hd * .5 + offY - y2 * F / dep, d: dep, k: F / dep };
    }

    var items = [];
    function add(d, fn) { items.push({ d: d, fn: fn }); }
    function rgb(c, m, a) { return 'rgba(' + (c[0] * m | 0) + ',' + (c[1] * m | 0) + ',' + (c[2] * m | 0) + ',' + (a == null ? 1 : a) + ')'; }
    function poly(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); }
    function box(x0, y0, z0, x1, y1, z1, col, o) {
      o = o || {};
      var c = [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)];
      var faces = [[4, 5, 6, 7, 1], [3, 2, 6, 7, .78], [0, 1, 5, 4, .5], [0, 3, 7, 4, .64], [1, 2, 6, 5, .64], [0, 1, 2, 3, .3]];
      faces.forEach(function (f, fi) {
        var pts = [c[f[0]], c[f[1]], c[f[2]], c[f[3]]];
        var cr = (pts[1].x - pts[0].x) * (pts[2].y - pts[0].y) - (pts[1].y - pts[0].y) * (pts[2].x - pts[0].x);
        if (fi === 0 ? cr > 0 : fi === 5 ? cr < 0 : false) return;
        var dd = (pts[0].d + pts[1].d + pts[2].d + pts[3].d) / 4;
        add(dd + (o.bias || 0), function () {
          poly(pts);
          ctx.fillStyle = rgb(col, f[4], o.alpha);
          ctx.fill();
          if (o.edge) { ctx.strokeStyle = o.edge; ctx.lineWidth = .7; ctx.stroke(); }
          if (o.face && fi === 1) o.face(pts);
        });
      });
    }
    function line(a, b, col, w, dBias) {
      var pa = P(a[0], a[1], a[2]), pb = P(b[0], b[1], b[2]);
      add((pa.d + pb.d) / 2 + (dBias || 0), function () { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); });
    }

    var GOLD = [201, 166, 107], DARK = [30, 29, 34], STEEL = [150, 136, 110], CLOTH = [222, 216, 202];

    function scene(t) {
      items = [];
      var g = geo, a, k;
      // suelo
      a = G.floor.a;
      var fl = [P(-g.aw / 2 - 3, 0, -g.sd - 2), P(g.aw / 2 + 3, 0, -g.sd - 2), P(g.aw / 2 + 3, 0, g.az + g.ad + 2), P(-g.aw / 2 - 3, 0, g.az + g.ad + 2)];
      ctx.globalAlpha = a;
      poly(fl);
      ctx.fillStyle = cfg.outdoor ? '#0e1410' : '#121215';
      ctx.fill();
      ctx.strokeStyle = 'rgba(201,166,107,.09)'; ctx.lineWidth = .6;
      ctx.beginPath();
      for (var gx = -Math.ceil(g.aw / 2 + 3); gx <= g.aw / 2 + 3; gx += 1) { var p1 = P(gx, 0, -g.sd - 2), p2 = P(gx, 0, g.az + g.ad + 2); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
      for (var gz = -Math.ceil(g.sd + 2); gz <= g.az + g.ad + 2; gz += 1) { var p3 = P(-g.aw / 2 - 3, 0, gz), p4 = P(g.aw / 2 + 3, 0, gz); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // escenario
      a = G.stage.a;
      if (a > .01) {
        var sh = Math.max(.02, g.sh * a);
        box(-g.sw / 2, 0, -g.sd, g.sw / 2, sh, 0, g.sh < .05 ? [40, 36, 30] : DARK, { edge: 'rgba(201,166,107,' + .55 * a + ')', alpha: a });
        if (g.sh >= .05) line([-g.sw / 2, sh, 0], [g.sw / 2, sh, 0], 'rgba(232,205,151,' + .9 * a + ')', 1.4, -.05);
      }
      var top = g.sh;
      // truss en pórtico
      a = G.truss.a;
      var tx = g.sw / 2 + .45, tz = -g.sd + .35, th = g.th * a;
      if (a > .01) {
        [-1, 1].forEach(function (s) {
          box(s * tx - .17, 0, tz - .17, s * tx + .17, th, tz + .17, STEEL, { edge: 'rgba(232,205,151,.35)', alpha: a });
        });
        if (a > .6) {
          var ta = (a - .6) / .4;
          box(-tx - .17, g.th - .34, tz - .17, -tx + (2 * tx) * ta + .17, g.th, tz + .17, STEEL, { edge: 'rgba(232,205,151,.35)' });
          for (k = 0; k < 2 * tx * ta; k += .5) line([-tx + k, g.th - .34, tz + .18], [-tx + k + .25, g.th, tz + .18], 'rgba(232,205,151,.5)', .6, -.1);
        }
      }
      // pantalla LED
      a = G.led.a;
      if (a > .01) {
        var lw = g.sw * .38, lh = lw * 2 * 9 / 16 * a, ly = top + .5, lz = -g.sd + .05;
        box(-lw, ly, lz - .12, lw, ly + lh, lz, [12, 12, 14], { bias: .02, face: function (pts) {
          var gr = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[1].x, pts[1].y), h = (t * 40) % 360;
          gr.addColorStop(0, 'hsla(' + h + ',70%,55%,.9)'); gr.addColorStop(.5, 'hsla(' + (h + 60) % 360 + ',80%,60%,.9)'); gr.addColorStop(1, 'hsla(' + (h + 140) % 360 + ',70%,50%,.9)');
          poly(pts); ctx.fillStyle = gr; ctx.globalAlpha = .85 * a; ctx.fill();
          // logo de luz en el centro
          var cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4, cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4;
          var rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.abs(pts[1].x - pts[0].x) * .3);
          rg.addColorStop(0, 'rgba(255,248,232,.85)'); rg.addColorStop(1, 'rgba(255,248,232,0)');
          ctx.fillStyle = rg; ctx.fill();
          ctx.globalAlpha = .35 * a; ctx.strokeStyle = '#000'; ctx.lineWidth = .5; ctx.beginPath();
          for (var i = 1; i < 12; i++) { var u = i / 12; ctx.moveTo(lerp(pts[3].x, pts[2].x, u), lerp(pts[3].y, pts[2].y, u)); ctx.lineTo(lerp(pts[0].x, pts[1].x, u), lerp(pts[0].y, pts[1].y, u)); }
          for (i = 1; i < 7; i++) { var v = i / 7; ctx.moveTo(lerp(pts[3].x, pts[0].x, v), lerp(pts[3].y, pts[0].y, v)); ctx.lineTo(lerp(pts[2].x, pts[1].x, v), lerp(pts[2].y, pts[1].y, v)); }
          ctx.stroke(); ctx.globalAlpha = 1;
        } });
      }
      // sonido
      a = G.sound.a;
      if (a > .01) {
        var spx = g.sw / 2 + 1.1, hung = G.truss.a > .9;
        [-1, 1].forEach(function (s) {
          box(s * spx - .4, 0, -.2, s * spx + .4, .6 * a, .4, [22, 22, 25], { edge: 'rgba(201,166,107,.3)' });
          if (hung) {
            var nb = Math.min(8, 3 + Math.round(cfg.guests / 300));
            for (var b = 0; b < Math.round(nb * a); b++) {
              var y0 = g.th - .6 - b * .3, zoff = b * b * .012;
              box(s * spx - .38, y0 - .26, -.25 + zoff, s * spx + .38, y0, .2 + zoff, [26, 26, 29], { edge: 'rgba(201,166,107,.35)' });
            }
            line([s * spx, g.th - .34, 0], [s * spx, g.th - .6, 0], 'rgba(201,166,107,.6)', .8);
          } else {
            line([s * spx, .6, .1], [s * spx, 1.6 * a + .6, .1], 'rgba(160,150,130,.8)', 1.2);
            box(s * spx - .3, .6 + 1.6 * a, -.15, s * spx + .3, 1.4 + 1.6 * a, .3, [26, 26, 29], { edge: 'rgba(201,166,107,.4)' });
          }
        });
      }
      // mesa de control (FOH) con técnico
      a = G.foh.a;
      if (a > .01) {
        var fz = g.az + g.ad * .78, fx = g.aw * .18;
        box(fx - .9, 0, fz - .4, fx + .9, .95 * a, fz + .4, [24, 24, 28], { edge: 'rgba(201,166,107,.45)', face: function (pts) {
          ctx.fillStyle = 'rgba(120,200,255,.8)';
          for (var i = 0; i < 6; i++) { var u = (i + .5) / 6; ctx.fillRect(lerp(pts[3].x, pts[2].x, u) - 1, lerp(pts[3].y, pts[2].y, u) + 2, 2, 2); }
        } });
        var tech = P(fx, 1.55 * a, fz + .8);
        add(tech.d, function () { ctx.fillStyle = 'rgba(232,205,151,.95)'; ctx.beginPath(); ctx.arc(tech.x, tech.y, Math.max(1.6, .17 * tech.k), 0, Math.PI * 2); ctx.fill(); });
      }
      // focos (cabezas)
      a = G.light.a;
      var fixtures = [];
      if (a > .01) {
        var onTruss = G.truss.a > .9;
        g.heads.forEach(function (h, i) {
          var hx = onTruss ? h.x : (i % 2 ? 1 : -1) * (g.sw / 2 + .2), hy = onTruss ? g.th - .5 : 2.4, hz = onTruss ? tz + .3 : -.4;
          if (!onTruss && i > 3) return;
          if (!onTruss && i < 4) { hx = (i < 2 ? -1 : 1) * (g.sw / 2 + .25 + (i % 2) * .5); line([hx, 0, hz], [hx, 2.3, hz], 'rgba(160,150,130,.7)', 1); }
          box(hx - .16, hy - .3, hz - .16, hx + .16, hy, hz + .16, [18, 18, 20], { edge: 'rgba(232,205,151,.5)', alpha: a });
          fixtures.push({ x: hx, y: hy - .3, z: hz, ph: h.ph });
        });
        // luz ambiente (uplights) en bodas y galas
        if (cfg.tipo === 'boda') for (k = 0; k < 6; k++) {
          var ux = -g.aw / 2 - 1 + (g.aw + 2) * k / 5, up = P(ux, .1, -g.sd - 1.2);
          (function (up) { add(up.d + 50, function () { var r = 2.4 * up.k; var rg = ctx.createRadialGradient(up.x, up.y, 0, up.x, up.y, r); rg.addColorStop(0, 'rgba(255,170,90,' + .35 * a + ')'); rg.addColorStop(1, 'rgba(255,170,90,0)'); ctx.fillStyle = rg; ctx.fillRect(up.x - r, up.y - r * 2, r * 2, r * 2); }); })(up);
        }
      }
      // mesas y público
      a = G.crowd.a;
      if (a > .01) {
        g.tables.forEach(function (tb, i) {
          if (i / g.tables.length > a) return;
          var c0 = P(tb.x, .75, tb.z), pts = [];
          for (var q = 0; q < 14; q++) { var an = q / 14 * Math.PI * 2; pts.push(P(tb.x + Math.cos(an) * tb.r, .75, tb.z + Math.sin(an) * tb.r)); }
          add(c0.d + .05, function () { poly(pts); ctx.fillStyle = rgb(CLOTH, .55); ctx.fill(); ctx.strokeStyle = 'rgba(201,166,107,.35)'; ctx.lineWidth = .5; ctx.stroke(); });
        });
        var np = Math.floor(g.people.length * a), bob = cfg.tipo === 'concierto' ? 1 : 0;
        for (k = 0; k < np; k++) {
          (function (pp) {
            var yb = pp.y + bob * Math.max(0, Math.sin(t * 8.1 + pp.s * 20)) * .12;
            var hp = P(pp.x, yb, pp.z), bp = P(pp.x, yb - .55, pp.z);
            add(hp.d, function () {
              var r = Math.max(1.1, .14 * hp.k);
              ctx.strokeStyle = 'rgba(60,58,64,.95)'; ctx.lineWidth = Math.max(1.4, r * 1.3); ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.lineTo(hp.x, hp.y + r); ctx.stroke();
              ctx.fillStyle = 'rgba(' + (190 + pp.s * 50 | 0) + ',' + (175 + pp.s * 40 | 0) + ',' + (150 + pp.s * 30 | 0) + ',.9)';
              ctx.beginPath(); ctx.arc(hp.x, hp.y, r, 0, Math.PI * 2); ctx.fill();
            });
          })(g.people[k]);
        }
      }

      items.sort(function (p, q) { return q.d - p.d; });
      for (k = 0; k < items.length; k++) items[k].fn();

      // haces de luz (aditivos, al final)
      a = G.beams.a * G.light.a;
      if (a > .02 && fixtures.length) {
        ctx.globalCompositeOperation = 'lighter';
        var warm = cfg.tipo === 'boda', vivid = cfg.tipo === 'concierto';
        fixtures.forEach(function (f, i) {
          var sw2 = Math.sin(t * (vivid ? 1.4 : .7) + f.ph), tgx = f.x + sw2 * 3.2, tgz = g.az + 1.5 + (Math.cos(t * .5 + f.ph) * .5 + .5) * g.ad * .6;
          var hue = warm ? '255,190,120' : vivid ? ['255,90,160', '120,170,255', '255,200,90'][i % 3] : (i % 2 ? '235,242,255' : '255,226,170');
          var src = P(f.x, f.y, f.z), rad = .9, l = P(tgx - rad, 0, tgz), r2 = P(tgx + rad, 0, tgz), c = P(tgx, 0, tgz);
          var gr = ctx.createLinearGradient(src.x, src.y, c.x, c.y);
          gr.addColorStop(0, 'rgba(' + hue + ',' + .55 * a + ')'); gr.addColorStop(1, 'rgba(' + hue + ',' + .06 * a + ')');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(l.x, l.y); ctx.lineTo(r2.x, r2.y); ctx.closePath(); ctx.fill();
          var pr = Math.max(4, Math.abs(r2.x - l.x) * .7);
          var pg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, pr);
          pg.addColorStop(0, 'rgba(' + hue + ',' + .4 * a + ')'); pg.addColorStop(1, 'rgba(' + hue + ',0)');
          ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(c.x, c.y, pr, pr * .4, 0, 0, Math.PI * 2); ctx.fill();
          var lg = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 10);
          lg.addColorStop(0, 'rgba(255,250,240,' + .9 * a + ')'); lg.addColorStop(1, 'rgba(255,250,240,0)');
          ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(src.x, src.y, 10, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
      }
      if (flash > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,244,224,' + .25 * flash + ')'; ctx.fillRect(0, 0, Wd, Hd);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    function frame(now) {
      raf = 0;
      var dt = clamp((now - last) / 1000, 0, .05); last = now; clock += dt;
      for (var key in G) G[key].a += (G[key].t - G[key].a) * (reduce ? 1 : ease(dt, 4.5));
      if (!drag) { idle += dt; yaw = -.5 + Math.sin(clock * .18) * .28; }
      flash = Math.max(0, flash - dt * 1.8);
      ctx.clearRect(0, 0, Wd, Hd);
      if (cfg.outdoor) { // cielo con estrellas
        var rs = rnd(99);
        ctx.fillStyle = 'rgba(255,244,220,.6)';
        for (var i = 0; i < 60; i++) ctx.fillRect(rs() * Wd, rs() * Hd * .4, 1.2, 1.2);
      }
      try { scene(reduce ? 0 : clock); } catch (e) { /* nunca romper */ }
      if (running && visible && !D.hidden && !reduce) raf = requestAnimationFrame(frame);
    }
    function start() { if (!raf && visible && !D.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    // arrastrar para girar
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y0: userYaw }; try { canvas.setPointerCapture(e.pointerId); } catch (er) {} });
    canvas.addEventListener('pointermove', function (e) { if (drag) { userYaw = drag.y0 + (e.clientX - drag.x) / Math.max(200, Wd) * 2.2; start(); } });
    var up = function () { drag = null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

    fit(); build(); apply();
    if (W.ResizeObserver) new ResizeObserver(function () { fit(); autofit(); start(); }).observe(canvas);
    if (W.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(canvas);
    D.addEventListener('visibilitychange', start);
    running = true; start();

    return {
      set: function (c, instant) {
        for (var k in c) cfg[k] = c[k];
        build(); apply();
        if (instant) for (var key in G) G[key].a = G[key].t;
        start();
      },
      hideAll: function () { for (var key in G) { if (key !== 'floor') { G[key].t = 0; G[key].a = 0; } } start(); },
      reveal: function (name) {
        var ok = { stage: 1, truss: cfg.rigging, sound: cfg.sound, light: cfg.light, beams: cfg.light, led: cfg.led, crowd: 1, foh: cfg.sound || cfg.light };
        if (G[name] && ok[name]) G[name].t = 1;
        start();
      },
      flash: function () { if (!reduce) flash = 1; start(); },
      redraw: start
    };
  }

  W.DS3D = { Stage3D: Stage3D, recommend: recommend };

  /* =====================================================================
     A) Simulador: el montaje se dibuja en 3D según lo que eliges
     ===================================================================== */
  (function () {
    var f = D.getElementById('sim-form');
    if (!f) return;
    // preselección desde "Tu evento en 10 segundos"
    try {
      var q = new URLSearchParams(location.search), tp = q.get('tipo'), as = q.get('asistentes');
      var map = { boda: 'Boda / Gala', empresa: 'Corporativo', congreso: 'Congreso', concierto: 'Concierto' };
      if (tp && map[tp]) { var rd = f.querySelector('input[name="tipo"][value="' + map[tp] + '"]'); if (rd) rd.checked = true; }
      if (as) { var at = D.getElementById('attendees'); if (at) { at.value = clamp(parseInt(as, 10) || 150, 20, 2000); } }
      if (tp || as) {
        var rec = recommend(tp && map[tp] ? tp : 'empresa', parseInt(as, 10) || 150);
        [['sonido', rec.sound], ['luz', rec.light], ['rigging', rec.rigging], ['video', rec.led]].forEach(function (pr) {
          var cb = f.querySelector('input[name="rider"][value="' + pr[0] + '"]'); if (cb) cb.checked = !!pr[1];
        });
        var esc = ['Sin tarima', 'Tarima a 20-40 cm', 'Escenario a 60 cm o más'][rec.stage];
        var re = f.querySelector('input[name="escenario"][value="' + esc + '"]'); if (re) re.checked = true;
        f.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } catch (e) {}

    var aside = f.querySelector('.sim-sum > div');
    if (!aside) return;
    var box = D.createElement('div');
    box.className = 'sim3d';
    box.innerHTML = '<canvas aria-hidden="true"></canvas><span class="sim3d-tag mono">' + (EN ? 'Your setup in 3D · drag to rotate' : 'Tu montaje en 3D · arrastra para girar') + '</span>';
    var h2 = aside.querySelector('h2');
    aside.insertBefore(box, h2 ? h2.nextSibling : aside.firstChild);
    var st = Stage3D(box.querySelector('canvas'));
    if (!st) { box.remove(); return; }
    function read() {
      var tipo = (f.querySelector('input[name="tipo"]:checked') || {}).value || '';
      var t = /Boda/.test(tipo) ? 'boda' : /Congreso/.test(tipo) ? 'congreso' : /Concierto/.test(tipo) ? 'concierto' : 'empresa';
      var esc = (f.querySelector('input[name="escenario"]:checked') || {}).value || '';
      var has = function (v) { var c = f.querySelector('input[name="rider"][value="' + v + '"]'); return !!(c && c.checked); };
      return {
        tipo: t, guests: parseInt((D.getElementById('attendees') || {}).value, 10) || 150,
        stage: /Sin/.test(esc) ? 0 : /20-40/.test(esc) ? 1 : 2,
        sound: has('sonido'), light: has('luz'), rigging: has('rigging'), led: has('video'),
        outdoor: /Exterior/.test((f.querySelector('input[name="recinto"]:checked') || {}).value || '')
      };
    }
    var tmr = 0;
    var upd = function () { clearTimeout(tmr); tmr = setTimeout(function () { st.set(read()); }, 60); };
    f.addEventListener('change', upd); f.addEventListener('input', upd);
    st.set(read(), true);
  })();

  /* =====================================================================
     B) Portada: "Tu evento en 10 segundos"
     ===================================================================== */
  (function () {
    var sec = D.querySelector('[data-tu-evento]');
    if (!sec) return;
    var cv = sec.querySelector('.te-stage canvas'), form = sec.querySelector('.te-form');
    var list = sec.querySelector('.te-list'), count = sec.querySelector('.te-count'), go = sec.querySelector('.te-go');
    var out = sec.querySelector('.te-guests-out'), range = sec.querySelector('input[type="range"]');
    var ctas = sec.querySelector('.te-ctas'), toSim = sec.querySelector('.te-sim'), toForm = sec.querySelector('.te-form-btn');
    var st = Stage3D(cv);
    if (!st) return;
    function tipo() { var r = form.querySelector('input[name="te-tipo"]:checked'); return r ? r.value : 'boda'; }
    function guests() { return parseInt(range.value, 10) || 150; }
    function label() { out.textContent = guests() + (EN ? ' guests' : ' invitados'); }
    range.addEventListener('input', label); label();
    var rec = recommend(tipo(), guests());
    st.set(rec, true);
    var timer = [], busy = false;
    function preview() {
      if (busy) return;
      rec = recommend(tipo(), guests());
      st.set(rec);
    }
    form.addEventListener('change', preview); range.addEventListener('change', preview);

    function run() {
      timer.forEach(clearTimeout); timer = [];
      busy = true;
      rec = recommend(tipo(), guests());
      st.set(rec, true);
      st.hideAll();
      list.innerHTML = '';
      ctas.hidden = true;
      sec.classList.add('is-running');
      go.disabled = true;
      if (W.innerWidth < 1000) { var sr = cv.getBoundingClientRect(); if (sr.top < 70 || sr.bottom > W.innerHeight) W.scrollBy({ top: sr.top - 90, behavior: 'smooth' }); }
      var steps = [
        [0, null, EN ? 'Reading your event…' : 'Leyendo tu evento…'],
        [1.2, 'stage', null, 2],
        [2.4, 'truss', null, 3],
        [3.6, 'sound', null, 0],
        [5.0, 'light', null, 1],
        [6.2, 'led', null, 4],
        [7.4, 'crowd', null, -1],
        [8.6, 'foh', null, 5],
        [9.6, 'beams', null, -1]
      ];
      var t0 = performance.now();
      (function tickCount() {
        if (!busy) return;
        var left = Math.max(0, 10 - (performance.now() - t0) / 1000);
        count.textContent = left.toFixed(1).replace('.', EN ? '.' : ',') + ' s';
        if (!busy) return;
        if (left > 0) timer.push(setTimeout(tickCount, 50));
      })();
      steps.forEach(function (s) {
        timer.push(setTimeout(function () {
          if (s[1]) st.reveal(s[1]);
          if (s[1] === 'beams') st.reveal('light');
          var row = s[3] >= 0 && s[3] !== undefined ? rec.list[s[3]] : null;
          if (s[2] && !row) { list.innerHTML = '<li class="te-reading">' + s[2] + '</li>'; }
          if (row) {
            var rd = list.querySelector('.te-reading'); if (rd) rd.remove();
            var li = D.createElement('li');
            li.innerHTML = '<b>' + row[0] + '</b><span>' + row[1] + '</span>';
            list.appendChild(li);
          }
        }, s[0] * 1000));
      });
      timer.push(setTimeout(function () {
        st.flash();
        count.textContent = EN ? 'Ready!' : '¡Listo!';
        sec.classList.remove('is-running');
        sec.classList.add('is-done');
        busy = false; go.disabled = false;
        go.querySelector('span').textContent = EN ? 'Run it again' : 'Volver a montarlo';
        ctas.hidden = false;
        var tmap = { boda: 'boda', empresa: 'empresa', congreso: 'congreso', concierto: 'concierto' };
        toSim.href = '/simulador.html?tipo=' + tmap[rec.tipo] + '&asistentes=' + rec.guests;
      }, 10000));
    }
    go.addEventListener('click', run);
    toForm.addEventListener('click', function () {
      var names = { boda: EN ? 'Wedding' : 'Boda', empresa: EN ? 'Corporate' : 'Empresa', congreso: EN ? 'Conference' : 'Congreso', concierto: EN ? 'Concert / party' : 'Concierto / fiesta' };
      var msg = (EN ? 'Hi, I used "Your event in 10 seconds" on the website:\n' : 'Hola, he usado "Tu evento en 10 segundos" de la web:\n') +
        '- ' + (EN ? 'Type' : 'Tipo') + ': ' + names[rec.tipo] + '\n- ' + (EN ? 'Guests' : 'Invitados') + ': ' + rec.guests + '\n' +
        rec.list.map(function (r) { return '- ' + r[0] + ': ' + r[1]; }).join('\n');
      try { sessionStorage.setItem('ds-sim-msg', msg); } catch (e) {}
    });
  })();
})();
