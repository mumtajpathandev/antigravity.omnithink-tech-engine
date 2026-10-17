import {
  MasterStyle,
  PluginMetadata,
  MaterialRecord,
  HistoricalBom,
  LearningStats,
  UserCorrectionEvent,
  VisionDetection
} from '../types/techpack';

import shellParkaImg from '../assets/images/techpack_shell_parka_1792077255848.jpg';
import heavyHoodieImg from '../assets/images/techpack_heavy_hoodie_1792077257609.jpg';
import athleticTightsImg from '../assets/images/techpack_athletic_tights_1792077257403.jpg';
import tacticalCargoImg from '../assets/images/techpack_tactical_cargo_1792077259064.jpg';

export const EMPTY_MASTER_STYLE: MasterStyle = {
  masterStyleId: 'PENDING',
  code: 'PENDING',
  name: 'Awaiting MSTS Ingestion',
  season: 'SP28',
  documentType: 'FileMasterStyleTechnicalSketch',
  category: 'Bottoms',
  styleIds: [],
  thumbnailUrl: athleticTightsImg,
  technicalSketchFile: 'Awaiting_Upload.pdf',
  pdamSketchUrl: '',
  description: 'No sample data loaded. Drop your MSTS PDF or load presets to begin.',
  devObjects: []
};

