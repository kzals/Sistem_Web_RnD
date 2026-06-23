'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Bell, LogOut, LayoutDashboard, Search, Package, FileText, Boxes, Bell as BellIcon, ArrowUpCircle, ChevronLeft, ChevronRight, Users2, Shirt } from 'lucide-react';
import PWAInstallButton from './PWAInstallButton';
import { useNotifications } from './NotificationContext';
import { formatDateTimeWib } from '@/lib/datetime';
import { type AppRole, normalizeAppRole } from '@/lib/auth';

const urgencyLabels: Record<string, string> = {
  Tinggi: 'Mendesak',
  Sedang: 'Standar',
  Rendah: 'Fleksibel',
};

const getUrgencyBadgeClass = (urgency?: string) => {
  switch (urgency) {
    case 'Tinggi':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'Sedang':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Rendah':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getUrgencyHighlightColor = (urgency?: string) => {
  switch (urgency) {
    case 'Tinggi':
      return 'bg-red-50';
    case 'Sedang':
      return 'bg-yellow-50';
    case 'Rendah':
      return 'bg-green-50';
    default:
      return 'bg-blue-50';
  }
};

function formatDropdownTime(notification: { Notification_Type: 'pengambilan' | 'pengembalian'; Created_At: string }) {
  return formatRelativeTime(notification.Created_At);
}

function formatRelativeTime(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return 'kemarin';
    if (diffDays < 7) return `${diffDays} hari yang lalu`;
    if (diffDays < 14) return `${Math.floor(diffDays / 7)} minggu yang lalu`;
    
    return formatDateTimeWib(dateString);
  } catch {
    return formatDateTimeWib(dateString);
  }
}

const navItems = [
  { href: '/', label: 'Dashboard', roles: ['rnd', 'requester'] as Array<'rnd' | 'requester'>, icon: LayoutDashboard },
  { href: '/search', label: 'Cari Kain', roles: ['rnd', 'requester'] as Array<'rnd' | 'requester'>, icon: Search },
  { href: '/mix-match', label: 'Mix & Match', roles: ['rnd', 'requester'] as Array<'rnd' | 'requester'>, icon: Shirt },
  { href: '/products', label: 'Data Produk', roles: ['rnd', 'requester'] as Array<'rnd' | 'requester'>, icon: Package },
  { href: '/input', label: 'Tambah Data', roles: ['rnd'] as Array<'rnd' | 'requester'>, icon: FileText },
  { href: '/sample-management', label: 'Manajemen Sampel', roles: ['rnd'] as Array<'rnd' | 'requester'>, icon: Boxes },
  { href: '/loan-notifications', label: 'Permintaan Sampel', roles: ['rnd'] as Array<'rnd' | 'requester'>, icon: BellIcon },
  { href: '/sample-returns', label: 'Pengembalian Sampel', roles: ['requester'] as Array<'rnd' | 'requester'>, icon: ArrowUpCircle },
  { href: '/admin/users', label: 'Kelola User', roles: ['root'] as Array<'rnd' | 'requester' | 'root'>, icon: Users2 },
];

