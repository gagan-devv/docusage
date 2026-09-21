"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { CheckCircle2, ArrowRight, ShieldCheck, LogIn } from "lucide-react";

export default function LogoutPage() {
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    api.logout().finally(() => {
      setIsLoggedOut(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col justify-center items-center p-4 relative transition-colors duration-150">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-block">
          <Logo />
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              Session Terminated Securely
            </h2>
            <p className="text-xs text-foreground-secondary">
              Your cryptographic tokens and local clearance sessions have been revoked.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-surface-secondary border border-border text-[11px] font-mono text-foreground-secondary space-y-1 text-left">
            <div className="flex items-center space-x-2 text-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold">Security Confirmation</span>
            </div>
            <p className="text-foreground-muted pl-6">
              • Access Token: Invalidated<br />
              • Refresh Token Family: Revoked on Server<br />
              • Enclave Session: Flushed
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-xl bg-foreground text-canvas text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center space-x-2 shadow-xs min-h-[42px]"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign Back In</span>
            </Link>

            <Link
              href="/"
              className="w-full py-2.5 px-4 rounded-xl bg-surface-secondary border border-border hover:bg-surface-tertiary text-foreground text-xs font-medium transition-colors flex items-center justify-center space-x-2 min-h-[42px]"
            >
              <span>Explore Public View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
