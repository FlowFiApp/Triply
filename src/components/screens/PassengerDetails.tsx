"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronDown, ShieldCheck, UserRound } from "lucide-react";
import { MobileShell } from "@/components/shell";
import PhoneInput from "@/components/ui/phone-input";
import { AuthActionButton } from "@/components/ui/auth-action";
import { Sheet } from "@/components/ui";
import { usePassengers, type SavedPassenger } from "@/lib/api/hooks";
import { useFlow } from "@/lib/flow-context";
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
          {!optional ? <span className="text-accent-fg"> *</span> : null}
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
  const { flow, setFlow } = useFlow();
  const next = flow.next ?? "";
  const passengerCount = flow.passengers ?? 1;
  const [forms, setForms] = useState<PassengerInfo[]>(() =>
    Array.from({ length: passengerCount }, () => ({ ...empty })),
  );
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { data: savedPassengers = [] } = usePassengers();
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const setField = (i: number, k: keyof PassengerInfo) => (v: string) => {
    setForms((fs) => fs.map((f, idx) => (idx === i ? { ...f, [k]: v } : f)));
    setInvalid((prev) => ({ ...prev, [`${i}-${k}`]: false }));
  };

  const applySaved = (i: number, p: SavedPassenger) => {
    setForms((fs) =>
      fs.map((f, idx) =>
        idx === i
          ? {
              ...f,
              first: p.first,
              last: p.last,
              dob: p.dob,
              gender: p.gender,
              email: p.email,
              phone: p.phone,
              dialCode: p.dialCode ?? "+234",
              passport: p.passport ?? "",
            }
          : f,
      ),
    );
    setInvalid({});
    setPickerFor(null);
    toast("success", "Passenger details filled.");
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
    const nextInvalid: Record<string, boolean> = {};
    let dupEmail = false;
    let underage = false;
    const seenEmails = new Map<string, number>();
    // Flights are searched/booked as adult passengers, so each traveller must
    // be at least 12 years old at the departure date — otherwise Duffel rejects
    // the order ("date of birth does not match passenger type").
    const depDate =
      flow.offer?.depDate ?? flow.search?.date ?? new Date().toISOString().slice(0, 10);
    const ageAt = (dob: string) => {
      const d = new Date(dob);
      const ref = new Date(depDate);
      let age = ref.getFullYear() - d.getFullYear();
      const m = ref.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
      return age;
    };
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      for (const k of required) {
        if (!f[k]?.trim()) nextInvalid[`${i}-${k}`] = true;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
        nextInvalid[`${i}-email`] = true;
      } else {
        const key = f.email.trim().toLowerCase();
        const first = seenEmails.get(key);
        if (first !== undefined) {
          // Duffel links one customer user per email — duplicates are rejected.
          nextInvalid[`${i}-email`] = true;
          nextInvalid[`${first}-email`] = true;
          dupEmail = true;
        } else {
          seenEmails.set(key, i);
        }
      }
      if (f.phone.replace(/\D/g, "").length < 7) {
        nextInvalid[`${i}-phone`] = true;
      }
      if (f.dob) {
        if (Number.isNaN(new Date(f.dob).getTime())) {
          nextInvalid[`${i}-dob`] = true;
        } else if (ageAt(f.dob) < 12) {
          nextInvalid[`${i}-dob`] = true;
          underage = true;
        }
      } else {
        nextInvalid[`${i}-dob`] = true;
      }
      // Duffel caps names at 20 characters per part.
      if (f.first.trim().length > 20) nextInvalid[`${i}-first`] = true;
      if (f.last.trim().length > 20) nextInvalid[`${i}-last`] = true;
    }
    if (Object.keys(nextInvalid).length) {
      setInvalid(nextInvalid);
      toast(
        "error",
        underage
          ? "Passengers must be at least 12 years old on this flight."
          : dupEmail
            ? "Each passenger needs a different email address."
          : "Please fill in all required fields for every passenger before continuing.",
      );
      return;
    }
    setFlow({ passenger: forms[0], passengersList: forms, next: undefined });
    router.push(next || "/checkout");
  };

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-background px-4 py-3">
            <button
              onClick={() => {
                const backTo = next || (flow.offer ? "/flight" : "/search");
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
          </div></>}>
      <div className="flex min-h-full flex-col justify-between">
        <div className="w-full">
                 <div className="px-4 py-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-accent-2 p-3">
              <ShieldCheck size={20} className="shrink-0 text-accent" />
              <p className="text-[12px] font-semibold leading-[17px] text-accent">
                No account needed. Your ticket will be sent to your email and
                saved to this device.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-5 px-4 pb-6 pt-3">
            {forms.map((form, i) => (
              <div
                key={i}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-2 text-[12px] font-bold text-accent">
                    {i + 1}
                  </span>
                  <span className="text-[14px] font-bold text-foreground">
                    Passenger {i + 1}
                  </span>
                  {i === 0 ? (
                    <span className="rounded bg-card-2 px-1.5 py-0.5 text-[9px] font-bold text-muted">
                      LEAD
                    </span>
                  ) : null}
                  {savedPassengers.length > 0 ? (
                    <button
                      onClick={() => setPickerFor(i)}
                      className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card-2 px-2.5 py-1 text-[11px] font-semibold text-accent-fg"
                    >
                      <UserRound size={12} />
                      Use saved
                    </button>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <Field
                    className="flex-1"
                    label="First Name"
                    value={form.first}
                    onChange={setField(i, "first")}
                    invalid={invalid[`${i}-first`]}
                    placeholder="Jane"
                    autoComplete="given-name"
                  />
                  <Field
                    className="flex-1"
                    label="Last Name"
                    value={form.last}
                    onChange={setField(i, "last")}
                    invalid={invalid[`${i}-last`]}
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                </div>
                <div className="flex gap-3">
                  <Field
                    className="flex-1"
                    label="Date of Birth"
                    value={form.dob}
                    onChange={setField(i, "dob")}
                    invalid={invalid[`${i}-dob`]}
                    type="date"
                    autoComplete="bday"
                  />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-muted">
                      Gender<span className="text-accent-fg"> *</span>
                    </span>
                    <div
                      className={`flex h-[43px] items-center justify-between rounded-[10px] border bg-card px-3 transition-colors ${
                        invalid[`${i}-gender`]
                          ? "border-red-500"
                          : "border-border focus-within:border-accent-2"
                      }`}
                    >
                      <select
                        value={form.gender}
                        onChange={(e) => setField(i, "gender")(e.target.value)}
                        className={`w-full bg-transparent text-[14px] outline-none ${
                          form.gender ? "text-foreground" : "text-muted"
                        }`}
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                      <ChevronDown size={16} className="shrink-0 text-muted" />
                    </div>
                  </div>
                </div>
                <Field
                  label="Email Address"
                  value={form.email}
                  onChange={setField(i, "email")}
                  invalid={invalid[`${i}-email`]}
                  type="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-muted">
                    Phone Number<span className="text-accent-fg"> *</span>
                  </span>
                  <PhoneInput
                    value={form.phone}
                    dialCode={form.dialCode ?? "+234"}
                    onChange={(dialCode, national) => {
                      setForms((fs) =>
                        fs.map((f, idx) =>
                          idx === i ? { ...f, dialCode, phone: national } : f,
                        ),
                      );
                      setInvalid((p) => ({ ...p, [`${i}-phone`]: false }));
                    }}
                    invalid={invalid[`${i}-phone`]}
                  />
                </div>
                <Field
                  label="Passport Number"
                  optional
                  value={form.passport}
                  onChange={setField(i, "passport")}
                  placeholder="A00123456"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>
        </div>

        <div aria-hidden className="h-[84px] w-full shrink-0" />
        <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[768px] -translate-x-1/2 border-t border-border bg-card px-4 pb-[calc(30px+env(safe-area-inset-bottom))] pt-3">
          <AuthActionButton
            onAction={continueTo}
            busyLabel="Continuing…"
            className="tap flex h-12 w-full items-center justify-center rounded-xl border border-accent-2 bg-accent text-[15px] font-bold text-accent-2"
          >
            Continue to Checkout
          </AuthActionButton>
        </div>
      </div>

      {pickerFor !== null ? (
        <Sheet open onClose={() => setPickerFor(null)}>
          <div className="flex flex-col px-4 pb-6 pt-1">
            <h2 className="mb-3 text-[16px] font-extrabold text-foreground">
              Use a saved passenger
            </h2>
            <div className="flex flex-col gap-2">
              {savedPassengers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applySaved(pickerFor, p)}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-[14px] font-bold text-foreground">
                      {p.first} {p.last}
                    </span>
                    <span className="text-[11px] text-muted">
                      {p.email || p.phone || "—"}
                    </span>
                  </span>
                  <UserRound size={16} className="text-accent-fg" />
                </button>
              ))}
            </div>
          </div>
        </Sheet>
      ) : null}
    </MobileShell>
  );
}
