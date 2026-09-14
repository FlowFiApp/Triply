"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageCarousel({
  images,
  alt,
  className = "h-[200px] w-full",
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = images.filter(Boolean).length;
  const prev = () => setIndex((i) => (count ? (i - 1 + count) % count : 0));
  const next = () => setIndex((i) => (count ? (i + 1) % count : 0));

  if (count === 0) return <div className={`bg-card-2 ${className}`} />;

  return (
    <div className={`relative overflow-hidden bg-card-2 ${className}`}>
      <Image
        src={images[index]}
        alt={alt}
        fill
        priority
        sizes="390px"
        className="object-cover"
      />
      {count > 1 ? (
        <>
          <button
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white"
          >
            <ChevronRight size={16} />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}