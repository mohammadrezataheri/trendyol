'use client';

import { Table, Space, Button, Tag, Avatar, Typography, Tabs, Card, Empty, Spin, Modal, App, Form, Input, Select } from 'antd';
import { EditOutlined, DeleteOutlined, SyncOutlined, InstagramOutlined, PlusOutlined, InfoCircleOutlined, FileTextOutlined, ShoppingOutlined } from '@ant-design/icons';
import { formatPersianNumber } from '../../utils/persian-number';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

const { Text } = Typography;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

// لیست زمان‌های اجرای کرون با ترجمه فارسی
const cronTimeOptions = [
  { value: '* * * * *', label: 'هر 1 دقیقه' },
  { value: '*/5 * * * *', label: 'هر 5 دقیقه' },
  { value: '*/10 * * * *', label: 'هر 10 دقیقه' },
  { value: '*/15 * * * *', label: 'هر 15 دقیقه' },
  { value: '*/30 * * * *', label: 'هر 30 دقیقه' },
  { value: '0 * * * *', label: 'هر ساعت' },
  { value: '0 */2 * * *', label: 'هر 2 ساعت' },
  { value: '0 */3 * * *', label: 'هر 3 ساعت' },
  { value: '0 */6 * * *', label: 'هر 6 ساعت' },
  { value: '0 */12 * * *', label: 'هر 12 ساعت' },
  { value: '0 0 * * *', label: 'هر روز ساعت 00:00 (نیمه شب)' },
  { value: '0 1 * * *', label: 'هر روز ساعت 01:00' },
  { value: '0 2 * * *', label: 'هر روز ساعت 02:00' },
  { value: '0 3 * * *', label: 'هر روز ساعت 03:00' },
  { value: '0 4 * * *', label: 'هر روز ساعت 04:00' },
  { value: '0 5 * * *', label: 'هر روز ساعت 05:00' },
  { value: '0 6 * * *', label: 'هر روز ساعت 06:00' },
  { value: '0 7 * * *', label: 'هر روز ساعت 07:00' },
  { value: '0 8 * * *', label: 'هر روز ساعت 08:00' },
  { value: '0 9 * * *', label: 'هر روز ساعت 09:00' },
  { value: '0 10 * * *', label: 'هر روز ساعت 10:00' },
  { value: '0 11 * * *', label: 'هر روز ساعت 11:00' },
  { value: '0 12 * * *', label: 'هر روز ساعت 12:00' },
  { value: '0 13 * * *', label: 'هر روز ساعت 13:00' },
  { value: '0 14 * * *', label: 'هر روز ساعت 14:00' },
  { value: '0 15 * * *', label: 'هر روز ساعت 15:00' },
  { value: '0 16 * * *', label: 'هر روز ساعت 16:00' },
  { value: '0 17 * * *', label: 'هر روز ساعت 17:00' },
  { value: '0 18 * * *', label: 'هر روز ساعت 18:00' },
  { value: '0 19 * * *', label: 'هر روز ساعت 19:00' },
  { value: '0 20 * * *', label: 'هر روز ساعت 20:00' },
  { value: '0 21 * * *', label: 'هر روز ساعت 21:00' },
  { value: '0 22 * * *', label: 'هر روز ساعت 22:00' },
  { value: '0 23 * * *', label: 'هر روز ساعت 23:00' },
  { value: '0 0 * * 0', label: 'هر یکشنبه ساعت 00:00' },
  { value: '0 0 * * 1', label: 'هر دوشنبه ساعت 00:00' },
  { value: '0 0 * * 2', label: 'هر سه‌شنبه ساعت 00:00' },
  { value: '0 0 * * 3', label: 'هر چهارشنبه ساعت 00:00' },
  { value: '0 0 * * 4', label: 'هر پنج‌شنبه ساعت 00:00' },
  { value: '0 0 * * 5', label: 'هر جمعه ساعت 00:00' },
  { value: '0 0 * * 6', label: 'هر شنبه ساعت 00:00' },
  { value: '0 0 1 * *', label: 'اول هر ماه ساعت 00:00' },
  { value: '0 0 1 1 *', label: 'اول ژانویه هر سال ساعت 00:00' },
];

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

interface SyncResponse {
  success: boolean;
  message: string;
  data: InstagramAccount;
}

