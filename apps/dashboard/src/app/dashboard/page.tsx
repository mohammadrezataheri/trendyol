'use client';

import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  SettingOutlined,
  InstagramOutlined,
} from '@ant-design/icons';
import { Col, Row, Spin, Card, Typography } from 'antd';
import { useList } from '@refinedev/core';
import { PersianStatistic } from '../../components/persian-statistic';

const { Title } = Typography;

export default function DashboardPage() {
  const { result: usersResult, query: usersQuery } = useList({
    resource: 'users',
    pagination: {
      pageSize: 1,
    },
  });

  const { result: productsResult, query: productsQuery } = useList({
    resource: 'trendyol/products',
    pagination: {
      pageSize: 1,
    },
  });

  const { result: instagramAccountsResult, query: instagramQuery } = useList({
    resource: 'instagram-post/account',
    pagination: {
      pageSize: 1,
    }, 
  });

  const usersCount = usersResult?.total || 0;
  const productsCount = productsResult?.total || 0;
  const instagramCount = instagramAccountsResult?.total || 0;

  const usersLoading = usersQuery.isLoading;
  const productsLoading = productsQuery.isLoading;
  const instagramLoading = instagramQuery.isLoading;

  if (usersLoading || productsLoading || instagramLoading) {
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

  const stats = [
    {
      title: 'کاربران',
      value: usersCount,
      prefix: <UserOutlined style={{ color: '#1890ff' }} />,
      color: '#1890ff',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      title: 'محصولات',
      value: productsCount,
      prefix: <ShoppingOutlined style={{ color: '#52c41a' }} />,
      color: '#52c41a',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      title: 'اکانت‌های اینستاگرام',
      value: instagramCount,
      prefix: <InstagramOutlined style={{ color: '#fa8c16' }} />,
      color: '#fa8c16',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      title: 'پیکربندی‌ها',
      value: 0,
      prefix: <SettingOutlined style={{ color: '#722ed1' }} />,
      color: '#722ed1',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: '32px', fontWeight: 600 }}>
        داشبورد
      </Title>

      <Row gutter={[24, 24]}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              hoverable
              style={{
                borderRadius: '16px',
                border: 'none',
                background: stat.gradient,
                color: '#fff',
                transition: 'all 0.3s ease',
              }}
              styles={{ body: { padding: '24px' } }}
            >
              <PersianStatistic
                title={
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                    {stat.title}
                  </span>
                }
                value={stat.value}
                prefix={stat.prefix}
                valueStyle={{
                  color: '#fff',
                  fontSize: '32px',
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
