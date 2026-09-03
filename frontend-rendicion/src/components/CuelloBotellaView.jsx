import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function CuelloBotellaView({ token }) {
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // =========================================================
    // CARGAR DATOS DEL CUELLO DE BOTELLA
    // =========================================================
    const cargarCuelloBotella = async () => {
        if (!token) {
            setError('No hay token de autenticación.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const respuesta = await fetch(
                `${API_URL}/api/cuello-botella`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!respuesta.ok) {
                const errorData = await respuesta.json().catch(() => ({}));

                throw new Error(
                    errorData.detail ||
                    `Error al consultar cuello de botella (${respuesta.status})`
                );
            }

            const resultado = await respuesta.json();

            console.log('CUELLO DE BOTELLA:', resultado);

            setDatos(resultado);

        } catch (err) {
            console.error('Error al cargar cuello de botella:', err);
            setError(err.message || 'No se pudieron cargar los datos.');
        } finally {
            setLoading(false);
        }

    };

    // =========================================================
    // CARGAR AUTOMÁTICAMENTE AL ENTRAR
    // =========================================================
    useEffect(() => {
        cargarCuelloBotella();
    }, [token]);

    // =========================================================
    // ESTADO DE CARGA
    // =========================================================
    if (loading) {
        return (
            <div className="cuello-botella-container">
                <div className="cuello-botella-loading">
                    <h2>🚨 Cuello de Botella</h2>
                    <p>Analizando procesos vigentes...</p>
                </div>
            </div>
        );
    }

    // =========================================================
    // ESTADO DE ERROR
    // =========================================================
    if (error) {
        return (
            <div className="cuello-botella-container">
                <div className="cuello-botella-error">
                    <h2>🚨 Cuello de Botella</h2>
                    <p>{error}</p>

                    <button
                        onClick={cargarCuelloBotella}
                        className="btn-action"
                    >
                        🔄 REINTENTAR
                    </button>
                </div>
            </div>
        );

    }

    if (!datos) {
        return null;
    }

    const resumen = datos.resumen || {};
    const antiguedad = datos.antiguedad || [];
    const ranking = datos.ranking_ponentes || [];

    // =========================================================
    // VISTA PRINCIPAL
    // =========================================================
    return (
        <div className="cuello-botella-container">

            {/* =====================================================
            ENCABEZADO
            ====================================================== */}
            <div className="cuello-botella-header">
                <div>
                    <h2>🚨 CUELLO DE BOTELLA</h2>
                    <p>
                        Identificación de procesos vigentes con mayor antigüedad
                        y concentración de carga procesal.
                    </p>
                </div>
            </div>

            {/*  =====================================================
                 RESUMEN GENERAL
                 ====================================================== */}
            <div className="cuello-kpi-grid">

                <div className="cuello-kpi-card">
                    <span className="cuello-kpi-label">
                        PROCESOS VIGENTES
                    </span>

                    <strong>
                        {resumen.procesos_vigentes ?? 0}
                    </strong>
                </div>

                <div className="cuello-kpi-card">
                    <span className="cuello-kpi-label">
                        ATENCIÓN
                    </span>

                    <strong>
                        {resumen.atencion ?? 0}
                    </strong>

                    <small>
                        180 - 364 días
                    </small>
                </div>

                <div className="cuello-kpi-card">
                    <span className="cuello-kpi-label">
                        CRÍTICOS
                    </span>

                    <strong>
                        {resumen.criticos ?? 0}
                    </strong>

                    <small>
                        365+ días
                    </small>
                </div>

                <div className="cuello-kpi-card">
                    <span className="cuello-kpi-label">
                        PROMEDIO
                    </span>

                    <strong>
                        {resumen.promedio_dias ?? 0}
                    </strong>

                    <small>
                        días
                    </small>
                </div>

                <div className="cuello-kpi-card">
                    <span className="cuello-kpi-label">
                        MÁXIMO
                    </span>

                    <strong>
                        {resumen.max_dias ?? 0}
                    </strong>

                    <small>
                        días
                    </small>
                </div>

            </div>

            {/* =====================================================
                ANTIGÜEDAD
                ====================================================== */}
            <section className="cuello-section">

                <div className="cuello-section-header">
                    <h3>📊 Antigüedad de procesos</h3>

                    <span>
                        Umbral crítico: {datos.umbrales?.critico_desde ?? 365} días
                    </span>
                </div>

                <div className="cuello-antiguedad">

                    {antiguedad.map((item, index) => {

                        const cantidad = Number(item.cantidad || 0);

                        const total = Number(
                            resumen.procesos_vigentes || 1
                        );

                        const porcentaje = Math.round(
                            (cantidad / total) * 100
                        );

                        return (
                            <div
                                className="cuello-antiguedad-row"
                                key={`${item.rango}-${index}`}
                            >

                                <div className="cuello-antiguedad-info">
                                    <strong>{item.rango}</strong>

                                    <span>
                                        {cantidad} procesos ({porcentaje}%)
                                    </span>
                                </div>

                                <div className="cuello-barra-fondo">

                                    <div
                                        className="cuello-barra"
                                        style={{
                                            width: `${porcentaje}%`,
                                        }}
                                    />

                                </div>

                            </div>
                        );
                    })}

                </div>

            </section>

            {/* =====================================================
                RANKING DE PONENTES
                ====================================================== */}
            <section className="cuello-section">

                <div className="cuello-section-header">
                    <h3>👥 Concentración por ponente</h3>

                    <span>
                        Ordenado por procesos críticos
                    </span>
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
                                        {index + 1}
                                    </td>

                                    <td>
                                        <strong>
                                            {item.ponente}
                                        </strong>
                                    </td>

                                    <td>
                                        {item.procesos_vigentes}
                                    </td>

                                    <td>
                                        <span className="cuello-critico">
                                            {item.criticos}
                                        </span>
                                    </td>

                                    <td>
                                        {item.atencion}
                                    </td>

                                    <td>
                                        {item.porcentaje_critico}%
                                    </td>

                                    <td>
                                        {item.promedio_dias} días
                                    </td>

                                    <td>
                                        {item.max_dias} días
                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </section>

            {/* =====================================================
                INFORMACIÓN
                ====================================================== */}
            <section className="cuello-info">

                <strong>ℹ️ ¿Cómo se calcula?</strong>

                <p>
                    Un proceso se considera en <b>atención</b> cuando lleva
                    entre {datos.umbrales?.atencion_desde ?? 180} y{' '}
                    {(datos.umbrales?.critico_desde ?? 365) - 1} días
                    vigente.
                </p>

                <p>
                    Un proceso se considera <b>crítico</b> cuando alcanza o
                    supera los {datos.umbrales?.critico_desde ?? 365} días.
                </p>

            </section>

        </div>

    );
}