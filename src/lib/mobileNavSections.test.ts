import { describe, expect, it } from "vitest";
import {
  buildBankingTabOptions,
  buildFundCategoryOptions,
  buildMacroTabOptions,
  parseBankingTabFromSearch,
  parseFundCategoryFromSearch,
  parseMacroTabFromLocation,
  resolveMobileNavSectionKind,
} from "./mobileNavSections";

describe("mobileNavSections", () => {
  it("resolves section kinds only for the target mobile top-nav dropdown routes", () => {
    expect(resolveMobileNavSectionKind("/funds")).toBe("funds");
    expect(resolveMobileNavSectionKind("/funds/")).toBe("funds");
    expect(resolveMobileNavSectionKind("/savings")).toBe("banking");
    expect(resolveMobileNavSectionKind("/rates")).toBe("macro");
    expect(resolveMobileNavSectionKind("/commodities")).toBe("macro");
    expect(resolveMobileNavSectionKind("/treasury")).toBeNull();
    expect(resolveMobileNavSectionKind("/stocks")).toBeNull();
    expect(resolveMobileNavSectionKind("/")).toBeNull();
  });

  it("parses fund category, banking tab, and macro tab from URL state", () => {
    expect(parseFundCategoryFromSearch("")).toBe("money_market");
    expect(parseFundCategoryFromSearch("?category=equity")).toBe("equity");
    expect(parseFundCategoryFromSearch("?category=invalid")).toBe("money_market");

    expect(parseBankingTabFromSearch("")).toBe("fixed-deposits");
    expect(parseBankingTabFromSearch("?tab=saccos")).toBe("saccos");
    expect(parseBankingTabFromSearch("?tab=tbills")).toBe("tbills");
    expect(parseBankingTabFromSearch("?tab=t-bills")).toBe("tbills");
    expect(parseBankingTabFromSearch("?tab=treasury")).toBe("tbills");

    expect(parseMacroTabFromLocation("/rates", "")).toBe("fx");
    expect(parseMacroTabFromLocation("/rates", "?tab=commodities")).toBe("commodities");
    expect(parseMacroTabFromLocation("/commodities", "")).toBe("commodities");
  });

  it("builds option lists with concise labels and counts", () => {
    const fundOpts = buildFundCategoryOptions();
    expect(fundOpts[0].id).toBe("all");
    expect(fundOpts.some((o) => o.id === "money_market" && o.pillLabel === "Money Market")).toBe(true);

    const bankingOpts = buildBankingTabOptions({ deposits: 18, saccos: 15 });
    expect(bankingOpts.map((o) => o.id)).toEqual(["fixed-deposits", "saccos", "tbills"]);
    expect(bankingOpts[0].countText).toBe("18 rates");
    expect(bankingOpts[1].countText).toBe("15 SACCOs");
    expect(bankingOpts[2].countText).toBe("CBK");

    const macroOpts = buildMacroTabOptions({ fx: 16, commodities: 9 });
    expect(macroOpts.map((o) => o.id)).toEqual(["fx", "commodities"]);
    expect(macroOpts[0].countText).toBe("16 pairs");
    expect(macroOpts[1].countText).toBe("9 items");
  });
});
