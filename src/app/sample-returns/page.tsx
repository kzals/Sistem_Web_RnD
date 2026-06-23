'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDateWib } from '@/lib/datetime';

type LoanItem = {
  ID_Loan: number;
  ID_Sampel: number;
  Design: string;
  Customer_Name: string;
  Departemen: string | null;
  Loan_Date: string;
  Return_Date: string | null;
  Status: string;
  Notes: string | null;
  Durasi_Hari: number;
};

export default function SampleReturnsPage() {
  const [items, setItems] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, LoanItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sessionDept, setSessionDept] = useState<string>('');
  const LOCAL_STORAGE_KEY = 'selectedLoanItemsReturnsPage';

  useEffect(() => {
    const init = async () => {
      const dept = await fetchSessionDept();
      fetchLoans(dept || undefined);
    };

    const savedSelection = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedSelection) {
      try {
        setSelectedItems(JSON.parse(savedSelection));
      } catch {}
    }

    init();
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(selectedItems));
  }, [selectedItems]);

  const fetchSessionDept = async (): Promise<string> => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) return '';
      const data = await response.json();
      const dept = String(data?.dept || '').trim();
      if (dept) setSessionDept(dept);
      return dept;
    } catch {
      return '';
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const toggleSelect = (item: LoanItem) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.ID_Loan]) {
        delete next[item.ID_Loan];
      } else {
        next[item.ID_Loan] = item;
      }
      return next;
    });
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const next: Record<number, LoanItem> = {};
      activeLoans.forEach((item) => {
        next[item.ID_Loan] = item;
      });
      setSelectedItems(next);
    } else {
      setSelectedItems({});
    }
  };

  const handleSubmitReturn = async () => {
    const selected = Object.values(selectedItems);
    if (selected.length === 0) {
      showMessage('error', 'Pilih minimal 1 sampel untuk dikembalikan');
      return;
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);

    try {
      setSubmitting(true);
      const senderDepartemen =
        sessionDept ||
        selected.find((item) => !!String(item.Departemen || '').trim())?.Departemen ||
        'Unknown';

      const response = await fetch('/api/integration/sample-return-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleIds: selected.map((item) => item.ID_Sampel),
          loanIds: selected.map((item) => item.ID_Loan),
          count: selected.length,
          senderDepartemen,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Gagal mengirim notifikasi pengembalian ke RnD');
      }

      // Batch update loan status in a single request
      await fetch('/api/sample-loan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanIds: selected.map((it) => it.ID_Loan), status: 'Pengembalian Diajukan' }),
      });

      showMessage('success', `Pengembalian ${selected.length} sampel berhasil diajukan.`);
      setSelectedItems({});
      await fetchLoans();
    } catch (error: any) {
      showMessage('error', error.message || 'Gagal mengajukan pengembalian');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchLoans = async (deptOverride?: string) => {
    try {
      setLoading(true);
      const dept = String(deptOverride ?? sessionDept ?? '').trim();
      const query = new URLSearchParams({ limit: '100', offset: '0' });
      if (dept) {
        query.set('departemen', dept);
      }

      const response = await fetch(`/api/sample-loan?${query.toString()}`, { cache: 'no-store' });
      const raw = await response.json();
      if (!response.ok) {
        throw new Error(raw.error || 'Gagal mengambil data peminjaman');
      }
      const records = Array.isArray(raw) ? raw : (raw.items || []);
      setItems(records);
    } catch (error: any) {
      showMessage('error', error.message || 'Gagal mengambil data peminjaman');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const activeLoans = useMemo(() => {
    const filtered = items.filter((item) => {
      const status = String(item.Status || '').trim().toLowerCase();
      return !new Set(['dikembalikan', 'returned', 'selesai']).has(status);
    });

    if (!searchText.trim()) return filtered;

    const text = searchText.toLowerCase();
    return filtered.filter((item) =>
      String(item.ID_Sampel).includes(text) ||
      (item.Design || '').toLowerCase().includes(text) ||
      (item.Customer_Name || '').toLowerCase().includes(text) ||
      (item.Departemen || '').toLowerCase().includes(text)
    );
  }, [items, searchText]);

  return (
    <div className="bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 mb-3">
            Requester
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pengembalian Sampel Kain</h1>
          <p className="text-gray-600">Daftar sampel yang masih dipinjam dan siap dikembalikan.</p>
        </div>

        {message && (
          <div className={`mb-6 rounded-lg p-4 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="mb-4 flex flex-wrap items-end gap-3 justify-between">
            <div className="flex-1 min-w-[260px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari Pinjaman</label>
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Cari ID sampel, design, nama, atau departemen"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => fetchLoans()}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded bg-blue-50 p-3 text-blue-700">Memuat data peminjaman...</div>
          ) : (
            <>
              {Object.keys(selectedItems).length > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    <span className="font-bold text-lg">{Object.keys(selectedItems).length}</span> sampel dipilih
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedItems({})}
                      className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSubmitReturn}
                      disabled={submitting}
                      className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-bold rounded disabled:opacity-60"
                    >
                      {submitting ? 'Mengirim...' : 'Ajukan Pengembalian'}
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border rounded max-h-[480px] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={activeLoans.length > 0 && Object.keys(selectedItems).length === activeLoans.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">ID Loan</th>
                      <th className="px-3 py-2 text-left">ID Sampel</th>
                      <th className="px-3 py-2 text-left">Design</th>
                      <th className="px-3 py-2 text-left">Peminjam</th>
                      <th className="px-3 py-2 text-left">Departemen</th>
                      <th className="px-3 py-2 text-left">Tanggal Pinjam</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeLoans.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-5 text-center text-gray-500">
                          Tidak ada sampel yang sedang dipinjam.
                        </td>
                      </tr>
                    )}

                    {activeLoans.map((item) => (
                      <tr
                        key={item.ID_Loan}
                        onClick={() => toggleSelect(item)}
                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedItems[item.ID_Loan] ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={!!selectedItems[item.ID_Loan]}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelect(item);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2">{item.ID_Loan}</td>
                        <td className="px-3 py-2">{item.ID_Sampel}</td>
                        <td className="px-3 py-2 font-medium">{item.Design || '-'}</td>
                        <td className="px-3 py-2">{item.Customer_Name}</td>
                        <td className="px-3 py-2">{item.Departemen || '-'}</td>
                        <td className="px-3 py-2">{formatDateWib(item.Loan_Date)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            item.Status === 'Dipinjam' || item.Status === 'Keluar'
                              ? 'bg-blue-100 text-blue-700'
                              : item.Status === 'Pengembalian Diajukan'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.Status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
