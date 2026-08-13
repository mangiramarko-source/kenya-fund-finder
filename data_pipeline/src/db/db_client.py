import os
from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

class DatabaseClient:
    def __init__(self):
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            logger.warning("Supabase credentials not found in environment. Database operations will fail.")
            self.supabase = None
        else:
            self.supabase: Client = create_client(url, key)

    def upsert_tbill_auction(self, data: dict):
        if not self.supabase:
            return
            
        try:
            # We use issue_number and tenor_days to uniquely identify a T-Bill auction
            response = self.supabase.table('treasury_bill_auctions').upsert(
                data, 
                on_conflict='issue_number,tenor_days'
            ).execute()
            logger.info(f"Successfully upserted T-Bill data: {response.data}")
            return response.data
        except Exception as e:
            logger.error(f"Failed to upsert T-Bill auction: {e}")
            raise

    def upsert_bond(self, data: dict):
        if not self.supabase:
            return
            
        try:
            response = self.supabase.table('treasury_bonds').upsert(
                data, 
                on_conflict='bond_code'
            ).execute()
            logger.info(f"Successfully upserted Bond data: {response.data}")
            return response.data
        except Exception as e:
            logger.error(f"Failed to upsert Bond: {e}")
            raise

    def insert_macro_rate(self, data: dict):
        if not self.supabase:
            return
            
        try:
            response = self.supabase.table('macro_rates').insert(data).execute()
            logger.info(f"Successfully inserted Macro Rate: {response.data}")
            return response.data
        except Exception as e:
            logger.error(f"Failed to insert Macro Rate: {e}")
            raise
