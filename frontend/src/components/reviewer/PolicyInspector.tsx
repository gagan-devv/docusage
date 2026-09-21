"use client";

import React from "react";
import { GraphState, Policy, CRAGFinding } from "@/types";
import { formatRiskScore } from "@/lib/utils";
import { AlertOctagon, GitBranch, CheckCircle2, HelpCircle, ShieldAlert, Quote } from "lucide-react";

interface PolicyInspectorProps {
  policy?: Policy | null;
  graphState?: GraphState | null;
  isLoading?: boolean;
  onSelectCitation?: (quote: string) => void;
}

export const PolicyInspector: React.FC<PolicyInspectorProps> = ({
  policy,
  graphState,
  isLoading = false,
  onSelectCitation,
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
    <aside className="w-full md:w-96 bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-xs">
      {/* Header */}
      <div className="min-h-[44px] border-b border-border px-4 py-2 flex items-center justify-between bg-surface-secondary">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-foreground-secondary" />
          <span className="text-xs font-semibold text-foreground">CRAG Compliance Inspector</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface text-foreground-secondary border border-border">
          {policy?.name || "Corporate Compliance Policy"}
        </span>
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Graph Status Banner */}
        <div className="bg-surface-secondary border border-border p-3 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-foreground-secondary">LangGraph Status</span>
            <span
              className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border ${
                status === "PAUSED_AT_HUMAN_REVIEW"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : status === "APPROVED_BY_LEGAL" || status === "AUTO_COMPLETED"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : status === "REJECTED_BY_LEGAL"
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  : "bg-surface text-foreground-secondary border-border"
              }`}
            >
              {status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[11px] text-foreground border-t border-border">
            <div>
              <span className="text-foreground-muted block text-[10px]">Risk Metric</span>
              <span className={`font-semibold ${riskInfo.color}`}>{riskScore.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-foreground-muted block text-[10px]">Compliance</span>
              <span className="font-semibold text-foreground">{complianceRate}%</span>
            </div>
            <div>
              <span className="text-foreground-muted block text-[10px]">Iterations</span>
              <span className="font-semibold text-foreground">
                {iterations}/{maxIterations}
              </span>
            </div>
          </div>
        </div>

        {/* Evaluated Covenants / Rules */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-foreground-secondary uppercase tracking-wide">
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
                  className={`p-3 rounded-xl border space-y-1.5 ${
                    isDev
                      ? "bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30"
                      : isMissing
                      ? "bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30"
                      : "bg-surface border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {isDev ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : isMissing ? (
                        <HelpCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className="font-medium text-foreground truncate">{f.rule_name}</span>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[9px] shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-surface-secondary text-foreground-secondary border border-border">
                        {f.retrieval_grade}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded border font-semibold ${
                          isDev
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                            : isMissing
                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                        }`}
                      >
                        {f.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-foreground-secondary leading-relaxed">
                    {f.rationale}
                  </p>

                  {/* Citations List if present */}
                  {f.citations && f.citations.length > 0 && (
                    <div className="pt-1.5 border-t border-border space-y-1 font-mono text-[10px]">
                      {f.citations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => onSelectCitation && onSelectCitation(c.exact_quote)}
                          className="text-foreground-secondary flex items-start space-x-1.5 p-1 rounded-lg hover:bg-surface-secondary cursor-pointer transition-colors"
                          title="Click to deep-link and view in raw document text"
                        >
                          <Quote className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-foreground hover:text-amber-600 dark:hover:text-amber-400 leading-snug">
                            <span className="text-foreground-muted font-semibold">[{c.section_reference}]:</span> "{c.exact_quote}"
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {f.suggested_redline && (
                    <div className="pt-1.5 text-[10px] font-mono text-amber-800 dark:text-amber-300">
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">Redline: </span>
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
                className="p-3 bg-surface-secondary border border-border rounded-xl space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{rule.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface text-foreground-secondary border border-border">
                    Threshold: {rule.threshold || 0.5}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-foreground-muted truncate">
                  Query: {rule.query}
                </p>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-foreground-secondary font-mono text-xs">
              No policy rules defined.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
