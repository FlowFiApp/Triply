"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { PassengerClassSheet } from "@/components/screens/sheets";
import PhoneInput from "@/components/ui/phone-input";
import { useQueryParam } from "@/lib/query";
import { readFlow, writeFlow } from "@/lib/store";
import { useToast } from "@/lib/toast";
import type { PassengerInfo } from "@/lib/types";

function Field({
  label,
  value,
  onChange,
  right,
  optional,
  invalid,
  type = "text",
  inputMode,
  autoComplete,
  placeholder = "",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  right?: ReactNode;
  optional?: boolean;
  invalid?: boolean;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted">
          {label}
          {!optional ? <span className="text-accent-2"> *</span> : null}
        </span>
        {optional ? (
          <span className="rounded bg-card-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
            OPTIONAL
          </span>
        ) : null}
      </div>
      <div
        className={`flex h-[43px] items-center justify-between rounded-[10px] border bg-card px-3 transition-colors ${
          invalid
            ? "border-red-500"
            : "border-border focus-within:border-accent-2"
        }`}
      >
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted"
        />
        {right}
      </div>
    </div>
  );
}

const empty: PassengerInfo = {
  first: "",
  last: "",
  dob: "",
  gender: "",
  email: "",
  phone: "",
  dialCode: "+234",
  passport: "",
};

export default function PassengerDetails() {
  const router = useRouter();
  const [classOpen, setClassOpen] = useState(
    useQueryParam("sheet", "") === "class",
  );
  const next = useQueryParam("next", "");
  const passengerCount = readFlow().passengers ?? 1;
  const [form, setForm] = useState<PassengerInfo>(empty);
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const set = (k: keyof PassengerInfo) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setInvalid((prev) => ({ ...prev, [k]: false }));
  };

  const continueTo = () => {
    const required: (keyof PassengerInfo)[] = [
      "first",
      "last",
      "dob",
      "gender",
      "email",
      "phone",
    ];
    const missing = required.filter((k) => !form[k]?.trim());
    if (missing.length) {
      setInvalid(Object.fromEntries(missing.map((k) => [k, true])));
      toast("error", "Please fill in all required fields before continuing.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setInvalid((p) => ({ ...p, email: true }));
      toast("error", "Please enter a valid email address.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 7) {
      setInvalid((p) => ({ ...p, phone: true }));
      toast("error", "Please enter a valid phone number.");
      return;
    }
    if (!form.dob) {
      setInvalid((p) => ({ ...p, dob: true }));
      toast("error", "Please select your date of birth.");
      return;
    }
    writeFlow({ passenger: form });
    router.push(next || "/checkout");
  };

  return (
    <MobileShell>
      <div className="flex min-h-screen flex-col justify-between">
        <div className="w-full">
          <div className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-background px-4 py-3">
            <button
              onClick={() => {
                const offerId = readFlow().offer?.id;
                const backTo =
                  next || (offerId ? `/flight?offer=${encodeURIComponent(offerId)}` : "/search");
                router.push(backTo);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="flex flex-col">
              <h1 className="text-[18px] font-extrabold leading-[21px] text-foreground">
                Passenger Details
              </h1>
              <p className="text-[12px] font-normal leading-4 text-muted">
                {passengerCount} Passenger{passengerCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-accent-2 p-3">
              <ShieldCheck size={20} className="shrink-0 text-accent" />
              <p className="text-[12px] font-semibold leading-[17px] text-accent">
                No account needed. Your ticket will be sent to your email and
                saved to this device.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4 pb-6 pt-3">
            <div className="flex gap-3">
              <Field
                className="flex-1"
                label="First Name"
                value={form.first}
                onChange={set("first")}
                invalid={invalid.first}
                placeholder="Jane"
                autoComplete="given-name"
              />
              <Field
                className="flex-1"
                label="Last Name"
                value={form.last}
                onChange={set("last")}
                invalid={invalid.last}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </div>
            <div className="flex gap-3">
              <Field
                className="flex-1"
                label="Date of Birth"
                value={form.dob}
                onChange={set("dob")}
                invalid={invalid.dob}
                type="date"
                autoComplete="bday"
              />
              <div className="flex flex-1 flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted">
                  Gender<span className="text-accent-2"> *</span>
                </span>
                <div
                  className={`flex h-[43px] items-center justify-between rounded-[10px] border bg-card px-3 transition-colors ${
                    invalid.gender
                      ? "border-red-500"
                      : "border-border focus-within:border-accent-2"
                  }`}
                >
                  <select
                    value={form.gender}
                    onChange={(e) => set("gender")(e.target.value)}
                    className={`w-full bg-transparent text-[14px] outline-none ${
                      form.gender ? "text-foreground" : "text-muted"
                    }`}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={16} className="shrink-0 text-muted" />
                </div>
              </div>
            </div>
            <Field
              label="Email Address"
              value={form.email}
              onChange={set("email")}
              invalid={invalid.email}
              type="email"
              inputMode="email"
              placeholder="you@email.com"
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted">
                Phone Number<span className="text-accent-2"> *</span>
              </span>
              <PhoneInput
                value={form.phone}
                dialCode={form.dialCode ?? "+234"}
                onChange={(dialCode, national) => {
                  setForm((f) => ({ ...f, dialCode, phone: national }));
                  setInvalid((p) => ({ ...p, phone: false }));
                }}
                invalid={invalid.phone}
              />
            </div>
            <Field
              label="Passport Number"
              optional
              value={form.passport}
              onChange={set("passport")}
              placeholder="A00123456"
              autoComplete="off"
            />
          </div>
        </div>

        <div aria-hidden className="h-[84px] w-full shrink-0" />
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-3">
          <button
            onClick={continueTo}
            className="tap flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
          >
            Continue to Checkout
          </button>
        </div>
      </div>

      <PassengerClassSheet
        open={classOpen}
        onClose={() => setClassOpen(false)}
      />
    </MobileShell>
  );
}
