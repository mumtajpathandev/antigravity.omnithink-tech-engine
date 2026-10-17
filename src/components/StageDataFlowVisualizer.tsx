import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useTechPack } from '../context/TechPackContext';
import {
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Box,
  Layers,
  ArrowRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Info,
  ShieldCheck,
  Cpu,
  Database
} from 'lucide-react';

interface StageNode {
  id: number;
  screen: number;
  title: string;
  system: string;
  shortDesc: string;
  status: 'completed' | 'active' | 'ready';
  x: number;
  y: number;
  dataMetric: string;
  dataPayloadSummary: string;
  color: string;
  accent: string;
}

interface StageLink {
  source: number;
  target: number;
  label: string;
  dataType: string;
  bytesOrItems: string;
}

interface StageDataFlowVisualizerProps {
  onJumpToScreen?: (screen: number) => void;
}

export const StageDataFlowVisualizer: React.FC<StageDataFlowVisualizerProps> = ({
  onJumpToScreen
}) => {
  const {
    currentScreen,
    setCurrentScreen,
    selectedMasterStyle,
    uploadedFileName,
    pluginData,
    nativeParseResult,
    activeBomPayload,
    validationResults,
    correctionsLog,
    learningStats,
    isCleanSlate
  } = useTechPack();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(currentScreen);
  const [isPlayingSimulation, setIsPlayingSimulation] = useState<boolean>(false);
  const [simActiveStage, setSimActiveStage] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Active tech pack details
  const activeFileName = uploadedFileName || (selectedMasterStyle.masterStyleId !== 'PENDING' ? `${selectedMasterStyle.name.replace(/\s+/g, '_')}_SP28.pdf` : 'Awaiting_TechPack.pdf');
  const activePartsCount = pluginData.parts.length || (selectedMasterStyle.category === 'Outerwear' ? 6 : 5);
  const activeDevObjectsCount = selectedMasterStyle.devObjects.length || 3;
  const activeBomCount = activeBomPayload?.bom?.length || (activePartsCount + 4);

  // Stage configurations mapped to the 10 screens
  const stages: StageNode[] = useMemo(() => {
    return [
      {
        id: 1,
        screen: 1,
        title: 'Keystone Catalog',
        system: 'GLP / PLIM Master',
        shortDesc: 'Product master taxonomy binding',
        status: 'completed',
        x: 80,
        y: 180,
        dataMetric: selectedMasterStyle.masterStyleId !== 'PENDING' ? `${selectedMasterStyle.masterStyleId} (${selectedMasterStyle.season})` : 'Catalog Query',
        dataPayloadSummary: `Style: ${selectedMasterStyle.name} · Division: ${selectedMasterStyle.category} · Season: SP28`,
        color: '#2563eb',
        accent: '#dbeafe'
      },
      {
        id: 2,
        screen: 2,
        title: 'PDAM Ingestion',
        system: 'Asset Management',
        shortDesc: 'FileMasterStyleTechnicalSketch PDF ingest',
        status: 'completed',
        x: 290,
        y: 180,
        dataMetric: activeFileName.length > 20 ? `${activeFileName.slice(0, 18)}...` : activeFileName,
        dataPayloadSummary: `Container: ${activeFileName} · Size: 2.8 MB · ISO 32000-1 binary`,
        color: '#4f46e5',
        accent: '#e0e7ff'
      },
      {
        id: 3,
        screen: 3,
        title: 'Plugin Metadata',
        system: 'Illustrator Bridge',
        shortDesc: 'Native in-stream XMP dictionary extraction',
        status: 'completed',
        x: 500,
        y: 180,
        dataMetric: `${activePartsCount} CAD parts · 0x000150`,
        dataPayloadSummary: `Schema: msts:pluginData v1.0.0 · ${pluginData.schema} · Offset: 0x000154`,
        color: '#7c3aed',
        accent: '#ede9fe'
      },
      {
        id: 4,
        screen: 4,
        title: 'Vision & Vector DOM',
        system: 'OmniThink CAD Core',
        shortDesc: 'Bezier path segmentation & parts geometry',
        status: 'completed',
        x: 710,
        y: 180,
        dataMetric: '100% Deterministic',
        dataPayloadSummary: `Extracted ${activePartsCount} vector panels with coordinates & callouts. Zero tokens.`,
        color: '#0891b2',
        accent: '#cffafe'
      },
      {
        id: 5,
        screen: 5,
        title: 'Dev Object Fan-Out',
        system: 'SP28 Fan-Out Engine',
        shortDesc: 'Decomposes master into parallel colorway DOs',
        status: 'completed',
        x: 920,
        y: 180,
        dataMetric: `${activeDevObjectsCount} Colorway DOs`,
        dataPayloadSummary: `Branching ${selectedMasterStyle.devObjects.map(d => d.devObjectId).join(', ') || 'DO-001, DO-002, DO-003'} pipelines`,
        color: '#059669',
        accent: '#d1fae5'
      },
      {
        id: 6,
        screen: 6,
        title: 'BOM Generator',
        system: 'PTC FlexPLM REST',
        shortDesc: 'Generates standardized Development BOM JSON',
        status: 'completed',
        x: 920,
        y: 390,
        dataMetric: `${activeBomCount} BOM rows (Fabric/Trim)`,
        dataPayloadSummary: `Event: Development BOM Create · Correlation ID: OMNI-SP28-${selectedMasterStyle.masterStyleId}`,
        color: '#d97706',
        accent: '#fef3c7'
      },
      {
        id: 7,
        screen: 7,
        title: 'Material Governance',
        system: 'FlexPLM Material Master',
        shortDesc: 'Rule-based lifecycle status compliance',
        status: 'completed',
        x: 710,
        y: 390,
        dataMetric: `${validationResults.filter(r => r.outcome === 'PASS').length} Pass / ${validationResults.filter(r => r.outcome === 'FAIL').length} Reject`,
        dataPayloadSummary: 'Evaluates Approved (Pass), In Development (Warn), Rejected (Block)',
        color: '#ea580c',
        accent: '#ffedd5'
      },
      {
        id: 8,
        screen: 8,
        title: 'Historical RAG',
        system: 'FAISS Vector Archive',
        shortDesc: 'Similarity retrieval for trims, labels & polybags',
        status: 'completed',
        x: 500,
        y: 390,
        dataMetric: 'SP27 Archival 94%',
        dataPayloadSummary: 'Recommends Coats EcoVerde thread, Avery silicone label, and EcoPack polybag',
        color: '#0d9488',
        accent: '#ccfbf1'
      },
      {
        id: 9,
        screen: 9,
        title: 'Correction Workflow',
        system: 'HITL Feedback Memory',
        shortDesc: 'Designer override capture for self-learning',
        status: 'completed',
        x: 290,
        y: 390,
        dataMetric: `${correctionsLog.length} overrides logged`,
        dataPayloadSummary: 'Replaces rejected materials with sustainable approved substitutes in replay buffer',
        color: '#e11d48',
        accent: '#ffe4e6'
      },
      {
        id: 10,
        screen: 10,
        title: 'Learning Dashboard',
        system: 'OmniThink Feedback Loop',
        shortDesc: 'Drift reduction, telemetry & automated tuning',
        status: 'completed',
        x: 80,
        y: 390,
        dataMetric: `${learningStats.driftReductionPercent}% drift reduction`,
        dataPayloadSummary: `Confidence: ${(learningStats.recommendationConfidence * 100).toFixed(0)}% · Autonomous rule refinement`,
        color: '#0f172a',
        accent: '#f1f5f9'
      }
    ];
  }, [
    selectedMasterStyle,
    uploadedFileName,
    activeFileName,
    activePartsCount,
    activeDevObjectsCount,
    activeBomCount,
    pluginData,
    validationResults,
    correctionsLog,
    learningStats
  ]);

  // Links connecting sequential stages with data types
  const links: StageLink[] = useMemo(() => [
    { source: 1, target: 2, label: 'Master Style Context', dataType: 'GLP JSON Schema', bytesOrItems: '1.2 KB' },
    { source: 2, target: 3, label: 'PDF Binary Stream', dataType: 'ISO 32000-1 Byte Packet', bytesOrItems: '2.8 MB' },
    { source: 3, target: 4, label: 'XMP CAD Geometry', dataType: 'msts:pluginData XML', bytesOrItems: `${activePartsCount} Parts` },
    { source: 4, target: 5, label: 'Decomposed CAD DOM', dataType: 'Vector Bezier Polygons', bytesOrItems: '14 Paths' },
    { source: 5, target: 6, label: 'Parallel Colorway Streams', dataType: 'DevObject Entities', bytesOrItems: `${activeDevObjectsCount} DOs` },
    { source: 6, target: 7, label: 'Raw BOM Payloads', dataType: 'FlexPLM REST Event', bytesOrItems: `${activeBomCount} Items` },
    { source: 7, target: 8, label: 'Compliance Audit Vector', dataType: 'Material Master Result', bytesOrItems: 'Pass/Warn/Fail' },
    { source: 8, target: 9, label: 'Historical Recommendations', dataType: 'Archival RAG Matches', bytesOrItems: '3 Specs' },
    { source: 9, target: 10, label: 'Feedback Events', dataType: 'Replay Buffer Log', bytesOrItems: `${correctionsLog.length} Events` }
  ], [activePartsCount, activeDevObjectsCount, activeBomCount, correctionsLog]);

  // Render D3 SVG graph
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean slate render

    const width = 1060;
    const height = 500;

    // Defs for gradients, drop shadows, and marker arrows
    const defs = svg.append('defs');

    // Arrow markers
    stages.forEach((s) => {
      defs
        .append('marker')
        .attr('id', `arrow-${s.id}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', s.color);
    });

    // Default neutral marker
    defs
      .append('marker')
      .attr('id', 'arrow-default')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', '#94a3b8');

    // Glow filter
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const mainGroup = svg.append('g').attr('class', 'main-flow-group');

    // Compute smooth cubic Bezier link generator
    const linkGenerator = (source: StageNode, target: StageNode) => {
      // Connect right side of source to left side of target for top row
      if (source.y === target.y) {
        if (source.x < target.x) {
          // Horizontal left-to-right
          const startX = source.x + 85;
          const startY = source.y;
          const endX = target.x - 85;
          const endY = target.y;
          const midX = (startX + endX) / 2;
          return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        } else {
          // Horizontal right-to-left (bottom row)
          const startX = source.x - 85;
          const startY = source.y;
          const endX = target.x + 85;
          const endY = target.y;
          const midX = (startX + endX) / 2;
          return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        }
      } else {
        // Vertical U-turn from Stage 5 (x: 920, y: 180) to Stage 6 (x: 920, y: 390)
        const startX = source.x;
        const startY = source.y + 50;
        const endX = target.x;
        const endY = target.y - 50;
        const midY = (startY + endY) / 2;
        return `M ${startX} ${startY} C ${startX + 50} ${midY}, ${endX + 50} ${midY}, ${endX} ${endY}`;
      }
    };

    // Draw Links
    links.forEach((link, idx) => {
      const sourceNode = stages.find((s) => s.id === link.source);
      const targetNode = stages.find((s) => s.id === link.target);
      if (!sourceNode || !targetNode) return;

      const pathData = linkGenerator(sourceNode, targetNode);
      const isLinkActive = simActiveStage === link.source || simActiveStage === link.target;

      // Outer glow track
      mainGroup
        .append('path')
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', isLinkActive ? sourceNode.color : '#e2e8f0')
        .attr('stroke-width', isLinkActive ? 4 : 2)
        .attr('stroke-opacity', isLinkActive ? 0.9 : 0.7)
        .attr('stroke-dasharray', isLinkActive ? 'none' : '4,4');

      // Animated packet link path
      const activePath = mainGroup
        .append('path')
        .attr('id', `link-path-${idx}`)
        .attr('d', pathData)
        .attr('fill', 'none')
        .attr('stroke', sourceNode.color)
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('opacity', isLinkActive ? 1 : 0.8)
        .attr('marker-end', `url(#arrow-${sourceNode.id})`);

      // Add animated packet dot traveling along path
      const pathEl = activePath.node();
      if (pathEl) {
        const totalLength = pathEl.getTotalLength();
        const pulseCircle = mainGroup
          .append('circle')
          .attr('r', 4.5)
          .attr('fill', sourceNode.color)
          .attr('filter', 'url(#glow)');

        const animate = () => {
          pulseCircle
            .transition()
            .duration(2800 + idx * 250)
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t) => {
                const p = pathEl.getPointAtLength(t * totalLength);
                return `translate(${p.x}, ${p.y})`;
              };
            })
            .on('end', animate);
        };
        animate();
      }

      // Link data label badge in the middle
      if (pathEl) {
        const midPoint = pathEl.getPointAtLength(pathEl.getTotalLength() * 0.5);
        const labelGroup = mainGroup
          .append('g')
          .attr('transform', `translate(${midPoint.x}, ${midPoint.y})`)
          .style('cursor', 'pointer')
          .on('click', () => {
            setSelectedNodeId(targetNode.id);
          });

        labelGroup
          .append('rect')
          .attr('x', -40)
          .attr('y', -9)
          .attr('width', 80)
          .attr('height', 18)
          .attr('rx', 4)
          .attr('fill', '#ffffff')
          .attr('stroke', '#cbd5e1')
          .attr('stroke-width', 1);

        labelGroup
          .append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 3.5)
          .attr('font-size', '9px')
          .attr('font-family', 'ui-monospace, monospace')
          .attr('font-weight', '600')
          .attr('fill', '#475569')
          .text(link.bytesOrItems);
      }
    });

    // Draw Nodes
    stages.forEach((node) => {
      const isSelected = selectedNodeId === node.id;
      const isSimHighlighted = simActiveStage === node.id;

      const nodeG = mainGroup
        .append('g')
        .attr('class', `node-stage-${node.id}`)
        .attr('transform', `translate(${node.x}, ${node.y})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedNodeId(node.id);
        })
        .on('dblclick', () => {
          if (onJumpToScreen) {
            onJumpToScreen(node.screen);
          } else {
            setCurrentScreen(node.screen);
          }
        });

      // Selection pulse ring
      if (isSelected || isSimHighlighted) {
        nodeG
          .append('rect')
          .attr('x', -84)
          .attr('y', -48)
          .attr('width', 168)
          .attr('height', 96)
          .attr('rx', 12)
          .attr('fill', 'none')
          .attr('stroke', node.color)
          .attr('stroke-width', 3)
          .attr('stroke-opacity', 0.8)
          .attr('filter', 'url(#glow)');
      }

      // Card Background
      nodeG
        .append('rect')
        .attr('x', -80)
        .attr('y', -45)
        .attr('width', 160)
        .attr('height', 90)
        .attr('rx', 10)
        .attr('fill', isSelected ? '#ffffff' : '#fafafa')
        .attr('stroke', isSelected ? node.color : '#cbd5e1')
        .attr('stroke-width', isSelected ? 2 : 1.2)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.06))');

      // Top Header Pill
      nodeG
        .append('rect')
        .attr('x', -72)
        .attr('y', -38)
        .attr('width', 52)
        .attr('height', 16)
        .attr('rx', 4)
        .attr('fill', node.accent);

      nodeG
        .append('text')
        .attr('x', -46)
        .attr('y', -26)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', 'bold')
        .attr('fill', node.color)
        .text(`Stage ${node.id < 10 ? `0${node.id}` : node.id}`);

      // Status indicator dot
      nodeG
        .append('circle')
        .attr('cx', 64)
        .attr('cy', -30)
        .attr('r', 4.5)
        .attr('fill', '#10b981');

      // Stage Title
      nodeG
        .append('text')
        .attr('x', -72)
        .attr('y', -7)
        .attr('font-size', '11.5px')
        .attr('font-family', 'system-ui, sans-serif')
        .attr('font-weight', '700')
        .attr('fill', '#0f172a')
        .text(node.title);

      // System Tag
      nodeG
        .append('text')
        .attr('x', -72)
        .attr('y', 9)
        .attr('font-size', '9.5px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('fill', '#64748b')
        .text(node.system.length > 20 ? `${node.system.slice(0, 19)}...` : node.system);

      // Bottom Metric Container
      nodeG
        .append('rect')
        .attr('x', -72)
        .attr('y', 18)
        .attr('width', 144)
        .attr('height', 18)
        .attr('rx', 4)
        .attr('fill', '#f1f5f9');

      nodeG
        .append('text')
        .attr('x', -66)
        .attr('y', 30.5)
        .attr('font-size', '9px')
        .attr('font-family', 'ui-monospace, monospace')
        .attr('font-weight', '600')
        .attr('fill', '#334155')
        .text(node.dataMetric.length > 23 ? `${node.dataMetric.slice(0, 22)}…` : node.dataMetric);
    });

  }, [stages, links, selectedNodeId, simActiveStage, currentScreen]);

  // Replay live simulation through all 10 stages
  const runLiveSimulation = () => {
    if (isPlayingSimulation) return;
    setIsPlayingSimulation(true);
    let step = 1;

    const interval = setInterval(() => {
      setSimActiveStage(step);
      setSelectedNodeId(step);
      step++;

      if (step > 10) {
        clearInterval(interval);
        setTimeout(() => {
          setIsPlayingSimulation(false);
          setSimActiveStage(null);
        }, 800);
      }
    }, 700);
  };

  const activeStageNode = stages.find((s) => s.id === selectedNodeId) || stages[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Visualizer Header */}
      <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-white">
                D3 Pipeline Data Flow Visualizer
              </h3>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded">
                Active PDF: {activeFileName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive D3 data graph tracking in-stream byte packets, CAD DOM decomposition, and FlexPLM BOM payloads across all 10 stages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runLiveSimulation}
            disabled={isPlayingSimulation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isPlayingSimulation ? 'animate-pulse' : ''}`} />
            <span>{isPlayingSimulation ? `Simulating Stage ${simActiveStage}...` : 'Replay Live Flow'}</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative bg-slate-50/70 p-4 overflow-x-auto min-h-[460px] flex items-center justify-center border-b border-slate-200">
        <svg
          ref={svgRef}
          viewBox="0 0 1060 480"
          className="w-full max-w-[1060px] h-auto select-none"
          style={{ minWidth: '850px' }}
        />

        {/* Legend Overlay */}
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 shadow-2xs space-y-1">
          <div className="font-bold text-slate-800 text-[11px] mb-1">Pipeline Stream Types:</div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Keystone Master Context</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span>ISO 32000-1 / XMP Stream</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span>DevObject 3x Fan-Out</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>FlexPLM Event BOM Payload</span>
          </div>
        </div>
      </div>

      {/* Stage Detail Drawer for Selected Node */}
      {activeStageNode && (
        <div className="p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5"
              style={{ backgroundColor: activeStageNode.accent, color: activeStageNode.color }}
            >
              {activeStageNode.id < 10 ? `0${activeStageNode.id}` : activeStageNode.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {activeStageNode.title}
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  System: {activeStageNode.system}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                  Active PDF Bound
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                {activeStageNode.dataPayloadSummary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                if (onJumpToScreen) {
                  onJumpToScreen(activeStageNode.screen);
                } else {
                  setCurrentScreen(activeStageNode.screen);
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <span>Jump to Screen {activeStageNode.screen}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
