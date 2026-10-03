/* ============================================================
   THYME — Portada (home.js)
   Abanico del hero, carrusel de boxes en abanico, formularios
   por pasos, carruseles deslizables y apariciones al hacer scroll.
   Los envíos (WhatsApp + Google Calendar) siguen en thyme-main.js.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Abanico de fotos del hero ---------- */
  var fan = document.querySelector('[data-fan]');
  if (fan) {
    var abrirAbanico = function () { requestAnimationFrame(function () { fan.classList.add('is-in'); }); };
    if (document.readyState === 'complete') abrirAbanico();
    else window.addEventListener('load', abrirAbanico);
    setTimeout(abrirAbanico, 1200); /* por si alguna imagen tarda */
  }

  /* ---------- Aparición al hacer scroll ---------- */
  var reveals = document.querySelectorAll('.x-reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    /* Escalonado suave entre hermanos */
    reveals.forEach(function (el) {
      var hermanos = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('x-reveal'); });
      var i = hermanos.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i * 0.09, 0.4) + 's');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Carruseles deslizables (móvil) con puntos ---------- */
  document.querySelectorAll('[data-snap]').forEach(function (pista) {
    var puntos = pista.nextElementSibling;
    if (!puntos || !puntos.hasAttribute('data-snap-dots')) {
      puntos = document.createElement('div');
      puntos.className = 'x-snap-dots';
      puntos.setAttribute('data-snap-dots', '');
      puntos.setAttribute('aria-hidden', 'true');
      pista.parentNode.insertBefore(puntos, pista.nextSibling);
    }
    var hijos = pista.children;
    for (var i = 0; i < hijos.length; i++) puntos.appendChild(document.createElement('i'));
    var marcar = function () {
      var paso = hijos.length > 1 ? hijos[1].offsetLeft - hijos[0].offsetLeft : 1;
      var idx = Math.round(pista.scrollLeft / (paso || 1));
      if (pista.scrollLeft + pista.clientWidth >= pista.scrollWidth - 4) idx = hijos.length - 1;
      Array.prototype.forEach.call(puntos.children, function (p, j) { p.classList.toggle('is-on', j === idx); });
    };
    pista.addEventListener('scroll', function () { requestAnimationFrame(marcar); }, { passive: true });
    marcar();
  });

  /* ---------- Carrusel de boxes en abanico ---------- */
  (function () {
    var deck = document.querySelector('[data-deck]');
    if (!deck) return;
    var cards = Array.prototype.slice.call(deck.querySelectorAll('.x-deck-card'));
    var n = cards.length;
    var actual = 0;
    var info = document.querySelector('.x-deck-info');
    var elIdx = document.querySelector('[data-deck-index]');
    var elTot = document.querySelector('[data-deck-total]');
    var elTit = document.querySelector('[data-deck-title]');
    var elDesc = document.querySelector('[data-deck-desc]');
    var elLink = document.querySelector('[data-deck-link]');
    var dosDigitos = function (v) { return (v < 10 ? '0' : '') + v; };
    if (elTot) elTot.textContent = dosDigitos(n);

    function offset(i) {
      var d = i - actual;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    }

    function pintar(arrastre) {
      var movil = window.innerWidth < 980;
      var sep = movil ? 34 : 54;
      cards.forEach(function (c, i) {
        var d = offset(i) + (arrastre || 0);
        var a = Math.abs(d);
        c.style.transform =
          'translateX(' + (d * sep) + 'px) translateY(' + (a * 16) + 'px) rotate(' + (d * 6) + 'deg) scale(' + Math.max(1 - a * 0.08, 0.6) + ')';
        c.style.zIndex = String(20 - Math.round(a * 2));
        c.style.opacity = a > 2.4 ? '0' : '1';
        c.style.filter = 'brightness(' + Math.max(1 - a * 0.18, 0.5) + ')';
        c.setAttribute('aria-hidden', Math.round(a) === 0 ? 'false' : 'true');
        c.tabIndex = Math.round(a) === 0 ? 0 : -1;
      });
    }

    function textos() {
      var c = cards[actual];
      if (!info) return;
      info.classList.add('is-swapping');
      setTimeout(function () {
        if (elIdx) elIdx.textContent = dosDigitos(actual + 1);
        if (elTit) elTit.textContent = c.getAttribute('data-title');
        if (elDesc) elDesc.textContent = c.getAttribute('data-desc');
        if (elLink) elLink.setAttribute('href', c.getAttribute('href'));
        info.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 220);
    }

    function ir(i) {
      actual = (i + n) % n;
      pintar(0);
      textos();
    }

    var prev = document.querySelector('[data-deck-prev]');
    var next = document.querySelector('[data-deck-next]');
    if (prev) prev.addEventListener('click', function () { ir(actual - 1); });
    if (next) next.addEventListener('click', function () { ir(actual + 1); });

    /* Arrastrar / deslizar */
    var x0 = null, dx = 0, arrastrado = false;
    deck.addEventListener('pointerdown', function (e) {
      x0 = e.clientX; dx = 0; arrastrado = false;
    });
    window.addEventListener('pointermove', function (e) {
      if (x0 === null) return;
      dx = e.clientX - x0;
      if (Math.abs(dx) > 6) {
        arrastrado = true;
        deck.classList.add('is-dragging');
        pintar(dx / 260);
      }
    });
    var soltar = function () {
      if (x0 === null) return;
      deck.classList.remove('is-dragging');
      if (dx < -50) ir(actual + 1);
      else if (dx > 50) ir(actual - 1);
      else pintar(0);
      x0 = null;
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);

    /* Toque: en la carta activa abre la box; en otra, la trae al frente */
    cards.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (arrastrado) { e.preventDefault(); arrastrado = false; return; }
        if (i !== actual) { e.preventDefault(); ir(i); }
      });
    });

    deck.setAttribute('tabindex', '0');
    deck.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual + 1); }
    });

    window.addEventListener('resize', function () { pintar(0); });
    pintar(0);
  })();

  /* ---------- Selector de tipo de evento (rellena el <select> real) ---------- */
  document.querySelectorAll('[data-choices]').forEach(function (grupo) {
    var select = document.getElementById(grupo.getAttribute('data-choices'));
    var botones = grupo.querySelectorAll('button');
    botones.forEach(function (b) {
      b.addEventListener('click', function () {
        botones.forEach(function (o) { o.setAttribute('aria-checked', 'false'); });
        b.setAttribute('aria-checked', 'true');
        if (select) {
          select.value = b.getAttribute('data-value');
          select.dispatchEvent(new Event('change', { bubbles: true }));
          var f = select.closest('.field');
          if (f) f.classList.remove('has-error');
        }
      });
    });
  });

  /* ---------- Formularios por pasos ---------- */
  var reglas = {
    text: function (el) { return el.value.trim().length >= 2; },
    email: function (el) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()); },
    tel: function (el) { return /^[+\d][\d\s]{7,}$/.test(el.value.trim()); },
    number: function (el) { var v = parseInt(el.value, 10); var min = parseInt(el.getAttribute('min') || '0', 10); return !isNaN(v) && v >= min; },
    date: function (el) { return !!el.value; },
    checkbox: function (el) { return el.checked; },
    select: function (el) { return !!el.value; }
  };

  function campoValido(el) {
    var tipo = el.tagName === 'SELECT' ? 'select' : (el.type || 'text');
    var regla = reglas[tipo] || reglas.text;
    return regla(el);
  }

  document.querySelectorAll('[data-stepper]').forEach(function (form) {
    var pasos = Array.prototype.slice.call(form.querySelectorAll('[data-step]'));
    var indicadores = form.querySelectorAll('.x-steps li');
    var barra = form.querySelector('[data-step-bar]');
    var btnAtras = form.querySelector('[data-step-back]');
    var btnSeguir = form.querySelector('[data-step-next]');
    var btnEnviar = form.querySelector('[data-step-submit]');
    var actual = 0;

    function pintar(atras) {
      pasos.forEach(function (p, i) {
        p.classList.toggle('is-active', i === actual);
        p.classList.toggle('is-back', i === actual && !!atras);
      });
      Array.prototype.forEach.call(indicadores, function (li, i) {
        li.classList.toggle('is-active', i === actual);
        li.classList.toggle('is-done', i < actual);
      });
      if (barra) barra.style.width = ((actual + 1) / pasos.length * 100) + '%';
      if (btnAtras) btnAtras.hidden = actual === 0;
      if (btnSeguir) btnSeguir.hidden = actual === pasos.length - 1;
      if (btnEnviar) btnEnviar.hidden = actual !== pasos.length - 1;
    }

    function asegurarVisible() {
      var r = form.getBoundingClientRect();
      if (r.top < 70) {
        window.scrollTo({ top: window.scrollY + r.top - 90, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    function validarPaso(i) {
      var ok = true;
      var primero = null;
      var paso = pasos[i];

      /* Paso de día y turno de la reserva */
      var disp = paso.querySelector('[data-field="disponibilidad"]');
      if (disp) {
        var f = form.querySelector('#reserva-fecha');
        var h = form.querySelector('#reserva-hora');
        var bien = f && h && f.value && h.value;
        disp.classList.toggle('has-error', !bien);
        if (!bien) { ok = false; primero = primero || disp; }
      }

      paso.querySelectorAll('input[required], select[required], textarea[required]').forEach(function (el) {
        if (el.type === 'hidden') return;
        var valido = campoValido(el);
        var campo = el.closest('.field');
        if (campo) campo.classList.toggle('has-error', !valido);
        if (!valido) { ok = false; primero = primero || el; }
      });

      if (primero && primero.focus && primero.tagName !== 'DIV' && !primero.classList.contains('x-sr')) {
        try { primero.focus({ preventScroll: true }); } catch (e) {}
      }
      return ok;
    }

    function ir(i, atras) {
      actual = Math.max(0, Math.min(i, pasos.length - 1));
      pintar(atras);
      asegurarVisible();
    }

    if (btnSeguir) btnSeguir.addEventListener('click', function () {
      if (validarPaso(actual)) ir(actual + 1);
    });
    if (btnAtras) btnAtras.addEventListener('click', function () { ir(actual - 1, true); });

    /* Enter en un paso intermedio = continuar, no enviar */
    form.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && actual < pasos.length - 1) {
        e.preventDefault();
        if (validarPaso(actual)) ir(actual + 1);
      }
    });

    /* Si al enviar thyme-main.js marca un error en otro paso, vamos a ese paso */
    form.addEventListener('submit', function () {
      setTimeout(function () {
        var err = form.querySelector('.has-error');
        if (!err) return;
        var paso = err.closest('[data-step]');
        var idx = pasos.indexOf(paso);
        if (idx > -1 && idx !== actual) ir(idx, idx < actual);
      }, 30);
    });

    pintar(false);
  });

  /* ---------- Lightbox: el botón vuelve a "Reservar mesa privada" por defecto ---------- */
  var cta = document.querySelector('[data-lightbox-cta]');
  if (cta) {
    document.querySelectorAll('[data-lightbox-trigger]').forEach(function (t) {
      t.addEventListener('click', function () {
        var href = t.getAttribute('data-cta-href');
        if (!href) {
          cta.setAttribute('href', '#reserva');
          cta.textContent = document.documentElement.lang === 'en' ? 'Book a private table' : 'Reservar mesa privada';
        }
        /* Enlaces de la propia web: misma pestaña */
        if (!href || href.charAt(0) === '#' || href.indexOf('.html') > -1) {
          cta.removeAttribute('target');
          cta.removeAttribute('rel');
        }
      });
    });
  }
})();

