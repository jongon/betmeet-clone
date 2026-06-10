import Link from "next/link";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { getProfile } from "@/features/profile/queries";
import { getDisplayNickname } from "@/features/profile/types";

const NAV_LINKS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/security", label: "Security" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/auth/sign-in");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">{getDisplayNickname(profile)}</p>
      </div>

      <div className="flex gap-8">
        <nav aria-label="Settings navigation" className="w-40 shrink-0">
          <ul className="space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted aria-[current=page]:bg-muted aria-[current=page]:font-medium"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Separator orientation="vertical" className="h-auto" />

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
