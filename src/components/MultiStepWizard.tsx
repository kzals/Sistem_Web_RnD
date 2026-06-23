'use client';

import { KonstruksiTenunRecord, ParameterFisikRecord, ProductRecord, SpesifikasiRecord } from '@/types/user';
import { useEffect, useState } from 'react';
import { useRef } from 'react';
import Step1InformasiUmum, { isStep1Valid } from '@/components/wizard/Step1InformasiUmum';
import Step2DetailKomposisi, { isStep2Valid } from '@/components/wizard/Step2DetailKomposisi';
import Step3KonstruksiTenun, { isStep3Valid } from '@/components/wizard/Step3KonstruksiTenun';
import Step4ParameterFisik, { isStep4Valid } from '@/components/wizard/Step4ParameterFisik';
import Step5InformasiTambahan from '@/components/wizard/Step5InformasiTambahan';

interface MultiStepWizardProps {
  onComplete: (
    productData: ProductRecord,
    spesifikasiData: SpesifikasiRecord,
    konstruksiData: KonstruksiTenunRecord,
    parameterFisikData: ParameterFisikRecord
  ) => Promise<boolean>;
  onCancel: () => void;
  onResetDraft: () => void;
  resetToken?: number;
  isSubmitting?: boolean;
}

const WIZARD_STORAGE_KEY = 'multiStepWizardDraft';

const defaultProductData: ProductRecord = {
  Design: '',
  StokSampel: 0,
  Lemari: '',
  RakHanger: '',
  BrandNameNote: '',
  TanggalProduksi: '',
  Keterangan: '',
  Gambar: '',
  GambarNama: '',
};

const defaultSpesifikasiData: SpesifikasiRecord = {
  IdSampel: 0,
  BenangLusi: '',
  BenangPakan: '',
  Poly: 0,
  CD: 0,
  Ray: 0,
  RW: '',
  RF: '',
  Nyl: 0,
  PU: 0,
  Ros: 0,
  Tac: 0,
  Dope: 0,
};

const defaultKonstruksiData: KonstruksiTenunRecord = {
  IdSampel: 0,
  WeaveConstr: '',
  DensityWarp: 0,
  DensityWeft: 0,
  NomorSisir: 0,
  LebarSisir: 0,
};

const defaultParameterFisikData: ParameterFisikRecord = {
  IdSampel: 0,
  Corak6Angka: '',
  Warna: '',
  WidthCm: '',
  LebarAct: 0,
  BeratBulatan: 0,
  GrLYd: 0,
  GrSqm: 0,
  GrLMtr: 0,
  GrSqYd: 0,
  OzLYd: 0,
  OzSqYd: 0,
  LYd58Inch: 0,
};

