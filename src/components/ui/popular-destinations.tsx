"use client";

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

export type PopularDestination = {
  iata: string;
  city: string;
  name: string;
  country: string;
  image: string;
};

export default function PopularDestinations({
  destinations,
  onSelect,
}: {
  destinations: PopularDestination[];
  onSelect: (iata: string) => void;
}) {
  return (
    <Swiper
      slidesPerView="auto"
      spaceBetween={12}
      slidesOffsetBefore={20}
      slidesOffsetAfter={20}
      grabCursor
      className="select-none"
      style={{
        height: 140,
        touchAction: "pan-y",
        overscrollBehavior: "contain",
      }}
    >
      {destinations.map((d) => (
        <SwiperSlide key={d.iata} style={{ width: 200, height: 140 }}>
          <button
            onClick={() => onSelect(d.iata)}
            className="group relative block h-full w-full overflow-hidden rounded-2xl text-left shadow-[0_4px_12px_rgba(0,0,0,0.25)]"
          >
            <Image
              src={d.image}
              alt={d.city}
              fill
              sizes="300px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
            <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md">
              <ArrowUpRight size={14} />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
              <span className="text-[17px] font-extrabold leading-5 text-white">
                {d.city}
              </span>
              <span className="text-[11px] font-medium text-white/80">
                {d.name} · {d.country}
              </span>
            </div>
          </button>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}