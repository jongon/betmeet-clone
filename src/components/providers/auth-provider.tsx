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
      // Clear the cookie immediately so toast only shows once
      // biome-ignore lint/suspicious/noDocumentCookie: CookieStore API is not yet universally supported; this is the only deletion in the app
      document.cookie = "session_expired=; Max-Age=0; path=/";
      toast.error("Session expired", {
        description: "Please sign in again to continue.",
        duration: 5000,
      });
      router.push("/auth/sign-in");
    }
  }, [router]);

  return <>{children}</>;
}
