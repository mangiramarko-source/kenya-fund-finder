import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Coffee, HelpCircle, CheckCircle2, Sparkles, Flame, Award } from "lucide-react";
import { toast } from "sonner";

type WidgetTab = "pulse" | "espresso" | "trivia";

interface PollData {
  question: string;
  asset: string;
  bulls: number;
  bears: number;
}

const DEFAULT_POLL: PollData = {
  question: "How do you feel about Safaricom ($SCOM) and the NSE 20 index heading into next week?",
  asset: "NSE & Safaricom",
  bulls: 482,
  bears: 194,
};

const TRIVIA_QUESTION = {
  question: "What is the statutory withholding tax rate on Money Market Fund (MMF) interest earned by individual investors in Kenya?",
  options: [
    { id: "A", text: "5%", correct: false },
    { id: "B", text: "15%", correct: true, explanation: "Correct! Under Section 35 of the Income Tax Act, MMF distributions to Kenyan individuals are subject to a final 15% withholding tax deducted automatically at source." },
    { id: "C", text: "20%", correct: false },
  ],
};

const ESPRESSO_ITEMS = [
  {
    icon: "📈",
    tag: "NSE Equities",
    headline: "Safaricom & Banking Majors Drive Turnover",
    detail: "Heavy institutional trades pushed NSE daily turnover past KES 450M, with foreign buyers accumulating blue-chip banking stocks.",
  },
  {
    icon: "💰",
    tag: "MMF Yields",
    headline: "Top Shilling Funds Hold Yields Above 16.5%",
    detail: "Leading money market funds continue to offer lucrative short-term yields as commercial paper and T-bill rates remain elevated.",
  },
  {
    icon: "🇰🇪",
    tag: "Macro Pulse",
    headline: "Kenya Shilling Stable at 129.20 vs USD",
    detail: "Forex reserves at the Central Bank remain healthy at over 4.1 months of import cover, keeping currency volatility near multi-month lows.",
  },
];

