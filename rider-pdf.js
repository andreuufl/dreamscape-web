/* Rider técnico en PDF — Dreamscape Events
   Genera un documento A4 de 3 páginas con jsPDF (vectorial): portada con el montaje en 3D,
   resumen y equipo recomendado, y presupuesto orientativo "desde" (tarifa 2026, sin IVA).
   Los precios solo viven en este archivo descargado; la web no los muestra. */
(function () {
  'use strict';
  var INK = [10, 10, 11], PAPER = [236, 231, 222], GOLD = [201, 166, 107], GOLDD = [107, 80, 38],
      CREAM = [248, 245, 239], MUTE = [96, 91, 83], LINE = [212, 205, 192];
  var WA = 'https://wa.me/34613089894';
  var JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var QR = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

  function loadScript(src, ok) {
    if (ok()) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function eur(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €'; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- Cálculo del equipo y de la estimación (tarifa 2026, precios "desde", sin IVA) ---------- */
  function plan(d) {
    var g = d.guests, tipo = d.t, has = function (k) { return d.keys.indexOf(k) !== -1; };
    var heads = Math.max(4, Math.min(12, Math.round(g / 60) * 2));
    var w = Math.round(clamp(3 + g / 120, 4, 12)), dp = Math.round(clamp(2.5 + g / 400, 2.5, 6) * 2) / 2;
    var ledM2 = { congreso: 10, empresa: 6, boda: 4, concierto: 8 }[tipo] || 6;
    var stage = /Sin/.test(d.escenario) ? 0 : /20-40/.test(d.escenario) ? 1 : 2;
    var outdoor = /Exterior/.test(d.recinto);
    var eq = [], px = [], open = 0;

    if (has('sonido')) {
      var spk = g < 120 ? '2 cajas full-range + 1 subgrave' : g < 400 ? 'PA estéreo con 2 subgraves' : 'Line array de ' + Math.min(8, 4 + Math.round(g / 400)) + ' cajas por lado + subgraves';
      var mics = tipo === 'congreso' ? 'micro de atril + 2 diademas inalámbricas' : tipo === 'boda' ? '2 micrófonos inalámbricos para discursos' : tipo === 'concierto' ? 'microfonía y monitores para la banda' : '2 micrófonos inalámbricos';
      eq.push(['Sonido', spk + ' · ' + mics + ' · mesa de mezclas']);
      if (g <= 100) px.push(['Sonido', 'Sistema compacto · hasta 100 personas', 190]);
      else if (g <= 250) px.push(['Sonido', 'Sistema medio · hasta 250 personas', 390]);
      else if (g <= 500) px.push(['Sonido', 'Sistema grande · hasta 500 personas + mesa digital', 650 + 160]);
      else { px.push(['Sonido', 'Line array dimensionado según aforo y acústica', null]); open++; }
      if (tipo === 'congreso' || tipo === 'boda') px.push(['Microfonía', 'Pack de 4 micrófonos inalámbricos', 200]);
      else if (tipo === 'concierto') px.push(['Microfonía y monitores', '2 micrófonos de mano + 2 monitores de escenario', 200]);
      else px.push(['Microfonía', '2 micrófonos inalámbricos de mano', 110]);
    }
    if (has('luz')) {
      eq.push(['Iluminación', heads + ' cabezas móviles' + (tipo === 'boda' ? ' + uplighting IP65 de ambiente' : ' + wash escénico') + ' · control DMX desde cabina']);
      px.push(['Iluminación', heads + ' cabezas móviles' + (tipo === 'boda' ? ' + pack uplighting 10 focos IP65' : ' + 4 focos PAR LED'), heads * 60 + (tipo === 'boda' ? 250 : 80)]);
    }
    if (stage) {
      eq.push(['Escenario', (stage === 1 ? 'Tarima baja de 20–40 cm' : 'Escenario de 60 cm o más') + ' · ' + w + ' × ' + dp + ' m con faldón']);
      px.push(['Escenario', 'Tarima modular con faldón · ' + (w * dp) + ' m²', w * dp * 18]);
    } else eq.push(['Escenario', 'Sin tarima · zona de pista o de servicio']);
    if (has('rigging')) {
      eq.push(['Estructuras', 'Truss en pórtico y rigging dimensionado según el recinto']);
      px.push(['Estructuras y rigging', 'Truss y rigging según proyecto y recinto', null]); open++;
    }
    if (has('video')) {
      eq.push(['Pantalla LED', ledM2 + ' m² tras el escenario · pitch ' + (outdoor ? '3,9 exterior' : '2,9 interior') + ' · procesador y estructura']);
      px.push(['Pantalla LED', ledM2 + ' m² · ' + (outdoor ? 'exterior, alta luminosidad' : 'interior, pitch 2,9'), ledM2 * (outdoor ? 125 : 150)]);
    }
    var techs = [];
    if (has('sonido') || has('luz')) {
      var n = has('sonido') && has('luz') && g >= 250 ? 2 : 1;
      techs.push(n + (n > 1 ? ' técnicos' : ' técnico') + ' de sonido e iluminación');
      px.push(['Técnico en cabina', n + (n > 1 ? ' técnicos' : ' técnico') + ' · jornada de hasta 8 h · 280 € cada uno', n * 280]);
    }
    if (has('video')) { techs.push('técnico de vídeo'); px.push(['Técnico de vídeo', 'Operador de pantalla LED · jornada · 280 €', 280]); }
    eq.push(['Equipo humano', (techs.join(' y ') || 'Técnico') + ' presentes durante todo el evento']);
    px.push(['Desplazamiento', 'Barcelona y área metropolitana · otros destinos a presupuesto', 90]);

    var total = 0; px.forEach(function (r) { if (r[2] != null) total += r[2]; });
    var pack = null;
    if (tipo === 'boda' && g <= 250) pack = ['Pack Boda Completa', 'DJ, luz de fiesta, humo y técnico incluido', 1950 + 280];
    else if (tipo === 'empresa' && g <= 250) pack = ['Pack Evento Corporativo', 'Sonido, luz, LED 6 m² y técnico incluido', 2200 + 280];
    else if (tipo === 'congreso' && g <= 300) pack = ['Pack Congreso (por jornada)', 'Sonido, luz, LED 10 m² y 2 técnicos incluidos', 3600 + 560];
    else if (tipo === 'concierto' && g <= 250) pack = ['Pack Fiesta o Evento con DJ', 'DJ, 4 cabezas, PAR, humo y técnico incluido', 1250 + 280];
    return { eq: eq, px: px, total: total, open: open, pack: pack, w: w, dp: dp };
  }

  /* ---------- Piezas de maquetación ---------- */
  function fill(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
  function ink(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
  function stroke(doc, c, w) { doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(w); }
  function tr(doc, txt, x, y, sp, opt) { var o = { charSpace: sp || 0 }; if (opt) for (var k in opt) o[k] = opt[k]; doc.text(txt, x, y, o); }

  function trR(doc, txt, xr, y, sp) { var w = doc.getTextWidth(txt) + sp * (txt.length - 1); doc.text(txt, xr - w, y, { charSpace: sp }); }
  function trC(doc, txt, xc, y, sp) { var w = doc.getTextWidth(txt) + sp * (txt.length - 1); doc.text(txt, xc - w / 2, y, { charSpace: sp }); }

  function chrome(doc, page, ref) {
    // cabecera
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); ink(doc, INK); tr(doc, 'DREAMSCAPE', 18, 16, 1.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); ink(doc, GOLDD); tr(doc, 'EVENTS & PRODUCTIONS', 18, 19.6, 1.6);
    doc.setFontSize(6.6); ink(doc, MUTE); trR(doc, 'RIDER TÉCNICO · ' + ref, 192, 16, 1);
    stroke(doc, GOLD, 0.5); doc.line(18, 24, 192, 24);
    // pie
    stroke(doc, LINE, 0.25); doc.line(18, 281, 192, 281);
    doc.setFontSize(6.4); ink(doc, MUTE);
    doc.text('Dreamscape Events and Complete Productions, S.L. · NIF B19859115 · Vallirana (Barcelona)', 18, 286);
    doc.text('info@dreamscapeevents.es · +34 613 08 98 94 · www.dreamscapeevents.es', 18, 290);
    doc.setFont('helvetica', 'bold'); ink(doc, GOLDD); doc.text(page + ' / 3', 192, 286, { align: 'right' });
  }
  function heading(doc, n, title, y) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); ink(doc, GOLDD); tr(doc, n, 18, y, 1.2);
    doc.setFontSize(17); ink(doc, INK); doc.text(title, 18, y + 8);
    return y + 15;
  }
  function field(doc, label, value, x, y, w) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); ink(doc, GOLDD); tr(doc, label.toUpperCase(), x, y, 1.1);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); ink(doc, INK);
    var lines = doc.splitTextToSize(value, w); doc.text(lines, x, y + 5.2);
    return lines.length;
  }

  /* ---------- Documento ---------- */
  function build(jsPDF, d, img, qr) {
    var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    var p = plan(d);
    var now = new Date();
    var ref = 'DS-' + String(now.getFullYear()).slice(2) + ('0' + (now.getMonth() + 1)).slice(-2) + ('0' + now.getDate()).slice(-2) + '-' + Math.floor(1000 + Math.random() * 9000);
    var hoy = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    /* ===== Portada ===== */
    fill(doc, INK); doc.rect(0, 0, 210, 297, 'F');
    // halo dorado suave
    for (var hi = 0; hi < 16; hi++) {
      doc.setGState && doc.setGState(new doc.GState({ opacity: 0.011 }));
      fill(doc, GOLD); doc.circle(150, 40, 80 - hi * 4.6, 'F');
    }
    doc.setGState && doc.setGState(new doc.GState({ opacity: 1 }));
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); ink(doc, PAPER); tr(doc, 'DREAMSCAPE', 18, 26, 2.2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); ink(doc, GOLD); tr(doc, 'EVENTS & PRODUCTIONS', 18, 31.5, 2.6);
    doc.setFontSize(7); trR(doc, 'RIDER TÉCNICO · EDICIÓN 2026', 192, 26, 1.6);
    stroke(doc, GOLD, 0.4); doc.line(18, 38, 192, 38);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(56); ink(doc, PAPER); tr(doc, 'RIDER', 18, 72, -0.6);
    ink(doc, GOLD); tr(doc, 'TÉCNICO', 18, 94, -0.6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); ink(doc, [201, 195, 184]);
    doc.text('Propuesta técnica orientativa para tu evento', 18, 106);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); ink(doc, PAPER);
    doc.text(d.tipo + '  ·  ' + d.recinto + '  ·  ' + d.guests + ' personas', 18, 114);
    doc.setFont('helvetica', 'normal'); ink(doc, GOLD); doc.text(d.fecha, 18, 120.5);

    // imagen 3D
    var ix = 18, iy = 130, iw = 174, ih = 94;
    if (img) {
      doc.addImage(img, 'JPEG', ix, iy, iw, ih, undefined, 'FAST');
    } else {
      fill(doc, [20, 20, 22]); doc.rect(ix, iy, iw, ih, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); ink(doc, GOLD); trC(doc, 'MONTAJE ORIENTATIVO', 105, iy + ih / 2, 1.6);
    }
    stroke(doc, GOLD, 0.35); doc.rect(ix, iy, iw, ih, 'S');
    // esquinas doradas
    stroke(doc, GOLD, 1.1);
    [[ix, iy, 1, 1], [ix + iw, iy, -1, 1], [ix, iy + ih, 1, -1], [ix + iw, iy + ih, -1, -1]].forEach(function (c) {
      doc.line(c[0], c[1], c[0] + 6 * c[2], c[1]); doc.line(c[0], c[1], c[0], c[1] + 6 * c[3]);
    });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); ink(doc, GOLD);
    tr(doc, 'MONTAJE ORIENTATIVO EN 3D  ·  ' + d.tipo.toUpperCase() + '  ·  ' + d.guests + ' PERSONAS', 18, 230, 1.3);

    // tres datos clave
    var cols = [['ASISTENTES', String(d.guests)], ['ESPACIO', d.recinto.split(' /')[0]], ['POTENCIA ESTIMADA', '~' + String(d.kw).replace('.', ',') + ' kW']];
    cols.forEach(function (c, i) {
      var x = 18 + i * 60;
      stroke(doc, GOLD, 0.3); doc.line(x, 243, x + 52, 243);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); ink(doc, GOLD); tr(doc, c[0], x, 249, 1.3);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17); ink(doc, PAPER); doc.text(c[1], x, 259);
    });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); ink(doc, [150, 145, 135]);
    doc.text('Dreamscape Events and Complete Productions, S.L. · NIF B19859115 · Vallirana (Barcelona)', 18, 284);
    doc.text('Ref. ' + ref + '  ·  Generado el ' + hoy + '  ·  Válido 30 días', 18, 288.5);
    doc.setFont('helvetica', 'bold'); ink(doc, GOLD); doc.text('www.dreamscapeevents.es', 192, 288.5, { align: 'right' });

    /* ===== Página 2: resumen, equipo, recinto ===== */
    doc.addPage(); fill(doc, CREAM); doc.rect(0, 0, 210, 297, 'F'); chrome(doc, 2, ref);
    var y = heading(doc, '01', 'Resumen del evento', 36);
    var fields = [['Fecha prevista', d.fecha], ['Tipo de evento', d.tipo], ['Espacio', d.recinto], ['Escenario', d.escenario],
      ['Duración', d.duracion], ['Asistentes', d.guests + ' personas'], ['Rider solicitado', d.riders.join(' · ') || 'Sin seleccionar'], ['Potencia eléctrica', d.potencia]];
    var rowH = 15.5;
    fields.forEach(function (f, i) {
      var cx = 18 + (i % 2) * 90, cy = y + Math.floor(i / 2) * rowH;
      field(doc, f[0], f[1], cx, cy, 82);
      stroke(doc, LINE, 0.25); doc.line(cx, cy + 10.4, cx + 82, cy + 10.4);
    });
    y += Math.ceil(fields.length / 2) * rowH + 6;

    y = heading(doc, '02', 'Equipo recomendado', y);
    p.eq.forEach(function (r) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2);
      var lines = doc.splitTextToSize(r[1], 120), h = Math.max(9, lines.length * 4.4 + 4.6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); ink(doc, GOLDD); tr(doc, r[0].toUpperCase(), 18, y + 4.6, 1.1);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2); ink(doc, INK); doc.text(lines, 66, y + 4.6);
      stroke(doc, LINE, 0.25); doc.line(18, y + h, 192, y + h);
      y += h;
    });
    y += 8;

    y = heading(doc, '03', 'Qué necesitamos del recinto', y);
    var needs = ['Horario permitido de montaje y desmontaje', 'Planos o fotos del espacio y de los accesos de carga',
      'Altura libre y puntos de anclaje disponibles', 'Tomas eléctricas y potencia contratada (' + d.potencia + ')', 'Contacto técnico del recinto y normas de ruido'];
    needs.forEach(function (n, i) {
      var cy = y + i * 8.2;
      stroke(doc, GOLDD, 0.45); doc.rect(18, cy - 3.2, 3.8, 3.8, 'S');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.4); ink(doc, INK); doc.text(n, 26, cy);
    });

    /* ===== Página 3: presupuesto orientativo ===== */
    doc.addPage(); fill(doc, CREAM); doc.rect(0, 0, 210, 297, 'F'); chrome(doc, 3, ref);
    y = heading(doc, '04', 'Presupuesto orientativo', 36);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); ink(doc, MUTE);
    doc.text(doc.splitTextToSize('Estimación por jornada a partir de nuestra tarifa de equipos 2026. Precios «desde», sin IVA; el importe final se ajusta a tu recinto, aforo, horario y accesos.', 174), 18, y - 2);
    y += 8;
    // cabecera de tabla
    fill(doc, INK); doc.rect(18, y, 174, 7.4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); ink(doc, GOLD);
    tr(doc, 'CONCEPTO', 22, y + 4.9, 1.2); tr(doc, 'DETALLE', 66, y + 4.9, 1.2); trR(doc, 'DESDE', 188, y + 4.9, 1.2);
    y += 7.4;
    p.px.forEach(function (r, i) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8);
      var lines = doc.splitTextToSize(r[1], 92), h = Math.max(9, lines.length * 4.2 + 4.4);
      if (i % 2 === 0) { fill(doc, [241, 237, 229]); doc.rect(18, y, 174, h, 'F'); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8); ink(doc, INK); doc.text(r[0], 22, y + 5.8);
      doc.setFont('helvetica', 'normal'); ink(doc, MUTE); doc.text(lines, 66, y + 5.8);
      doc.setFont('helvetica', 'bold'); ink(doc, r[2] == null ? GOLDD : INK);
      doc.text(r[2] == null ? 'A presupuesto' : eur(r[2]), 188, y + 5.8, { align: 'right' });
      y += h;
    });
    // total
    y += 3;
    fill(doc, INK); doc.rect(18, y, 174, 21, 'F'); fill(doc, GOLD); doc.rect(18, y, 2.2, 21, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); ink(doc, GOLD); tr(doc, 'ESTIMACIÓN ORIENTATIVA POR JORNADA', 26, y + 7.4, 1.4);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(21); ink(doc, PAPER); doc.text('desde ' + eur(p.total), 26, y + 16.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); ink(doc, [201, 195, 184]);
    doc.text('+ IVA' + (p.open ? ' · más partidas a presupuesto' : ''), 188, y + 16.4, { align: 'right' });
    y += 21;
    var nota = d.duracion === '1 jornada' ? '' : 'Duración elegida: ' + d.duracion.toLowerCase() + '. Para varias jornadas aplicamos tarifa multi-jornada: consúltanos.';
    if (nota) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8); ink(doc, MUTE); doc.text(nota, 18, y + 5.6); y += 6; }
    y += 6;
    if (p.pack) {
      stroke(doc, GOLDD, 0.4); doc.rect(18, y, 174, 14, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4); ink(doc, GOLDD); tr(doc, 'PACK DE REFERENCIA', 22, y + 5.2, 1.2);
      doc.setFontSize(9.6); ink(doc, INK); doc.text(p.pack[0], 22, y + 10.6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); ink(doc, MUTE); doc.text(doc.splitTextToSize(p.pack[1], 78)[0], 70, y + 10.6);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); ink(doc, INK); doc.text('desde ' + eur(p.pack[2]) + ' + IVA', 188, y + 10.6, { align: 'right' });
      y += 20;
    }
    // condiciones
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); ink(doc, GOLDD); tr(doc, 'CONDICIONES', 18, y + 2, 1.4); y += 6.6;
    ['Todos los precios son «desde» y orientativos; no incluyen IVA (21 %).',
     'El presupuesto final tiene una validez de 30 días y se confirma tras revisar el recinto.',
     'En fechas de alta demanda (primavera-verano, congresos y Navidad), recomendamos reservar con semanas de antelación.']
      .forEach(function (t) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); ink(doc, MUTE);
        var l = doc.splitTextToSize(t, 166); fill(doc, GOLD); doc.circle(19.4, y - 0.9, 0.55, 'F'); doc.text(l, 23, y); y += l.length * 3.9 + 1.6;
      });
    // siguiente paso
    y = Math.max(y + 4, 214);
    var bh = 52; fill(doc, INK); doc.rect(18, y, 174, bh, 'F'); stroke(doc, GOLD, 0.35); doc.rect(18, y, 174, bh, 'S');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); ink(doc, GOLD); tr(doc, 'SIGUIENTE PASO', 26, y + 9, 1.6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); ink(doc, PAPER);
    doc.text(['¿Tienes fecha y lugar?', 'Del resto nos encargamos.'], 26, y + 18);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); ink(doc, [201, 195, 184]);
    doc.text(doc.splitTextToSize('Cuéntanos tu fecha y recinto y te enviamos propuesta técnica y presupuesto, normalmente en menos de 24 horas.', 104), 26, y + 31);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.6); ink(doc, GOLD);
    doc.text('WhatsApp +34 613 08 98 94', 26, y + 43); ink(doc, PAPER); doc.text('info@dreamscapeevents.es', 84, y + 43);
    if (qr) {
      var n = qr.getModuleCount(), cell = 28 / n, qx = 192 - 28 - 7, qy = y + 7;
      fill(doc, PAPER); doc.rect(qx - 2.2, qy - 2.2, 32.4, 32.4, 'F');
      fill(doc, INK);
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) doc.rect(qx + c * cell, qy + r * cell, cell + 0.02, cell + 0.02, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); ink(doc, GOLD); trC(doc, 'ESCANEA · WHATSAPP', qx + 14, y + 46.4, 0.9);
      doc.link(qx, qy, 28, 28, { url: WA });
    }
    doc.link(26, y + 39.4, 55, 5, { url: WA }); doc.link(84, y + 39.4, 40, 5, { url: 'mailto:info@dreamscapeevents.es' });

    doc.setProperties({ title: 'Rider técnico · Dreamscape Events', author: 'Dreamscape Events and Complete Productions, S.L.', subject: 'Propuesta técnica orientativa', creator: 'www.dreamscapeevents.es' });
    return doc;
  }

  window.DSRider = {
    generate: function (raw, done, fail) {
      var d = {
        t: raw.t, tipo: raw.tipo, recinto: raw.recinto, escenario: raw.escenario, duracion: raw.duracion, fecha: raw.fecha,
        guests: raw.guests, keys: raw.keys, riders: raw.riders, kw: raw.kw, potencia: raw.potencia
      };
      loadScript(JSPDF, function () { return !!window.jspdf; }).then(function () {
        return loadScript(QR, function () { return !!window.qrcode; }).catch(function () {});
      }).then(function () {
        var img = null, qr = null;
        try { if (window.DS_SIM3D) img = window.DS_SIM3D.snapshot(1400, 760); } catch (e) {}
        try { if (window.qrcode) { qr = window.qrcode(0, 'M'); qr.addData(WA + '?text=' + encodeURIComponent('Hola Dreamscape Events, he descargado mi rider técnico y quiero presupuesto.')); qr.make(); } } catch (e) { qr = null; }
        var doc = build(window.jspdf.jsPDF, d, img, qr);
        doc.save('rider-tecnico-dreamscape.pdf');
        if (done) done();
      }).catch(function (e) { if (fail) fail(e); });
    }
  };
})();
