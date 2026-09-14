export async function share(
  input: { title?: string; text?: string; url?: string },
): Promise<"shared" | "copied" | "unsupported"> {
  if (typeof navigator === "undefined") return "unsupported";
  const target = input.url ?? input.text ?? "";
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: input.title,
        text: input.text,
        url: input.url,
      });
      return "shared";
    } catch {
      // user cancelled — fall back to copy
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(target);
      return "copied";
    } catch {
      return "unsupported";
    }
  }
  return "unsupported";
}