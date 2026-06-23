'use client';

import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationPermissionRequest() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Hanya tampilkan jika:
    // 1. Browser support Notification
    // 2. Permission belum granted dan belum denied
    if (!('Notification' in window)) return;

    // Jika sudah granted, jangan tampilkan
    if (Notification.permission === 'granted') return;

    // Jika sudah denied, jangan tampilkan
    if (Notification.permission === 'denied') return;

    // Tampilkan prompt jika permission masih 'default'
    setShowPrompt(true);
  }, []);

  const handleAllow = async () => {
    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      console.log('[Notification] Permission result:', permission);

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        setShowPrompt(false);
        // Trigger push subscription
        window.dispatchEvent(new Event('notificationPermissionGranted'));
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 max-w-sm z-50 animate-slide-up">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Aktifkan Notifikasi?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Terima notifikasi penting tentang sampel dan peminjaman Anda
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAllow}
                disabled={isRequesting}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? 'Meminta...' : 'Izinkan'}
              </button>
              <button
                onClick={handleDismiss}
                disabled={isRequesting}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
              >
                Nanti
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={isRequesting}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
