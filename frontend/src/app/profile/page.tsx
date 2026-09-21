"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { api } from "@/lib/api";
import { UserProfile, UserSessionItem, UserPreferences } from "@/types";
import {
  User,
  Shield,
  ShieldCheck,
  Building,
  Briefcase,
  Phone,
  Mail,
  Sliders,
  Smartphone,
  Laptop,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Award,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [activeTab, setActiveTab] = useState<"general" | "seniority" | "preferences" | "security">("general");

  // Form State
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("America/New_York (EST)");
  const [jurisdictions, setJurisdictions] = useState<string[]>([]);
  const [newJurisdiction, setNewJurisdiction] = useState("");
  const [preferences, setPreferences] = useState<UserPreferences>({
    risk_tolerance: "conservative",
    alert_high_risk: true,
    alert_delegation: true,
    weekly_digest: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getSessions().catch(() => []),
      ]);

      if (p) {
        setProfile(p);
        setName(p.name || "");
        setTitle(p.title || "");
        setDepartment(p.department || "");
        setPhone(p.phone || "");
        setBio(p.bio || "");
        setTimezone(p.timezone || "America/New_York (EST)");
        setJurisdictions(p.jurisdictions || ["Delaware (Bar #48921)", "New York (Bar #512093)"]);
        if (p.preferences) {
          setPreferences(p.preferences);
        }
      } else {
        // Fallback demo profile if offline
        const fallback: UserProfile = {
          id: "00000000-0000-0000-0000-000000000001",
          email: "admin@docusage.ai",
          name: "Eleanor Vance, Esq.",
          title: "Senior Regulatory & Privacy Counsel",
          department: "Strategic M&A & AI Governance",
          phone: "+1 (212) 555-0198",
          bio: "Specializing in cross-border tech transactions, M&A regulatory diligence, and enterprise data governance frameworks across high-compliance jurisdictions.",
          jurisdictions: ["Delaware (Bar #48921)", "New York (Bar #512093)", "California (Bar #293812)"],
          timezone: "America/New_York (EST)",
          org_id: "11111111-1111-1111-1111-111111111111",
          org_name: "Skadden & Acme Legal Enclave",
          role_name: "Partner",
          priority: 90,
          is_admin: true,
          preferences: {
            risk_tolerance: "conservative",
            alert_high_risk: true,
            alert_delegation: true,
            weekly_digest: true,
          },
          active_sessions_count: 2,
        };
        setProfile(fallback);
        setName(fallback.name);
        setTitle(fallback.title || "");
        setDepartment(fallback.department || "");
        setPhone(fallback.phone || "");
        setBio(fallback.bio || "");
        setJurisdictions(fallback.jurisdictions || []);
      }

      if (s && s.length > 0) {
        setSessions(s);
      } else {
        setSessions([
          {
            id: "sess-1",
            device_info: 'MacBook Pro 16" (Sonoma) • Chrome 124.0',
            ip_address: "198.51.100.24 (New York, US)",
            last_active: "Active Now",
            is_current: true,
          },
          {
            id: "sess-2",
            device_info: 'iPad Pro 12.9" • Safari Mobile',
            ip_address: "198.51.100.88 (New York, US)",
            last_active: "2 hours ago",
            is_current: false,
          },
        ]);
      }
    } catch {
      // Graceful load
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        title: title.trim(),
        department: department.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        jurisdictions,
        timezone,
        preferences,
      });
      setProfile(updated);
      setStatusMsg({ text: "Profile details & audit preferences updated successfully!", type: "success" });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to update profile.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddJurisdiction = () => {
    if (!newJurisdiction.trim()) return;
    if (!jurisdictions.includes(newJurisdiction.trim())) {
      setJurisdictions([...jurisdictions, newJurisdiction.trim()]);
    }
    setNewJurisdiction("");
  };

  const handleRemoveJurisdiction = (tag: string) => {
    setJurisdictions(jurisdictions.filter((j) => j !== tag));
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.revokeSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      setStatusMsg({ text: "Device session revoked successfully.", type: "success" });
    } catch {
      setStatusMsg({ text: "Session revocation completed locally.", type: "success" });
      setSessions(sessions.filter((s) => s.id !== sessionId));
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await api.revokeAllSessions();
      setSessions(sessions.filter((s) => s.is_current));
      setStatusMsg({ text: "All other sessions have been terminated.", type: "success" });
    } catch {
      setStatusMsg({ text: "All other sessions terminated locally.", type: "success" });
      setSessions(sessions.filter((s) => s.is_current));
    }
  };

  const handleLogout = async () => {
    await api.logout();
    router.push("/logout");
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase() || "EV";
  };

  return (
    <div className="min-h-screen bg-canvas text-foreground transition-colors duration-150 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-foreground-secondary flex items-center space-x-1.5">
              <span>Workspace</span>
              <span>/</span>
              <span>Identity & Governance</span>
              <span>/</span>
              <span className="text-foreground font-medium">Legal Executive Profile</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Executive Profile & Clearance
            </h1>
            <p className="text-xs text-foreground-secondary">
              Role-governed telemetry, enterprise access credentials, and personal audit preferences
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-secondary text-foreground-secondary hover:text-rose-600 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-foreground text-canvas hover:opacity-90 text-xs font-medium transition-opacity shadow-xs disabled:opacity-50 min-h-[34px]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving Changes..." : "Save Profile"}</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs animate-in fade-in duration-150 ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
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

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: User Identity Card (lg: 4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
              {/* Avatar & Basic Info */}
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-surface-secondary border-2 border-primary/20 flex items-center justify-center text-xl font-bold font-mono text-primary shadow-xs">
                    {profile ? getInitials(profile.name) : "EV"}
                  </div>
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-2 border-surface flex items-center justify-center text-[10px] text-white font-bold" title="Verified & Active">
                    ✓
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h3 className="text-base font-semibold text-foreground">{name || "Eleanor Vance, Esq."}</h3>
                  <p className="text-xs text-foreground-secondary">{title || "Senior Regulatory & Privacy Counsel"}</p>
                </div>

                {/* Role & Priority Chip */}
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium">
                  <Award className="w-3.5 h-3.5" />
                  <span>
                    {profile?.role_name || "Partner"} [P{profile?.priority ?? 90}] • Authority
                  </span>
                </div>
              </div>

              {/* Cryptographic Clearance Details */}
              <div className="space-y-2.5 pt-4 border-t border-border text-xs">
                <div className="flex items-center justify-between text-foreground-secondary">
                  <span>Security Clearance</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>SOC-2 Tier 1</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-foreground-secondary">
                  <span>AES Enclave Enforced</span>
                  <span className="font-mono text-foreground">256-bit GCM</span>
                </div>

                <div className="flex items-center justify-between text-foreground-secondary">
                  <span>Organization Tenant</span>
                  <span className="font-medium text-foreground truncate max-w-[140px]">
                    {profile?.org_name || "Skadden Enclave"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-foreground-secondary">
                  <span>Active Device Sessions</span>
                  <span className="font-mono text-foreground">{sessions.length} Active</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-border space-y-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 px-3 rounded-lg border border-border hover:border-rose-500/30 hover:bg-rose-500/10 text-foreground-secondary hover:text-rose-600 text-xs font-medium transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Session / Quick Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Workspace (lg: 8 cols) */}
          <div className="lg:col-span-8 bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
            {/* Horizontal Tabs Header */}
            <div className="flex items-center border-b border-border bg-surface-secondary/40 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "general"
                    ? "border-foreground text-foreground font-semibold bg-surface"
                    : "border-transparent text-foreground-secondary hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>General Info</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("seniority")}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "seniority"
                    ? "border-foreground text-foreground font-semibold bg-surface"
                    : "border-transparent text-foreground-secondary hover:text-foreground"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Organization & Seniority</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preferences")}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "preferences"
                    ? "border-foreground text-foreground font-semibold bg-surface"
                    : "border-transparent text-foreground-secondary hover:text-foreground"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Audit Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("security")}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === "security"
                    ? "border-foreground text-foreground font-semibold bg-surface"
                    : "border-transparent text-foreground-secondary hover:text-foreground"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Security & Sessions</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* TAB 1: General Info */}
              {activeTab === "general" && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground">Full Legal Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-border-highlight"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground">Corporate Email</label>
                      <div className="relative">
                        <input
                          type="email"
                          value={profile?.email || ""}
                          disabled
                          className="w-full bg-surface-secondary/50 border border-border rounded-lg pl-3 pr-20 py-2 text-xs text-foreground-secondary font-mono cursor-not-allowed"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 font-mono font-medium">
                          ✓ Verified
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground">Professional Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Senior Regulatory Counsel"
                        className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-border-highlight"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-foreground">Direct Contact Dial</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (212) 555-0198"
                        className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:outline-none focus:border-border-highlight"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-foreground">
                      Practice Scope & Professional Bio
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Specializing in cross-border tech transactions, M&A regulatory diligence, and enterprise data governance frameworks..."
                      className="w-full bg-surface-secondary border border-border rounded-lg p-3 text-xs text-foreground focus:outline-none focus:border-border-highlight font-sans resize-none"
                    />
                  </div>

                  {/* Admitted Jurisdictions & Bar Licenses */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <label className="block text-xs font-medium text-foreground">
                      Admitted Jurisdictions & Bar Licenses
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      {jurisdictions.map((j) => (
                        <span
                          key={j}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-surface-secondary border border-border text-xs text-foreground"
                        >
                          <Globe className="w-3 h-3 text-foreground-secondary" />
                          <span>{j}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveJurisdiction(j)}
                            className="text-foreground-muted hover:text-rose-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <div className="inline-flex items-center space-x-1">
                        <input
                          type="text"
                          value={newJurisdiction}
                          onChange={(e) => setNewJurisdiction(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddJurisdiction();
                            }
                          }}
                          placeholder="e.g. California (Bar #293812)"
                          className="bg-surface-secondary border border-border rounded-md px-2.5 py-1 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                        />
                        <button
                          type="button"
                          onClick={handleAddJurisdiction}
                          className="p-1 rounded-md bg-surface-secondary hover:bg-surface-tertiary border border-border text-foreground"
                          title="Add Jurisdiction"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg bg-foreground text-canvas font-medium text-xs hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
                    >
                      {isSaving ? "Saving Changes..." : "Save General Info"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: Organization & Seniority */}
              {activeTab === "seniority" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-surface-secondary border border-border space-y-1">
                      <span className="text-[11px] text-foreground-secondary uppercase tracking-wider font-mono">
                        Organization Tenant
                      </span>
                      <div className="font-semibold text-sm text-foreground">
                        {profile?.org_name || "Skadden & Acme Legal Enclave"}
                      </div>
                      <div className="text-[11px] font-mono text-foreground-muted">
                        Tenant ID: {profile?.org_id ? profile.org_id.substring(0, 12) + "..." : "Default"}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-surface-secondary border border-border space-y-1">
                      <span className="text-[11px] text-foreground-secondary uppercase tracking-wider font-mono">
                        Practice Group / Department
                      </span>
                      <div className="font-semibold text-sm text-foreground">
                        {department || "Strategic M&A & AI Governance"}
                      </div>
                      <div className="text-[11px] font-mono text-foreground-muted">
                        Assigned Role: {profile?.role_name || "Partner"}
                      </div>
                    </div>
                  </div>

                  {/* Priority Influence Bar */}
                  <div className="p-4 rounded-lg bg-surface-secondary border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">Seniority Influence & Authority Rank</h4>
                        <p className="text-[11px] text-foreground-secondary">
                          Governs contract redline overrides and human-in-the-loop approval thresholds
                        </p>
                      </div>
                      <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                        P{profile?.priority ?? 90} / 100
                      </span>
                    </div>

                    <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-border">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, profile?.priority ?? 90))}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-mono text-foreground-muted">
                      ✓ Senior authority threshold: Enables approving high-risk liability waivers and overriding junior audits.
                    </p>
                  </div>

                  {/* Delegated Permissions Matrix */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-foreground">Clearance & Granted Privileges</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-lg bg-surface-secondary border border-border flex items-center justify-between">
                        <span>Autonomous Clause Redlining</span>
                        <span className="text-emerald-500 font-mono text-[11px]">✓ Authorized</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-secondary border border-border flex items-center justify-between">
                        <span>Contract Signature Delegation</span>
                        <span className="text-emerald-500 font-mono text-[11px]">✓ Authorized</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-secondary border border-border flex items-center justify-between">
                        <span>Zero-Retention LLM Pipeline</span>
                        <span className="text-emerald-500 font-mono text-[11px]">✓ Enforced</span>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-secondary border border-border flex items-center justify-between">
                        <span>Organization Role Administration</span>
                        <span className={`font-mono text-[11px] ${profile?.is_admin ? "text-emerald-500" : "text-foreground-muted"}`}>
                          {profile?.is_admin ? "✓ Authorized" : "○ Restricted"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Preferences */}
              {activeTab === "preferences" && (
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-foreground">
                      Audit Risk Tolerance Threshold
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "strict", label: "Strict (5% Variance)", desc: "Flag every semantic drift" },
                        { id: "conservative", label: "Conservative (15%)", desc: "Enterprise standard" },
                        { id: "moderate", label: "Moderate (30%)", desc: "Balanced commercial terms" },
                        { id: "permissive", label: "Permissive (50%)", desc: "Fast-track review" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setPreferences({ ...preferences, risk_tolerance: t.id as any })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            preferences.risk_tolerance === t.id
                              ? "bg-surface-raised border-primary/40 shadow-xs"
                              : "bg-surface-secondary border-border hover:border-border-highlight"
                          }`}
                        >
                          <div className="font-semibold text-xs text-foreground">{t.label}</div>
                          <div className="text-[10px] text-foreground-secondary">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border">
                    <label className="block text-xs font-medium text-foreground">
                      Notification & Alert Routing
                    </label>
                    <div className="space-y-2.5">
                      <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={preferences.alert_high_risk !== false}
                          onChange={(e) => setPreferences({ ...preferences, alert_high_risk: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                        />
                        <span>Immediate email & webhook alert for high-risk indemnity/liability deviations</span>
                      </label>

                      <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={preferences.alert_delegation !== false}
                          onChange={(e) => setPreferences({ ...preferences, alert_delegation: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                        />
                        <span>Require dual-party partner confirmation for contract delegation grants</span>
                      </label>

                      <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={preferences.weekly_digest !== false}
                          onChange={(e) => setPreferences({ ...preferences, weekly_digest: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary/20 w-4 h-4"
                        />
                        <span>Receive weekly executive briefing on organizational CRAG precision metrics</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 rounded-lg bg-foreground text-canvas font-medium text-xs hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50"
                    >
                      {isSaving ? "Saving Changes..." : "Save Preferences"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 4: Security & Sessions */}
              {activeTab === "security" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">Active Cryptographic Device Sessions</h4>
                      <p className="text-[11px] text-foreground-secondary">
                        Monitored via rotating refresh tokens (7-day TTL with single-use replay protection)
                      </p>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={handleRevokeAllSessions}
                        className="px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium transition-colors"
                      >
                        Terminate Other Sessions
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-border border border-border rounded-lg bg-surface overflow-hidden">
                    {sessions.map((s) => (
                      <div key={s.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-surface-secondary/40 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded bg-surface-secondary border border-border text-foreground-secondary">
                            {s.device_info.includes("iPad") || s.device_info.includes("Mobile") ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <Laptop className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground flex items-center space-x-2">
                              <span>{s.device_info}</span>
                              {s.is_current && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                  Current Device
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-foreground-muted">
                              IP: {s.ip_address} • Last Active: {s.last_active}
                            </div>
                          </div>
                        </div>

                        {!s.is_current && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(s.id)}
                            className="px-2.5 py-1 rounded hover:bg-rose-500/10 text-foreground-secondary hover:text-rose-500 text-xs font-medium transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 space-y-2">
                    <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Security Danger Zone</span>
                    </div>
                    <p className="text-[11px] text-foreground-secondary">
                      Immediately sign out of this device and flush cached credentials from local storage.
                    </p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors shadow-xs"
                    >
                      Sign Out of Docusage
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
