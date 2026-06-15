import Link from "next/link";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { getProfile } from "@/features/profile/queries";
import { getDisplayNickname } from "@/features/profile/types";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const dictionary = getDictionary(await getRequestLocale());
  const navLinks = [
    { href: "/settings/profile", label: dictionary.settings.profile },
    { href: "/settings/security", label: dictionary.settings.security },
  ];
  const profile = await getProfile();
  if (!profile) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{dictionary.settings.title}</h1>
        <p className="text-sm text-muted-foreground">{getDisplayNickname(profile)}</p>
      </div>

      <div className="flex gap-8">
        <nav aria-label={dictionary.settings.navigation} className="w-40 shrink-0">
          <ul className="space-y-1">
            {navLinks.map(({ href, label }) => (
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
