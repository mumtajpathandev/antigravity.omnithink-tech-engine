export type Season = 'SP28' | 'FA27' | 'SP27' | 'FA26' | 'SU26';

export type MaterialValidationStatus =
  | 'Approved'
  | 'In Development'
  | 'Rejected'
  | 'Dropped'
  | 'Lab Use Only'
  | 'Deactivated';

export type ValidationOutcome = 'Pass' | 'Warn' | 'Reject';

export interface MaterialRecord {
  material: string;
  status: MaterialValidationStatus;
  supplier: string;
  articleNumber: string;
  gsm?: number;
  composition?: string;
  notes?: string;
}

export interface DevelopmentObject {
  devObjectId: string;
  code: string;
  name: string;
  colorway: string;
  status: 'Ready' | 'In Fan-out' | 'Generated';
  colorHex: string;
  materials: {
    partId: string;
    materialName: string;
    articleNumber: string;
    isInDevelopment: boolean;
  }[];
}

export interface MasterStyle {
  masterStyleId: string;
  code: string;
  name: string;
  season: Season;
  documentType: 'FileMasterStyleTechnicalSketch';
  category: 'Bottoms' | 'Tops' | 'Outerwear' | 'Accessories' | 'Bras' | 'Seamless';
  styleIds: string[];
  devObjects: DevelopmentObject[];
  thumbnailUrl: string;
  technicalSketchFile: string;
  pdamSketchUrl: string;
  description: string;
}

export interface PluginPart {
  partId: string;
  name: string;
  partType: 'Fabric part' | 'Trim part' | 'Packaging part';
  placement: string;
  notes?: string;
}

export interface PluginMetadata {
  schema: string;
  schemaVersion: string;
  parts: PluginPart[];
  devObjects: {
    devObjectId: string;
    colorwayName?: string;
    parts: {
      partId: string;
      materials: {
        materialName: string;
        articleNumber: string;
        isInDevelopment: boolean;
      }[];
    }[];
  }[];
}

export interface VisionDetection {
  parts: string[];
  materials: string[];
  trims: string[];
  confidence: number;
  annotatedFeatures: {
    label: string;
    type: 'part' | 'material' | 'trim';
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export interface BomItem {
  section: 'fabric' | 'trim' | 'label' | 'packaging';
  standardPlacement: string;
  placement: string;
  materialName: string;
  supplierName: string;
  supplierArticle: string;
  consumption?: string;
  unit?: string;
}

export interface FlexPlmPayload {
  header: {
    eventSource: string;
    eventEntity: string;
    eventType: string;
    timestamp?: string;
    correlationId?: string;
    idempotencyKey?: string;
  };
  devObjectId: string;
  seasonCode: string;
  masterStyleId: string;
  bom: BomItem[];
}

export interface ValidationItemResult {
  material: string;
  status: MaterialValidationStatus;
  supplier: string;
  articleNumber: string;
  outcome: ValidationOutcome;
  reason: string;
}

export interface HistoricalBom {
  id: string;
  styleName: string;
  season: string;
  similarity: number;
  category: string;
  baseMaterials: string[];
  suggestedPackaging: string[];
  suggestedLabels: string[];
  suggestedTrims: string[];
}

export interface UserCorrectionEvent {
  id: string;
  timestamp: string;
  part: string;
  suggestedMaterial: string;
  correctedMaterial: string;
  reason?: string;
  appliedToMaster: boolean;
}

export interface LearningStats {
  topCorrections: {
    from: string;
    to: string;
    count: number;
  }[];
  mostCorrectedPart: string;
  recommendationConfidence: number;
  totalCorrections: number;
  driftReductionPercent: number;
}

export interface IngestedMstsDocument {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  source: 'Upload' | 'SharePoint' | 'Folder' | 'Sample';
  status: 'Parsing' | 'Extracted' | 'Fan-Out Ready' | 'BOM Generated';
  masterStyleId: string;
  masterStyleName: string;
  partsCount: number;
  devObjectsCount: number;
  season: Season;
  latencyMs: number;
  xmpExtracted: boolean;
  flexPlmPayloadReady: boolean;
}

export interface SavedPdfSample {
  id: string;
  fileName: string;
  fileSize: string;
  savedAt: string;
  // REQUIRED INPUTS COMBINATION ONLY (No intermediate CAD DOM, no final BOM payloads)
  pdfDataUri?: string;
  masterStyle: {
    masterStyleId: string;
    masterStyleName: string;
    season: Season;
    category: MasterStyle['category'];
    documentType?: string;
  };
  styles: {
    code: string;
    styleIds: string[];
    colorways?: string[];
  };
}

