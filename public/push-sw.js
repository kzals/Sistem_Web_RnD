// Service worker activation - log for debugging
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Service worker install - log for debugging
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installed');
  self.skipWaiting();
});

self.addEventListener('push', (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: 'Notifikasi Baru',
      body: event.data ? event.data.text() : 'Ada notifikasi baru',
    };
  }

  const title = data.title || 'Notifikasi Baru';
  const urgencyValue = data.Urgency || data.urgency || '';
  const urgencyLabelMap = {
    Tinggi: 'Mendesak',
    Sedang: 'Standar',
    Rendah: 'Fleksibel',
  };
  const urgencyLabel = urgencyLabelMap[urgencyValue] || urgencyValue;
  const urgencyPrefix = urgencyLabel ? `[${urgencyLabel}] ` : '';
  const options = {
    body: `${urgencyPrefix}${data.body || 'Ada notifikasi baru'}`,
    icon: '/trisula-192.png',
    badge: '/Badge.png',
    data: {
      url: data.url || '/',
      requestId: data.requestId || data.Request_ID || null,
      timestamp: Date.now(),
    },
    vibrate: [100, 50, 100],
    tag: 'notification', // Consistent tag for grouping
    requireInteraction: false,
    silent: false,
    actions: [
      {
        action: 'open',
        title: 'Buka',
        icon: '/trisula-192.png'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options).catch((err) => {
        console.error('Error showing notification:', err);
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          // Forward ENTIRE payload to main thread including all metadata fields
          client.postMessage({ 
            type: 'NEW_NOTIFICATION', 
            payload: {
              ...data,  // All fields from push payload
              title: title,
              body: options.body,
              Urgency: urgencyValue,
            }
          });
        });
      }),
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Get the full URL with origin to ensure we open the correct application
  const clickData = event.notification.data || {};
  const notificationKind = String(clickData.kind || clickData.notificationType || '').trim().toLowerCase();
  let pathname = clickData.url || '/loan-notifications';
  const requestId = clickData.requestId || clickData.Request_ID || null;

  const isLoanNotification = notificationKind === 'loan' || notificationKind === 'pengambilan';
  const isLoanListPath = pathname === '/loan-notifications' || pathname === '/';
  const isLoanDetailPath = /^\/loan-notifications\/[^/]+$/.test(pathname);

  // Loan notifications should always land on the request detail page when Request_ID is available.
  if (isLoanNotification && requestId && !isLoanDetailPath) {
    pathname = `/loan-notifications/${encodeURIComponent(requestId)}`;
  }

  // Backward-compatible fallback for older payloads that pointed to non-existent paths in ui_web_rnd.
  if ((pathname === '/dashboard' || pathname === '/form-pengambilan' || pathname === '/search') && requestId) {
    pathname = `/loan-notifications/${encodeURIComponent(requestId)}`;
  }

  // If path is still invalid for this app, send user to loan notification list.
  if (!pathname || pathname === '/dashboard' || pathname === '/form-pengambilan') {
    pathname = requestId ? `/loan-notifications/${encodeURIComponent(requestId)}` : '/loan-notifications';
  }

  if (isLoanNotification && isLoanListPath && requestId) {
    pathname = `/loan-notifications/${encodeURIComponent(requestId)}`;
  }

  const origin = typeof self !== 'undefined' && self.location ? self.location.origin : 'http://localhost:3000';
  const targetUrl = new URL(pathname, origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Prioritize existing window on the same origin
      for (const client of clients) {
        if (new URL(client.url).origin === new URL(targetUrl).origin) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client) {
              client.navigate(targetUrl);
            }
            return;
          }
        }
      }

      // Fallback: use any window
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }

      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});
