import React, { useState, useEffect } from "react";
import { Trash2, FileSpreadsheet, CheckCircle } from "lucide-react";

export const AdminCrudView = ({
  token,
  userProfile,
  editingUsr,
  usrForm,
  setUsrForm,
  handleSaveUsuario,
  usuariosList,
  handleEditUsuarioClick,
  handleDeleteUsuario,
  nuevoMagistradoInput,
  setNuevoMagistradoInput,
  handleAddMagistrado,
  magistradosList,
  handleDeleteMagistrado,
  handleVincularMagistrado,
  onExcelDeleted,
  onExcelSelected,
}) => {
  const [misExcels, setMisExcels] = useState([]);
  const [selectedExcelId, setSelectedExcelId] = useState(null);
  const [cargandoExcels, setCargandoExcels] = useState(false);

  const fetchMisExcels = async () => {
    if (!token) return;
    try {
      setCargandoExcels(true);
      const res = await fetch("http://localhost:8000/api/excel/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMisExcels(data);
      }
    } catch (e) {
      console.error("Error al obtener los archivos Excel:", e);
    } finally {
      setCargandoExcels(false);
    }
  };

  useEffect(() => {
    fetchMisExcels();
    const savedExcelId = localStorage.getItem("selected_excel_id");
    if (savedExcelId) {
      setSelectedExcelId(Number(savedExcelId));
    }
  }, [token]);

  const handleSelectExcel = async (file) => {
    setSelectedExcelId(file.id);
    localStorage.setItem("selected_excel_id", file.id);

    try {
      const res = await fetch(
        `http://localhost:8000/api/excel/cargar-seleccionado/${file.id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (onExcelSelected) onExcelSelected(data);
      } else {
        alert("Error al cargar los datos del archivo seleccionado.");
      }
    } catch (err) {
      console.error("Error al seleccionar el archivo Excel:", err);
    }
  };

  const handleBorrarExcel = async (excelId, e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar este archivo Excel? Se borrarán todos sus registros asociados.",
      )
    )
      return;

    try {
      const res = await fetch(`http://localhost:8000/api/excel/${excelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setMisExcels(misExcels.filter((item) => item.id !== excelId));
        if (selectedExcelId === excelId) {
          setSelectedExcelId(null);
          localStorage.removeItem("selected_excel_id");
          if (onExcelSelected) onExcelSelected(null);
        }
        if (onExcelDeleted) onExcelDeleted();
        alert("Archivo Excel y sus datos eliminados exitosamente.");
      } else {
        const err = await res.json();
        alert(err.detail || "No se pudo eliminar el archivo.");
      }
    } catch (err) {
      alert(`Error de conexión al eliminar: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h2
        style={{
          textAlign: "center",
          fontWeight: "900",
          fontSize: "24px",
          marginBottom: "25px",
          textTransform: "uppercase",
        }}
      >
        PANEL DE ADMINISTRACIÓN Y GESTIÓN
      </h2>

      {/* Sección Superior: Usuarios y Magistrados */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        {/* Columna 1: Formulario y Tabla de Usuarios */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            border: "2px solid black",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "15px",
              fontSize: "18px",
            }}
          >
            {editingUsr ? "Editar Usuario" : "Crear Usuario"}
          </h3>
          <form
            onSubmit={handleSaveUsuario}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <input
              type="text"
              placeholder="Username"
              value={usrForm.username}
              onChange={(e) =>
                setUsrForm({ ...usrForm, username: e.target.value })
              }
              disabled={!!editingUsr}
              style={{
                padding: "10px",
                border: "1px solid black",
                borderRadius: "4px",
                outline: "none",
              }}
              required
            />
            <input
              type="text"
              placeholder="Nombre completo"
              value={usrForm.nombre}
              onChange={(e) =>
                setUsrForm({ ...usrForm, nombre: e.target.value })
              }
              style={{
                padding: "10px",
                border: "1px solid black",
                borderRadius: "4px",
                outline: "none",
              }}
              required
            />
            <select
              value={usrForm.rol}
              onChange={(e) => setUsrForm({ ...usrForm, rol: e.target.value })}
              style={{
                padding: "10px",
                border: "1px solid black",
                borderRadius: "4px",
                background: "#fff",
                outline: "none",
              }}
            >
              <option value="usuario">Usuario / Magistrado</option>
              <option value="admin">Administrador</option>
            </select>
            <input
              type="password"
              placeholder={
                editingUsr ? "Nueva contraseña (opcional)" : "Contraseña"
              }
              value={usrForm.password}
              onChange={(e) =>
                setUsrForm({ ...usrForm, password: e.target.value })
              }
              style={{
                padding: "10px",
                border: "1px solid black",
                borderRadius: "4px",
                outline: "none",
              }}
              required={!editingUsr}
            />
            <button
              type="submit"
              style={{
                background: "#3b82f6",
                color: "white",
                padding: "10px",
                border: "1px solid black",
                fontWeight: "bold",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              Guardar Usuario
            </button>
          </form>

          {/* Listado de Usuarios Registrados */}
          <h4
            style={{
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "10px",
              fontSize: "16px",
            }}
          >
            Usuarios Registrados
          </h4>
          <div
            style={{
              maxHeight: "180px",
              overflowY: "auto",
              border: "1px solid #ccc",
              padding: "5px",
              borderRadius: "4px",
            }}
          >
            {usuariosList.map((usr, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "13px" }}>
                    {usr.nombre.toUpperCase()}
                  </strong>
                  <small style={{ color: "#666" }}>({usr.username})</small>
                </div>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={() => handleEditUsuarioClick(usr)}
                    style={{
                      padding: "2px 8px",
                      border: "1px solid black",
                      background: "#f3f4f6",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteUsuario(usr.username)}
                    style={{
                      padding: "2px 8px",
                      border: "1px solid black",
                      color: "red",
                      background: "#fef2f2",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna 2: Catálogo de Magistrados */}
        <div
          style={{
            background: "#fff",
            padding: "20px",
            border: "2px solid black",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "15px",
              fontSize: "18px",
            }}
          >
            Catálogo de Magistrados
          </h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input
              type="text"
              placeholder="Nuevo magistrado..."
              value={nuevoMagistradoInput}
              onChange={(e) => setNuevoMagistradoInput(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid black",
                borderRadius: "4px",
                outline: "none",
              }}
            />
            <button
              onClick={handleAddMagistrado}
              style={{
                background: "#22c55e",
                color: "white",
                padding: "0 15px",
                border: "1px solid black",
                fontWeight: "bold",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              Agregar
            </button>
          </div>
          <div
            style={{
              maxHeight: "250px",
              overflowY: "auto",
              border: "1px solid #ccc",
              padding: "5px",
              borderRadius: "4px",
            }}
          >
            {magistradosList.map((mag, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: "bold" }}>
                  {mag}
                </span>
                <div style={{ display: "flex", gap: "5px" }}>
                  <button
                    onClick={() => handleVincularMagistrado(mag)}
                    style={{
                      padding: "2px 8px",
                      border: "1px solid black",
                      background: "#eff6ff",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    Vincular
                  </button>
                  <button
                    onClick={() => handleDeleteMagistrado(mag)}
                    style={{
                      padding: "2px 8px",
                      border: "1px solid black",
                      color: "red",
                      background: "#fef2f2",
                      fontSize: "12px",
                      cursor: "pointer",
                      borderRadius: "3px",
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección Inferior: Recuadro de Gestión y Visualización de Archivos Excel */}
      <div
        style={{
          background: "#fff",
          padding: "20px",
          border: "2px solid black",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      >
        <h3
          style={{
            fontWeight: "900",
            fontSize: "16px",
            marginBottom: "15px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textTransform: "uppercase",
          }}
        >
          <FileSpreadsheet size={20} />
          {userProfile?.rol === "admin"
            ? "Gestión Global de Archivos Excel"
            : "Mis Archivos Excel Disponibles"}
        </h3>

        {cargandoExcels ? (
          <p style={{ fontSize: "13px", color: "#666" }}>
            Cargando archivos...
          </p>
        ) : misExcels.length === 0 ? (
          <p
            style={{
              fontSize: "13px",
              color: "#666",
              textAlign: "center",
              padding: "15px",
            }}
          >
            No hay archivos Excel registrados en este espacio.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "15px",
            }}
          >
            {misExcels.map((file) => (
              <div
                key={file.id}
                onClick={() => handleSelectExcel(file)}
                style={{
                  padding: "12px",
                  border:
                    selectedExcelId === file.id
                      ? "2px solid #3b82f6"
                      : "2px solid black",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: selectedExcelId === file.id ? "#eff6ff" : "#fff",
                }}
              >
                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "13px",
                      maxWidth: "180px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.nombre_archivo}
                  </strong>
                  <small style={{ fontSize: "11px", color: "#666" }}>
                    Cargado: {new Date(file.fecha_carga).toLocaleDateString()}
                  </small>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  {selectedExcelId === file.id && (
                    <CheckCircle size={18} color="#3b82f6" />
                  )}
                  {(userProfile?.rol === "admin" ||
                    file.usuario_id === userProfile?.id) && (
                    <button
                      onClick={(e) => handleBorrarExcel(file.id, e)}
                      style={{
                        padding: "6px",
                        background: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid black",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                      title="Eliminar archivo"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