export default function MultiStepWizard({ onComplete, onCancel, onResetDraft, resetToken = 0, isSubmitting: externalSubmitting = false }: MultiStepWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [productData, setProductData] = useState<ProductRecord>(defaultProductData);
  const [spesifikasiData, setSpesifikasiData] = useState<SpesifikasiRecord>(defaultSpesifikasiData);
  const [konstruksiData, setKonstruksiData] = useState<KonstruksiTenunRecord>(defaultKonstruksiData);
  const [parameterFisikData, setParameterFisikData] = useState<ParameterFisikRecord>(defaultParameterFisikData);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const hasMountedResetEffect = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedDraft = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        if (parsedDraft.currentStep) {
          setCurrentStep(parsedDraft.currentStep);
        }
        if (parsedDraft.productData) {
          setProductData(parsedDraft.productData);
        }
        if (parsedDraft.spesifikasiData) {
          setSpesifikasiData(parsedDraft.spesifikasiData);
        }
        if (parsedDraft.konstruksiData) {
          setKonstruksiData(parsedDraft.konstruksiData);
        }
        if (parsedDraft.parameterFisikData) {
          setParameterFisikData(parsedDraft.parameterFisikData);
        }
      } catch (error) {
        console.error('Gagal membaca draft wizard:', error);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(
      WIZARD_STORAGE_KEY,
      JSON.stringify({
        currentStep,
        productData,
        spesifikasiData,
        konstruksiData,
        parameterFisikData,
      })
    );
  }, [currentStep, productData, spesifikasiData, konstruksiData, parameterFisikData, isLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!hasMountedResetEffect.current) {
      hasMountedResetEffect.current = true;
      return;
    }

    clearWizardDraft();
    setCurrentStep(1);
    setProductData(defaultProductData);
    setSpesifikasiData(defaultSpesifikasiData);
    setKonstruksiData(defaultKonstruksiData);
    setParameterFisikData(defaultParameterFisikData);
    setValidationError('');
  }, [resetToken, isLoaded]);

  const clearWizardDraft = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
    }
  };

  const handleNextStep = () => {
    if (isSubmitting) {
      return;
    }

    if (currentStep === 1) {
      if (!isStep1Valid(productData)) {
        setValidationError('Design harus diisi');
        return;
      }
    }
    if (currentStep === 2) {
      if (!isStep2Valid(spesifikasiData)) {
        setValidationError('Benang Lusi dan Benang Pakan harus diisi');
        return;
      }
    }
    if (currentStep === 3) {
      if (!isStep3Valid(konstruksiData)) {
        setValidationError('Data konstruksi tidak valid');
        return;
      }
    }
    setValidationError('');
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
      return;
    }

    handleSubmit();
  };

  const handlePrevStep = () => {
    if (isSubmitting) {
      return;
    }

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    setInternalSubmitting(true);

    if (!isStep4Valid(parameterFisikData)) {
      setValidationError('Data parameter fisik tidak valid');
      setInternalSubmitting(false);
      return;
    }

    let productDataToSave = productData;

    if (selectedImageFile) {
      try {
        setValidationError('');
        const formData = new FormData();
        formData.append('file', selectedImageFile);
        formData.append('fileName', selectedImageFile.name);

        const uploadResponse = await fetch('/api/upload-to-imagekit', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json().catch(() => null);
          throw new Error(uploadError?.error || 'Gagal upload gambar ke ImageKit');
        }

        const uploadResult = await uploadResponse.json();
        productDataToSave = {
          ...productData,
          Gambar: uploadResult.fileUrl,
          GambarNama: uploadResult.fileName,
        };
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : 'Gagal upload gambar ke ImageKit');
        setInternalSubmitting(false);
        return;
      }
    }

    setValidationError('');
    const isSuccess = await onComplete(productDataToSave, spesifikasiData, konstruksiData, parameterFisikData);
    if (isSuccess) {
      clearWizardDraft();
      setCurrentStep(1);
      setProductData(defaultProductData);
      setSpesifikasiData(defaultSpesifikasiData);
      setKonstruksiData(defaultKonstruksiData);
      setParameterFisikData(defaultParameterFisikData);
      setSelectedImageFile(null);
    }

    setInternalSubmitting(false);
  };

  const handleCancel = () => {
    clearWizardDraft();
    onCancel();
  };

  const handleResetDraft = () => {
    clearWizardDraft();
    setCurrentStep(1);
    setProductData(defaultProductData);
    setSpesifikasiData(defaultSpesifikasiData);
    setKonstruksiData(defaultKonstruksiData);
    setParameterFisikData(defaultParameterFisikData);
    setValidationError('');
    onResetDraft();
  };

  const stepDefinitions = [
    { num: 1, label: 'Informasi Umum' },
    { num: 2, label: 'Detail Komposisi' },
    { num: 3, label: 'Konstruksi Tenun' },
    { num: 4, label: 'Parameter Fisik' },
    { num: 5, label: 'Informasi Tambahan' },
  ];
  const progressPercent = (currentStep / stepDefinitions.length) * 100;
  const isSubmitting = externalSubmitting || internalSubmitting;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {isSubmitting && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/75 px-4 backdrop-blur-sm">
          <div className="rounded-2xl border border-sky-200 bg-white px-6 py-5 text-center shadow-lg">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600" />
            <div className="mt-3 text-sm font-semibold text-slate-900">Menyimpan data...</div>
            <div className="mt-1 text-xs text-slate-500">Mohon tunggu sampai proses selesai.</div>
          </div>
        </div>
      )}
      <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 via-white to-emerald-50 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
              {Math.round(progressPercent)}% selesai
            </div>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {stepDefinitions.map(({ num, label }) => {
              const isActive = currentStep === num;
              const isDone = currentStep > num;

              return (
                <div
                  key={num}
                  className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 transition-all ${
                    isActive
                      ? 'border-sky-200 bg-sky-50 shadow-sm'
                      : isDone
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      isActive
                        ? 'bg-sky-600 text-white'
                        : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isDone ? '✓' : num}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold uppercase tracking-wide ${isActive ? 'text-sky-700' : isDone ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {num === currentStep ? 'Sedang dikerjakan' : isDone ? 'Selesai' : 'Berikutnya'}
                    </div>
                    <div className={`truncate text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                      {label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        {validationError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {validationError}
          </div>
        )}
        {currentStep === 1 && (
          <Step1InformasiUmum
            data={productData}
            onChange={setProductData}
          />
        )}
        {currentStep === 2 && (
          <Step2DetailKomposisi
            data={spesifikasiData}
            onChange={setSpesifikasiData}
          />
        )}
        {currentStep === 3 && (
          <Step3KonstruksiTenun
            data={konstruksiData}
            onChange={setKonstruksiData}
          />
        )}
        {currentStep === 4 && (
          <Step4ParameterFisik
            data={parameterFisikData}
            onChange={setParameterFisikData}
          />
        )}
        {currentStep === 5 && (
          <Step5InformasiTambahan
            data={productData}
            onChange={setProductData}
            onImageSelected={setSelectedImageFile}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
          <button
            disabled={isSubmitting}
            onClick={handleCancel}
            className="w-full rounded-lg bg-gray-500 px-4 py-2 font-bold text-white transition-colors hover:bg-gray-700 focus:outline-none focus:shadow-outline disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleResetDraft}
            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 font-bold text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus:shadow-outline disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Reset Draft
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end w-full sm:w-auto">
          {currentStep > 1 && (
            <button
              disabled={isSubmitting}
              onClick={handlePrevStep}
              className="w-full rounded-lg bg-yellow-500 px-4 py-2 font-bold text-white transition-colors hover:bg-yellow-600 focus:outline-none focus:shadow-outline disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Sebelumnya
            </button>
          )}

          {currentStep < 5 && (
            <button
              disabled={isSubmitting}
              onClick={handleNextStep}
              className="w-full rounded-lg bg-blue-500 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:shadow-outline disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Selanjutnya
            </button>
          )}

          {currentStep === 5 && (
            <button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full rounded-lg bg-green-500 px-4 py-2 font-bold text-white transition-colors hover:bg-green-700 focus:outline-none focus:shadow-outline disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
