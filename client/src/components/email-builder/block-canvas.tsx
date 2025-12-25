import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Settings } from 'lucide-react';
import type { EmailBlock } from './types';

interface BlockRendererProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function BlockContent({ block }: { block: EmailBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div 
          style={{ 
            padding: block.styles.padding,
            color: block.styles.color,
            fontSize: block.styles.fontSize,
            fontFamily: block.styles.fontFamily,
            textAlign: block.styles.textAlign,
            backgroundColor: block.styles.backgroundColor,
          }}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );
    
    case 'image':
      return (
        <div style={{ padding: block.styles.padding, textAlign: block.styles.textAlign }}>
          <img 
            src={block.src} 
            alt={block.alt} 
            style={{ maxWidth: '100%', height: 'auto', display: 'inline-block' }} 
          />
        </div>
      );
    
    case 'button':
      return (
        <div style={{ padding: block.styles.padding, textAlign: block.styles.textAlign }}>
          <span 
            style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: block.buttonColor || '#2563eb',
              color: block.textColor || '#ffffff',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {block.text}
          </span>
        </div>
      );
    
    case 'divider':
      return (
        <div style={{ padding: block.styles.padding }}>
          <hr style={{ 
            border: 'none', 
            borderTop: `${block.lineWidth || '1px'} solid ${block.lineColor || '#e5e7eb'}`,
            margin: 0,
          }} />
        </div>
      );
    
    case 'spacer':
      return (
        <div 
          style={{ 
            height: block.height,
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="text-xs text-gray-400">Spacer ({block.height})</span>
        </div>
      );
    
    case 'columns':
      return (
        <div style={{ display: 'flex', gap: '8px', padding: block.styles.padding }}>
          {block.columns.map((col, i) => (
            <div 
              key={i} 
              style={{ 
                width: block.columnWidths[i],
                minHeight: '60px',
                backgroundColor: '#f9fafb',
                border: '1px dashed #d1d5db',
                borderRadius: '4px',
                padding: '8px',
              }}
            >
              {col.length === 0 ? (
                <div className="text-xs text-gray-400 text-center">Column {i + 1}</div>
              ) : (
                col.map((b) => <BlockContent key={b.id} block={b} />)
              )}
            </div>
          ))}
        </div>
      );
    
    default:
      return null;
  }
}

function SortableBlock({ block, isSelected, onSelect, onDelete }: BlockRendererProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100/80 rounded-l">
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-gray-200 rounded cursor-grab"
        >
          <GripVertical className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 hover:bg-red-100 rounded"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
      <div className="ml-8 border border-gray-200 rounded bg-white">
        <BlockContent block={block} />
      </div>
    </div>
  );
}

interface BlockCanvasProps {
  blocks: EmailBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
}

export function BlockCanvas({ blocks, selectedBlockId, onSelectBlock, onDeleteBlock }: BlockCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 p-4 overflow-y-auto bg-gray-100 ${isOver ? 'bg-blue-50' : ''}`}
      onClick={() => onSelectBlock(null)}
    >
      <div className="max-w-[600px] mx-auto bg-white shadow-sm rounded-lg min-h-[400px] p-4">
        {blocks.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-400">Drag blocks here to build your email</p>
          </div>
        ) : (
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => onSelectBlock(block.id)}
                  onDelete={() => onDeleteBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
}
