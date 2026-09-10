import { useState, useCallback, useEffect } from "react";

/**
 * Estado y fetch del módulo de comparativas.
 * `active` reemplaza la condición original
 * (activeTab === "comparativa" && compSubTab === "metricas"),
 * ya que compSubTab siempre era la constante "metricas".
 */
export function useComparativa(
  API_URL,
  token,
  data,
  view,
  subViewMode,
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

  const fetchComparativa = useCallback(async () => {
    if (!token || !data) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        modo: compMode,
        desde_a: compFilters.desde_a,
        hasta_a: compFilters.hasta_a,
        ponente_a: compMode === "magistrado" ? compFilters.ponente_a : view,
        tipo_a: compMode === "magistrado" ? compFilters.tipo_a : subViewMode,
        desde_b: compFilters.desde_b,
        hasta_b: compFilters.hasta_b,
        ponente_b: compMode === "magistrado" ? compFilters.ponente_b : view,
        tipo_b: compMode === "magistrado" ? compFilters.tipo_b : subViewMode,
      }).toString();

      const res = await fetch(`${API_URL}/api/comparativa?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCompData(await res.json());
      }
    } catch (err) {
      console.error("Error al obtener comparativa:", err);
    } finally {
      setLoading(false);
    }
  }, [token, data, compMode, compFilters, view, subViewMode, API_URL, setLoading]);

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
    fetchComparativa,
  };
}
