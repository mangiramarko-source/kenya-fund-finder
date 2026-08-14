import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function runAudit() {
  const { data, error } = await supabase.from('treasury_bill_auctions').select('*').order('auction_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching data:', error)
    return
  }

  console.log(`TOTAL RECORDS: ${data.length}`)
  
  const tenor91 = data.filter(d => d.tenor_days === 91)
  const tenor182 = data.filter(d => d.tenor_days === 182)
  const tenor364 = data.filter(d => d.tenor_days === 364)
  
  console.log(`91-Day: ${tenor91.length}`)
  console.log(`182-Day: ${tenor182.length}`)
  console.log(`364-Day: ${tenor364.length}`)
  
  // Date semantics check
  console.log('\n--- DATE SEMANTICS CHECK ---')
  data.slice(0, 5).forEach(d => {
    console.log(`Issue ${d.issue_number}: auction_date=${d.auction_date}, issue_date=${d.issue_date}, maturity_date=${d.maturity_date}`)
  })
  
  // Duplicates Definition A: issue_number + tenor_days
  const defA = new Set()
  let collA = 0
  data.forEach(d => {
    const key = `${d.issue_number}_${d.tenor_days}`
    if (defA.has(key)) collA++
    defA.add(key)
  })
  
  // Duplicates Definition B: auction_date + tenor_days
  const defB = new Set()
  let collB = 0
  data.forEach(d => {
    const key = `${d.auction_date}_${d.tenor_days}`
    if (defB.has(key)) collB++
    defB.add(key)
  })

  // Duplicates Definition C: issue_number + auction_date + tenor_days
  const defC = new Set()
  let collC = 0
  data.forEach(d => {
    const key = `${d.issue_number}_${d.auction_date}_${d.tenor_days}`
    if (defC.has(key)) collC++
    defC.add(key)
  })

  // Duplicates Definition D: source URL + tenor
  const defD = new Set()
  let collD = 0
  data.forEach(d => {
    const key = `${d.source_url}_${d.tenor_days}`
    if (defD.has(key)) collD++
    defD.add(key)
  })

  console.log('\n--- COLLISION REPORT ---')
  console.log(`Definition A (issue+tenor): ${collA}`)
  console.log(`Definition B (auction+tenor): ${collB}`)
  console.log(`Definition C (issue+auction+tenor): ${collC}`)
  console.log(`Definition D (source+tenor): ${collD}`)
  
  if (collB > 0) {
    console.log('Collisions in B found. Identifying...')
    const bMap = new Map()
    data.forEach(d => {
      const key = `${d.auction_date}_${d.tenor_days}`
      if (!bMap.has(key)) bMap.set(key, [])
      bMap.get(key).push(d.issue_number)
    })
    for (const [k, v] of bMap.entries()) {
      if (v.length > 1) {
        console.log(`Collision for ${k}: ${v.join(', ')}`)
      }
    }
  }

  // 1-Year Chart Data
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]
  
  const in1Y_91 = tenor91.filter(d => d.auction_date >= oneYearAgoStr)
  console.log(`\n--- 1Y CHART WINDOW ---`)
  console.log(`Today is: ${new Date().toISOString().split('T')[0]}`)
  console.log(`1Y ago is: ${oneYearAgoStr}`)
  console.log(`91-Day observations >= 1Y ago: ${in1Y_91.length}`)
  console.log(`Earliest 1Y: ${in1Y_91[in1Y_91.length - 1].auction_date}`)
  console.log(`Latest 1Y: ${in1Y_91[0].auction_date}`)
  
  // Find the extra 53rd record
  console.log('\n--- ALL 91-DAY RECORDS DATES ---')
  tenor91.slice(0, 5).forEach(d => console.log(`${d.issue_number} : ${d.auction_date}`))
  console.log('...')
  tenor91.slice(-5).forEach(d => console.log(`${d.issue_number} : ${d.auction_date}`))
}

runAudit()
