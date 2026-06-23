'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface LoanRequestNotification {
  Request_ID: string;
  Customer_Name: string;
  Departemen: string;
  Requested_Status: string;
  Status_Request: string;
  Notes: string | null;
  Sample_Count: number;
  Created_At: string;
  Urgency?: string;
}

export interface ReturnNotification {
  id: number;
  sampleIds: number[];
  loanIds: number[];
  count: number;
  senderDepartemen: string;
  pickupStatus: 'Baru' | 'Dikonfirmasi' | 'Dikembalikan';
  createdAt: string;
}

export interface HistoryNotification {
  ID_Notification: number;
  Notification_Type: 'pengambilan' | 'pengembalian';
  Request_ID: string | null;
  Sender_Departemen: string;
  Status: string;
  Message: string;
  Is_Read: boolean;
  Created_At: string;
  Urgency?: string;
}

export type AnyNotification =
  | ({ kind: 'loan' } & LoanRequestNotification)
  | ({ kind: 'return' } & ReturnNotification);

interface NotificationContextValue {
  popups: AnyNotification[];
  dismiss: (key: string) => void;
  history: HistoryNotification[];
  unreadCount: number;
  markAsRead: (notificationId: number) => Promise<void>;
  refreshHistory: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  popups: [],
  dismiss: () => {},
  history: [],
  unreadCount: 0,
  markAsRead: async () => {},
  refreshHistory: async () => {},
});

const STORAGE_KEY_PREFIX = 'rnd_shown_notification_ids_v2';

