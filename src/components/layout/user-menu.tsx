"use client";

import { LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { LanguageToggle } from "@/components/language/language-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions/sign-out";
import { useDictionary } from "@/i18n/dictionary-provider";

interface UserMenuProps {
  displayNickname: string;
  avatarUrl: string;
  isAdmin: boolean;
}

/** First letter of the nickname for the avatar fallback. */
function initial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "?";
}

/**
 * Session identity + account menu. Surfaces profile/security links, an admin
 * entry (only for ADMIN profiles) and sign-out (existing server action).
 */
export function UserMenu({ displayNickname, avatarUrl, isAdmin }: UserMenuProps) {
  const dictionary = useDictionary();
  const t = dictionary.userMenu;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-9 gap-2 px-1.5 sm:pr-2.5"
            aria-label={t.trigger}
            data-testid="user-menu-trigger"
          >
            <Avatar size="sm">
              <AvatarImage src={avatarUrl || undefined} alt="" />
              <AvatarFallback>{initial(displayNickname)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
              {displayNickname}
            </span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{displayNickname}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem render={<Link href="/settings/profile" />} closeOnClick>
          <User aria-hidden="true" />
          {t.profile}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/settings/security" />} closeOnClick>
          <Shield aria-hidden="true" />
          {t.security}
        </DropdownMenuLinkItem>
        {isAdmin && (
          <DropdownMenuLinkItem
            render={<Link href="/admin" />}
            closeOnClick
            data-testid="user-menu-admin"
          >
            <Shield aria-hidden="true" />
            {t.admin}
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <LanguageToggle compact />
        </div>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem
            render={<button type="submit" />}
            nativeButton
            className="w-full text-destructive data-[highlighted]:text-destructive"
            data-testid="user-menu-sign-out"
          >
            <LogOut aria-hidden="true" />
            {t.signOut}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
