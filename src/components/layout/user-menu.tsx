"use client";

import { LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
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
import { es } from "@/i18n/dictionaries/es";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-9 gap-2 px-1.5 sm:pr-2.5"
            aria-label={es.userMenu.trigger}
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
          {es.userMenu.profile}
        </DropdownMenuLinkItem>
        <DropdownMenuLinkItem render={<Link href="/settings/security" />} closeOnClick>
          <Shield aria-hidden="true" />
          {es.userMenu.security}
        </DropdownMenuLinkItem>
        {isAdmin && (
          <DropdownMenuLinkItem
            render={<Link href="/admin" />}
            closeOnClick
            data-testid="user-menu-admin"
          >
            <Shield aria-hidden="true" />
            {es.userMenu.admin}
          </DropdownMenuLinkItem>
        )}
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem
            render={<button type="submit" />}
            nativeButton
            className="w-full text-destructive data-[highlighted]:text-destructive"
            data-testid="user-menu-sign-out"
          >
            <LogOut aria-hidden="true" />
            {es.userMenu.signOut}
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
