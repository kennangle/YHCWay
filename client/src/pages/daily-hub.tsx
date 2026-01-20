import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, subDays, parseISO } from "date-fns";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Pin,
  Megaphone,
  MessageSquare,
  Phone,
  DollarSign,
  ShoppingBag,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DailyHubEntry {
  id: number;
  date: string;
  section: string;
  content: string;
  authorId: string;
  authorInitials: string;
  createdAt: string;
}

interface PinnedAnnouncement {
  id: number;
  section: string;
  content: string;
  startDate: string;
  endDate: string | null;
  authorId: string;
  isActive: boolean;
}

const SECTIONS = [
  { id: "teacher_announcements", label: "Teacher Announcements", icon: Megaphone, description: "Announcements to make in class" },
  { id: "staff_questions", label: "Staff Questions", icon: MessageSquare, description: "Questions for managers/owners" },
  { id: "staff_comments", label: "Staff Comments", icon: MessageSquare, description: "General comments and notes" },
  { id: "voicemail_notes", label: "Voicemail Notes", icon: Phone, description: "Phone message summaries" },
  { id: "membership_sales", label: "Memberships/Class Packs", icon: DollarSign, description: "Membership and class pack sales" },
  { id: "retail_sales", label: "Retail Sales", icon: ShoppingBag, description: "Product sales" },
  { id: "lost_and_found", label: "Lost & Found", icon: Package, description: "Lost and found items" },
];

