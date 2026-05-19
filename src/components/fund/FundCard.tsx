import { Link } from "react-router-dom";
import { Heart, Shield, ArrowRight, Clock, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Sparkline from "@/components/Sparkline";
import FundScoreDiamond from "./FundScoreDiamond";
import { computeFundScore, SCORE_BAND_LABEL } from "@/lib/fundScore";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

interface Props {
  fund: FundFromDB;
  peerMedians?: Record<string, number>;
  history?: YieldSnapshot[];
  isFavourite?: boolean;
  onToggleFavourite?: (id: string, name: string) => void;
  /** Path prefix to fund report; defaults to /funds/:slug */
  href?: string;
}

const riskTone: Record<string, string> = {
  low: "bg-accent/10 text-accent border-accent/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};

const fmtKes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

const FundCard = ({ fund, peerMedians = {}, history, isFavourite, onToggleFavourite, href }: Props) => {
  const score = computeFundScore(fund, peerMedians);
  const reportHref = href ?? `/funds/${fund.slug}`;
  const sparkData = history?.map((s) => Number(s.annual_yield)) ?? [];
  const risk = (fund.risk_level ?? "low") as keyof typeof riskTone;
  const isBeginnerFriendly =
    risk === "low" && fund.cma_licensed && (fund.minimum_investment ?? 0) <= 5000;

  return (
    <article className="group relative rounded-xl border border-border bg-card hover:border-accent/50 transition-colors p-4 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <Link to={reportHref} className="block">
            <h3 className="font-heading text-base sm:text-lg leading-tight text-foreground group-hover:text-accent transition-colors line-clamp-2">
              {fund.name}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{fund.manager}</p>
        </div>
        {onToggleFavourite && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavourite(fund.id, fund.name);
            }}
            aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
            className="shrink-0 h-8 w-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
          >
            <Heart className={`h-4 w-4 ${isFavourite ? "fill-accent text-accent" : ""}`} />
          </button>
        )}
      </div>

      {/* Score + key yields */}
      <div className="flex items-center gap-4">
        <Link to={reportHref} className="shrink-0" aria-label="View fund report">
          <FundScoreDiamond score={score} size={64} />
        </Link>
        <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Annual yield</p>
            <p className="font-mono text-xl font-bold text-accent tabular-nums leading-tight">
              {fund.annual_yield.toFixed(2)}<span className="text-xs">%</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Daily yield</p>
            <p className="font-mono text-base text-foreground tabular-nums leading-tight">
              {fund.daily_yield.toFixed(3)}<span className="text-xs text-muted-foreground">%</span>
            </p>
          </div>
          <div className="col-span-2 flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> Min {fmtKes(fund.minimum_investment)}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {fund.withdrawal_time}</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={`text-[10px] rounded-full border ${riskTone[risk]}`}>
          {risk === "low" ? "Low risk" : risk === "medium" ? "Medium risk" : "High risk"}
        </Badge>
        {fund.cma_licensed && (
          <Badge variant="outline" className="text-[10px] rounded-full gap-1 border-accent/30 text-accent">
            <Shield className="h-3 w-3" /> CMA regulated
          </Badge>
        )}
        {isBeginnerFriendly && (
          <Badge variant="outline" className="text-[10px] rounded-full border-info/30 text-info">
            Beginner friendly
          </Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/70 tabular-nums">
          {SCORE_BAND_LABEL[score.band]}
        </span>
      </div>

      {/* Sparkline + footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60">
        <div className="h-6 w-24">
          {sparkData.length >= 2 ? (
            <Sparkline data={sparkData} width={96} height={24} color="auto" />
          ) : (
            <span className="text-[10px] text-muted-foreground/60">No history</span>
          )}
        </div>
        <Link
          to={reportHref}
          className="text-xs font-medium text-accent inline-flex items-center gap-1 hover:gap-1.5 transition-all"
        >
          View report <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
};

export default FundCard;
