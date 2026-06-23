export interface ProductRecord {
  IdProduksi?: number;
  IdSampel?: number;
  Design: string;
  StokSampel?: number;
  Lemari: string;
  RakHanger?: string;
  BrandNameNote?: string;
  TanggalProduksi?: string;
  Keterangan?: string;
  Gambar?: string;
  GambarNama?: string;
  CreatedAt?: string;
}

export interface SpesifikasiRecord {
  IdBenang?: number;
  IdSampel: number;
  BenangLusi: string;
  BenangPakan: string;
  Poly?: number;
  CD?: number;
  Ray?: number;
  RW?: string;
  RF?: string;
  Nyl?: number;
  PU?: number;
  Ros?: number;
  Tac?: number;
  Dope?: number;
  CreatedAt?: string;
}

export interface KonstruksiTenunRecord {
  IdKonstruksi?: number;
  IdSampel: number;
  WeaveConstr: string;
  Density?: string;
  DensityWarp: number;
  DensityWeft: number;
  NomorSisir?: number;
  LebarSisir?: number;
  CreatedAt?: string;
}

export interface ParameterFisikRecord {
  IdFisik?: number;
  IdSampel: number;
  Corak6Angka?: string;
  Warna?: string;
  WidthCm: string;
  LebarAct: number;
  BeratBulatan: number;
  GrLYd: number;
  GrSqm: number;
  GrLMtr: number;
  GrSqYd: number;
  OzLYd: number;
  OzSqYd: number;
  LYd58Inch: number;
  CreatedAt?: string;
}
