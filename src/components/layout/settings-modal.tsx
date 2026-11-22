"use client";

import * as React from "react";
import {
  Database,
  Cpu,
  ShieldCheck,
  Check,
  Info,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Settings & System Status"
      description="System intelligence and verified data storage architecture."
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* Active System Details */}
        <div className="rounded-xl border border-[#d7d9ce] bg-white p-4 space-y-3">
          <h4 className="font-semibold text-[#040404] flex items-center gap-1.5 text-xs">
            <Cpu className="h-4 w-4 text-[#119da4]" />
            Active AI & Database Architecture
          </h4>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <div className="flex items-center justify-between rounded-lg bg-[#f7f8f5] p-2.5 border border-[#eef1ec]">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-[#119da4]" />
                <span className="text-[#040404] font-medium">AI Foundation Engine</span>
              </div>
              <span className="font-mono text-[10px] rounded bg-[#eef1ec] text-[#13505b] px-2 py-0.5 font-semibold">
                Gemini 3.5 Flash-Lite
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[#f7f8f5] p-2.5 border border-[#eef1ec]">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-[#0c7489]" />
                <span className="text-[#040404] font-medium">Database Persistence</span>
              </div>
              <span className="font-mono text-[10px] rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-semibold">
                Neon PostgreSQL (Connected)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-[#f7f8f5] p-2.5 border border-[#eef1ec]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-[#13505b]" />
                <span className="text-[#040404] font-medium">Evidence Grounding</span>
              </div>
              <span className="font-mono text-[10px] rounded bg-[#eef1ec] text-[#13505b] px-2 py-0.5 font-semibold">
                Word-for-Word Verification
              </span>
            </div>
          </div>
        </div>

        {/* Informational Notice */}
        <div className="rounded-xl border border-[#d7d9ce] bg-[#f7f8f5] p-3 text-[11px] text-[#4a5759] flex items-start gap-2">
          <Info className="h-4 w-4 text-[#119da4] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            TermsLens translates complicated terms into plain English for informational purposes. It does not provide legal advice.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="bg-[#119da4] hover:bg-[#0c7489] text-white font-medium text-xs px-4"
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
