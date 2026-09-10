import React, { useEffect, useState } from "react";
import { Trash2, FileSpreadsheet, CheckCircle } from "lucide-react";

export const ExcelSelectorModal = ({ token, userProfile, onSelectExcel }) => {
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const cargarMisArchivos = async () => {
    try {
      setCargando(true);
      const res = await fetch("/api/excel/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setArchivos(data);
      }
    } catch (e) {
      console.error("Error cargando archivos:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (token) cargarMisArchivos();
  }, [token]);

  const handleEliminar = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar tu archivo Excel?"))
      return;

    try {
      const res = await fetch(`/api/excel/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setArchivos(archivos.filter((a) => a.id !== id));
        if (selectedId === id) setSelectedId(null);
        alert("Archivo eliminado con éxito.");
      } else {
        alert("No fue posible eliminar el archivo.");
      }
    } catch (err) {
      alert(`Error de conexión al eliminar: ${err.message}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border-2 border-black shadow-neo mb-6">
      <h3 className="text-lg font-black mb-4 uppercase flex items-center gap-2">
        <FileSpreadsheet size={20} />
        {userProfile?.rol === "admin"
          ? "Todos los Archivos Creados (Admin)"
          : "Mis Archivos Excel Cargados"}
      </h3>

      {cargando ? (
        <p className="text-sm font-bold text-gray-500">Cargando lista...</p>
      ) : archivos.length === 0 ? (
        <p className="text-sm font-bold text-gray-500">
          No tienes archivos Excel guardados.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {archivos.map((file) => (
            <div
              key={file.id}
              onClick={() => {
                setSelectedId(file.id);
                if (onSelectExcel) onSelectExcel(file);
              }}
              className={`p-4 border-2 border-black rounded-lg cursor-pointer transition flex justify-between items-center ${
                selectedId === file.id
                  ? "bg-blue-50 border-blue-600 shadow-neo"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <div>
                <strong className="block text-sm font-black truncate max-w-[180px]">
                  {file.nombre_archivo}
                </strong>
                <small className="text-xs text-gray-500 font-bold">
                  {new Date(file.fecha_carga).toLocaleDateString()}
                </small>
              </div>

              <div className="flex items-center gap-2">
                {selectedId === file.id && (
                  <CheckCircle size={18} className="text-blue-600" />
                )}
                <button
                  onClick={(e) => handleEliminar(file.id, e)}
                  className="p-2 bg-red-100 text-red-600 rounded border border-black hover:bg-red-200"
                  title="Eliminar este archivo"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
