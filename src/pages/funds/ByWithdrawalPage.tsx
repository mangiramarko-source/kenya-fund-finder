import DataViewPage from "@/components/funds/DataViewPage";
import FundDataTable from "@/components/funds/FundDataTable";

const ByWithdrawalPage = () => (
  <DataViewPage
    title="Funds by Withdrawal Period"
    intro="Published funds sorted by the typical settlement time between a redemption request and money being paid out, as published by each fund manager."
    methodology="Withdrawal periods are taken from the fund's published fact sheet. Actual processing times can vary by bank, time of day, and operational factors. Confirm the current settlement window with the fund manager before relying on it."
    seoTitle="Funds by Withdrawal Period — KenyaFundFinder"
    seoDescription="Kenyan unit trusts and money market funds sorted by the published withdrawal settlement period."
  >
    {(funds) => <FundDataTable funds={funds} defaultSort="withdrawal" defaultDir="asc" showCategory />}
  </DataViewPage>
);

export default ByWithdrawalPage;
