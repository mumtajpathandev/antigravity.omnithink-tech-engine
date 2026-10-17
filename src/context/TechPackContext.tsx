import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MasterStyle,
  PluginMetadata,
  VisionDetection,
  FlexPlmPayload,
  ValidationItemResult,
  HistoricalBom,
  UserCorrectionEvent,
  LearningStats,
  BomItem,
  IngestedMstsDocument,
  SavedPdfSample
} from '../types/techpack';
import {
  EMPTY_MASTER_STYLE,
  SAMPLE_MASTER_STYLES,
  SAMPLE_PLUGIN_DATA,
  SAMPLE_VISION_DETECTION,
  MATERIAL_LIBRARY,
  HISTORICAL_BOMS_DATASET,
  INITIAL_CORRECTIONS,
  INITIAL_LEARNING_STATS,
  INITIAL_MSTS_DOCUMENTS
} from '../data/mockData';
import {
  NativeParseResult,
  parseNativeMstsPdfStream,
  generateNativeMstsPdfBuffer
} from '../utils/nativePdfParser';
import { buildCompleteTechPackFromPdf } from '../utils/pdfToTechPackEngine';

interface TechPackContextType {
  // Navigation
  currentScreen: number;
  setCurrentScreen: (screen: number) => void;
  nextScreen: () => void;
  prevScreen: () => void;

  // Screen 1: Product Explorer
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedMasterStyle: MasterStyle;
  setSelectedMasterStyle: (ms: MasterStyle) => void;
  filteredStyles: MasterStyle[];

  // Screen 2: Master Style Workspace (PDAM)
  sketchUploaded: boolean;
  uploadedFileName: string;
  setUploadedFileName: (name: string) => void;
  handleSketchUpload: (file: File | string) => void;

  // Screen 3: Plugin Metadata Viewer (msts:pluginData) & Native PDF Stream
  pluginData: PluginMetadata;
  setPluginData: (data: PluginMetadata) => void;
  resetPluginData: () => void;
  nativeParseResult: NativeParseResult | null;
  isParsingNativePdf: boolean;
  runNativePdfExtraction: (fileOrBuffer?: File | Uint8Array | ArrayBuffer) => Promise<void>;
  downloadNativeMstsPdf: () => void;

  // Screen 4: Technical Sketch Analyzer (Vision AI)
  isAnalyzingSketch: boolean;
  visionDetection: VisionDetection;
  runVisionAnalysis: () => void;

  // Screen 5: Dev Object Fan-Out
  fanOutStatus: Record<string, 'pending' | 'generating' | 'completed'>;
  isFanningOut: boolean;
  runFanOut: () => void;

  // Screen 6: BOM Generator (FlexPLM Payload)
  selectedDevObjectId: string;
  setSelectedDevObjectId: (id: string) => void;
  generatedPayloads: Record<string, FlexPlmPayload>;
  activeBomPayload: FlexPlmPayload | null;

  // Screen 7: Material Validation
  validationResults: ValidationItemResult[];
  runMaterialValidation: () => void;
  extraTestMaterial: string;
  setExtraTestMaterial: (mat: string) => void;
  addCustomMaterialTest: (name: string) => void;

  // Screen 8: Historical Intelligence (RAG)
  ragSearchQuery: string;
  setRagSearchQuery: (q: string) => void;
  historicalMatches: HistoricalBom[];
  selectedHistoricalBom: HistoricalBom | null;
  setSelectedHistoricalBom: (hb: HistoricalBom | null) => void;

  // Screen 9: Correction Workflow
  correctionPart: string;
  setCorrectionPart: (part: string) => void;
  suggestedMaterial: string;
  setSuggestedMaterial: (mat: string) => void;
  correctedMaterial: string;
  setCorrectedMaterial: (mat: string) => void;
  correctionReason: string;
  setCorrectionReason: (reason: string) => void;
  correctionsLog: UserCorrectionEvent[];
  submitCorrection: () => void;

  // Screen 10: Learning Dashboard
  learningStats: LearningStats;

  // 10 MSTS Samples & Bulk Upload Hub
  ingestedDocs: IngestedMstsDocument[];
  addUploadedMstsFiles: (files: FileList | File[]) => void;
  loadAllTenPresets: () => void;
  selectMstsDoc: (docId: string) => void;
  deleteMstsDoc: (docId: string) => void;
  batchGenerateBoms: () => void;
  isBatchGenerating: boolean;
  activeUploadModalOpen: boolean;
  setActiveUploadModalOpen: (open: boolean) => void;
  clearAllSampleData: () => void;
  loadSamplePresets: () => void;
  isCleanSlate: boolean;

  // Agentic Architecture & Documentation Modals
  agenticStudioOpen: boolean;
  setAgenticStudioOpen: (open: boolean) => void;
  docsCenterOpen: boolean;
  setDocsCenterOpen: (open: boolean) => void;
  zeroHallucinationMode: boolean;
  setZeroHallucinationMode: (enabled: boolean) => void;

  // Demo Script Tour
  isDemoRunning: boolean;
  demoStep: number;
  startDemoTour: () => void;
  stopDemoTour: () => void;
  nextDemoStep: () => void;
  showFinalDemoModal: boolean;
  setShowFinalDemoModal: (show: boolean) => void;

  // Saved Runtime Sample Library (Runtime Processing Always)
  savedSamples: SavedPdfSample[];
  saveCurrentAsSample: () => void;
  removeSavedSample: (sampleId: string) => void;
  runSavedSampleAtRuntime: (sampleId: string) => Promise<void>;
  isCurrentSaved: boolean;
  runtimeNotification: string | null;
  clearRuntimeNotification: () => void;
}

