import { Link } from "wouter";
import { Send, CalendarPlus, Plus, Users, FolderKanban, Settings } from "lucide-react";

export function QuickActionsWidget() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Link href="/email-builder" data-testid="quick-action-email">
        <button className="flex flex-col items-center gap-2 p-4 text-sm font-medium bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors w-full">
          <Send className="w-5 h-5" />
          <span>Compose Email</span>
        </button>
      </Link>
      
      <Link href="/calendar" data-testid="quick-action-event">
        <button className="flex flex-col items-center gap-2 p-4 text-sm font-medium bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors w-full">
          <CalendarPlus className="w-5 h-5" />
          <span>Calendar</span>
        </button>
      </Link>
      
      <Link href="/projects" data-testid="quick-action-project">
        <button className="flex flex-col items-center gap-2 p-4 text-sm font-medium bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 transition-colors w-full">
          <FolderKanban className="w-5 h-5" />
          <span>Projects</span>
        </button>
      </Link>
      
      <Link href="/intro-offers" data-testid="quick-action-students">
        <button className="flex flex-col items-center gap-2 p-4 text-sm font-medium bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors w-full">
          <Users className="w-5 h-5" />
          <span>Intro Offer Funnel</span>
        </button>
      </Link>
      
      <Link href="/connect" data-testid="quick-action-connect">
        <button className="flex flex-col items-center gap-2 p-4 text-sm font-medium bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors w-full">
          <Plus className="w-5 h-5" />
          <span>Connect Apps</span>
        </button>
      </Link>
      
      <Link href="/settings" data-testid="quick-action-settings">
        <button className="flex flex-col items-center gap-2 p-4 text-sm font-medium bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors w-full">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </Link>
    </div>
  );
}
