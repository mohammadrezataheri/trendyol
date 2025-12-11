'use client';

import { AuthPage } from '@refinedev/antd';
import { Authenticated } from '@refinedev/core';
import { App } from 'antd';
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
          <AuthPage
            type="login"
            formProps={{
              initialValues: {
                email: '',
                password: '',
              },
            }}
          />
        </App>
      }
      redirectOnSuccess="/dashboard"
    >
      <RedirectToDashboard />
    </Authenticated>
  );
}

