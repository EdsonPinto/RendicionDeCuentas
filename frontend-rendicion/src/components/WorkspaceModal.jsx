import React, { useState, useEffect } from 'react';
import { Folder, Upload, Trash2, CheckCircle, ShieldAlert, FileText } from 'lucide-react';

export default function WorkspaceModal({
    show,
    onClose,
    onSelectDocument,
    onUploadNew,
    currentUser
}) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/documentos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (err) {
            console.error("Error al cargar documentos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchDocuments();
        }
    }, [show]);

    const handleDelete = async (e, docId) => {
        e.stopPropagation();
        if (!window.confirm("¿Estás seguro de eliminar este documento y todos sus registros procesales asociados?")) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/documentos/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchDocuments();
            } else {
                const errData = await res.json();
                alert(errData.detail || "Error al eliminar el documento.");
            }
        } catch (err) {
            console.error("Error eliminando documento:", err);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/excel/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                onUploadNew(data);
                onClose();
            } else {
                alert("Error al subir el archivo Excel.");
            }
        } catch (err) {
            console.error("Error subiendo archivo:", err);
        } finally {
            setUploading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="modal-content" style={{
                background: '#ffffff', borderRadius: '8px', padding: '24px',
                maxWidth: '700px', width: '90%', maxHeight: '85vh', overflowY: 'auto'
            }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                    <Folder size={24} /> Seleccionar Espacio de Trabajo / Documento
                </h2>
                <p style={{ color: '#666' }}>
                    Selecciona un conjunto de datos cargado previamente o sube un nuevo Excel para analizar.
                </p>

                {/* Zona de Carga Directa */}
                <div style={{
                    border: '2px dashed #ccc', borderRadius: '6px', padding: '20px',
                    textAlign: 'center', marginBottom: '20px', background: '#f9f9f9'
                }}>
                    <Upload size={32} style={{ color: '#555', marginBottom: '8px' }} />
                    <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Cargar Nuevo Archivo Excel</p>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        id="workspace-file-input"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                    <label
                        htmlFor="workspace-file-input"
                        className="btn-action"
                        style={{
                            background: '#000', color: '#fff', padding: '8px 16px',
                            borderRadius: '4px', cursor: 'pointer', display: 'inline-block'
                        }}
                    >
                        {uploading ? "Subiendo..." : "Explorar Archivos"}
                    </label>
                </div>

                <h3>Documentos Disponibles</h3>

                {loading ? (
                    <p>Cargando documentos...</p>
                ) : documents.length === 0 ? (
                    <p style={{ color: '#888' }}>No hay documentos disponibles.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {documents.map((doc) => {
                            const isOwnerOrAdmin = doc.is_owner || currentUser?.rol === 'ADMIN';

                            return (
                                <div
                                    key={doc.id}
                                    onClick={() => { onSelectDocument(doc); onClose(); }}
                                    style={{
                                        border: '1px solid #ddd', borderRadius: '6px', padding: '12px 16px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        cursor: 'pointer', transition: 'background 0.2s', background: '#fff'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4f8'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <FileText size={20} style={{ color: '#0056b3' }} />
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{doc.nombre_archivo || doc.filename}</div>
                                            <div style={{ fontSize: '0.82rem', color: '#666' }}>
                                                Subido por: <strong>{doc.uploaded_by_name || 'Sistema'}</strong>
                                                {doc.created_at && ` • ${new Date(doc.created_at).toLocaleDateString()}`}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {doc.is_global && (
                                            <span style={{ fontSize: '0.75rem', background: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '12px' }}>
                                                Global
                                            </span>
                                        )}

                                        {isOwnerOrAdmin ? (
                                            <button
                                                onClick={(e) => handleDelete(e, doc.id)}
                                                title="Eliminar documento"
                                                style={{
                                                    background: 'transparent', border: 'none', color: '#dc3545',
                                                    cursor: 'pointer', padding: '6px', borderRadius: '4px'
                                                }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        ) : (
                                            <span title="Solo lectura (subido por otro usuario)" style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                <ShieldAlert size={16} /> Lectura
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', border: '1px solid #ccc',
                            background: '#fff', borderRadius: '4px', cursor: 'pointer'
                        }}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}