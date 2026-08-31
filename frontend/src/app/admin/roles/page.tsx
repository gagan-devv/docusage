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
    <div className="min-h-screen flex flex-col bg-[#09090b]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#27272a]">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <span>Organization Roles & Seniority RBAC</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Configure employee roles and numerical priority rankings. Seniors automatically see documents created by juniors; juniors are blocked until explicitly granted.
            </p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg flex items-center space-x-2 text-xs ${
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

        {/* Hierarchy Overview Card */}
        <div className="p-4 rounded-xl border border-[#27272a] bg-[#121214] space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <ArrowDownUp className="w-4 h-4 text-emerald-400" />
            <span>Seniority Access Rules (Mathematical Guarantee)</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            • <strong>Top-Down Visibility:</strong> An employee with priority <strong>P</strong> can automatically view and audit contracts uploaded by any employee with priority <strong>&le; P</strong>.<br />
            • <strong>Bottom-Up Protection:</strong> An employee with priority <strong>&lt; P</strong> cannot view contracts uploaded by their seniors unless an explicit delegation grant is recorded.
          </p>
        </div>

        {/* Roles Priority Configuration Table */}
        <div className="border border-[#27272a] rounded-lg bg-[#121214] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#27272a] bg-[#151518] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-100">Role Priority Ranking (1 - 100)</h3>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Higher Priority = Greater Seniority</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#101012] text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Role Name</th>
                <th className="py-3 px-4">Seniority Priority</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-[#18181b] transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">
                    <div className="flex items-center space-x-2">
                      <span>{r.role_name}</span>
                      {r.is_admin && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                          ADMIN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-zinc-100">
                    {editingRoleId === r.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={newPriority}
                          onChange={(e) => setNewPriority(Number(e.target.value))}
                          className="w-16 bg-[#18181b] border border-[#27272a] rounded px-2 py-1 text-xs text-zinc-100 font-mono"
                        />
                        <button
                          onClick={() => handleUpdateRole(r.id)}
                          className="p-1 rounded bg-emerald-900 text-emerald-300 hover:bg-emerald-800"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {r.priority}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">{r.description || "—"}</td>
                  <td className="py-3 px-4 text-right">
                    {editingRoleId !== r.id && (
                      <button
                        onClick={() => {
                          setEditingRoleId(r.id);
                          setNewPriority(r.priority);
                        }}
                        className="text-xs text-zinc-400 hover:text-white font-mono underline"
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

        {/* Member Assignment Table */}
        <div className="border border-[#27272a] rounded-lg bg-[#121214] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#27272a] bg-[#151518] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-zinc-400" />
              <h3 className="text-xs font-semibold text-zinc-100">Organization Employees & Role Assignments</h3>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">Real-time Employee Scope</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#27272a] bg-[#101012] text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Effective Priority</th>
                <th className="py-3 px-4 text-right">Reassign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {members.map((m) => (
                <tr key={m.user_id} className="hover:bg-[#18181b] transition-colors">
                  <td className="py-3 px-4 font-medium text-zinc-200">
                    <div>{m.name}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{m.email}</div>
                  </td>
                  <td className="py-3 px-4 text-zinc-300 font-medium">{m.role_name}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-zinc-100">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Priority {m.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <select
                      value={m.role_id}
                      onChange={(e) => handleMemberRoleChange(m.user_id, Number(e.target.value))}
                      className="bg-[#18181b] border border-[#27272a] rounded px-2.5 py-1 text-xs text-zinc-200 font-sans focus:outline-none focus:border-zinc-500"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.role_name} (Priority {r.priority})
                        </option>
                      ))}
                    </select>
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
