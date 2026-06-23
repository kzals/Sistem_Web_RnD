/**
 * FABRIC MAPPING CONFIG v1.0
 * 
 * File ini berisi mapping dari kata kunci pencarian ke spesifikasi kain.
 * Update file ini untuk refine mapping tanpa perlu ubah code.
 * 
 * Last Updated: 2026-03-05
 * Next Review: Setelah expert validation
 */

export interface FabricSpecs {
  weaveConstr?: string[];
  poly?: { min: number; max: number };
  cd?: { min: number; max: number };
  ray?: { min: number; max: number };
  nyl?: { min: number; max: number };
  densityWarp?: { min: number; max: number };
  densityWeft?: { min: number; max: number };
  grSqm?: { min: number; max: number };
}

export interface UseCase {
  name: string;
  keywords: string[];
  description: string;
  specs: FabricSpecs;
  priority: number;
  accuracy: number;
  lastReviewBy: string;
  expertReview: string | null;
}

export interface PropertyMapping {
  fields: string[];
  description: string;
  indicators: FabricSpecs;
}

export interface FabricMappingConfig {
  version: string;
  lastUpdated: string;
  note: string;
  useCases: Record<string, UseCase>;
  propertyMappings: Record<string, PropertyMapping>;
}

/**
 * MAIN CONFIGURATION
 * Range dibuat agak lebar untuk minimize false negative di v1.0
 */
