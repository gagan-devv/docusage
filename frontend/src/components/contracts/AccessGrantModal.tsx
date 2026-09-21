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
      setStatusMsg({ text: "Access revoked successfully!", type: "success" });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to revoke access", type: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-surface border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-secondary">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-amber-500" />
            <div>
              <h3 className="font-semibold text-foreground">Delegate Contract Access</h3>
              <p className="text-[11px] text-foreground-secondary truncate max-w-xs">{contractName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3 rounded-lg flex items-center space-x-2 ${
                statusMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* New Grant Form */}
          <form onSubmit={handleGrant} className="p-3.5 rounded-xl border border-border bg-surface-secondary space-y-3">
            <div className="font-medium text-foreground text-xs flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-foreground-secondary" />
              <span>Grant Delegation to Junior or Colleague</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-foreground-secondary font-medium">Select Member</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-border-highlight"
                >
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id} className="bg-surface text-foreground">
                      {m.email || m.name} ({m.role_name} P{m.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-foreground-secondary font-medium">Permission Level</label>
                <select
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-border-highlight"
                >
                  <option value="view" className="bg-surface text-foreground">View & Audit (Read)</option>
                  <option value="edit" className="bg-surface text-foreground">Edit & Review (Write)</option>
                  <option value="admin" className="bg-surface text-foreground">Administer & Delegate</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !selectedUserId}
                className="px-3.5 py-1.5 rounded-lg bg-foreground text-canvas font-medium text-xs transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Granting..." : "Authorize Delegation"}
              </button>
            </div>
          </form>

          {/* Active Grants List */}
          <div className="space-y-2">
            <div className="font-semibold text-foreground text-xs flex items-center justify-between">
              <span>Active Delegation Grants</span>
              <span className="text-[11px] font-mono text-foreground-secondary">{grants.length} Active</span>
            </div>

            {isLoading ? (
              <div className="p-4 text-center text-foreground-secondary font-mono">Loading active grants...</div>
            ) : grants.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-foreground-secondary font-mono">
                No explicit delegation grants active. Access governed by seniority.
              </div>
            ) : (
              <div className="space-y-1.5">
                {grants.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-foreground">{g.user_email || g.user_name || g.user_id}</div>
                      <div className="text-[10px] font-mono text-foreground-secondary flex items-center space-x-2">
                        <span className="px-1.5 py-0.2 rounded bg-surface-secondary border border-border uppercase">
                          {g.permission_level}
                        </span>
                        <span>•</span>
                        <span>{g.granted_at ? new Date(g.granted_at).toLocaleDateString() : "Active"}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(g.user_id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-foreground-secondary hover:text-rose-500 transition-colors"
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
      </div>
    </div>
  );
};
