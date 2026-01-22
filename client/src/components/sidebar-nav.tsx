import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getNavigationTabs, NavTab, NavItem } from "@/lib/navigation-config";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import yhcLogo from "@assets/logo_bug_1024_1767889616107.jpg";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarNavProps {
  onClose?: () => void;
}

export function SidebarNav({ onClose }: SidebarNavProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const tabs = getNavigationTabs(isAdmin);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tabs.forEach(tab => {
      const isActive = tab.href === location || tab.items.some(item => 
        location === item.href || location.startsWith(item.href + "/")
      );
      initial[tab.id] = isActive;
    });
    return initial;
  });

  useEffect(() => {
    tabs.forEach(tab => {
      const isActive = tab.href === location || tab.items.some(item => 
        location === item.href || location.startsWith(item.href + "/")
      );
      if (isActive && !openSections[tab.id]) {
        setOpenSections(prev => ({ ...prev, [tab.id]: true }));
      }
    });
  }, [location]);

  const toggleSection = (tabId: string) => {
    setOpenSections(prev => ({ ...prev, [tabId]: !prev[tabId] }));
  };

  const isItemActive = (item: NavItem) => {
    return location === item.href || location.startsWith(item.href + "/");
  };

  const isTabActive = (tab: NavTab) => {
    if (tab.href && location === tab.href) return true;
    return tab.items.some(item => location === item.href || location.startsWith(item.href + "/"));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <img src={yhcLogo} alt="The YHC Way" className="h-10 w-10 rounded-lg" />
          <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">
            The YHC Way
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {tabs.map((tab) => (
          <Collapsible
            key={tab.id}
            open={openSections[tab.id]}
            onOpenChange={() => toggleSection(tab.id)}
          >
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  "hover:bg-orange-50 dark:hover:bg-orange-900/20",
                  isTabActive(tab)
                    ? "bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300"
                    : "text-gray-700 dark:text-gray-300"
                )}
                data-testid={`sidebar-tab-${tab.id}`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </div>
                {openSections[tab.id] ? (
                  <ChevronDown className="h-4 w-4 opacity-60" />
                ) : (
                  <ChevronRight className="h-4 w-4 opacity-60" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
              {tab.href && (
                <SidebarNavItem
                  item={{ id: `${tab.id}-home`, icon: tab.icon, label: `${tab.label} Home`, href: tab.href }}
                  isActive={location === tab.href}
                  onClose={onClose}
                />
              )}
              {tab.items.map((item) => (
                <SidebarNavItem
                  key={item.id}
                  item={item}
                  isActive={isItemActive(item)}
                  onClose={onClose}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </nav>
    </div>
  );
}

function SidebarNavItem({
  item,
  isActive,
  onClose,
}: {
  item: NavItem;
  isActive: boolean;
  onClose?: () => void;
}) {
  if (item.isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
          "hover:bg-gray-100 dark:hover:bg-gray-800",
          "text-gray-600 dark:text-gray-400"
        )}
        data-testid={`sidebar-item-${item.id}`}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        isActive
          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium"
          : "text-gray-600 dark:text-gray-400"
      )}
      data-testid={`sidebar-item-${item.id}`}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}
