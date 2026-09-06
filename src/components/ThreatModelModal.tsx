import React from "react";
import { X, ShieldAlert, CheckCircle2, Lock, Key, Server, Database } from "lucide-react";

interface ThreatModelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThreatModelModal: React.FC<ThreatModelModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141416] rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto border border-[#2d2d30] shadow-2xl p-6 text-[#e1e1e6]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2d30]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/40 text-[#c4a67a] flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-serif text-white tracking-tight">
                Agentic Threat Model & Security Controls
              </h2>
              <p className="text-xs text-[#8a8a93]">
                OWASP Top 10 + LLM Security Directives Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8a8a93] hover:text-white hover:bg-[#1a1a1c] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-6 text-sm">
          <div>
            <h3 className="font-serif italic text-[#c4a67a] text-sm mb-2">
              The 5 Agentic Threat Zones
            </h3>
            <div className="overflow-x-auto border border-[#2d2d30] rounded-xl">
              <table className="min-w-full divide-y divide-[#2d2d30] text-xs text-left">
                <thead className="bg-[#1a1a1c] font-serif italic text-[#c4a67a]">
                  <tr>
                    <th className="px-3 py-2.5">Threat Zone</th>
                    <th className="px-3 py-2.5">Risk & Vector</th>
                    <th className="px-3 py-2.5">Production Countermeasures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d2d30]">
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-white">1. Input Surfaces</td>
                    <td className="px-3 py-2.5 text-[#8a8a93]">Prompt injection, payload tampering, oversized entries</td>
                    <td className="px-3 py-2.5 text-[#d4d4d8]">
                      Strict character caps (8,000 chars), defensive JSON sanitization, undefined-stripping prior to Firestore writes.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-white">2. Planning & Reasoning</td>
                    <td className="px-3 py-2.5 text-[#8a8a93]">System prompt escape, role hijacking, jailbreaks</td>
                    <td className="px-3 py-2.5 text-[#d4d4d8]">
                      Hardened system instructions, contextual data sandboxing, output encoding before markdown rendering.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-white">3. Tool Execution</td>
                    <td className="px-3 py-2.5 text-[#8a8a93]">Model outage, API key exposure, excessive quota denial</td>
                    <td className="px-3 py-2.5 text-[#d4d4d8]">
                      Server-side API proxy with Gemini Resilient Fallback Ladder (3.6 Flash &rarr; 3.1 Flash-Lite &rarr; Dynamic &rarr; 3.7 Flash).
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-white">4. Memory & State</td>
                    <td className="px-3 py-2.5 text-[#8a8a93]">Cross-user data leakage, unauthorized journal reads</td>
                    <td className="px-3 py-2.5 text-[#d4d4d8]">
                      Cloud Firestore security rules matching <code className="bg-[#0a0a0b] text-[#c4a67a] px-1 py-0.5 rounded border border-[#2d2d30]">request.auth.uid == userId</code> and global catch-all default-deny.
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-white">5. Inter-System Comm</td>
                    <td className="px-3 py-2.5 text-[#8a8a93]">Credential leakage, plain-text token interception</td>
                    <td className="px-3 py-2.5 text-[#d4d4d8]">
                      Google Sign-In via Firebase Auth (no password storage), runtime environment injection & Google Secret Manager.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#1a1a1c] border border-[#2d2d30] rounded-xl p-4">
            <h4 className="font-serif italic text-[#c4a67a] text-xs flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#c4a67a]" />
              Active Firestore Security Rules Enforcement
            </h4>
            <pre className="text-[11px] font-mono bg-[#0a0a0b] p-3 rounded-lg border border-[#2d2d30] overflow-x-auto text-[#c4a67a]">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId}/reflections/{reflectionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#2d2d30] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#c4a67a] hover:bg-[#b39569] text-[#0a0a0b] rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
          >
            Close Security Summary
          </button>
        </div>
      </div>
    </div>
  );
};
