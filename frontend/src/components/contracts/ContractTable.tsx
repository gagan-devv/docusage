"use client";

import React from "react";
import Link from "next/link";
import { Contract } from "@/types";
import { formatDate } from "@/lib/utils";
import { FileText, ArrowRight, Trash2, Shield } from "lucide-react";

interface ContractTableProps {
  contracts: Contract[];
  onDeleteContract?: (id: string | number) => void;
  isLoading?: boolean;
}

export const ContractTable: React.FC<ContractTableProps> = ({
  contracts,
  onDeleteContract,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-foreground-secondary font-mono">
        Loading contracts from database...
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="p-8 sm:p-12 text-center border border-border rounded-xl bg-surface space-y-2 shadow-xs">
        <FileText className="w-8 h-8 text-foreground-muted mx-auto" />
        <h4 className="text-sm font-medium text-foreground">No contracts uploaded yet</h4>
        <p className="text-xs text-foreground-secondary">
          Upload an agreement or contract to begin vector search and policy analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse min-w-[520px] sm:min-w-full">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-foreground-secondary font-mono text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Contract Name</th>
              <th className="py-3 px-4 hidden md:table-cell">Path / ID</th>
              <th className="py-3 px-4 whitespace-nowrap">Ingested At</th>
              <th className="py-3 px-4 text-right whitespace-nowrap">Audit & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-surface-hover transition-colors group">
                <td className="py-3 px-4 font-medium text-foreground">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-4 h-4 text-foreground-secondary shrink-0" />
                    <span className="truncate max-w-[180px] sm:max-w-xs">{c.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-foreground-secondary font-mono text-[11px] hidden md:table-cell">
                  <span className="truncate max-w-xs block text-foreground-muted">
                    #{typeof c.id === "string" && c.id.length > 12 ? c.id.substring(0, 8) + "..." : c.id} • {c.file_path}
                  </span>
                </td>
                <td className="py-3 px-4 text-foreground-secondary font-mono text-[11px] whitespace-nowrap">
                  {formatDate(c.created_at)}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end space-x-2">
                    <Link
                      href={`/contracts/${c.id}`}
                      prefetch={false}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 min-h-[30px] rounded-lg bg-surface-secondary hover:bg-surface-tertiary text-foreground border border-border font-medium text-[11px] transition-colors"
                    >
                      <Shield className="w-3 h-3 text-foreground-secondary" />
                      <span>Review Audit</span>
                      <ArrowRight className="w-3 h-3 text-foreground-secondary" />
                    </Link>

                    {onDeleteContract && (
                      <button
                        type="button"
                        onClick={() => onDeleteContract(c.id)}
                        className="p-1 min-h-[30px] min-w-[30px] rounded text-foreground-muted hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center"
                        title="Delete contract"
                        aria-label="Delete contract"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
