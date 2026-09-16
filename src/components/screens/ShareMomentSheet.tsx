"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, MapPin, X } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import { Sheet } from "@/components/ui";
import { AuthActionButton } from "@/components/ui/auth-action";
import PlacesCombobox from "@/components/ui/places-combobox";
import { NimiqIcon } from "@/components/ui/Nimiq";
import { useToast } from "@/lib/toast";
import { compressImage } from "@/lib/image";
import { useCreateMoment, useUploadFeedImage } from "@/lib/api/hooks";

const MAX_PHOTOS = 2;

export default function ShareMomentSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const createMoment = useCreateMoment();
  const uploadImage = useUploadFeedImage();

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
  };

  const posting = createMoment.isPending || uploadImage.isPending;

  const post = async () => {
    if (images.length < 1) {
      toast("info", "Add at least one photo.");
      return;
    }
    try {
      const urls: string[] = [];
      for (const dataUrl of images) {
        const uploaded = await uploadImage.mutateAsync(dataUrl);
        if (!uploaded.url) throw new Error("Upload failed");
        urls.push(uploaded.url);
      }
      await createMoment.mutateAsync({
        caption: caption.trim(),
        location: location.trim() || undefined,
        images: urls,
      });
      toast("success", "Your moment is live!");
      reset();
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Post failed.");
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      height="92vh"
      footer={
        <>
          <div className="mb-2 flex items-center justify-between rounded-xl bg-accent-2/20 px-3 py-2">
            <span className="text-[12px] font-semibold text-foreground">
              You&apos;ll earn
            </span>
            <span className="flex items-center gap-1 text-[12px] font-bold text-accent-2">
              +2 <NimiqIcon size={13} />
            </span>
          </div>
          <AuthActionButton
            onAction={post}
            busy={posting}
            busyLabel="Posting…"
            disabled={posting || images.length < 1}
            className="tap flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
          >
            Post Moment
          </AuthActionButton>
        </>
      }
    >
      <div className="px-4 pb-2">
        <h2 className="mb-4 text-[17px] font-extrabold text-foreground">
          Share Your Moment
        </h2>

        {images.length === 0 ? (
          <button
            onClick={pick}
            className="flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card-2 text-muted"
          >
            <Camera size={28} className="text-accent-fg" />
            <span className="text-[14px] font-semibold">Add Photo</span>
            <span className="text-[11px]">Up to {MAX_PHOTOS} photos</span>
          </button>
        ) : (
          <Swiper
            modules={[Pagination]}
            slidesPerView={1}
            spaceBetween={10}
            pagination={{ clickable: true }}
            className="w-full rounded-2xl"
            style={{ height: 260 }}
          >
            {images.map((img, i) => (
              <SwiperSlide key={i}>
                <div className="relative h-[220px] w-full overflow-hidden rounded-2xl bg-card-2">
                  <Image
                    src={img}
                    alt="Upload preview"
                    fill
                    sizes="400px"
                    className="object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              </SwiperSlide>
            ))}
            {images.length < MAX_PHOTOS ? (
              <SwiperSlide>
                <button
                  onClick={pick}
                  className="flex h-[220px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card-2 text-muted"
                >
                  <Camera size={26} className="text-accent-fg" />
                  <span className="text-[13px] font-semibold">Add another</span>
                </button>
              </SwiperSlide>
            ) : null}
          </Swiper>
        )}

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

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <MapPin size={18} className="shrink-0 text-accent-fg" />
          <PlacesCombobox
            value={location}
            onChange={setLocation}
            onSelect={(p) => setLocation(p.name)}
            placeholder="Add Location"
          />
        </div>
      </div>
    </Sheet>
  );
}