import { useState } from "react";

interface FundLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
  fullBleed?: boolean;
}

/** Round avatar for a fund. Falls back to the first letter on a colored circle when no logo. */
const FundLogo = ({ name, logoUrl, size = 28, className = "", fullBleed = false }: FundLogoProps) => {
  const [failed, setFailed] = useState(false);
  const letter = (name?.trim()[0] || "?").toUpperCase();

  // Deterministic hue from the name so each manager has a stable color.
  const hue = Array.from(name || "?").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const bg = `hsl(${hue} 65% 90%)`;
  const fg = `hsl(${hue} 55% 30%)`;

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        // @ts-expect-error - fetchPriority is a valid HTML attribute
        fetchpriority="low"
        onError={() => setFailed(true)}
        className={`rounded-full border border-border/40 ${fullBleed ? "bg-muted object-cover" : "bg-white object-contain p-1.5"} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`rounded-full flex items-center justify-center font-bold border border-border/40 shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}
    >
      {letter}
    </div>
  );
};

export default FundLogo;