export function MarketEntertainmentWidget() {
  const [activeTab, setActiveTab] = useState<WidgetTab>("pulse");
  const [userVote, setUserVote] = useState<"bull" | "bear" | null>(null);
  const [poll, setPoll] = useState<PollData>(DEFAULT_POLL);
  const [selectedTrivia, setSelectedTrivia] = useState<string | null>(null);
  const [triviaStreak, setTriviaStreak] = useState<number>(1);

  // Load persistence from localStorage
  useEffect(() => {
    try {
      const savedVote = localStorage.getItem("kff_news_demo_vote");
      if (savedVote === "bull" || savedVote === "bear") {
        setUserVote(savedVote);
      }
      const savedTrivia = localStorage.getItem("kff_news_demo_trivia");
      if (savedTrivia) {
        setSelectedTrivia(savedTrivia);
      }
      const savedStreak = localStorage.getItem("kff_news_demo_streak");
      if (savedStreak) {
        setTriviaStreak(parseInt(savedStreak, 10) || 1);
      }
    } catch {
      // Local storage fallback
    }
  }, []);

  const handleVote = (vote: "bull" | "bear") => {
    if (userVote) return; // already voted
    setUserVote(vote);
    setPoll((prev) => ({
      ...prev,
      bulls: vote === "bull" ? prev.bulls + 1 : prev.bulls,
      bears: vote === "bear" ? prev.bears + 1 : prev.bears,
    }));
    try {
      localStorage.setItem("kff_news_demo_vote", vote);
    } catch {
      // ignore
    }
    toast.success(vote === "bull" ? "Voted Bullish! 🐂" : "Voted Bearish! 🐻", {
      description: "Your vote has been added to today's community sentiment.",
    });
  };

  const handleTriviaAnswer = (optionId: string) => {
    if (selectedTrivia) return; // already answered
    setSelectedTrivia(optionId);
    try {
      localStorage.setItem("kff_news_demo_trivia", optionId);
    } catch {
      // ignore
    }
    const isCorrect = TRIVIA_QUESTION.options.find((o) => o.id === optionId)?.correct;
    if (isCorrect) {
      const newStreak = triviaStreak + 1;
      setTriviaStreak(newStreak);
      try {
        localStorage.setItem("kff_news_demo_streak", newStreak.toString());
      } catch {
        // ignore
      }
      toast.success("Spot on! 🎉", {
        description: `You've got a ${newStreak}-day market trivia streak!`,
      });
    } else {
      toast.error("Not quite! Check the explanation below 💡");
    }
  };

  const totalVotes = poll.bulls + poll.bears;
  const bullPct = Math.round((poll.bulls / totalVotes) * 100);
  const bearPct = 100 - bullPct;

  return (
    <div className="mb-5 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all dark:bg-card/90">
      {/* Top Header & Interactive Segmented Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight text-foreground">Market Hub</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Interactive
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Community sentiment, 60s briefing & daily trivia</p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-full shrink-0 border border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab("pulse")}
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              activeTab === "pulse"
                ? "bg-foreground text-background shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🐂 Bull vs Bear</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("espresso")}
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              activeTab === "espresso"
                ? "bg-foreground text-background shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coffee className="h-3 w-3" />
            <span>60s Espresso</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trivia")}
            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              activeTab === "trivia"
                ? "bg-foreground text-background shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HelpCircle className="h-3 w-3" />
            <span>Daily Quiz</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Bull vs Bear Sentiment Poll */}
      {activeTab === "pulse" && (
        <div className="pt-3.5 space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Today's Community Poll
              </span>
              <h4 className="text-sm font-semibold text-foreground mt-0.5 leading-snug">
                {poll.question}
              </h4>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-muted-foreground tabular-nums">
                {totalVotes.toLocaleString()} votes
              </span>
            </div>
          </div>

          {/* Voting Action or Results */}
          {!userVote ? (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleVote("bull")}
                className="group relative flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 p-3 text-emerald-700 dark:text-emerald-300 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🐂</span>
                <span>Bullish</span>
                <span className="text-xs opacity-75 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>

              <button
                type="button"
                onClick={() => handleVote("bear")}
                className="group relative flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 p-3 text-rose-700 dark:text-rose-300 font-bold text-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <span className="text-lg">🐻</span>
                <span>Bearish</span>
                <span className="text-xs opacity-75 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {/* Animated Progress Bar */}
              <div className="relative h-9 w-full overflow-hidden rounded-xl bg-muted/60 p-1 flex items-center">
                <div
                  className="h-full rounded-lg bg-emerald-500/80 transition-all duration-700 flex items-center px-3"
                  style={{ width: `${bullPct}%` }}
                >
                  <span className="text-xs font-extrabold text-white whitespace-nowrap">
                    🐂 {bullPct}% Bullish
                  </span>
                </div>
                <div
                  className="h-full rounded-lg bg-rose-500/80 transition-all duration-700 flex items-center justify-end px-3 ml-auto"
                  style={{ width: `${bearPct}%` }}
                >
                  <span className="text-xs font-extrabold text-white whitespace-nowrap">
                    {bearPct}% Bearish 🐻
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>
                  You voted:{" "}
                  <strong className={userVote === "bull" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                    {userVote === "bull" ? "Bullish 🐂" : "Bearish 🐻"}
                  </strong>
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Vote recorded
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: 60-Second Market Espresso */}
      {activeTab === "espresso" && (
        <div className="pt-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Today's Key Market Takeaways
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Updated 8:30 AM EAT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {ESPRESSO_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border/70 bg-muted/30 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.tag}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-foreground leading-snug">{item.headline}</h5>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Daily Market Trivia Quiz */}
      {activeTab === "trivia" && (
        <div className="pt-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Award className="h-3 w-3" /> Daily Finance Quiz
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
              <Flame className="h-3 w-3" /> {triviaStreak} Day Streak
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-semibold text-foreground leading-relaxed">
            {TRIVIA_QUESTION.question}
          </h4>

          {/* Options */}
          <div className="grid grid-cols-3 gap-2">
            {TRIVIA_QUESTION.options.map((opt) => {
              const isChosen = selectedTrivia === opt.id;
              const hasAnswered = !!selectedTrivia;
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
                  onClick={() => handleTriviaAnswer(opt.id)}
                  disabled={hasAnswered}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all active:scale-95 cursor-pointer disabled:cursor-default ${btnStyle}`}
                >
                  <span className="font-extrabold text-sm">{opt.text}</span>
                  {hasAnswered && isCorrect && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Correct ✓</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation reveal */}
          {selectedTrivia && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-foreground/90 leading-relaxed">
              <p>
                <strong>💡 Why:</strong> {TRIVIA_QUESTION.options.find((o) => o.correct)?.explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
