import { useState } from "react";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { FileText, RefreshCw, ExternalLink, Eye, BarChart3, Trash2, Plus } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TypeformForm {
  id: string;
  title: string;
  last_updated_at: string;
  created_at: string;
  settings: {
    is_public: boolean;
    language: string;
  };
  _links: {
    display: string;
  };
  response_count?: number;
}

interface TypeformResponse {
  response_id: string;
  submitted_at: string;
  answers: Array<{
    field: { id: string; title: string };
    type: string;
    text?: string;
    email?: string;
    number?: number;
    boolean?: boolean;
    choice?: { label: string };
  }>;
}

export default function Typeform() {
  const queryClient = useQueryClient();
  const [showNewFormDialog, setShowNewFormDialog] = useState(false);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState<TypeformForm | null>(null);
  const [newFormTitle, setNewFormTitle] = useState("");
  
  const { data: forms = [], isLoading, isFetching, refetch } = useQuery<TypeformForm[]>({
    queryKey: ["typeform-forms"],
    queryFn: async () => {
      const res = await fetch("/api/typeform/forms", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          console.warn("Typeform integration not configured");
          return [];
        }
        throw new Error("Failed to fetch forms");
      }
      return res.json();
    },
    retry: false,
    staleTime: 0,
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery<TypeformResponse[]>({
    queryKey: ["typeform-responses", selectedForm?.id],
    queryFn: async () => {
      if (!selectedForm) return [];
      const res = await fetch(`/api/typeform/forms/${selectedForm.id}/responses`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedForm && showResponsesDialog,
  });

  const createFormMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/typeform/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create form");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["typeform-forms"] });
      setShowNewFormDialog(false);
      setNewFormTitle("");
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const res = await fetch(`/api/typeform/forms/${formId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete form");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["typeform-forms"] });
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleViewResponses = (form: TypeformForm) => {
    setSelectedForm(form);
    setShowResponsesDialog(true);
  };

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormTitle.trim()) return;
    createFormMutation.mutate(newFormTitle);
  };

  const handleDeleteForm = (formId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this form?")) {
      deleteFormMutation.mutate(formId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 ml-64 p-8 relative z-10">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#262627]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#262627]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl">Typeform</h1>
              <p className="text-muted-foreground">Manage your forms and responses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewFormDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
              data-testid="button-new-form"
            >
              <Plus className="w-4 h-4" />
              <span className="font-medium">New Form</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/80 hover:bg-white transition-colors shadow-sm border border-gray-200 disabled:opacity-50"
              data-testid="button-refresh-forms"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </header>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-lg">
              {forms.length} {forms.length === 1 ? 'Form' : 'Forms'}
            </h2>
            {isFetching && !isLoading && (
              <span className="text-sm text-muted-foreground">Refreshing...</span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-[#262627]" />
              <p>Loading forms...</p>
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-2">No forms found</p>
              <p className="text-sm text-muted-foreground">Connect your Typeform account or create a new form</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forms.map((form) => (
                <div
                  key={form.id}
                  className="p-4 rounded-xl bg-white/50 hover:bg-white/80 transition-all border border-gray-100 hover:border-gray-200 hover:shadow-sm group"
                  data-testid={`form-item-${form.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-foreground line-clamp-2">{form.title}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleViewResponses(form)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        title="View Responses"
                        data-testid={`button-responses-${form.id}`}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <a
                        href={form._links?.display}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        title="Open Form"
                        data-testid={`button-open-${form.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={(e) => handleDeleteForm(form.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                        title="Delete Form"
                        data-testid={`button-delete-${form.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Created {formatDate(form.created_at)}</span>
                    {form.settings?.is_public && (
                      <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600">Public</span>
                    )}
                  </div>
                  {form.response_count !== undefined && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {form.response_count} {form.response_count === 1 ? 'response' : 'responses'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showNewFormDialog} onOpenChange={setShowNewFormDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Form</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateForm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-title">Form Title</Label>
              <Input
                id="form-title"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                placeholder="Enter form title"
                required
                data-testid="input-form-title"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewFormDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFormMutation.isPending}>
                {createFormMutation.isPending ? "Creating..." : "Create Form"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Responses for {selectedForm?.title}</DialogTitle>
          </DialogHeader>
          {responsesLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Loading responses...</p>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No responses yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <div
                  key={response.response_id}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-100"
                  data-testid={`response-${response.response_id}`}
                >
                  <div className="text-xs text-muted-foreground mb-2">
                    Submitted {formatDate(response.submitted_at)}
                  </div>
                  <div className="space-y-2">
                    {response.answers?.map((answer, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{answer.field?.title || "Question"}: </span>
                        <span className="text-muted-foreground">
                          {answer.text || answer.email || answer.number?.toString() || 
                           answer.boolean?.toString() || answer.choice?.label || "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
