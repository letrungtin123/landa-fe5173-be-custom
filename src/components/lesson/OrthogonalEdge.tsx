import React from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

/**
 * Custom edge that renders identical to admin's DeletableEdge path calculation.
 * Uses getSmoothStepPath with borderRadius:0 and offset:0 for clean orthogonal lines.
 */
export default function OrthogonalEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style, markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 0,
    offset: 0,
  });

  return <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />;
}
