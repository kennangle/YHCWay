import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmailBuilder } from "@/components/email-builder";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, FileText, Save, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface EmailTemplate {
  id: number;
  templateType: string;
  subject: string;
  htmlContent: string;
  updatedAt: string;
}

const templateVariables = ["firstName", "lastName", "email", "password", "loginUrl", "resetUrl"];

const defaultTemplateTypes = [
  { value: "welcome", label: "Welcome Email", description: "Sent when a new user signs up" },
  { value: "password_reset", label: "Password Reset", description: "Sent when user requests password reset" },
  { value: "invitation", label: "Team Invitation", description: "Sent when inviting new team members" },
  { value: "newsletter", label: "Newsletter", description: "Regular updates and announcements" },
  { value: "notification", label: "Notification", description: "General system notifications" },
  { value: "custom", label: "Custom Template", description: "Create your own custom template" },
];

export default function EmailBuilderPage() {
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [newTemplateType, setNewTemplateType] = useState("");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const { data: templateTypes = [] } = useQuery<string[]>({
    queryKey: ["/api/admin/email-template-types"],
  });

  const selectedTemplate = templates.find(t => t.templateType === selectedTemplateType);

  const saveMutation = useMutation({
    mutationFn: async ({ type, subject, html }: { type: string; subject: string; html: string }) => {
      const response = await fetch(`/api/admin/email-templates/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: type, subject, htmlContent: html }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to save template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template saved", description: "Your email template has been saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template. Please try again.", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (type: string) => {
      const response = await fetch(`/api/admin/email-templates/${type}/default`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to get default template");
      return response.json();
    },
    onSuccess: (data) => {
      setSubject(data.subject || "");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template reset", description: "Template has been reset to default." });
    },
  });

  const handleSaveTemplate = (html: string) => {
    if (!selectedTemplateType) {
      toast({ title: "Error", description: "Please select a template first.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ type: selectedTemplateType, subject, html });
  };

  const handleSelectTemplate = (type: string) => {
    setSelectedTemplateType(type);
    const template = templates.find(t => t.templateType === type);
    if (template) {
      setSubject(template.subject);
    } else {
      const defaultType = defaultTemplateTypes.find(t => t.value === type);
      setSubject(defaultType?.label || "");
    }
  };

  const handleCreateTemplate = () => {
    if (!newTemplateType || !newTemplateSubject) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ 
      type: newTemplateType, 
      subject: newTemplateSubject, 
      html: "<p>Enter your email content here...</p>" 
    });
    setSelectedTemplateType(newTemplateType);
    setSubject(newTemplateSubject);
    setShowNewTemplateDialog(false);
    setNewTemplateType("");
    setNewTemplateSubject("");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <UnifiedSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 max-w-7xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">Email Template Builder</h1>
                <p className="text-sm text-gray-500">Design and manage your email templates with drag-and-drop</p>
              </div>
            </div>
            <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-template">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>Create a new email template from scratch.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Template ID</Label>
                    <Input
                      placeholder="e.g., order_confirmation"
                      value={newTemplateType}
                      onChange={(e) => setNewTemplateType(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                      data-testid="input-template-id"
                    />
                    <p className="text-xs text-gray-500">Use lowercase letters and underscores only</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      placeholder="Enter email subject"
                      value={newTemplateSubject}
                      onChange={(e) => setNewTemplateSubject(e.target.value)}
                      data-testid="input-template-subject"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewTemplateDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateTemplate} data-testid="button-create-template">Create Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Templates
                </CardTitle>
                <CardDescription>Select a template to edit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {defaultTemplateTypes.map((type) => {
                  const savedTemplate = templates.find(t => t.templateType === type.value);
                  return (
                    <button
                      key={type.value}
                      onClick={() => handleSelectTemplate(type.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplateType === type.value
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-gray-50 border-gray-200"
                      }`}
                      data-testid={`button-template-${type.value}`}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                      {savedTemplate && (
                        <div className="text-xs text-green-600 mt-1">Customized</div>
                      )}
                    </button>
                  );
                })}

                {templates
                  .filter(t => !defaultTemplateTypes.find(d => d.value === t.templateType))
                  .map((template) => (
                    <button
                      key={template.templateType}
                      onClick={() => handleSelectTemplate(template.templateType)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedTemplateType === template.templateType
                          ? "bg-primary/10 border-primary"
                          : "hover:bg-gray-50 border-gray-200"
                      }`}
                      data-testid={`button-template-${template.templateType}`}
                    >
                      <div className="font-medium text-sm">{template.templateType.replace(/_/g, " ")}</div>
                      <div className="text-xs text-gray-500">Custom template</div>
                    </button>
                  ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedTemplateType
                        ? defaultTemplateTypes.find(t => t.value === selectedTemplateType)?.label || selectedTemplateType.replace(/_/g, " ")
                        : "Select a Template"}
                    </CardTitle>
                    <CardDescription>
                      {selectedTemplateType
                        ? "Drag blocks from the palette to build your email layout"
                        : "Choose a template from the list to start editing"}
                    </CardDescription>
                  </div>
                  {selectedTemplateType && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetMutation.mutate(selectedTemplateType)}
                        data-testid="button-reset-template"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset to Default
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedTemplateType ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email Subject</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter email subject line"
                        data-testid="input-email-subject"
                      />
                    </div>
                    <EmailBuilder
                      key={selectedTemplateType}
                      initialHtml={selectedTemplate?.htmlContent}
                      onSave={handleSaveTemplate}
                      variables={templateVariables}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <Mail className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No Template Selected</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-2">
                      Select a template from the list on the left or create a new one to start designing your email layout.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
