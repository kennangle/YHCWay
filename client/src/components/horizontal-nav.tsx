import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getNavigationTabs, NavTab, NavItem } from "@/lib/navigation-config";
import { ChevronDown, Clock, HelpCircle, ExternalLink } from "lucide-react";
import yhcLogo from "@assets/logo_bug_1024_1767889616107.jpg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface HorizontalNavProps {
  onStartTour?: () => void;
}

export function HorizontalNav({ onStartTour }: HorizontalNavProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;
  const tabs = getNavigationTabs(isAdmin);

  const isTabActive = (tab: NavTab) => {
    if (tab.href && location === tab.href) return true;
    return tab.items.some(item => location === item.href || location.startsWith(item.href + "/"));
  };

  const isItemActive = (item: NavItem) => {
    return location === item.href || location.startsWith(item.href + "/");
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      const parts = user.firstName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src={yhcLogo} alt="The YHC Way" className="h-10 w-10 rounded-lg" />
            <span className="font-semibold text-lg hidden sm:inline text-gray-800">The YHC Way</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => (
              <NavTabDropdown
                key={tab.id}
                tab={tab}
                isActive={isTabActive(tab)}
                isItemActive={isItemActive}
              />
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/time-tracking">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-600 hover:text-gray-900"
              data-testid="button-time-tracking"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Time</span>
            </Button>
          </Link>

          {onStartTour && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartTour}
              className="gap-2 text-gray-600 hover:text-gray-900"
              data-testid="button-guided-tour"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Tour</span>
            </Button>
          )}

          <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

          <Link href="/settings">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 transition-colors cursor-pointer"
              data-testid="user-profile-button"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium text-sm">
                {getInitials()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden lg:inline">
                {user?.firstName || user?.email?.split("@")[0] || "User"}
              </span>
            </div>
          </Link>
        </div>
      </div>

      <MobileNav tabs={tabs} isItemActive={isItemActive} isTabActive={isTabActive} />
    </header>
  );
}

function NavTabDropdown({
  tab,
  isActive,
  isItemActive,
}: {
  tab: NavTab;
  isActive: boolean;
  isItemActive: (item: NavItem) => boolean;
}) {
  const [, navigate] = useLocation();

  const handleTabClick = () => {
    if (tab.href) {
      navigate(tab.href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
            "hover:bg-gradient-to-r hover:from-orange-100 hover:to-amber-100",
            "focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-1",
            isActive
              ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700"
          )}
          data-testid={`nav-tab-${tab.id}`}
        >
          <tab.icon className="h-4 w-4" />
          <span>{tab.label}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {tab.href && (
          <DropdownMenuItem
            onClick={handleTabClick}
            className="gap-2 cursor-pointer"
            data-testid={`nav-item-${tab.id}-home`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label} Home</span>
          </DropdownMenuItem>
        )}
        {tab.items.map((item) => (
          <NavDropdownItem key={item.id} item={item} isActive={isItemActive(item)} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavDropdownItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  if (item.isExternal) {
    return (
      <DropdownMenuItem asChild>
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 cursor-pointer w-full",
            isActive && "bg-orange-50"
          )}
          data-testid={`nav-item-${item.id}`}
        >
          <item.icon className="h-4 w-4" />
          <span>{item.label}</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </a>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem asChild>
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2 cursor-pointer w-full",
          isActive && "bg-orange-50"
        )}
        data-testid={`nav-item-${item.id}`}
      >
        <item.icon className="h-4 w-4" />
        <span>{item.label}</span>
      </Link>
    </DropdownMenuItem>
  );
}

function MobileNav({
  tabs,
  isItemActive,
  isTabActive,
}: {
  tabs: NavTab[];
  isItemActive: (item: NavItem) => boolean;
  isTabActive: (tab: NavTab) => boolean;
}) {
  return (
    <div className="md:hidden overflow-x-auto border-t bg-white">
      <div className="flex items-center gap-1 p-2 min-w-max">
        {tabs.map((tab) => (
          <DropdownMenu key={tab.id}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                  isTabActive(tab)
                    ? "bg-gradient-to-r from-orange-400 to-amber-500 text-white"
                    : "bg-gray-100 text-gray-700"
                )}
                data-testid={`mobile-nav-tab-${tab.id}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {tab.items.map((item) => (
                <NavDropdownItem key={item.id} item={item} isActive={isItemActive(item)} />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </div>
    </div>
  );
}
