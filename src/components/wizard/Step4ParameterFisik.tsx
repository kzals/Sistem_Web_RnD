'use client';

import { ParameterFisikRecord } from '@/types/user';
import { useState } from 'react';

interface Step4Props {
  data: ParameterFisikRecord;
  onChange: (data: ParameterFisikRecord) => void;
}

export function isStep4Valid(data: ParameterFisikRecord): boolean {
  return true;
}

export default function Step4ParameterFisik({ data, onChange }: Step4Props) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    const numericFields = [
      'LebarAct',
      'BeratBulatan',
      'GrLYd',
      'GrSqm',
      'GrLMtr',
      'GrSqYd',
      'OzLYd',
      'OzSqYd',
      'LYd58Inch',
    ];

    onChange({
      ...data,
      [name]: numericFields.includes(name) ? (value === '' ? 0 : Number(value)) : value,
    });

    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateOnBlur = () => {
    const newErrors: { [key: string]: string } = {};
    setErrors(newErrors);
  };

  const inputClasses = (fieldName: string) =>
    `shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
      errors[fieldName] ? 'border-red-500' : ''
    }`;

  return (
    <div onBlur={validateOnBlur}>
      <h2 className="text-2xl font-bold mb-6">Step 4: Parameter Fisik Kain</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Width (Cm) - String field */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="WidthCm">
            Width (Cm)
          </label>
          <input
            type="text"
            id="WidthCm"
            name="WidthCm"
            value={data.WidthCm || ''}
            onChange={handleChange}
            className={inputClasses('WidthCm')}
            placeholder="Masukkan width (cm)"
          />
          {errors.WidthCm && <p className="text-red-500 text-xs mt-1">{errors.WidthCm}</p>}
        </div>

        {/* 2. Lebar Act */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="LebarAct">
            Lebar Act
          </label>
          <input
            type="number"
            id="LebarAct"
            name="LebarAct"
            value={data.LebarAct || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('LebarAct')}
            placeholder="Masukkan lebar act"
          />
          {errors.LebarAct && <p className="text-red-500 text-xs mt-1">{errors.LebarAct}</p>}
        </div>

        {/* 3. Berat Bulatan */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="BeratBulatan">
            Berat Bulatan
          </label>
          <input
            type="number"
            id="BeratBulatan"
            name="BeratBulatan"
            value={data.BeratBulatan || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('BeratBulatan')}
            placeholder="Masukkan berat bulatan"
          />
          {errors.BeratBulatan && <p className="text-red-500 text-xs mt-1">{errors.BeratBulatan}</p>}
        </div>

        {/* 4. Gr/L Yd */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="GrLYd">
            Gr/L Yd
          </label>
          <input
            type="number"
            id="GrLYd"
            name="GrLYd"
            value={data.GrLYd || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('GrLYd')}
            placeholder="Masukkan Gr/L Yd"
          />
          {errors.GrLYd && <p className="text-red-500 text-xs mt-1">{errors.GrLYd}</p>}
        </div>

        {/* 5. L/Yd 58 inch */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="LYd58Inch">
            L/Yd 58 inch
          </label>
          <input
            type="number"
            id="LYd58Inch"
            name="LYd58Inch"
            value={data.LYd58Inch || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('LYd58Inch')}
            placeholder="Masukkan L/Yd 58 inch"
          />
          {errors.LYd58Inch && <p className="text-red-500 text-xs mt-1">{errors.LYd58Inch}</p>}
        </div>

        {/* 6. Gr/Sqm */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="GrSqm">
            Gr/Sqm
          </label>
          <input
            type="number"
            id="GrSqm"
            name="GrSqm"
            value={data.GrSqm || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('GrSqm')}
            placeholder="Masukkan Gr/Sqm"
          />
          {errors.GrSqm && <p className="text-red-500 text-xs mt-1">{errors.GrSqm}</p>}
        </div>

        {/* 7. Gr/L Mtr */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="GrLMtr">
            Gr/L Mtr
          </label>
          <input
            type="number"
            id="GrLMtr"
            name="GrLMtr"
            value={data.GrLMtr || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('GrLMtr')}
            placeholder="Masukkan Gr/L Mtr"
          />
          {errors.GrLMtr && <p className="text-red-500 text-xs mt-1">{errors.GrLMtr}</p>}
        </div>

        {/* 8. Gr/SqYd */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="GrSqYd">
            Gr/SqYd
          </label>
          <input
            type="number"
            id="GrSqYd"
            name="GrSqYd"
            value={data.GrSqYd || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('GrSqYd')}
            placeholder="Masukkan Gr/SqYd"
          />
          {errors.GrSqYd && <p className="text-red-500 text-xs mt-1">{errors.GrSqYd}</p>}
        </div>

        {/* 9. Oz/L Yd */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="OzLYd">
            Oz/L Yd
          </label>
          <input
            type="number"
            id="OzLYd"
            name="OzLYd"
            value={data.OzLYd || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('OzLYd')}
            placeholder="Masukkan Oz/L Yd"
          />
          {errors.OzLYd && <p className="text-red-500 text-xs mt-1">{errors.OzLYd}</p>}
        </div>

        {/* 10. Oz/SqYd */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="OzSqYd">
            Oz/SqYd
          </label>
          <input
            type="number"
            id="OzSqYd"
            name="OzSqYd"
            value={data.OzSqYd || ''}
            onChange={handleChange}
            step="0.01"
            className={inputClasses('OzSqYd')}
            placeholder="Masukkan Oz/SqYd"
          />
          {errors.OzSqYd && <p className="text-red-500 text-xs mt-1">{errors.OzSqYd}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Corak6Angka">
            Corak 6 Angka
          </label>
          <input
            type="text"
            id="Corak6Angka"
            name="Corak6Angka"
            value={data.Corak6Angka || ''}
            onChange={handleChange}
            className={inputClasses('Corak6Angka')}
            placeholder="Masukkan corak 6 angka"
          />
          {errors.Corak6Angka && <p className="text-red-500 text-xs mt-1">{errors.Corak6Angka}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="Warna">
            Warna
          </label>
          <input
            type="text"
            id="Warna"
            name="Warna"
            value={data.Warna || ''}
            onChange={handleChange}
            className={inputClasses('Warna')}
            placeholder="Masukkan warna"
          />
          {errors.Warna && <p className="text-red-500 text-xs mt-1">{errors.Warna}</p>}
        </div>
      </div>
    </div>
  );
}
