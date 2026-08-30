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
      <div className="p-8 text-center text-xs text-zinc-500 font-mono">
        Loading contracts from database...
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="p-12 text-center border border-[#27272a] rounded-lg bg-[#121214] space-y-2">
        <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
        <h4 className="text-sm font-medium text-zinc-300">No contracts uploaded yet</h4>
        <p className="text-xs text-zinc-500">Upload an agreement or contract to begin vector search and policy analysis.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#27272a] rounded-lg bg-[#121214] overflow-hidden shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#27272a] bg-[#151518] text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
            <th className="py-3 px-4">Contract Name</th>
            <th className="py-3 px-4 hidden md:table-cell">Path / ID</th>
            <th className="py-3 px-4 hidden sm:table-cell">Ingested At</th>
            <th className="py-3 px-4 text-right">Audit & Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#27272a]">
          {contracts.map((c) => (
            <tr
              key={c.id}
              className="hover:bg-[#18181b] transition-colors group"
            >
              <td className="py-3 px-4 font-medium text-zinc-200">
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <span className="truncate max-w-xs">{c.name}</span>
                </div>
              </td>
              <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] hidden md:table-cell">
                <span className="truncate max-w-xs block text-zinc-500">#{typeof c.id === 'string' && c.id.length > 12 ? c.id.substring(0, 8) + '...' : c.id} • {c.file_path}</span>
              </td>
              <td className="py-3 px-4 text-zinc-400 hidden sm:table-cell font-mono text-[11px]">
                {formatDate(c.created_at)}
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end space-x-2">
                  <Link
                    href={`/contracts/${c.id}`}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-medium text-[11px] transition-colors"
                  >
                    <Shield className="w-3 h-3 text-zinc-400" />
                    <span>Review Audit</span>
                    <ArrowRight className="w-3 h-3 text-zinc-400" />
                  </Link>

                  {onDeleteContract && (
                    <button
                      onClick={() => onDeleteContract(c.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete contract"
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
  );
};