/* ---------- Reseñas (resenas.js): la sección solo aparece si hay reseñas ---------- */
(function () {
  'use strict';
  var sec = document.querySelector('[data-resenas]');
  if (!sec || typeof RESENAS === 'undefined' || !RESENAS.length) return;
  var list = sec.querySelector('[data-resenas-list]');
  var esc = function (t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
  RESENAS.forEach(function (r) {
    var n = Math.max(0, Math.min(5, parseInt(r.estrellas, 10) || 5));
    var f = document.createElement('figure');
    f.className = 'x-review';
    f.innerHTML = '<div class="x-review-stars" aria-label="' + n + ' de 5 estrellas">' + '★★★★★'.slice(0, n) + '<span style="opacity:.25">' + '★★★★★'.slice(0, 5 - n) + '</span></div>' +
      '<blockquote>“' + esc(r.texto) + '”</blockquote>' +
      '<figcaption><b>' + esc(r.nombre) + '</b>' + esc([r.evento, r.fecha].filter(Boolean).join(' · ')) + '</figcaption>';
    list.appendChild(f);
  });
  var g = sec.querySelector('[data-resenas-google]');
  if (g && typeof GOOGLE_RESENAS_URL === 'string' && GOOGLE_RESENAS_URL) { g.href = GOOGLE_RESENAS_URL; g.hidden = false; }
  sec.hidden = false;
  /* puntos del carrusel en móvil */
  if (window.matchMedia('(max-width: 760px)').matches && list.children.length > 1) {
    var dots = document.createElement('div'); dots.className = 'x-snap-dots'; dots.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < list.children.length; i++) dots.appendChild(document.createElement('i'));
    list.parentNode.insertBefore(dots, list.nextSibling);
    var mark = function () {
      var step = list.children.length > 1 ? list.children[1].offsetLeft - list.children[0].offsetLeft : 1;
      var idx = Math.round(list.scrollLeft / (step || 1));
      Array.prototype.forEach.call(dots.children, function (d, j) { d.classList.toggle('is-on', j === idx); });
    };
    list.addEventListener('scroll', function () { requestAnimationFrame(mark); }, { passive: true });
    mark();
  }
})();
