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
  document.getElementById('sim-pdf').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    function go() {
      var d = data(), doc = new window.jspdf.jsPDF(), y = 28;
      doc.setFillColor(10, 10, 11); doc.rect(0, 0, 210, 18, 'F');
      doc.setTextColor(201, 166, 107); doc.setFontSize(11); doc.text('DREAMSCAPE EVENTS · PROPUESTA TÉCNICA ORIENTATIVA', 14, 11.5);
      doc.setTextColor(20, 20, 20); doc.setFontSize(20); doc.text('Resumen de rider técnico', 14, y); y += 12;
      doc.setFontSize(11);
      [['Fecha prevista', d.fecha], ['Tipo de evento', d.tipo], ['Recinto', d.recinto], ['Escenario', d.escenario], ['Duración', d.duracion],
       ['Asistentes', d.asistentes + ' personas'], ['Rider técnico', d.riders.join(', ') || 'Ninguno'], ['Potencia eléctrica estimada', d.potencia]]
        .forEach(function (r) { doc.setTextColor(120, 115, 105); doc.text(r[0].toUpperCase(), 14, y); doc.setTextColor(20, 20, 20); doc.text(doc.splitTextToSize(r[1], 120), 76, y); y += 10; });
      y += 6; doc.setFontSize(10); doc.setTextColor(90, 90, 90);
      doc.text(doc.splitTextToSize('Documento orientativo generado con el simulador de www.dreamscapeevents.es. El presupuesto definitivo se confirma tras revisar el recinto y las necesidades del evento.', 182), 14, y);
      y += 18; doc.setTextColor(20, 20, 20); doc.text('info@ap-events.es · 613 08 98 94 · www.dreamscapeevents.es', 14, y);
      doc.save('rider-tecnico-dreamscape.pdf'); btn.disabled = false;
    }
    if (window.jspdf) return go();
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = go; s.onerror = function () { btn.disabled = false; alert('No se ha podido generar el PDF ahora mismo. Prueba con WhatsApp o el formulario.'); };
    document.head.appendChild(s);
  });
  update();
})();
