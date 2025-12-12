'use client';

import { AuthPage } from '@refinedev/antd';
import { Authenticated } from '@refinedev/core';
import { App, ConfigProvider } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

function RedirectToDashboard() {
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!redirectedRef.current && typeof window !== 'undefined') {
      redirectedRef.current = true;
      window.location.href = '/dashboard';
    }
  }, []);

  return null;
}

export default function Login() {
  return (
    <Authenticated
      key="login-page"
      fallback={
        <App>
          <ConfigProvider
            direction="rtl"
            theme={{
              token: {
                fontFamily: "'Vazirmatn', sans-serif",
                borderRadius: 8,
              },
            }}
          >
            <div
              style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '24px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  background: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                }}
              >
                <AuthPage
                  type="login"
                  formProps={{
                    initialValues: {
                      email: '',
                      password: '',
                    },
                  }}
                />
              </div>
            </div>
          </ConfigProvider>
        </App>
      }
    >
      <RedirectToDashboard />
    </Authenticated>
  );
}

