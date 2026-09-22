import React from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  RotateCcw,
  Info,
  Loader2,
  FileDown,
} from "lucide-react";

const FILTROS_INICIALES = {
  desde_a: "",
  hasta_a: "",
  ponente_a: "General",
  tipo_a: "todos",
  desde_b: "",
  hasta_b: "",
  ponente_b: "General",
  tipo_b: "todos",
};

const EXPLICACIONES = {
  ingresos:
    "Cantidad total de procesos ingresados en el rango o para el magistrado seleccionado.",
  egresos: "Procesos marcados como finalizados dentro del grupo seleccionado.",
  eficiencia:
    "Porcentaje de procesos finalizados sobre el total de ingresos del grupo.",
  sin_salida:
    "Procesos vigentes que no registran fecha de salida — indicador de alerta.",
};

const formatFecha = (date) => date.toISOString().slice(0, 10);

const BarraComparativa = ({ label, valorA, valorB, max, unidad = "" }) => {
  const pctA = max > 0 ? Math.min((valorA / max) * 100, 100) : 0;
  const pctB = max > 0 ? Math.min((valorB / max) * 100, 100) : 0;
  return (
    <div className="comp-chart-row">
      <span className="comp-chart-label">{label}</span>
      <div className="comp-chart-bars">
        <div className="comp-chart-bar-track">
          <div className="comp-chart-bar bar-a" style={{ width: `${pctA}%` }} />
          <span className="comp-chart-bar-value">
            {valorA}
            {unidad}
          </span>
        </div>
        <div className="comp-chart-bar-track">
          <div className="comp-chart-bar bar-b" style={{ width: `${pctB}%` }} />
          <span className="comp-chart-bar-value">
            {valorB}
            {unidad}
          </span>
        </div>
      </div>
    </div>
  );
};

