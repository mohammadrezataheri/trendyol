import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import { RefineKbarProvider } from '@refinedev/kbar';
import { RefineProvider } from '../providers/refine-provider';
import { AppLayout } from '../components/app-layout';
import '../styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AntdRegistry>
          <RefineKbarProvider>
            <ConfigProvider
              direction="rtl"
              theme={{
                token: {
                  colorPrimary: '#1890ff',
                  fontFamily: "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                  borderRadius: 8,
                  fontSize: 14,
                  colorBgContainer: '#ffffff',
                  colorBgElevated: '#ffffff',
                  colorBorder: '#e8e8e8',
                  colorText: '#262626',
                  colorTextSecondary: '#8c8c8c',
                },
                components: {
                  Layout: {
                    bodyBg: '#f0f2f5',
                    headerBg: '#ffffff',
                    siderBg: '#ffffff',
                  },
                  Menu: {
                    itemBorderRadius: 8,
                    itemMarginInline: 8,
                    itemMarginBlock: 4,
                  },
                  Card: {
                    borderRadiusLG: 12,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  },
                  Button: {
                    borderRadius: 8,
                    fontWeight: 500,
                  },
                  Input: {
                    borderRadius: 8,
                  },
                  Table: {
                    borderRadius: 12,
                  },
                },
              }}
            >
              <RefineProvider>
                <AppLayout>{children}</AppLayout>
              </RefineProvider>
            </ConfigProvider>
          </RefineKbarProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
