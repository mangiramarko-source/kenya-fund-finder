import json
from datetime import datetime
import re

with open('news_investigation.json', 'r') as f:
    data = json.load(f)

print("### 1. Query Production & 2. Check Classification Quality")

def print_category(cat, articles):
    print(f"\n#### {cat} (Newest 5)")
    for a in articles:
        date = a.get('date_published', '')
        title = a.get('title', '')
        src = a.get('source', '')
        cat_match = a.get('category', '')
        print(f"- **{title}** | {date} | {src} | Matched: {cat_match}")
    
    if articles:
        newest = articles[0]['date_published']
        print(f"**{cat} Newest Article:** {newest}")

for cat, articles in data['results'].items():
    print_category(cat, articles)

print("\n### 3. Check Kenya Relevance (Top 30)")
for a in data['top30']:
    print(f"- {a['title']} | {a['category']}")

print("\n### 4. Stock-specific freshness (5 Companies)")
for symbol, articles in data['stockResults'].items():
    print(f"\n#### {symbol}")
    print(f"Total articles: {len(articles)}")
    if articles:
        print(f"Newest date: {articles[0]['date_published']}")
        print(f"Newest title: {articles[0]['title']}")
