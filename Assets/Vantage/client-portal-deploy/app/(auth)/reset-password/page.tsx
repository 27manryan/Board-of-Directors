"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <p className="label mb-3">Client Portal</p>
            <h1 className="font-serif text-4xl font-semibold text-navy tracking-tight">
              Reset Password
            </h1>
            <div className="mt-4 mx-auto w-12 h-px bg-gold" />
          </div>

          {success ? (
            <div className="text-center space-y-6">
              <div className="bg-[#F3F7F0] border border-[#C4D8BE] px-4 py-3">
                <p className="text-xs text-[#3A5A30]">
                  Your password has been updated.
                </p>
              </div>
              <a href="/login" className="btn-ghost inline-block">
                Back to Sign In
              </a>
            </div>
          ) : !ready ? (
            <div className="text-center space-y-6">
              <p className="text-sm text-muted">
                Verifying your reset link…
              </p>
              <p className="text-xs text-muted">
                If this page doesn&apos;t update, your link may have expired.{" "}
                <a href="/login" className="btn-ghost">
                  Request a new one
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-[#FFF3F3] border border-[#E8C4C4] px-4 py-3">
                  <p className="text-xs text-[#7A3030]">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="password" className="label block mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="label block mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>

              <div className="text-center pt-2">
                <a href="/login" className="btn-ghost">
                  Back to Sign In
                </a>
              </div>
            </form>
          )}
        </div>
      </main>

      <footer className="py-6 px-4 text-center border-t border-[#ECE8E0]">
        <p className="text-xs text-muted">
          © 2026 Vantage Strategic Communications
        </p>
      </footer>
    </div>
  );
}
