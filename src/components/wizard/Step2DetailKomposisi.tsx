'use client';

import { SpesifikasiRecord } from '@/types/user';
import { useState } from 'react';

interface Step2Props {
  data: SpesifikasiRecord;
  onChange: (data: SpesifikasiRecord) => void;
}

export function isStep2Valid(data: SpesifikasiRecord): boolean {
  return data.BenangLusi.trim() !== '' && data.BenangPakan.trim() !== '';
}

export default function Step2DetailKomposisi({ data, onChange }: Step2Props) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumericField = ['Poly', 'CD', 'Ray', 'Nyl', 'PU', 'Ros', 'Tac', 'Dope'].includes(name);

    onChange({
      ...data,
      [name]: isNumericField ? (value === '' ? 0 : Number(value)) : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateOnBlur = () => {
    const newErrors: { [key: string]: string } = {};
    if (!data.BenangLusi.trim()) {
      newErrors.BenangLusi = 'Benang Lusi harus diisi';
    }
    if (!data.BenangPakan.trim()) {
      newErrors.BenangPakan = 'Benang Pakan harus diisi';
    }
    setErrors(newErrors);
  };

  const compositionFields = [
    { key: 'Poly', label: 'Poly (%)', inputType: 'number' },
    { key: 'CD', label: 'CD (%)', inputType: 'number' },
    { key: 'Ray', label: 'Ray (%)', inputType: 'number' },
    { key: 'Nyl', label: 'Nyl (%)', inputType: 'number' },
    { key: 'PU', label: 'PU (%)', inputType: 'number' },
    { key: 'Ros', label: 'Ros (%)', inputType: 'number' },
    { key: 'Tac', label: 'Tac (%)', inputType: 'number' },
    { key: 'Dope', label: 'Dope (%)', inputType: 'number' },
    { key: 'RW', label: 'RW', inputType: 'text' },
    { key: 'RF', label: 'RF', inputType: 'text' },
  ];

  return (
    <div onBlur={validateOnBlur}>
      <h2 className="text-2xl font-bold mb-6">Step 2: Detail Komposisi Benang</h2>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="BenangLusi">
          Benang Lusi *
        </label>
        <input
          type="text"
          id="BenangLusi"
          name="BenangLusi"
          value={data.BenangLusi}
          onChange={handleChange}
          required
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.BenangLusi ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan jenis benang lusi"
        />
        {errors.BenangLusi && <p className="text-red-500 text-xs mt-1">{errors.BenangLusi}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="BenangPakan">
          Benang Pakan *
        </label>
        <input
          type="text"
          id="BenangPakan"
          name="BenangPakan"
          value={data.BenangPakan}
          onChange={handleChange}
          required
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.BenangPakan ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan jenis benang pakan"
        />
        {errors.BenangPakan && <p className="text-red-500 text-xs mt-1">{errors.BenangPakan}</p>}
      </div>

      <div className="border-t pt-6 mb-4">
        <h3 className="text-lg font-bold mb-4">Komposisi Benang</h3>
        <div className="grid grid-cols-2 gap-4">
          {compositionFields.map(({ key, label, inputType }) => (
            <div key={key}>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={key}>
                {label}
              </label>
              <input
                type={inputType}
                id={key}
                name={key}
                value={data[key as keyof SpesifikasiRecord] || ''}
                onChange={handleChange}
                step={inputType === 'number' ? '0.01' : undefined}
                min={inputType === 'number' ? '0' : undefined}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder={inputType === 'number' ? '0.00' : `Masukkan ${label}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
