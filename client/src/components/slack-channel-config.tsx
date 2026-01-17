import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Check, Loader2, Hash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SlackChannel {
  id: string;
  name: string;
  isMember: boolean;
}

interface SlackPreference {
  channelId: string;
  channelName: string;
  isEnabled: boolean;
}

export function SlackChannelConfig() {
  const [open, setOpen] = useState(false);
  const [channelSelections, setChannelSelections] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const { data: channels = [], isLoading: channelsLoading } = useQuery<SlackChannel[]>({
    queryKey: ["slack-channels"],
    queryFn: async () => {
      const res = await fetch("/api/slack/channels", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
    enabled: open,
  });

  const { data: preferences = [], isLoading: prefsLoading } = useQuery<SlackPreference[]>({
    queryKey: ["slack-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/slack/preferences", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch preferences");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (preferences.length > 0) {
      const selections: Record<string, boolean> = {};
      preferences.forEach(p => {
        selections[p.channelId] = p.isEnabled;
      });
      setChannelSelections(selections);
    } else if (channels.length > 0 && preferences.length === 0) {
      const selections: Record<string, boolean> = {};
      channels.forEach(c => {
        selections[c.id] = c.isMember;
      });
      setChannelSelections(selections);
    }
  }, [preferences, channels]);

  const saveMutation = useMutation({
    mutationFn: async (selections: Record<string, boolean>) => {
      const channelPrefs = channels.map(c => ({
        channelId: c.id,
        channelName: c.name,
        isEnabled: selections[c.id] ?? false,
      }));

      const res = await fetch("/api/slack/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channels: channelPrefs }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slack-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["slack-messages"] });
      setOpen(false);
    },
  });

  const handleToggle = (channelId: string, enabled: boolean) => {
    setChannelSelections(prev => ({ ...prev, [channelId]: enabled }));
  };

  const handleSave = () => {
    saveMutation.mutate(channelSelections);
  };

  const handleSelectAll = () => {
    const selections: Record<string, boolean> = {};
    channels.forEach(c => {
      selections[c.id] = true;
    });
    setChannelSelections(selections);
  };

  const handleSelectNone = () => {
    const selections: Record<string, boolean> = {};
    channels.forEach(c => {
      selections[c.id] = false;
    });
    setChannelSelections(selections);
  };

  const isLoading = channelsLoading || prefsLoading;
  const memberChannels = channels.filter(c => c.isMember);
  const otherChannels = channels.filter(c => !c.isMember);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
          data-testid="button-slack-channel-config"
        >
          <Settings className="w-4 h-4 mr-1" />
          Configure Channels
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Choose Slack Channels</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-xs"
                data-testid="button-select-all-channels"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectNone}
                className="text-xs"
                data-testid="button-select-none-channels"
              >
                Select None
              </Button>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {memberChannels.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Your Channels</h4>
                  <div className="space-y-2">
                    {memberChannels.map(channel => (
                      <div 
                        key={channel.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                        data-testid={`channel-row-${channel.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-purple-600" />
                          <Label htmlFor={channel.id} className="text-gray-900 cursor-pointer">
                            {channel.name}
                          </Label>
                        </div>
                        <Switch
                          id={channel.id}
                          checked={channelSelections[channel.id] ?? false}
                          onCheckedChange={(checked) => handleToggle(channel.id, checked)}
                          data-testid={`switch-channel-${channel.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherChannels.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Other Channels</h4>
                  <div className="space-y-2">
                    {otherChannels.map(channel => (
                      <div 
                        key={channel.id} 
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100"
                        data-testid={`channel-row-${channel.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <Label htmlFor={channel.id} className="text-gray-600 cursor-pointer">
                            {channel.name}
                          </Label>
                        </div>
                        <Switch
                          id={channel.id}
                          checked={channelSelections[channel.id] ?? false}
                          onCheckedChange={(checked) => handleToggle(channel.id, checked)}
                          data-testid={`switch-channel-${channel.id}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {channels.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No channels found. Make sure the bot is invited to channels.
                </p>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                data-testid="button-cancel-slack-config"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
                data-testid="button-save-slack-config"
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
