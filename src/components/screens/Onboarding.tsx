"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { MobileShell } from "@/components/shell";
import TriplyLogo from "@/components/ui/triply-logo";
import { haptic } from "@/lib/haptics";

const SLIDES = [
  {
    title: "Book Flights, Stays & Cars — Instantly",
    body: "Search and book travel in seconds. No sign-ups, no accounts, no friction. Just tap and go.",
    img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=70",
  },
  {
    title: "Pay Seamlessly with USDT",
    body: "See prices in your local currency, pay in crypto. Ultra-low fees on Base, Polygon, Arbitrum & Solana. No wallet setup required.",
    img: "/usdt.png",
  },
  {
    title: "Your Ticket, Saved Locally",
    body: "No login needed to access your bookings. Your e-tickets and boarding passes are saved securely on your device.",
    img: "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&w=800&q=70",
  },
  {
    title: "Earn Nimiq Points",
    body: "Earn 2 NIM for every 1 USDT you spend on travel, plus bonus points for sharing your moments on the feed. Redeem your points for NIM straight to your wallet.",
    img: "/nimiq.png",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const last = step === SLIDES.length - 1;

  const finish = () => {
    haptic();
    if (typeof window !== "undefined") {
      localStorage.setItem("triply-onboarded", "1");
    }
    router.push("/");
  };

  const go = () => {
    haptic();
    if (last) finish();
    else setStep((s) => s + 1);
  };

  return (
    <MobileShell
      header={
        <>
          <div className="flex h-[60px] items-center justify-between bg-background px-4">
            <TriplyLogo size={27} />
            <button
              onClick={finish}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-semibold text-muted"
            >
              Skip
            </button>
          </div>
        </>
      }
    >
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
          <div className="px-4 pt-3">
            <div className="overflow-hidden rounded-3xl border border-border">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${step * 100}%)` }}
              >
                {SLIDES.map((s) => (
                  <div
                    key={s.title}
                    className="relative h-[300px] w-full shrink-0 bg-card-2"
                  >
                    <Image
                      src={s.img}
                      alt=""
                      fill
                      priority
                      sizes="342px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-4 pb-6 pt-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] font-extrabold leading-9 text-foreground">
              {SLIDES[step].title}
            </h1>
            <p className="text-[14px] leading-6 text-muted">
              {SLIDES[step].body}
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-center gap-2">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? "w-4 bg-accent" : "w-2 bg-card-3"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={go}
              className={`flex h-[49px] w-full items-center justify-center rounded-2xl border text-[16px] font-bold ${
                last
                  ? "border-accent-2 bg-accent text-accent-2"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {last ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
