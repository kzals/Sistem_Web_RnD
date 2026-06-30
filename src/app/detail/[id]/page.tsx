'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { KonstruksiTenunRecord, ParameterFisikRecord, ProductRecord, SpesifikasiRecord } from '@/types/user';
import ImageModal from '@/components/ImageModal';
import { formatDateWib } from '@/lib/datetime';
import { type AppRole, normalizeAppRole, canAccessRnd } from '@/lib/auth';

export default function DetailProduct() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const fromPage = searchParams.get('from') || 'search';
  const notifId = searchParams.get('notifId') || '';

  const [productData, setProductData] = useState<ProductRecord | null>(null);
  const [spesifikasiData, setSpesifikasiData] = useState<SpesifikasiRecord | null>(null);
  const [konstruksiData, setKonstruksiData] = useState<KonstruksiTenunRecord | null>(null);
  const [parameterFisikData, setParameterFisikData] = useState<ParameterFisikRecord | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trackLoading, setTrackLoading] = useState(false);
  const [trackMessage, setTrackMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleBack = () => {
    switch (fromPage) {
      case 'search':
        router.push('/search');
        break;
      case 'products':
        router.push('/products');
        break;
      case 'form-pengambilan':
        router.push('/form-pengambilan');
        break;
      case 'loan-notifications':
        router.push(`/loan-notifications/${notifId}`);
        break;
      default:
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/search');
        }
        break;
    }
  };

  const buildLampCodeFromLocation = (lemari?: string, rakHanger?: string): string | null => {
    if (!lemari || !rakHanger) return null;

    const lemariToNumber: Record<string, number> = {
      Putih: 1,
      Kuning: 2,
      Biru: 3,
      Merah: 4,
      Hijau: 5,
    };

    const noLemari = lemariToNumber[String(lemari).trim()];
    if (!noLemari) return null;

    const rakText = String(rakHanger).trim().toUpperCase();
    const match = rakText.match(/^(\d)([A-D])$/);
    if (!match) return null;

    const rakNumber = Number(match[1]);
    const posisi = match[2];

    if (noLemari < 1 || noLemari > 5 || rakNumber < 1 || rakNumber > 8) {
      return null;
    }

    return `${noLemari}${rakNumber}${posisi}`;
  };

  const handleTrackSample = async () => {
    if (!productData) return;

    const lampCode = buildLampCodeFromLocation(productData.Lemari, productData.RakHanger);
    if (!lampCode) {
      setTrackMessage({
        type: 'error',
        text: 'Format lokasi tidak valid. Pastikan Lemari berisi Putih/Kuning/Biru/Merah/Hijau dan Rak/Hanger seperti 1A-8D.'
      });
      setTimeout(() => setTrackMessage(null), 5000);
      return;
    }

    try {
      setTrackLoading(true);
      setTrackMessage(null);

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

      const statusLabel = successResponse?.esp_status === 'online' ? 'Online' : 'Offline';
      setTrackMessage({
        type: 'success',
        text: `Lacak sampel aktif: ${lampCode} (${statusLabel})`
      });
    } catch (trackError: any) {
      const msg = trackError.message || '';
      if (msg.toLowerCase().includes('belum dikonfigurasi')) {
        setTrackMessage({ type: 'warning', text: msg });
      } else {
        setTrackMessage({ type: 'error', text: `Gagal melacak sampel: ${msg}` });
      }
    } finally {
      setTrackLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;

    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const nextRole = normalizeAppRole(data?.role);
        setRole(nextRole);
      } catch {
        // ignore role fetch errors
      }
    };

    void loadRole();

    const loadProductData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all data in parallel
        const [productRes, specRes, konstruksiRes, paramRes] = await Promise.all([
          fetch(`/api/users?id=${id}`),
          fetch(`/api/spesifikasi?idSampel=${id}`),
          fetch(`/api/konstruksi?idSampel=${id}`),
          fetch(`/api/parameter-fisik?idSampel=${id}`),
        ]);

        if (!productRes.ok) {
          throw new Error('Produk tidak ditemukan');
        }
        const product = await productRes.json();
        setProductData(product);

        if (specRes.ok) {
          const specs = await specRes.json();
          if (Array.isArray(specs) && specs.length > 0) {
            setSpesifikasiData(specs[0]);
          }
        }

        if (konstruksiRes.ok) {
          const konstruksi = await konstruksiRes.json();
          if (Array.isArray(konstruksi) && konstruksi.length > 0) {
            setKonstruksiData(konstruksi[0]);
          }
        }

        if (paramRes.ok) {
          const params = await paramRes.json();
          if (Array.isArray(params) && params.length > 0) {
            setParameterFisikData(params[0]);
          }
        }

      } catch (error: any) {
        console.error('Error loading data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id]);

  // Extract Drive fileId from multiple URL formats.
  const extractDriveFileId = (raw?: string | null) => {
    if (!raw) return null;
    try {
      const url = String(raw).trim();

      // Match /file/d/FILEID(/view)? pattern
      let m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/);
      if (m && m[1]) return m[1];

      // Match open?id=FILEID or ?id=FILEID
      m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return m[1];

      // If it's a drive web viewer link with /view?id=, extract id
      m = url.match(/\/view\?id=([a-zA-Z0-9_-]+)/);
      if (m && m[1]) return m[1];

      return null;
    } catch (e) {
      console.warn('extractDriveFileId failed', e);
      return null;
    }
  };

  // Resolve stored image URL to a source that <img> can load reliably.
  // For Drive links, use server-side proxy to avoid browser restrictions.
  const resolveImageUrl = (raw?: string | null) => {
    if (!raw) return null;
    const url = String(raw).trim();
    const fileId = extractDriveFileId(url);
    if (fileId) return `/api/drive-image/${fileId}`;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    return null;
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !productData) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold mb-4">
              {error || 'Data tidak ditemukan'}
            </p>
            <Link
              href="/"
              className="inline-block bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Detail Kain: {productData.Design}
            </h1>
            <p className="text-gray-600">ID Produksi: {id}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleBack}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-4 rounded"
            >
              Kembali
            </button>
            <button
              onClick={handleTrackSample}
              disabled={trackLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {trackLoading ? 'Melacak...' : 'Lacak Sampel'}
            </button>
            {canAccessRnd(role) && (
              <Link
                href={`/edit/${id}`}
                className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded"
              >
                Edit Data
              </Link>
            )}
          </div>
        </div>

        {trackMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            trackMessage.type === 'success' ? 'bg-green-100 text-green-700' :
            trackMessage.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-700'
          }`}>
            {trackMessage.text}
          </div>
        )}

        {/* Informasi Umum */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
            Informasi Umum
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Image column */}
            <div className="lg:col-span-5">
              {productData.Gambar ? (
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(true)}
                  title="Klik untuk melihat gambar dalam ukuran penuh"
                  className="group w-full text-left rounded-xl overflow-hidden border border-gray-200 shadow-sm transition hover:shadow-md cursor-zoom-in"
                >
                          {/* thumbnail container: tambahkan overlay putih di atas/bawah jika ini template kemeja */}
                  <div className="relative h-64 sm:h-72 bg-gray-100 overflow-hidden">
                          <img
                            src={resolveImageUrl(productData.Gambar) || '/images/placeholder.png'}
                            alt={productData.GambarNama || 'Gambar produk'}
                            className="h-full w-full object-cover transform scale-105 transition-transform duration-300 group-hover:scale-110"
                            style={/kemeja/i.test(String(productData.Design || '')) ? { clipPath: 'inset(19% 0)' } : undefined}
                          />
                          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
                              Lihat Gambar
                            </span>
                          </div>
                        </div>
                </button>
              ) : (
                <div className="h-64 sm:h-72 flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                  Tidak ada gambar
                </div>
              )}
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 content-start">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Design</label>
                <p className="text-xl font-bold text-gray-900">{productData.Design || 'Belum diisi'}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Stok Sampel</label>
                <p className="text-base font-semibold text-gray-900">{productData.StokSampel ?? 0}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Tanggal Produksi</label>
                <p className={`text-base font-semibold ${productData.TanggalProduksi ? 'text-gray-900' : 'text-gray-400'}`}>
                  {productData.TanggalProduksi ? formatDateWib(productData.TanggalProduksi) : 'Belum diisi'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Lemari</label>
                <p className={`text-base font-semibold ${productData.Lemari ? 'text-gray-900' : 'text-gray-400'}`}>
                  {productData.Lemari || 'Belum diisi'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Rak/Hanger</label>
                <p className={`text-base font-semibold ${productData.RakHanger ? 'text-gray-900' : 'text-gray-400'}`}>
                  {productData.RakHanger || 'Belum diisi'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Brand Name/Note</label>
                <p className={`text-base font-semibold ${productData.BrandNameNote ? 'text-gray-900' : 'text-gray-400'}`}>
                  {productData.BrandNameNote || 'Belum diisi'}
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Keterangan</label>
                <p className={`text-base font-semibold whitespace-pre-wrap break-words ${productData.Keterangan ? 'text-gray-900' : 'text-gray-400'}`}>
                  {productData.Keterangan || 'Belum diisi'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Spesifikasi Benang */}
        {spesifikasiData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              Spesifikasi Benang & Komposisi
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benang Lusi</label>
                <p className="text-gray-900">{spesifikasiData.BenangLusi || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benang Pakan</label>
                <p className="text-gray-900">{spesifikasiData.BenangPakan || '-'}</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-3 text-gray-700">Komposisi Material (%)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Polyester</label>
                <p className="text-2xl font-bold text-blue-700">{spesifikasiData.Poly || 0}%</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Cotton/Dope</label>
                <p className="text-2xl font-bold text-green-700">{spesifikasiData.CD || 0}%</p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Rayon</label>
                <p className="text-2xl font-bold text-purple-700">{spesifikasiData.Ray || 0}%</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nylon</label>
                <p className="text-2xl font-bold text-yellow-700">{spesifikasiData.Nyl || 0}%</p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">PU</label>
                <p className="text-2xl font-bold text-red-700">{spesifikasiData.PU || 0}%</p>
              </div>
              <div className="bg-pink-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Ros</label>
                <p className="text-xl font-bold text-pink-700">{spesifikasiData.Ros || 0}%</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tac</label>
                <p className="text-xl font-bold text-indigo-700">{spesifikasiData.Tac || 0}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <label className="block text-xs font-medium text-gray-600 mb-1">Dope</label>
                <p className="text-xl font-bold text-gray-700">{spesifikasiData.Dope || 0}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Konstruksi Tenun */}
        {konstruksiData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              Konstruksi Tenun
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weave Construction
                </label>
                <p className="text-2xl font-bold text-blue-900">
                  {konstruksiData.WeaveConstr || '-'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Density Warp
                </label>
                <p className="text-2xl font-bold text-green-900">
                  {konstruksiData.DensityWarp || '-'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Density Weft
                </label>
                <p className="text-2xl font-bold text-purple-900">
                  {konstruksiData.DensityWeft || '-'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Sisir
                </label>
                <p className="text-2xl font-bold text-amber-900">
                  {konstruksiData.NomorSisir || '-'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lebar Sisir
                </label>
                <p className="text-2xl font-bold text-cyan-900">
                  {konstruksiData.LebarSisir || '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Parameter Fisik */}
        {parameterFisikData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              Parameter Fisik
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="border border-gray-200 p-3 rounded bg-blue-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Width (Cm)</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.WidthCm || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-cyan-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Lebar Actual</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.LebarAct || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-teal-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Berat Bulatan</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.BeratBulatan || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-yellow-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Gr/Sqm</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.GrSqm || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-amber-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Gr/L Yd</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.GrLYd || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-orange-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Gr/L Mtr</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.GrLMtr || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-red-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Gr/SqYd</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.GrSqYd || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-pink-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Oz/L Yd</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.OzLYd || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-fuchsia-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Oz/SqYd</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.OzSqYd || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-violet-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">L Yd 58 Inch</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.LYd58Inch || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-indigo-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Corak 6 Angka</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.Corak6Angka || '-'}
                </p>
              </div>
              <div className="border border-gray-200 p-3 rounded bg-purple-50">
                <label className="block text-xs font-medium text-gray-600 mb-1">Warna</label>
                <p className="text-lg font-semibold text-gray-900">
                  {parameterFisikData.Warna || '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Missing Data Indicator */}
        {(!spesifikasiData && !konstruksiData && !parameterFisikData) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-700">
              Data spesifikasi, konstruksi, dan parameter fisik belum tersedia
            </p>
            {canAccessRnd(role) && (
              <Link
                href={`/edit/${id}`}
                className="inline-block mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Lengkapi Data
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Image Modal untuk zoom dan pan */}
      {productData?.Gambar && (
        <ImageModal
          isOpen={isImageModalOpen}
          src={resolveImageUrl(productData.Gambar) || '/images/placeholder.png'}
          alt={productData.GambarNama || 'Gambar produk'}
          onClose={() => setIsImageModalOpen(false)}
          hideBands={/kemeja/i.test(String(productData.Design || ''))}
        />
      )}
    </div>
  );
}
