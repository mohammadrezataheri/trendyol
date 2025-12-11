'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function RedirectToLogin() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

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

