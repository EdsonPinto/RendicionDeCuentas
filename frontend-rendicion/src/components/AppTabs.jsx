import React from "react";
import { Layers, Users } from "lucide-react";

export function AppTabs({ activeTab, setActiveTab, isAdmin }) {
  return (
    <div className="tabs-container">
      {isAdmin && (
        <button
          className={activeTab === "admin_crud" ? "tab active" : "tab"}
          onClick={() => setActiveTab("admin_crud")}
          style={{
            background: activeTab === "admin_crud" ? "#000" : "#3b82f6",
            color: "#fff",
          }}
        >
          <Users size={16} style={{ display: "inline", marginRight: "6px" }} />{" "}
          👑 USUARIOS Y MAGISTRADOS
        </button>
      )}

      <button
        className={activeTab === "gestion" ? "tab active" : "tab"}
        onClick={() => setActiveTab("gestion")}
      >
        GESTIÓN PROCESAL
      </button>
      <button
        className={activeTab === "analisis" ? "tab active" : "tab"}
        onClick={() => setActiveTab("analisis")}
      >
        ANÁLISIS ESTRATÉGICO
      </button>
      <button
        className={activeTab === "comparativa" ? "tab active" : "tab"}
        onClick={() => setActiveTab("comparativa")}
      >
        <Layers size={16} style={{ display: "inline", marginRight: "6px" }} />{" "}
        ⚖️ COMPARATIVAS
      </button>
      <button
        className={activeTab === "cuello_botella" ? "tab active" : "tab"}
        onClick={() => setActiveTab("cuello_botella")}
      >
        🚨 CUELLO DE BOTELLA
      </button>
    </div>
  );
}
