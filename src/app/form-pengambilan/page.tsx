'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeAppRole } from '@/lib/auth';

const SESSION_KEY = 'selectedSampelItems';
const LOCAL_STORAGE_SELECTED_KEY = 'selectedSampelItemsForm';
const FORM_DATA_KEY = 'formPengambilanData';

interface SelectedSampel {
  IdSampel: number;
  Design: string;
  Lemari?: string;
  RakHanger?: string;
}

type LoanStatus = 'Dipinjam' | 'Keluar';

function normalizeLoanStatus(value: unknown): LoanStatus {
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'keluar' ? 'Keluar' : 'Dipinjam';
}

export default function FormPengambilanPage() {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<SelectedSampel[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    departemen: '',
    status: 'Dipinjam' as LoanStatus,
    notes: '',
    urgency: 'Sedang' as 'Rendah' | 'Sedang' | 'Tinggi',
  });

  const urgencyLabels: Record<'Rendah' | 'Sedang' | 'Tinggi', string> = {
    Rendah: 'Fleksibel',
    Sedang: 'Standar',
    Tinggi: 'Mendesak',
  };

  useEffect(() => {
    if (formData.customerName || formData.notes) {
      localStorage.setItem(
        FORM_DATA_KEY,
        JSON.stringify({
          customerName: formData.customerName,
          status: formData.status,
          notes: formData.notes,
          urgency: formData.urgency,
        })
      );
    }
  }, [formData.customerName, formData.status, formData.notes, formData.urgency]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const nextRole = normalizeAppRole(data?.role);
        if (nextRole !== 'requester' && nextRole !== 'root') {
          router.replace('/login');
          return;
        }
        if (!data?.dept) {
          router.replace('/login');
          return;
        }
        setFormData((prev) => ({ ...prev, departemen: data.dept }));

        const saved = localStorage.getItem(FORM_DATA_KEY);
        if (saved) {
          try {
            const savedData = JSON.parse(saved);
            setFormData((prev) => ({
              ...prev,
              customerName: savedData.customerName || '',
              status: normalizeLoanStatus(savedData.status),
              notes: savedData.notes || '',
              urgency: savedData.urgency || 'Sedang',
            }));
          } catch {}
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  useEffect(() => {
    try {
      // Try sessionStorage first (from products page), then localStorage (from refresh)
      let raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        raw = localStorage.getItem(LOCAL_STORAGE_SELECTED_KEY);
      }
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          setSelectedItems(data);
          // Save to localStorage for persistence across refresh
          localStorage.setItem(LOCAL_STORAGE_SELECTED_KEY, JSON.stringify(data));
        } else {
          router.replace('/search');
        }
      } else {
        router.replace('/search');
      }
    } catch {
      router.replace('/search');
    }
  }, [router]);

  // Persist selected items to localStorage whenever they change
  useEffect(() => {
    if (selectedItems.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_SELECTED_KEY, JSON.stringify(selectedItems));
    }
  }, [selectedItems]);

  const removeItem = (id: number) => {
    setSelectedItems((prev) => {
      const next = prev.filter((item) => item.IdSampel !== id);
      if (next.length === 0) {
        router.replace('/search');
      }
      return next;
    });
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'error') setTimeout(() => setMessage(null), 6000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName.trim()) {
      showMessage('error', 'Nama wajib diisi');
      return;
    }

    if (!formData.departemen.trim()) {
      showMessage('error', 'Departemen login tidak ditemukan. Silakan login ulang.');
      return;
    }

    if (selectedItems.length === 0) {
      showMessage('error', 'Tidak ada sampel yang dipilih');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/sample-loan-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleIds: selectedItems.map((item) => item.IdSampel),
          customerName: formData.customerName.trim(),
          departemen: formData.departemen.trim(),
          status: formData.status,
          notes: formData.notes.trim(),
          urgency: formData.urgency,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal mengirim permintaan');

      showMessage('success', `Permintaan berhasil dikirim. ID: ${data.requestId}`);
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(FORM_DATA_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SELECTED_KEY);
      localStorage.removeItem('selectedSampelItemsProductsPage');
      setSelectedItems([]);
      setFormData((prev) => ({ ...prev, customerName: '', status: 'Dipinjam', notes: '', urgency: 'Sedang' }));
    } catch (error: any) {
      showMessage('error', error.message || 'Gagal mengirim permintaan');
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedItems.length === 0 && !message) {
    return (
      <div className="bg-gradient-to-b from-slate-50 to-white py-8 px-4">
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center py-16">
          <p className="text-slate-600 text-lg">Memuat data sampel terpilih...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-6 py-5">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-700">
              Requester Workspace
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Formulir Pengambilan Sampel</h1>
            <p className="mt-1 text-sm text-slate-600">Isi formulir untuk meminta pengambilan sampel kain dari gudang</p>
          </div>
          <div className="grid grid-cols-2 gap-3 px-6 py-5 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Status Request</div>
              <div className="mt-1 text-lg font-bold text-slate-900">Pengambilan</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Sampel</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{selectedItems.length}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Departemen</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{formData.departemen || '-'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Urgensi</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">{urgencyLabels[formData.urgency]}</div>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-2xl border p-4 ${
              message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            <p>{message.text}</p>
            {message.type === 'success' && (
              <div className="mt-3 flex gap-3">
                <Link href="/search" className="text-sm font-semibold text-emerald-700 hover:underline">
                  Cari Kain Lagi
                </Link>
                <Link href="/products" className="text-sm font-semibold text-emerald-700 hover:underline">
                  Ke Data Produk
                </Link>
              </div>
            )}
          </div>
        )}

        {selectedItems.length > 0 && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
              <h2 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">Sampel Kain Terpilih ({selectedItems.length})</h2>
              <div className="overflow-x-auto max-h-[280px] overflow-y-auto rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                      <th className="w-12 px-4 py-3 text-left font-semibold text-slate-700">No</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Design</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Lemari</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Rak/Hanger</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedItems.map((item, index) => (
                      <tr key={item.IdSampel} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-center font-medium text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3 text-slate-700">{item.IdSampel}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.Design}</td>
                        <td className="px-4 py-3 text-slate-700">{item.Lemari || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{item.RakHanger || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/detail/${item.IdSampel}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                            >
                              Detail
                            </Link>
                            <button
                              onClick={() => removeItem(item.IdSampel)}
                              className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 border-b border-slate-100 pb-3 text-lg font-bold text-slate-900">Data Permintaan</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Nama</label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Nama peminjam"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Departemen</label>
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {formData.departemen || 'Memuat departemen login...'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as LoanStatus }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="Dipinjam">Dipinjam</option>
                      <option value="Keluar">Keluar</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Keterangan</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Opsional"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Tingkat Urgensi</label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(['Rendah', 'Sedang', 'Tinggi'] as const).map((level) => {
                      const isSelected = formData.urgency === level;
                      const selectedClass =
                        level === 'Rendah'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : level === 'Tinggi'
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-yellow-50 border-yellow-300 text-yellow-700';
                      return (
                        <label key={level} className="flex items-center gap-2 cursor-pointer min-w-0 w-full">
                          <input
                            type="radio"
                            name="urgency"
                            value={level}
                            checked={isSelected}
                            onChange={(e) => setFormData((prev) => ({ ...prev, urgency: e.target.value as 'Rendah' | 'Sedang' | 'Tinggi' }))}
                            className="w-4 h-4"
                          />
                          <span className={`min-w-0 flex-1 rounded-lg border-2 px-3 py-1.5 text-center text-sm font-medium transition-all ${
                            isSelected ? `${selectedClass} border-solid` : 'bg-gray-50 border-gray-300 text-gray-600'
                          }`}>
                            {urgencyLabels[level]}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-sky-600 px-6 py-2 font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-60 sm:w-auto"
                  >
                    {submitting ? 'Mengirim...' : 'Kirim Permintaan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full rounded-lg bg-slate-200 px-6 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-300 sm:w-auto"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
