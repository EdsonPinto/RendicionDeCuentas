import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const ComparativaView = ({
    compMode,
    setCompMode,
    compFilters,
    setCompFilters,
    listaMagistradosUnicos,
    compData,
    setSelectedProceso
}) => (
    <div className="analysis-layout">
        <div className="comp-header">
            <h2>MÓDULO DE ANÁLISIS BIVALENTE Y COMPARATIVAS</h2>
            <div className="mode-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className={`mode-btn ${compMode === 'periodo' ? 'active' : ''}`} onClick={() => setCompMode('periodo')}>
                    🗓️ PERÍODO VS PERÍODO
                </button>
                <button
                    className={`mode-btn ${compMode === 'magistrado' ? 'active' : ''}`}
                    onClick={() => {
                        setCompMode('magistrado');
                        if (!compFilters.ponente_a && listaMagistradosUnicos.length > 0) {
                            setCompFilters(prev => ({ ...prev, ponente_a: listaMagistradosUnicos[0], ponente_b: listaMagistradosUnicos[1] || listaMagistradosUnicos[0] }));
                        }
                    }}
                >
                    👨‍⚖️ MAGISTRADO VS MAGISTRADO
                </button>
                <button
                    className={`mode-btn ${compMode === 'cuellos' ? 'active' : ''}`}
                    onClick={() => setCompMode('cuellos')}
                    style={{ background: compMode === 'cuellos' ? '#ea580c' : undefined, color: compMode === 'cuellos' ? '#fff' : undefined }}
                >
                    ⚠️ CUELLOS DE BOTELLA
                </button>
            </div>
        </div>

        {compMode !== 'cuellos' && (
            <div className="comp-controls-grid" style={{ marginTop: '20px' }}>
                <div className="comp-box">
                    <h3>SELECCIÓN A (BASE)</h3>
                    {compMode === 'periodo' ? (
                        <div className="comp-inputs">
                            <input type="date" value={compFilters.desde_a} onChange={e => setCompFilters({ ...compFilters, desde_a: e.target.value })} />
                            <span>AL</span>
                            <input type="date" value={compFilters.hasta_a} onChange={e => setCompFilters({ ...compFilters, hasta_a: e.target.value })} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <select value={compFilters.ponente_a} onChange={e => setCompFilters({ ...compFilters, ponente_a: e.target.value })}>
                                {listaMagistradosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select
                                value={compFilters.tipo_a}
                                onChange={e => setCompFilters({ ...compFilters, tipo_a: e.target.value })}
                                style={{ padding: '6px', borderRadius: '6px', border: '2px solid #000', fontWeight: '700', fontSize: '0.8rem', background: '#fff' }}
                            >
                                <option value="todos">🔀 Todos (Principales + Cambio Ponente)</option>
                                <option value="principal">📌 Solo Principales</option>
                                <option value="cambio">🔄 Solo Cambio Ponente</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="vs-badge">VS</div>

                <div className="comp-box">
                    <h3>SELECCIÓN B (COMPARADO)</h3>
                    {compMode === 'periodo' ? (
                        <div className="comp-inputs">
                            <input type="date" value={compFilters.desde_b} onChange={e => setCompFilters({ ...compFilters, desde_b: e.target.value })} />
                            <span>AL</span>
                            <input type="date" value={compFilters.hasta_b} onChange={e => setCompFilters({ ...compFilters, hasta_b: e.target.value })} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <select value={compFilters.ponente_b} onChange={e => setCompFilters({ ...compFilters, ponente_b: e.target.value })}>
                                {listaMagistradosUnicos.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                            <select
                                value={compFilters.tipo_b}
                                onChange={e => setCompFilters({ ...compFilters, tipo_b: e.target.value })}
                                style={{ padding: '6px', borderRadius: '6px', border: '2px solid #000', fontWeight: '700', fontSize: '0.8rem', background: '#fff' }}
                            >
                                <option value="todos">🔀 Todos (Principales + Cambio Ponente)</option>
                                <option value="principal">📌 Solo Principales</option>
                                <option value="cambio">🔄 Solo Cambio Ponente</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        )}

        {compMode !== 'cuellos' && compData && (
            <div className="comp-cards-grid" style={{ marginTop: '20px' }}>
                <div className="comp-card">
                    <h4>INGRESOS TOTALES</h4>
                    <div className="comp-values">
                        <span className="val-a">{compData.grupo_a.metricas.ingresos_totales}</span>
                        <span className="arrow">➔</span>
                        <span className="val-b">{compData.grupo_b.metricas.ingresos_totales}</span>
                    </div>
                    <div className={`badge ${compData.variaciones.ingresos_pct >= 0 ? 'pos' : 'neg'}`}>
                        {compData.variaciones.ingresos_pct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {compData.variaciones.ingresos_pct}%
                    </div>
                </div>

                <div className="comp-card">
                    <h4>EGRESOS (FINALIZADOS)</h4>
                    <div className="comp-values">
                        <span className="val-a">{compData.grupo_a.metricas.finalizados}</span>
                        <span className="arrow">➔</span>
                        <span className="val-b">{compData.grupo_b.metricas.finalizados}</span>
                    </div>
                    <div className={`badge ${compData.variaciones.egresos_pct >= 0 ? 'pos' : 'neg'}`}>
                        {compData.variaciones.egresos_pct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {compData.variaciones.egresos_pct}%
                    </div>
                </div>

                <div className="comp-card">
                    <h4>EFICIENCIA PROCESAL</h4>
                    <div className="comp-values">
                        <span className="val-a">{compData.grupo_a.metricas.eficiencia}%</span>
                        <span className="arrow">➔</span>
                        <span className="val-b">{compData.grupo_b.metricas.eficiencia}%</span>
                    </div>
                    <div className={`badge ${compData.variaciones.eficiencia_diff >= 0 ? 'pos' : 'neg'}`}>
                        {compData.variaciones.eficiencia_diff >= 0 ? '+' : ''}{compData.variaciones.eficiencia_diff}% diff
                    </div>
                </div>
            </div>
        )}

        {compMode === 'cuellos' && (
            <div className="analysis-grid" style={{ gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
                <div className="card-tabla" style={{ border: '2px dashed #ea580c', background: '#fff7ed' }}>
                    <div className="card-tabla-header" style={{ backgroundColor: '#ea580c', textAlign: 'center' }}>
                        <span>🤖 MÓDULO DE CUELLOS DE BOTELLA</span>
                    </div>
                    <div className="card-tabla-body" style={{ padding: '40px', textAlign: 'center' }}>
                        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#c2410c', letterSpacing: '1px' }}>
                            todo a la ia
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
);