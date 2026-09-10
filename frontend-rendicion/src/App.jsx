import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  ShieldCheck,
  FileUp,
  Loader2,
  LogOut,
  Database,
  AlertTriangle,
  Download,
} from "lucide-react";
import "./styles/globals.css";
import "./styles/App.css";

// Importación de Vistas y Componentes modularizados
import { LoginView } from "./components/LoginView";
import { ProcesoModal } from "./components/ProcesoModal";
import { GestionView } from "./components/GestionView";
import { AnalisisView } from "./components/AnalisisView";
import { ComparativaView } from "./components/ComparativaView";
import { AdminCrudView } from "./components/AdminCrudView";
import { CuelloBotellaView } from "./components/CuelloBotellaView";
import { AppTabs } from "./components/AppTabs";
import { GlobalFilters } from "./components/GlobalFilters";
import { derivarMagistrados } from "./utils/ponentes";
import { fusionarMetricasPonente } from "./utils/tableHelpers";

import { useAuth } from "./hooks/useAuth";
import { useAdminCrud } from "./hooks/useAdminCrud";
import { useComparativa } from "./hooks/useComparativa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    token,
    username,
    setUsername,
    password,
    setPassword,
    userProfile,
    handleLogin,
    handleLogout,
    fetchUserProfile,
  } = useAuth(API_URL, { setLoading, setError });

  const [data, setData] = useState(null);
  const [view, setView] = useState("General");
  const [subViewMode, setSubViewMode] = useState("principal");
  const [activeTab, setActiveTab] = useState("gestion");
  const [dates, setDates] = useState({ desde: "", hasta: "" });

  // ESTADOS FILTROS Y BÚSQUEDA
  const [searchEntidadFiltro, setSearchEntidadFiltro] = useState("");
  const [searchRadicadoFiltro, setSearchRadicadoFiltro] = useState("");
  const [filterSinSalidaOnly, setFilterSinSalidaOnly] = useState(false);
  const [limitVigentes, setLimitVigentes] = useState(50);

  // ESTADO PARA MODAL DE DETALLE DE PROCESO
  const [selectedProceso, setSelectedProceso] = useState(null);

  // ESTADO PARA FORZAR RECARGA DE EXCEL EN COMPONENTE HIJO
  const [refreshExcelKey, setRefreshExcelKey] = useState(0);

  const {
    usuariosList,
    magistradosList,
    setMagistradosList,
    nuevoMagistradoInput,
    setNuevoMagistradoInput,
    usrForm,
    setUsrForm,
    editingUsr,
    fetchAdminData,
    handleSaveUsuario,
    handleEditUsuarioClick,
    handleVincularMagistrado,
    handleDeleteUsuario,
    handleAddMagistrado,
    handleDeleteMagistrado,
    syncMagistradosCatalog,
  } = useAdminCrud(API_URL, token, { setLoading });

  const {
    compMode,
    setCompMode,
    compFilters,
    setCompFilters,
    compData,
  } = useComparativa(API_URL, token, data, view, subViewMode, {
    setLoading,
    active: activeTab === "comparativa",
  });

  const syncedCatalogKeysRef = useRef(new Set());
  const inFlightCatalogKeysRef = useRef(new Set());

  const fetchStats = useCallback(
    async (d = dates.desde, h = dates.hasta, currentToken = token) => {
      if (!currentToken) return;
      try {
        const res = await fetch(
          `${API_URL}/api/estadisticas?desde=${d}&hasta=${h}`,
          { headers: { Authorization: `Bearer ${currentToken}` } },
        );
        if (res.status === 401) {
          handleLogout();
          return;
        }
        if (res.ok) {
          const result = await res.json();
          if (!result.error) {
            setData(result);
          }
        }
      } catch (err) {
        console.error("Error obteniendo estadísticas:", err);
      }
    },
    [dates.desde, dates.hasta, token, handleLogout],
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !token) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("es_global", "true");

      const res = await fetch(`${API_URL}/api/excel/subir-archivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`Error al subir: ${res.status}`);

      await fetchStats(dates.desde, dates.hasta, token);
      setRefreshExcelKey((prev) => prev + 1);
      setActiveTab("gestion");
    } catch (err) {
      setError(err.message || "Error al subir el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleExcelDeletedCleanup = () => {
    setData(null);
    localStorage.removeItem("selected_excel_id");
  };

  const handleExportExcel = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/exportar-excel?desde=${dates.desde}&hasta=${dates.hasta}&ponente=${view}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Error al generar Excel.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Rendicion_${view.replace(/\s+/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carga perfil + estadísticas al iniciar sesión / cambiar token o fechas.
  useEffect(() => {
    if (token) {
      fetchUserProfile(token, {
        onAdmin: () => {
          setActiveTab("admin_crud");
          fetchAdminData(token);
        },
        onUser: () => setActiveTab("gestion"),
      });
      fetchStats(dates.desde, dates.hasta, token);
    }
  }, [token, fetchUserProfile, fetchAdminData, fetchStats, dates.desde, dates.hasta]);

  // Sincroniza el catálogo de magistrados derivado del Excel cargado
  // (solo para admin), evitando duplicar sincronizaciones ya hechas.
  useEffect(() => {
    if (userProfile?.rol !== "admin" || !data?.lista_ponentes?.length) return;
    const catalogoDerivado = derivarMagistrados(data.lista_ponentes);
    if (!catalogoDerivado.length) return;

    setMagistradosList(catalogoDerivado);
    const syncKey = `${token}:${JSON.stringify(catalogoDerivado)}`;
    if (
      syncedCatalogKeysRef.current.has(syncKey) ||
      inFlightCatalogKeysRef.current.has(syncKey)
    )
      return;

    inFlightCatalogKeysRef.current.add(syncKey);
    syncMagistradosCatalog(catalogoDerivado)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Error sincronizando catálogo (${res.status})`);
        syncedCatalogKeysRef.current.add(syncKey);
        setMagistradosList(catalogoDerivado);
      })
      .catch((err) => {
        console.error("Error sincronizando catálogo de magistrados:", err);
      })
      .finally(() => {
        inFlightCatalogKeysRef.current.delete(syncKey);
      });
  }, [data, userProfile, token, setMagistradosList, syncMagistradosCatalog]);

  const listaMagistradosUnicos = useMemo(() => {
    if (!data?.lista_ponentes) return [];
    return derivarMagistrados(data.lista_ponentes);
  }, [data]);

  const resolverDatosMagistrado = useCallback(
    (nombreMag, subModo) => {
      if (!data?.general) return null;
      if (nombreMag === "General") return data.general;

      const keysMatching = Object.keys(data.ponentes || {}).filter((k) => {
        const base = k.replace(/\s*\*?\s*cambio\s+ponente/gi, "").trim();
        return base.toLowerCase() === nombreMag.toLowerCase();
      });

      if (keysMatching.length === 0) return data.ponentes[nombreMag] || null;

      if (subModo === "principal") {
        const keyPrin = keysMatching.find((k) => !/cambio\s+ponente/i.test(k));
        return keyPrin ? data.ponentes[keyPrin] : null;
      }
      if (subModo === "cambio") {
        const keyCambio = keysMatching.find((k) => /cambio\s+ponente/i.test(k));
        return keyCambio ? data.ponentes[keyCambio] : null;
      }

      if (keysMatching.length === 1) return data.ponentes[keysMatching[0]] || null;

      return fusionarMetricasPonente(
        data.ponentes[keysMatching[0]],
        data.ponentes[keysMatching[1]],
      );
    },
    [data],
  );

  const keysMatchingView = useMemo(() => {
    if (view === "General" || !data?.ponentes) return [];
    return Object.keys(data.ponentes).filter((k) => {
      const base = k.replace(/\s*\*?\s*cambio\s+ponente/gi, "").trim();
      return base.toLowerCase() === view.toLowerCase();
    });
  }, [data, view]);

  const hasCambioPonenteSubtype = keysMatchingView.length > 1;

  const cur = useMemo(() => {
    if (!data?.general) return null;
    if (view === "General") return data.general;
    return resolverDatosMagistrado(view, subViewMode);
  }, [data, view, subViewMode, resolverDatosMagistrado]);

  const filteredEntidades = useMemo(() => {
    if (!cur?.entidades) return [];
    const term = searchEntidadFiltro.toLowerCase();
    if (!term) return cur.entidades.slice(0, 15);
    return cur.entidades
      .filter((e) => e.nombre.toLowerCase().includes(term))
      .slice(0, 15);
  }, [cur, searchEntidadFiltro]);

  const filteredVigentes = useMemo(() => {
    if (!cur?.metricas) return [];
    const baseList = filterSinSalidaOnly
      ? cur.metricas.lista_inconsistentes || []
      : cur.metricas.lista_vigentes || [];

    const termR = searchRadicadoFiltro.toLowerCase();
    if (!termR) return baseList;

    return baseList.filter((r) => {
      const radicado = String(r.radicado || "").toLowerCase();
      const medio = String(r.medio || "").toLowerCase();
      const ponente = String(r.ponente || "").toLowerCase();
      return (
        radicado.includes(termR) ||
        medio.includes(termR) ||
        ponente.includes(termR)
      );
    });
  }, [cur, searchRadicadoFiltro, filterSinSalidaOnly]);

  if (!token) {
    return (
      <LoginView
        handleLogin={handleLogin}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loading={loading}
        error={error}
      />
    );
  }

  const isPeriodoCompActive =
    activeTab === "comparativa" && compMode === "periodo";
  const isMagistradoCompActive =
    activeTab === "comparativa" && compMode === "magistrado";
  const isCuelloBotellaActive = activeTab === "cuello_botella";

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-overlay">
          <Loader2 className="spinner" size={40} />
        </div>
      )}

      <ProcesoModal
        selectedProceso={selectedProceso}
        setSelectedProceso={setSelectedProceso}
      />

      <nav className="navbar">
        <div className="nav-brand">
          <ShieldCheck color="#3b82f6" size={28} />
          RENDICIÓN
        </div>

        <div className="header-actions">
          <GlobalFilters
            data={data}
            dates={dates}
            setDates={setDates}
            fetchStats={fetchStats}
            view={view}
            setView={setView}
            subViewMode={subViewMode}
            setSubViewMode={setSubViewMode}
            setLimitVigentes={setLimitVigentes}
            listaMagistradosUnicos={listaMagistradosUnicos}
            hasCambioPonenteSubtype={hasCambioPonenteSubtype}
            isPeriodoCompActive={isPeriodoCompActive}
            isMagistradoCompActive={isMagistradoCompActive}
            isCuelloBotellaActive={isCuelloBotellaActive}
          />

          <div className="action-buttons-wrapper">
            <button
              onClick={handleExportExcel}
              className="btn-action btn-excel"
              title="Descargar Excel"
              disabled={!cur}
            >
              <Download size={16} />
              <span>EXCEL</span>
            </button>
            <label className="btn-action btn-upload-label" title="Subir Excel">
              <FileUp size={16} />
              <span>CARGAR</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                hidden
              />
            </label>
            <button
              onClick={handleLogout}
              className="btn-action btn-logout"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
              <span>SALIR</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="content">
        <AppTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={userProfile?.rol === "admin"}
        />

        {cur && (activeTab === "gestion" || activeTab === "analisis") && (
          <div className="kpi-grid">
            <div className="kpi-card green">
              <div className="kpi-header-content">
                <h3>📈 Ingresos Totales</h3>
              </div>
              <p className="kpi-value">{cur.metricas.ingresos_totales}</p>
            </div>

            <div className="kpi-card blue">
              <div className="kpi-header-content">
                <h3>⏳ Procesos Activos</h3>
              </div>
              <p className="kpi-value">{cur.metricas.activos}</p>
            </div>

            <div className="kpi-card yellow">
              <div className="kpi-header-content">
                <h3>✅ Finalizados</h3>
              </div>
              <p className="kpi-value">{cur.metricas.finalizados}</p>
            </div>

            <div
              className="kpi-card red clickable-kpi"
              onClick={() => {
                setActiveTab("analisis");
                setFilterSinSalidaOnly(true);
              }}
            >
              <div className="kpi-header-content">
                <h3>⚠️ Sin Salida Registrada</h3>
                <AlertTriangle size={15} color="#dc2626" />
              </div>
              <p className="kpi-value red-text">
                {cur.metricas.inconsistentes}
              </p>
              <span className="kpi-footer-sub">
                Clic para filtrar alertas ➔
              </span>
            </div>
          </div>
        )}

        {activeTab === "admin_crud" && (
          <AdminCrudView
            key={refreshExcelKey}
            token={token}
            userProfile={userProfile}
            editingUsr={editingUsr}
            usrForm={usrForm}
            setUsrForm={setUsrForm}
            handleSaveUsuario={handleSaveUsuario}
            usuariosList={usuariosList}
            handleEditUsuarioClick={handleEditUsuarioClick}
            handleDeleteUsuario={handleDeleteUsuario}
            nuevoMagistradoInput={nuevoMagistradoInput}
            setNuevoMagistradoInput={setNuevoMagistradoInput}
            handleAddMagistrado={handleAddMagistrado}
            magistradosList={magistradosList}
            handleDeleteMagistrado={handleDeleteMagistrado}
            handleVincularMagistrado={handleVincularMagistrado}
            onExcelDeleted={handleExcelDeletedCleanup}
            onExcelSelected={(selectedData) => {
              if (selectedData) {
                fetchStats(dates.desde, dates.hasta, token);
                setActiveTab("gestion");
              } else {
                setData(null);
              }
            }}
          />
        )}

        {activeTab === "comparativa" && (
          <ComparativaView
            compMode={compMode}
            setCompMode={setCompMode}
            compFilters={compFilters}
            setCompFilters={setCompFilters}
            listaMagistradosUnicos={listaMagistradosUnicos}
            compData={compData}
            cur={cur}
            setSelectedProceso={setSelectedProceso}
          />
        )}

        {cur && activeTab === "gestion" && <GestionView cur={cur} />}

        {activeTab === "cuello_botella" && <CuelloBotellaView token={token} />}

        {cur && activeTab === "analisis" && (
          <AnalisisView
            filterSinSalidaOnly={filterSinSalidaOnly}
            setFilterSinSalidaOnly={setFilterSinSalidaOnly}
            searchRadicadoFiltro={searchRadicadoFiltro}
            setSearchRadicadoFiltro={setSearchRadicadoFiltro}
            setLimitVigentes={setLimitVigentes}
            filteredEntidades={filteredEntidades}
            searchEntidadFiltro={searchEntidadFiltro}
            setSearchEntidadFiltro={setSearchEntidadFiltro}
            filteredVigentes={filteredVigentes}
            limitVigentes={limitVigentes}
            setSelectedProceso={setSelectedProceso}
          />
        )}

        {!cur &&
          !loading &&
          activeTab !== "admin_crud" &&
          activeTab !== "comparativa" &&
          activeTab !== "cuello_botella" && (
            <div className="welcome-screen">
              <Database size={100} color="#cbd5e1" />
              <h2>Esperando Base de Datos</h2>
              <p style={{ color: "#64748b", marginTop: "10px" }}>
                Carga un archivo Excel desde el botón "CARGAR" para activar el
                análisis procesal
              </p>
            </div>
          )}
      </main>
    </div>
  );
}

export default App;
