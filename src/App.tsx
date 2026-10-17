import React from 'react';
import { TechPackProvider, useTechPack } from './context/TechPackContext';
import { TopNav } from './components/TopNav';
import { PipelineStepper, PIPELINE_SCREENS } from './components/PipelineStepper';

import { Screen1ProductExplorer } from './components/screens/Screen1ProductExplorer';
import { Screen2MasterStyleWorkspace } from './components/screens/Screen2MasterStyleWorkspace';
import { Screen3PluginMetadataViewer } from './components/screens/Screen3PluginMetadataViewer';
import { Screen4TechnicalSketchAnalyzer } from './components/screens/Screen4TechnicalSketchAnalyzer';
import { Screen5DevObjectFanOut } from './components/screens/Screen5DevObjectFanOut';
import { Screen6BomGenerator } from './components/screens/Screen6BomGenerator';
import { Screen7MaterialValidation } from './components/screens/Screen7MaterialValidation';
import { Screen8HistoricalRAG } from './components/screens/Screen8HistoricalRAG';
import { Screen9CorrectionWorkflow } from './components/screens/Screen9CorrectionWorkflow';
import { Screen10LearningDashboard } from './components/screens/Screen10LearningDashboard';
import { TechPackPrintModal } from './components/TechPackPrintModal';
import { MstsUploadModal } from './components/MstsUploadModal';

import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';

const ScreenRenderer: React.FC = () => {
  const {
    currentScreen,
    prevScreen,
    nextScreen,
    activeUploadModalOpen,
    setActiveUploadModalOpen
  } = useTechPack();
  const [printOpen, setPrintOpen] = React.useState(false);

  const currentScreenMeta = PIPELINE_SCREENS.find((s) => s.id === currentScreen);

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 1:
        return <Screen1ProductExplorer />;
      case 2:
        return <Screen2MasterStyleWorkspace />;
      case 3:
        return <Screen3PluginMetadataViewer />;
      case 4:
        return <Screen4TechnicalSketchAnalyzer />;
      case 5:
        return <Screen5DevObjectFanOut />;
      case 6:
        return <Screen6BomGenerator />;
      case 7:
        return <Screen7MaterialValidation />;
      case 8:
        return <Screen8HistoricalRAG />;
      case 9:
        return <Screen9CorrectionWorkflow />;
      case 10:
        return <Screen10LearningDashboard />;
      default:
        return <Screen1ProductExplorer />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 text-slate-900 font-sans antialiased">
      <TopNav />
      <PipelineStepper />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderActiveScreen()}
      </main>

      {/* Persistent Bottom Bar - Focused & Clean */}
      <footer className="bg-white border-t border-slate-200 px-6 py-3 sticky bottom-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="font-bold text-slate-800">
              Step {currentScreen} of 10:
            </span>
            <span className="text-slate-600 font-medium">
              {currentScreenMeta?.title} ({currentScreenMeta?.subtitle})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / Export Tech Pack</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <button
              onClick={prevScreen}
              disabled={currentScreen === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <button
              onClick={nextScreen}
              disabled={currentScreen === 10}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer font-medium shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      <TechPackPrintModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
      />

      <MstsUploadModal
        isOpen={activeUploadModalOpen}
        onClose={() => setActiveUploadModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TechPackProvider>
      <ScreenRenderer />
    </TechPackProvider>
  );
}
