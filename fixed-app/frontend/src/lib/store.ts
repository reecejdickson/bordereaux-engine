/**
 * Authentication state management using Zustand
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          const token = response.access_token;
          
          // Store token
          localStorage.setItem('token', token);
          
          // Fetch user info
          const user = await authApi.getCurrentUser();
          
          set({ token, user, isLoading: false });
        } catch (error: any) {
          const message = error.response?.data?.detail || 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      
      loadUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ user: null, token: null });
          return;
        }
        
        set({ isLoading: true });
        try {
          const user = await authApi.getCurrentUser();
          set({ user, token, isLoading: false });
        } catch (error) {
          localStorage.removeItem('token');
          set({ user: null, token: null, isLoading: false });
        }
      },
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
