import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { useEffect, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  Type,
  Palette,
  Eye,
  Code,
  ImageIcon,
} from 'lucide-react';

interface EmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  variables?: string[];
}

const fontFamilies = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

const fontSizes = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
];

const colors = [
  '#000000', '#333333', '#666666', '#999999', '#cccccc',
  '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
  '#2563eb', '#7c3aed', '#c026d3', '#e11d48', '#f97316',
];

export function EmailEditor({ value, onChange, variables = [] }: EmailEditorProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          style: 'color: #2563eb; text-decoration: underline;',
        },
      }),
      Underline,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto;',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const insertVariable = useCallback((variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(`{{${variable}}}`).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const getSanitizedPreview = () => {
    const html = editor.getHTML();
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['style', 'class'],
    });
  };

  const getPreviewWithSampleData = () => {
    const html = getSanitizedPreview();
    const sampleData: Record<string, string> = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'SampleP@ssword123',
      loginUrl: 'https://uniwork.example.com/login',
      resetUrl: 'https://uniwork.example.com/reset-password?token=abc123',
    };
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const replaceInAttributes = (element: Element) => {
      Array.from(element.attributes).forEach((attr) => {
        let value = attr.value;
        Object.entries(sampleData).forEach(([key, val]) => {
          value = value.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        });
        if (value !== attr.value) {
          element.setAttribute(attr.name, value);
        }
      });
      Array.from(element.children).forEach(replaceInAttributes);
    };
    
    const replaceInTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        let text = node.textContent;
        let hasMatch = false;
        Object.entries(sampleData).forEach(([key]) => {
          if (text.includes(`{{${key}}}`)) hasMatch = true;
        });
        if (hasMatch) {
          const span = doc.createElement('span');
          let html = text;
          Object.entries(sampleData).forEach(([key, val]) => {
            html = html.replace(
              new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
              `<span style="background:#fef3c7;padding:0 4px;border-radius:2px;">${val}</span>`
            );
          });
          span.innerHTML = DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['style'],
          });
          node.parentNode?.replaceChild(span, node);
        }
      } else {
        Array.from(node.childNodes).forEach(replaceInTextNodes);
      }
    };
    
    replaceInAttributes(doc.body);
    replaceInTextNodes(doc.body);
    
    return doc.body.innerHTML;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="border-b bg-gray-50 p-2 flex flex-wrap items-center gap-1">
        <div className="flex items-center border-r pr-2 mr-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-40"
            title="Undo"
            type="button"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-40"
            title="Redo"
            type="button"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowFontPicker(!showFontPicker); setShowColorPicker(false); setShowSizePicker(false); }}
            className="p-1.5 hover:bg-gray-200 rounded flex items-center gap-1 text-sm"
            title="Font Family"
            type="button"
          >
            <Type className="w-4 h-4" />
            <span className="text-xs">Font</span>
          </button>
          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
              {fontFamilies.map((font) => (
                <button
                  key={font.value}
                  onClick={() => {
                    editor.chain().focus().setFontFamily(font.value).run();
                    setShowFontPicker(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  style={{ fontFamily: font.value }}
                  type="button"
                >
                  {font.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowSizePicker(!showSizePicker); setShowColorPicker(false); setShowFontPicker(false); }}
            className="p-1.5 hover:bg-gray-200 rounded flex items-center gap-1 text-sm"
            title="Font Size"
            type="button"
          >
            <span className="text-xs font-medium">Size</span>
          </button>
          {showSizePicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[80px]">
              {fontSizes.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    editor.chain().focus().setMark('textStyle', { fontSize: size.value }).run();
                    setShowSizePicker(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                  type="button"
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setShowColorPicker(!showColorPicker); setShowFontPicker(false); setShowSizePicker(false); }}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Text Color"
            type="button"
          >
            <Palette className="w-4 h-4" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 z-10">
              <div className="grid grid-cols-5 gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                    type="button"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-l pl-2 ml-1 flex items-center">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Bold"
            type="button"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Italic"
            type="button"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
            title="Underline"
            type="button"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
            title="Strikethrough"
            type="button"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        <div className="border-l pl-2 ml-1 flex items-center">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
            title="Align Left"
            type="button"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
            title="Align Center"
            type="button"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
            title="Align Right"
            type="button"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>

        <div className="border-l pl-2 ml-1 flex items-center">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Bullet List"
            type="button"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Numbered List"
            type="button"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={setLink}
            className={`p-1.5 hover:bg-gray-200 rounded ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
            title="Add Link"
            type="button"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={addImage}
            className="p-1.5 hover:bg-gray-200 rounded"
            title="Insert Image"
            type="button"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowSource(!showSource); if (!showSource) setShowPreview(false); }}
            className={`p-1.5 hover:bg-gray-200 rounded flex items-center gap-1 text-xs ${showSource ? 'bg-gray-200' : ''}`}
            title="View HTML Source"
            type="button"
          >
            <Code className="w-4 h-4" />
            Source
          </button>
          <button
            onClick={() => { setShowPreview(!showPreview); if (!showPreview) setShowSource(false); }}
            className={`p-1.5 hover:bg-gray-200 rounded flex items-center gap-1 text-xs ${showPreview ? 'bg-gray-200' : ''}`}
            title="Toggle Preview"
            type="button"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
      </div>

      {variables.length > 0 && (
        <div className="border-b bg-blue-50 px-3 py-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-blue-800 font-medium">Insert variable:</span>
          {variables.map((variable) => (
            <button
              key={variable}
              onClick={() => insertVariable(variable)}
              className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
              type="button"
            >
              {`{{${variable}}}`}
            </button>
          ))}
        </div>
      )}

      <div className={`grid ${showPreview || showSource ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className={`${showPreview || showSource ? 'border-r' : ''}`}>
          <EditorContent 
            editor={editor} 
            className="min-h-[300px]"
            onClick={() => { setShowColorPicker(false); setShowFontPicker(false); setShowSizePicker(false); }}
          />
        </div>

        {showPreview && (
          <div className="bg-gray-50 p-4 min-h-[300px] overflow-auto">
            <div className="text-xs text-gray-500 mb-2 font-medium">Email Preview (with sample data)</div>
            <div 
              className="bg-white border rounded p-4 shadow-sm"
              style={{ fontFamily: 'Arial, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: getPreviewWithSampleData() }}
            />
          </div>
        )}

        {showSource && (
          <div className="bg-gray-900 p-4 min-h-[300px] overflow-auto">
            <div className="text-xs text-gray-400 mb-2 font-medium">HTML Source</div>
            <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">
              {editor.getHTML()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
