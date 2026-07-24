import React from 'react';
import { Search } from 'lucide-react';

export const AnalisisView = ({
    filterSinSalidaOnly,
    setFilterSinSalidaOnly,
    searchRadicadoFiltro,
    setSearchRadicadoFiltro,
    setLimitVigentes,
    filteredEntidades,
    searchEntidadFiltro,
    setSearchEntidadFiltro,
    filteredVigentes,
    limitVigentes,
    setSelectedProceso
}) => (
    <div className="analysis-layout">
        {filterSinSalidaOnly && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffedd5', padding: '12px 18px', borderRadius: '10px', border: '3px solid #ea580c', boxShadow: '4px 4px 0 #000' }}>
                <span style={{ fontWeight: '900', fontSize: '0.85rem', color: '#c2410c' }}>
                    ⚠️ FILTRO ACTIVO: MOSTRANDO ÚNICAMENTE PROCESOS INACTIVOS SIN FECHA DE SALIDA REGISTRADA
                </span>
                <button
                    onClick={() => setFilterSinSalidaOnly(false)}
                    style={{ background: '#ea580c', color: '#ffffff', border: '2px solid #000', padding: '6px 12px', borderRadius: '6px', fontWeight: '900', cursor: 'pointer', fontSize: '0.75rem', boxShadow: '2px 2px 0 #000' }}
                >
                    VER TODOS LOS PROCESOS VIGENTES
                </button>
            </div>
        )}

        {/* PANEL BUSCADOR */}
        <div className="strategic-filters-panel" style={{ background: '#ffffff', border: '3px solid #000', borderRadius: '12px', padding: '20px', boxShadow: '5px 5px 0 #000' }}>
            <h3 className="filters-panel-title" style={{ color: '#000000', fontWeight: '900' }}>🔍 BUSCADOR DE PROCESOS EN TIEMPO REAL</h3>
            <div className="filters-grid-layout" style={{ gridTemplateColumns: '1fr' }}>
                <div className="filter-field-box">
                    <label style={{ color: '#000000', fontWeight: '900', display: 'block', marginBottom: '8px' }}>BUSCAR POR RADICADO O ENTIDAD</label>
                    <div className="input-search-wrapper" style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', borderRadius: '8px', padding: '8px 12px', background: '#ffffff' }}>
                        <Search size={16} color="#000" style={{ marginRight: '8px', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Escribe el número de radicado o la entidad..."
                            value={searchRadicadoFiltro}
                            onChange={e => { setSearchRadicadoFiltro(e.target.value); setLimitVigentes(50); }}
                            style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', color: '#000000', fontWeight: '800' }}
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* GRID DE TABLAS */}
        <div className="analysis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>

            {/* TABLA TOP 15 ENTIDADES */}
            <div className="card-tabla" style={{ border: '3px solid #000', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
                <div className="card-tabla-header" style={{ backgroundColor: '#1e293b', color: '#ffffff', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: '900' }}>TOP 15 ENTIDADES DEMANDADAS ({filteredEntidades.length})</span>
                    <input
                        type="text"
                        placeholder="Filtrar entidades..."
                        value={searchEntidadFiltro}
                        onChange={e => setSearchEntidadFiltro(e.target.value)}
                        style={{ width: '100%', padding: '6px 10px', fontSize: '0.75rem', borderRadius: '6px', border: '2px solid #000', background: '#ffffff', color: '#000000', fontWeight: '800' }}
                    />
                </div>
                <div className="card-tabla-body">
                    <table>
                        <thead>
                            <tr>
                                <th>ENTIDAD / DEMANDADO</th>
                                <th className="txt-center">CANTIDAD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEntidades.map((e, i) => (
                                <tr key={i} style={{ color: '#000000' }}>
                                    <td style={{ fontWeight: '800', fontSize: '0.75rem', color: '#000000' }}>{e.nombre}</td>
                                    <td className="txt-center col-ing" style={{ fontWeight: '900', fontSize: '1rem', color: '#000000' }}>{e.cantidad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLA PROCESOS VIGENTES (CORREGIDA) */}
            <div className="card-tabla" style={{ border: '3px solid #000', borderRadius: '12px', background: '#ffffff', overflow: 'hidden' }}>
                <div
                    className="card-tabla-header"
                    style={{
                        backgroundColor: filterSinSalidaOnly ? '#ea580c' : '#0f172a',
                        color: '#ffffff',
                        borderBottom: '2px solid #000',
                        padding: '12px 16px',
                        fontWeight: '900',
                        fontSize: '0.85rem'
                    }}
                >
                    <span>
                        {filterSinSalidaOnly ? '⚠️ PROCESOS SIN FECHA DE SALIDA' : 'PROCESOS VIGENTES ACTIVOS'} ({filteredVigentes.length}) - Haz clic para ver detalle
                    </span>
                </div>
                <div className="card-tabla-body">
                    <table>
                        <thead>
                            <tr>
                                <th className="txt-center">ESTADO</th>
                                <th>RADICADO</th>
                                <th>MEDIO DE CONTROL</th>
                                <th>PONENTE</th>
                                <th className="txt-center">DÍAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVigentes.slice(0, limitVigentes).map((r, i) => (
                                <tr
                                    key={i}
                                    onClick={() => setSelectedProceso(r)}
                                    title="Haz clic para ver el detalle de este proceso"
                                    style={{ cursor: 'pointer', color: '#000000' }}
                                >
                                    <td className="txt-center">
                                        <span className={`badge-semaforo ${r.sin_salida ? 'badge-rojo' : r.dias < 30 ? 'badge-verde' : r.dias <= 90 ? 'badge-amarillo' : 'badge-rojo'}`}>
                                            {r.sin_salida ? 'SIN SALIDA' : r.dias < 30 ? 'Control' : r.dias <= 90 ? 'Alerta' : 'Vencido'}
                                        </span>
                                    </td>
                                    <td className="txt-mono" style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#000000' }}>{r.radicado}</td>
                                    <td style={{ fontSize: '0.7rem', color: '#000000' }}>{r.medio}</td>
                                    <td className="col-ing" style={{ fontWeight: '900', fontSize: '0.7rem', color: '#000000' }}>{r.ponente}</td>
                                    <td className="txt-center" style={{ fontWeight: '900', fontSize: '0.75rem', color: '#000000' }}>{r.dias >= 0 ? `${r.dias} d.` : 'S.D.'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>
);