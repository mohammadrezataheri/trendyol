import {
  DashboardOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  InstagramOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ComponentType } from 'react';

export const resources = [
  {
    name: 'dashboard',
    list: '/dashboard',
    meta: {
      label: 'داشبورد',
      icon: DashboardOutlined as ComponentType<any>,
    },
  },
  {
    name: 'users',
    list: '/users',
    meta: {
      label: 'کاربران',
      icon: TeamOutlined as ComponentType<any>,
    },
  },
  {
    name: 'products',
    list: '/products',
    meta: {
      label: 'محصولات',
      icon: ShoppingCartOutlined as ComponentType<any>,
    },
  },
  {
    name: 'instagram-accounts',
    list: '/instagram-accounts',
    meta: {
      label: 'مدیریت اکانت‌های اینستاگرام',
      icon: InstagramOutlined as ComponentType<any>,
    },
  },
  {
    name: 'scrape-configs',
    list: '/scrape-configs',
    meta: {
      label: 'پیکربندی اسکرپ',
      icon: ApiOutlined as ComponentType<any>,
    },
  },
];
