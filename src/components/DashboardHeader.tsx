'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from './NotificationContext';
import { formatDateTimeWib } from '@/lib/datetime';

interface User {
  username: string;
  initials: string;
}

const urgencyLabels: Record<string, string> = {
  Tinggi: 'Mendesak',
  Sedang: 'Standar',
  Rendah: 'Fleksibel',
};

function getUrgencyBadgeClass(urgency?: string) {
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
}

function getUrgencyHighlightColor(urgency?: string) {
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
}

function getInitials(username: string): string {
  return username
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

function formatDropdownTime(notification: { Notification_Type: 'pengambilan' | 'pengembalian'; Created_At: string }) {
  return formatDateTimeWib(notification.Created_At);
}

export default function DashboardHeader() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { history, unreadCount, markAsRead } = useNotifications();

  const sortedHistory = [...history].sort((a, b) => {
    const toTime = (value: string) => {
      const parsed = Date.parse(String(value || '').trim().replace(' ', 'T'));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return toTime(b.Created_At) - toTime(a.Created_At);
  });

  useEffect(() => {
    const username = 'RND';
    const initials = getInitials(username);
    setUser({ username, initials });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowNotifications(false);
      }
    }

    if (showDropdown || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, showNotifications]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('role');
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="mb-8 bg-white rounded-lg shadow-sm p-4 flex items-center justify-end gap-6">
      {/* Bell Icon with Notifications - kiri */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowDropdown(false);
          }}
          className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notifikasi"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Notifikasi</p>
            </div>
            {sortedHistory.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                Tidak ada notifikasi
              </div>
            ) : (
              sortedHistory.map((notification) => (
                <button
                  key={notification.ID_Notification}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-blue-50 transition-colors last:border-b-0 ${
                    !notification.Is_Read ? getUrgencyHighlightColor(notification.Urgency) : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.Is_Read && (
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notification.Urgency === 'Tinggi'
                          ? 'bg-red-600'
                          : notification.Urgency === 'Sedang'
                            ? 'bg-yellow-600'
                            : notification.Urgency === 'Rendah'
                              ? 'bg-green-600'
                              : 'bg-blue-600'
                      }`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {notification.Message}
                      </p>
                      {notification.Urgency && (
                        <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getUrgencyBadgeClass(notification.Urgency)}`}>
                          {urgencyLabels[notification.Urgency] || notification.Urgency}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDropdownTime(notification)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Avatar Icon - kanan */}
      <div className="relative">
        <button
          onClick={() => {
            setShowDropdown(!showDropdown);
            setShowNotifications(false);
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center hover:shadow-lg transition-shadow"
          title={user.username}
        >
          {user.initials}
        </button>

        {/* Logout Dropdown */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">{user.username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
