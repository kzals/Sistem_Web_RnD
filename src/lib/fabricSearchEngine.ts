/**
 * FABRIC SEARCH ENGINE
 * 
 * Core logic untuk search kain berdasarkan deskripsi natural language.
 * Menggunakan config dari fabricMappings.ts
 */

import { getConnection, sql } from '@/lib/db';
import { 
  fabricMappingConfig, 
  detectUseCase, 
  detectProperties,
  type FabricSpecs 
} from '@/config/fabricMappings';

export interface SearchResult {
  IdProduksi?: number;
  IdSampel: number;
  Design: string;
  Gambar?: string;
  GambarNama?: string;
  Lemari?: string;
  RakHanger?: string;
  BrandNameNote?: string;
  
  Keterangan?: string;

  // Spesifikasi
  BenangLusi?: string;
  BenangPakan?: string;
  Poly?: number;
  CD?: number;
  Ray?: number;
  Nyl?: number;
  PU?: number;
  Ros?: number;
  Tac?: number;
  Dope?: number;
  
  // Konstruksi
  WeaveConstr?: string;
  DensityWarp?: number;
  DensityWeft?: number;
  
  // Parameter Fisik
  WidthCm?: string;
  LebarAct?: number;
  BeratBulatan?: number;
  GrLYd?: number;
  GrSqm?: number;
  GrLMtr?: number;
  GrSqYd?: number;
  OzLYd?: number;
  OzSqYd?: number;
  LYd58Inch?: number;
  
  // Scoring
  matchScore?: number;
  matchPercentage?: number;
  matchedUseCase?: string;
  matchedProperties?: string[];
}

export interface SearchResponse {
  success: boolean;
  query: string;
  detectedUseCase: string | null;
  detectedProperties: string[];
  results: SearchResult[];
  resultCount: number;
  confidence: 'Tinggi' | 'Sedang' | 'Rendah';
  configVersion: string;
  message?: string;
}

/**
 * Merge dua range: ambil min tertinggi dan max terendah (intersection)
 * Jika tidak overlap, gunakan yang lebih luas
 */
function mergeRanges(a?: { min: number; max: number }, b?: { min: number; max: number }): { min: number; max: number } | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return {
    min: Math.max(a.min, b.min),
    max: Math.min(a.max, b.max),
  };
}

/**
 * Build WHERE clause dari FabricSpecs
 */
function buildWhereClause(specs: FabricSpecs): { 
  clause: string; 
  weaveValues: string[];
  polyMin?: number; polyMax?: number;
  cdMin?: number; cdMax?: number;
  rayMin?: number; rayMax?: number;
  densWarpMin?: number; densWarpMax?: number;
  densWeftMin?: number; densWeftMax?: number;
  grSqmMin?: number; grSqmMax?: number;
} {
  const conditions: string[] = [];
  const result: any = { clause: '', weaveValues: [] };
  
  if (specs.weaveConstr && specs.weaveConstr.length > 0) {
    const placeholders = specs.weaveConstr.map((_, idx) => `@weave${idx}`).join(', ');
    conditions.push(`k.Weave_Constr IN (${placeholders})`);
    result.weaveValues = specs.weaveConstr;
  }
  
  if (specs.poly) {
    conditions.push(`s.Poly BETWEEN @polyMin AND @polyMax`);
    result.polyMin = specs.poly.min;
    result.polyMax = specs.poly.max;
  }
  
  if (specs.cd) {
    conditions.push(`s.CD BETWEEN @cdMin AND @cdMax`);
    result.cdMin = specs.cd.min;
    result.cdMax = specs.cd.max;
  }
  
  if (specs.ray) {
    conditions.push(`s.Ray BETWEEN @rayMin AND @rayMax`);
    result.rayMin = specs.ray.min;
    result.rayMax = specs.ray.max;
  }
  
  if (specs.densityWarp) {
    conditions.push(`k.Density_Warp BETWEEN @densWarpMin AND @densWarpMax`);
    result.densWarpMin = specs.densityWarp.min;
    result.densWarpMax = specs.densityWarp.max;
  }
  
  if (specs.densityWeft) {
    conditions.push(`k.Density_Weft BETWEEN @densWeftMin AND @densWeftMax`);
    result.densWeftMin = specs.densityWeft.min;
    result.densWeftMax = specs.densityWeft.max;
  }
  
  if (specs.grSqm) {
    conditions.push(`p.Gr_Sqm BETWEEN @grSqmMin AND @grSqmMax`);
    result.grSqmMin = specs.grSqm.min;
    result.grSqmMax = specs.grSqm.max;
  }
  
  result.clause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
  return result;
}

