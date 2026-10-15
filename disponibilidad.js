/* Dreamscape Events — disponibilidad de fechas (la edita el propio equipo).

   Cómo usarlo:
   - ocupadas: fechas en las que ya tenéis eventos cerrados. Formato 'AAAA-MM-DD'.
     Para un rango de días: 'AAAA-MM-DD/AAAA-MM-DD' (ambos incluidos).
   - aviso: mensaje opcional que aparece encima del formulario de presupuesto rápido.
     Déjalo vacío ('') para no mostrar nada. Escribe solo lo que sea cierto en cada momento.

   Si una fecha no está en "ocupadas", la web NO afirma que esté libre:
   dice que se confirmará la disponibilidad junto con el presupuesto. */
window.DS_DISPO = {
  aviso: '',
  ocupadas: [
    // '2026-12-19',
    // '2026-12-24/2026-12-26',
  ]
};
