"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, MapPin, X } from "lucide-react";
import { Sheet } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { compressImage } from "@/lib/image";
import { postMoment, uploadFeedImage } from "@/lib/feed-client";
import type { FeedMoment } from "@/lib/feed";

const MAX_PHOTOS = 2;

export default function ShareMomentSheet({
  open,
  onClose,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  onPosted?: (moment: FeedMoment) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [posting, setPosting] = useState(false);

  const pick = () => fileRef.current?.click();

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const slots = MAX_PHOTOS - images.length;
    if (slots <= 0) {
      toast("info", "Up to 2 photos allowed.");
      return;
    }
    const picked = Array.from(files).slice(0, slots);
    for (const file of picked) {
      try {
        const dataUrl = await compressImage(file);
        setImages((prev) => (prev.length < MAX_PHOTOS ? [...prev, dataUrl] : prev));
      } catch {
        toast("error", "Could not read that image.");
      }
    }
  };

  const removeImage = (index: number) =>
    setImages((prev) => prev.filter((_, i) => i !== index));

  const reset = () => {
    setImages([]);
    setCaption("");
    setLocation("");
    setPosting(false);
  };

  const post = async () => {
    if (images.length < 1) {
      toast("info", "Add at least one photo.");
      return;
    }
    setPosting(true);
    try {
      const urls: string[] = [];
      for (const dataUrl of images) {
        const uploaded = await uploadFeedImage(dataUrl);
        if (!uploaded.url) throw new Error(uploaded.error ?? "Upload failed");
        urls.push(uploaded.url);
      }
      const result = await postMoment({
        caption: caption.trim(),
        location: location.trim() || undefined,
        images: urls,
      });
      if (!result.moment) throw new Error(result.error ?? "Post failed");
      toast("success", "Your moment is live!");
      reset();
      onPosted?.(result.moment);
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Post failed.");
    } finally {
      setPosting(false);
    }
  };

  const slots = [0, 1];

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="px-4 pb-6 pt-1">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-foreground">
            Share Your Moment
          </h2>
          <button
            onClick={post}
            disabled={posting || images.length < 1}
            className="flex h-[29px] items-center rounded-full bg-accent px-3.5 text-[12px] font-bold text-accent-2 disabled:opacity-50"
          >
            Post
          </button>
        </div>

        <div className="flex gap-3">
          {slots.map((i) => {
            const img = images[i];
            return img ? (
              <div
                key={i}
                className="relative h-[100px] w-full overflow-hidden rounded-xl border border-border bg-card"
              >
                <Image
                  src={img}
                  alt="Upload preview"
                  fill
                  sizes="180px"
                  className="object-cover"
                />
                <button
                  onClick={() => removeImage(i)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                key={i}
                onClick={pick}
                className="flex h-[100px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-card-2 text-muted"
              >
                <Camera size={20} className="text-accent-2" />
                <span className="text-[12px] font-semibold">Add Photo</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">Up to {MAX_PHOTOS} photos</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write about your travel moment..."
          maxLength={400}
          rows={3}
          className="mt-4 w-full resize-none rounded-2xl border border-border bg-card px-3 py-3 text-[16px] text-foreground outline-none placeholder:text-muted"
        />

        <div className="mt-3 flex items-center gap-2">
          <MapPin size={18} className="shrink-0 text-accent-2" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add Location"
            className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted"
          />
        </div>

        <button
          onClick={post}
          disabled={posting || images.length < 1}
          className="tap mt-5 flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
        >
          {posting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Posting…
            </>
          ) : (
            "Post Moment"
          )}
        </button>
      </div>
    </Sheet>
  );
}