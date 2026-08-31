"use client";

import React from "react";
import { GraphState, Policy, CRAGFinding } from "@/types";
import { formatRiskScore } from "@/lib/utils";
import { AlertOctagon, GitBranch, CheckCircle2, HelpCircle, ShieldAlert, Quote } from "lucide-react";

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
  const riskScore = graphState?.risk_score ?? 0.0;
  const riskInfo = formatRiskScore(riskScore);
  const complianceRate = Math.max(0, Math.min(100, Math.round((1 - riskScore) * 100)));
  const status = graphState?.status || "INITIALIZING";
  const iterations = graphState?.iteration_count ?? 1;
  const maxIterations = graphState?.max_iterations ?? 3;
  const findings: CRAGFinding[] = graphState?.crag_findings ?? [];
  const rules = graphState?.rules ?? policy?.rules ?? [];

  return (
    <aside className="w-full md:w-96 bg-[#121214] border border-[#27272a] rounded-lg flex flex-col overflow-hidden shadow-sm">
      {/* Header */}
      <div className="h-10 border-b border-[#27272a] px-4 flex items-center justify-between bg-[#151518]">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">CRAG Compliance Inspector</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
          {policy?.name || "Corporate Compliance Policy"}
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Graph Status Banner */}
        <div className="bg-[#18181b] border border-[#27272a] p-3 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-400">LangGraph Status</span>
            <span
              className={`font-mono text-[10px] px-2 py-0.5 rounded border ${
                status === "PAUSED_AT_HUMAN_REVIEW"
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                  : status === "APPROVED_BY_LEGAL" || status === "AUTO_COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : status === "REJECTED_BY_LEGAL"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
            >
              {status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-zinc-300 border-t border-[#27272a]">
            <div>
              <span className="text-zinc-500 block text-[10px]">Risk Metric</span>
              <span className={`font-semibold ${riskInfo.color}`}>{riskScore.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Compliance</span>
              <span className="font-semibold text-zinc-200">{complianceRate}%</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Iterations</span>
              <span className="font-semibold text-zinc-200">
                {iterations}/{maxIterations}
              </span>
            </div>
          </div>
        </div>

        {/* Evaluated Covenants / Rules */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wide">
            <span>Evaluated Covenants</span>
            <span>CRAG Quality</span>
          </div>

          {/* Dynamic Findings List from CRAG */}
          {findings.length > 0 ? (
            findings.map((f, idx) => {
              const isDev = f.status === "DEVIATION";
              const isMissing = f.status === "MISSING_COVENANT";

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border space-y-1.5 ${
                    isDev
                      ? "bg-[#181412] border-amber-500/30"
                      : isMissing
                      ? "bg-[#181214] border-rose-500/30"
                      : "bg-[#151518] border-[#27272a]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {isDev ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                      ) : isMissing ? (
                        <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="font-medium text-zinc-200">{f.rule_name}</span>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[9px]">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {f.retrieval_grade}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          isDev
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            : isMissing
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        {f.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {f.rationale}
                  </p>

                  {/* Citations List if present */}
                  {f.citations && f.citations.length > 0 && (
                    <div className="pt-1.5 border-t border-zinc-800/80 space-y-1 font-mono text-[10px]">
                      {f.citations.map((c, cIdx) => (
                        <div key={cIdx} className="text-zinc-400 flex items-start space-x-1">
                          <Quote className="w-3 h-3 text-zinc-500 shrink-0 mt-0.5" />
                          <span className="text-zinc-300">
                            [{c.section_reference}]: "{c.exact_quote}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.suggested_redline && (
                    <div className="pt-1.5 text-[10px] font-mono text-amber-300/90">
                      <span className="text-amber-400 font-semibold">Redline: </span>
                      {f.suggested_redline}
                    </div>
                  )}
                </div>
              );
            })
          ) : rules.length > 0 ? (
            /* Render Policy Covenants before Analysis completion */
            rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#151518] border border-[#27272a] rounded-lg space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-300">{rule.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    Threshold: {rule.threshold || 0.5}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 truncate">
                  Query: {rule.query}
                </p>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-zinc-500 font-mono text-xs">
              No policy rules defined.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
