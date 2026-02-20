import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, RefreshCw, Users, Clock, CheckCircle, XCircle, AlertCircle, Search, Edit2, Save, X, ArrowUpDown, ArrowUp, ArrowDown, User, DollarSign, Calendar, Mail, Phone, Bell, BookOpen, ShoppingBag, FileText, Plus, Trash2, Minus, MessageSquare, Download } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ComposeEmailModal } from "@/components/compose-email-modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IntroOffer {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  offerName: string;
  offerCategory: string;
  purchaseAmount: string;
  purchaseDate: string;
  classesAttendedSincePurchase: number;
  lastAttendanceDate?: string | null;
  daysSinceLastAttendance?: number | null;
  daysSincePurchase: number;
  hasConverted: boolean;
  conversionDate?: string | null;
  conversionType?: string | null;
  conversionAmount?: string | null;
  memberStatus: string;
  expirationDate?: string | null;
  notes?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    count: number;
    limit: number;
    offset: number;
  };
}

type StatusFilter = "all" | "new" | "engaged" | "at_risk" | "lapsed" | "needs_attention" | "converted";
type SortField = "student" | "offer" | "amount" | "purchaseDate" | "expires" | "classes" | "lastClass" | "status" | "conversion";
type SortDirection = "asc" | "desc";
type PeriodFilter = "last_week" | "last_30" | "last_90" | "last_180" | "last_365" | "all_time";

