import { useQuery } from "@tanstack/react-query";
import { UnifiedSidebar } from "@/components/unified-sidebar";
import { TopBar } from "@/components/top-bar";
import { BarChart3, Users, UserPlus, UserMinus, TrendingUp, TrendingDown, Gift, Percent, Calendar, DollarSign, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { Button } from "@/components/ui/button";
import { useMainContentClass } from "@/hooks/useSidebarCollapse";

interface IntroOffer {
  id: string;
  firstName: string;
  lastName: string;
  offerName: string;
  purchaseDate: string;
  classesAttendedSincePurchase: number;
  daysSincePurchase: number;
  hasConverted: boolean;
  memberStatus: string;
}

interface IntroOfferSummary {
  totalOffers: number;
  activeOffers: number;
  convertedOffers: number;
  expiredOffers: number;
  conversionRate: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  testId: string;
}

function MetricCard({ title, value, subtitle, icon, color, bgColor, trend, trendValue, testId }: MetricCardProps) {
  return (
    <div className="glass-panel p-3 rounded-xl h-full" data-testid={testId}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${color}`} data-testid={`${testId}-value`}>{value}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                trend === "up" ? "bg-green-100 text-green-700" :
                trend === "down" ? "bg-red-100 text-red-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {trend === "up" ? <ArrowUp className="w-2.5 h-2.5" /> :
                 trend === "down" ? <ArrowDown className="w-2.5 h-2.5" /> :
                 <Minus className="w-2.5 h-2.5" />}
                {trendValue}
              </div>
            )}
          </div>
          <h3 className="font-medium text-sm text-foreground truncate">{title}</h3>
        </div>
      </div>
    </div>
  );
}

export default function Scoreboard() {
  const mainContentClass = useMainContentClass();

  const { data: statusData } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/mindbody-analytics/status"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/status", { credentials: "include" });
      if (!res.ok) return { configured: false };
      return res.json();
    },
  });

  const { data: summary, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useQuery<IntroOfferSummary>({
    queryKey: ["/api/mindbody-analytics/intro-offers/summary"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/intro-offers/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: statusData?.configured,
  });

  const { data: offersData, isLoading: offersLoading, isError: offersError, refetch: refetchOffers } = useQuery<{ data: IntroOffer[] }>({
    queryKey: ["/api/mindbody-analytics/intro-offers"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/intro-offers?limit=500", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch intro offers");
      return res.json();
    },
    enabled: statusData?.configured,
  });

  const offers = offersData?.data || [];
  
  // Calculate metrics from available data
  const newThisWeek = offers.filter(o => o.daysSincePurchase <= 7).length;
  const convertedCount = offers.filter(o => o.hasConverted).length;
  const atRiskCount = offers.filter(o => o.memberStatus === "at_risk").length;
  const lapsedCount = offers.filter(o => o.memberStatus === "lapsed").length;
  const lapsedThisWeek = offers.filter(o => o.memberStatus === "lapsed" && o.daysSincePurchase <= 7).length;
  const engagedCount = offers.filter(o => o.memberStatus === "engaged").length;
  const newCount = offers.filter(o => o.memberStatus === "new").length;
  
  // Calculate conversion rate
  const conversionRate = offers.length > 0 
    ? Math.round((convertedCount / offers.length) * 100) 
    : 0;

  // Net adds calculation: new this week minus lapsed this week (weekly time-bounded)
  const netAdds = newThisWeek - lapsedThisWeek;
  
  const hasError = summaryError || offersError;

  const handleRefresh = () => {
    refetchSummary();
    refetchOffers();
  };

  const isLoading = summaryLoading || offersLoading;

  return (
    <div
      className="min-h-screen flex bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${generatedBg})` }}
    >
      <UnifiedSidebar />

      <main className={mainContentClass}>
        <TopBar />

        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold">Weekly Scoreboard</h1>
                <p className="text-muted-foreground text-xs">Key metrics for business health</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-1 h-7 text-xs px-2"
              data-testid="button-refresh-scoreboard"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {!statusData?.configured ? (
            <div className="glass-panel p-8 rounded-xl text-center" data-testid="scoreboard-connect-prompt">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Connect Mindbody Analytics</h2>
              <p className="text-muted-foreground mb-4">
                Connect your Mindbody account to see real-time business metrics.
              </p>
              <Button asChild data-testid="button-connect-mindbody">
                <a href="/connect">Connect Services</a>
              </Button>
            </div>
          ) : hasError ? (
            <div className="glass-panel p-8 rounded-xl text-center" data-testid="scoreboard-error">
              <BarChart3 className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2 text-red-600">Unable to Load Metrics</h2>
              <p className="text-muted-foreground mb-4">
                There was a problem loading your business data. Please try again.
              </p>
              <Button onClick={handleRefresh} data-testid="button-retry-scoreboard">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Primary Metrics - Member Movement */}
              <div className="mb-4">
                <h2 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Member Movement
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  <MetricCard
                    title="Active Members"
                    value={summary?.activeOffers || engagedCount + newCount}
                    subtitle="Currently engaged"
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    color="text-blue-600"
                    bgColor="bg-blue-100"
                    testId="metric-active-members"
                  />
                  <MetricCard
                    title="New This Week"
                    value={newThisWeek}
                    subtitle="Last 7 days"
                    icon={<UserPlus className="w-5 h-5 text-green-600" />}
                    color="text-green-600"
                    bgColor="bg-green-100"
                    trend={newThisWeek > 0 ? "up" : "neutral"}
                    trendValue={`+${newThisWeek}`}
                    testId="metric-new-this-week"
                  />
                  <MetricCard
                    title="At Risk"
                    value={atRiskCount}
                    subtitle="Need follow-up"
                    icon={<TrendingDown className="w-5 h-5 text-amber-600" />}
                    color="text-amber-600"
                    bgColor="bg-amber-100"
                    testId="metric-at-risk"
                  />
                  <MetricCard
                    title="Lapsed"
                    value={lapsedCount}
                    subtitle="Lost engagement"
                    icon={<UserMinus className="w-5 h-5 text-red-600" />}
                    color="text-red-600"
                    bgColor="bg-red-100"
                    testId="metric-lapsed"
                  />
                  <MetricCard
                    title="Converted"
                    value={convertedCount}
                    subtitle="Became members"
                    icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                    color="text-emerald-600"
                    bgColor="bg-emerald-100"
                    trend="up"
                    trendValue={`${conversionRate}%`}
                    testId="metric-converted"
                  />
                  <MetricCard
                    title="Net Adds"
                    value={netAdds >= 0 ? `+${netAdds}` : netAdds}
                    subtitle="Growth this week"
                    icon={netAdds >= 0 ? <TrendingUp className="w-5 h-5 text-primary" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                    color={netAdds >= 0 ? "text-primary" : "text-red-600"}
                    bgColor={netAdds >= 0 ? "bg-orange-100" : "bg-red-100"}
                    trend={netAdds > 0 ? "up" : netAdds < 0 ? "down" : "neutral"}
                    testId="metric-net-adds"
                  />
                </div>
              </div>

              {/* Intro Offer Metrics */}
              <div className="mb-4">
                <h2 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-600" />
                  Intro Offer Pipeline
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <MetricCard
                    title="Total Intro Offers"
                    value={summary?.totalOffers || offers.length}
                    subtitle="All time tracked"
                    icon={<Gift className="w-5 h-5 text-purple-600" />}
                    color="text-purple-600"
                    bgColor="bg-purple-100"
                    testId="metric-total-intro-offers"
                  />
                  <MetricCard
                    title="Intro Offers Sold"
                    value={newThisWeek}
                    subtitle="This week"
                    icon={<Calendar className="w-5 h-5 text-indigo-600" />}
                    color="text-indigo-600"
                    bgColor="bg-indigo-100"
                    testId="metric-intro-offers-sold"
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={`${summary?.conversionRate || conversionRate}%`}
                    subtitle="Intro → Member"
                    icon={<Percent className="w-5 h-5 text-teal-600" />}
                    color="text-teal-600"
                    bgColor="bg-teal-100"
                    trend={conversionRate >= 50 ? "up" : conversionRate >= 25 ? "neutral" : "down"}
                    testId="metric-conversion-rate"
                  />
                  <MetricCard
                    title="Awaiting First Class"
                    value={newCount}
                    subtitle="Not yet engaged"
                    icon={<Users className="w-5 h-5 text-pink-600" />}
                    color="text-pink-600"
                    bgColor="bg-pink-100"
                    testId="metric-awaiting-first-class"
                  />
                </div>
              </div>

              {/* Financial Metrics (Placeholder) */}
              <div className="mb-4">
                <h2 className="font-display font-semibold text-sm mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Financial Health
                  <span className="text-[10px] font-normal text-muted-foreground">(Coming Soon)</span>
                </h2>
                <div className="grid grid-cols-3 gap-2">
                  <div className="glass-panel p-3 rounded-xl border border-dashed border-gray-300 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-400">—</p>
                        <h3 className="font-medium text-xs text-muted-foreground">Monthly Revenue</h3>
                      </div>
                    </div>
                  </div>
                  <div className="glass-panel p-3 rounded-xl border border-dashed border-gray-300 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-400">—</p>
                        <h3 className="font-medium text-xs text-muted-foreground">Autopay Total</h3>
                      </div>
                    </div>
                  </div>
                  <div className="glass-panel p-3 rounded-xl border border-dashed border-gray-300 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-400">—</p>
                        <h3 className="font-medium text-xs text-muted-foreground">Avg Attendance</h3>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Summary */}
              <div className="glass-panel p-4 rounded-xl">
                <h2 className="font-display font-semibold text-base mb-2">This Week's Story</h2>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <p>
                    {newThisWeek > 0 ? (
                      <>
                        <strong className="text-green-600">{newThisWeek} new intro offers</strong> sold this week.{' '}
                      </>
                    ) : (
                      <>No new intro offers this week. </>
                    )}
                    {convertedCount > 0 && (
                      <>
                        <strong className="text-emerald-600">{convertedCount} students</strong> have converted to full memberships ({conversionRate}% conversion rate).{' '}
                      </>
                    )}
                    {atRiskCount > 0 && (
                      <>
                        <strong className="text-amber-600">{atRiskCount} students</strong> are at risk and need follow-up.{' '}
                      </>
                    )}
                    {lapsedCount > 0 && (
                      <>
                        <strong className="text-red-600">{lapsedCount} students</strong> have lapsed.{' '}
                      </>
                    )}
                    {netAdds >= 0 ? (
                      <>Net growth: <strong className="text-primary">+{netAdds}</strong> this week.</>
                    ) : (
                      <>Net change: <strong className="text-red-600">{netAdds}</strong> this week.</>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
