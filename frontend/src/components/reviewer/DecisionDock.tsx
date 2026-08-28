"use client";

import React, { useState } from "react";
import { Check, RotateCcw, XCircle, Loader2 } from "lucide-react";

interface DecisionDockProps {
  onDecision: (action: "approve" | "reject" | "revise", feedback?: string) => Promise<void>;
  isSubmitting?: boolean;
  currentStatus?: string;
}

export const DecisionDock: React.FC<DecisionDockProps> = ({
  onDecision,
  isSubmitting = false,
  currentStatus,
}) => {
  const [feedback, setFeedback] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleAction = async (action: "approve" | "reject" | "revise") => {
    setLastAction(action);
    await onDecision(action, feedback);
    if (action === "approve" || action === "reject") {
      setFeedback("");
    }
  };

  const isResolved = currentStatus === "APPROVED_BY_LEGAL" || currentStatus === "REJECTED_BY_LEGAL";

  return (
    <div className="border-t border-[#27272a] bg-[#121214] p-4 sticky bottom-0 z-20 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3">
        
        {/* Counsel Feedback Input */}
        <div className="flex-1 w-full flex items-center space-x-2">
          <label htmlFor="feedbackInput" className="text-[11px] font-mono uppercase text-zinc-400 whitespace-nowrap hidden sm:inline">
            Legal Counsel Arbitration:
          </label>
          <input
            id="feedbackInput"
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isSubmitting || isResolved}
            placeholder="e.g. Waive uncapped liability or require mutual 1x contract cap..."
            className="flex-1 bg-[#18181b] border border-[#27272a] rounded px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono disabled:opacity-50"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <button
            onClick={() => handleAction("approve")}
            disabled={isSubmitting || isResolved}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting && lastAction === "approve" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Approve Contract</span>
          </button>

          <button
            onClick={() => handleAction("revise")}
            disabled={isSubmitting || isResolved}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded bg-[#18181b] hover:bg-[#222227] text-zinc-200 border border-[#27272a] hover:border-zinc-500 font-medium text-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting && lastAction === "revise" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span>Request Revision</span>
          </button>

          <button
            onClick={() => handleAction("reject")}
            disabled={isSubmitting || isResolved}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 rounded bg-zinc-900/80 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-[#27272a] hover:border-red-500/30 font-medium text-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting && lastAction === "reject" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Reject</span>
          </button>
        </div>

      </div>
    </div>
  );
};
