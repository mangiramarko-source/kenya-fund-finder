import DataViewPage from "@/components/funds/DataViewPage";
import FundDataTable from "@/components/funds/FundDataTable";

const ByYieldPage = () => (
  <DataViewPage
    title="Funds by Yield"
    intro="All published funds in our database, sorted by their current annual yield. Switch column sort to reorder by daily yield, fee, minimum investment, or withdrawal period."
    methodology="Includes all published funds across categories. Yields are gross annual effective rates as published by each fund manager, before the 15% withholding tax. Different fund categories have different risk profiles — a higher yield does not necessarily mean a better fund. Past yields do not guarantee future returns."
    seoTitle="Funds by Yield — KenyaFundFinder"
    seoDescription="All Kenyan unit trusts and money market funds sorted by published annual yield. Includes minimum investment, fees, and withdrawal periods."
  >
    {(funds) => <FundDataTable funds={funds} defaultSort="annual_yield" showCategory />}
  </DataViewPage>
);

export default ByYieldPage;
