'use client';

import { List, useTable } from '@refinedev/antd';
import { Table, Space, Button, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { formatPersianNumber } from '../../utils/persian-number';

export default function ProductsPage() {
  const { tableProps } = useTable({
    resource: 'trendyol/products',
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
          dataIndex="name" 
          title="نام محصول"
          ellipsis
        />
        <Table.Column 
          dataIndex="price" 
          title="قیمت"
          width={150}
          render={(value) => (
            <Tag color="green" style={{ fontFamily: "'Vazirmatn', sans-serif" }}>
              {value ? formatPersianNumber(value) + ' تومان' : '-'}
            </Tag>
          )}
        />
        <Table.Column 
          dataIndex="url" 
          title="لینک"
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

