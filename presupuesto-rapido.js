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
  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  actualizar();

  /* ---- Formulario por pasos (si JS falla, se ve entero) ---- */
  var steps = [].slice.call(form.querySelectorAll('.wz-step'));
  if (steps.length) {
    var head = form.querySelector('.wz-head'), count = form.querySelector('.wz-count'), bar = form.querySelector('.wz-bar i');
    var back = form.querySelector('.wz-back'), next = form.querySelector('.wz-next'), send = form.querySelector('button[type=submit]');
    var cur = 0;
    form.classList.add('is-wiz'); head.hidden = false;
    function show(i, focus) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (st, k) { st.hidden = k !== cur; });
      count.textContent = 'Paso ' + (cur + 1) + ' de ' + steps.length;
      bar.style.width = ((cur + 1) / steps.length * 100) + '%';
      back.hidden = cur === 0; next.hidden = cur === steps.length - 1; send.hidden = cur !== steps.length - 1;
      if (focus) { var el = steps[cur].querySelector('input:not([type=radio]),select'); if (el && cur > 0) el.focus(); }
    }
    function valido() {
      var els = [].slice.call(steps[cur].querySelectorAll('input,select'));
      for (var k = 0; k < els.length; k++) { if (!els[k].checkValidity()) { els[k].reportValidity(); return false; } }
      return true;
    }
    next.addEventListener('click', function () { if (valido()) show(cur + 1, true); });
    back.addEventListener('click', function () { show(cur - 1, true); });
    /* Elegir tipo de evento avanza solo */
    steps[0].addEventListener('change', function () { setTimeout(function () { if (cur === 0 && valido()) show(1, true); }, 180); });
    /* Intro avanza de paso en lugar de enviar a medias */
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.type !== 'checkbox' && cur < steps.length - 1) { e.preventDefault(); next.click(); }
    });
    /* Si el envío falla por validación en otro paso, volver a él */
    form.addEventListener('invalid', function (e) {
      var st = e.target.closest('.wz-step'); if (st) { var k = steps.indexOf(st); if (k !== cur) show(k); }
    }, true);
    show(0);
  }
})();
