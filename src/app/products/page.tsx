'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProductRecord } from '@/types/user';
import { type AppRole, normalizeAppRole, canAccessRequester, canAccessRnd } from '@/lib/auth';

interface PaginationInfo {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const LEMARI_OPTIONS = ['Putih', 'Jingga', 'Biru', 'Merah', 'Hijau'];
const RAK_HANGER_OPTIONS = Array.from({ length: 8 }, (_, index) => {
  const row = index + 1;
  return ['A', 'B', 'C', 'D'].map((column) => `${row}${column}`);
}).flat();

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [role, setRole] = useState<AppRole | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    totalRecords: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterLemari, setFilterLemari] = useState<string[]>([]);
  const [filterRakHanger, setFilterRakHanger] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lemariDropdownOpen, setLemariDropdownOpen] = useState(false);
  const [rakHangerDropdownOpen, setRakHangerDropdownOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const LOCAL_STORAGE_KEY = 'selectedProductsItemsRndPage';

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const nextRole = normalizeAppRole(data?.role);
        setRole(nextRole);
      })
      .catch(() => setRole(null));

    const savedSelection = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSelection) {
      try {
        setSelectedIds(JSON.parse(savedSelection));
      } catch {
        // ignore invalid storage
      }
    }

    fetchProducts(1);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setLemariDropdownOpen(false);
        setRakHangerDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
  };

  const getProductId = (product: ProductRecord): number => Number(product.IdProduksi ?? product.IdSampel ?? 0);

  const fetchProducts = async (
    page: number = 1,
    options?: { searchText?: string; lemariValues?: string[]; rakHangerValues?: string[]; clearSelection?: boolean }
  ) => {
    try {
      setLoading(true);
      const nextSearchText = options?.searchText ?? searchText;
      const nextLemariValues = options?.lemariValues ?? filterLemari;
      const nextRakHangerValues = options?.rakHangerValues ?? filterRakHanger;
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
      });
      if (nextSearchText) params.append('search', nextSearchText);
      if (nextLemariValues.length > 0) params.append('lemari', nextLemariValues.join(','));
      if (nextRakHangerValues.length > 0) params.append('rakHanger', nextRakHangerValues.join(','));

      const response = await fetch(`/api/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
        setPagination(data.pagination);
        if (options?.clearSelection === true) {
          setSelectedIds([]);
        }
      }
    } catch (error: any) {
      showMessage('error', 'Gagal mengambil data produk: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLemariDropdownOpen(false);
    setRakHangerDropdownOpen(false);
    fetchProducts(1);
  };

  const toggleChip = (value: string, currentValues: string[], setValues: (next: string[]) => void) => {
    setValues(currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value]);
  };

  const clearChipFilters = () => {
    setFilterLemari([]);
    setFilterRakHanger([]);
    setLemariDropdownOpen(false);
    setRakHangerDropdownOpen(false);
    fetchProducts(1, { searchText, lemariValues: [], rakHangerValues: [] });
  };

  const handlePrevPage = () => {
    if (!pagination.hasPrevPage || loading) return;
    fetchProducts(pagination.page - 1);
  };

  const handleNextPage = () => {
    if (!pagination.hasNextPage || loading) return;
    fetchProducts(pagination.page + 1);
  };

  const handleDelete = async (idSampel: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/users?id=${idSampel}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('success', 'Data berhasil dihapus');
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        fetchProducts(pagination.page);
      } else {
        const data = await response.json();
        showMessage('error', data.error);
      }
    } catch (error: any) {
      showMessage('error', 'Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: ProductRecord) => {
    const productId = getProductId(product);
    if (productId) {
      router.push(`/detail/${productId}?from=products`);
    }
  };

  const handleSelectChange = (idSampel: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedIds((prev) => (prev.includes(idSampel) ? prev : [...prev, idSampel]));
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== idSampel));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedIds(products.map((p) => getProductId(p)).filter((id) => id !== 0));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (!canAccessRnd(role)) {
      showMessage('error', 'Aksi hapus hanya untuk R&D');
      return;
    }

    if (selectedIds.length === 0) {
      showMessage('error', 'Pilih minimal 1 data untuk dihapus');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data?`)) {
      return;
    }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;

      for (const idSampel of selectedIds) {
        try {
          const response = await fetch(`/api/users?id=${idSampel}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        showMessage('success', `${successCount} data berhasil dihapus${failCount > 0 ? `, ${failCount} gagal` : ''}`);
        setSelectedIds([]);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        fetchProducts(pagination.page);
      } else {
        showMessage('error', 'Gagal menghapus semua data');
      }
    } catch (error: any) {
      showMessage('error', 'Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAmbil = () => {
    const payload = products
      .filter((item) => selectedIds.includes(getProductId(item)))
      .map((item) => ({
        IdSampel: getProductId(item),
        Design: item.Design,
        Lemari: item.Lemari,
        RakHanger: item.RakHanger,
      }));

    if (payload.length === 0) {
      showMessage('error', 'Pilih minimal 1 sampel untuk diambil');
      return;
    }

    sessionStorage.setItem('selectedSampelItems', JSON.stringify(payload));
    router.push('/form-pengambilan');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Data Produk</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Kelola data produksi untuk melihat detail, memperbarui informasi, dan menghapus data yang tidak diperlukan
                </p>
              </div>
              <div>
                {canAccessRnd(role) && (
                  <button
                    onClick={() => router.push('/input')}
                    className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                  >
                    Tambah Produk
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 px-6 py-5 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Data</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{pagination.totalRecords}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Halaman</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {pagination.page} / {pagination.totalPages || 1}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">DiPilih</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{selectedIds.length}</div>
            </div>
          </div>

          {message && (
            <div
              className={`border-t border-slate-100 px-6 py-4 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="border-t border-slate-100 px-6 py-6">
            <div className="mb-4" ref={filterPanelRef}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px] flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Cari Design atau Nama Brand"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div className="w-full md:w-[220px] md:flex-none">
                  <div className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Lemari</label>
                    <button
                      type="button"
                      onClick={() => setLemariDropdownOpen(!lemariDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span className="text-slate-600">
                        {filterLemari.length > 0 ? `Dipilih: ${filterLemari.length}` : 'Pilih Lemari'}
                      </span>
                      <span className={`transition-transform ${lemariDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {lemariDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                        {(filterLemari.length > 0 || filterRakHanger.length > 0) && (
                          <button
                            type="button"
                            onClick={clearChipFilters}
                            className="mb-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Reset Filter
                          </button>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {LEMARI_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleChip(option, filterLemari, setFilterLemari)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                filterLemari.includes(option)
                                  ? 'border-sky-600 bg-sky-600 text-white'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-[260px] md:flex-none">
                  <div className="relative">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Rak Hanger</label>
                    <button
                      type="button"
                      onClick={() => setRakHangerDropdownOpen(!rakHangerDropdownOpen)}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <span className="text-slate-600">
                        {filterRakHanger.length > 0 ? `Dipilih: ${filterRakHanger.length}` : 'Pilih Rak Hanger'}
                      </span>
                      <span className={`transition-transform ${rakHangerDropdownOpen ? 'rotate-180' : ''}`}>▼</span>
                    </button>

                    {rakHangerDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                        {(filterLemari.length > 0 || filterRakHanger.length > 0) && (
                          <button
                            type="button"
                            onClick={clearChipFilters}
                            className="mb-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          >
                            Reset Filter
                          </button>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {RAK_HANGER_OPTIONS.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleChip(option, filterRakHanger, setFilterRakHanger)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                filterRakHanger.includes(option)
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-auto flex flex-wrap justify-end gap-2 md:justify-start">
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="rounded-full bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                  {canAccessRnd(role) && selectedIds.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={loading}
                      className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-3 text-sm text-slate-600">Menampilkan {products.length} dari {pagination.totalRecords} produk</div>

            <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr>
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === products.filter((p) => p.IdSampel).length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">ID Produksi</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Design</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Stok Sampel</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Lemari</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Rak Hanger</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Brand/Note</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                        Tidak ada produk
                      </td>
                    </tr>
                  )}
                  {products.map((product) => {
                    const productId = getProductId(product);
                    return (
                      <tr
                        key={productId}
                        onClick={() => handleSelectChange(productId, !selectedIds.includes(productId))}
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(productId)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectChange(productId, e.target.checked);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{product.IdProduksi ?? product.IdSampel}</td>
                        <td className="px-4 py-3 text-slate-700">{product.Design}</td>
                        <td className="px-4 py-3 text-slate-700">{product.StokSampel ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{product.Lemari || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{product.RakHanger || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{product.BrandNameNote || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(product);
                              }}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                canAccessRnd(role)
                                  ? 'bg-sky-600 text-white hover:bg-sky-700'
                                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                              }`}
                            >
                              {canAccessRnd(role) ? 'Edit' : 'Detail'}
                            </button>
                            {canAccessRnd(role) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(productId);
                                }}
                                className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={!pagination.hasPrevPage || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                >
                  <span aria-hidden="true">◀</span>
                  <span>Sebelumnya</span>
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasNextPage || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                >
                  <span>Berikutnya</span>
                  <span aria-hidden="true">▶</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {canAccessRnd(role) && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-rose-200 bg-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              <span className="font-bold text-rose-600">{selectedIds.length}</span> sampel dipilih
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                Hapus ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {!canAccessRnd(role) && canAccessRequester(role) && selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-sky-200 bg-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              <span className="font-bold text-sky-600">{selectedIds.length}</span> sampel dipilih
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds([])}
                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
              >
                Batal
              </button>
              <button
                onClick={handleAmbil}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
              >
                Ambil ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
