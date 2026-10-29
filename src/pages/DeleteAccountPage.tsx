import { Trash2, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function DeleteAccountPage() {
  const { user } = useAuth();

  return (
    <div className="container py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Trash2 className="h-8 w-8 text-destructive" />
        <h1 className="text-2xl md:text-3xl font-bold">Request Account & Data Deletion</h1>
      </div>

      <p className="text-sm text-muted-foreground mb-8">
        Last updated: October 2026 | Compliant with Google Play Developer Policy & Kenya Data Protection Act (KDPA 2019)
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Overview</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            At Kenya Fund Finder (operated by <strong>Elyon Innovation LTD</strong>), we respect your right to control your personal data.
            Under Google Play Developer Policy and the Kenya Data Protection Act (2019), you have the right to request the permanent deletion of your account and all associated personal records at any time without fee.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. What Data Is Deleted?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            When your deletion request is processed, the following information is permanently and irrevocably purged from our systems:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1.5">
            <li><strong>Account Identity:</strong> Your user ID, email address, display name, avatar, and encrypted authentication credentials.</li>
            <li><strong>Portfolio & Tracking:</strong> All recorded mock portfolio holdings, transaction history events, and portfolio cash flows.</li>
            <li><strong>Watchlists & Alerts:</strong> All custom stock, fund, and currency watchlists, saved favorites, and configured price alert thresholds.</li>
            <li><strong>Device & Communication Tokens:</strong> Push notification tokens, email preference records, and device identifiers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. How to Delete Your Account</h2>
          <div className="grid gap-4 sm:grid-cols-2 not-prose my-4">
            {/* Option A: In-App / On Website */}
            <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Method 1 (Instant)
                </span>
                <h3 className="text-base font-bold mt-1">In-App Deletion</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  If you are currently signed in, you can delete your account immediately from your profile settings.
                </p>
              </div>
              <Button asChild className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold h-10">
                <Link to={user ? "/profile" : "/auth"}>
                  {user ? "Go to Profile & Delete" : "Sign in to Delete"} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>

            {/* Option B: Web Request without App */}
            <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Method 2 (No App Needed)
                </span>
                <h3 className="text-base font-bold mt-1">Submit Deletion Request</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Send an email from your registered account email address to our Data Protection support team.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl text-xs font-semibold h-10 border-border">
                <a href="mailto:kenyafundfinder@outlook.com?subject=KenyaFundFinder%20Account%20Deletion%20Request">
                  <Mail className="h-3.5 w-3.5 mr-1.5" /> Email Privacy Support
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Processing Timeline & Confirmation</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In-app account deletion is executed immediately. Manual email requests are verified and permanently completed within <strong>30 days</strong> in accordance with statutory guidelines under Kenyan law. Once deleted, you will receive written confirmation, and your access cannot be recovered.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Data Retention Exceptions</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain zero personal information after account deletion. Only anonymized, aggregated platform performance statistics that cannot be linked back to any individual may be retained.
          </p>
        </section>
      </div>
    </div>
  );
}
