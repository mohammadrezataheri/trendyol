'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function RefinePage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect root to dashboard
    if (pathname === '/') {
      router.push('/dashboard');
    }
  }, [pathname, router]);

  // Don't show anything for login page (it has its own layout)
  if (pathname === '/login') {
    return null;
  }

  // This page is just for catch-all routing
  // The actual content is rendered via layout.tsx
  return null;
}
