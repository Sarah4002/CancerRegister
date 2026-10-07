import { create } from 'zustand';
import { authService } from '../services/api';

// PATTERN — Store global Zustand : état d'authentification et actions centralisés,
// consommés par les routes et les composants sans propager l'état de parent en enfant.
const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Restore session from localStorage
  initAuth: () => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    if (token && userData) {
      try {
        set({ user: JSON.parse(userData), isAuthenticated: true });
      } catch {
        localStorage.clear();
      }
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authService.login(credentials);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      set({ user: data.user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Identifiants incorrects.';
      set({ isLoading: false, error: message });
      return { success: false, error: message };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authService.register(userData);
      set({ isLoading: false });
      return { success: true, message: data.message };
    } catch (err) {
      const errors = err.response?.data || {};
      set({ isLoading: false, error: errors });
      return { success: false, errors };
    }
  },

  logout: async () => {
    const refresh = localStorage.getItem('refresh_token');
    try {
      if (refresh) await authService.logout(refresh);
    } catch {}
    localStorage.clear();
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
