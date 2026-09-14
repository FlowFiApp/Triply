import SheetFull, { type SheetKind } from "@/components/screens/SheetFull";
import ThemeSync from "@/components/ThemeSync";

const KINDS: SheetKind[] = ["class", "filter", "wallet", "rules"];

export default async function Page({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  const safe = (KINDS.includes(kind as SheetKind) ? kind : "class") as SheetKind;
  return (
    <>
      <ThemeSync />
      <SheetFull kind={safe} />
    </>
  );
}