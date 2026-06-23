'use client';

import { useState } from 'react';
import { AnyNotification, LoanRequestNotification, ReturnNotification, useNotifications } from './NotificationContext';
import { formatDateTimeAsWib } from '@/lib/datetime';

const urgencyLabels: Record<string, string> = {
  Tinggi: 'Mendesak',
  Sedang: 'Standar',
  Rendah: 'Fleksibel',
};

function formatNotifTime(value: string): string {
  return formatDateTimeAsWib(value);
}

const getUrgencyDotColor = (urgency?: string) => {
  switch (urgency) {
    case 'Tinggi':
      return 'bg-red-500';
    case 'Sedang':
      return 'bg-yellow-500';
    case 'Rendah':
      return 'bg-green-500';
    default:
      return 'bg-gray-400';
  }
};

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s === 'keluar') return 'bg-red-100 text-red-700';
  if (s === 'dipinjam') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}

function LoanPopup({ n, onDismiss }: { n: LoanRequestNotification; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-in-right"
      role="alert"
    >
      <div className="flex items-center justify-between bg-indigo-600 px-3 py-2">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 text-white text-sm font-semibold hover:text-indigo-100 focus:outline-none flex-1 text-left">
          <span>🔔 {n.Status_Request === 'Baru' ? 'Permintaan Sampel Baru' : 'Permintaan Dikonfirmasi'}</span>
          <span className="ml-auto text-xs opacity-80">{expanded ? '▲' : '▼'}</span>
        </button>
        <button onClick={onDismiss} className="text-white hover:text-indigo-200 text-lg leading-none font-bold focus:outline-none ml-2">×</button>
      </div>

      {!expanded && (
        <button onClick={() => setExpanded(true)} className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Dari: <span className="font-medium text-gray-700">{n.Departemen}</span></span>
            <div className="flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${getUrgencyDotColor(n.Urgency)}`}></span>
              <span className="text-xs text-gray-400">{formatNotifTime(n.Created_At)}</span>
            </div>
          </div>
          <p className="text-sm text-gray-700 truncate mt-0.5">{n.Customer_Name} — {n.Sample_Count} sampel</p>
        </button>
      )}

      {expanded && (
        <div className="px-4 py-3 space-y-2 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Dari: <span className="font-medium text-gray-700">{n.Departemen}</span></span>
            <span className="text-xs text-gray-400">{formatNotifTime(n.Created_At)}</span>
          </div>
          <p className="text-xs text-gray-500">Peminjam:<span className="font-medium text-gray-700">{n.Customer_Name}</span></p>
          <p className="text-xs text-gray-500">Request ID: <span className="font-mono font-medium text-gray-700">{n.Request_ID}</span></p>
          <div className="flex items-center gap-2">
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(n.Requested_Status)}`}>{n.Requested_Status}</span>
            <span className="text-xs text-gray-500">{n.Sample_Count} sampel</span>
            {n.Urgency && (
              <div className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${getUrgencyDotColor(n.Urgency)}`}></span>
                <span className="text-xs text-gray-600">{urgencyLabels[n.Urgency] || n.Urgency}</span>
              </div>
            )}
          </div>
          {n.Notes && <p className="text-xs text-gray-600 italic">{n.Notes}</p>}
          <a href={`/loan-notifications/${n.Request_ID}`} onClick={onDismiss} className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded py-1.5 mt-1 transition-colors">
            Lihat Detail Permintaan →
          </a>
        </div>
      )}
    </div>
  );
}

function ReturnPopup({ n, onDismiss }: { n: ReturnNotification; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-slide-in-right"
      role="alert"
    >
      <div className="flex items-center justify-between bg-emerald-600 px-3 py-2">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-2 text-white text-sm font-semibold hover:text-emerald-100 focus:outline-none flex-1 text-left">
          <span>📦 Pengembalian Sampel</span>
          <span className="ml-auto text-xs opacity-80">{expanded ? '▲' : '▼'}</span>
        </button>
        <button onClick={onDismiss} className="text-white hover:text-emerald-200 text-lg leading-none font-bold focus:outline-none ml-2">×</button>
      </div>

      {!expanded && (
        <button onClick={() => setExpanded(true)} className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Dari: <span className="font-medium text-gray-700">{n.senderDepartemen}</span></span>
            <span className="text-xs text-gray-400">{formatNotifTime(n.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 truncate mt-0.5">{n.count} sampel dikembalikan</p>
        </button>
      )}

      {expanded && (
        <div className="px-4 py-3 space-y-2 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Dari: <span className="font-medium text-gray-700">{n.senderDepartemen}</span></span>
            <span className="text-xs text-gray-400">{formatNotifTime(n.createdAt)}</span>
          </div>
          <p className="text-xs text-gray-500">Jumlah sampel:<span className="font-medium text-gray-700">{n.count}</span></p>
          <p className="text-xs text-gray-500">ID Sampel: <span className="font-mono font-medium text-gray-700">{n.sampleIds.join(', ')}</span></p>
          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{n.pickupStatus}</span>
          <a href={n.id > 0 ? `/sample-return-notifications/${n.id}` : '/loan-notifications'} onClick={onDismiss} className="block text-center text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded py-1.5 mt-1 transition-colors">
            Lihat Detail Pengembalian →
          </a>
        </div>
      )}
    </div>
  );
}

export default function NotificationPopup() {
  const { popups, dismiss } = useNotifications();

  if (popups.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 items-end">
      {popups.map((n) => {
        if (n.kind === 'loan') {
          return <LoanPopup key={n.Request_ID} n={n} onDismiss={() => dismiss(n.Request_ID)} />;
        }
        return <ReturnPopup key={n.id} n={n} onDismiss={() => dismiss(`return-${n.id}`)} />;
      })}
    </div>
  );
}
