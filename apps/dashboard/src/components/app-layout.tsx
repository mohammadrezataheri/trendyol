'use client';

import { usePathname } from 'next/navigation';
import { ThemedLayout, ThemedTitle } from '@refinedev/antd';
import { App as AntdApp } from 'antd';
import { Header } from './header';
import { CustomSider } from './custom-sider';
import { ProtectedRoute } from './protected-route';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show layout for login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <AntdApp>
      <ProtectedRoute>
        <ThemedLayout
          Header={() => <Header />}
          Sider={(props) => (
            <CustomSider
              {...props}
              Title={({ collapsed }: { collapsed: boolean }) => (
                <ThemedTitle 
                  collapsed={collapsed} 
                  text="ترندیول اسکرپر"
                  icon={<span style={{ fontSize: '24px' }}>🛍️</span>}
                />
              )}
            />
          )}
        >
          {children}
        </ThemedLayout>
      </ProtectedRoute>
    </AntdApp>
  );
}
