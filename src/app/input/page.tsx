'use client';

import { useState } from 'react';
import MultiStepWizard from '@/components/MultiStepWizard';
import ExcelImportUpload from '@/components/ExcelImportUpload';
import { KonstruksiTenunRecord, ParameterFisikRecord, ProductRecord, SpesifikasiRecord } from '@/types/user';
import { ChevronRight, FileSpreadsheet, PencilLine } from 'lucide-react';

export default function InputPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [activeMethod, setActiveMethod] = useState<'excel' | 'manual'>('excel');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
  };

  const handleResetDraft = () => {
    setResetToken((previous) => previous + 1);
    showMessage('success', 'Draft berhasil direset');
  };

  const handleWizardComplete = async (
    productData: ProductRecord,
    spesifikasiData: SpesifikasiRecord,
    konstruksiData: KonstruksiTenunRecord,
    parameterFisikData: ParameterFisikRecord
  ) => {
    try {
      setLoading(true);

      const productResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!productResponse.ok) {
        const error = await productResponse.json();
        showMessage('error', 'Gagal menyimpan produk: ' + error.error);
        return false;
      }

      const newProduct = await productResponse.json();
      const idProduksi = Number(newProduct.IdProduksi ?? newProduct.IdSampel);

      if (!idProduksi || Number.isNaN(idProduksi)) {
        showMessage('error', 'Gagal membaca ID Produksi dari data produk baru');
        return false;
      }

      const spesifikasiResponse = await fetch('/api/spesifikasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...spesifikasiData,
          idSampel: idProduksi,
          idProduksi,
        }),
      });

      if (!spesifikasiResponse.ok) {
        const error = await spesifikasiResponse.json();
        showMessage('error', 'Gagal menyimpan spesifikasi: ' + error.error);
        return false;
      }

      const konstruksiResponse = await fetch('/api/konstruksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...konstruksiData,
          idSampel: idProduksi,
          idProduksi,
        }),
      });

      if (!konstruksiResponse.ok) {
        const error = await konstruksiResponse.json();
        showMessage('error', 'Gagal menyimpan konstruksi tenun: ' + error.error);
        return false;
      }

      const parameterFisikResponse = await fetch('/api/parameter-fisik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parameterFisikData,
          idSampel: idProduksi,
          idProduksi,
        }),
      });

      if (!parameterFisikResponse.ok) {
        const error = await parameterFisikResponse.json();
        showMessage('error', 'Gagal menyimpan parameter fisik: ' + error.error);
        return false;
      }

      showMessage('success', 'Data produk, spesifikasi, konstruksi tenun, parameter fisik, dan informasi tambahan berhasil disimpan');

      if (typeof window !== 'undefined') {
        const refreshedAt = String(Date.now());
        window.localStorage.setItem('products:last-updated', refreshedAt);
        window.dispatchEvent(new Event('products:updated'));
      }

      return true;
    } catch (error: any) {
      showMessage('error', 'Error: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-white to-teal-50 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Tambah Data Produk Kain</h1>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl border p-4 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
            {message.text}
          </div>
        )}

        {loading && (
          <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-700">
            Menyimpan data...
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-3 md:px-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveMethod('excel')}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  activeMethod === 'excel'
                    ? 'border-sky-200 bg-sky-50 shadow-sm'
                    : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`rounded-full p-2 ${activeMethod === 'excel' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                    <FileSpreadsheet size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Import Excel</span>
                    <span className="block text-xs text-slate-500">Upload data dalam jumlah banyak</span>
                  </span>
                </span>
                <ChevronRight size={16} className={activeMethod === 'excel' ? 'text-sky-600' : 'text-slate-400'} />
              </button>

              <button
                type="button"
                onClick={() => setActiveMethod('manual')}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  activeMethod === 'manual'
                    ? 'border-emerald-200 bg-emerald-50 shadow-sm'
                    : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`rounded-full p-2 ${activeMethod === 'manual' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    <PencilLine size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Tambah Data</span>
                    <span className="block text-xs text-slate-500">Masukkan data secara bertahap dan detail</span>
                  </span>
                </span>
                <ChevronRight size={16} className={activeMethod === 'manual' ? 'text-emerald-600' : 'text-slate-400'} />
              </button>
            </div>
          </div>

          <div className="bg-slate-50/40 px-4 py-5 md:px-6">
            {activeMethod === 'excel' ? (
              <div className="space-y-4">
                <ExcelImportUpload />
              </div>
            ) : (
              <div className="space-y-4">
                <MultiStepWizard
                  onComplete={handleWizardComplete}
                  onCancel={() => window.history.back()}
                  onResetDraft={handleResetDraft}
                  resetToken={resetToken}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