export const SAMPLE_MASTER_STYLES: MasterStyle[] = [
  {
    masterStyleId: 'MASCL',
    code: 'WYAUBAA',
    name: 'ALIGN PANT',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Bottoms',
    styleIds: ['ALIGN-BLACK', 'ALIGN-RED', 'ALIGN-DIGITAL'],
    thumbnailUrl: athleticTightsImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_ALIGN_PANT_SP28.pdf',
    pdamSketchUrl: '/sketches/align-pant-cad.svg',
    description: 'Iconic weightless high-rise yoga pant constructed with ultra-soft NULU buttery-touch fabric and ergonomic waistband envelope pocket.',
    devObjects: [
      {
        devObjectId: 'DO-001',
        code: 'DO-001 Black Lycra',
        name: 'Black Lycra Core',
        colorway: 'Pitch Black (0001)',
        status: 'Ready',
        colorHex: '#18181b',
        materials: [
          {
            partId: 'part-1',
            materialName: 'NULU',
            articleNumber: 'MAT-001',
            isInDevelopment: false
          },
          {
            partId: 'part-2',
            materialName: 'Power Mesh',
            articleNumber: 'MAT-002',
            isInDevelopment: false
          },
          {
            partId: 'part-3',
            materialName: 'NULU',
            articleNumber: 'MAT-001',
            isInDevelopment: false
          }
        ]
      },
      {
        devObjectId: 'DO-002',
        code: 'DO-002 Bright Lycra',
        name: 'Bright Lycra Solar',
        colorway: 'Solar Yellow (6412)',
        status: 'Ready',
        colorHex: '#eab308',
        materials: [
          {
            partId: 'part-1',
            materialName: 'NULU',
            articleNumber: 'MAT-001',
            isInDevelopment: false
          },
          {
            partId: 'part-2',
            materialName: 'Power Mesh',
            articleNumber: 'MAT-002',
            isInDevelopment: false
          },
          {
            partId: 'part-3',
            materialName: 'NULU',
            articleNumber: 'MAT-001',
            isInDevelopment: false
          }
        ]
      },
      {
        devObjectId: 'DO-003',
        code: 'DO-003 Digital Print',
        name: 'Digital Print Chroma',
        colorway: 'Chroma Wave Multi (9820)',
        status: 'Ready',
        colorHex: '#6366f1',
        materials: [
          {
            partId: 'part-1',
            materialName: 'NULU Print',
            articleNumber: 'MAT-015',
            isInDevelopment: false
          },
          {
            partId: 'part-2',
            materialName: 'Power Mesh',
            articleNumber: 'MAT-002',
            isInDevelopment: false
          },
          {
            partId: 'part-3',
            materialName: 'NULU Print',
            articleNumber: 'MAT-015',
            isInDevelopment: false
          }
        ]
      }
    ]
  },
  {
    masterStyleId: 'WNDTR',
    code: 'WYTR01A',
    name: 'WUNDER TRAIN',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Bottoms',
    styleIds: ['WNDTR-NAVY', 'WNDTR-OLIVE', 'WNDTR-TERRA'],
    thumbnailUrl: athleticTightsImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_WUNDER_TRAIN_SP28.pdf',
    pdamSketchUrl: '/sketches/wunder-train-cad.svg',
    description: 'Fast-drying Everlux high-intensity training tight with sweat-wicking breathability and internal drawcord waist.',
    devObjects: [
      {
        devObjectId: 'DO-101',
        code: 'DO-101 True Navy',
        name: 'True Navy Everlux',
        colorway: 'True Navy (3138)',
        status: 'Ready',
        colorHex: '#1e3a8a',
        materials: [
          {
            partId: 'part-1',
            materialName: 'Everlux Interlock',
            articleNumber: 'MAT-018',
            isInDevelopment: false
          }
        ]
      },
      {
        devObjectId: 'DO-102',
        code: 'DO-102 Dark Olive',
        name: 'Dark Olive Everlux',
        colorway: 'Dark Olive (4482)',
        status: 'Ready',
        colorHex: '#365314',
        materials: [
          {
            partId: 'part-1',
            materialName: 'Everlux Interlock',
            articleNumber: 'MAT-018',
            isInDevelopment: false
          }
        ]
      }
    ]
  },
  {
    masterStyleId: 'PCBRK',
    code: 'PB001',
    name: 'PACE BREAKER',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Bottoms',
    styleIds: ['PACE-GRAPHITE', 'PACE-HEATHER'],
    thumbnailUrl: tacticalCargoImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_PACE_BREAKER_SP28.pdf',
    pdamSketchUrl: '/sketches/pace-breaker-cad.svg',
    description: 'Versatile 4-way stretch running and training short engineered with Swift fabric and low-bounce media pocket.',
    devObjects: [
      {
        devObjectId: 'DO-201',
        code: 'DO-201 Graphite Grey',
        name: 'Graphite Grey Swift',
        colorway: 'Graphite Grey (0023)',
        status: 'Ready',
        colorHex: '#334155',
        materials: [
          {
            partId: 'part-1',
            materialName: 'Swift Nylon',
            articleNumber: 'MAT-004',
            isInDevelopment: false
          }
        ]
      }
    ]
  },
  {
    masterStyleId: 'DFNJK',
    code: 'DJ002',
    name: 'DEFINE JACKET',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Outerwear',
    styleIds: ['DEFINE-BONE', 'DEFINE-BLACK'],
    thumbnailUrl: shellParkaImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_DEFINE_JACKET_SP28.pdf',
    pdamSketchUrl: '/sketches/define-jacket-cad.svg',
    description: 'Slimming Luon track jacket with thumbhole cuffs, back ventilation flap, and emergency hair tie zipper pull.',
    devObjects: [
      {
        devObjectId: 'DO-301',
        code: 'DO-301 Bone White Luon',
        name: 'Bone White Luon',
        colorway: 'Bone White (0040)',
        status: 'Ready',
        colorHex: '#f1f5f9',
        materials: [
          {
            partId: 'part-1',
            materialName: 'Luon Interlock',
            articleNumber: 'MAT-021',
            isInDevelopment: false
          }
        ]
      }
    ]
  },
  {
    masterStyleId: 'SCBHD',
    code: 'SH003',
    name: 'SCUBA HOODIE',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Tops',
    styleIds: ['SCUBA-HEATHER', 'SCUBA-ESPRESSO'],
    thumbnailUrl: heavyHoodieImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_SCUBA_HOODIE_SP28.pdf',
    pdamSketchUrl: '/sketches/scuba-hoodie-cad.svg',
    description: 'Cozy oversized fleece pullover featuring elastic zipper pull with emergency hair tie and kangaroo thumbholes.',
    devObjects: [
      {
        devObjectId: 'DO-401',
        code: 'DO-401 Heather Core',
        name: 'Heathered Medium Grey',
        colorway: 'Heather Grey (0108)',
        status: 'Ready',
        colorHex: '#64748b',
        materials: [
          {
            partId: 'part-1',
            materialName: 'Cotton Fleece Blend',
            articleNumber: 'MAT-025',
            isInDevelopment: false
          }
        ]
      }
    ]
  },
  {
    masterStyleId: 'ENGBR',
    code: 'EB006',
    name: 'ENERGY BRA',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Bras',
    styleIds: ['ENERGY-BLACK', 'ENERGY-MAGENTA', 'ENERGY-LILAC'],
    thumbnailUrl: athleticTightsImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_ENERGY_BRA_SP28.pdf',
    pdamSketchUrl: '/sketches/energy-bra-cad.svg',
    description: 'Medium-support strappy athletic bra engineered with slick, low-friction Luxtreme fabric and removable molded foam cups.',
    devObjects: [
      {
        devObjectId: 'DO-501',
        code: 'DO-501 Black Core',
        name: 'Black Luxtreme',
        colorway: 'Black (0001)',
        status: 'Ready',
        colorHex: '#18181b',
        materials: [
          { partId: 'part-1', materialName: 'Luxtreme Interlock', articleNumber: 'MAT-014', isInDevelopment: false },
          { partId: 'part-2', materialName: 'Power Mesh', articleNumber: 'MAT-002', isInDevelopment: false }
        ]
      },
      {
        devObjectId: 'DO-502',
        code: 'DO-502 Magenta Glow',
        name: 'Magenta Glow Luxtreme',
        colorway: 'Magenta Glow (5291)',
        status: 'Ready',
        colorHex: '#db2777',
        materials: [
          { partId: 'part-1', materialName: 'Luxtreme Interlock', articleNumber: 'MAT-014', isInDevelopment: false }
        ]
      }
    ]
  },
  {
    masterStyleId: 'FNFRN',
    code: 'FF007',
    name: 'FAST AND FREE TIGHT',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Bottoms',
    styleIds: ['FAST-CAMO', 'FAST-DARKFOREST'],
    thumbnailUrl: athleticTightsImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_FAST_AND_FREE_SP28.pdf',
    pdamSketchUrl: '/sketches/fast-free-cad.svg',
    description: 'Weightless running tight made with quick-drying Nulux fabric with 5 drop-in waistband pockets and raw-cut bonded hems.',
    devObjects: [
      {
        devObjectId: 'DO-601',
        code: 'DO-601 Heritage Camo',
        name: 'Heritage Camo Nulux',
        colorway: 'Heritage Camo (4421)',
        status: 'Ready',
        colorHex: '#475569',
        materials: [
          { partId: 'part-1', materialName: 'Nulux Interlock', articleNumber: 'MAT-029', isInDevelopment: false }
        ]
      }
    ]
  },
  {
    masterStyleId: 'EBBAG',
    code: 'BB008',
    name: 'EVERYWHERE BELT BAG',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Accessories',
    styleIds: ['EBB-CHAI', 'EBB-TRENCH'],
    thumbnailUrl: tacticalCargoImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_EVERYWHERE_BELT_BAG_SP28.pdf',
    pdamSketchUrl: '/sketches/everywhere-belt-bag-cad.svg',
    description: 'Iconic 1L modular water-repellent nylon crossbody pack with interior mesh organizers and heavy-duty acetal buckle.',
    devObjects: [
      {
        devObjectId: 'DO-701',
        code: 'DO-701 Spiced Chai',
        name: 'Spiced Chai Twill',
        colorway: 'Spiced Chai (4819)',
        status: 'Ready',
        colorHex: '#d97706',
        materials: [
          { partId: 'part-1', materialName: 'Water-Repellent Nylon', articleNumber: 'MAT-032', isInDevelopment: false }
        ]
      }
    ]
  },
  {
    masterStyleId: 'MVTTE',
    code: 'MT009',
    name: 'METAL VENT TECH TEE',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Seamless',
    styleIds: ['VENT-SLATE', 'VENT-TEAL'],
    thumbnailUrl: heavyHoodieImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_METAL_VENT_TECH_SP28.pdf',
    pdamSketchUrl: '/sketches/metal-vent-cad.svg',
    description: 'Seamless circular knit training shirt with Silverescent anti-stink technology and engineered mesh heat ventilation zones.',
    devObjects: [
      {
        devObjectId: 'DO-801',
        code: 'DO-801 Slate Mist',
        name: 'Slate Mist Silverescent',
        colorway: 'Slate Mist (0291)',
        status: 'Ready',
        colorHex: '#0d9488',
        materials: [
          { partId: 'part-1', materialName: 'Silverescent Mesh', articleNumber: 'MAT-008', isInDevelopment: true }
        ]
      }
    ]
  },
  {
    masterStyleId: 'SWSPD',
    code: 'SS010',
    name: 'SWIFT SPEED TIGHT',
    season: 'SP28',
    documentType: 'FileMasterStyleTechnicalSketch',
    category: 'Bottoms',
    styleIds: ['SWIFT-CARBON', 'SWIFT-SYMPHONY'],
    thumbnailUrl: athleticTightsImg,
    technicalSketchFile: 'MasterStyleTechnicalSketch_SWIFT_SPEED_SP28.pdf',
    pdamSketchUrl: '/sketches/swift-speed-cad.svg',
    description: 'High-coverage compression running tight featuring low-friction Luxtreme fabric, zippered phone pocket, and reflective detailing.',
    devObjects: [
      {
        devObjectId: 'DO-901',
        code: 'DO-901 Carbon Dust',
        name: 'Carbon Dust Luxtreme',
        colorway: 'Carbon Dust (0088)',
        status: 'Ready',
        colorHex: '#52525b',
        materials: [
          { partId: 'part-1', materialName: 'Luxtreme Interlock', articleNumber: 'MAT-014', isInDevelopment: false }
        ]
      }
    ]
  }
];

