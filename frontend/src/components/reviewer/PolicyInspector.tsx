"use client";

import React from "react";
import { GraphState, Policy } from "@/types";
import { formatRiskScore } from "@/lib/utils";
import { ShieldCheck, AlertOctagon, GitBranch, RefreshCw, CheckCircle } from "lucide-react";

interface PolicyInspectorProps {
  policy?: Policy | null;
  graphState?: GraphState | null;
  isLoading?: boolean;
}

export const PolicyInspector: React.FC<PolicyInspectorProps> = ({
  policy,
  graphState,
  isLoading = false,
}) => {
  const riskScore = graphState?.risk_score ?? 0.33;
  const riskInfo = formatRiskScore(riskScore);
  const complianceRate = Math.max(0, Math.min(100, Math.round((1 - riskScore) * 100)));
  const status = graphState?.status || "PAUSED_AT_HUMAN_REVIEW";
  const iterations = graphState?.iteration_count ?? 1;
  const maxIterations = graphState?.max_iterations ?? 3;

  return (
    <aside className="w-full md:w-96 bg-[#121214] border border-[#27272a] rounded-lg flex flex-col overflow-hidden shadow-sm">
      {/* Header */}
      <div className="h-10 border-b border-[#27272a] px-4 flex items-center justify-between bg-[#151518]">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">LangGraph AI Inspector</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
          {policy?.name || "Standard Enterprise Policy"}
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        
        {/* Graph Status Banner */}
        <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400">Current Node State</span>
            <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
              status === "PAUSED_AT_HUMAN_REVIEW"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                : status === "COMPLETED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-zinc-800 text-zinc-300 border-zinc-700"
            }`}>
              {status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-zinc-300 border-t border-[#27272a]">
            <div>
              <span className="text-zinc-500 block text-[10px]">Risk Score</span>
              <span className={`font-semibold ${riskInfo.color}`}>{riskScore.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Compliance</span>
              <span className="font-semibold text-zinc-200">{complianceRate}%</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Loop Count</span>
              <span className="font-semibold text-zinc-200">{iterations}/{maxIterations}</span>
            </div>
          </div>
        </div>

        {/* Evaluated Covenants / Rules */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wide">
            <span>Evaluated Covenants</span>
            <span>Policy Rules</span>
          </div>

          {/* Sample / Live Deviations */}
          {graphState?.deviations && graphState.deviations.length > 0 ? (
            graphState.deviations.map((dev, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#18181b] border border-amber-500/30 rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-medium text-zinc-200">{dev.rule}</span>
                  </div>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {dev.risk} RISK
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {dev.reason}
                </p>
              </div>
            ))
          ) : (
            <div className="p-3 bg-[#18181b] border border-amber-500/30 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium text-zinc-200">Limitation of Liability Cap</span>
                </div>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  HIGH RISK
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Policy requires liability capped at ≤ 2x contract value. Contract contains uncapped clause for breach.
              </p>
            </div>
          )}

          {/* Compliant Rules */}
          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-zinc-200">Governing Law Jurisdiction</span>
              </div>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                SATISFIED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Clause 14.1 conforms to approved jurisdiction guidelines (New York / Delaware).
            </p>
          </div>

          <div className="p-3 bg-[#18181b] border border-[#27272a] rounded-lg space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-zinc-200">Mutual Indemnification</span>
              </div>
              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                SATISFIED
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Standard mutual indemnity obligations met without unilateral carveouts.
            </p>
          </div>

        </div>

      </div>
    </aside>
  );
};