export const fabricMappingConfig: FabricMappingConfig = {
  version: '1.0',
  lastUpdated: '2026-03-05',
  note: 'Mapping v1 - Perlu validasi expert tekstil. Range dibuat konservatif.',

  useCases: {
    office_uniform: {
      name: 'Seragam Kantor',
      keywords: ['seragam kantor', 'pakaian kantor', 'kemeja kantor', 'kantor', 'office'],
      description: 'Kain untuk seragam/kemeja kantor yang rapi, profesional, dan nyaman',
      specs: {
        weaveConstr: ['Twill', 'Satin', 'Plain'],
        poly: { min: 30, max: 60 },
        cd: { min: 30, max: 55 },
        ray: { min: 10, max: 35 }
      },
      priority: 40,
      accuracy: 65,
      lastReviewBy: 'System',
      expertReview: null
    },

    formal_suit: {
      name: 'Jas Formal',
      keywords: ['jas', 'formal', 'suit', 'blazer', 'jas formal'],
      description: 'Kain untuk jas formal yang elegan dan anti-kusut',
      specs: {
        weaveConstr: ['Twill', 'Satin', 'Sateen'],
        poly: { min: 28, max: 52 },
        cd: { min: 33, max: 58 }
      },
      priority: 50,
      accuracy: 60,
      lastReviewBy: 'System',
      expertReview: null
    },

    outdoor_uniform: {
      name: 'Seragam Lapangan',
      keywords: ['lapangan', 'outdoor', 'kerja lapangan', 'seragam lapangan'],
      description: 'Kain untuk kerja lapangan yang kuat dan tahan lama',
      specs: {
        weaveConstr: ['Twill', 'Canvas', 'Plain'],
        poly: { min: 50, max: 85 },
        cd: { min: 15, max: 45 }
      },
      priority: 45,
      accuracy: 65,
      lastReviewBy: 'System',
      expertReview: null
    },

    school_uniform: {
      name: 'Seragam Sekolah',
      keywords: ['sekolah', 'seragam sekolah', 'baju sekolah'],
      description: 'Kain untuk seragam sekolah yang nyaman dan tidak mudah kusut',
      specs: {
        weaveConstr: ['Plain', 'Twill'],
        poly: { min: 38, max: 68 },
        cd: { min: 28, max: 48 },
        ray: { min: 8, max: 28 }
      },
      priority: 35,
      accuracy: 60,
      lastReviewBy: 'System',
      expertReview: null
    },

    casual_wear: {
      name: 'Pakaian Casual',
      keywords: ['casual', 'santai', 'kaos', 'informal', 'harian'],
      description: 'Kain untuk pakaian casual yang nyaman',
      specs: {
        weaveConstr: ['Jersey', 'Plain', 'Knit'],
        poly: { min: 45, max: 75 },
        cd: { min: 20, max: 45 }
      },
      priority: 30,
      accuracy: 65,
      lastReviewBy: 'System',
      expertReview: null
    },

    sport_wear: {
      name: 'Pakaian Olahraga',
      keywords: ['olahraga', 'sport', 'gym', 'aktif', 'running', 'lari'],
      description: 'Kain untuk pakaian olahraga yang breathable dan stretch',
      specs: {
        weaveConstr: ['Jersey', 'Knit'],
        poly: { min: 55, max: 85 },
        cd: { min: 15, max: 35 }
      },
      priority: 40,
      accuracy: 70,
      lastReviewBy: 'System',
      expertReview: null
    },

    evening_wear: {
      name: 'Pakaian Pesta',
      keywords: ['pesta', 'gaun', 'evening', 'malam', 'elegan'],
      description: 'Kain untuk pakaian pesta yang elegan dan mengkilap',
      specs: {
        weaveConstr: ['Satin', 'Sateen', 'Twill'],
        poly: { min: 28, max: 55 },
        ray: { min: 18, max: 45 }
      },
      priority: 35,
      accuracy: 60,
      lastReviewBy: 'System',
      expertReview: null
    }
  },

  propertyMappings: {
    wrinkle_resistant: {
      fields: ['Weave_Constr'],
      description: 'Anti-kusut / tidak mudah lecek / tahan kerut',
      indicators: {
        weaveConstr: ['Twill', 'Satin']
      }
    },

    breathable: {
      fields: ['CD', 'Ray'],
      description: 'Sejuk / tidak panas / breathable / menyerap keringat',
      indicators: {
        cd: { min: 28, max: 55 },
        ray: { min: 12, max: 50 }
      }
    },

    durable: {
      fields: ['Poly', 'Weave_Constr'],
      description: 'Kuat / tahan lama / tidak mudah sobek',
      indicators: {
        poly: { min: 45, max: 88 },
        weaveConstr: ['Twill', 'Canvas']
      }
    },

    lightweight: {
      fields: ['Gr_Sqm'],
      description: 'Ringan / tidak berat',
      indicators: {
        grSqm: { min: 0, max: 210 }
      }
    },

    formal: {
      fields: ['Weave_Constr', 'Poly', 'CD'],
      description: 'Rapi / profesional / formal',
      indicators: {
        weaveConstr: ['Twill', 'Satin', 'Sateen'],
        poly: { min: 28, max: 55 },
        cd: { min: 32, max: 58 }
      }
    },

    shiny: {
      fields: ['Weave_Constr'],
      description: 'Mengkilap / glossy / berkilau',
      indicators: {
        weaveConstr: ['Satin', 'Sateen']
      }
    },

    colorfast: {
      fields: ['Poly'],
      description: 'Tidak mudah pudar / tahan warna / tahan luntur',
      indicators: {
        poly: { min: 38, max: 75 }
      }
    },

    drape: {
      fields: ['Gr_Sqm', 'Weave_Constr', 'Ray'],
      description: 'Jatuh / melayang / drape',
      indicators: {
        grSqm: { min: 60, max: 200 },
        weaveConstr: ['Satin', 'Plain'],
        ray: { min: 15, max: 50 }
      }
    },

    soft: {
      fields: ['Ray', 'Weave_Constr'],
      description: 'Lembut / halus / nyaman di kulit',
      indicators: {
        ray: { min: 20, max: 50 },
        weaveConstr: ['Satin', 'Plain', 'Jersey', 'Knit']
      }
    },

    stretch: {
      fields: ['Nyl', 'Weave_Constr'],
      description: 'Melar / elastis / stretch',
      indicators: {
        nyl: { min: 1, max: 100 },
        weaveConstr: ['Jersey', 'Knit']
      }
    },

    water_resistant: {
      fields: ['Poly', 'Weave_Constr'],
      description: 'Anti air / tahan air / waterproof',
      indicators: {
        poly: { min: 60, max: 100 },
        weaveConstr: ['Plain', 'Twill']
      }
    }
  }
};

