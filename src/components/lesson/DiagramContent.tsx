import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, ConnectionMode } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import CustomShapeNode from './CustomShapeNode';
import type { DiagramNodeData } from './CustomShapeNode';
import JunctionNode from './JunctionNode';
import OrthogonalEdge from './OrthogonalEdge';
import { useThemeStore } from '@/stores/useThemeStore';
import {
  edgeAppearanceToMarkerEnd,
  edgeAppearanceToStyle,
  getEdgeAppearance,
} from './edge-appearance';

const nodeTypes = {
  customShape: CustomShapeNode,
  junction: JunctionNode,
};

const edgeTypes = {
  orthogonal: OrthogonalEdge,
};

type DiagramEdgeInput = {
  id?: unknown;
  source?: unknown;
  target?: unknown;
  sourceHandle?: unknown;
  targetHandle?: unknown;
  label?: unknown;
  data?: unknown;
  style?: CSSProperties;
  markerEnd?: unknown;
  markerStart?: unknown;
  type?: string;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function baseHandle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase().replace(/-(?:source|target)$/, '');
  return ['top', 'left', 'bottom', 'right'].includes(normalized) ? normalized : undefined;
}

function fallbackHandles(source: Node, target: Node) {
  const dx = Number(target.position.x ?? 0) - Number(source.position.x ?? 0);
  const dy = Number(target.position.y ?? 0) - Number(source.position.y ?? 0);
  const sourcePosition = Math.abs(dx) >= Math.abs(dy)
    ? (dx >= 0 ? 'right' : 'left')
    : (dy >= 0 ? 'bottom' : 'top');
  const targetPosition = sourcePosition === 'right'
    ? 'left'
    : sourcePosition === 'left'
      ? 'right'
      : sourcePosition === 'bottom'
        ? 'top'
        : 'bottom';
  const sourceBase = source.type === 'junction' && !['bottom', 'right'].includes(sourcePosition) ? 'right' : sourcePosition;
  const targetBase = target.type === 'junction' && !['top', 'left'].includes(targetPosition) ? 'top' : targetPosition;
  return {
    sourceHandle: source.type === 'junction' ? `${sourceBase}-source` : sourceBase,
    targetHandle: target.type === 'junction' ? `${targetBase}-target` : targetBase,
  };
}

function isFeedbackEdge(edge: DiagramEdgeInput): boolean {
  const data = isRecord(edge.data) ? edge.data : {};
  const explicitRouting = edge.routing ?? data.routing;
  return explicitRouting === 'feedback';
}

function normalizeLessonDiagramEdges(edges: readonly unknown[], nodes: Node[]): Edge[] {
  const nodesById = new Map(nodes.map(node => [String(node.id), node]));
  const result: Edge[] = [];

  for (const rawEdge of Array.isArray(edges) ? edges : []) {
    if (!isRecord(rawEdge)) continue;
    const edge = rawEdge as DiagramEdgeInput;
    const source = nodesById.get(String(edge?.source ?? ''));
    const target = nodesById.get(String(edge?.target ?? ''));
    if (!edge || !source || !target || source.id === target.id) continue;

    const feedback = isFeedbackEdge(edge);
    const fallback = fallbackHandles(source, target);
    const sourceHandle = baseHandle(edge.sourceHandle) ?? fallback.sourceHandle;
    const targetHandle = baseHandle(edge.targetHandle) ?? fallback.targetHandle;
    const routing = feedback ? 'feedback' : 'orthogonal';
    const appearance = getEdgeAppearance(edge, routing);
    const normalized = {
      ...edge,
      id: String(edge.id ?? `diagram-edge-${result.length + 1}`),
      source: source.id,
      target: target.id,
      sourceHandle: source.type === 'junction' ? `${baseHandle(sourceHandle) ?? 'right'}-source` : sourceHandle,
      targetHandle: target.type === 'junction' ? `${baseHandle(targetHandle) ?? 'top'}-target` : targetHandle,
      type: 'orthogonal' as const,
      animated: false,
      data: {
        ...(isRecord(edge.data) ? edge.data : {}),
        appearance,
        routing,
        feedbackSide: 'right',
      },
      markerStart: undefined,
      markerEnd: edgeAppearanceToMarkerEnd(appearance),
      style: edgeAppearanceToStyle(appearance, {
        ...(edge.style ?? {}),
        strokeWidth: feedback ? 2 : 1.75,
        opacity: 0.9,
      }),
    };
    result.push(normalized as Edge);
  }

  return result;
}

export interface Diagram {
  id: string;
  name: string;
  nodes: Node<DiagramNodeData>[];
  edges: unknown[];
}

