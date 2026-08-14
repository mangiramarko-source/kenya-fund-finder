import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data: db_records, error } = await supabase
    .from('treasury_bill_auctions')
    .select('*')

  if (error) {
    console.error("Error fetching:", error)
    return
  }

  const db_map = new Map()
  for (const rec of db_records) {
    db_map.set(`${rec.issue_number}_${rec.tenor_days}`, rec)
  }

  const raw = fs.readFileSync('dry_run_observations.json', 'utf8')
  const candidates = JSON.parse(raw)

  let newCount = 0
  let exact = 0
  let conflict = 0
  let modified = 0

  for (const cand of candidates) {
    const key = `${cand.issue_number}_${cand.tenor}`
    if (!db_map.has(key)) {
      newCount++
    } else {
      const db_rec = db_map.get(key)
      const c_rate = cand.rate
      const d_rate = db_rec.accepted_average_rate
      if (Math.abs(c_rate - d_rate) < 0.001) {
        exact++
      } else {
        conflict++
        modified++
      }
    }
  }

  console.log(`Existing production records: ${db_records.length}`)
  console.log(`Candidate observations: ${candidates.length}`)
  console.log(`NEW: ${newCount}`)
  console.log(`EXACT_DUPLICATE: ${exact}`)
  console.log(`CONFLICT: ${conflict}`)
  console.log(`Existing verified records that would be modified: ${modified}`)
}

check()
