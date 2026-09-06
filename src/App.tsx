/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, testFirestoreConnection } from "./lib/firebase";
import { LandingView } from "./components/LandingView";
import { TraceDashboard } from "./components/TraceDashboard";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        const connected = await testFirestoreConnection();
        setIsOnline(connected);
      }
    });

    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Verifying session...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LandingView />;
  }

  return <TraceDashboard />;
}
