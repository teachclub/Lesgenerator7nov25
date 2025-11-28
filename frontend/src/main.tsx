import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

// Globale styles
import "./index.css";
import "./styles/lesgo.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

