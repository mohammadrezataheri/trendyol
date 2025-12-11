'use client';

import { Authenticated } from '@refinedev/core';
import { useEffect, useRef } from 'react';

function RedirectToLogin() {
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!redirectedRef.current && typeof window !== 'undefined') {
      redirectedRef.current = true;
      window.location.href = '/login';
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <div>در حال هدایت به صفحه ورود...</div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <Authenticated
      key="protected-route"
      fallback={<RedirectToLogin />}
      loading={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <div>در حال بارگذاری...</div>
        </div>
      }
    >
      {children}
    </Authenticated>
  );
}
