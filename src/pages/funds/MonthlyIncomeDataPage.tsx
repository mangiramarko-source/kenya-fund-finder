import { Link } from "react-router-dom";
import DataViewPage from "@/components/funds/DataViewPage";

const PRINCIPAL = 100_000;
const WHT = 0.15;
const formatKES = (n: number) => `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const formatKESDecimal = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MonthlyIncomeDataPage = () => (
  <DataViewPage
    title="Monthly Income Data"
    intro={`A reference table showing the indicative daily and monthly interest that ${formatKES(PRINCIPAL)} would generate at each fund's current published annual yield. Figures are illustrative only.`}
    methodology={`Calculated as principal × annual yield ÷ 365 for the daily figure, then multiplied by 30 for the monthly figure. The "net of WHT" column applies the 15% Kenyan withholding tax on interest. The actual amount you receive will depend on when interest is credited, your fund's accrual rules, and the actual number of days. Confirm with the fund manager.`}
    seoTitle="Monthly Income Data — KenyaFundFinder"
    seoDescription="Indicative daily and monthly interest on KES 100,000 invested in Kenyan unit trusts at current published yields."
    filter={(f) => Number.isFinite(f.daily_yield)}
  >
    {(funds) => {
      const rows = [...funds]
        .sort((a, b) => b.annual_yield - a.annual_yield)
        .map((f) => {
          const annualRate = f.annual_yield / 100;
          const dailyGross = (PRINCIPAL * annualRate) / 365;
          const monthlyGross = dailyGross * 30;
          const monthlyNet = monthlyGross * (1 - WHT);
          return { fund: f, dailyGross, monthlyGross, monthlyNet };
        });

      return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Fund</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Annual rate</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Daily interest</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Monthly (gross)</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Monthly (net of WHT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {rows.map(({ fund, dailyGross, monthlyGross, monthlyNet }) => (
                  <tr key={fund.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <Link to={`/compare/${fund.slug}`} className="font-semibold text-foreground hover:text-accent">
                        {fund.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{fund.manager}</p>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fund.annual_yield.toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{formatKESDecimal(dailyGross)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatKES(monthlyGross)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatKES(monthlyNet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border/40">
            {rows.map(({ fund, dailyGross, monthlyGross, monthlyNet }) => (
              <div key={fund.id} className="p-3.5">
                <Link to={`/compare/${fund.slug}`} className="font-semibold text-sm text-foreground hover:text-accent">
                  {fund.name}
                </Link>
                <p className="text-[11px] text-muted-foreground">{fund.manager}</p>
                <div className="grid grid-cols-2 gap-2 mt-2.5">
                  <Cell label="Annual rate" value={`${fund.annual_yield.toFixed(2)}%`} />
                  <Cell label="Daily" value={formatKESDecimal(dailyGross)} />
                  <Cell label="Monthly gross" value={formatKES(monthlyGross)} />
                  <Cell label="Monthly net" value={formatKES(monthlyNet)} highlight />
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border/40 bg-muted/20 text-[11px] text-muted-foreground">
            Figures are indicative only, based on {formatKES(PRINCIPAL)} principal and each fund's currently published annual yield.
          </div>
        </div>
      );
    }}
  </DataViewPage>
);

const Cell = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-sm tabular-nums ${highlight ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{value}</p>
  </div>
);

export default MonthlyIncomeDataPage;
