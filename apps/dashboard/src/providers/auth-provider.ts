import { AuthProvider } from '@refinedev/core';
import axios from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Create axios instance with credentials
const axiosInstance = axios.create({
  withCredentials: true,
});

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const response = await axiosInstance.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      if (response.data.user) {
        // Token is stored in HTTP-only cookie, only save user info
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return {
          success: true,
          redirectTo: '/dashboard',
        };
      }

      return {
        success: false,
        error: {
          name: 'LoginError',
          message: 'Invalid credentials',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: 'LoginError',
          message: error.response?.data?.message || 'Login failed',
        },
      };
    }
  },
  register: async ({ email, password, firstName, lastName }) => {
    try {
      const response = await axiosInstance.post(`${API_URL}/auth/register`, {
        email,
        password,
        firstName,
        lastName,
      });

      if (response.data.user) {
        // Token is stored in HTTP-only cookie, only save user info
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return {
          success: true,
          redirectTo: '/dashboard',
        };
      }

      return {
        success: false,
        error: {
          name: 'RegisterError',
          message: 'Registration failed',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: 'RegisterError',
          message: error.response?.data?.message || 'Registration failed',
        },
      };
    }
  },
  logout: async () => {
    try {
      // Call logout endpoint to clear cookie on server
      await axiosInstance.post(`${API_URL}/auth/logout`);
    } catch (error) {
      // Continue even if logout request fails
    }
    localStorage.removeItem('user');
    return {
      success: true,
      redirectTo: '/login',
    };
  },
  check: async () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        // Verify token with backend (token is sent via cookie)
        const response = await axiosInstance.get(`${API_URL}/users/profile`);

        if (response.data) {
          return {
            authenticated: true,
          };
        }
      } catch (error) {
        localStorage.removeItem('user');
        return {
          authenticated: false,
          error: {
            message: 'Session expired',
            name: 'SessionError',
          },
          redirectTo: '/login',
        };
      }
    }

    return {
      authenticated: false,
      redirectTo: '/login',
    };
  },
  onError: async (error) => {
    if (error?.status === 401) {
      return {
        logout: true,
        redirectTo: '/login',
        error,
      };
    }

    return { error };
  },
  getIdentity: async () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user;
      } catch {
        return null;
      }
    }
    return null;
  },
  getPermissions: async () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.roles || [];
      } catch {
        return [];
      }
    }
    return [];
  },
};
