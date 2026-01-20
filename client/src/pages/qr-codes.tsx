import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCode, Plus, BarChart3, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { toast } from "sonner";

interface QRCodeData {
  id: number;
  qrCodeId: string;
  qrName: string;
  qrType: string;
  shortURL: string;
  qrImageUrl: string;
  scans: number;
  createdAt: string;
}

interface ScanData {
  date: string;
  country: string;
  city: string;
  device: string;
  os: string;
  totalScans: number;
}

export default function QRCodesPage() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    destinationUrl: "",
    category: "class",
    isDynamic: true,
    colorDark: "#000000",
    backgroundColor: "#ffffff",
  });

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/qr-tiger/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: qrCodes = [], isLoading } = useQuery<QRCodeData[]>({
    queryKey: ["/api/qr-tiger/codes"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: status?.connected,
  });

  const hasValidQrId = selectedQR?.qrCodeId && !selectedQR.qrCodeId.startsWith("qr_");
  
  const { data: analytics = [], isLoading: analyticsLoading } = useQuery<ScanData[]>({
    queryKey: [`/api/qr-tiger/codes/${selectedQR?.qrCodeId}/analytics`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!hasValidQrId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch("/api/qr-tiger/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create QR code");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-tiger/codes"] });
      setIsCreateOpen(false);
      setFormData({
        name: "",
        destinationUrl: "",
        category: "class",
        isDynamic: true,
        colorDark: "#000000",
        backgroundColor: "#ffffff",
      });
      toast.success("QR code created successfully");
    },
    onError: () => {
      toast.error("Failed to create QR code");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/qr-tiger/codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete QR code");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qr-tiger/codes"] });
      setSelectedQR(null);
      toast.success("QR code deleted");
    },
    onError: () => {
      toast.error("Failed to delete QR code");
    },
  });

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = [
    { value: "class", label: "Class" },
    { value: "retreat", label: "Retreat" },
    { value: "special-offer", label: "Special Offer" },
    { value: "workshop", label: "Workshop" },
    { value: "event", label: "Event" },
    { value: "general", label: "General" },
  ];

  if (statusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="p-6 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-display font-bold text-2xl md:text-3xl">QR Codes</h1>
            </div>
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="p-6 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-display font-bold text-2xl md:text-3xl">QR Codes</h1>
            </div>
            <div className="glass-panel p-8 rounded-xl text-center">
              <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">QR Tiger Not Connected</h2>
              <p className="text-muted-foreground mb-4">Connect your QR Tiger account to create and track QR codes.</p>
              <a 
                href="/connect" 
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="link-connect-qrtiger"
              >
                <ExternalLink className="w-4 h-4" />
                Go to Connect Apps
              </a>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="p-6 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-display font-bold text-2xl md:text-3xl">QR Codes</h1>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-qr">
                  <Plus className="w-4 h-4 mr-2" />
                  Create QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create QR Code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Morning Yoga Class"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      data-testid="input-qr-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="url">Destination URL</Label>
                    <Input
                      id="url"
                      placeholder="https://..."
                      value={formData.destinationUrl}
                      onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                      data-testid="input-qr-url"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="select-qr-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dynamic">Dynamic QR (trackable)</Label>
                    <Switch
                      id="dynamic"
                      checked={formData.isDynamic}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDynamic: checked })}
                      data-testid="switch-qr-dynamic"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="colorDark">QR Color</Label>
                      <Input
                        id="colorDark"
                        type="color"
                        value={formData.colorDark}
                        onChange={(e) => setFormData({ ...formData, colorDark: e.target.value })}
                        className="h-10"
                        data-testid="input-qr-color"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bgColor">Background</Label>
                      <Input
                        id="bgColor"
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="h-10"
                        data-testid="input-qr-bg"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => createMutation.mutate(formData)}
                    disabled={!formData.name || !formData.destinationUrl || createMutation.isPending}
                    data-testid="button-submit-qr"
                  >
                    {createMutation.isPending ? "Creating..." : "Create QR Code"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="codes" className="space-y-6">
            <TabsList>
              <TabsTrigger value="codes" data-testid="tab-codes">
                <QrCode className="w-4 h-4 mr-2" />
                QR Codes
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="codes">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading QR codes...</div>
              ) : qrCodes.length === 0 ? (
                <div className="space-y-4">
                  <div className="glass-panel p-8 rounded-xl text-center">
                    <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2">Create New QR Codes</h2>
                    <p className="text-muted-foreground mb-4">Create and track new QR codes for your campaigns.</p>
                    <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-qr">
                      <Plus className="w-4 h-4 mr-2" />
                      Create QR Code
                    </Button>
                  </div>
                  <div className="glass-panel p-4 rounded-xl bg-amber-50/50 border border-amber-200/50">
                    <div className="flex items-start gap-3">
                      <ExternalLink className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800 font-medium">View Existing QR Codes</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Your existing QR codes (21 active) can be viewed and managed directly in the{" "}
                          <a 
                            href="https://app.qrcode-tiger.com/?type=dashboard" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="underline font-medium hover:text-amber-900"
                          >
                            QR Tiger Dashboard
                          </a>
                          . New codes created here will also appear there.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {qrCodes.map((qr) => (
                    <div
                      key={qr.qrCodeId}
                      className="glass-panel p-4 rounded-xl hover:bg-white/80 transition-colors"
                      data-testid={`qr-card-${qr.qrCodeId}`}
                    >
                      <div className="flex items-start gap-4">
                        {qr.qrImageUrl ? (
                          <img src={qr.qrImageUrl} alt={qr.qrName} className="w-20 h-20 rounded-lg" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                            <QrCode className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{qr.qrName}</h3>
                          <p className="text-sm text-muted-foreground">{qr.qrType}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{qr.scans} scans</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(qr.shortURL, qr.qrCodeId)}
                          data-testid={`button-copy-${qr.qrCodeId}`}
                        >
                          {copiedId === qr.qrCodeId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(qr.shortURL, "_blank")}
                          data-testid={`button-open-${qr.qrCodeId}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedQR(qr)}
                          data-testid={`button-analytics-${qr.qrCodeId}`}
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                          onClick={() => deleteMutation.mutate(qr.id)}
                          data-testid={`button-delete-${qr.qrCodeId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              {selectedQR ? (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold">{selectedQR.qrName}</h2>
                        <p className="text-sm text-muted-foreground">{selectedQR.scans} total scans</p>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedQR(null)}>
                        View All
                      </Button>
                    </div>
                    {selectedQR.qrCodeId.startsWith("qr_") ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-2">Analytics are not available for this QR code.</p>
                        <p className="text-sm text-muted-foreground">
                          View detailed analytics in the{" "}
                          <a 
                            href="https://app.qrcode-tiger.com/?type=dashboard" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline hover:text-primary/80"
                          >
                            QR Tiger Dashboard
                          </a>
                        </p>
                      </div>
                    ) : analyticsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
                    ) : analytics.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No scan data available yet.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-white/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Scans</p>
                            <p className="text-2xl font-bold">{analytics.reduce((sum, s) => sum + s.totalScans, 0)}</p>
                          </div>
                          <div className="p-4 bg-white/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Countries</p>
                            <p className="text-2xl font-bold">{new Set(analytics.map(s => s.country)).size}</p>
                          </div>
                          <div className="p-4 bg-white/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Cities</p>
                            <p className="text-2xl font-bold">{new Set(analytics.map(s => s.city)).size}</p>
                          </div>
                          <div className="p-4 bg-white/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Devices</p>
                            <p className="text-2xl font-bold">{new Set(analytics.map(s => s.device)).size}</p>
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Date</th>
                                <th className="text-left py-2">Location</th>
                                <th className="text-left py-2">Device</th>
                                <th className="text-right py-2">Scans</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.slice(0, 10).map((scan, idx) => (
                                <tr key={idx} className="border-b border-border/50">
                                  <td className="py-2">{scan.date}</td>
                                  <td className="py-2">{scan.city}, {scan.country}</td>
                                  <td className="py-2">{scan.device} ({scan.os})</td>
                                  <td className="py-2 text-right font-medium">{scan.totalScans}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-8 rounded-xl text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">Select a QR Code</h2>
                  <p className="text-muted-foreground">Click the analytics button on any QR code to view its scan data.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
}