/**
 * Execute search query
 */
async function executeSearchQuery(
  clause: string,
  weaveValues: string[],
  polyMin?: number, polyMax?: number,
  cdMin?: number, cdMax?: number,
  rayMin?: number, rayMax?: number,
  densWarpMin?: number, densWarpMax?: number,
  densWeftMin?: number, densWeftMax?: number,
  grSqmMin?: number, grSqmMax?: number
): Promise<SearchResult[]> {
  const pool = await getConnection();
  
  const query = `
    SELECT TOP 200
      m.ID_Sampel as IdProduksi,
      m.ID_Sampel as IdSampel,
      m.Design,
      m.Gambar as Gambar,
      NULL as GambarNama,
      m.Lemari as Lemari,
      m.Rak_Hanger as RakHanger,
      m.Brand_Name_NOTE as BrandNameNote,
      m.Keterangan as Keterangan,
      s.Benang_Lusi as BenangLusi,
      s.Benang_Pakan as BenangPakan,
      s.Poly,
      s.CD,
      s.Ray,
      s.Nyl,
      s.PU,
      s.Ros,
      s.Tac,
      s.Dope,
      k.Weave_Constr as WeaveConstr,
      k.Density_Warp as DensityWarp,
      k.Density_Weft as DensityWeft,
      p.Width_Cm as WidthCm,
      p.Lebar_Act as LebarAct,
      p.Berat_Bulatan as BeratBulatan,
      p.Gr_L_Yd as GrLYd,
      p.Gr_Sqm as GrSqm,
      p.Gr_L_Mtr as GrLMtr,
      p.Gr_SqYd as GrSqYd,
      p.Oz_LYd as OzLYd,
      p.Oz_SqYd as OzSqYd,
      p.LYd_58_inch as LYd58Inch
    FROM Master_Produk m
    LEFT JOIN Spesifikasi s ON m.ID_Sampel = s.ID_Sampel
    LEFT JOIN Konstruksi_Tenun k ON m.ID_Sampel = k.ID_Sampel
    LEFT JOIN Parameter_Fisik p ON m.ID_Sampel = p.ID_Sampel
    WHERE ${clause}
    ORDER BY m.Design ASC
  `;
  
  let request = pool.request();
  
  // Bind weave values
  weaveValues.forEach((value, idx) => {
    request = request.input(`weave${idx}`, sql.VarChar(100), value);
  });
  
  // Bind numeric parameters
  if (polyMin !== undefined && polyMax !== undefined) {
    request = request.input('polyMin', sql.Decimal(10, 2), polyMin);
    request = request.input('polyMax', sql.Decimal(10, 2), polyMax);
  }
  
  if (cdMin !== undefined && cdMax !== undefined) {
    request = request.input('cdMin', sql.Decimal(10, 2), cdMin);
    request = request.input('cdMax', sql.Decimal(10, 2), cdMax);
  }
  
  if (rayMin !== undefined && rayMax !== undefined) {
    request = request.input('rayMin', sql.Decimal(10, 2), rayMin);
    request = request.input('rayMax', sql.Decimal(10, 2), rayMax);
  }
  
  if (densWarpMin !== undefined && densWarpMax !== undefined) {
    request = request.input('densWarpMin', sql.Decimal(10, 2), densWarpMin);
    request = request.input('densWarpMax', sql.Decimal(10, 2), densWarpMax);
  }
  
  if (densWeftMin !== undefined && densWeftMax !== undefined) {
    request = request.input('densWeftMin', sql.Decimal(10, 2), densWeftMin);
    request = request.input('densWeftMax', sql.Decimal(10, 2), densWeftMax);
  }
  
  if (grSqmMin !== undefined && grSqmMax !== undefined) {
    request = request.input('grSqmMin', sql.Decimal(10, 2), grSqmMin);
    request = request.input('grSqmMax', sql.Decimal(10, 2), grSqmMax);
  }
  
  const result = await request.query(query);
  return result.recordset;
}

