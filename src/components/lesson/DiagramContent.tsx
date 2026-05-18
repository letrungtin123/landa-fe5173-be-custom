import React, { useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CustomShapeNode from './CustomShapeNode';
import type { DiagramNodeData } from './CustomShapeNode';
import JunctionNode from './JunctionNode';
import { useThemeStore } from '@/stores/useThemeStore';

const nodeTypes = {
  customShape: CustomShapeNode,
  junction: JunctionNode,
};

export interface Diagram {
  id: string;
  name: string;
  nodes: Node<DiagramNodeData>[];
  edges: any[];
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
    const targetId = (node.data as any)?.target_diagram_id;
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
        Sơ đồ chưa có dữ liệu hoặc đã bị xóa.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
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
  const [nodes, setNodes, onNodesChange] = useNodesState(
    activeDiagram.nodes.map((n) => ({ ...n, draggable: false, selectable: false, connectable: false }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    activeDiagram.edges.map((e) => ({ ...e, animated: true, type: 'step' }))
  );

  React.useEffect(() => {
    setNodes(activeDiagram.nodes.map((n) => ({ ...n, draggable: false, selectable: false, connectable: false })));
    setEdges(activeDiagram.edges.map((e) => ({ ...e, animated: true, type: 'step' })));
  }, [activeDiagram, setNodes, setEdges]);

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col border border-border rounded-xl overflow-hidden bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          {history.length > 1 && (
            <Button variant="outline" size="sm" onClick={onGoBack} className="h-8 gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </Button>
          )}
          <h3 className="font-semibold text-primary">{activeDiagram.name}</h3>
        </div>
        {displayName && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
            {displayName}
          </span>
        )}
      </div>
      <div style={{ width: '100%', height: '600px' }} className="flex-1 relative">
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          colorMode={colorMode === 'dark' ? 'dark' : 'light'}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnDrag={true}
        >
          <Controls showInteractive={false} />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
