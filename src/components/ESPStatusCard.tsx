'use client';

import { useEffect, useRef, useState } from 'react';

interface ESPStatusData {
  [key: string]: {
    name: string;
    online: boolean;
    lemari_range: number[];
    address_range: number[];
    url: string;
    urls?: Array<{
      label: string;
      value: string;
    }>;
  };
}

const LEMARI_DESCRIPTIONS: { [key: number]: string } = {
  1: "Sampel Display Utama",
  2: "Sampel Produksi",
  3: "Sampel Development",
  4: "Sampel Customer",
  5: "Sampel Arsip",
  6: "Sampel Display Tambahan",
};

export default function ESPStatusCard() {
  const [espStatus, setEspStatus] = useState<ESPStatusData>({
    LEMARI_1: { name: 'Lemari Putih', online: false, lemari_range: [1], address_range: [1, 16, 145, 160], url: 'Not configured' },
    LEMARI_2: { name: 'Lemari Kuning', online: false, lemari_range: [2], address_range: [17, 48], url: 'Not configured' },
    LEMARI_3: { name: 'Lemari Biru', online: false, lemari_range: [3], address_range: [49, 80], url: 'Not configured' },
    LEMARI_4: { name: 'Lemari Merah', online: false, lemari_range: [4], address_range: [81, 112], url: 'Not configured' },
    LEMARI_5: { name: 'Lemari Hijau', online: false, lemari_range: [5], address_range: [113, 144], url: 'Not configured' },
    LEMARI_6: { name: 'Lemari Putih 2', online: false, lemari_range: [6], address_range: [145, 160], url: 'Not configured' },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testLemariCode, setTestLemariCode] = useState('');
  const [testRakHanger, setTestRakHanger] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const isFetchingRef = useRef(false);
  const pendingManualRefreshRef = useRef(false);

  const fetchESPStatus = async (showLoading = true) => {
    if (isFetchingRef.current) {
      if (showLoading) {
        pendingManualRefreshRef.current = true;
      }
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const configuredUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
      const candidates = [
        '/api/esp-status',
        ...(configuredUrl ? [`${configuredUrl}/api/esp-status`] : []),
        'http://localhost:8000/api/esp-status',
        'http://127.0.0.1:8000/api/esp-status',
        'http://localhost:8001/api/esp-status',
        'http://127.0.0.1:8001/api/esp-status',
      ].filter((value, index, arr) => arr.indexOf(value) === index);

      let data: ESPStatusData | null = null;
      let lastError = '';

      for (const endpoint of candidates) {
        try {
          const response = await fetch(endpoint, { cache: 'no-store' });

          if (!response.ok) {
            lastError = `HTTP ${response.status} dari ${endpoint}`;
            continue;
          }

          data = await response.json();
          break;
        } catch (requestError: any) {
          lastError = requestError?.message || `Gagal konek ke ${endpoint}`;
        }
      }

      if (!data) {
        throw new Error(`Failed to fetch (${lastError})`);
      }

      console.log('📊 ESP status received:', data);
      setEspStatus(data);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      isFetchingRef.current = false;
      if (showLoading) {
        setLoading(false);
      }

      if (pendingManualRefreshRef.current) {
        pendingManualRefreshRef.current = false;
        void fetchESPStatus(true);
      }
    }
  };

  const buildLampCodeFromInput = (lemariCode: string, rakHanger: string): string | null => {
    const lemari = Number(String(lemariCode).trim());
    if (!Number.isInteger(lemari) || lemari < 1 || lemari > 5) {
      return null;
    }

    const rakText = String(rakHanger).trim().toUpperCase();
    const match = rakText.match(/^([1-8])([A-D])$/);
    if (!match) {
      return null;
    }

    return `${lemari}${match[1]}${match[2]}`;
  };

  const handleTestLampAddress = async () => {
    const lampCode = buildLampCodeFromInput(testLemariCode, testRakHanger);
    if (!lampCode) {
      setTestMessage({
        type: 'error',
        text: 'Format tidak valid. Kode Lemari harus 1-5 dan Rak Hanger harus 1A-8D.',
      });
      return;
    }

    try {
      setTestLoading(true);
      setTestMessage(null);

      const configuredUrl = process.env.NEXT_PUBLIC_FASTAPI_URL;
      const candidates = [
        configuredUrl,
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8001',
        'http://127.0.0.1:8001',
      ].filter((value, index, arr): value is string => !!value && arr.indexOf(value) === index);

      let successResponse: any = null;
      let lastError = '';

      for (const baseUrl of candidates) {
        try {
          const response = await fetch(`${baseUrl}/api/lampu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lamp: lampCode,
              state: 1,
              activate_buzzer: true,
            }),
          });

          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            lastError = data?.detail || data?.error || `HTTP ${response.status}`;
            continue;
          }

          successResponse = data;
          break;
        } catch (requestError: any) {
          lastError = requestError?.message || `Gagal konek ke ${baseUrl}`;
        }
      }

      if (!successResponse) {
        throw new Error(lastError || 'Tidak bisa menghubungi backend lampu');
      }

      setTestMessage({
        type: 'success',
        text: `Perintah terkirim ke ${lampCode} (${successResponse?.esp_status || 'unknown'})`,
      });

      await fetchESPStatus(false);
    } catch (testError: any) {
      setTestMessage({ type: 'error', text: `Gagal kirim perintah: ${testError.message}` });
    } finally {
      setTestLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const startPolling = async () => {
      await fetchESPStatus(false);
      if (!cancelled) {
        timer = setTimeout(startPolling, 3000);
      }
    };

    fetchESPStatus(true);
    timer = setTimeout(startPolling, 3000);

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const cardStatuses = Object.entries(espStatus).map(([key, status]) => {
    const lemariNum = status.lemari_range[0];
    return {
      key,
      name: status.name || `Lemari ${lemariNum}`,
      lemariNum,
      online: status.online,
      description: LEMARI_DESCRIPTIONS[lemariNum] || 'Lemari',
    };
  });

  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-sky-50 via-white to-white p-5 shadow-sm md:p-6 mb-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Status ESP Board</h2>
          <p className="text-xs text-slate-500 mt-1">Monitoring konektivitas tiap lemari secara real-time</p>
        </div>
        <button
          onClick={() => fetchESPStatus(true)}
          disabled={loading}
          className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"
        >
          {loading ? '⟳ Loading...' : '⟳ Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p className="text-orange-600 text-sm">⚠️ {error}</p>
          <p className="text-orange-500 text-xs mt-2">Menampilkan status offline sebagai fallback</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cardStatuses.map((statusCard) => {
          const isOnline = statusCard.online;
          const bgColor = isOnline ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50/80';
          const dotColor = isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400';
          const badgeColor = isOnline ? 'bg-emerald-500' : 'bg-slate-500';
          const statusText = isOnline ? '✓ ONLINE' : '✗ OFFLINE';

          return (
            <div key={statusCard.key} className={`rounded-xl border p-4 transition-all ${bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-slate-800">{statusCard.name}</h3>
                <div className={`w-3 h-3 rounded-full ${dotColor}`}></div>
              </div>

              <p className="text-xs text-slate-600 italic mb-3">{statusCard.description}</p>

              <div className="mb-3">
                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded ${badgeColor} text-white`}>
                  {statusText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Tes Alamat Lampu</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Kode Lemari (1-5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={testLemariCode}
              onChange={(event) => setTestLemariCode(event.target.value)}
              placeholder="Contoh: 1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Rak Hanger (1A-8D)</label>
            <input
              type="text"
              value={testRakHanger}
              onChange={(event) => setTestRakHanger(event.target.value.toUpperCase())}
              placeholder="Contoh: 3B"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <button
            onClick={handleTestLampAddress}
            disabled={testLoading}
            className="h-10 rounded-lg bg-amber-500 px-4 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testLoading ? 'Mengirim...' : 'Kirim Perintah Lampu'}
          </button>
        </div>

        {testMessage && (
          <div
            className={`mt-3 rounded border px-3 py-2 text-sm ${
              testMessage.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {testMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

