import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function snapshot() {
  const { data: db_records, error } = await supabase
    .from('treasury_bill_auctions')
    .select('*')
    .order('issue_number', { ascending: false })

  if (error) {
    console.error("Error fetching:", error)
    return
  }

  let count91 = 0
  let count182 = 0
  let count364 = 0

  let latest91 = null
  let latest182 = null
  let latest364 = null

  for (const rec of db_records) {
    if (rec.tenor_days === 91) {
      count91++
      if (!latest91) latest91 = rec
    }
    if (rec.tenor_days === 182) {
      count182++
      if (!latest182) latest182 = rec
    }
    if (rec.tenor_days === 364) {
      count364++
      if (!latest364) latest364 = rec
    }
  }

  console.log(`91-Day: ${count91}`)
  console.log(`182-Day: ${count182}`)
  console.log(`364-Day: ${count364}`)
  console.log(`Total: ${db_records.length}`)
  console.log('Latest 91:', latest91)
  console.log('Latest 182:', latest182)
  console.log('Latest 364:', latest364)
}

snapshot()
