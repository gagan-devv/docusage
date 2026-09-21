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
    <div className="border-t border-border bg-surface p-3 sm:p-4 sticky bottom-0 z-20 shadow-2xl safe-pb transition-colors duration-150">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3">
        {/* Counsel Feedback Input */}
        <div className="flex-1 w-full flex items-center space-x-2">
          <label
            htmlFor="feedbackInput"
            className="text-[11px] font-mono uppercase text-foreground-secondary whitespace-nowrap hidden sm:inline"
          >
            Arbitration Notes:
          </label>
          <input
            id="feedbackInput"
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isSubmitting || isResolved}
            placeholder="e.g. Waive uncapped liability or require mutual 1x contract cap..."
            className="flex-1 bg-surface-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight font-mono disabled:opacity-50 min-h-[38px] shadow-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleAction("approve")}
            disabled={isSubmitting || isResolved}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 min-h-[38px] rounded-xl bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 shadow-xs disabled:opacity-50"
          >
            {isSubmitting && lastAction === "approve" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Approve Contract</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction("revise")}
            disabled={isSubmitting || isResolved}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-surface-secondary hover:bg-surface-hover text-foreground border border-border hover:border-border-highlight font-medium text-xs transition-colors disabled:opacity-50 shadow-xs"
          >
            {isSubmitting && lastAction === "revise" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-foreground-secondary" />
            )}
            <span>Request Revision</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction("reject")}
            disabled={isSubmitting || isResolved}
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3 py-2 min-h-[38px] rounded-xl bg-surface-secondary hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 border border-border hover:border-red-500/30 font-medium text-xs transition-colors disabled:opacity-50 shadow-xs"
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
