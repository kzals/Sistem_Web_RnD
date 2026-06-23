'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type AppRole, normalizeAppRole, canAccessRequester } from '@/lib/auth';

interface SearchResult {
  IdProduksi?: number;
  IdSampel: number;
  Design: string;
  Gambar?: string;
  GambarNama?: string;
  Lemari?: string;
  RakHanger?: string;
  BrandNameNote?: string;
  BenangLusi?: string;
  BenangPakan?: string;
  WeaveConstr?: string;
  Poly?: number;
  CD?: number;
  Ray?: number;
  DensityWarp?: number;
  DensityWeft?: number;
  GrSqm?: number;
  matchScore: number;
  matchPercentage: number;
}

interface SearchResponse {
  success: boolean;
  query?: string;
  detectedUseCase?: string | null;
  detectedProperties?: string[];
  results?: SearchResult[];
  resultCount?: number;
  confidence?: string;
  configVersion?: string;
  message?: string;
  error?: string;
}

export default function SearchClient() {

  const router = useRouter();
  const searchParams = useSearchParams();
  const LOCAL_STORAGE_KEY = 'selectedFabricSearchItems';
  const MIX_MATCH_STORAGE_KEY = 'selectedMixMatchItems';

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  // Multiple select state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    const savedSelectedIds = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (savedSelectedIds) {
      try {
        const parsedSelectedIds = JSON.parse(savedSelectedIds);
        if (Array.isArray(parsedSelectedIds)) {
          setSelectedIds(parsedSelectedIds.filter((value): value is number => typeof value === 'number'));
        }
      } catch (error) {}
    }
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  // Multiple select handlers
  const handleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAllVisible = (checked: boolean) => {
    if (!visibleResults.length) return;

    const visibleIds = visibleResults.map((result) => result.IdSampel);

    if (checked) {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    }
  };

  const handleClearSelected = () => setSelectedIds([]);

  const handleAmbil = () => {
    if (!searchResult?.results) {
      alert('Tidak ada hasil pencarian');
      return;
    }

    const payload = searchResult.results
      .filter((item) => selectedIds.includes(item.IdSampel))
      .map((item) => ({
        IdSampel: item.IdSampel,
        Design: item.Design,
        Lemari: undefined,
        RakHanger: undefined,
      }));

    if (payload.length === 0) {
      alert('Pilih minimal 1 sampel untuk diambil');
      return;
    }

    sessionStorage.setItem('selectedSampelItems', JSON.stringify(payload));
    router.push('/form-pengambilan');
  };

  const handleMixMatch = () => {
    if (!searchResult?.results) {
      alert('Tidak ada hasil pencarian');
      return;
    }

    const payload = searchResult.results
      .filter((item) => selectedIds.includes(item.IdSampel))
      .slice(0, 5)
      .map((item) => ({
        IdSampel: item.IdSampel,
        Design: item.Design,
        Gambar: item.Gambar,
        GambarNama: item.GambarNama,
        Lemari: item.Lemari,
        RakHanger: item.RakHanger,
        BrandNameNote: item.BrandNameNote,
      }));

    if (payload.length === 0) {
      alert('Pilih minimal 1 sampel untuk mix and match');
      return;
    }

    if (selectedIds.length > 5) {
      alert('Mix and Match hanya memakai 5 kain pertama yang dipilih');
    }

    sessionStorage.setItem(MIX_MATCH_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(MIX_MATCH_STORAGE_KEY, JSON.stringify(payload));
    router.push(`/mix-match?from=search&q=${encodeURIComponent(query.trim())}`);
  };

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const nextRole = normalizeAppRole(data?.role);
        setRole(nextRole);
      })
      .catch(() => setRole(null));
  }, []);

  useEffect(() => {

    const queryFromUrl = searchParams.get('q');
    const savedQuery = sessionStorage.getItem('lastSearchQuery');
    const savedResult = sessionStorage.getItem('lastSearchResult');

    if (queryFromUrl) {
      setQuery(queryFromUrl);
    } else if (savedQuery) {
      setQuery(savedQuery);
    }

    if (savedResult) {
      try {
        const result = JSON.parse(savedResult);
        setSearchResult(result);
      } catch (e) {}
    }

  }, [searchParams]);

  const handleSearch = async () => {

    if (!query.trim()) {
      alert('Masukkan deskripsi kain yang dicari');
      return;
    }

    setIsLoading(true);
    setSearchResult(null);
    setSelectedIds([]);
    setCurrentPage(1);

    try {

      const response = await fetch('/api/fabric-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });

      const data: SearchResponse = await response.json();
      setSearchResult(data);

      sessionStorage.setItem('lastSearchQuery', query.trim());
      sessionStorage.setItem('lastSearchResult', JSON.stringify(data));

    } catch (error: any) {

      setSearchResult({
        success: false,
        error: 'Gagal menghubungi server: ' + error.message
      });

    } finally {
      setIsLoading(false);
    }

  };

  const handleResetSearch = () => {
    setQuery('');
    setSearchResult(null);
    setSelectedIds([]);
    setCurrentPage(1);
    sessionStorage.removeItem('lastSearchQuery');
    sessionStorage.removeItem('lastSearchResult');
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    router.replace('/search');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const getConfidenceBadgeColor = (confidence?: string) => {
    switch (confidence) {
      case 'Tinggi': return 'bg-green-100 text-green-800';
      case 'Sedang': return 'bg-yellow-100 text-yellow-800';
      case 'Rendah': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMatchScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 font-semibold';
    if (percentage >= 60) return 'text-yellow-600 font-semibold';
    return 'text-orange-600 font-semibold';
  };

  const getImageSrc = (imageUrl?: string | null) => {
    const value = String(imageUrl || '').trim();
    if (!value) return '';

    const proxyMatch = value.match(/\/api\/drive-image\/([a-zA-Z0-9_-]+)/);
    if (proxyMatch?.[1]) {
      return `/api/drive-image/${encodeURIComponent(proxyMatch[1])}`;
    }

    const driveMatch = value.match(/(?:drive\.google\.com\/(?:uc\?export=view&)?id=|drive\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/);
    if (driveMatch?.[1]) {
      return `/api/drive-image/${encodeURIComponent(driveMatch[1])}`;
    }

    return value;
  };

  const totalResults = searchResult?.resultCount ?? searchResult?.results?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleResults = searchResult?.results?.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize) ?? [];
  const allVisibleSelected = visibleResults.length > 0 && visibleResults.every((result) => selectedIds.includes(result.IdSampel));
  const visibleSelectedCount = visibleResults.filter((result) => selectedIds.includes(result.IdSampel)).length;

  const handlePrevPage = () => {
    if (safeCurrentPage <= 1) return;
    setCurrentPage(safeCurrentPage - 1);
  };

  const handleNextPage = () => {
    if (safeCurrentPage >= totalPages) return;
    setCurrentPage(safeCurrentPage + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mt-1 text-3xl font-bold text-slate-900 sm:text-4xl">Pencarian Kain Cerdas</h1>
                <p className="mt-1 text-sm text-slate-600 sm:text-base">Cari kain berdasarkan kebutuhan Anda dalam satu tampilan yang rapi.</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 sm:p-6">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Kolom Pencarian
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:text-base"
                rows={3}
                disabled={isLoading}
              />

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs sm:text-sm text-slate-500">Gunakan deskripsi, komposisi, atau karakter kain yang ingin dicari.</div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <button
                    onClick={handleResetSearch}
                    disabled={isLoading || (!query.trim() && !searchResult)}
                    className="flex-1 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:flex-none"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={isLoading || !query.trim()}
                    className="flex-1 rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:flex-none"
                  >
                    {isLoading ? 'Mencari...' : 'Cari Kain'}
                  </button>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResult && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
            {/* Result Header */}
            {searchResult.success && searchResult.results && (
              <div className="mb-4 sm:mb-6 border-b border-slate-200 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3">
                  <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                    {searchResult.message}
                  </h2>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${getConfidenceBadgeColor(searchResult.confidence)}`}>
                    Confidence: {searchResult.confidence}
                  </span>
                </div>
              </div>
            )}
            {!searchResult.success && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p className="font-medium">Error</p>
                <p>{searchResult.error}</p>
              </div>
            )}

            {/* Results List + Multiple Select */}
            {searchResult.success && searchResult.results && searchResult.results.length > 0 && (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 sm:text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      checked={allVisibleSelected}
                      onChange={(e) => handleSelectAllVisible(e.target.checked)}
                    />
                    Pilih halaman ini
                  </label>
                  <button
                    type="button"
                    onClick={handleClearSelected}
                    className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-800 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                    disabled={selectedIds.length === 0}
                  >
                    Clear
                  </button>
                  <span className="text-xs text-slate-600 sm:ml-auto sm:text-sm">
                    Menampilkan {visibleResults.length} dari {totalResults} hasil
                  </span>
                  <span className="text-xs text-slate-600 sm:text-sm">
                    {selectedIds.length} dipilih{visibleSelectedCount > 0 ? `, ${visibleSelectedCount} di halaman ini` : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {visibleResults.map((result) => (
                    <div
                      key={result.IdSampel}
                      onClick={() => handleSelect(result.IdSampel)}
                      className={`cursor-pointer rounded-2xl border p-3 transition-shadow hover:shadow-md sm:p-4 ${
                        selectedIds.includes(result.IdSampel) ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex gap-3 sm:gap-4">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 pt-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedIds.includes(result.IdSampel)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => handleSelect(result.IdSampel)}
                          />
                        </div>

                        {/* Image Preview */}
                        <div className="flex-shrink-0">
                          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 sm:h-28 sm:w-28">
                            {result.Gambar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getImageSrc(result.Gambar)}
                                alt={result.GambarNama || result.Design}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                  const fallback = event.currentTarget.parentElement?.querySelector('[data-image-fallback]');
                                  if (fallback instanceof HTMLElement) fallback.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div data-image-fallback className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                                No Image Found
                              </div>
                            )}
                            {result.Gambar && (
                              <div data-image-fallback className="hidden px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
                                No Image Found
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-2 break-words text-base font-semibold text-slate-900 sm:text-lg">
                            {result.Design}
                          </h3>
                          <div className="mb-3 text-xs font-medium text-slate-500 sm:text-sm">
                            ID Produksi: <span className="font-semibold text-slate-900">{result.IdProduksi ?? '-'}</span>
                          </div>
                          
                          {/* Properties Grid - responsive */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs sm:text-sm mb-3">
                            <div className="min-w-0">
                              <span className="block text-slate-600">Benang Lusi:</span>
                              <span className="break-words font-medium text-slate-900">
                                {result.BenangLusi || '-'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="block text-slate-600">Benang Pakan:</span>
                              <span className="break-words font-medium text-slate-900">
                                {result.BenangPakan || '-'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="block text-slate-600">Konstr. Tenun:</span>
                              <span className="break-words font-medium text-slate-900">
                                {result.WeaveConstr || '-'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="block text-slate-600">Gr/Sqm:</span>
                              <span className="font-medium text-slate-900">
                                {result.GrSqm || '-'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Composition Badges */}
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                            {result.Poly !== undefined && result.Poly > 0 && (
                              <span className="whitespace-nowrap rounded bg-sky-100 px-2 py-1 text-sky-800">
                                Poly: {result.Poly}%
                              </span>
                            )}
                            {result.CD !== undefined && result.CD > 0 && (
                              <span className="whitespace-nowrap rounded bg-emerald-100 px-2 py-1 text-emerald-800">
                                C/D: {result.CD}%
                              </span>
                            )}
                            {result.Ray !== undefined && result.Ray > 0 && (
                              <span className="whitespace-nowrap rounded bg-cyan-100 px-2 py-1 text-cyan-800">
                                Ray: {result.Ray}%
                              </span>
                            )}
                            {result.DensityWarp && result.DensityWeft && (
                              <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-1 text-slate-800">
                                D: {result.DensityWarp}×{result.DensityWeft}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Match Score & Action - Right side */}
                        <div className="flex-shrink-0 flex flex-col items-end gap-2 pt-1">
                          <div className="text-right">
                            <div className="text-xs text-gray-600">Match</div>
                            <div className={`text-xl sm:text-2xl font-bold ${getMatchScoreColor(result.matchPercentage)}`}>
                              {result.matchPercentage.toFixed(0)}%
                            </div>
                          </div>
                          <Link
                            href={`/detail/${result.IdSampel}?from=search&q=${encodeURIComponent(query)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                          >
                            Detail
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-600 sm:text-sm">
                    Halaman {safeCurrentPage} dari {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={safeCurrentPage <= 1}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50 sm:text-sm"
                    >
                      <span aria-hidden="true">◀</span>
                      <span>Sebelumnya</span>
                    </button>
                    <button
                      onClick={handleNextPage}
                      disabled={safeCurrentPage >= totalPages}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50 sm:text-sm"
                    >
                      <span>Berikutnya</span>
                      <span aria-hidden="true">▶</span>
                    </button>
                  </div>
                </div>
                
                {/* Selected IDs Display */}
                {selectedIds.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 sm:mt-6 sm:p-4 sm:text-sm">
                    <span className="font-semibold">ID kain:</span> {selectedIds.join(', ')}
                  </div>
                )}
              </>
            )}

            {/* No Results */}
            {searchResult.success && searchResult.results && searchResult.results.length === 0 && (
              <div className="py-8 text-center sm:py-12">
                <p className="mb-2 text-base text-slate-500 sm:text-lg">Tidak ada kain yang ditemukan</p>
                <p className="text-xs text-slate-400 sm:text-sm">Coba ubah deskripsi pencarian Anda</p>
              </div>
            )}
              </div>
            )}
          </div>
        </div>

        {role === 'requester' && selectedIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-orange-300 shadow-lg px-3 sm:px-4 py-3 sm:py-4">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <span className="text-sm sm:text-base font-medium text-gray-700">
                <span className="text-orange-600 font-bold text-base sm:text-lg">{selectedIds.length}</span> sampel
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleClearSelected}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                >
                  Batal
                </button>
                <button
                  onClick={handleMixMatch}
                  className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  Mix & Match ({selectedIds.length})
                </button>
                <button
                  onClick={handleAmbil}
                  className="px-4 sm:px-6 py-2 text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors whitespace-nowrap"
                >
                  Ambil ({selectedIds.length})
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}