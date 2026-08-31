"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SettingsModal } from "../settings/SettingsModal";
import { api } from "@/lib/api";
import { AuthUser } from "@/types";
import { Upload, FileText, ShieldAlert, BarChart3, Activity, Settings, User, LogOut } from "lucide-react";

interface NavbarProps {
  onOpenUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload }) => {
  const pathname = usePathname();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api
      .getHealth()
      .then(() => setIsBackendHealthy(true))
      .catch(() => setIsBackendHealthy(false));

    if (typeof api.getMe === "function") {
      api
        .getMe()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          // Fallback default admin persona
          setUser({
            id: "00000000-0000-0000-0000-000000000001",
            email: "admin@docusage.ai",
            name: "Eleanor Vance",
            org_id: "11111111-1111-1111-1111-111111111111",
            role: "Partner",
            priority: 90,
            is_admin: true,
          });
        });
    }
  }, []);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/contracts", label: "Contracts", icon: FileText },
    { href: "/policies", label: "Policies", icon: ShieldAlert },
    { href: "/evals", label: "Evals & Metrics", icon: BarChart3 },
  ];

  if (user?.is_admin || user?.role?.toLowerCase() === "partner") {
    navLinks.push({ href: "/admin/roles", label: "Admin & RBAC", icon: ShieldAlert });
  }

  return (
    <>
      <header className="h-14 border-b border-[#27272a] bg-[#121214] flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center space-x-8">
          <Logo />

          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = Boolean(pathname && (pathname === href || (href !== "/" && pathname.startsWith(href))));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? "text-zinc-100 bg-zinc-800/80 border border-zinc-700/60 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* User Persona & Seniority Pill */}
          {user && (
            <Link
              href="/login"
              className="hidden lg:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-[#18181b] border border-[#27272a] hover:border-zinc-500 text-xs transition-colors"
              title="Switch user persona or log in"
            >
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-200 truncate max-w-[120px]">
                {user.name ? user.name.split(" ")[0] : (user.email ? user.email.split("@")[0] : "Counsel")}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                P{user.priority} • {user.role}
              </span>
            </Link>
          )}

          {/* Backend Status Pill */}
          <div className="flex items-center space-x-1.5 text-xs" title="FastAPI Engine Connectivity">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy === null
                  ? "bg-zinc-500 animate-pulse"
                  : isBackendHealthy
                  ? "bg-emerald-500/90"
                  : "bg-red-500/90"
              }`}
            />
            <span className="font-mono text-[11px] text-zinc-400 hidden sm:inline">
              {isBackendHealthy === null ? "Connecting..." : isBackendHealthy ? "Engine Active" : "Engine Offline"}
            </span>
          </div>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Model Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors shadow-sm"
            title="Configure AI Models & Keys"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Contract</span>
            </button>
          )}
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
