import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  SettingOutlined,
  InstagramOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

export const resources = [
  {
    name: 'dashboard',
    list: '/dashboard',
    meta: {
      label: 'داشبورد',
      icon: DashboardOutlined as unknown as ReactNode,
    },
  },
  {
    name: 'users',
    list: '/users',
    meta: {
      label: 'کاربران',
      icon: UserOutlined as unknown as ReactNode,
    },
  },
  {
    name: 'products',
    list: '/products',
    meta: {
      label: 'محصولات',
      icon: ShoppingOutlined as unknown as ReactNode,
    },
  },
  {
    name: 'instagram-accounts',
    list: '/instagram-accounts',
    meta: {
      label: 'مدیریت اکانت‌های اینستاگرام',
      icon: InstagramOutlined as unknown as ReactNode,
    },
  },
  {
    name: 'scrape-configs',
    list: '/scrape-configs',
    meta: {
      label: 'پیکربندی اسکرپ',
      icon: SettingOutlined as unknown as ReactNode,
    },
  },
];
