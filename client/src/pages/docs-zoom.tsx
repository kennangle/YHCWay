import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Save, Edit2, X, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SiteSetting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

export default function DocsZoom() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = user?.isAdmin;

  const { data: docsContent, isLoading } = useQuery<SiteSetting | null>({
    queryKey: ["/api/site-settings/docs_zoom"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings/docs_zoom");
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load documentation");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/site-settings/docs_zoom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings/docs_zoom"] });
      toast.success("Documentation saved");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Failed to save documentation");
    },
  });

  const defaultContent = `
    <h1>Zoom Integration Documentation</h1>
    <p>Learn how to connect and use Zoom with The YHC Way.</p>
    
    <h2>Getting Started</h2>
    <p>The YHC Way integrates with Zoom to help you manage your meetings and calendar events in one place.</p>
    
    <h2>Connecting Your Zoom Account</h2>
    <ol>
      <li>Navigate to the <strong>Connect</strong> page in The YHC Way</li>
      <li>Find the Zoom integration and click <strong>+ Connect</strong></li>
      <li>Authorize The YHC Way to access your Zoom account</li>
      <li>Your Zoom meetings will now appear in your calendar</li>
    </ol>
    
    <h2>Features</h2>
    <ul>
      <li><strong>View Meetings</strong> - See your upcoming Zoom meetings in the calendar</li>
      <li><strong>Create Meetings</strong> - Schedule new Zoom meetings directly from The YHC Way</li>
      <li><strong>Join Meetings</strong> - Quick access to join your meetings</li>
    </ul>
    
    <h2>Disconnecting Zoom</h2>
    <p>To disconnect your Zoom account, go to the Connect page and click Disconnect next to Zoom.</p>
    
    <h2>Troubleshooting</h2>
    <p>If you experience issues with the Zoom integration, try disconnecting and reconnecting your account. For further assistance, visit our Support page.</p>
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-600">Zoom Integration</span>
          </div>

          {isAdmin && !isEditing && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2" data-testid="button-edit-docs">
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : isEditing ? (
            <DocsEditor
              content={docsContent?.value || defaultContent}
              onSave={(content) => saveMutation.mutate(content)}
              onCancel={() => setIsEditing(false)}
              isSaving={saveMutation.isPending}
            />
          ) : (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: docsContent?.value || defaultContent }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DocsEditor({ 
  content, 
  onSave, 
  onCancel,
  isSaving 
}: { 
  content: string; 
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const initialContentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: initialContentRef.current,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-4 border rounded-lg',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolbarBtn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded hover:bg-gray-100 ${active ? 'bg-gray-200' : ''}`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1 p-2 border rounded-t-lg bg-gray-50 mb-0">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="w-5 h-5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="w-5 h-5" />
        </ToolbarBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <Bold className="w-5 h-5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <Italic className="w-5 h-5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <UnderlineIcon className="w-5 h-5" />
        </ToolbarBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List className="w-5 h-5" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered className="w-5 h-5" />
        </ToolbarBtn>
        <div className="w-px bg-gray-300 mx-1" />
        <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Add Link">
          <LinkIcon className="w-5 h-5" />
        </ToolbarBtn>
      </div>
      
      <EditorContent editor={editor} className="border-x border-b rounded-b-lg" />
      
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving} data-testid="button-cancel-docs">
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={() => onSave(editor.getHTML())} disabled={isSaving} data-testid="button-save-docs">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
