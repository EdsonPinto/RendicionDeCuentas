// Suma dos listas de tablas (por medio) agregando ingresos/egresos
export function sumarTablas(t1 = [], t2 = []) {
  const mapa = {};
  [...t1, ...t2].forEach((row) => {
    if (!mapa[row.medio]) {
      mapa[row.medio] = { medio: row.medio, ingresos: 0, egresos: 0 };
    }
    mapa[row.medio].ingresos += Number(row.ingresos || 0);
    mapa[row.medio].egresos += Number(row.egresos || 0);
  });
  return Object.values(mapa);
}

// Fusiona dos listas de entidades sumando cantidades y ordena descendente
export function fusionarEntidades(e1 = [], e2 = []) {
  const mapa = {};
  [...e1, ...e2].forEach((ent) => {
    if (!mapa[ent.nombre]) {
      mapa[ent.nombre] = { nombre: ent.nombre, cantidad: 0 };
    }
    mapa[ent.nombre].cantidad += Number(ent.cantidad || 0);
  });
  return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
}

// Suma un par {p, s} (principal/secundario)
function sumarParPS(a = {}, b = {}) {
  return {
    p: (a.p || 0) + (b.p || 0),
    s: (a.s || 0) + (b.s || 0),
  };
}

// Fusiona las métricas completas de dos entradas de un mismo magistrado
// (ej. "Fulano" y "Fulano * cambio ponente"), preservando exactamente
// el mismo cálculo de eficiencia y las mismas listas concatenadas.
export function fusionarMetricasPonente(p1, p2) {
  const finalizadosTotal =
    (p1?.metricas?.finalizados || 0) + (p2?.metricas?.finalizados || 0);
  const ingresosTotal =
    (p1?.metricas?.ingresos_totales || 0) +
    (p2?.metricas?.ingresos_totales || 0);

  return {
    metricas: {
      ingresos_totales: ingresosTotal,
      activos: (p1?.metricas?.activos || 0) + (p2?.metricas?.activos || 0),
      finalizados: finalizadosTotal,
      inconsistentes:
        (p1?.metricas?.inconsistentes || 0) +
        (p2?.metricas?.inconsistentes || 0),
      eficiencia: Math.round((finalizadosTotal / (ingresosTotal || 1)) * 100),
      lista_vigentes: [
        ...(p1?.metricas?.lista_vigentes || []),
        ...(p2?.metricas?.lista_vigentes || []),
      ],
      lista_inconsistentes: [
        ...(p1?.metricas?.lista_inconsistentes || []),
        ...(p2?.metricas?.lista_inconsistentes || []),
      ],
    },
    ing_ord: sumarParPS(p1?.ing_ord, p2?.ing_ord),
    ing_const: sumarParPS(p1?.ing_const, p2?.ing_const),
    egr_ord: sumarParPS(p1?.egr_ord, p2?.egr_ord),
    egr_const: sumarParPS(p1?.egr_const, p2?.egr_const),
    tablas: {
      ord_1: sumarTablas(p1?.tablas?.ord_1, p2?.tablas?.ord_1),
      ord_2: sumarTablas(p1?.tablas?.ord_2, p2?.tablas?.ord_2),
      const_1: sumarTablas(p1?.tablas?.const_1, p2?.tablas?.const_1),
      const_2: sumarTablas(p1?.tablas?.const_2, p2?.tablas?.const_2),
    },
    entidades: fusionarEntidades(p1?.entidades, p2?.entidades),
  };
}
