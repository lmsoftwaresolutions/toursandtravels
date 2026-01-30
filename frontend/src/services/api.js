import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Normalize trailing slash for GET requests to avoid 307 redirects
api.interceptors.request.use((config) => {
  if (config.method === "get") {
    const url = config.url || "";
    // Skip if already has query string or trailing slash
    if (url && !url.endsWith("/") && !url.includes("?")) {
      config.url = `${url}/`;
    }
  }
  return config;
});

export default api;
