function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  return cleaned ? Number.parseFloat(cleaned) || 0 : 0;
}

function parseInteger(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  const cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d-]/g, "").trim();
  return cleaned ? Number.parseInt(cleaned, 10) || 0 : 0;
}

function parseNseQuoteRows(html: string) {
  const rows = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const trHtml = trMatch[1];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trHtml)) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, "").trim();
      cells.push(text);
    }
    
    if (cells.length >= 5) {
      const company = cells[0];
      const volume = parseInteger(cells[2]);
      const price = parseNumber(cells[3]);
      const changePct = parseNumber(cells[4]);
      if (company && price > 0) {
        rows.push({ company, volume, price, changePct });
      }
    }
  }
  return rows;
}

const sampleHtml = `
    <table class="table nsetable"><thead><tr><th>Company</th><th>ISIN Code</th><th>Volume</th><th>Last Traded Price</th><th>Change (%)</th></tr></thead><tbody><tr><td>Umeme Ltd Ord 0.50</td>
        <td>UG0000001145</td>
        <td>40495</td>
        <td>7.08</td><td class="nsecpos"><span>0.57 <i class="fa fa-sort-asc" aria-hidden="true"></i></span></td></tr><tr><td>KenGen Ltd  Ord. 2.50</td>
        <td>KE0000000547</td>
        <td>855828</td>
        <td>10.8</td><td class="nsecneg"><span>-3.57 <i class="fa fa-sort-desc" aria-hidden="true"></i></span></td></tr></tbody></table>
`;

console.log(parseNseQuoteRows(sampleHtml));
