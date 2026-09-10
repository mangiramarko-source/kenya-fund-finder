export type KoraPose = "wave" | "insight" | "trend" | "explain" | "celebrate" | "neutral";

export default function KoraIllustration({
  pose,
  className,
  alt,
}: {
  pose: KoraPose;
  className?: string;
  alt?: string;
}) {
  void pose;
  void className;
  void alt;
  return null;
}