export default function DailyHub() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEntry, setNewEntry] = useState<{ section: string; content: string } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ id: number; content: string } | null>(null);
  const [pinnedDialogOpen, setPinnedDialogOpen] = useState(false);
  const [newPinned, setNewPinned] = useState({ section: "", content: "", startDate: "", endDate: "" });

  const { data, isLoading } = useQuery<{ entries: DailyHubEntry[]; pinnedAnnouncements: PinnedAnnouncement[] }>({
    queryKey: ["/api/daily-hub", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-hub/${selectedDate}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily hub");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { date: string; section: string; content: string }) => {
      const res = await fetch("/api/daily-hub/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-hub", selectedDate] });
      setNewEntry(null);
      toast.success("Entry added");
    },
    onError: () => toast.error("Failed to add entry"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      const res = await fetch(`/api/daily-hub/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to update entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-hub", selectedDate] });
      setEditingEntry(null);
      toast.success("Entry updated");
    },
    onError: () => toast.error("Failed to update entry"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/daily-hub/entries/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete entry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-hub", selectedDate] });
      toast.success("Entry deleted");
    },
    onError: () => toast.error("Failed to delete entry"),
  });

  const createPinnedMutation = useMutation({
    mutationFn: async (data: { section: string; content: string; startDate: string; endDate?: string }) => {
      const res = await fetch("/api/daily-hub/pinned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create pinned announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-hub", selectedDate] });
      setPinnedDialogOpen(false);
      setNewPinned({ section: "", content: "", startDate: "", endDate: "" });
      toast.success("Pinned announcement created");
    },
    onError: () => toast.error("Failed to create announcement"),
  });

  const deletePinnedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/daily-hub/pinned/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-hub", selectedDate] });
      toast.success("Announcement deleted");
    },
    onError: () => toast.error("Failed to delete announcement"),
  });

  const goToToday = () => setSelectedDate(new Date().toISOString().split('T')[0]);
  const goToPrevDay = () => setSelectedDate(subDays(parseISO(selectedDate), 1).toISOString().split('T')[0]);
  const goToNextDay = () => setSelectedDate(addDays(parseISO(selectedDate), 1).toISOString().split('T')[0]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const displayDate = format(parseISO(selectedDate), "EEEE, MMMM d, yyyy");

  const getEntriesForSection = (sectionId: string) => {
    return data?.entries.filter(e => e.section === sectionId) || [];
  };

  const getPinnedForSection = (sectionId: string) => {
    return data?.pinnedAnnouncements.filter(p => p.section === sectionId) || [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="daily-hub-title">Daily Hub</h1>
          <p className="text-muted-foreground">Staff communication log</p>
        </div>
        
        <div className="flex items-center gap-2">
          {user?.isAdmin && (
            <Dialog open={pinnedDialogOpen} onOpenChange={setPinnedDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-add-pinned">
                  <Pin className="w-4 h-4 mr-2" />
                  Add Pinned
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Pinned Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Section</label>
                    <Select value={newPinned.section} onValueChange={(v) => setNewPinned({ ...newPinned, section: v })}>
                      <SelectTrigger data-testid="select-pinned-section">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Content</label>
                    <Textarea
                      value={newPinned.content}
                      onChange={(e) => setNewPinned({ ...newPinned, content: e.target.value })}
                      placeholder="Announcement content..."
                      data-testid="input-pinned-content"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        value={newPinned.startDate}
                        onChange={(e) => setNewPinned({ ...newPinned, startDate: e.target.value })}
                        data-testid="input-pinned-start"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date (optional)</label>
                      <Input
                        type="date"
                        value={newPinned.endDate}
                        onChange={(e) => setNewPinned({ ...newPinned, endDate: e.target.value })}
                        data-testid="input-pinned-end"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => createPinnedMutation.mutate({
                      section: newPinned.section,
                      content: newPinned.content,
                      startDate: newPinned.startDate,
                      endDate: newPinned.endDate || undefined,
                    })}
                    disabled={!newPinned.section || !newPinned.content || !newPinned.startDate}
                    className="w-full"
                    data-testid="button-save-pinned"
                  >
                    Create Announcement
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between bg-card rounded-lg p-4 mb-6 shadow-sm border">
        <Button variant="ghost" size="icon" onClick={goToPrevDay} data-testid="button-prev-day">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-lg font-medium" data-testid="text-current-date">{displayDate}</span>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-go-today">
              Today
            </Button>
          )}
        </div>
        
        <Button variant="ghost" size="icon" onClick={goToNextDay} data-testid="button-next-day">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const entries = getEntriesForSection(section.id);
          const pinned = getPinnedForSection(section.id);
          const SectionIcon = section.icon;
          
          return (
            <Card key={section.id} data-testid={`section-${section.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SectionIcon className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{section.label}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewEntry({ section: section.id, content: "" })}
                    data-testid={`button-add-entry-${section.id}`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pinned.map((p) => (
                    <div
                      key={`pinned-${p.id}`}
                      className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      data-testid={`pinned-${p.id}`}
                    >
                      <Pin className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pinned until {p.endDate || "removed"}
                        </p>
                      </div>
                      {user?.isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => deletePinnedMutation.mutate(p.id)}
                          data-testid={`button-delete-pinned-${p.id}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {entries.length === 0 && pinned.length === 0 && !newEntry?.section?.includes(section.id) && (
                    <p className="text-sm text-muted-foreground italic py-2">No entries for today</p>
                  )}
                  
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      data-testid={`entry-${entry.id}`}
                    >
                      {editingEntry?.id === entry.id ? (
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={editingEntry.content}
                            onChange={(e) => setEditingEntry({ ...editingEntry, content: e.target.value })}
                            className="min-h-[60px]"
                            data-testid={`input-edit-entry-${entry.id}`}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: entry.id, content: editingEntry.content })}
                              data-testid={`button-save-entry-${entry.id}`}
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingEntry(null)}
                              data-testid={`button-cancel-edit-${entry.id}`}
                            >
                              <X className="w-3 h-3 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {entry.authorInitials && `-${entry.authorInitials}`}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingEntry({ id: entry.id, content: entry.content })}
                              data-testid={`button-edit-entry-${entry.id}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteMutation.mutate(entry.id)}
                              data-testid={`button-delete-entry-${entry.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  
                  {newEntry?.section === section.id && (
                    <div className="space-y-2 p-3 border-2 border-dashed rounded-lg">
                      <Textarea
                        value={newEntry.content}
                        onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                        placeholder="Enter your note..."
                        className="min-h-[60px]"
                        autoFocus
                        data-testid={`input-new-entry-${section.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => createMutation.mutate({
                            date: selectedDate,
                            section: section.id,
                            content: newEntry.content,
                          })}
                          disabled={!newEntry.content.trim()}
                          data-testid={`button-submit-entry-${section.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Entry
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewEntry(null)}
                          data-testid={`button-cancel-entry-${section.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
