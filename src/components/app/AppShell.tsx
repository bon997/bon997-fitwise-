"use client";

import { createContext, useContext, useEffect } from "react";

const AndroidAppContext = createContext(false);

/** True inside the Play Store app: purchase buttons and upgrade links are hidden there (Google Play payments policy). */
export const useAndroidApp = () => useContext(AndroidAppContext);

/** Provides the app-mode flag and registers the offline service worker (production only). */
export function AppShell({ androidApp, children }: { androidApp: boolean; children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* offline page is a nice-to-have */ });
  }, []);
  return <AndroidAppContext.Provider value={androidApp}>{children}</AndroidAppContext.Provider>;
}
