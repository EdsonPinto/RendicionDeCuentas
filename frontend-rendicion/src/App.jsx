import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, FileUp, Loader2, LogOut, Database, AlertTriangle, Download } from 'lucide-react';
import './App.css';

// Importación de Vistas y Componentes modularizados
import { LoginView } from './components/LoginView';
import { ProcesoModal } from './components/ProcesoModal';
import { GestionView } from './components/GestionView';
import { AnalisisView } from './components/AnalisisView';
import { ComparativaView } from './components/ComparativaView';
import { AdminCrudView } from './components/AdminCrudView';
import { CuelloBotellaView } from './components/CuelloBotellaView';
import { AppTabs } from './components/AppTabs';
import { GlobalFilters } from './components/GlobalFilters';
import { derivarMagistrados } from './utils/ponentes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function sumarTablas(t1 = [], t2 = []) {
  const mapa = {};
  [...t1, ...t2].forEach(row => {
    if (!mapa[row.medio]) {
      mapa[row.medio] = { medio: row.medio, ingresos: 0, egresos: 0 };
    }
    mapa[row.medio].ingresos += Number(row.ingresos || 0);
    mapa[row.medio].egresos += Number(row.egresos || 0);
  });
  return Object.values(mapa);
}

function fusionarEntidades(e1 = [], e2 = []) {
  const mapa = {};
  [...e1, ...e2].forEach(ent => {
    if (!mapa[ent.nombre]) {
      mapa[ent.nombre] = { nombre: ent.nombre, cantidad: 0 };
    }
    mapa[ent.nombre].cantidad += Number(ent.cantidad || 0);
  });
  return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState('General');
  const [subViewMode, setSubViewMode] = useState('principal');
  const [activeTab, setActiveTab] = useState('gestion');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dates, setDates] = useState({ desde: '', hasta: '' });

  // ESTADOS FILTROS Y BÚSQUEDA
  const [searchEntidadFiltro, setSearchEntidadFiltro] = useState('');
  const [searchRadicadoFiltro, setSearchRadicadoFiltro] = useState('');
  const [filterSinSalidaOnly, setFilterSinSalidaOnly] = useState(false);
  const [limitVigentes, setLimitVigentes] = useState(50);

  // ESTADO PARA MODAL DE DETALLE DE PROCESO
  const [selectedProceso, setSelectedProceso] = useState(null);

  // ESTADOS CRUD ADMINISTRATIVO
  const [usuariosList, setUsuariosList] = useState([]);
  const [magistradosList, setMagistradosList] = useState([]);
  const [nuevoMagistradoInput, setNuevoMagistradoInput] = useState('');
  const [usrForm, setUsrForm] = useState({ username: '', nombre: '', rol: 'usuario', password: '' });
  const [editingUsr, setEditingUsr] = useState(null);

  // ESTADOS MÓDULO COMPARATIVAS
  const [compMode, setCompMode] = useState('periodo');
  const compSubTab = 'metricas';
  const [compFilters, setCompFilters] = useState({
    desde_a: '', hasta_a: '', ponente_a: 'General', tipo_a: 'todos',
    desde_b: '', hasta_b: '', ponente_b: 'General', tipo_b: 'todos'
  });
  const [compData, setCompData] = useState(null);

  const syncedCatalogKeysRef = useRef(new Set());
  const inFlightCatalogKeysRef = useRef(new Set());
  const catalogMutationVersionRef = useRef(0);
  const adminCatalogRequestIdRef = useRef(0);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUserProfile(null);
    setData(null);
    setError(null);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Credenciales inválidas');
      }

      const resData = await res.json();
      localStorage.setItem('token', resData.access_token);
      setToken(resData.access_token);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminData = useCallback(async (tok = token) => {
    if (!tok) return;
    const requestId = ++adminCatalogRequestIdRef.current;
    const requestVersion = catalogMutationVersionRef.current;
    try {
      const [resUsr, resMag] = await Promise.all([
        fetch(`${API_URL}/api/admin/usuarios`, { headers: { 'Authorization': `Bearer ${tok}` } }),
        fetch(`${API_URL}/api/admin/magistrados`, { headers: { 'Authorization': `Bearer ${tok}` } })
      ]);
      if (resUsr.ok) setUsuariosList(await resUsr.json());
      if (resMag.ok && requestId === adminCatalogRequestIdRef.current && requestVersion === catalogMutationVersionRef.current) {
        const dataM = await resMag.json();
        setMagistradosList(dataM.magistrados || []);
      }
    } catch (e) {
      console.error("Error al cargar datos administrativos:", e);
    }
  }, [token]);

  const fetchUserProfile = useCallback(async (currentToken = token) => {
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const prof = await res.json();
        setUserProfile(prof);
        if (prof.rol === 'admin') {
          setActiveTab('admin_crud');
          fetchAdminData(currentToken);
        } else {
          setActiveTab('gestion');
        }
      }
    } catch (e) {
      console.error("Error obteniendo perfil:", e);
    }
  }, [token, handleLogout, fetchAdminData]);

  const fetchStats = useCallback(async (d = dates.desde, h = dates.hasta, currentToken = token) => {
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_URL}/api/estadisticas?desde=${d}&hasta=${h}`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });
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
  }, [dates.desde, dates.hasta, token, handleLogout]);

  const fetchComparativa = useCallback(async () => {
    if (!token || !data) return;
    setLoading(true);
    try {
      const query = new URLSearchParams({
        modo: compMode,
        desde_a: compFilters.desde_a,
        hasta_a: compFilters.hasta_a,
        ponente_a: compMode === 'magistrado' ? compFilters.ponente_a : view,
        tipo_a: compMode === 'magistrado' ? compFilters.tipo_a : subViewMode,
        desde_b: compFilters.desde_b,
        hasta_b: compFilters.hasta_b,
        ponente_b: compMode === 'magistrado' ? compFilters.ponente_b : view,
        tipo_b: compMode === 'magistrado' ? compFilters.tipo_b : subViewMode
      }).toString();

      const res = await fetch(`${API_URL}/api/comparativa?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCompData(await res.json());
      }
    } catch (err) {
      console.error("Error al obtener comparativa:", err);
    } finally {
      setLoading(false);
    }
  }, [token, data, compMode, compFilters, view, subViewMode]);

  const handleSaveUsuario = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isEdit = !!editingUsr;
      const url = isEdit ? `${API_URL}/api/admin/usuarios/${editingUsr}` : `${API_URL}/api/admin/usuarios`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(usrForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error guardando usuario');
      }

      setUsrForm({ username: '', nombre: '', rol: 'usuario', password: '' });
      setEditingUsr(null);
      await fetchAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUsuarioClick = (usr) => {
    setEditingUsr(usr.username);
    setUsrForm({ username: usr.username, nombre: usr.nombre, rol: usr.rol, password: '' });
  };

  const handleVincularMagistrado = (nombreMag) => {
    setEditingUsr(null);
    setUsrForm({ username: '', nombre: nombreMag, rol: 'usuario', password: '' });
  };

  const handleDeleteUsuario = async (usrUsername) => {
    if (!window.confirm(`¿Seguro que deseas eliminar al usuario ${usrUsername}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/usuarios/${usrUsername}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al eliminar');
      }
      await fetchAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMagistrado = async () => {
    if (!nuevoMagistradoInput.trim()) return;
    const nuevaLista = [...magistradosList, nuevoMagistradoInput.trim()];
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/magistrados`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ magistrados: nuevaLista })
      });
      if (res.ok) {
        setNuevoMagistradoInput('');
        await fetchAdminData();
      }
    } catch (e) {
      alert("Error actualizando magistrados.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMagistrado = async (nombreMag) => {
    const nuevaLista = magistradosList.filter(m => m !== nombreMag);
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/admin/magistrados`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ magistrados: nuevaLista })
      });
      await fetchAdminData();
    } catch (e) {
      alert("Error eliminando magistrado.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !token) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/api/subir-archivo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (!res.ok) throw new Error(`Error al subir: ${res.status}`);
      await fetchStats(dates.desde, dates.hasta, token);
      setActiveTab('gestion');
    } catch (err) {
      setError(err.message || 'Error al subir el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/exportar-excel?desde=${dates.desde}&hasta=${dates.hasta}&ponente=${view}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Error al generar Excel.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Rendicion_${view.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
      fetchStats(dates.desde, dates.hasta, token);
    }
  }, [token, fetchUserProfile, fetchStats, dates.desde, dates.hasta]);

  useEffect(() => {
    if (userProfile?.rol !== 'admin' || !data?.lista_ponentes?.length) return;
    const catalogoDerivado = derivarMagistrados(data.lista_ponentes);
    if (!catalogoDerivado.length) return;

    setMagistradosList(catalogoDerivado);
    const syncKey = `${token}:${JSON.stringify(catalogoDerivado)}`;
    if (syncedCatalogKeysRef.current.has(syncKey) || inFlightCatalogKeysRef.current.has(syncKey)) return;

    inFlightCatalogKeysRef.current.add(syncKey);
    catalogMutationVersionRef.current += 1;
    fetch(`${API_URL}/api/admin/magistrados`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ magistrados: catalogoDerivado })
    }).then((res) => {
      if (!res.ok) throw new Error(`Error sincronizando catálogo (${res.status})`);
      syncedCatalogKeysRef.current.add(syncKey);
      setMagistradosList(catalogoDerivado);
    }).catch((err) => {
      console.error('Error sincronizando catálogo de magistrados:', err);
    }).finally(() => {
      inFlightCatalogKeysRef.current.delete(syncKey);
    });
  }, [data, userProfile, token]);

  useEffect(() => {
    if (activeTab === 'comparativa' && compSubTab === 'metricas') {
      fetchComparativa();
    }
  }, [activeTab, compSubTab, fetchComparativa]);

  const listaMagistradosUnicos = useMemo(() => {
    if (!data?.lista_ponentes) return [];
    return derivarMagistrados(data.lista_ponentes);
  }, [data]);

  const resolverDatosMagistrado = useCallback((nombreMag, subModo) => {
    if (!data?.general) return null;
    if (nombreMag === 'General') return data.general;

    const keysMatching = Object.keys(data.ponentes || {}).filter(k => {
      const base = k.replace(/\s*\*?\s*cambio\s+ponente/gi, '').trim();
      return base.toLowerCase() === nombreMag.toLowerCase();
    });

    if (keysMatching.length === 0) return data.ponentes[nombreMag] || null;

    if (subModo === 'principal') {
      const keyPrin = keysMatching.find(k => !/cambio\s+ponente/i.test(k));
      return keyPrin ? data.ponentes[keyPrin] : null;
    }
    if (subModo === 'cambio') {
      const keyCambio = keysMatching.find(k => /cambio\s+ponente/i.test(k));
      return keyCambio ? data.ponentes[keyCambio] : null;
    }

    if (keysMatching.length === 1) return data.ponentes[keysMatching[0]] || null;

    const p1 = data.ponentes[keysMatching[0]];
    const p2 = data.ponentes[keysMatching[1]];

    return {
      metricas: {
        ingresos_totales: (p1?.metricas?.ingresos_totales || 0) + (p2?.metricas?.ingresos_totales || 0),
        activos: (p1?.metricas?.activos || 0) + (p2?.metricas?.activos || 0),
        finalizados: (p1?.metricas?.finalizados || 0) + (p2?.metricas?.finalizados || 0),
        inconsistentes: (p1?.metricas?.inconsistentes || 0) + (p2?.metricas?.inconsistentes || 0),
        eficiencia: Math.round((((p1?.metricas?.finalizados || 0) + (p2?.metricas?.finalizados || 0)) / ((p1?.metricas?.ingresos_totales || 0) + (p2?.metricas?.ingresos_totales || 0) || 1)) * 100),
        lista_vigentes: [...(p1?.metricas?.lista_vigentes || []), ...(p2?.metricas?.lista_vigentes || [])],
        lista_inconsistentes: [...(p1?.metricas?.lista_inconsistentes || []), ...(p2?.metricas?.lista_inconsistentes || [])]
      },
      ing_ord: { p: (p1?.ing_ord?.p || 0) + (p2?.ing_ord?.p || 0), s: (p1?.ing_ord?.s || 0) + (p2?.ing_ord?.s || 0) },
      ing_const: { p: (p1?.ing_const?.p || 0) + (p2?.ing_const?.p || 0), s: (p1?.ing_const?.s || 0) + (p2?.ing_const?.s || 0) },
      egr_ord: { p: (p1?.egr_ord?.p || 0) + (p2?.egr_ord?.p || 0), s: (p1?.egr_ord?.s || 0) + (p2?.egr_ord?.s || 0) },
      egr_const: { p: (p1?.egr_const?.p || 0) + (p2?.egr_const?.p || 0), s: (p1?.egr_const?.s || 0) + (p2?.egr_const?.s || 0) },
      tablas: {
        ord_1: sumarTablas(p1?.tablas?.ord_1, p2?.tablas?.ord_1),
        ord_2: sumarTablas(p1?.tablas?.ord_2, p2?.tablas?.ord_2),
        const_1: sumarTablas(p1?.tablas?.const_1, p2?.tablas?.const_1),
        const_2: sumarTablas(p1?.tablas?.const_2, p2?.tablas?.const_2)
      },
      entidades: fusionarEntidades(p1?.entidades, p2?.entidades)
    };
  }, [data]);

  const keysMatchingView = useMemo(() => {
    if (view === 'General' || !data?.ponentes) return [];
    return Object.keys(data.ponentes).filter(k => {
      const base = k.replace(/\s*\*?\s*cambio\s+ponente/gi, '').trim();
      return base.toLowerCase() === view.toLowerCase();
    });
  }, [data, view]);

  const hasCambioPonenteSubtype = keysMatchingView.length > 1;

  const cur = useMemo(() => {
    if (!data?.general) return null;
    if (view === 'General') return data.general;
    return resolverDatosMagistrado(view, subViewMode);
  }, [data, view, subViewMode, resolverDatosMagistrado]);

  const filteredEntidades = useMemo(() => {
    if (!cur?.entidades) return [];
    const term = searchEntidadFiltro.toLowerCase();
    if (!term) return cur.entidades.slice(0, 15);
    return cur.entidades.filter(e => e.nombre.toLowerCase().includes(term)).slice(0, 15);
  }, [cur, searchEntidadFiltro]);

  const filteredVigentes = useMemo(() => {
    if (!cur?.metricas) return [];
    const baseList = filterSinSalidaOnly
      ? (cur.metricas.lista_inconsistentes || [])
      : (cur.metricas.lista_vigentes || []);

    const termR = searchRadicadoFiltro.toLowerCase();
    if (!termR) return baseList;

    return baseList.filter(r => {
      const radicado = String(r.radicado || '').toLowerCase();
      const medio = String(r.medio || '').toLowerCase();
      const ponente = String(r.ponente || '').toLowerCase();
      return radicado.includes(termR) || medio.includes(termR) || ponente.includes(termR);
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

  const isPeriodoCompActive = activeTab === 'comparativa' && compMode === 'periodo';
  const isMagistradoCompActive = activeTab === 'comparativa' && compMode === 'magistrado';
  const isCuelloBotellaActive = activeTab === 'cuello_botella';

  return (
    <div className="app-container">
      {loading && (
        <div className="loading-overlay">
          <Loader2 className="spinner" size={40} />
        </div>
      )}

      <ProcesoModal selectedProceso={selectedProceso} setSelectedProceso={setSelectedProceso} />

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
            <button onClick={handleExportExcel} className="btn-action btn-excel" title="Descargar Excel" disabled={!cur}>
              <Download size={16} /><span>EXCEL</span>
            </button>
            <label className="btn-action btn-upload-label" title="Subir Excel">
              <FileUp size={16} /><span>CARGAR</span>
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} hidden />
            </label>
            <button onClick={handleLogout} className="btn-action btn-logout" title="Cerrar Sesión">
              <LogOut size={16} /><span>SALIR</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="content">
        <AppTabs activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={userProfile?.rol === 'admin'} />

        {cur && (activeTab === 'gestion' || activeTab === 'analisis') && (
          <div className="kpi-grid">
            <div className="kpi-card green">
              <div className="kpi-header-content"><h3>📈 Ingresos Totales</h3></div>
              <p className="kpi-value">{cur.metricas.ingresos_totales}</p>
            </div>

            <div className="kpi-card blue">
              <div className="kpi-header-content"><h3>⏳ Procesos Activos</h3></div>
              <p className="kpi-value">{cur.metricas.activos}</p>
            </div>

            <div className="kpi-card yellow">
              <div className="kpi-header-content"><h3>✅ Finalizados</h3></div>
              <p className="kpi-value">{cur.metricas.finalizados}</p>
            </div>

            <div
              className="kpi-card red clickable-kpi"
              onClick={() => { setActiveTab('analisis'); setFilterSinSalidaOnly(true); }}
            >
              <div className="kpi-header-content">
                <h3>⚠️ Sin Salida Registrada</h3>
                <AlertTriangle size={15} color="#dc2626" />
              </div>
              <p className="kpi-value red-text">{cur.metricas.inconsistentes}</p>
              <span className="kpi-footer-sub">Clic para filtrar alertas ➔</span>
            </div>
          </div>
        )}

        {activeTab === 'admin_crud' && userProfile?.rol === 'admin' && (
          <AdminCrudView
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
          />
        )}

        {activeTab === 'comparativa' && (
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

        {cur && activeTab === 'gestion' && <GestionView cur={cur} />}

        {activeTab === 'cuello_botella' && (
          <CuelloBotellaView token={token} />
        )}

        {cur && activeTab === 'analisis' && (
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
          activeTab !== 'admin_crud' &&
          activeTab !== 'comparativa' &&
          activeTab !== 'cuello_botella' && (
            <div className="welcome-screen">
              <Database size={100} color="#cbd5e1" />
              <h2>Esperando Base de Datos</h2>
              <p style={{ color: '#64748b', marginTop: '10px' }}>Carga un archivo Excel desde el botón "CARGAR" para activar el análisis procesal</p>
            </div>
          )}
      </main>
    </div>
  );
}

export default App;