import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const pdf = require('pdf-parse');

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function getMonthIssues(yearMonth, limit) {
  const startDate = `${yearMonth}-01`
  const endDate = `${yearMonth}-31`
  const { data, error } = await supabase
    .from('treasury_bill_auctions')
    .select('*')
    .eq('tenor_days', 91)
    .gte('auction_date', startDate)
    .lte('auction_date', endDate)
    .limit(limit)
  
  if (error) {
    console.error(`Error fetching for ${yearMonth}:`, error)
    return []
  }
  return data || []
}

async function extractPdfText(url) {
  try {
    const res = await fetch(url)
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdf(buffer)
    return data.text
  } catch (err) {
    return err.toString()
  }
}

async function runAudit() {
  const selectedAuctions = []
  selectedAuctions.push(...await getMonthIssues('2025-08', 1))
  selectedAuctions.push(...await getMonthIssues('2025-09', 1))
  selectedAuctions.push(...await getMonthIssues('2025-10', 2))
  selectedAuctions.push(...await getMonthIssues('2025-12', 2))
  selectedAuctions.push(...await getMonthIssues('2026-02', 2))
  selectedAuctions.push(...await getMonthIssues('2026-04', 2))
  selectedAuctions.push(...await getMonthIssues('2026-06', 2))
  selectedAuctions.push(...await getMonthIssues('2026-08', 2))

  console.log(`Selected ${selectedAuctions.length} auctions for independent verification.`)

  for (const auction of selectedAuctions) {
    const date = auction.auction_date
    const url = auction.source_url
    
    const { data: records } = await supabase
      .from('treasury_bill_auctions')
      .select('*')
      .eq('auction_date', date)

    console.log(`\n--- VERIFYING AUCTION ${date} ---`)
    console.log(`URL: ${url}`)
    
    const text = await extractPdfText(url)
    console.log("--- PDF EXTRACT START ---")
    const lines = text.split('\n')
    // Get interesting lines around the table
    const keyLines = [text.substring(0, 1000)]
    console.log(keyLines.join('\n'))
    console.log("--- PDF EXTRACT END ---")
    
    for (const r of records) {
      console.log(`DB Record: Tenor=${r.tenor_days}, Issue=${r.issue_number}, Rate=${r.accepted_average_rate}, Offered=${r.amount_offered}, Bids=${r.bids_received}, Accepted=${r.amount_accepted}`)
    }
  }
}

runAudit()