export const INITIAL_MSTS_DOCUMENTS = [
  {
    id: 'msts-01',
    fileName: 'MasterStyleTechnicalSketch_ALIGN_PANT_SP28.pdf',
    fileSize: '2.4 MB',
    uploadedAt: 'Today, 08:14',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'MASCL',
    masterStyleName: 'ALIGN PANT',
    partsCount: 5,
    devObjectsCount: 3,
    season: 'SP28' as const,
    latencyMs: 14,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-02',
    fileName: 'MasterStyleTechnicalSketch_WUNDER_TRAIN_SP28.pdf',
    fileSize: '3.1 MB',
    uploadedAt: 'Today, 08:16',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'WNDTR',
    masterStyleName: 'WUNDER TRAIN',
    partsCount: 4,
    devObjectsCount: 2,
    season: 'SP28' as const,
    latencyMs: 18,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-03',
    fileName: 'MasterStyleTechnicalSketch_PACE_BREAKER_SP28.pdf',
    fileSize: '1.9 MB',
    uploadedAt: 'Today, 08:17',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'PCBRK',
    masterStyleName: 'PACE BREAKER',
    partsCount: 4,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 12,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-04',
    fileName: 'MasterStyleTechnicalSketch_DEFINE_JACKET_SP28.pdf',
    fileSize: '4.2 MB',
    uploadedAt: 'Today, 08:20',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'DFNJK',
    masterStyleName: 'DEFINE JACKET',
    partsCount: 6,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 24,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-05',
    fileName: 'MasterStyleTechnicalSketch_SCUBA_HOODIE_SP28.pdf',
    fileSize: '3.8 MB',
    uploadedAt: 'Today, 08:22',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'SCBHD',
    masterStyleName: 'SCUBA HOODIE',
    partsCount: 5,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 21,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-06',
    fileName: 'MasterStyleTechnicalSketch_ENERGY_BRA_SP28.pdf',
    fileSize: '2.1 MB',
    uploadedAt: 'Today, 08:25',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'ENGBR',
    masterStyleName: 'ENERGY BRA',
    partsCount: 4,
    devObjectsCount: 2,
    season: 'SP28' as const,
    latencyMs: 16,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-07',
    fileName: 'MasterStyleTechnicalSketch_FAST_AND_FREE_SP28.pdf',
    fileSize: '2.7 MB',
    uploadedAt: 'Today, 08:26',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'FNFRN',
    masterStyleName: 'FAST AND FREE TIGHT',
    partsCount: 5,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 19,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-08',
    fileName: 'MasterStyleTechnicalSketch_EVERYWHERE_BELT_BAG_SP28.pdf',
    fileSize: '1.8 MB',
    uploadedAt: 'Today, 08:28',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'EBBAG',
    masterStyleName: 'EVERYWHERE BELT BAG',
    partsCount: 6,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 15,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-09',
    fileName: 'MasterStyleTechnicalSketch_METAL_VENT_TECH_SP28.pdf',
    fileSize: '2.5 MB',
    uploadedAt: 'Today, 08:30',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'MVTTE',
    masterStyleName: 'METAL VENT TECH TEE',
    partsCount: 3,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 17,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  },
  {
    id: 'msts-10',
    fileName: 'MasterStyleTechnicalSketch_SWIFT_SPEED_SP28.pdf',
    fileSize: '3.3 MB',
    uploadedAt: 'Today, 08:31',
    source: 'Sample' as const,
    status: 'BOM Generated' as const,
    masterStyleId: 'SWSPD',
    masterStyleName: 'SWIFT SPEED TIGHT',
    partsCount: 5,
    devObjectsCount: 1,
    season: 'SP28' as const,
    latencyMs: 22,
    xmpExtracted: true,
    flexPlmPayloadReady: true
  }
];

