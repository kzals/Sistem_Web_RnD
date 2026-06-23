'use client';

import { useState } from 'react';

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  selectedSheetName?: string;
  selectedSheetMode?: 'preferred' | 'auto' | 'none';
  durationMs?: number;
  processedRows?: number;
  chunkSize?: number;
  concurrency?: number;
}

export default function ExcelImportUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx')) {
        setError('Hanya file .xlsx yang didukung');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Pilih file terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal mengimport file');
        return;
      }

      setResult(data);
      setFile(null);

      // Reset file input
      const inputElement = document.getElementById('file-input') as HTMLInputElement;
      if (inputElement) {
        inputElement.value = '';
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">Upload File Excel</label>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <input
            id="file-input"
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full text-sm text-slate-600
              file:mr-4 file:rounded-lg file:border-0
              file:bg-sky-100 file:px-4 file:py-2
              file:text-sm file:font-semibold file:text-sky-700
              hover:file:bg-sky-200 disabled:opacity-50"
          />
          <p className="mt-2 text-xs text-slate-500">Format didukung: .xlsx</p>
          {file && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              File dipilih: <span className="font-semibold">{file.name}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="rounded-lg bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Mengimport...' : 'Import Data'}
          </button>
          <span className="text-xs text-slate-500">Pastikan struktur kolom pada file sudah benar sebelum import.</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Hasil Import</h3>
            <div className="flex items-center gap-2">
              {result.selectedSheetName && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  Sheet: {result.selectedSheetName}
                </span>
              )}
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Total {result.success + result.failed} baris
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm text-slate-600">Berhasil</p>
              <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-slate-600">Gagal</p>
              <p className="text-2xl font-bold text-rose-600">{result.failed}</p>
            </div>
          </div>

          {result.success > 0 && (
            <p className="rounded-lg border border-emerald-200 bg-white p-3 text-sm text-emerald-700">
              {result.success} data berhasil diimport.
            </p>
          )}

          {typeof result.durationMs === 'number' && (
            <div className="rounded-lg border border-sky-200 bg-white p-3 text-sm text-slate-700">
              <p>
                Durasi proses: <span className="font-semibold">{(result.durationMs / 1000).toFixed(1)} detik</span>
              </p>
              {typeof result.processedRows === 'number' && result.processedRows > 0 && (
                <p>
                  Estimasi untuk 7395 baris: <span className="font-semibold">{((result.durationMs / result.processedRows) * 7395 / 1000).toFixed(1)} detik</span>
                </p>
              )}
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="mt-1">
              <h4 className="mb-2 text-sm font-semibold text-rose-700">Error Details ({result.errors.length})</h4>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-rose-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b bg-rose-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-rose-700">Row</th>
                      <th className="px-4 py-2 text-left text-rose-700">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((err, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-rose-50/40' : 'bg-white'}>
                        <td className="px-4 py-2 font-mono text-rose-600">{err.row}</td>
                        <td className="px-4 py-2 text-slate-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
