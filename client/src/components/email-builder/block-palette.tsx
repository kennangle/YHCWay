import { useDraggable } from '@dnd-kit/core';
import { Type, Image, MousePointer, Minus, Move, Columns } from 'lucide-react';
import type { BlockType } from './types';

interface PaletteItemProps {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
}

function PaletteItem({ type, label, icon }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, isNew: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex flex-col items-center gap-1 p-3 bg-white border rounded-lg cursor-grab hover:bg-gray-50 hover:border-blue-300 transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      {icon}
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
  );
}

export function BlockPalette() {
  const blocks: PaletteItemProps[] = [
    { type: 'text', label: 'Text', icon: <Type className="w-5 h-5 text-gray-700" /> },
    { type: 'image', label: 'Image', icon: <Image className="w-5 h-5 text-gray-700" /> },
    { type: 'button', label: 'Button', icon: <MousePointer className="w-5 h-5 text-gray-700" /> },
    { type: 'divider', label: 'Divider', icon: <Minus className="w-5 h-5 text-gray-700" /> },
    { type: 'spacer', label: 'Spacer', icon: <Move className="w-5 h-5 text-gray-700" /> },
    { type: 'columns', label: 'Columns', icon: <Columns className="w-5 h-5 text-gray-700" /> },
  ];

  return (
    <div className="p-3 bg-gray-50 border-b">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Drag blocks to add</div>
      <div className="grid grid-cols-6 gap-2">
        {blocks.map((block) => (
          <PaletteItem key={block.type} {...block} />
        ))}
      </div>
    </div>
  );
}
