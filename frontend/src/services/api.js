import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔥 attach token correctly
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token"); // ✅ SAME KEY
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