const STOPWORDS = new Set([
  'dan', 'atau', 'yang', 'di', 'ke', 'dengan', 'untuk', 'pada',
  'ini', 'itu', 'dari', 'saya', 'kami', 'kita', 'sebagai', 'oleh',
  'dalam', 'secara', 'sebuah', 'sangat', 'bisa', 'dapat', 'akan',
  'telah', 'sudah', 'sedang', 'lagi', 'juga', 'serta', 'agar',
  'supaya', 'karena', 'sebab', 'maka', 'sehingga', 'adalah',
  'ialah', 'yakni', 'yaitu', 'antara', 'melalui', 'tanpa',
  'setelah', 'sebelum', 'ketika', 'saat', 'selama', 'tentang',
  'mengenai', 'seperti', 'bagaikan', 'anda', 'dia',
  'merupakan', 'berupa', 'kain', 'karakteristik', 'memiliki',
  'mempunyai', 'bersifat', 'berkarakteristik', 'ciri'
]);

function stemWord(word: string): string {
  return word
    .replace(/-(an|kan|i|nya|ku|mu)$/, '')
    .replace(/(an|kan|i|nya|ku|mu)$/, '');
}

/**
 * Expanded property keyword mapping untuk phrase-based dan token-based matching
 */
const PROPERTY_KEYWORDS: Record<string, string[]> = {
  wrinkle_resistant: [
    'tidak kusut', 'anti kusut', 'tidak lecek', 'tetap rapi',
    'tahan kerut', 'tahan kusut', 'anti kerut', 'bebas kusut',
    'tidak mudah kusut', 'anti lecek', 'rapi terus', 'bebas lecek',
    'wrinkle', 'wrinkle resistant', 'wrinkle free', 'anti wrinkle',
  ],
  breathable: [
    'nyaman', 'tidak panas', 'sejuk', 'adem', 'tidak gerah',
    'breathable', 'ventilasi', 'sirkulasi udara', 'dingin',
    'cool', 'fresh', 'segar', 'tipis dan sejuk', 'tidak sumpek',
  ],
  durable: [
    'kuat', 'tidak sobek', 'tahan lama', 'awet', 'durable',
    'daya tahan', 'kokoh', 'tebal', 'premium', 'kualitas baik',
    'tidak mudah sobek', 'tahan sobek', 'berkualitas', 'tahan dipakai',
    'kuat dan tahan lama',
  ],
  lightweight: [
    'ringan', 'tidak berat', 'lightweight', 'tipis',
    'summer', 'tropis', 'ringan dan tipis',
  ],
  formal: [
    'rapi', 'profesional', 'formal', 'elegan', 'resmi',
    'kantor', 'business', 'kerja', 'meeting', 'rapat',
    'professional', 'semi formal',
  ],
  shiny: [
    'mengkilap', 'shiny', 'glossy', 'kilau', 'berkilau',
    'mengkilat', 'gloss', 'silky', 'sutra', 'bercahaya',
    'glimmer', 'berkilap',
  ],
  colorfast: [
    'tidak pudar', 'warna tahan', 'tidak kusam', 'tahan cuci',
    'tahan luntur', 'tidak luntur', 'awet warna', 'warna stabil',
    'fade resistant', 'colorfast', 'tahan pudar',
  ],
  drape: [
    'drape', 'draping', 'jatuh', 'melayang', 'flowy',
    'fluid', 'mengalir', 'soft fall', 'drapes well',
    'berdrape', 'kain jatuh',
  ],
  soft: [
    'lembut', 'halus', 'soft', 'nyaman di kulit', 'smooth',
    'silky', 'mulus', 'enak dipakai', 'nyaman dipakai',
    'sutra', 'licin',
  ],
  stretch: [
    'stretch', 'melar', 'elastis', 'karet', 'regang',
    'spandex', 'fleksibel', 'muai', 'memanjang', 'elastik',
    'stretchy', 'elastic',
  ],
  water_resistant: [
    'anti air', 'water resistant', 'tahan air', 'water repellent',
    'waterproof', 'tahan hujan', 'kedap air', 'tidak tembus air',
    'anti air', 'tahan basah',
  ],
};

