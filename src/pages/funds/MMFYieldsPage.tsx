import DataViewPage from "@/components/funds/DataViewPage";
import FundDataTable from "@/components/funds/FundDataTable";

const MMFYieldsPage = () => (
  <DataViewPage
    title="MMF Yield Table"
    intro="A list of Money Market Funds in our database with their published yields, minimum investment, fees, and withdrawal periods. Use the column headers to sort."
    methodology="Includes funds with fund type = Money Market that are marked as published in our database. Yields shown are gross annual effective rates as published by each fund manager, before the 15% withholding tax. Past yields do not guarantee future returns."
    seoTitle="MMF Yield Table — KenyaFundFinder"
    seoDescription="Money Market Fund yields published by Kenyan fund managers. Compare annual rate, daily yield, minimum investment, fees and withdrawal periods."
    filter={(f) => f.fund_type === "money_market"}
  >
    {(funds) => <FundDataTable funds={funds} defaultSort="annual_yield" />}
  </DataViewPage>
);

export default MMFYieldsPage;