interface DiagramContentProps {
  data: {
    display_name?: string;
    diagrams?: Diagram[];
    start_diagram_id?: string;
  };
  onComplete?: () => void;
}

export default function DiagramContent({ data, onComplete }: DiagramContentProps) {
  const { t } = useTranslation();
  const { colorMode } = useThemeStore();
  const diagrams = data?.diagrams || [];
  const startDiagramId = data?.start_diagram_id || (diagrams.length > 0 ? diagrams[0].id : null);

  const [history, setHistory] = useState<string[]>(startDiagramId ? [startDiagramId] : []);
  
  const currentDiagramId = history.length > 0 ? history[history.length - 1] : startDiagramId;
  const activeDiagram = diagrams.find((d) => d.id === currentDiagramId);

  // Trigger complete on first load
  React.useEffect(() => {
    if (onComplete) onComplete();
  }, [onComplete]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    const targetId = (node.data as { target_diagram_id?: unknown })?.target_diagram_id;
    if (targetId && diagrams.some((d) => d.id === targetId)) {
      setHistory((prev) => [...prev, targetId]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  if (!activeDiagram || activeDiagram.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm">
        {t('lesson.diagramUnavailable')}
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <DiagramRenderer
        activeDiagram={activeDiagram}
        displayName={data.display_name}
        colorMode={colorMode}
        history={history}
        onNodeClick={handleNodeClick}
        onGoBack={goBack}
      />
    </div>
  );
}

/**
 * Inner component that uses hooks (useNodesState/useEdgesState) safely
 * after we've confirmed activeDiagram exists.
 */
function DiagramRenderer({
  activeDiagram,
  displayName,
  colorMode,
  history,
  onNodeClick,
  onGoBack,
}: {
  activeDiagram: Diagram;
  displayName?: string;
  colorMode: string;
  history: string[];
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onGoBack: () => void;
}) {
  const { t } = useTranslation();
  const initialNodes = activeDiagram.nodes.map((n) => ({
    ...n,
    draggable: false,
    selectable: false,
    connectable: false,
    data: { ...n.data, hidePorts: true },
  }));
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    normalizeLessonDiagramEdges(activeDiagram.edges, initialNodes),
  );

  React.useEffect(() => {
    const nextNodes = activeDiagram.nodes.map((n) => ({
      ...n,
      draggable: false,
      selectable: false,
      connectable: false,
      data: { ...n.data, hidePorts: true },
    }));
    setNodes(nextNodes);
    setEdges(normalizeLessonDiagramEdges(activeDiagram.edges, nextNodes));
  }, [activeDiagram, setNodes, setEdges]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Measure actual pixel width of the wrapper div using ResizeObserver
  // This gives ReactFlow an explicit pixel width instead of relying on CSS % 
  // which breaks when parent chain has flex-1 min-w-0 + framer-motion transforms
  const [measuredWidth, setMeasuredWidth] = useState<number>(0);

  React.useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    // Initial measurement
    setMeasuredWidth(el.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) {
        setMeasuredWidth(w);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Explicit pixel dimensions for ReactFlow — avoids CSS % inheritance issues
  const flowWidth = isFullscreen ? '100%' : (measuredWidth > 0 ? `${measuredWidth}px` : '100%');
  const flowHeight = isFullscreen ? 'calc(100vh - 52px)' : '600px';

  return (
    <div ref={containerRef} className="w-full min-h-[500px] flex flex-col border border-border rounded-xl overflow-hidden bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          {history.length > 1 && (
            <Button variant="outline" size="sm" onClick={onGoBack} className="h-8 gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> {t('lesson.diagramBack')}
            </Button>
          )}
          <h3 className="font-semibold text-primary">{activeDiagram.name}</h3>
        </div>
        {displayName && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
            {displayName}
          </span>
        )}
        <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8 ml-auto text-muted-foreground hover:text-foreground">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      {/* Measure wrapper — always full width via CSS, provides pixel measurement */}
      <div ref={measureRef} className="w-full flex-1 relative" style={{ minHeight: '600px' }}>
        {/* Only render ReactFlow when we have a valid measured width */}
        {measuredWidth > 0 && (
          <div style={{ width: flowWidth, height: flowHeight, position: 'absolute', top: 0, left: 0 }}>
            <ReactFlow
              key={`diagram-${activeDiagram.id}-${measuredWidth}`}
              style={{ width: '100%', height: '100%' }}
              colorMode={colorMode === 'dark' ? 'dark' : 'light'}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              connectionMode={ConnectionMode.Loose}
              onNodeClick={onNodeClick}
              onPaneClick={toggleFullscreen}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              zoomOnScroll={false}
              panOnDrag={true}
            >
              <Controls showInteractive={false} />
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
