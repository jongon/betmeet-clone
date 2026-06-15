"use client";

import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/dictionary-provider";
import { checkNicknameAvailability } from "../actions/check-nickname-availability";
import { setNickname } from "../actions/set-nickname";
import { generateNicknameSuggestions } from "../services/nickname-suggestions";

interface NicknameStepProps {
  onComplete: (nickname: string) => void;
}

export function NicknameStep({ onComplete }: NicknameStepProps) {
  const dictionary = useDictionary();
  const t = dictionary.onboarding;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function ensureSuggestions() {
    if (suggestions.length === 0) {
      setSuggestions(generateNicknameSuggestions(5));
    }
  }

  async function handleAvailabilityCheck() {
    if (!value) return;
    const result = await checkNicknameAvailability(value);
    setAvailable(result.available);
    if (result.error) setError(result.error);
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await setNickname(formData);
    if (result.error) {
      setError(result.error);
    } else if (result.nickname) {
      onComplete(result.nickname);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t.nicknameTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.nicknameDescription}</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nicknameBase">{t.nicknameLabel}</Label>
          <div className="flex gap-2">
            <Input
              id="nicknameBase"
              name="nicknameBase"
              value={value}
              onChange={(e) => {
                ensureSuggestions();
                setValue(e.target.value);
                setAvailable(null);
              }}
              onFocus={ensureSuggestions}
              onBlur={handleAvailabilityCheck}
              placeholder="e.g. SwiftEagle"
              maxLength={20}
              aria-describedby="nickname-hint"
            />
            <Button type="submit">{dictionary.common.continue}</Button>
          </div>
          <p id="nickname-hint" className="text-xs text-muted-foreground">
            {t.nicknameHint}
          </p>
          {available === true && (
            <p className="text-xs text-green-600" role="status">
              {t.nicknameAvailable}
            </p>
          )}
          {available === false && !error && (
            <p className="text-xs text-destructive" role="status">
              {t.nicknameTaken}
            </p>
          )}
          <FormError messages={error ? [error] : undefined} />
        </div>
      </form>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{t.nicknameSuggestions}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => setValue(s)}>
                <Badge variant="secondary" className="cursor-pointer">
                  {s}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