export const SAMPLE_PLUGIN_DATA: PluginMetadata = {
  schema: 'pdam.illustrator.master-sketch',
  schemaVersion: '1.0.0',
  parts: [
    {
      partId: 'part-1',
      name: 'Upper',
      partType: 'Fabric part',
      placement: 'Self',
      notes: 'Anatomical leg panel 4-way stretch'
    },
    {
      partId: 'part-2',
      name: 'Pocket',
      partType: 'Fabric part',
      placement: 'Trim',
      notes: 'Internal waistband concealed pocket'
    },
    {
      partId: 'part-3',
      name: 'Waistband',
      partType: 'Fabric part',
      placement: 'Self',
      notes: 'Bonded edge high-rise compression core'
    },
    {
      partId: 'part-4',
      name: 'Logo',
      partType: 'Trim part',
      placement: 'Exterior Accent',
      notes: 'Reflective silver heat-seal insignia'
    },
    {
      partId: 'part-5',
      name: 'Draw Cord',
      partType: 'Trim part',
      placement: 'Waist Interior',
      notes: 'Continuous loop stretch drawcord'
    }
  ],
  devObjects: [
    {
      devObjectId: 'DO-001',
      parts: [
        {
          partId: 'part-1',
          materials: [
            {
              materialName: 'NULU',
              articleNumber: 'MAT-001',
              isInDevelopment: false
            }
          ]
        },
        {
          partId: 'part-2',
          materials: [
            {
              materialName: 'Power Mesh',
              articleNumber: 'MAT-002',
              isInDevelopment: false
            }
          ]
        },
        {
          partId: 'part-3',
          materials: [
            {
              materialName: 'NULU',
              articleNumber: 'MAT-001',
              isInDevelopment: false
            }
          ]
        }
      ]
    },
    {
      devObjectId: 'DO-002',
      parts: [
        {
          partId: 'part-1',
          materials: [
            {
              materialName: 'NULU',
              articleNumber: 'MAT-001',
              isInDevelopment: false
            }
          ]
        },
        {
          partId: 'part-2',
          materials: [
            {
              materialName: 'Power Mesh',
              articleNumber: 'MAT-002',
              isInDevelopment: false
            }
          ]
        },
        {
          partId: 'part-3',
          materials: [
            {
              materialName: 'NULU',
              articleNumber: 'MAT-001',
              isInDevelopment: false
            }
          ]
        }
      ]
    },
    {
      devObjectId: 'DO-003',
      parts: [
        {
          partId: 'part-1',
          materials: [
            {
              materialName: 'NULU Print',
              articleNumber: 'MAT-015',
              isInDevelopment: false
            }
          ]
        },
        {
          partId: 'part-2',
          materials: [
            {
              materialName: 'Power Mesh',
              articleNumber: 'MAT-002',
              isInDevelopment: false
            }
          ]
        },
        {
          partId: 'part-3',
          materials: [
            {
              materialName: 'NULU Print',
              articleNumber: 'MAT-015',
              isInDevelopment: false
            }
          ]
        }
      ]
    }
  ]
};

