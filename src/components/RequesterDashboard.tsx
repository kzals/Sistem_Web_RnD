'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateWib } from '@/lib/datetime';
import { SkeletonStatusCards, SkeletonBorrowedCard } from '@/components/SkeletonLoader';
import { useToast, ToastContainer } from '@/components/Toast';
import { Search, Package, ArrowUpCircle, Clock3, Image as ImageIcon } from 'lucide-react';

interface LatestProduct {
  IdProduksi?: number;
  Design?: string;
  TanggalProduksi?: string | null;
  CreatedAt?: string | null;
  Gambar?: string | null;
}

interface BorrowedItem {
  ID_Loan: number;
  ID_Sampel: number;
  Design: string;
  Customer_Name: string;
  Departemen?: string;
  Loan_Date: string;
  Durasi_Hari: number;
  Status?: string;
}

const ACTIVE_DEPARTEMEN_KEY = 'activeDepartemen';
const ACTIVE_LOAN_STATUSES = new Set(['dipinjam', 'keluar']);

function isActiveLoanStatus(status: string | null | undefined) {
  return ACTIVE_LOAN_STATUSES.has(String(status || '').trim().toLowerCase());
}

function formatRelativeTime(value?: string | null): string {
  const text = String(value || '').trim();
  if (!text) return '-';

  try {
    const now = new Date();
    const date = new Date(text);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;

    return formatDateWib(date);
  } catch {
    return formatDateWib(text);
  }
}

function getLatestProductDate(product: LatestProduct): string {
  return product.TanggalProduksi || product.CreatedAt || '';
}

