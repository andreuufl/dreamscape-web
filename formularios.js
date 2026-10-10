/* Dreamscape Events — envío seguro de formularios a nuestro backend (Apps Script).
   - Si window.DS_API está vacío, no toca nada (los formularios siguen como estaban).
   - Añade la marca de tiempo antibots, el tipo de formulario y la página de origen.
   - Envía por fetch, y solo redirige a la página de gracias si el servidor confirma el envío. */
(function () {
  'use strict';
  var API = (window.DS_API || '').trim();
  if (!API) return;

  var FORMS = { 'dreamscape-form': 'contacto', 'checklist-form': 'checklist' };
  var ERRORES = {
    email_no_valido: 'Revisa el correo electrónico, parece que no es válido.',
    telefono_no_valido: 'Revisa el teléfono (mínimo 9 dígitos).',
    privacidad: 'Necesitamos que aceptes la política de privacidad.',
    demasiados_envios: 'Has enviado varias solicitudes seguidas. Espera un rato o escríbenos por WhatsApp.',
    captcha: 'No hemos podido verificar que no eres un robot. Recarga la página e inténtalo de nuevo.'
  };
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
      var destino = (form.querySelector('input[name="redirect"]') || {}).value || '/gracias.html';

      fetch(API, { method: 'POST', body: datos })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.ok) { location.href = destino; return; }
          throw new Error((res && res.error) || 'error');
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
