"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Mail, KeyRound, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.requestOtp(email.trim());
      setStep("otp");
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtpCode(res.dev_otp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await api.verifyOtp(email.trim(), otpCode.trim());
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.requestOtp(demoEmail);
      const code = res.dev_otp || "123456";
      await api.verifyOtp(demoEmail, code);
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Demo login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col justify-center items-center p-4 relative transition-colors duration-150">
      {/* Top right theme switcher */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-block">
            <Logo />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Enterprise Document Security & Auditing
          </h2>
          <p className="text-xs text-foreground-secondary">
            Sign in via Passwordless Email + OTP with dynamic seniority authorization
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xl space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-foreground">
                  Work Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="counsel@acmelegal.com"
                    required
                    className="w-full bg-surface-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight font-sans"
                  />
                  <Mail className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-foreground text-canvas text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 min-h-[40px]"
              >
                <span>{isLoading ? "Sending 6-Digit OTP..." : "Send Verification Code"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium text-foreground">Enter 6-Digit OTP Code</label>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-foreground-secondary hover:text-foreground text-[11px] underline"
                  >
                    Change Email
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    required
                    className="w-full bg-surface-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-center tracking-widest text-foreground font-mono focus:outline-none focus:border-border-highlight"
                  />
                  <KeyRound className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                {devOtpHint && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    Dev Mode OTP Code: <strong>{devOtpHint}</strong>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-foreground text-canvas text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 min-h-[40px]"
              >
                <span>{isLoading ? "Verifying & Issuing Tokens..." : "Verify & Sign In"}</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Quick Demo Role Switcher */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between text-[11px] text-foreground-secondary font-mono">
              <span>Demo Personas (Pre-seeded RBAC):</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("admin@docusage.ai")}
                className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors"
              >
                <div className="font-medium text-foreground">Partner (Admin)</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">Priority 90 • Top Rank</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("senior@docusage.ai")}
                className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors"
              >
                <div className="font-medium text-foreground">Senior Counsel</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Priority 70 • Senior</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("associate@docusage.ai")}
                className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors"
              >
                <div className="font-medium text-foreground">Associate</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">Priority 40 • Mid-Level</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("junior@docusage.ai")}
                className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors"
              >
                <div className="font-medium text-foreground">Junior Analyst</div>
                <div className="text-[10px] text-foreground-secondary font-mono">Priority 20 • Junior</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
