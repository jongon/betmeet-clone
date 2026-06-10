"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAvatarUploadUrl } from "../actions/create-avatar-upload-url";
import { setAvatarFromDefaultSet } from "../actions/set-avatar-from-default-set";
import { setAvatarFromGoogle } from "../actions/set-avatar-from-google";
import { setAvatarFromUpload } from "../actions/set-avatar-from-upload";
import type { AvatarAsset } from "../types";
import { AvatarGrid } from "./avatar-grid";

interface AvatarSourceTabsProps {
  defaultAvatars: AvatarAsset[];
  googleAvatarUrl?: string | null;
  currentAvatarUrl: string;
  onAvatarChange?: (url: string) => void;
}

export function AvatarSourceTabs({
  defaultAvatars,
  googleAvatarUrl,
  currentAvatarUrl,
  onAvatarChange,
}: AvatarSourceTabsProps) {
  const [selectedDefaultId, setSelectedDefaultId] = useState<string | null>(
    defaultAvatars.find((avatar) => avatar.storageUrl === currentAvatarUrl)?.id ?? null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDefaultSelect(id: string, _url: string) {
    setSelectedDefaultId(id);
    const result = await setAvatarFromDefaultSet(id);
    if (result.success && result.avatarUrl) onAvatarChange?.(result.avatarUrl);
  }

  async function handleGoogleSelect() {
    const result = await setAvatarFromGoogle();
    if (result.success && result.avatarUrl) onAvatarChange?.(result.avatarUrl);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadPending(true);

    const urlResult = await createAvatarUploadUrl(file.type, file.size);
    if ("error" in urlResult && urlResult.error) {
      setUploadError(urlResult.error);
      setUploadPending(false);
      return;
    }

    if (!urlResult.signedUrl || !urlResult.storagePath) {
      setUploadError("Failed to get upload URL");
      setUploadPending(false);
      return;
    }

    // Direct client upload to Supabase Storage
    const uploadRes = await fetch(urlResult.signedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!uploadRes.ok) {
      setUploadError("Upload failed. Please try again.");
      setUploadPending(false);
      return;
    }

    const result = await setAvatarFromUpload(urlResult.storagePath);
    if (result.error) {
      setUploadError(result.error);
    } else if (result.avatarUrl) {
      onAvatarChange?.(result.avatarUrl);
    }
    setUploadPending(false);
  }

  return (
    <Tabs defaultValue="default">
      <TabsList className="w-full">
        <TabsTrigger value="default" className="flex-1">
          Default set
        </TabsTrigger>
        {googleAvatarUrl && (
          <TabsTrigger value="google" className="flex-1">
            Google
          </TabsTrigger>
        )}
        <TabsTrigger value="upload" className="flex-1">
          Upload
        </TabsTrigger>
      </TabsList>

      <TabsContent value="default" className="mt-4">
        <AvatarGrid
          avatars={defaultAvatars}
          selectedId={selectedDefaultId}
          onSelect={handleDefaultSelect}
        />
      </TabsContent>

      {googleAvatarUrl && (
        <TabsContent value="google" className="mt-4 flex flex-col items-center gap-4">
          <Image
            src={googleAvatarUrl}
            alt="Google profile picture"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover"
          />
          <Button onClick={handleGoogleSelect}>Use Google photo</Button>
        </TabsContent>
      )}

      <TabsContent value="upload" className="mt-4 space-y-4">
        <FormError messages={uploadError ? [uploadError] : undefined} />
        <div className="flex flex-col items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Upload avatar image"
            onChange={handleFileUpload}
          />
          <Button
            variant="outline"
            disabled={uploadPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadPending ? "Uploading…" : "Choose image"}
          </Button>
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 5 MB</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