function getPeriodDateRange(period: PeriodFilter): { since: Date | null; label: string } {
  const now = new Date();
  switch (period) {
    case "last_week": return { since: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), label: "Last 7 days" };
    case "last_30": return { since: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), label: "Last 30 days" };
    case "last_90": return { since: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), label: "Last 90 days" };
    case "last_180": return { since: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), label: "Last 6 months" };
    case "last_365": return { since: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), label: "Last year" };
    case "all_time": return { since: null, label: "All time" };
  }
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysAgoText(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function getStageLabel(status: string): string {
  switch (status) {
    case "new": return "purchased";
    case "engaged": return "engaged";
    case "at_risk": return "at risk";
    case "lapsed": return "lapsed";
    case "converted": return "converted";
    default: return status;
  }
}

function getStageBadgeClass(status: string): string {
  switch (status) {
    case "new": return "bg-slate-100 text-slate-600 border border-slate-200";
    case "engaged": return "bg-green-100 text-green-700 border border-green-200";
    case "at_risk": return "bg-orange-100 text-orange-700 border border-orange-200";
    case "lapsed": return "bg-red-100 text-red-700 border border-red-200";
    case "converted": return "bg-purple-100 text-purple-700 border border-purple-200";
    default: return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function StudentDetailModal({ offer, open, onClose, onComposeEmail }: { offer: IntroOffer | null; open: boolean; onClose: () => void; onComposeEmail?: (offer: IntroOffer) => void }) {
  const [activeTab, setActiveTab] = useState("communications");

  if (!offer) return null;

  const totalRevenue = parseFloat(offer.purchaseAmount || "0") + (offer.conversionAmount ? parseFloat(offer.conversionAmount) : 0);
  const membershipStatus = offer.hasConverted ? "Member" : "Non-Member";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <User className="w-5 h-5" />
            {offer.firstName} {offer.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3 mt-2">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              Total Classes
            </div>
            <p className="text-2xl font-bold" data-testid="modal-total-classes">{offer.classesAttendedSincePurchase}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Total Revenue
            </div>
            <p className="text-2xl font-bold" data-testid="modal-total-revenue">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="w-3.5 h-3.5" />
              Last Class
            </div>
            <p className="text-2xl font-bold" data-testid="modal-last-class">{offer.lastAttendanceDate ? formatDate(offer.lastAttendanceDate) : "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Purchases
            </div>
            <p className="text-2xl font-bold" data-testid="modal-purchases">1</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-sm">Intro Offer</span>
              </div>
              <p className="text-sm text-muted-foreground">{offer.offerName}</p>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Purchase Date</p>
                <p className="font-medium">{formatDate(offer.purchaseDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">${parseFloat(offer.purchaseAmount).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expires</p>
                <p className="font-medium">{formatDate(offer.expirationDate)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-xl p-4 mt-2">
          <h3 className="font-semibold text-sm mb-3">Contact Information</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              {offer.email ? (
                <button
                  className="text-blue-600 hover:underline text-left"
                  onClick={() => {
                    if (onComposeEmail) {
                      onComposeEmail(offer);
                    }
                  }}
                  data-testid="modal-email-link"
                >
                  {offer.email}
                </button>
              ) : "No email"}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              {offer.phone ? (
                <a
                  href={`https://voice.google.com/u/0/messages?phoneNo=${offer.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                  data-testid="modal-sms-link"
                >
                  {offer.phone}
                </a>
              ) : "No phone"}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Joined: {formatDate(offer.purchaseDate)}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              Status: <span className="font-medium">{membershipStatus}</span>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="communications" data-testid="tab-communications">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Comms
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminders">
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              Reminders
            </TabsTrigger>
            <TabsTrigger value="classes" data-testid="tab-classes">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="purchases" data-testid="tab-purchases">
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              Purchases
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="tab-notes">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="communications" className="mt-4">
            <CommunicationsTimeline offer={offer} onComposeEmail={onComposeEmail} />
          </TabsContent>

          <TabsContent value="reminders" className="mt-4">
            <RemindersList offer={offer} />
          </TabsContent>

          <TabsContent value="classes" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{offer.classesAttendedSincePurchase > 0 
                ? `${offer.classesAttendedSincePurchase} class${offer.classesAttendedSincePurchase > 1 ? 'es' : ''} attended`
                : "No classes attended yet"}</p>
              {offer.lastAttendanceDate && (
                <p className="text-xs mt-1">Last attended: {formatDate(offer.lastAttendanceDate)}</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="purchases" className="mt-4">
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{offer.offerName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(offer.purchaseDate)}</p>
                </div>
                <p className="font-semibold">${parseFloat(offer.purchaseAmount).toFixed(2)}</p>
              </div>
            </div>
            {offer.hasConverted && offer.conversionDate && (
              <div className="border rounded-lg p-3 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Membership Conversion</p>
                    <p className="text-xs text-muted-foreground">{formatDate(offer.conversionDate)}</p>
                  </div>
                  <p className="font-semibold">{offer.conversionAmount ? `$${parseFloat(offer.conversionAmount).toFixed(2)}` : "—"}</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-4">
            <NotesSection offer={offer} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface Communication {
  id: number;
  offerId: string;
  studentId: string;
  channel: string;
  direction: string;
  subject?: string;
  body?: string;
  recipientAddress?: string;
  status?: string;
  sentAt: string;
  createdBy?: string;
  source: string;
  syncStatus?: string;
}

function CommunicationsTimeline({ offer, onComposeEmail }: { offer: IntroOffer; onComposeEmail?: (offer: IntroOffer) => void }) {
  const queryClient = useQueryClient();
  const { data: communications = [], isLoading } = useQuery<Communication[]>({
    queryKey: ["communications", offer.id],
    queryFn: async () => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/communications`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/communications/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId: offer.studentId }),
      });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["communications", offer.id] });
      toast({ title: "Sync complete", description: `Pulled ${data.pulled}, pushed ${data.pushed} communications` });
    },
    onError: () => {
      toast({ title: "Sync failed", variant: "destructive" });
    },
  });

  const getChannelIcon = (channel: string) => {
    return channel === "email" ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  const getChannelColor = (channel: string) => {
    return channel === "email" ? "text-blue-600 bg-blue-50 border-blue-200" : "text-green-600 bg-green-50 border-green-200";
  };

  const getDirectionLabel = (direction: string) => {
    return direction === "outbound" ? "Sent" : "Received";
  };

  const getSourceBadge = (source: string) => {
    if (source === "mbanalytics") return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">MB Analytics</span>;
    return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">YHC Way</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onComposeEmail) onComposeEmail(offer);
            }}
            disabled={!offer.email}
            data-testid="button-compose-from-comms"
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (offer.phone) {
                const cleaned = offer.phone.replace(/\D/g, "");
                window.open(`https://voice.google.com/u/0/messages?phoneNo=${cleaned}`, "_blank");
                try {
                  await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/communications`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      studentId: offer.studentId,
                      channel: "sms",
                      direction: "outbound",
                      recipientAddress: offer.phone,
                      status: "initiated",
                    }),
                  });
                  queryClient.invalidateQueries({ queryKey: ["communications", offer.id] });
                } catch (err) {
                  console.error("Failed to log SMS communication:", err);
                }
              }
            }}
            disabled={!offer.phone}
            data-testid="button-sms-from-comms"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            SMS
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-comms"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin opacity-30" />
          <p className="text-sm">Loading communications...</p>
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No communications recorded yet</p>
          <p className="text-xs mt-1">Send an email or SMS to start tracking</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {communications.map((comm) => (
            <div key={comm.id} className="border rounded-lg p-3" data-testid={`comm-${comm.id}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-lg border ${getChannelColor(comm.channel)}`}>
                  {getChannelIcon(comm.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">
                      {comm.channel === "email" ? "Email" : "SMS"} {getDirectionLabel(comm.direction)}
                    </span>
                    {getSourceBadge(comm.source)}
                    {comm.syncStatus === "synced" && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                  {comm.subject && (
                    <p className="text-sm text-foreground">{comm.subject}</p>
                  )}
                  {comm.recipientAddress && (
                    <p className="text-xs text-muted-foreground">To: {comm.recipientAddress}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(comm.sentAt)}
                    </p>
                    {comm.createdBy && (
                      <p className="text-xs text-muted-foreground">by {comm.createdBy}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RemindersList({ offer }: { offer: IntroOffer }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ["reminders", offer.id],
    queryFn: async () => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/reminders`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", offer.id] });
      setShowAdd(false);
      setNewTitle("");
      setNewDescription("");
      toast({ title: "Reminder added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/reminders/${reminderId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete reminder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", offer.id] });
      toast({ title: "Reminder removed" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ reminderId, completed }: { reminderId: string; completed: boolean }) => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update reminder");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", offer.id] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Reminders
        </h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-reminder">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
      </div>

      {showAdd && (
        <div className="border rounded-lg p-3 mb-3 bg-gray-50">
          <Input
            placeholder="Reminder title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="mb-2"
            data-testid="input-reminder-title"
          />
          <Textarea
            placeholder="Description (optional)..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="mb-2"
            rows={2}
            data-testid="input-reminder-description"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => addMutation.mutate({ title: newTitle, description: newDescription })}
              disabled={!newTitle.trim() || addMutation.isPending}
              data-testid="button-save-reminder"
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No reminders yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reminders.map((r: any) => (
            <div key={r.id} className="border rounded-lg p-3 flex items-start gap-3" data-testid={`reminder-${r.id}`}>
              <button
                onClick={() => toggleMutation.mutate({ reminderId: r.id, completed: !r.completed })}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  r.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                }`}
                data-testid={`toggle-reminder-${r.id}`}
              >
                {r.completed && <CheckCircle className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${r.completed ? 'line-through text-muted-foreground' : ''}`}>{r.title}</p>
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(r.createdAt)}{r.createdBy ? ` by ${r.createdBy}` : ''}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(r.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                data-testid={`delete-reminder-${r.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesSection({ offer }: { offer: IntroOffer }) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");

  const updateMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mindbody-analytics/intro-offers"], exact: false });
      toast({ title: "Notes saved" });
    },
  });

  useEffect(() => {
    setNoteText(offer.notes || "");
  }, [offer.notes]);

  return (
    <div>
      <Textarea
        placeholder="Add notes about this student..."
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        rows={4}
        data-testid="textarea-notes"
      />
      <div className="flex justify-end mt-2">
        <Button
          size="sm"
          onClick={() => updateMutation.mutate(noteText)}
          disabled={updateMutation.isPending || noteText === (offer.notes || "")}
          data-testid="button-save-notes"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save Notes
        </Button>
      </div>
    </div>
  );
}

export default function IntroOffers() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedOffer, setSelectedOffer] = useState<IntroOffer | null>(null);
  const [composeEmailOffer, setComposeEmailOffer] = useState<IntroOffer | null>(null);
  
  const getInitialFilter = (): StatusFilter => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter && ["all", "new", "engaged", "at_risk", "lapsed", "needs_attention", "converted"].includes(filter)) {
      return filter as StatusFilter;
    }
    return "all";
  };
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(getInitialFilter);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("last_90");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("purchaseDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter && ["all", "new", "engaged", "at_risk", "lapsed", "needs_attention", "converted"].includes(filter)) {
      setStatusFilter(filter as StatusFilter);
    }
  }, [location]);

  const { data: statusData } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/mindbody-analytics/status"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/status", { credentials: "include" });
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });

  const { data: offersData, isLoading: offersLoading, isFetching, refetch } = useQuery<PaginatedResponse<IntroOffer>>({
    queryKey: ["/api/mindbody-analytics/intro-offers", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all" && statusFilter !== "needs_attention") {
        params.append("status", statusFilter);
      }
      const res = await fetch(`/api/mindbody-analytics/intro-offers?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch intro offers");
      return res.json();
    },
    enabled: statusData?.configured,
  });

  const offers = offersData?.data || [];
  const { since: periodSince } = getPeriodDateRange(periodFilter);
  const filteredOffers = offers.filter(offer => {
    if (periodSince && new Date(offer.purchaseDate) < periodSince) return false;

    const fullName = `${offer.firstName} ${offer.lastName}`.toLowerCase();
    const matchesSearch = !searchTerm || 
      fullName.includes(searchTerm.toLowerCase()) ||
      offer.offerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offer.email && offer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "needs_attention") {
      return offer.memberStatus === "at_risk" || offer.memberStatus === "lapsed";
    }
    return offer.memberStatus === statusFilter;
  });

  const dateRangeText = periodSince
    ? `${formatDateShort(periodSince)} - ${formatDateShort(new Date())}`
    : "All time";

  const sortedOffers = [...filteredOffers].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "student":
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case "offer":
        comparison = a.offerName.localeCompare(b.offerName);
        break;
      case "amount":
        comparison = parseFloat(a.purchaseAmount) - parseFloat(b.purchaseAmount);
        break;
      case "purchaseDate":
        comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        break;
      case "expires":
        comparison = (a.expirationDate || "").localeCompare(b.expirationDate || "");
        break;
      case "classes":
        comparison = a.classesAttendedSincePurchase - b.classesAttendedSincePurchase;
        break;
      case "lastClass":
        comparison = (a.lastAttendanceDate || "").localeCompare(b.lastAttendanceDate || "");
        break;
      case "status":
        comparison = (a.memberStatus || "").localeCompare(b.memberStatus || "");
        break;
      case "conversion":
        comparison = (a.hasConverted ? 1 : 0) - (b.hasConverted ? 1 : 0);
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1" /> 
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Phone", "Offer", "Amount", "Purchase Date", "Expires", "Classes", "Last Class", "Stage", "Conversion Date"];
    const rows = sortedOffers.map(o => [
      `${o.firstName} ${o.lastName}`,
      o.email || "",
      o.phone || "",
      o.offerName,
      `$${parseFloat(o.purchaseAmount).toFixed(2)}`,
      o.purchaseDate,
      o.expirationDate || "",
      o.classesAttendedSincePurchase.toString(),
      o.lastAttendanceDate || "Never",
      getStageLabel(o.memberStatus),
      o.hasConverted ? (o.conversionDate || "Yes") : "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intro-offers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export complete", description: `Exported ${sortedOffers.length} records to CSV` });
  };

  const handleEmailAll = () => {
    const emails = sortedOffers
      .filter(o => o.email)
      .map(o => o.email)
      .filter((e, i, arr) => arr.indexOf(e) === i);
    if (emails.length === 0) {
      toast({ title: "No emails", description: "No email addresses found for the current filter", variant: "destructive" });
      return;
    }
    const mailto = `mailto:?bcc=${emails.join(",")}`;
    window.open(mailto, "_blank");
    toast({ title: "Email All", description: `Opening email to ${emails.length} recipients` });
  };

  const handleSMSAll = () => {
    const phones = sortedOffers
      .filter(o => o.phone)
      .map(o => o.phone!.replace(/\D/g, ""))
      .filter((p, i, arr) => arr.indexOf(p) === i);
    if (phones.length === 0) {
      toast({ title: "No phone numbers", description: "No phone numbers found for the current filter", variant: "destructive" });
      return;
    }
    toast({ title: "SMS All", description: `${phones.length} phone numbers copied to clipboard` });
    navigator.clipboard.writeText(phones.join(", "));
  };

  if (!statusData?.configured) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-40"
          style={{ backgroundImage: `url(${generatedBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
          <div className="flex-1 p-8 flex items-center justify-center relative z-10">
            <div className="text-center">
              <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h1 className="font-display font-bold text-2xl mb-2">Mindbody Analytics Not Connected</h1>
              <p className="text-muted-foreground">Please configure your Mindbody Analytics API key to view intro offers.</p>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ backgroundImage: `url(${generatedBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
        <div className="flex-1 p-8 relative z-10">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Gift className="w-5 h-5 text-purple-500" />
            </div>
            <h1 className="font-display font-bold text-2xl" data-testid="text-intro-offers-title">Intro Offer Funnel</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="outline"
              size="sm"
              data-testid="button-refresh-offers"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Sync Members
            </Button>
          </div>
        </header>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Period:</span>
            </div>
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-40 h-9" data-testid="select-period-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_week">Last 7 days</SelectItem>
                <SelectItem value="last_30">Last 30 days</SelectItem>
                <SelectItem value="last_90">Last 90 days</SelectItem>
                <SelectItem value="last_180">Last 6 months</SelectItem>
                <SelectItem value="last_365">Last year</SelectItem>
                <SelectItem value="all_time">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-44 h-9" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="engaged">Engaged</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-8 h-9"
              data-testid="input-search-offers"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                data-testid="button-clear-search"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">Intro Offer Report</h2>
              <p className="text-sm text-muted-foreground">Detailed intro offer buyer report with expiration tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv">
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmailAll} data-testid="button-email-all">
                <Mail className="w-4 h-4 mr-1.5" />
                Email All
              </Button>
              <Button variant="outline" size="sm" onClick={handleSMSAll} data-testid="button-sms-all">
                <MessageSquare className="w-4 h-4 mr-1.5" />
                SMS All
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4" data-testid="text-offer-count">
            Showing {sortedOffers.length} intro offer buyers  ({dateRangeText})
          </p>

          {offersLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-500" />
              <p className="text-muted-foreground">Loading intro offers...</p>
            </div>
          ) : sortedOffers.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground">No intro offers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { field: "student" as SortField, label: "Name" },
                      { field: "offer" as SortField, label: "Offer" },
                      { field: "amount" as SortField, label: "Amount" },
                      { field: "purchaseDate" as SortField, label: "Purchase" },
                      { field: "expires" as SortField, label: "Expires" },
                      { field: "classes" as SortField, label: "Classes" },
                      { field: "lastClass" as SortField, label: "Last Class" },
                      { field: "status" as SortField, label: "Stage" },
                      { field: "conversion" as SortField, label: "Conversion" },
                    ].map(col => (
                      <th
                        key={col.field}
                        className="text-left py-3 px-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
                        onClick={() => handleSort(col.field)}
                        data-testid={`sort-${col.field}`}
                      >
                        <span className="flex items-center">{col.label}<SortIcon field={col.field} /></span>
                      </th>
                    ))}
                    <th className="text-left py-3 px-3 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOffers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedOffer(offer)}
                      data-testid={`row-offer-${offer.id}`}
                    >
                      <td className="py-3 px-3">
                        <p className="font-medium text-sm">{offer.firstName} {offer.lastName}</p>
                      </td>
                      <td className="py-3 px-3 text-sm text-muted-foreground max-w-[200px]">
                        <span className="line-clamp-2">{offer.offerName}</span>
                      </td>
                      <td className="py-3 px-3 text-sm font-medium">${parseFloat(offer.purchaseAmount).toFixed(2)}</td>
                      <td className="py-3 px-3 text-sm">
                        <div>{formatDate(offer.purchaseDate)}</div>
                        <div className="text-xs text-muted-foreground">{daysAgoText(offer.daysSincePurchase)}</div>
                      </td>
                      <td className="py-3 px-3 text-sm">{formatDate(offer.expirationDate)}</td>
                      <td className="py-3 px-3 text-sm text-center">{offer.classesAttendedSincePurchase}</td>
                      <td className="py-3 px-3 text-sm">{offer.lastAttendanceDate ? formatDate(offer.lastAttendanceDate) : "Never"}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStageBadgeClass(offer.memberStatus)}`}>
                          {getStageLabel(offer.memberStatus)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {offer.hasConverted ? (
                          <span className="text-green-600 font-medium">{formatDate(offer.conversionDate)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (offer.email) {
                                      setComposeEmailOffer(offer);
                                    } else {
                                      toast({ title: "No email address", description: `No email on file for ${offer.firstName} ${offer.lastName}`, variant: "destructive" });
                                    }
                                  }}
                                  data-testid={`button-email-${offer.id}`}
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{offer.email ? `Email ${offer.firstName}` : "No email on file"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (offer.phone) {
                                      const cleaned = offer.phone.replace(/\D/g, "");
                                      const googleVoiceUrl = `https://voice.google.com/u/0/messages?phoneNo=${cleaned}`;
                                      window.open(googleVoiceUrl, "_blank");
                                      try {
                                        await fetch(`/api/mindbody-analytics/intro-offers/${offer.id}/communications`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          credentials: "include",
                                          body: JSON.stringify({
                                            studentId: offer.studentId,
                                            channel: "sms",
                                            direction: "outbound",
                                            recipientAddress: offer.phone,
                                            status: "initiated",
                                          }),
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["communications", offer.id] });
                                      } catch (err) {
                                        console.error("Failed to log SMS:", err);
                                      }
                                    } else {
                                      toast({ title: "No phone number", description: `No phone number on file for ${offer.firstName} ${offer.lastName}`, variant: "destructive" });
                                    }
                                  }}
                                  data-testid={`button-sms-${offer.id}`}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{offer.phone ? `SMS ${offer.firstName} via Google Voice` : "No phone on file"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>

      <StudentDetailModal
        offer={selectedOffer}
        open={!!selectedOffer}
        onClose={() => setSelectedOffer(null)}
        onComposeEmail={(o) => {
          setSelectedOffer(null);
          setComposeEmailOffer(o);
        }}
      />

      {composeEmailOffer && (
        <ComposeEmailModal
          onClose={() => setComposeEmailOffer(null)}
          initialTo={composeEmailOffer.email || ""}
          initialSubject={`Following up - ${composeEmailOffer.offerName}`}
          onSent={async (sentData) => {
            try {
              await fetch(`/api/mindbody-analytics/intro-offers/${composeEmailOffer.id}/communications`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  studentId: composeEmailOffer.studentId,
                  channel: "email",
                  direction: "outbound",
                  subject: sentData.subject,
                  body: sentData.body,
                  recipientAddress: sentData.to,
                  status: "sent",
                }),
              });
              queryClient.invalidateQueries({ queryKey: ["communications", composeEmailOffer.id] });
            } catch (err) {
              console.error("Failed to log email communication:", err);
            }
          }}
        />
      )}
    </div>
  );
}
