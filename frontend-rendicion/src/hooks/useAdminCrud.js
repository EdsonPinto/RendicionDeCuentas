import { useState, useCallback, useRef } from "react";

/**
 * Todo el estado y las acciones del panel de administración
 * (usuarios y magistrados). setLoading se comparte con el resto de la app.
 */
export function useAdminCrud(API_URL, token, { setLoading }) {
  const [usuariosList, setUsuariosList] = useState([]);
  const [magistradosList, setMagistradosList] = useState([]);
  const [nuevoMagistradoInput, setNuevoMagistradoInput] = useState("");
  const [usrForm, setUsrForm] = useState({
    username: "",
    nombre: "",
    rol: "usuario",
    password: "",
  });
  const [editingUsr, setEditingUsr] = useState(null);

  // Evita condiciones de carrera entre fetchAdminData y una sincronización
  // de catálogo disparada en paralelo (ver App.jsx).
  const catalogMutationVersionRef = useRef(0);
  const adminCatalogRequestIdRef = useRef(0);

  const fetchAdminData = useCallback(
    async (tok = token) => {
      if (!tok) return;
      const requestId = ++adminCatalogRequestIdRef.current;
      const requestVersion = catalogMutationVersionRef.current;
      try {
        const [resUsr, resMag] = await Promise.all([
          fetch(`${API_URL}/api/admin/usuarios`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          fetch(`${API_URL}/api/admin/magistrados`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
        ]);
        if (resUsr.ok) setUsuariosList(await resUsr.json());
        if (
          resMag.ok &&
          requestId === adminCatalogRequestIdRef.current &&
          requestVersion === catalogMutationVersionRef.current
        ) {
          const dataM = await resMag.json();
          setMagistradosList(dataM.magistrados || []);
        }
      } catch (e) {
        console.error("Error al cargar datos administrativos:", e);
      }
    },
    [token, API_URL],
  );

  const handleSaveUsuario = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    try {
      const isEdit = !!editingUsr;
      const url = isEdit
        ? `${API_URL}/api/admin/usuarios/${editingUsr}`
        : `${API_URL}/api/admin/usuarios`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(usrForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error guardando usuario");
      }

      setUsrForm({ username: "", nombre: "", rol: "usuario", password: "" });
      setEditingUsr(null);
      await fetchAdminData();
      alert(
        isEdit ? "Usuario actualizado con éxito" : "¡Usuario creado con éxito!",
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUsuarioClick = (usr) => {
    setEditingUsr(usr.username);
    setUsrForm({
      username: usr.username,
      nombre: usr.nombre,
      rol: usr.rol,
      password: "",
    });
  };

  const handleVincularMagistrado = (nombreMag) => {
    setEditingUsr(null);
    setUsrForm({
      username: "",
      nombre: nombreMag,
      rol: "usuario",
      password: "",
    });
  };

  const handleDeleteUsuario = async (usrUsername) => {
    if (
      !window.confirm(`¿Seguro que deseas eliminar al usuario ${usrUsername}?`)
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/usuarios/${usrUsername}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al eliminar");
      }
      await fetchAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMagistrado = async () => {
    const nombreNuevo = nuevoMagistradoInput.trim();
    if (!nombreNuevo) return;
    const nuevaLista = [...magistradosList, nombreNuevo];
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/magistrados`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ magistrados: nuevaLista }),
      });
      if (res.ok) {
        setNuevoMagistradoInput("");
        await fetchAdminData();
        alert(`Magistrado "${nombreNuevo}" creado exitosamente.`);
      } else {
        throw new Error("No se pudo agregar el magistrado.");
      }
    } catch (e) {
      alert(`Error actualizando magistrados: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMagistrado = async (nombreMag) => {
    const nuevaLista = magistradosList.filter((m) => m !== nombreMag);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/magistrados`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ magistrados: nuevaLista }),
      });
      if (res.ok) {
        await fetchAdminData();
        alert(`Magistrado "${nombreMag}" eliminado exitosamente.`);
      } else {
        throw new Error("No se pudo eliminar el magistrado.");
      }
    } catch (e) {
      alert(`Error eliminando magistrado: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Solo hace el POST de sincronización del catálogo derivado del Excel.
  // App.jsx decide cuándo llamarlo y cómo actualizar magistradosList
  // (misma lógica de dedupe por syncKey que tenía el useEffect original).
  const syncMagistradosCatalog = useCallback(
    (catalogoDerivado) => {
      catalogMutationVersionRef.current += 1;
      return fetch(`${API_URL}/api/admin/magistrados`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ magistrados: catalogoDerivado }),
      });
    },
    [token, API_URL],
  );

  return {
    usuariosList,
    magistradosList,
    setMagistradosList,
    nuevoMagistradoInput,
    setNuevoMagistradoInput,
    usrForm,
    setUsrForm,
    editingUsr,
    fetchAdminData,
    handleSaveUsuario,
    handleEditUsuarioClick,
    handleVincularMagistrado,
    handleDeleteUsuario,
    handleAddMagistrado,
    handleDeleteMagistrado,
    syncMagistradosCatalog,
  };
}