export const SAMPLE_VISION_DETECTION: VisionDetection = {
  parts: ['Upper', 'Pocket', 'Waistband'],
  materials: ['NULU', 'Power Mesh'],
  trims: ['Logo', 'Draw Cord'],
  confidence: 0.94,
  annotatedFeatures: [
    {
      label: 'Waistband (Bonded Self)',
      type: 'part',
      x: 18,
      y: 12,
      width: 64,
      height: 18
    },
    {
      label: 'Upper Body (NULU Main Panel)',
      type: 'part',
      x: 14,
      y: 32,
      width: 72,
      height: 58
    },
    {
      label: 'Internal Pocket (Power Mesh)',
      type: 'part',
      x: 42,
      y: 16,
      width: 16,
      height: 12
    },
    {
      label: 'Heat Seal Logo (Reflective)',
      type: 'trim',
      x: 48,
      y: 24,
      width: 6,
      height: 6
    },
    {
      label: 'Elastic Draw Cord',
      type: 'trim',
      x: 35,
      y: 20,
      width: 30,
      height: 4
    }
  ]
};

export const MATERIAL_LIBRARY: MaterialRecord[] = [
  {
    material: 'NULU',
    status: 'Approved',
    supplier: 'ABC Textiles',
    articleNumber: 'MAT-001',
    gsm: 215,
    composition: '81% Nylon, 19% Lycra Elastane',
    notes: 'Buttery-soft 4-way stretch staple'
  },
  {
    material: 'Power Mesh',
    status: 'Approved',
    supplier: 'XYZ Mills',
    articleNumber: 'MAT-002',
    gsm: 140,
    composition: '82% Nylon, 18% Elastane',
    notes: 'High airflow pocketing & vent mesh'
  },
  {
    material: 'Rejected Fabric X',
    status: 'Rejected',
    supplier: 'SupplierA',
    articleNumber: 'MAT-003',
    gsm: 260,
    composition: '90% Poly, 10% Spandex',
    notes: 'Failed pilling resistance ISO 12945-2 test'
  },
  {
    material: 'Swift Nylon',
    status: 'Approved',
    supplier: 'Pacific Weaving',
    articleNumber: 'MAT-004',
    gsm: 130,
    composition: '86% Recycled Polyester, 14% Elastane',
    notes: 'Lightweight woven short body fabric'
  },
  {
    material: 'Elastic Rib',
    status: 'Approved',
    supplier: 'StretchTech',
    articleNumber: 'MAT-005',
    gsm: 320,
    composition: '95% Cotton, 5% Spandex',
    notes: '2x2 cuff and collar ribbing'
  },
  {
    material: 'Draw Cord',
    status: 'Approved',
    supplier: 'TrimWorks',
    articleNumber: 'MAT-006',
    gsm: 45,
    composition: '100% Textured Polyester cord',
    notes: 'Internal continuous loop waist cinch'
  },
  {
    material: 'Recycled Power Mesh',
    status: 'Approved',
    supplier: 'EcoFiber Corp',
    articleNumber: 'MAT-007',
    gsm: 138,
    composition: '84% Recycled Polyamide, 16% Roica Elastane',
    notes: 'Sustainable substitute for standard mesh'
  },
  {
    material: 'Silverescent Mesh',
    status: 'In Development',
    supplier: 'Ionic Fabrics',
    articleNumber: 'MAT-008',
    gsm: 125,
    composition: '53% Nylon, 40% Recycled Polyester, 4% X-STATIC Silver',
    notes: 'Anti-odor ion testing phase 2 underway'
  },
  {
    material: 'Dropped Elastane 220',
    status: 'Dropped',
    supplier: 'NanoTex',
    articleNumber: 'MAT-010',
    gsm: 220,
    composition: '78% Poly, 22% Elastane',
    notes: 'Dropped by Materials Strategy committee'
  },
  {
    material: 'Lab Use Only Polymer 44',
    status: 'Lab Use Only',
    supplier: 'ChemLab Labs',
    articleNumber: 'MAT-011',
    gsm: 190,
    composition: 'Bio-based polyamide blend',
    notes: 'Trial run only; not cleared for commercial BOM'
  },
  {
    material: 'Deactivated Poly DTY',
    status: 'Deactivated',
    supplier: 'Legacy Thread',
    articleNumber: 'MAT-012',
    gsm: 160,
    composition: '100% Virgin Polyester',
    notes: 'Phased out under Scope 3 climate mandate'
  },
  {
    material: 'Luxtreme Interlock',
    status: 'Approved',
    supplier: 'Toray Industries',
    articleNumber: 'MAT-014',
    gsm: 250,
    composition: '69% Nylon, 31% Lycra',
    notes: 'Slick low-friction support fabric'
  },
  {
    material: 'NULU Print',
    status: 'Approved',
    supplier: 'ABC Textiles',
    articleNumber: 'MAT-015',
    gsm: 218,
    composition: '81% Nylon, 19% Lycra',
    notes: 'Digital disperse print on NULU substrate'
  },
  {
    material: 'Everlux Interlock',
    status: 'Approved',
    supplier: 'ABC Textiles',
    articleNumber: 'MAT-018',
    gsm: 240,
    composition: '77% Nylon, 23% Lycra',
    notes: 'Fast drying double-knit moisture transfer'
  },
  {
    material: 'Heat Transfer Logo',
    status: 'Approved',
    supplier: 'Avery Dennison',
    articleNumber: 'TRM-001',
    composition: 'Polyurethane micro-film reflective',
    notes: 'ASTM D3359 cross-hatch adhesion certified'
  },
  {
    material: 'Recycled Poly Thread 40',
    status: 'Approved',
    supplier: 'Coats Group',
    articleNumber: 'THD-002',
    composition: '100% Recycled Polyester Epic EcoVerde',
    notes: 'ISO 301 lockstitch and ISO 406 flatlock'
  }
];

