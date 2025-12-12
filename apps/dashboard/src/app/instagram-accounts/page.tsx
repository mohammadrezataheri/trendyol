'use client';

import { List } from '@refinedev/antd';
import { Table, Space, Button, Tag, Avatar, Typography, Tabs, Card, Empty, Spin } from 'antd';
import { EditOutlined, DeleteOutlined, SyncOutlined, InstagramOutlined } from '@ant-design/icons';
import { formatPersianNumber } from '../../utils/persian-number';
import { useState, useEffect } from 'react';
import axios from 'axios';

const { Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// Create axios instance with credentials and Bearer token support
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Helper function to get token from cookies or localStorage
const getAuthToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  
  // Try to get from cookies first
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token' || name === 'access_token' || name === 'auth_token') {
      return decodeURIComponent(value);
    }
  }
  
  // Try to get from localStorage
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.token) {
        return user.token;
      }
    }
  } catch (e) {
    // Ignore
  }
  
  return null;
};

interface InstagramAccount {
  id: number;
  connectedAccountId: string;
  username: string;
  userId: string;
  instagramId: string;
  accountType: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  profilePictureUrl: string;
  website: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  authConfig: {
    id: number;
    authConfigId: string;
    toolkit: string;
    authScheme: string;
    clientId: string | null;
    scopes: string[];
    redirectUrl: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface ApiResponse {
  data: InstagramAccount[];
  total: number;
  skip: number;
  take: number;
}

export default function InstagramAccountsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [accountsData, setAccountsData] = useState<InstagramAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  
  const pageSize = 10;

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        if (isLoading) {
          setIsLoading(true);
        } else {
          setIsRefetching(true);
        }

        const currentSkip = (currentPage - 1) * pageSize;
        const token = getAuthToken();
        
        const headers: Record<string, string> = {
          'accept': '*/*',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await axiosInstance.get<ApiResponse>('/instagram-post/account/list', {
          params: {
            skip: currentSkip,
            take: pageSize,
          },
          headers,
        });

        if (response.data) {
          setAccountsData(response.data.data || []);
          setTotalCount(response.data.total || 0);
        }
      } catch (error: any) {
        console.error('Error fetching Instagram accounts:', error);
        setAccountsData([]);
        setTotalCount(0);
        
        // Handle 401 errors
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
        }
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    };

    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <List>
      <Card
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          defaultActiveKey="accounts"
          type="line"
          size="large"
          style={{
            padding: '0 24px',
          }}
          items={[
            {
              key: 'accounts',
              label: 'اکانت‌ها',
              children: (
                <div style={{ padding: '24px 0' }}>
                  {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '50px' }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <Table 
                      dataSource={accountsData || []}
                      rowKey="id"
                      loading={isRefetching || isLoading}
                      pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: totalCount,
                        showSizeChanger: false,
                        showTotal: (total) => `مجموع ${formatPersianNumber(total)} مورد`,
                        onChange: (page) => setCurrentPage(page),
                      }}
                      style={{
                        background: '#fff',
                      }}
                    >
                    <Table.Column 
                      dataIndex="id" 
                      title="شناسه" 
                      width={100}
                      render={(value) => formatPersianNumber(value)}
                    />
                    <Table.Column 
                      dataIndex="username" 
                      title="نام کاربری"
                      render={(value, record: any) => (
                        <Space>
                          <Avatar 
                            src={record.profilePictureUrl} 
                            icon={<InstagramOutlined />}
                            style={{ backgroundColor: '#E1306C' }}
                          />
                          <Text strong>{value || 'نامشخص'}</Text>
                        </Space>
                      )}
                    />
                    <Table.Column 
                      dataIndex="accountType" 
                      title="نوع اکانت"
                      width={120}
                      render={(value) => (
                        <Tag color={value === 'BUSINESS' ? 'blue' : 'default'}>
                          {value === 'BUSINESS' ? 'بیزینس' : value || '-'}
                        </Tag>
                      )}
                    />
                    <Table.Column 
                      dataIndex="followersCount" 
                      title="دنبال‌کنندگان"
                      width={120}
                      render={(value) => value ? formatPersianNumber(value) : '-'}
                    />
                    <Table.Column 
                      dataIndex="followsCount" 
                      title="دنبال‌شده"
                      width={120}
                      render={(value) => value ? formatPersianNumber(value) : '-'}
                    />
                    <Table.Column 
                      dataIndex="mediaCount" 
                      title="پست‌ها"
                      width={100}
                      render={(value) => value ? formatPersianNumber(value) : '-'}
                    />
                    <Table.Column 
                      dataIndex="status" 
                      title="وضعیت"
                      width={100}
                      render={(value) => (
                        <Tag color={value === 'ACTIVE' ? 'green' : value === 'INITIALIZING' ? 'orange' : 'default'}>
                          {value === 'ACTIVE' ? 'فعال' : value === 'INITIALIZING' ? 'در حال راه‌اندازی' : value || '-'}
                        </Tag>
                      )}
                    />
                    <Table.Column
                      title="عملیات"
                      width={150}
                      render={(_, record: any) => (
                        <Space>
                          <Button 
                            icon={<SyncOutlined />} 
                            size="small"
                            type="default"
                            title="همگام‌سازی"
                          />
                          <Button 
                            icon={<EditOutlined />} 
                            size="small"
                            type="primary"
                            ghost
                          />
                          <Button 
                            icon={<DeleteOutlined />} 
                            size="small" 
                            danger
                          />
                        </Space>
                      )}
                    />
                  </Table>
                  )}
                </div>
              ),
            },
            {
              key: 'cronjobs',
              label: 'کرون جاب‌ها',
              children: (
                <div style={{ padding: '24px 0' }}>
                  <Empty
                    description="هنوز کرون جابی تعریف نشده است"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ),
            },
            {
              key: 'post-configs',
              label: 'پیکربندی پست‌ها',
              children: (
                <div style={{ padding: '24px 0' }}>
                  <Empty
                    description="هنوز پیکربندی پستی تعریف نشده است"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </List>
  );
}

