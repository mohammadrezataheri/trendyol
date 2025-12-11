'use client';

import { ThemedHeader } from '@refinedev/antd';
import { useGetIdentity, useLogout } from '@refinedev/core';
import { Space, Avatar, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';

export function Header() {
  const { data: identity } = useGetIdentity();
  const { mutate: logout } = useLogout();

  const items = [
    {
      key: 'logout',
      label: 'خروج',
      icon: <LogoutOutlined />,
      onClick: () => logout(),
    },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <ThemedHeader sticky />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 24,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          zIndex: 1,
        }}
      >
        <Space>
          <Dropdown menu={{ items }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} src={identity?.avatar} />
              <span>{identity?.email || identity?.firstName}</span>
            </Space>
          </Dropdown>
        </Space>
      </div>
    </div>
  );
}
