import json
import requests
import pdfplumber
import io

with open("dry_run_samples.json", "r") as f:
    samples = json.load(f)

output = []

for bucket, items in samples.items():
    for item in items:
        url = item[0]
        parsed_data = item[1]
        
        # Independent read
        r = requests.get(url)
        with pdfplumber.open(io.BytesIO(r.content)) as pdf:
            text = pdf.pages[0].extract_text()
            
        output.append(f"### Bucket: {bucket} | URL: {url}\n")
        output.append(f"**Parsed Data:**\n```json\n{json.dumps(parsed_data, indent=2)}\n```\n")
        output.append(f"**Raw Text:**\n```text\n{text}\n```\n")
        output.append("---\n")

with open("14_samples_verification.md", "w") as f:
    f.writelines(output)
print("Wrote 14_samples_verification.md")
