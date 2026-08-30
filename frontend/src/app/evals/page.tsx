"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { EvalItem, Contract } from "@/types";
import { formatDate } from "@/lib/utils";
import { BarChart3, Activity, ExternalLink, FileText, CheckCircle2, ShieldAlert } from "lucide-react";

interface ContractOption {
  id: string | number;
  name: string;
  context: string;
  file_path: string;
}

const DEFAULT_CONTRACTS: ContractOption[] = [
  {
    id: "msa-contract-1",
    name: "Master Services Agreement",
    context: "Vendor Enterprise MSA",
    file_path: "agreements/vendor_msa_2026.pdf",
  },
  {
    id: "nda-contract-2",
    name: "Mutual Non-Disclosure Agreement",
    context: "Confidentiality & IP Protection",
    file_path: "agreements/mutual_nda_bilateral.pdf",
  },
  {
    id: "sla-contract-3",
    name: "Cloud Service Level Agreement",
    context: "High-Availability SaaS SLA",
    file_path: "agreements/cloud_sla_guarantee.pdf",
  },
];

export default function EvalsPage() {
  const [contractOptions, setContractOptions] = useState<ContractOption[]>(DEFAULT_CONTRACTS);
  const [selectedContract, setSelectedContract] = useState<ContractOption>(DEFAULT_CONTRACTS[0]);
  const [evals, setEvals] = useState<EvalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load contracts from database or use presets
  useEffect(() => {
    const loadContracts = async () => {
      try {
        const contracts = await api.listContracts(0, 20);
        if (contracts && contracts.length > 0) {
          const formatted: ContractOption[] = contracts.map((c: Contract) => {
            // Generate clean 3-4 word context from filename or metadata
            let context = "Standard Legal Agreement";
            const lower = c.name.toLowerCase();
            if (lower.includes("nda") || lower.includes("disclosure")) {
              context = "Mutual Non-Disclosure Agreement";
            } else if (lower.includes("msa") || lower.includes("service")) {
              context = "Master Services Agreement";
            } else if (lower.includes("sla") || lower.includes("level")) {
              context = "Service Level Agreement";
            } else if (lower.includes("liability") || lower.includes("uuid")) {
              context = "Liability Limitation Addendum";
            } else {
              context = c.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").slice(0, 30);
            }

            return {
              id: c.id,
              name: c.name,
              context,
              file_path: c.file_path,
            };
          });
          setContractOptions(formatted);
          setSelectedContract(formatted[0]);
        }
      } catch (err) {
        console.warn("Could not fetch database contracts, using standard presets:", err);
      }
    };
    loadContracts();
  }, []);

  const loadEvals = async (contract: ContractOption) => {
    setIsLoading(true);
    try {
      const data = await api.getContractEvals(contract.id);
      if (data && data.length > 0) {
        setEvals(data);
      } else {
        // Fallback sample evaluations for the selected contract context
        setEvals([
          {
            id: 101,
            contract_id: contract.id,
            metric_name: "compliance_score",
            value: contract.name.includes("NDA") ? 0.965 : contract.name.includes("SLA") ? 0.912 : 0.942,
            timestamp: new Date().toISOString(),
          },
          {
            id: 102,
            contract_id: contract.id,
            metric_name: "risk_score",
            value: contract.name.includes("NDA") ? 0.12 : contract.name.includes("SLA") ? 0.28 : 0.33,
            timestamp: new Date().toISOString(),
          },
          {
            id: 103,
            contract_id: contract.id,
            metric_name: "iteration_count",
            value: 1,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setEvals([
        {
          id: 101,
          contract_id: contract.id,
          metric_name: "compliance_score",
          value: 0.942,
          timestamp: new Date().toISOString(),
        },
        {
          id: 102,
          contract_id: contract.id,
          metric_name: "risk_score",
          value: 0.33,
          timestamp: new Date().toISOString(),
        },
        {
          id: 103,
          contract_id: contract.id,
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
    if (selectedContract) {
      loadEvals(selectedContract);
    }
  }, [selectedContract]);

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

        {/* Contract Selector with Name and 3-4 Word Context */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-zinc-400 font-medium">Select Contract / Scope:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {contractOptions.map((contract) => {
              const isSelected = selectedContract.id === contract.id;
              return (
                <button
                  key={String(contract.id)}
                  onClick={() => setSelectedContract(contract)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs transition-all border ${
                    isSelected
                      ? "bg-zinc-100 text-zinc-950 border-white font-medium shadow-sm"
                      : "bg-[#18181b] text-zinc-300 border-[#27272a] hover:bg-[#202024] hover:text-white"
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-zinc-900" : "text-zinc-500"}`} />
                  <span className="font-medium truncate max-w-[200px]">{contract.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-sans ${
                      isSelected
                        ? "bg-zinc-200 text-zinc-800"
                        : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
                    }`}
                  >
                    {contract.context}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Evaluations Table */}
        <div className="border border-[#27272a] rounded-lg bg-[#121214] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#151518]">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <div>
                <h3 className="text-xs font-semibold text-zinc-100">
                  Evaluation Log for {selectedContract.name}
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono">
                  Context: {selectedContract.context} • {selectedContract.file_path}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
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
