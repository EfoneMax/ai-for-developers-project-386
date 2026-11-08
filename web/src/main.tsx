import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { client } from "./client/client.gen";
import "./styles.css";

// В разработке Vite проксирует /api на Fastify, в production
// клиент и API могут жить на одном origin.
client.setConfig({ baseUrl: "" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
