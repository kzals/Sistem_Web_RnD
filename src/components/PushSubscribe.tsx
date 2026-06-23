'use client';

import { useEffect } from 'react';

export default function PushSubscribe() {
  useEffect(() => {
    async function subscribe() {
      // Cek browser support
      if (!('serviceWorker' in navigator)) {
        console.log('❌ Service Worker tidak di-support');
        return;
      }
      if (!('PushManager' in window)) {
        console.log('❌ Push Manager tidak di-support');
        return;
      }

      // In development, only clean old workbox caches, but keep service workers registered
      // This ensures PWA install prompt still works in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Dev mode: Cleaning old workbox caches (keeping service workers)...');
        
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.includes('workbox') || key.includes('next'))
              .map((key) => caches.delete(key))
          );
        }

        console.log('🔧 Dev mode: Cache cleanup complete');
      }

      // Always subscribe if notification permission already granted
      if (Notification.permission === 'granted') {
        console.log('✅ Notification permission sudah granted, subscribing...');
        await subscribeToPushAndRegister();
      }
    }

    async function subscribeToPushAndRegister() {
      try {
        // Register dedicated push worker so push events always have handlers.
        await navigator.serviceWorker.register('/push-sw.js', {
          scope: '/',
        });
        const registration = await navigator.serviceWorker.ready;

        console.log('✅ Push service worker registered');

        // Ambil VAPID public key
        const res = await fetch('/api/push/public-key');
        if (!res.ok) {
          throw new Error(`Gagal mengambil public key (HTTP ${res.status})`);
        }
        const { key } = await res.json();

        if (!key) {
          console.error('❌ VAPID public key tidak ditemukan');
          return;
        }

        const convertedKey = urlBase64ToUint8Array(key);

        // Reuse existing subscription if available to avoid duplicate DB rows.
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });
        }

        // Kirim ke backend
        const subscribeRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!subscribeRes.ok) {
          throw new Error(`Gagal menyimpan subscription (HTTP ${subscribeRes.status})`);
        }

        console.log('✅ SUBSCRIBE BERHASIL');
      } catch (error) {
        console.error('❌ Error during push subscription:', error);
      }
    }

    // Listen untuk event ketika permission di-grant
    const handleNotificationPermissionGranted = () => {
      console.log('📢 Notification permission granted event detected');
      subscribeToPushAndRegister();
    };

    subscribe().catch((error) => {
      console.error('❌ Gagal setup push:', error);
    });

    // Listen to custom event
    window.addEventListener('notificationPermissionGranted', handleNotificationPermissionGranted);

    return () => {
      window.removeEventListener('notificationPermissionGranted', handleNotificationPermissionGranted);
    };
  }, []);

  return null;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}