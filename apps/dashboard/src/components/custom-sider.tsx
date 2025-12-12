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
      const Icon = resource.meta?.icon as React.ComponentType<any> | undefined;
      return {
        key: resource.name,
        label: resource.meta?.label || resource.name,
        icon: Icon ? <Icon /> : undefined,
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
      width={280}
      collapsedWidth={80}
      collapsed={collapsed}
      onCollapse={(collapsed) => setCollapsed(collapsed)}
      style={{
        background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)',
        borderLeft: `1px solid ${token.colorBorder}`,
        minHeight: '100vh',
        boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.08)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'auto',
      }}
      className="custom-sider"
    >
      {Title && (
        <div 
          style={{ 
            padding: collapsed ? '20px 8px' : '24px 20px',
            borderBottom: `1px solid ${token.colorBorder}`,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
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
          marginTop: '16px',
          border: 'none',
          background: 'transparent',
          padding: collapsed ? '0' : '0 12px 24px 12px',
        }}
        theme="light"
        inlineCollapsed={collapsed}
      />
      <style jsx global>{`
        .custom-sider {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
        }
        
        .custom-sider::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-sider::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-sider::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        
        .custom-sider::-webkit-scrollbar-thumb:hover {
          background-color: rgba(0, 0, 0, 0.3);
        }
        
        .custom-sider .ant-menu-item {
          height: 52px;
          line-height: 52px;
          margin: 6px 0;
          border-radius: 12px;
          padding-right: 20px !important;
          padding-left: 20px !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          display: flex;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        
        .custom-sider .ant-menu-item::before {
          content: '';
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 0;
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 0;
        }
        
        .custom-sider .ant-menu-item:hover::before {
          width: 100%;
        }
        
        .custom-sider .ant-menu-item:hover {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12)) !important;
          transform: translateX(-6px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }
        
        .custom-sider .ant-menu-item-selected {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2)) !important;
          color: #667eea !important;
          font-weight: 600;
          border-right: 4px solid #667eea;
          box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
          transform: translateX(-4px);
        }
        
        .custom-sider .ant-menu-item-selected::before {
          width: 100%;
        }
        
        .custom-sider .ant-menu-item-selected::after {
          display: none;
        }
        
        .custom-sider .ant-menu-item-icon {
          font-size: 22px !important;
          margin-left: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          position: relative;
          z-index: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-sider .ant-menu-item:hover .ant-menu-item-icon {
          transform: scale(1.1);
          color: #667eea;
        }
        
        .custom-sider .ant-menu-item-selected .ant-menu-item-icon {
          color: #667eea;
          transform: scale(1.15);
        }
        
        .custom-sider .ant-menu-item span {
          font-size: 15px;
          position: relative;
          z-index: 1;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item {
          padding-right: 0 !important;
          padding-left: 0 !important;
          justify-content: center !important;
          align-items: center !important;
          padding: 0 !important;
          margin: 8px auto;
          width: 48px;
          height: 48px;
          display: flex !important;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item-icon {
          margin-left: 0 !important;
          margin-right: 0 !important;
          font-size: 24px !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-title-content {
          display: none !important;
          width: 0 !important;
          overflow: hidden !important;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item span {
          display: none !important;
          width: 0 !important;
          overflow: hidden !important;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item > *:not(.ant-menu-item-icon) {
          display: none !important;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item:hover {
          transform: scale(1.1);
          transform-origin: center;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item-selected {
          transform: scale(1.05);
          transform-origin: center;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item-selected .ant-menu-item-icon {
          display: flex !important;
        }
        
        /* Ensure icons are always visible in collapsed state */
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item .ant-menu-item-icon {
          opacity: 1 !important;
          visibility: visible !important;
          display: flex !important;
        }
        
        .custom-sider.ant-layout-sider-collapsed .ant-menu-item-icon svg {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        .custom-sider .ant-menu-item-active {
          background: linear-gradient(90deg, rgba(102, 126, 234, 0.12), rgba(118, 75, 162, 0.12)) !important;
        }
        
        .custom-sider .ant-layout-sider-trigger {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-sider .ant-layout-sider-trigger:hover {
          background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
        }
      `}</style>
    </AntdSider>
  );
}
