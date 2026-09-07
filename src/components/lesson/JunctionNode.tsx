import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position, type NodeProps } from '@xyflow/react';

function JunctionNode({ data }: NodeProps) {
  const { t } = useTranslation();
  const isHidden = data?.hidePorts;

  return (
    <div 
      className={`w-3 h-3 rounded-full transition-colors ring-2 ${
        isHidden ? 'bg-muted-foreground ring-transparent shadow-none' : 'bg-muted-foreground shadow-md ring-background'
      }`}
      title={isHidden ? undefined : t('lesson.junction')}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="opacity-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="opacity-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="opacity-0"
      />
    </div>
  );
}

export default memo(JunctionNode);
