export default function TriplyLogo({
  size = 34,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Triply"
        width={size}
        height={size}
        className="h-auto w-auto object-contain"
        style={{ maxHeight: size, maxWidth: size }}
      />
    </span>
  );
}