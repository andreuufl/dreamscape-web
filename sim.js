/* Simulador de rider técnico — Dreamscape Events */
(function () {
  'use strict';
  var f = document.getElementById('sim-form');
  if (!f) return;
  var WA = 'https://wa.me/34613089894';
  var KW = { sonido: 4.5, luz: 5, video: 6.5, rigging: 0 };
  var LBL = { sonido: 'Sonido PA y microfonía', luz: 'Iluminación DMX', rigging: 'Escenografía y estructuras', video: 'Pantalla LED / vídeo' };

  function val(name) { var el = f.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function data() {
    var riders = [].slice.call(f.querySelectorAll('input[name="rider"]:checked')).map(function (x) { return x.value; });
    var kw = 2; riders.forEach(function (r) { kw += KW[r] || 0; });
    var date = f.querySelector('#event-date').value;
    return {
      fecha: date ? new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Por definir',
      rawDate: date,
      t: (function (v) { return /Boda/.test(v) ? 'boda' : /Congreso/.test(v) ? 'congreso' : /Concierto/.test(v) ? 'concierto' : 'empresa'; })(val('tipo')),
      guests: parseInt(f.querySelector('#attendees').value, 10) || 150, keys: riders,
      tipo: val('tipo'), recinto: val('recinto'), escenario: val('escenario'), duracion: val('duracion'),
      asistentes: f.querySelector('#attendees').value,
      riders: riders.map(function (r) { return LBL[r]; }),
      kw: kw,
      potencia: '~' + kw.toString().replace('.', ',') + ' kW · ' + (kw > 9 ? 'trifásica recomendada' : 'monofásica')
    };
  }
  function set(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
  function update() {
    var d = data();
    set('s-fecha', d.fecha); set('s-tipo', d.tipo); set('s-recinto', d.recinto); set('s-escenario', d.escenario);
    set('s-duracion', d.duracion); set('s-asistentes', d.asistentes + ' personas'); set('s-rider', d.riders.join(' · ') || 'Sin seleccionar');
    set('s-potencia', d.potencia); set('attendees-out', d.asistentes + ' personas');
    var note = document.getElementById('date-note');
    if (note) {
      if (d.rawDate) { var dow = new Date(d.rawDate + 'T12:00:00').getDay(); note.textContent = (dow === 5 || dow === 6) ? 'Viernes y sábados son las fechas con más demanda: cuanto antes lo reservemos, mejor.' : ''; }
      else note.textContent = '';
    }
  }
  function summary() {
    var d = data();
    return '- Fecha prevista: ' + d.fecha + '\n- Tipo: ' + d.tipo + '\n- Recinto: ' + d.recinto + '\n- Escenario: ' + d.escenario +
      '\n- Duración: ' + d.duracion + '\n- Asistentes: ' + d.asistentes + '\n- Rider técnico: ' + (d.riders.join(', ') || 'Ninguno') + '\n- Potencia estimada: ' + d.potencia;
  }
  /* Elegir escenario marca o desmarca estructuras automáticamente */
  f.addEventListener('change', function (e) {
    if (e.target.name === 'escenario') {
      var rig = f.querySelector('input[name="rider"][value="rigging"]');
      if (rig) rig.checked = e.target.value !== 'Sin tarima';
    }
    update();
  });
  f.addEventListener('input', update);
  var today = new Date(); today.setDate(today.getDate() + 1);
  f.querySelector('#event-date').min = today.toISOString().slice(0, 10);

  document.getElementById('sim-wa').addEventListener('click', function () {
    var t = '¡Hola Dreamscape Events! He usado el simulador de la web y quiero presupuesto para esta configuración:\n\n' + summary() + '\n\n¿Me podéis pasar un presupuesto?';
    if (typeof window.gtag === 'function') window.gtag('event', 'click_whatsapp', { link_location: 'simulador' });
    window.open(WA + '?text=' + encodeURIComponent(t), '_blank', 'noopener');
  });
  document.getElementById('sim-form-btn').addEventListener('click', function () {
    try { sessionStorage.setItem('ds-sim-msg', 'Hola, me interesa presupuestar este evento configurado en el simulador:\n' + summary()); } catch (e) {}
    window.location.href = '/contacto.html#formulario';
  });
  /* ---- Puerta del PDF: email válido + política obligatoria, y entonces se descarga ---- */
  var API = (window.DS_API || '').trim();
  var EMAIL_RE = /^[^\s@,;:<>()\[\]\\"]+@([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
  var TYPOS = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.es': 'gmail.com', 'gmail.con': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yahoo.con': 'yahoo.com', 'yaho.com': 'yahoo.com', 'icloud.con': 'icloud.com' };
  var gate = null;
  function buildGate() {
    gate = document.createElement('div');
    gate.className = 'pdfgate'; gate.hidden = true;
    gate.innerHTML =
      '<div class="pdfgate-box" role="dialog" aria-modal="true" aria-labelledby="pdfgate-t">' +
      '<button type="button" class="pdfgate-x" aria-label="Cerrar">×</button>' +
      '<span class="eyebrow">Tu rider técnico</span>' +
      '<h2 id="pdfgate-t">¿A qué correo te lo enviamos?</h2>' +
      '<p class="pdfgate-p">Indica tu email y se descargará al instante el PDF con la configuración de tu evento y los precios orientativos. Después te escribimos para afinar el presupuesto.</p>' +
      '<form id="pdfgate-form" novalidate>' +
      '<div class="field"><label for="pg-email">Correo electrónico</label><input type="email" id="pg-email" name="Email" required maxlength="120" autocomplete="email" inputmode="email" placeholder="tu@empresa.com"></div>' +
      '<div class="field"><label for="pg-nombre">Nombre <span class="pg-opt">(opcional)</span></label><input type="text" id="pg-nombre" name="Nombre" maxlength="100" autocomplete="name" placeholder="Tu nombre y empresa"></div>' +
      '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none">' +
      '<label class="consent"><input type="checkbox" id="pg-priv" name="Acepta_Privacidad" value="Sí" required><span>He leído y acepto la <a href="/privacidad.html" target="_blank" rel="noopener">política de privacidad</a>. Usaréis mi email para enviarme el rider y contactarme sobre mi evento.</span></label>' +
      '<p class="pdfgate-err" id="pg-err" role="alert" hidden></p>' +
      '<button class="btn btn--gold" type="submit" id="pg-go">Descargar mi rider (PDF)</button>' +
      '</form></div>';
    document.body.appendChild(gate);
    gate.addEventListener('click', function (e) { if (e.target === gate || e.target.classList.contains('pdfgate-x')) closeGate(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && gate && !gate.hidden) closeGate(); });
    gate.querySelector('#pdfgate-form').addEventListener('submit', submitGate);
  }
  var opener = null;
  function openGate(btn) {
    if (!gate) buildGate();
    opener = btn; gate.hidden = false; document.documentElement.classList.add('pdfgate-on');
    setTimeout(function () { var i = gate.querySelector('#pg-email'); if (i) i.focus(); }, 30);
  }
  function closeGate() {
    if (!gate) return;
    gate.hidden = true; document.documentElement.classList.remove('pdfgate-on');
    if (opener) opener.focus();
  }
  function showErr(msg, el) {
    var e = gate.querySelector('#pg-err'); e.textContent = msg; e.hidden = !msg;
    if (el) el.focus();
  }
  function submitGate(ev) {
    ev.preventDefault();
    var email = gate.querySelector('#pg-email'), priv = gate.querySelector('#pg-priv'), nombre = gate.querySelector('#pg-nombre');
    var v = email.value.trim().toLowerCase(); email.value = v;
    if (!v || !EMAIL_RE.test(v)) return showErr('Escribe un correo válido, por ejemplo nombre@empresa.com.', email);
    var dom = v.split('@')[1];
    if (TYPOS[dom]) return showErr('¿Querías decir ' + v.split('@')[0] + '@' + TYPOS[dom] + '? Corrígelo y vuelve a pulsar.', email);
    if (!priv.checked) return showErr('Para continuar debes aceptar la política de privacidad.', priv);
    showErr('');
    var btn = gate.querySelector('#pg-go'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Preparando tu rider…';
    var d = data();
    var datos = new URLSearchParams();
    datos.set('form', 'checklist');
    datos.set('Email', v); datos.set('Nombre', nombre.value.trim() || '(sin nombre)');
    datos.set('Acepta_Privacidad', 'Sí');
    datos.set('Origen', 'Simulador rider · ' + d.tipo + ' · ' + d.asistentes + ' pers. · ' + d.recinto);
    datos.set('Detalles_Proyecto', summary());
    datos.set('Idioma', 'ES');
    datos.set('ts', String(Date.now() - 4000));
    datos.set('pagina', location.pathname);
    var rechazado = false;
    function generar() {
      window.DSRider.generate(d, function () {
        btn.disabled = false; btn.textContent = label; closeGate();
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'download_rider', { link_location: 'simulador' });
          window.gtag('event', 'generate_lead', { form_name: 'simulador_rider' });
        }
        var n = document.getElementById('sim-pdf-ok');
        if (n) { n.hidden = false; setTimeout(function () { n.hidden = true; }, 9000); }
      }, function () {
        btn.disabled = false; btn.textContent = label;
        showErr('No se ha podido generar el PDF ahora mismo. Inténtalo de nuevo o escríbenos por WhatsApp.');
      });
    }
    function cargarYGenerar() {
      if (window.DSRider) return generar();
      var s = document.createElement('script'); s.src = '/rider-pdf.js?v=1'; s.onload = generar;
      s.onerror = function () { btn.disabled = false; btn.textContent = label; showErr('No se ha podido generar el PDF ahora mismo. Inténtalo de nuevo o escríbenos por WhatsApp.'); };
      document.head.appendChild(s);
    }
    if (!API) return cargarYGenerar();
    fetch(API, { method: 'POST', body: datos })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) return cargarYGenerar();
        rechazado = true; throw new Error((res && res.error) || 'error');
      })
      .catch(function (err) {
        if (rechazado) throw err;
        /* Safari/iPhone con privacidad estricta no deja leer la respuesta: se reenvía sin respuesta */
        return fetch(API, { method: 'POST', mode: 'no-cors', body: datos }).then(cargarYGenerar);
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = label;
        var m = { email_no_valido: 'El servidor no ha aceptado ese correo. Revísalo.', privacidad: 'Debes aceptar la política de privacidad.', demasiados_envios: 'Has hecho varias solicitudes seguidas. Espera un rato o escríbenos por WhatsApp.' };
        showErr(m[err && err.message] || 'No hemos podido registrar tu correo. Revisa tu conexión e inténtalo de nuevo.', email);
      });
  }
  document.getElementById('sim-pdf').addEventListener('click', function () { openGate(this); });
  update();
})();
