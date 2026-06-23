'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { formatDateTimeWib } from '@/lib/datetime';

interface User {
  username: string;
  initials: string;
}

function getInitials(username: string): string {
  return username
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
}

export default function ProfileDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { history, unreadCount, markAsRead } = useNotifications();

  // Get dummy user from environment
  useEffect(() => {
    // Try to determine which project we're in and get appropriate username
    const isDev = process.env.NODE_ENV === 'development';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const port = typeof window !== 'undefined' ? window.location.port : '';
    
    // Default to TIC user (from .env.local DEPT_TIC_PASSWORD)
    let username = 'TIC';
    
    // Could add logic here to detect different users based on app, for now use TIC
    const initials = getInitials(username);
    
    setUser({ username, initials });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNotifications(false);
      }
    }

    if (isOpen || showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, showNotifications]);

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
    // Navigate to detail page
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
    <div ref={dropdownRef} className="relative">
      {/* Main Profile Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowNotifications(false);
        }}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center hover:shadow-lg transition-shadow"
        title={user.username}
      >
        {user.initials}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in">
          {/* User Info Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center">
                {user.initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-500">User</p>
              </div>
            </div>
          </div>

          {/* Notification Button */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 relative"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700 flex-1 text-left">Notifikasi</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="bg-white border-b border-gray-200 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  Tidak ada notifikasi
                </div>
              ) : (
                history.map((notification) => (
                  <button
                    key={notification.ID_Notification}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left border-b border-gray-100 hover:bg-blue-50 transition-colors last:border-b-0 ${
                      !notification.Is_Read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.Is_Read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {notification.Message}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDateTimeWib(notification.Created_At)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Logout Button */}
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
  );
}
