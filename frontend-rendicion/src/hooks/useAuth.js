import { useState, useCallback } from "react";

/**
 * Maneja token, credenciales y perfil de usuario.
 * setLoading/setError se comparten con el resto de la app para que el
 * overlay de carga y el banner de error del login sigan siendo globales.
 */
export function useAuth(API_URL, { setLoading, setError }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("selected_excel_id");
    setToken("");
    setUserProfile(null);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      const res = await fetch(`${API_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Credenciales inválidas");
      }

      const resData = await res.json();
      localStorage.setItem("token", resData.access_token);
      setToken(resData.access_token);
    } catch (err) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // onAdmin/onUser permiten que App.jsx decida qué hacer con el activeTab
  // y la carga de datos administrativos, sin que este hook conozca esas cosas.
  const fetchUserProfile = useCallback(
    async (currentToken = token, { onAdmin, onUser } = {}) => {
      if (!currentToken) return;
      try {
        const res = await fetch(`${API_URL}/api/me`, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (res.status === 401) {
          handleLogout();
          return;
        }
        if (res.ok) {
          const prof = await res.json();
          setUserProfile(prof);
          if (prof.rol === "admin") {
            onAdmin?.(prof);
          } else {
            onUser?.(prof);
          }
        }
      } catch (e) {
        console.error("Error obteniendo perfil:", e);
      }
    },
    [token, handleLogout, API_URL],
  );

  return {
    token,
    username,
    setUsername,
    password,
    setPassword,
    userProfile,
    handleLogin,
    handleLogout,
    fetchUserProfile,
  };
}
