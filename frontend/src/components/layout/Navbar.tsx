"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { ThemeToggle } from "../theme/ThemeToggle";
import { SettingsModal } from "../settings/SettingsModal";
import { api } from "@/lib/api";
import { AuthUser } from "@/types";
import {
  Upload,
  FileText,
  ShieldAlert,
  BarChart3,
  Activity,
  Settings,
  User,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface NavbarProps {
  onOpenUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload }) => {
  const pathname = usePathname();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Activity },
    { href: "/contracts", label: "Contracts", icon: FileText },
    { href: "/policies", label: "Policies", icon: ShieldAlert },
    { href: "/evals", label: "Analytics", icon: BarChart3 },
  ];

  if (user?.is_admin || user?.role?.toLowerCase() === "partner") {
    navLinks.push({ href: "/admin/roles", label: "Admin & Roles", icon: ShieldAlert });
  }

  navLinks.push({ href: "/settings", label: "Settings", icon: Settings });

  return (
    <>
      <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-colors duration-150">
        <div className="flex items-center space-x-4 lg:space-x-8">
          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="md:hidden p-2 min-w-[44px] min-h-[44px] -ml-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-secondary flex items-center justify-center transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Logo />

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = Boolean(
                pathname && (pathname === href || (href !== "/" && pathname.startsWith(href)))
              );
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? "text-foreground bg-surface-secondary border border-border shadow-xs"
                      : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* User Persona & Seniority Pill (Desktop) */}
          {user && (
            <Link
              href="/login"
              className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-secondary border border-border hover:border-border-highlight text-xs transition-colors"
              title="Switch user persona or log in"
            >
              <User className="w-3.5 h-3.5 text-foreground-secondary" />
              <span className="font-medium text-foreground truncate max-w-[120px]">
                {user.name ? user.name.split(" ")[0] : user.email ? user.email.split("@")[0] : "Counsel"}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-amber-600 dark:text-amber-400 border border-border">
                P{user.priority} • {user.role}
              </span>
            </Link>
          )}

          {/* Backend Status Dot */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs" title="FastAPI Engine Connectivity">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendHealthy === null
                  ? "bg-zinc-400 animate-pulse"
                  : isBackendHealthy
                  ? "bg-emerald-500"
                  : "bg-red-500"
              }`}
            />
            <span className="font-mono text-[11px] text-foreground-secondary hidden lg:inline">
              {isBackendHealthy === null ? "Connecting..." : isBackendHealthy ? "Online" : "Offline"}
            </span>
          </div>

          <div className="w-px h-4 bg-border hidden sm:block" />

          {/* Theme Switcher Toggle (Bright / Dark) */}
          <ThemeToggle />

          {/* Upload Contract Button */}
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-lg bg-foreground text-canvas hover:opacity-90 font-medium text-xs transition-opacity shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Contract</span>
              <span className="sm:hidden">Upload</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Sliding Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-surface border-r border-border h-full flex flex-col z-50 shadow-2xl p-5 space-y-6 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-surface-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = Boolean(
                  pathname && (pathname === href || (href !== "/" && pathname.startsWith(href)))
                );
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "text-foreground bg-surface-secondary font-semibold"
                        : "text-foreground-secondary hover:text-foreground hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted" />
                  </Link>
                );
              })}
            </nav>

            {/* User Profile & Theme Footer */}
            <div className="pt-4 border-t border-border space-y-3">
              {user && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-secondary border border-border">
                  <div className="flex items-center space-x-2 truncate">
                    <User className="w-4 h-4 text-foreground-secondary shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-medium text-foreground truncate">{user.name || user.email}</div>
                      <div className="text-[10px] font-mono text-foreground-secondary">
                        {user.role} • Priority {user.priority}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-foreground-secondary font-medium">Theme Mode</span>
                <ThemeToggle showLabel={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
