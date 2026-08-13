import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BaseCBKScraper:
    BASE_URL = "https://www.centralbank.go.ke"
    
    def __init__(self):
        self.session = requests.Session()
        # Add headers to mimic a normal browser request
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def fetch_page(self, url: str) -> BeautifulSoup:
        """Fetches a page and returns the parsed BeautifulSoup object."""
        try:
            logger.info(f"Fetching {url}")
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            raise

    def find_pdf_links(self, soup: BeautifulSoup, section_keywords=None) -> list[str]:
        """Finds all PDF links on a page, optionally filtering by text keywords."""
        links = []
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            text = a_tag.get_text(strip=True).lower()
            
            if href.endswith('.pdf'):
                if section_keywords:
                    if any(kw.lower() in text for kw in section_keywords):
                        links.append(urljoin(self.BASE_URL, href))
                else:
                    links.append(urljoin(self.BASE_URL, href))
        return list(set(links))

    def download_pdf(self, pdf_url: str) -> bytes:
        """Downloads the PDF and returns its raw bytes."""
        try:
            logger.info(f"Downloading PDF: {pdf_url}")
            response = self.session.get(pdf_url, timeout=30)
            response.raise_for_status()
            return response.content
        except requests.exceptions.RequestException as e:
            logger.error(f"Error downloading PDF {pdf_url}: {e}")
            raise

    def normalize_value(self, raw_value: str, unit: str = None) -> float:
        """
        Normalizes parsed text values into numerical data.
        e.g., '10,000' with unit 'KSh M' -> 10,000,000,000
        """
        if not raw_value:
            return 0.0
            
        clean_val = raw_value.replace(',', '').replace('%', '').strip()
        try:
            val = float(clean_val)
            if unit == 'KSh M' or unit == 'Millions':
                val *= 1_000_000
            elif unit == 'KSh B' or unit == 'Billions':
                val *= 1_000_000_000
            return val
        except ValueError:
            logger.warning(f"Could not convert '{raw_value}' to float.")
            return 0.0

    def run(self):
        """Main execution method to be overridden by subclasses."""
        raise NotImplementedError("Subclasses must implement the run() method.")
