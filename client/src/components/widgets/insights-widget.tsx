import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, TrendingUp, CheckSquare, Send, CalendarPlus, Plus } from "lucide-react";

interface IntroOffer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  offerName: string;
  purchaseDate: string;
  memberStatus: string;
  classesAttendedSincePurchase: number;
  daysSincePurchase: number;
}

interface NativeTask {
  id: number;
  projectId: number | null;
  title: string;
  priority: string;
  dueDate: string | null;
  isCompleted: boolean;
}

export function InsightsWidget() {
  const { data: introOffers = [] } = useQuery<IntroOffer[]>({
    queryKey: ["intro-offers-feed"],
    queryFn: async () => {
      const res = await fetch("/api/mindbody/intro-offers", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: nativeTasks = [] } = useQuery<NativeTask[]>({
    queryKey: ["native-tasks-upcoming"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/upcoming", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const upcomingTasks = nativeTasks.filter((t) => !t.isCompleted);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* At-Risk Students */}
      <Link href="/intro-offers?filter=needs_attention" className="block" data-testid="insight-at-risk">
        <div className="glass-panel p-5 rounded-xl border-l-4 border-l-amber-500 hover:bg-white/80 transition-colors cursor-pointer h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Needs Attention</h3>
              <p className="text-2xl font-bold text-amber-600">
                {introOffers.filter((o) => o.memberStatus === "at_risk" || o.memberStatus === "lapsed").length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {introOffers.filter((o) => o.memberStatus === "at_risk").length} at-risk,{" "}
            {introOffers.filter((o) => o.memberStatus === "lapsed").length} lapsed students
          </p>
        </div>
      </Link>

      {/* New Intro Offers */}
      <Link href="/intro-offers?filter=new" className="block" data-testid="insight-new-offers">
        <div className="glass-panel p-5 rounded-xl border-l-4 border-l-green-500 hover:bg-white/80 transition-colors cursor-pointer h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">New This Week</h3>
              <p className="text-2xl font-bold text-green-600">
                {introOffers.filter((o) => o.daysSincePurchase <= 7).length}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {introOffers.filter((o) => o.memberStatus === "engaged").length} engaged,{" "}
            {introOffers.filter((o) => o.memberStatus === "new").length} awaiting first class
          </p>
        </div>
      </Link>

      {/* Upcoming Tasks Card */}
      <Link href="/projects" className="block" data-testid="insight-upcoming-tasks">
        <div className="glass-panel p-5 rounded-xl border-l-4 border-l-blue-500 hover:bg-white/80 transition-colors cursor-pointer h-full">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Upcoming Tasks</h3>
              <p className="text-2xl font-bold text-blue-600">{upcomingTasks.length}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {upcomingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length > 0
              ? `${upcomingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length} overdue`
              : upcomingTasks.length > 0
                ? `Next: ${upcomingTasks[0]?.title?.substring(0, 20)}${(upcomingTasks[0]?.title?.length || 0) > 20 ? "..." : ""}`
                : "No tasks due"}
          </p>
        </div>
      </Link>

      {/* Quick Actions */}
      <div className="glass-panel p-5 rounded-xl h-full">
        <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link href="/email-builder" data-testid="quick-action-email">
            <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
              <Send className="w-3.5 h-3.5" />
              Compose Email
            </button>
          </Link>
          <Link href="/calendar" data-testid="quick-action-event">
            <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
              <CalendarPlus className="w-3.5 h-3.5" />
              New Event
            </button>
          </Link>
          <Link href="/projects" data-testid="quick-action-task">
            <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              View Projects
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
