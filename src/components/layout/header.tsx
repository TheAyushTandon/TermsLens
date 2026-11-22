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
  const [hasUnread, setHasUnread] = React.useState(false);

  const consumerNotifications = [
    {
      id: "notif_1",
      title: "Spotify policy update",
      message: "Updated disclosures regarding location data recommendations.",
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#d7d9ce] bg-white/95 px-4 backdrop-blur-xs sm:px-6">
      {/* Left: Mobile hamburger & breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-[#13505b] hover:bg-[#eef1ec] lg:hidden"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#4a5759] font-medium">TermsLens</span>
          <span className="text-[#d7d9ce]">/</span>
          <span className="font-semibold text-[#040404]">
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
            leftIcon={<Search className="h-4 w-4 text-[#119da4]" />}
            rightIcon={
              <kbd className="pointer-events-none hidden sm:inline-flex items-center gap-0.5 rounded border border-[#d7d9ce] bg-[#f7f8f5] px-1.5 py-0.5 font-mono text-[10px] text-[#4a5759]">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            }
            className="h-9 bg-[#f7f8f5] focus:bg-white text-xs border-[#d7d9ce] focus:border-[#119da4] focus:ring-[#119da4]/20"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Popover Toggle */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setHasUnread(false);
            }}
            className="relative rounded-lg p-2 text-[#13505b] hover:bg-[#eef1ec] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#119da4] ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#d7d9ce] bg-white p-3 shadow-xl animate-in fade-in-50 zoom-in-95 z-50">
              <div className="flex items-center justify-between border-b border-[#eef1ec] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#040404]">
                    Policy Updates
                  </span>
                  <Badge variant="secondary" size="sm" className="bg-[#eef1ec] text-[#13505b]">
                    3 updates
                  </Badge>
                </div>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="text-[11px] text-[#4a5759] hover:text-[#040404]"
                >
                  Close
                </button>
              </div>

              <div className="divide-y divide-[#eef1ec] max-h-72 overflow-y-auto mt-1">
                {consumerNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="py-2.5 px-1 hover:bg-[#f7f8f5] rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      {notif.type === "alert" && (
                        <AlertTriangle className="h-4 w-4 text-[#c93b2b] flex-shrink-0 mt-0.5" />
                      )}
                      {notif.type === "success" && (
                        <CheckCircle2 className="h-4 w-4 text-[#119da4] flex-shrink-0 mt-0.5" />
                      )}
                      {notif.type === "info" && (
                        <FileText className="h-4 w-4 text-[#0c7489] flex-shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-[#040404]">
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-[#4a5759]">
                            {notif.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#4a5759] line-clamp-2">
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
          className="font-medium bg-[#119da4] hover:bg-[#0c7489] text-white shadow-xs"
        >
          <span className="hidden sm:inline">Scan Policy</span>
          <span className="sm:hidden">Scan</span>
        </Button>
      </div>
    </header>
  );
}
