'use client';

import { ProductRecord } from '@/types/user';
import { useState } from 'react';

interface Step5Props {
  data: ProductRecord;
  onChange: (data: ProductRecord) => void;
  onImageSelected: (file: File | null) => void;
}

function generateRakHangerOptions(): string[] {
  const options: string[] = [];
  for (let rack = 1; rack <= 8; rack += 1) {
    for (const position of ['A', 'B', 'C', 'D']) {
      options.push(`${rack}${position}`);
    }
  }
  return options;
}

export default function Step5InformasiTambahan({ data, onChange, onImageSelected }: Step5Props) {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const rakHangerOptions = generateRakHangerOptions();

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    onChange({
      ...data,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImagePreview('');
      onImageSelected(null);
      onChange({
        ...data,
        Gambar: '',
        GambarNama: '',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
    onImageSelected(file);
    onChange({
      ...data,
      Gambar: '',
      GambarNama: file.name,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Step 5: Informasi Tambahan</h2>
        <p className="text-sm text-slate-600">Isi lokasi penyimpanan, catatan tambahan, dan unggah gambar sampel bila tersedia.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="mb-1">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Lemari">
            Lemari
          </label>
          <select
            id="Lemari"
            name="Lemari"
            value={data.Lemari || ''}
            onChange={handleTextChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Pilih lemari</option>
            {['Putih', 'Kuning', 'Biru', 'Merah', 'Hijau'].map((warna) => (
              <option key={warna} value={warna}>
                {warna}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-1">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="RakHanger">
            Rak Hanger
          </label>
          <select
            id="RakHanger"
            name="RakHanger"
            value={data.RakHanger || ''}
            onChange={handleTextChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Pilih rak hanger</option>
            {rakHangerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Gambar">
          Upload Gambar Sampel (Opsional)
        </label>
        <input
          type="file"
          id="Gambar"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700 disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-slate-500">
            Unggah gambar sampel jika tersedia.
        </p>

        {data.Gambar && (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Preview {data.GambarNama ? `- ${data.GambarNama}` : ''}
              </div>
              <img
                src={data.Gambar}
                alt={data.GambarNama || 'Preview gambar sampel'}
                className="max-h-64 w-full rounded-lg object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