function NavLinks({
  role,
  onNavigate,
  collapsed = false,
}: {
  role: AppRole | null;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => {
    if (!role || role === 'root') return true;
    return item.roles.includes(role);
  });

  return (
    <nav className={`space-y-2 ${collapsed ? 'px-1' : ''}`}>
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
              collapsed ? 'justify-center px-2' : ''
            } ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon size={20} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dept, setDept] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState({ username: 'RND', initials: 'R' });
  const router = useRouter();
  const { history, unreadCount, markAsRead } = useNotifications();
  const desktopWidth = isCollapsed ? '5rem' : '16rem';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ui_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === '1');
      }
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', desktopWidth);
    try {
      localStorage.setItem('ui_sidebar_collapsed', isCollapsed ? '1' : '0');
    } catch {}
  }, [desktopWidth, isCollapsed]);

  // Filter history to last 14 days and group into 'today' and '1-14 days ago'
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 14);
  const cutoffMs = cutoff.getTime();

  const normalized = [...history]
    .map((n) => ({
      ...n,
      _ts: Date.parse(String(n.Created_At || '').trim().replace(' ', 'T')) || 0,
    }))
    .filter((n) => n._ts >= cutoffMs)
    .sort((a, b) => b._ts - a._ts);

  const todayNotifications = normalized.filter((n) => n._ts >= startOfToday);
  const recentNotifications = normalized.filter((n) => n._ts < startOfToday && n._ts >= cutoffMs);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => {
        if (r.status === 401) {
          router.push('/login');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        const sessionDept = typeof d?.dept === 'string' ? d.dept : null;
        const sessionRole = normalizeAppRole(d?.role);
        setDept(sessionDept);
        setRole(sessionRole);
        if (sessionDept) {
          const initial = sessionDept.trim().charAt(0).toUpperCase() || 'U';
          setUser({ username: sessionDept, initials: initial });
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('role');
    router.push('/login');
    router.refresh();
  }

  const handleNotificationClick = async (notification: any) => {
    await markAsRead(notification.ID_Notification);
    if (notification.Notification_Type === 'pengembalian') {
      const returnId = Number(notification.Request_ID || 0);
      if (Number.isInteger(returnId) && returnId > 0) {
        router.push(`/sample-return-notifications/${returnId}`);
      } else {
        router.push('/loan-notifications');
      }
    } else if (notification.Request_ID) {
      router.push(`/loan-notifications/${notification.Request_ID}`);
    }
    setShowNotifications(false);
  };

  const sidebarTitle = role === 'requester' ? 'Portal Layanan Sampel' : 'Sistem Research & Development';
  const sidebarRoleLabel = role === 'rnd' ? 'R&D' : dept?.trim() || 'Layanan Sampel';

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsOpen((previous) => !previous)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
          >
            Menu
          </button>
          <span className="text-sm font-bold text-gray-900">Sistem Research & Development</span>
          <div className="flex items-center gap-4">
            {/* Bell Icon */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-bold text-gray-900">Notifikasi</h3>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto">
                    { (todayNotifications.length > 0 || recentNotifications.length > 0) ? (
                      <div>
                        {todayNotifications.length > 0 && (
                          <div className="p-3 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-700">Hari Ini</div>
                        )}

                        {todayNotifications.map((notif) => (
                          <button
                            key={notif.ID_Notification}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              !notif.Is_Read ? getUrgencyHighlightColor(notif.Urgency) : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {notif.Notification_Type === 'pengambilan' ? 'Pengambilan Sampel' : 'Pengembalian Sampel'}
                                  </p>
                                  {notif.Urgency && (
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getUrgencyBadgeClass(notif.Urgency)}`} title={urgencyLabels[notif.Urgency] || notif.Urgency}>
                                      {urgencyLabels[notif.Urgency] || notif.Urgency}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{notif.Sender_Departemen}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDropdownTime(notif)}</p>
                              </div>
                              {!notif.Is_Read && (
                                <div className={`ml-2 w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                  notif.Urgency === 'Tinggi' ? 'bg-red-600' : notif.Urgency === 'Sedang' ? 'bg-yellow-600' : notif.Urgency === 'Rendah' ? 'bg-green-600' : 'bg-blue-600'
                                }`} />
                              )}
                            </div>
                          </button>
                        ))}

                        {recentNotifications.length > 0 && (
                          <div className="p-3 border-t border-gray-100 bg-white text-sm font-semibold text-gray-700">1-14 Hari Lalu</div>
                        )}

                        {recentNotifications.map((notif) => (
                          <button
                            key={notif.ID_Notification}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              !notif.Is_Read ? getUrgencyHighlightColor(notif.Urgency) : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {notif.Notification_Type === 'pengambilan' ? 'Pengambilan Sampel' : 'Pengembalian Sampel'}
                                  </p>
                                  {notif.Urgency && (
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getUrgencyBadgeClass(notif.Urgency)}`} title={urgencyLabels[notif.Urgency] || notif.Urgency}>
                                      {urgencyLabels[notif.Urgency] || notif.Urgency}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{notif.Sender_Departemen}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatDropdownTime(notif)}</p>
                              </div>
                              {!notif.Is_Read && (
                                <div className={`ml-2 w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                  notif.Urgency === 'Tinggi' ? 'bg-red-600' : notif.Urgency === 'Sedang' ? 'bg-yellow-600' : notif.Urgency === 'Rendah' ? 'bg-green-600' : 'bg-blue-600'
                                }`} />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">Tidak ada notifikasi</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Icon */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                {user.initials}
              </button>

              {/* Logout Dropdown */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-full border-r border-slate-200 bg-white shadow-sm transition-all duration-200 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ width: desktopWidth }}
      >
        <div className={`flex h-full flex-col ${isCollapsed ? 'px-2 py-3' : 'p-4'}`}>
          <div className={`mb-4 flex items-start ${isCollapsed ? 'justify-center' : 'justify-between'} gap-2 border-b border-slate-200 pb-4`}>
            <div className={`${isCollapsed ? 'hidden' : 'block'} min-w-0`}>
              <div className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                {sidebarRoleLabel}
              </div>
              <h1 className="mt-2 text-lg font-bold text-slate-900">{sidebarTitle}</h1>
              {dept && <p className="mt-0.5 text-xs font-medium text-blue-600">Departemen: {dept}</p>}
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed((previous) => !previous)}
              className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 md:inline-flex"
              aria-label={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <NavLinks role={role} onNavigate={() => setIsOpen(false)} collapsed={isCollapsed} />

          <div className={`mt-auto space-y-2 ${isCollapsed ? 'pt-4' : 'pt-6'}`}>
            <PWAInstallButton compact={isCollapsed} />
            <button
              type="button"
              onClick={handleLogout}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-600 ${
                isCollapsed ? 'px-2' : ''
              }`}
              aria-label="Logout"
            >
              <LogOut size={16} />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

    </>
  );
}
