/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import {
  auth,
  db,
  cleanPayload,
  handleFirestoreError,
  testFirestoreConnection,
} from "./lib/firebase";
import {
  ReflectionSession,
  ReflectionAction,
  ReflectionCategory,
  ReflectionMessage,
  OperationType,
} from "./types";
import { Navbar } from "./components/Navbar";
import { LandingView } from "./components/LandingView";
import { SidebarHistory } from "./components/SidebarHistory";
import { ReflectionWorkspace } from "./components/ReflectionWorkspace";
import { ThreatModelModal } from "./components/ThreatModelModal";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [showThreatModal, setShowThreatModal] = useState(false);

  // Firestore reflection sessions state
  const [sessions, setSessions] = useState<ReflectionSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // AI generation and persistence state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Store last pending write for retry
  const pendingSaveRef = useRef<{ id: string; data: ReflectionSession } | null>(null);

  // 1. Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Test connection on boot
        const connected = await testFirestoreConnection();
        setIsOnline(connected);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore query for user-isolated reflections
  useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      setActiveSessionId(null);
      return;
    }

    setSessionsLoading(true);
    const reflectionsCollectionPath = `users/${currentUser.uid}/reflections`;

    try {
      const q = query(
        collection(db, "users", currentUser.uid, "reflections"),
        orderBy("updatedAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loaded: ReflectionSession[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as ReflectionSession;
            loaded.push({
              ...data,
              id: docSnap.id,
              messages: Array.isArray(data.messages) ? data.messages : [],
            });
          });

          setSessions(loaded);
          setSessionsLoading(false);

          // If no active session or current active was deleted, auto-select the first
          setActiveSessionId((prev) => {
            if (prev && loaded.some((s) => s.id === prev)) {
              return prev;
            }
            return loaded.length > 0 ? loaded[0].id : null;
          });
        },
        (err) => {
          console.error("Firestore onSnapshot error:", err);
          handleFirestoreError(err, OperationType.GET, reflectionsCollectionPath);
          setSessionsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize reflections listener:", error);
      handleFirestoreError(error, OperationType.LIST, reflectionsCollectionPath);
      setSessionsLoading(false);
    }
  }, [currentUser]);

  // Create a brand new reflection
  const handleNewSession = async () => {
    if (!currentUser) return;

    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession: ReflectionSession = {
      id: newId,
      userId: currentUser.uid,
      title: "New Reflection",
      category: "reflection",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSaveStatus("saving");
    setSaveErrorMsg(null);
    const path = `users/${currentUser.uid}/reflections/${newId}`;

    try {
      await setDoc(doc(db, "users", currentUser.uid, "reflections", newId), cleanPayload(newSession));
      setActiveSessionId(newId);
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("Error creating new reflection:", err);
      setSaveStatus("error");
      setSaveErrorMsg(err?.message || "Failed to create reflection in Firestore.");
      pendingSaveRef.current = { id: newId, data: newSession };
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  // Update session metadata (title, category, summary)
  const handleUpdateSession = async (updated: Partial<ReflectionSession>) => {
    if (!currentUser || !activeSessionId) return;

    const currentSession = sessions.find((s) => s.id === activeSessionId);
    if (!currentSession) return;

    const merged: ReflectionSession = {
      ...currentSession,
      ...updated,
      updatedAt: new Date().toISOString(),
    };

    setSaveStatus("saving");
    setSaveErrorMsg(null);
    const path = `users/${currentUser.uid}/reflections/${activeSessionId}`;

    try {
      await setDoc(
        doc(db, "users", currentUser.uid, "reflections", activeSessionId),
        cleanPayload(merged)
      );
      setSaveStatus("saved");
    } catch (err: any) {
      console.error("Error updating reflection session:", err);
      setSaveStatus("error");
      setSaveErrorMsg(err?.message || "Failed to update reflection in Firestore.");
      pendingSaveRef.current = { id: activeSessionId, data: merged };
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  // Delete reflection session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    const confirmed = window.confirm("Are you sure you want to delete this reflection? This cannot be undone.");
    if (!confirmed) return;

    const path = `users/${currentUser.uid}/reflections/${id}`;
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "reflections", id));
      if (activeSessionId === id) {
        const remaining = sessions.filter((s) => s.id !== id);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error("Error deleting reflection:", err);
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // Send conversation to server-side Gemini API & persist multi-turn exchange
  const handleSendConverse = async (
    prompt: string,
    action: ReflectionAction,
    category: ReflectionCategory
  ) => {
    if (!currentUser) return;

    // Resolve or create current active session
    let targetSession = sessions.find((s) => s.id === activeSessionId);
    let targetSessionId = activeSessionId;

    if (!targetSession || !targetSessionId) {
      targetSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      targetSession = {
        id: targetSessionId,
        userId: currentUser.uid,
        title: prompt.slice(0, 40) || "New Reflection",
        category,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActiveSessionId(targetSessionId);
    }

    // Append user message if non-empty
    const updatedMessages: ReflectionMessage[] = [...targetSession.messages];
    if (prompt) {
      updatedMessages.push({
        id: `msg_user_${Date.now()}`,
        sender: "user",
        content: prompt,
        timestamp: new Date().toISOString(),
        action,
      });
    }

    setIsGeneratingAI(true);
    setSaveStatus("saving");
    setSaveErrorMsg(null);

    try {
      // Call server-side Gemini endpoint with resilient fallback protocol
      const response = await fetch("/api/gemini/reflect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          category,
          action,
          history: updatedMessages.map((m) => ({
            sender: m.sender,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `Server returned error status ${response.status}`);
      }

      const aiData = await response.json();

      // Append Gemini AI response
      updatedMessages.push({
        id: `msg_gemini_${Date.now()}`,
        sender: "gemini",
        content: aiData.text,
        timestamp: new Date().toISOString(),
        action,
        modelUsed: aiData.modelUsed,
      });

      // Auto-set title if currently default and first user message
      let newTitle = targetSession.title;
      if ((!newTitle || newTitle === "New Reflection") && prompt) {
        newTitle = prompt.slice(0, 45).replace(/\n/g, " ") + (prompt.length > 45 ? "..." : "");
      }

      const updatedSessionDoc: ReflectionSession = {
        ...targetSession,
        title: newTitle,
        category,
        summary: action === "summarize" ? aiData.text : targetSession.summary,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      };

      // Guaranteed transaction verification: Save to Firestore with undefined-stripping
      const docPath = `users/${currentUser.uid}/reflections/${targetSessionId}`;
      await setDoc(
        doc(db, "users", currentUser.uid, "reflections", targetSessionId),
        cleanPayload(updatedSessionDoc)
      );

      setSaveStatus("saved");
    } catch (err: any) {
      console.error("AI or Persistence Error in reflection conversation:", err);
      setSaveStatus("error");
      setSaveErrorMsg(err?.message || "Failed to process reflection and save changes.");
      // Keep state intact so user can retry or preserve input
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Retry pending save if previous write was interrupted
  const handleRetrySave = async () => {
    if (!currentUser || !pendingSaveRef.current) return;
    const { id, data } = pendingSaveRef.current;
    setSaveStatus("saving");
    setSaveErrorMsg(null);

    const path = `users/${currentUser.uid}/reflections/${id}`;
    try {
      await setDoc(doc(db, "users", currentUser.uid, "reflections", id), cleanPayload(data));
      setSaveStatus("saved");
      pendingSaveRef.current = null;
    } catch (err: any) {
      setSaveStatus("error");
      setSaveErrorMsg(err?.message || "Retry save failed.");
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  };

  // Auth Loading View
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center text-[#e1e1e6]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#2d2d30] border-t-[#c4a67a] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[#8a8a93] uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Landing Screen
  if (!currentUser) {
    return (
      <>
        <LandingView onOpenThreatModal={() => setShowThreatModal(true)} />
        <ThreatModelModal
          isOpen={showThreatModal}
          onClose={() => setShowThreatModal(false)}
        />
      </>
    );
  }

  // Active session object
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || {
      id: "temporary",
      userId: currentUser.uid,
      title: "New Reflection",
      category: "reflection" as ReflectionCategory,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col text-[#e1e1e6]">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onOpenThreatModal={() => setShowThreatModal(true)}
        isOnline={isOnline}
      />

      {/* Main 2-Column Application Shell */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Past Reflections History */}
        <SidebarHistory
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => setActiveSessionId(id)}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          loading={sessionsLoading}
        />

        {/* Right Workspace: Multi-turn Reflection, AI Guidance & Executive Summaries */}
        <ReflectionWorkspace
          session={activeSession}
          onUpdateSession={handleUpdateSession}
          onSendConverse={handleSendConverse}
          isGeneratingAI={isGeneratingAI}
          saveStatus={saveStatus}
          saveErrorMsg={saveErrorMsg}
          onRetrySave={handleRetrySave}
        />
      </div>

      {/* Security Threat Model Modal */}
      <ThreatModelModal
        isOpen={showThreatModal}
        onClose={() => setShowThreatModal(false)}
      />
    </div>
  );
}
