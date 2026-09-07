import React from 'react';
import { Calendar } from 'lucide-react';

export function GlobalFilters({ data, dates, setDates, fetchStats, view, setView, subViewMode, setSubViewMode, setLimitVigentes, listaMagistradosUnicos, hasCambioPonenteSubtype, isPeriodoCompActive, isMagistradoCompActive, isCuelloBotellaActive }) {
  const datesDisabled = !data || isPeriodoCompActive || isCuelloBotellaActive;
  const viewDisabled = isMagistradoCompActive || isCuelloBotellaActive;
  const openPicker = (id) => data && !isPeriodoCompActive && !isCuelloBotellaActive && document.getElementById(id).showPicker();

  return (
    <>
      <div
        className="date-group"
        style={{
          opacity: datesDisabled ? 0.4 : 1,
          cursor: datesDisabled ? 'not-allowed' : 'default',
          backgroundColor: datesDisabled ? '#f1f5f9' : '#ffffff'
        }}
        title={isCuelloBotellaActive ? 'No disponible en Cuello de Botella' : undefined}
      >
        <div className="date-field">
          <Calendar size={14} color={datesDisabled ? '#94a3b8' : '#3b82f6'} strokeWidth={2.5} className="date-icon" onClick={() => openPicker('input-desde')} style={{ cursor: datesDisabled ? 'not-allowed' : 'pointer' }} />
          <input id="input-desde" type="date" className="nav-input" disabled={datesDisabled} value={dates.desde} onChange={(e) => { setDates({ ...dates, desde: e.target.value }); fetchStats(e.target.value, dates.hasta); }} style={{ cursor: datesDisabled ? 'not-allowed' : 'pointer' }} />
        </div>
        <span className="to-text">AL</span>
        <div className="date-field">
          <Calendar size={14} color={datesDisabled ? '#94a3b8' : '#3b82f6'} strokeWidth={2.5} className="date-icon" onClick={() => openPicker('input-hasta')} style={{ cursor: datesDisabled ? 'not-allowed' : 'pointer' }} />
          <input id="input-hasta" type="date" className="nav-input" disabled={datesDisabled} value={dates.hasta} onChange={(e) => { setDates({ ...dates, hasta: e.target.value }); fetchStats(dates.desde, e.target.value); }} style={{ cursor: datesDisabled ? 'not-allowed' : 'pointer' }} />
        </div>
      </div>

      <select className="nav-select" value={view} onChange={(e) => { setView(e.target.value); setSubViewMode('principal'); setLimitVigentes(50); }} disabled={viewDisabled} style={{ cursor: viewDisabled ? 'not-allowed' : 'pointer', opacity: viewDisabled ? 0.4 : 1, backgroundColor: viewDisabled ? '#f1f5f9' : '#ffffff' }} title={isCuelloBotellaActive ? 'No disponible en Cuello de Botella' : undefined}>
        <option value="General">🌐 VISTA GLOBAL</option>
        {listaMagistradosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {view !== 'General' && hasCambioPonenteSubtype && !isMagistradoCompActive && (
        <select className="nav-select" value={subViewMode} onChange={(e) => setSubViewMode(e.target.value)} style={{ backgroundColor: '#fef08a', borderColor: '#000', fontWeight: '900', fontSize: '0.75rem', cursor: 'pointer' }} title="Filtrar por tipo de asignación">
          <option value="todos">🔀 TODOS (Unificados)</option>
          <option value="principal">📌 Solo Principales</option>
          <option value="cambio">🔄 Solo Cambio Ponente</option>
        </select>
      )}
    </>
  );
}
