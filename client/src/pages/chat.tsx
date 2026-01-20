import { Search, Send, Plus, Users, MessageCircle, X, Reply, ChevronRight, Paperclip, File, Image, FileText, Loader2 } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: string;
  parentId?: number | null;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt: string;
  replyCount?: number;
}

interface AttachedFile {
  file: File;
  preview?: string;
  uploading: boolean;
  uploadedUrl?: string;
  uploadedName?: string;
  uploadedType?: string;
}

interface Conversation {
  id: number;
  name: string | null;
  isGroup: boolean;
  participants: User[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}

export default function Chat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [threadInput, setThreadInput] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [threadAttachedFile, setThreadAttachedFile] = useState<AttachedFile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threadFileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/chat/conversations", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["chat-users"],
    queryFn: async () => {
      const res = await fetch("/api/chat/users", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedConversation,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload file");
      }
      return res.json();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, fileUrl, fileName, fileType }: { content: string; fileUrl?: string; fileName?: string; fileType?: string }) => {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: selectedConversation?.id,
          content,
          fileUrl,
          fileName,
          fileType,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setAttachedFile(null);
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async ({ participantIds, name, isGroup }: { participantIds: string[]; name?: string; isGroup?: boolean }) => {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ participantIds, name, isGroup }),
      });
      if (!res.ok) throw new Error("Failed to start conversation");
      return res.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedConversation(conversation);
      setNewChatOpen(false);
      setSelectedUserIds([]);
      setGroupName("");
    },
  });

  const { data: threadReplies = [], refetch: refetchThread } = useQuery<Message[]>({
    queryKey: ["thread-replies", activeThread?.id],
    queryFn: async () => {
      if (!activeThread) return [];
      const res = await fetch(`/api/chat/messages/${activeThread.id}/replies`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeThread,
  });

  const sendThreadReplyMutation = useMutation({
    mutationFn: async ({ content, fileUrl, fileName, fileType }: { content: string; fileUrl?: string; fileName?: string; fileType?: string }) => {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: selectedConversation?.id,
          parentId: activeThread?.id,
          content,
          fileUrl,
          fileName,
          fileType,
        }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      return res.json();
    },
    onSuccess: () => {
      refetchThread();
      refetchMessages();
      setThreadAttachedFile(null);
    },
  });

  const handleStartConversation = () => {
    if (selectedUserIds.length === 0) return;
    const isGroup = selectedUserIds.length > 1;
    startConversationMutation.mutate({
      participantIds: selectedUserIds,
      name: isGroup && groupName.trim() ? groupName.trim() : undefined,
      isGroup,
    });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  useEffect(() => {
    if (!user) return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      try {
        // Get a secure token from the server
        const tokenRes = await fetch("/api/chat/ws-token", { credentials: "include" });
        if (!tokenRes.ok) return;
        const { token } = await tokenRes.json();

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
          ws?.send(JSON.stringify({ type: "auth", token }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "new_message") {
            refetchMessages();
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
          }
        };

        ws.onclose = () => {
          // Attempt reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
      } catch (error) {
        console.error("WebSocket connection error:", error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [user, refetchMessages, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadReplies]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isThread: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const setFile = isThread ? setThreadAttachedFile : setAttachedFile;
    
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
    setFile({ file, preview, uploading: true });
    
    try {
      const result = await uploadFileMutation.mutateAsync(file);
      setFile(prev => prev ? { 
        ...prev, 
        uploading: false, 
        uploadedUrl: result.fileUrl,
        uploadedName: result.fileName,
        uploadedType: result.fileType,
      } : null);
    } catch (error) {
      console.error("Upload failed:", error);
      setFile(null);
    }
    
    e.target.value = "";
  };

  const handleRemoveAttachment = (isThread: boolean = false) => {
    if (isThread) {
      if (threadAttachedFile?.preview) URL.revokeObjectURL(threadAttachedFile.preview);
      setThreadAttachedFile(null);
    } else {
      if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview);
      setAttachedFile(null);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!messageInput.trim() && !attachedFile?.uploadedUrl) || !selectedConversation) return;
    sendMessageMutation.mutate({
      content: messageInput.trim() || (attachedFile?.uploadedName ? `Sent a file: ${attachedFile.uploadedName}` : "Sent a file"),
      fileUrl: attachedFile?.uploadedUrl,
      fileName: attachedFile?.uploadedName,
      fileType: attachedFile?.uploadedType,
    });
    setMessageInput("");
  };

  const handleSendThreadReply = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!threadInput.trim() && !threadAttachedFile?.uploadedUrl) || !activeThread) return;
    sendThreadReplyMutation.mutate({
      content: threadInput.trim() || (threadAttachedFile?.uploadedName ? `Sent a file: ${threadAttachedFile.uploadedName}` : "Sent a file"),
      fileUrl: threadAttachedFile?.uploadedUrl,
      fileName: threadAttachedFile?.uploadedName,
      fileType: threadAttachedFile?.uploadedType,
    });
    setThreadInput("");
  };

  const getConversationName = (convo: Conversation) => {
    if (convo.name) return convo.name;
    const otherParticipants = convo.participants.filter(p => p.id !== user?.id);
    if (otherParticipants.length === 0) return "Self";
    return otherParticipants.map(p => p.firstName || p.email?.split("@")[0] || "User").join(", ");
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Filter conversations and messages based on search query
  const filteredConversations = conversations.filter(convo => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const name = getConversationName(convo).toLowerCase();
    const lastMessageContent = convo.lastMessage?.content?.toLowerCase() || '';
    return name.includes(query) || lastMessageContent.includes(query);
  });

  // Highlight matching messages in the current conversation
  const matchingMessageIds = new Set<number>();
  if (searchQuery.trim() && selectedConversation) {
    const query = searchQuery.toLowerCase();
    messages.forEach(msg => {
      if (msg.content.toLowerCase().includes(query)) {
        matchingMessageIds.add(msg.id);
      }
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-40"
        style={{ 
          backgroundImage: `url(${generatedBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
        <div className="flex-1 flex relative z-10">
        <div className="w-80 border-r border-border/50 glass-panel flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-xl">Messages</h2>
              <Dialog open={newChatOpen} onOpenChange={(open) => {
                setNewChatOpen(open);
                if (!open) {
                  setSelectedUserIds([]);
                  setGroupName("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-new-chat">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedUserIds.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Group Name (optional)</label>
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="Enter group name..."
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                          data-testid="input-group-name"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select {selectedUserIds.length > 0 ? `(${selectedUserIds.length} selected)` : 'people'}
                      </label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {users.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">No other users found</p>
                        ) : (
                          users.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => toggleUserSelection(u.id)}
                              className={`w-full p-3 rounded-lg flex items-center gap-3 text-left transition-colors ${
                                selectedUserIds.includes(u.id) 
                                  ? 'bg-primary/10 border-2 border-primary' 
                                  : 'hover:bg-accent border-2 border-transparent'
                              }`}
                              data-testid={`user-${u.id}`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedUserIds.includes(u.id) 
                                  ? 'bg-primary border-primary text-white' 
                                  : 'border-gray-300'
                              }`}>
                                {selectedUserIds.includes(u.id) && (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {u.firstName?.[0] || u.email?.[0]?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{u.firstName} {u.lastName}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleStartConversation}
                      disabled={selectedUserIds.length === 0 || startConversationMutation.isPending}
                      className="w-full"
                      data-testid="button-start-conversation"
                    >
                      {startConversationMutation.isPending ? "Starting..." : 
                        selectedUserIds.length > 1 ? "Start Group Chat" : "Start Chat"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats & messages..." 
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-search-conversations"
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
            {searchQuery && (
              <div className="mt-2 text-xs text-muted-foreground">
                Found {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                {matchingMessageIds.size > 0 && selectedConversation && 
                  ` • ${matchingMessageIds.size} matching message${matchingMessageIds.size !== 1 ? 's' : ''}`
                }
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                {searchQuery ? (
                  <>
                    <p>No matching conversations</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <p>No conversations yet</p>
                    <p className="text-sm mt-1">Start a new chat!</p>
                  </>
                )}
              </div>
            ) : (
              filteredConversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left border-b border-border/30 ${
                    selectedConversation?.id === convo.id ? "bg-accent/50" : ""
                  }`}
                  data-testid={`conversation-${convo.id}`}
                >
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    {convo.isGroup ? (
                      <Users className="w-5 h-5 text-pink-600" />
                    ) : (
                      <span className="text-sm font-medium text-pink-600">
                        {getConversationName(convo)[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{getConversationName(convo)}</span>
                      {convo.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(convo.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    {convo.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {convo.lastMessage.content}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`flex-1 flex flex-col ${activeThread ? 'w-1/2' : ''}`}>
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-border/50 glass-panel">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    {selectedConversation.isGroup ? (
                      <Users className="w-5 h-5 text-pink-600" />
                    ) : (
                      <span className="text-sm font-medium text-pink-600">
                        {getConversationName(selectedConversation)[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{getConversationName(selectedConversation)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.participants.length} participant{selectedConversation.participants.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sortedMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No messages yet</p>
                      <p className="text-sm">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  sortedMessages.map((msg) => {
                    const isOwnMessage = msg.senderId === user?.id;
                    const sender = selectedConversation.participants.find(p => p.id === msg.senderId);
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} group`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : ""}`}>
                          {!isOwnMessage && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {sender?.firstName || sender?.email?.split("@")[0] || "User"}
                            </p>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.fileUrl && (
                              <div className="mb-2">
                                {msg.fileType?.startsWith("image/") ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <img 
                                      src={msg.fileUrl} 
                                      alt={msg.fileName || "Attached image"} 
                                      className="max-w-full max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    />
                                  </a>
                                ) : (
                                  <a 
                                    href={msg.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-2 rounded-lg ${
                                      isOwnMessage ? "bg-white/10 hover:bg-white/20" : "bg-background/50 hover:bg-background/80"
                                    } transition-colors`}
                                  >
                                    <FileText className="w-5 h-5 flex-shrink-0" />
                                    <span className="text-sm truncate">{msg.fileName || "Download file"}</span>
                                  </a>
                                )}
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-muted-foreground">
                              {formatTime(msg.createdAt)}
                            </p>
                            <button
                              onClick={() => setActiveThread(msg)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
                              data-testid={`button-reply-${msg.id}`}
                            >
                              <Reply className="w-3 h-3" />
                              Reply
                            </button>
                            {(msg.replyCount ?? 0) > 0 && (
                              <button
                                onClick={() => setActiveThread(msg)}
                                className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
                                data-testid={`button-view-thread-${msg.id}`}
                              >
                                <ChevronRight className="w-3 h-3" />
                                {msg.replyCount} {msg.replyCount === 1 ? 'reply' : 'replies'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-border/50 glass-panel">
                {attachedFile && (
                  <div className="mb-2 p-2 bg-muted/50 rounded-lg flex items-center gap-2">
                    {attachedFile.preview ? (
                      <img src={attachedFile.preview} alt="Preview" className="w-12 h-12 object-cover rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachedFile.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachedFile.uploading ? "Uploading..." : "Ready to send"}
                      </p>
                    </div>
                    {attachedFile.uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(false)}
                        className="p-1 hover:bg-muted rounded"
                        data-testid="button-remove-attachment"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e, false)}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    data-testid="input-file"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!attachedFile}
                    data-testid="button-attach-file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 rounded-full bg-background/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    data-testid="input-message"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full"
                    disabled={(!messageInput.trim() && !attachedFile?.uploadedUrl) || sendMessageMutation.isPending || attachedFile?.uploading}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-lg mb-1">Welcome to Chat</h3>
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          )}
        </div>

        {activeThread && selectedConversation && (
          <div className="w-96 border-l border-border/50 glass-panel flex flex-col">
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <h3 className="font-medium">Thread</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setActiveThread(null)}
                data-testid="button-close-thread"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 border-b border-border/50 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-pink-600">
                    {selectedConversation.participants.find(p => p.id === activeThread.senderId)?.firstName?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {selectedConversation.participants.find(p => p.id === activeThread.senderId)?.firstName || "User"}
                  </p>
                  <p className="text-sm">{activeThread.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(activeThread.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {threadReplies.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No replies yet</p>
              ) : (
                threadReplies.map((reply) => {
                  const isOwnReply = reply.senderId === user?.id;
                  const replySender = selectedConversation.participants.find(p => p.id === reply.senderId);
                  
                  return (
                    <div key={reply.id} className="flex items-start gap-3" data-testid={`thread-reply-${reply.id}`}>
                      <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium text-pink-600">
                          {replySender?.firstName?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {isOwnReply ? "You" : replySender?.firstName || "User"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{formatTime(reply.createdAt)}</span>
                        </div>
                        {reply.fileUrl && (
                          <div className="mt-1 mb-1">
                            {reply.fileType?.startsWith("image/") ? (
                              <a href={reply.fileUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={reply.fileUrl} 
                                  alt={reply.fileName || "Attached image"} 
                                  className="max-w-full max-h-32 rounded cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              </a>
                            ) : (
                              <a 
                                href={reply.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <FileText className="w-4 h-4 flex-shrink-0" />
                                <span className="text-xs truncate">{reply.fileName || "Download file"}</span>
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-sm mt-0.5">{reply.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={threadEndRef} />
            </div>

            <form onSubmit={handleSendThreadReply} className="p-4 border-t border-border/50">
              {threadAttachedFile && (
                <div className="mb-2 p-2 bg-muted/50 rounded-lg flex items-center gap-2">
                  {threadAttachedFile.preview ? (
                    <img src={threadAttachedFile.preview} alt="Preview" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{threadAttachedFile.file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {threadAttachedFile.uploading ? "Uploading..." : "Ready"}
                    </p>
                  </div>
                  {threadAttachedFile.uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(true)}
                      className="p-1 hover:bg-muted rounded"
                      data-testid="button-thread-remove-attachment"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={threadFileInputRef}
                  onChange={(e) => handleFileSelect(e, true)}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  data-testid="input-thread-file"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full h-9 w-9"
                  onClick={() => threadFileInputRef.current?.click()}
                  disabled={!!threadAttachedFile}
                  data-testid="button-thread-attach-file"
                >
                  <Paperclip className="w-3 h-3" />
                </Button>
                <input
                  type="text"
                  value={threadInput}
                  onChange={(e) => setThreadInput(e.target.value)}
                  placeholder="Reply in thread..."
                  className="flex-1 px-3 py-2 text-sm rounded-full bg-background/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  data-testid="input-thread-reply"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full h-9 w-9"
                  disabled={(!threadInput.trim() && !threadAttachedFile?.uploadedUrl) || sendThreadReplyMutation.isPending || threadAttachedFile?.uploading}
                  data-testid="button-send-thread-reply"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </form>
          </div>
        )}
        </div>
    </div>
  );
}
