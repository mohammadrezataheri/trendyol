'use client';

import React, { useState } from 'react';
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
  const [collapsed, setCollapsed] = useState(false);

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
            ? React.createElement(Icon as React.ComponentType<any>)
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
      width={260}
      collapsedWidth={80}
      collapsed={collapsed}
      onCollapse={(collapsed) => setCollapsed(collapsed)}
      style={{
        background: token.colorBgContainer,
        borderLeft: `1px solid ${token.colorBorder}`,
        minHeight: '100vh',
        boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.06)',
      }}
      className="custom-sider"
    >
      {Title && (
        <div 
          style={{ 
            padding: collapsed ? '16px 8px' : '20px 16px',
            borderBottom: `1px solid ${token.colorBorder}`,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease',
          }}
        >
          <Title collapsed={collapsed || false} />
        </div>
      )}
      <Menu
        mode="inline"
        selectedKeys={[currentSelectedKey]}
        items={items}
        style={{
          marginTop: '12px',
          border: 'none',
          background: 'transparent',
          padding: '0 8px',
        }}
        theme="light"
        inlineCollapsed={collapsed}
      />
      <style jsx global>{`
        .custom-sider .ant-menu-item {
          height: 48px;
          line-height: 48px;
          margin: 4px 0;
          border-radius: 8px;
          padding-right: 20px !important;
          padding-left: 20px !important;
          transition: all 0.2s ease;
          font-weight: 500;
          display: flex;
          align-items: center;
        }
        
        .custom-sider .ant-menu-item:hover {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1)) !important;
          transform: translateX(-4px);
        }
        
        .custom-sider .ant-menu-item-selected {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15)) !important;
          color: #667eea !important;
          font-weight: 600;
          border-right: 3px solid #667eea;
        }
        
        .custom-sider .ant-menu-item-selected::after {
          display: none;
        }
        
        .custom-sider .ant-menu-item-icon {
          font-size: 20px !important;
          margin-left: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
        }
        
        .custom-sider .ant-menu-item span {
          font-size: 14px;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item {
          padding-right: 0 !important;
          padding-left: 0 !important;
          justify-content: center;
          padding: 0 16px !important;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item-icon {
          margin-left: 0;
          margin-right: 0;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-title-content {
          display: none;
        }
        
        .custom-sider .ant-menu-item-active {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1)) !important;
        }
      `}</style>
    </AntdSider>
  );
}
