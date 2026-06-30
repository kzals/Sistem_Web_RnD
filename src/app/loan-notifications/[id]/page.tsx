'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDateTimeWib } from '@/lib/datetime';
import { normalizeAppRole, canAccessRnd } from '@/lib/auth';
import CurrentTimeCard from '@/components/CurrentTimeCard';

type NotificationDetail = {
  notification: {
    Request_ID: string;
    Customer_Name: string;
    Departemen: string;
    Status_Request: string;
    Urgency?: 'Rendah' | 'Sedang' | 'Tinggi' | string | null;
    Notes: string | null;
    Created_At: string;
    Is_Read: boolean;
  };
  samples: Array<{
    ID_Item: number;
    ID_Sampel: number;
    Design: string;
    Lemari: string | null;
    Rak_Hanger: string | null;
  }>;
};

function getUrgencyBadgeClass(urgency?: string | null) {
  switch (String(urgency || '').trim()) {
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

export default function LoanNotificationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [data, setData] = useState<NotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [samplePage, setSamplePage] = useState(1);
  const [role, setRole] = useState<string | null>(null);
  const samplePageSize = 10;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!meRes.ok) {
          router.replace('/login');
          return;
        }
        const meData = await meRes.json();
        const myRole = normalizeAppRole(meData?.role);
        if (!myRole || !canAccessRnd(myRole)) {
          router.replace('/');
          return;
        }
        setRole(myRole);
      } catch {
        router.replace('/login');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const response = await fetch(`/api/loan-notifications/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil detail notifikasi');
        }

        setData(result);

        await fetch('/api/loan-notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: id }),
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-slate-50 to-white py-8 px-4">
        <div className="max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-48 rounded bg-slate-200" />
            <div className="h-4 w-80 rounded bg-slate-200" />
            <div className="h-40 rounded-xl bg-slate-100" />
          </div>
          <p className="mt-4 text-sm text-slate-600">Memuat detail notifikasi...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-gradient-to-b from-slate-50 to-white py-8 px-4">
        <div className="max-w-5xl mx-auto rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error || 'Data tidak ditemukan'}</div>
          <Link href="/loan-notifications" className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Kembali ke Notifikasi
          </Link>
        </div>
      </div>
    );
  }

  const totalSamples = data?.samples?.length ?? 0;
  const totalSamplePages = Math.max(1, Math.ceil(totalSamples / samplePageSize));
  const safeSamplePage = Math.min(samplePage, totalSamplePages);
  const sampleOffset = (safeSamplePage - 1) * samplePageSize;
  const visibleSamples = data?.samples?.slice(sampleOffset, sampleOffset + samplePageSize) ?? [];
  const isSuccessMessage = Boolean(confirmMessage && confirmMessage.toLowerCase().includes('berhasil'));

  const handleConfirmDelivery = async () => {
    try {
      setConfirming(true);
      setConfirmMessage(null);

      const response = await fetch('/api/loan-notifications/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal konfirmasi pengiriman');
      }

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          notification: {
            ...prev.notification,
            Status_Request: String(result.status || 'Dipinjam'),
          },
        };
      });

      const successfulAttempts = Array.isArray(result.notifyResult?.attempts)
        ? result.notifyResult.attempts.filter((item: any) => item.ok).length
        : result.notifyResult?.delivered
          ? 1
          : 0;
      const notifyText = result.notifyResult?.delivered
        ? `Notifikasi berhasil dikirim (${successfulAttempts} endpoint sukses).`
        : 'Status sudah dikonfirmasi, tetapi notifikasi ke pengguna belum terkirim.';
      setConfirmMessage(`Konfirmasi berhasil. ${notifyText}`);
    } catch (err: any) {
      setConfirmMessage(err.message || 'Gagal konfirmasi pengiriman');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
                  R&D Workspace
                </div>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Detail Permintaan Sampel</h1>
                <p className="mt-1 text-sm text-slate-600">Request ID: {data.notification.Request_ID}</p>
              </div>
              <Link href="/loan-notifications" className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Kembali
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 px-6 py-5 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Status Request</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{data.notification.Status_Request || '-'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Sampel</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{data.samples.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Waktu Request</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{formatDateTimeWib(data.notification.Created_At)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Waktu Sekarang</div>
              <CurrentTimeCard />
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div><span className="font-semibold text-slate-700">Nama:</span> <span className="text-slate-900">{data.notification.Customer_Name}</span></div>
            <div><span className="font-semibold text-slate-700">Departemen:</span> <span className="text-slate-900">{data.notification.Departemen}</span></div>
            <div>
              <span className="font-semibold text-slate-700">Urgensi:</span>{' '}
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getUrgencyBadgeClass(data.notification.Urgency)}`}>
                {data.notification.Urgency || '-'}
              </span>
            </div>
            <div><span className="font-semibold text-slate-700">Keterangan:</span> <span className="text-slate-900">{data.notification.Notes || '-'}</span></div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {(role === 'rnd' || role === 'root') && (
              <button
                type="button"
                onClick={handleConfirmDelivery}
                disabled={confirming}
                className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {confirming ? 'Mengirim...' : 'Konfirmasi'}
              </button>
            )}
            {confirmMessage && (
              <span className={`rounded-lg border px-3 py-2 text-sm ${isSuccessMessage ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                {confirmMessage}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Daftar Sampel Diminta</h2>
            <span className="text-xs font-semibold text-slate-500">Menampilkan {visibleSamples.length} dari {totalSamples} item</span>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left w-16 text-xs font-semibold uppercase tracking-wide text-slate-600">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">ID Sampel</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Design</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Lemari</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Rak/Hanger</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {visibleSamples.map((sample, index) => (
                  <tr key={sample.ID_Item} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3 text-slate-700">{sample.ID_Sampel}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{sample.Design}</td>
                    <td className="px-4 py-3 text-slate-700">{sample.Lemari || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{sample.Rak_Hanger || '-'}</td>
                    <td className="px-4 py-3">
                      <Link href={`/detail/${sample.ID_Sampel}?from=loan-notifications&notifId=${params.id}`} className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalSamplePages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <div className="text-slate-500">
              Halaman {safeSamplePage} dari {totalSamplePages}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSamplePage((prev) => Math.max(1, prev - 1))}
                disabled={safeSamplePage <= 1}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => setSamplePage((prev) => Math.min(totalSamplePages, prev + 1))}
                disabled={safeSamplePage >= totalSamplePages}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
