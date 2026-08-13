import pdfplumber
import io
import re
from datetime import datetime
from .base import BaseCBKScraper

class BondAuctionScraper(BaseCBKScraper):
    BOND_URL = "https://www.centralbank.go.ke/bills-bonds/treasury-bonds/"

    def extract_data_from_pdf(self, pdf_bytes: bytes):
        """
        Extracts Treasury Bond auction results or prospectus information.
        """
        data = {}
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            text = pdf.pages[0].extract_text()
            
            # Example extraction for bond code:
            bond_code_match = re.search(r'Bond\s+Issue\s+No\.?\s+([\w\d/.]+)', text, re.IGNORECASE)
            if bond_code_match:
                data['bond_code'] = bond_code_match.group(1).strip()
            
            # Amount offered
            amount_match = re.search(r'Amount\s+Offered\s+\(?Kshs\.?\s*m\)?\s+([\d,.]+)', text, re.IGNORECASE)
            if amount_match:
                data['amount_offered'] = self.normalize_value(amount_match.group(1), 'KSh M')

            # Coupon rate
            coupon_match = re.search(r'Coupon\s+Rate\s*\(?%\)?\s+([\d.]+)', text, re.IGNORECASE)
            if coupon_match:
                data['coupon_rate'] = float(coupon_match.group(1))

        return data

    def run(self):
        self.logger.info("Starting Treasury Bond Scraper")
        soup = self.fetch_page(self.BOND_URL)
        # Often bond results are categorized by 'prospectus' or 'auction results'
        pdf_links = self.find_pdf_links(soup, section_keywords=['Auction Results', 'Prospectus'])
        
        for link in pdf_links:
            pdf_bytes = self.download_pdf(link)
            parsed_data = self.extract_data_from_pdf(pdf_bytes)
            self.logger.info(f"Extracted Bond Data: {parsed_data}")
            # Insert into database layer
