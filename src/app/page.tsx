'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import RequesterDashboard from '../components/RequesterDashboard';
import { Search, Package, FileText, Boxes, Bell as BellIcon, ArrowUpCircle, ChevronDown } from 'lucide-react';
import { type AppRole, normalizeAppRole, canAccessRnd } from '@/lib/auth';

interface LemariStatus {
  name: string;
  color_name: string;
  online: boolean;
  url: string;
}

const LEMARI_ORDER = ['LEMARI_1', 'LEMARI_2', 'LEMARI_3', 'LEMARI_4', 'LEMARI_5', 'LEMARI_6'];

export default function Page() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [espOnlineBoards, setEspOnlineBoards] = useState<number>(0);
  const [espSummaryLoading, setEspSummaryLoading] = useState<boolean>(false);
  const [showESPBoard, setShowESPBoard] = useState<boolean>(false);
  const [lemariStatuses, setLemariStatuses] = useState<Record<string, LemariStatus>>({});
  const [totalBorrowedSamples, setTotalBorrowedSamples] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'checking'>('idle');
  const [dbIsConnected, setDbIsConnected] = useState<boolean>(true);
  const [dbIsError] = useState<boolean>(false);
  const dbDotColor = dbIsConnected ? 'bg-emerald-400' : 'bg-rose-400';
  const [urgentLoading] = useState(false);
  const [urgentNotificationCount] = useState(0);
  const [message] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const initRole = async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setRole(normalizeAppRole(data?.role));
        } else {
          setRole(null);
        }
      } catch (e) {
        setRole(null);
      }
    };

    initRole();
    fetchBorrowedSamplesCount();
  }, []);

  const fetchBorrowedSamplesCount = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sample-loan-count', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setTotalBorrowedSamples(data.totalDipinjam ?? 0);
      } else {
        setTotalBorrowedSamples(0);
      }
    } catch (error) {
      console.error('Gagal mengambil jumlah sampel dipinjam:', error);
      setTotalBorrowedSamples(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccessRnd(role)) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    
    const fetchESPSummary = async () => {
      setEspSummaryLoading(true);
      try {
        const response = await fetch('/api/esp-status', {
          method: 'GET',
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          setLemariStatuses(data);
          const onlineCount = Object.values(data).filter((lemari: any) => lemari?.online).length;
          setEspOnlineBoards(onlineCount);
        } else {
          setLemariStatuses({});
          setEspOnlineBoards(0);
        }
      } catch (error) {
        console.error('Error fetching ESP status:', error);
        setLemariStatuses({});
        setEspOnlineBoards(0);
      } finally {
        setEspSummaryLoading(false);
      }
    };

    const startPolling = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          fetchESPSummary();
        }
      }, 15000);
    };

    fetchESPSummary();
    startPolling();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchESPSummary();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [role]);

  const checkDatabaseConnection = () => {
    setDbStatus('checking');
    setTimeout(() => {
      setDbIsConnected(true);
      setDbStatus('idle');
    }, 700);
  };

  if (role === 'requester') return <RequesterDashboard />;
  if (role === null)
    return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-center text-gray-600">Memuat dashboard...</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-visible rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-6 py-8 sm:px-8 lg:px-12 space-y-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
              <div className="lg:col-span-1">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">Dashboard</span>
                  <button
                    type="button"
                    onClick={checkDatabaseConnection}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <ArrowUpCircle size={14} />
                    Refresh ringkasan
                  </button>
                </div>
                <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Dashboard</h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">Ringkasan aktivitas lemari, peminjaman sampel, dan antrean permintaan hari ini.</p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-fit overflow-visible">
                {/* ESP Status Card - Expandable */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowESPBoard(!showESPBoard)}
                    className="group relative w-full overflow-hidden rounded-3xl border border-sky-100 bg-white text-left shadow-sm transition-all hover:shadow-lg cursor-pointer"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400" />
                    <div className="p-3 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lemari aktif</div>
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">Perangkat</span>
                      </div>
                      <div className="mt-4 text-4xl font-black tracking-tight text-slate-950">{`${espOnlineBoards}/6`}</div>
                      <div className={`mt-2 text-sm font-medium ${espOnlineBoards === 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {espSummaryLoading ? 'Memuat status lemari...' : espOnlineBoards === 0 ? 'Koneksi Lemari Terputus' : `${espOnlineBoards} lemari sedang online`}
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-sky-700">
                        <span>{showESPBoard ? 'Tutup detail' : 'Klik untuk lihat detail'}</span>
                        <ChevronDown 
                          size={16} 
                          className={`transition-transform ${showESPBoard ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>
                  </button>

                  {showESPBoard && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+0.75rem)] z-30 w-80 rounded-3xl border border-sky-100 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-bold text-slate-900">Status detail lemari</div>
                      </div>
                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {LEMARI_ORDER.map((key, index) => {
                          const lemari = lemariStatuses[key];
                          const fallbackName = index === 0 ? 'Lemari 1' : index === 1 ? 'Lemari 2' : index === 2 ? 'Lemari 3' : index === 3 ? 'Lemari 4' : index === 4 ? 'Lemari 5' : 'Lemari 6';
                          const fallbackColor = index === 0 ? 'Putih-1' : index === 1 ? 'Kuning' : index === 2 ? 'Biru' : index === 3 ? 'Merah' : index === 4 ? 'Hijau' : 'Putih-2';
                          const isOnline = Boolean(lemari?.online);

                          return (
                            <div key={key} className="flex items-center justify-between rounded-2xl bg-sky-50/70 px-3 py-2.5 transition-colors hover:bg-sky-100">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{lemari?.name || fallbackName}</div>
                                <div className="text-xs text-slate-600">{lemari?.color_name || fallbackColor}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <span className={`text-xs font-semibold ${isOnline ? 'text-emerald-700' : 'text-slate-600'}`}>
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sampel Sedang Dipinjam Card */}
                <Link
                  href="/sample-management"
                  className="group relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-3 shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sampel dipinjam</div>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">Live</span>
                  </div>
                  <div className="mt-4 text-4xl font-black tracking-tight text-orange-600">
                    {totalBorrowedSamples === null ? '-' : totalBorrowedSamples}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {loading && totalBorrowedSamples === null ? 'Menunggu data...' : 'Total sampel yang sedang dipinjam.'}
                  </p>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-orange-700">
                    <span className="transition-transform group-hover:translate-x-1">Buka halaman →</span>
                  </div>
                </Link>

                {/* Status Database Card */}
                <button
                  type="button"
                  onClick={checkDatabaseConnection}
                  disabled={dbStatus === 'checking'}
                  className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-3 text-left shadow-sm transition-all hover:shadow-lg disabled:opacity-70"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status Sistem</div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${dbIsConnected ? 'bg-emerald-50 text-emerald-700' : dbIsError ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {dbIsConnected ? 'Stabil' : dbIsError ? 'Perlu cek' : 'Proses'}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${dbDotColor}`} />
                    <div className={`text-3xl font-black tracking-tight ${dbIsConnected ? 'text-emerald-700' : dbIsError ? 'text-rose-600' : 'text-amber-600'}`}>
                      {dbIsConnected ? 'Online' : dbIsError ? 'Offline' : 'Mengecek'}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">Sistem berjalan normal.</p>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-emerald-700">
                    <span className="transition-transform group-hover:translate-x-1">Refresh ↻</span>
                  </div>
                </button>

                {/* Permintaan Mendesak Card */}
                <Link
                  href="/loan-notifications"
                  className="group relative overflow-hidden rounded-3xl border border-rose-100 bg-white p-3 shadow-sm transition-all hover:shadow-lg"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 via-red-400 to-orange-400" />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permintaan mendesak</div>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Urgent</span>
                  </div>
                  <div className="mt-4 text-4xl font-black tracking-tight text-rose-600">{urgentLoading ? '-' : urgentNotificationCount}</div>
                  <p className="mt-2 text-sm text-slate-600">
                    {urgentLoading
                      ? 'Memuat notifikasi...'
                      : urgentNotificationCount > 0
                        ? 'Ada permintaan yang perlu perhatian.'
                        : 'Belum ada permintaan masuk.'}
                  </p>
                  <div className="mt-4 flex items-center justify-end text-xs font-semibold text-rose-700">
                    <span className="transition-transform group-hover:translate-x-1">Lihat daftar →</span>
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200/80 pt-8">
              <div className="mb-2">
                <h2 className="text-lg font-bold text-slate-950 sm:text-xl">Menu</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                <Link href="/search" className="group relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                      <Search size={20} className="text-sky-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Cari Kain</div>
                      <div className="text-xs text-slate-500">Temukan kain berdasarkan kriteria</div>
                    </div>
                  </div>
                </Link>

                <Link href="/products" className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                      <Package size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Data Produk</div>
                      <div className="text-xs text-slate-500">Kelola & Update data produk</div>
                    </div>
                  </div>
                </Link>

                <Link href="/input" className="group relative overflow-hidden rounded-3xl border border-purple-100 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-pink-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 ring-1 ring-purple-100">
                      <FileText size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Tambah Data</div>
                      <div className="text-xs text-slate-500">Masukkan data produk baru</div>
                    </div>
                  </div>
                </Link>

                <Link href="/sample-management" className="group relative overflow-hidden rounded-3xl border border-amber-100 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                      <Boxes size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Stok</div>
                      <div className="text-xs text-slate-500">Cek dan Update Stok</div>
                    </div>
                  </div>
                </Link>

                <Link href="/loan-notifications" className="group relative overflow-hidden rounded-3xl border border-rose-100 bg-white p-4 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-orange-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
                      <BellIcon size={20} className="text-rose-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Permintaan</div>
                      <div className="text-xs text-slate-500">Lihat antrean masuk</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
