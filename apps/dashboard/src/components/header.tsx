'use client';

import { ThemedHeader } from '@refinedev/antd';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Space, Avatar, Dropdown, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function Header() {
  const { data: identity } = useGetIdentity();
  const { mutate: logout } = useLogout();

  // ساخت نام کامل کاربر
  const getUserDisplayName = () => {
    if (identity?.firstName && identity?.lastName) {
      return `${identity.firstName} ${identity.lastName}`;
    }
    if (identity?.firstName) {
      return identity.firstName;
    }
    if (identity?.email) {
      return identity.email;
    }
    return 'کاربر';
  };

  const items = [
    {
      key: 'profile',
      label: 'پروفایل',
      icon: <UserOutlined />,
      onClick: () => {
        // TODO: Navigate to profile page
      },
    },
    {
      key: 'settings',
      label: 'تنظیمات',
      icon: <SettingOutlined />,
      onClick: () => {
        // TODO: Navigate to settings page
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'خروج',
      icon: <LogoutOutlined />,
      onClick: () => logout(),
      danger: true,
    },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '64px' }}>
      <ThemedHeader sticky />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '24px',
          paddingLeft: '24px',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <Dropdown menu={{ items }} placement="bottomRight" arrow trigger={['click', 'hover']}>
            <Space 
              style={{ 
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                minWidth: '180px',
                maxWidth: '300px',
                justifyContent: 'flex-end',
              }}
              className="header-user-menu"
            >
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end', 
                  flex: 1, 
                  minWidth: 0,
                  marginRight: '12px',
                }}
              >
                <Text 
                  strong 
                  style={{ 
                    fontSize: '14px',
                    color: '#262626',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                    textAlign: 'right',
                    display: 'block',
                    lineHeight: '1.4',
                  }}
                  title={getUserDisplayName()}
                >
                  {getUserDisplayName()}
                </Text>
                {identity?.email && (identity?.firstName || identity?.lastName) && (
                  <Text 
                    style={{ 
                      fontSize: '12px',
                      color: '#8c8c8c',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: '100%',
                      textAlign: 'right',
                      display: 'block',
                      lineHeight: '1.4',
                      marginTop: '2px',
                    }}
                    title={identity.email}
                  >
                    {identity.email}
                  </Text>
                )}
              </div>
              <Avatar 
                icon={<UserOutlined />} 
                src={identity?.avatar}
                size={40}
                style={{
                  backgroundColor: '#1890ff',
                  flexShrink: 0,
                }}
              />
            </Space>
          </Dropdown>
        </div>
      </div>
      <style jsx global>{`
        .header-user-menu:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        .ant-layout-header {
          padding-left: 0 !important;
          padding-right: 0 !important;
          min-height: 64px;
          height: auto;
        }
        .ant-layout-header .ant-space {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
