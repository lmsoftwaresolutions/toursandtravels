import api from "./api";

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

export const authService = {
  async login(username, password) {
    try {
      const response = await api.post("/auth/login", {
        username,
        email: username,
        password,
      });
      const { token, user } = response.data;
      
      // Store token and user info
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      
      // Add token to API headers
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      return { token, user };
    } catch (error) {
      throw error.response?.data?.detail || "Login failed";
    }
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    delete api.defaults.headers.common["Authorization"];
  },

  getToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getUser() {
    const user = localStorage.getItem(AUTH_USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  isAdmin() {
    const user = this.getUser();
    return user?.role === "admin";
  },

  hasLimitedAccess() {
    const user = this.getUser();
    return user?.role === "limited";
  },

  initializeAuth() {
    const token = this.getToken();
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },
};