function extractKeywordTokens(userQuery: string): string[] {
  return userQuery
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9_-]/g, ''))
    .filter((token) => token.length > 0)
    .slice(0, 6);
}

async function executeKeywordSearchQuery(tokens: string[]): Promise<SearchResult[]> {
  if (tokens.length === 0) {
    return [];
  }

  const pool = await getConnection();
  const conditions = tokens
    .map((_, index) => `(
      CAST(m.ID_Sampel AS VARCHAR(50)) LIKE @kw${index} 
      OR m.Design LIKE @kw${index}
      OR m.Keterangan LIKE @kw${index}
      OR m.Brand_Name_NOTE LIKE @kw${index}
    )`)
    .join(' OR ');

  const query = `
    SELECT TOP 200
      m.ID_Sampel as IdProduksi,
      m.ID_Sampel as IdSampel,
      m.Design,
      m.Gambar as Gambar,
      NULL as GambarNama,
      m.Lemari as Lemari,
      m.Rak_Hanger as RakHanger,
      m.Brand_Name_NOTE as BrandNameNote,
      m.Keterangan as Keterangan,
      s.Benang_Lusi as BenangLusi,
      s.Benang_Pakan as BenangPakan,
      s.Poly,
      s.CD,
      s.Ray,
      s.Nyl,
      s.PU,
      s.Ros,
      s.Tac,
      s.Dope,
      k.Weave_Constr as WeaveConstr,
      k.Density_Warp as DensityWarp,
      k.Density_Weft as DensityWeft,
      p.Width_Cm as WidthCm,
      p.Lebar_Act as LebarAct,
      p.Berat_Bulatan as BeratBulatan,
      p.Gr_L_Yd as GrLYd,
      p.Gr_Sqm as GrSqm,
      p.Gr_L_Mtr as GrLMtr,
      p.Gr_SqYd as GrSqYd,
      p.Oz_LYd as OzLYd,
      p.Oz_SqYd as OzSqYd,
      p.LYd_58_inch as LYd58Inch
    FROM Master_Produk m
    LEFT JOIN Spesifikasi s ON m.ID_Sampel = s.ID_Sampel
    LEFT JOIN Konstruksi_Tenun k ON m.ID_Sampel = k.ID_Sampel
    LEFT JOIN Parameter_Fisik p ON m.ID_Sampel = p.ID_Sampel
    WHERE ${conditions}
    ORDER BY m.Design ASC
  `;

  const request = tokens.reduce((acc, token, index) => {
    acc.input(`kw${index}`, sql.VarChar(100), `%${token}%`);
    return acc;
  }, pool.request());

  const result = await request.query(query);
  return result.recordset;
}

function calculateKeywordBoost(result: SearchResult, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const idProduksi = String(result.IdProduksi ?? result.IdSampel ?? '').toLowerCase();
  const design = String(result.Design || '').toLowerCase();

  return tokens.reduce((boost, token) => {
    if (!token) return boost;
    if (idProduksi === token) return boost + 100;
    if (idProduksi.includes(token)) return boost + 60;
    if (design.includes(token)) return boost + 25;
    return boost;
  }, 0);
}

function mergeUniqueResults(primary: SearchResult[], secondary: SearchResult[]): SearchResult[] {
  const seen = new Set<number>();
  const merged: SearchResult[] = [];

  [...primary, ...secondary].forEach((result) => {
    if (seen.has(result.IdSampel)) {
      return;
    }
    seen.add(result.IdSampel);
    merged.push(result);
  });

  return merged;
}