// Helper function untuk get use case by keywords
export function detectUseCase(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  
  const sortedUseCases = Object.entries(fabricMappingConfig.useCases)
    .sort(([, a], [, b]) => b.priority - a.priority);
  
  for (const [key, useCase] of sortedUseCases) {
    for (const keyword of useCase.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return key;
      }
    }
  }
  
  return null;
}

/**
 * Detect fabric properties from natural language query.
 * Menggunakan dua strategi:
 * 1. Phrase matching (includes) — untuk frasa eksak
 * 2. Token matching dengan stem — untuk kata individual
 */
export function detectProperties(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const detectedProps = new Set<string>();

  // === Pass 1: Phrase matching ===
  for (const [prop, keywords] of Object.entries(PROPERTY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        detectedProps.add(prop);
        break;
      }
    }
  }

  // === Pass 2: Token matching with stemming ===
  // Tokenize, filter stopwords, stem
  const tokens = lowerQuery
    .split(/[\s,.-]+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length > 2 && !STOPWORDS.has(t))
    .map(stemWord);

  const uniqueTokens = Array.from(new Set(tokens));

  for (const [prop, keywords] of Object.entries(PROPERTY_KEYWORDS)) {
    if (detectedProps.has(prop)) continue;

    // Extract single-word keywords and stem them
    const stemmedKeywords = keywords
      .flatMap(k => k.split(/\s+/))
      .filter(t => t.length > 2)
      .map(stemWord);
      const uniqueKeywordTokens = Array.from(new Set(stemmedKeywords));

    for (const token of uniqueTokens) {
      if (uniqueKeywordTokens.includes(token)) {
        detectedProps.add(prop);
        break;
      }
    }
  }

  return Array.from(detectedProps);
}

/**
 * Extended detectProperties yang juga mengembalikan tingkat keyakinan
 */
export function detectPropertiesWithConfidence(query: string): Array<{ key: string; confidence: number }> {
  const lowerQuery = query.toLowerCase();
  const result: Array<{ key: string; confidence: number }> = [];

  const tokens = lowerQuery
    .split(/[\s,.-]+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length > 2 && !STOPWORDS.has(t))
    .map(stemWord);
  const uniqueTokens = Array.from(new Set(tokens));

  for (const [prop, keywords] of Object.entries(PROPERTY_KEYWORDS)) {
    let matchCount = 0;

    // Phrase matching
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        matchCount += 2;
      }
    }

    // Token matching with stem
    const stemmedKeywords = keywords
      .flatMap(k => k.split(/\s+/))
      .filter(t => t.length > 2)
      .map(stemWord);
      const uniqueKeywordTokens = Array.from(new Set(stemmedKeywords));

    for (const token of uniqueTokens) {
      if (uniqueKeywordTokens.includes(token)) {
        matchCount += 1;
      }
    }

    if (matchCount > 0) {
      const totalChecks = 2 + uniqueTokens.length;
      const confidence = Math.min(1, matchCount / Math.max(1, totalChecks / 2));
      result.push({ key: prop, confidence: Math.round(confidence * 100) / 100 });
    }
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}
