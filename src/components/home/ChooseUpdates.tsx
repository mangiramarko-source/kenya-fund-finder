import { useRef, useState } from "react";
import { BellRing, Mail, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { WelcomeEmailChoices } from "@/hooks/useEmailPreferences";
import { priceAlertMessaging } from "@/lib/priceAlertMessaging";

interface Props {
  initialChoices?: WelcomeEmailChoices;
  onSave: (choices: WelcomeEmailChoices) => Promise<boolean>;
  onContinue: () => void;
  onCreateAlert: () => void;
}

export default function ChooseUpdates({ initialChoices, onSave, onContinue, onCreateAlert }: Props) {
  const [choices, setChoices] = useState<WelcomeEmailChoices>(initialChoices ?? { price_alert_email: false, market_brief_email: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);

  const save = async (skip = false) => {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError(false);
    const next = skip ? { price_alert_email: false, market_brief_email: false } : choices;
    try {
      if (!await onSave(next)) { setError(true); return; }
      setChoices(next);
      setSaved(true);
    } catch { setError(true); }
    finally { lock.current = false; setSaving(false); }
  };

  if (saved) return (
    <div className="min-w-0 space-y-6 py-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Check aria-hidden="true" className="h-6 w-6" /></span>
      <div>
        <DialogTitle className="text-2xl font-semibold tracking-tight">You're all set.</DialogTitle>
        <DialogDescription className="mt-3 leading-relaxed">
          {choices.price_alert_email || choices.market_brief_email ? "Your email choices are saved. You can change them any time." : "Optional email updates are off. You can turn them on any time."}
        </DialogDescription>
      </div>
      {choices.price_alert_email && <div className="space-y-3 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground">{priceAlertMessaging.targetSetup} Turning emails on does not create an alert.</p>
        <Button className="w-full min-h-12 h-auto whitespace-normal py-3" onClick={onCreateAlert}>Create your first price alert <ArrowRight className="ml-2 h-4 w-4 shrink-0" /></Button>
      </div>}
      <Button className="w-full min-h-12 h-auto whitespace-normal py-3" variant={choices.price_alert_email ? "outline" : "default"} onClick={onContinue}>Explore the dashboard</Button>
    </div>
  );

  const options = [
    { key: "price_alert_email" as const, title: priceAlertMessaging.onboardingTitle, detail: priceAlertMessaging.onboardingDescription, note: "You'll choose the asset and target separately.", Icon: BellRing },
    { key: "market_brief_email" as const, title: "Market Brief & Morning News", detail: "Send me market summaries and weekday morning news highlights.", note: "Built from available, quality-checked market and news data.", Icon: Mail },
  ];
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-emerald-600 dark:text-emerald-400 uppercase"><span className="h-5 w-1 rounded-full bg-emerald-500" /> KenyaFundFinder <span className="ml-auto mr-5 text-muted-foreground tracking-normal font-normal normal-case">Optional</span></div>
      <div>
        <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">Choose your updates</DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-relaxed">A little market context, on your terms. Choose the emails you'd like. Your account works either way.</DialogDescription>
      </div>
      <fieldset disabled={saving} className="min-w-0 space-y-3">
        <legend className="sr-only">Optional email subscriptions</legend>
        {options.map(({ key, title, detail, note, Icon }) => (
          <label key={key} className={`flex cursor-pointer items-start gap-3 sm:gap-4 rounded-xl border p-4 sm:p-5 transition-colors ${choices[key] ? "border-emerald-600 dark:border-emerald-400 bg-emerald-500/5" : "border-border bg-background"}`}>
            <Icon aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{detail}</span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{note}</span></span>
            <input type="checkbox" aria-label={title} checked={choices[key]} onChange={e => setChoices(prev => ({ ...prev, [key]: e.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-emerald-600 cursor-pointer" />
          </label>
        ))}
      </fieldset>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 mt-0.5" /><span>Change your choices in Alerts → Settings or unsubscribe from an update. Sign-in and account-security emails are separate.</span></p>
      {error && <div role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">We couldn't confirm your choices were saved. Please retry, or continue without saving.</div>}
      <div className="space-y-2">
        <Button disabled={saving} className="w-full min-h-12 h-auto whitespace-normal py-3 text-sm" onClick={() => void save()}>{saving ? "Saving your choices…" : "Save choices & continue"} {!saving && <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4 shrink-0" />}</Button>
        <Button disabled={saving} variant="ghost" className="w-full min-h-11 h-auto whitespace-normal py-3 text-muted-foreground" onClick={() => void save(true)}>No thanks, continue without updates</Button>
        {error && <Button disabled={saving} variant="link" className="w-full h-auto whitespace-normal" onClick={onContinue}>Continue without saving</Button>}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">This saves preferences only. No email is sent now.</p>
    </div>
  );
}
