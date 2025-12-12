'use client';

import { List, useTable } from '@refinedev/antd';
import { Table, Space, Button, Tag, Avatar, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, SyncOutlined, InstagramOutlined } from '@ant-design/icons';
import { formatPersianNumber } from '../utils/persian-number';

const { Text } = Typography;

export default function InstagramAccountsPage() {
  const { tableProps } = useTable({
    resource: 'instagram-post/account',
    pagination: {
      pageSize: 10,
    },
  });

  return (
    <List>
      <Table 
        {...tableProps} 
        rowKey="id"
        style={{
          background: '#fff',
          borderRadius: '12px',
          overflow: 'hidden',
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
    </List>
  );
}

