"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Trash2, ShieldCheck, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { AccessGrant, OrgMember } from "@/types";

interface AccessGrantModalProps {
  contractId: string;
  contractName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const AccessGrantModal: React.FC<AccessGrantModalProps> = ({
  contractId,
  contractName,
  isOpen,
  onClose,
}) => {
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissionLevel, setPermissionLevel] = useState<string>("view");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [grantsRes, membersRes] = await Promise.all([
        api.getContractGrants(contractId),
        api.getOrgMembers(),
      ]);
      setGrants(grantsRes.grants || []);
      const memberList = membersRes.members || [];
      setMembers(memberList);
      if (memberList.length > 0) {
        setSelectedUserId(memberList[0].user_id);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, contractId]);

  if (!isOpen) return null;

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      await api.grantContractAccess(contractId, selectedUserId, permissionLevel);
      setStatusMsg({ text: "Explicit contract access granted successfully!", type: "success" });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to grant access", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (targetUserId: string) => {
    try {
      await api.revokeContractAccess(contractId, targetUserId);
      setStatusMsg({ text: "Access delegation revoked successfully.", type: "success" });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to revoke access", type: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-[#27272a] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181b]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Delegate Contract Access (ACL Override)</h3>
              <p className="text-[11px] text-zinc-400 truncate max-w-sm">{contractName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-md flex items-center space-x-2 text-xs ${
                statusMsg.type === "success"
                  ? "bg-emerald-950/40 border border-emerald-800/60 text-emerald-300"
                  : "bg-red-950/40 border border-red-800/60 text-red-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Form to Grant Access */}
          <form onSubmit={handleGrant} className="p-3.5 border border-[#27272a] rounded-lg bg-[#151518] space-y-3">
            <h4 className="text-xs font-medium text-zinc-200">Grant Access to Junior / Team Member</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Employee</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-zinc-200 font-sans text-xs focus:outline-none focus:border-zinc-500"
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name} ({m.role_name} • P{m.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-zinc-400">Permission Level</label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1.5 text-zinc-200 font-sans text-xs focus:outline-none focus:border-zinc-500"
                >
                  <option value="view">View & Audit Only</option>
                  <option value="edit">Edit & Review</option>
                  <option value="admin">Full Admin / Manage</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Granting Permission..." : "Authorize Access"}
            </button>
          </form>

          {/* Active Grants List */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-zinc-300">Active Delegations for this Document</h4>
            {grants.length === 0 ? (
              <p className="text-zinc-500 text-[11px] italic p-3 border border-[#27272a] rounded bg-[#18181b]">
                No explicit grants. Document access is currently governed strictly by seniority rankings.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {grants.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-2.5 rounded border border-[#27272a] bg-[#18181b]"
                  >
                    <div>
                      <div className="font-medium text-zinc-200">{g.user_name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Level: <span className="text-emerald-400 font-semibold">{g.permission_level}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevoke(g.user_id)}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#27272a] bg-[#18181b] flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
