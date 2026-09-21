"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronDown,
  LogOut,
  Award,
} from "lucide-react";

interface NavbarProps {
  onOpenUpload?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenUpload }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close menus on outside click or route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    try {
      await api.logout();
    } catch {
      // Ignore API logout failure, still redirect to logout page
    }
    router.push("/logout");
  };

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
          {/* User Persona & Seniority Dropdown (Desktop) */}
          {user ? (
            <div className="relative hidden xl:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-surface-secondary border border-border hover:border-border-highlight text-xs transition-colors"
                aria-expanded={isUserMenuOpen}
                aria-label="User account menu"
              >
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                  {user.name ? user.name[0].toUpperCase() : "U"}
                </div>
                <span className="font-medium text-foreground truncate max-w-[120px]">
                  {user.name ? user.name.split(" ")[0] : "Counsel"}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface text-amber-600 dark:text-amber-400 border border-border">
                  P{user.priority} • {user.role}
                </span>
                <ChevronDown className={`w-3 h-3 text-foreground-muted transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-surface border border-border shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-border">
                    <div className="font-semibold text-foreground truncate">{user.name}</div>
                    <div className="text-[11px] font-mono text-foreground-secondary truncate">{user.email}</div>
                    <div className="mt-1.5 inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Award className="w-3 h-3" />
                      <span>Clearance P{user.priority} • {user.role}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-3.5 py-2 hover:bg-surface-secondary text-foreground transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-foreground-secondary" />
                      <span>Executive Profile & Clearance</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center space-x-2 px-3.5 py-2 hover:bg-surface-secondary text-foreground transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-foreground-secondary" />
                      <span>AI Providers & Credentials</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-border">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3.5 py-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary border border-border hover:bg-surface-tertiary text-xs font-medium text-foreground transition-colors"
            >
              <User className="w-3.5 h-3.5 text-foreground-secondary" />
              <span>Sign In</span>
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

            {/* User Profile & Logout Footer */}
            <div className="pt-4 border-t border-border space-y-3">
              {user ? (
                <div className="space-y-2">
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {user.name ? user.name[0].toUpperCase() : "U"}
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-foreground truncate">{user.name || user.email}</div>
                        <div className="text-[10px] font-mono text-foreground-secondary">
                          {user.role} • Priority P{user.priority}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-foreground-muted shrink-0" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border border-border hover:border-rose-500/30 hover:bg-rose-500/10 text-foreground-secondary hover:text-rose-600 text-xs font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out Session</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-2 px-3 rounded-lg bg-foreground text-canvas font-medium text-xs flex items-center justify-center space-x-2 shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In / Register</span>
                </Link>
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
