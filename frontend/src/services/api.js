import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// force trailing slash
api.interceptors.request.use((config) => {
  const url = config.url || "";
  if (!url.startsWith("http") && !url.endsWith("/") && !url.includes("?")) {
    config.url = `${url}/`;
  }
  return config;
});

export default api;
