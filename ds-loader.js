/* Dreamscape Events · Pantalla de carga "Prueba de luces"
   Un truss con 5 cabezas móviles se enciende a medida que carga la web,
   la mesa de luces cuenta hasta 100, los focos se cruzan sobre el logo
   y el telón se abre para mostrar la página.
   - Solo se muestra la primera vez por sesión (no molesta al navegar).
   - Respeta "reducir movimiento" del sistema.
   - Límite máximo de 3,2 s: nunca bloquea la web. */
(function () {
  var KEY = 'ds_intro_v1';
  try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) {}
  if (/bot|crawl|spider|lighthouse|slurp/i.test(navigator.userAgent)) return;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = '' +
  '#dsl{position:fixed;inset:0;z-index:2147483000;background:#050506;overflow:hidden;color:#f4efe6;' +
  'font-family:"JetBrains Mono",ui-monospace,Menlo,monospace;pointer-events:all;--g:#c9a66b;--a:#3d8bff}' +
  '#dsl .cur{position:absolute;top:0;bottom:0;width:50.5%;background:repeating-linear-gradient(90deg,#120a0b 0 22px,#1c0f11 22px 30px,#0d0708 30px 44px);' +
  'box-shadow:inset 0 -120px 140px rgba(0,0,0,.7);transition:transform 1.05s cubic-bezier(.77,0,.18,1)}' +
  '#dsl .cur.l{left:0;transform-origin:left}#dsl .cur.r{right:0}' +
  '#dsl .stage{position:absolute;inset:0;transition:opacity .45s}' +
  '#dsl .truss{position:absolute;left:6%;right:6%;top:9%;height:14px;border-top:2px solid #3a3a40;border-bottom:2px solid #3a3a40;' +
  'background:repeating-linear-gradient(45deg,transparent 0 9px,#2c2c32 9px 11px,transparent 11px 20px)}' +
  '#dsl .fx{position:absolute;top:calc(9% + 14px);width:0;height:0}' +
  '#dsl .fx i{position:absolute;left:-9px;top:0;width:18px;height:20px;border-radius:4px 4px 9px 9px;background:#1d1d22;border:1px solid #33333a}' +
  '#dsl .fx b{position:absolute;left:-2px;top:16px;width:4px;height:4px;border-radius:50%;background:#333;transition:background .2s,box-shadow .2s}' +
  '#dsl .bm{position:absolute;left:-60px;top:18px;width:120px;height:120vh;transform-origin:50% 0;opacity:0;' +
  'background:linear-gradient(180deg,var(--c) 0%,transparent 78%);clip-path:polygon(47% 0,53% 0,100% 100%,0 100%);' +
  'filter:blur(2px);mix-blend-mode:screen;transition:opacity .35s}' +
  '#dsl .fx.on b{background:#fff;box-shadow:0 0 14px 4px var(--c)}' +
  '#dsl .fx.on .bm{opacity:.55;animation:dsl-sw 2.4s ease-in-out infinite alternate}' +
  '#dsl.hit .fx .bm{animation:none;opacity:.8;transition:transform .6s cubic-bezier(.3,.9,.3,1),opacity .3s}' +
  '@keyframes dsl-sw{from{transform:rotate(var(--r1))}to{transform:rotate(var(--r2))}}' +
  '#dsl .haze{position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 70%,rgba(201,166,107,.07),transparent 70%);animation:dsl-hz 6s ease-in-out infinite alternate}' +
  '@keyframes dsl-hz{to{transform:translateX(4%) scale(1.08)}}' +
  '#dsl .logo{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);text-align:center;width:90%}' +
  '#dsl .logo h1{margin:0;font:400 clamp(30px,6.4vw,74px)/1 "Fraunces",Georgia,serif;letter-spacing:.14em;text-transform:uppercase;' +
  'color:transparent;-webkit-text-stroke:1px rgba(244,239,230,.28);transition:color .5s,text-shadow .5s,-webkit-text-stroke-color .5s}' +
  '#dsl.hit .logo h1{color:#f4efe6;-webkit-text-stroke-color:transparent;text-shadow:0 0 30px rgba(201,166,107,.55),0 0 90px rgba(61,139,255,.25)}' +
  '#dsl .logo p{margin:.9em 0 0;font-size:11px;letter-spacing:.42em;text-transform:uppercase;color:var(--g);opacity:.85}' +
  '#dsl .desk{position:absolute;left:50%;bottom:7%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:22px;' +
  'padding:12px 16px;border:1px solid #26262c;border-radius:8px;background:rgba(14,14,17,.85);font-size:11px;letter-spacing:.12em}' +
  '#dsl .vu{display:flex;gap:3px;align-items:flex-end;height:34px}' +
  '#dsl .vu s{display:block;width:5px;height:20%;background:linear-gradient(0deg,#3ddc84 0 60%,#ffd34d 60% 82%,#ff4d4d 82%);border-radius:1px;animation:dsl-vu .5s ease-in-out infinite alternate}' +
  '@keyframes dsl-vu{to{height:var(--h)}}' +
  '#dsl .fad{width:10px;height:56px;border-radius:5px;background:#1b1b20;position:relative}' +
  '#dsl .fad u{position:absolute;left:-5px;width:20px;height:9px;border-radius:2px;background:var(--g);bottom:0;transition:bottom .25s}' +
  '#dsl .num{font-size:26px;letter-spacing:.05em;color:#f4efe6;min-width:3.2ch;text-align:right;font-variant-numeric:tabular-nums}' +
  '#dsl .lbl{color:#8a8a93;line-height:1.7}#dsl .lbl em{color:var(--g);font-style:normal}' +
  '#dsl.open .cur.l{transform:translateX(-101%)}#dsl.open .cur.r{transform:translateX(101%)}' +
  '#dsl.open .stage{opacity:0}#dsl.open{background:transparent;pointer-events:none}' +
  '@media (max-width:600px){#dsl .desk{gap:14px;bottom:5%}#dsl .num{font-size:21px}#dsl .lbl{display:none}}' +
  (reduce ? '#dsl *{animation:none!important;transition-duration:.01s!important}' : '');

  var cols = ['#c9a66b', '#3d8bff', '#ff6b8f', '#22c6dc', '#9577ff'];
  var pos = [12, 31, 50, 69, 88];
  var fx = '', vu = '';
  for (var i = 0; i < 5; i++) {
    var a = (i - 2) * 9;
    fx += '<span class="fx" style="left:' + pos[i] + '%;--c:' + cols[i] + ';--r1:' + (a - 16) + 'deg;--r2:' + (a + 16) + 'deg">' +
          '<i></i><b></b><em class="bm" style="animation-delay:-' + (i * .45) + 's"></em></span>';
  }
  for (var j = 0; j < 9; j++) vu += '<s style="--h:' + (35 + Math.round(Math.random() * 60)) + '%;animation-delay:-' + (j * .11).toFixed(2) + 's"></s>';

  var el = document.createElement('div');
  el.id = 'dsl';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<style>' + css + '</style><div class="stage"><div class="haze"></div><div class="truss"></div>' + fx +
    '<div class="logo"><h1>Dreamscape</h1><p>Events &amp; Productions</p></div>' +
    '<div class="desk"><div class="vu">' + vu + '</div><div class="fad"><u></u></div>' +
    '<div class="num">000</div><div class="lbl">PRUEBA DE LUCES<br><em>CH 1–5</em> · SONIDO OK</div></div></div>' +
    '<div class="cur l"></div><div class="cur r"></div>';
  (document.body || document.documentElement).appendChild(el);
  document.documentElement.style.overflow = 'hidden';

  var num = el.querySelector('.num'), fad = el.querySelector('.fad u'), fxs = el.querySelectorAll('.fx');
  var shown = 0, target = 8, done = false, t0 = Date.now();
  var MIN = reduce ? 300 : 1500, MAX = 3200;

  function loaded() {
    var imgs = document.images, n = imgs.length, c = 0;
    for (var k = 0; k < n; k++) if (imgs[k].complete) c++;
    var base = document.readyState === 'complete' ? 100 : document.readyState === 'interactive' ? 70 : 35;
    return n ? Math.min(base, 40 + Math.round(60 * c / n)) : base;
  }
  // abrir el telón inmediatamente para que se vea la escena
  requestAnimationFrame(function () { el.querySelectorAll('.cur').forEach(function (c) { c.style.transform = c.classList.contains('l') ? 'translateX(-101%)' : 'translateX(101%)'; }); });

  function tick() {
    if (done) return;
    var el_t = Date.now() - t0;
    target = Math.max(target, loaded());
    if (el_t > MAX) target = 100;
    var cap = Math.min(target, Math.round(100 * el_t / MIN));
    shown += Math.max(1, Math.round((cap - shown) * .18));
    if (shown > cap) shown = cap;
    num.textContent = ('00' + shown).slice(-3);
    fad.style.bottom = (shown * .47) + 'px';
    for (var f = 0; f < fxs.length; f++) if (shown >= f * 20 + 6) fxs[f].classList.add('on');
    if (shown >= 100) return finish();
    requestAnimationFrame(tick);
  }
  function finish() {
    done = true;
    el.classList.add('hit');
    var W = innerWidth, H = innerHeight, top = H * .09 + 32, ly = H * .52;
    for (var f = 0; f < fxs.length; f++) {
      var dx = (50 - pos[f]) / 100 * W;
      var ang = -Math.atan2(dx, ly - top) * 180 / Math.PI;
      fxs[f].querySelector('.bm').style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
    }
    setTimeout(function () {
      // cerrar telón un instante y abrirlo de nuevo sobre la web
      el.querySelectorAll('.cur').forEach(function (c) { c.style.transform = ''; });
      setTimeout(function () {
        el.classList.add('open');
        document.documentElement.style.overflow = '';
        setTimeout(function () { el.remove(); }, 1150);
      }, reduce ? 50 : 650);
    }, reduce ? 50 : 750);
  }
  window.addEventListener('load', function () { target = 100; });
  requestAnimationFrame(tick);
  setTimeout(function () { if (!done) { target = 100; } }, MAX + 400);
  setTimeout(function () { if (document.getElementById('dsl')) { el.remove(); document.documentElement.style.overflow = ''; } }, 7000);
})();
