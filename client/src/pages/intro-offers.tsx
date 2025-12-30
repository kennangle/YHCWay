import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Gift, RefreshCw, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Search, Edit2, Save, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  lastAttendanceDate?: string;
  daysSinceLastAttendance?: number;
  daysSincePurchase: number;
  hasConverted: boolean;
  conversionDate?: string;
  conversionType?: string;
  memberStatus: string;
  notes?: string;
}

interface IntroOfferSummary {
  totalOffers: number;
  activeOffers: number;
  convertedOffers: number;
  expiredOffers: number;
  conversionRate: number;
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
type SortField = "student" | "offer" | "purchaseDate" | "days" | "status" | "classes";
type SortDirection = "asc" | "desc";

export default function IntroOffers() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  
  // Parse initial filter from URL
  const getInitialFilter = (): StatusFilter => {
    const params = new URLSearchParams(window.location.search);
    const filter = params.get("filter");
    if (filter && ["all", "new", "engaged", "at_risk", "lapsed", "needs_attention", "converted"].includes(filter)) {
      return filter as StatusFilter;
    }
    return "all";
  };
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(getInitialFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [sortField, setSortField] = useState<SortField>("purchaseDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  // Update filter when URL changes
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

  const { data: summary, isLoading: summaryLoading } = useQuery<IntroOfferSummary>({
    queryKey: ["/api/mindbody-analytics/intro-offers/summary"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/intro-offers/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: statusData?.configured,
  });

  const { data: offersData, isLoading: offersLoading, isFetching, refetch } = useQuery<PaginatedResponse<IntroOffer>>({
    queryKey: ["/api/mindbody-analytics/intro-offers", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("limit", "50");
      const res = await fetch(`/api/mindbody-analytics/intro-offers?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch intro offers");
      return res.json();
    },
    enabled: statusData?.configured,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status?: string; notes?: string }) => {
      const res = await fetch(`/api/mindbody-analytics/intro-offers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update offer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mindbody-analytics/intro-offers"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/mindbody-analytics/intro-offers/summary"] });
      queryClient.invalidateQueries({ queryKey: ["intro-offers-feed"] });
      setEditingId(null);
      toast({ title: "Updated", description: "Intro offer updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update offer", variant: "destructive" });
    },
  });

  const offers = offersData?.data || [];
  const filteredOffers = offers.filter(offer => {
    const fullName = `${offer.firstName} ${offer.lastName}`.toLowerCase();
    const matchesSearch = !searchTerm || 
      fullName.includes(searchTerm.toLowerCase()) ||
      offer.offerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (offer.email && offer.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Apply status filter
    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "needs_attention") {
      return offer.memberStatus === "at_risk" || offer.memberStatus === "lapsed";
    }
    return offer.memberStatus === statusFilter;
  });

  const sortedOffers = [...filteredOffers].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "student":
        comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
        break;
      case "offer":
        comparison = a.offerName.localeCompare(b.offerName);
        break;
      case "purchaseDate":
        comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        break;
      case "days":
        comparison = a.daysSincePurchase - b.daysSincePurchase;
        break;
      case "status":
        comparison = (a.memberStatus || "").localeCompare(b.memberStatus || "");
        break;
      case "classes":
        comparison = a.classesAttendedSincePurchase - b.classesAttendedSincePurchase;
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
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-4 h-4 ml-1" /> 
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const handleEdit = (offer: IntroOffer) => {
    setEditingId(offer.id);
    setEditNotes(offer.notes || "");
    setEditStatus(offer.memberStatus);
  };

  const handleSave = (id: string) => {
    updateMutation.mutate({ id, status: editStatus, notes: editNotes });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditNotes("");
    setEditStatus("");
  };

  const getStatusIcon = (status: string | undefined) => {
    switch ((status || "").toLowerCase()) {
      case "new": return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "engaged": return <Clock className="w-4 h-4 text-green-500" />;
      case "at_risk": return <XCircle className="w-4 h-4 text-orange-500" />;
      case "lapsed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "converted": return <CheckCircle className="w-4 h-4 text-purple-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string | undefined) => {
    switch ((status || "").toLowerCase()) {
      case "new": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "engaged": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "at_risk": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "lapsed": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "converted": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!statusData?.configured) {
    return (
      <div className="min-h-screen bg-background text-foreground flex font-sans">
        <div 
          className="fixed inset-0 z-0 pointer-events-none opacity-40"
          style={{ backgroundImage: `url(${generatedBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <UnifiedSidebar />
        <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
          <TopBar />
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="text-center">
              <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h1 className="font-display font-bold text-2xl mb-2">Mindbody Analytics Not Connected</h1>
              <p className="text-muted-foreground">Please configure your Mindbody Analytics API key to view intro offers.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ backgroundImage: `url(${generatedBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      
      <UnifiedSidebar />

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Gift className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl" data-testid="text-intro-offers-title">Intro Offers</h1>
              <p className="text-muted-foreground">Track and manage intro offer conversions</p>
            </div>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isFetching}
            variant="outline"
            data-testid="button-refresh-offers"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Offers</p>
                <p className="text-2xl font-bold" data-testid="stat-total-offers">
                  {summaryLoading ? "..." : summary?.totalOffers || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold" data-testid="stat-active-offers">
                  {summaryLoading ? "..." : summary?.activeOffers || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold" data-testid="stat-converted-offers">
                  {summaryLoading ? "..." : summary?.convertedOffers || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold" data-testid="stat-conversion-rate">
                  {summaryLoading ? "..." : `${(summary?.conversionRate || 0).toFixed(1)}%`}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or offer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-offers"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
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
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("student")}
                      data-testid="sort-student"
                    >
                      <span className="flex items-center">Student<SortIcon field="student" /></span>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("offer")}
                      data-testid="sort-offer"
                    >
                      <span className="flex items-center">Offer<SortIcon field="offer" /></span>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("purchaseDate")}
                      data-testid="sort-purchase"
                    >
                      <span className="flex items-center">Purchase<SortIcon field="purchaseDate" /></span>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("days")}
                      data-testid="sort-days"
                    >
                      <span className="flex items-center">Days<SortIcon field="days" /></span>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("status")}
                      data-testid="sort-status"
                    >
                      <span className="flex items-center">Status<SortIcon field="status" /></span>
                    </th>
                    <th 
                      className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => handleSort("classes")}
                      data-testid="sort-classes"
                    >
                      <span className="flex items-center">Classes<SortIcon field="classes" /></span>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Notes</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOffers.map((offer) => (
                    <tr key={offer.id} className="border-b border-border/50 hover:bg-muted/30" data-testid={`row-offer-${offer.id}`}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{offer.firstName} {offer.lastName}</p>
                          {offer.email && (
                            <p className="text-sm text-muted-foreground">{offer.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{offer.offerName}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(offer.purchaseDate)}</td>
                      <td className="py-3 px-4 text-sm">
                        {offer.daysSincePurchase}d ago
                      </td>
                      <td className="py-3 px-4">
                        {editingId === offer.id ? (
                          <Select value={editStatus} onValueChange={setEditStatus}>
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="engaged">Engaged</SelectItem>
                              <SelectItem value="at_risk">At Risk</SelectItem>
                              <SelectItem value="converted">Converted</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(offer.memberStatus)}`}>
                            {getStatusIcon(offer.memberStatus)}
                            {offer.memberStatus}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">{offer.classesAttendedSincePurchase}</td>
                      <td className="py-3 px-4 text-sm max-w-[200px]">
                        {editingId === offer.id ? (
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="h-8"
                          />
                        ) : (
                          <span className="truncate block">{offer.notes || "-"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingId === offer.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSave(offer.id)}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-${offer.id}`}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              data-testid={`button-cancel-${offer.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(offer)}
                            data-testid={`button-edit-${offer.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}
