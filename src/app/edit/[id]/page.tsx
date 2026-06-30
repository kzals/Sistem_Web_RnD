'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { KonstruksiTenunRecord, ParameterFisikRecord, ProductRecord, SpesifikasiRecord } from '@/types/user';
import { type AppRole, normalizeAppRole } from '@/lib/auth';

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const fromPage = searchParams.get('from') || 'search';
  const [role, setRole] = useState<AppRole | null>(null);

  const [productData, setProductData] = useState<ProductRecord>({
    Design: '',
    StokSampel: 0,
    Lemari: '',
    RakHanger: '',
    BrandNameNote: '',
    Gambar: '',
    GambarNama: '',
    Keterangan: '',
  });

  const [spesifikasiData, setSpesifikasiData] = useState<SpesifikasiRecord>({
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
  });

  const [konstruksiData, setKonstruksiData] = useState<KonstruksiTenunRecord>({
    IdSampel: 0,
    WeaveConstr: '',
    DensityWarp: 0,
    DensityWeft: 0,
    NomorSisir: 0,
    LebarSisir: 0,
  });

  const [parameterFisikData, setParameterFisikData] = useState<ParameterFisikRecord>({
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
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadRole = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const nextRole = normalizeAppRole(data?.role);
        setRole(nextRole);
        if (nextRole === 'requester') {
          router.replace(`/detail/${id}?from=products`);
        }
      } catch {
        // ignore
      }
    };

    void loadRole();

    const loadProductData = async () => {
      try {
        setLoading(true);

        // Load product master data
        const productRes = await fetch(`/api/users?id=${id}`);
        if (!productRes.ok) {
          throw new Error('Produk tidak ditemukan');
        }
        const product = await productRes.json();
        setProductData({
          Design: product.Design,
          StokSampel: product.StokSampel ?? 0,
          Lemari: product.Lemari || '',
          RakHanger: product.RakHanger || '',
          BrandNameNote: product.BrandNameNote || '',
          Gambar: product.Gambar || '',
          GambarNama: product.GambarNama || '',
          Keterangan: product.Keterangan || '',
        });

        // Load spesifikasi data
        const specRes = await fetch(`/api/spesifikasi?idSampel=${id}`);
        if (specRes.ok) {
          const specs = await specRes.json();
          if (Array.isArray(specs) && specs.length > 0) {
            const spec = specs[0];
            setSpesifikasiData({
              IdBenang: spec.IdBenang || 0,
              IdSampel: spec.IdSampel || 0,
              BenangLusi: spec.BenangLusi || '',
              BenangPakan: spec.BenangPakan || '',
              Poly: spec.Poly || 0,
              CD: spec.CD || 0,
              Ray: spec.Ray || 0,
              RW: spec.RW || '',
              RF: spec.RF || '',
              Nyl: spec.Nyl || 0,
              PU: spec.PU || 0,
              Ros: spec.Ros || 0,
              Tac: spec.Tac || 0,
              Dope: spec.Dope || 0,
            });
          }
        }

        // Load konstruksi tenun data
        const konstruksiRes = await fetch(`/api/konstruksi?idSampel=${id}`);
        if (konstruksiRes.ok) {
          const konstruksis = await konstruksiRes.json();
          if (Array.isArray(konstruksis) && konstruksis.length > 0) {
            const konstruksi = konstruksis[0];
            setKonstruksiData({
              IdKonstruksi: konstruksi.IdKonstruksi || 0,
              IdSampel: konstruksi.IdSampel || 0,
              WeaveConstr: konstruksi.WeaveConstr || '',
              Density: konstruksi.Density || '',
              DensityWarp: konstruksi.DensityWarp || 0,
              DensityWeft: konstruksi.DensityWeft || 0,
              NomorSisir: konstruksi.NomorSisir || 0,
              LebarSisir: konstruksi.LebarSisir || 0,
            });
          }
        }

        // Load parameter fisik data
        const parameterRes = await fetch(`/api/parameter-fisik?idSampel=${id}`);
        if (parameterRes.ok) {
          const parameters = await parameterRes.json();
          if (Array.isArray(parameters) && parameters.length > 0) {
            const parameter = parameters[0];
            setParameterFisikData({
              IdFisik: parameter.IdFisik || 0,
              IdSampel: parameter.IdSampel || 0,
              Corak6Angka: parameter.Corak6Angka || '',
              Warna: parameter.Warna || '',
              WidthCm: parameter.WidthCm || '',
              LebarAct: parameter.LebarAct || 0,
              BeratBulatan: parameter.BeratBulatan || 0,
              GrLYd: parameter.GrLYd || 0,
              GrSqm: parameter.GrSqm || 0,
              GrLMtr: parameter.GrLMtr || 0,
              GrSqYd: parameter.GrSqYd || 0,
              OzLYd: parameter.OzLYd || 0,
              OzSqYd: parameter.OzSqYd || 0,
              LYd58Inch: parameter.LYd58Inch || 0,
            });
          }
        }
      } catch (error: any) {
        showMessage('error', error.message);
        setTimeout(() => router.push('/'), 2000);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
  }, [id, router]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    if (type === 'error') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSave = async () => {
    if (!productData.Design.trim()) {
      showMessage('error', 'Design harus diisi');
      return;
    }

    if (!konstruksiData.WeaveConstr.trim()) {
      showMessage('error', 'Weave Constr harus diisi');
      return;
    }

    try {
      setSaving(true);

      // If an image file was selected, upload it first
      let gambarUrl = productData.Gambar || '';
      let gambarNama = productData.GambarNama || '';
      if (selectedImageFile) {
        const formData = new FormData();
        formData.append('file', selectedImageFile);
        formData.append('fileName', selectedImageFile.name);

        const uploadRes = await fetch('/api/upload-to-imagekit', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => null);
          throw new Error(err?.error || 'Gagal upload gambar ke ImageKit');
        }

        const uploaded = await uploadRes.json();
        gambarUrl = uploaded.fileUrl;
        gambarNama = uploaded.fileName;
      }

      // Update product
      const productRes = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idSampel: id,
          design: productData.Design,
          stokSampel: Number(productData.StokSampel ?? 0),
          lemari: productData.Lemari,
          rakHanger: productData.RakHanger,
          brandNameNote: productData.BrandNameNote,
            keterangan: productData.Keterangan || '',
          gambar: gambarUrl,
          gambarNama: gambarNama,
        }),
      });

      if (!productRes.ok) {
        const error = await productRes.json();
        throw new Error(error.error || 'Gagal update produk');
      }

      // Update spesifikasi jika ada data
      if (spesifikasiData.IdBenang && spesifikasiData.IdBenang > 0) {
        // Update existing spesifikasi
        const specRes = await fetch('/api/spesifikasi', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...spesifikasiData,
            idBenang: spesifikasiData.IdBenang,
            idSampel: parseInt(id),
          }),
        });

        if (!specRes.ok) {
          const error = await specRes.json();
          throw new Error(error.error || 'Gagal update spesifikasi');
        }
      } else {
        // Create new spesifikasi if doesn't exist
        const specRes = await fetch('/api/spesifikasi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            benangLusi: spesifikasiData.BenangLusi,
            benangPakan: spesifikasiData.BenangPakan,
            Poly: spesifikasiData.Poly || 0,
            CD: spesifikasiData.CD || 0,
            Ray: spesifikasiData.Ray || 0,
            RW: spesifikasiData.RW || '',
            RF: spesifikasiData.RF || '',
            Nyl: spesifikasiData.Nyl || 0,
            PU: spesifikasiData.PU || 0,
            Ros: spesifikasiData.Ros || 0,
            Tac: spesifikasiData.Tac || 0,
            Dope: spesifikasiData.Dope || 0,
            idSampel: parseInt(id),
          }),
        });

        if (!specRes.ok) {
          const error = await specRes.json();
          throw new Error(error.error || 'Gagal membuat spesifikasi');
        }
      }

      // Update konstruksi jika ada data
      if (konstruksiData.IdKonstruksi && konstruksiData.IdKonstruksi > 0) {
        const konstruksiRes = await fetch('/api/konstruksi', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idKonstruksi: konstruksiData.IdKonstruksi,
            idSampel: parseInt(id),
            weaveConstr: konstruksiData.WeaveConstr,
            density: konstruksiData.Density || '',
            densityWarp: konstruksiData.DensityWarp,
            densityWeft: konstruksiData.DensityWeft,
            nomorSisir: konstruksiData.NomorSisir,
            lebarSisir: konstruksiData.LebarSisir,
          }),
        });

        if (!konstruksiRes.ok) {
          const error = await konstruksiRes.json();
          throw new Error(error.error || 'Gagal update konstruksi tenun');
        }
      } else {
        const konstruksiRes = await fetch('/api/konstruksi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idSampel: parseInt(id),
            weaveConstr: konstruksiData.WeaveConstr,
            density: konstruksiData.Density || '',
            densityWarp: konstruksiData.DensityWarp,
            densityWeft: konstruksiData.DensityWeft,
            nomorSisir: konstruksiData.NomorSisir,
            lebarSisir: konstruksiData.LebarSisir,
          }),
        });

        if (!konstruksiRes.ok) {
          const error = await konstruksiRes.json();
          throw new Error(error.error || 'Gagal membuat konstruksi tenun');
        }
      }

      // Update parameter fisik jika ada data
      if (parameterFisikData.IdFisik && parameterFisikData.IdFisik > 0) {
        const parameterRes = await fetch('/api/parameter-fisik', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idFisik: parameterFisikData.IdFisik,
            idSampel: parseInt(id),
            corak6Angka: parameterFisikData.Corak6Angka,
            warna: parameterFisikData.Warna,
            widthCm: parameterFisikData.WidthCm,
            lebarAct: parameterFisikData.LebarAct,
            beratBulatan: parameterFisikData.BeratBulatan,
            grLYd: parameterFisikData.GrLYd,
            grSqm: parameterFisikData.GrSqm,
            grLMtr: parameterFisikData.GrLMtr,
            grSqYd: parameterFisikData.GrSqYd,
            ozLYd: parameterFisikData.OzLYd,
            ozSqYd: parameterFisikData.OzSqYd,
            lyd58Inch: parameterFisikData.LYd58Inch,
          }),
        });

        if (!parameterRes.ok) {
          const error = await parameterRes.json();
          throw new Error(error.error || 'Gagal update parameter fisik');
        }
      } else {
        const parameterRes = await fetch('/api/parameter-fisik', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idSampel: parseInt(id),
            corak6Angka: parameterFisikData.Corak6Angka,
            warna: parameterFisikData.Warna,
            widthCm: parameterFisikData.WidthCm,
            lebarAct: parameterFisikData.LebarAct,
            beratBulatan: parameterFisikData.BeratBulatan,
            grLYd: parameterFisikData.GrLYd,
            grSqm: parameterFisikData.GrSqm,
            grLMtr: parameterFisikData.GrLMtr,
            grSqYd: parameterFisikData.GrSqYd,
            ozLYd: parameterFisikData.OzLYd,
            ozSqYd: parameterFisikData.OzSqYd,
            lyd58Inch: parameterFisikData.LYd58Inch,
          }),
        });

        if (!parameterRes.ok) {
          const error = await parameterRes.json();
          throw new Error(error.error || 'Gagal membuat parameter fisik');
        }
      }

      router.replace(`/detail/${id}?from=${fromPage}`);
    } catch (error: any) {
      showMessage('error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (role === 'requester') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
            <p className="font-semibold">Requester tidak memiliki akses untuk mengedit data.</p>
            <p className="mt-2 text-sm">Anda akan diarahkan ke halaman detail.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-10">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded"></div>
            <h1 className="text-4xl font-bold text-gray-900">Edit Produk</h1>
          </div>
          <p className="text-gray-600 ml-4">ID Sampel: <span className="font-semibold text-gray-800">{id}</span></p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border-l-4 ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-500' : 'bg-red-50 text-red-800 border-red-500'}`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-100">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Informasi Umum Produk</h2>
            </div>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded mt-2"></div>

            <div className="mb-4 mt-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Design *</label>
              <input
                type="text"
                value={productData.Design}
                onChange={(e) => setProductData({ ...productData, Design: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                placeholder="Design produk"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Stok Sampel</label>
              <input
                type="number"
                min="0"
                value={productData.StokSampel ?? 0}
                onChange={(e) => setProductData({ ...productData, StokSampel: e.target.value === '' ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.currentTarget.select()}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                placeholder="Jumlah stok sampel"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Lemari</label>
              <select
                value={productData.Lemari || ''}
                onChange={(e) => setProductData({ ...productData, Lemari: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
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
              <label className="block text-gray-700 text-sm font-bold mb-2">Rak Hanger</label>
              <select
                value={productData.RakHanger || ''}
                onChange={(e) => setProductData({ ...productData, RakHanger: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
              >
                <option value="">Pilih rak hanger</option>
                {(() => {
                  const options = [];
                  for (let i = 1; i <= 8; i++) {
                    for (const letter of ['A', 'B', 'C', 'D']) {
                      options.push(`${i}${letter}`);
                    }
                  }
                  return options;
                })().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Brand Name Note</label>
              <input
                type="text"
                value={productData.BrandNameNote || ''}
                onChange={(e) => setProductData({ ...productData, BrandNameNote: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                placeholder="Catatan brand"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Keterangan</label>
              <textarea
                value={productData.Keterangan || ''}
                onChange={(e) => setProductData({ ...productData, Keterangan: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                placeholder="Keterangan produk"
                rows={4}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Gambar Produk</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                  setSelectedImageFile(f);
                }}
                className="w-full text-sm text-gray-700"
              />

              <div className="mt-3">
                {selectedImageFile ? (
                  <div className="group flex items-center gap-4">
                    <div className="relative cursor-zoom-in overflow-hidden rounded border border-gray-200 bg-white">
                      <img
                        src={URL.createObjectURL(selectedImageFile)}
                        alt={selectedImageFile.name}
                        className="h-32 w-32 object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                          Lihat Gambar
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{selectedImageFile.name}</p>
                      <p className="text-sm text-gray-500">Belum diunggah — akan diupload saat menyimpan</p>
                    </div>
                  </div>
                ) : productData.Gambar ? (
                  <div className="group flex items-center gap-4">
                    <div className="relative cursor-zoom-in overflow-hidden rounded border border-gray-200 bg-white">
                      <img
                        src={(() => {
                          try {
                            const url = String(productData.Gambar);
                            const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
                            if (m && m[1]) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
                            return url;
                          } catch {
                            return '';
                          }
                        })()}
                        alt={productData.GambarNama || 'Gambar produk'}
                        className="h-32 w-32 object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
                          Lihat Gambar
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">{productData.GambarNama || 'Gambar tersimpan'}</p>
                      <p className="text-sm text-gray-500">Tidak memilih file baru</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Belum ada gambar</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t pt-8 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Detail Komposisi Benang</h2>
            </div>
            <div className="h-1 w-20 bg-gradient-to-r from-amber-500 to-orange-600 rounded "></div>

            <div className="mb-4 mt-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Benang Lusi</label>
              <input
                type="text"
                value={spesifikasiData.BenangLusi}
                onChange={(e) => setSpesifikasiData({ ...spesifikasiData, BenangLusi: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200"
                placeholder="Benang lusi"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Benang Pakan</label>
              <input
                type="text"
                value={spesifikasiData.BenangPakan}
                onChange={(e) => setSpesifikasiData({ ...spesifikasiData, BenangPakan: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200"
                placeholder="Benang pakan"
              />
            </div>

            <h3 className="text-lg font-bold mb-6 text-gray-700 mt-6">Komposisi (%)</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'Poly', label: 'Poly' },
                { key: 'CD', label: 'CD' },
                { key: 'Ray', label: 'Ray' },
                { key: 'Nyl', label: 'Nyl' },
                { key: 'PU', label: 'PU' },
                { key: 'Ros', label: 'Ros' },
                { key: 'Tac', label: 'Tac' },
                { key: 'Dope', label: 'Dope' },
                { key: 'RW', label: 'RW' },
                { key: 'RF', label: 'RF' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-gray-700 text-sm font-bold mb-2">{label}</label>
                  <input
                    type={key === 'RW' || key === 'RF' ? 'text' : 'number'}
                    value={spesifikasiData[key as keyof SpesifikasiRecord] || ''}
                    onChange={(e) =>
                      setSpesifikasiData({
                        ...spesifikasiData,
                        [key]: key === 'RW' || key === 'RF'
                          ? e.target.value
                          : (e.target.value === '' ? 0 : Number(e.target.value)),
                      })
                    }
                    step={key === 'RW' || key === 'RF' ? undefined : '0.01'}
                    min={key === 'RW' || key === 'RF' ? undefined : '0'}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-8 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Konstruksi Tenun</h2>
            </div>
            <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded mt-2"></div>

            <div className="mb-4 mt-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">Weave Constr *</label>
              <input
                type="text"
                value={konstruksiData.WeaveConstr}
                onChange={(e) => setKonstruksiData({ ...konstruksiData, WeaveConstr: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                placeholder="Masukkan weave constr"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Density Warp</label>
              <input
                type="number"
                value={konstruksiData.DensityWarp || ''}
                onChange={(e) => setKonstruksiData({ ...konstruksiData, DensityWarp: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                placeholder="Masukkan density warp"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Density Weft</label>
              <input
                type="number"
                value={konstruksiData.DensityWeft || ''}
                onChange={(e) => setKonstruksiData({ ...konstruksiData, DensityWeft: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                placeholder="Masukkan density weft"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Nomor Sisir</label>
              <input
                type="number"
                value={konstruksiData.NomorSisir || ''}
                onChange={(e) => setKonstruksiData({ ...konstruksiData, NomorSisir: e.target.value === '' ? 0 : Number(e.target.value) })}
                step="0.01"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                placeholder="Masukkan nomor sisir"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Lebar Sisir</label>
              <input
                type="number"
                value={konstruksiData.LebarSisir || ''}
                onChange={(e) => setKonstruksiData({ ...konstruksiData, LebarSisir: e.target.value === '' ? 0 : Number(e.target.value) })}
                step="0.01"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all duration-200"
                placeholder="Masukkan lebar sisir"
              />
            </div>
          </div>

          <div className="border-t pt-8 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Parameter Fisik Kain</h2>
            </div>
            <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded mt-2"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Width (Cm)</label>
                <input
                  type="text"
                  value={parameterFisikData.WidthCm || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, WidthCm: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Width (cm)"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Lebar Act</label>
                <input
                  type="number"
                  value={parameterFisikData.LebarAct || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, LebarAct: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Lebar act"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Berat Bulatan</label>
                <input
                  type="number"
                  value={parameterFisikData.BeratBulatan || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, BeratBulatan: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Berat bulatan"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Gr/L Yd</label>
                <input
                  type="number"
                  value={parameterFisikData.GrLYd || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, GrLYd: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Gr/L Yd"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Gr/Sqm</label>
                <input
                  type="number"
                  value={parameterFisikData.GrSqm || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, GrSqm: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Gr/Sqm"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Gr/L Mtr</label>
                <input
                  type="number"
                  value={parameterFisikData.GrLMtr || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, GrLMtr: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Gr/L Mtr"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Gr/SqYd</label>
                <input
                  type="number"
                  value={parameterFisikData.GrSqYd || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, GrSqYd: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Gr/SqYd"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Oz/L Yd</label>
                <input
                  type="number"
                  value={parameterFisikData.OzLYd || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, OzLYd: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Oz/L Yd"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Oz/SqYd</label>
                <input
                  type="number"
                  value={parameterFisikData.OzSqYd || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, OzSqYd: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Oz/SqYd"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">L/Yd 58 inch</label>
                <input
                  type="number"
                  value={parameterFisikData.LYd58Inch || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, LYd58Inch: e.target.value === '' ? 0 : Number(e.target.value) })}
                  step="0.01"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="L/Yd 58 inch"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Corak 6 Angka</label>
                <input
                  type="text"
                  value={parameterFisikData.Corak6Angka || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, Corak6Angka: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Corak 6 angka"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Warna</label>
                <input
                  type="text"
                  value={parameterFisikData.Warna || ''}
                  onChange={(e) => setParameterFisikData({ ...parameterFisikData, Warna: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 leading-tight focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                  placeholder="Warna"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8 mb-8">
          <Link
            href={`/detail/${id}?from=${fromPage}`}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-200 text-center shadow-md hover:shadow-lg"
          >
            Batal
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Menyimpan...
              </span>
            ) : (
              'Simpan Perubahan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
