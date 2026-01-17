import { useState } from 'react';
import type { EmailBlock, BlockStyles } from './types';
import { RichTextEditor } from './rich-text-editor';

interface BlockSettingsProps {
  block: EmailBlock | null;
  onUpdate: (block: EmailBlock) => void;
}

const fontFamilies = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
];

const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];

function StyleEditor({ styles, onChange }: { styles: BlockStyles; onChange: (styles: BlockStyles) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Background Color</label>
        <input
          type="color"
          value={styles.backgroundColor || '#ffffff'}
          onChange={(e) => onChange({ ...styles, backgroundColor: e.target.value })}
          className="w-full h-8 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
        <input
          type="color"
          value={styles.color || '#333333'}
          onChange={(e) => onChange({ ...styles, color: e.target.value })}
          className="w-full h-8 rounded border cursor-pointer"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Font Family</label>
        <select
          value={styles.fontFamily || 'Arial, sans-serif'}
          onChange={(e) => onChange({ ...styles, fontFamily: e.target.value })}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          {fontFamilies.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Font Size</label>
        <select
          value={styles.fontSize || '16px'}
          onChange={(e) => onChange({ ...styles, fontSize: e.target.value })}
          className="w-full px-2 py-1 border rounded text-sm"
        >
          {fontSizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Text Align</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ ...styles, textAlign: align })}
              className={`flex-1 px-2 py-1 text-xs border rounded capitalize ${
                styles.textAlign === align ? 'bg-blue-100 border-blue-300' : 'bg-white'
              }`}
            >
              {align}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Padding</label>
        <input
          type="text"
          value={styles.padding || '16px'}
          onChange={(e) => onChange({ ...styles, padding: e.target.value })}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="e.g. 16px or 8px 16px"
        />
      </div>
    </div>
  );
}

export function BlockSettings({ block, onUpdate }: BlockSettingsProps) {
  if (!block) {
    return (
      <div className="w-64 p-4 bg-gray-50 border-l">
        <p className="text-sm text-gray-500">Select a block to edit its settings</p>
      </div>
    );
  }

  const updateBlock = (updates: Partial<EmailBlock>) => {
    onUpdate({ ...block, ...updates } as EmailBlock);
  };

  const updateStyles = (styles: BlockStyles) => {
    onUpdate({ ...block, styles });
  };

  return (
    <div className="w-64 p-4 bg-gray-50 border-l overflow-y-auto">
      <h3 className="font-semibold text-sm mb-4 capitalize">{block.type} Settings</h3>
      
      {block.type === 'text' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
            <RichTextEditor
              content={block.content}
              onChange={(html) => updateBlock({ content: html })}
              placeholder="Enter your email text..."
            />
          </div>
        </div>
      )}

      {block.type === 'image' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
            <input
              type="text"
              value={block.src}
              onChange={(e) => updateBlock({ src: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Alt Text</label>
            <input
              type="text"
              value={block.alt}
              onChange={(e) => updateBlock({ alt: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link URL (optional)</label>
            <input
              type="text"
              value={block.linkUrl || ''}
              onChange={(e) => updateBlock({ linkUrl: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
              placeholder="https://"
            />
          </div>
        </div>
      )}

      {block.type === 'button' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Button Text</label>
            <input
              type="text"
              value={block.text}
              onChange={(e) => updateBlock({ text: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link URL</label>
            <input
              type="text"
              value={block.linkUrl}
              onChange={(e) => updateBlock({ linkUrl: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Button Color</label>
            <input
              type="color"
              value={block.buttonColor || '#2563eb'}
              onChange={(e) => updateBlock({ buttonColor: e.target.value })}
              className="w-full h-8 rounded border cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
            <input
              type="color"
              value={block.textColor || '#ffffff'}
              onChange={(e) => updateBlock({ textColor: e.target.value })}
              className="w-full h-8 rounded border cursor-pointer"
            />
          </div>
        </div>
      )}

      {block.type === 'divider' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Line Color</label>
            <input
              type="color"
              value={block.lineColor || '#e5e7eb'}
              onChange={(e) => updateBlock({ lineColor: e.target.value })}
              className="w-full h-8 rounded border cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Line Width</label>
            <select
              value={block.lineWidth || '1px'}
              onChange={(e) => updateBlock({ lineWidth: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              {['1px', '2px', '3px', '4px'].map((w) => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {block.type === 'spacer' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Height</label>
            <select
              value={block.height}
              onChange={(e) => updateBlock({ height: e.target.value })}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              {['16px', '24px', '32px', '48px', '64px', '80px'].map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {block.type === 'columns' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Column Layout</label>
            <select
              value={block.columnWidths.join(',')}
              onChange={(e) => {
                const widths = e.target.value.split(',');
                const cols = widths.map(() => [] as any);
                updateBlock({ columnWidths: widths, columns: cols });
              }}
              className="w-full px-2 py-1 border rounded text-sm"
            >
              <option value="50%,50%">50% / 50%</option>
              <option value="33%,33%,34%">33% / 33% / 33%</option>
              <option value="30%,70%">30% / 70%</option>
              <option value="70%,30%">70% / 30%</option>
              <option value="25%,50%,25%">25% / 50% / 25%</option>
            </select>
          </div>
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium text-sm mb-3">Style Options</h4>
        <StyleEditor styles={block.styles} onChange={updateStyles} />
      </div>
    </div>
  );
}