export const HISTORICAL_BOMS_DATASET: HistoricalBom[] = [
  {
    id: 'HB-001',
    styleName: 'ALIGN PANT SP27',
    season: 'SP27',
    similarity: 0.92,
    category: 'Bottoms',
    baseMaterials: ['NULU', 'Power Mesh', 'Reflective Heat Seal'],
    suggestedPackaging: ['Polybag 100% Recycled LDPE with vented micro-holes', 'Barcode Sticker GS1-128', 'FSC Certified Hangtag with organic cotton twine'],
    suggestedLabels: ['Heat Transfer Interior Care/Content Label 45mm', 'Tear-away Size Tag'],
    suggestedTrims: ['Subtle matte rubberized icon print', 'Continuous loop stretch drawcord']
  },
  {
    id: 'HB-002',
    styleName: 'WUNDER TRAIN SP27',
    season: 'SP27',
    similarity: 0.88,
    category: 'Bottoms',
    baseMaterials: ['Everlux', 'Power Mesh', 'Reflective Heat Seal'],
    suggestedPackaging: ['High-density flat-pack polybag', 'RFID enabled hangtag'],
    suggestedLabels: ['Soft woven satin side seam care label', 'Silver reflective size code'],
    suggestedTrims: ['Low-profile waistband tunnel drawcord', 'Bonded hem seam tape']
  },
  {
    id: 'HB-003',
    styleName: 'ALIGN SHORT 6" FA26',
    season: 'FA26',
    similarity: 0.85,
    category: 'Bottoms',
    baseMaterials: ['NULU', 'Power Mesh'],
    suggestedPackaging: ['Slim polybag recyclable PE-LD 04'],
    suggestedLabels: ['Direct pigment heat transfer care instructions'],
    suggestedTrims: ['Concealed back waistband card pocket']
  },
  {
    id: 'HB-004',
    styleName: 'SWIFT SPEED HIGH-RISE TIGHT SP27',
    season: 'SP27',
    similarity: 0.84,
    category: 'Bottoms',
    baseMaterials: ['Luxtreme', 'Power Mesh', 'Bonded Tape'],
    suggestedPackaging: ['Vented master polybag carton 24pcs'],
    suggestedLabels: ['Recycled polyester woven main label'],
    suggestedTrims: ['Reflective calf striping 3M Scotchlite', 'Zippered back pocket']
  },
  {
    id: 'HB-005',
    styleName: 'FAST AND FREE TIGHT SU26',
    season: 'SU26',
    similarity: 0.81,
    category: 'Bottoms',
    baseMaterials: ['Nulux', 'Power Mesh'],
    suggestedPackaging: ['Biodegradable cornstarch bag packaging'],
    suggestedLabels: ['Heat transfer tagless neck/waist print'],
    suggestedTrims: ['Raw cut hem with laser bonded edge']
  },
  {
    id: 'HB-006',
    styleName: 'ALIGN JOGGER SP27',
    season: 'SP27',
    similarity: 0.79,
    category: 'Bottoms',
    baseMaterials: ['NULU', 'Elastic Rib', 'Draw Cord'],
    suggestedPackaging: ['Hanger pack ready polybag'],
    suggestedLabels: ['Soft touch silicone heat seal label'],
    suggestedTrims: ['Ribbed ankle cuffs with spandex retention']
  },
  {
    id: 'HB-007',
    styleName: 'PACE BREAKER LINED SHORT FA26',
    season: 'FA26',
    similarity: 0.74,
    category: 'Bottoms',
    baseMaterials: ['Swift Nylon', 'Luxtreme Liner', 'Draw Cord'],
    suggestedPackaging: ['Standard fold carton pack'],
    suggestedLabels: ['Woven loop flag label at hem'],
    suggestedTrims: ['Two-way stretch flat drawcord with rubber aglets']
  },
  {
    id: 'HB-008',
    styleName: 'DEFINE JACKET SP27',
    season: 'SP27',
    similarity: 0.71,
    category: 'Outerwear',
    baseMaterials: ['Luon', 'Coolmax Mesh', 'YKK Reverse Coil Zipper'],
    suggestedPackaging: ['Pre-hung garment cover polybag with shoulder slits'],
    suggestedLabels: ['Embroidered neck hanger loop', 'Printed care booklet'],
    suggestedTrims: ['Emergency hair tie zipper puller', 'Thumbhole cuff binding']
  },
  {
    id: 'HB-009',
    styleName: 'SCUBA OVERSIZED HALF-ZIP FA27',
    season: 'FA27',
    similarity: 0.68,
    category: 'Tops',
    baseMaterials: ['Cotton Fleece', 'Heavy Rib', 'Antique Metal Zipper'],
    suggestedPackaging: ['Folded stack master carton 12pcs'],
    suggestedLabels: ['Twill tape reinforced neck label'],
    suggestedTrims: ['Engraved logo zipper slider']
  },
  {
    id: 'HB-010',
    styleName: 'BASE PACE HIGH-RISE TIGHT SU26',
    season: 'SU26',
    similarity: 0.82,
    category: 'Bottoms',
    baseMaterials: ['Nulux', 'Bonded Tape'],
    suggestedPackaging: ['Ultra-thin recyclable PE liner'],
    suggestedLabels: ['Tagless care print'],
    suggestedTrims: ['Continuous internal drawcord']
  },
  {
    id: 'HB-011',
    styleName: 'IN STILLNESS YOGA PANT SP27',
    season: 'SP27',
    similarity: 0.80,
    category: 'Bottoms',
    baseMaterials: ['NULU', 'Modal Jersey'],
    suggestedPackaging: ['Roll-packed eco-kraft band'],
    suggestedLabels: ['Organic cotton screen printed label'],
    suggestedTrims: ['Gentle flare hem hemstitch']
  },
  {
    id: 'HB-012',
    styleName: 'ADAPTIVE PERFORMANCE TIGHT FA26',
    season: 'FA26',
    similarity: 0.78,
    category: 'Bottoms',
    baseMaterials: ['Luxtreme', 'Power Mesh'],
    suggestedPackaging: ['Recycled polybag with tamper seal'],
    suggestedLabels: ['Braille embossed size tag'],
    suggestedTrims: ['Ergonomic pull tab at waistband']
  },
  {
    id: 'HB-013',
    styleName: 'HIGH-RISE 7/8 TIGHT SP27',
    season: 'SP27',
    similarity: 0.77,
    category: 'Bottoms',
    baseMaterials: ['NULU', 'Power Mesh'],
    suggestedPackaging: ['Standard fold polybag'],
    suggestedLabels: ['Reflective silver interior heat transfer'],
    suggestedTrims: ['Side drop-in cell phone pocket']
  },
  {
    id: 'HB-014',
    styleName: 'SCULPT LEGGING FA26',
    season: 'FA26',
    similarity: 0.75,
    category: 'Bottoms',
    baseMaterials: ['Luxtreme', 'Micro Mesh'],
    suggestedPackaging: ['Standard polybag with moisture desiccant'],
    suggestedLabels: ['Care label cluster'],
    suggestedTrims: ['Ventilation mesh back knee insert']
  },
  {
    id: 'HB-015',
    styleName: 'POWER THRU PANT SP27',
    season: 'SP27',
    similarity: 0.74,
    category: 'Bottoms',
    baseMaterials: ['Abrasion Resistant Nylon', 'Power Mesh'],
    suggestedPackaging: ['Heavy duty polybag'],
    suggestedLabels: ['Heavy wash proof satin label'],
    suggestedTrims: ['Barbell knurling resistant front panels']
  },
  {
    id: 'HB-016',
    styleName: 'SENSEKNIT RUNNING TIGHT FA26',
    season: 'FA26',
    similarity: 0.73,
    category: 'Bottoms',
    baseMaterials: ['Targeted Compression Knit'],
    suggestedPackaging: ['Form-fit card sleeve'],
    suggestedLabels: ['Integrated knit care code'],
    suggestedTrims: ['Seamless 360 pocketing']
  },
  {
    id: 'HB-017',
    styleName: 'CITY SLEEK 5 POCKET PANT FA27',
    season: 'FA27',
    similarity: 0.70,
    category: 'Bottoms',
    baseMaterials: ['Warpstreme Woven', 'Pocketing Twill'],
    suggestedPackaging: ['Flat hanger pack'],
    suggestedLabels: ['Faux leather back patch'],
    suggestedTrims: ['Matte shank button and rivets']
  },
  {
    id: 'HB-018',
    styleName: 'LICENSE TO TRAIN PANT SP27',
    season: 'SP27',
    similarity: 0.69,
    category: 'Bottoms',
    baseMaterials: ['Swift DWR', 'Cordura Reinforcement'],
    suggestedPackaging: ['Industrial polybag with hanger slot'],
    suggestedLabels: ['Silicone debossed patch'],
    suggestedTrims: ['Water repellent zippers']
  },
  {
    id: 'HB-019',
    styleName: 'CORE COMPRESSION TIGHT SU26',
    season: 'SU26',
    similarity: 0.67,
    category: 'Bottoms',
    baseMaterials: ['High Modulus Spandex', 'Power Mesh'],
    suggestedPackaging: ['Hermetic sealed compression pouch'],
    suggestedLabels: ['High-contrast sizing mark'],
    suggestedTrims: ['Flatlock zero-chafing seams']
  },
  {
    id: 'HB-020',
    styleName: 'SURGE WARM TIGHT FA26',
    season: 'FA26',
    similarity: 0.72,
    category: 'Bottoms',
    baseMaterials: ['Brushed Rulu', 'Reflective Film'],
    suggestedPackaging: ['Thermal lined poly pack'],
    suggestedLabels: ['Fleece friendly heat transfer'],
    suggestedTrims: ['Ankle zip gusset with locking pull']
  }
];

