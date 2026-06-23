import type { Metadata, Viewport } from 'next';
import './globals.css';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Sistem Research & Development Dept',
  description: 'Aplikasi CRUD menggunakan Next.js dan SQL Server',

  manifest: '/manifest.webmanifest',

  icons: {
    icon: '/trisula-192.png',
    apple: '/apple-touch-icon.png'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a73e8'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}