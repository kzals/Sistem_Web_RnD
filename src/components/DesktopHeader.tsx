'use client';

import { useEffect, useState } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from './NotificationContext';
import { formatDateTimeWib } from '@/lib/datetime';
import { normalizeAppRole } from '@/lib/auth';

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

export default function DesktopHeader() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState({ username: 'TIC', initials: 'T', roleLabel: 'Layanan Sampel' });
  const router = useRouter();
  const { history, unreadCount, markAsRead } = useNotifications();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => {
        const username = typeof data?.dept === 'string' && data.dept.trim() ? data.dept : 'RND';
        const initials = username
          .split(/[\s_-]+/)
          .map((word: string) => word.charAt(0).toUpperCase())
          .join('')
          .substring(0, 2) || 'R';
        const role = normalizeAppRole(data?.role);
        const roleLabel = role === 'root' ? 'ROOT' : role === 'rnd' ? 'R&D' : username;
        setUser({ username, initials, roleLabel });
      })
      .catch(() => {
        setUser({ username: 'RND', initials: 'R', roleLabel: 'R&D' });
      });
  }, []);

  const sortedHistory = [...history].sort((a, b) => {
    const toTime = (value: string) => {
      const parsed = Date.parse(String(value || '').trim().replace(' ', 'T'));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return toTime(b.Created_At) - toTime(a.Created_At);
  });

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
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

  return (
    <header className="hidden md:fixed md:right-0 md:top-0 md:z-40 md:border-b md:border-slate-200 md:bg-gradient-to-r md:from-white md:to-slate-50 md:px-6 md:py-4 md:flex md:items-center md:gap-6 md:shadow-sm" style={{ width: 'calc(100% - var(--sidebar-width, 16rem))' }}>
      <div className="mr-auto">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{user.roleLabel}</div>
        <div className="text-base font-bold text-slate-900">Sistem Research & Development</div>
      </div>

      <div className="flex items-center gap-6 ml-auto">
        {/* Bell Icon */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-colors"
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
            <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
                <h3 className="font-bold text-slate-900">Notifikasi</h3>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {sortedHistory && sortedHistory.length > 0 ? (
                  sortedHistory.map((notif) => (
                    <button
                      key={notif.ID_Notification}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full p-4 text-left border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        !notif.Is_Read ? getUrgencyHighlightColor(notif.Urgency) : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {notif.Notification_Type === 'pengambilan'
                                ? 'Pengambilan Sampel'
                                : 'Pengembalian Sampel'}
                            </p>
                            {notif.Urgency && (
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getUrgencyBadgeClass(notif.Urgency)}`}
                                title={urgencyLabels[notif.Urgency] || notif.Urgency}
                              >
                                {urgencyLabels[notif.Urgency] || notif.Urgency}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">
                            {notif.Sender_Departemen}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 font-medium">
                            {formatRelativeTime(notif.Created_At)}
                          </p>
                        </div>
                        {!notif.Is_Read && (
                          <div className={`ml-2 w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            notif.Urgency === 'Tinggi'
                              ? 'bg-red-600'
                              : notif.Urgency === 'Sedang'
                                ? 'bg-yellow-600'
                                : notif.Urgency === 'Rendah'
                                  ? 'bg-green-600'
                                  : 'bg-blue-600'
                          }`} />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    Tidak ada notifikasi
                  </div>
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white transition-shadow hover:shadow-lg"
          >
            {user.initials}
          </button>

          {/* Logout Dropdown */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full px-4 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-100 hover:text-red-600 transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
