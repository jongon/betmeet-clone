"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkNicknameAvailability } from "../actions/check-nickname-availability";
import { setNickname } from "../actions/set-nickname";
import { generateNicknameSuggestions } from "../services/nickname";

interface NicknameStepProps {
  onComplete: (nickname: string) => void;
}

export function NicknameStep({ onComplete }: NicknameStepProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [suggestions] = useState(() => generateNicknameSuggestions(5));
  const [isPending, startTransition] = useTransition();

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
        <h2 className="text-xl font-semibold">Choose your nickname</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how other players will identify you. A unique #discriminator is added
          automatically.
        </p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="nicknameBase">Nickname</Label>
          <div className="flex gap-2">
            <Input
              id="nicknameBase"
              name="nicknameBase"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setAvailable(null);
              }}
              onBlur={handleAvailabilityCheck}
              placeholder="e.g. SwiftEagle"
              maxLength={20}
              aria-describedby="nickname-hint"
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Continue"}
            </Button>
          </div>
          <p id="nickname-hint" className="text-xs text-muted-foreground">
            3–20 characters. Letters, numbers, _ and - only.
          </p>
          {available === true && (
            <p className="text-xs text-green-600" role="status">
              Available!
            </p>
          )}
          {available === false && !error && (
            <p className="text-xs text-destructive" role="status">
              This nickname is fully taken.
            </p>
          )}
          <FormError messages={error ? [error] : undefined} />
        </div>
      </form>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Suggestions</p>
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
    </div>
  );
}
