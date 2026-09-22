import { useState, useCallback, useEffect } from "react";

export function useComparativa(
  API_URL,
  token,
  data,
  view,
  subViewMode,
  selectedExcelId,
  { setLoading, active },
) {
  const [compMode, setCompMode] = useState("periodo");
  const [compFilters, setCompFilters] = useState({
    desde_a: "",
    hasta_a: "",
    ponente_a: "General",
    tipo_a: "todos",
    desde_b: "",
    hasta_b: "",
    ponente_b: "General",
    tipo_b: "todos",
  });
  const [compData, setCompData] = useState(null);
  const [loadingComparativa, setLoadingComparativa] = useState(false);

  const construirParams = useCallback(() => {
    const params = new URLSearchParams({
      modo: compMode,
      desde_a: compFilters.desde_a,
      hasta_a: compFilters.hasta_a,
      ponente_a: compMode === "magistrado" ? compFilters.ponente_a : view,
      tipo_a: compMode === "magistrado" ? compFilters.tipo_a : subViewMode,
      desde_b: compFilters.desde_b,
      hasta_b: compFilters.hasta_b,
      ponente_b: compMode === "magistrado" ? compFilters.ponente_b : view,
      tipo_b: compMode === "magistrado" ? compFilters.tipo_b : subViewMode,
    });
    if (selectedExcelId) params.set("carga_id", selectedExcelId);
    return params;
  }, [compMode, compFilters, view, subViewMode, selectedExcelId]);

  const fetchComparativa = useCallback(async () => {
    if (!token || !data) return;
    setLoading(true);
    setLoadingComparativa(true);
    try {
      const params = construirParams();
      const res = await fetch(
        `${API_URL}/api/comparativa?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        setCompData(await res.json());
      }
    } catch (err) {
      console.error("Error al obtener comparativa:", err);
    } finally {
      setLoading(false);
      setLoadingComparativa(false);
    }
  }, [token, data, construirParams, API_URL, setLoading]);

  const exportarComparativa = useCallback(async () => {
    if (!token) return;
    try {
      const params = construirParams();
      const res = await fetch(
        `${API_URL}/api/comparativa/exportar?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.detail || "No se pudo exportar la comparación.",
        );
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comparativa_${compMode}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exportando comparativa:", err);
      alert(err.message || "No se pudo exportar la comparación.");
    }
  }, [token, construirParams, API_URL, compMode]);

  useEffect(() => {
    if (active) {
      fetchComparativa();
    }
  }, [active, fetchComparativa]);

  return {
    compMode,
    setCompMode,
    compFilters,
    setCompFilters,
    compData,
    loadingComparativa,
    fetchComparativa,
    exportarComparativa,
  };
}
