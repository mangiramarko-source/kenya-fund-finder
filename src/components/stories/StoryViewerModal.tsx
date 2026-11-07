import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Volume2, VolumeX, ChevronLeft, ChevronRight, Share2, Eye, ShieldAlert, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MediaItem } from "@/lib/security/mediaValidation";
import { getDisclaimerText, DisclaimerType, PostCategory, POST_CATEGORIES } from "@/lib/compliance/cmaDisclaimers";

export interface StoryPost {
  id: string;
  author_user_id?: string | null;
  persona_id?: string | null;
  custom_author_name?: string | null;
  custom_avatar_url?: string | null;
  title?: string | null;
  content: string;
  category: PostCategory;
  post_type: string;
  media: MediaItem[];
  disclaimer_type: DisclaimerType;
  is_published: boolean;
  expires_at?: string | null;
  view_count: number;
  created_at: string;
  persona?: {
    name: string;
    avatar_url: string;
    badge_title?: string | null;
  } | null;
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: StoryPost[];
  initialIndex?: number;
}

export default function StoryViewerModal({
  isOpen,
  onClose,
  stories,
  initialIndex = 0,
}: StoryViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewedIdsRef = useRef<Set<string>>(new Set());

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setCurrentMediaIndex(0);
      setProgress(0);
      setIsPaused(false);
      setShowDisclaimer(false);
    }
  }, [isOpen, initialIndex]);

  const currentStory: StoryPost | undefined = stories[currentIndex];
  const mediaList: MediaItem[] = Array.isArray(currentStory?.media) ? currentStory.media : [];
  const currentMedia: MediaItem | undefined = mediaList[currentMediaIndex];

  // Increment public view count safely via SECURITY DEFINER RPC
  useEffect(() => {
    if (!currentStory?.id || viewedIdsRef.current.has(currentStory.id)) return;
    viewedIdsRef.current.add(currentStory.id);

    // Call RPC without requiring write permissions
    supabase.rpc("increment_admin_post_view", { p_post_id: currentStory.id }).then(() => {
      // non-blocking
    });
  }, [currentStory?.id]);

  // Story progression logic
  const handleNext = useCallback(() => {
    if (mediaList.length > 0 && currentMediaIndex < mediaList.length - 1) {
      setCurrentMediaIndex((prev) => prev + 1);
      setProgress(0);
    } else if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentMediaIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentMediaIndex, mediaList.length, currentIndex, stories.length, onClose]);

  const handlePrev = useCallback(() => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prev) => prev - 1);
      setProgress(0);
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      const prevStoryMedia = stories[currentIndex - 1]?.media || [];
      setCurrentMediaIndex(Array.isArray(prevStoryMedia) && prevStoryMedia.length > 0 ? prevStoryMedia.length - 1 : 0);
      setProgress(0);
    }
  }, [currentMediaIndex, currentIndex, stories]);

  // Timer loop for auto-advancing slides
  useEffect(() => {
    if (!isOpen || isPaused || !currentStory) return;

    // Default duration: 7000ms for images/text, or driven by video
    const duration = currentMedia?.type === "video" ? (currentMedia.duration ? currentMedia.duration * 1000 : 10000) : 7000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, currentStory, currentMedia, handleNext]);

  // Video play/pause sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        // autoplay restriction fallback
      });
    }
  }, [isPaused, currentMediaIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
      if (e.key === " ") setIsPaused((p) => !p);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  const handleShare = () => {
    if (!currentStory) return;
    const shareUrl = `${window.location.origin}/updates#post-${currentStory.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link to story copied to clipboard");
    }
  };

  if (!isOpen || !currentStory) return null;

  const authorName = currentStory.persona?.name || currentStory.custom_author_name || "Admin";
  const authorAvatar =
    currentStory.persona?.avatar_url ||
    currentStory.custom_avatar_url ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
  const badgeTitle = currentStory.persona?.badge_title || "Official";
  const disclaimerText = getDisclaimerText(currentStory.disclaimer_type);
  const categoryMeta = POST_CATEGORIES[currentStory.category] || POST_CATEGORIES.market_update;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 max-w-sm sm:max-w-md w-full bg-black/95 text-white border-0 shadow-2xl rounded-2xl overflow-hidden focus:outline-none"
      >
        <DialogTitle className="sr-only">Story: {authorName}</DialogTitle>

        <div className="relative h-[620px] sm:h-[680px] w-full flex flex-col justify-between overflow-hidden select-none">
          {/* Top Progress Bars */}
          <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
            {mediaList.length > 1 ? (
              mediaList.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{
                      width:
                        idx < currentMediaIndex
                          ? "100%"
                          : idx === currentMediaIndex
                          ? `${progress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Top Author Bar */}
          <div className="absolute top-6 left-3 right-3 z-30 flex items-center justify-between text-white drop-shadow">
            <div className="flex items-center gap-2.5">
              <img
                src={authorAvatar}
                alt={authorName}
                className="w-9 h-9 rounded-full object-cover border-2 border-white/80"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{authorName}</span>
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-white/20 text-white">
                    {badgeTitle}
                  </Badge>
                </div>
                <div className="text-[10px] text-white/80 flex items-center gap-1">
                  <span>{categoryMeta.badgeLabel}</span>
                  <span>•</span>
                  <span>{new Date(currentStory.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {currentMedia?.type === "video" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
                  onClick={() => setIsMuted((m) => !m)}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
                onClick={handleShare}
                title="Share link"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
                onClick={onClose}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Media & Content Area */}
          <div className="relative flex-1 w-full flex items-center justify-center bg-black">
            {/* 1. Images */}
            {currentMedia?.type === "image" && (
              <img
                src={currentMedia.url}
                alt="Story content"
                className="w-full h-full object-contain"
              />
            )}

            {/* 2. Native Video */}
            {currentMedia?.type === "video" && (
              <video
                ref={videoRef}
                src={currentMedia.url}
                poster={currentMedia.thumbnail_url}
                muted={isMuted}
                playsInline
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            )}

            {/* 3. External Embed (YouTube / Vimeo / Loom) */}
            {currentMedia?.type === "embed" && (
              <div className="relative w-full h-full flex items-center justify-center">
                <iframe
                  src={currentMedia.url}
                  title="Embedded video"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                {/* Pointer events bridge guardrail: Ensures taps are caught by overlay without swallowing navigation */}
                <div className="absolute inset-0 z-10 pointer-events-none" />
              </div>
            )}

            {/* 4. Text-Only Post Background if no media */}
            {mediaList.length === 0 && (
              <div className="w-full h-full flex flex-col justify-center items-center p-8 text-center bg-gradient-to-br from-indigo-950 via-slate-900 to-black">
                <Sparkles className="h-10 w-10 text-primary mb-4 opacity-80" />
                {currentStory.title && (
                  <h3 className="text-xl font-bold text-white mb-3">
                    {currentStory.title}
                  </h3>
                )}
                <p className="text-sm text-white/90 leading-relaxed max-w-xs">
                  {currentStory.content}
                </p>
              </div>
            )}

            {/* Touch Tap Navigation Zones: Left 30% / Right 70% */}
            <div
              className="absolute top-16 bottom-24 left-0 w-[30%] z-20 cursor-pointer"
              onClick={handlePrev}
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              aria-label="Previous story"
            />
            <div
              className="absolute top-16 bottom-24 right-0 w-[70%] z-20 cursor-pointer"
              onClick={handleNext}
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              aria-label="Next story"
            />
          </div>

          {/* Bottom Caption & Compliance Drawer */}
          <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/80 to-transparent space-y-2">
            {mediaList.length > 0 && (
              <div>
                {currentStory.title && (
                  <h4 className="text-sm font-bold text-white mb-0.5 line-clamp-1">
                    {currentStory.title}
                  </h4>
                )}
                <p className="text-xs text-white/90 line-clamp-2 leading-snug">
                  {currentStory.content}
                </p>
              </div>
            )}

            {/* Automated CMA Compliance Disclaimer Banner */}
            {disclaimerText && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowDisclaimer((s) => !s)}
                  className="flex items-center gap-1 text-[10px] text-white/70 hover:text-white transition"
                >
                  <ShieldAlert className="h-3 w-3 text-amber-400" />
                  <span>CMA Regulatory Disclaimer</span>
                  <span className="text-[9px]">({showDisclaimer ? "hide" : "view"})</span>
                </button>
                {showDisclaimer && (
                  <p className="text-[10px] text-white/80 bg-white/10 p-2 rounded mt-1 leading-tight">
                    {disclaimerText}
                  </p>
                )}
              </div>
            )}

            {/* Story Navigation Controls */}
            <div className="flex items-center justify-between text-[11px] text-white/60 pt-1">
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{currentStory.view_count || 1} views</span>
              </div>
              <div className="flex items-center gap-2">
                {currentIndex > 0 && (
                  <button onClick={handlePrev} className="hover:text-white flex items-center">
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}
                {currentIndex < stories.length - 1 && (
                  <button onClick={handleNext} className="hover:text-white flex items-center">
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
