import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  SettingOutlined,
  InstagramOutlined,
} from '@ant-design/icons';

export const resources = [
  {
    name: 'dashboard',
    list: '/dashboard',
    meta: {
      label: 'داشبورد',
      icon: DashboardOutlined,
    },
  },
  {
    name: 'users',
    list: '/users',
    meta: {
      label: 'کاربران',
      icon: UserOutlined,
    },
  },
  {
    name: 'products',
    list: '/products',
    meta: {
      label: 'محصولات',
      icon: ShoppingOutlined,
    },
  },
  {
    name: 'instagram-accounts',
    list: '/instagram-accounts',
    meta: {
      label: 'اکانت‌های اینستاگرام',
      icon: InstagramOutlined,
    },
  },
  {
    name: 'scrape-configs',
    list: '/scrape-configs',
    meta: {
      label: 'پیکربندی اسکرپ',
      icon: SettingOutlined,
    },
  },
];
