import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  GitBranch,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const LandingView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err?.code === "auth/popup-blocked") {
        setErrorMsg(
          "The sign-in popup was blocked by your browser. Please allow popups for this site and try again.",
        );
      } else if (
        err?.code === "auth/cancelled-popup-request" ||
        err?.code === "auth/popup-closed-by-user"
      ) {
        setErrorMsg("Sign-in was cancelled. Please try again.");
      } else {
        setErrorMsg(
          err?.message || "Failed to sign in with Google. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/30">
              <Radar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">
                Trace
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Understand why your software broke
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
            Firebase auth • Firestore • Gemini
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
          <Sparkles className="h-3.5 w-3.5" /> Demo mode available with
          synthetic incident data
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Trace the root cause before the next incident spreads.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Trace connects GitHub activity, CI/CD failures, incidents,
              security findings, and engineering memory so teams can understand
              what failed, why it failed, and what to do next.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                id="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex items-center justify-center gap-3 rounded-xl bg-cyan-400 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-75"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" />
                    Opening Google Sign-In...
                  </>
                ) : (
                  <>
                    Sign in with Google
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-sm text-slate-300">
                <Lock className="h-4 w-4 text-cyan-300" />
                Authenticated project access only
              </div>
            </div>

            {errorMsg && (
              <div className="mt-5 flex max-w-md items-start gap-2 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Signal stack
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  Engineering intelligence
                </div>
              </div>
              <BookOpen className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="mt-5 space-y-4">
              {[
                {
                  title: "Repository intelligence",
                  detail:
                    "Architecture, changes, and risks summarised from connected repos",
                  icon: GitBranch,
                },
                {
                  title: "CI/CD root-cause review",
                  detail:
                    "Workflow failure evidence correlated with commits, PRs, and logs",
                  icon: Radar,
                },
                {
                  title: "Persistent engineering memory",
                  detail:
                    "Resolved incident lessons reused for future investigations",
                  icon: Sparkles,
                },
              ].map(({ title, detail, icon: Icon }) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-white">{title}</div>
                    <div className="mt-1 text-sm text-slate-400">{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
