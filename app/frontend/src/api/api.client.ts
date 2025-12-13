import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const backendUrl = API_BASE || "";

export const api = axios.create({
  baseURL: backendUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Onbekende API-fout";
    console.error(`[API Client Fout] ${message}`, error.response?.data);
    return Promise.reject(new Error(message));
  }
);

