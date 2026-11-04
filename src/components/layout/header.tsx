"use client";

import * as React from "react";
import {
  Menu,
  Search,
  Bell,
  Plus,
  Command,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onQuickUploadClick: () => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeBreadcrumb?: string;
}

export function Header({
  onOpenMobileMenu,
  onQuickUploadClick,
  searchQuery,
  onSearchChange,
  activeBreadcrumb = "Dashboard",
}: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(true);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // Check initial dark mode from document or system
    const isDarkCurrent =
      document.documentElement.classList.contains("dark") ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkCurrent);
    if (isDarkCurrent) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const consumerNotifications = [
    {
      id: "notif_1",
      title: "Spotify policy update",
      message: "Updated privacy disclosures regarding background location recommendations.",
      time: "2h ago",
      type: "alert",
    },
    {
      id: "notif_2",
      title: "Analysis ready",
      message: "Instagram Terms of Use analysis finished with 5 clauses highlighted.",
      time: "1d ago",
      type: "success",
    },
    {
      id: "notif_3",
      title: "Netflix terms reminder",
      message: "Household account sharing limitations clarified in current terms.",
      time: "2d ago",
      type: "info",
    },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">TermsLens</span>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {activeBreadcrumb}
          </span>
        </div>
      </div>

      {/* Middle: Search input with shortcut hint */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Input
            id="global-search-input"
            name="searchQuery"
            aria-label="Search policies, apps, or red flag clauses"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search policies, apps, or red flag clauses..."
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={
              <kbd className="pointer-events-none hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            }
            className="h-9 bg-slate-50/60 focus:bg-white text-xs dark:bg-slate-900/60"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setHasUnread(false);
            }}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Recent Policy Updates
                  </span>
                  <Badge variant="secondary" size="sm">
                    3 new
                  </Badge>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-72 overflow-y-auto mt-1">
                {consumerNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="py-2.5 px-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      {notif.type === "alert" && (
                        <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      )}
                      {notif.type === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      )}
                      {notif.type === "info" && (
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {notif.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <Button
          onClick={onQuickUploadClick}
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          className="font-medium"
        >
          <span className="hidden sm:inline">Analyze Document</span>
          <span className="sm:hidden">Analyze</span>
        </Button>
      </div>
    </header>
  );
}
