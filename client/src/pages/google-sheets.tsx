import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Plus, ExternalLink, Trash2, Eye, Search, RefreshCw, Table, Edit3, Save, X } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { toast } from "sonner";
import { format } from "date-fns";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";

interface GoogleSheet {
  id: string;
  name: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
}

interface GoogleSheetContent {
  id: string;
  title: string;
  sheets: { title: string; index: number }[];
  data: string[][];
  webViewLink: string;
}

export default function GoogleSheetsPage() {
  const queryClient = useQueryClient();
  const mainContentClass = useMainContentClass();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<string[][]>([]);
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null);
  const [sheetContent, setSheetContent] = useState<GoogleSheetContent | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");
  const [newTitle, setNewTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-sheets/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: sheets = [], isLoading, refetch } = useQuery<GoogleSheet[]>({
    queryKey: ["/api/google-sheets"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: status?.connected,
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await fetch("/api/google-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create spreadsheet");
      return res.json();
    },
    onSuccess: (newSheet) => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets"] });
      setIsCreateOpen(false);
      setNewTitle("");
      toast.success("Spreadsheet created successfully");
      window.open(newSheet.webViewLink, "_blank");
    },
    onError: () => {
      toast.error("Failed to create spreadsheet");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/google-sheets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete spreadsheet");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets"] });
      toast.success("Spreadsheet deleted");
    },
    onError: () => {
      toast.error("Failed to delete spreadsheet");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, sheetName }: { id: string; data: string[][]; sheetName?: string }) => {
      const res = await fetch(`/api/google-sheets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, sheetName }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update spreadsheet");
      return { data };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/google-sheets"] });
      setSheetContent(prev => prev ? { ...prev, data: result.data } : prev);
      setIsEditMode(false);
      setEditData([]);
      toast.success("Spreadsheet updated");
    },
    onError: () => {
      toast.error("Failed to update spreadsheet");
    },
  });

  const viewSpreadsheet = async (sheet: GoogleSheet, tabName?: string) => {
    setSelectedSheet(sheet);
    try {
      const url = tabName 
        ? `/api/google-sheets/${sheet.id}?sheet=${encodeURIComponent(tabName)}`
        : `/api/google-sheets/${sheet.id}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch spreadsheet");
      const content = await res.json();
      setSheetContent(content);
      setActiveTab(content.sheets[0]?.title || "");
      setIsViewOpen(true);
    } catch (error) {
      toast.error("Failed to load spreadsheet content");
    }
  };

  const loadTab = async (tabName: string) => {
    if (!selectedSheet) return;
    setActiveTab(tabName);
    try {
      const res = await fetch(
        `/api/google-sheets/${selectedSheet.id}?sheet=${encodeURIComponent(tabName)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch sheet tab");
      const content = await res.json();
      setSheetContent(content);
    } catch (error) {
      toast.error("Failed to load sheet tab");
    }
  };

  const filteredSheets = sheets.filter(sheet => 
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (statusLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <UnifiedSidebar />
        <main className={mainContentClass}>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <UnifiedSidebar />
        <main className={mainContentClass}>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Table className="w-16 h-16 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700">Google Sheets Not Connected</h2>
            <p className="text-gray-500 text-center max-w-md">
              Google Sheets integration needs to be connected by an administrator. 
              Please visit the Connect page to set up the integration.
            </p>
            <Button 
              onClick={() => window.location.href = "/connect"}
              className="mt-4"
            >
              Go to Connect Page
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <UnifiedSidebar />
      <main className={mainContentClass}>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
              <h1 className="text-2xl font-bold text-gray-900">Google Sheets</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="button-refresh-sheets"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-sheet">
                    <Plus className="w-4 h-4 mr-2" />
                    New Spreadsheet
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Spreadsheet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      placeholder="Spreadsheet title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      data-testid="input-sheet-title"
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
                placeholder="Search spreadsheets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-sheets"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredSheets.length === 0 ? (
            <div className="text-center py-12">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No spreadsheets match your search" : "No spreadsheets found"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  data-testid={`sheet-item-${sheet.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileSpreadsheet className="w-8 h-8 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{sheet.name}</h3>
                        <p className="text-sm text-gray-500">
                          Modified {format(new Date(sheet.modifiedTime), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewSpreadsheet(sheet)}
                        data-testid={`button-view-${sheet.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(sheet.webViewLink, "_blank")}
                        data-testid={`button-open-${sheet.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(sheet.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${sheet.id}`}
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
      </main>

      <Dialog open={isViewOpen} onOpenChange={(open) => {
        setIsViewOpen(open);
        if (!open) {
          setIsEditMode(false);
          setEditData([]);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              {sheetContent?.title || "Spreadsheet"}
              {isEditMode && <span className="text-sm text-orange-500 font-normal">(Editing)</span>}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-between mb-4">
            {sheetContent && sheetContent.sheets.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sheet:</span>
                <Select value={activeTab} onValueChange={loadTab} disabled={isEditMode}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetContent.sheets.map((tab) => (
                      <SelectItem key={tab.title} value={tab.title}>
                        {tab.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditData(sheetContent?.data || []);
                    setIsEditMode(true);
                  }}
                  data-testid="button-edit-sheet"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditMode(false);
                      setEditData([]);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (selectedSheet) {
                        updateMutation.mutate({
                          id: selectedSheet.id,
                          data: editData,
                          sheetName: activeTab
                        });
                      }
                    }}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-sheet"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-auto max-h-[55vh] border rounded-lg">
            {isEditMode ? (
              <div className="p-4">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {editData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="border border-gray-200 p-0">
                            <input
                              type="text"
                              value={cell}
                              onChange={(e) => {
                                const newData = [...editData];
                                newData[rowIndex] = [...newData[rowIndex]];
                                newData[rowIndex][cellIndex] = e.target.value;
                                setEditData(newData);
                              }}
                              className="w-full px-2 py-1.5 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                          </td>
                        ))}
                        <td className="border border-gray-200 p-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newData = editData.filter((_, i) => i !== rowIndex);
                              setEditData(newData);
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const cols = editData[0]?.length || 3;
                      setEditData([...editData, new Array(cols).fill("")]);
                    }}
                  >
                    + Add Row
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditData(editData.map(row => [...row, ""]));
                    }}
                  >
                    + Add Column
                  </Button>
                </div>
              </div>
            ) : sheetContent?.data && sheetContent.data.length > 0 ? (
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {sheetContent.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="border border-gray-200 px-3 py-2 whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
                <span>No data in this sheet</span>
                {!isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditData([["", "", ""], ["", "", ""], ["", "", ""]]);
                      setIsEditMode(true);
                    }}
                  >
                    Add Data
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => window.open(sheetContent?.webViewLink, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Google Sheets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
