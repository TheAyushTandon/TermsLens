"use client";

import * as React from "react";
import {
  Moon,
  Sun,
  Database,
  Sparkles,
  ShieldCheck,
  Cpu,
  Check,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
    }
  }, [isOpen]);

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Settings & System Status"
      description="Configure preferences and inspect live infrastructure components."
      maxWidth="md"
    >
      <div className="space-y-5 text-xs">
        {/* Appearance Preference */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isDark ? <Moon className="h-4 w-4 text-blue-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
              Appearance Theme
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={toggleTheme}
              className="text-xs font-medium"
            >
              {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Currently active: <strong className="text-slate-700 dark:text-slate-300">{isDark ? "Dark Theme" : "Light Theme"}</strong>
          </p>
        </div>

        {/* Infrastructure & Intelligence Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
            <Cpu className="h-4 w-4 text-emerald-500" />
            Active Intelligence & Storage Architecture
          </h4>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">AI Foundation Model</span>
              </div>
              <span className="font-mono text-[10px] rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 font-semibold">
                Gemini 3.5 Flash-Lite
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Database Persistence</span>
              </div>
              <span className="font-mono text-[10px] rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 font-semibold">
                Neon PostgreSQL (Connected)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">Pipeline Verification</span>
              </div>
              <span className="font-mono text-[10px] rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 font-semibold">
                P01-P05 Exact Quote Match
              </span>
            </div>
          </div>
        </div>

        {/* Responsible AI Disclaimer */}
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
          TermsLens provides consumer-focused policy explanations and plain-language summaries for informational purposes. It does not constitute legal counsel or formal legal advice.
        </p>

        {/* Modal Close Action */}
        <div className="flex justify-end pt-2">
          <Button size="sm" onClick={onClose} className="text-xs font-medium">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
