'use client';

import { List, useTable } from '@refinedev/antd';
import { Table, Space, Button, Tag, Avatar } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { formatPersianNumber } from '../utils/persian-number';

export default function UsersPage() {
  const { tableProps } = useTable({
    resource: 'users',
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
          dataIndex="email" 
          title="ایمیل"
          render={(value) => (
            <Space>
              <Avatar icon={<UserOutlined />} size="small" />
              <span>{value}</span>
            </Space>
          )}
        />
        <Table.Column dataIndex="firstName" title="نام" />
        <Table.Column dataIndex="lastName" title="نام خانوادگی" />
        <Table.Column
          dataIndex="roles"
          title="نقش‌ها"
          render={(roles: any[]) => (
            <Space>
              {roles?.map((role: any, index: number) => (
                <Tag key={index} color="blue">
                  {role.name || role}
                </Tag>
              ))}
            </Space>
          )}
        />
        <Table.Column
          title="عملیات"
          width={120}
          render={(_, record: any) => (
            <Space>
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

