import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { Gift, Star, Trophy, History, RefreshCw, ExternalLink, Users, Search, Building, Mail, User } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";

interface PerkvilleStatus {
  connected: boolean;
  configured: boolean;
}

interface PerkvilleBusiness {
  id: number;
  name: string;
  role: string;
}

interface PerkvilleBalances {
  totalPoints: number;
  customerCount: number;
  balances: Array<{ connectionId: number; balance: number; lastModified: string }>;
}

interface PerkvilleCustomer {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  joinDate: string;
  points: number;
  membershipType?: string;
  membershipStatus?: string;
}

interface PerkvilleReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  available: boolean;
}

export default function Rewards() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<number | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchedCustomer, setSearchedCustomer] = useState<PerkvilleCustomer | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const mainContentClass = useMainContentClass();

  const { data: status, isLoading: statusLoading } = useQuery<PerkvilleStatus>({
    queryKey: ["perkville-status"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/status", { credentials: "include" });
      if (!res.ok) return { connected: false, configured: false };
      return res.json();
    },
  });

  const { data: businesses, isLoading: businessesLoading } = useQuery<PerkvilleBusiness[]>({
    queryKey: ["perkville-businesses"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/businesses", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: status?.connected,
  });

  const effectiveBusinessId = selectedBusinessId || businesses?.[0]?.id || null;

  const { data: balances, isLoading: balancesLoading } = useQuery<PerkvilleBalances>({
    queryKey: ["perkville-balances", effectiveBusinessId],
    queryFn: async () => {
      const res = await fetch(`/api/perkville/balances?businessId=${effectiveBusinessId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch balances");
      return res.json();
    },
    enabled: status?.connected && !!effectiveBusinessId,
  });

  const { data: customers, isLoading: customersLoading } = useQuery<PerkvilleCustomer[]>({
    queryKey: ["perkville-customers", effectiveBusinessId],
    queryFn: async () => {
      const res = await fetch(`/api/perkville/customers?businessId=${effectiveBusinessId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
    enabled: status?.connected && !!effectiveBusinessId,
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

  const { data: personalPoints } = useQuery<{ total: number; available: number; pending: number }>({
    queryKey: ["perkville-personal-points"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/points", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch points");
      return res.json();
    },
    enabled: status?.connected,
  });

  const { data: activity } = useQuery<Array<{ id: string; type: string; description: string; points: number; date: string }>>({
    queryKey: ["perkville-activity"],
    queryFn: async () => {
      const res = await fetch("/api/perkville/activity", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: status?.connected,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSearchedCustomer(null);
    
    try {
      const res = await fetch(`/api/perkville/search?email=${encodeURIComponent(searchEmail.trim())}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (data) {
        setSearchedCustomer(data);
      } else {
        setSearchError("No customer found with that email.");
      }
    } catch (error) {
      setSearchError("Failed to search. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const isLoading = statusLoading || businessesLoading;

  const topCustomers = customers
    ?.filter(c => c.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 10) || [];

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

      <main className={`flex-1 ml-0 ${mainContentClass} relative z-10 flex flex-col transition-all duration-300`}>
        <TopBar />
        <div className="flex-1 p-8">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Gift className="w-8 h-8 text-primary" />
              <h1 className="font-display font-bold text-3xl">Perkville</h1>
            </div>
            <p className="text-muted-foreground">Manage your rewards program and view customer points.</p>
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
                Connect your Perkville admin account to view business-wide rewards data and customer points.
              </p>
              <Link href="/connect" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors" data-testid="link-connect-perkville">
                <ExternalLink className="w-4 h-4" />
                Go to Connect Apps
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {businesses && businesses.length > 1 && (
                <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                  <Building className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Business:</span>
                  <select
                    value={effectiveBusinessId || ""}
                    onChange={(e) => setSelectedBusinessId(parseInt(e.target.value))}
                    className="px-3 py-2 rounded-lg border border-border bg-background"
                    data-testid="select-business"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-6 rounded-xl" data-testid="card-total-points">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-muted-foreground">Total Points (All Customers)</span>
                  </div>
                  {balancesLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-3xl font-bold">{balances?.totalPoints?.toLocaleString() ?? 0}</p>
                  )}
                </div>
                <div className="glass-panel p-6 rounded-xl" data-testid="card-customer-count">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-500" />
                    </div>
                    <span className="text-muted-foreground">Active Customers</span>
                  </div>
                  {balancesLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-500">{balances?.customerCount?.toLocaleString() ?? 0}</p>
                  )}
                </div>
                <div className="glass-panel p-6 rounded-xl" data-testid="card-rewards-count">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-muted-foreground">Available Rewards</span>
                  </div>
                  {rewardsLoading ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <p className="text-3xl font-bold text-green-500">{rewards?.length ?? 0}</p>
                  )}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Customer Lookup
                </h2>
                <form onSubmit={handleSearch} className="flex gap-3 mb-4">
                  <input
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="Enter customer email..."
                    className="flex-1 px-4 py-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    data-testid="input-search-email"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchEmail.trim()}
                    className="px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    data-testid="button-search-customer"
                  >
                    {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Search"}
                  </button>
                </form>
                
                {searchError && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                    {searchError}
                  </div>
                )}
                
                {searchedCustomer && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10" data-testid="searched-customer-result">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {searchedCustomer.firstName} {searchedCustomer.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {searchedCustomer.email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Status: {searchedCustomer.status} | Member since: {new Date(searchedCustomer.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{searchedCustomer.points}</p>
                        <p className="text-sm text-muted-foreground">points</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top Customers by Points
                  </h2>
                  {customersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : topCustomers.length > 0 ? (
                    <div className="space-y-2">
                      {topCustomers.map((customer, index) => (
                        <div 
                          key={customer.id} 
                          className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                          data-testid={`customer-item-${customer.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                            </div>
                          </div>
                          <p className="font-bold text-primary">{customer.points.toLocaleString()} pts</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No customers with points yet.</p>
                  )}
                </div>

                <div className="glass-panel p-6 rounded-xl">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    Available Rewards
                  </h2>
                  {rewardsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : rewards && rewards.length > 0 ? (
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
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No rewards configured yet.</p>
                  )}
                </div>
              </div>

              {(personalPoints || activity) && (
                <div className="glass-panel p-6 rounded-xl mt-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Your Account
                  </h2>
                  
                  {personalPoints && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-2xl font-bold">{personalPoints.total}</p>
                        <p className="text-xs text-muted-foreground">Total Points</p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-2xl font-bold text-green-500">{personalPoints.available}</p>
                        <p className="text-xs text-muted-foreground">Available</p>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-2xl font-bold text-yellow-500">{personalPoints.pending}</p>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  )}
                  
                  {activity && activity.length > 0 && (
                    <>
                      <h3 className="font-medium mb-3">Recent Activity</h3>
                      <div className="space-y-2">
                        {activity.slice(0, 5).map((item) => (
                          <div 
                            key={item.id} 
                            className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                            data-testid={`activity-item-${item.id}`}
                          >
                            <div>
                              <p className="font-medium text-sm">{item.description}</p>
                              <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
                            </div>
                            <p className={`font-bold text-sm ${item.points >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {item.points >= 0 ? '+' : ''}{item.points} pts
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