export default function RequesterDashboard() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [rndStatus, setRndStatus] = useState<'checking' | 'connected' | 'error' | 'not-configured'>('checking');
  const [stats, setStats] = useState({ totalProducts: 0, uniqueDesigns: 0 });
  const [borrowedProducts, setBorrowedProducts] = useState<BorrowedItem[]>([]);
  const [borrowedLoading, setBorrowedLoading] = useState(false);
  const [activeDepartemen, setActiveDepartemen] = useState('');
  const [departemenInput, setDepartemenInput] = useState('');
  const [borrowedSearchText, setBorrowedSearchText] = useState('');
  const [latestProducts, setLatestProducts] = useState<LatestProduct[]>([]);
  const [latestProductsLoading, setLatestProductsLoading] = useState(false);
  const [currentMonthNewProductsCount, setCurrentMonthNewProductsCount] = useState(0);
  const [currentMonthCountLoading, setCurrentMonthCountLoading] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    showToast(type, type === 'success' ? 'Berhasil' : 'Kesalahan', text, 5000);
  };

  const checkDatabaseConnection = async () => {
    try {
      const response = await fetch('/api/setup');
      const data = await response.json();
      if (response.ok) {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
        showToast('error', 'Koneksi Database Gagal', data.error || 'Tidak dapat terhubung ke database');
      }
    } catch {
      setDbStatus('error');
      showToast('error', 'Koneksi Database Gagal', 'Tidak dapat terhubung ke database');
    }
  };

  const checkRndConnection = async () => {
    try {
      const response = await fetch('/api/integration/status');
      const data = await response.json();

      if (!data.configured) {
        setRndStatus('not-configured');
        return;
      }

      setRndStatus(data.connected ? 'connected' : 'error');
    } catch {
      setRndStatus('error');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/samples-count', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalProducts: Number(data?.totalProduk || 0),
          uniqueDesigns: Number(data?.totalDesign || 0),
        });
      }
    } catch (error: any) {
      console.error('Gagal mengambil statistik:', error);
    }
  };

  const refreshOverview = async () => {
    await Promise.all([
      checkDatabaseConnection(),
      checkRndConnection(),
      fetchStats(),
    ]);
  };

  const fetchBorrowedProducts = async (departemenOverride?: string) => {
    try {
      setBorrowedLoading(true);
      const departemen = (departemenOverride ?? activeDepartemen).trim();
      const query = new URLSearchParams({ limit: '20', offset: '0' });
      if (departemen) {
        query.set('departemen', departemen);
      }

      const response = await fetch(`/api/sample-loan?${query.toString()}`, { cache: 'no-store' });
      const raw = await response.json();
      if (!response.ok) {
        throw new Error(raw.error || 'Gagal mengambil data peminjaman');
      }

      const items = Array.isArray(raw) ? raw : (raw.items || []);
      const activeLoans = items.filter((item: any) => isActiveLoanStatus(item.Status));
      setBorrowedProducts(activeLoans);
    } catch (error: any) {
      console.error('Gagal mengambil daftar pinjaman aktif:', error);
      setBorrowedProducts([]);
    } finally {
      setBorrowedLoading(false);
    }
  };

  const fetchLatestProducts = async () => {
    try {
      setLatestProductsLoading(true);
      const response = await fetch('/api/users?page=1&pageSize=10', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengambil produk terbaru');
      }

      const items = Array.isArray(data?.data) ? data.data : [];
      const sortedItems = [...items].sort((left: LatestProduct, right: LatestProduct) => {
        const leftTime = new Date(getLatestProductDate(left)).getTime();
        const rightTime = new Date(getLatestProductDate(right)).getTime();
        const leftValue = Number.isNaN(leftTime) ? 0 : leftTime;
        const rightValue = Number.isNaN(rightTime) ? 0 : rightTime;

        if (rightValue !== leftValue) {
          return rightValue - leftValue;
        }

        return Number(right.IdProduksi || 0) - Number(left.IdProduksi || 0);
      });

      setLatestProducts(sortedItems.slice(0, 10));
    } catch (error: any) {
      console.error('Gagal mengambil produk terbaru:', error);
      setLatestProducts([]);
    } finally {
      setLatestProductsLoading(false);
    }
  };

  const isCurrentMonthProduct = (product: LatestProduct) => {
    const dateText = getLatestProductDate(product);
    if (!dateText) return false;

    const date = new Date(dateText);
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  };

  const fetchCurrentMonthNewProductsCount = async () => {
    try {
      setCurrentMonthCountLoading(true);

      let page = 1;
      const pageSize = 100;
      let hasNextPage = true;
      let count = 0;
      let safetyCounter = 0;

      while (hasNextPage && safetyCounter < 20) {
        const response = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Gagal mengambil count produk baru bulanan');
        }

        const items = Array.isArray(data?.data) ? data.data : [];
        count += items.filter((item: LatestProduct) => isCurrentMonthProduct(item)).length;

        hasNextPage = Boolean(data?.pagination?.hasNextPage);
        if (!hasNextPage || items.length === 0) {
          break;
        }

        page += 1;
        safetyCounter += 1;
      }

      setCurrentMonthNewProductsCount(count);
    } catch (error: any) {
      console.error('Gagal mengambil count produk baru bulan ini:', error);
      setCurrentMonthNewProductsCount(0);
    } finally {
      setCurrentMonthCountLoading(false);
    }
  };

  const refreshLatestProductsSection = async () => {
    await Promise.all([fetchLatestProducts(), fetchCurrentMonthNewProductsCount()]);
  };

  useEffect(() => {
    const refreshLatestProducts = () => {
      refreshLatestProductsSection();
    };

    const handleProductUpdate = () => {
      refreshLatestProducts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLatestProducts();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'products:last-updated') {
        refreshLatestProducts();
      }
    };

    window.addEventListener('products:updated', handleProductUpdate);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('products:updated', handleProductUpdate);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const applyDepartemenFilter = () => {
    const normalized = departemenInput.trim();
    setActiveDepartemen(normalized);
    localStorage.setItem(ACTIVE_DEPARTEMEN_KEY, normalized);
    fetchBorrowedProducts(normalized);
  };

  const clearDepartemenFilter = () => {
    setActiveDepartemen('');
    setDepartemenInput('');
    localStorage.removeItem(ACTIVE_DEPARTEMEN_KEY);
    fetchBorrowedProducts('');
  };

  const filteredBorrowedProducts = useMemo(() => {
    const text = borrowedSearchText.trim().toLowerCase();
    if (!text) {
      return borrowedProducts;
    }

    return borrowedProducts.filter((item) => {
      return (
        String(item.ID_Sampel || '').toLowerCase().includes(text) ||
        String(item.Design || '').toLowerCase().includes(text) ||
        String(item.Customer_Name || '').toLowerCase().includes(text) ||
        String(item.Departemen || '').toLowerCase().includes(text)
      );
    });
  }, [borrowedProducts, borrowedSearchText]);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) {
          router.replace('/login?from=/');
          return;
        }

        checkDatabaseConnection();
        checkRndConnection();
        fetchStats();

        const savedDepartemen = localStorage.getItem(ACTIVE_DEPARTEMEN_KEY) || '';
        setActiveDepartemen(savedDepartemen);
        setDepartemenInput(savedDepartemen);

        fetchBorrowedProducts(savedDepartemen);
        refreshLatestProductsSection();
      } catch {
        router.replace('/login?from=/');
      }
    };

    ensureAuthenticated();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dbIsConnected = dbStatus === 'connected';
  const dbIsError = dbStatus === 'error';
  const rndIsConnected = rndStatus === 'connected';
  const rndIsError = rndStatus === 'error';

  const activeLoansCount = filteredBorrowedProducts.length;
  const latestProductsCount = currentMonthCountLoading ? 0 : currentMonthNewProductsCount;
  const loading = borrowedLoading || latestProductsLoading;
  const dbStatusLabel = dbIsConnected ? 'Online' : dbIsError ? 'Offline' : 'Mengecek';
  const rndStatusLabel = rndIsConnected ? 'Online' : rndStatus === 'not-configured' ? 'Belum Konfigurasi' : rndIsError ? 'Offline' : 'Mengecek';

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-6 py-8 sm:px-8 lg:px-12 space-y-8">
            <div className="mb-6">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
                <div className="lg:col-span-1">
                  <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Dashboard</h1>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">Ringkasan request, notifikasi pengiriman, dan sampel aktif yang masih dipinjam.</p>
                </div>
                      <div className="lg:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 h-fit overflow-visible">
                  {!dbStatus || dbStatus === 'checking' ? (
                    <SkeletonStatusCards />
                  ) : (
                    <>
                      <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-emerald-100 bg-white p-3 text-left shadow-sm transition-all hover:shadow-lg">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status Sistem</div>
                          <div className="mt-2.5 flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${dbIsConnected ? 'bg-emerald-400' : dbIsError ? 'bg-rose-400' : 'bg-amber-400'}`} />
                            <div className={`text-[1.45rem] font-black leading-none tracking-tight ${dbIsConnected ? 'text-emerald-700' : dbIsError ? 'text-rose-600' : 'text-amber-600'}`}>
                              {dbStatusLabel}
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">Sistem Normal</p>
                        </div>
                        <span className={`mt-2.5 inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold ${dbIsConnected ? 'bg-emerald-50 text-emerald-700' : dbIsError ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {dbIsConnected ? 'Stabil' : dbIsError ? 'Perlu cek' : 'Proses'}
                        </span>
                      </div>
                      <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-sky-100 bg-white p-3 text-left shadow-sm transition-all hover:shadow-lg">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400" />
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sampel Dipinjam</div>
                          <div className="mt-2.5 text-2xl font-black leading-none tracking-tight text-sky-700 sm:text-[1.6rem]">{activeLoansCount}</div>
                          <p className="mt-2 text-sm text-slate-600">Sampel Produk</p>
                        </div>
                        <span className="mt-2.5 inline-flex w-fit rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-semibold text-sky-700">Dipinjam</span>
                      </div>
                      <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-amber-100 bg-white p-3 text-left shadow-sm transition-all hover:shadow-lg">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400" />
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Produk Baru</div>
                          <div className="mt-2.5 text-2xl font-black leading-none tracking-tight text-amber-600 sm:text-[1.6rem]">{latestProductsCount}</div>
                          <p className="mt-2 text-sm text-slate-600">Tersedia bulan ini.</p>
                        </div>
                        <span className="mt-2.5 inline-flex w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">Alert</span>
                      </div>
                      <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-indigo-100 bg-white p-3 text-left shadow-sm transition-all hover:shadow-lg">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Design</div>
                          <div className="mt-2.5 text-2xl font-black leading-none tracking-tight text-indigo-700 sm:text-[1.6rem]">{stats.uniqueDesigns}</div>
                          <p className="mt-2 text-sm text-slate-600">Produk Tersedia</p>
                        </div>
                        <span className="mt-2.5 inline-flex w-fit rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-semibold text-indigo-700">Katalog</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-200/80 pt-8">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-950 sm:text-xl">Menu</h2>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/search" className="group relative flex min-h-[7.5rem] items-center overflow-hidden rounded-3xl border border-sky-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 to-cyan-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                      <Search size={20} className="text-sky-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Cari Kain</div>
                      <div className="text-xs text-slate-500">Temukan kain berdasarkan kriteria</div>
                    </div>
                  </div>
                </Link>

                <Link href="/products" className="group relative flex min-h-[7.5rem] items-center overflow-hidden rounded-3xl border border-purple-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 to-pink-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-purple-50 ring-1 ring-purple-100">
                      <Package size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Data Produk</div>
                      <div className="text-xs text-slate-500">Kelola dan lihat data produk</div>
                    </div>
                  </div>
                </Link>

                <Link href="/sample-returns" className="group relative flex min-h-[7.5rem] items-center overflow-hidden rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
                      <ArrowUpCircle size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">Pengembalian Sampel</div>
                      <div className="text-xs text-slate-500">Ajukan permintaan untuk pengembalian sampel</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Produk Terbaru</h2>
                  <p className="text-sm text-slate-500">Lihat produk terbaru yang tersedia</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshLatestProductsSection}
                    disabled={latestProductsLoading || currentMonthCountLoading}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {latestProductsLoading || currentMonthCountLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
            <div className="max-h-[32rem] overflow-y-auto p-5">
              {latestProductsLoading && latestProducts.length === 0 && (
                <div className="space-y-3">
                  {Array(3)
                    .fill(null)
                    .map((_, index) => (
                      <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex gap-4">
                          <div className="h-20 w-20 rounded-2xl bg-slate-200" />
                          <div className="flex-1 space-y-3">
                            <div className="h-4 w-3/5 rounded bg-slate-200" />
                            <div className="h-3 w-1/3 rounded bg-slate-200" />
                            <div className="h-3 w-2/5 rounded bg-slate-200" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {latestProducts.length === 0 && !latestProductsLoading && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Belum ada produk terbaru.
                </div>
              )}

              {latestProducts.length > 0 && (
                <div className="space-y-3">
                  {latestProducts.map((item, index) => {
                    const productionDate = getLatestProductDate(item);
                    const relativeTime = productionDate ? formatRelativeTime(productionDate) : '-';
                    const imageSrc = String(item.Gambar || '').trim();
                    const productId = Number(item.IdProduksi || 0);
                    const isDetailAvailable = Number.isInteger(productId) && productId > 0;

                    return (
                      <div key={`${item.IdProduksi || index}-${item.Design || 'product'}`}>
                        {isDetailAvailable ? (
                          <Link
                            href={`/detail/${productId}?from=products`}
                            className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                          >
                            <div className="flex gap-4">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                {imageSrc ? (
                                  <img
                                    src={imageSrc}
                                    alt={item.Design || 'Gambar produk terbaru'}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 via-white to-cyan-50 text-sky-500">
                                    <ImageIcon size={22} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-base font-bold text-slate-900">{item.Design || 'Tanpa nama design'}</h3>
                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                      <Clock3 size={12} />
                                      <span>{relativeTime}</span>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">Baru</span>
                                </div>

                                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                  <span className="font-semibold text-slate-900">Tanggal produksi:</span> {productionDate ? formatDateWib(productionDate) : '-'}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
                            <div className="flex gap-4">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                {imageSrc ? (
                                  <img
                                    src={imageSrc}
                                    alt={item.Design || 'Gambar produk terbaru'}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-50 via-white to-cyan-50 text-sky-500">
                                    <ImageIcon size={22} />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="truncate text-base font-bold text-slate-900">{item.Design || 'Tanpa nama design'}</h3>
                                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                      <Clock3 size={12} />
                                      <span>{relativeTime}</span>
                                    </div>
                                  </div>
                                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Tanpa ID</span>
                                </div>

                                <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                  <span className="font-semibold text-slate-900">Tanggal produksi:</span> {productionDate ? formatDateWib(productionDate) : '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm xl:col-span-3">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Produk Sedang Dipinjam</h2>
                  <p className="text-sm text-slate-500">Daftar sampel yang sedang dipinjam oleh departemen Anda.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchBorrowedProducts()}
                    disabled={borrowedLoading}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {borrowedLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <Link href="/sample-returns" className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors">
                    Kelola Pengembalian
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Departemen</label>
                  <input
                    type="text"
                    value={departemenInput}
                    onChange={(event) => setDepartemenInput(event.target.value)}
                    placeholder="Contoh: Marketing"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cari Daftar Pinjaman</label>
                  <input
                    type="text"
                    value={borrowedSearchText}
                    onChange={(event) => setBorrowedSearchText(event.target.value)}
                    placeholder="Cari ID, design, peminjam"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={applyDepartemenFilter}
                    className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
                  >
                    Terapkan
                  </button>
                  <button
                    onClick={clearDepartemenFilter}
                    className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex items-end">
                  <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200 w-full">
                    Departemen aktif: <span className="font-semibold text-slate-900">{activeDepartemen || 'Semua'}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">ID Sampel</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Design</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Peminjam</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Departemen</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Tanggal Pinjam</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {borrowedLoading && (
                      <>
                        {Array(3)
                          .fill(null)
                          .map((_, i) => (
                            <SkeletonBorrowedCard key={i} />
                          ))}
                      </>
                    )}

                    {borrowedProducts.length === 0 && !borrowedLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          {activeDepartemen
                            ? `Tidak ada sampel untuk departemen: ${activeDepartemen}`
                            : 'Tidak ada sampel yang sedang dipinjam.'}
                        </td>
                      </tr>
                    )}

                    {borrowedProducts.length > 0 && filteredBorrowedProducts.length === 0 && !borrowedLoading && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          Tidak ada hasil untuk pencarian: <span className="font-semibold">"{borrowedSearchText}"</span>
                        </td>
                      </tr>
                    )}

                    {filteredBorrowedProducts.map((item) => (
                      <tr key={item.ID_Loan} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.ID_Sampel}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.Design || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.Customer_Name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{item.Departemen || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{item.Loan_Date ? formatDateWib(item.Loan_Date) : '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            {item.Status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-3">
                <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                  Tampil: <span className="font-semibold text-slate-900">{filteredBorrowedProducts.length}</span> / <span className="text-slate-600">{borrowedProducts.length}</span>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                  Total Aktif: <span className="font-semibold text-slate-900">{borrowedProducts.length}</span>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                  Pencarian: <span className="font-semibold text-slate-900">{borrowedSearchText.trim() || '-'}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {message && (
          <div className={`mt-6 rounded-xl border p-4 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {message.text}
          </div>
        )}

        {loading && <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-700">Memproses...</div>}
      </div>
    </div>
    </>
  );
}