export const INITIAL_CORRECTIONS: UserCorrectionEvent[] = [
  {
    id: 'corr-01',
    timestamp: '2026-10-14 14:22',
    part: 'Pocket',
    suggestedMaterial: 'Power Mesh',
    correctedMaterial: 'Recycled Power Mesh',
    reason: 'SP28 sustainability mandate for interior pocket lining',
    appliedToMaster: true
  },
  {
    id: 'corr-02',
    timestamp: '2026-10-14 16:05',
    part: 'Upper',
    suggestedMaterial: 'Poly Thread 40',
    correctedMaterial: 'Recycled Poly Thread 40',
    reason: 'Coats EcoVerde spec alignment across all ALIGN variants',
    appliedToMaster: true
  },
  {
    id: 'corr-03',
    timestamp: '2026-10-15 09:30',
    part: 'Draw Cord',
    suggestedMaterial: 'Standard Elastic Cord',
    correctedMaterial: 'Draw Cord',
    reason: 'Standardizing to MAT-006 TrimWorks supplier article',
    appliedToMaster: true
  }
];

export const INITIAL_LEARNING_STATS: LearningStats = {
  topCorrections: [
    {
      from: 'Power Mesh',
      to: 'Recycled Power Mesh',
      count: 12
    },
    {
      from: 'Poly Thread 40',
      to: 'Recycled Poly Thread 40',
      count: 8
    },
    {
      from: 'Zinc Grommet',
      to: 'Matte Black Eyelet',
      count: 5
    }
  ],
  mostCorrectedPart: 'Pocket',
  recommendationConfidence: 0.87,
  totalCorrections: 34,
  driftReductionPercent: 18.4
};
