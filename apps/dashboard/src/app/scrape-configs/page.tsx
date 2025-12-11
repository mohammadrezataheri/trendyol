'use client';

import { List, useTable } from '@refinedev/antd';
import { Table, Space, Button } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

export default function ScrapeConfigsPage() {
  const { tableProps } = useTable({
    resource: 'trendyol/scrape-configs',
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="id" title="ID" />
        <Table.Column dataIndex="name" title="نام" />
        <Table.Column dataIndex="url" title="URL" />
        <Table.Column dataIndex="isActive" title="فعال" />
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

