import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials, userType = 'student') => {
        set({ isLoading: true, error: null });
        try {
          const endpoint = userType === 'admin' ? '/auth/admin/login' : '/auth/student/login';
          const response = await api.post(endpoint, credentials);
          
          const { token, user } = response.data;
          
          // Set auth token for future requests
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Set state and wait for it to complete
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });

          // Verify the state was set properly
          const currentState = get();
          console.log('Login successful, auth state:', {
            isAuthenticated: currentState.isAuthenticated,
            user: currentState.user?.name || currentState.user?.rollNumber,
            role: currentState.user?.role || 'student'
          });
          
          return { success: true, user, token };
        } catch (error) {
          console.error('Login error:', error);
          const errorMessage = error.response?.data?.message || 'Login failed';
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      },

      // Logout action
      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // Clear auth token
          delete api.defaults.headers.common['Authorization'];
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      },

      // Get current user profile
      getCurrentUser: async () => {
        const { token } = get();
        if (!token) return null;

        try {
          set({ isLoading: true });
          const response = await api.get('/auth/me');
          const user = response.data.user;
          
          set({ user, isLoading: false });
          return user;
        } catch (error) {
          console.error('Get current user error:', error);
          set({ isLoading: false });
          // If token is invalid, logout
          if (error.response?.status === 401) {
            get().logout();
          }
          return null;
        }
      },

      // Initialize auth state
      initializeAuth: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          get().getCurrentUser();
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Update user profile
      updateProfile: (userData) => {
        set(state => ({
          user: { ...state.user, ...userData }
        }));
      },

      // Refresh user data from server
      refreshUser: async () => {
        const { token } = get();
        if (!token) return null;

        try {
          const response = await api.get('/auth/me');
          const user = response.data.user;
          
          set({ user });
          return user;
        } catch (error) {
          console.error('Refresh user error:', error);
          // If token is invalid, logout
          if (error.response?.status === 401) {
            get().logout();
          }
          return null;
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore; 