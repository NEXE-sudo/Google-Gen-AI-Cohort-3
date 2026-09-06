import React, { useState, useRef, useEffect } from "react";
import {
  ReflectionSession,
  ReflectionAction,
  ReflectionCategory,
  ReflectionMessage,
} from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import {
  Send,
  Sparkles,
  Lightbulb,
  FileText,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ReflectionWorkspaceProps {
  session: ReflectionSession;
  onUpdateSession: (updated: Partial<ReflectionSession>) => Promise<void>;
  onSendConverse: (
    prompt: string,
    action: ReflectionAction,
    category: ReflectionCategory
  ) => Promise<void>;
  isGeneratingAI: boolean;
  saveStatus: "saved" | "saving" | "error";
  saveErrorMsg: string | null;
  onRetrySave?: () => void;
}

export const ReflectionWorkspace: React.FC<ReflectionWorkspaceProps> = ({
  session,
  onUpdateSession,
  onSendConverse,
  isGeneratingAI,
  saveStatus,
  saveErrorMsg,
  onRetrySave,
}) => {
  const [inputPrompt, setInputPrompt] = useState("");
  const [activeAction, setActiveAction] = useState<ReflectionAction>("converse");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(session.title);
  const [showSummaryCard, setShowSummaryCard] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync title input with session
  useEffect(() => {
    setTitleInput(session.title);
  }, [session.title]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages, isGeneratingAI]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const trimmed = titleInput.trim() || "Untitled Reflection";
    if (trimmed !== session.title) {
      onUpdateSession({ title: trimmed });
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value as ReflectionCategory;
    onUpdateSession({ category: newCat });
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim() && activeAction !== "summarize") return;
    if (isGeneratingAI) return;

    const currentPrompt = inputPrompt.trim();
    // Do not clear prompt if it fails; let the parent handle success/failure
    await onSendConverse(currentPrompt, activeAction, session.category);
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const promptSuggestions = [
    "What was the most challenging conversation or task I had today, and what did it reveal?",
    "I am facing an important decision and weighing my options. Here is the dilemma...",
    "What are three things I am genuinely grateful for today, and why do they matter?",
    "I'm feeling stuck on a creative project. Can you help me brainstorm novel angles?",
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-[#0a0a0b] overflow-hidden">
      {/* Workspace Top Bar */}
      <div className="border-b border-[#2d2d30] px-6 py-3.5 bg-[#141416]/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3 text-[#e1e1e6]">
        {/* Title & Category */}
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {isEditingTitle ? (
            <input
              id="edit-title-input"
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
              autoFocus
              className="text-base sm:text-lg font-serif italic text-white bg-[#0a0a0b] border border-[#c4a67a] rounded-lg px-2.5 py-0.5 focus:outline-hidden"
              maxLength={150}
            />
          ) : (
            <h2
              id="session-title"
              onClick={() => setIsEditingTitle(true)}
              className="text-base sm:text-lg font-serif text-white hover:text-[#c4a67a] cursor-pointer transition-colors line-clamp-1 group flex items-center gap-2"
              title="Click to rename reflection"
            >
              <span>{session.title || "Untitled Reflection"}</span>
              <span className="text-xs text-[#8a8a93] font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                (edit)
              </span>
            </h2>
          )}

          {/* Category Dropdown */}
          <div className="relative">
            <select
              id="category-select"
              value={session.category}
              onChange={handleCategoryChange}
              className="text-xs font-semibold uppercase tracking-wider bg-[#1a1a1c] hover:bg-[#222226] text-[#c4a67a] border border-[#2d2d30] rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#c4a67a] cursor-pointer"
            >
              <option value="reflection">Reflection</option>
              <option value="brainstorm">Brainstorm</option>
              <option value="gratitude">Gratitude</option>
              <option value="summary">Summary</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Save Status Pill */}
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <div className="flex items-center gap-1.5 text-xs text-[#8a8a93] font-medium bg-[#1a1a1c] border border-[#2d2d30] px-2.5 py-1 rounded-full">
              <div className="w-3 h-3 border-2 border-[#2d2d30] border-t-[#c4a67a] rounded-full animate-spin" />
              <span>Saving to Firestore...</span>
            </div>
          )}

          {saveStatus === "saved" && (
            <div className="flex items-center gap-1.5 text-xs text-[#c4a67a] font-serif italic bg-[#1a1a1c] border border-[#c4a67a]/40 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5 text-[#c4a67a]" />
              <span>Saved in Firestore</span>
            </div>
          )}

          {saveStatus === "error" && (
            <div className="flex items-center gap-2 text-xs text-red-300 font-medium bg-red-950/40 border border-red-800 px-3 py-1 rounded-full">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Sync Error</span>
              {onRetrySave && (
                <button
                  id="retry-save-btn"
                  onClick={onRetrySave}
                  className="underline hover:text-red-200 font-semibold ml-1 cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Persistence Error Banner */}
      {saveStatus === "error" && saveErrorMsg && (
        <div className="bg-red-950/80 border-b border-red-800 px-6 py-2.5 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>Persistence Failure:</strong> {saveErrorMsg}. Your input was preserved.
            </span>
          </div>
          {onRetrySave && (
            <button
              onClick={onRetrySave}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-md font-semibold transition-colors shrink-0 cursor-pointer"
            >
              Retry Save
            </button>
          )}
        </div>
      )}

      {/* Summary Accordion Card if available */}
      {session.summary && (
        <div className="mx-6 mt-4 border border-[#2d2d30] bg-[#141416] rounded-xl overflow-hidden shadow-2xs">
          <button
            onClick={() => setShowSummaryCard(!showSummaryCard)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left text-[#c4a67a] font-serif italic text-xs hover:bg-[#1a1a1c] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c4a67a]" />
              <span>AI Executive Summary & Takeaways</span>
            </div>
            {showSummaryCard ? (
              <ChevronUp className="w-4 h-4 text-[#c4a67a]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#c4a67a]" />
            )}
          </button>
          {showSummaryCard && (
            <div className="p-4 border-t border-[#2d2d30] bg-[#121214] text-xs text-[#e1e1e6] leading-relaxed">
              <MarkdownRenderer content={session.summary} />
            </div>
          )}
        </div>
      )}

      {/* Conversation Turns Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 bg-radial-sophisticated">
        {session.messages.length === 0 ? (
          /* Empty State / Suggested Prompts */
          <div className="max-w-2xl mx-auto text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1c] text-[#c4a67a] border border-[#c4a67a]/40 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-serif text-white mb-2 tracking-tight">
              What is on your mind today?
            </h3>
            <p className="text-xs sm:text-sm text-[#8a8a93] mb-8 max-w-md mx-auto leading-relaxed">
              Write freely about your accomplishments, hurdles, or decisions.
              Gemini will provide reflective inquiry, brainstorm perspectives, and summarize key insights.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {promptSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputPrompt(suggestion)}
                  className="p-3.5 rounded-xl border border-[#2d2d30] bg-[#141416] hover:bg-[#1a1a1c] hover:border-[#c4a67a]/60 shadow-xs transition-all text-xs text-[#e1e1e6] leading-relaxed text-left cursor-pointer group"
                >
                  <span className="font-serif italic text-[#c4a67a] text-xs block mb-1">
                    Inquiry {idx + 1}
                  </span>
                  <span className="font-sans text-[#d4d4d8] group-hover:text-white transition-colors">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          session.messages.map((message) => {
            const isUser = message.sender === "user";
            return (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? "ml-auto justify-end" : "mr-auto justify-start"
                }`}
              >
                {/* Avatar for Gemini */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/40 text-[#c4a67a] flex items-center justify-center shrink-0 mt-1 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`relative group rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed max-w-[88%] sm:max-w-[82%] ${
                    isUser
                      ? "bg-[#141416] border border-[#2d2d30] text-[#e1e1e6] rounded-tr-xs shadow-xs"
                      : "bg-[#141416] border border-[#2d2d30] text-[#e1e1e6] rounded-tl-xs shadow-xs"
                  }`}
                >
                  {/* Badge & Model Metadata */}
                  {!isUser && (
                    <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-[#2d2d30] text-[10px] text-[#8a8a93] font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif italic text-[#c4a67a] font-semibold">Gemini AI</span>
                        {message.modelUsed && (
                          <span className="bg-[#1a1a1c] text-[#c4a67a] px-2 py-0.5 rounded border border-[#2d2d30] text-[10px]">
                            {message.modelUsed}
                          </span>
                        )}
                        {message.action && (
                          <span className="capitalize text-[#8a8a93]">
                            • {message.action}
                          </span>
                        )}
                      </div>

                      {/* Copy Action */}
                      <button
                        onClick={() => handleCopyText(message.id, message.content)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[#8a8a93] hover:text-[#e1e1e6] hover:bg-[#1a1a1c] rounded cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3.5 h-3.5 text-[#c4a67a]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Body Content */}
                  {isUser ? (
                    <p className="whitespace-pre-wrap font-serif italic text-base leading-relaxed text-white">
                      "{message.content}"
                    </p>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-2.5 text-[10px] uppercase tracking-wider ${
                      isUser ? "text-[#8a8a93] text-right" : "text-[#8a8a93]"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Thinking Indicator */}
        {isGeneratingAI && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-[#1a1a1c] border border-[#c4a67a]/40 text-[#c4a67a] flex items-center justify-center shrink-0 mt-1 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-[#141416] border border-[#2d2d30] rounded-2xl rounded-tl-xs p-4 text-xs text-[#c4a67a] shadow-xs flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#c4a67a] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#c4a67a] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-[#c4a67a] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="font-serif italic text-[#e1e1e6]">
                Gemini 3.6 Flash is synthesizing your reflection...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / Action Deck */}
      <div className="border-t border-[#2d2d30] p-4 sm:p-6 bg-[#0a0a0b]">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-3">
          {/* Action Selector Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[#8a8a93] font-medium text-[10px] uppercase tracking-wider mr-1 hidden sm:inline">
                AI Mode:
              </span>
              <button
                type="button"
                id="mode-converse-btn"
                onClick={() => setActiveAction("converse")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                  activeAction === "converse"
                    ? "bg-[#c4a67a] text-[#0a0a0b] font-semibold"
                    : "bg-[#141416] text-[#8a8a93] hover:text-[#e1e1e6] border border-[#2d2d30]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Reflect & Inquire</span>
              </button>

              <button
                type="button"
                id="mode-brainstorm-btn"
                onClick={() => setActiveAction("brainstorm")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                  activeAction === "brainstorm"
                    ? "bg-[#c4a67a] text-[#0a0a0b] font-semibold"
                    : "bg-[#141416] text-[#8a8a93] hover:text-[#e1e1e6] border border-[#2d2d30]"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Brainstorm Ideas</span>
              </button>

              <button
                type="button"
                id="mode-summarize-btn"
                onClick={() => setActiveAction("summarize")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                  activeAction === "summarize"
                    ? "bg-[#c4a67a] text-[#0a0a0b] font-semibold"
                    : "bg-[#141416] text-[#8a8a93] hover:text-[#e1e1e6] border border-[#2d2d30]"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Executive Summary</span>
              </button>
            </div>

            <div className="text-[11px] text-[#8a8a93] flex items-center gap-2">
              <span className="font-mono">{inputPrompt.length}/8000</span>
              <span className="hidden md:inline">• Press ⌘+Enter to send</span>
            </div>
          </div>

          {/* Textarea + Submit Button */}
          <div className="relative bg-[#141416] rounded-xl border border-[#2d2d30] focus-within:border-[#c4a67a] focus-within:ring-1 focus-within:ring-[#c4a67a]/40 shadow-xs transition-all">
            <textarea
              ref={textareaRef}
              id="reflection-input"
              rows={3}
              placeholder={
                activeAction === "summarize" && !inputPrompt
                  ? "Optional: Add any specific focus for the summary, or click Reflect to synthesize all entries..."
                  : activeAction === "brainstorm"
                  ? "Describe the challenge or idea you want to brainstorm..."
                  : "Continue your reflection..."
              }
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={8000}
              className="w-full resize-none p-3.5 text-xs sm:text-sm text-[#e1e1e6] placeholder-[#8a8a93] focus:outline-hidden leading-relaxed font-sans"
            />

            <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-[#2d2d30] bg-[#101012] rounded-b-xl">
              <div className="flex items-center gap-2 text-[11px] text-[#8a8a93]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#c4a67a]" />
                <span className="font-serif italic text-[#c4a67a]">Firestore Owner-Bound Isolation</span>
              </div>

              <button
                type="submit"
                id="send-reflection-btn"
                disabled={isGeneratingAI || (!inputPrompt.trim() && activeAction !== "summarize")}
                className="flex items-center gap-2 bg-[#c4a67a] hover:bg-[#b39569] active:bg-[#a38458] text-[#0a0a0b] text-xs font-semibold uppercase tracking-wider px-5 py-2 rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingAI ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#0a0a0b]/30 border-t-[#0a0a0b] rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Reflect</span>
                    <Send className="w-3.5 h-3.5 text-[#0a0a0b]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
