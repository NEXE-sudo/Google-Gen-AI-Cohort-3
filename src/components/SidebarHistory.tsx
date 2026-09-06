import React, { useState } from "react";
import { ReflectionSession, ReflectionCategory } from "../types";
import {
  Plus,
  Search,
  BookOpen,
  Calendar,
  MessageSquare,
  Trash2,
  Sparkles,
  Tag,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";

interface SidebarHistoryProps {
  sessions: ReflectionSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  loading: boolean;
}

export const matchesSessionSearch = (
  session: Partial<ReflectionSession>,
  rawSearchTerm: string,
) => {
  const searchTerm = rawSearchTerm.trim().toLowerCase();

  if (!searchTerm) {
    return true;
  }

  const title = typeof session.title === "string" ? session.title : "";
  const summary = typeof session.summary === "string" ? session.summary : "";
  const messageText = Array.isArray(session.messages)
    ? session.messages
        .map((message) =>
          typeof message?.content === "string" ? message.content : "",
        )
        .join(" ")
    : "";

  return (
    title.toLowerCase().includes(searchTerm) ||
    summary.toLowerCase().includes(searchTerm) ||
    messageText.toLowerCase().includes(searchTerm)
  );
};

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = matchesSessionSearch(session, searchTerm);

    const matchesCategory =
      selectedCategory === "all" || session.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (cat: ReflectionCategory) => {
    switch (cat) {
      case "brainstorm":
        return "bg-[#1a1a1c] text-[#c4a67a] border-[#c4a67a]/40";
      case "summary":
        return "bg-[#1a1a1c] text-purple-300 border-purple-800/50";
      case "gratitude":
        return "bg-[#1a1a1c] text-rose-300 border-rose-800/50";
      case "reflection":
      default:
        return "bg-[#1a1a1c] text-amber-200/90 border-[#c4a67a]/30";
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return "Recent";
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-[#141416] border-r border-[#2d2d30] flex flex-col h-[calc(100vh-4rem)]">
      {/* Action Bar: New Reflection */}
      <div className="p-4 border-b border-[#2d2d30] space-y-3 bg-[#141416]">
        <button
          id="new-reflection-btn"
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 bg-[#c4a67a] hover:bg-[#b39569] active:bg-[#a38458] text-[#0a0a0b] font-semibold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#0a0a0b]" />
          <span>New Reflection</span>
        </button>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#8a8a93] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-reflections-input"
            type="text"
            placeholder="Search past reflections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0b] hover:bg-[#121214] focus:bg-[#0a0a0b] text-xs text-[#e1e1e6] placeholder-[#8a8a93] pl-9 pr-3 py-2 rounded-lg border border-[#2d2d30] focus:outline-hidden focus:ring-1 focus:ring-[#c4a67a] focus:border-[#c4a67a] transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-medium no-scrollbar">
          {["all", "reflection", "brainstorm", "gratitude", "summary"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors whitespace-nowrap cursor-pointer text-xs ${
                  selectedCategory === cat
                    ? "bg-[#c4a67a] text-[#0a0a0b] font-semibold"
                    : "bg-[#1a1a1c] text-[#8a8a93] hover:text-[#e1e1e6] border border-[#2d2d30]"
                }`}
              >
                {cat}
              </button>
            ),
          )}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#8a8a93] text-xs">
            <div className="w-6 h-6 border-2 border-[#2d2d30] border-t-[#c4a67a] rounded-full animate-spin mb-2" />
            <span>Loading your reflections...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-[#1a1a1c] border border-[#2d2d30] flex items-center justify-center text-[#c4a67a] mx-auto mb-3 shadow-2xs">
              <BookOpen className="w-6 h-6" />
            </div>
            <p className="text-sm font-serif italic text-[#e1e1e6]">
              No reflections found
            </p>
            <p className="text-xs text-[#8a8a93] mt-1 max-w-[200px] mx-auto">
              {searchTerm
                ? "Try a different search keyword."
                : "Begin by writing your first reflection with Gemini."}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const lastMsg =
              session.messages.length > 0
                ? session.messages[session.messages.length - 1].content
                : "No messages yet";

            return (
              <div
                key={session.id}
                id={`session-card-${session.id}`}
                onClick={() => onSelectSession(session.id)}
                className={`group relative p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#1a1a1c] border-[#c4a67a]/60 shadow-xs ring-1 ring-[#c4a67a]/30"
                    : "bg-[#141416] hover:bg-[#1a1a1c] border-[#2d2d30] hover:border-[#3f3f46]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-[1px] text-[#c4a67a] font-medium">
                    {formatDate(session.updatedAt)}
                  </span>
                  <button
                    id={`delete-session-${session.id}`}
                    onClick={(e) => onDeleteSession(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8a8a93] hover:text-red-400 hover:bg-red-950/30 rounded transition-opacity"
                    title="Delete reflection"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-serif italic text-sm text-[#e1e1e6] line-clamp-1 mb-1">
                  {session.title || "Untitled Reflection"}
                </h3>

                <p className="text-xs text-[#8a8a93] line-clamp-2 leading-relaxed mb-2 font-sans">
                  {session.summary ? `Summary: ${session.summary}` : lastMsg}
                </p>

                <div className="flex items-center justify-between text-[10px] text-[#8a8a93]">
                  <span
                    className={`px-1.5 py-0.5 rounded-sm capitalize border text-[9px] uppercase tracking-wider ${getCategoryColor(
                      session.category,
                    )}`}
                  >
                    {session.category}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#c4a67a]" />
                      {session.messages.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
