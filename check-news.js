import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('market_news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(5)
    
  if (error) console.error("Error:", error)
  else {
      console.log(`Found ${data?.length} news items.`)
      if (data?.length > 0) {
          console.log(JSON.stringify(data.map(n => ({ title: n.title, source: n.source, published_at: n.published_at })), null, 2))
      }
  }
}

check()
