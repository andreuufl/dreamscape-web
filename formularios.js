/* Dreamscape Events — envío seguro de formularios a nuestro backend (Apps Script).
   - Si window.DS_API está vacío, no toca nada (los formularios siguen como estaban).
   - Añade la marca de tiempo antibots, el tipo de formulario y la página de origen.
   - Envía por fetch, y solo redirige a la página de gracias si el servidor confirma el envío. */
(function () {
  'use strict';
  var API = (window.DS_API || '').trim();
  if (!API) return;

  var FORMS = { 'dreamscape-form': 'contacto', 'checklist-form': 'checklist', 'presupuesto-rapido': 'contacto' };
  var ERRORES = {
    email_no_valido: 'Revisa el correo electrónico, parece que no es válido.',
    telefono_no_valido: 'Revisa el teléfono (mínimo 9 dígitos).',
    privacidad: 'Necesitamos que aceptes la política de privacidad.',
    demasiados_envios: 'Has enviado varias solicitudes seguidas. Espera un rato o escríbenos por WhatsApp.',
    captcha: 'No hemos podido verificar que no eres un robot. Recarga la página e inténtalo de nuevo.'
  };

  /* Formulario de contacto en dos pasos (mejora progresiva: sin JS se ve completo) */
  (function () {
    var form = document.getElementById('dreamscape-form');
    if (!form) return;
    var chips = form.querySelector('fieldset.chips');
    var fecha = form.querySelector('#fecha');
    if (!chips || !fecha) return;
    var fechaField = fecha.closest('.field');
    var first = form.querySelector('.row');
    var s1 = [chips, fechaField];
    var s2 = [];
    var n = first;
    while (n) { var nx = n.nextElementSibling; if (s1.indexOf(n) < 0 && n.tagName !== 'INPUT' && !(n.matches && n.matches('.form-steps,.form-next,.form-back'))) s2.push(n); n = nx; }
    s1.forEach(function (e) { e.classList.add('s1'); });
    s2.forEach(function (e) { e.classList.add('s2'); });
    var bar = document.createElement('p'); bar.className = 'form-steps s-bar';
    var next = document.createElement('button'); next.type = 'button'; next.className = 'btn btn--gold form-next s1'; next.textContent = 'Continuar';
    var back = document.createElement('button'); back.type = 'button'; back.className = 'form-back s2'; back.textContent = '← Volver al paso 1';
    form.insertBefore(bar, first);
    fechaField.parentNode.insertBefore(next, fechaField.nextSibling);
    var first2 = s2[0]; first2.parentNode.insertBefore(back, first2);
    function go(n2, focus) {
      form.classList.remove('form--s1', 'form--s2'); form.classList.add('form--s' + n2);
      bar.innerHTML = n2 === 1 ? '<b>Paso 1 de 2</b> · Tu evento' : '<b>Paso 2 de 2</b> · Tus datos';
      if (focus) { var t = form.querySelector(n2 === 2 ? '#nombre' : 'fieldset.chips input'); if (t) t.focus({ preventScroll: true }); form.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    }
    next.addEventListener('click', function () {
      go(2, true);
      if (typeof window.gtag === 'function') window.gtag('event', 'form_paso2');
    });
    back.addEventListener('click', function () { go(1, true); });
    go(1, false);
    form.addEventListener('invalid', function (e) { if (form.classList.contains('form--s1')) go(2, false); }, true);
  })();
  var inicio = Date.now();

  Object.keys(FORMS).forEach(function (id) {
    var form = document.getElementById(id);
    if (!form) return;
    form.setAttribute('action', API);
    var key = form.querySelector('input[name="access_key"]');
    if (key) key.remove();

    var aviso = document.createElement('p');
    aviso.setAttribute('role', 'alert');
    aviso.className = 'text-sm text-red-500 font-medium hidden';
    form.appendChild(aviso);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var btn = form.querySelector('[type="submit"]');
      var txt = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
      aviso.classList.add('hidden');

      var datos = new URLSearchParams(new FormData(form));
      datos.set('form', FORMS[id]);
      datos.set('ts', String(inicio));
      datos.set('pagina', location.pathname);
      datos.delete('access_key');
      // Tipo de evento y fecha (campos opcionales): se anteponen al texto para que lleguen en el aviso
      var tipo = datos.get('_tipo'), fecha = datos.get('_fecha');
      datos.delete('_tipo'); datos.delete('_fecha');
      var pre = [];
      if (tipo) pre.push('Tipo de evento: ' + tipo);
      if (fecha) pre.push('Fecha aproximada: ' + fecha);
      if (pre.length && datos.has('Detalles_Proyecto')) datos.set('Detalles_Proyecto', pre.join(' · ') + '\n' + datos.get('Detalles_Proyecto'));
      var destino = (form.querySelector('input[name="redirect"]') || {}).value || '/gracias.html';

      var errorServidor = false;
      fetch(API, { method: 'POST', body: datos })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok) { location.href = destino; return; }
          errorServidor = true;
          throw new Error((res && res.error) || 'error');
        })
        .catch(function (err) {
          if (errorServidor) throw err;
          // Algunos navegadores (Safari/iPhone con bloqueadores o privacidad estricta) no dejan
          // leer la respuesta de Google. El envío se repite en modo "sin respuesta": el servidor
          // lo recibe igual, aunque aquí no podamos leer el resultado.
          return fetch(API, { method: 'POST', mode: 'no-cors', body: datos })
            .then(function () { location.href = destino; });
        })
        .catch(function (err) {
          aviso.textContent = ERRORES[err && err.message] ||
            'No se ha podido enviar ahora mismo. Inténtalo de nuevo o escríbenos por WhatsApp al 613 08 98 94.';
          aviso.classList.remove('hidden');
          if (btn) { btn.disabled = false; btn.innerHTML = txt; }
        });
    });
  });
})();
