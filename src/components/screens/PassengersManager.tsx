"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { MobileShell } from "@/components/shell";
import { Sheet } from "@/components/ui";
import { AuthActionButton } from "@/components/ui/auth-action";
import PhoneInput from "@/components/ui/phone-input";
import { SkeletonRows } from "@/components/ui/feedback";
import { useToast } from "@/lib/toast";
import {
  useDeletePassenger,
  usePassengers,
  useSavePassenger,
  type SavedPassenger,
} from "@/lib/api/hooks";

type Draft = Omit<SavedPassenger, "id" | "createdAt"> & { id?: string };

const empty: Draft = {
  first: "",
  last: "",
  dob: "",
  gender: "",
  email: "",
  phone: "",
  dialCode: "+234",
  passport: "",
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className="h-[43px] w-full rounded-[10px] border border-border bg-card px-3 text-[16px] text-foreground outline-none placeholder:text-muted"
      />
    </label>
  );
}

export default function PassengersManager() {
  const { toast } = useToast();
  const { data: passengers = [], isLoading } = usePassengers();
  const savePassenger = useSavePassenger();
  const deletePassenger = useDeletePassenger();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const openNew = () => {
    setDraft(empty);
    setOpen(true);
  };
  const openEdit = (p: SavedPassenger) => {
    setDraft({ ...p });
    setOpen(true);
  };

  const set = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    if (!draft.first.trim() || !draft.last.trim()) {
      toast("error", "First and last name are required.");
      return;
    }
    try {
      await savePassenger.mutateAsync(draft);
      toast("success", "Passenger saved.");
      setOpen(false);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Could not save passenger.");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Remove this passenger?")) return;
    try {
      await deletePassenger.mutateAsync(id);
      toast("success", "Passenger removed.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Could not remove passenger.");
    }
  };

  return (
    <MobileShell header={<><div className="flex h-[60px] items-center gap-3 bg-background px-4 py-3">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </Link>
          <h1 className="flex-1 text-[18px] font-extrabold text-foreground">
            Saved Passengers
          </h1>
          <button
            onClick={openNew}
            aria-label="Add passenger"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-2"
          >
            <Plus size={16} />
          </button>
        </div></>}>
      <div className="flex min-h-full flex-col">
               <div className="flex flex-col gap-3 px-4 py-3">
          {isLoading ? (
            <SkeletonRows rows={3} height={72} />
          ) : passengers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center">
              <UserRound size={28} className="text-accent-fg" />
              <p className="text-[15px] font-bold text-foreground">
                No saved passengers
              </p>
              <p className="text-[13px] text-muted">
                Add travellers to reuse their details when booking.
              </p>
              <button
                onClick={openNew}
                className="flex h-10 items-center rounded-xl bg-accent px-5 text-[13px] font-bold text-accent-2"
              >
                Add Passenger
              </button>
            </div>
          ) : (
            passengers.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-foreground">
                    {p.first} {p.last}
                  </span>
                  <span className="text-[12px] text-muted">
                    {p.email || p.phone || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    aria-label="Edit passenger"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-foreground"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    aria-label="Delete passenger"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        footer={
          <AuthActionButton
            onAction={submit}
            disabled={savePassenger.isPending}
            className="tap flex h-[48px] w-full items-center justify-center rounded-xl bg-accent text-[15px] font-bold text-accent-2 disabled:opacity-50"
          >
            Save Passenger
          </AuthActionButton>
        }
      >
        <div className="px-4 pb-2">
          <h2 className="mb-4 text-[17px] font-extrabold text-foreground">
            {draft.id ? "Edit Passenger" : "Add Passenger"}
          </h2>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Field label="First Name" value={draft.first} onChange={set("first")} placeholder="Jane" />
              <Field label="Last Name" value={draft.last} onChange={set("last")} placeholder="Doe" />
            </div>
            <div className="flex gap-3">
              <Field label="Date of Birth" value={draft.dob} onChange={set("dob")} type="date" />
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-muted">Gender</span>
                <select
                  value={draft.gender}
                  onChange={(e) => set("gender")(e.target.value)}
                  className="h-[43px] w-full rounded-[10px] border border-border bg-card px-3 text-[16px] text-foreground outline-none"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
            <Field label="Email Address" value={draft.email} onChange={set("email")} type="email" placeholder="you@email.com" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-muted">Phone Number</span>
              <PhoneInput
                value={draft.phone}
                dialCode={draft.dialCode ?? "+234"}
                onChange={(dialCode, national) =>
                  setDraft((d) => ({ ...d, dialCode, phone: national }))
                }
              />
            </div>
            <Field label="Passport Number" value={draft.passport ?? ""} onChange={set("passport")} placeholder="A00123456" />
          </div>
        </div>
      </Sheet>
    </MobileShell>
  );
}