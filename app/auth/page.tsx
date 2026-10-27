"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthMode = "signin" | "signup" | "recover" | "reset" | "confirm";
type PendingAction = "signin" | "signup" | "recover" | "reset" | "resend" | null;

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function readCallbackMode() {
  return new URLSearchParams(window.location.search).get("mode");
}

function readCallbackError() {
  return new URLSearchParams(window.location.search).get("error_description");
}

const buttonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-brand-button px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-button-hover disabled:cursor-not-allowed disabled:opacity-60";

const fieldClass =
  "mt-2 block min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:border-brand";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const callbackMode = useSyncExternalStore(subscribeToLocation, readCallbackMode, () => null);
  const callbackError = useSyncExternalStore(subscribeToLocation, readCallbackError, () => null);
  const router = useRouter();
  const activeMode: AuthMode =
    callbackMode === "confirm" ? "confirm" :
    callbackMode === "recovery" ? "reset" :
    mode;
  const visibleError = error || callbackError;

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setRecoveryReady(true);
        setError(null);
        setNotice(null);
      }

      if (event === "SIGNED_IN" && new URLSearchParams(window.location.search).get("mode") === "confirm") {
        router.replace("/dashboard");
        router.refresh();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  function clearFeedback() {
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearFeedback();

    if ((activeMode === "signup" || activeMode === "reset") && password !== passwordConfirmation) {
      setError("The passwords do not match.");
      return;
    }

    const action = activeMode === "confirm" ? null : activeMode;
    if (action !== "signin" && action !== "signup" && action !== "recover" && action !== "reset") {
      return;
    }

    setPending(action);
    try {
      if (action === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setError(signInError.message);
          return;
        }
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      if (action === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?mode=confirm`,
          },
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        setNotice("Check your inbox for a confirmation link. You can resend it here if needed.");
        return;
      }

      if (action === "recover") {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=recovery`,
        });
        if (recoveryError) {
          setError(recoveryError.message);
          return;
        }
        setNotice("If an account exists for that address, a password reset link is on its way.");
        return;
      }

      if (!recoveryReady) {
        setError("Open the password reset link from your email to continue.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setPassword("");
      setPasswordConfirmation("");
      setMode("signin");
      setNotice("Your password has been updated. You can continue to your dashboard.");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("We could not reach the authentication service. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  async function resendConfirmation() {
    clearFeedback();
    setPending("resend");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth?mode=confirm`,
        },
      });
      if (resendError) {
        setError(resendError.message);
        return;
      }
      setNotice("If that address has a pending signup, a new confirmation link is on its way.");
    } catch {
      setError("We could not resend the confirmation email. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }

  function switchMode(nextMode: AuthMode) {
    clearFeedback();
    setPassword("");
    setPasswordConfirmation("");
    if (window.location.search) {
      window.history.replaceState(null, "", "/auth");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    setMode(nextMode);
  }

  const isFormMode = activeMode === "signin" || activeMode === "signup" || activeMode === "recover" || activeMode === "reset";
  const title =
    activeMode === "signup" ? "Create your account" :
    activeMode === "recover" ? "Reset your password" :
    activeMode === "reset" ? "Choose a new password" :
    "Welcome back";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/30 md:min-h-[610px] md:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-surface-raised p-10 md:flex">
          <div className="absolute -right-20 -top-20 size-64 rounded-full border border-brand/15" aria-hidden="true" />
          <div className="absolute -right-10 -top-10 size-44 rounded-full border border-brand/20" aria-hidden="true" />
          <Link href="/" className="relative text-lg font-bold tracking-tight text-foreground">
            Wanky <span className="text-brand">Cloud</span>
          </Link>
          <div className="relative max-w-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Cloud infrastructure
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Everything you need to build in the cloud.
            </h1>
            <p className="mt-5 text-sm leading-6 text-muted">
              Sign in to manage your Wanky Cloud account and applications.
            </p>
          </div>
          <p className="relative text-xs text-muted">
            © {new Date().getFullYear()} Wanky Cloud
          </p>
        </aside>

        <section className="flex items-center justify-center p-6 sm:p-10 md:p-12">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 inline-block text-lg font-bold tracking-tight text-foreground md:hidden">
              Wanky <span className="text-brand">Cloud</span>
            </Link>

            {activeMode === "confirm" ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Email confirmation</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">Check your inbox</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Use the confirmation link we sent to finish creating your account. This page will continue to your dashboard when confirmation succeeds.
                </p>
                {visibleError && <p role="alert" className="mt-5 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm text-danger-text">{visibleError}</p>}
                <label className="mt-6 block text-sm font-medium" htmlFor="confirmation-email">
                  Email address
                  <input
                    id="confirmation-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={fieldClass}
                    placeholder="you@example.com"
                  />
                </label>
                <button type="button" onClick={() => switchMode("signup")} className="mt-6 text-sm font-medium text-brand transition-colors hover:text-brand-hover">
                  Back to account creation
                </button>
                <button
                  type="button"
                  disabled={pending !== null || !email.trim()}
                  onClick={() => void resendConfirmation()}
                  className="mt-4 block text-sm text-muted transition-colors hover:text-brand disabled:opacity-60"
                >
                  {pending === "resend" ? "Sending…" : "Resend confirmation email"}
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                  Your cloud workspace
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {activeMode === "signup" && "Create an account to get started with Wanky Cloud."}
                  {activeMode === "signin" && "Sign in to continue to your Wanky Cloud dashboard."}
                  {activeMode === "recover" && "Enter your account email and we’ll send you a secure reset link."}
                  {activeMode === "reset" && "Choose a new password for your Wanky Cloud account."}
                </p>

                {(activeMode === "signin" || activeMode === "signup") && (
                  <div className="mt-7 grid grid-cols-2 rounded-lg border border-border bg-background p-1" role="group" aria-label="Account access">
                    <button
                      type="button"
                      aria-pressed={activeMode === "signin"}
                      onClick={() => switchMode("signin")}
                      className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${activeMode === "signin" ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      aria-pressed={activeMode === "signup"}
                      onClick={() => switchMode("signup")}
                      className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${activeMode === "signup" ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground"}`}
                    >
                      Create account
                    </button>
                  </div>
                )}

                {visibleError && (
                  <p role="alert" className="mt-5 rounded-lg border border-danger-border bg-danger-surface p-3 text-sm leading-5 text-danger-text">
                    {visibleError}
                  </p>
                )}
                {activeMode === "reset" && !recoveryReady && (
                  <div role="status" className="mt-5 rounded-lg border border-border bg-surface-raised p-3 text-sm leading-5 text-muted">
                    Open the reset link from your email to activate this form, or request a new link.
                    <button type="button" onClick={() => switchMode("recover")} className="ml-1 font-medium text-brand hover:text-brand-hover">
                      Request a new link
                    </button>
                  </div>
                )}
                {notice && (
                  <div role="status" className="mt-5 rounded-lg border border-brand/40 bg-brand-soft p-3 text-sm leading-5 text-brand">
                    <p>{notice}</p>
                    {activeMode === "signup" && (
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => void resendConfirmation()}
                        className="mt-2 font-semibold underline decoration-brand/50 underline-offset-4 hover:text-brand-hover disabled:opacity-60"
                      >
                        {pending === "resend" ? "Sending…" : "Resend confirmation email"}
                      </button>
                    )}
                  </div>
                )}

                {isFormMode && (
                  <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                    {activeMode !== "reset" && (
                      <label className="block text-sm font-medium" htmlFor="auth-email">
                        Email address
                        <input
                          id="auth-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          required
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className={fieldClass}
                          placeholder="you@example.com"
                        />
                      </label>
                    )}

                    {(activeMode === "signin" || activeMode === "signup" || activeMode === "reset") && (
                      <>
                        <label className="block text-sm font-medium" htmlFor="auth-password">
                          {activeMode === "reset" ? "New password" : "Password"}
                          <input
                            id="auth-password"
                            name="password"
                            type="password"
                            autoComplete={activeMode === "signin" ? "current-password" : "new-password"}
                            minLength={activeMode === "signin" ? undefined : 6}
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className={fieldClass}
                            placeholder={activeMode === "signin" ? "Enter your password" : "At least 6 characters"}
                          />
                        </label>
                        {(activeMode === "signup" || activeMode === "reset") && (
                          <label className="block text-sm font-medium" htmlFor="auth-password-confirmation">
                            Confirm password
                            <input
                              id="auth-password-confirmation"
                              name="password-confirmation"
                              type="password"
                              autoComplete="new-password"
                              minLength={6}
                              required
                              value={passwordConfirmation}
                              onChange={(event) => setPasswordConfirmation(event.target.value)}
                              className={fieldClass}
                              placeholder="Re-enter your password"
                            />
                          </label>
                        )}
                      </>
                    )}

                    {activeMode === "signin" && (
                      <div className="-mt-2 text-right">
                        <button type="button" onClick={() => switchMode("recover")} className="text-sm text-brand transition-colors hover:text-brand-hover">
                          Forgot password?
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={pending !== null || (activeMode === "reset" && !recoveryReady)}
                      className={buttonClass}
                    >
                      {pending === "signin" ? "Signing in…" :
                        pending === "signup" ? "Creating account…" :
                        pending === "recover" ? "Sending reset link…" :
                        pending === "reset" ? "Updating password…" :
                        activeMode === "signin" ? "Sign in" :
                        activeMode === "signup" ? "Create account" :
                        activeMode === "recover" ? "Send reset link" : "Update password"}
                    </button>

                    {(activeMode === "recover" || activeMode === "reset") && (
                      <button type="button" onClick={() => switchMode("signin")} className="w-full text-center text-sm text-muted transition-colors hover:text-brand">
                        Back to sign in
                      </button>
                    )}
                  </form>
                )}
              </>
            )}

            <p className="mt-10 text-center text-xs text-muted md:hidden">
              © {new Date().getFullYear()} Wanky Cloud
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
