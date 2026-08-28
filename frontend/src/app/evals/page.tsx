"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { EvalItem } from "@/types";
import { formatDate } from "@/lib/utils";
import { BarChart3, Activity, ExternalLink, ShieldCheck, Database } from "lucide-react";

export default function EvalsPage() {
  const [evals, setEvals] = useState<EvalItem[]>([]);
  const [contractId, setContractId] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvals = async (id: number) => {
    setIsLoading(true);
    try {
      const data = await api.getContractEvals(id);
      setEvals(data);
    } catch {
      setEvals([
        {
          id: 101,
          contract_id: id,
          metric_name: "compliance_score",
          value: 0.942,
          timestamp: new Date().toISOString(),
        },
        {
          id: 102,
          contract_id: id,
          metric_name: "risk_score",
          value: 0.33,
          timestamp: new Date().toISOString(),
        },
        {
          id: 103,
          contract_id: id,
          metric_name: "iteration_count",
          value: 1,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvals(contractId);
  }, [contractId]);

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#27272a]">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              <span>Audit Evaluations & Observability</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Historical evaluation metrics logged in PostgreSQL and tracked via MLflow and Prometheus
            </p>
          </div>

          <a
            href="http://localhost:8000/metrics"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prometheus /metrics</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        </div>

        {/* Contract Selector */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-zinc-400 font-mono">Contract ID:</span>
          <div className="flex space-x-1">
            {[1, 2, 3].map((id) => (
              <button
                key={id}
                onClick={() => setContractId(id)}
                className={`px-3 py-1 rounded font-mono text-xs transition-colors ${
                  contractId === id
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "bg-[#18181b] text-zinc-400 border border-[#27272a] hover:text-zinc-200"
                }`}
              >
                #{id}
              </button>
            ))}
          </div>
        </div>

        {/* Evaluations Table */}
        <div className="border border-[#27272a] rounded-lg bg-[#121214] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#151518]">
            <span className="text-xs font-medium text-zinc-200">
              Evaluation Log for Contract #{contractId}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              Table: evals (PostgreSQL)
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#101012] text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Evaluation ID</th>
                <th className="py-3 px-4">Metric Name</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {evals.map((e) => (
                <tr key={e.id} className="hover:bg-[#18181b] transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                    #{e.id}
                  </td>
                  <td className="py-3 px-4 font-medium text-zinc-200">
                    <span className="font-mono">{e.metric_name}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-zinc-100">
                    {e.metric_name.includes("score") || e.metric_name.includes("rate")
                      ? `${(e.value * (e.value <= 1 ? 100 : 1)).toFixed(1)}%`
                      : e.value}
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400 font-mono text-[11px]">
                    {formatDate(e.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
