import React from 'react';
import { DonaCard } from './DonaCard';
import { TablaCard } from './TablaCard';

export const GestionView = ({ cur }) => (
    <div className="gestion-layout">
        <section className="dashboard-section ingresos-section">
            <h2 className="section-title">📊 FLUJO DE INGRESOS PROCESALES</h2>
            <div className="charts-double-grid">
                <DonaCard data={cur.ing_ord} color="#3b82f6" colorSec="#93c5fd" titulo="INGRESOS ORDINARIOS" />
                <DonaCard data={cur.ing_const} color="#8b5cf6" colorSec="#c4b5fd" titulo="INGRESOS CONSTITUCIONALES" />
            </div>
            <div className="tables-double-grid">
                <TablaCard titulo="ORDINARIOS - 1RA INSTANCIA" filas={cur.tablas.ord_1} color="#3b82f6" tipoCol="ing" />
                <TablaCard titulo="ORDINARIOS - 2DA INSTANCIA" filas={cur.tablas.ord_2} color="#60a5fa" tipoCol="ing" />
                <TablaCard titulo="CONSTITUCIONAL - 1RA INSTANCIA" filas={cur.tablas.const_1} color="#8b5cf6" tipoCol="ing" />
                <TablaCard titulo="CONSTITUCIONAL - 2DA INSTANCIA" filas={cur.tablas.const_2} color="#a78bfa" tipoCol="ing" />
            </div>
        </section>

        <hr className="section-divider" />

        <section className="dashboard-section egresos-section">
            <h2 className="section-title">📉 FLUJO DE EGRESOS PROCESALES</h2>
            <div className="charts-double-grid">
                <DonaCard data={cur.egr_ord} color="#ef4444" colorSec="#fca5a5" titulo="EGRESOS ORDINARIOS" />
                <DonaCard data={cur.egr_const} color="#f97316" colorSec="#fdba74" titulo="EGRESOS CONSTITUCIONALES" />
            </div>
            <div className="tables-double-grid">
                <TablaCard titulo="ORDINARIOS - 1RA INSTANCIA" filas={cur.tablas.ord_1} color="#ef4444" tipoCol="egr" />
                <TablaCard titulo="ORDINARIOS - 2DA INSTANCIA" filas={cur.tablas.ord_2} color="#fca5a5" tipoCol="egr" />
                <TablaCard titulo="CONSTITUCIONAL - 1RA INSTANCIA" filas={cur.tablas.const_1} color="#f97316" tipoCol="egr" />
                <TablaCard titulo="CONSTITUCIONAL - 2DA INSTANCIA" filas={cur.tablas.const_2} color="#fdba74" tipoCol="egr" />
            </div>
        </section>
    </div>
);