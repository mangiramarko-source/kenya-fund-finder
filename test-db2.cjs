const fs = require('fs');
const https = require('https');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_PUBLISHABLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/news_articles_public?select=created_at,source,title&order=created_at.desc&limit=5`;

https.get(url, {
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const articles = JSON.parse(data);
      console.log(`Found ${articles.length} articles.`);
      articles.forEach(a => {
        console.log(`- [${a.created_at}] ${a.source}: ${a.title}`);
      });
    } catch (e) {
      console.error(data);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
