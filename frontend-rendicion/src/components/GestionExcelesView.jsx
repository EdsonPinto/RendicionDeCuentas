import React, { useState, useEffect } from "react";
import { Download, Building2, User, CheckCircle2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const GestionExcelesView = ({
  token,
  onLogout,
  selectedExcelId,
  onExcelSelected,
}) => {
  const [files, setFiles] = useState([]);

  const fetchFiles = async () => {
    if (!token) return;
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
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      <h1>Selección de Excel</h1>
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

      <section className="excel-section" style={{ marginTop: "20px" }}>
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
