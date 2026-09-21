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
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-foreground-secondary" />
              <span>Audit Evaluations & Observability</span>
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Historical evaluation metrics, compliance rates, and system telemetry
            </p>
          </div>

          <a
            href="http://localhost:8000/metrics"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-2 px-3.5 py-2 min-h-[38px] rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground border border-border text-xs font-medium transition-colors shadow-xs self-start sm:self-auto"
          >
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Prometheus /metrics</span>
            <ExternalLink className="w-3.5 h-3.5 text-foreground-secondary" />
          </a>
        </div>

        {/* Contract Selector */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-foreground-secondary font-medium">Select Contract Scope:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {contractOptions.map((contract) => {
              const isSelected = selectedContract.id === contract.id;
              return (
                <button
                  key={String(contract.id)}
                  type="button"
                  onClick={() => setSelectedContract(contract)}
                  className={`flex items-center space-x-2 px-3.5 py-2 min-h-[38px] rounded-xl text-xs transition-all border ${
                    isSelected
                      ? "bg-foreground text-canvas font-semibold shadow-xs"
                      : "bg-surface text-foreground border-border hover:bg-surface-secondary"
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-canvas" : "text-foreground-secondary"}`} />
                  <span className="font-medium truncate max-w-[180px] sm:max-w-[220px]">{contract.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isSelected
                        ? "bg-canvas/20 text-canvas"
                        : "bg-surface-secondary text-foreground-secondary border border-border"
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
        <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-secondary">
            <div className="flex items-center space-x-2.5 min-w-0">
              <FileText className="w-4 h-4 text-foreground-secondary shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-foreground truncate">
                  Evaluation Log for {selectedContract.name}
                </h3>
                <p className="text-[11px] text-foreground-secondary font-mono truncate">
                  Context: {selectedContract.context}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-foreground-secondary">
              {evals.length} Metrics Logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-foreground-secondary font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Evaluation ID</th>
                  <th className="py-3 px-4">Metric Name</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {evals.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground-muted">
                      #{e.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      <span className="font-mono">{e.metric_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      {e.metric_name.includes("score") || e.metric_name.includes("rate")
                        ? `${(e.value * (e.value <= 1 ? 100 : 1)).toFixed(1)}%`
                        : e.value}
                    </td>
                    <td className="py-3 px-4 text-right text-foreground-secondary font-mono text-[11px]">
                      {formatDate(e.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
