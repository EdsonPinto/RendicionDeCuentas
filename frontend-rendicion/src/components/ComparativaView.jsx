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
            <h2 style={{ color: '#000000', fontWeight: '900', marginBottom: '16px' }}>
                MÓDULO DE ANÁLISIS BIVALENTE Y COMPARATIVAS
            </h2>
            <div className="mode-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                    className={`mode-btn ${compMode === 'periodo' ? 'active' : ''}`} 
                    onClick={() => setCompMode('periodo')}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        border: '2px solid #000000',
                        cursor: 'pointer',
                        background: compMode === 'periodo' ? '#3b82f6' : '#ffffff',
                        color: compMode === 'periodo' ? '#ffffff' : '#000000',
                        boxShadow: '3px 3px 0 #000000'
                    }}
                >
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
                    style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        border: '2px solid #000000',
                        cursor: 'pointer',
                        background: compMode === 'magistrado' ? '#3b82f6' : '#ffffff',
                        color: compMode === 'magistrado' ? '#ffffff' : '#000000',
                        boxShadow: '3px 3px 0 #000000'
                    }}
                >
                    👨‍⚖️ MAGISTRADO VS MAGISTRADO
                </button>
                <button
                    className={`mode-btn ${compMode === 'cuellos' ? 'active' : ''}`}
                    onClick={() => setCompMode('cuellos')}
                    style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        border: '2px solid #000000',
                        cursor: 'pointer',
                        background: compMode === 'cuellos' ? '#ea580c' : '#ffffff',
                        color: compMode === 'cuellos' ? '#ffffff' : '#000000',
                        boxShadow: '3px 3px 0 #000000'
                    }}
                >
                    ⚠️ CUELLOS DE BOTELLA
                </button>
            </div>
        </div>

        {compMode !== 'cuellos' && (
            <div className="comp-controls-grid" style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* SELECCIÓN A */}
                <div className="comp-box" style={{ flex: 1, minWidth: '280px', background: '#ffffff', padding: '20px', borderRadius: '12px', border: '3px solid #000000', boxShadow: '5px 5px 0 #000000' }}>
                    <h3 style={{ color: '#000000', fontWeight: '900', marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>SELECCIÓN A (BASE)</h3>
                    {compMode === 'periodo' ? (
                        <div className="comp-inputs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                                type="date" 
                                value={compFilters.desde_a} 
                                onChange={e => setCompFilters({ ...compFilters, desde_a: e.target.value })}
                                style={{ background: '#f8fafc', color: '#000000', border: '2px solid #000000', padding: '8px', borderRadius: '6px', fontWeight: '800', width: '100%' }}
                            />
                            <span style={{ fontWeight: '900', color: '#000000' }}>AL</span>
                            <input 
                                type="date" 
                                value={compFilters.hasta_a} 
                                onChange={e => setCompFilters({ ...compFilters, hasta_a: e.target.value })}
                                style={{ background: '#f8fafc', color: '#000000', border: '2px solid #000000', padding: '8px', borderRadius: '6px', fontWeight: '800', width: '100%' }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <select 
                                value={compFilters.ponente_a} 
                                onChange={e => setCompFilters({ ...compFilters, ponente_a: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #000', fontWeight: '800', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                            >
                                {listaMagistradosUnicos.map(p => <option key={p} value={p} style={{ color: '#000', background: '#fff' }}>{p}</option>)}
                            </select>
                            <select
                                value={compFilters.tipo_a}
                                onChange={e => setCompFilters({ ...compFilters, tipo_a: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #000', fontWeight: '800', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                            >
                                <option value="todos" style={{ color: '#000', background: '#fff' }}>🔀 Todos (Principales + Cambio Ponente)</option>
                                <option value="principal" style={{ color: '#000', background: '#fff' }}>📌 Solo Principales</option>
                                <option value="cambio" style={{ color: '#000', background: '#fff' }}>🔄 Solo Cambio Ponente</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="vs-badge" style={{ background: '#000000', color: '#ffffff', fontWeight: '900', padding: '10px 14px', borderRadius: '50%', fontSize: '1rem', border: '2px solid #000' }}>
                    VS
                </div>

                {/* SELECCIÓN B */}
                <div className="comp-box" style={{ flex: 1, minWidth: '280px', background: '#ffffff', padding: '20px', borderRadius: '12px', border: '3px solid #000000', boxShadow: '5px 5px 0 #000000' }}>
                    <h3 style={{ color: '#000000', fontWeight: '900', marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>SELECCIÓN B (COMPARADO)</h3>
                    {compMode === 'periodo' ? (
                        <div className="comp-inputs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                                type="date" 
                                value={compFilters.desde_b} 
                                onChange={e => setCompFilters({ ...compFilters, desde_b: e.target.value })}
                                style={{ background: '#f8fafc', color: '#000000', border: '2px solid #000000', padding: '8px', borderRadius: '6px', fontWeight: '800', width: '100%' }}
                            />
                            <span style={{ fontWeight: '900', color: '#000000' }}>AL</span>
                            <input 
                                type="date" 
                                value={compFilters.hasta_b} 
                                onChange={e => setCompFilters({ ...compFilters, hasta_b: e.target.value })}
                                style={{ background: '#f8fafc', color: '#000000', border: '2px solid #000000', padding: '8px', borderRadius: '6px', fontWeight: '800', width: '100%' }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <select 
                                value={compFilters.ponente_b} 
                                onChange={e => setCompFilters({ ...compFilters, ponente_b: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #000', fontWeight: '800', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                            >
                                {listaMagistradosUnicos.map(p => <option key={p} value={p} style={{ color: '#000', background: '#fff' }}>{p}</option>)}
                            </select>
                            <select
                                value={compFilters.tipo_b}
                                onChange={e => setCompFilters({ ...compFilters, tipo_b: e.target.value })}
                                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #000', fontWeight: '800', fontSize: '0.85rem', background: '#ffffff', color: '#000000' }}
                            >
                                <option value="todos" style={{ color: '#000', background: '#fff' }}>🔀 Todos (Principales + Cambio Ponente)</option>
                                <option value="principal" style={{ color: '#000', background: '#fff' }}>📌 Solo Principales</option>
                                <option value="cambio" style={{ color: '#000', background: '#fff' }}>🔄 Solo Cambio Ponente</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* MUESTRA DE MÉTRICAS */}
        {compMode !== 'cuellos' && compData && (
            <div className="comp-cards-grid" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div className="comp-card" style={{ background: '#ffffff', border: '3px solid #000000', borderRadius: '12px', padding: '20px', boxShadow: '5px 5px 0 #000000' }}>
                    <h4 style={{ margin: 0, color: '#000000', fontWeight: '900', fontSize: '0.9rem' }}>INGRESOS TOTALES</h4>
                    <div className="comp-values" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0', fontWeight: '900', fontSize: '1.4rem', color: '#000000' }}>
                        <span className="val-a">{compData.grupo_a.metricas.ingresos_totales}</span>
                        <span className="arrow" style={{ color: '#64748b' }}>➔</span>
                        <span className="val-b">{compData.grupo_b.metricas.ingresos_totales}</span>
                    </div>
                    <div 
                        className={`badge ${compData.variaciones.ingresos_pct >= 0 ? 'pos' : 'neg'}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '900',
                            fontSize: '0.8rem',
                            border: '1.5px solid #000',
                            background: compData.variaciones.ingresos_pct >= 0 ? '#dcfce7' : '#fee2e2',
                            color: compData.variaciones.ingresos_pct >= 0 ? '#15803d' : '#b91c1c'
                        }}
                    >
                        {compData.variaciones.ingresos_pct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {compData.variaciones.ingresos_pct}%
                    </div>
                </div>

                <div className="comp-card" style={{ background: '#ffffff', border: '3px solid #000000', borderRadius: '12px', padding: '20px', boxShadow: '5px 5px 0 #000000' }}>
                    <h4 style={{ margin: 0, color: '#000000', fontWeight: '900', fontSize: '0.9rem' }}>EGRESOS (FINALIZADOS)</h4>
                    <div className="comp-values" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0', fontWeight: '900', fontSize: '1.4rem', color: '#000000' }}>
                        <span className="val-a">{compData.grupo_a.metricas.finalizados}</span>
                        <span className="arrow" style={{ color: '#64748b' }}>➔</span>
                        <span className="val-b">{compData.grupo_b.metricas.finalizados}</span>
                    </div>
                    <div 
                        className={`badge ${compData.variaciones.egresos_pct >= 0 ? 'pos' : 'neg'}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '900',
                            fontSize: '0.8rem',
                            border: '1.5px solid #000',
                            background: compData.variaciones.egresos_pct >= 0 ? '#dcfce7' : '#fee2e2',
                            color: compData.variaciones.egresos_pct >= 0 ? '#15803d' : '#b91c1c'
                        }}
                    >
                        {compData.variaciones.egresos_pct >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {compData.variaciones.egresos_pct}%
                    </div>
                </div>

                <div className="comp-card" style={{ background: '#ffffff', border: '3px solid #000000', borderRadius: '12px', padding: '20px', boxShadow: '5px 5px 0 #000000' }}>
                    <h4 style={{ margin: 0, color: '#000000', fontWeight: '900', fontSize: '0.9rem' }}>EFICIENCIA PROCESAL</h4>
                    <div className="comp-values" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0', fontWeight: '900', fontSize: '1.4rem', color: '#000000' }}>
                        <span className="val-a">{compData.grupo_a.metricas.eficiencia}%</span>
                        <span className="arrow" style={{ color: '#64748b' }}>➔</span>
                        <span className="val-b">{compData.grupo_b.metricas.eficiencia}%</span>
                    </div>
                    <div 
                        className={`badge ${compData.variaciones.eficiencia_diff >= 0 ? 'pos' : 'neg'}`}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: '900',
                            fontSize: '0.8rem',
                            border: '1.5px solid #000',
                            background: compData.variaciones.eficiencia_diff >= 0 ? '#dcfce7' : '#fee2e2',
                            color: compData.variaciones.eficiencia_diff >= 0 ? '#15803d' : '#b91c1c'
                        }}
                    >
                        {compData.variaciones.eficiencia_diff >= 0 ? '+' : ''}{compData.variaciones.eficiencia_diff}% diff
                    </div>
                </div>
            </div>
        )}

        {compMode === 'cuellos' && (
            <div className="analysis-grid" style={{ gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
                <div className="card-tabla" style={{ border: '3px solid #ea580c', background: '#fff7ed', borderRadius: '12px' }}>
                    <div className="card-tabla-header" style={{ backgroundColor: '#ea580c', textAlign: 'center', color: '#ffffff', fontWeight: '900' }}>
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