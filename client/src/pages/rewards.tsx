import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Gift, Star, Trophy, History, RefreshCw, ExternalLink } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface PerkvilleStatus {
  connected: boolean;
  configured: boolean;
}

interface PerkvillePoints {
  total: number;
  available: number;
  pending: number;
}

interface PerkvilleReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  available: boolean;
}

interface PerkvilleActivity {
  id: string;
  type: string;
  description: string;
  points: number;
  date: string;
}

export default function Rewards() {
  const { data: status, isLoading: statusLoading } = useQuery<PerkvilleStatus>({
    queryKey: ["perkville-status"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/status", { credentials: "include" });
      if (!res.ok) return { connected: false, configured: false };
      return res.json();
    },
  });

  const { data: points, isLoading: pointsLoading } = useQuery<PerkvillePoints>({
    queryKey: ["perkville-points"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/points", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
    enabled: status?.connected,
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<PerkvilleReward[]>({
    queryKey: ["perkville-rewards"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/rewards", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch rewards");
      return res.json();
    },
    enabled: status?.connected,
  });

  const { data: activity, isLoading: activityLoading } = useQuery<PerkvilleActivity[]>({
    queryKey: ["perkville-activity"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/activity", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: status?.connected,
  });

  const isLoading = statusLoading || (status?.connected && (pointsLoading || rewardsLoading || activityLoading));

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

      <main className="flex-1 ml-0 md:ml-64 relative z-10 flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-8 h-8 text-primary" />
              <h1 className="font-display font-bold text-3xl">Rewards</h1>
            </div>
            <p className="text-muted-foreground">View your Perkville points, available rewards, and activity history.</p>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !status?.connected ? (
            <div className="glass-panel p-8 rounded-xl text-center">
              <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connect Perkville</h2>
              <p className="text-muted-foreground mb-6">
                Connect your Perkville account to view your loyalty points and available rewards.
              </p>
              <Link href="/connect" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors" data-testid="link-connect-perkville">
                <ExternalLink className="w-4 h-4" />
                Go to Connect Apps
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-6 rounded-xl" data-testid="card-total-points">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-muted-foreground">Total Points</span>
                  </div>
                  <p className="text-3xl font-bold">{points?.total ?? 0}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl" data-testid="card-available-points">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-muted-foreground">Available Points</span>
                  </div>
                  <p className="text-3xl font-bold text-green-500">{points?.available ?? 0}</p>
                </div>
                <div className="glass-panel p-6 rounded-xl" data-testid="card-pending-points">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-yellow-500" />
                    </div>
                    <span className="text-muted-foreground">Pending Points</span>
                  </div>
                  <p className="text-3xl font-bold text-yellow-500">{points?.pending ?? 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Available Rewards
                  </h2>
                  {rewards && rewards.length > 0 ? (
                    <div className="space-y-3">
                      {rewards.map((reward) => (
                        <div 
                          key={reward.id} 
                          className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                          data-testid={`reward-item-${reward.id}`}
                        >
                          <div>
                            <h3 className="font-medium">{reward.name}</h3>
                            <p className="text-sm text-muted-foreground">{reward.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{reward.pointsCost} pts</p>
                            {reward.available ? (
                              <span className="text-xs text-green-500">Available</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Locked</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No rewards available yet.</p>
                  )}
                </div>

                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Recent Activity
                  </h2>
                  {activity && activity.length > 0 ? (
                    <div className="space-y-3">
                      {activity.slice(0, 10).map((item) => (
                        <div 
                          key={item.id} 
                          className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                          data-testid={`activity-item-${item.id}`}
                        >
                          <div>
                            <h3 className="font-medium">{item.description}</h3>
                            <p className="text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                          </div>
                          <div className={`font-bold ${item.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.points >= 0 ? '+' : ''}{item.points} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No activity yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
