import { useState, useEffect } from "react";
import { Award, Flame, CheckCircle2, Share2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface FeedTriviaCardProps {
  id?: string;
  index?: number;
}

const TRIVIA_DATA = {
  id: "trivia-wht-mmf",
  category: "Tax & Regulation",
  question: "What is the statutory withholding tax rate on Money Market Fund (MMF) interest earned by individual investors in Kenya?",
  options: [
    { id: "A", label: "5%", correct: false },
    { id: "B", label: "15%", correct: true, explanation: "Correct! Under Section 35 of the Income Tax Act, MMF interest payments to Kenyan resident individuals are subject to a final 15% withholding tax deducted automatically at source." },
    { id: "C", label: "20%", correct: false },
  ],
};

export function FeedTriviaCard({ id = "trivia-1", index = 7 }: FeedTriviaCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [streak, setStreak] = useState(1);

  useEffect(() => {
    try {
      const savedAnswer = localStorage.getItem(`kff_trivia_answer_${id}`);
      if (savedAnswer) {
        setSelectedOption(savedAnswer);
      }
      const savedStreak = localStorage.getItem("kff_trivia_streak");
      if (savedStreak) {
        setStreak(parseInt(savedStreak, 10) || 1);
      }
    } catch {
      // ignore
    }
  }, [id]);

  const handleSelect = (optionId: string) => {
    if (selectedOption) return;
    setSelectedOption(optionId);
    try {
      localStorage.setItem(`kff_trivia_answer_${id}`, optionId);
    } catch {
      // ignore
    }

    const isCorrect = TRIVIA_DATA.options.find((o) => o.id === optionId)?.correct;
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      try {
        localStorage.setItem("kff_trivia_streak", newStreak.toString());
      } catch {
        // ignore
      }
      toast.success("Spot on! 🎉", {
        description: `You've got a ${newStreak}-day financial knowledge streak!`,
      });
    } else {
      toast.error("Not quite! Check the explanation below 💡");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Daily Kenyan Market Quiz",
        text: TRIVIA_DATA.question,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Quiz link copied to clipboard");
    }
  };

  return (
    <div
      className="animate-rise relative -mx-4 space-y-3.5 border-0 border-b border-border/80 bg-transparent px-4 py-4 shadow-none transition-all md:mx-0 md:rounded-2xl md:border md:bg-card md:p-6 md:shadow-xs"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top author row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-sm shadow-xs shrink-0">
            <Award className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                Kenya Market Trivia
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                <HelpCircle className="h-2.5 w-2.5" /> Daily Challenge
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">{TRIVIA_DATA.category}</span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full shrink-0">
          <Flame className="h-3 w-3" /> {streak} Day Streak
        </span>
      </div>

      {/* Question */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
          {TRIVIA_DATA.question}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Pick the correct answer to test your financial knowledge and boost your daily streak.
        </p>
      </div>

      {/* Multiple choice options */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {TRIVIA_DATA.options.map((opt) => {
          const isChosen = selectedOption === opt.id;
          const hasAnswered = !!selectedOption;
          const isCorrect = opt.correct;

          let btnStyle = "border-border/80 bg-muted/40 text-foreground hover:bg-muted/70";
          if (hasAnswered) {
            if (isCorrect) {
              btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold";
            } else if (isChosen) {
              btnStyle = "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold";
            } else {
              btnStyle = "opacity-50 border-border/40 bg-muted/20 text-muted-foreground";
            }
          }

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              disabled={hasAnswered}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs transition-all active:scale-95 cursor-pointer disabled:cursor-default ${btnStyle}`}
            >
              <span className="font-extrabold text-sm sm:text-base">{opt.label}</span>
              {hasAnswered && isCorrect && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Correct
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Explanation */}
      {selectedOption && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-foreground/90 leading-relaxed">
          <p>
            <strong>💡 Did you know?</strong>{" "}
            {TRIVIA_DATA.options.find((o) => o.correct)?.explanation}
          </p>
        </div>
      )}

      {/* Footer social actions */}
      <div className="flex items-center justify-end pt-2 border-t border-border/40 text-muted-foreground text-xs">
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Share Challenge</span>
        </button>
      </div>
    </div>
  );
}
