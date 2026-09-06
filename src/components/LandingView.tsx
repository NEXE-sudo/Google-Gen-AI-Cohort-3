import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";
import {
  Sparkles,
  ShieldCheck,
  Lock,
  MessageSquare,
  BookOpen,
  ArrowRight,
  Database,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface LandingViewProps {
  onOpenThreatModal: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onOpenThreatModal }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      // Specific Firebase Auth error handling
      if (err?.code === "auth/popup-blocked") {
        setErrorMsg("The sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else if (err?.code === "auth/cancelled-popup-request" || err?.code === "auth/popup-closed-by-user") {
        setErrorMsg("Sign-in was cancelled. Please try again.");
      } else {
        setErrorMsg(err?.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] bg-radial-sophisticated flex flex-col justify-between text-[#e1e1e6]">
      {/* Header Bar */}
      <header className="border-b border-[#2d2d30] bg-[#141416]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/40 flex items-center justify-center text-[#c4a67a] shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="font-serif text-lg tracking-tight text-white">
                Mindglass
              </span>
              <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#1a1a1c] text-[#c4a67a] border border-[#c4a67a]/30">
                Private AI Journal
              </span>
            </div>
          </div>

          <button
            id="landing-threat-model-btn"
            onClick={onOpenThreatModal}
            className="flex items-center gap-1.5 text-xs font-medium text-[#8a8a93] hover:text-white bg-[#1a1a1c] hover:bg-[#222226] border border-[#2d2d30] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#c4a67a]" />
            <span>Security & Threat Model</span>
          </button>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a1a1c] border border-[#c4a67a]/30 text-[#c4a67a] font-serif italic text-xs mb-6">
          <Lock className="w-3.5 h-3.5 text-[#c4a67a]" />
          User-Isolated Cloud Firestore &bull; Gemini 3.6 Flash
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-white tracking-tight leading-tight mb-6">
          A Private Journal That <br className="hidden sm:inline" />
          <span className="text-[#c4a67a] italic">Listens, Reframes & Mentors</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#8a8a93] mb-8 leading-relaxed font-sans">
          Record daily reflections, untangle complex dilemmas, and converse with Gemini 3.6 Flash.
          Every thought and AI response is securely saved to your isolated Firestore sandbox.
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="max-w-md mx-auto mb-6 p-3.5 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-200 flex items-start gap-2.5 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Authentication Notice</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Sign In CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            id="google-signin-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#c4a67a] hover:bg-[#b39569] active:bg-[#a38458] text-[#0a0a0b] rounded-xl font-semibold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed group cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0a0a0b]/30 border-t-[#0a0a0b] rounded-full animate-spin" />
                <span>Opening Google Sign-In...</span>
              </>
            ) : (
              <>
                {/* Google SVG Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#141416"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#141416"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#141416"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#141416"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          {/* Card 1 */}
          <div className="bg-[#141416] border border-[#2d2d30] p-6 rounded-2xl shadow-xs hover:border-[#3f3f46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/30 text-[#c4a67a] flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-base font-serif italic text-white mb-2">
              Multi-Turn Reflections
            </h2>
            <p className="text-xs text-[#8a8a93] leading-relaxed font-sans">
              Have an ongoing, insightful dialogue. Gemini asks guiding questions, mirrors key emotional themes, and reframes perspectives.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#141416] border border-[#2d2d30] p-6 rounded-2xl shadow-xs hover:border-[#3f3f46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/30 text-[#c4a67a] flex items-center justify-center mb-4">
              <Lightbulb className="w-5 h-5" />
            </div>
            <h2 className="text-base font-serif italic text-white mb-2">
              Brainstorm & Summarize
            </h2>
            <p className="text-xs text-[#8a8a93] leading-relaxed font-sans">
              Switch modes to explore creative options, brainstorm solutions to sticky problems, or generate crisp executive summaries.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#141416] border border-[#2d2d30] p-6 rounded-2xl shadow-xs hover:border-[#3f3f46] transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/30 text-[#c4a67a] flex items-center justify-center mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-base font-serif italic text-white mb-2">
              Strict User Isolation
            </h2>
            <p className="text-xs text-[#8a8a93] leading-relaxed font-sans">
              Protected by Firestore security rules requiring authenticated UID matching. No user can ever query or read another user's entries.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2d2d30] bg-[#141416] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8a8a93]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#c4a67a]" />
            <span>Zero-Hardcoding Hygiene &bull; Google Secret Manager Compatible</span>
          </div>
          <div>
            Powered by Google Cloud Run, Cloud Firestore & Gemini 3.6 Flash
          </div>
        </div>
      </footer>
    </div>
  );
};
