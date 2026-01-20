import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Heading1, Heading2, Save, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SiteSetting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

export default function Privacy() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const isAdmin = user?.isAdmin;

  const { data: privacyPolicy, isLoading } = useQuery<SiteSetting | null>({
    queryKey: ["/api/site-settings/privacy_policy"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/site-settings/privacy_policy");
        if (res.status === 404) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/site-settings/privacy_policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value: content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings/privacy_policy"] });
      toast.success("Privacy policy saved");
      setIsEditing(false);
    },
    onError: () => {
      toast.error("Failed to save privacy policy");
    },
  });

  const defaultContent = `
    <h1>Privacy Policy for The YHC Way</h1>
    <p><strong>Effective Date: January 2026</strong></p>
    
    <h2>1. Introduction</h2>
    <p>Yoga Health Center ("we," "us," or "our") operates The YHC Way application. This Privacy Policy describes how we collect, use, and handle your personal information when you use our internal operational and training platform.</p>
    
    <h2>2. Information We Collect</h2>
    <p>To provide the features within The YHC Way, we collect the following:</p>
    <ul>
      <li><strong>Authentication Data:</strong> Email address and profile information provided via Google OAuth to verify your identity as an authorized team member.</li>
      <li><strong>Communication Data:</strong> If you use the Unified Inbox or Slack features, we temporarily process email content and direct messages to display them within the app.</li>
      <li><strong>Usage Activity:</strong> We track engagement with training materials, manuals, and task completion to ensure operational standards are met.</li>
      <li><strong>AI Processing:</strong> When using the AI Email Summarizer, relevant email text is processed by our AI integration to generate summaries. This data is not used to train external models.</li>
    </ul>
    
    <h2>3. How We Use Your Information</h2>
    <p>We use the collected data solely for business operations, including:</p>
    <ul>
      <li>Facilitating internal communication via Slack and Gmail integrations.</li>
      <li>Managing studio tasks and project dependencies.</li>
      <li>Monitoring training progress and compliance with "The YHC Way" standards.</li>
      <li>Improving application performance and troubleshooting technical issues.</li>
    </ul>
    
    <h2>4. Third-Party Integrations</h2>
    <p>The YHC Way connects to several third-party services to function. Each service handles your data according to its own privacy policy:</p>
    <ul>
      <li><strong>Google Services:</strong> Used for email, calendar, and document access.</li>
      <li><strong>Slack:</strong> Used for direct messaging and channel notifications.</li>
      <li><strong>Mindbody/NetGym:</strong> Used for studio scheduling and metrics.</li>
      <li><strong>OpenAI:</strong> Used specifically for the email summarization feature.</li>
    </ul>
    
    <h2>5. Data Security & Retention</h2>
    <p>We implement industry-standard security measures to protect your proprietary business data. Access to your data is revoked immediately upon the termination of your employment or contract with Yoga Health Center.</p>
    
    <h2>6. Your Rights</h2>
    <p>As an internal user, you may request to review the data associated with your profile or report technical inaccuracies in your time tracking or training logs by contacting the administrator.</p>
    
    <h2>Contact Information</h2>
    <p>For questions regarding this Privacy Policy:</p>
    <p><strong>Administrator:</strong> Ken<br/>
    <strong>Email:</strong> ken@yogahealthcenter.com</p>
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {isAdmin && !isEditing && (
            <div className="flex justify-end mb-4">
              <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : isEditing ? (
            <PrivacyEditor
              content={privacyPolicy?.value || defaultContent}
              onSave={(content) => saveMutation.mutate(content)}
              onCancel={() => setIsEditing(false)}
              isSaving={saveMutation.isPending}
            />
          ) : (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: privacyPolicy?.value || defaultContent }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PrivacyEditor({ 
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
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button onClick={() => onSave(editor.getHTML())} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
