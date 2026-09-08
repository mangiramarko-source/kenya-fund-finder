import { useState } from "react";
import { cn } from "@/lib/utils";

export type KoraPose = "wave" | "insight" | "trend" | "explain" | "celebrate" | "neutral";

const LABELS: Record<KoraPose, string> = {
  wave: "Kora waving hello",
  insight: "Kora pointing to an insight",
  trend: "Kora holding a positive trend arrow",
  explain: "Kora explaining a finance term",
  celebrate: "Kora celebrating progress",
  neutral: "Kora ready to help",
};

export default function KoraIllustration({
  pose,
  className,
  alt,
}: {
  pose: KoraPose;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <img
      src={`/kora/kora-${pose}.webp`}
      alt={alt ?? LABELS[pose]}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("pointer-events-none select-none object-contain", className)}
    />
  );
}
