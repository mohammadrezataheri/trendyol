'use client';

import { Refine } from '@refinedev/core';
import routerProvider from '@refinedev/nextjs-router';
import { resources } from '../config/resources';
import dataProvider from '@refinedev/nestjsx-crud';
import axios from 'axios';
import { authProvider } from './auth-provider';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Create axios instance with credentials (to send cookies)
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with requests
});

// Handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function RefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider(API_URL, axiosInstance)}
      authProvider={authProvider}
      resources={resources}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        projectId: 'trendyol',
      }}
    >
      {children}
    </Refine>
  );
}
