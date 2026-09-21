"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Logo } from "@/components/layout/Logo";
import {
  Mail,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  User,
  Building,
  Briefcase,
  Lock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

interface AuthFormProps {
  initialMode?: "login" | "signup";
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = "login" }) => {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode === "signup" && !name.trim()) {
      setErrorMsg("Please enter your full name to create an account.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = mode === "signup" 
        ? await api.requestOtp(email.trim(), "register")
        : await api.requestOtp(email.trim());
      setStep("otp");
      setResendCountdown(60);
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
        setOtpCode(res.dev_otp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to deliver OTP code.");
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
      await api.verifyOtp(email.trim(), otpCode.trim(), {
        name: mode === "signup" ? name.trim() : undefined,
        title: mode === "signup" && title.trim() ? title.trim() : undefined,
        department: mode === "signup" && department.trim() ? department.trim() : undefined,
      });
      if (mode === "signup") {
        router.push("/profile");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired verification code.");
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
      setErrorMsg(err.message || "Demo persona login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-block">
          <Logo />
        </div>
        <h2 className="text-lg font-semibold text-foreground tracking-tight">
          Enterprise Document Security & Auditing
        </h2>
        <p className="text-xs text-foreground-secondary">
          {mode === "login"
            ? "Sign in via passwordless email verification with cryptographic clearance"
            : "Register your identity and practice department for seniority-governed auditing"}
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Mode Toggle Bar */}
        <div className="grid grid-cols-2 p-1 bg-surface-secondary border border-border rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStep("form");
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-md transition-all ${
              mode === "login"
                ? "bg-surface text-foreground shadow-xs font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setStep("form");
              setErrorMsg(null);
            }}
            className={`py-1.5 rounded-md transition-all ${
              mode === "signup"
                ? "bg-surface text-foreground shadow-xs font-semibold"
                : "text-foreground-secondary hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === "form" ? (
          <form onSubmit={handleRequestOtp} className="space-y-3.5">
            {mode === "signup" && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-foreground">Full Legal Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Eleanor Vance, Esq."
                      required
                      className="w-full bg-surface-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                    />
                    <User className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-foreground">Professional Title</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Senior Counsel"
                        className="w-full bg-surface-secondary border border-border rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                      />
                      <Briefcase className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-foreground">Department</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Commercial M&A"
                        className="w-full bg-surface-secondary border border-border rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                      />
                      <Building className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-medium text-foreground">Corporate Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="counsel@acmelegal.com"
                  required
                  className="w-full bg-surface-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-border-highlight"
                />
                <Mail className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[10px] text-foreground-muted">
                {mode === "login"
                  ? "We'll send a single-use 6-digit verification code to this address."
                  : "Requires corporate domain for enterprise tenant affiliation."}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-foreground text-canvas text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 min-h-[42px]"
            >
              <span>
                {isLoading
                  ? "Sending Verification Code..."
                  : mode === "login"
                  ? "Send Verification Code"
                  : "Create Account & Send Code"}
              </span>
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
                  onClick={() => setStep("form")}
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
                  autoFocus
                  className="w-full bg-surface-secondary border border-border rounded-xl pl-9 pr-3 py-2 text-base text-center tracking-[0.3em] text-foreground font-mono focus:outline-none focus:border-border-highlight"
                />
                <KeyRound className="w-4 h-4 text-foreground-muted absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="flex items-center justify-between text-[11px] text-foreground-secondary">
                <span>Valid for 10 minutes</span>
                {resendCountdown > 0 ? (
                  <span className="font-mono">Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isLoading}
                    className="text-foreground hover:underline inline-flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                )}
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
              className="w-full py-2.5 px-4 rounded-xl bg-foreground text-canvas text-xs font-medium transition-opacity hover:opacity-90 flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50 min-h-[42px]"
            >
              <span>{isLoading ? "Verifying & Issuing Tokens..." : "Verify & Enter Workspace"}</span>
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Quick Demo Persona Switcher (For rapid testing & review) */}
        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex items-center justify-between text-[11px] text-foreground-secondary font-mono">
            <span>Pre-seeded Demo Personas:</span>
            <span className="text-[10px] text-foreground-muted">Instant Access</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("admin@docusage.ai")}
              className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors group"
            >
              <div className="font-medium text-foreground group-hover:text-amber-500 transition-colors">
                Partner (Admin)
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">P90 • Top Rank</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("senior@docusage.ai")}
              className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors group"
            >
              <div className="font-medium text-foreground group-hover:text-emerald-500 transition-colors">
                Senior Counsel
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">P70 • Senior</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("associate@docusage.ai")}
              className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors group"
            >
              <div className="font-medium text-foreground group-hover:text-blue-500 transition-colors">
                Associate
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">P40 • Mid-Level</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("junior@docusage.ai")}
              className="p-2.5 rounded-lg bg-surface-secondary border border-border hover:border-border-highlight text-left transition-colors group"
            >
              <div className="font-medium text-foreground group-hover:text-foreground-secondary transition-colors">
                Junior Analyst
              </div>
              <div className="text-[10px] text-foreground-secondary font-mono">P20 • Junior</div>
            </button>
          </div>
        </div>

        {/* Security & Compliance Trust Badge */}
        <div className="pt-2 border-t border-border flex items-center justify-center space-x-2 text-[10px] text-foreground-muted font-mono">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>SOC-2 Type II • 256-bit AES Enclave • Zero-Retention LLM</span>
        </div>
      </div>
    </div>
  );
};