/**
 * Main search function
 */
export async function searchFabric(userQuery: string): Promise<SearchResponse> {
  try {
    const keywordTokens = extractKeywordTokens(userQuery);

    const keywordResults = keywordTokens.length > 0
      ? await executeKeywordSearchQuery(keywordTokens)
      : [];

    // 1. Detect use case dari query
    const useCaseKey = detectUseCase(userQuery);
    
    // 2. Detect properties dari query
    const properties = detectProperties(userQuery);
    
    // 3. Run searches — UNION approach
    //    Jalankan pencarian terpisah untuk use case dan properties,
    //    lalu gabungkan semua hasil (UNION, bukan INTERSECTION)
    let confidence: 'Tinggi' | 'Sedang' | 'Rendah' = 'Rendah';
    
    const useCase = useCaseKey ? fabricMappingConfig.useCases[useCaseKey] : null;
    
    // Kumpulkan specs dari use case dan/atau properties
    const querySpecsList: FabricSpecs[] = [];
    
    if (useCase) {
      querySpecsList.push(useCase.specs);
    }
    
    if (properties.length > 0) {
      const propertySpecs: FabricSpecs[] = properties.map(
        prop => fabricMappingConfig.propertyMappings[prop]?.indicators || {}
      );
      
      const mergedPropertySpecs = propertySpecs.reduce((acc, spec) => {
        return {
          ...acc,
          ...spec,
          weaveConstr: [...(acc.weaveConstr || []), ...(spec.weaveConstr || [])].filter((v, i, a) => a.indexOf(v) === i)
        };
      }, {} as FabricSpecs);
      
      querySpecsList.push(mergedPropertySpecs);
    }
    
    // Bangun combined specs untuk scoring (gabungan semua specs)
    const combinedSpecs: FabricSpecs = querySpecsList.reduce((acc, specs) => {
      return {
        ...acc,
        ...specs,
        weaveConstr: [...(acc.weaveConstr || []), ...(specs.weaveConstr || [])]
          .filter((v, i, a) => a.indexOf(v) === i)
      };
    }, {} as FabricSpecs);
    
    if (useCase) {
      confidence = useCase.accuracy >= 70 ? 'Tinggi' : useCase.accuracy >= 60 ? 'Sedang' : 'Rendah';
    } else if (properties.length > 0) {
      confidence = 'Sedang';
    }
    
    // 4. Execute queries — UNION: jalankan semua dan gabung hasil
    let allSemanticResults: SearchResult[] = [];
    
    for (const specs of querySpecsList) {
      if (Object.keys(specs).length === 0) continue;
      const whereParams = buildWhereClause(specs);
      const batch = await executeSearchQuery(
        whereParams.clause,
        whereParams.weaveValues,
        whereParams.polyMin, whereParams.polyMax,
        whereParams.cdMin, whereParams.cdMax,
        whereParams.rayMin, whereParams.rayMax,
        whereParams.densWarpMin, whereParams.densWarpMax,
        whereParams.densWeftMin, whereParams.densWeftMax,
        whereParams.grSqmMin, whereParams.grSqmMax
      );
      if (batch.length > 0) {
        allSemanticResults = mergeUniqueResults(allSemanticResults, batch);
      }
    }
    
    // Fallback jika tidak ada specs atau hasil kosong
    if (allSemanticResults.length === 0) {
      if (keywordResults.length === 0) {
        allSemanticResults = await executeSearchQuery('1=1', []);
        confidence = 'Rendah';
      }
    }
    
    // Gabung keyword + semantic (semantic selalu diutamakan)
    let results: SearchResult[] = keywordResults.length > 0
      ? mergeUniqueResults(keywordResults, allSemanticResults)
      : allSemanticResults;
    
    // 5. Calculate match scores
    const propertyBoost = Math.min(properties.length * 5, 20);

    results = results.map(result => {
      const score = calculateMatchScore(result, combinedSpecs) + calculateKeywordBoost(result, keywordTokens) + propertyBoost;
      return {
        ...result,
        matchScore: score,
        matchPercentage: Math.min(score, 100),
        matchedUseCase: useCaseKey || undefined,
        matchedProperties: properties
      };
    });
    
    // Sort by match score
    results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    
    return {
      success: true,
      query: userQuery,
      detectedUseCase: useCaseKey,
      detectedProperties: properties,
      results,
      resultCount: results.length,
      confidence,
      configVersion: fabricMappingConfig.version,
      message: `Ditemukan ${results.length} kain`
    };
    
  } catch (error: any) {
    console.error('Search error:', error);
    return {
      success: false,
      query: userQuery,
      detectedUseCase: null,
      detectedProperties: [],
      results: [],
      resultCount: 0,
      confidence: 'Rendah',
      configVersion: fabricMappingConfig.version,
      message: 'Gagal melakukan pencarian: ' + error.message
    };
  }
}

