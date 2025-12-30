import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { BlockPalette } from './block-palette';
import { BlockCanvas } from './block-canvas';
import { BlockSettings } from './block-settings';
import { createBlock, layoutToHtml, htmlToBlocks } from './utils';
import type { EmailBlock, EmailLayout, BlockType } from './types';
import { Eye, Code, Save } from 'lucide-react';
import DOMPurify from 'dompurify';

interface EmailBuilderProps {
  initialHtml?: string;
  onSave: (html: string) => void;
  variables?: string[];
}

export function EmailBuilder({ initialHtml, onSave, variables = [] }: EmailBuilderProps) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => {
    if (initialHtml) {
      return htmlToBlocks(initialHtml);
    }
    return [];
  });
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;

    if (activeData?.isNew && activeData?.type) {
      const newBlock = createBlock(activeData.type as BlockType);
      if (over.id === 'canvas') {
        setBlocks((prev) => [...prev, newBlock]);
      } else {
        const overIndex = blocks.findIndex((b) => b.id === over.id);
        if (overIndex !== -1) {
          setBlocks((prev) => {
            const newBlocks = [...prev];
            newBlocks.splice(overIndex, 0, newBlock);
            return newBlocks;
          });
        } else {
          setBlocks((prev) => [...prev, newBlock]);
        }
      }
      setSelectedBlockId(newBlock.id);
    } else {
      if (active.id !== over.id) {
        setBlocks((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            return arrayMove(items, oldIndex, newIndex);
          }
          return items;
        });
      }
    }
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const handleUpdateBlock = (updatedBlock: EmailBlock) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
    );
  };

  const insertVariable = (variable: string) => {
    if (selectedBlock && selectedBlock.type === 'text') {
      const content = (selectedBlock as any).content + `{{${variable}}}`;
      handleUpdateBlock({ ...selectedBlock, content } as any);
    } else if (blocks.length === 0) {
      // No blocks yet, create a new text block with the variable
      const newBlock = createBlock('text');
      (newBlock as any).content = `{{${variable}}}`;
      setBlocks([newBlock]);
      setSelectedBlockId(newBlock.id);
    } else {
      // Find the last text block and append to it, or create a new one
      const lastTextBlock = [...blocks].reverse().find(b => b.type === 'text');
      if (lastTextBlock) {
        const content = (lastTextBlock as any).content + `{{${variable}}}`;
        handleUpdateBlock({ ...lastTextBlock, content } as any);
        setSelectedBlockId(lastTextBlock.id);
      } else {
        // Create a new text block
        const newBlock = createBlock('text');
        (newBlock as any).content = `{{${variable}}}`;
        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
      }
    }
  };

  const getLayout = (): EmailLayout => ({
    blocks,
    globalStyles: {
      backgroundColor: '#f3f4f6',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
    },
  });

  const getHtml = () => layoutToHtml(getLayout());

  const handleSave = () => {
    const html = getHtml();
    onSave(html);
  };

  const getPreviewHtml = () => {
    let html = getHtml();
    const sampleData: Record<string, string> = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SampleP@ssword123',
      loginUrl: 'https://uniwork.example.com/login',
      resetUrl: 'https://uniwork.example.com/reset-password?token=abc123',
    };
    Object.entries(sampleData).forEach(([key, val]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), val);
    });
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['style'] });
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b bg-gray-50">
        <div className="text-sm font-medium">Email Builder</div>
        <div className="flex flex-wrap items-center gap-2">
          {variables.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-gray-500">Insert:</span>
              {variables.map((v) => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded whitespace-nowrap cursor-pointer"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setShowSource(false); setShowPreview(!showPreview); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm whitespace-nowrap ${showPreview ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={() => { setShowPreview(false); setShowSource(!showSource); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm whitespace-nowrap ${showSource ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
            >
              <Code className="w-4 h-4" />
              HTML
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {showPreview ? (
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div className="text-xs text-gray-500 mb-2">Email Preview (with sample data)</div>
          <div 
            className="max-w-[600px] mx-auto bg-white shadow rounded"
            dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
          />
        </div>
      ) : showSource ? (
        <div className="flex-1 overflow-auto p-4 bg-gray-900">
          <div className="text-xs text-gray-400 mb-2">HTML Source</div>
          <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">
            {getHtml()}
          </pre>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <BlockPalette />
            <div className="flex flex-1 overflow-hidden">
              <BlockCanvas
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onDeleteBlock={handleDeleteBlock}
              />
              <BlockSettings
                block={selectedBlock}
                onUpdate={handleUpdateBlock}
              />
            </div>
          </DndContext>
        </>
      )}
    </div>
  );
}
