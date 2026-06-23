'use client';

import { useEffect, useState } from 'react';
import { formatDateWib } from '@/lib/datetime';

interface SampleLoan {
  ID_Loan: number;
  ID_Sampel: number;
  Design: string;
  Customer_Name: string;
  Loan_Date: string;
  Return_Date: string | null;
  Status: string;
  Notes: string;
  Durasi_Hari: number;
}

export default function SampleManagementPage() {
  const [loans, setLoans] = useState<SampleLoan[]>([]);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([]);
  const [totalAvailableSamples, setTotalAvailableSamples] = useState(0);
  const [totalBorrowedSamples, setTotalBorrowedSamples] = useState(0);
  const [totalReturnedSamples, setTotalReturnedSamples] = useState(0);
  const [totalPermanentExitSamples, setTotalPermanentExitSamples] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 10;
  const LOCAL_STORAGE_KEY = 'selectedRiwayatItemsPage';
  const STATUS_OPTIONS = ['Dipinjam', 'Keluar', 'Dikembalikan'];

  useEffect(() => {
    const savedSelection = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSelection) {
      try {
        setSelectedHistoryIds(JSON.parse(savedSelection));
      } catch {
        // ignore invalid storage
      }
    }

    fetchSummaryStats();
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedHistoryIds));
  }, [selectedHistoryIds]);

  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchLoanHistory(historyPage);
  }, [historyPage]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
  };

  const toggleChip = (value: string, currentValues: string[], setValues: (next: string[]) => void) => {
    setValues(currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value]);
  };

  const fetchSummaryStats = async () => {
    try {
      const [stockResponse, loanCountResponse] = await Promise.all([fetch('/api/samples-count'), fetch('/api/sample-loan-count')]);

      if (stockResponse.ok) {
        const stockData = await stockResponse.json();
        setTotalAvailableSamples(stockData.totalStokTersedia ?? stockData.totalSampel ?? 0);
      } else {
        setTotalAvailableSamples(0);
      }

      if (loanCountResponse.ok) {
        const loanCountData = await loanCountResponse.json();
        setTotalBorrowedSamples(loanCountData.totalDipinjam ?? 0);
        setTotalReturnedSamples(loanCountData.totalDikembalikan ?? 0);
        setTotalPermanentExitSamples(loanCountData.totalKeluar ?? 0);
      } else {
        setTotalBorrowedSamples(0);
        setTotalReturnedSamples(0);
        setTotalPermanentExitSamples(0);
      }
    } catch (error) {
      console.error('Gagal mengambil ringkasan sampel:', error);
      setTotalAvailableSamples(0);
      setTotalBorrowedSamples(0);
      setTotalReturnedSamples(0);
      setTotalPermanentExitSamples(0);
    }
  };

  const fetchLoanHistory = async (page = 1) => {
    try {
      setLoading(true);
      const limit = historyPageSize;
      const offset = (page - 1) * limit;
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (searchQuery) params.set('search', searchQuery);
      if (filterStatus.length > 0) params.set('status', filterStatus[0]);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const response = await fetch(`/api/sample-loan?${params.toString()}`, { cache: 'no-store' });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        showMessage('error', 'Gagal mengambil data: ' + (errorData.error || 'Unknown error'));
        setLoans([]);
        setTotalCount(0);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.items)) {
        setLoans(data.items);
        setTotalCount(Number(data.total || 0));
        setHistoryPage(page);
      } else {
        showMessage('error', 'Format data tidak sesuai');
        setLoans([]);
        setTotalCount(0);
        setHistoryPage(1);
      }
    } catch (error: any) {
      showMessage('error', 'Gagal mengambil data: ' + error.message);
      setLoans([]);
      setTotalCount(0);
      setHistoryPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSample = async (loanId: number) => {
    if (!confirm('Tandai sampel ini sebagai dikembalikan?')) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sample-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIds: [loanId], status: 'Dikembalikan' }),
      });

      if (response.ok) {
        showMessage('success', 'Sampel berhasil dicatat sebagai dikembalikan');
        fetchLoanHistory(historyPage);
      } else {
        const error = await response.json();
        showMessage('error', error.error);
      }
    } catch (error: any) {
      showMessage('error', 'Gagal update: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleHistorySelect = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedHistoryIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    } else {
      setSelectedHistoryIds((prev) => prev.filter((value) => value !== id));
    }
  };

  const toggleSelectAllHistory = (checked: boolean) => {
    const visibleIds = visibleLoans.map((loan) => loan.ID_Loan).filter((id) => id > 0);
    if (checked) {
      setSelectedHistoryIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }
    setSelectedHistoryIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  const handleDeleteSelectedHistory = async () => {
    if (selectedHistoryIds.length === 0) {
      showMessage('error', 'Pilih minimal 1 riwayat untuk dihapus');
      return;
    }

    const confirmed = window.confirm(`Hapus ${selectedHistoryIds.length} riwayat pengambilan terpilih?`);
    if (!confirmed) return;

    try {
      setDeletingHistory(true);
      const response = await fetch('/api/sample-loan', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIds: selectedHistoryIds }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus riwayat');
      }

      showMessage('success', data.message || 'Riwayat berhasil dihapus');
      setSelectedHistoryIds([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      fetchLoanHistory(historyPage);
    } catch (error: any) {
      showMessage('error', 'Gagal menghapus: ' + error.message);
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleReturnSelectedHistory = async () => {
    if (selectedHistoryIds.length === 0) {
      showMessage('error', 'Pilih minimal 1 riwayat untuk dikembalikan');
      return;
    }

    const confirmed = window.confirm(`Kembalikan ${selectedHistoryIds.length} riwayat pengeluaran terpilih?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch('/api/sample-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIds: selectedHistoryIds, status: 'Dikembalikan' }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengembalikan riwayat');
      }

      const data = await response.json();
      showMessage('success', `${data.updated || selectedHistoryIds.length} data berhasil dikembalikan`);
      setSelectedHistoryIds([]);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      fetchLoanHistory(historyPage);
    } catch (error: any) {
      showMessage('error', 'Gagal mengembalikan: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const historyTotalPages = Math.max(1, Math.ceil(totalCount / historyPageSize));
  const visibleLoans = loans;
  const allHistorySelected = visibleLoans.length > 0 && visibleLoans.every((loan) => selectedHistoryIds.includes(loan.ID_Loan));

  return (
    <div className="py-8 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="space-y-8 bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-6 py-8 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">Manajemen Sampel Kain</span>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Manajemen Sampel Kain</h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">Kelola pengambilan, pengembalian, dan riwayat sampel kain dalam satu tampilan yang rapi.</p>
              </div>
            </div>

            {message && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Sampel Tersedia</div>
                <div className="mt-2 text-3xl font-black text-sky-700">{totalAvailableSamples}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Sedang Dipinjam</div>
                <div className="mt-2 text-3xl font-black text-orange-600">{totalBorrowedSamples}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Sudah Dikembalikan</div>
                <div className="mt-2 text-3xl font-black text-emerald-700">{totalReturnedSamples}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Keluar</div>
                <div className="mt-2 text-3xl font-black text-violet-700">{totalPermanentExitSamples}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-slate-950">Riwayat Pengeluaran Sampel Kain</h2>

              <div className="mb-6 space-y-2">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3 lg:justify-start">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-3">
                    <div className="flex flex-col text-sm">
                      <label className="mb-1 font-medium text-slate-600">Cari</label>
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Design / Customer..." className="rounded-lg border border-slate-300 px-3 py-2" />
                    </div>
                    <div className="flex flex-col text-sm">
                      <label className="mb-1 font-medium text-slate-600">Dari Tanggal</label>
                      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
                    </div>
                    <div className="flex flex-col text-sm">
                      <label className="mb-1 font-medium text-slate-600">Sampai</label>
                      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
                    </div>
                    <div className="flex flex-col text-sm lg:min-w-[280px]">
                      <label className="mb-1 font-medium text-slate-600">Status</label>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleChip(option, filterStatus, setFilterStatus)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                              filterStatus.includes(option)
                                ? option === 'Dikembalikan'
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : option === 'Keluar'
                                    ? 'border-violet-600 bg-violet-600 text-white'
                                    : 'border-orange-600 bg-orange-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:gap-2 lg:shrink-0">
                    <button onClick={() => fetchLoanHistory(historyPage)} className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700">Refresh</button>
                    <button onClick={handleReturnSelectedHistory} disabled={loading || selectedHistoryIds.length === 0} className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">Return</button>
                    <button onClick={handleDeleteSelectedHistory} disabled={deletingHistory || selectedHistoryIds.length === 0} className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60">{deletingHistory ? 'Menghapus...' : 'Hapus'}</button>
                  </div>
                </div>

                {selectedHistoryIds.length > 0 && (
                  <div className="text-sm font-medium text-slate-700">
                    Telah memilih <span className="font-bold text-sky-600">{selectedHistoryIds.length}</span> sampel.
                  </div>
                )}
              </div>

              <div className="max-h-[420px] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full bg-white text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr>
                      <th className="w-10 px-4 py-2 text-left"><input type="checkbox" checked={allHistorySelected} onChange={(e) => toggleSelectAllHistory(e.target.checked)} /></th>
                      <th className="px-4 py-2 text-left">Design</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Tanggal Ambil</th>
                      <th className="px-4 py-2 text-left">Durasi (Hari)</th>
                      <th className="px-4 py-2 text-left">Keterangan</th>
                      <th className="px-4 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {visibleLoans.map((loan) => (
                      <tr key={loan.ID_Loan} onClick={() => toggleHistorySelect(loan.ID_Loan, !selectedHistoryIds.includes(loan.ID_Loan))} className="cursor-pointer transition-colors odd:bg-white even:bg-slate-50 hover:bg-sky-50">
                        <td className="px-4 py-2">
                          <input type="checkbox" checked={selectedHistoryIds.includes(loan.ID_Loan)} onChange={(e) => { e.stopPropagation(); toggleHistorySelect(loan.ID_Loan, e.target.checked); }} />
                        </td>
                        <td className="px-4 py-2">{loan.Design || '-'}</td>
                        <td className="px-4 py-2">{loan.Customer_Name}</td>
                        <td className="px-4 py-2"><span className={`rounded px-2 py-1 text-xs font-semibold ${loan.Status === 'Dipinjam' ? 'bg-orange-100 text-orange-800' : loan.Status === 'Keluar' ? 'bg-violet-100 text-violet-800' : 'bg-emerald-100 text-emerald-800'}`}>{loan.Status}</span></td>
                        <td className="px-4 py-2">{formatDateWib(loan.Loan_Date)}</td>
                        <td className="px-4 py-2 text-center">{loan.Durasi_Hari}</td>
                        <td className="px-4 py-2 text-sm text-slate-700">{loan.Notes || '-'}</td>
                        <td className="px-4 py-2 text-center">
                          {loan.Status === 'Dipinjam' && <button onClick={() => handleReturnSample(loan.ID_Loan)} className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">Kembalikan</button>}
                          {loan.Status === 'Keluar' && <span className="text-xs font-semibold text-violet-600">Sudah Keluar</span>}
                          {loan.Status === 'Dikembalikan' && <span className="text-xs text-slate-600">Kembali {formatDateWib(loan.Return_Date!)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalCount === 0 && <div className="py-8 text-center text-slate-600">Tidak ada data pengambilan sampel</div>}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-600">Menampilkan {visibleLoans.length} dari {totalCount} data (Halaman {historyPage} dari {historyTotalPages})</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))} disabled={historyPage <= 1 || loading} className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"><span aria-hidden="true">◀</span><span>Sebelumnya</span></button>
                  <button type="button" onClick={() => setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))} disabled={historyPage >= historyTotalPages || loading} className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 disabled:opacity-50"><span>Berikutnya</span><span aria-hidden="true">▶</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
