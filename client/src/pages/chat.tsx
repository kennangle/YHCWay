import { UnifiedSidebar } from "@/components/unified-sidebar";
import { Search, Send, Plus, Users, MessageCircle } from "lucide-react";
import generatedBg from "@assets/generated_images/subtle_abstract_light_gradient_background_for_glassmorphism_ui.png";
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
  content: string;
  createdAt: string;
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
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

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

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: selectedConversation?.id,
          content,
        }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate(messageInput.trim());
    setMessageInput("");
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

      <main className="flex-1 ml-64 relative z-10 flex">
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
                placeholder="Search conversations..." 
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-background/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                data-testid="input-search-conversations"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start a new chat!</p>
              </div>
            ) : (
              conversations.map((convo) => (
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

        <div className="flex-1 flex flex-col">
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
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
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
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-border/50 glass-panel">
                <div className="flex gap-2">
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
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
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
      </main>
    </div>
  );
}
