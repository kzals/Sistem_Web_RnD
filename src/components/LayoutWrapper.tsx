'use client';

import { usePathname } from 'next/navigation';
import AppSidebar from './AppSidebar';
import DesktopHeader from './DesktopHeader';
import { NotificationProvider } from './NotificationContext';
import NotificationPopup from './NotificationPopup';
import PushSubscribe from './PushSubscribe';
import NotificationPermissionRequest from './NotificationPermissionRequest';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <NotificationProvider>
      <AppSidebar />
      <DesktopHeader />
      <main className="min-h-screen bg-gray-100 pt-16 md:ml-[var(--sidebar-width,16rem)] md:pt-16">{children}</main>
      <NotificationPopup />
      <PushSubscribe />
      <NotificationPermissionRequest />
    </NotificationProvider>
  );
}