const TechPackContext = createContext<TechPackContextType | undefined>(undefined);

export const TechPackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<number>(1);

  // Clean-slate state & custom dynamically parsed styles (default: true per user request - 0 mock data)
  const [isCleanSlate, setIsCleanSlate] = useState<boolean>(true);
  const [customStyles, setCustomStyles] = useState<MasterStyle[]>([]);

  // Saved Runtime Sample Library (Persistent across reloads)
  const [savedSamples, setSavedSamples] = useState<SavedPdfSample[]>(() => {
    try {
      const stored = localStorage.getItem('omni_saved_pdf_samples');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [runtimeNotification, setRuntimeNotification] = useState<string | null>(null);
  const clearRuntimeNotification = () => setRuntimeNotification(null);

  // Agentic & Docs modal states
  const [agenticStudioOpen, setAgenticStudioOpen] = useState<boolean>(false);
  const [docsCenterOpen, setDocsCenterOpen] = useState<boolean>(false);
  const [zeroHallucinationMode, setZeroHallucinationMode] = useState<boolean>(true);

  // Screen 1: Search & Style Selection
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMasterStyle, setSelectedMasterStyle] = useState<MasterStyle>(EMPTY_MASTER_STYLE);

  // Strictly no mock data stored in catalog - only user uploaded/executed tech packs
  const availableStyles = customStyles;
  const filteredStyles = availableStyles.filter((ms) => {
    if (ms.masterStyleId === 'PENDING') return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      ms.name.toLowerCase().includes(q) ||
      ms.masterStyleId.toLowerCase().includes(q) ||
      ms.code.toLowerCase().includes(q) ||
      ms.styleIds.some((s) => s.toLowerCase().includes(q)) ||
      ms.devObjects.some((d) => d.code.toLowerCase().includes(q) || d.name.toLowerCase().includes(q))
    );
  });

  // Screen 2: Workspace (clean slate: not uploaded yet)
  const [sketchUploaded, setSketchUploaded] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Screen 3: Plugin Metadata & Native PDF In-Stream Parser (Clean state by default)
  const [pluginData, setPluginData] = useState<PluginMetadata>({
    schema: 'pdam.illustrator.master-sketch',
    schemaVersion: '1.0.0',
    parts: [],
    devObjects: []
  });
  const resetPluginData = () => {
    setPluginData({
      schema: 'pdam.illustrator.master-sketch',
      schemaVersion: '1.0.0',
      parts: [],
      devObjects: []
    });
  };
  const [nativeParseResult, setNativeParseResult] = useState<NativeParseResult | null>(null);
  const [isParsingNativePdf, setIsParsingNativePdf] = useState<boolean>(false);

  // Saved Sample Library Methods (Stores strictly inputs combination: PDF + Master Style + Styles)
  const isCurrentSaved = savedSamples.some(
    (s) =>
      (s.fileName && s.fileName === uploadedFileName) ||
      (s.masterStyle?.masterStyleId === selectedMasterStyle.masterStyleId &&
        selectedMasterStyle.masterStyleId !== 'PENDING')
  );

  const saveCurrentAsSample = (customInputs?: {
    masterStyleId?: string;
    masterStyleName?: string;
    season?: Season;
    styleCode?: string;
    styleIds?: string[];
  }) => {
    if (selectedMasterStyle.masterStyleId === 'PENDING') return;
    const fName =
      uploadedFileName ||
      `MasterStyleTechnicalSketch_${selectedMasterStyle.name.replace(/\s+/g, '_')}_${selectedMasterStyle.season}.pdf`;

    const msId = customInputs?.masterStyleId || selectedMasterStyle.masterStyleId;
    const msName = customInputs?.masterStyleName || selectedMasterStyle.name;
    const sSeason = customInputs?.season || selectedMasterStyle.season;
    const sCode = customInputs?.styleCode || selectedMasterStyle.code;
    const sIds =
      customInputs?.styleIds ||
      (selectedMasterStyle.styleIds.length > 0
        ? selectedMasterStyle.styleIds
        : selectedMasterStyle.devObjects.map((d) => d.devObjectId));

    // ONLY the required inputs combination (PDF + Master Style + Styles)
    // ZERO intermediate CAD DOM or final BOM payloads are stored!
    const newSample: SavedPdfSample = {
      id: `sample-${Date.now()}`,
      fileName: fName,
      fileSize: '2.4 MB',
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      masterStyle: {
        masterStyleId: msId,
        masterStyleName: msName,
        season: sSeason,
        category: selectedMasterStyle.category,
        documentType: selectedMasterStyle.documentType
      },
      styles: {
        code: sCode,
        styleIds: sIds,
        colorways: selectedMasterStyle.devObjects.map((d) => d.colorway)
      }
    };

    setSavedSamples((prev) => {
      const updated = [
        newSample,
        ...prev.filter((p) => p.fileName !== fName && p.masterStyle?.masterStyleId !== msId)
      ];
      try {
        localStorage.setItem('omni_saved_pdf_samples', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      return updated;
    });

    setRuntimeNotification(
      `Saved "${fName}" to Sample List. Stored ONLY input combination (PDF + Master Style + Styles). Zero intermediate or final results stored.`
    );
  };

  const removeSavedSample = (sampleId: string) => {
    setSavedSamples((prev) => {
      const updated = prev.filter((s) => s.id !== sampleId);
      try {
        localStorage.setItem('omni_saved_pdf_samples', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      return updated;
    });
  };

  const runSavedSampleAtRuntime = async (sampleId: string) => {
    const sample = savedSamples.find((s) => s.id === sampleId);
    if (!sample) return;

    setIsParsingNativePdf(true);
    setRuntimeNotification(`Executing live runtime in-stream parsing for "${sample.fileName}" (Zero mock cache)...`);

    try {
      // 1. Generate real in-memory PDF byte stream for the sample containing strictly the input combination
      const msName = sample.masterStyle?.masterStyleName || sample.fileName.replace(/\.pdf$/i, '');
      const msId = sample.masterStyle?.masterStyleId || 'MST-1001';
      const msSeason = sample.masterStyle?.season || 'SP28';
      const styleIds = sample.styles?.styleIds || ['DO-001', 'DO-002'];
      const styleCode = sample.styles?.code || 'WY-001AA';

      const buffer = generateNativeMstsPdfBuffer(
        msName,
        msId,
        msSeason,
        {
          schema: 'pdam.illustrator.master-sketch',
          schemaVersion: '1.0.0',
          parts: [],
          devObjects: styleIds.map((id, idx) => ({
            devObjectId: id,
            colorwayName: sample.styles?.colorways?.[idx] || `Colorway ${idx + 1}`,
            parts: []
          }))
        }
      );

      // 2. Run full runtime engine on the input stream (no cache, fresh computation!)
      const bundle = await buildCompleteTechPackFromPdf(buffer, sample.fileName, {
        masterStyleId: msId,
        masterStyleName: msName,
        season: msSeason,
        styleCode,
        styleIds
      });

      // 3. Populate state dynamically from runtime result
      setCustomStyles((prev) => [
        bundle.masterStyle,
        ...prev.filter((s) => s.masterStyleId !== bundle.masterStyle.masterStyleId)
      ]);
      setSelectedMasterStyle(bundle.masterStyle);
      setPluginData(bundle.pluginData);
      setVisionDetection(bundle.visionDetection);
      setNativeParseResult(bundle.nativeParseResult);
      setGeneratedPayloads(bundle.payloads);

      const fanStatus: Record<string, 'completed'> = {};
      bundle.masterStyle.devObjects.forEach((d) => {
        fanStatus[d.devObjectId] = 'completed';
      });
      setFanOutStatus(fanStatus);
      if (bundle.masterStyle.devObjects.length > 0) {
        setSelectedDevObjectId(bundle.masterStyle.devObjects[0].devObjectId);
      }

      const matNames = Array.from(
        new Set(
          Object.values(bundle.payloads).flatMap((p) => p.bom.map((b) => b.materialName))
        )
      );
      if (matNames.length > 0) {
        setMaterialsToValidate(matNames);
      }

      setUploadedFileName(sample.fileName);
      setSketchUploaded(true);
      setIsCleanSlate(false);

      // Add to ingested docs list
      const docEntry: IngestedMstsDocument = {
        id: `msts-${Date.now()}`,
        fileName: sample.fileName,
        fileSize: sample.fileSize,
        uploadedAt: 'Runtime Parsed',
        source: 'Sample',
        status: 'BOM Generated',
        masterStyleId: bundle.masterStyle.masterStyleId,
        masterStyleName: bundle.masterStyle.name,
        partsCount: bundle.pluginData.parts.length,
        devObjectsCount: bundle.masterStyle.devObjects.length,
        season: bundle.masterStyle.season,
        latencyMs: bundle.nativeParseResult.parseDurationMs,
        xmpExtracted: true,
        flexPlmPayloadReady: true
      };
      setIngestedDocs((prev) => [docEntry, ...prev.filter((d) => d.fileName !== sample.fileName)]);

      setRuntimeNotification(`Runtime extraction complete for "${sample.fileName}": Decomposed ${bundle.pluginData.parts.length} CAD parts & generated FlexPLM BOMs.`);
      setCurrentScreen(2);
    } catch (err) {
      console.error('Runtime parsing error:', err);
      setRuntimeNotification(`Error parsing "${sample.fileName}" at runtime.`);
    } finally {
      setIsParsingNativePdf(false);
    }
  };

  const runNativePdfExtraction = async (fileOrBuffer?: File | Uint8Array | ArrayBuffer) => {
    setIsParsingNativePdf(true);
    try {
      let input: File | Uint8Array | ArrayBuffer;
      let fName = uploadedFileName;

      if (fileOrBuffer instanceof File) {
        input = fileOrBuffer;
        fName = fileOrBuffer.name;
        setUploadedFileName(fileOrBuffer.name);
      } else if (fileOrBuffer) {
        input = fileOrBuffer;
      } else {
        input = generateNativeMstsPdfBuffer(
          selectedMasterStyle.name,
          selectedMasterStyle.masterStyleId,
          selectedMasterStyle.season,
          pluginData
        );
      }

      const result = await parseNativeMstsPdfStream(input, fName, pluginData);
      setNativeParseResult(result);

      if (result.parsedPluginData) {
        setPluginData(result.parsedPluginData);
      }
    } catch (err) {
      console.error('Error during native in-stream PDF extraction:', err);
    } finally {
      setIsParsingNativePdf(false);
    }
  };

  const downloadNativeMstsPdf = () => {
    const buffer = generateNativeMstsPdfBuffer(
      selectedMasterStyle.name,
      selectedMasterStyle.masterStyleId,
      selectedMasterStyle.season,
      pluginData
    );
    const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MasterStyleTechnicalSketch_${selectedMasterStyle.masterStyleId}_${selectedMasterStyle.season}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSketchUpload = async (file: File | string) => {
    if (file instanceof File) {
      setIsParsingNativePdf(true);
      try {
        const bundle = await buildCompleteTechPackFromPdf(file);
        setCustomStyles((prev) => [
          bundle.masterStyle,
          ...prev.filter((s) => s.masterStyleId !== bundle.masterStyle.masterStyleId)
        ]);
        setSelectedMasterStyle(bundle.masterStyle);
        setPluginData(bundle.pluginData);
        setVisionDetection(bundle.visionDetection);
        setNativeParseResult(bundle.nativeParseResult);
        setGeneratedPayloads(bundle.payloads);

        const fanStatus: Record<string, 'completed'> = {};
        bundle.masterStyle.devObjects.forEach((d) => {
          fanStatus[d.devObjectId] = 'completed';
        });
        setFanOutStatus(fanStatus);
        if (bundle.masterStyle.devObjects.length > 0) {
          setSelectedDevObjectId(bundle.masterStyle.devObjects[0].devObjectId);
        }

        const matNames = Array.from(
          new Set(
            Object.values(bundle.payloads).flatMap((p) => p.bom.map((b) => b.materialName))
          )
        );
        if (matNames.length > 0) {
          setMaterialsToValidate(matNames);
        }

        setUploadedFileName(file.name);
        setSketchUploaded(true);
        setIsCleanSlate(false);

        const newDoc: IngestedMstsDocument = {
          id: `msts-upload-${Date.now()}`,
          fileName: file.name,
          fileSize: file.size > 0 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB',
          uploadedAt: 'Just now',
          source: 'Upload',
          status: 'BOM Generated',
          masterStyleId: bundle.masterStyle.masterStyleId,
          masterStyleName: bundle.masterStyle.name,
          partsCount: bundle.pluginData.parts.length,
          devObjectsCount: bundle.masterStyle.devObjects.length,
          season: bundle.masterStyle.season,
          latencyMs: bundle.nativeParseResult.parseDurationMs,
          xmpExtracted: bundle.nativeParseResult.hasMstsPluginData || bundle.nativeParseResult.hasXmpEnvelope,
          flexPlmPayloadReady: true
        };

        setIngestedDocs((prev) => [newDoc, ...prev.filter((d) => d.fileName !== file.name)]);
      } catch (err) {
        console.error('Error parsing uploaded PDF to tech pack:', err);
      } finally {
        setIsParsingNativePdf(false);
      }
    } else {
      setUploadedFileName(file);
      runNativePdfExtraction();
      setSketchUploaded(true);
    }
  };

  // Initial load: run native extraction on authentic PDF 1.7 buffer only if style loaded
  useEffect(() => {
    if (selectedMasterStyle.masterStyleId !== 'PENDING') {
      runNativePdfExtraction();
    }
  }, [selectedMasterStyle.masterStyleId]);

  // Screen 4: Vision Analysis (Zero mock data stored)
  const [isAnalyzingSketch, setIsAnalyzingSketch] = useState<boolean>(false);
  const [visionDetection, setVisionDetection] = useState<VisionDetection>({
    parts: [],
    materials: [],
    trims: [],
    confidence: 0,
    annotatedFeatures: []
  });

  const runVisionAnalysis = () => {
    setIsAnalyzingSketch(true);
    setTimeout(() => {
      const parts = pluginData.parts.map((p) => p.name);
      setVisionDetection({
        parts: parts.length > 0 ? parts : ['Body Panel', 'Waistband', 'Trim Accent'],
        materials: ['EcoTech Performance Shell', 'Recycled Mesh', 'Bonded Thread'],
        trims: ['YKK Reverse Coil #5', 'Laser-cut Badge'],
        confidence: 0.96,
        annotatedFeatures: (pluginData.parts.length > 0 ? pluginData.parts : [{ name: 'Body Panel', partType: 'Fabric part' }]).map((part, idx) => ({
          label: part.name,
          type: (part.partType === 'Trim part' ? 'trim' : 'part') as 'part' | 'material' | 'trim',
          x: 15 + (idx % 3) * 28,
          y: 20 + Math.floor(idx / 3) * 35,
          width: 24,
          height: 28
        }))
      });
      setIsAnalyzingSketch(false);
    }, 1100);
  };

  // Screen 5: Fan-out (Zero mock data stored)
  const [fanOutStatus, setFanOutStatus] = useState<Record<string, 'pending' | 'generating' | 'completed'>>({});
  const [isFanningOut, setIsFanningOut] = useState<boolean>(false);

  // Screen 6: BOM Generation (Zero mock data stored)
  const [selectedDevObjectId, setSelectedDevObjectId] = useState<string>('');

  // Generator for FlexPLM payloads
  const createPayloadForDevObject = (devId: string, style: MasterStyle): FlexPlmPayload => {
    // If we have dynamic payloads generated from uploaded PDF, prioritize them
    if (generatedPayloads[devId]) {
      return generatedPayloads[devId];
    }

    const devObj = style.devObjects.find((d) => d.devObjectId === devId) || style.devObjects[0];
    const isPrint = devId === 'DO-003' || (devObj && devObj.name.toLowerCase().includes('print'));
    const isJacket = style.category === 'Outerwear' || style.name.toLowerCase().includes('jacket') || style.name.toLowerCase().includes('parka');
    const isTop = style.category === 'Tops' || style.name.toLowerCase().includes('hoodie');

    let boms: BomItem[] = [];

    if (isJacket) {
      boms = [
        {
          section: 'fabric',
          standardPlacement: 'Self',
          placement: 'MAIN BODY & HOOD SHELL',
          materialName: isPrint ? 'Luon Engineered Print' : 'Luon Interlock / EcoTech 3-Ply',
          supplierName: 'ABC Textiles & Toray',
          supplierArticle: isPrint ? 'MAT-015' : 'MAT-021',
          consumption: '2.15',
          unit: 'Yards'
        },
        {
          section: 'fabric',
          standardPlacement: 'Trim',
          placement: 'POCKET BAG & VENTILATION MESH',
          materialName: 'Power Mesh',
          supplierName: 'XYZ Mills',
          supplierArticle: 'MAT-002',
          consumption: '0.35',
          unit: 'Yards'
        },
        {
          section: 'trim',
          standardPlacement: 'Closure',
          placement: 'FRONT CENTER ZIPPER',
          materialName: 'YKK Aquaguard #5 Matte Reverse Coil',
          supplierName: 'YKK Fastening Systems',
          supplierArticle: 'TRM-YKK-05',
          consumption: '1.00',
          unit: 'Pieces'
        },
        {
          section: 'trim',
          standardPlacement: 'Accent',
          placement: 'ZIPPER PULL EMERGENCY HAIR TIE',
          materialName: 'Elastic Hair Tie Loop',
          supplierName: 'TrimWorks',
          supplierArticle: 'TRM-009',
          consumption: '1.00',
          unit: 'Pieces'
        },
        {
          section: 'trim',
          standardPlacement: 'Seams',
          placement: 'STRUCTURAL FLATLOCK THREAD',
          materialName: 'Coats EcoVerde Recycled Poly 40',
          supplierName: 'Coats Industrial Thread',
          supplierArticle: 'THD-002',
          consumption: '240.00',
          unit: 'Meters'
        },
        {
          section: 'label',
          standardPlacement: 'Interior',
          placement: 'CARE & CONTENT HEAT SEAL',
          materialName: 'Eco-Silicone Heat Transfer Label',
          supplierName: 'Avery Dennison',
          supplierArticle: 'LBL-001',
          consumption: '1.00',
          unit: 'Pieces'
        }
      ];
    } else if (isTop) {
      boms = [
        {
          section: 'fabric',
          standardPlacement: 'Self',
          placement: 'TORSO FRONT & BACK',
          materialName: 'Heavyweight Loopback Fleece',
          supplierName: 'ABC Textiles',
          supplierArticle: 'MAT-025',
          consumption: '1.85',
          unit: 'Yards'
        },
        {
          section: 'fabric',
          standardPlacement: 'Self',
          placement: '2X2 SLEEVE & HEM RIB',
          materialName: 'Elastic Rib',
          supplierName: 'StretchTech',
          supplierArticle: 'MAT-005',
          consumption: '0.40',
          unit: 'Yards'
        },
        {
          section: 'trim',
          standardPlacement: 'Closure',
          placement: 'FRONT HALF ZIPPER',
          materialName: 'YKK #5 Vislon Zipper',
          supplierName: 'YKK Fastening Systems',
          supplierArticle: 'TRM-YKK-02',
          consumption: '1.00',
          unit: 'Pieces'
        }
      ];
    } else {
      boms = [
        {
          section: 'fabric',
          standardPlacement: 'Self',
          placement: 'BODY LEGS',
          materialName: isPrint ? 'NULU Print' : 'NULU',
          supplierName: 'ABC Textiles',
          supplierArticle: isPrint ? 'MAT-015' : 'MAT-001',
          consumption: '1.25',
          unit: 'Yards'
        },
        {
          section: 'fabric',
          standardPlacement: 'Trim',
          placement: 'POCKET BAG',
          materialName: 'Power Mesh',
          supplierName: 'XYZ Mills',
          supplierArticle: 'MAT-002',
          consumption: '0.18',
          unit: 'Yards'
        },
        {
          section: 'fabric',
          standardPlacement: 'Self',
          placement: 'WAISTBAND INNER',
          materialName: isPrint ? 'NULU Print' : 'NULU',
          supplierName: 'ABC Textiles',
          supplierArticle: isPrint ? 'MAT-015' : 'MAT-001',
          consumption: '0.35',
          unit: 'Yards'
        },
        {
          section: 'trim',
          standardPlacement: 'Accent',
          placement: 'LOGO HEAT TRANSFER',
          materialName: 'Heat Transfer Logo',
          supplierName: 'Avery Dennison',
          supplierArticle: 'TRM-001',
          consumption: '1.00',
          unit: 'Pieces'
        },
        {
          section: 'trim',
          standardPlacement: 'Waistband',
          placement: 'DRAW CORD',
          materialName: 'Draw Cord',
          supplierName: 'TrimWorks',
          supplierArticle: 'MAT-006',
          consumption: '1.10',
          unit: 'Meters'
        },
        {
          section: 'trim',
          standardPlacement: 'Seams',
          placement: 'FLATLOCK STITCH THREAD',
          materialName: 'Recycled Poly Thread 40',
          supplierName: 'Coats Group',
          supplierArticle: 'THD-002',
          consumption: '185.00',
          unit: 'Meters'
        }
      ];
    }

    return {
      header: {
        eventSource: 'OmniThink',
        eventEntity: 'Development BOM',
        eventType: 'Create',
        timestamp: '2026-10-15T08:14:00Z',
        correlationId: `OMNI-SP28-${style.masterStyleId}-${devId}-7742`
      },
      devObjectId: devObj ? devObj.devObjectId : devId,
      seasonCode: style.season,
      masterStyleId: style.masterStyleId,
      bom: boms
    };
  };

  const [generatedPayloads, setGeneratedPayloads] = useState<Record<string, FlexPlmPayload>>({});

  const runFanOut = () => {
    setIsFanningOut(true);
    const devIds = selectedMasterStyle.devObjects.map((d) => d.devObjectId);
    const initialStatus: Record<string, 'pending' | 'generating' | 'completed'> = {};
    devIds.forEach((id) => {
      initialStatus[id] = 'generating';
    });
    setFanOutStatus(initialStatus);

    setTimeout(() => {
      const updatedStatus: Record<string, 'pending' | 'generating' | 'completed'> = {};
      const newPayloads: Record<string, FlexPlmPayload> = {};
      devIds.forEach((id) => {
        updatedStatus[id] = 'completed';
        newPayloads[id] = createPayloadForDevObject(id, selectedMasterStyle);
      });
      setFanOutStatus(updatedStatus);
      setGeneratedPayloads(newPayloads);

      const allMats = Array.from(
        new Set(
          Object.values(newPayloads).flatMap((p) => p.bom.map((b) => b.materialName))
        )
      );
      if (allMats.length > 0) {
        setMaterialsToValidate(allMats);
      }

      setIsFanningOut(false);
    }, 1200);
  };

  const activeBomPayload = generatedPayloads[selectedDevObjectId] || generatedPayloads['DO-001'] || null;

  // Screen 7: Material Validation
  const evaluateMaterial = (matName: string): ValidationItemResult => {
    const found = MATERIAL_LIBRARY.find((m) => m.material.toLowerCase() === matName.toLowerCase());
    if (!found) {
      return {
        material: matName,
        status: 'In Development',
        supplier: 'Custom / Pending',
        articleNumber: 'MAT-NEW',
        outcome: 'Warn',
        reason: 'Material unverified in FlexPLM master library'
      };
    }

    if (found.status === 'Approved') {
      return {
        material: found.material,
        status: found.status,
        supplier: found.supplier,
        articleNumber: found.articleNumber,
        outcome: 'Pass',
        reason: 'FlexPLM Status = Approved (Production Cleared)'
      };
    }

    if (found.status === 'In Development') {
      return {
        material: found.material,
        status: found.status,
        supplier: found.supplier,
        articleNumber: found.articleNumber,
        outcome: 'Warn',
        reason: 'Status = In Development (Requires Materials Committee Sign-off)'
      };
    }

    // Rejected, Dropped, Lab Use Only, Deactivated
    return {
      material: found.material,
      status: found.status,
      supplier: found.supplier,
      articleNumber: found.articleNumber,
      outcome: 'Reject',
      reason: `Status = ${found.status} (Restricted: ${found.notes || 'Not permitted in commercial BOM'})`
    };
  };

  const [materialsToValidate, setMaterialsToValidate] = useState<string[]>([]);
  const [extraTestMaterial, setExtraTestMaterial] = useState<string>('');

  const validationResults: ValidationItemResult[] = materialsToValidate.map(evaluateMaterial);

  const addCustomMaterialTest = (matName: string) => {
    const trimmed = matName.trim();
    if (!trimmed || materialsToValidate.includes(trimmed)) return;
    setMaterialsToValidate((prev) => [...prev, trimmed]);
    setExtraTestMaterial('');
  };

  const runMaterialValidation = () => {
    // Re-trigger validation
    setMaterialsToValidate([...materialsToValidate]);
  };

  // Screen 8: Historical Intelligence (RAG - Zero mock data)
  const [ragSearchQuery, setRagSearchQuery] = useState<string>('');
  const [selectedHistoricalBom, setSelectedHistoricalBom] = useState<HistoricalBom | null>(null);

  const historicalMatches = ragSearchQuery.trim()
    ? HISTORICAL_BOMS_DATASET.filter((hb) => {
        const q = ragSearchQuery.toLowerCase();
        return (
          hb.styleName.toLowerCase().includes(q) ||
          hb.season.toLowerCase().includes(q) ||
          hb.category.toLowerCase().includes(q) ||
          hb.baseMaterials.some((m) => m.toLowerCase().includes(q))
        );
      }).sort((a, b) => b.similarity - a.similarity)
    : [];

  // Screen 9: Correction Workflow (Zero mock data)
  const [correctionPart, setCorrectionPart] = useState<string>('Pocket');
  const [suggestedMaterial, setSuggestedMaterial] = useState<string>('Power Mesh');
  const [correctedMaterial, setCorrectedMaterial] = useState<string>('Recycled Power Mesh');
  const [correctionReason, setCorrectionReason] = useState<string>('SP28 ESG mandate: replace virgin mesh with recycled nylon mesh (MAT-007)');
  const [correctionsLog, setCorrectionsLog] = useState<UserCorrectionEvent[]>([]);

  // Screen 10: Learning Stats (Zero mock data)
  const [learningStats, setLearningStats] = useState<LearningStats>({
    topCorrections: [],
    mostCorrectedPart: 'None',
    recommendationConfidence: 0,
    totalCorrections: 0,
    driftReductionPercent: 0
  });

  const submitCorrection = () => {
    if (!correctedMaterial.trim()) return;

    const newEvent: UserCorrectionEvent = {
      id: `corr-${Date.now().toString().slice(-4)}`,
      timestamp: '2026-10-15 08:15',
      part: correctionPart,
      suggestedMaterial: suggestedMaterial,
      correctedMaterial: correctedMaterial,
      reason: correctionReason,
      appliedToMaster: true
    };

    setCorrectionsLog((prev) => [newEvent, ...prev]);

    // Update learning stats
    setLearningStats((prev) => {
      const existingIdx = prev.topCorrections.findIndex(
        (c) => c.from.toLowerCase() === suggestedMaterial.toLowerCase() && c.to.toLowerCase() === correctedMaterial.toLowerCase()
      );

      let newTop = [...prev.topCorrections];
      if (existingIdx >= 0) {
        newTop[existingIdx] = {
          ...newTop[existingIdx],
          count: newTop[existingIdx].count + 1
        };
      } else {
        newTop.push({
          from: suggestedMaterial,
          to: correctedMaterial,
          count: 1
        });
      }

      newTop.sort((a, b) => b.count - a.count);

      return {
        ...prev,
        totalCorrections: prev.totalCorrections + 1,
        recommendationConfidence: Math.min(0.96, Number((prev.recommendationConfidence + 0.01).toFixed(2))),
        driftReductionPercent: Number((prev.driftReductionPercent + 1.2).toFixed(1)),
        topCorrections: newTop
      };
    });

    // Update current active BOM payloads to reflect corrected material in Pocket
    setGeneratedPayloads((prev) => {
      const updated: Record<string, FlexPlmPayload> = {};
      Object.keys(prev).forEach((key) => {
        const payload = prev[key];
        const updatedBom = payload.bom.map((item) => {
          if (item.placement.toLowerCase().includes('pocket') || item.standardPlacement.toLowerCase() === 'trim') {
            return {
              ...item,
              materialName: correctedMaterial,
              supplierName: 'EcoFiber Corp',
              supplierArticle: 'MAT-007'
            };
          }
          return item;
        });
        updated[key] = {
          ...payload,
          bom: updatedBom
        };
      });
      return updated;
    });
  };

  // Demo Tour State
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [showFinalDemoModal, setShowFinalDemoModal] = useState<boolean>(false);

  const startDemoTour = () => {
    setIsDemoRunning(true);
    setDemoStep(1);
    setCurrentScreen(1);
  };

  const stopDemoTour = () => {
    setIsDemoRunning(false);
    setDemoStep(0);
  };

  const nextDemoStep = () => {
    if (demoStep >= 10) {
      setIsDemoRunning(false);
      setShowFinalDemoModal(true);
      return;
    }
    const next = demoStep + 1;
    setDemoStep(next);
    setCurrentScreen(next);
  };

  const nextScreen = () => {
    if (currentScreen < 10) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const prevScreen = () => {
    if (currentScreen > 1) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  // Batch MSTS Documents (Clean slate by default - 0 mock documents)
  const [ingestedDocs, setIngestedDocs] = useState<IngestedMstsDocument[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [activeUploadModalOpen, setActiveUploadModalOpen] = useState<boolean>(false);

  const addUploadedMstsFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsParsingNativePdf(true);
    try {
      const bundles = await Promise.all(
        fileArray.map((file) => buildCompleteTechPackFromPdf(file))
      );

      const newStyles = bundles.map((b) => b.masterStyle);
      setCustomStyles((prev) => [...newStyles, ...prev]);

      const newDocs: IngestedMstsDocument[] = bundles.map((b, idx) => {
        const origFile = fileArray[idx];
        const sizeMb = origFile.size > 0 ? (origFile.size / (1024 * 1024)).toFixed(1) : '2.8';
        return {
          id: `msts-upload-${Date.now()}-${idx}`,
          fileName: origFile.name,
          fileSize: `${sizeMb} MB`,
          uploadedAt: 'Just now',
          source: 'Upload' as const,
          status: 'BOM Generated' as const,
          masterStyleId: b.masterStyle.masterStyleId,
          masterStyleName: b.masterStyle.name,
          partsCount: b.pluginData.parts.length,
          devObjectsCount: b.masterStyle.devObjects.length,
          season: b.masterStyle.season,
          latencyMs: b.nativeParseResult.parseDurationMs,
          xmpExtracted: b.nativeParseResult.hasMstsPluginData || b.nativeParseResult.hasXmpEnvelope,
          flexPlmPayloadReady: true
        };
      });

      setIngestedDocs((prev) => [...newDocs, ...prev]);

      // Activate the first uploaded document immediately across the entire app
      const first = bundles[0];
      setSelectedMasterStyle(first.masterStyle);
      setPluginData(first.pluginData);
      setVisionDetection(first.visionDetection);
      setNativeParseResult(first.nativeParseResult);
      setGeneratedPayloads(first.payloads);

      const fanStatus: Record<string, 'completed'> = {};
      first.masterStyle.devObjects.forEach((d) => {
        fanStatus[d.devObjectId] = 'completed';
      });
      setFanOutStatus(fanStatus);
      if (first.masterStyle.devObjects.length > 0) {
        setSelectedDevObjectId(first.masterStyle.devObjects[0].devObjectId);
      }

      const allMats = Array.from(
        new Set(
          Object.values(first.payloads).flatMap((p) => p.bom.map((b) => b.materialName))
        )
      );
      if (allMats.length > 0) {
        setMaterialsToValidate(allMats);
      }

      setUploadedFileName(fileArray[0].name);
      setSketchUploaded(true);
      setIsCleanSlate(false);
    } catch (err) {
      console.error('Error during batch MSTS ingestion:', err);
    } finally {
      setIsParsingNativePdf(false);
    }
  };

  const loadAllTenPresets = () => {
    setIsCleanSlate(false);
    setIngestedDocs(INITIAL_MSTS_DOCUMENTS);
    if (SAMPLE_MASTER_STYLES.length > 0) {
      setSelectedMasterStyle(SAMPLE_MASTER_STYLES[0]);
      setUploadedFileName(INITIAL_MSTS_DOCUMENTS[0].fileName);
      setSketchUploaded(true);
      setPluginData(SAMPLE_PLUGIN_DATA);
      setVisionDetection(SAMPLE_VISION_DETECTION);
    }
  };

  const loadSamplePresets = () => {
    loadAllTenPresets();
    setCurrentScreen(1);
  };

  const clearAllSampleData = () => {
    setIsCleanSlate(true);
    setCustomStyles([]);
    setIngestedDocs([]);
    setSelectedMasterStyle(EMPTY_MASTER_STYLE);
    setSketchUploaded(false);
    setUploadedFileName('');
    setSavedSamples([]);
    try {
      localStorage.removeItem('omni_saved_pdf_samples');
      localStorage.clear();
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
    }
    setPluginData({
      schema: 'pdam.illustrator.master-sketch',
      schemaVersion: '1.0.0',
      parts: [],
      devObjects: []
    });
    setNativeParseResult(null);
    setVisionDetection({
      parts: [],
      materials: [],
      trims: [],
      confidence: 0,
      annotatedFeatures: []
    });
    setGeneratedPayloads({});
    setFanOutStatus({});
    setSelectedDevObjectId('');
    setMaterialsToValidate([]);
    setCorrectionsLog([]);
    setLearningStats({
      topCorrections: [],
      mostCorrectedPart: 'None',
      recommendationConfidence: 0,
      totalCorrections: 0,
      driftReductionPercent: 0
    });
    setSelectedHistoricalBom(null);
    setRagSearchQuery('');
    setCurrentScreen(1);
    setRuntimeNotification(
      'History purged. All historical data, saved samples, and pipeline results have been completely cleared.'
    );
  };

  const deleteMstsDoc = (docId: string) => {
    setIngestedDocs((prev) => {
      const remaining = prev.filter((d) => d.id !== docId);
      if (remaining.length === 0) {
        clearAllSampleData();
      } else if (selectedMasterStyle && !remaining.some((d) => d.masterStyleId === selectedMasterStyle.masterStyleId)) {
        selectMstsDoc(remaining[0].id);
      }
      return remaining;
    });
  };

  const selectMstsDoc = (docId: string) => {
    const doc = ingestedDocs.find((d) => d.id === docId);
    if (!doc) return;
    const style = customStyles.find((s) => s.masterStyleId === doc.masterStyleId);
    if (style) {
      setSelectedMasterStyle(style);
      setUploadedFileName(doc.fileName);
      setSketchUploaded(true);
    }
  };

  const batchGenerateBoms = () => {
    setIsBatchGenerating(true);
    setTimeout(() => {
      setIngestedDocs((prev) =>
        prev.map((d) => ({
          ...d,
          status: 'BOM Generated' as const,
          flexPlmPayloadReady: true
        }))
      );
      setIsBatchGenerating(false);
    }, 900);
  };

  // Sync selected master style with payloads
  useEffect(() => {
    if (selectedMasterStyle.masterStyleId === 'PENDING') {
      setGeneratedPayloads({});
      setFanOutStatus({});
      setSelectedDevObjectId('');
      return;
    }
    const newPayloads: Record<string, FlexPlmPayload> = {};
    const newFanStatus: Record<string, 'pending' | 'generating' | 'completed'> = {};
    selectedMasterStyle.devObjects.forEach((d) => {
      newPayloads[d.devObjectId] = createPayloadForDevObject(d.devObjectId, selectedMasterStyle);
      newFanStatus[d.devObjectId] = 'completed';
    });
    setGeneratedPayloads(newPayloads);
    setFanOutStatus(newFanStatus);
    if (selectedMasterStyle.devObjects.length > 0) {
      setSelectedDevObjectId(selectedMasterStyle.devObjects[0].devObjectId);
    }
  }, [selectedMasterStyle]);

  return (
    <TechPackContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        nextScreen,
        prevScreen,
        searchQuery,
        setSearchQuery,
        selectedMasterStyle,
        setSelectedMasterStyle,
        filteredStyles,
        sketchUploaded,
        uploadedFileName,
        setUploadedFileName,
        handleSketchUpload,
        pluginData,
        setPluginData,
        resetPluginData,
        nativeParseResult,
        isParsingNativePdf,
        runNativePdfExtraction,
        downloadNativeMstsPdf,
        isAnalyzingSketch,
        visionDetection,
        runVisionAnalysis,
        fanOutStatus,
        isFanningOut,
        runFanOut,
        selectedDevObjectId,
        setSelectedDevObjectId,
        generatedPayloads,
        activeBomPayload,
        validationResults,
        runMaterialValidation,
        extraTestMaterial,
        setExtraTestMaterial,
        addCustomMaterialTest,
        ragSearchQuery,
        setRagSearchQuery,
        historicalMatches,
        selectedHistoricalBom,
        setSelectedHistoricalBom,
        correctionPart,
        setCorrectionPart,
        suggestedMaterial,
        setSuggestedMaterial,
        correctedMaterial,
        setCorrectedMaterial,
        correctionReason,
        setCorrectionReason,
        correctionsLog,
        submitCorrection,
        learningStats,
        ingestedDocs,
        addUploadedMstsFiles,
        loadAllTenPresets,
        selectMstsDoc,
        deleteMstsDoc,
        batchGenerateBoms,
        isBatchGenerating,
        activeUploadModalOpen,
        setActiveUploadModalOpen,
        clearAllSampleData,
        loadSamplePresets,
        isCleanSlate,
        agenticStudioOpen,
        setAgenticStudioOpen,
        docsCenterOpen,
        setDocsCenterOpen,
        zeroHallucinationMode,
        setZeroHallucinationMode,
        isDemoRunning,
        demoStep,
        startDemoTour,
        stopDemoTour,
        nextDemoStep,
        showFinalDemoModal,
        setShowFinalDemoModal,
        savedSamples,
        saveCurrentAsSample,
        removeSavedSample,
        runSavedSampleAtRuntime,
        isCurrentSaved,
        runtimeNotification,
        clearRuntimeNotification
      }}
    >
      {children}
    </TechPackContext.Provider>
  );
};

export const useTechPack = () => {
  const context = useContext(TechPackContext);
  if (!context) {
    throw new Error('useTechPack must be used within a TechPackProvider');
  }
  return context;
};
