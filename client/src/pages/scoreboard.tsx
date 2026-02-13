import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, UserPlus, UserMinus, TrendingUp, TrendingDown, Gift, Percent, Calendar, DollarSign, RefreshCw, ArrowUp, ArrowDown, Minus } from "lucide-react";
import generatedBg from "@assets/generated_images/warm_orange_glassmorphism_background.png";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { format, differenceInDays, subDays, startOfYear } from "date-fns";

type DateRangeOption = 'last_week' | 'this_month' | 'last_month' | 'last_90_days' | 'last_quarter' | 'last_year' | 'this_year' | 'custom';

const dateRangeLabels: Record<DateRangeOption, string> = {
  last_week: 'Last Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_90_days: 'Last 90 Days',
  last_quarter: 'Last Quarter',
  last_year: 'Last Year',
  this_year: 'This Year',
  custom: 'Custom Range',
};

function getDateRange(option: DateRangeOption, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (option) {
    case 'last_week':
      return { startDate: subDays(today, 7), endDate: today };
    case 'this_month':
      return { startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: today };
    case 'last_month':
      return { startDate: subDays(today, 30), endDate: today };
    case 'last_90_days':
      return { startDate: subDays(today, 90), endDate: today };
    case 'last_quarter':
      return { startDate: subDays(today, 90), endDate: today };
    case 'last_year':
      return { startDate: subDays(today, 365), endDate: today };
    case 'this_year':
      return { startDate: startOfYear(today), endDate: today };
    case 'custom':
      return { startDate: customStart || subDays(today, 7), endDate: customEnd || today };
    default:
      return { startDate: subDays(today, 7), endDate: today };
  }
}

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
  const [dateRange, setDateRange] = useState<DateRangeOption>('last_week');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { startDate, endDate } = getDateRange(dateRange, customStartDate, customEndDate);
  const rangeDays = differenceInDays(endDate, startDate) + 1;

  const { data: statusData } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/mindbody-analytics/status"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody-analytics/status", { credentials: "include" });
      if (!res.ok) return { configured: false };
      return res.json();
    },
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
  
  // Filter offers purchased within the selected date range (for period-specific metrics)
  const filteredOffers = offers.filter(o => {
    const purchaseDate = new Date(o.purchaseDate);
    return purchaseDate >= startDate && purchaseDate <= endDate;
  });
  
  // Current status metrics across ALL offers (not date-filtered)
  const totalConvertedCount = offers.filter(o => o.hasConverted).length;
  const totalAtRiskCount = offers.filter(o => o.memberStatus === "at_risk").length;
  const totalLapsedCount = offers.filter(o => o.memberStatus === "lapsed").length;
  const totalEngagedCount = offers.filter(o => o.memberStatus === "engaged").length;
  const totalNewCount = offers.filter(o => o.memberStatus === "new").length;
  const totalActiveCount = totalEngagedCount + totalNewCount;
  
  // Period-specific metrics (date-filtered)
  const newInPeriod = filteredOffers.length;
  const lapsedInPeriod = filteredOffers.filter(o => o.memberStatus === "lapsed").length;
  
  // Conversion rate across all offers
  const conversionRate = offers.length > 0 
    ? Math.round((totalConvertedCount / offers.length) * 100) 
    : 0;

  // Net adds calculation based on selected period
  const netAdds = newInPeriod - lapsedInPeriod;
  
  const hasError = offersError;

  const handleRefresh = () => {
    refetchOffers();
  };

  const isLoading = offersLoading;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${generatedBg})` }}
    >
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold">Business Scoreboard</h1>
                <p className="text-muted-foreground text-xs">Key metrics for business health</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={dateRange} onValueChange={(value: DateRangeOption) => {
                setDateRange(value);
                if (value === 'custom') {
                  setIsCalendarOpen(true);
                }
              }}>
                <SelectTrigger className="w-[140px] h-7 text-xs" data-testid="select-date-range">
                  <Calendar className="w-3 h-3 mr-1" />
                  <SelectValue placeholder="Select period">
                    {dateRange === 'custom' && customStartDate && customEndDate
                      ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d')}`
                      : dateRangeLabels[dateRange]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_week" data-testid="option-last-week">Last Week</SelectItem>
                  <SelectItem value="this_month" data-testid="option-this-month">This Month</SelectItem>
                  <SelectItem value="last_month" data-testid="option-last-month">Last Month</SelectItem>
                  <SelectItem value="last_90_days" data-testid="option-last-90-days">Last 90 Days</SelectItem>
                  <SelectItem value="last_quarter" data-testid="option-last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="last_year" data-testid="option-last-year">Last Year</SelectItem>
                  <SelectItem value="this_year" data-testid="option-this-year">This Year</SelectItem>
                  <SelectItem value="custom" data-testid="option-custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
              
              {dateRange === 'custom' && (
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2 gap-1"
                      data-testid="button-open-date-picker"
                    >
                      <Calendar className="w-3 h-3" />
                      {customStartDate && customEndDate 
                        ? `${format(customStartDate, 'MMM d')} - ${format(customEndDate, 'MMM d, yyyy')}`
                        : 'Pick dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-3 space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Start Date</p>
                        <CalendarPicker
                          mode="single"
                          selected={customStartDate}
                          onSelect={(date) => setCustomStartDate(date)}
                          disabled={(date) => date > new Date() || (customEndDate ? date > customEndDate : false)}
                          initialFocus
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">End Date</p>
                        <CalendarPicker
                          mode="single"
                          selected={customEndDate}
                          onSelect={(date) => setCustomEndDate(date)}
                          disabled={(date) => date > new Date() || (customStartDate ? date < customStartDate : false)}
                        />
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => setIsCalendarOpen(false)}
                        disabled={!customStartDate || !customEndDate}
                        data-testid="button-apply-dates"
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              
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
                    value={totalActiveCount}
                    subtitle="Current status"
                    icon={<Users className="w-5 h-5 text-blue-600" />}
                    color="text-blue-600"
                    bgColor="bg-blue-100"
                    testId="metric-active-members"
                  />
                  <MetricCard
                    title={`New ${dateRangeLabels[dateRange]}`}
                    value={newInPeriod}
                    subtitle={`Last ${rangeDays} days`}
                    icon={<UserPlus className="w-5 h-5 text-green-600" />}
                    color="text-green-600"
                    bgColor="bg-green-100"
                    trend={newInPeriod > 0 ? "up" : "neutral"}
                    trendValue={`+${newInPeriod}`}
                    testId="metric-new-this-week"
                  />
                  <MetricCard
                    title="At Risk"
                    value={totalAtRiskCount}
                    subtitle="Need follow-up"
                    icon={<TrendingDown className="w-5 h-5 text-amber-600" />}
                    color="text-amber-600"
                    bgColor="bg-amber-100"
                    testId="metric-at-risk"
                  />
                  <MetricCard
                    title="Lapsed"
                    value={totalLapsedCount}
                    subtitle="Lost engagement"
                    icon={<UserMinus className="w-5 h-5 text-red-600" />}
                    color="text-red-600"
                    bgColor="bg-red-100"
                    testId="metric-lapsed"
                  />
                  <MetricCard
                    title="Converted"
                    value={totalConvertedCount}
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
                    subtitle={`Growth ${dateRangeLabels[dateRange].toLowerCase()}`}
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
                    value={offers.length}
                    subtitle="All time"
                    icon={<Gift className="w-5 h-5 text-purple-600" />}
                    color="text-purple-600"
                    bgColor="bg-purple-100"
                    testId="metric-total-intro-offers"
                  />
                  <MetricCard
                    title="Intro Offers Sold"
                    value={newInPeriod}
                    subtitle={dateRangeLabels[dateRange]}
                    icon={<Calendar className="w-5 h-5 text-indigo-600" />}
                    color="text-indigo-600"
                    bgColor="bg-indigo-100"
                    testId="metric-intro-offers-sold"
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={`${conversionRate}%`}
                    subtitle="Intro → Member"
                    icon={<Percent className="w-5 h-5 text-teal-600" />}
                    color="text-teal-600"
                    bgColor="bg-teal-100"
                    trend={conversionRate >= 50 ? "up" : conversionRate >= 25 ? "neutral" : "down"}
                    testId="metric-conversion-rate"
                  />
                  <MetricCard
                    title="Awaiting First Class"
                    value={totalNewCount}
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
                <h2 className="font-display font-semibold text-base mb-2">{dateRangeLabels[dateRange]}'s Summary</h2>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  <p>
                    {newInPeriod > 0 ? (
                      <>
                        <strong className="text-green-600">{newInPeriod} new intro offers</strong> sold {dateRangeLabels[dateRange].toLowerCase()}.{' '}
                      </>
                    ) : (
                      <>No new intro offers {dateRangeLabels[dateRange].toLowerCase()}. </>
                    )}
                    {totalConvertedCount > 0 && (
                      <>
                        <strong className="text-emerald-600">{totalConvertedCount} students</strong> have converted to full memberships ({conversionRate}% conversion rate).{' '}
                      </>
                    )}
                    {totalAtRiskCount > 0 && (
                      <>
                        <strong className="text-amber-600">{totalAtRiskCount} students</strong> are at risk and need follow-up.{' '}
                      </>
                    )}
                    {totalLapsedCount > 0 && (
                      <>
                        <strong className="text-red-600">{totalLapsedCount} students</strong> have lapsed.{' '}
                      </>
                    )}
                    {netAdds >= 0 ? (
                      <>Net growth: <strong className="text-primary">+{netAdds}</strong> {dateRangeLabels[dateRange].toLowerCase()}.</>
                    ) : (
                      <>Net change: <strong className="text-red-600">{netAdds}</strong> {dateRangeLabels[dateRange].toLowerCase()}.</>
                    )}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
    </div>
  );
}
