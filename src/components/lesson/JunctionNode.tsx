import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function JunctionNode() {
  return (
    <div 
      className="w-3 h-3 bg-muted-foreground rounded-full shadow-md ring-2 ring-background"
      title="Điểm nối (Junction)"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0"
      />
    </div>
  );
}

export default memo(JunctionNode);
