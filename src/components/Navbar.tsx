import React from "react";
import { User, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Sparkles, ShieldCheck, LogOut, BookOpen, AlertCircle } from "lucide-react";

interface NavbarProps {
  user: User;
  onOpenThreatModal: () => void;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onOpenThreatModal, isOnline }) => {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#141416]/95 backdrop-blur-md border-b border-[#2d2d30] text-[#e1e1e6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/40 flex items-center justify-center text-[#c4a67a] shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg tracking-tight text-white">
                Mindglass
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-serif italic text-[#c4a67a] bg-[#1a1a1c] px-2.5 py-0.5 rounded-full border border-[#c4a67a]/30">
                <Sparkles className="w-3 h-3 text-[#c4a67a]" />
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-[1.5px] text-[#8a8a93] hidden sm:block">
              Private Reflections &bull; Authenticated Journal
            </p>
          </div>
        </div>

        {/* Status & User Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Security & Threat Model Trigger */}
          <button
            id="threat-model-btn"
            onClick={onOpenThreatModal}
            className="flex items-center gap-1.5 text-xs font-medium text-[#8a8a93] hover:text-[#e1e1e6] bg-[#1a1a1c] hover:bg-[#222226] border border-[#2d2d30] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="View Agentic Threat Model & Security Safeguards"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#c4a67a]" />
            <span className="hidden md:inline">Security Architecture</span>
          </button>

          {/* Sync Status */}
          <div className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-[#1a1a1c] text-[#8a8a93] border border-[#2d2d30]">
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-400 shadow-xs shadow-emerald-500/50" : "bg-amber-500"
              }`}
            />
            <span className="hidden lg:inline text-[11px] uppercase tracking-wider text-[#8a8a93]">
              {isOnline ? "Firestore Isolated" : "Reconnecting"}
            </span>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-[#2d2d30]">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-[#c4a67a] object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#2d2d30] border border-[#c4a67a] text-[#c4a67a] flex items-center justify-center text-xs font-bold font-serif">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="hidden xl:block text-left text-xs leading-tight max-w-[130px] truncate">
              <p className="font-medium text-[#e1e1e6] truncate">
                {user.displayName || "User"}
              </p>
              <p className="text-[10px] text-[#8a8a93] truncate font-mono">{user.email}</p>
            </div>

            {/* Logout Button */}
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="p-1.5 text-[#8a8a93] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
