import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HardDrive, ExternalLink, Search, RefreshCw, FileText, FileSpreadsheet, Folder, Image, Video, File, ChevronRight } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  iconLink?: string;
  size?: string;
  parents?: string[];
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return Folder;
  if (mimeType === 'application/vnd.google-apps.document') return FileText;
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return FileSpreadsheet;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  return File;
}

function getFileColor(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return 'text-yellow-500';
  if (mimeType === 'application/vnd.google-apps.document') return 'text-blue-600';
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'text-green-600';
  if (mimeType.startsWith('image/')) return 'text-purple-500';
  if (mimeType.startsWith('video/')) return 'text-red-500';
  return 'text-gray-500';
}

function formatFileSize(bytes?: string) {
  if (!bytes) return '';
  const size = parseInt(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function GoogleDrivePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string }[]>([]);

  const folderId = currentFolder.length > 0 ? currentFolder[currentFolder.length - 1].id : undefined;

  const { data: status, isLoading: statusLoading } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/google-drive/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: driveData, isLoading, refetch } = useQuery<DriveListResponse>({
    queryKey: ["/api/google-drive", folderId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (folderId) params.set('folderId', folderId);
      const res = await fetch(`/api/google-drive?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    enabled: status?.connected,
  });

  const files = driveData?.files || [];

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navigateToFolder = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setCurrentFolder([...currentFolder, { id: file.id, name: file.name }]);
    }
  };

  const navigateUp = (index: number) => {
    setCurrentFolder(currentFolder.slice(0, index + 1));
  };

  const goToRoot = () => {
    setCurrentFolder([]);
  };

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
        <HardDrive className="w-16 h-16 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-700">Google Drive Not Connected</h2>
        <p className="text-gray-500 text-center max-w-md">
          Google Drive integration needs to be connected by an administrator. 
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
              <HardDrive className="w-8 h-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-gray-900">Google Drive</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-drive"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-4 text-sm">
            <button 
              onClick={goToRoot}
              className="text-blue-600 hover:underline font-medium"
              data-testid="breadcrumb-root"
            >
              My Drive
            </button>
            {currentFolder.map((folder, index) => (
              <span key={folder.id} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => navigateUp(index)}
                  className="text-blue-600 hover:underline"
                  data-testid={`breadcrumb-${folder.id}`}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-drive"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No files match your search" : "No files found in this folder"}
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.mimeType);
                const iconColor = getFileColor(file.mimeType);
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                
                return (
                  <div
                    key={file.id}
                    className={`bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${isFolder ? 'cursor-pointer' : ''}`}
                    onClick={() => isFolder && navigateToFolder(file)}
                    data-testid={`file-item-${file.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className={`w-8 h-8 ${iconColor} flex-shrink-0`} />
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
                          <p className="text-sm text-gray-500">
                            Modified {format(new Date(file.modifiedTime), "MMM d, yyyy 'at' h:mm a")}
                            {file.size && ` • ${formatFileSize(file.size)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isFolder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(file.webViewLink, "_blank");
                            }}
                            data-testid={`button-open-${file.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        {isFolder && (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}
