import React, { useState, useEffect, useCallback } from "react";
import {
  FileUp,
  Download,
  Loader2,
  Building2,
  User,
  CheckCircle2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const GestionExcelesView = ({
  token,
  onLogout,
  selectedExcelId,
  onExcelSelected,
}) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/excel/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        onLogout?.();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Error al cargar la lista de archivos:", error);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("es_global", "false");

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/excel/subir-archivo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const resultado = await response.json();
        setMessage("Archivo cargado exitosamente. Mostrando tus datos ahora.");
        setSelectedFile(null);
        fetchFiles();
        // Activa automáticamente el archivo recién subido para este usuario,
        // así los módulos de análisis se actualizan solos con sus datos.
        onExcelSelected?.(resultado);
      } else {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          setMessage(
            errData.detail ||
              "Este archivo ya fue cargado anteriormente en el sistema.",
          );
        } else {
          setMessage(errData.detail || "Error al subir el archivo.");
        }
      }
    } catch (err) {
      console.error("Error al subir el archivo:", err);
      setMessage("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, nombreArchivo) => {
    try {
      const response = await fetch(`${API_URL}/api/excel/${fileId}/descargar`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        alert("No tienes permisos para descargar este archivo o no existe.");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando el archivo:", error);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("¿Eliminar este archivo?")) return;
    try {
      const response = await fetch(`${API_URL}/api/excel/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        fetchFiles();
      } else {
        alert("No se pudo eliminar el archivo.");
      }
    } catch (error) {
      console.error("Error eliminando el archivo:", error);
    }
  };

  const handleSelectExcel = async (file) => {
    try {
      const response = await fetch(
        `${API_URL}/api/excel/cargar-seleccionado/${file.id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        onExcelSelected?.(data);
      } else {
        alert("No se pudo seleccionar este archivo.");
      }
    } catch (error) {
      console.error("Error al seleccionar el archivo:", error);
    }
  };

  const archivosInstitucionales = files.filter((f) => f.es_global);
  const misArchivos = files.filter((f) => !f.es_global && f.es_propietario);

  // Determina si la vista activa hoy es la institucional o la personal,
  // para resaltar el botón correspondiente en el selector rápido.
  const modoActivo = (() => {
    if (!selectedExcelId) return null;
    if (archivosInstitucionales.some((f) => f.id === selectedExcelId))
      return "global";
    if (misArchivos.some((f) => f.id === selectedExcelId)) return "personal";
    return null;
  })();

  const irAInstitucional = () => {
    if (archivosInstitucionales.length > 0)
      handleSelectExcel(archivosInstitucionales[0]);
  };

  const irAMisDatos = () => {
    if (misArchivos.length > 0) handleSelectExcel(misArchivos[0]);
  };

  const renderTarjeta = (file, esPropio) => {
    const seleccionado = selectedExcelId === file.id;
    return (
      <div
        key={file.id}
        className={`excel-card${seleccionado ? " excel-card-selected" : ""}`}
        onClick={() => handleSelectExcel(file)}
      >
        <div className="excel-card-info">
          <strong>{file.nombre_archivo}</strong>
          <small>
            Cargado: {new Date(file.fecha_carga).toLocaleDateString()}
            {!esPropio && ` — subido por ${file.usuario_nombre}`}
          </small>
        </div>
        <div className="excel-card-actions">
          {seleccionado && (
            <CheckCircle2 size={18} className="excel-card-check" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(file.id, file.nombre_archivo);
            }}
            className="excel-btn excel-btn-ghost"
          >
            <Download size={14} /> Descargar
          </button>
          {esPropio && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file.id);
              }}
              className="excel-btn excel-btn-danger"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="gestion-exceles-usuario">
      <h1>Gestión de Exceles</h1>
      <p className="gestion-exceles-hint">
        Toca un archivo para usarlo como fuente de datos en Gestión Procesal,
        Análisis Estratégico, Comparativas y Cuello de Botella.
      </p>

      {(archivosInstitucionales.length > 0 || misArchivos.length > 0) && (
        <div className="excel-mode-toggle">
          <button
            className={`excel-mode-btn${modoActivo === "global" ? " active" : ""}`}
            onClick={irAInstitucional}
            disabled={archivosInstitucionales.length === 0}
          >
            <Building2 size={14} /> Vista Institucional (Global)
          </button>
          <button
            className={`excel-mode-btn${modoActivo === "personal" ? " active" : ""}`}
            onClick={irAMisDatos}
            disabled={misArchivos.length === 0}
          >
            <User size={14} /> Mis Datos
          </button>
        </div>
      )}

      <form onSubmit={handleUpload} className="upload-form">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <button
          type="submit"
          disabled={loading || !selectedFile}
          className="excel-btn excel-btn-primary"
        >
          {loading ? (
            <Loader2 className="spinner" size={16} />
          ) : (
            <FileUp size={16} />
          )}
          {loading ? "Subiendo..." : "Subir mi archivo"}
        </button>
      </form>
      {message && <p className="upload-message">{message}</p>}

      <section className="excel-section">
        <h2>
          <Building2 size={18} /> Exceles institucionales
        </h2>
        {archivosInstitucionales.length === 0 && (
          <p className="excel-empty">
            No hay archivos institucionales disponibles.
          </p>
        )}
        <div className="excel-card-list">
          {archivosInstitucionales.map((file) => renderTarjeta(file, false))}
        </div>
      </section>

      <section className="excel-section">
        <h2>
          <User size={18} /> Mis Exceles
        </h2>
        {misArchivos.length === 0 && (
          <p className="excel-empty">Aún no has cargado archivos propios.</p>
        )}
        <div className="excel-card-list">
          {misArchivos.map((file) => renderTarjeta(file, true))}
        </div>
      </section>
    </div>
  );
};
