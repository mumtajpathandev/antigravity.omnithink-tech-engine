import React from 'react';
import { useTechPack } from '../context/TechPackContext';
import { ChevronRight, X, Sparkles, CheckCircle2 } from 'lucide-react';

const DEMO_STEPS_INFO = [
  {
    step: 1,
    title: '1. Search Master Style',
    instruction: 'Simulates GLP → PLIM → Keystone product hierarchy lookup. Try searching ALIGN, MASCL, or WYAUBAA to inspect Master Style and linked Development Objects.',
    highlightAction: 'Select ALIGN PANT (MASCL)'
  },
  {
    step: 2,
    title: '2. Open Style Context',
    instruction: 'Simulates PDAM Master Style Technical Sketch ingestion. Ingests MasterStyleTechnicalSketch.pdf with metadata mapping to Season SP28.',
    highlightAction: 'Verify documentType FileMasterStyleTechnicalSketch'
  },
  {
    step: 3,
    title: '3. Load pluginData',
    instruction: 'Visualizes msts:pluginData extracted from the Adobe Illustrator technical sketch plugin schema (pdam.illustrator.master-sketch 1.0.0).',
    highlightAction: 'Inspect Parts (Upper, Pocket, Waistband) and DO material bindings'
  },
  {
    step: 4,
    title: '4. Analyze Technical Sketch',
    instruction: 'Runs Vision AI to detect anatomical parts, materials (NULU, Power Mesh), and trims (Heat Transfer Logo, Draw Cord) directly from vector CAD boundaries.',
    highlightAction: 'Review AI bounding boxes and confidence score (94%)'
  },
  {
    step: 5,
    title: '5. Fan-out Development Objects',
    instruction: 'Core SP28 capability: resolves Master Style ALIGN PANT into 3 distinct Development Objects (DO-001, DO-002, DO-003) to generate independent colorway BOMs in parallel.',
    highlightAction: 'Trigger parallel fan-out generation'
  },
  {
    step: 6,
    title: '6. Generate BOM',
    instruction: 'Produces the FlexPLM-ready BOM event payload (eventSource: OmniThink, eventEntity: Development BOM, eventType: Create) with standardized placements.',
    highlightAction: 'Toggle between Human Spec Table and FlexPLM JSON Payload'
  },
  {
    step: 7,
    title: '7. Validate Materials',
    instruction: 'Enforces FlexPLM material rules: Approved (Pass), In Development (Warn), and Rejected/Dropped/Lab Use Only/Deactivated (Reject).',
    highlightAction: 'Notice Rejected Fabric X blocked with Status = Rejected'
  },
  {
    step: 8,
    title: '8. Find Similar Products (RAG)',
    instruction: 'Simulates vector similarity matching against historical product archives. Retrieves ALIGN PANT SP27 (92%) and suggests matching packaging and labels.',
    highlightAction: 'Explore suggested polybags, care labels, and trims'
  },
  {
    step: 9,
    title: '9. Correct Material',
    instruction: 'Captures designer feedback. In this step, user updates suggested Power Mesh to Recycled Power Mesh for the pocket lining.',
    highlightAction: 'Submit user correction to the learning queue'
  },
  {
    step: 10,
    title: '10. Show Learning Dashboard',
    instruction: 'Demonstrates future OmniThink continuous learning loop. Aggregates correction frequency, reduces drift, and tracks confidence evolution.',
    highlightAction: 'Review top corrections (12x) and 87% recommendation confidence'
  }
];

export const DemoTourBanner: React.FC = () => {
  const { isDemoRunning, demoStep, nextDemoStep, stopDemoTour } = useTechPack();

  if (!isDemoRunning) return null;

  const currentInfo = DEMO_STEPS_INFO.find((s) => s.step === demoStep) || DEMO_STEPS_INFO[0];

  return (
    <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-30 shadow-md">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded bg-amber-400 text-slate-900 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
          {demoStep}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
              Demo Script Flow · Step {demoStep} of 10
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-sm font-semibold text-white">{currentInfo.title}</span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5 max-w-3xl leading-relaxed">
            {currentInfo.instruction}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        <button
          onClick={stopDemoTour}
          className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          Exit Demo
        </button>
        <button
          onClick={nextDemoStep}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded transition-colors cursor-pointer shadow-xs"
        >
          <span>{demoStep === 10 ? 'Finish & Show Summary' : 'Next Step'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const FinalDemoModal: React.FC = () => {
  const { showFinalDemoModal, setShowFinalDemoModal, setCurrentScreen } = useTechPack();

  if (!showFinalDemoModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 text-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">SP28 OmniThink Simulation Complete</h2>
              <p className="text-xs text-slate-500">Master Style to Learning Loop End-to-End Walkthrough</p>
            </div>
          </div>
          <button
            onClick={() => setShowFinalDemoModal(false)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
            OmniThink SP28 Architecture Statement
          </p>
          <blockquote className="text-sm font-medium text-slate-800 italic leading-relaxed">
            &ldquo;This simulator demonstrates the SP28 OmniThink architecture by ingesting Master Style Technical Sketches and plugin metadata, resolving Development Objects, generating FlexPLM-ready BOM payloads, validating materials, leveraging historical product intelligence, and capturing user feedback to simulate the future learning capabilities of the OmniThink Tech Pack Engine.&rdquo;
          </blockquote>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 text-xs">
          <div className="p-3 bg-slate-100 rounded-lg">
            <span className="text-slate-500 block">Master Style</span>
            <span className="font-semibold text-slate-900">ALIGN PANT (MASCL)</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <span className="text-slate-500 block">Dev Objects</span>
            <span className="font-semibold text-slate-900">3 Parallel BOMs</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <span className="text-slate-500 block">FlexPLM Target</span>
            <span className="font-semibold text-slate-900">SP28 Development BOM</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg">
            <span className="text-slate-500 block">Model Confidence</span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">87% → 88%</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => {
              setShowFinalDemoModal(false);
              setCurrentScreen(10);
            }}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Explore Learning Dashboard
          </button>
          <button
            onClick={() => setShowFinalDemoModal(false)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close & Continue Exploring
          </button>
        </div>
      </div>
    </div>
  );
};
