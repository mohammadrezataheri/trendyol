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
    <html lang="fa" dir="rtl">
      <body>
        <AntdRegistry>
          <RefineKbarProvider>
            <ConfigProvider
              direction="rtl"
              theme={{
                token: {
                  colorPrimary: '#1890ff',
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
