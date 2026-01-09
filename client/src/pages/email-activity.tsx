import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Send, 
  CheckCircle, 
  Mail, 
  MousePointer, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  ArrowUpRight,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";

interface AggregatedStats {
  range: string;
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  clicks: number;
  uniqueClicks: number;
  opens: number;
  uniqueOpens: number;
  spamReports: number;
  blocked: number;
  invalid: number;
  unsubscribed: number;
}

interface EmailEvent {
  email: string;
  date: string;
  messageId: string;
  event: string;
  subject?: string;
  tag?: string;
  from?: string;
}

interface DailyReport {
  date: string;
  requests: number;
  delivered: number;
  hardBounces: number;
  softBounces: number;
  clicks: number;
  uniqueClicks: number;
  opens: number;
  uniqueOpens: number;
  spamReports: number;
  blocked: number;
  invalid: number;
}

interface BrevoStatus {
  connected: boolean;
  message?: string;
  email?: string;
  companyName?: string;
  plan?: string;
}

interface Campaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  type: string;
  sentAt: string | null;
  scheduledAt: string | null;
  recipients: number;
  stats: {
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    unsubscribed: number;
    openRate: string;
    clickRate: string;
  };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = "text-gray-600",
  bgColor = "bg-gray-100"
}: { 
  title: string; 
  value: number; 
  icon: any; 
  color?: string;
  bgColor?: string;
}) {
  return (
    <Card className="backdrop-blur-sm bg-white/80 border-white/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getEventBadgeStyle(event: string) {
  switch (event.toLowerCase()) {
    case 'delivered':
      return 'bg-green-100 text-green-700';
    case 'opened':
    case 'unique_opened':
      return 'bg-blue-100 text-blue-700';
    case 'clicked':
    case 'unique_clicked':
      return 'bg-purple-100 text-purple-700';
    case 'soft_bounce':
      return 'bg-yellow-100 text-yellow-700';
    case 'hard_bounce':
    case 'blocked':
    case 'invalid':
      return 'bg-red-100 text-red-700';
    case 'spam':
    case 'unsubscribed':
      return 'bg-orange-100 text-orange-700';
    case 'request':
    case 'requests':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function EmailActivityPage() {
  const [days, setDays] = useState("30");
  const [eventFilter, setEventFilter] = useState("all");

  const { data: status, isLoading: statusLoading } = useQuery<BrevoStatus>({
    queryKey: ['/api/brevo/status'],
  });

  const isConnected = status?.connected === true;

  const { data: aggregatedStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AggregatedStats>({
    queryKey: ['/api/brevo/statistics/aggregated', days],
    queryFn: async () => {
      const res = await fetch(`/api/brevo/statistics/aggregated?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: isConnected,
  });

  const { data: dailyReports, isLoading: reportsLoading } = useQuery<{ reports: DailyReport[] }>({
    queryKey: ['/api/brevo/statistics/reports', days],
    queryFn: async () => {
      const res = await fetch(`/api/brevo/statistics/reports?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch reports');
      return res.json();
    },
    enabled: isConnected,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<{ events: EmailEvent[] }>({
    queryKey: ['/api/brevo/statistics/events', eventFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' });
      if (eventFilter !== 'all') params.append('event', eventFilter);
      const res = await fetch(`/api/brevo/statistics/events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    enabled: isConnected,
  });

  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } = useQuery<{ campaigns: Campaign[], count: number }>({
    queryKey: ['/api/brevo/campaigns', days],
    queryFn: async () => {
      const res = await fetch(`/api/brevo/campaigns?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    },
    enabled: isConnected,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchEvents();
    refetchCampaigns();
  };

  if (statusLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="backdrop-blur-sm bg-white/80 border-white/20">
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-12 w-12 mx-auto text-gray-400 mb-4 animate-spin" />
            <p className="text-gray-500">Checking Brevo connection...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="backdrop-blur-sm bg-white/80 border-white/20">
          <CardContent className="p-8 text-center">
            <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Brevo Not Connected</h2>
            <p className="text-gray-500">
              {status?.message || 'The Brevo API key is not configured. Please add BREVO_API_KEY to your environment variables.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brevo</h1>
          <p className="text-gray-500">Monitor your transactional email performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32" data-testid="select-days">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : aggregatedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Sent"
            value={aggregatedStats.requests || 0}
            icon={Send}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Delivered"
            value={aggregatedStats.delivered || 0}
            icon={CheckCircle}
            color="text-green-600"
            bgColor="bg-green-100"
          />
          <StatCard
            title="Opened"
            value={aggregatedStats.uniqueOpens || 0}
            icon={Mail}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
          <StatCard
            title="Clicked"
            value={aggregatedStats.uniqueClicks || 0}
            icon={MousePointer}
            color="text-orange-600"
            bgColor="bg-orange-100"
          />
        </div>
      )}

      {aggregatedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Hard Bounces"
            value={aggregatedStats.hardBounces || 0}
            icon={XCircle}
            color="text-red-600"
            bgColor="bg-red-100"
          />
          <StatCard
            title="Soft Bounces"
            value={aggregatedStats.softBounces || 0}
            icon={AlertTriangle}
            color="text-yellow-600"
            bgColor="bg-yellow-100"
          />
          <StatCard
            title="Blocked"
            value={aggregatedStats.blocked || 0}
            icon={XCircle}
            color="text-gray-600"
            bgColor="bg-gray-100"
          />
          <StatCard
            title="Unsubscribed"
            value={aggregatedStats.unsubscribed || 0}
            icon={ArrowUpRight}
            color="text-gray-600"
            bgColor="bg-gray-100"
          />
        </div>
      )}

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Marketing Campaigns</TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">Transactional Events</TabsTrigger>
          <TabsTrigger value="daily" data-testid="tab-daily">Daily Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardHeader>
              <CardTitle className="text-lg">Marketing Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : campaignsData?.campaigns?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Campaign</th>
                        <th className="text-left py-2 px-3 font-medium">Status</th>
                        <th className="text-right py-2 px-3 font-medium">Recipients</th>
                        <th className="text-right py-2 px-3 font-medium">Opens</th>
                        <th className="text-right py-2 px-3 font-medium">Clicks</th>
                        <th className="text-right py-2 px-3 font-medium">Unsubscribed</th>
                        <th className="text-left py-2 px-3 font-medium">Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignsData.campaigns.map((campaign, idx) => (
                        <tr key={campaign.id} className="border-b hover:bg-gray-50" data-testid={`campaign-row-${idx}`}>
                          <td className="py-3 px-3">
                            <div>
                              <p className="font-medium text-gray-900">{campaign.name}</p>
                              <p className="text-xs text-gray-500 truncate max-w-xs">{campaign.subject}</p>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge className={campaign.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-3 font-medium">{campaign.recipients.toLocaleString()}</td>
                          <td className="text-right py-3 px-3">
                            <span className="text-purple-600">{campaign.stats.opens.toLocaleString()}</span>
                            <span className="text-gray-400 text-xs ml-1">({campaign.stats.openRate}%)</span>
                          </td>
                          <td className="text-right py-3 px-3">
                            <span className="text-orange-600">{campaign.stats.clicks.toLocaleString()}</span>
                            <span className="text-gray-400 text-xs ml-1">({campaign.stats.clickRate}%)</span>
                          </td>
                          <td className="text-right py-3 px-3 text-red-600">{campaign.stats.unsubscribed}</td>
                          <td className="py-3 px-3 text-gray-500 text-xs">
                            {campaign.sentAt ? format(new Date(campaign.sentAt), 'MMM d, yyyy h:mm a') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No marketing campaigns found for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Recent Transactional Events</CardTitle>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-40" data-testid="select-event-filter">
                    <SelectValue placeholder="Filter by event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="hardBounce">Hard Bounce</SelectItem>
                    <SelectItem value="softBounce">Soft Bounce</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : eventsData?.events?.length ? (
                <div className="space-y-2">
                  {eventsData.events.map((event, idx) => (
                    <div
                      key={`${event.messageId}-${idx}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      data-testid={`event-row-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-white">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{event.email}</p>
                          {event.subject && (
                            <p className="text-xs text-gray-500 truncate max-w-md">{event.subject}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getEventBadgeStyle(event.event)}>
                          {event.event.replace('_', ' ')}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.date), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No email events found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <Card className="backdrop-blur-sm bg-white/80 border-white/20">
            <CardHeader>
              <CardTitle className="text-lg">Daily Email Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : dailyReports?.reports?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Date</th>
                        <th className="text-right py-2 px-3 font-medium">Sent</th>
                        <th className="text-right py-2 px-3 font-medium">Delivered</th>
                        <th className="text-right py-2 px-3 font-medium">Opened</th>
                        <th className="text-right py-2 px-3 font-medium">Clicked</th>
                        <th className="text-right py-2 px-3 font-medium">Bounced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReports.reports.map((report, idx) => (
                        <tr key={report.date} className="border-b hover:bg-gray-50" data-testid={`daily-row-${idx}`}>
                          <td className="py-2 px-3">{format(new Date(report.date), 'MMM d, yyyy')}</td>
                          <td className="text-right py-2 px-3">{report.requests}</td>
                          <td className="text-right py-2 px-3 text-green-600">{report.delivered}</td>
                          <td className="text-right py-2 px-3 text-purple-600">{report.uniqueOpens}</td>
                          <td className="text-right py-2 px-3 text-orange-600">{report.uniqueClicks}</td>
                          <td className="text-right py-2 px-3 text-red-600">
                            {(report.hardBounces || 0) + (report.softBounces || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No daily reports available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {status?.companyName && (
        <div className="text-center text-xs text-gray-400">
          Connected to Brevo as {status.companyName} ({status.email}) - {status.plan} plan
        </div>
      )}
    </div>
  );
}