function getShownKeys(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveShownKeys(keys: Set<string>, storageKey: string) {
  try {
    const arr = Array.from(keys).slice(-200);
    localStorage.setItem(storageKey, JSON.stringify(arr));
  } catch {}
}

function sortByNewest<T extends { Created_At?: string; createdAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const toTime = (value?: string) => {
      const normalized = String(value || '').trim().replace(' ', 'T');
      const parsed = Date.parse(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const left = toTime(b.Created_At || b.createdAt);
    const right = toTime(a.Created_At || a.createdAt);
    return left - right;
  });
}

function notifKey(n: AnyNotification): string {
  if (n.kind === 'loan') {
    return `loan:${String(n.Request_ID || '').trim()}:${String(n.Status_Request || '').trim().toLowerCase()}`;
  }
  return `return:${Number(n.id || 0)}`;
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.linearRampToValueAtTime(0, start + 0.2);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch {
    // silently ignore if audio not supported
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [popups, setPopups] = useState<AnyNotification[]>([]);
  const [history, setHistory] = useState<HistoryNotification[]>([]);
  const [storageKey, setStorageKey] = useState(`${STORAGE_KEY_PREFIX}:anonymous`);
  const shownKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadScopeKey = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!res.ok) {
          setStorageKey(`${STORAGE_KEY_PREFIX}:anonymous`);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const role = String(data?.role || 'unknown').trim().toLowerCase() || 'unknown';
        const dept = String(data?.dept || 'unknown').trim().toLowerCase() || 'unknown';
        setStorageKey(`${STORAGE_KEY_PREFIX}:${role}:${dept}`);
      } catch {
        setStorageKey(`${STORAGE_KEY_PREFIX}:anonymous`);
      }
    };

    loadScopeKey();
  }, []);

  useEffect(() => {
    shownKeysRef.current = getShownKeys(storageKey);
  }, [storageKey]);

  // Fetch notification history
  const refreshHistory = useCallback(async () => {
    try {
      // Only fetch notifications from the last 14 days to keep dropdown small
      const since = new Date();
      since.setDate(since.getDate() - 14);
      const sinceStr = since.toISOString().slice(0, 10); // YYYY-MM-DD
      const res = await fetch(`/api/notifications?limit=200&since=${encodeURIComponent(sinceStr)}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(sortByNewest((data.notifications || []) as HistoryNotification[]));
      }
    } catch (error) {
      console.error('Failed to fetch notification history:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setHistory((prev) =>
          sortByNewest(
            prev.map((n) =>
              n.ID_Notification === notificationId ? { ...n, Is_Read: true } : n
            )
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Load history on mount
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const dismiss = useCallback(async (key: string) => {
    setPopups((prev) => prev.filter((p) => {
      if (p.kind === 'loan') return p.Request_ID !== key;
      return `return-${p.id}` !== key;
    }));

    try {
      if (key.startsWith('loan:')) {
        const parts = key.split(':');
        const requestId = parts[1];
        if (requestId) {
          await fetch('/api/loan-notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId }),
          });
        }
      } else if (key.startsWith('return-')) {
        const id = Number(key.slice(7));
        if (Number.isInteger(id) && id > 0) {
          await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
        }
      }
    } catch {
      // silently ignore mark-as-read errors
    }
  }, []);

  const handlePushNotification = useCallback((notifications: AnyNotification[]) => {
    setPopups((prev) => {
      const added = notifications.filter((n) => {
        const key = notifKey(n);
        const alreadyInState = prev.some((p) => notifKey(p) === key);
        const alreadyShown = shownKeysRef.current.has(key);
        return !alreadyInState && !alreadyShown;
      });

      if (added.length > 0) {
        added.forEach((n) => {
          const key = notifKey(n);
          shownKeysRef.current.add(key);
        });
        saveShownKeys(shownKeysRef.current, storageKey);
        playNotificationSound();
        
        // Refresh history from API to ensure complete data (including Urgency)
        refreshHistory();
        
        return [...prev, ...added];
      }
      return prev;
    });
  }, [refreshHistory, storageKey]);

  // Keep lightweight periodic sync so popup/sound appears without tab refocus.
  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    const fetchUnreadPopups = async () => {
      try {
        const [loanRes, returnRes] = await Promise.all([
          fetch('/api/loan-notifications?onlyUnread=1', { cache: 'no-store' }),
          fetch('/api/sample-return-notifications?onlyUnread=1', { cache: 'no-store' }),
        ]);

        const incoming: AnyNotification[] = [];

        if (loanRes.ok) {
          const loanData = await loanRes.json().catch(() => []);
          const loans = Array.isArray(loanData) ? loanData : [];
          incoming.push(
            ...loans.map((n: any) => ({
              kind: 'loan' as const,
              Request_ID: String(n.Request_ID || ''),
              Customer_Name: String(n.Customer_Name || 'Unknown'),
              Departemen: String(n.Departemen || 'Sistem'),
              Requested_Status: String(n.Requested_Status || 'Dipinjam'),
              Status_Request: String(n.Status_Request || 'Baru'),
              Notes: n.Notes ?? null,
              Sample_Count: Number(n.Sample_Count || 0),
              Created_At: String(n.Created_At || new Date().toISOString()),
              Urgency: String(n.Urgency || ''),
            }))
          );
        }

        if (returnRes.ok) {
          const returnData = await returnRes.json().catch(() => ({ notifications: [] }));
          const returns = Array.isArray(returnData?.notifications) ? returnData.notifications : [];
          incoming.push(
            ...returns.map((n: any) => ({
              kind: 'return' as const,
              id: Number(n.id || 0),
              sampleIds: Array.isArray(n.sampleIds) ? n.sampleIds : [],
              loanIds: Array.isArray(n.loanIds) ? n.loanIds : [],
              count: Number(n.count || 0),
              senderDepartemen: String(n.senderDepartemen || 'Sistem'),
              pickupStatus: (n.pickupStatus === 'Dikonfirmasi' || n.pickupStatus === 'Dikembalikan') ? n.pickupStatus : 'Baru',
              createdAt: String(n.createdAt || new Date().toISOString()),
            }))
          );
        }

        if (!cancelled && incoming.length > 0) {
          handlePushNotification(incoming);
        }
      } catch {
        // ignore polling error
      }
    };

    const syncNotifications = async () => {
      await Promise.allSettled([fetchUnreadPopups(), refreshHistory()]);
    };

    syncNotifications();
    // Poll less frequently to reduce database/load pressure
    intervalId = window.setInterval(syncNotifications, 30000);

    const onFocus = () => {
      syncNotifications();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncNotifications();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handlePushNotification, refreshHistory]);

  // Listen to push notifications from service worker
  // This ensures notifications show in-app even when app is in foreground
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NEW_NOTIFICATION') {
        // When push arrives, map payload to AnyNotification format
        const payload = event.data.payload;
        if (payload) {
          let notification: AnyNotification;

          // Try to detect notification type from payload
          // Priority: explicit notificationType field > Request_ID field > default to return
          if (payload.notificationType === 'pengambilan' || payload.Request_ID || payload.kind === 'loan') {
            // Loan notification (Pengambilan Sampel)
            notification = {
              kind: 'loan',
              Request_ID: payload.Request_ID || payload.id || '',
              Customer_Name: payload.Customer_Name || 'Unknown',
              Departemen: payload.Departemen || payload.senderDepartemen || 'Sistem',
              Requested_Status: payload.Requested_Status || 'baru',
              Status_Request: payload.Status_Request || 'pending',
              Notes: payload.Notes || null,
              Sample_Count: payload.Sample_Count || 0,
              Created_At: payload.Created_At || payload.createdAt || payload.created_at || new Date().toISOString(),
              Urgency: payload.Urgency || payload.urgency || 'Sedang',
            };
          } else if (payload.notificationType === 'pengembalian' || payload.kind === 'return' || payload.sampleIds || payload.loanIds) {
            const parsedId = Number(payload.id || 0);
            const sampleIds = Array.isArray(payload.sampleIds) ? payload.sampleIds : [];
            const loanIds = Array.isArray(payload.loanIds) ? payload.loanIds : [];

            if (!(Number.isInteger(parsedId) && parsedId > 0) && sampleIds.length === 0 && loanIds.length === 0) {
              void refreshHistory();
              return;
            }

            // Return notification (Pengembalian Sampel)
            notification = {
              kind: 'return',
              id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : Date.now(),
              sampleIds,
              loanIds,
              count: Number(payload.count || sampleIds.length || loanIds.length || 1),
              senderDepartemen: payload.senderDepartemen || 'Sistem',
              pickupStatus: payload.pickupStatus || 'Baru',
              createdAt: payload.createdAt || payload.Created_At || payload.created_at || new Date().toISOString(),
            };
          } else {
            // Default: treat as return notification
            notification = {
              kind: 'return',
              id: payload.id || Date.now(),
              sampleIds: payload.sampleIds || [],
              loanIds: payload.loanIds || [],
              count: payload.count || 1,
              senderDepartemen: payload.senderDepartemen || 'Sistem',
              pickupStatus: payload.pickupStatus || 'Baru',
              createdAt: payload.createdAt || payload.Created_At || payload.created_at || new Date().toISOString(),
            };
          }

          handlePushNotification([notification]);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [handlePushNotification]);

  const unreadCount = history.filter((n) => !n.Is_Read).length;

  return (
    <NotificationContext.Provider value={{ popups, dismiss, history, unreadCount, markAsRead, refreshHistory }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
