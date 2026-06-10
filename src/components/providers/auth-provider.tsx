"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const cookies = document.cookie.split(";").map((c) => c.trim());
    const hasExpired = cookies.some((c) => c.startsWith("session_expired="));

    if (hasExpired) {
      handledRef.current = true;
      // Clear the cookie so the toast only shows once. Use the CookieStore API
      // where available; otherwise the short-lived cookie expires on its own.
      window.cookieStore?.delete("session_expired");
      toast.error("Session expired", {
        description: "Please sign in again to continue.",
        duration: 5000,
      });
      router.push("/sign-in");
    }
  }, [router]);

  return <>{children}</>;
}
