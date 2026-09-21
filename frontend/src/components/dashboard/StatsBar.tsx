import React from "react";
import { FileText, Cpu, ShieldCheck, AlertCircle } from "lucide-react";

interface StatsBarProps {
  totalContracts: number;
  totalClauses?: number;
  avgCompliance?: number;
  pendingReviews?: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  totalContracts,
  totalClauses = 1420,
  avgCompliance = 94.2,
  pendingReviews = 1,
}) => {
  return (
    <div className="border-b border-border bg-surface px-4 sm:px-6 py-3.5 transition-colors duration-150">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-7xl mx-auto">
        {/* KPI 1 */}
        <div className="flex items-center space-x-3 bg-surface-secondary border border-border p-3 sm:p-3.5 rounded-xl shadow-xs">
          <div className="p-2 rounded-lg bg-surface border border-border text-foreground-secondary shrink-0">
            <FileText className="w-4 h-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider truncate">
              Total Contracts
            </div>
            <div className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
              {totalContracts}
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="flex items-center space-x-3 bg-surface-secondary border border-border p-3 sm:p-3.5 rounded-xl shadow-xs">
          <div className="p-2 rounded-lg bg-surface border border-border text-foreground-secondary shrink-0">
            <Cpu className="w-4 h-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider truncate">
              Audited Clauses
            </div>
            <div className="text-base sm:text-lg font-semibold text-foreground mt-0.5">
              {totalClauses.toLocaleString()}
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="flex items-center space-x-3 bg-surface-secondary border border-border p-3 sm:p-3.5 rounded-xl shadow-xs">
          <div className="p-2 rounded-lg bg-surface border border-border text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider truncate">
              Avg Compliance Rate
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-semibold text-foreground">
                {avgCompliance}%
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                Optimal
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="flex items-center space-x-3 bg-surface-secondary border border-border p-3 sm:p-3.5 rounded-xl shadow-xs">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider truncate">
              Pending Review
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-base sm:text-lg font-semibold text-amber-600 dark:text-amber-400">
                {pendingReviews}
              </span>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                Action Required
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
