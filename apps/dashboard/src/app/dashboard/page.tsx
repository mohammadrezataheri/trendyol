'use client';

import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Col, Row, Statistic, Spin } from 'antd';
import { useList } from '@refinedev/core';

export default function DashboardPage() {
  const { data: usersData, isLoading: usersLoading } = useList({
    resource: 'users',
    pagination: {
      pageSize: 1,
    },
  });

  const { data: productsData, isLoading: productsLoading } = useList({
    resource: 'trendyol/products',
    pagination: {
      pageSize: 1,
    },
  });

  const usersCount = usersData?.total || 0;
  const productsCount = productsData?.total || 0;

  if (usersLoading || productsLoading) {
    return (
      <div
        style={{
          padding: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px' }}>داشبورد</h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Statistic
              title="کاربران"
              value={usersCount}
              prefix={<UserOutlined />}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Statistic
              title="محصولات"
              value={productsCount}
              prefix={<ShoppingOutlined />}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Statistic
              title="اسکرپ‌ها"
              value={0}
              prefix={<DashboardOutlined />}
            />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Statistic
              title="پیکربندی‌ها"
              value={0}
              prefix={<SettingOutlined />}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
