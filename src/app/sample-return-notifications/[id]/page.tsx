'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatDateTimeWib } from '@/lib/datetime';

type ReturnNotificationDetail = {
  id: number;
  sampleIds: number[];
  loanIds: number[];
  count: number;
  senderDepartemen: string;
  pickupStatus: 'Baru' | 'Dikonfirmasi' | 'Dikembalikan';
  pickupConfirmedAt?: string | null;
  createdAt: string;
};

export default function SampleReturnNotificationDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<ReturnNotificationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/sample-return-notifications/${encodeURIComponent(id)}`, { cache: 'no-store' });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal mengambil detail notifikasi pengembalian');
        }

        setData(result);

        await fetch(`/api/sample-return-notifications/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        setMessage({ type: 'error', text: error.message || 'Gagal mengambil detail notifikasi' });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const handleConfirmPickup = async () => {
    if (!data) return;

    try {
      setConfirming(true);
      setMessage(null);

      const response = await fetch('/api/sample-return-notifications/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: data.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengirim konfirmasi pengambilan');
      }

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pickupStatus: 'Dikonfirmasi',
          pickupConfirmedAt: new Date().toISOString(),
        };
      });

      const notifyText = result.notifyResult?.delivered
        ? 'Notifikasi konfirmasi ke pengguna berhasil dikirim.'
        : 'Status dikonfirmasi, tetapi notifikasi ke pengguna belum terkirim.';
      setMessage({ type: 'success', text: `Konfirmasi berhasil. ${notifyText}` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Gagal konfirmasi pengambilan' });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detail Notifikasi Pengembalian</h1>
            <p className="text-gray-600">Notifikasi ID: {id}</p>
          </div>
          <Link href="/loan-notifications" className="bg-purple-500 hover:bg-purple-700 text-white text-sm font-bold py-2 px-4 rounded">
            Kembali
          </Link>
        </div>

        {message && (
          <div className={`mb-6 rounded p-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {loading && <div className="rounded bg-blue-50 p-4 text-blue-700">Memuat detail notifikasi...</div>}

        {!loading && data && (
          <div className="rounded-lg bg-white p-6 shadow-md">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div><span className="font-semibold">Departemen Pengirim:</span> {data.senderDepartemen}</div>
              <div><span className="font-semibold">Jumlah Sampel:</span> {data.count}</div>
              <div><span className="font-semibold">Dikirim Pada:</span> {formatDateTimeWib(data.createdAt)}</div>
              <div><span className="font-semibold">Status Pickup:</span> {data.pickupStatus}</div>
              <div className="md:col-span-2"><span className="font-semibold">Loan ID:</span> {data.loanIds.join(', ') || '-'}</div>
              <div className="md:col-span-2"><span className="font-semibold">Sample ID:</span> {data.sampleIds.join(', ') || '-'}</div>
              {data.pickupConfirmedAt && (
                <div className="md:col-span-2"><span className="font-semibold">Dikonfirmasi Pada:</span> {formatDateTimeWib(data.pickupConfirmedAt)}</div>
              )}
            </div>

            <div className="mt-5">
              <button
                type="button"
                onClick={handleConfirmPickup}
                disabled={confirming || data.pickupStatus === 'Dikonfirmasi' || data.pickupStatus === 'Dikembalikan'}
                className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {confirming ? 'Mengirim...' : data.pickupStatus === 'Dikembalikan' ? 'Sudah Dikembalikan' : data.pickupStatus === 'Dikonfirmasi' ? 'Sudah Dikonfirmasi' : 'Konfirmasi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
