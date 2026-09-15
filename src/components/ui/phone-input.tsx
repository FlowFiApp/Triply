"use client";

export const COUNTRY_DIAL_CODES: Array<{ name: string; code: string }> = [
  { name: "Nigeria", code: "+234" },
  { name: "United States", code: "+1" },
  { name: "United Kingdom", code: "+44" },
  { name: "Ghana", code: "+233" },
  { name: "Kenya", code: "+254" },
  { name: "South Africa", code: "+27" },
  { name: "Egypt", code: "+20" },
  { name: "Morocco", code: "+212" },
  { name: "France", code: "+33" },
  { name: "Germany", code: "+49" },
  { name: "Spain", code: "+34" },
  { name: "Italy", code: "+39" },
  { name: "Netherlands", code: "+31" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "India", code: "+91" },
  { name: "China", code: "+86" },
  { name: "Japan", code: "+81" },
  { name: "Australia", code: "+61" },
  { name: "Brazil", code: "+55" },
  { name: "Mexico", code: "+52" },
  { name: "Indonesia", code: "+62" },
];

export default function PhoneInput({
  value,
  dialCode = "+234",
  onChange,
  invalid = false,
  placeholder = "801 234 5678",
}: {
  value: string;
  dialCode?: string;
  onChange: (dialCode: string, national: string) => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <div
      className={`flex h-[43px] items-center gap-2 rounded-[10px] border bg-card px-3 transition-colors ${
        invalid
          ? "border-red-500"
          : "border-border focus-within:border-accent-2"
      }`}
    >
      <select
        value={dialCode}
        onChange={(e) => onChange(e.target.value, value)}
        aria-label="Country dial code"
        className="shrink-0 appearance-none bg-transparent text-[14px] font-semibold text-accent-fg outline-none"
      >
        {COUNTRY_DIAL_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} {c.code}
          </option>
        ))}
      </select>
      <span className="h-4 w-px shrink-0 bg-border" />
      <input
        value={value}
        onChange={(e) => onChange(dialCode, e.target.value)}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted"
      />
    </div>
  );
}