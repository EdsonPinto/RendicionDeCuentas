import React, { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  FileText,
  Info,
  RefreshCw,
  UsersRound,
} from "lucide-react";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const formatNumber = (value, maximumFractionDigits = 0) =>
  Number(value || 0).toLocaleString("es-CO", { maximumFractionDigits });
const formatDays = (value) => `${formatNumber(value, 1)} días`;
const formatPercentage = (value) => `${formatNumber(value, 2)}%`;

export function CuelloBotellaView({ token, cargaId, ponente, subViewMode }) {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarCuelloBotella = useCallback(async () => {
    if (!token) {
      setError("No hay token de autenticación.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (cargaId) params.set("carga_id", cargaId);

      if (ponente && ponente !== "General") {
        params.set("ponente", ponente);
        if (subViewMode) params.set("sub_modo", subViewMode);
      }

      // Nota: Omitimos deliberadamente los parámetros de fecha para que muestre el total histórico vigente
      const respuesta = await fetch(
        `${API_URL}/api/cuello-botella?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}));
        throw new Error(
          errorData.detail ||
            `Error al consultar cuello de botella (${respuesta.status})`,
        );
      }

      const resultado = await respuesta.json();

      if (resultado.sin_datos) {
        setDatos(null);
        return;
      }

      setDatos(resultado);
    } catch (err) {
      console.error("Error al cargar cuello de botella:", err);
      setError(err.message || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [token, cargaId, ponente, subViewMode]);

  useEffect(() => {
    cargarCuelloBotella();
  }, [cargarCuelloBotella]);

  // Descarga del Excel de vigentes sin restricciones de fecha
  const handleExportarVigentesExcel = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (cargaId) params.set("carga_id", cargaId);
      if (ponente && ponente !== "General") {
        params.set("ponente", ponente);
        if (subViewMode) params.set("sub_modo", subViewMode);
      }

      const res = await fetch(
        `${API_URL}/api/exportar-excel?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Error al generar el archivo Excel.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Procesos_Vigentes_${ponente ? ponente.replace(/\s+/g, "_") : "General"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || "No se pudo descargar el Excel.");
    }
  };

  if (loading)
    return (
      <div className="cuello-botella-container">
        <div className="cuello-botella-state">
          <RefreshCw className="cuello-loading-icon" size={30} />
          <div>
            <h2>CUELLO DE BOTELLA</h2>
            <p>Cargando información de procesos vigentes...</p>
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="cuello-botella-container">
        <div className="cuello-botella-state cuello-error-state">
          <AlertTriangle size={30} />
          <div>
            <h2>Error al cargar información</h2>
            <p>{error}</p>
          </div>
          <button onClick={cargarCuelloBotella} className="btn-action">
            <RefreshCw size={16} /> REINTENTAR
          </button>
        </div>
      </div>
    );

  if (!datos)
    return (
      <div className="cuello-botella-container">
        <div className="cuello-botella-state">
          <FileText size={32} />
          <div>
            <h2>Sin datos</h2>
            <p>
              No hay información disponible para este filtro en este momento.
            </p>
          </div>
        </div>
      </div>
    );

  const resumen = datos.resumen || {};
  const antiguedad = datos.antiguedad || [];
  const ranking = datos.ranking_ponentes || [];
  const total = Number(resumen.procesos_vigentes || 1);
  const atencionDesde = datos.umbrales?.atencion_desde ?? 180;
  const criticoDesde = datos.umbrales?.critico_desde ?? 365;

  return (
    <div className="cuello-botella-container">
      <header className="cuello-botella-header">
        <div>
          <div className="cuello-eyebrow">
            <AlertTriangle size={16} /> MONITOREO EJECUTIVO
          </div>
          <h2>CUELLO DE BOTELLA</h2>
          <p>
            Identificación de procesos vigentes con mayor antigüedad y
            concentración de carga procesal.{" "}
            {ponente && ponente !== "General"
              ? `(Vista: ${ponente})`
              : "(Vista Global)"}
          </p>
        </div>
        <div className="cuello-header-mark">
          <BarChart3 size={34} />
        </div>
      </header>

      <div className="cuello-kpi-grid">
        <div
          className="cuello-kpi-card cuello-kpi-neutral clickable-kpi"
          onClick={handleExportarVigentesExcel}
          title="Haz clic para descargar el Excel de procesos vigentes"
          style={{ cursor: "pointer" }}
        >
          <div className="cuello-kpi-top">
            <FileText size={18} />
            <span>PROCESOS VIGENTES 📥</span>
          </div>
          <strong>{formatNumber(resumen.procesos_vigentes)}</strong>
          <small>Clic para descargar Excel ➔</small>
        </div>

        <div className="cuello-kpi-card cuello-kpi-attention">
          <div className="cuello-kpi-top">
            <Clock3 size={18} />
            <span>ATENCIÓN</span>
          </div>
          <strong>{formatNumber(resumen.atencion)}</strong>
          <small>
            {formatNumber(atencionDesde)}–{formatNumber(criticoDesde - 1)} días
          </small>
        </div>
        <div className="cuello-kpi-card cuello-kpi-critical">
          <div className="cuello-kpi-top">
            <AlertTriangle size={18} />
            <span>CRÍTICOS</span>
          </div>
          <strong>{formatNumber(resumen.criticos)}</strong>
          <small>{formatNumber(criticoDesde)}+ días</small>
        </div>
        <div className="cuello-kpi-card cuello-kpi-average">
          <div className="cuello-kpi-top">
            <BarChart3 size={18} />
            <span>PROMEDIO</span>
          </div>
          <strong>{formatNumber(resumen.promedio_dias, 1)}</strong>
          <small>Antigüedad promedio</small>
        </div>
        <div className="cuello-kpi-card cuello-kpi-maximum">
          <div className="cuello-kpi-top">
            <AlertTriangle size={18} />
            <span>MÁXIMO</span>
          </div>
          <strong>{formatNumber(resumen.max_dias)}</strong>
          <small>Mayor antigüedad registrada</small>
        </div>
      </div>

      <section className="cuello-section">
        <div className="cuello-section-header">
          <h3>
            <BarChart3 size={19} /> Antigüedad de procesos
          </h3>
          <span>Umbral crítico: {formatNumber(criticoDesde)} días</span>
        </div>
        <div className="cuello-antiguedad">
          {antiguedad.map((item, index) => {
            const cantidad = Number(item.cantidad || 0);
            const porcentaje = (cantidad / total) * 100;
            return (
              <div
                className="cuello-antiguedad-row"
                key={`${item.rango}-${index}`}
              >
                <div className="cuello-antiguedad-info">
                  <strong>{item.rango} días</strong>
                  <span>
                    {formatNumber(cantidad)} procesos{" "}
                    <b>{formatPercentage(porcentaje)}</b>
                  </span>
                </div>
                <div className="cuello-barra-fondo">
                  <div
                    className="cuello-barra"
                    style={{ width: `${Math.min(porcentaje, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {(!ponente || ponente === "General") && (
        <section className="cuello-section">
          <div className="cuello-section-header">
            <h3>
              <UsersRound size={19} /> Concentración por ponente
            </h3>
            <span>Ordenado por procesos críticos</span>
          </div>
          <div className="cuello-table-wrapper">
            <table className="cuello-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>PONENTE</th>
                  <th>VIGENTES</th>
                  <th>CRÍTICOS</th>
                  <th>ATENCIÓN</th>
                  <th>% CRÍTICO</th>
                  <th>PROMEDIO</th>
                  <th>MÁXIMO</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => (
                  <tr key={`${item.ponente}-${index}`}>
                    <td>
                      <span
                        className={`cuello-rank ${index < 3 ? "top-rank" : ""}`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td>
                      <strong>{item.ponente}</strong>
                    </td>
                    <td>{formatNumber(item.procesos_vigentes)}</td>
                    <td>
                      <span className="cuello-critico">
                        {formatNumber(item.criticos)}
                      </span>
                    </td>
                    <td>{formatNumber(item.atencion)}</td>
                    <td>
                      <div className="cuello-percent-cell">
                        <span>{formatPercentage(item.porcentaje_critico)}</span>
                        <div className="cuello-percent-track">
                          <i
                            style={{
                              width: `${Math.min(Number(item.porcentaje_critico || 0), 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{formatDays(item.promedio_dias)}</td>
                    <td>{formatDays(item.max_dias)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="cuello-info">
        <strong>
          <Info size={16} /> ¿Cómo se calcula?
        </strong>
        <p>
          Un proceso se considera en <b>atención</b> cuando lleva entre{" "}
          {formatNumber(atencionDesde)} y {formatNumber(criticoDesde - 1)} días
          vigente.
        </p>
        <p>
          Un proceso se considera <b>crítico</b> cuando alcanza o supera los{" "}
          {formatNumber(criticoDesde)} días.
        </p>
      </section>
    </div>
  );
}
