import React from 'react';
import { X, FileText } from 'lucide-react';

export const ProcesoModal = ({ selectedProceso, setSelectedProceso }) => {
    if (!selectedProceso) return null;

    return (
        <div 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: 'rgba(0, 0, 0, 0.6)', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                zIndex: 2000 
            }}
        >
            <div 
                style={{ 
                    background: '#ffffff', 
                    border: '3px solid #000000', 
                    borderRadius: '16px', 
                    padding: '28px', 
                    width: '90%', 
                    maxWidth: '480px', 
                    boxShadow: '8px 8px 0 #000000' 
                }}
            >
                {/* CABECERA DE MODAL */}
                <div 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        marginBottom: '20px', 
                        borderBottom: '2px solid #000000', 
                        paddingBottom: '12px' 
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={20} color="#000000" />
                        <h3 style={{ fontWeight: '900', fontSize: '1.1rem', color: '#000000', margin: 0 }}>
                            DETALLE DEL PROCESO
                        </h3>
                    </div>
                    <button 
                        onClick={() => setSelectedProceso(null)} 
                        style={{ 
                            background: '#ef4444', 
                            border: '2px solid #000000', 
                            borderRadius: '8px', 
                            padding: '6px', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '2px 2px 0 #000000'
                        }}
                    >
                        <X size={18} color="#ffffff" />
                    </button>
                </div>

                {/* CUERPO CON INFORMACIÓN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#000000' }}>
                    <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                        <strong style={{ color: '#000000', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>RADICADO:</strong>
                        <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '0.95rem', color: '#000000' }}>
                            {selectedProceso.radicado}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '2px solid #000000', textAlign: 'center' }}>
                        <div>
                            <strong style={{ color: '#000000' }}>MEDIO DE CONTROL: </strong>
                            <span style={{ color: '#000000', fontWeight: '600' }}>{selectedProceso.medio}</span>
                        </div>
                        <div>
                            <strong style={{ color: '#000000' }}>DESPACHO / PONENTE: </strong>
                            <span style={{ color: '#000000', fontWeight: '600' }}>{selectedProceso.ponente}</span>
                        </div>
                        <div>
                            <strong style={{ color: '#000000' }}>ESTADO: </strong>
                            <span style={{ color: '#000000', fontWeight: '600' }}>
                                {selectedProceso.sin_salida ? 'SIN SALIDA REGISTRADA' : 'ACTIVO / VIGENTE'}
                            </span>
                        </div>
                        <div>
                            <strong style={{ color: '#000000' }}>TIEMPO TRANSCURRIDO: </strong>
                            <span style={{ color: '#000000', fontWeight: '600' }}>
                                {selectedProceso.dias >= 0 ? `${selectedProceso.dias} días` : 'No disponible'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BOTÓN CERRAR CON TEXTO FORZADO VIA SPAN */}
                <button 
                    onClick={() => setSelectedProceso(null)} 
                    style={{ 
                        width: '100%', 
                        marginTop: '22px', 
                        backgroundColor: '#000000', 
                        border: '2px solid #000000', 
                        padding: '12px', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        boxShadow: '3px 3px 0 #64748b'
                    }}
                >
                    <span style={{ color: '#ffffff', fontWeight: '900', fontSize: '0.9rem', display: 'block' }}>
                        CERRAR DETALLE
                    </span>
                </button>
            </div>
        </div>
    );
};