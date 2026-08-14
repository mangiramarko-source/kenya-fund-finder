import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function insertBackfill() {
  const raw = fs.readFileSync('dry_run_observations.json', 'utf8')
  const candidates = JSON.parse(raw)

  let inserted = 0
  let skipped = 0
  let errors = 0

  for (const cand of candidates) {
    if (cand.issue_number === 'UNKNOWN' || !cand.date || cand.date === 'UNKNOWN') {
      skipped++
      continue
    }

    const payload = {
      tenor_days: cand.tenor,
      issue_number: cand.issue_number.toString() + '/' + cand.tenor.toString().padStart(3, '0'),
      auction_date: cand.date,
      issue_date: cand.date,
      maturity_date: new Date(new Date(cand.date).getTime() + cand.tenor * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount_offered: cand.offered ? cand.offered * 1000000 : null,
      bids_received: cand.received ? cand.received * 1000000 : null,
      amount_accepted: cand.accepted ? cand.accepted * 1000000 : null,
      accepted_average_rate: cand.rate,
      performance_rate: cand.performance_rate,
      market_average_rate: cand.market_average_rate,
      source_url: cand.url,
      source_document: cand.url.split('/').pop()
    }

    // Attempt insertion with ignoreDuplicates
    const { error } = await supabase
      .from('treasury_bill_auctions')
      .upsert(payload, { onConflict: 'issue_number, tenor_days', ignoreDuplicates: true })

    if (error) {
      console.error(`Error inserting ${payload.issue_number}:`, error.message)
      errors++
    } else {
      inserted++
    }
  }

  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
}

insertBackfill()
