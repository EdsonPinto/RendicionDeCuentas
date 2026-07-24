import React from 'react';
import { X } from 'lucide-react';

export const ProcesoModal = ({ selectedProceso, setSelectedProceso }) => {
    if (!selectedProceso) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ background: '#fff', border: '3px solid #000', borderRadius: '16px', padding: '30px', width: '90%', maxWidth: '500px', boxShadow: '8px 8px 0 #000' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                    <h3 style={{ fontWeight: '900', fontSize: '1.1rem' }}>📄 DETALLE DEL PROCESO</h3>
                    <button onClick={() => setSelectedProceso(null)} style={{ background: '#ef4444', color: '#fff', border: '2px solid #000', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '900' }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', fontWeight: '800' }}>
                    <div><strong>RADICADO:</strong> <span style={{ fontWeight: 'normal', fontFamily: 'monospace' }}>{selectedProceso.radicado}</span></div>
                    <div><strong>MEDIO DE CONTROL:</strong> <span style={{ fontWeight: 'normal' }}>{selectedProceso.medio}</span></div>
                    <div><strong>DESPACHO / PONENTE:</strong> <span style={{ fontWeight: 'normal' }}>{selectedProceso.ponente}</span></div>
                    <div><strong>ESTADO:</strong> <span style={{ fontWeight: 'normal' }}>{selectedProceso.sin_salida ? 'SIN SALIDA REGISTRADA' : 'ACTIVO / VIGENTE'}</span></div>
                    <div><strong>TIEMPO TRANSCURRIDO:</strong> <span style={{ fontWeight: 'normal' }}>{selectedProceso.dias >= 0 ? `${selectedProceso.dias} días` : 'No disponible'}</span></div>
                </div>
                <button onClick={() => setSelectedProceso(null)} style={{ width: '100%', marginTop: '24px', backgroundColor: '#000', color: '#fff', border: '2px solid #000', padding: '10px', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>
                    CERRAR DETALLE
                </button>
            </div>
        </div>
    );
};