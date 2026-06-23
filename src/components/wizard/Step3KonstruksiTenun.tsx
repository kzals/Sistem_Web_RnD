'use client';

import { KonstruksiTenunRecord } from '@/types/user';
import { useState } from 'react';

interface Step3Props {
  data: KonstruksiTenunRecord;
  onChange: (data: KonstruksiTenunRecord) => void;
}

export function isStep3Valid(data: KonstruksiTenunRecord): boolean {
  return !!data.WeaveConstr?.trim();
}

export default function Step3KonstruksiTenun({ data, onChange }: Step3Props) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    onChange({
      ...data,
      [name]: name === 'DensityWarp' || name === 'DensityWeft' || name === 'NomorSisir' || name === 'LebarSisir'
        ? (value === '' ? 0 : Number(value))
        : value,
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateOnBlur = () => {
    const newErrors: { [key: string]: string } = {};

    if (!data.WeaveConstr.trim()) {
      newErrors.WeaveConstr = 'Weave Constr harus diisi';
    }

    setErrors(newErrors);
  };

  return (
    <div onBlur={validateOnBlur}>
      <h2 className="text-2xl font-bold mb-6">Step 3: Konstruksi Tenun</h2>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="WeaveConstr">
          Weave Constr *
        </label>
        <input
          type="text"
          id="WeaveConstr"
          name="WeaveConstr"
          value={data.WeaveConstr}
          onChange={handleChange}
          required
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.WeaveConstr ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan weave constr"
        />
        {errors.WeaveConstr && <p className="text-red-500 text-xs mt-1">{errors.WeaveConstr}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="DensityWarp">
          Density Warp
        </label>
        <input
          type="number"
          id="DensityWarp"
          name="DensityWarp"
          value={data.DensityWarp || ''}
          onChange={handleChange}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.DensityWarp ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan density warp"
        />
        {errors.DensityWarp && <p className="text-red-500 text-xs mt-1">{errors.DensityWarp}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="DensityWeft">
          Density Weft
        </label>
        <input
          type="number"
          id="DensityWeft"
          name="DensityWeft"
          value={data.DensityWeft || ''}
          onChange={handleChange}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.DensityWeft ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan density weft"
        />
        {errors.DensityWeft && <p className="text-red-500 text-xs mt-1">{errors.DensityWeft}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="NomorSisir">
          Nomor Sisir
        </label>
        <input
          type="number"
          id="NomorSisir"
          name="NomorSisir"
          value={data.NomorSisir || ''}
          onChange={handleChange}
          step="0.01"
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.NomorSisir ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan nomor sisir"
        />
        {errors.NomorSisir && <p className="text-red-500 text-xs mt-1">{errors.NomorSisir}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="LebarSisir">
          Lebar Sisir
        </label>
        <input
          type="number"
          id="LebarSisir"
          name="LebarSisir"
          value={data.LebarSisir || ''}
          onChange={handleChange}
          step="0.01"
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            errors.LebarSisir ? 'border-red-500' : ''
          }`}
          placeholder="Masukkan lebar sisir"
        />
        {errors.LebarSisir && <p className="text-red-500 text-xs mt-1">{errors.LebarSisir}</p>}
      </div>
    </div>
  );
}