/**
 * Calculate match score (0-100)
 */
function calculateMatchScore(result: SearchResult, specs: FabricSpecs): number {
  let score = 0;
  let maxScore = 0;
  
  // Weave match (weight: 30)
  if (specs.weaveConstr && specs.weaveConstr.length > 0) {
    maxScore += 30;
    if (result.WeaveConstr && specs.weaveConstr.includes(result.WeaveConstr)) {
      score += 30;
    }
  }
  
  // Poly match (weight: 20)
  if (specs.poly && result.Poly !== undefined && result.Poly !== null) {
    maxScore += 20;
    if (result.Poly >= specs.poly.min && result.Poly <= specs.poly.max) {
      score += 20;
    } else {
      // Partial score if close
      const distance = Math.min(
        Math.abs(result.Poly - specs.poly.min),
        Math.abs(result.Poly - specs.poly.max)
      );
      if (distance <= 10) {
        score += 10;
      }
    }
  }
  
  // CD match (weight: 20)
  if (specs.cd && result.CD !== undefined && result.CD !== null) {
    maxScore += 20;
    if (result.CD >= specs.cd.min && result.CD <= specs.cd.max) {
      score += 20;
    }
  }
  
  // Ray match (weight: 15)
  if (specs.ray && result.Ray !== undefined && result.Ray !== null) {
    maxScore += 15;
    if (result.Ray >= specs.ray.min && result.Ray <= specs.ray.max) {
      score += 15;
    }
  }
  
  // Nyl match (weight: 5) — untuk properti stretch
  if (specs.nyl && result.Nyl !== undefined && result.Nyl !== null) {
    maxScore += 5;
    if (result.Nyl >= specs.nyl.min && result.Nyl <= specs.nyl.max) {
      score += 5;
    }
  }
  
  // Density match (weight: 10)
  if (specs.densityWarp && result.DensityWarp !== undefined && result.DensityWarp !== null) {
    maxScore += 5;
    if (result.DensityWarp >= specs.densityWarp.min && result.DensityWarp <= specs.densityWarp.max) {
      score += 5;
    }
  }
  
  if (specs.densityWeft && result.DensityWeft !== undefined && result.DensityWeft !== null) {
    maxScore += 5;
    if (result.DensityWeft >= specs.densityWeft.min && result.DensityWeft <= specs.densityWeft.max) {
      score += 5;
    }
  }
  
  // Gr/Sqm match (weight: 10)
  if (specs.grSqm && result.GrSqm !== undefined && result.GrSqm !== null) {
    maxScore += 10;
    if (result.GrSqm >= specs.grSqm.min && result.GrSqm <= specs.grSqm.max) {
      score += 10;
    } else {
      // Partial score if within 20% of range
      const range = specs.grSqm.max - specs.grSqm.min;
      const mid = (specs.grSqm.max + specs.grSqm.min) / 2;
      const distance = Math.abs(Number(result.GrSqm) - mid);
      if (distance <= range * 0.5) {
        score += 5;
      }
    }
  }
  
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 50;
}
