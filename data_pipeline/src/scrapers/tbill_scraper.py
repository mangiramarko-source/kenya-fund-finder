import pdfplumber
import io
import re
from datetime import datetime
from .base import BaseCBKScraper

class TBillAuctionScraper(BaseCBKScraper):
    TBILL_URL = "https://www.centralbank.go.ke/bills-bonds/treasury-bills/"

    def extract_data_from_pdf(self, pdf_bytes: bytes):
        """
        Uses pdfplumber to extract text and tables from the CBK T-Bill auction PDF.
        """
        data = {}
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            # CBK auction results are usually single page
            first_page = pdf.pages[0]
            text = first_page.extract_text()
            
            # Simple regex examples to extract fields
            # E.g. "Amount Offered (Kshs. M) 4,000.00 10,000.00 10,000.00"
            amount_offered_match = re.search(r'Amount Offered \(Kshs\.?\s*M\)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)', text)
            if amount_offered_match:
                data['amount_offered'] = {
                    91: self.normalize_value(amount_offered_match.group(1), 'KSh M'),
                    182: self.normalize_value(amount_offered_match.group(2), 'KSh M'),
                    364: self.normalize_value(amount_offered_match.group(3), 'KSh M')
                }

            bids_received_match = re.search(r'Bids Received \(Kshs\.?\s*M\)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)', text)
            if bids_received_match:
                data['bids_received'] = {
                    91: self.normalize_value(bids_received_match.group(1), 'KSh M'),
                    182: self.normalize_value(bids_received_match.group(2), 'KSh M'),
                    364: self.normalize_value(bids_received_match.group(3), 'KSh M')
                }

            # TODO: Implement full extraction logic (Dates, Rates, Issue Numbers) based on actual PDF table structures.
            # We would typically use pdfplumber.extract_tables() for more robust extraction if text regex is flaky.
            
        return data

    def run(self):
        self.logger.info("Starting T-Bill Scraper")
        soup = self.fetch_page(self.TBILL_URL)
        pdf_links = self.find_pdf_links(soup, section_keywords=['Auction Results', 'T-Bill Results'])
        
        for link in pdf_links:
            pdf_bytes = self.download_pdf(link)
            parsed_data = self.extract_data_from_pdf(pdf_bytes)
            self.logger.info(f"Extracted Data: {parsed_data}")
            # Insert into database layer
