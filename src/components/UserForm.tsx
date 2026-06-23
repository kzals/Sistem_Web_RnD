'use client';

import { ProductRecord } from '@/types/user';
import { useState, useEffect } from 'react';

interface UserFormProps {
  onSubmit: (product: ProductRecord) => void;
  editingProduct: ProductRecord | null;
  onCancel: () => void;
}

const STORAGE_KEY = 'productFormDraft';

const defaultFormData: ProductRecord = {
  Design: '',
  Lemari: '',
  RakHanger: '',
  BrandNameNote: '',
};

export default function UserForm({ onSubmit, editingProduct, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<ProductRecord>(defaultFormData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load dari localStorage atau editingProduct saat component mount
  useEffect(() => {
    if (editingProduct) {
      setFormData(editingProduct);
    } else if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setFormData(parsed);
        } catch (error) {
          console.error('Error parsing saved form data:', error);
          setFormData(defaultFormData);
        }
      }
    }
    setIsLoaded(true);
  }, [editingProduct]);

  // Update localStorage setiap kali formData berubah (hanya saat tidak editing)
  useEffect(() => {
    if (isLoaded && !editingProduct && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, isLoaded, editingProduct]);

  const clearFormCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData(defaultFormData);
    clearFormCache();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Generate Rak Hanger options: 1A-1D, 2A-2D, ..., 8A-8D
  const generateRakHangerOptions = (): string[] => {
    const options: string[] = [];
    for (let i = 1; i <= 8; i++) {
      for (const letter of ['A', 'B', 'C', 'D']) {
        options.push(`${i}${letter}`);
      }
    }
    return options;
  };

  const rakHangerOptions = generateRakHangerOptions();

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
      <h2 className="text-2xl font-bold mb-4">
        {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
      </h2>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Design">
          Design *
        </label>
        <input
          type="text"
          id="Design"
          name="Design"
          value={formData.Design}
          onChange={handleChange}
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Masukkan design"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Lemari">
          Lemari *
        </label>
        <select
          id="Lemari"
          name="Lemari"
          value={formData.Lemari || ''}
          onChange={handleChange}
          required
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

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="RakHanger">
          Rak Hanger
        </label>
        <select
          id="RakHanger"
          name="RakHanger"
          value={formData.RakHanger || ''}
          onChange={handleChange}
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

      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="BrandNameNote">
          Nama Brand
        </label>
        <input
          type="text"
          id="BrandNameNote"
          name="BrandNameNote"
          value={formData.BrandNameNote || ''}
          onChange={handleChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Masukkan Nama Brand"
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {editingProduct ? 'Update' : 'Tambah'}
        </button>

        {editingProduct && (
          <button
            type="button"
            onClick={() => {
              onCancel();
              clearFormCache();
            }}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