export const ComparativaView = ({
  compMode,
  setCompMode,
  compFilters,
  setCompFilters,
  listaMagistradosUnicos,
  compData,
  loadingComparativa,
  onExportarComparativa,
}) => {
  const handleSwitchToMagistrado = () => {
    setCompMode("magistrado");

    const necesitaInicializar =
      !compFilters.ponente_a ||
      compFilters.ponente_a === "General" ||
      !listaMagistradosUnicos.includes(compFilters.ponente_a);

    if (necesitaInicializar && listaMagistradosUnicos.length > 0) {
      setCompFilters((prev) => ({
        ...prev,
        ponente_a: listaMagistradosUnicos[0],
        ponente_b: listaMagistradosUnicos[1] || listaMagistradosUnicos[0],
      }));
    }
  };

  const handleSwap = () => {
    setCompFilters((prev) => ({
      desde_a: prev.desde_b,
      hasta_a: prev.hasta_b,
      ponente_a: prev.ponente_b,
      tipo_a: prev.tipo_b,
      desde_b: prev.desde_a,
      hasta_b: prev.hasta_a,
      ponente_b: prev.ponente_a,
      tipo_b: prev.tipo_a,
    }));
  };

  const handleReset = () => {
    setCompFilters(FILTROS_INICIALES);
  };

  const handleAtajo = (tipo) => {
    setCompMode("periodo");
    const hoy = new Date();
    let desde_a, hasta_a, desde_b, hasta_b;

    if (tipo === "mes") {
      desde_a = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      hasta_a = hoy;
      desde_b = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      hasta_b = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    } else if (tipo === "anio") {
      desde_a = new Date(hoy.getFullYear(), 0, 1);
      hasta_a = hoy;
      desde_b = new Date(hoy.getFullYear() - 1, 0, 1);
      hasta_b = new Date(hoy.getFullYear() - 1, 11, 31);
    } else if (tipo === "30dias") {
      hasta_a = hoy;
      desde_a = new Date(hoy);
      desde_a.setDate(hoy.getDate() - 29);
      hasta_b = new Date(hoy);
      hasta_b.setDate(hoy.getDate() - 30);
      desde_b = new Date(hoy);
      desde_b.setDate(hoy.getDate() - 59);
    }

    setCompFilters((prev) => ({
      ...prev,
      desde_a: formatFecha(desde_a),
      hasta_a: formatFecha(hasta_a),
      desde_b: formatFecha(desde_b),
      hasta_b: formatFecha(hasta_b),
    }));
  };

  const grupoA = compData?.grupo_a?.metricas ?? {};
  const grupoB = compData?.grupo_b?.metricas ?? {};
  const variaciones = compData?.variaciones ?? {};
  const diferencias = compData?.diferencias ?? {};

  const sonIdenticos =
    compMode === "magistrado"
      ? compFilters.ponente_a === compFilters.ponente_b &&
        compFilters.ponente_a !== "General" &&
        compFilters.tipo_a === compFilters.tipo_b
      : Boolean(compFilters.desde_a) &&
        compFilters.desde_a === compFilters.desde_b &&
        compFilters.hasta_a === compFilters.hasta_b;

  const sinMagistrados = listaMagistradosUnicos.length === 0;

  const generarResumen = () => {
    if (!compData) return "";

    const partes = [];
    const ingresosDiff = diferencias.ingresos ?? 0;
    const egresosDiff = diferencias.egresos ?? 0;
    const sinSalidaDiff = diferencias.sin_salida ?? 0;
    const eficienciaDiff = variaciones.eficiencia_diff ?? 0;

    if (ingresosDiff !== 0) {
      partes.push(
        `los ingresos ${ingresosDiff > 0 ? "aumentaron" : "disminuyeron"} en ${Math.abs(ingresosDiff)} procesos (${variaciones.ingresos_pct >= 0 ? "+" : ""}${variaciones.ingresos_pct}%)`,
      );
    }
    if (egresosDiff !== 0) {
      partes.push(
        `los egresos ${egresosDiff > 0 ? "aumentaron" : "disminuyeron"} en ${Math.abs(egresosDiff)} procesos finalizados (${variaciones.egresos_pct >= 0 ? "+" : ""}${variaciones.egresos_pct}%)`,
      );
    }
    if (eficienciaDiff !== 0) {
      partes.push(
        `la eficiencia ${eficienciaDiff > 0 ? "mejoró" : "empeoró"} en ${Math.abs(eficienciaDiff)} puntos porcentuales`,
      );
    }
    if (sinSalidaDiff !== 0) {
      partes.push(
        `los procesos sin salida ${sinSalidaDiff > 0 ? "aumentaron" : "disminuyeron"} en ${Math.abs(sinSalidaDiff)}`,
      );
    }

    if (partes.length === 0) {
      return "No se detectaron variaciones entre la Selección A y la Selección B.";
    }

    const ultimo = partes.pop();
    const cuerpo =
      partes.length > 0 ? `${partes.join(", ")} y ${ultimo}` : ultimo;

    return `Al comparar la Selección B frente a la Selección A: ${cuerpo}.`;
  };

  const maxConteos = Math.max(
    grupoA.ingresos_totales ?? 0,
    grupoB.ingresos_totales ?? 0,
    grupoA.finalizados ?? 0,
    grupoB.finalizados ?? 0,
    grupoA.inconsistentes ?? 0,
    grupoB.inconsistentes ?? 0,
    1,
  );

  const renderSeleccion = (sufijo, titulo) => (
    <div className="comp-box">
      <h3 className="comp-box-title">{titulo}</h3>

      {compMode === "periodo" ? (
        <div className="comp-inputs">
          <input
            type="date"
            value={compFilters[`desde_${sufijo}`]}
            onChange={(e) =>
              setCompFilters({
                ...compFilters,
                [`desde_${sufijo}`]: e.target.value,
              })
            }
          />
          <span className="comp-separator">AL</span>
          <input
            type="date"
            value={compFilters[`hasta_${sufijo}`]}
            onChange={(e) =>
              setCompFilters({
                ...compFilters,
                [`hasta_${sufijo}`]: e.target.value,
              })
            }
          />
        </div>
      ) : sinMagistrados ? (
        <p className="comp-placeholder">
          Aún no hay magistrados en el catálogo. Carga un Excel para poblarlo.
        </p>
      ) : (
        <div className="comp-select-group">
          <select
            value={compFilters[`ponente_${sufijo}`]}
            onChange={(e) =>
              setCompFilters({
                ...compFilters,
                [`ponente_${sufijo}`]: e.target.value,
              })
            }
          >
            {listaMagistradosUnicos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={compFilters[`tipo_${sufijo}`]}
            onChange={(e) =>
              setCompFilters({
                ...compFilters,
                [`tipo_${sufijo}`]: e.target.value,
              })
            }
          >
            <option value="todos">
              🔀 Todos (Principales + Cambio Ponente)
            </option>
            <option value="principal">📌 Solo Principales</option>
            <option value="cambio">🔄 Solo Cambio Ponente</option>
          </select>
        </div>
      )}
    </div>
  );

  const renderCard = (
    titulo,
    explicacionKey,
    valorA,
    valorB,
    variacionKey,
    diffKey,
    { esPorcentaje = true, invertirGanador = false } = {},
  ) => {
    const variacion = variaciones[variacionKey] ?? 0;
    const diferencia = diffKey ? diferencias[diffKey] : null;
    const positivo = variacion >= 0;

    let ganadorA = valorA > valorB;
    let ganadorB = valorB > valorA;
    if (invertirGanador) {
      [ganadorA, ganadorB] = [ganadorB, ganadorA];
    }

    return (
      <div className="comp-card">
        <h4 className="comp-card-title">
          {titulo}
          <span
            className="comp-info-icon"
            title={EXPLICACIONES[explicacionKey]}
          >
            <Info size={13} />
          </span>
        </h4>
        <div className="comp-values">
          <span className={`val-a${ganadorA ? " val-winner" : ""}`}>
            {valorA}
            {esPorcentaje ? "%" : ""}
          </span>
          <span className="arrow">➔</span>
          <span className={`val-b${ganadorB ? " val-winner" : ""}`}>
            {valorB}
            {esPorcentaje ? "%" : ""}
          </span>
        </div>
        <div className={`badge ${positivo ? "pos" : "neg"}`}>
          {positivo ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {positivo && variacionKey === "eficiencia_diff" ? "+" : ""}
          {variacion}
          {variacionKey === "eficiencia_diff" ? "% diff" : "%"}
          {diferencia !== null && (
            <span className="badge-diff">
              ({diferencia >= 0 ? "+" : ""}
              {diferencia})
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="analysis-layout">
      <div className="comp-header">
        <h2 className="comp-title">
          MÓDULO DE ANÁLISIS BIVALENTE Y COMPARATIVAS
        </h2>
        <div className="mode-selector">
          <button
            className={`mode-btn ${compMode === "periodo" ? "active" : ""}`}
            onClick={() => setCompMode("periodo")}
          >
            🗓️ PERÍODO VS PERÍODO
          </button>
          <button
            className={`mode-btn ${compMode === "magistrado" ? "active" : ""}`}
            onClick={handleSwitchToMagistrado}
          >
            👨‍⚖️ MAGISTRADO VS MAGISTRADO
          </button>
        </div>
      </div>

      <div className="comp-shortcuts">
        <span className="comp-shortcuts-label">Atajos:</span>
        <button
          className="comp-shortcut-btn"
          onClick={() => handleAtajo("mes")}
        >
          Este mes vs mes anterior
        </button>
        <button
          className="comp-shortcut-btn"
          onClick={() => handleAtajo("anio")}
        >
          Este año vs año anterior
        </button>
        <button
          className="comp-shortcut-btn"
          onClick={() => handleAtajo("30dias")}
        >
          Últimos 30 días vs 30 anteriores
        </button>
      </div>

      {sonIdenticos && (
        <div className="comp-warning">
          ⚠️ Estás comparando la misma selección en A y B — los resultados serán
          idénticos.
        </div>
      )}

      <div className="comp-controls-grid">
        {renderSeleccion("a", "SELECCIÓN A (BASE)")}
        <div className="comp-vs-column">
          <div className="vs-badge">VS</div>
          <button
            type="button"
            className="comp-swap-btn"
            onClick={handleSwap}
            title="Intercambiar Selección A y B"
          >
            <ArrowLeftRight size={16} />
          </button>
        </div>
        {renderSeleccion("b", "SELECCIÓN B (COMPARADO)")}
      </div>

      <div className="comp-actions-row">
        <button type="button" className="comp-reset-btn" onClick={handleReset}>
          <RotateCcw size={14} /> Limpiar filtros
        </button>
        {compData && (
          <button
            type="button"
            className="comp-export-btn"
            onClick={onExportarComparativa}
          >
            <FileDown size={14} /> Exportar comparación a Excel
          </button>
        )}
      </div>

      {loadingComparativa && (
        <div className="comp-loading">
          <Loader2 className="spinner" size={20} /> Calculando comparación...
        </div>
      )}

      {!loadingComparativa && compData ? (
        <>
          <p className="comp-resumen">{generarResumen()}</p>

          <div className="comp-cards-grid">
            {renderCard(
              "INGRESOS TOTALES",
              "ingresos",
              grupoA.ingresos_totales ?? 0,
              grupoB.ingresos_totales ?? 0,
              "ingresos_pct",
              "ingresos",
              { esPorcentaje: false },
            )}
            {renderCard(
              "EGRESOS (FINALIZADOS)",
              "egresos",
              grupoA.finalizados ?? 0,
              grupoB.finalizados ?? 0,
              "egresos_pct",
              "egresos",
              { esPorcentaje: false },
            )}
            {renderCard(
              "EFICIENCIA PROCESAL",
              "eficiencia",
              grupoA.eficiencia ?? 0,
              grupoB.eficiencia ?? 0,
              "eficiencia_diff",
              null,
              { esPorcentaje: true },
            )}
            {renderCard(
              "PROCESOS SIN SALIDA",
              "sin_salida",
              grupoA.inconsistentes ?? 0,
              grupoB.inconsistentes ?? 0,
              "sin_salida_pct",
              "sin_salida",
              { esPorcentaje: false, invertirGanador: true },
            )}
          </div>

          <div className="comp-chart-box">
            <h3 className="comp-box-title">COMPARACIÓN VISUAL</h3>
            <div className="comp-chart-legend">
              <span className="legend-item">
                <span className="legend-dot dot-a" /> Selección A
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-b" /> Selección B
              </span>
            </div>
            <BarraComparativa
              label="Ingresos Totales"
              valorA={grupoA.ingresos_totales ?? 0}
              valorB={grupoB.ingresos_totales ?? 0}
              max={maxConteos}
            />
            <BarraComparativa
              label="Egresos (Finalizados)"
              valorA={grupoA.finalizados ?? 0}
              valorB={grupoB.finalizados ?? 0}
              max={maxConteos}
            />
            <BarraComparativa
              label="Sin Salida"
              valorA={grupoA.inconsistentes ?? 0}
              valorB={grupoB.inconsistentes ?? 0}
              max={maxConteos}
            />
            <BarraComparativa
              label="Eficiencia"
              valorA={grupoA.eficiencia ?? 0}
              valorB={grupoB.eficiencia ?? 0}
              max={100}
              unidad="%"
            />
          </div>
        </>
      ) : (
        !loadingComparativa && (
          <p className="comp-empty">
            Ajusta los filtros de Selección A y B para ver la comparación.
          </p>
        )
      )}
    </div>
  );
};
