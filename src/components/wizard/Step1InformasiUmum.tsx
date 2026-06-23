'use client';

import { ProductRecord } from '@/types/user';
import { useState } from 'react';

interface Step1Props {
  data: ProductRecord;
  onChange: (data: ProductRecord) => void;
}

export function isStep1Valid(data: ProductRecord): boolean {
  return data.Design.trim() !== '';
}

export default function Step1InformasiUmum({ data, onChange }: Step1Props) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({
      ...data,
      [name]: value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateOnBlur = () => {
    const newErrors: { [key: string]: string } = {};
    if (!data.Design.trim()) {
      newErrors.Design = 'Design harus diisi';
    }
    setErrors(newErrors);
  };

  return (
    <div onBlur={validateOnBlur}>
      <h2 className="text-2xl font-bold mb-2">Step 1: Informasi Umum Produk</h2>
      <p className="text-sm text-slate-600 mb-6">Isi informasi dasar produk kain.</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Design">
            Design *
          </label>
          <input
            type="text"
            id="Design"
            name="Design"
            value={data.Design}
            onChange={handleChange}
            required
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              errors.Design ? 'border-red-500' : ''
            }`}
            placeholder="Masukkan design"
          />
          {errors.Design && <p className="text-red-500 text-xs mt-1">{errors.Design}</p>}
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="BrandNameNote">
            Brand Name Note
          </label>
          <input
            type="text"
            id="BrandNameNote"
            name="BrandNameNote"
            value={data.BrandNameNote || ''}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Masukkan brand name note"
          />
        </div>

        <div>
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="TanggalProduksi">
            Tanggal Produksi
          </label>
          <input
            type="date"
            id="TanggalProduksi"
            name="TanggalProduksi"
            value={data.TanggalProduksi || ''}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Keterangan">
            Keterangan
          </label>
          <textarea
            id="Keterangan"
            name="Keterangan"
            value={data.Keterangan || ''}
            onChange={handleChange}
            rows={3}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Masukkan keterangan tambahan"
          />
        </div>
      </div>
    </div>
  );
}
