import { AppHeader } from "@/components/layout/app-header";

/**
 * Layout for authenticated app routes (and admin). Mounts the global header.
 * Each page renders its own <main>, so this layout deliberately does not add one
 * (avoids nested <main>). Session/onboarding/admin gating lives in src/proxy.ts.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
