"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/components/admin/sign-out-button";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const showSignOut = !pathname.startsWith("/admin/login");

  return (
    <div className="min-h-svh">
      {showSignOut ? (
        <div className="fixed top-4 right-4 z-50">
          <SignOutButton />
        </div>
      ) : null}
      {children}
    </div>
  );
}
