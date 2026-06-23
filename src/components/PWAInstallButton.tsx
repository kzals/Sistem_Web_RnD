'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Download } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallButtonProps {
  label?: string;
  compact?: boolean;
}

export default function PWAInstallButton({ label = 'Install App', compact = false }: PWAInstallButtonProps) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [hintMessage, setHintMessage] = useState('');
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if running as installed PWA
    const checkIfInstalledPWA = () => {
      // Check display mode (standalone = installed PWA)
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }

      // Fallback check for iOS (non-standard property)
      if ((navigator as any).standalone === true) {
        return true;
      }

      return false;
    };

    // If already installed PWA, don't show button
    const alreadyInstalled = checkIfInstalledPWA();
    
    if (alreadyInstalled) {
      setIsVisible(false);
      return;
    }

    // Register install worker only on login page in production.
    // In development we actively unregister stale install worker to avoid old cached UI.
    if (pathname === '/login' && 'serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .catch(() => {
            // ignore registration failure; install prompt may still work on some browsers
          });
      } else {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || registration.installing?.scriptURL || '';
            if (scriptUrl.includes('/sw.js')) {
              registration.unregister().catch(() => {
                // ignore cleanup failure in development
              });
            }
          });
        }).catch(() => {
          // ignore cleanup failure in development
        });
      }
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setHintMessage('');
      setIsVisible(true);
    };

    // Hide button when PWA is successfully installed
    const handleAppInstalled = () => {
      setIsVisible(false);
      deferredPromptRef.current = null;
      setHintMessage('Aplikasi berhasil terpasang.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Keep visible so user can tap and get fallback instructions if prompt is unavailable.
    setIsVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [pathname]);

  const handleInstallClick = useCallback(async () => {
    const prompt = deferredPromptRef.current;

    if (!prompt) {
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isAndroid = /android/i.test(navigator.userAgent);
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost';

      if (!isSecure) {
        setHintMessage('Instalasi PWA butuh HTTPS. Buka lewat link https:// lalu refresh halaman.');
        return;
      }

      if (isIos) {
        setHintMessage('Di Safari iPhone/iPad: tap Share lalu pilih Add to Home Screen.');
        return;
      }

      if (isAndroid) {
        setHintMessage('Jika prompt tidak muncul, buka di Chrome lalu pilih menu browser > Add to Home screen / Install app.');
        return;
      }

      setHintMessage(
        'Prompt install belum tersedia di browser ini. Gunakan Chrome/Safari dan buka sebagai tab browser biasa (bukan in-app browser).'
      );
      return;
    }

    try {
      await prompt.prompt();

      // Wait for user choice
      const { outcome } = await prompt.userChoice;

      if (outcome === 'accepted') {
        setIsVisible(false);
        setHintMessage('Aplikasi berhasil dipasang.');
      } else {
        setHintMessage('Instalasi dibatalkan. Anda bisa klik tombol ini lagi kapan saja.');
      }

      deferredPromptRef.current = null;
    } catch {
      setHintMessage('Terjadi kendala saat menampilkan prompt instalasi. Coba refresh halaman.');
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-colors duration-200 hover:bg-blue-700 hover:shadow-lg ${compact ? 'w-12 px-0' : 'w-full'}`}
        title="Install this app on your device"
        aria-label="Install PWA app"
      >
        <Download size={18} />
        {!compact && <span>{label}</span>}
      </button>
      {hintMessage && (
        <p className="text-xs text-gray-600 text-center">{hintMessage}</p>
      )}
    </div>
  );
}
