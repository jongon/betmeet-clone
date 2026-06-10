"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AvatarAsset } from "../types";
import { AvatarSourceTabs } from "./avatar-source-tabs";

interface AvatarStepProps {
  defaultAvatars: AvatarAsset[];
  currentAvatarUrl: string;
  googleAvatarUrl?: string | null;
  onComplete: () => void;
}

export function AvatarStep({
  defaultAvatars,
  currentAvatarUrl,
  googleAvatarUrl,
  onComplete,
}: AvatarStepProps) {
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Choose your avatar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige una imagen que te represente en tu liga.
        </p>
      </div>

      <div className="flex justify-center">
        <Image
          src={previewUrl}
          alt="Your current avatar"
          width={96}
          height={96}
          className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
          unoptimized
        />
      </div>

      <AvatarSourceTabs
        defaultAvatars={defaultAvatars}
        googleAvatarUrl={googleAvatarUrl}
        currentAvatarUrl={previewUrl}
        onAvatarChange={setPreviewUrl}
      />

      <Button className="w-full" onClick={onComplete}>
        Continue with this avatar
      </Button>
    </div>
  );
}
