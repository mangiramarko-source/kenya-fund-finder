import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('treasury_bill_auctions').select('issue_number,tenor_days,auction_date,issue_date,amount_offered,bids_received,amount_accepted,market_average_rate,accepted_average_rate,previous_rate,performance_rate').order('auction_date', { ascending: false }).limit(6);
  console.log(data);
}
main();
