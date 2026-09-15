"use client";

import { useRouter } from "next/navigation";
import AnimatedTabs from "@/components/ui/animated-tabs";

/** Explore tab switcher shared by the Accommodations and Cars screens. */
export default function ExploreTabs({ active }: { active: "stays" | "cars" }) {
  const router = useRouter();
  const value = active === "stays" ? "Accommodations" : "Cars";
  return (
    <div className="px-4 py-2">
      <AnimatedTabs
        id="explore"
        options={["Accommodations", "Cars"]}
        value={value}
        onChange={(v) => router.push(v === "Accommodations" ? "/stays" : "/cars")}
      />
    </div>
  );
}