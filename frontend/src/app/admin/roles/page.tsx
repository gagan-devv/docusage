"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { OrgRole, OrgMember } from "@/types";
import { ShieldAlert, Users, Sliders, CheckCircle2, AlertCircle, Save, ArrowDownUp, ShieldCheck } from "lucide-react";

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [newPriority, setNewPriority] = useState<number>(50);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, membersRes] = await Promise.all([
        api.getOrgRoles(),
        api.getOrgMembers(),
      ]);
      setRoles(rolesRes.roles || []);
      setMembers(membersRes.members || []);
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to load roles and members", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateRole = async (roleId: number) => {
    try {
      await api.updateOrgRole(roleId, newPriority);
      setStatusMsg({ text: "Role seniority priority updated successfully!", type: "success" });
      setEditingRoleId(null);
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to update role priority", type: "error" });
    }
  };

  const handleMemberRoleChange = async (userId: string, roleId: number) => {
    try {
      await api.updateMember(userId, roleId);
      setStatusMsg({ text: "Member role updated successfully!", type: "success" });
      loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to update member role", type: "error" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-foreground transition-colors duration-150">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Organization Roles & Seniority RBAC</span>
            </h1>
            <p className="text-xs text-foreground-secondary mt-0.5">
              Configure employee roles and seniority rankings. Superior roles automatically access subordinate documents.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl flex items-center space-x-2 text-xs ${
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

        {/* Seniority Ladder Overview Card */}
        <div className="p-4 rounded-xl border border-border bg-surface space-y-2.5 shadow-xs">
          <div className="flex items-center space-x-2 text-xs font-semibold text-foreground">
            <ArrowDownUp className="w-4 h-4 text-emerald-500" />
            <span>Seniority Access Rules</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-foreground-secondary">
            <div className="p-3 rounded-lg bg-surface-secondary border border-border space-y-1">
              <span className="font-semibold text-foreground">Top-Down Visibility</span>
              <p className="text-[11px] leading-relaxed">
                Senior team members can automatically view and audit agreements created by junior colleagues.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-secondary border border-border space-y-1">
              <span className="font-semibold text-foreground">Subordinate Protection</span>
              <p className="text-[11px] leading-relaxed">
                Subordinates cannot view executive documents unless an explicit delegation grant is created.
              </p>
            </div>
          </div>
        </div>

        {/* Roles Priority Configuration Table */}
        <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-surface-secondary flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-foreground-secondary" />
              <h3 className="text-xs font-semibold text-foreground">Role Priority Ranking (1 - 100)</h3>
            </div>
            <span className="text-[10px] text-foreground-secondary font-mono">Higher Priority = Greater Seniority</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-foreground-secondary font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Role Name</th>
                  <th className="py-3 px-4">Seniority Priority</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roles.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div className="flex items-center space-x-2">
                        <span>{r.role_name}</span>
                        {r.is_admin && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      {editingRoleId === r.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={newPriority}
                            onChange={(e) => setNewPriority(Number(e.target.value))}
                            className="w-16 bg-surface-secondary border border-border rounded px-2 py-1 text-xs text-foreground font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateRole(r.id)}
                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-surface-secondary text-foreground border border-border">
                          {r.priority}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-foreground-secondary">{r.description || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      {editingRoleId !== r.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRoleId(r.id);
                            setNewPriority(r.priority);
                          }}
                          className="text-xs text-foreground-secondary hover:text-foreground font-mono underline"
                        >
                          Adjust Priority
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Member Assignment Table */}
        <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border bg-surface-secondary flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-foreground-secondary" />
              <h3 className="text-xs font-semibold text-foreground">Organization Employees & Role Assignments</h3>
            </div>
            <span className="text-[10px] text-foreground-secondary font-mono">{members.length} Members</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface text-foreground-secondary font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Effective Priority</th>
                  <th className="py-3 px-4 text-right">Reassign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.user_id} className="hover:bg-surface-hover transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div>
                        <div>{m.name || "Employee"}</div>
                        <div className="text-[11px] font-mono text-foreground-secondary">{m.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      <span className="px-2 py-0.5 rounded bg-surface-secondary border border-border text-xs font-medium">
                        {m.role_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      P{m.priority}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={m.role_id}
                        onChange={(e) => handleMemberRoleChange(m.user_id, Number(e.target.value))}
                        className="bg-surface-secondary border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-border-highlight"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id} className="bg-surface text-foreground">
                            {r.role_name} (P{r.priority})
                          </option>
                        ))}
                      </select>
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
