import json

with open('dry_run_observations.json', 'r') as f:
    data = json.load(f)

dates = set(item['date'] for item in data)
total_unique_dates = len(dates)

issues = {}
for item in data:
    issues.setdefault(item['tenor'], set()).add(item['issue_number'])

summary = []
summary.append(f"Total unique dates: {total_unique_dates}")
summary.append(f"Total entries in data: {len(data)}")

for tenor, issue_set in issues.items():
    summary.append(f"Tenor {tenor} unique issues: {len(issue_set)}")

all_issues = {}
duplicates = 0
for item in data:
    if item['issue_number'] in all_issues:
        duplicates += 1
    all_issues[item['issue_number']] = True

summary.append(f"Total duplicate issues: {duplicates}")

expected_dates = 52
if len(dates) < expected_dates:
    sorted_dates = sorted(list(dates))
    summary.append("Dates observed:")
    for d in sorted_dates:
        summary.append(d)

with open('summary.txt', 'w') as f:
    f.write("\n".join(summary))

print("Summary written to summary.txt")
