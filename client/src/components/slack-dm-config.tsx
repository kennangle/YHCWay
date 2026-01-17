import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, MessageCircle, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SlackDmConversation {
  id: string;
  name: string;
  isOpen: boolean;
}

interface SlackDmPreference {
  conversationId: string;
  conversationName: string;
  isEnabled: boolean;
}

export function SlackDmConfig() {
  const [open, setOpen] = useState(false);
  const [dmSelections, setDmSelections] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: convsLoading } = useQuery<SlackDmConversation[]>({
    queryKey: ["slack-dm-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/slack/dm-conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch DM conversations");
      return res.json();
    },
    enabled: open,
  });

  const { data: preferences = [], isLoading: prefsLoading } = useQuery<SlackDmPreference[]>({
    queryKey: ["slack-dm-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/slack/dm-preferences", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch DM preferences");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (preferences.length > 0) {
      const selections: Record<string, boolean> = {};
      preferences.forEach(p => {
        selections[p.conversationId] = p.isEnabled;
      });
      setDmSelections(selections);
    } else if (conversations.length > 0 && preferences.length === 0) {
      const selections: Record<string, boolean> = {};
      conversations.forEach(c => {
        selections[c.id] = true;
      });
      setDmSelections(selections);
    }
  }, [preferences, conversations]);

  const saveMutation = useMutation({
    mutationFn: async (selections: Record<string, boolean>) => {
      const dmPrefs = conversations.map(c => ({
        conversationId: c.id,
        conversationName: c.name,
        isEnabled: selections[c.id] ?? false,
      }));

      const res = await fetch("/api/slack/dm-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversations: dmPrefs }),
      });
      if (!res.ok) throw new Error("Failed to save DM preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slack-dm-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["slack-messages"] });
      setOpen(false);
    },
  });

  const handleToggle = (convId: string, enabled: boolean) => {
    setDmSelections(prev => ({ ...prev, [convId]: enabled }));
  };

  const handleSave = () => {
    saveMutation.mutate(dmSelections);
  };

  const handleSelectAll = () => {
    const selections: Record<string, boolean> = {};
    conversations.forEach(c => {
      selections[c.id] = true;
    });
    setDmSelections(selections);
  };

  const handleSelectNone = () => {
    const selections: Record<string, boolean> = {};
    conversations.forEach(c => {
      selections[c.id] = false;
    });
    setDmSelections(selections);
  };

  const isLoading = convsLoading || prefsLoading;
  const singleDms = conversations.filter(c => !c.name.includes(','));
  const groupDms = conversations.filter(c => c.name.includes(','));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
          data-testid="button-slack-dm-config"
        >
          <MessageCircle className="w-4 h-4 mr-1" />
          Configure DMs
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Choose Slack DM Conversations</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-xs"
                data-testid="button-select-all-dms"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectNone}
                className="text-xs"
                data-testid="button-select-none-dms"
              >
                Select None
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {singleDms.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Direct Messages</h4>
                  <div className="space-y-2">
                    {singleDms.map(conv => (
                      <div 
                        key={conv.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                        data-testid={`dm-row-${conv.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-pink-600" />
                          <Label htmlFor={conv.id} className="text-gray-900 cursor-pointer">
                            {conv.name}
                          </Label>
                        </div>
                        <Switch
                          id={conv.id}
                          checked={dmSelections[conv.id] ?? false}
                          onCheckedChange={(checked) => handleToggle(conv.id, checked)}
                          data-testid={`switch-dm-${conv.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {groupDms.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Group Conversations</h4>
                  <div className="space-y-2">
                    {groupDms.map(conv => (
                      <div 
                        key={conv.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                        data-testid={`dm-row-${conv.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-600" />
                          <Label htmlFor={conv.id} className="text-gray-600 cursor-pointer text-sm">
                            {conv.name}
                          </Label>
                        </div>
                        <Switch
                          id={conv.id}
                          checked={dmSelections[conv.id] ?? false}
                          onCheckedChange={(checked) => handleToggle(conv.id, checked)}
                          data-testid={`switch-dm-${conv.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {conversations.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No DM conversations found. Connect your Slack account to see your direct messages.
                </p>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-dm-config"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700"
                data-testid="button-save-dm-config"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
