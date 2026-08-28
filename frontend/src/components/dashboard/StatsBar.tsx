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
    <div className="border-b border-[#27272a] bg-[#101012] px-6 py-3.5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
        
        {/* KPI 1 */}
        <div className="flex items-center space-x-3 bg-[#151518] border border-[#27272a] p-3 rounded-lg">
          <div className="p-2 rounded bg-zinc-800/80 text-zinc-300">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Total Contracts</div>
            <div className="text-lg font-semibold text-zinc-100 mt-0.5">{totalContracts}</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="flex items-center space-x-3 bg-[#151518] border border-[#27272a] p-3 rounded-lg">
          <div className="p-2 rounded bg-zinc-800/80 text-zinc-300">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Audited Clauses</div>
            <div className="text-lg font-semibold text-zinc-100 mt-0.5">{totalClauses.toLocaleString()}</div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="flex items-center space-x-3 bg-[#151518] border border-[#27272a] p-3 rounded-lg">
          <div className="p-2 rounded bg-zinc-800/80 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Avg Compliance Rate</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-lg font-semibold text-zinc-100">{avgCompliance}%</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                Optimal
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="flex items-center space-x-3 bg-[#151518] border border-[#27272a] p-3 rounded-lg">
          <div className="p-2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Pending Review</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-lg font-semibold text-amber-300">{pendingReviews}</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                Action Required
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
