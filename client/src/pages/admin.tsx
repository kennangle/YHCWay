import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Redirect } from "wouter";
import { Users, Server, Rss, Trash2, Edit2, Shield, ShieldOff, Plus, X, Key, Mail, RotateCcw, Check, XCircle, UserCheck, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User, Service, FeedItem, InsertService, InsertFeedItem, AdminCreateUser } from "@shared/schema";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useToast } from "@/hooks/use-toast";
import { EmailEditor } from "@/components/email-editor";
import { EmailBuilder } from "@/components/email-builder";

type TabType = "users" | "services" | "feed" | "emails";

interface EmailTemplateType {
  type: string;
  name: string;
  description: string;
  variables: string[];
}

interface EmailTemplate {
  id: number;
  templateType: string;
  subject: string;
  htmlContent: string;
  updatedAt: string;
}

export default function Admin() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingFeed, setEditingFeed] = useState<FeedItem | null>(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateType | null>(null);
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [editorMode, setEditorMode] = useState<"rich" | "builder">("rich");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user?.isAdmin,
  });

  const { data: pendingUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users/pending"],
    enabled: !!user?.isAdmin,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    enabled: !!user?.isAdmin,
  });

  const { data: feedItems = [] } = useQuery<FeedItem[]>({
    queryKey: ["/api/feed"],
    enabled: !!user?.isAdmin,
  });

  const { data: emailTemplateTypes = [] } = useQuery<EmailTemplateType[]>({
    queryKey: ["/api/admin/email-template-types"],
    enabled: !!user?.isAdmin,
  });

  const { data: savedTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
    enabled: !!user?.isAdmin,
  });

  const { data: activeSessions = [] } = useQuery<string[]>({
    queryKey: ["/api/admin/active-sessions"],
    enabled: !!user?.isAdmin,
    refetchInterval: 30000,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: string; isAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, { isAdmin });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const approveUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/users/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User approved", description: "User can now access the app." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve user.", variant: "destructive" });
    },
  });

  const rejectUserMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/users/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User rejected", description: "User access has been denied." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject user.", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      return apiRequest("POST", `/api/admin/users/${id}/reset-password`, { password });
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "User password has been reset successfully." });
      setResetPasswordUser(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reset password.", variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: AdminCreateUser) => {
      return apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created", description: "New user has been created successfully." });
      setShowAddUser(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user.", variant: "destructive" });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data: InsertService) => {
      return apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setShowAddService(false);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertService> }) => {
      return apiRequest("PUT", `/api/admin/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setEditingService(null);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/services/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/services"] }),
  });

  const createFeedMutation = useMutation({
    mutationFn: async (data: InsertFeedItem) => {
      return apiRequest("POST", "/api/feed", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setShowAddFeed(false);
    },
  });

  const updateFeedMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertFeedItem> }) => {
      return apiRequest("PUT", `/api/admin/feed/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setEditingFeed(null);
    },
  });

  const deleteFeedMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/feed/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/feed"] }),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async ({ type, subject, htmlContent }: { type: string; subject: string; htmlContent: string }) => {
      return apiRequest("PUT", `/api/admin/email-templates/${type}`, { subject, htmlContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      toast({ title: "Template saved", description: "Email template has been updated successfully." });
      setEditingTemplate(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    },
  });

  const loadDefaultTemplate = async (type: string) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${type}/default`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTemplateSubject(data.subject);
        setTemplateContent(data.htmlContent);
      }
    } catch (error) {
      console.error("Failed to load default template:", error);
    }
  };

  const loadSavedTemplate = async (type: string) => {
    const saved = savedTemplates.find(t => t.templateType === type);
    if (saved) {
      setTemplateSubject(saved.subject);
      setTemplateContent(saved.htmlContent);
    } else {
      await loadDefaultTemplate(type);
    }
  };

  const handleEditTemplate = async (templateType: EmailTemplateType) => {
    setEditingTemplate(templateType);
    await loadSavedTemplate(templateType.type);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const tabs = [
    { id: "users" as TabType, label: "Users", icon: Users, count: users.length },
    { id: "services" as TabType, label: "Services", icon: Server, count: services.length },
    { id: "feed" as TabType, label: "Feed Items", icon: Rss, count: feedItems.length },
    { id: "emails" as TabType, label: "Email Templates", icon: Mail, count: emailTemplateTypes.length },
  ];

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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
        <header className="mb-8">
          <h1 className="font-display font-bold text-3xl mb-2" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, services, and feed items.</p>
        </header>

        <div className="flex gap-4 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "glass-card hover:bg-white/60"
              }`}
              data-testid={`button-tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">{tab.count}</span>
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="space-y-6">
            {pendingUsers.length > 0 && (
              <div className="glass-card rounded-2xl p-6 border-2 border-amber-300/50" data-testid="section-pending-users">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h2 className="font-semibold text-lg">Pending Approval ({pendingUsers.length})</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  These users have registered but need admin approval before they can access the app.
                </p>
                <div className="space-y-3">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800" data-testid={`row-pending-user-${u.id}`}>
                      <div className="flex items-center gap-3">
                        {u.profileImageUrl ? (
                          <img src={u.profileImageUrl} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                            {(u.firstName?.[0] || u.email?.[0] || "U").toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{u.firstName} {u.lastName}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                          <div className="text-xs text-muted-foreground">
                            Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Unknown"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approveUserMutation.mutate(u.id)}
                          disabled={approveUserMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                          data-testid={`button-approve-user-${u.id}`}
                        >
                          <Check className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => rejectUserMutation.mutate(u.id)}
                          disabled={rejectUserMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                          data-testid={`button-reject-user-${u.id}`}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl p-6" data-testid="section-users">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">User Management</h2>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                  data-testid="button-add-user"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
              <div className="space-y-3">
                {users.filter(u => u.approvalStatus === 'approved').map((u) => {
                  const isOnline = activeSessions.includes(u.id);
                  const hasLoggedIn = !!u.firstLoginAt;
                  return (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-user-${u.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {(u.firstName?.[0] || u.email?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                      <div 
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isOnline ? "bg-green-500" : "bg-gray-300"
                        }`}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {u.firstName} {u.lastName}
                        {!hasLoggedIn && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-normal" title="Never logged in">
                            Never logged in
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isAdmin && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">Admin</span>
                    )}
                    <button
                      onClick={() => setResetPasswordUser(u)}
                      className="p-2 hover:bg-amber-50 text-amber-500 rounded-lg transition-all"
                      title="Reset password"
                      data-testid={`button-reset-password-${u.id}`}
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleAdminMutation.mutate({ id: u.id, isAdmin: !u.isAdmin })}
                      className={`p-2 rounded-lg transition-all ${
                        u.isAdmin ? "hover:bg-red-50 text-red-500" : "hover:bg-green-50 text-green-500"
                      }`}
                      title={u.isAdmin ? "Remove admin" : "Make admin"}
                      data-testid={`button-toggle-admin-${u.id}`}
                    >
                      {u.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                  );
              })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "services" && (
          <div className="glass-card rounded-2xl p-6" data-testid="section-services">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Service Management</h2>
              <button
                onClick={() => setShowAddService(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                data-testid="button-add-service"
              >
                <Plus className="w-4 h-4" />
                Add Service
              </button>
            </div>
            <div className="space-y-3">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-service-${s.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${s.colorClass} flex items-center justify-center text-white`}>
                      <span className="text-lg">{s.icon}</span>
                    </div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-sm text-muted-foreground">{s.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {s.connected ? "Connected" : "Disconnected"}
                    </span>
                    <button
                      onClick={() => setEditingService(s)}
                      className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                      data-testid={`button-edit-service-${s.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteServiceMutation.mutate(s.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      data-testid={`button-delete-service-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <div className="glass-card rounded-2xl p-6" data-testid="section-feed">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Feed Management</h2>
              <button
                onClick={() => setShowAddFeed(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                data-testid="button-add-feed"
              >
                <Plus className="w-4 h-4" />
                Add Feed Item
              </button>
            </div>
            <div className="space-y-3">
              {feedItems.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-feed-${f.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{f.title}</span>
                      {f.urgent && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Urgent</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{f.subtitle}</div>
                    <div className="text-xs text-muted-foreground mt-1">Type: {f.type} | Time: {f.time}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingFeed(f)}
                      className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                      data-testid={`button-edit-feed-${f.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteFeedMutation.mutate(f.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      data-testid={`button-delete-feed-${f.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "emails" && (
          <div className="glass-card rounded-2xl p-6" data-testid="section-emails">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Email Template Management</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Customize the emails sent to users. Use variables like {"{{firstName}}"}, {"{{email}}"}, etc. in your templates.
            </p>
            <div className="space-y-3">
              {emailTemplateTypes.map((t) => {
                const saved = savedTemplates.find(s => s.templateType === t.type);
                return (
                  <div key={t.type} className="flex items-center justify-between p-4 bg-white/50 rounded-xl" data-testid={`row-template-${t.type}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{t.name}</div>
                        <div className="text-sm text-muted-foreground">{t.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Variables: {t.variables.map(v => `{{${v}}}`).join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {saved && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">Customized</span>
                      )}
                      <button
                        onClick={() => handleEditTemplate(t)}
                        className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-all"
                        data-testid={`button-edit-template-${t.type}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showAddService && (
          <ServiceModal
            onClose={() => setShowAddService(false)}
            onSave={(data) => createServiceMutation.mutate(data)}
          />
        )}

        {editingService && (
          <ServiceModal
            service={editingService}
            onClose={() => setEditingService(null)}
            onSave={(data) => updateServiceMutation.mutate({ id: editingService.id, data })}
          />
        )}

        {showAddFeed && (
          <FeedModal
            onClose={() => setShowAddFeed(false)}
            onSave={(data) => createFeedMutation.mutate(data)}
          />
        )}

        {editingFeed && (
          <FeedModal
            feedItem={editingFeed}
            onClose={() => setEditingFeed(null)}
            onSave={(data) => updateFeedMutation.mutate({ id: editingFeed.id, data })}
          />
        )}

        {resetPasswordUser && (
          <PasswordResetModal
            user={resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
            onSave={(password) => resetPasswordMutation.mutate({ id: resetPasswordUser.id, password })}
            isLoading={resetPasswordMutation.isPending}
          />
        )}

        {showAddUser && (
          <UserModal
            onClose={() => setShowAddUser(false)}
            onSave={(data) => createUserMutation.mutate(data)}
            isLoading={createUserMutation.isPending}
          />
        )}
        </div>
      </main>

      {editingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] overflow-y-auto pt-8 pb-8 px-4" data-testid="modal-email-template">
          <div className="bg-white rounded-2xl p-6 w-full max-w-6xl mx-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 96px)' }}>
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white pb-2 -mt-2 pt-2 z-10">
              <h3 className="font-semibold text-lg">Edit {editingTemplate.name} Template</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setEditorMode("rich")}
                    className={`px-3 py-1 text-sm rounded ${editorMode === "rich" ? "bg-white shadow" : "text-gray-600"}`}
                  >
                    Rich Text
                  </button>
                  <button
                    onClick={() => setEditorMode("builder")}
                    className={`px-3 py-1 text-sm rounded ${editorMode === "builder" ? "bg-white shadow" : "text-gray-600"}`}
                  >
                    Drag & Drop Builder
                  </button>
                </div>
                <button onClick={() => setEditingTemplate(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject Line</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Email subject"
                  data-testid="input-template-subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email Content</label>
                {editorMode === "rich" ? (
                  <EmailEditor
                    value={templateContent}
                    onChange={setTemplateContent}
                    variables={editingTemplate.variables}
                  />
                ) : (
                  <EmailBuilder
                    initialHtml={templateContent}
                    onSave={setTemplateContent}
                    variables={editingTemplate.variables}
                  />
                )}
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => loadDefaultTemplate(editingTemplate.type)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  data-testid="button-reset-template"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveTemplateMutation.mutate({
                    type: editingTemplate.type,
                    subject: templateSubject,
                    htmlContent: templateContent
                  })}
                  disabled={saveTemplateMutation.isPending}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
                  data-testid="button-save-template"
                >
                  {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceModal({
  service,
  onClose,
  onSave,
}: {
  service?: Service;
  onClose: () => void;
  onSave: (data: InsertService) => void;
}) {
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [icon, setIcon] = useState(service?.icon || "");
  const [colorClass, setColorClass] = useState(service?.colorClass || "bg-blue-500");
  const [connected, setConnected] = useState(service?.connected || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, icon, colorClass, connected });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-service">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{service ? "Edit Service" : "Add Service"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-service-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-service-description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Icon (emoji)</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-service-icon"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color Class</label>
            <select
              value={colorClass}
              onChange={(e) => setColorClass(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="select-service-color"
            >
              <option value="bg-blue-500">Blue</option>
              <option value="bg-red-500">Red</option>
              <option value="bg-green-500">Green</option>
              <option value="bg-purple-500">Purple</option>
              <option value="bg-orange-500">Orange</option>
              <option value="bg-yellow-500">Yellow</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="connected"
              checked={connected}
              onChange={(e) => setConnected(e.target.checked)}
              data-testid="input-service-connected"
            />
            <label htmlFor="connected" className="text-sm">Connected</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg" data-testid="button-save-service">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeedModal({
  feedItem,
  onClose,
  onSave,
}: {
  feedItem?: FeedItem;
  onClose: () => void;
  onSave: (data: InsertFeedItem) => void;
}) {
  const [type, setType] = useState(feedItem?.type || "slack");
  const [title, setTitle] = useState(feedItem?.title || "");
  const [subtitle, setSubtitle] = useState(feedItem?.subtitle || "");
  const [time, setTime] = useState(feedItem?.time || "");
  const [sender, setSender] = useState(feedItem?.sender || "");
  const [urgent, setUrgent] = useState(feedItem?.urgent || false);
  const [sortOrder, setSortOrder] = useState(feedItem?.sortOrder || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ type, title, subtitle, time, sender, urgent, sortOrder });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-feed">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{feedItem ? "Edit Feed Item" : "Add Feed Item"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="select-feed-type"
            >
              <option value="slack">Slack</option>
              <option value="email">Email</option>
              <option value="calendar">Calendar</option>
              <option value="zoom">Zoom</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              data-testid="input-feed-title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="input-feed-subtitle"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Time</label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              required
              placeholder="e.g., 2:30 PM"
              data-testid="input-feed-time"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sender</label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="input-feed-sender"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-lg"
              data-testid="input-feed-sortorder"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="urgent"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              data-testid="input-feed-urgent"
            />
            <label htmlFor="urgent" className="text-sm">Urgent</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg" data-testid="button-save-feed">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordResetModal({
  user,
  onClose,
  onSave,
  isLoading,
}: {
  user: User;
  onClose: () => void;
  onSave: (password: string) => void;
  isLoading: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    onSave(password);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-password-reset">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Reset Password</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Set a new password for {user.firstName || user.email}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="At least 8 characters"
              required
              data-testid="input-new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Confirm password"
              required
              data-testid="input-confirm-password"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50" 
              disabled={isLoading}
              data-testid="button-save-password"
            >
              {isLoading ? "Saving..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({
  onClose,
  onSave,
  isLoading,
}: {
  onClose: () => void;
  onSave: (data: AdminCreateUser) => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    onSave({ email, password, firstName: firstName || undefined, lastName: lastName || undefined, isAdmin });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="modal-create-user">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Create New User</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="John"
                data-testid="input-user-firstname"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Doe"
                data-testid="input-user-lastname"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="user@example.com"
              required
              data-testid="input-user-email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="At least 8 characters"
              required
              data-testid="input-user-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Confirm password"
              required
              data-testid="input-user-confirm-password"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              data-testid="input-user-admin"
            />
            <label htmlFor="isAdmin" className="text-sm">Make this user an admin</label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50" 
              disabled={isLoading}
              data-testid="button-create-user"
            >
              {isLoading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
