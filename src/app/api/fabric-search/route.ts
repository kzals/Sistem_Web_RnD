import { NextRequest, NextResponse } from 'next/server';
import { searchFabric } from '@/lib/fabricSearchEngine';

/**
 * POST /api/fabric-search
 * 
 * Search kain berdasarkan deskripsi natural language
 * 
 * Request body:
 * {
 *   "query": "kain untuk jas formal yang elegan"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "query": "kain untuk jas formal yang elegan",
 *   "detectedUseCase": "formal_suit",
 *   "detectedProperties": ["formal", "wrinkle_resistant"],
 *   "results": [...],
 *   "resultCount": 15,
 *   "confidence": "Tinggi",
 *   "configVersion": "1.0",
 *   "message": "Ditemukan 15 kain untuk: Jas Formal"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query pencarian harus diisi' 
        },
        { status: 400 }
      );
    }

    // Execute search
    const searchResult = await searchFabric(query.trim());

    // Log for analytics (optional - bisa diaktifkan nanti)
    console.log('Fabric search:', {
      query: query.trim(),
      useCase: searchResult.detectedUseCase,
      properties: searchResult.detectedProperties,
      resultCount: searchResult.resultCount,
      confidence: searchResult.confidence
    });

    return NextResponse.json(searchResult);

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan saat mencari: ' + error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fabric-search
 * 
 * Get config info (untuk debugging/monitoring)
 */
export async function GET(request: NextRequest) {
  const { fabricMappingConfig } = await import('@/config/fabricMappings');
  
  return NextResponse.json({
    version: fabricMappingConfig.version,
    lastUpdated: fabricMappingConfig.lastUpdated,
    note: fabricMappingConfig.note,
    useCaseCount: Object.keys(fabricMappingConfig.useCases).length,
    propertyCount: Object.keys(fabricMappingConfig.propertyMappings).length,
    useCases: Object.entries(fabricMappingConfig.useCases).map(([key, uc]) => ({
      key,
      name: uc.name,
      accuracy: uc.accuracy,
      expertReview: uc.expertReview
    }))
  });
}
