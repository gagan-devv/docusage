"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SettingsModal } from "../settings/SettingsModal";
import { api } from "@/lib/api";
import { Upload, FileText, ShieldAlert, BarChart3, Activity, Settings } from "lucide-react";

interface NavbarProps {
  onOpenUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload }) => {
  const pathname = usePathname();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    api
      .getHealth()
      .then(() => setIsBackendHealthy(true))
      .catch(() => setIsBackendHealthy(false));
  }, []);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/contracts", label: "Contracts", icon: FileText },
    { href: "/policies", label: "Policies", icon: ShieldAlert },
    { href: "/evals", label: "Evals & Metrics", icon: BarChart3 },
  ];

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
