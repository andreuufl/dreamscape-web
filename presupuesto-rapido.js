/* Dreamscape Events — formulario de presupuesto rápido (portada).
   - Compone el campo "Detalles_Proyecto" con los datos del formulario.
   - Comprueba la fecha elegida contra window.DS_DISPO (ver disponibilidad.js).
   El envío lo gestiona formularios.js, igual que el formulario de contacto. */
(function () {
  'use strict';
  var form = document.getElementById('presupuesto-rapido');
  if (!form) return;
  var cfg = window.DS_DISPO || {};
  var f = form.elements;
  var msg = document.getElementById('pr-dispo');
  var aviso = document.getElementById('pr-aviso');

  if (cfg.aviso && aviso) { aviso.textContent = cfg.aviso; aviso.hidden = false; }

  var hoy = new Date(); hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  f.fecha.min = hoy.toISOString().slice(0, 10);

  function ocupada(iso) {
    return (cfg.ocupadas || []).some(function (r) {
      var p = String(r).split('/');
      var a = p[0], b = p[1] || p[0];
      return iso >= a && iso <= b;
    });
  }
  function fmt(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  function actualizar() {
    var iso = f.fecha.value, estado = '';
    if (msg) {
      if (!iso) { msg.textContent = ''; msg.className = 'pr-dispo'; }
      else if (ocupada(iso)) {
        estado = 'fecha marcada como reservada';
        msg.textContent = 'Esa fecha ya la tenemos reservada. Envíanos la solicitud y te proponemos alternativas.';
        msg.className = 'pr-dispo pr-dispo--busy';
      } else {
        msg.textContent = 'Te confirmamos la disponibilidad de esa fecha junto con el presupuesto.';
        msg.className = 'pr-dispo pr-dispo--ok';
      }
    }
    var partes = ['Solicitud rápida desde la portada.'];
    if (f.tipo.value) partes.push('Tipo de evento: ' + f.tipo.value + '.');
    if (iso) partes.push('Fecha: ' + fmt(iso) + (estado ? ' (' + estado + ')' : '') + '.');
    if (f.lugar.value.trim()) partes.push('Lugar: ' + f.lugar.value.trim() + '.');
    if (f.asistentes.value) partes.push('Asistentes: ' + f.asistentes.value + '.');
    f.Detalles_Proyecto.value = partes.join(' ');
  }
  ['tipo', 'fecha', 'lugar', 'asistentes'].forEach(function (n) {
    f[n].addEventListener('input', actualizar);
    f[n].addEventListener('change', actualizar);
  });
  actualizar();
})();
