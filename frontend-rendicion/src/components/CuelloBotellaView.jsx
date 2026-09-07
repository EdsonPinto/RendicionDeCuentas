import React, { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Clock3, FileText, Info, RefreshCw, UsersRound } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatNumber = (value, maximumFractionDigits = 0) =>
    Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits });
const formatDays = (value) => `${formatNumber(value, 1)} días`;
const formatPercentage = (value) => `${formatNumber(value, 2)}%`;

export function CuelloBotellaView({ token }) {
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const cargarCuelloBotella = async () => {
        if (!token) {
            setError('No hay token de autenticación.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const respuesta = await fetch(`${API_URL}/api/cuello-botella`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
            if (!respuesta.ok) {
                const errorData = await respuesta.json().catch(() => ({}));
                throw new Error(errorData.detail || `Error al consultar cuello de botella (${respuesta.status})`);
            }
            setDatos(await respuesta.json());
        } catch (err) {
            console.error('Error al cargar cuello de botella:', err);
            setError(err.message || 'No se pudieron cargar los datos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarCuelloBotella(); }, [token]);

    if (loading) return <div className="cuello-botella-container"><div className="cuello-botella-state"><RefreshCw className="cuello-loading-icon" size={30} /><div><h2>CUELLO DE BOTELLA</h2><p>Cargando información de procesos vigentes...</p></div></div></div>;

    if (error) return <div className="cuello-botella-container"><div className="cuello-botella-state cuello-error-state"><AlertTriangle size={30} /><div><h2>Error al cargar información</h2><p>{error}</p></div><button onClick={cargarCuelloBotella} className="btn-action"><RefreshCw size={16} /> REINTENTAR</button></div></div>;

    if (!datos) return <div className="cuello-botella-container"><div className="cuello-botella-state"><FileText size={32} /><div><h2>Sin datos</h2><p>No hay información disponible para mostrar en este momento.</p></div></div></div>;

    const resumen = datos.resumen || {};
    const antiguedad = datos.antiguedad || [];
    const ranking = datos.ranking_ponentes || [];
    const total = Number(resumen.procesos_vigentes || 1);
    const atencionDesde = datos.umbrales?.atencion_desde ?? 180;
    const criticoDesde = datos.umbrales?.critico_desde ?? 365;

    return <div className="cuello-botella-container">
        <header className="cuello-botella-header"><div><div className="cuello-eyebrow"><AlertTriangle size={16} /> MONITOREO EJECUTIVO</div><h2>CUELLO DE BOTELLA</h2><p>Identificación de procesos vigentes con mayor antigüedad y concentración de carga procesal.</p></div><div className="cuello-header-mark"><BarChart3 size={34} /></div></header>

        <div className="cuello-kpi-grid">
            <div className="cuello-kpi-card cuello-kpi-neutral"><div className="cuello-kpi-top"><FileText size={18} /><span>PROCESOS VIGENTES</span></div><strong>{formatNumber(resumen.procesos_vigentes)}</strong><small>Procesos activos</small></div>
            <div className="cuello-kpi-card cuello-kpi-attention"><div className="cuello-kpi-top"><Clock3 size={18} /><span>ATENCIÓN</span></div><strong>{formatNumber(resumen.atencion)}</strong><small>{formatNumber(atencionDesde)}–{formatNumber(criticoDesde - 1)} días</small></div>
            <div className="cuello-kpi-card cuello-kpi-critical"><div className="cuello-kpi-top"><AlertTriangle size={18} /><span>CRÍTICOS</span></div><strong>{formatNumber(resumen.criticos)}</strong><small>{formatNumber(criticoDesde)}+ días</small></div>
            <div className="cuello-kpi-card cuello-kpi-average"><div className="cuello-kpi-top"><BarChart3 size={18} /><span>PROMEDIO</span></div><strong>{formatNumber(resumen.promedio_dias, 1)}</strong><small>Antigüedad promedio</small></div>
            <div className="cuello-kpi-card cuello-kpi-maximum"><div className="cuello-kpi-top"><AlertTriangle size={18} /><span>MÁXIMO</span></div><strong>{formatNumber(resumen.max_dias)}</strong><small>Mayor antigüedad registrada</small></div>
        </div>

        <section className="cuello-section"><div className="cuello-section-header"><h3><BarChart3 size={19} /> Antigüedad de procesos</h3><span>Umbral crítico: {formatNumber(criticoDesde)} días</span></div><div className="cuello-antiguedad">
            {antiguedad.map((item, index) => { const cantidad = Number(item.cantidad || 0); const porcentaje = (cantidad / total) * 100; return <div className="cuello-antiguedad-row" key={`${item.rango}-${index}`}><div className="cuello-antiguedad-info"><strong>{item.rango} días</strong><span>{formatNumber(cantidad)} procesos <b>{formatPercentage(porcentaje)}</b></span></div><div className="cuello-barra-fondo"><div className="cuello-barra" style={{ width: `${Math.min(porcentaje, 100)}%` }} /></div></div>; })}
        </div></section>

        <section className="cuello-section"><div className="cuello-section-header"><h3><UsersRound size={19} /> Concentración por ponente</h3><span>Ordenado por procesos críticos</span></div><div className="cuello-table-wrapper"><table className="cuello-table"><thead><tr><th>#</th><th>PONENTE</th><th>VIGENTES</th><th>CRÍTICOS</th><th>ATENCIÓN</th><th>% CRÍTICO</th><th>PROMEDIO</th><th>MÁXIMO</th></tr></thead><tbody>
            {ranking.map((item, index) => <tr key={`${item.ponente}-${index}`}><td><span className={`cuello-rank ${index < 3 ? 'top-rank' : ''}`}>{index + 1}</span></td><td><strong>{item.ponente}</strong></td><td>{formatNumber(item.procesos_vigentes)}</td><td><span className="cuello-critico">{formatNumber(item.criticos)}</span></td><td>{formatNumber(item.atencion)}</td><td><div className="cuello-percent-cell"><span>{formatPercentage(item.porcentaje_critico)}</span><div className="cuello-percent-track"><i style={{ width: `${Math.min(Number(item.porcentaje_critico || 0), 100)}%` }} /></div></div></td><td>{formatDays(item.promedio_dias)}</td><td>{formatDays(item.max_dias)}</td></tr>)}
        </tbody></table></div></section>

        <section className="cuello-info"><strong><Info size={16} /> ¿Cómo se calcula?</strong><p>Un proceso se considera en <b>atención</b> cuando lleva entre {formatNumber(atencionDesde)} y {formatNumber(criticoDesde - 1)} días vigente.</p><p>Un proceso se considera <b>crítico</b> cuando alcanza o supera los {formatNumber(criticoDesde)} días.</p></section>
    </div>;
}