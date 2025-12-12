'use client';

import { List, useTable } from '@refinedev/antd';
import { Table, Space, Button, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { formatPersianNumber } from '../utils/persian-number';

export default function ScrapeConfigsPage() {
  const { tableProps } = useTable({
    resource: 'trendyol/scrape-configs',
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
        <Table.Column dataIndex="name" title="نام" />
        <Table.Column 
          dataIndex="url" 
          title="URL"
          ellipsis
          render={(value) => (
            value ? (
              <a 
                href={value} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#1890ff' }}
              >
                <LinkOutlined /> مشاهده
              </a>
            ) : '-'
          )}
        />
        <Table.Column 
          dataIndex="isActive" 
          title="وضعیت"
          width={100}
          render={(value) => (
            <Tag color={value ? 'green' : 'red'}>
              {value ? 'فعال' : 'غیرفعال'}
            </Tag>
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

