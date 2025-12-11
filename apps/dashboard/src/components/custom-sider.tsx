'use client';

import React from 'react';
import { useMenu } from '@refinedev/core';
import { Layout, Menu, theme } from 'antd';
import type { RefineThemedLayoutSiderProps } from '@refinedev/antd';
import { useRouter, usePathname } from 'next/navigation';
import { resources } from '../config/resources';

const { Sider: AntdSider } = Layout;

export function CustomSider({ Title }: RefineThemedLayoutSiderProps) {
  const { menuItems, selectedKey } = useMenu();
  const { token } = theme.useToken();
  const router = useRouter();
  const pathname = usePathname();

  // Fallback to resources if menuItems is empty
  const items = React.useMemo(() => {
    // Always use resources for now to ensure sidebar is visible
    return resources.map((resource) => {
      const Icon = resource.meta?.icon;
      return {
        key: resource.name,
        label: resource.meta?.label || resource.name,
        icon:
          Icon && typeof Icon === 'function'
            ? React.createElement(Icon as React.ComponentType)
            : null,
        onClick: () => {
          if (resource.list) {
            router.push(resource.list);
          }
        },
      };
    });
  }, [router]);

  // Determine selected key from pathname
  const currentSelectedKey =
    selectedKey || pathname?.split('/')[1] || 'dashboard';

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <AntdSider
      collapsible
      width={200}
      style={{
        background: token.colorBgContainer,
        borderRight: `1px solid ${token.colorBorder}`,
        minHeight: '100vh',
      }}
    >
      {Title && <Title collapsed={false} />}
      <Menu
        mode="inline"
        selectedKeys={[currentSelectedKey]}
        items={items}
        style={{
          marginTop: '8px',
          border: 'none',
          height: '100%',
        }}
      />
    </AntdSider>
  );
}
