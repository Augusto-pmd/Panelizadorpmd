import React from "react";
import { createRoot } from "react-dom/client";
import PanelizadorSF from "./PanelizadorSF.jsx";

// Shim de almacenamiento: en el artefacto de Claude existe window.storage;
// en el navegador usamos localStorage con la misma interfaz.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error("key not found: " + key);
      return { key, value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      return { keys: Object.keys(localStorage).filter((k) => k.startsWith(prefix)) };
    },
  };
}

createRoot(document.getElementById("root")).render(<PanelizadorSF />);
