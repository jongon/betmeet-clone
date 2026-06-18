"use client";

import { type KeyboardEvent, useRef, useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDictionary } from "@/i18n/dictionary-provider";
import { createDirectedInvite } from "../actions/create-directed-invite";
import { searchNicknames } from "../actions/search-nicknames";
import type { SearchNicknameResult } from "../types";

export function DirectedInviteForm({ poolId }: { poolId: string }) {
  const t = useDictionary().pools;
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [suggestions, setSuggestions] = useState<SearchNicknameResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setTarget(value);

    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2 || value.includes("@")) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const result = await searchNicknames({ query: value.trim() });
      setSearchLoading(false);
      if ("error" in result) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
      setSuggestions(result);
      setHighlightIndex(-1);
      setShowDropdown(result.length > 0);
    }, 250);
  }

  function selectSuggestion(s: SearchNicknameResult) {
    setTarget(`${s.nicknameBase}#${s.nicknameDiscriminator}`);
    setShowDropdown(false);
    setSuggestions([]);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }
  }

  function handleBlur() {
    blurTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
      setHighlightIndex(-1);
    }, 150);
  }

  function submit() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createDirectedInvite({ poolId, target });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setTarget("");
      setMessage(result?.pushQueued ? t.inviteSentPush : t.inviteSaved);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid="directed-invite-form">
      <div>
        <p className="font-medium">{t.inviteByNickname}</p>
        <p className="text-sm text-muted-foreground">{t.inviteDescription}</p>
      </div>
      <FormError messages={error ? [error] : undefined} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={target}
            onChange={(event) => handleChange(event.target.value)}
            placeholder={t.invitePlaceholder}
            aria-label={t.inviteAria}
            data-testid="directed-invite-input"
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowDropdown(true);
              }
            }}
          />
          {showDropdown && (
            <div
              className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto"
              data-testid="directed-invite-dropdown"
            >
              {searchLoading ? (
                <div className="p-2 text-center text-sm text-muted-foreground">...</div>
              ) : (
                <div role="listbox">
                  {suggestions.map((s, i) => (
                    <div
                      key={s.userId}
                      role="option"
                      aria-selected={i === highlightIndex}
                      tabIndex={-1}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm ${
                        i === highlightIndex ? "bg-accent" : "hover:bg-accent"
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(s);
                      }}
                      data-testid={`suggestion-${i}`}
                    >
                      {/* biome-ignore lint/performance/noImgElement: 24px avatars in dropdown list, next/Image is unnecessary overhead */}
                      <img
                        src={s.avatarUrl ?? undefined}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                      <span>
                        {s.nicknameBase}#{s.nicknameDiscriminator}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <Button type="button" disabled={pending || target.trim().length < 3} onClick={submit}>
          {t.inviteSubmit}
        </Button>
      </div>
    </div>
  );
}