export default function InstagramAccountsPage() {
  const { notification } = App.useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [accountsData, setAccountsData] = useState<InstagramAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isStartingLogin, setIsStartingLogin] = useState(false);
  const [isAddCronModalOpen, setIsAddCronModalOpen] = useState(false);
  const [isManualPostModalOpen, setIsManualPostModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [isSubmittingManualPost, setIsSubmittingManualPost] = useState(false);
  
  // Get active tab from URL query parameter, default to 'accounts'
  const activeTab = searchParams.get('tab') || 'accounts';
  
  const pageSize = 10;

  const fetchAccounts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
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
  }, [currentPage]);

  useEffect(() => {
    fetchAccounts(true);
  }, [fetchAccounts]);

  const handleSyncAccount = async (connectedAccountId: string) => {
    try {
      setSyncingAccountId(connectedAccountId);
      const token = getAuthToken();
      
      const headers: Record<string, string> = {
        'accept': '*/*',
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axiosInstance.post<SyncResponse>(
        '/instagram-post/account/sync',
        {
          connectedAccountId,
        },
        {
          headers,
        }
      );

      if (response.data.success) {
        notification.success({
          message: 'موفقیت',
          description: response.data.message || 'اطلاعات اکانت اینستاگرام با موفقیت همگام‌سازی شد',
          placement: 'topRight',
          duration: 3,
        });

        // Refetch the account list to update the data
        await fetchAccounts(false);
      }
    } catch (error: any) {
      console.error('Error syncing Instagram account:', error);
      notification.error({
        message: 'خطا',
        description: error.response?.data?.message || 'خطا در همگام‌سازی اکانت اینستاگرام',
        placement: 'topRight',
        duration: 4,
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleAddAccount = () => {
    setIsAddAccountModalOpen(true);
  };

  const handleAddCron = () => {
    setIsAddCronModalOpen(true);
  };

  const handleManualPost = () => {
    setIsAddCronModalOpen(false);
    setIsManualPostModalOpen(true);
  };

  const handleSubmitManualPost = async (values: any) => {
    try {
      setIsSubmittingManualPost(true);
      const token = getAuthToken();
      
      const headers: Record<string, string> = {
        'accept': '*/*',
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axiosInstance.post(
        '/instagram-post/cron/manual',
        {
          title: values.title,
          accountId: values.accountId,
          cronTime: values.cronTime,
          postType: 'manual',
          mainPrompt: values.mainPrompt || undefined,
          captionPrompt: values.captionPrompt || undefined,
          imageGenerationImage: values.imageGenerationImage || undefined,
        },
        {
          headers,
        }
      );

      if (response.data.success) {
        notification.success({
          message: 'موفقیت',
          description: response.data.message || 'کرون جاب با موفقیت ایجاد شد',
          placement: 'topRight',
          duration: 3,
        });
        
        setIsManualPostModalOpen(false);
        form.resetFields();
      }
    } catch (error: any) {
      console.error('Error creating manual cron:', error);
      notification.error({
        message: 'خطا',
        description: error.response?.data?.message || 'خطا در ایجاد کرون جاب',
        placement: 'topRight',
        duration: 4,
      });
    } finally {
      setIsSubmittingManualPost(false);
    }
  };

  const handleSazitoProduct = () => {
    setIsAddCronModalOpen(false);
    // TODO: Implement sazito product data functionality
    notification.info({
      message: 'در حال توسعه',
      description: 'قابلیت دریافت داده محصول از سازی‌تو به زودی اضافه خواهد شد',
      placement: 'topRight',
      duration: 3,
    });
  };

  const handleStartLogin = async () => {
    try {
      setIsStartingLogin(true);
      const token = getAuthToken();
      
      const headers: Record<string, string> = {
        'accept': '*/*',
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axiosInstance.post<{ redirect_url: string }>(
        '/instagram-post/auth/login',
        {},
        {
          headers,
        }
      );

      if (response.data.redirect_url) {
        setIsAddAccountModalOpen(false);
        
        // Redirect user to the login page in a new window
        window.open(response.data.redirect_url, '_blank', 'width=600,height=700');
        
        notification.success({
          message: 'در حال اتصال',
          description: 'پنجره جدید برای اتصال اکانت اینستاگرام باز شد. پس از تکمیل فرآیند، اکانت شما در لیست نمایش داده می‌شود.',
          placement: 'topRight',
          duration: 5,
        });

        // Refetch accounts after a delay to check if account was added
        setTimeout(() => {
          fetchAccounts(false);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error initiating Instagram login:', error);
      notification.error({
        message: 'خطا',
        description: error.response?.data?.message || 'خطا در شروع فرآیند اتصال اکانت اینستاگرام',
        placement: 'topRight',
        duration: 4,
      });
    } finally {
      setIsStartingLogin(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', key);
            router.push(`?${params.toString()}`, { scroll: false });
          }}
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
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={handleAddAccount}
                    >
                      افزودن اکانت
                    </Button>
                  </div>
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
                      render={(value, record: InstagramAccount) => {
                        const needsSync = !value || !record.profilePictureUrl;
                        
                        return (
                          <Space>
                            {needsSync ? (
                              <Button
                                type="primary"
                                icon={<SyncOutlined />}
                                size="small"
                                loading={syncingAccountId === record.connectedAccountId}
                                onClick={() => handleSyncAccount(record.connectedAccountId)}
                              >
                                همگام‌سازی اکانت
                              </Button>
                            ) : (
                              <>
                                <Avatar 
                                  src={record.profilePictureUrl} 
                                  icon={<InstagramOutlined />}
                                  style={{ backgroundColor: '#E1306C' }}
                                />
                                <Text strong>{value}</Text>
                              </>
                            )}
                          </Space>
                        );
                      }}
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
                      render={(_, record: InstagramAccount) => (
                        <Space>
                          <Button 
                            icon={<SyncOutlined />} 
                            size="small"
                            type="default"
                            title="همگام‌سازی"
                            loading={syncingAccountId === record.connectedAccountId}
                            onClick={() => handleSyncAccount(record.connectedAccountId)}
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
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      size="large"
                      onClick={handleAddCron}
                    >
                      افزودن کرون جدید
                    </Button>
                  </div>
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
      
      <Modal
        open={isAddAccountModalOpen}
        onCancel={() => setIsAddAccountModalOpen(false)}
        footer={null}
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <span>راهنمای اتصال اکانت اینستاگرام</span>
          </Space>
        }
        width={600}
      >
        <div style={{ padding: '8px 0' }}>
          <Typography.Paragraph style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.8' }}>
            <Text strong>قبل از شروع:</Text>
            <br />
            لطفاً ابتدا در حساب اینستاگرامی که می‌خواهید متصل کنید، وارد شوید.
          </Typography.Paragraph>
          
          <Typography.Paragraph style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.8' }}>
            <Text strong>مراحل اتصال:</Text>
            <br />
            1. پس از تایید، به صفحه‌ای هدایت می‌شوید که می‌توانید اکانت خود را متصل کنید.
            <br />
            2. پس از اتصال موفق، اکانت شما در لیست نمایش داده می‌شود.
            <br />
            3. برای به‌روزرسانی اطلاعات اکانت، روی دکمه "همگام‌سازی اکانت" کلیک کنید.
          </Typography.Paragraph>
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={() => setIsAddAccountModalOpen(false)}>
              انصراف
            </Button>
            <Button
              type="primary"
              icon={<InstagramOutlined />}
              loading={isStartingLogin}
              onClick={handleStartLogin}
            >
              می‌دانم و شروع می‌کنم
            </Button>
          </div>
        </div>
      </Modal>
      
      <Modal
        open={isAddCronModalOpen}
        onCancel={() => setIsAddCronModalOpen(false)}
        footer={null}
        title={
          <Space>
            <PlusOutlined style={{ color: '#1890ff' }} />
            <span>افزودن کرون جدید</span>
          </Space>
        }
        width={500}
      >
        <div style={{ padding: '8px 0' }}>
          <Typography.Paragraph style={{ marginBottom: '24px', fontSize: '14px', lineHeight: '1.8', textAlign: 'center' }}>
            <Text>لطفاً نوع کرون جاب مورد نظر خود را انتخاب کنید:</Text>
          </Typography.Paragraph>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Button
              type="default"
              icon={<FileTextOutlined />}
              size="large"
              block
              onClick={handleManualPost}
              style={{
                height: '60px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
              }}
            >
              افزودن پست دستی
            </Button>
            
            <Button
              type="default"
              icon={<ShoppingOutlined />}
              size="large"
              block
              onClick={handleSazitoProduct}
              style={{
                height: '60px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
              }}
            >
              دریافت داده محصول از سازی‌تو
            </Button>
          </Space>
          
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setIsAddCronModalOpen(false)}>
              انصراف
            </Button>
          </div>
        </div>
      </Modal>
      
      <Modal
        open={isManualPostModalOpen}
        onCancel={() => {
          setIsManualPostModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>افزودن پست دستی</span>
          </Space>
        }
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitManualPost}
          style={{ marginTop: '24px' }}
        >
          <Form.Item
            name="title"
            label="عنوان"
            rules={[{ required: true, message: 'لطفاً عنوان را وارد کنید' }]}
          >
            <Input placeholder="عنوان کرون جاب" size="large" />
          </Form.Item>

          <Form.Item
            name="accountId"
            label="اکانت اینستاگرام"
            rules={[{ required: true, message: 'لطفاً اکانت اینستاگرام را انتخاب کنید' }]}
          >
            <Select
              placeholder="انتخاب اکانت اینستاگرام"
              size="large"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={accountsData.map((account) => ({
                value: account.id,
                label: account.username || `اکانت ${account.id}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="cronTime"
            label="زمان اجرای کرون"
            rules={[{ required: true, message: 'لطفاً زمان اجرای کرون را انتخاب کنید' }]}
          >
            <Select
              placeholder="انتخاب زمان اجرای کرون"
              size="large"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={cronTimeOptions}
            />
          </Form.Item>

          <Form.Item
            name="mainPrompt"
            label="پرمپت اصلی"
          >
            <Input.TextArea
              rows={4}
              placeholder="پرمپت اصلی برای تولید محتوا"
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Form.Item
            name="captionPrompt"
            label="پرمپت کپشن"
          >
            <Input.TextArea
              rows={4}
              placeholder="پرمپت برای تولید کپشن پست"
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button onClick={() => {
              setIsManualPostModalOpen(false);
              form.resetFields();
            }}>
              انصراف
            </Button>
            <Button type="primary" htmlType="submit" loading={isSubmittingManualPost}>
              ایجاد کرون جاب
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

