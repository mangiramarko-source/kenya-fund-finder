import DataViewPage from "@/components/funds/DataViewPage";
import FundDataTable from "@/components/funds/FundDataTable";

const ByMinimumPage = () => (
  <DataViewPage
    title="Funds by Minimum Investment"
    intro="All published funds in our database, ordered by the minimum amount needed to open an account. The lower the minimum, the more accessible the fund is for first-time investors."
    methodology="Sorted ascending by the published minimum initial investment. Some fund managers require a higher minimum for top-up contributions — confirm with the fund manager before opening an account."
    seoTitle="Funds by Minimum Investment — KenyaFundFinder"
    seoDescription="Kenyan unit trusts and money market funds sorted by minimum initial investment in KES."
  >
    {(funds) => <FundDataTable funds={funds} defaultSort="minimum_investment" defaultDir="asc" showCategory />}
  </DataViewPage>
);

export default ByMinimumPage;
