'use client';

import { List, useTable } from '@refinedev/antd';
import { Table, Space, Button } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

export default function UsersPage() {
  const { tableProps } = useTable({
    resource: 'users',
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="email" title="ایمیل" />
        <Table.Column dataIndex="firstName" title="نام" />
        <Table.Column dataIndex="lastName" title="نام خانوادگی" />
        <Table.Column
          title="عملیات"
          render={(_, record: any) => (
            <Space>
              <Button icon={<EditOutlined />} size="small" />
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

