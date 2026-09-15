"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui";
import Identicon from "@/components/ui/identicon";
import { useToast } from "@/lib/toast";
import { compressImage } from "@/lib/image";
import { useUploadAvatar, useUpdateProfile } from "@/lib/api/hooks";
import { identityKey } from "@/lib/identity";

export default function EditProfileSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: { username: string; avatar: string };
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState(initial.username);
  const [avatar, setAvatar] = useState(initial.avatar);
  const uploadAvatar = useUploadAvatar();
  const updateProfile = useUpdateProfile();

  const pick = () => fileRef.current?.click();

  const onFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 512, 0.8);
      const uploaded = await uploadAvatar.mutateAsync(dataUrl);
      if (!uploaded.url) throw new Error("Upload failed");
      setAvatar(uploaded.url);
      toast("success", "Avatar updated.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const saving = updateProfile.isPending;

  const save = async () => {
    const name = username.trim();
    if (name && name.length < 3) {
      toast("error", "Username must be at least 3 characters.");
      return;
    }
    try {
      await updateProfile.mutateAsync({ username: name, avatar });
      toast("success", "Profile saved.");
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Could not save profile.");
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 pb-6 pt-1">
        <h2 className="mb-4 text-[17px] font-extrabold text-foreground">
          Edit Profile
        </h2>

        <div className="flex flex-col items-center gap-3">
          <button onClick={pick} className="relative" aria-label="Change avatar">
            <span className="block h-24 w-24 overflow-hidden rounded-full border-2 border-accent-2">
              {avatar ? (
                <Image
                  src={avatar}
                  alt="Avatar"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Identicon seed={identityKey()} size={96} />
              )}
            </span>
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-2">
              {uploadAvatar.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Camera size={15} />
              )}
            </span>
          </button>
          <p className="text-[12px] text-muted">Tap to add or change your avatar</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-muted">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            placeholder="e.g. wanderluster"
            className="h-[43px] w-full rounded-[10px] border border-border bg-card px-3 text-[16px] text-foreground outline-none placeholder:text-muted"
          />
        </label>

        <button
          onClick={save}
          disabled={saving}
          className="tap mt-5 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : null} Save Profile
        </button>
      </div>
    </Sheet>
  );
}