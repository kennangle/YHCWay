import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { File, Plus, ExternalLink, Trash2, Edit3, Eye, Search, RefreshCw, FileText, X } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { toast } from "sonner";
import { format } from "date-fns";

interface GoogleDoc {
  id: string;
  name: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  ownerName?: string;
}

interface GoogleDocContent {
  id: string;
  title: string;
  content: string;
  webViewLink: string;
}

export default function GoogleDocsPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<GoogleDoc | null>(null);
  const [docContent, setDocContent] = useState<GoogleDocContent | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-docs/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: docs = [], isLoading, refetch } = useQuery<GoogleDoc[]>({
    queryKey: ["/api/google-docs"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: status?.connected,
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/google-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create document");
      return res.json();
    },
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-docs"] });
      setIsCreateOpen(false);
      setNewTitle("");
      toast.success("Document created successfully");
      window.open(newDoc.webViewLink, "_blank");
    },
    onError: () => {
      toast.error("Failed to create document");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/google-docs/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-docs"] });
      toast.success("Document deleted");
    },
    onError: () => {
      toast.error("Failed to delete document");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await fetch(`/api/google-docs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-docs"] });
      setIsEditOpen(false);
      toast.success("Document updated");
    },
    onError: () => {
      toast.error("Failed to update document");
    },
  });

  const viewDocument = async (doc: GoogleDoc) => {
    setSelectedDoc(doc);
    try {
      const res = await fetch(`/api/google-docs/${doc.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch document");
      const content = await res.json();
      setDocContent(content);
      setIsViewOpen(true);
    } catch (error) {
      toast.error("Failed to load document content");
    }
  };

  const editDocument = async (doc: GoogleDoc) => {
    setSelectedDoc(doc);
    try {
      const res = await fetch(`/api/google-docs/${doc.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch document");
      const content = await res.json();
      setDocContent(content);
      setEditContent(content.content);
      setIsEditOpen(true);
    } catch (error) {
      toast.error("Failed to load document content");
    }
  };

  const filteredDocs = docs.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (statusLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center justify-center gap-4">
        <FileText className="w-16 h-16 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-700">Google Docs Not Connected</h2>
        <p className="text-gray-500 text-center max-w-md">
          Google Docs integration needs to be connected by an administrator. 
          Please visit the Connect page to set up the integration.
        </p>
        <Button 
          onClick={() => window.location.href = "/connect"}
          className="mt-4"
        >
          Go to Connect Page
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <File className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Google Docs</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="button-refresh-docs"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-doc">
                    <Plus className="w-4 h-4 mr-2" />
                    New Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      placeholder="Document title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      data-testid="input-doc-title"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createMutation.mutate(newTitle)}
                      disabled={!newTitle.trim() || createMutation.isPending}
                      data-testid="button-confirm-create"
                    >
                      {createMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-8"
                data-testid="input-search-docs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  data-testid="button-clear-search"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No documents match your search" : "No documents found"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow overflow-hidden"
                  data-testid={`doc-item-${doc.id}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-8 h-8 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate max-w-[calc(100vw-350px)]" title={doc.name}>{doc.name}</h3>
                          {doc.ownerName && (
                            <span className="text-xs text-gray-400 flex-shrink-0">by {doc.ownerName}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Modified {format(new Date(doc.modifiedTime), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewDocument(doc)}
                        data-testid={`button-view-${doc.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editDocument(doc)}
                        data-testid={`button-edit-${doc.id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.webViewLink, "_blank")}
                        data-testid={`button-open-${doc.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${doc.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{docContent?.title || "Document"}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] p-4 bg-gray-50 rounded-lg">
            <pre className="whitespace-pre-wrap font-sans text-gray-800">
              {docContent?.content || "No content"}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => window.open(docContent?.webViewLink, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Google Docs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit: {docContent?.title}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[400px] font-mono"
            placeholder="Enter document content..."
            data-testid="textarea-edit-content"
          />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(docContent?.webViewLink, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Google Docs
            </Button>
            <Button
              onClick={() => {
                if (!editContent.trim() && docContent?.content.trim()) {
                  if (!confirm("You're about to save an empty document. This will clear all content. Continue?")) {
                    return;
                  }
                }
                selectedDoc && updateMutation.mutate({ id: selectedDoc.id, content: editContent });
              }}
              disabled={updateMutation.isPending}
              data-testid="button-save-doc"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
