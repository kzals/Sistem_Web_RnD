'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTimeWib } from '@/lib/datetime';
import { normalizeAppRole } from '@/lib/auth';

const urgencyLabels: Record<string, string> = {
  Tinggi: 'Mendesak',
  Sedang: 'Standar',
  Rendah: 'Fleksibel',
};

const getUrgencyDotColor = (urgency?: string) => {
  switch (urgency) {
    case 'Tinggi':
      return 'bg-red-500';
    case 'Sedang':
      return 'bg-yellow-500';
    case 'Rendah':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

type NotificationItem = {
  Request_ID: string;
  Customer_Name: string;
  Departemen: string;
  Status_Request: string;
  Notes: string | null;
  Requested_By_App: string;
  Is_Read: boolean;
  Created_At: string;
  Sample_Count: number;
  Urgency?: string;
};

type ReturnNotificationItem = {
  id: number;
  sampleIds: number[];
  loanIds: number[];
  count: number;
  senderDepartemen: string;
  pickupStatus: 'Baru' | 'Dikonfirmasi' | 'Dikembalikan';
  pickupConfirmedAt?: string | null;
  createdAt: string;
};

export default function LoanNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);
  const [updatingDoneId, setUpdatingDoneId] = useState<number | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    // Check role and redirect requester
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const role = normalizeAppRole(data?.role);
        if (role === 'requester') {
          router.replace('/');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const query = showUnreadOnly ? '?onlyUnread=1' : '';
      const response = await fetch(`/api/loan-notifications${query}`, { cache: 'no-store' });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnItems = async () => {
    try {
      setReturnLoading(true);
      const response = await fetch('/api/sample-return-notifications', { cache: 'no-store' });
      const data = await response.json();
      const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
      setReturnItems(notifications);
    } finally {
      setReturnLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by date
      if (dateFilter) {
        const itemDate = new Date(item.Created_At).toLocaleDateString('id-ID');
        const filterDate = new Date(dateFilter).toLocaleDateString('id-ID');
        if (itemDate !== filterDate) return false;
      }

      // Filter by urgency
      if (urgencyFilter) {
        if (item.Urgency !== urgencyFilter) return false;
      }

      // Filter by status
      if (statusFilter) {
        const itemStatus = item.Is_Read ? 'Sudah Dibaca' : 'Baru';
        if (itemStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [items, dateFilter, urgencyFilter, statusFilter]);

  const unreadPickupCount = items.filter((item) => !item.Is_Read).length;
  const urgentPickupCount = items.filter((item) => item.Urgency === 'Tinggi').length;
  const pendingReturnCount = returnItems.filter((item) => item.pickupStatus !== 'Dikembalikan').length;

  const refreshAll = async () => {
    await Promise.all([fetchItems(), fetchReturnItems()]);
  };

  const handleDone = async (notificationId: number) => {
    try {
      setUpdatingDoneId(notificationId);
      // Simpan posisi scroll sebelum fetch
      const prevScrollY = window.scrollY;
      const response = await fetch('/api/sample-return-notifications/done', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengubah status menjadi Dikembalikan');
      }

      await fetchReturnItems();
      // Restore posisi scroll setelah data di-refresh
      window.scrollTo({ top: prevScrollY });
    } catch (error: any) {
      console.error(error.message || 'Gagal mengubah status notifikasi pengembalian');
    } finally {
      setUpdatingDoneId(null);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchReturnItems();
  }, [showUnreadOnly]);

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                  R&D Workspace
                </div>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Permintaan Sampel</h1>
                <p className="mt-1 text-sm text-slate-600">Pusat pemantauan permintaan pengambilan dan pengembalian lintas departemen.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowUnreadOnly((prev) => !prev)}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {showUnreadOnly ? 'Tampilkan Semua' : 'Fokus Belum Dibaca'}
                </button>
                <button
                  onClick={refreshAll}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Refresh Semua
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-6 py-5 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Notifikasi Masuk</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-orange-700">Belum Dibaca</div>
              <div className="mt-1 text-2xl font-bold text-orange-700">{unreadPickupCount}</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-rose-700">Urgensi Tinggi</div>
              <div className="mt-1 text-2xl font-bold text-rose-700">{urgentPickupCount}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Return Pending</div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">{pendingReturnCount}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-bold text-slate-900">Permintaan Pengambilan</h2>
            <button
              onClick={fetchItems}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {/* Filter Section */}
          <div className="border-b border-slate-200 px-5 py-4 bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Urgensi</label>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Semua</option>
                  <option value="Tinggi">Mendesak</option>
                  <option value="Sedang">Standar</option>
                  <option value="Rendah">Fleksibel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Semua</option>
                  <option value="Baru">Baru</option>
                  <option value="Sudah Dibaca">Sudah Dibaca</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFilter('');
                    setUrgencyFilter('');
                    setStatusFilter('');
                  }}
                  className="w-full px-3 py-2 bg-white text-slate-700 text-sm font-semibold rounded-xl ring-1 ring-slate-300 hover:bg-slate-100"
                >
                  Reset Filter
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-5 text-sky-700 bg-sky-50">Memuat notifikasi...</div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Departemen</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Jumlah Sampel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Urgensi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Tidak ada notifikasi</td>
                    </tr>
                  )}
                  {filteredItems.map((item) => (
                    <tr key={item.Request_ID} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{formatDateTimeWib(item.Created_At)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.Customer_Name}</td>
                      <td className="px-4 py-3 text-slate-700">{item.Departemen}</td>
                      <td className="px-4 py-3 text-slate-700">{item.Sample_Count}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${getUrgencyDotColor(item.Urgency)}`}></span>
                          <span className="text-slate-700">{item.Urgency ? urgencyLabels[item.Urgency] || item.Urgency : '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.Is_Read ? 'bg-slate-100 text-slate-700' : 'bg-orange-100 text-orange-700'}`}>
                          {item.Is_Read ? 'Sudah Dibaca' : 'Baru'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/loan-notifications/${encodeURIComponent(item.Request_ID)}`}
                          className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-xl font-bold text-slate-900">Permintaan Pengembalian</h2>
            <button
              onClick={fetchReturnItems}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {returnLoading ? (
            <div className="p-5 text-sky-700 bg-sky-50">Memuat notifikasi pengembalian...</div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Pengirim</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Loan ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Jumlah Sampel</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {returnItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Tidak ada notifikasi pengembalian</td>
                    </tr>
                  )}
                  {returnItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700">{formatDateTimeWib(item.createdAt)}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.senderDepartemen || 'Unknown'}</td>
                      <td className="px-4 py-3 text-slate-700">{(item.loanIds || []).join(', ') || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.count || item.sampleIds?.length || 0}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.pickupStatus === 'Dikembalikan'
                            ? 'bg-green-100 text-green-700'
                            : item.pickupStatus === 'Dikonfirmasi'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.pickupStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/sample-return-notifications/${item.id}`}
                            className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                          >
                            Detail
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDone(item.id)}
                            disabled={updatingDoneId === item.id || item.pickupStatus === 'Dikembalikan'}
                            className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {updatingDoneId === item.id ? 'Menyimpan...' : 'Done'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
