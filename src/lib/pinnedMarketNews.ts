interface PinnedMarketNewsBoundsInput {
  left: number;
  width: number;
  viewportWidth: number;
  bleed: number;
}

export interface PinnedMarketNewsBounds {
  left: number;
  width: number;
}

export const getPinnedMarketNewsBounds = ({
  left,
  width,
  viewportWidth,
  bleed,
}: PinnedMarketNewsBoundsInput): PinnedMarketNewsBounds => {
  const safeViewportWidth = Math.max(0, viewportWidth);
  const unclampedLeft = left - bleed;
  const unclampedRight = left + width + bleed;
  const clampedLeft = Math.min(safeViewportWidth, Math.max(0, unclampedLeft));
  const clampedRight = Math.min(safeViewportWidth, Math.max(clampedLeft, unclampedRight));

  return {
    left: clampedLeft,
    width: clampedRight - clampedLeft,
  };
};
